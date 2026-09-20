"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { useProfile, useTracked, useAIConsent, initialProfile, type TrackedApp } from "@/lib/store";
import { Nav, Chip, BigChip, SITUATIONS, Hero, UnlockPath, TrapCard, BenefitCard } from "@/components/shared";
import { T, type Lang } from "@/lib/i18n";
import { runAssessment } from "@/lib/rules/engine";
import { nextQuestion } from "@/lib/rules/inquiry";
import { assessmentToFacts, fallbackExplanation } from "@/lib/profile";
import { PERSONAS } from "@/lib/personas";
import { useAuth } from "@/components/AuthGate";
import type { Assessment, Profile } from "@/lib/rules/types";

type ParsedIntake = Partial<Omit<Profile, "household" | "documentsHave">> & {
  household?: Partial<Profile["household"]>;
  documentsHave?: Profile["documentsHave"];
};

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

function parsedFacts(p: ParsedIntake, lang: Lang): string[] {
  const facts: string[] = [];
  const hi = lang === "hi";
  if (p.age !== undefined) facts.push(hi ? `उम्र ${p.age}` : `Age ${p.age}`);
  if (p.gender) facts.push(hi ? ({ female: "महिला", male: "पुरुष", other: "अन्य" }[p.gender]) : ({ female: "Woman", male: "Man", other: "Other" }[p.gender]));
  if (p.state) facts.push(p.state === "BIHAR" ? (hi ? "बिहार" : "Bihar") : p.state === "RAJASTHAN" ? (hi ? "राजस्थान" : "Rajasthan") : (hi ? "अन्य राज्य" : "Other state"));
  if (p.category) facts.push(p.category === "GENERAL" ? (hi ? "सामान्य वर्ग" : "General category") : p.category);
  if (p.annualHouseholdIncome !== undefined) facts.push(hi ? `₹${p.annualHouseholdIncome.toLocaleString("en-IN")} सालाना आय` : `₹${p.annualHouseholdIncome.toLocaleString("en-IN")} annual income`);
  if (p.bpl === true) facts.push(hi ? "BPL/गरीब परिवार" : "BPL/low-income family");
  if (p.occupation) facts.push(p.occupation.replaceAll("_", " "));
  const householdLabels: Partial<Record<keyof Profile["household"], [string, string]>> = {
    isWidow: ["Widow", "विधवा"],
    isPregnantOrLactating: ["Pregnant or nursing", "गर्भवती या स्तनपान"],
    hasSchoolGoingChild: ["Child in school", "स्कूल जाने वाला बच्चा"],
    hasElderly60Plus: ["Age 60+ at home", "घर में 60+ बुज़ुर्ग"],
    lacksPuccaHouse: ["No pucca house", "पक्का घर नहीं"],
    lacksLpg: ["No LPG", "LPG नहीं"],
    isRural: ["Lives in a village", "गाँव में रहते हैं"],
  };
  for (const [key, value] of Object.entries(p.household ?? {})) {
    if (value === true) facts.push(householdLabels[key as keyof Profile["household"]]?.[hi ? 1 : 0] ?? key);
  }
  if (p.documentsHave?.length) facts.push(hi ? `${p.documentsHave.length} दस्तावेज़ बताए` : `${p.documentsHave.length} document${p.documentsHave.length > 1 ? "s" : ""} mentioned`);
  return facts;
}

export default function SchemesPage() {
  const [profile, setProfile] = useProfile();
  const { requireAuth } = useAuth();
  const [tracked, setTracked] = useTracked();
  const [aiConsent, setAIConsent] = useAIConsent();
  const lang = profile.language;
  const setLang = (l: Lang) => setProfile((p) => ({ ...p, language: l }));
  const t = T[lang];

  const [freeText, setFreeText] = useState("");
  const [asked, setAsked] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [parseSource, setParseSource] = useState("");
  const [parseSummary, setParseSummary] = useState<string[]>([]);
  const [parseError, setParseError] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Assessment | null>(null);
  const [explanation, setExplanation] = useState<{ text: string; source: string } | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const speechBaseRef = useRef("");
  const [loadingStep, setLoadingStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    setSpeechSupported(Boolean(speechRecognitionConstructor()));
    return () => recognitionRef.current?.abort();
  }, []);

  function toggleSpeech() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const Recognition = speechRecognitionConstructor();
    if (!Recognition) {
      setSpeechSupported(false);
      setSpeechError(t.micUnsupported);
      return;
    }

    setSpeechError("");
    setParseError("");
    setParseSource("");
    setParseSummary([]);
    speechBaseRef.current = freeText.trim();
    const recognition = new Recognition();
    recognition.lang = lang === "hi" ? "hi-IN" : "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i += 1) transcript += event.results[i][0]?.transcript ?? "";
      const separator = speechBaseRef.current && transcript.trim() ? " " : "";
      setFreeText(`${speechBaseRef.current}${separator}${transcript.trimStart()}`);
    };
    recognition.onerror = (event) => {
      setSpeechError(event.error === "not-allowed" || event.error === "service-not-allowed" ? t.micPermission : t.micError);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setSpeechError(t.micError);
    }
  }

  async function handleParse() {
    if (!freeText.trim()) return;
    recognitionRef.current?.stop();
    setParsing(true);
    setParseError("");
    setParseSource("");
    setParseSummary([]);
    
    // Multi-step loading animation
    setLoadingStep(1);
    setTimeout(() => setLoadingStep(2), 400);
    setTimeout(() => setLoadingStep(3), 900);
    
    try {
      const res = await fetch("/api/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: freeText }) });
      const data = await res.json().catch(() => ({})) as { parsed?: ParsedIntake; source?: string; error?: string };
      if (!res.ok) throw new Error(data.error || t.parseError);
      if (!data.parsed) throw new Error(t.parseError);

      const p = data.parsed;
      const detectedLang: Lang = p.language === "hi" ? "hi" : p.language === "en" ? "en" : lang;
      const nextProfile: Profile = {
        ...initialProfile,
        ...p,
        language: detectedLang,
        household: { ...initialProfile.household, ...(p.household ?? {}) },
        documentsHave: Array.from(new Set(p.documentsHave ?? [])),
      };
      const facts = parsedFacts(p, detectedLang);
      if (facts.length === 0) throw new Error(t.noDetailsDetected);
      
      // Artificial minimum delay for better UX (feels more trustworthy)
      await new Promise(resolve => setTimeout(resolve, Math.max(0, 1200 - Date.now())));
      
      setProfile(nextProfile);
      setParseSummary(facts);
      setParseSource(data.source ?? "fallback");
      setAsked([]);
      setResult(null);
      setExplanation(null);
    } catch (error) {
      setParseError(error instanceof Error && error.message ? error.message : t.parseError);
    } finally {
      setParsing(false);
      setLoadingStep(1);
    }
  }

  async function handleSubmit() {
    setBusy(true);
    const a = runAssessment({ ...profile, language: lang });
    setResult(a);
    // Explanation: on-device fallback unless the user consents to the AI summary.
    if (aiConsent) {
      try {
        const res = await fetch("/api/explain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ facts: assessmentToFacts(a), language: lang }) });
        const data = await res.json();
        setExplanation({ text: data.text || fallbackExplanation(a, lang), source: data.text ? data.source : "offline" });
      } catch {
        setExplanation({ text: fallbackExplanation(a, lang), source: "offline" });
      }
    } else {
      setExplanation({ text: fallbackExplanation(a, lang), source: "offline" });
    }
    setBusy(false);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  function loadPersona(id: string) {
    const p = PERSONAS.find((x) => x.id === id);
    if (!p) return;
    setProfile({ ...initialProfile, ...p.profile });
    setFreeText(p.freeText);
    setParseSource("");
    setParseSummary([]);
    setParseError("");
    setAsked([]);
    setResult(null);
    setExplanation(null);
  }

  const guided = nextQuestion({ ...profile, language: lang }, asked);
  const liveCount = runAssessment({ ...profile, language: lang }).matches.length;

  const isTracked = (id: string) => tracked.some((x) => x.schemeId === id);
  function toggleTrack(id: string) {
    const now = new Date().toISOString();
    setTracked((prev) => (prev.some((x) => x.schemeId === id) ? prev.filter((x) => x.schemeId !== id) : [...prev, { schemeId: id, status: "to_start", addedAt: now, updatedAt: now } as TrackedApp]));
  }

  return (
    <div className="hs-page animate-page-enter min-h-screen">
      <Nav lang={lang} onLang={setLang} />
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Hero Card */}
        <div className="text-center animate-page-enter">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-mint-bg border border-mint-border/50 mb-3">
            <span className="text-xl">🔎</span>
            <span className="text-xs font-bold text-brand-green uppercase tracking-wider">
              {t.navSchemes}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
            {lang === "hi" ? "आइए आपके हक़ ढूँढें" : "Let's find what you're owed"}
          </h1>
          <p className="text-base text-slate-600 mt-2 max-w-xl mx-auto">
            {lang === "hi" 
              ? "नीचे दिए आसान सवालों के जवाब दें, या अपनी बात बताएँ"
              : "Answer the smart questions below, or tell us your story"
            }
          </p>
        </div>

        {/* Guided AI intake — value-of-information reasoning */}
        <section className="rounded-3xl bg-white p-6 border border-mint-border shadow-sm hover-lift transition-all animate-page-enter">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-mint-bg border border-mint-border/50 shrink-0">
              <span className="text-xl">🤖</span>
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-slate-800">
                {t.guidedTitle}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {lang === "hi" 
                  ? "हम सबसे ज़रूरी सवाल चुनेंगे जो आपके लिए ज़्यादा योजनाएँ खोल सकते हैं"
                  : "We'll ask the most useful questions that could unlock more benefits for you"
                }
              </p>
            </div>
          </div>
          
          {guided ? (
            <div className="mt-5 space-y-4 animate-page-enter">
              <div className="flex items-center justify-between">
                <p className="text-base font-bold text-slate-800">{guided.question[lang]}</p>
                <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                  {lang === "hi" ? `सवाल ${asked.length + 1}` : `Q${asked.length + 1}`}
                </span>
              </div>
              <div className="grid gap-2.5">
                {guided.options.map((o, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setProfile((p) => o.apply(p));
                      setAsked((a) => [...a, guided.id]);
                    }}
                    className="group w-full text-left rounded-2xl bg-white border-2 border-[#E3E0CF] hover:border-brand-green/50 hover:bg-mint-bg/10 px-5 py-4 text-sm font-bold text-slate-750 transition-all hover-lift click-scale shadow-xs flex items-center justify-between"
                  >
                    <span>{o.label[lang]}</span>
                    <span className="text-slate-400 group-hover:text-brand-green transition-colors text-lg">→</span>
                  </button>
                ))}
              </div>
              <div className="rounded-xl bg-mint-bg/30 border border-mint-border/50 p-3.5 flex items-start gap-2">
                <span className="text-base shrink-0">✨</span>
                <p className="text-xs font-bold text-brand-green leading-relaxed">
                  {t.askedBadge} · {t.guidedWhy.replace("{n}", String(guided.impact))}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-mint-bg/30 border border-mint-border/60 p-5 text-center">
              <p className="text-base font-bold text-brand-green flex items-center justify-center gap-2">
                <span>✓</span>
                <span>{t.guidedDone}</span>
              </p>
            </div>
          )}
          
          <div className="mt-5 flex items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-450">
              {t.soFar.replace("{n}", String(liveCount))}
            </span>
            <button
              onClick={() => requireAuth(handleSubmit)}
              disabled={busy}
              className="rounded-2xl bg-brand-green hover:bg-brand-green-hover px-6 py-3 text-sm font-bold text-white shadow-sm transition hover-lift click-scale disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
            >
              {busy ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t.finding}
                </>
              ) : (
                <>
                  <span>🔎</span>
                  {t.seeBenefits}
                </>
              )}
            </button>
          </div>
        </section>

        {/* Divider with "OR" */}
        <div className="relative flex items-center justify-center py-2 no-print animate-page-enter">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative bg-[#F5F5DC] px-4">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              {lang === "hi" ? "या" : "or"}
            </span>
          </div>
        </div>

        {/* Free-text story section */}
        <section className="rounded-3xl bg-white p-6 border border-[#E3E0CF]/80 shadow-sm hover-lift transition-all animate-page-enter no-print">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-mint-bg border border-mint-border/50 shrink-0">
              <span className="text-xl">💬</span>
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-slate-800">
                {t.describe}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {lang === "hi"
                  ? "अपने शब्दों में, या माइक दबाकर बोलें"
                  : "In your own words, or tap the mic to speak"
                }
              </p>
            </div>
          </div>
          
          <div className="mt-5 relative">
            <textarea
              suppressHydrationWarning
              value={freeText}
              onChange={(e) => {
                setFreeText(e.target.value);
                setParseSource("");
                setParseSummary([]);
                setParseError("");
              }}
              rows={4}
              placeholder={t.placeholder}
              className="w-full resize-none rounded-2xl border-2 border-[#E3E0CF] p-4 pb-14 pr-14 text-[15px] outline-none focus:border-brand-green focus:ring-4 focus:ring-mint-bg/50 transition-all"
            />
            <button
              type="button"
              onClick={toggleSpeech}
              disabled={!speechSupported}
              aria-label={listening ? t.stopListening : t.startListening}
              title={listening ? t.stopListening : t.startListening}
              className={`absolute bottom-4 right-4 grid h-11 w-11 place-items-center rounded-full shadow-md ring-2 transition-all click-scale ${
                listening
                  ? "animate-pulse bg-red-500 text-white ring-red-300"
                  : "bg-brand-green text-white ring-brand-green hover:bg-brand-green-hover hover:scale-110"
              } disabled:cursor-not-allowed disabled:bg-slate-200 disabled:ring-slate-250`}
            >
              {listening ? (
                <div className="flex items-center gap-0.5">
                  <span className="h-3 w-0.5 rounded-full bg-current animate-pulse" style={{ animationDelay: '0ms' }} />
                  <span className="h-4 w-0.5 rounded-full bg-current animate-pulse" style={{ animationDelay: '150ms' }} />
                  <span className="h-3.5 w-0.5 rounded-full bg-current animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
              ) : (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5 fill-none stroke-current"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="2" width="6" height="12" rx="3" />
                  <path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" />
                </svg>
              )}
            </button>
          </div>
          
          {listening && (
            <p role="status" className="mt-2 text-xs font-bold text-red-600 animate-pulse flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
              {t.listening} ({lang === "hi" ? "हिंदी" : "English"})
            </p>
          )}
          {!speechSupported && <p className="mt-2 text-xs text-slate-400">{t.micUnsupported}</p>}
          {speechError && <p role="alert" className="mt-2 text-xs font-semibold text-red-650">{speechError}</p>}
          
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={handleParse}
              disabled={parsing || !freeText.trim()}
              className="rounded-2xl bg-brand-green hover:bg-brand-green-hover px-6 py-3 text-sm font-bold text-white transition hover-lift click-scale disabled:opacity-50 disabled:pointer-events-none shadow-sm flex items-center gap-2"
            >
              {parsing ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {loadingStep === 1 && (lang === "hi" ? "पढ़ रहे हैं..." : "Reading...")}
                  {loadingStep === 2 && (lang === "hi" ? "समझ रहे हैं..." : "Understanding...")}
                  {loadingStep === 3 && (lang === "hi" ? "मिला रहे हैं..." : "Matching...")}
                </>
              ) : (
                <>
                  <span>✨</span>
                  {t.understand}
                </>
              )}
            </button>
            {parseSource && (
              <span role="status" className="text-xs font-bold text-brand-green bg-mint-bg px-3 py-2 rounded-xl border border-mint-border/50 flex items-center gap-1.5 animate-page-enter">
                <span>✓</span>
                {parseSource === "gemini" ? t.understoodAI : t.understoodLocal}
              </span>
            )}
          </div>
          
          {parseSummary.length > 0 && (
            <div className="mt-4 rounded-2xl bg-mint-bg/50 p-5 border border-mint-border animate-page-enter">
              <p className="text-xs font-bold text-brand-green uppercase tracking-wider flex items-center gap-1.5">
                <span>💡</span>
                {t.detected}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {parseSummary.map((fact, idx) => (
                  <span
                    key={fact}
                    className="rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 border border-mint-border/80 shadow-xs animate-page-enter"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    {fact}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-brand-green/90 leading-relaxed">{t.reviewDetected}</p>
            </div>
          )}
          
          {parseError && (
            <p
              role="alert"
              className="mt-4 rounded-2xl bg-red-50/70 px-4 py-3.5 text-xs font-bold text-red-700 border border-red-100 animate-page-enter"
            >
              {parseError}
            </p>
          )}
          
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">{t.tryPersona}</p>
            <div className="flex flex-wrap gap-2">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => loadPersona(p.id)}
                  title={p.blurb}
                  className="group relative rounded-full bg-slate-50 border border-[#E3E0CF]/80 px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:border-brand-green/50 click-scale hover-lift"
                >
                  {p.name}
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-brand-green border-2 border-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* manual form (optional / advanced) */}
        <details className="group no-print">
          <summary className="cursor-pointer list-none rounded-2xl bg-white px-5 py-4 text-[14px] font-bold text-slate-700 shadow-2xs border border-slate-250/80 marker:hidden flex items-center justify-between hover-lift transition">
            <span>{t.orForm}</span>
            <span className="inline-block transition-transform duration-250 group-open:rotate-90">▸</span>
          </summary>
          <div className="mt-4 space-y-6">
            {/* who */}
            <section className="rounded-3xl bg-white p-5 border border-[#E3E0CF]/80 shadow-2xs hover-lift transition">
              <h2 className="text-[15px] font-bold text-slate-850 uppercase tracking-wider">{t.whoTitle}</h2>
              <p className="mt-3.5 text-[12.5px] font-bold text-slate-500 uppercase tracking-wider">
                {t.category}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["SC", "ST", "OBC", "EWS", "GENERAL"] as const).map((c) => (
                  <Chip
                    key={c}
                    active={profile.category === c}
                    onClick={() => setProfile((p) => ({ ...p, category: c }))}
                    label={c === "GENERAL" ? (lang === "hi" ? "सामान्य" : "General") : c}
                  />
                ))}
              </div>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="mb-1.5 text-[12.5px] font-bold text-slate-500 uppercase tracking-wider">{t.age}</p>
                  <input
                    type="number"
                    value={profile.age ?? ""}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        age: e.target.value === "" ? undefined : Number(e.target.value),
                      }))
                    }
                    placeholder="—"
                    className="w-full rounded-2xl border border-[#E3E0CF] px-4 py-2.5 text-sm font-bold outline-none focus:border-brand-green focus:ring-2 focus:ring-mint-bg transition"
                  />
                </div>
                <div>
                  <p className="mb-1.5 text-[12.5px] font-bold text-slate-500 uppercase tracking-wider">{t.gender}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(["female", "male", "other"] as const).map((g) => (
                      <Chip
                        key={g}
                        small
                        active={profile.gender === g}
                        onClick={() => setProfile((p) => ({ ...p, gender: g }))}
                        label={
                          g === "female"
                            ? lang === "hi"
                              ? "महिला"
                              : "Woman"
                            : g === "male"
                            ? lang === "hi"
                              ? "पुरुष"
                              : "Man"
                            : lang === "hi"
                            ? "अन्य"
                            : "Other"
                        }
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[12.5px] font-bold text-slate-500 uppercase tracking-wider">{t.state}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(["RAJASTHAN", "BIHAR", "CENTRAL"] as const).map((s) => (
                      <Chip
                        key={s}
                        small
                        active={profile.state === s}
                        onClick={() => setProfile((p) => ({ ...p, state: s }))}
                        label={
                          s === "RAJASTHAN"
                            ? lang === "hi"
                              ? "राजस्थान"
                              : "Rajasthan"
                            : s === "BIHAR"
                            ? lang === "hi"
                              ? "बिहार"
                              : "Bihar"
                            : lang === "hi"
                            ? "अन्य"
                              : "Other"
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-5">
                <p className="mb-1.5 text-[12.5px] font-bold text-slate-500 uppercase tracking-wider">{t.income}</p>
                <input
                  type="number"
                  value={profile.annualHouseholdIncome ?? ""}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      annualHouseholdIncome: e.target.value === "" ? undefined : Number(e.target.value),
                    }))
                  }
                  placeholder="e.g. 90000"
                  className="w-full rounded-2xl border border-[#E3E0CF] px-4 py-2.5 text-sm font-bold outline-none focus:border-brand-green focus:ring-2 focus:ring-mint-bg transition sm:w-1/2"
                />
              </div>
            </section>

            {/* situation */}
            <section className="rounded-3xl bg-white p-5 border border-[#E3E0CF]/80 shadow-2xs hover-lift transition">
              <h2 className="text-[15px] font-bold text-slate-850 uppercase tracking-wider">{t.situationTitle}</h2>
              <div className="mt-4.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {SITUATIONS.map((s) => (
                  <BigChip
                    key={s.key}
                    icon={s.icon}
                    label={lang === "hi" ? s.hi : s.en}
                    active={s.active(profile)}
                    onClick={() => setProfile((p: Profile) => (s.active(p) ? s.off(p) : s.on(p)))}
                  />
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 p-4 border border-[#E3E0CF]/60 shadow-3xs">
                <p className="text-[12.5px] text-slate-500 font-semibold leading-relaxed">{t.docsHint}</p>
                <Link
                  href="/documents"
                  className="text-[12.5px] font-bold text-brand-green hover:text-brand-green-hover shrink-0 hover:underline"
                >
                  {t.editDocs}
                </Link>
              </div>
              <button
                onClick={() => requireAuth(handleSubmit)}
                disabled={busy}
                className="mt-5 w-full rounded-2xl bg-brand-green hover:bg-brand-green-hover py-3.5 text-[15.5px] font-bold text-white shadow-md transition hover-lift click-scale disabled:opacity-50"
              >
                {busy ? t.finding : `🔎 ${t.submit}`}
              </button>
            </section>
          </div>
        </details>

        {/* results */}
        {result && (
          <div ref={resultRef} className="space-y-6">
            <div className="hidden print:block text-lg font-bold text-slate-900">
              ClaimKaro — {lang === "hi" ? "मेरी लाभ योजना" : "my benefit plan"}
            </div>
            <div className="flex justify-end gap-2.5 no-print animate-page-enter">
              <button
                onClick={() => window.print()}
                className="rounded-2xl bg-slate-850 hover:bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover-lift click-scale transition flex items-center gap-1.5"
              >
                <span>🖨️</span>
                {t.printPlan}
              </button>
              <button
                onClick={() => {
                  setResult(null);
                  setExplanation(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="rounded-2xl bg-white border border-[#E3E0CF] px-4 py-2.5 text-xs font-bold text-slate-550 hover-lift click-scale hover:bg-slate-50 transition flex items-center gap-1.5"
              >
                <span>↻</span>
                {t.reset}
              </button>
            </div>

            <div className="animate-page-enter" style={{ animationDelay: '100ms' }}>
              <Hero a={result} lang={lang} />
            </div>
            
            {result.unlockPath.length > 0 && (
              <div className="animate-page-enter" style={{ animationDelay: '200ms' }}>
                <UnlockPath a={result} lang={lang} />
              </div>
            )}
            
            <div className="animate-page-enter" style={{ animationDelay: '300ms' }}>
              <TrapCard a={result} lang={lang} />
            </div>

            {explanation?.text && (
              <section className="rounded-3xl bg-gradient-to-br from-mint-bg/40 to-white p-6 border border-mint-border shadow-sm hover-lift transition animate-page-enter" style={{ animationDelay: '400ms' }}>
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="text-2xl">💬</span>
                  <div>
                    <h3 className="text-base font-bold text-slate-850">{t.explainTitle}</h3>
                    <span className="inline-block mt-1 rounded-lg bg-mint-bg px-2.5 py-0.5 text-[10.5px] font-bold text-brand-green border border-mint-border/50">
                      {explanation.source === "gemini" ? "Gemini AI" : "offline"}
                    </span>
                  </div>
                </div>
                <div className="border-l-4 border-brand-green bg-white/80 rounded-r-2xl pl-5 pr-4 py-4">
                  <p className="whitespace-pre-line text-[15px] leading-loose text-slate-700 font-medium">
                    {explanation.text}
                  </p>
                </div>
                <p className="mt-3 text-[11px] italic text-slate-400 font-semibold">{t.explainNote}</p>
              </section>
            )}

            <div className="space-y-4">
              {result.matches.map((m, idx) => (
                <div 
                  key={m.id} 
                  className="animate-page-enter"
                  style={{ animationDelay: `${500 + idx * 80}ms` }}
                >
                  <BenefitCard
                    m={m}
                    lang={lang}
                    isTracked={isTracked(m.id)}
                    onTrack={(id) => requireAuth(() => toggleTrack(id))}
                  />
                </div>
              ))}
            </div>

            {result.actionPlan.length > 0 && (
              <section className="rounded-3xl bg-white p-6 border border-[#E3E0CF]/80 shadow-sm hover-lift transition animate-page-enter" style={{ animationDelay: `${500 + result.matches.length * 80}ms` }}>
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="text-2xl">🧭</span>
                  <h3 className="text-base font-bold text-slate-850">{t.planTitle}</h3>
                </div>
                <ol className="space-y-4">
                  {result.actionPlan.map((s) => (
                    <li key={s.order} className="flex gap-4">
                      <span
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-extrabold text-white shadow-sm ${
                          s.kind === "get_document"
                            ? "bg-amber-500"
                            : s.kind === "apply_scheme"
                            ? "bg-brand-green"
                            : "bg-slate-500"
                        }`}
                      >
                        {s.order}
                      </span>
                      <div className="flex-1">
                        <p className="text-[15.5px] font-bold text-slate-800">{s.title[lang]}</p>
                        <p className="text-[14px] text-slate-600 leading-relaxed mt-1">
                          {s.detail[lang]}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <label className="no-print flex items-center gap-3 rounded-2xl bg-white border border-[#E3E0CF]/80 p-4 text-[13px] text-slate-600 shadow-xs cursor-pointer select-none hover-lift hover:bg-slate-50/55 transition-colors animate-page-enter">
              <input
                type="checkbox"
                checked={aiConsent}
                onChange={(e) => setAIConsent(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-brand-green focus:ring-mint-bg cursor-pointer"
              />
              <span className="font-semibold leading-snug">{t.aiConsent}</span>
            </label>

            <section className="rounded-3xl bg-white p-6 border border-[#E3E0CF]/80 shadow-sm hover-lift transition animate-page-enter">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="text-2xl">📚</span>
                <h3 className="text-base font-bold text-slate-850">{t.sources}</h3>
              </div>
              <ul className="space-y-4 divide-y divide-slate-100">
                {result.citations.map((c, idx) => (
                  <li key={c.id} className={`text-[13.5px] leading-relaxed ${idx > 0 ? "pt-4" : ""}`}>
                    <p className="font-bold text-slate-800">
                      {c.label[lang]} <span className="ml-1 text-xs font-semibold text-slate-405">· {c.asOf}</span>
                    </p>
                    <p className="text-slate-550">{c.source}</p>
                    {c.note && <p className="text-slate-500 italic mt-0.5">{c.note[lang]}</p>}
                    {c.url && (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-green font-bold hover:text-brand-green-hover hover:underline inline-flex items-center gap-0.5 mt-1"
                      >
                        {t.verify} ↗
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
        <footer className="pb-10 pt-4 text-center text-[11px] font-semibold text-slate-400 max-w-sm mx-auto leading-normal">
          {t.trust}
        </footer>
      </main>
    </div>
  );
}
