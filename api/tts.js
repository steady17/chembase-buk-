// Reads one piece of text aloud with OpenRouter's free Fish Audio voice and returns an mp3.
// Uses the same OPENROUTER_API_KEY that ChemBot already uses (environment variable only).
// If the voice is busy, limited or offline this answers with an error and the app falls back
// to the phone's own voice.
const MODEL = process.env.TTS_MODEL || 'fish-audio/s2.1-pro-free:free';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return res.status(503).json({ error: 'Voice is not configured.' });
  const text = String((req.body && req.body.text) || '').trim().slice(0, 900);
  if (!text) return res.status(400).json({ error: 'No text.' });

  try {
    const r = await fetch('https://openrouter.ai/api/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer': 'https://chembase-buk-qmxr.vercel.app',
        'X-Title': 'ChemBase BUK',
      },
      body: JSON.stringify({ model: MODEL, input: text, response_format: 'mp3' }),
    });
    if (!r.ok) {
      const msg = (await r.text().catch(() => '')).slice(0, 200);
      return res.status(r.status === 429 ? 429 : 502).json({ error: `Voice failed (${r.status}) ${msg}` });
    }
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 200) return res.status(502).json({ error: 'Voice returned no sound.' });
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(502).json({ error: 'Voice could not be reached.' });
  }
}
