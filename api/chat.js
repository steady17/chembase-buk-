export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages } = req.body;

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer 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`
      },
      body: JSON.stringify({
        model: 'meta/llama-4-maverick-17b-128e-instruct',
        messages,
        temperature: 0.3,
        max_tokens: 2048,
        stream: false
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }

    let content = data.choices?.[0]?.message?.content || '';
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    return res.status(200).json({ content });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

