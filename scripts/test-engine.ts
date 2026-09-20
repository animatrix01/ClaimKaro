import { runAssessment } from "../lib/rules/engine";
import { nextQuestion } from "../lib/rules/inquiry";
import { PERSONAS } from "../lib/personas";
import type { Profile } from "../lib/rules/types";

const blankProfile: Profile = {
  language: "en", state: "CENTRAL", category: "GENERAL", disability: "none",
  household: { isWidow: false, isPregnantOrLactating: false, hasSchoolGoingChild: false, hasElderly60Plus: false, lacksPuccaHouse: false, lacksLpg: false, isRural: true },
  documentsHave: [],
};

let failures = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? "✅" : "❌"} ${name}`);
  if (!cond) failures++;
}

for (const persona of PERSONAS) {
  const a = runAssessment(persona.profile);
  console.log(`\n=== ${persona.name} ===`);
  console.log(`  est. ₹${a.estimatedAnnualValue.toLocaleString("en-IN")}/yr recurring${a.hasOneTimeBenefits ? " + one-time" : ""}`);
  console.log(`  may get: ${a.matches.map((m) => `${m.name}[${m.verdict === "likely_eligible" ? "✓" : "?"}]`).join(", ")}`);
  console.log(`  top doc to get: ${a.docGaps[0] ? `${a.docGaps[0].name} → unlocks ${a.docGaps[0].unlocksCount}` : "—"}`);
}

console.log("\n--- assertions ---");
const id = (p: string) => runAssessment(PERSONAS.find((x) => x.id === p)!.profile);

const sunita = id("sunita");
check("Meena matched widow pension", sunita.matches.some((m) => m.id === "ignwps"));
check("Meena's top doc gap unlocks 2+ schemes", (sunita.docGaps[0]?.unlocksCount ?? 0) >= 2);
check("Meena action plan starts by getting a document", sunita.actionPlan[0]?.kind === "get_document");

const ramlal = id("ramlal");
check("Harilal (65, BPL) matched old-age pension", ramlal.matches.some((m) => m.id === "ignoaps" && m.verdict === "likely_eligible"));
check("Harilal NOT matched PM-KISAN (landless)", !ramlal.matches.some((m) => m.id === "pmkisan"));
check("Harilal's top doc gap unlocks 2+ schemes", (ramlal.docGaps[0]?.unlocksCount ?? 0) >= 2);
check("Harilal already-held ration card is not re-requested", !ramlal.docGaps.some((g) => g.docId === "ration_bpl"));

const lakshmi = id("lakshmi");
check("Kamla matched maternity benefit (likely)", lakshmi.matches.some((m) => m.id === "pmmvy" && m.verdict === "likely_eligible"));

const imran = id("imran");
const sch = imran.matches.find((m) => m.id === "scholarship_postmatric");
check("Rafiq's son matched the post-matric scholarship", !!sch);
check("Rafiq scholarship blocked by missing income certificate", !!sch && sch.missingDocs.includes("income"));
check("Rafiq scholarship carries the OBC-NCL trap tip", !!sch?.missingDocTip && /NCL/.test(sch!.missingDocTip!.en));
check("Student scenario ranks the scholarship before generic food benefits", imran.matches[0]?.id === "scholarship_postmatric");
const imranQuestion = nextQuestion(imran.profile, []);
check("Student scenario asks a scholarship-relevant question first", !!imranQuestion && ["income_doc", "income_bucket", "child"].includes(imranQuestion.id));

const govind = id("govind");
check("Bhola (small farmer) matched PM-KISAN", govind.matches.some((m) => m.id === "pmkisan"));
check("Bhola matched PMAY-G (no pucca house)", govind.matches.some((m) => m.id === "pmayg"));
check("Bhola has a positive estimated annual value", govind.estimatedAnnualValue > 0);

// Foundational: unlock path + coverage gap
check("Meena has a computed unlock path", sunita.unlockPath.length > 0);
check("Unlock-path respects prerequisites (Aadhaar before bank)", (() => {
  const ai = sunita.unlockPath.findIndex((s) => s.docId === "aadhaar");
  const bi = sunita.unlockPath.findIndex((s) => s.docId === "bank");
  return ai === -1 || bi === -1 || ai < bi;
})());
check("Coverage gap is quantified (total = claimable + blocked)", sunita.coverage.totalCount === sunita.coverage.claimableNowCount + sunita.coverage.blockedCount);
check("All engine text is bilingual (hi present)", sunita.matches.every((m) => !!m.headline.hi && !!m.benefit.hi && m.reasons.every((r) => !!r.label.hi && !!r.detail.hi)));

// Rejection-proofing audit
check("Rafiq's name mismatch is caught as a blocker", imran.readiness.issues.some((i) => i.id === "name_mismatch" && i.severity === "blocker"));
check("Rafiq's non-NCL OBC certificate is flagged", imran.readiness.issues.some((i) => i.id === "obc_ncl"));
check("Bhola (cash scheme, unseeded bank) gets a DBT-seeding blocker", govind.readiness.issues.some((i) => i.id === "dbt_seeding" && i.severity === "blocker"));
check("Readiness score drops below 100 when blockers exist", imran.readiness.score < 100 && govind.readiness.score < 100);
check("A clean profile (Harilal, no doc details) has no blockers", ramlal.readiness.blockers === 0);

// Adaptive AI intake (value-of-information)
const q1 = nextQuestion(blankProfile, []);
check("Adaptive intake asks a question for a blank profile", q1 !== null && q1.impact > 0);
// Simulate answering everything the loop asks; it must terminate.
let p = blankProfile; const askedIds: string[] = []; let steps = 0;
for (; steps < 20; steps++) {
  const q = nextQuestion(p, askedIds);
  if (!q) break;
  p = q.options[0].apply(p); // take the first (often highest-impact) option
  askedIds.push(q.id);
}
check("Adaptive intake terminates (doesn't loop forever)", steps < 20);
check("Answering the guided questions surfaces benefits", runAssessment(p).matches.length > 0);

console.log(`\n${failures === 0 ? "ALL PASSED" : failures + " FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
