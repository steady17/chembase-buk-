// Reads one piece of text aloud with Google's Gemini voice (free tier) and returns a WAV sound.
// The key lives only in the GEMINI_API_KEY environment variable. If it is missing or the free
// limit is reached, this answers with an error and the app falls back to the phone's own voice.
const VOICE = process.env.GEMINI_VOICE || 'Kore';
const BASE = 'https://generativelanguage.googleapis.com/v1beta';

function wavFromPcm(pcm, rate = 24000) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

// classic generateContent call (widely available TTS models)
async function viaGenerateContent(model, text, key) {
  const r = await fetch(`${BASE}/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
      },
    }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${model}: ${r.status} ${JSON.stringify(d.error || d).slice(0, 200)}`);
  const part = d.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part) throw new Error(`${model}: no audio`);
  const mime = part.inlineData.mimeType || '';
  const raw = Buffer.from(part.inlineData.data, 'base64');
  if (raw.slice(0, 4).toString() === 'RIFF') return raw;
  const m = /rate=(\d+)/.exec(mime);
  return wavFromPcm(raw, m ? parseInt(m[1], 10) : 24000);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: 'Voice is not configured.' });
  const text = String((req.body && req.body.text) || '').trim().slice(0, 600);
  if (!text) return res.status(400).json({ error: 'No text.' });

  const models = [process.env.GEMINI_TTS_MODEL, 'gemini-2.5-flash-preview-tts', 'gemini-2.5-pro-preview-tts'].filter(Boolean);
  const errors = [];
  for (const model of models) {
    try {
      const wav = await viaGenerateContent(model, text, key);
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(wav);
    } catch (e) { errors.push(e.message); }
  }
  return res.status(502).json({ error: errors.join(' | ') });
}
