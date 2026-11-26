// Read-aloud with the phone's own voice (expo-speech): free, works offline on most Android phones.
// Phones rarely ship ChiShona or isiNdebele voices; then the phone's default voice reads the text.
import * as Speech from "expo-speech";

const CODES = { en: ["en-ZA", "en-GB", "en"], sn: ["sn"], nd: ["nd", "zu"] };
let voicesCache = null;

async function pickVoice(lang) {
  try {
    // Some phones/browsers never report their voice list — don't wait more than a moment.
    if (!voicesCache)
      voicesCache = await Promise.race([
        Speech.getAvailableVoicesAsync(),
        new Promise((resolve) => setTimeout(() => resolve([]), 700)),
      ]);
    const want = CODES[lang] || CODES.en;
    return voicesCache.find((v) => want.some((w) => String(v.language || "").toLowerCase().startsWith(w.toLowerCase())));
  } catch {
    return null;
  }
}

export async function speakText(text, lang, { onDone } = {}) {
  if (!text) return;
  try {
    Speech.stop().catch(() => {});
    const voice = await pickVoice(lang);
    Speech.speak(String(text), {
      language: voice?.language || (lang === "en" ? "en-GB" : lang),
      voice: voice?.identifier,
      rate: 0.9,
      onDone,
      onStopped: onDone,
      onError: onDone,
    });
  } catch {
    onDone?.();
  }
}

export function stopSpeaking() {
  Speech.stop().catch(() => {});
}
