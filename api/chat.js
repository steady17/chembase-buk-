export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages } = req.body;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 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',
        'HTTP-Referer': 'https://chembase-buk-qmxr.vercel.app',
        'X-Title': 'ChemBase BUK'
      },
      body: JSON.stringify({
        // OpenRouter tries these in order — if one is down/rate-limited, it auto-tries the next
        models: [
          'minimax/minimax-m3:free',
          'nvidia/nemotron-3-ultra-550b-a55b:free',
          'openai/gpt-oss-120b:free',
          'google/gemma-3-27b-it:free'
        ],
        messages,
        temperature: 0.3,
        max_tokens: 1500,
        stream: false
      })
    });

    const data = await response.json();

    if (!response.ok) return res.status(response.status).json({ error: data });

    let content = data.choices?.[0]?.message?.content || '';
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    content = content.replace(/,"reasoning_details":\[[\s\S]*/g, '').trim();

    return res.status(200).json({ content });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
