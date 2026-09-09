export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages } = req.body;
    let content = '';

    // PRIMARY: Kimi K2.6 via NVIDIA build (best for math/science reasoning)
    try {
      const nvRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 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'
        },
        body: JSON.stringify({
          model: 'moonshotai/kimi-k2.6',
          messages,
          temperature: 0.3,
          max_tokens: 1200,
          stream: false
        })
      });
      if (nvRes.ok) {
        const nvData = await nvRes.json();
        content = nvData.choices?.[0]?.message?.content || '';
      }
    } catch {}

    // FALLBACK 2: Gemini 2.5 Flash (native endpoint)
    if (!content) {
      try {
        const systemMsg = messages.find(m => m.role === 'system');
        const convoMsgs = messages.filter(m => m.role !== 'system');
        const geminiContents = convoMsgs.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: typeof m.content === 'string' ? m.content : (m.content.find?.(c => c.type === 'text')?.text || '') }]
        }));
        const geminiRes = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': 'AQ.Ab8RN6LGZ6U90OLB0UrWa9FJsjfwEpQdELvqtjxM6KpfbL84KA'
            },
            body: JSON.stringify({
              system_instruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
              contents: geminiContents,
              generationConfig: { temperature: 0.3, maxOutputTokens: 1200 }
            })
          }
        );
        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch {}
    }

    // FALLBACK 3: MiniMax M2.7 via NVIDIA build
    if (!content) {
      try {
        const mmRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer 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'
          },
          body: JSON.stringify({
            model: 'minimax/minimax-m2.7',
            messages,
            temperature: 0.3,
            max_tokens: 1200,
            stream: false
          })
        });
        if (mmRes.ok) {
          const mmData = await mmRes.json();
          content = mmData.choices?.[0]?.message?.content || '';
        }
      } catch {}
    }

    // Strip any thinking/reasoning leakage from any model
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    content = content.replace(/,"reasoning_details":\[[\s\S]*/g, '').trim();
    content = content.replace(/^#+\s*Thinking[\s\S]*?(?=\n\n|\n#|$)/gim, '').trim();

    return res.status(200).json({ content: content || "Couldn't get a response. Please try again." });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
