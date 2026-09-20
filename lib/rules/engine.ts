import { L, type ActionStep, type Assessment, type DocGap, type DocId, type Profile, type SchemeMatch } from "./types";
import { SCHEMES } from "./schemes";
import { DOCUMENTS, docApplyAt, docCitationIds } from "./documents";
import { collectCitations } from "./citations";
import { buildUnlockPath, computeCoverage } from "./graph";
import { auditReadiness } from "./validation";

const DOC_ORDER: DocId[] = ["aadhaar", "bank", "domicile", "ration_bpl", "income", "caste", "ews", "disability_udid"];
const ELIGIBLE = new Set(["likely_eligible", "maybe_eligible"]);

function buildMatch(p: Profile): SchemeMatch[] {
  return SCHEMES.map((s) => {
    const ev = s.evaluate(p);
    const alreadySatisfied = s.providesDoc != null && p.documentsHave.includes(s.providesDoc);
    const missingDocs = alreadySatisfied ? [] : s.requiredDocs.filter((d) => !p.documentsHave.includes(d));
    return {
      id: s.id,
      name: s.name,
      hindiName: s.hindiName,
      need: s.need,
      icon: s.icon,
      what: s.what,
      benefit: s.benefit,
      annualValue: s.annualValue,
      oneTime: s.oneTime,
      verdict: ev.verdict,
      confidence: ev.confidence,
      headline: ev.headline,
      reasons: ev.reasons,
      requiredDocs: s.requiredDocs,
      missingDocs,
      unlockableNow: missingDocs.length === 0,
      applyAt: s.applyAt,
      missingDocTip: s.missingDocTip,
      citationIds: s.citationIds,
    };
  });
}

// Which missing document unlocks the most benefits (the documentation trap).
function buildDocGaps(p: Profile, eligible: SchemeMatch[]): DocGap[] {
  const acc = new Map<DocId, { count: number; schemes: { en: string; hi: string }[]; value: number }>();
  for (const m of eligible) {
    for (const d of m.missingDocs) {
      const cur = acc.get(d) ?? { count: 0, schemes: [], value: 0 };
      cur.count += 1;
      cur.schemes.push({ en: m.name, hi: m.hindiName });
      cur.value += m.annualValue;
      acc.set(d, cur);
    }
  }
  const gaps: DocGap[] = [];
  for (const [docId, info] of acc) {
    const di = DOCUMENTS[docId];
    gaps.push({
      docId,
      name: di.name,
      hindiName: di.hindiName,
      icon: di.icon,
      what: di.what,
      unlocksCount: info.count,
      unlocksSchemes: info.schemes,
      unlocksValue: info.value,
      prerequisites: di.prerequisites,
      missingPrerequisites: di.prerequisites.filter((d) => !p.documentsHave.includes(d)),
      applyAt: docApplyAt(docId, p.state),
      alternativesForPoor: di.alternativesForPoor,
      noEligibilityBar: di.noEligibilityBar,
      citationIds: [...di.citationIds, ...docCitationIds(docId, p.state)],
    });
  }
  gaps.sort((a, b) => b.unlocksCount - a.unlocksCount || a.missingPrerequisites.length - b.missingPrerequisites.length);
  return gaps;
}

function buildActionPlan(eligible: SchemeMatch[], gaps: DocGap[]): ActionStep[] {
  const steps: ActionStep[] = [];
  let order = 1;
  const neededDocs = new Set(gaps.map((g) => g.docId));

  for (const docId of DOC_ORDER) {
    if (!neededDocs.has(docId)) continue;
    const g = gaps.find((x) => x.docId === docId)!;
    const di = DOCUMENTS[docId];
    const altEn = di.alternativesForPoor ? ` ${di.alternativesForPoor.en}` : "";
    const altHi = di.alternativesForPoor ? ` ${di.alternativesForPoor.hi}` : "";
    steps.push({
      order: order++,
      kind: "get_document",
      title: L(`Get your ${g.name}`, `अपना ${g.hindiName} बनवाएँ`),
      detail: L(
        `Apply at ${g.applyAt.portal.en} (${g.applyAt.authority.en}). This helps unlock ${g.unlocksCount} benefit${g.unlocksCount > 1 ? "s" : ""}.${altEn}`,
        `${g.applyAt.portal.hi} (${g.applyAt.authority.hi}) पर आवेदन करें। इससे ${g.unlocksCount} लाभ खुलते हैं।${altHi}`
      ),
      citationIds: g.citationIds,
    });
  }

  const now = eligible.filter((m) => m.unlockableNow);
  for (const m of now) {
    steps.push({
      order: order++,
      kind: "apply_scheme",
      title: L(`Apply now: ${m.name}`, `अभी आवेदन करें: ${m.hindiName}`),
      detail: L(`${m.what.en} Apply at ${m.applyAt.portal.en} (${m.applyAt.authority.en}).`, `${m.what.hi} ${m.applyAt.portal.hi} (${m.applyAt.authority.hi}) पर आवेदन करें।`),
      citationIds: m.citationIds,
    });
  }

  const later = eligible.filter((m) => !m.unlockableNow);
  if (later.length) {
    steps.push({
      order: order++,
      kind: "apply_scheme",
      title: L("Once your documents are ready, apply for these", "दस्तावेज़ तैयार होने पर इनके लिए आवेदन करें"),
      detail: L(later.map((m) => m.name).join(", ") + ".", later.map((m) => m.hindiName).join(", ") + "।"),
      citationIds: Array.from(new Set(later.flatMap((m) => m.citationIds))),
    });
  }

  steps.push({
    order: order++,
    kind: "verify",
    title: L("Confirm with a human before relying on this", "भरोसा करने से पहले किसी व्यक्ति से पुष्टि करें"),
    detail: L(
      "Take this list to your Gram Panchayat, the issuing office, or a nearby Common Service Centre (CSC) — they verify documents and decide approvals. ClaimKaro only shows what you may be entitled to.",
      "यह सूची अपनी ग्राम पंचायत, जारी करने वाले कार्यालय, या नज़दीकी कॉमन सर्विस सेंटर (CSC) पर ले जाएँ — वे दस्तावेज़ जाँचते हैं और मंज़ूरी तय करते हैं। ClaimKaro केवल यह दिखाता है कि आप किसके पात्र हो सकते हैं।"
    ),
    citationIds: ["CSC"],
  });

  return steps;
}

function findMissingFields(p: Profile): string[] {
  const m: string[] = [];
  if (p.age == null) m.push("age");
  if (p.annualHouseholdIncome == null) m.push("annualHouseholdIncome");
  if (p.bpl == null) m.push("bpl");
  return m;
}

function scenarioRelevance(profile: Profile, scheme: SchemeMatch): number {
  let score = 0;

  if (profile.household.hasSchoolGoingChild || (profile.age != null && profile.age >= 12 && profile.age <= 25)) {
    if (scheme.need === "education") score += 100;
    if (scheme.need === "income_support") score += 20;
  }

  if (profile.household.isPregnantOrLactating) {
    if (scheme.need === "maternity") score += 100;
    if (scheme.need === "health") score += 25;
  }

  if (profile.household.isWidow || profile.disability === "severe") {
    if (scheme.need === "pension") score += 100;
  }

  if (profile.occupation === "small_farmer" || (typeof profile.landAcres === "number" && profile.landAcres > 0)) {
    if (scheme.need === "income_support") score += 80;
    if (scheme.need === "work") score += 30;
  }

  if (profile.household.lacksPuccaHouse) {
    if (scheme.need === "housing") score += 90;
  }

  return score;
}

export function runAssessment(profile: Profile): Assessment {
  const all = buildMatch(profile);
  const matches = all
    .filter((m) => ELIGIBLE.has(m.verdict))
    .sort((a, b) => {
      const rank = (v: string) => (v === "likely_eligible" ? 0 : 1);
      return rank(a.verdict) - rank(b.verdict) || scenarioRelevance(profile, b) - scenarioRelevance(profile, a) || b.annualValue - a.annualValue;
    });
  const otherSchemes = all.filter((m) => !ELIGIBLE.has(m.verdict));
  const docGaps = buildDocGaps(profile, matches);
  const unlockPath = buildUnlockPath(profile, matches);
  const coverage = computeCoverage(matches);
  const readiness = auditReadiness(profile, matches);
  const actionPlan = buildActionPlan(matches, docGaps);

  const estimatedAnnualValue = coverage.totalAnnualValue;
  const hasOneTimeBenefits = matches.some((m) => m.oneTime);

  const citationIds = [
    "TRAP_RESEARCH",
    ...matches.flatMap((m) => m.citationIds),
    ...docGaps.flatMap((g) => g.citationIds),
    ...actionPlan.flatMap((s) => s.citationIds),
  ];

  return {
    generatedAt: new Date().toISOString(),
    profile,
    matches,
    otherSchemes,
    docGaps,
    unlockPath,
    coverage,
    readiness,
    estimatedAnnualValue,
    hasOneTimeBenefits,
    actionPlan,
    citations: collectCitations(citationIds),
    missingFields: findMissingFields(profile),
  };
}
