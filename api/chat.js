// Tries Groq first (fast, primary). If Groq errors out, times out, or isn't
// configured, falls back to a list of free OpenRouter models, so
// ChemBot keeps working even if Groq has a bad day.

// Free model names on OpenRouter come and go, so a fixed list breaks. Instead we ask
// OpenRouter which free text models exist right now (cached for an hour), put the
// ones we like first, and finish with its own free auto-picker as the last resort.
const PREFERRED_FREE = [
  'nvidia/nemotron-3-super-120b-a12b:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'google/gemma-4-31b-it:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'openai/gpt-oss-120b:free'
];
const SKIP_FREE = /thinkingmachines|safety|guard|embed|lyria|-vl|vision|omni|dolphin|coder|lfm|3b-instruct/i;
let freeCache = { at: 0, list: null };

async function freeModels(orKey) {
  if (freeCache.list && Date.now() - freeCache.at < 3600 * 1000) return freeCache.list;
  let list;
  try {
    const r = await fetch('https://openrouter.ai/api/v1/models', { headers: { Authorization: `Bearer ${orKey}` } });
    const d = await r.json();
    const live = (d.data || []).filter(m =>
      /:free$/.test(m.id) && !SKIP_FREE.test(m.id) &&
      Number(m.pricing?.prompt) === 0 && Number(m.pricing?.completion) === 0 &&
      (m.context_length || 0) >= 32000 &&
      (m.architecture?.output_modalities || ['text']).join() === 'text');
    const rank = (id) => { const i = PREFERRED_FREE.indexOf(id); return i === -1 ? 999 : i; };
    live.sort((x, y) => rank(x.id) - rank(y.id) || (y.context_length || 0) - (x.context_length || 0));
    list = live.slice(0, 5).map(m => m.id);
  } catch (e) {
    list = [];
  }
  if (!list.length) list = PREFERRED_FREE.slice(0, 3);
  list.push('openrouter/free');
  freeCache = { at: Date.now(), list };
  return list;
}

// Extra Groq models have their own separate limits, so they are a good first backup.
const GROQ_EXTRA = ['openai/gpt-oss-20b'];

// Groq's free plan counts the room reserved for the answer (max_tokens) together with
// the question, against 8000 tokens a minute. Shrink the answer room when the
// question is long so one request never goes over.
function roomForAnswer(messages, wanted) {
  let chars = 0;
  for (const m of messages) {
    if (Array.isArray(m.content)) {
      for (const p of m.content) chars += p && p.type === 'text' ? (p.text || '').length : 1500;
    } else chars += String(m.content || '').length;
  }
  const inputTokens = Math.ceil(chars / 3);
  return Math.max(700, Math.min(wanted, 7400 - inputTokens));
}

async function callGroq(messages, groqKey, model = 'openai/gpt-oss-120b', maxTokens = 3500) {
  maxTokens = roomForAnswer(messages, maxTokens);
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${groqKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: maxTokens,
      // gpt-oss "thinks" before it answers and the thinking counts against max_tokens,
      // which is what used to cut answers off half way. Keep the thinking short.
      ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {})
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data.error || data));
  let content = data.choices?.[0]?.message?.content || '';
  content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (!content) throw new Error('Groq returned an empty response.');
  return { content, finish: data.choices?.[0]?.finish_reason };
}

async function callOpenRouter(messages, orKey, model, maxTokens = 3500) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${orKey}`,
      'HTTP-Referer': 'https://chembase-buk.vercel.app',
      'X-Title': 'ChemBase BUK'
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: maxTokens
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data.error || data));
  let content = data.choices?.[0]?.message?.content || '';
  content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (!content) throw new Error(`OpenRouter (${model}) returned an empty response.`);
  return { content, finish: data.choices?.[0]?.finish_reason };
}

// If the model stopped only because it ran out of room, ask it once to carry on,
// so a long answer is not cut off in the middle.
async function finishAnswer(run, messages, startedAt) {
  let r = await run(messages);
  let text = r.content;
  if (r.finish === 'length' && Date.now() - startedAt < 6000) {
    try {
      const more = await run([
        ...messages,
        { role: 'assistant', content: text },
        { role: 'user', content: 'Continue exactly where you stopped. Do not repeat anything and do not add an introduction.' }
      ]);
      text += more.content;
    } catch (e) { /* keep what we have */ }
  }
  return text;
}

function hasImages(messages) {
  return Array.isArray(messages) && messages.some(m =>
    Array.isArray(m.content) && m.content.some(p => p && p.type === 'image_url'));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Health check: open /api/chat?test=chembase in a browser. It sends one tiny
  // question to every model and shows which ones answer.
  if (req.method === 'GET' && req.query && req.query.test === 'chembase') {
    const tinyAsk = [{ role: 'user', content: 'Reply with the single word OK.' }];
    const checks = [];
    if (process.env.GROQ_API_KEY) checks.push(['Groq openai/gpt-oss-120b', () => callGroq(tinyAsk, process.env.GROQ_API_KEY, 'openai/gpt-oss-120b', 300)]);
    else checks.push(['Groq', async () => { throw new Error('GROQ_API_KEY is not set'); }]);
    if (process.env.GROQ_API_KEY) for (const model of GROQ_EXTRA) checks.push([`Groq ${model}`, () => callGroq(tinyAsk, process.env.GROQ_API_KEY, model, 300)]);
    if (process.env.OPENROUTER_API_KEY) {
      for (const model of await freeModels(process.env.OPENROUTER_API_KEY)) checks.push([`OpenRouter ${model}`, () => callOpenRouter(tinyAsk, process.env.OPENROUTER_API_KEY, model, 300)]);
    } else checks.push(['OpenRouter', async () => { throw new Error('OPENROUTER_API_KEY is not set'); }]);
    const results = await Promise.all(checks.map(async ([label, run]) => {
      const t = Date.now();
      try { const r = await run(); return { model: label, ok: true, ms: Date.now() - t, reply: r.content.slice(0, 40) }; }
      catch (e) { return { model: label, ok: false, ms: Date.now() - t, error: String(e.message).slice(0, 200) }; }
    }));
    return res.status(200).json(results);
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const groqKey = process.env.GROQ_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'No messages were sent.' });
  }

  const startedAt = Date.now();
  const attempts = [];

  if (hasImages(messages)) {
    // Image questions need a vision model. The default text model cannot see pictures.
    const visionModel = process.env.GROQ_VISION_MODEL || 'qwen/qwen3.8-27b';
    const orVision = process.env.OPENROUTER_VISION_MODEL || 'google/gemma-3-27b-it:free';
    if (groqKey) {
      attempts.push({ label: 'Groq vision', run: () => finishAnswer((m) => callGroq(m, groqKey, visionModel, 3500), messages, startedAt) });
    }
    if (openRouterKey) {
      attempts.push({ label: 'OpenRouter vision', run: () => finishAnswer((m) => callOpenRouter(m, openRouterKey, orVision, 3500), messages, startedAt) });
    }
  } else {
    if (groqKey) {
      attempts.push({ label: 'Groq', run: () => finishAnswer((m) => callGroq(m, groqKey), messages, startedAt) });
    }
    if (groqKey) {
      for (const model of GROQ_EXTRA) {
        attempts.push({ label: `Groq ${model}`, run: () => finishAnswer((m) => callGroq(m, groqKey, model), messages, startedAt) });
      }
    }
    if (openRouterKey) {
      // Free backups, best first. Free model names on OpenRouter change now and then,
      // so there are several; if one is gone the next one takes over.
      for (const model of await freeModels(openRouterKey)) {
        attempts.push({ label: `OpenRouter ${model}`, run: () => finishAnswer((m) => callOpenRouter(m, openRouterKey, model), messages, startedAt) });
      }
    }
  }

  if (attempts.length === 0) {
    return res.status(500).json({ error: 'No AI provider is configured. Set GROQ_API_KEY and/or OPENROUTER_API_KEY in this project\'s environment variables.' });
  }

  const errors = [];
  for (const attempt of attempts) {
    try {
      const content = await attempt.run();
      return res.status(200).json({ content });
    } catch (error) {
      errors.push(`${attempt.label}: ${error.message}`);
    }
  }

  return res.status(502).json({ error: `All providers failed.\n${errors.join('\n')}` });
}
