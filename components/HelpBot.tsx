"use client";

import React, { useState, useEffect, useRef } from "react";
import { useProfile } from "@/lib/store";
import { runAssessment } from "@/lib/rules/engine";
import { assessmentToFacts } from "@/lib/profile";

interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function speechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

interface Message {
  role: "user" | "model";
  content: string;
  timestamp: Date;
}

const GREETINGS = {
  hi: "नमस्ते! मैं ClaimKaro सहायक हूँ। 🙏 मैं आपकी क्या मदद कर सकता हूँ?",
  en: "Hello! I am ClaimKaro Assistant. 🙏 How can I help you today?",
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function HelpBot() {
  const [profile] = useProfile();
  const [isOpen, setIsOpen] = useState(false);
  const [botLang, setBotLang] = useState<"hi" | "en">("hi");
  const [hasAligned, setHasAligned] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechError, setSpeechError] = useState("");
  const [, setTick] = useState(0); // force re-render for timestamps

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const speechBaseRef = useRef("");

  // Tick every 30s to refresh timestamps
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Hide tooltip after 4 seconds
  useEffect(() => {
    const t = setTimeout(() => setShowTooltip(false), 4000);
    return () => clearTimeout(t);
  }, []);

  // Live-sync bot language with the app language
  useEffect(() => {
    const newLang = profile.language ?? "en";
    setBotLang(newLang);
    setMessages([{ role: "model", content: GREETINGS[newLang], timestamp: new Date() }]);
    setInputVal("");
    setSpeechError("");
    setHasAligned(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.language]);

  // Pre-load synthesis voices
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const load = () => window.speechSynthesis.getVoices();
      load();
      window.speechSynthesis.onvoiceschanged = load;
    }
  }, []);

  const speakText = (text: string, lang: "hi" | "en", force = false) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (isMuted && !force) return;
    const cleanText = text
      .replace(/[🙏✨🤖🛡️🔎🚪🔒🔑🌾🌽🏦📜💰📄🏠♿🛖🪵🎒]/g, "")
      .replace(/[।!.?,:;()""''*+\-_—–/]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleanText) return;
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang === "hi" ? "hi-IN" : "en-IN";
    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find(v => v.lang.toLowerCase().replace("_", "-") === (lang === "hi" ? "hi-in" : "en-in")) ??
      voices.find(v => v.lang.toLowerCase().startsWith(lang === "hi" ? "hi" : "en"));
    if (voice) { utterance.voice = voice; utterance.lang = voice.lang; }
    window.speechSynthesis.speak(utterance);
  };

  const suggestions =
    botLang === "hi"
      ? [
          { text: "स्थिति बॉक्स (Situation Box) में क्या लिखें?", label: "📝 स्थिति बॉक्स में क्या लिखें?" },
          { text: "दस्तावेज़ों की जाँच कैसे करें?", label: "📄 दस्तावेज़ों की जाँच कैसे करें?" },
          { text: "ट्रैकर (Tracker) क्या है और कैसे उपयोग करें?", label: "📍 ट्रैकर क्या है और कैसे उपयोग करें?" },
          { text: "लाभ (Benefits) कैसे ढूँढें?", label: "✅ लाभ कैसे ढूँढें?" },
        ]
      : [
          { text: "What to write in the Situation Box?", label: "📝 What to write in the situation box?" },
          { text: "How to check and audit documents?", label: "📄 How to check documents?" },
          { text: "What is the Tracker and how to use it?", label: "📍 What is the tracker?" },
          { text: "How to find eligible schemes?", label: "✅ How to find benefits?" },
        ];

  // Auto-popup after 2 minutes idle
  useEffect(() => {
    const handleActivity = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (!isOpen) {
          setIsOpen(true);
          speakText(GREETINGS[botLang], botLang);
        }
      }, 120000);
    };
    handleActivity();
    const events = ["mousemove", "mousedown", "keypress", "touchstart"];
    events.forEach(e => window.addEventListener(e, handleActivity));
    setSpeechSupported(Boolean(speechRecognitionConstructor()));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(e => window.removeEventListener(e, handleActivity));
      recognitionRef.current?.abort();
    };
  }, [isOpen, botLang, isMuted]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleLanguageToggle = (lang: "hi" | "en") => {
    setBotLang(lang);
    setMessages([{ role: "model", content: GREETINGS[lang], timestamp: new Date() }]);
    setInputVal("");
    setSpeechError("");
    speakText(GREETINGS[lang], lang);
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: textToSend, timestamp: new Date() },
    ];
    setMessages(newMessages);
    setInputVal("");
    setLoading(true);
    setSpeechError("");
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();

    let profileSummary = "";
    try {
      const assessment = runAssessment(profile);
      profileSummary = assessmentToFacts(assessment);
    } catch (e) {
      console.error("Failed to generate profile facts summary:", e);
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          profileSummary,
          language: botLang,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const botText = data.text || (botLang === "hi"
        ? "माफ़ी चाहता हूँ, जवाब देने में परेशानी हो रही है।"
        : "Sorry, I am having trouble answering.");
      setMessages(prev => [...prev, { role: "model", content: botText, timestamp: new Date() }]);
      speakText(botText, botLang);
    } catch {
      const errText = botLang === "hi"
        ? "कृपया माफ़ करें, सर्वर की समस्या के कारण मैं अभी उत्तर नहीं दे पा रहा हूँ।"
        : "Sorry, due to a server issue I cannot answer at the moment.";
      setMessages(prev => [...prev, { role: "model", content: errText, timestamp: new Date() }]);
      speakText(errText, botLang);
    } finally {
      setLoading(false);
    }
  };

  const toggleSpeech = () => {
    if (listening) { recognitionRef.current?.stop(); return; }
    const Recognition = speechRecognitionConstructor();
    if (!Recognition) {
      setSpeechSupported(false);
      setSpeechError(botLang === "hi" ? "आवाज़ इनपुट काम नहीं कर रहा।" : "Voice input not supported.");
      return;
    }
    setSpeechError("");
    speechBaseRef.current = inputVal.trim();
    const recognition = new Recognition();
    recognition.lang = botLang === "hi" ? "hi-IN" : "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0]?.transcript ?? "";
      const sep = speechBaseRef.current && transcript.trim() ? " " : "";
      setInputVal(`${speechBaseRef.current}${sep}${transcript.trimStart()}`);
    };
    recognition.onerror = () => setSpeechError(botLang === "hi" ? "आवाज़ साफ़ नहीं सुनाई दी।" : "Could not hear clearly.");
    recognition.onend = () => { recognitionRef.current = null; setListening(false); };
    recognitionRef.current = recognition;
    try { recognition.start(); setListening(true); }
    catch { recognitionRef.current = null; setSpeechError(botLang === "hi" ? "माइक्रोफ़ोन त्रुटि।" : "Microphone error."); }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  };

  return (
    <div className="no-print">
      {/* Floating Chat Bubble */}
      {!isOpen && (
        <div className="fixed bottom-8 right-6 z-[60] flex flex-col items-end gap-2">
          {/* Tooltip bubble */}
          {showTooltip && (
            <div className="bg-white border border-[#E3E0CF] text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-lg animate-page-enter max-w-[200px] text-center leading-relaxed">
              {botLang === "hi" ? "लाभ ढूँढने में मदद चाहिए?" : "Need help finding benefits?"}
              <div className="absolute bottom-[-6px] right-6 w-3 h-3 bg-white border-r border-b border-[#E3E0CF] rotate-45" />
            </div>
          )}
          <button
            onClick={() => { setIsOpen(true); setShowTooltip(false); speakText(GREETINGS[botLang], botLang); }}
            className="relative w-14 h-14 rounded-full bg-brand-green hover:bg-brand-green-hover shadow-xl flex items-center justify-center text-white cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 border border-white/20"
            title={botLang === "hi" ? "मदद चाहिए?" : "Need Help?"}
            aria-label="Open helper bot"
          >
            {/* Pulsing ring */}
            <span className="absolute inset-0 rounded-full bg-brand-green opacity-30 animate-ping" />
            <span className="text-2xl relative z-10">🤖</span>
            {/* Online dot */}
            <span className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white shadow-sm" />
          </button>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-8 right-6 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[85vh] bg-[#FFFDF4] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#E3E0CF] z-[60] animate-page-enter"
          style={{ boxShadow: '0 24px 64px rgba(37,99,235,0.12), 0 4px 16px rgba(0,0,0,0.08)' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-[#1e40af] to-[#2563EB] text-white px-4 py-3.5 flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-xl border border-white/30">
                  🤖
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight">
                  {botLang === "hi" ? "ClaimKaro सहायक" : "ClaimKaro Assistant"}
                </h3>
                <p className="text-[10px] text-blue-100/90 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  {botLang === "hi" ? "तुरंत जवाब देते हैं" : "Typically replies instantly"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Language Toggle */}
              <div className="flex rounded-lg bg-white/15 p-0.5 text-[10px] font-bold ring-1 ring-white/20">
                {(["en", "hi"] as const).map(l => (
                  <button key={l} onClick={() => handleLanguageToggle(l)}
                    className={`rounded-md px-2 py-1 transition ${botLang === l ? "bg-white text-brand-green shadow-sm" : "text-white/80 hover:text-white"}`}
                  >
                    {l === "en" ? "EN" : "हिं"}
                  </button>
                ))}
              </div>

              {/* Mute Toggle */}
              <button
                onClick={() => {
                  const next = !isMuted;
                  setIsMuted(next);
                  if (next && typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
                  else if (!next) {
                    const last = [...messages].reverse().find(m => m.role === "model");
                    if (last) speakText(last.content, botLang, true);
                  }
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2.5">
                    <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2.5">
                    <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                )}
              </button>

              {/* Close */}
              <button onClick={handleClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition text-base leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-4"
            style={{
              background: '#F5F5DC',
              backgroundImage: 'radial-gradient(rgba(35,42,51,0.07) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex items-end gap-2 animate-page-enter ${m.role === "user" ? "flex-row-reverse" : ""}`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm shadow-sm border ${m.role === "user" ? "bg-mint-bg border-mint-border/50" : "bg-white border-slate-100"}`}>
                  {m.role === "user" ? "👤" : "🤖"}
                </div>

                <div className={`flex flex-col gap-1 max-w-[78%] ${m.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed shadow-sm ${
                    m.role === "user"
                      ? "bg-brand-green text-white rounded-br-sm"
                      : "bg-white text-slate-800 border border-slate-200/60 rounded-bl-sm border-l-2 border-l-brand-green/30"
                  }`}>
                    {m.content}
                  </div>

                  {/* Listen button for bot */}
                  <div className={`flex items-center gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                    {m.role === "model" && (
                      <button
                        onClick={() => speakText(m.content, botLang, true)}
                        className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-brand-green transition"
                        title={botLang === "hi" ? "सुनें" : "Listen"}
                      >
                        <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-current" strokeWidth="2.5">
                          <path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07" />
                        </svg>
                        {botLang === "hi" ? "सुनें" : "Listen"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Suggestion chips — horizontal scroll */}
            {messages.length === 1 && !loading && (
              <div className="pl-9 space-y-2 animate-page-enter" style={{ animationDelay: '150ms' }}>
                <p className="text-[11px] font-semibold text-slate-400">
                  {botLang === "hi" ? "आप पूछ सकते हैं:" : "You can ask:"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(s.text)}
                      className="text-xs bg-white text-slate-700 hover:bg-mint-bg hover:text-brand-green px-3.5 py-2 rounded-full border border-slate-200 shadow-xs transition hover-lift click-scale"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Typing indicator */}
            {loading && (
              <div className="flex items-end gap-2 animate-page-enter">
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0 text-sm shadow-sm border border-slate-100">
                  🤖
                </div>
                <div className="bg-white border border-slate-200/60 border-l-2 border-l-brand-green/30 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                    <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    {botLang === "hi" ? "ClaimKaro सोच रहा है..." : "ClaimKaro is thinking..."}
                  </span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Listening / error bar */}
          {(listening || speechError) && (
            <div className="px-4 py-2 bg-rose-50 border-t border-rose-100 text-[11px] flex justify-between items-center shrink-0">
              {listening && (
                <span className="text-red-600 font-medium flex items-center gap-2">
                  <span className="flex items-center gap-0.5">
                    <span className="h-3 w-0.5 rounded-full bg-red-500 animate-pulse" style={{ animationDelay: '0ms' }} />
                    <span className="h-4 w-0.5 rounded-full bg-red-500 animate-pulse" style={{ animationDelay: '150ms' }} />
                    <span className="h-3.5 w-0.5 rounded-full bg-red-500 animate-pulse" style={{ animationDelay: '300ms' }} />
                  </span>
                  {botLang === "hi" ? "सुन रहे हैं" : "Listening"} ({botLang === "hi" ? "हिंदी" : "English"})
                </span>
              )}
              {speechError && <span className="text-rose-700">{speechError}</span>}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(inputVal); }}
            className="border-t border-[#E3E0CF] p-3 bg-[#FFFDF4] flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={botLang === "hi" ? "यहाँ प्रश्न लिखें या माइक दबाकर बोलें..." : "Type your question or click the mic to speak..."}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-[13px] outline-none focus:bg-white focus:border-brand-green focus:ring-2 focus:ring-mint-bg transition"
              disabled={loading}
              maxLength={300}
            />
            {inputVal.length > 80 && (
              <span className="text-[10px] text-slate-400 shrink-0">{inputVal.length}/300</span>
            )}

            {/* Mic */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleSpeech}
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm border transition click-scale ${
                  listening
                    ? "bg-red-500 text-white border-red-400"
                    : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                }`}
                title={listening ? (botLang === "hi" ? "सुनना बंद करें" : "Stop") : (botLang === "hi" ? "बोलें" : "Speak")}
              >
                {listening ? (
                  <div className="flex items-center gap-0.5">
                    <span className="h-2.5 w-0.5 rounded-full bg-white animate-pulse" style={{ animationDelay: '0ms' }} />
                    <span className="h-3.5 w-0.5 rounded-full bg-white animate-pulse" style={{ animationDelay: '150ms' }} />
                    <span className="h-2.5 w-0.5 rounded-full bg-white animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="2" width="6" height="12" rx="3" />
                    <path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" />
                  </svg>
                )}
              </button>
            )}

            {/* Send */}
            <button
              type="submit"
              disabled={loading || !inputVal.trim()}
              className="w-9 h-9 rounded-full bg-brand-green text-white flex items-center justify-center shrink-0 hover:bg-brand-green-hover active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition shadow-sm click-scale"
              title={botLang === "hi" ? "भेजें" : "Send"}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
