"use client";

import { useProfile, useTracked, TRACK_STATUSES, type TrackStatus, type TrackedApp } from "@/lib/store";
import { Nav } from "@/components/shared";
import { T, type Lang } from "@/lib/i18n";
import { runAssessment } from "@/lib/rules/engine";
import { SCHEMES } from "@/lib/rules/schemes";
import { useAuth } from "@/components/AuthGate";

const SCHEME_MAP = Object.fromEntries(SCHEMES.map((s) => [s.id, { name: s.name, hindiName: s.hindiName, icon: s.icon }]));

const NEXT_STEP: Record<TrackStatus, { en: string; hi: string }> = {
  to_start: { en: "Gather the documents and apply at the portal/office.", hi: "दस्तावेज़ जुटाएँ और पोर्टल/कार्यालय पर आवेदन करें।" },
  applied: { en: "Wait for verification; follow up at the office if it's been over 2 weeks.", hi: "सत्यापन की प्रतीक्षा करें; 2 सप्ताह से अधिक हो तो कार्यालय में संपर्क करें।" },
  under_review: { en: "Being verified — keep the Aadhaar-linked phone reachable for any OTP.", hi: "सत्यापन जारी — OTP हेतु आधार से जुड़ा फ़ोन साथ रखें।" },
  approved: { en: "Approved! Make sure your Aadhaar-seeded bank account is active so the money lands.", hi: "मंज़ूर! सुनिश्चित करें कि आधार-सीड बैंक खाता सक्रिय है ताकि पैसा आ जाए।" },
  received: { en: "Done — benefit received. 🎉", hi: "हो गया — लाभ मिल गया। 🎉" },
  rejected: { en: "Find the exact reason (use RTI if unclear), fix it, and re-apply.", hi: "सटीक कारण जानें (ज़रूरत हो तो RTI), उसे ठीक करें, और फिर से आवेदन करें।" },
};

export default function TrackerPage() {
  const [profile, setProfile] = useProfile();
  const { requireAuth } = useAuth();
  const [tracked, setTracked] = useTracked();
  const lang = profile.language;
  const setLang = (l: Lang) => setProfile((p) => ({ ...p, language: l }));
  const t = T[lang];

  function addEligible() {
    const a = runAssessment({ ...profile, language: lang });
    const now = new Date().toISOString();
    setTracked((prev) => {
      const have = new Set(prev.map((x) => x.schemeId));
      const add = a.matches
        .filter((m) => !have.has(m.id))
        .map((m) => ({
          schemeId: m.id,
          status: "to_start" as TrackStatus,
          addedAt: now,
          updatedAt: now,
        }));
      return [...prev, ...add];
    });
  }
  function setStatus(id: string, status: TrackStatus) {
    setTracked((prev) =>
      prev.map((x) =>
        x.schemeId === id ? { ...x, status, updatedAt: new Date().toISOString() } : x
      )
    );
  }
  function setNote(id: string, note: string) {
    setTracked((prev) => prev.map((x) => (x.schemeId === id ? { ...x, note } : x)));
  }
  function remove(id: string) {
    setTracked((prev) => prev.filter((x) => x.schemeId !== id));
  }

  const done = tracked.filter((x) => x.status === "received").length;
  const statusLabel = (s: TrackStatus) => t[`st_${s}` as keyof typeof t] as string;

  return (
    <div className="hs-page animate-page-enter min-h-screen">
      <Nav lang={lang} onLang={setLang} />
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Header Tag */}
        <div className="text-center">
          <span className="hs-section-label">
            {t.trackerTitle}
          </span>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">
            {t.trackerLead.replace(/\s*-\s*.*$/, "")}
          </h1>
          <p className="text-[13.5px] text-slate-500 mt-1">
            {t.savedNote}
          </p>
        </div>

        {/* Progress Bar (Only visible if tracked has items) */}
        {tracked.length > 0 && (
          <section className="rounded-3xl bg-brand-green p-5 text-white shadow-xs hover-lift transition-all">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-blue-100">
                📈 {t.trackerTitle}
              </h2>
              <span className="text-[12.5px] font-bold bg-white/10 px-2.5 py-0.5 rounded-lg text-blue-50">
                {t.progress.replace("{done}", String(done)).replace("{total}", String(tracked.length))}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-amber-300 transition-all duration-500"
                style={{ width: `${Math.round((done / tracked.length) * 100)}%` }}
              />
            </div>
          </section>
        )}

        {/* Add Eligible Button (Dashed Green Border) */}
        <button
          onClick={() => requireAuth(addEligible)}
          className="w-full rounded-2xl border-2 border-dashed border-brand-green/30 bg-mint-bg/25 hover:bg-mint-bg/50 px-4 py-3.5 text-sm font-bold text-brand-green transition-all hover-lift click-scale flex items-center justify-center gap-2 cursor-pointer shadow-3xs"
        >
          <span>✨</span>
          <span>{t.addEligible}</span>
        </button>

        {tracked.length === 0 ? (
          <section className="rounded-3xl bg-white p-8 text-center text-[14.5px] font-bold text-slate-450 border border-[#E3E0CF]/80 shadow-2xs hover-lift transition">
            <div className="text-3xl mb-2">📍</div>
            <p className="max-w-md mx-auto leading-relaxed">{t.noTracked}</p>
          </section>
        ) : (
          <div className="space-y-4">
            {tracked.map((a: TrackedApp) => {
              const s = SCHEME_MAP[a.schemeId];
              if (!s) return null;
              return (
                <section
                  key={a.schemeId}
                  className="rounded-3xl bg-white p-5 border border-[#E3E0CF]/80 shadow-2xs hover-lift transition-all"
                >
                  <div className="flex items-start gap-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-mint-bg text-2xl border border-mint-border/30 shadow-2xs">
                      {s.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-[15.5px] font-bold text-slate-800">
                          {lang === "hi" ? s.hindiName : s.name}
                        </h3>
                        <button
                          onClick={() => requireAuth(() => remove(a.schemeId))}
                          className="text-[12.5px] font-bold text-slate-400 hover:text-rose-650 transition cursor-pointer select-none"
                        >
                          {t.remove}
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {TRACK_STATUSES.map((st) => (
                          <button
                            key={st}
                            onClick={() => requireAuth(() => setStatus(a.schemeId, st))}
                            className={`rounded-xl px-3 py-1.5 text-[11.5px] font-bold border transition-all click-scale shadow-3xs cursor-pointer ${
                              a.status === st
                                ? st === "rejected"
                                  ? "bg-rose-600 text-white border-rose-600"
                                  : st === "received"
                                  ? "bg-brand-green text-white border-brand-green"
                                  : "bg-slate-800 text-white border-slate-800"
                                : "bg-white text-slate-550 border-[#E3E0CF] hover:bg-slate-50"
                            }`}
                          >
                            {statusLabel(st)}
                          </button>
                        ))}
                      </div>
                      <p className="mt-3 text-[13.5px] text-slate-600 leading-relaxed">
                        <span className="font-bold text-slate-450 uppercase tracking-wider text-[11.5px] mr-1">
                          {t.nextStep}:
                        </span>
                        {NEXT_STEP[a.status][lang]}
                      </p>
                      <input
                        value={a.note ?? ""}
                        onChange={(e) => { const v = e.target.value; requireAuth(() => setNote(a.schemeId, v)); }}
                        placeholder={t.notePh}
                        className="mt-3.5 w-full rounded-2xl border border-[#E3E0CF] px-4 py-2.5 text-sm font-bold outline-none focus:border-brand-green focus:ring-2 focus:ring-mint-bg transition"
                      />
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
        <footer className="pb-10 pt-4 text-center text-[11px] font-semibold text-slate-400 max-w-sm mx-auto leading-normal">
          {t.trust}
        </footer>
      </main>
    </div>
  );
}
