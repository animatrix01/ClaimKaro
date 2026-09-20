import {
  L,
  type ApplyAt,
  type Confidence,
  type DocId,
  type LifeNeed,
  type Localized,
  type Profile,
  type TraceStep,
  type Verdict,
} from "./types";

interface EvalResult {
  verdict: Verdict;
  confidence: Confidence;
  headline: Localized;
  reasons: TraceStep[];
}

export interface SchemeDef {
  id: string;
  name: string;
  hindiName: string;
  need: LifeNeed;
  icon: string;
  what: Localized;
  benefit: Localized;
  annualValue: number;
  oneTime: boolean;
  requiredDocs: DocId[];
  providesDoc?: DocId;
  applyAt: ApplyAt;
  citationIds: string[];
  missingDocTip?: Localized;
  evaluate: (p: Profile) => EvalResult;
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const inrHi = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const incomeKnown = (p: Profile) => typeof p.annualHouseholdIncome === "number";
// "Low-income / BPL" household — we never use the word "poor".
const isLowIncome = (p: Profile) =>
  p.bpl === true ||
  (incomeKnown(p) && (p.annualHouseholdIncome as number) <= 150000) ||
  ["landless_laborer", "informal", "unemployed"].includes(p.occupation ?? "");

export const SCHEMES: SchemeDef[] = [
  // ---------------- Pensions ----------------
  {
    id: "ignoaps",
    name: "Old Age Pension (IGNOAPS)",
    hindiName: "वृद्धावस्था पेंशन",
    need: "pension",
    icon: "👵",
    what: L("A monthly pension for elderly people in low-income/BPL families.", "BPL/कम-आय परिवारों के बुज़ुर्गों के लिए मासिक पेंशन।"),
    benefit: L("₹200–500 / month (states add more)", "₹200–500 / माह (राज्य और जोड़ते हैं)"),
    annualValue: 2400,
    oneTime: false,
    requiredDocs: ["aadhaar", "bank", "ration_bpl", "domicile"],
    applyAt: { authority: L("Gram Panchayat / Block Development Office", "ग्राम पंचायत / प्रखंड विकास कार्यालय"), portal: L("NSAP / State Social Welfare Dept", "NSAP / राज्य समाज कल्याण विभाग"), portalUrl: "https://nsap.nic.in" },
    citationIds: ["NSAP"],
    evaluate: (p) => {
      if (p.age == null) return { verdict: "need_info", confidence: "low", headline: L("Tell us your age to check the old-age pension.", "वृद्धावस्था पेंशन जाँचने के लिए अपनी उम्र बताएँ।"), reasons: [{ label: L("Age needed", "उम्र चाहिए"), detail: L("Old-age pension starts at 60.", "वृद्धावस्था पेंशन 60 वर्ष से शुरू होती है।"), sourceId: "NSAP" }] };
      if (p.age < 60) return { verdict: "likely_not", confidence: "high", headline: L("You're below 60, so the old-age pension does not apply yet.", "आप 60 से कम हैं, इसलिए वृद्धावस्था पेंशन अभी लागू नहीं होती।"), reasons: [{ label: L("Age", "उम्र"), detail: L(`You are ${p.age}; this pension is for 60+.`, `आपकी उम्र ${p.age} है; यह पेंशन 60+ के लिए है।`), sourceId: "NSAP" }] };
      const r: TraceStep[] = [{ label: L("Age", "उम्र"), detail: L(`You are ${p.age} (60+).`, `आपकी उम्र ${p.age} (60+) है।`), sourceId: "NSAP" }];
      if (p.bpl === true) { r.push({ label: L("BPL", "BPL"), detail: L("Your family is on the BPL list — this pension is for BPL families.", "आपका परिवार BPL सूची में है — यह पेंशन BPL परिवारों के लिए है।"), sourceId: "NSAP" }); return { verdict: "likely_eligible", confidence: "high", headline: L("You may be eligible for the monthly old-age pension.", "आप मासिक वृद्धावस्था पेंशन के पात्र हो सकते हैं।"), reasons: r }; }
      if (p.bpl === false) return { verdict: "likely_not", confidence: "medium", headline: L("You're 60+, but this pension is for BPL families.", "आप 60+ हैं, पर यह पेंशन BPL परिवारों के लिए है।"), reasons: [...r, { label: L("BPL", "BPL"), detail: L("Reserved for below-poverty-line households.", "गरीबी रेखा से नीचे के परिवारों के लिए आरक्षित।"), sourceId: "NSAP" }] };
      r.push({ label: L("BPL (check)", "BPL (जाँचें)"), detail: L("If your family is on the BPL/Antyodaya list you may qualify. A ration card proves this.", "यदि आपका परिवार BPL/अंत्योदय सूची में है तो आप पात्र हो सकते हैं। राशन कार्ड इसका प्रमाण है।"), sourceId: "NSAP" });
      return { verdict: "maybe_eligible", confidence: "medium", headline: L("You're 60+ — if your family is BPL, you may be eligible.", "आप 60+ हैं — यदि परिवार BPL है, तो आप पात्र हो सकते हैं।"), reasons: r };
    },
  },
  {
    id: "ignwps",
    name: "Widow Pension (IGNWPS)",
    hindiName: "विधवा पेंशन",
    need: "pension",
    icon: "🕊️",
    what: L("A monthly pension for widows in low-income/BPL families.", "BPL/कम-आय परिवारों की विधवाओं के लिए मासिक पेंशन।"),
    benefit: L("₹300+ / month (states add more)", "₹300+ / माह (राज्य और जोड़ते हैं)"),
    annualValue: 3600,
    oneTime: false,
    requiredDocs: ["aadhaar", "bank", "ration_bpl", "domicile"],
    applyAt: { authority: L("Gram Panchayat / Block office", "ग्राम पंचायत / प्रखंड कार्यालय"), portal: L("NSAP / State Social Welfare Dept", "NSAP / राज्य समाज कल्याण विभाग"), portalUrl: "https://nsap.nic.in" },
    citationIds: ["NSAP", "AWARENESS_GAP"],
    missingDocTip: L("You'll also need your husband's death certificate as widow proof.", "विधवा प्रमाण हेतु पति का मृत्यु प्रमाण पत्र भी चाहिए।"),
    evaluate: (p) => {
      if (!p.household.isWidow) return { verdict: "likely_not", confidence: "high", headline: L("Widow pension applies only to widows.", "विधवा पेंशन केवल विधवाओं के लिए है।"), reasons: [{ label: L("Status", "स्थिति"), detail: L("This scheme is specifically for widows.", "यह योजना विशेष रूप से विधवाओं के लिए है।"), sourceId: "NSAP" }] };
      const r: TraceStep[] = [{ label: L("Status", "स्थिति"), detail: L("You are a widow — this pension is meant for you.", "आप विधवा हैं — यह पेंशन आपके लिए है।"), sourceId: "NSAP" }];
      if (p.bpl === false) return { verdict: "likely_not", confidence: "medium", headline: L("Widow pension is for BPL families; you indicated not BPL.", "विधवा पेंशन BPL परिवारों के लिए है; आपने BPL नहीं बताया।"), reasons: [...r, { label: L("BPL", "BPL"), detail: L("Reserved for below-poverty-line households.", "गरीबी रेखा से नीचे के परिवारों हेतु आरक्षित।"), sourceId: "NSAP" }] };
      r.push({ label: L("You're not alone", "आप अकेली नहीं"), detail: L("About 2/3 of eligible widows never claim this pension — mostly for lack of information. You don't have to be one of them.", "लगभग 2/3 पात्र विधवाएँ यह पेंशन कभी नहीं लेतीं — ज़्यादातर जानकारी न होने से। आपको ऐसा नहीं होना है।"), sourceId: "AWARENESS_GAP" });
      return { verdict: p.bpl === true ? "likely_eligible" : "maybe_eligible", confidence: p.bpl === true ? "high" : "medium", headline: L("You may be eligible for the monthly widow pension.", "आप मासिक विधवा पेंशन के पात्र हो सकती हैं।"), reasons: r };
    },
  },
  {
    id: "igndps",
    name: "Disability Pension (IGNDPS)",
    hindiName: "दिव्यांग पेंशन",
    need: "pension",
    icon: "♿",
    what: L("A monthly pension for people with severe disability in low-income/BPL families.", "BPL/कम-आय परिवारों के गंभीर दिव्यांग व्यक्तियों के लिए मासिक पेंशन।"),
    benefit: L("₹300+ / month (states add more)", "₹300+ / माह (राज्य और जोड़ते हैं)"),
    annualValue: 3600,
    oneTime: false,
    requiredDocs: ["aadhaar", "disability_udid", "ration_bpl", "bank"],
    applyAt: { authority: L("Gram Panchayat / Block office", "ग्राम पंचायत / प्रखंड कार्यालय"), portal: L("NSAP / State Social Welfare Dept", "NSAP / राज्य समाज कल्याण विभाग"), portalUrl: "https://nsap.nic.in" },
    citationIds: ["NSAP"],
    evaluate: (p) => {
      if (p.disability === "none") return { verdict: "likely_not", confidence: "high", headline: L("Disability pension is for people with severe disability.", "दिव्यांग पेंशन गंभीर दिव्यांगता वाले व्यक्तियों के लिए है।"), reasons: [{ label: L("Disability", "दिव्यांगता"), detail: L("This pension needs a severe (80%+) disability.", "इस पेंशन हेतु गंभीर (80%+) दिव्यांगता चाहिए।"), sourceId: "NSAP" }] };
      if (p.disability === "benchmark") return { verdict: "maybe_eligible", confidence: "low", headline: L("For the disability pension you usually need 80%+ — but a disability certificate still unlocks other benefits. Confirm your percentage.", "दिव्यांग पेंशन हेतु आमतौर पर 80%+ चाहिए — पर दिव्यांगता प्रमाण पत्र अन्य लाभ भी खोलता है। अपना प्रतिशत जाँचें।"), reasons: [{ label: L("Disability", "दिव्यांगता"), detail: L("You reported a benchmark (40%+) disability; IGNDPS needs 80%+, but reservations & other benefits still apply.", "आपने 40%+ दिव्यांगता बताई; IGNDPS हेतु 80%+ चाहिए, पर आरक्षण व अन्य लाभ फिर भी लागू।"), sourceId: "NSAP" }] };
      if (p.bpl === false) return { verdict: "likely_not", confidence: "medium", headline: L("Disability pension is for BPL families; you indicated not BPL.", "दिव्यांग पेंशन BPL परिवारों के लिए है; आपने BPL नहीं बताया।"), reasons: [{ label: L("BPL", "BPL"), detail: L("Reserved for below-poverty-line households.", "गरीबी रेखा से नीचे के परिवारों हेतु आरक्षित।"), sourceId: "NSAP" }] };
      return { verdict: p.bpl === true ? "likely_eligible" : "maybe_eligible", confidence: p.bpl === true ? "high" : "medium", headline: L("You may be eligible for the monthly disability pension.", "आप मासिक दिव्यांग पेंशन के पात्र हो सकते हैं।"), reasons: [{ label: L("Disability", "दिव्यांगता"), detail: L("You reported a severe (80%+) disability — the level this pension needs.", "आपने गंभीर (80%+) दिव्यांगता बताई — इस पेंशन के लिए आवश्यक स्तर।"), sourceId: "NSAP" }] };
    },
  },

  // ---------------- Food ----------------
  {
    id: "nfsa",
    name: "Ration card (NFSA / PDS)",
    hindiName: "राशन कार्ड (NFSA)",
    need: "food",
    icon: "🍚",
    what: L("Subsidised foodgrain every month — and your proof of BPL status, which unlocks other schemes.", "हर महीने रियायती अनाज — और आपकी BPL स्थिति का प्रमाण, जो अन्य योजनाएँ खोलता है।"),
    benefit: L("5 kg foodgrain/person/month (AAY: 35 kg/household)", "5 किग्रा अनाज/व्यक्ति/माह (AAY: 35 किग्रा/परिवार)"),
    annualValue: 0,
    oneTime: false,
    requiredDocs: ["aadhaar", "domicile"],
    providesDoc: "ration_bpl",
    applyAt: { authority: L("Food & Civil Supplies Dept / FPS dealer", "खाद्य एवं रसद विभाग / राशन डीलर"), portal: L("State PDS portal / CSC", "राज्य PDS पोर्टल / CSC"), portalUrl: "https://nfsa.gov.in" },
    citationIds: ["NFSA"],
    evaluate: (p) => {
      if (p.documentsHave.includes("ration_bpl")) return { verdict: "likely_eligible", confidence: "high", headline: L("You already hold a ration card — keep drawing your monthly grain; it also proves BPL status for other schemes.", "आपके पास राशन कार्ड है — मासिक अनाज लेते रहें; यह अन्य योजनाओं हेतु BPL प्रमाण भी है।"), reasons: [{ label: L("Already have it", "पहले से उपलब्ध"), detail: L("Your ration card is active.", "आपका राशन कार्ड सक्रिय है।"), sourceId: "NFSA" }] };
      if (isLowIncome(p)) return { verdict: "likely_eligible", confidence: "medium", headline: L("Your household likely qualifies for a subsidised ration card under NFSA.", "आपका परिवार संभवतः NFSA के तहत रियायती राशन कार्ड का पात्र है।"), reasons: [{ label: L("Need-based", "आवश्यकता-आधारित"), detail: L("Priority/Antyodaya ration cards target low-income households.", "प्राथमिकता/अंत्योदय राशन कार्ड कम-आय परिवारों के लिए हैं।"), sourceId: "NFSA" }] };
      return { verdict: "maybe_eligible", confidence: "low", headline: L("You may qualify for a ration card depending on the state priority list.", "राज्य प्राथमिकता सूची के अनुसार आप राशन कार्ड के पात्र हो सकते हैं।"), reasons: [{ label: L("Check", "जाँचें"), detail: L("Coverage depends on the state's NFSA priority list.", "कवरेज राज्य की NFSA प्राथमिकता सूची पर निर्भर है।"), sourceId: "NFSA" }] };
    },
  },

  // ---------------- Income support ----------------
  {
    id: "pmkisan",
    name: "PM-KISAN",
    hindiName: "पीएम-किसान",
    need: "income_support",
    icon: "🌾",
    what: L("₹6,000 a year, in three installments, for land-holding farmer families.", "भूमि-धारक किसान परिवारों को ₹6,000 सालाना, तीन किस्तों में।"),
    benefit: L("₹6,000 / year", "₹6,000 / वर्ष"),
    annualValue: 6000,
    oneTime: false,
    requiredDocs: ["aadhaar", "bank"],
    applyAt: { authority: L("Village revenue officer / CSC", "ग्राम राजस्व अधिकारी / CSC"), portal: L("PM-KISAN portal", "पीएम-किसान पोर्टल"), portalUrl: "https://pmkisan.gov.in" },
    citationIds: ["PM_KISAN"],
    missingDocTip: L("You'll also need your land ownership records (khasra/khatauni).", "आपको भूमि स्वामित्व रिकॉर्ड (खसरा/खतौनी) भी चाहिए।"),
    evaluate: (p) => {
      const hasLand = p.occupation === "small_farmer" || (typeof p.landAcres === "number" && p.landAcres > 0);
      if (p.occupation === "landless_laborer" || p.landAcres === 0) return { verdict: "likely_not", confidence: "high", headline: L("PM-KISAN needs cultivable land in your family's name — but MGNREGA work and other schemes still apply.", "पीएम-किसान हेतु परिवार के नाम खेती-योग्य ज़मीन चाहिए — पर मनरेगा कार्य व अन्य योजनाएँ फिर भी लागू।"), reasons: [{ label: L("Land", "ज़मीन"), detail: L("PM-KISAN is for land-holding farmer families.", "पीएम-किसान भूमि-धारक किसान परिवारों के लिए है।"), sourceId: "PM_KISAN" }] };
      if (hasLand) return { verdict: "likely_eligible", confidence: "medium", headline: L("As a land-holding farmer family you may be eligible for ₹6,000/year.", "भूमि-धारक किसान परिवार के रूप में आप ₹6,000/वर्ष के पात्र हो सकते हैं।"), reasons: [{ label: L("Land", "ज़मीन"), detail: L("You hold cultivable land.", "आपके पास खेती-योग्य ज़मीन है।"), sourceId: "PM_KISAN" }, { label: L("Exclusions", "अपवाद"), detail: L("Income-tax payers and government employees are excluded.", "आयकरदाता व सरकारी कर्मचारी शामिल नहीं।"), sourceId: "PM_KISAN" }] };
      return { verdict: "need_info", confidence: "low", headline: L("Do you own cultivable land? PM-KISAN is for farmer families.", "क्या आपके पास खेती-योग्य ज़मीन है? पीएम-किसान किसान परिवारों के लिए है।"), reasons: [{ label: L("Land needed", "ज़मीन की जानकारी"), detail: L("Tell us if your family owns farmland.", "बताएँ कि परिवार के पास खेती की ज़मीन है या नहीं।"), sourceId: "PM_KISAN" }] };
    },
  },

  // ---------------- Housing ----------------
  {
    id: "pmayg",
    name: "PMAY-Gramin (housing)",
    hindiName: "पीएम आवास (ग्रामीण)",
    need: "housing",
    icon: "🏘️",
    what: L("Money to build a pucca house if you don't have one.", "यदि पक्का घर नहीं है तो उसे बनाने के लिए सहायता।"),
    benefit: L("≈₹1.2 lakh one-time + MGNREGA wages", "≈₹1.2 लाख एकमुश्त + मनरेगा मज़दूरी"),
    annualValue: 0,
    oneTime: true,
    requiredDocs: ["aadhaar", "bank", "ration_bpl"],
    applyAt: { authority: L("Gram Panchayat / Block office", "ग्राम पंचायत / प्रखंड कार्यालय"), portal: L("PMAY-G / AwaasSoft", "PMAY-G / आवास सॉफ्ट"), portalUrl: "https://pmayg.nic.in" },
    citationIds: ["PMAYG"],
    evaluate: (p) => {
      if (!p.household.lacksPuccaHouse) return { verdict: "likely_not", confidence: "medium", headline: L("PMAY-G helps those without a pucca house.", "PMAY-G उन्हें मदद करता है जिनके पास पक्का घर नहीं है।"), reasons: [{ label: L("Housing", "आवास"), detail: L("You indicated you already have a pucca house.", "आपने बताया कि आपके पास पहले से पक्का घर है।"), sourceId: "PMAYG" }] };
      if (!p.household.isRural) return { verdict: "maybe_eligible", confidence: "low", headline: L("PMAY-Gramin is rural; in towns the urban PMAY may apply instead.", "PMAY-ग्रामीण गाँवों के लिए है; शहरों में शहरी PMAY लागू हो सकता है।"), reasons: [{ label: L("Area", "क्षेत्र"), detail: L("PMAY-G is for rural households; urban areas use PMAY-U.", "PMAY-G ग्रामीण परिवारों के लिए; शहरी क्षेत्रों में PMAY-U।"), sourceId: "PMAYG" }] };
      if (isLowIncome(p)) return { verdict: "likely_eligible", confidence: "medium", headline: L("You may be eligible for housing assistance to build a pucca home.", "आप पक्का घर बनाने हेतु आवास सहायता के पात्र हो सकते हैं।"), reasons: [{ label: L("Need", "आवश्यकता"), detail: L("No pucca house + low-income rural household matches PMAY-G.", "पक्का घर नहीं + कम-आय ग्रामीण परिवार PMAY-G से मेल खाता है।"), sourceId: "PMAYG" }, { label: L("List", "सूची"), detail: L("Final selection uses the SECC / Awaas+ list verified by the Gram Sabha.", "अंतिम चयन ग्राम सभा द्वारा सत्यापित SECC / Awaas+ सूची से होता है।"), sourceId: "PMAYG" }] };
      return { verdict: "maybe_eligible", confidence: "low", headline: L("You may qualify if your household is on the SECC/Awaas+ list.", "यदि आपका परिवार SECC/Awaas+ सूची में है तो आप पात्र हो सकते हैं।"), reasons: [{ label: L("List", "सूची"), detail: L("Selection is from the verified deprivation list.", "चयन सत्यापित अभाव सूची से होता है।"), sourceId: "PMAYG" }] };
    },
  },

  // ---------------- Health ----------------
  {
    id: "pmjay",
    name: "Ayushman Bharat (PM-JAY)",
    hindiName: "आयुष्मान भारत",
    need: "health",
    icon: "🏥",
    what: L("Free hospital treatment up to ₹5 lakh a year for your family.", "आपके परिवार के लिए साल में ₹5 लाख तक मुफ़्त अस्पताल इलाज।"),
    benefit: L("Up to ₹5 lakh/year free hospital care", "₹5 लाख/वर्ष तक मुफ़्त अस्पताल इलाज"),
    annualValue: 0,
    oneTime: false,
    requiredDocs: ["aadhaar", "ration_bpl"],
    applyAt: { authority: L("Empanelled hospital / Ayushman Mitra / CSC", "सूचीबद्ध अस्पताल / आयुष्मान मित्र / CSC"), portal: L("PM-JAY beneficiary portal", "PM-JAY लाभार्थी पोर्टल"), portalUrl: "https://pmjay.gov.in" },
    citationIds: ["PMJAY"],
    evaluate: (p) => {
      if (p.age != null && p.age >= 70) return { verdict: "likely_eligible", confidence: "high", headline: L("Everyone aged 70+ is now covered by PM-JAY — you can get an Ayushman card.", "अब सभी 70+ नागरिक PM-JAY में शामिल हैं — आप आयुष्मान कार्ड बनवा सकते हैं।"), reasons: [{ label: L("Age 70+", "उम्र 70+"), detail: L("Since Oct 2024, all citizens 70+ are covered regardless of income.", "अक्टूबर 2024 से सभी 70+ नागरिक आय की परवाह किए बिना शामिल।"), sourceId: "PMJAY" }] };
      if (isLowIncome(p)) return { verdict: "maybe_eligible", confidence: "medium", headline: L("Your household may be on the PM-JAY (SECC) list — worth checking your Ayushman eligibility.", "आपका परिवार PM-JAY (SECC) सूची में हो सकता है — आयुष्मान पात्रता जाँचना उपयोगी है।"), reasons: [{ label: L("SECC-based", "SECC-आधारित"), detail: L("Eligibility comes from the SECC-2011 list.", "पात्रता SECC-2011 सूची से आती है।"), sourceId: "PMJAY" }, { label: L("How to check", "कैसे जाँचें"), detail: L("Check your name at an empanelled hospital or CSC with your ration card.", "राशन कार्ड के साथ सूचीबद्ध अस्पताल या CSC पर अपना नाम जाँचें।"), sourceId: "PMJAY" }] };
      return { verdict: "need_info", confidence: "low", headline: L("PM-JAY depends on the SECC list or being 70+. Confirm your household details.", "PM-JAY SECC सूची या 70+ उम्र पर निर्भर है। अपने परिवार का विवरण पुष्टि करें।"), reasons: [{ label: L("Check", "जाँचें"), detail: L("Eligibility is SECC-based (or universal at 70+).", "पात्रता SECC-आधारित है (या 70+ पर सभी के लिए)।"), sourceId: "PMJAY" }] };
    },
  },

  // ---------------- Energy ----------------
  {
    id: "ujjwala",
    name: "PM Ujjwala (LPG)",
    hindiName: "उज्ज्वला योजना",
    need: "energy",
    icon: "🔥",
    what: L("A free cooking-gas (LPG) connection for women in low-income/BPL households.", "BPL/कम-आय परिवारों की महिलाओं के लिए मुफ़्त रसोई गैस (LPG) कनेक्शन।"),
    benefit: L("Free LPG connection", "मुफ़्त LPG कनेक्शन"),
    annualValue: 0,
    oneTime: true,
    requiredDocs: ["aadhaar", "ration_bpl", "bank"],
    applyAt: { authority: L("LPG distributor", "LPG वितरक"), portal: L("PMUY portal", "PMUY पोर्टल"), portalUrl: "https://pmuy.gov.in" },
    citationIds: ["UJJWALA"],
    evaluate: (p) => {
      if (!p.household.lacksLpg) return { verdict: "likely_not", confidence: "medium", headline: L("Ujjwala gives a new connection to households without LPG.", "उज्ज्वला उन परिवारों को नया कनेक्शन देता है जिनके पास LPG नहीं है।"), reasons: [{ label: L("LPG", "LPG"), detail: L("You indicated you already have an LPG connection.", "आपने बताया कि आपके पास पहले से LPG कनेक्शन है।"), sourceId: "UJJWALA" }] };
      if (isLowIncome(p)) { const inName = p.gender === "male" ? L("The connection is issued in the name of an adult woman of the household.", "कनेक्शन परिवार की किसी वयस्क महिला के नाम जारी होता है।") : L("The connection is issued in your name as an adult woman of the household.", "कनेक्शन परिवार की वयस्क महिला के रूप में आपके नाम जारी होता है।"); return { verdict: "likely_eligible", confidence: "medium", headline: L("Your household may be eligible for a free LPG connection.", "आपका परिवार मुफ़्त LPG कनेक्शन का पात्र हो सकता है।"), reasons: [{ label: L("Eligible household", "पात्र परिवार"), detail: L("Ujjwala targets BPL/low-income households without LPG.", "उज्ज्वला बिना LPG वाले BPL/कम-आय परिवारों के लिए है।"), sourceId: "UJJWALA" }, { label: L("In whose name", "किसके नाम"), detail: inName, sourceId: "UJJWALA" }] }; }
      return { verdict: "maybe_eligible", confidence: "low", headline: L("You may qualify if your household is on the eligible list.", "यदि आपका परिवार पात्र सूची में है तो आप पात्र हो सकते हैं।"), reasons: [{ label: L("Check", "जाँचें"), detail: L("Eligibility targets low-income households.", "पात्रता कम-आय परिवारों के लिए है।"), sourceId: "UJJWALA" }] };
    },
  },

  // ---------------- Education ----------------
  {
    id: "scholarship_postmatric",
    name: "Post-Matric Scholarship (SC/ST/OBC)",
    hindiName: "पोस्ट-मैट्रिक छात्रवृत्ति",
    need: "education",
    icon: "🎓",
    what: L("Covers tuition and a monthly allowance for SC/ST/OBC students after class 10.", "कक्षा 10 के बाद SC/ST/OBC छात्रों की फीस व मासिक भत्ता।"),
    benefit: L("Tuition + monthly maintenance allowance", "फीस + मासिक निर्वाह भत्ता"),
    annualValue: 0,
    oneTime: false,
    requiredDocs: ["aadhaar", "bank", "caste", "income"],
    applyAt: { authority: L("School/college nodal officer", "स्कूल/कॉलेज नोडल अधिकारी"), portal: L("National Scholarship Portal", "नेशनल स्कॉलरशिप पोर्टल"), portalUrl: "https://scholarships.gov.in" },
    citationIds: ["SCHOLARSHIP", "TRAP_RESEARCH"],
    missingDocTip: L("OBC students: the certificate must say 'Non-Creamy-Layer' (NCL) and be of the current year, or it gets rejected. The income certificate must be ≤3 years old.", "OBC छात्र: प्रमाण पत्र पर 'नॉन-क्रीमी-लेयर' (NCL) लिखा हो और चालू वर्ष का हो, वरना अस्वीकृत हो जाता है। आय प्रमाण पत्र ≤3 वर्ष पुराना हो।"),
    evaluate: (p) => {
      if (p.category === "GENERAL" || p.category === "EWS") return { verdict: "likely_not", confidence: "high", headline: L("This scholarship is for SC/ST/OBC students; other scholarships exist for EWS/General.", "यह छात्रवृत्ति SC/ST/OBC छात्रों के लिए है; EWS/सामान्य हेतु अन्य छात्रवृत्तियाँ हैं।"), reasons: [{ label: L("Category", "वर्ग"), detail: L("Post-Matric SC/ST/OBC scholarship is category-specific.", "पोस्ट-मैट्रिक SC/ST/OBC छात्रवृत्ति वर्ग-विशेष है।"), sourceId: "SCHOLARSHIP" }] };
      if (!p.household.hasSchoolGoingChild) return { verdict: "need_info", confidence: "low", headline: L("Is there a student (class 11+) in your family? This scholarship is for them.", "क्या परिवार में कोई छात्र (कक्षा 11+) है? यह छात्रवृत्ति उनके लिए है।"), reasons: [{ label: L("Who it's for", "किसके लिए"), detail: L("Students studying after class 10.", "कक्षा 10 के बाद पढ़ने वाले छात्र।"), sourceId: "SCHOLARSHIP" }] };
      const r: TraceStep[] = [{ label: L("Category", "वर्ग"), detail: L(`${p.category} students are covered.`, `${p.category} छात्र शामिल हैं।`), sourceId: "SCHOLARSHIP" }];
      const ceiling = 250000;
      if (incomeKnown(p)) {
        const inc = p.annualHouseholdIncome as number;
        const under = inc <= ceiling;
        r.push({ label: L("Income test", "आय जाँच"), detail: L(`Family income ${inr(inc)} ${under ? "≤" : ">"} ${inr(ceiling)} ceiling (OBC limits can be lower).`, `पारिवारिक आय ${inrHi(inc)} ${under ? "≤" : ">"} ${inrHi(ceiling)} सीमा (OBC सीमा कम हो सकती है)।`), sourceId: "SCHOLARSHIP" });
        r.push({ label: L("The trap", "जाल"), detail: L("Most rejections happen because the family had no caste/income certificate — get those first.", "ज़्यादातर अस्वीकृति इसलिए होती है क्योंकि परिवार के पास जाति/आय प्रमाण पत्र नहीं था — पहले वे बनवाएँ।"), sourceId: "TRAP_RESEARCH" });
        return under ? { verdict: "likely_eligible", confidence: "medium", headline: L("Your child may be eligible for the post-matric scholarship.", "आपका बच्चा पोस्ट-मैट्रिक छात्रवृत्ति का पात्र हो सकता है।"), reasons: r } : { verdict: "likely_not", confidence: "medium", headline: L("Family income appears above the scholarship ceiling.", "पारिवारिक आय छात्रवृत्ति सीमा से अधिक प्रतीत होती है।"), reasons: r };
      }
      r.push({ label: L("Income (check)", "आय (जाँचें)"), detail: L("SC/ST ceiling is ₹2.5 lakh/yr; OBC often lower. We need your income to confirm.", "SC/ST सीमा ₹2.5 लाख/वर्ष; OBC अक्सर कम। पुष्टि हेतु आय चाहिए।"), sourceId: "SCHOLARSHIP" });
      return { verdict: "maybe_eligible", confidence: "low", headline: L("Your child may be eligible — let's confirm family income.", "आपका बच्चा पात्र हो सकता है — पारिवारिक आय की पुष्टि करें।"), reasons: r };
    },
  },

  // ---------------- Maternity ----------------
  {
    id: "pmmvy",
    name: "Maternity Benefit (PMMVY)",
    hindiName: "मातृ वंदना योजना",
    need: "maternity",
    icon: "🤰",
    what: L("Cash support for pregnant and new mothers.", "गर्भवती व नई माताओं के लिए नकद सहायता।"),
    benefit: L("₹5,000 for the first child (more for a 2nd girl child)", "पहले बच्चे पर ₹5,000 (दूसरी बच्ची पर अधिक)"),
    annualValue: 0,
    oneTime: true,
    requiredDocs: ["aadhaar", "bank"],
    applyAt: { authority: L("Anganwadi (AWC) / ASHA worker", "आँगनवाड़ी (AWC) / आशा कार्यकर्ता"), portal: L("PMMVY / state portal", "PMMVY / राज्य पोर्टल"), portalUrl: "https://wcd.nic.in" },
    citationIds: ["PMMVY"],
    evaluate: (p) => {
      if (!p.household.isPregnantOrLactating) return { verdict: "likely_not", confidence: "high", headline: L("Maternity benefit is for pregnant or new mothers.", "मातृ लाभ गर्भवती या नई माताओं के लिए है।"), reasons: [{ label: L("Who it's for", "किसके लिए"), detail: L("Pregnant & lactating women.", "गर्भवती व स्तनपान कराने वाली महिलाएँ।"), sourceId: "PMMVY" }] };
      return { verdict: "likely_eligible", confidence: "high", headline: L("You may be eligible for the maternity cash benefit — register at your Anganwadi.", "आप मातृ नकद लाभ की पात्र हो सकती हैं — अपनी आँगनवाड़ी में पंजीकरण कराएँ।"), reasons: [{ label: L("Status", "स्थिति"), detail: L("Pregnant/lactating mother — register early for full installments.", "गर्भवती/स्तनपान कराने वाली माँ — पूरी किस्तों हेतु जल्दी पंजीकरण कराएँ।"), sourceId: "PMMVY" }] };
    },
  },

  // ---------------- Work ----------------
  {
    id: "mgnrega",
    name: "MGNREGA job card",
    hindiName: "मनरेगा जॉब कार्ड",
    need: "work",
    icon: "🛠️",
    what: L("Up to 100 days of guaranteed paid work per year for rural families.", "ग्रामीण परिवारों को साल में 100 दिन तक गारंटीशुदा मज़दूरी कार्य।"),
    benefit: L("100 days of wage work / year", "100 दिन मज़दूरी कार्य / वर्ष"),
    annualValue: 0,
    oneTime: false,
    requiredDocs: ["aadhaar", "domicile"],
    applyAt: { authority: L("Gram Panchayat", "ग्राम पंचायत"), portal: L("MGNREGA / job card", "मनरेगा / जॉब कार्ड"), portalUrl: "https://nrega.nic.in" },
    citationIds: ["MGNREGA"],
    evaluate: (p) => {
      if (!p.household.isRural) return { verdict: "likely_not", confidence: "medium", headline: L("MGNREGA is for rural households.", "मनरेगा ग्रामीण परिवारों के लिए है।"), reasons: [{ label: L("Area", "क्षेत्र"), detail: L("Rural employment guarantee.", "ग्रामीण रोज़गार गारंटी।"), sourceId: "MGNREGA" }] };
      return { verdict: "likely_eligible", confidence: "high", headline: L("Your household can get a MGNREGA job card for up to 100 days of paid work.", "आपका परिवार 100 दिन तक मज़दूरी कार्य हेतु मनरेगा जॉब कार्ड बनवा सकता है।"), reasons: [{ label: L("Who", "कौन"), detail: L("Any rural household with adults willing to do manual work.", "कोई भी ग्रामीण परिवार जिसके वयस्क शारीरिक कार्य को तैयार हों।"), sourceId: "MGNREGA" }] };
    },
  },
];
