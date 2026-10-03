export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages } = req.body;

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

    const geminiData = await geminiRes.json();

    if (!geminiRes.ok) {
      // Surface the real error instead of hiding it, so we can tell if Gemini itself is broken.
      return res.status(geminiRes.status).json({ error: geminiData.error || geminiData });
    }

    let content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    return res.status(200).json({ content: content || "Gemini returned an empty response." });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
