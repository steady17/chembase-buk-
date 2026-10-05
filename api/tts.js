// Natural online voice (free Microsoft neural voice, no key needed).
// POST {text} -> audio/mpeg. If anything fails it answers with an error and the app
// quietly falls back to the phone's own voice.
import WebSocket from 'ws';
import crypto from 'node:crypto';

const TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const VERSION = '1-143.0.3650.75';
const VOICE = process.env.TTS_VOICE || 'en-US-AriaNeural';

let skew = 0;   // seconds our clock is off from Microsoft's (learned from a 403 reply)
function gecToken() {
  let ticks = Math.floor(Date.now() / 1000 + skew) + 11644473600;
  ticks -= ticks % 300;
  ticks *= 1e7;
  return crypto.createHash('sha256').update(`${ticks}${TOKEN}`, 'ascii').digest('hex').toUpperCase();
}
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const stamp = () => new Date().toUTCString().replace(/^(\w+), (\d+) (\w+) (\d+) ([\d:]+) GMT$/, '$1 $3 $2 $4 $5') + ' GMT+0000 (Coordinated Universal Time)';

function synth(text) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID().replace(/-/g, '');
    const url = process.env.TTS_WS_URL || `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TOKEN}&Sec-MS-GEC=${gecToken()}&Sec-MS-GEC-Version=${VERSION}&ConnectionId=${id}`;
    const ws = new WebSocket(url, {
      headers: {
        Pragma: 'no-cache',
        'Cache-Control': 'no-cache',
        Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        'Accept-Language': 'en-US,en;q=0.9',
        Cookie: `muid=${crypto.randomBytes(16).toString('hex').toUpperCase()};`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',
      },
    });
    const parts = [];
    let done = false;
    const finish = (err) => {
      if (done) return; done = true; clearTimeout(timer);
      try { ws.close(); } catch (e) {}
      if (err) reject(err); else if (!parts.length) reject(new Error('no audio')); else resolve(Buffer.concat(parts));
    };
    const timer = setTimeout(() => finish(new Error('timeout')), 15000);
    ws.on('open', () => {
      ws.send(`X-Timestamp:${stamp()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n`);
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${VOICE}'><prosody pitch='+0Hz' rate='+0%' volume='+0%'>${esc(text)}</prosody></voice></speak>`;
      ws.send(`X-RequestId:${id}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${stamp()}Z\r\nPath:ssml\r\n\r\n${ssml}`);
    });
    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        const buf = Buffer.from(data);
        if (buf.length < 2) return;
        const headLen = buf.readUInt16BE(0);
        const head = buf.subarray(2, 2 + headLen).toString('utf8');
        if (head.includes('Path:audio')) parts.push(buf.subarray(2 + headLen));
      } else if (data.toString().includes('Path:turn.end')) {
        finish();
      }
    });
    ws.on('unexpected-response', (rq, rs) => {
      const e = new Error('Microsoft answered ' + rs.statusCode);
      if (rs.statusCode === 403 && rs.headers.date) { const t = Date.parse(rs.headers.date); if (t) { skew = t / 1000 - Date.now() / 1000; e.retry = true; } }
      finish(e);
    });
    ws.on('error', (e) => finish(e));
    ws.on('close', () => finish());
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Methods', 'POST'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); return res.status(204).end(); }
  if (req.method !== 'POST') return res.status(405).send('POST only');
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const text = String((body && body.text) || '').trim().slice(0, 1200);
  if (!text) return res.status(400).send('No text');
  try {
    let audio;
    try { audio = await synth(text); } catch (e) { if (e && e.retry) audio = await synth(text); else throw e; }
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(audio);
  } catch (e) {
    return res.status(502).send('Voice unavailable: ' + String((e && e.message) || e).slice(0, 120));
  }
}
