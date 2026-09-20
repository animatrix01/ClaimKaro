import type { Assessment, DocDetails, DocId, Household, Occupation, Profile, YesNoUnsure } from "./rules/types";

const DOC_IDS: DocId[] = ["aadhaar", "bank", "caste", "income", "ews", "domicile", "ration_bpl", "disability_udid"];
const OCCUPATIONS: Occupation[] = [
  "landless_laborer", "small_farmer", "informal", "salaried", "unemployed", "homemaker", "other", "unknown",
];

function normalizeHousehold(raw: unknown): Household {
  const r = (raw ?? {}) as Record<string, unknown>;
  const b = (k: string, dflt = false) => (typeof r[k] === "boolean" ? (r[k] as boolean) : dflt);
  return {
    isWidow: b("isWidow"),
    isPregnantOrLactating: b("isPregnantOrLactating"),
    hasSchoolGoingChild: b("hasSchoolGoingChild"),
    hasElderly60Plus: b("hasElderly60Plus"),
    lacksPuccaHouse: b("lacksPuccaHouse"),
    lacksLpg: b("lacksLpg"),
    isRural: b("isRural", true),
  };
}

// Coerce arbitrary JSON (from the client / LLM) into a valid Profile with safe
// defaults. Unknown enum values are dropped rather than trusted.
export function normalizeProfile(raw: unknown): Profile {
  const r = (raw ?? {}) as Record<string, unknown>;
  const num = (v: unknown) =>
    typeof v === "number" && isFinite(v) ? v : typeof v === "string" && v.trim() && !isNaN(Number(v)) ? Number(v) : undefined;
  const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined =>
    typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;

  const docs = Array.isArray(r.documentsHave)
    ? (r.documentsHave.filter((d) => DOC_IDS.includes(d as DocId)) as DocId[])
    : [];

  let docDetails: DocDetails | undefined;
  const dd = r.docDetails as Record<string, unknown> | undefined;
  if (dd && typeof dd === "object") {
    const yn = (v: unknown): YesNoUnsure | undefined => (v === "yes" || v === "no" || v === "unsure" ? v : undefined);
    const names: Partial<Record<DocId, string>> = {};
    if (dd.names && typeof dd.names === "object") {
      for (const [k, v] of Object.entries(dd.names as Record<string, unknown>)) {
        if (DOC_IDS.includes(k as DocId) && typeof v === "string" && v.trim()) names[k as DocId] = v.trim().slice(0, 80);
      }
    }
    docDetails = {
      names,
      bankAadhaarSeeded: yn(dd.bankAadhaarSeeded),
      bankIfsc: typeof dd.bankIfsc === "string" ? dd.bankIfsc.trim().slice(0, 20) : undefined,
      bankDormant: yn(dd.bankDormant),
      aadhaarMobileLinked: yn(dd.aadhaarMobileLinked),
      casteIsNCL: yn(dd.casteIsNCL),
      incomeCertYear: typeof dd.incomeCertYear === "number" && dd.incomeCertYear > 1990 && dd.incomeCertYear <= new Date().getFullYear() ? dd.incomeCertYear : undefined,
    };
  }

  return {
    name: typeof r.name === "string" ? r.name : undefined,
    language: oneOf(r.language, ["en", "hi"] as const) ?? "en",
    state: oneOf(r.state, ["RAJASTHAN", "BIHAR", "CENTRAL"] as const) ?? "CENTRAL",
    category: oneOf(r.category, ["SC", "ST", "OBC", "EWS", "GENERAL"] as const) ?? "GENERAL",
    age: num(r.age),
    gender: oneOf(r.gender, ["male", "female", "other"] as const),
    annualHouseholdIncome: num(r.annualHouseholdIncome),
    bpl: typeof r.bpl === "boolean" ? r.bpl : undefined,
    occupation: oneOf(r.occupation, OCCUPATIONS),
    landAcres: num(r.landAcres),
    disability: oneOf(r.disability, ["none", "benchmark", "severe"] as const) ?? "none",
    household: normalizeHousehold(r.household),
    documentsHave: Array.from(new Set(docs)),
    docDetails,
  };
}

// A compact, faithful summary of the engine's output for the LLM to restate
// (kept in English; the model writes its reply in the user's language).
// This is the ONLY thing the explainer sees — it cannot invent beyond it.
export function assessmentToFacts(a: Assessment): string {
  const p = a.profile;
  const lines: string[] = [];
  const context: string[] = [];

  if (p.age != null) context.push(`age ${p.age}`);
  if (p.gender) context.push(p.gender === "female" ? "woman/female" : p.gender === "male" ? "man/male" : "other gender");
  if (p.state) context.push(p.state === "CENTRAL" ? "central/other state" : p.state);
  if (p.category && p.category !== "GENERAL") context.push(p.category);
  if (p.annualHouseholdIncome != null) context.push(`annual household income about ₹${p.annualHouseholdIncome.toLocaleString("en-IN")}`);
  if (p.bpl === true) context.push("BPL/low-income family");
  if (p.occupation) context.push(p.occupation.replaceAll("_", " "));
  if (p.household.hasSchoolGoingChild) context.push("child in school or college");
  if (p.household.isPregnantOrLactating) context.push("pregnant or new mother");
  if (p.household.isWidow) context.push("widow");
  if (p.household.lacksPuccaHouse) context.push("no pucca house");
  if (p.household.lacksLpg) context.push("no LPG");
  if (p.household.isRural) context.push("lives in a village or rural area");
  if (p.documentsHave.length) context.push(`already has: ${p.documentsHave.join(", ")}`);

  if (context.length) {
    lines.push(`CURRENT SITUATION: ${context.join("; ")}.`);
  }
  if (a.estimatedAnnualValue > 0) {
    lines.push(`Estimated recurring cash benefits if eligible: about ₹${a.estimatedAnnualValue.toLocaleString("en-IN")} per year${a.hasOneTimeBenefits ? ", plus one-time benefits" : ""}.`);
  }
  lines.push(`Of these, ${a.coverage.claimableNowCount} can be claimed right now; ${a.coverage.blockedCount} are blocked by missing documents.`);
  lines.push("SCHEMES THEY MAY BE ENTITLED TO:");
  for (const m of a.matches) lines.push(`  - ${m.name} (${m.benefit.en}): ${m.verdict.replace(/_/g, " ")}. ${m.headline.en}`);
  if (a.docGaps.length) {
    lines.push("DOCUMENTS THAT UNLOCK THE MOST (the documentation trap):");
    for (const g of a.docGaps.slice(0, 3)) lines.push(`  - ${g.name}: unlocks ${g.unlocksCount} benefit(s) (${g.unlocksSchemes.map((s) => s.en).join(", ")}).`);
  }
  if (a.readiness.issues.length) {
    lines.push(`REJECTION-PROOFING (submission-readiness ${a.readiness.score}/100; ${a.readiness.blockers} blockers):`);
    for (const i of a.readiness.issues.slice(0, 4)) lines.push(`  - [${i.severity}] ${i.title.en} → ${i.fix.en}`);
  }
  lines.push("ACTION PLAN:");
  for (const s of a.actionPlan) lines.push(`  ${s.order}. ${s.title.en} — ${s.detail.en}`);
  return lines.join("\n");
}

// Deterministic explanation used when the LLM is unavailable. Built only from
// the engine's own output — invents nothing — so the panel always renders, in
// the user's language.
export function fallbackExplanation(a: Assessment, lang: "en" | "hi"): string {
  const v = a.estimatedAnnualValue.toLocaleString("en-IN");
  const top = a.docGaps[0];
  const p = a.profile;
  const scenario = [] as string[];
  if (p.household.hasSchoolGoingChild) scenario.push(lang === "hi" ? "स्कूल/कॉलेज में पढ़ने वाला बच्चा" : "a child in school or college");
  if (p.household.isPregnantOrLactating) scenario.push(lang === "hi" ? "गर्भवती/नई माँ" : "pregnant or new mother");
  if (p.household.isWidow) scenario.push(lang === "hi" ? "विधवा" : "widow");
  if (p.occupation) scenario.push(p.occupation.replaceAll("_", " "));
  if (p.annualHouseholdIncome != null) scenario.push(lang === "hi" ? `₹${p.annualHouseholdIncome.toLocaleString("en-IN")} सालाना आय` : `about ₹${p.annualHouseholdIncome.toLocaleString("en-IN")} annual income`);

  if (lang === "hi") {
    const parts: string[] = [];
    if (a.matches.length) {
      const first = a.matches.map((m) => m.hindiName).slice(0, 3).join(", ");
      parts.push(`अच्छी खबर — आपके लिए ${first} जैसे लाभ सबसे ज़्यादा Relevant लग सकते हैं।`);
    } else {
      parts.push("आपके बताये अनुसार अभी कोई स्पष्ट योजना नहीं दिख रही — थोड़ी और जानकारी मदद कर सकती है।");
    }
    if (scenario.length) parts.push(`यह खास तौर पर आपके ${scenario.join(", ")} वाले हालात के हिसाब से देखा गया है।`);
    if (a.estimatedAnnualValue > 0) parts.push(`ये मिलाकर लगभग ₹${v} सालाना के हो सकते हैं${a.hasOneTimeBenefits ? ", साथ ही एकमुश्त सहायता" : ""}।`);
    if (top) parts.push(`सबसे पहले अपना ${top.hindiName} बनवाना सबसे उपयोगी है — इससे ${top.unlocksCount} लाभ खुलते हैं।`);
    parts.push("आप अपनी ग्राम पंचायत या नज़दीकी CSC पर मुफ़्त मदद ले सकते हैं। भरोसा करने से पहले वहाँ पुष्टि ज़रूर करें।");
    return parts.join(" ");
  }
  const parts: string[] = [];
  if (a.matches.length) {
    const first = a.matches.map((m) => m.name).slice(0, 3).join(", ");
    parts.push(`Good news — the most relevant options for your case appear to be ${first}.`);
  } else {
    parts.push("Based on what you told us, we couldn't match a scheme yet — a few more details may help.");
  }
  if (scenario.length) parts.push(`This is being read for your specific situation: ${scenario.join(", ")}.`);
  if (a.estimatedAnnualValue > 0) parts.push(`Together these may be worth around ₹${v} a year${a.hasOneTimeBenefits ? ", plus one-time help" : ""}.`);
  if (top) parts.push(`The most useful thing to get first is your ${top.name} — it helps unlock ${top.unlocksCount} of them.`);
  parts.push("You can get free help at your Gram Panchayat or a nearby Common Service Centre (CSC). Always confirm there before relying on this.");
  return parts.join(" ");
}
