"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { tx } from "@/lib/rules/types";
import type { Assessment, DocId, Profile, Readiness, SchemeMatch, Verdict, YesNoUnsure } from "@/lib/rules/types";
import { T, type Dict, type Lang } from "@/lib/i18n";
import { speakText, stopSpeaking } from "@/lib/speech";

export const DOC_ICON: Record<DocId, string> = {
  aadhaar: "🪪", bank: "🏦", caste: "📜", income: "💰", ews: "📄", domicile: "🏠", ration_bpl: "🍚", disability_udid: "♿",
};
export const ALL_DOCS: DocId[] = ["aadhaar", "bank", "ration_bpl", "caste", "income", "domicile", "disability_udid"];

export const VERDICT_META: Record<Verdict, { key: keyof Dict; cls: string; dot: string }> = {
  likely_eligible: { key: "youMayGet", cls: "bg-blue-100 text-blue-800 ring-blue-200", dot: "bg-blue-500" },
  maybe_eligible: { key: "worthChecking", cls: "bg-amber-100 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  need_info: { key: "tellMore", cls: "bg-sky-100 text-sky-800 ring-sky-200", dot: "bg-sky-500" },
  likely_not: { key: "notNow", cls: "bg-slate-200 text-slate-600 ring-slate-300", dot: "bg-slate-400" },
};

export function hh(p: Profile, patch: Partial<Profile["household"]>): Profile {
  return { ...p, household: { ...p.household, ...patch } };
}

export const SITUATIONS: { key: string; icon: string; en: string; hi: string; on: (p: Profile) => Profile; off: (p: Profile) => Profile; active: (p: Profile) => boolean }[] = [
  { key: "bpl", icon: "🪙", en: "BPL / low-income household", hi: "BPL / कम-आय परिवार", on: (p) => ({ ...p, bpl: true }), off: (p) => ({ ...p, bpl: undefined }), active: (p) => p.bpl === true },
  { key: "widow", icon: "🕊️", en: "Widow", hi: "विधवा", on: (p) => hh(p, { isWidow: true }), off: (p) => hh(p, { isWidow: false }), active: (p) => p.household.isWidow },
  { key: "preg", icon: "🤰", en: "Pregnant / new mother", hi: "गर्भवती / नई माँ", on: (p) => hh(p, { isPregnantOrLactating: true }), off: (p) => hh(p, { isPregnantOrLactating: false }), active: (p) => p.household.isPregnantOrLactating },
  { key: "child", icon: "🎒", en: "Children in school/college", hi: "बच्चे स्कूल/कॉलेज में", on: (p) => hh(p, { hasSchoolGoingChild: true }), off: (p) => hh(p, { hasSchoolGoingChild: false }), active: (p) => p.household.hasSchoolGoingChild },
  { key: "elder", icon: "👵", en: "Elderly (60+) at home", hi: "घर में बुज़ुर्ग (60+)", on: (p) => hh(p, { hasElderly60Plus: true }), off: (p) => hh(p, { hasElderly60Plus: false }), active: (p) => p.household.hasElderly60Plus },
  { key: "disab", icon: "♿", en: "Person with disability", hi: "दिव्यांग व्यक्ति", on: (p) => ({ ...p, disability: "severe" }), off: (p) => ({ ...p, disability: "none" }), active: (p) => p.disability !== "none" },
  { key: "village", icon: "🌾", en: "Live in a village", hi: "गाँव में रहते हैं", on: (p) => hh(p, { isRural: true }), off: (p) => hh(p, { isRural: false }), active: (p) => p.household.isRural },
  { key: "kachha", icon: "🏚️", en: "No pucca (solid) house", hi: "पक्का घर नहीं", on: (p) => hh(p, { lacksPuccaHouse: true }), off: (p) => hh(p, { lacksPuccaHouse: false }), active: (p) => p.household.lacksPuccaHouse },
  { key: "nolpg", icon: "🔥", en: "No gas (LPG) connection", hi: "गैस कनेक्शन नहीं", on: (p) => hh(p, { lacksLpg: true }), off: (p) => hh(p, { lacksLpg: false }), active: (p) => p.household.lacksLpg },
  { key: "laborer", icon: "👷", en: "Daily-wage / no fixed job", hi: "दिहाड़ी / पक्की नौकरी नहीं", on: (p) => ({ ...p, occupation: "landless_laborer" }), off: (p) => ({ ...p, occupation: undefined }), active: (p) => p.occupation === "landless_laborer" },
  { key: "farmer", icon: "🚜", en: "Own farmland", hi: "खेती की ज़मीन है", on: (p) => ({ ...p, occupation: "small_farmer" }), off: (p) => ({ ...p, occupation: undefined }), active: (p) => p.occupation === "small_farmer" },
];

// ----------------------------- Nav -----------------------------------------
export function Nav({ lang, onLang }: { lang: Lang; onLang: (l: Lang) => void }) {
  const t = T[lang];
  const path = usePathname();
  const tabs: [string, string][] = [
    ["/", t.navHome],
    ["/schemes", t.navSchemes],
    ["/documents", t.navDocs],
    ["/tracker", t.navTracker],
    ["/profile", t.navProfile],
  ];

  return (
    <header className="no-print sticky top-0 z-40 border-b border-[#E3E0CF] bg-[#F5F5DC]/90 backdrop-blur">
      <div className="mx-auto w-full max-w-[1400px] px-5 py-3.5 flex items-center justify-between gap-4 sm:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group transition click-scale shrink-0">
          <div className="h-9 w-9 rounded-xl overflow-hidden shadow-sm shrink-0">
            <img src="/logo.png" alt="ClaimKaro" className="h-full w-full object-cover" />
          </div>
          <span className="text-lg font-extrabold text-[#232A33] tracking-tight group-hover:text-brand-green transition">
            ClaimKaro
          </span>
        </Link>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          {tabs.map(([href, label]) => {
            const active = href === "/" ? path === "/" : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`whitespace-nowrap px-3.5 py-2 text-[14px] font-bold transition-all relative click-scale ${
                  active
                    ? "text-brand-green"
                    : "text-[#5B6470] hover:text-brand-green"
                }`}
              >
                {label}
                {active && (
                  <span className="absolute bottom-0.5 left-3 right-3 h-[2px] bg-brand-green rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Lang Toggle */}
        <div className="flex items-center rounded-full border border-[#E3E0CF] bg-white p-1 text-[12px] font-bold shadow-sm shrink-0">
          {(["en", "hi"] as const).map((l) => (
            <button
              key={l}
              onClick={() => onLang(l)}
              className={`rounded-full px-3.5 py-1.5 whitespace-nowrap transition click-scale font-bold cursor-pointer ${
                lang === l
                  ? "bg-brand-green text-white shadow-sm"
                  : "text-[#5B6470] hover:text-brand-green"
              }`}
            >
              {l === "en" ? "ENGLISH" : "हिन्दी"}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

// ----------------------------- small inputs --------------------------------
export function Chip({ active, onClick, label, small }: { active: boolean; onClick: () => void; label: string; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl font-bold border transition-all duration-200 hover-lift click-scale ${
        small ? "px-3 py-1.5 text-[12.5px]" : "px-4 py-2 text-[13.5px]"
      } ${
        active
          ? "bg-brand-green text-white border-brand-green shadow-xs"
          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

export function BigChip({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-2xl px-4 py-3.5 text-left text-[13px] font-bold border transition-all duration-200 hover-lift click-scale ${
        active
          ? "bg-brand-green text-white border-brand-green shadow-xs"
          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
      }`}
    >
      <span className="text-xl leading-none shrink-0">{icon}</span>
      <span className="leading-tight">{label}</span>
    </button>
  );
}

export function YNU({ label, value, onChange, t }: { label: string; value?: YesNoUnsure; onChange: (v: YesNoUnsure) => void; t: Dict }) {
  const opts: [YesNoUnsure, string, string][] = [
    ["yes", t.yes, "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"],
    ["no", t.no, "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"],
    ["unsure", t.unsure, "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"],
  ];
  const activeStyles: Record<YesNoUnsure, string> = {
    yes: "bg-emerald-500 text-white border-emerald-500 shadow-sm",
    no: "bg-red-500 text-white border-red-500 shadow-sm",
    unsure: "bg-amber-500 text-white border-amber-500 shadow-sm",
  };
  return (
    <div className="space-y-1.5">
      <p className="text-[13px] font-bold text-slate-700">{label}</p>
      <div className="flex gap-2">
        {opts.map(([v, l, idle]) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`rounded-xl px-4 py-2 text-xs font-bold border transition-all duration-200 hover-lift click-scale ${
              value === v ? activeStyles[v] : idle
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

// ----------------------------- read aloud --------------------------------
// Read-aloud button for low-literacy users: speaks any result text using
// on-device TTS in the current language. No network, no backend.
export function SpeakButton({ text, lang }: { text: string; lang: Lang }) {
  const [speaking, setSpeaking] = useState(false);
  return (
    <button
      onClick={() => {
        if (speaking) {
          stopSpeaking();
          setSpeaking(false);
        } else {
          speakText(text, lang);
          setSpeaking(true);
          // Reset icon when the utterance ends (best-effort).
          if (typeof window !== "undefined" && window.speechSynthesis) {
            const check = setInterval(() => {
              if (!window.speechSynthesis.speaking) {
                setSpeaking(false);
                clearInterval(check);
              }
            }, 800);
            setTimeout(() => clearInterval(check), 120000);
          }
        }
      }}
      className="no-print inline-flex shrink-0 items-center gap-1 rounded-full border border-[#E3E0CF] bg-white px-2.5 py-1 text-[11px] font-bold text-brand-green shadow-sm transition hover:bg-mint-bg click-scale"
      title={lang === "hi" ? "सुनें" : "Listen"}
      aria-label={lang === "hi" ? "सुनें" : "Listen"}
    >
      <span aria-hidden>{speaking ? "⏹" : "🔊"}</span>
      <span>{lang === "hi" ? "सुनें" : "Listen"}</span>
    </button>
  );
}

// ----------------------------- result blocks -------------------------------
export function Hero({ a, lang }: { a: Assessment; lang: Lang }) {
  const t = T[lang];
  const valueLine = a.estimatedAnnualValue > 0 ? t.perYear.replace("{v}", a.estimatedAnnualValue.toLocaleString("en-IN")) : "";
  const c = a.coverage;
  return (
    <section className="rounded-3xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] p-6 text-white shadow-md relative overflow-hidden animate-page-enter border border-[#2563EB]">
      <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-4 translate-y-4">
        <span className="text-[120px] font-bold leading-none">C</span>
      </div>

      <p className="text-xs font-bold uppercase tracking-wider text-blue-200">{t.resultsFor}</p>
      <p className="mt-1 text-sm text-blue-100/90">{t.entitledTo}</p>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h2 className="text-4xl font-bold leading-tight mt-1">
          {a.matches.length} {t.benefitsWord}
        </h2>
        <SpeakButton
          text={`${t.resultsFor}. ${t.entitledTo} ${a.matches.length} ${t.benefitsWord}. ${valueLine}`}
          lang={lang}
        />
      </div>
      {(valueLine || a.hasOneTimeBenefits) && (
        <p className="mt-1.5 text-lg font-bold text-amber-300">
          {valueLine}
          {valueLine && a.hasOneTimeBenefits ? " " : ""}
          {a.hasOneTimeBenefits ? t.plusOneTime : ""}
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/10 px-4 py-3 border border-white/10 shadow-inner">
          <p className="text-2xl font-bold">{c.claimableNowCount}</p>
          <p className="text-[11px] font-semibold text-blue-100">{t.claimNow}</p>
        </div>
        <div className="rounded-2xl bg-white/10 px-4 py-3 border border-white/10 shadow-inner">
          <p className="text-2xl font-bold">{c.blockedCount}</p>
          <p className="text-[11px] font-semibold text-blue-100">{t.blockedBy}</p>
        </div>
      </div>
    </section>
  );
}

export function ReadinessCard({ r, lang }: { r: Readiness; lang: Lang }) {
  const t = T[lang];
  const sev = {
    blocker: { card: "border-rose-255 bg-rose-50/50", badge: "bg-rose-100 text-rose-800 border-rose-200", label: t.sevBlocker },
    warning: { card: "border-amber-255 bg-amber-50/50", badge: "bg-amber-100 text-amber-800 border-amber-200", label: t.sevWarning },
    info: { card: "border-slate-255 bg-slate-50/50", badge: "bg-slate-100 text-slate-800 border-slate-200", label: t.sevInfo },
  };
  const scoreColor = r.blockers > 0 ? "text-rose-600" : r.warnings > 0 ? "text-amber-600" : "text-brand-green";
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm border border-[#E3E0CF] hover-lift animate-page-enter">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-bold text-slate-800 flex items-center gap-1.5">🛡️ {t.readyTitle}</h3>
          <p className="mt-1 text-[13px] text-slate-500 leading-relaxed">{t.readyBody}</p>
        </div>
        <div className="shrink-0 text-center bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-100 shadow-2xs">
          <p className={`text-3xl font-bold ${scoreColor}`}>{r.score}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.readyScore}</p>
        </div>
      </div>
      {r.issues.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-blue-50/60 p-3.5 text-[13.5px] font-bold text-brand-green border border-blue-100 flex items-center gap-2">
          ✅ {t.allClear}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {r.issues.map((i) => {
            const m = sev[i.severity];
            return (
              <li key={i.id} className={`rounded-2xl border p-4 transition-colors ${m.card}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${m.badge}`}>
                    {m.label}
                  </span>
                  <p className="text-[14px] font-bold text-slate-900">{tx(i.title, lang)}</p>
                </div>
                <p className="mt-1.5 text-[13.5px] text-slate-600 leading-relaxed">{tx(i.detail, lang)}</p>
                <p className="mt-2 text-[13px] font-bold text-slate-800">
                  👉 {t.fixLabel} <span className="font-normal text-slate-650">{tx(i.fix, lang)}</span>
                </p>
                {i.affects.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {i.affects.map((a, idx) => (
                      <span key={idx} className="rounded-lg bg-white border border-slate-200/50 px-2 py-0.5 text-[10px] text-slate-500 font-semibold">
                        {tx(a, lang).replace(/\s*\(.*\)/, "")}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function UnlockPath({ a, lang }: { a: Assessment; lang: Lang }) {
  const t = T[lang];
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm border border-[#E3E0CF] hover-lift animate-page-enter">
      <h3 className="text-[15px] font-bold text-slate-800 flex items-center gap-1.5">🪜 {t.unlockPathTitle}</h3>
      <p className="mt-1 text-[13px] text-slate-500 leading-relaxed">{t.unlockPathBody}</p>
      <ol className="mt-4 space-y-4">
        {a.unlockPath.map((s) => (
          <li key={s.docId} className="trace-step">
            <div className="flex items-center gap-2.5">
              <span className="text-xl leading-none">{s.icon}</span>
              <span className="text-[14.5px] font-bold text-[#232A33]">{lang === "hi" ? s.hindiName : s.name}</span>
              {s.newlyUnlocksCount > 0 && (
                <span className="rounded-full bg-mint-bg px-2.5 py-0.5 text-[11px] font-bold text-brand-green border border-mint-border/50">
                  +{s.newlyUnlocksCount} {t.opens}
                </span>
              )}
            </div>
            {s.newlyUnlocks.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 pl-1.5">
                {s.newlyUnlocks.map((u, j) => (
                  <span key={j} className="rounded-lg bg-slate-50 border border-slate-100 px-2 py-0.5 text-[11.5px] font-bold text-slate-500">
                    {tx(u, lang).replace(/\s*\(.*\)/, "")}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function TrapCard({ a, lang }: { a: Assessment; lang: Lang }) {
  const t = T[lang];
  const g = a.docGaps[0];
  if (!g) return null;
  return (
    <section className="rounded-3xl border border-amber-300 bg-amber-50/50 p-5 shadow-xs animate-page-enter">
      <div className="flex items-center gap-2">
        <span className="text-xl">🔑</span>
        <h3 className="text-[15px] font-bold text-amber-950">{(t.unlockTitle || "Unlock").toUpperCase()}</h3>
      </div>
      <p className="mt-1 text-[13.5px] text-amber-900 leading-relaxed">
        {t.unlockBody.replace("{n}", String(g.unlocksCount))}
      </p>
      <div className="mt-3.5 flex items-center gap-3.5 rounded-2xl bg-white p-4 border border-amber-200/60 shadow-2xs hover-lift transition">
        <span className="text-3xl shrink-0">{g.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900 text-[14.5px]">{lang === "hi" ? g.hindiName : g.name}</p>
          <p className="text-[13px] text-slate-550 leading-relaxed mt-0.5">{tx(g.what, lang)}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {g.unlocksSchemes.map((s, i) => (
              <span key={i} className="rounded-lg bg-amber-100/65 px-2 py-0.5 text-[11px] font-bold text-amber-850 border border-amber-200/40">
                {tx(s, lang).replace(/\s*\(.*\)/, "")}
              </span>
            ))}
          </div>
        </div>
      </div>
      {g.alternativesForPoor && (
        <p className="mt-3 text-[12.5px] text-amber-900 leading-relaxed">
          💡 <span className="font-semibold">{tx(g.alternativesForPoor, lang)}</span>
        </p>
      )}
      {g.applyAt.portalUrl && (
        <a
          href={g.applyAt.portalUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3.5 inline-flex items-center gap-1.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-[12.5px] font-bold transition hover-lift click-scale shadow-xs"
        >
          {t.unlockCta}: {tx(g.applyAt.portal, lang)} ↗
        </a>
      )}
    </section>
  );
}

export function BenefitCard({ m, lang, isTracked, onTrack }: { m: SchemeMatch; lang: Lang; isTracked?: boolean; onTrack?: (id: string) => void }) {
  const t = T[lang];
  const meta = VERDICT_META[m.verdict];
  const primary = lang === "hi" ? m.hindiName : m.name;
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm border border-[#E3E0CF] hover-lift transition-all animate-page-enter">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-mint-bg text-2xl ring-1 ring-mint-border/30 shadow-2xs">
          {m.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <h3 className="text-[15.5px] font-bold text-[#232A33]">{primary}</h3>
            <div className="flex items-center gap-2">
              <SpeakButton
                text={`${primary}. ${tx(m.benefit, lang)}. ${tx(m.headline, lang)}`}
                lang={lang}
              />
              <span className={`flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-bold border ${meta.cls} shadow-3xs`}>
                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot} animate-pulse`} />
                {t[meta.key] as string}
              </span>
            </div>
          </div>
          <p className="text-[13px] font-bold text-brand-green mt-1">{tx(m.benefit, lang)}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-slate-600">{tx(m.headline, lang)}</p>

          {m.missingDocs.length > 0 && (
            <div className="mt-3 bg-amber-50/30 rounded-2xl p-3 border border-amber-200/50">
              <p className="text-[12px] font-bold text-amber-700">{t.stillNeed}:</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {m.missingDocs.map((d) => (
                  <span key={d} className="rounded-lg bg-white px-2.5 py-1 text-[12px] font-bold text-amber-800 border border-amber-200/60 shadow-3xs">
                    {DOC_ICON[d]} {t.docNames[d]}
                  </span>
                ))}
              </div>
              {m.missingDocTip && (
                <p className="mt-2 text-[12px] text-slate-500 leading-relaxed flex items-start gap-1">
                  <span>⚠️</span>
                  <span>{tx(m.missingDocTip, lang)}</span>
                </p>
              )}
            </div>
          )}

          <div className="mt-3 text-[13px] text-slate-500">
            <span className="font-semibold text-slate-400">{t.applyAt}: </span>
            {m.applyAt.portalUrl ? (
              <a href={m.applyAt.portalUrl} target="_blank" rel="noreferrer" className="text-brand-green hover:text-brand-green-hover font-bold hover:underline">
                {tx(m.applyAt.portal, lang)}
              </a>
            ) : (
              <span className="font-bold text-slate-600">{tx(m.applyAt.portal, lang)}</span>
            )}
            <span className="text-slate-400"> · {tx(m.applyAt.authority, lang)}</span>
          </div>

          <div className="mt-3.5 flex items-center justify-between gap-3 pt-3.5 border-t border-slate-100">
            {m.reasons.length > 0 ? (
              <details className="group flex-1">
                <summary className="cursor-pointer list-none text-[12.5px] font-bold text-brand-green hover:text-brand-green-hover flex items-center gap-1 marker:hidden">
                  <span className="inline-block transition-transform duration-200 group-open:rotate-90">▸</span>
                  <span>{t.showReason}</span>
                </summary>
                <div className="mt-2.5 space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  {m.reasons.map((s, i) => (
                    <div key={i} className="trace-step text-[12.5px] text-slate-600 leading-relaxed">
                      <span className="font-bold text-slate-700">{tx(s.label, lang)}.</span> {tx(s.detail, lang)}
                    </div>
                  ))}
                </div>
              </details>
            ) : (
              <div className="flex-1" />
            )}
            {onTrack && (
              <button
                onClick={() => onTrack(m.id)}
                className={`no-print shrink-0 rounded-xl px-4 py-2 text-[12.5px] font-bold border transition-all duration-200 hover-lift click-scale shadow-2xs ${
                  isTracked
                    ? "bg-brand-green text-white border-brand-green"
                    : "bg-white text-brand-green border-brand-green hover:bg-mint-bg/20"
                }`}
              >
                {isTracked ? t.tracked : `+ ${t.trackThis}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
