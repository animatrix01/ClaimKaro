"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, FolderOpen, MapPin, User } from "lucide-react";
import { useProfile } from "@/lib/store";
import { Nav } from "@/components/shared";
import { T } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

function AccentHeadline({ text, lang }: { text: string; lang: Lang }) {
  const word = lang === "hi" ? "सरकार" : "government";
  const idx = text.toLowerCase().indexOf(word);
  if (idx === -1) {
    return <>{text}</>;
  }
  const end = idx + word.length;
  return (
    <>
      {text.slice(0, idx)}
      <span className="hs-accent">{text.slice(idx, end)}</span>
      {text.slice(end)}
    </>
  );
}

function FAQ({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [open, setOpen] = useState<number | null>(0);
  const items = [
    { q: t.faqQ1, a: t.faqA1 },
    { q: t.faqQ2, a: t.faqA2 },
    { q: t.faqQ3, a: t.faqA3 },
    { q: t.faqQ4, a: t.faqA4 },
    { q: t.faqQ5, a: t.faqA5 },
    { q: t.faqQ6, a: t.faqA6 },
  ];
  return (
    <section id="faq" className="mt-12 border-t border-[#E3E0CF] pt-8">
      <div className="mb-6 text-center">
        <p className="text-[15px] font-black tracking-wider uppercase text-brand-green">FAQ</p>
        <h2 className="hs-h1 mt-2 text-[1.75rem] font-black leading-snug">{t.faqTitle}</h2>
      </div>
      <div className="mx-auto max-w-3xl space-y-1">
        {items.map((it, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="rounded-xl border border-transparent transition hover:border-[#E3E0CF] hover:bg-white/60">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full cursor-pointer items-center justify-between gap-4 px-3 py-2.5 text-left"
              >
                <span className="text-[15px] font-extrabold text-[#232A33]">{it.q}</span>
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border border-mint-border bg-mint-bg text-xs font-bold text-brand-green transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                  aria-hidden
                >
                  ▸
                </span>
              </button>
              {isOpen && (
                <p className="px-3 pb-3 text-[13px] font-semibold leading-relaxed text-[#5B6470]">{it.a}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SchemeSpotlight({ lang }: { lang: Lang }) {
  const schemes = [
    {
      id: "pmkisan", icon: "🌾", name: "PM-KISAN", hindiName: "पीएम-किसान",
      benefit: "₹6,000 / year", hindisBenefit: "₹6,000 / वर्ष",
      eligibility: "For small & marginal farmers", hindiEligibility: "छोटे व सीमांत किसानों के लिए",
      tag: "Agriculture", hindiTag: "कृषि",
      ministry: "Ministry of Agriculture", hindiMinistry: "कृषि मंत्रालय",
      color: "from-green-50 to-emerald-50", borderColor: "border-green-200",
    },
    {
      id: "pmjay", icon: "🏥", name: "PM-JAY (Ayushman Bharat)", hindiName: "पीएम-जेएवाई (आयुष्मान भारत)",
      benefit: "₹5 lakh / year health cover", hindisBenefit: "₹5 लाख / वर्ष स्वास्थ्य बीमा",
      eligibility: "For BPL & low-income families", hindiEligibility: "BPL व कम-आय परिवारों के लिए",
      tag: "Health", hindiTag: "स्वास्थ्य",
      ministry: "Ministry of Health & Family Welfare", hindiMinistry: "स्वास्थ्य मंत्रालय",
      color: "from-blue-50 to-cyan-50", borderColor: "border-blue-200",
    },
    {
      id: "pmayg", icon: "🏠", name: "PMAY-G (Rural Housing)", hindiName: "पीएमएवाई-ग्रामीण",
      benefit: "₹1.2–1.3 lakh one-time", hindisBenefit: "₹1.2–1.3 लाख एकमुश्त",
      eligibility: "Homeless rural families", hindiEligibility: "बेघर ग्रामीण परिवारों के लिए",
      tag: "Housing", hindiTag: "आवास",
      ministry: "Ministry of Rural Development", hindiMinistry: "ग्रामीण विकास मंत्रालय",
      color: "from-orange-50 to-amber-50", borderColor: "border-orange-200",
    },
    {
      id: "ujjwala", icon: "🔥", name: "Ujjwala Yojana", hindiName: "उज्ज्वला योजना",
      benefit: "Free LPG connection", hindisBenefit: "मुफ़्त LPG कनेक्शन",
      eligibility: "BPL women without gas", hindiEligibility: "बिना गैस वाली BPL महिलाओं के लिए",
      tag: "Fuel", hindiTag: "ईंधन",
      ministry: "Ministry of Petroleum", hindiMinistry: "पेट्रोलियम मंत्रालय",
      color: "from-red-50 to-pink-50", borderColor: "border-red-200",
    },
    {
      id: "nfsa", icon: "🌾", name: "NFSA (Food Security)", hindiName: "राष्ट्रीय खाद्य सुरक्षा",
      benefit: "5 kg grain/month @ ₹1–3/kg", hindisBenefit: "5 किलो अनाज/माह @ ₹1–3/किलो",
      eligibility: "Priority household members", hindiEligibility: "प्राथमिकता परिवार के सदस्यों के लिए",
      tag: "Food", hindiTag: "भोजन",
      ministry: "Ministry of Consumer Affairs", hindiMinistry: "उपभोक्ता मामले मंत्रालय",
      color: "from-yellow-50 to-amber-50", borderColor: "border-yellow-200",
    },
    {
      id: "mgnrega", icon: "👷", name: "MGNREGA", hindiName: "मनरेगा",
      benefit: "100 days guaranteed work/year", hindisBenefit: "100 दिन गारंटी रोजगार/वर्ष",
      eligibility: "Rural adults willing to work", hindiEligibility: "काम करने के इच्छुक ग्रामीण वयस्क",
      tag: "Employment", hindiTag: "रोजगार",
      ministry: "Ministry of Rural Development", hindiMinistry: "ग्रामीण विकास मंत्रालय",
      color: "from-purple-50 to-indigo-50", borderColor: "border-purple-200",
    },
  ];

  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setCurrent((c) => (c + 1) % schemes.length);
        setAnimating(false);
      }, 400);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const s = schemes[current];

  return (
    <div 
      className="w-full max-w-[520px]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Main card */}
      <div
        className={`hs-card p-7 transition-all duration-400 ${animating ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"}`}
      >
        {/* Ministry tag + counter */}
        <div className="mb-5 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mint-bg border border-mint-border px-3 py-1 text-[11px] font-bold text-brand-green">
            {lang === "hi" ? s.hindiMinistry : s.ministry}
          </span>
          <p className="text-[12px] font-bold text-[#8A94A0]">
            {current + 1}/{schemes.length}
          </p>
        </div>

        {/* Scheme name + icon */}
        <div className="flex items-start gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-mint-bg border-2 border-mint-border text-4xl">
            {s.icon}
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-[20px] font-black text-[#232A33] leading-tight">
              {lang === "hi" ? s.hindiName : s.name}
            </h3>
            <p className="mt-1.5 text-[13px] font-semibold text-[#5B6470] leading-relaxed">
              {lang === "hi" ? s.hindiEligibility : s.eligibility}
            </p>
          </div>
        </div>

        {/* Benefit box */}
        <div className="mt-5 rounded-2xl bg-brand-green px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/90">
            {lang === "hi" ? "लाभ" : "Benefit"}
          </p>
          <p className="mt-1.5 text-[24px] font-black text-white leading-tight">
            {lang === "hi" ? s.hindisBenefit : s.benefit}
          </p>
        </div>

        {/* CTA */}
        <Link
          href="/schemes"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#232A33] py-3.5 text-[14px] font-bold text-white hover:bg-[#1a1f28] transition-colors"
        >
          <span>{lang === "hi" ? "जांचें - मैं पात्र हूँ?" : "Check eligibility"}</span>
          <span aria-hidden>→</span>
        </Link>
      </div>

      {/* Dots */}
      <div className="mt-3 flex justify-center gap-1.5">
        {schemes.map((_, i) => (
          <button
            key={i}
            onClick={() => { 
              setAnimating(true); 
              setTimeout(() => { 
                setCurrent(i); 
                setAnimating(false); 
              }, 400); 
            }}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? "w-6 bg-brand-green" : "w-1.5 bg-[#C6DDCF]"}`}
            aria-label={`Scheme ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [profile, setProfile] = useProfile();
  const lang = profile.language;
  const setLang = (l: Lang) => setProfile((p) => ({ ...p, language: l }));
  const t = T[lang];

  const steps = [
    { t: t.step1Title, b: t.step1Body },
    { t: t.step2Title, b: t.step2Body },
    { t: t.step3Title, b: t.step3Body },
  ];

  const cards: [string, React.ReactNode, string, string, string][] = [
    ["/schemes", <Search key="s" size={28} className="text-brand-green" strokeWidth={2.2} />, t.navSchemes, t.openSchemes, lang === "hi" ? "आप किन योजनाओं के पात्र हैं, जानें।" : "Explore schemes you're entitled to."],
    ["/documents", <FolderOpen key="d" size={28} className="text-brand-green" strokeWidth={2.2} />, t.navDocs, t.openDocs, lang === "hi" ? "अपने दस्तावेज़ तैयार रखें।" : "Keep your documents ready."],
    ["/tracker", <MapPin key="t" size={28} className="text-brand-green" strokeWidth={2.2} />, t.navTracker, t.openTracker, lang === "hi" ? "अपने आवेदन ट्रैक करें।" : "Track your applications."],
    ["/profile", <User key="p" size={28} className="text-brand-green" strokeWidth={2.2} />, t.navProfile, t.openProfile, lang === "hi" ? "अपनी प्रोफ़ाइल देखें और बदलें।" : "View and update your profile."],
  ];

  const stats: [string, string, string][] =
    lang === "hi"
      ? [["📋", "11+", "सरकारी योजनाएँ"], ["⚡", "100%", "मुफ़्त, हमेशा"], ["🔒", "0", "डेटा साझा नहीं"]]
      : [["📋", "11+", "Government schemes"], ["⚡", "100%", "Free, always"], ["🔒", "0", "Data shared"]];


  return (
    <div className="hs-page animate-page-enter min-h-screen">
      <Nav lang={lang} onLang={setLang} />
      <main className="mx-auto w-full max-w-[1400px] px-5 sm:px-8">
        {/* SaaS hero: text vertically centred on the left, assistant docked right */}
        <section className="grid items-center gap-8 pt-4 pb-8 sm:pt-5 sm:pb-10 lg:grid-cols-2 lg:gap-6 lg:pt-6 lg:pb-12">
          <div className="flex flex-col justify-center">
            <span className="hs-chip w-fit">
              <span>⚡</span>
              <span>{lang === "hi" ? "100% निःशुल्क" : "100% Free"}</span>
            </span>
            <h1
              className="hs-h1 mt-4"
              style={{ fontSize: "clamp(2.4rem, 4.6vw, 4rem)", lineHeight: 1.12 }}
            >
              <AccentHeadline text={t.homeHeadline} lang={lang} />
            </h1>
            <p className="hs-sub mt-4 max-w-xl text-[15.5px] leading-relaxed">
              {t.homeSub}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link href="/schemes" className="hs-btn-primary">
                <span aria-hidden>→</span>
                <span>{t.homeStart}</span>
              </Link>
              <a href="#how-it-works" className="hs-btn-ghost">
                <span className="grid h-9 w-9 place-items-center rounded-full border border-[#E3E0CF] bg-white text-xs shadow-sm">
                  ▶
                </span>
                <span>{t.homeHow}</span>
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-10 gap-y-4">
              {stats.map(([icon, big, small]) => (
                <div key={small} className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-mint-bg border-2 border-mint-border text-xl shadow-sm">
                    {icon}
                  </span>
                  <span>
                    <span className="block text-[18px] font-black leading-none text-[#232A33]">{big}</span>
                    <span className="mt-1.5 block text-[14px] font-bold text-[#5B6470]">{small}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Scheme Spotlight Widget */}
          <div className="relative flex flex-col items-center justify-center gap-4 lg:items-end lg:pr-32 mb-8">
            <SchemeSpotlight lang={lang} />
          </div>
        </section>

        {/* Feature cards — minimal icon + text stack, no boxes */}
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 my-12 w-full justify-items-start">
          {cards.map(([href, icon, title, cta, sub]) => (
            <Link key={href} href={href} className="group flex w-[160px] flex-col items-start text-left hover:scale-105 transition-transform duration-200">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-mint-bg border-2 border-mint-border text-brand-green group-hover:scale-110 group-hover:shadow-md transition-all duration-200">
                {icon}
              </span>
              <p className="mt-4 text-[15px] font-extrabold text-[#232A33] leading-snug">{title}</p>
              <p className="mt-1.5 text-[14px] font-semibold text-[#5B6470] leading-relaxed">{sub}</p>
              <p className="mt-3 text-[14px] font-bold text-brand-green group-hover:underline">
                {cta} <span aria-hidden>→</span>
              </p>
            </Link>
          ))}
        </div>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" className="mt-20 grid gap-6 rounded-3xl border-2 border-dashed border-[#C6DDCF] bg-white/40 p-8 lg:grid-cols-[220px_1fr]">
          <div>
            <p className="text-[15px] font-black tracking-wider uppercase text-brand-green">{lang === "hi" ? "यह कैसे काम करता है" : "How it works"}</p>
            <h2 className="hs-h1 mt-2 text-[1.75rem] font-black leading-snug">
              {lang === "hi" ? "आसान कदम। असली लाभ।" : "Simple steps. Real benefits."}
            </h2>
          </div>
          <ol className="grid gap-6 sm:grid-cols-3">
            {steps.map((s, idx) => (
              <li key={idx} className="flex gap-3.5">
                <span className="hs-step-num">{idx + 1}</span>
                <div>
                  <p className="text-[14.5px] font-extrabold text-[#232A33]">
                    {s.t.replace(/^\d\s*·\s*/, "")}
                  </p>
                  <p className="hs-sub mt-1 text-[13px] font-bold leading-relaxed">{s.b}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── ILLUSTRATED EXPLAINER — How we're different ── */}
        <section className="mt-24">
          {/* Section heading */}
          <div className="mb-8 text-center">
            <p className="text-[15px] font-black tracking-wider uppercase text-brand-green">{lang === "hi" ? "हम अलग कैसे हैं" : "How we're different"}</p>
            <h2 className="hs-h1 mt-2 text-[1.75rem] font-black leading-snug">
              {lang === "hi" ? "हम बाकियों की तरह नहीं हैं।" : "We're not like the others."}
            </h2>
          </div>

          {/* Two-column comparison */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Left — Other apps (what NOT to do) */}
            <div className="rounded-2xl border-2 border-red-200/60 bg-red-50/30 p-6">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-100 text-base">❌</span>
                <h3 className="text-[15px] font-extrabold text-red-900">
                  {lang === "hi" ? "दूसरे ऐप्स" : "Other apps"}
                </h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-red-600">•</span>
                  <p className="text-[13.5px] font-semibold leading-relaxed text-red-900/80">
                    {lang === "hi" ? "चैटबॉट सिर्फ अनुमान लगाता है" : "Chatbot just guesses eligibility"}
                  </p>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-red-600">•</span>
                  <p className="text-[13.5px] font-semibold leading-relaxed text-red-900/80">
                    {lang === "hi" ? "आपका डेटा क्लाउड पर अपलोड होता है" : "Your data gets uploaded to the cloud"}
                  </p>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-red-600">•</span>
                  <p className="text-[13.5px] font-semibold leading-relaxed text-red-900/80">
                    {lang === "hi" ? "ब्लैक बॉक्स — कोई स्रोत नहीं" : "Black box — no sources cited"}
                  </p>
                </li>
              </ul>
            </div>

            {/* Right — ClaimKaro (what we do) */}
            <div className="rounded-2xl border-2 border-brand-green/40 bg-mint-bg/40 p-6">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-green text-base text-white">✓</span>
                <h3 className="text-[15px] font-extrabold text-brand-green">
                  {lang === "hi" ? "ClaimKaro" : "ClaimKaro"}
                </h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-brand-green">•</span>
                  <p className="text-[13.5px] font-semibold leading-relaxed text-[#1C2B26]">
                    {lang === "hi"
                      ? "नियम-इंजन 11 असली योजनाओं के विरुद्ध जाँचता है"
                      : "Rules engine checks against 11 real schemes"}
                  </p>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-brand-green">•</span>
                  <p className="text-[13.5px] font-semibold leading-relaxed text-[#1C2B26]">
                    {lang === "hi"
                      ? "आपका डेटा आपके डिवाइस पर ही रहता है"
                      : "Your data stays on your device — never uploaded"}
                  </p>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-brand-green">•</span>
                  <p className="text-[13.5px] font-semibold leading-relaxed text-[#1C2B26]">
                    {lang === "hi"
                      ? "हर नियम सरकारी दस्तावेज़ों से जुड़ा है"
                      : "Every rule traced back to official government docs"}
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── FAQ (bottom of all sections) ── */}
        <FAQ lang={lang} />

        <footer className="mx-auto max-w-md pb-8 pt-5 text-center text-[11px] font-semibold leading-normal text-[#8A94A0]">
          {t.trust}
        </footer>
      </main>
    </div>
  );
}
