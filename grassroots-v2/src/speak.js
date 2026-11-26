// Read a screen out loud. Free: uses the phone's own voice (Web Speech API).
// Better: record your own voice notes (like WhatsApp) and drop them in
// public/audio/<lang>/<key>.mp3, then list the keys in public/audio/index.json.
// Recorded local voices are used first; the phone voice is the fallback.
import { getLang, t } from "./i18n.js";

let recorded = null; // { en: ["day_q", ...], sn: [...] }
async function loadRecorded() {
  if (recorded) return recorded;
  try {
    const r = await fetch("/audio/index.json", { cache: "force-cache" });
    recorded = r.ok ? await r.json() : {};
  } catch { recorded = {}; }
  return recorded;
}

let current = null;
export function stopSpeaking() {
  try { window.speechSynthesis?.cancel(); } catch {}
  if (current) { current.pause(); current = null; }
}

const VOICE_LANG = { en: ["en-ZW", "en-ZA", "en-GB", "en"], sn: ["sn"], nd: ["nd", "zu", "zu-ZA"] };

export async function speak(keys, vars, onEnd) {
  stopSpeaking();
  const lang = getLang();
  const list = (Array.isArray(keys) ? keys : [keys]).filter(Boolean);
  const rec = await loadRecorded();
  const have = rec[lang] || [];
  // 1) Recorded voice notes, played one after another
  if (list.every((k) => have.includes(k))) {
    let i = 0;
    const play = () => {
      if (i >= list.length) return onEnd && onEnd();
      current = new Audio(`/audio/${lang}/${list[i++]}.mp3`);
      current.onended = play; current.onerror = play;
      current.play().catch(play);
    };
    return play();
  }
  // 2) Phone's built-in voice
  const synth = window.speechSynthesis;
  if (!synth) return onEnd && onEnd();
  const text = list.map((k) => (k.startsWith("=") ? k.slice(1) : t(k, vars))).join(". ");
  const u = new SpeechSynthesisUtterance(text);
  const voices = synth.getVoices();
  const want = VOICE_LANG[lang] || ["en"];
  const v = voices.find((x) => want.some((w) => x.lang.toLowerCase().startsWith(w.toLowerCase())));
  if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = lang === "en" ? "en-GB" : lang; }
  u.rate = 0.9; // a little slower than normal
  u.onend = () => onEnd && onEnd();
  u.onerror = () => onEnd && onEnd();
  synth.speak(u);
}
export const canSpeak = () => typeof window !== "undefined" && ("speechSynthesis" in window);
