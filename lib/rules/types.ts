// ClaimKaro — domain types for a welfare-access navigator.
//
// The problem (from field research, see citations.ts):
//   • ~20% of benefit exclusion is purely a DOCUMENTATION problem.
//   • In one district, 80%+ of Dalits/OBCs had no caste certificate, so they
//     were locked out of every scheme meant for them.
//   • Eligible people simply don't know what they're entitled to.
//
// A deterministic rules engine owns every eligibility verdict AND authors every
// user-facing line in BOTH English and Hindi (`Localized`). The LLM only parses
// free text into a Profile and restates the engine's result kindly. It never
// decides eligibility and never invents a number — which is also why this is
// not a thin wrapper around a chatbot.

export type Language = "en" | "hi";

// Every user-facing string the engine produces carries both languages, so the
// chosen language is rendered consistently end-to-end.
export interface Localized {
  en: string;
  hi: string;
}
export const L = (en: string, hi: string): Localized => ({ en, hi });
export const tx = (l: Localized, lang: Language): string => l[lang];

export type SocialCategory = "SC" | "ST" | "OBC" | "EWS" | "GENERAL";

export type Occupation =
  | "landless_laborer"
  | "small_farmer"
  | "informal"
  | "salaried"
  | "unemployed"
  | "homemaker"
  | "other"
  | "unknown";

export type DisabilityLevel = "none" | "benchmark" | "severe";

export type StateId =
  | "ANDHRA_PRADESH"
  | "ARUNACHAL_PRADESH"
  | "ASSAM"
  | "BIHAR"
  | "CHHATTISGARH"
  | "GOA"
  | "GUJARAT"
  | "HARYANA"
  | "HIMACHAL_PRADESH"
  | "JHARKHAND"
  | "KARNATAKA"
  | "KERALA"
  | "MADHYA_PRADESH"
  | "MAHARASHTRA"
  | "MANIPUR"
  | "MEGHALAYA"
  | "MIZORAM"
  | "NAGALAND"
  | "ODISHA"
  | "PUNJAB"
  | "RAJASTHAN"
  | "SIKKIM"
  | "TAMIL_NADU"
  | "TELANGANA"
  | "TRIPURA"
  | "UTTAR_PRADESH"
  | "UTTARAKHAND"
  | "WEST_BENGAL"
  | "ANDAMAN_AND_NICOBAR_ISLANDS"
  | "CHANDIGARH"
  | "DADRA_AND_NAGAR_HAVELI_AND_DAMAN_AND_DIU"
  | "DELHI"
  | "JAMMU_AND_KASHMIR"
  | "LADAKH"
  | "LAKSHADWEEP"
  | "PUDUCHERRY"
  | "CENTRAL";

export type DocId =
  | "aadhaar"
  | "bank"
  | "caste"
  | "income"
  | "ews"
  | "domicile"
  | "ration_bpl"
  | "disability_udid";

export type LifeNeed =
  | "income_support"
  | "pension"
  | "food"
  | "health"
  | "housing"
  | "education"
  | "maternity"
  | "work"
  | "energy";

export interface Household {
  isWidow: boolean;
  isPregnantOrLactating: boolean;
  hasSchoolGoingChild: boolean;
  hasElderly60Plus: boolean;
  lacksPuccaHouse: boolean;
  lacksLpg: boolean;
  isRural: boolean;
}

export type YesNoUnsure = "yes" | "no" | "unsure";

// Optional finer details about the documents a person holds. These power the
// deterministic rejection-proofing audit (name mismatch, DBT seeding, recency).
// All optional — unknowns become "verify" prompts, not blockers.
export interface DocDetails {
  names: Partial<Record<DocId, string>>; // name exactly as printed on each doc
  bankAadhaarSeeded?: YesNoUnsure; // seeded in NPCI for DBT (not just linked)
  bankIfsc?: string;
  bankDormant?: YesNoUnsure; // no transaction in 12+ months
  aadhaarMobileLinked?: YesNoUnsure; // mobile linked for OTP
  casteIsNCL?: YesNoUnsure; // OBC certificate explicitly says Non-Creamy-Layer
  incomeCertYear?: number; // year the income certificate was issued
}

export interface Profile {
  name?: string;
  email?: string;
  phone?: string;
  language: Language;
  state: StateId;
  category: SocialCategory;
  age?: number;
  gender?: "male" | "female" | "other";
  annualHouseholdIncome?: number;
  bpl?: boolean;
  occupation?: Occupation;
  landAcres?: number;
  disability: DisabilityLevel;
  household: Household;
  documentsHave: DocId[];
  docDetails?: DocDetails;
  photoBase64?: string;
}

export type Verdict = "likely_eligible" | "maybe_eligible" | "likely_not" | "need_info";
export type Confidence = "high" | "medium" | "low";

export interface TraceStep {
  label: Localized;
  detail: Localized;
  sourceId?: string;
}

export interface Citation {
  id: string;
  label: Localized;
  source: string; // official document name — kept in its published form
  asOf: string;
  url?: string;
  note?: Localized;
}

export interface ApplyAt {
  authority: Localized;
  portal: Localized;
  portalUrl?: string;
}

// ---- Engine outputs ----

export interface SchemeMatch {
  id: string;
  name: string; // English name
  hindiName: string;
  need: LifeNeed;
  icon: string;
  what: Localized;
  benefit: Localized;
  annualValue: number;
  oneTime: boolean;
  verdict: Verdict;
  confidence: Confidence;
  headline: Localized;
  reasons: TraceStep[];
  requiredDocs: DocId[];
  missingDocs: DocId[];
  unlockableNow: boolean;
  applyAt: ApplyAt;
  missingDocTip?: Localized;
  citationIds: string[];
}

export interface DocGap {
  docId: DocId;
  name: string;
  hindiName: string;
  icon: string;
  what: Localized;
  unlocksCount: number;
  unlocksSchemes: Localized[];
  unlocksValue: number;
  prerequisites: DocId[];
  missingPrerequisites: DocId[];
  applyAt: ApplyAt;
  alternativesForPoor?: Localized;
  noEligibilityBar: boolean;
  citationIds: string[];
}

export interface ActionStep {
  order: number;
  kind: "get_document" | "apply_scheme" | "verify";
  title: Localized;
  detail: Localized;
  citationIds: string[];
}

// One step of the computed unlock PATH: get this document and these specific
// benefits become claimable. Derived by walking the entitlement dependency
// graph in prerequisite order — not generated text.
export interface UnlockStep {
  docId: DocId;
  name: string;
  hindiName: string;
  icon: string;
  newlyUnlocks: Localized[];
  newlyUnlocksCount: number;
  cumulativeUnlocked: number;
}

// Quantifies the access gap: of everything you may be entitled to, how much can
// you claim right now vs. how much is locked behind missing documents.
export interface Coverage {
  totalCount: number;
  claimableNowCount: number;
  blockedCount: number;
  totalAnnualValue: number;
  claimableNowValue: number;
}

// One finding from the rejection-proofing audit: a specific, fixable thing that
// silently gets applications rejected or benefits unpaid even after approval.
export type IssueSeverity = "blocker" | "warning" | "info";
export interface Issue {
  id: string;
  severity: IssueSeverity;
  title: Localized;
  detail: Localized; // why it matters (with the real-world failure stat)
  fix: Localized; // exactly what to do about it
  affects: Localized[]; // scheme names this would block
  citationIds: string[];
}
export interface Readiness {
  score: number; // 0–100 submission-readiness
  blockers: number;
  warnings: number;
  issues: Issue[];
}

export interface Assessment {
  generatedAt: string;
  profile: Profile;
  matches: SchemeMatch[];
  otherSchemes: SchemeMatch[];
  docGaps: DocGap[];
  unlockPath: UnlockStep[];
  coverage: Coverage;
  readiness: Readiness;
  estimatedAnnualValue: number;
  hasOneTimeBenefits: boolean;
  actionPlan: ActionStep[];
  citations: Citation[];
  missingFields: string[];
}
