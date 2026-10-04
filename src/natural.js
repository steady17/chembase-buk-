// "Natural voice": a free AI voice (Kokoro) that runs inside the phone's own browser.
// Nothing is sent to our server and it does not use our Groq limit. The model (about 80 MB) is
// downloaded once, loaded only when the person turns this on, and then kept by the browser.
const SOURCES = [
  "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm",
  "https://esm.sh/kokoro-js@1.2.1",
];
const MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";
export const NATURAL_VOICE = "af_heart";

let loading = null;
export function loadNatural(onProgress) {
  if (!loading) {
    loading = (async () => {
      let mod = null, lastErr = null;
      for (const url of SOURCES) {
        try { mod = await import(/* @vite-ignore */ url); break; } catch (e) { lastErr = e; }
      }
      if (!mod || !mod.KokoroTTS) throw lastErr || new Error("could not load the voice engine");
      const gpu = typeof navigator !== "undefined" && !!navigator.gpu;
      const attempts = gpu ? [{ device: "webgpu", dtype: "fp32" }, { device: "wasm", dtype: "q8" }] : [{ device: "wasm", dtype: "q8" }];
      let err = null;
      for (const a of attempts) {
        try {
          return await mod.KokoroTTS.from_pretrained(MODEL, {
            ...a,
            progress_callback: (p) => { if (onProgress && p && p.status === "progress" && typeof p.progress === "number") onProgress(Math.round(p.progress)); },
          });
        } catch (e) { err = e; }
      }
      throw err;
    })().catch((e) => { loading = null; throw e; });
  }
  return loading;
}

// turn one sentence into a playable sound (blob URL)
export async function makeAudio(tts, text) {
  const audio = await tts.generate(text, { voice: NATURAL_VOICE });
  return URL.createObjectURL(audio.toBlob());
}
