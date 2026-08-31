export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages } = req.body;

    // Primary: MiniMax M3 (free, supports images)
    let response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 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',
        'HTTP-Referer': 'https://chembase-buk-qmxr.vercel.app',
        'X-Title': 'ChemBase BUK'
      },
      body: JSON.stringify({
        model: 'minimax/minimax-m3:free',
        messages,
        temperature: 0.3,
        max_tokens: 1500,
        stream: false
      })
    });

    let data = await response.json();

    // Fallback: Llama on OpenRouter
    if (!response.ok || !data.choices?.[0]?.message?.content) {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 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',
          'HTTP-Referer': 'https://chembase-buk-qmxr.vercel.app',
          'X-Title': 'ChemBase BUK'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.1-8b-instruct:free',
          messages: messages.map(m => ({...m, content: typeof m.content === 'string' ? m.content : m.content.find?.(c => c.type === 'text')?.text || ''})),
          temperature: 0.3,
          max_tokens: 1500,
          stream: false
        })
      });
      data = await response.json();
    }

    if (!response.ok) return res.status(response.status).json({ error: data });

    let content = data.choices?.[0]?.message?.content || '';
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    content = content.replace(/,"reasoning_details":\[[\s\S]*/g, '').trim();

    return res.status(200).json({ content });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
