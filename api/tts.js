// Reads one piece of text aloud with OpenRouter's free Fish Audio voice and returns an mp3.
// Uses the same OPENROUTER_API_KEY that ChemBot already uses (environment variable only).
// If the voice is busy, limited or offline this answers with an error and the app falls back
// to the phone's own voice.
const MODEL = process.env.TTS_MODEL || 'fish-audio/s2.1-pro-free:free';

// One fixed Fish voice so every piece sounds the same. Change it from Vercel with TTS_VOICE (a Fish voice ID).
// "a" and "b" are the two voices the app's Voice button switches between (both are public Fish voice IDs).
const VOICES = { a: process.env.TTS_VOICE || 'b347db033a6549378b48d00acb0d06cd', b: process.env.TTS_VOICE_B || '802e3bc2b27e49c2995d23ef70e6ac89' };

async function speak(key, text, voice) {
  const body = { model: MODEL, input: text, response_format: 'mp3' };
  if (voice) body.voice = voice;
  return fetch('https://openrouter.ai/api/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': 'https://chembase-buk-qmxr.vercel.app',
      'X-Title': 'ChemBase BUK',
    },
    body: JSON.stringify(body),
  });
}

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
    const VOICE = VOICES[String((req.body && req.body.voice) || 'a')] || VOICES.a;
    let r = await speak(key, text, VOICE);
    // If the chosen voice is rejected, still speak (default voice) rather than go silent.
    if (!r.ok && VOICE && r.status >= 400 && r.status < 500 && r.status !== 429) r = await speak(key, text, '');
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
