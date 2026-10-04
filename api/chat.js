// Tries Groq first (fast, primary). If Groq errors out, times out, or isn't
// configured, falls back to OpenRouter — first DeepSeek, then Llama — so
// ChemBot keeps working even if Groq has a bad day.

async function callGroq(messages, groqKey, model = 'openai/gpt-oss-120b', maxTokens = 3500) {
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
      'HTTP-Referer': 'https://chembase-buk-qmxr.vercel.app',
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
    if (openRouterKey) {
      attempts.push({ label: 'OpenRouter DeepSeek', run: () => finishAnswer((m) => callOpenRouter(m, openRouterKey, 'deepseek/deepseek-chat:free'), messages, startedAt) });
      attempts.push({ label: 'OpenRouter Llama', run: () => finishAnswer((m) => callOpenRouter(m, openRouterKey, 'meta-llama/llama-3.3-70b-instruct:free'), messages, startedAt) });
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
