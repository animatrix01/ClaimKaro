import type { Lang } from "./i18n";

// Frontend-only text-to-speech helper (Web Speech API, no backend, no data
// leaves the device). Used by the read-aloud buttons across result cards so
// low-literacy users can listen instead of reading.

function cleanForSpeech(text: string): string {
  return text
    .replace(/[🙏✨🤖🛡️🔎🚪🔒🔑🌾🌽🏦📜💰📄🏠♿🛖🪵🎒👉✅⚠️📍🗂️👤🔑🪜🧭📚💬]/g, "")
    .replace(/[।!.?,:;()""''*+\-_—–/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickVoice(lang: Lang): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const exact = lang === "hi" ? "hi-in" : "en-in";
  return (
    voices.find((v) => v.lang.toLowerCase().replace("_", "-") === exact) ??
    voices.find((v) =>
      v.lang.toLowerCase().replace("_", "-").startsWith(lang === "hi" ? "hi" : "en"),
    ) ??
    null
  );
}

export function speakText(text: string, lang: Lang): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const clean = cleanForSpeech(text);
  if (!clean) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(clean);
  const voice = pickVoice(lang);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = lang === "hi" ? "hi-IN" : "en-IN";
  }
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
