import { L, type Localized, type Profile } from "./types";
import { runAssessment } from "./engine";

// Adaptive AI-guided intake — a value-of-information (VOI) reasoning chain.
//
// Instead of a static form, we ask the SINGLE most useful next question. For
// every unknown about the person, we simulate the answer against the rules
// engine and measure how many more benefits it would unlock or resolve. We then
// ask whichever question carries the most information. This is genuine
// decision-support reasoning — the AI deciding what to learn next — and it is
// fully deterministic and explainable (we can show "asked because it could
// unlock N benefits"). The LLM handles the natural-language edges (free-text /
// voice answers); the chip answers keep it usable for low-literacy users.

interface Option {
  label: Localized;
  apply: (p: Profile) => Profile;
}

interface CandidateDef {
  id: string;
  order: number; // tie-break when impact is equal
  question: Localized;
  relevant: (p: Profile) => boolean;
  options: Option[];
}

const hh = (p: Profile, patch: Partial<Profile["household"]>): Profile => ({ ...p, household: { ...p.household, ...patch } });
const isStudentScenario = (p: Profile) => p.household.hasSchoolGoingChild || (p.age != null && p.age >= 6 && p.age <= 25);
const isScholarshipScenario = (p: Profile) => isStudentScenario(p) || p.documentsHave.includes("caste") || p.documentsHave.includes("income");
const mayNeedDisabilityQ = (p: Profile) => (p.age != null && p.age >= 60) || p.household.isWidow || p.household.isPregnantOrLactating || p.household.hasElderly60Plus;
const pregnancyIsRelevant = (p: Profile) => p.gender === "female" && (p.age == null || (p.age >= 14 && p.age <= 50)) && !isStudentScenario(p);
const widowIsRelevant = (p: Profile) => p.gender === "female" && (p.age == null || p.age >= 18) && !isStudentScenario(p);

const CANDIDATES: CandidateDef[] = [
  {
    id: "bpl",
    order: 1,
    question: L("Is your family on the BPL / Antyodaya list, or on a very low income?", "क्या आपका परिवार BPL / अंत्योदय सूची में है, या बहुत कम आय पर है?"),
    relevant: (p) => p.bpl === undefined,
    options: [
      { label: L("Yes", "हाँ"), apply: (p) => ({ ...p, bpl: true }) },
      { label: L("No", "नहीं"), apply: (p) => ({ ...p, bpl: false }) },
      { label: L("Not sure", "पता नहीं"), apply: (p) => ({ ...p, bpl: true }) },
    ],
  },
  {
    id: "age",
    order: 2,
    question: L("How old are you?", "आपकी उम्र क्या है?"),
    relevant: (p) => p.age === undefined,
    options: [
      { label: L("Under 18", "18 से कम"), apply: (p) => ({ ...p, age: 12 }) },
      { label: L("18–59", "18–59"), apply: (p) => ({ ...p, age: 35 }) },
      { label: L("60–69", "60–69"), apply: (p) => ({ ...p, age: 65 }) },
      { label: L("70 or above", "70 या अधिक"), apply: (p) => ({ ...p, age: 72 }) },
    ],
  },
  {
    id: "gender",
    order: 3,
    question: L("What is your gender?", "आपका लिंग क्या है?"),
    relevant: (p) => p.gender === undefined,
    options: [
      { label: L("Female", "महिला"), apply: (p) => ({ ...p, gender: "female" }) },
      { label: L("Male", "पुरुष"), apply: (p) => ({ ...p, gender: "male" }) },
      { label: L("Other", "अन्य"), apply: (p) => ({ ...p, gender: "other" }) },
    ],
  },
  {
    id: "work",
    order: 4,
    question: L("What does your family mainly do for a living?", "आपका परिवार जीविका के लिए मुख्यतः क्या करता है?"),
    relevant: (p) => p.occupation === undefined,
    options: [
      { label: L("Daily-wage / labour", "दिहाड़ी / मज़दूरी"), apply: (p) => ({ ...p, occupation: "landless_laborer", landAcres: 0 }) },
      { label: L("Own a small farm", "छोटी खेती"), apply: (p) => ({ ...p, occupation: "small_farmer", landAcres: p.landAcres ?? 1 }) },
      { label: L("Other / informal", "अन्य / असंगठित"), apply: (p) => ({ ...p, occupation: "informal" }) },
    ],
  },
  {
    id: "house",
    order: 5,
    question: L("What kind of house do you live in?", "आप किस तरह के घर में रहते हैं?"),
    relevant: () => true,
    options: [
      { label: L("Kachha (not solid)", "कच्चा"), apply: (p) => hh(p, { lacksPuccaHouse: true }) },
      { label: L("Pucca (solid)", "पक्का"), apply: (p) => hh(p, { lacksPuccaHouse: false }) },
    ],
  },
  {
    id: "lpg",
    order: 6,
    question: L("Do you have a cooking-gas (LPG) connection?", "क्या आपके पास रसोई गैस (LPG) कनेक्शन है?"),
    relevant: () => true,
    options: [
      { label: L("No", "नहीं"), apply: (p) => hh(p, { lacksLpg: true }) },
      { label: L("Yes", "हाँ"), apply: (p) => hh(p, { lacksLpg: false }) },
    ],
  },
  {
    id: "child",
    order: 7,
    question: L("Is there a child studying (school or college) in your family?", "क्या आपके परिवार में कोई बच्चा पढ़ रहा है (स्कूल/कॉलेज)?"),
    relevant: (p) => isScholarshipScenario(p) && p.household.hasSchoolGoingChild === false && p.age == null,
    options: [
      { label: L("Yes", "हाँ"), apply: (p) => hh(p, { hasSchoolGoingChild: true }) },
      { label: L("No", "नहीं"), apply: (p) => hh(p, { hasSchoolGoingChild: false }) },
    ],
  },
  {
    id: "income_bucket",
    order: 8,
    question: L("About how much is the family's annual income?", "परिवार की सालाना आमदनी लगभग कितनी है?"),
    relevant: (p) => isScholarshipScenario(p) && p.annualHouseholdIncome == null,
    options: [
      { label: L("Up to ₹1.5 lakh", "₹1.5 लाख तक"), apply: (p) => ({ ...p, annualHouseholdIncome: 150000 }) },
      { label: L("₹1.5–2.5 lakh", "₹1.5–2.5 लाख"), apply: (p) => ({ ...p, annualHouseholdIncome: 200000 }) },
      { label: L("Above ₹2.5 lakh", "₹2.5 लाख से ज़्यादा"), apply: (p) => ({ ...p, annualHouseholdIncome: 300000 }) },
    ],
  },
  {
    id: "income_doc",
    order: 9,
    question: L("Do you already have an income certificate for the student?", "क्या आपके छात्र/बच्चे के लिए आय प्रमाण-पत्र पहले से है?"),
    relevant: (p) => isScholarshipScenario(p) && !p.documentsHave.includes("income"),
    options: [
      { label: L("Yes", "हाँ"), apply: (p) => ({ ...p, documentsHave: Array.from(new Set([...p.documentsHave, "income"])) }) },
      { label: L("No", "नहीं"), apply: (p) => p },
    ],
  },
  {
    id: "widow",
    order: 10,
    question: L("Are you a widow?", "क्या आप विधवा हैं?"),
    relevant: widowIsRelevant,
    options: [
      { label: L("Yes", "हाँ"), apply: (p) => hh(p, { isWidow: true }) },
      { label: L("No", "नहीं"), apply: (p) => hh(p, { isWidow: false }) },
    ],
  },
  {
    id: "pregnant",
    order: 11,
    question: L("Are you pregnant or a new mother?", "क्या आप गर्भवती हैं या नई माँ हैं?"),
    relevant: pregnancyIsRelevant,
    options: [
      { label: L("Yes", "हाँ"), apply: (p) => hh(p, { isPregnantOrLactating: true }) },
      { label: L("No", "नहीं"), apply: (p) => hh(p, { isPregnantOrLactating: false }) },
    ],
  },
  {
    id: "disability",
    order: 12,
    question: L("Does anyone in the family have a disability?", "क्या परिवार में किसी को दिव्यांगता है?"),
    relevant: (p) => p.disability === "none" && mayNeedDisabilityQ(p),
    options: [
      { label: L("Severe (80%+)", "गंभीर (80%+)"), apply: (p) => ({ ...p, disability: "severe" }) },
      { label: L("Some (40%+)", "कुछ (40%+)"), apply: (p) => ({ ...p, disability: "benchmark" }) },
      { label: L("No", "नहीं"), apply: (p) => ({ ...p, disability: "none" }) },
    ],
  },
];

export interface NextQuestion {
  id: string;
  question: Localized;
  options: { label: Localized; apply: (p: Profile) => Profile }[];
  impact: number; // how many more benefits the best answer could unlock
}

const matchCount = (p: Profile) => runAssessment(p).matches.length;

// Pick the highest-value question not yet asked. Returns null when no remaining
// question would change the result — i.e. the AI has learned what it needs.
export function nextQuestion(profile: Profile, asked: string[]): NextQuestion | null {
  const current = matchCount(profile);
  const ranked = CANDIDATES.filter((c) => !asked.includes(c.id) && c.relevant(profile))
    .map((c) => {
      const impact = Math.max(0, ...c.options.map((o) => matchCount(o.apply(profile)) - current));
      const scenarioBonus = (c.id === "income_bucket" || c.id === "income_doc" || c.id === "child") && isScholarshipScenario(profile) ? 5 : 0;
      return { c, impact: impact + scenarioBonus };
    })
    .sort((a, b) => b.impact - a.impact || a.c.order - b.c.order);

  const top = ranked[0];
  if (!top || top.impact <= 0) return null;
  return { id: top.c.id, question: top.c.question, options: top.c.options, impact: top.impact };
}
