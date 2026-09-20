import type { Coverage, DocId, Localized, Profile, SchemeMatch, UnlockStep } from "./types";
import { DOCUMENTS } from "./documents";

// The entitlement dependency graph.
//
// Schemes depend on documents; documents depend on other documents (a real
// DAG, e.g. caste-certificate → domicile → aadhaar). Given the schemes a person
// may be entitled to, we compute the MINIMAL ordered set of documents that
// unlocks the most benefit, and at each step which schemes become claimable.
//
// This is deterministic graph reasoning — the kind of thing a language model
// guesses at and gets wrong. It is the foundation ClaimKaro is built on; the LLM
// only narrates the result.

// Prerequisite-respecting topological order over the document graph.
const TOPO: DocId[] = ["aadhaar", "bank", "domicile", "ration_bpl", "income", "caste", "ews", "disability_udid"];

// Expand a set of directly-missing documents to include every transitive
// prerequisite the user does not yet hold.
function closure(directlyMissing: DocId[], have: Set<DocId>): Set<DocId> {
  const out = new Set<DocId>();
  const visit = (d: DocId) => {
    if (have.has(d) || out.has(d)) return;
    out.add(d);
    for (const pre of DOCUMENTS[d].prerequisites) visit(pre);
  };
  directlyMissing.forEach(visit);
  return out;
}

// Walk the graph in prerequisite order, simulating acquiring each missing
// document and recording which schemes that unlocks.
export function buildUnlockPath(profile: Profile, eligible: SchemeMatch[]): UnlockStep[] {
  const have = new Set<DocId>(profile.documentsHave);
  const directlyMissing = Array.from(new Set(eligible.flatMap((m) => m.requiredDocs))).filter((d) => !have.has(d));
  const needed = closure(directlyMissing, have);
  if (needed.size === 0) return [];

  const claimed = new Set<string>(); // scheme ids already unlockable
  // Seed: schemes already claimable with current documents.
  for (const m of eligible) if (m.requiredDocs.every((d) => have.has(d))) claimed.add(m.id);

  const steps: UnlockStep[] = [];
  let cumulative = 0;
  for (const docId of TOPO) {
    if (!needed.has(docId)) continue;
    have.add(docId);
    const newly: Localized[] = [];
    for (const m of eligible) {
      if (claimed.has(m.id)) continue;
      if (m.requiredDocs.every((d) => have.has(d))) {
        claimed.add(m.id);
        newly.push({ en: m.name, hi: m.hindiName });
      }
    }
    cumulative += newly.length;
    const di = DOCUMENTS[docId];
    steps.push({
      docId,
      name: di.name,
      hindiName: di.hindiName,
      icon: di.icon,
      newlyUnlocks: newly,
      newlyUnlocksCount: newly.length,
      cumulativeUnlocked: cumulative,
    });
  }
  return steps;
}

// Quantify the access gap: how much you can claim now vs. what's locked.
export function computeCoverage(eligible: SchemeMatch[]): Coverage {
  const recurring = eligible.filter((m) => m.verdict === "likely_eligible" && !m.oneTime);
  const claimableNow = eligible.filter((m) => m.unlockableNow);
  return {
    totalCount: eligible.length,
    claimableNowCount: claimableNow.length,
    blockedCount: eligible.length - claimableNow.length,
    totalAnnualValue: recurring.reduce((s, m) => s + m.annualValue, 0),
    claimableNowValue: claimableNow.filter((m) => !m.oneTime && m.verdict === "likely_eligible").reduce((s, m) => s + m.annualValue, 0),
  };
}
