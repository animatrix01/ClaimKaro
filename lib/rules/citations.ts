import { L, type Citation } from "./types";

// Public sources behind every rule and statistic ClaimKaro uses. Each is dated
// (`asOf`) because thresholds and scheme rules change — which is why we never
// present them as final and always point back to the official source.
//
// `source` keeps the official document name in its published form; `label` and
// `note` are localised.
//
// ⚠️ MVP DISCLOSURE: values were researched from public government sources and
// reputable reporting for this hackathon build, and should be re-verified
// against the live official portal before any real-world reliance.

export const CITATIONS: Record<string, Citation> = {
  TRAP_RESEARCH: {
    id: "TRAP_RESEARCH",
    label: L("The documentation trap", "दस्तावेज़ों का जाल"),
    source: "Haqdarshak field research; 'The Link between Identity Documents and Welfare Delivery' (2022)",
    asOf: "2022-03-14",
    url: "https://yojanacard.haqdarshak.com/2022/03/14/the-link-between-identity-documents-and-welfare-delivery/",
    note: L(
      "~20% of beneficiary exclusion is purely a documentation problem; in one district 80%+ of SC/OBC families lacked a caste certificate and so could apply for none of the schemes meant for them.",
      "~20% पात्र लोग सिर्फ़ दस्तावेज़ न होने से वंचित रह जाते हैं; एक ज़िले में 80%+ SC/OBC परिवारों के पास जाति प्रमाण पत्र नहीं था, इसलिए वे अपने लिए बनी किसी भी योजना में आवेदन नहीं कर सके।"
    ),
  },
  AWARENESS_GAP: {
    id: "AWARENESS_GAP",
    label: L("The awareness gap", "जानकारी की कमी"),
    source: "IDinsight; NextBillion; CAG performance reports on social schemes",
    asOf: "2023-01-01",
    url: "https://www.idinsight.org/publication/matching-eligible-people-to-social-welfare-programs-in-india/",
    note: L(
      "India has 800M+ eligible citizens and a >$210B welfare budget, but uptake is low because people don't know what they're entitled to; about 2/3 of eligible widows in Delhi never claim their pension.",
      "भारत में 80 करोड़+ पात्र नागरिक और $210 अरब+ का कल्याण बजट है, फिर भी लाभ कम पहुँचते हैं क्योंकि लोगों को अपने हक़ की जानकारी नहीं होती; दिल्ली में लगभग 2/3 पात्र विधवाएँ पेंशन कभी नहीं लेतीं।"
    ),
  },
  NSAP: {
    id: "NSAP",
    label: L("NSAP pensions (old-age / widow / disability)", "NSAP पेंशन (वृद्धावस्था / विधवा / दिव्यांग)"),
    source: "National Social Assistance Programme guidelines, Ministry of Rural Development",
    asOf: "2014-10-01",
    url: "https://nsap.nic.in",
    note: L(
      "IGNOAPS: age 60+ & BPL → ₹200/mo (₹500 at 80+). IGNWPS: widow 40-59 & BPL → central ₹300/mo. IGNDPS: 18-59, severe (80%+) disability & BPL → central ₹300/mo. States usually add a top-up.",
      "वृद्धावस्था: 60+ व BPL → ₹200/माह (80+ पर ₹500)। विधवा: 40-59 व BPL → केंद्र ₹300/माह। दिव्यांग: 18-59, गंभीर (80%+) दिव्यांगता व BPL → केंद्र ₹300/माह। राज्य आमतौर पर इसमें वृद्धि करते हैं।"
    ),
  },
  NFSA: {
    id: "NFSA",
    label: L("NFSA ration card / PDS", "NFSA राशन कार्ड / PDS"),
    source: "National Food Security Act, 2013 (Dept. of Food & Public Distribution)",
    asOf: "2013-09-10",
    url: "https://nfsa.gov.in",
    note: L(
      "Priority households get 5 kg foodgrain/person/month at subsidised rates; Antyodaya (AAY) households get 35 kg/household/month.",
      "प्राथमिकता परिवारों को 5 किग्रा अनाज/व्यक्ति/माह रियायती दर पर; अंत्योदय (AAY) परिवारों को 35 किग्रा/परिवार/माह।"
    ),
  },
  PM_KISAN: {
    id: "PM_KISAN",
    label: L("PM-KISAN", "पीएम-किसान"),
    source: "Pradhan Mantri Kisan Samman Nidhi (Ministry of Agriculture)",
    asOf: "2019-02-24",
    url: "https://pmkisan.gov.in",
    note: L(
      "₹6,000/year in three installments to land-holding farmer families. Excludes income-tax payers and government employees.",
      "भूमि-धारक किसान परिवारों को ₹6,000/वर्ष तीन किस्तों में। आयकरदाता और सरकारी कर्मचारी शामिल नहीं।"
    ),
  },
  PMAYG: {
    id: "PMAYG",
    label: L("PMAY-Gramin (rural housing)", "पीएम आवास-ग्रामीण"),
    source: "Pradhan Mantri Awaas Yojana – Gramin (Ministry of Rural Development)",
    asOf: "2016-04-01",
    url: "https://pmayg.nic.in",
    note: L(
      "Assistance (≈₹1.2 lakh) to build a pucca house for eligible rural households on the SECC/Awaas+ list who lack a pucca house.",
      "पात्र ग्रामीण परिवारों (जिनके पास पक्का घर नहीं) को SECC/Awaas+ सूची के आधार पर पक्का घर बनाने हेतु ≈₹1.2 लाख सहायता।"
    ),
  },
  PMJAY: {
    id: "PMJAY",
    label: L("Ayushman Bharat PM-JAY", "आयुष्मान भारत PM-JAY"),
    source: "Pradhan Mantri Jan Arogya Yojana (National Health Authority)",
    asOf: "2024-10-29",
    url: "https://pmjay.gov.in",
    note: L(
      "Health cover up to ₹5 lakh/family/year via the SECC-2011 list; since Oct 2024 also universal for all citizens aged 70+.",
      "SECC-2011 सूची के आधार पर ₹5 लाख/परिवार/वर्ष तक मुफ़्त इलाज; अक्टूबर 2024 से सभी 70+ नागरिकों के लिए भी।"
    ),
  },
  UJJWALA: {
    id: "UJJWALA",
    label: L("PM Ujjwala Yojana (LPG)", "पीएम उज्ज्वला योजना (LPG)"),
    source: "Pradhan Mantri Ujjwala Yojana (Ministry of Petroleum & Natural Gas)",
    asOf: "2023-01-01",
    url: "https://pmuy.gov.in",
    note: L(
      "Free LPG connection to adult women of BPL / low-income households without an existing LPG connection.",
      "बिना मौजूदा LPG कनेक्शन वाले BPL / कम-आय परिवारों की वयस्क महिलाओं को मुफ़्त गैस कनेक्शन।"
    ),
  },
  SCHOLARSHIP: {
    id: "SCHOLARSHIP",
    label: L("Post-Matric Scholarship (SC/ST/OBC)", "पोस्ट-मैट्रिक छात्रवृत्ति (SC/ST/OBC)"),
    source: "National Scholarship Portal — Post-Matric Scholarship schemes",
    asOf: "2024-06-01",
    url: "https://scholarships.gov.in",
    note: L(
      "For SC/ST students family income ceiling ₹2.5 lakh/yr (OBC limits often lower). Needs caste + income certificate (≤3 yrs old) + Aadhaar-linked bank. OBC must be Non-Creamy-Layer.",
      "SC/ST छात्रों के लिए पारिवारिक आय सीमा ₹2.5 लाख/वर्ष (OBC सीमा अक्सर कम)। जाति + आय प्रमाण पत्र (≤3 वर्ष पुराना) + आधार-लिंक बैंक चाहिए। OBC के लिए नॉन-क्रीमी-लेयर ज़रूरी।"
    ),
  },
  PMMVY: {
    id: "PMMVY",
    label: L("PMMVY (maternity benefit)", "पीएम मातृ वंदना योजना"),
    source: "Pradhan Mantri Matru Vandana Yojana (Ministry of Women & Child Development)",
    asOf: "2023-01-01",
    url: "https://wcd.nic.in",
    note: L(
      "Cash benefit (₹5,000 for the first living child) to pregnant & lactating mothers, paid in installments to a bank account.",
      "गर्भवती व स्तनपान कराने वाली माताओं को नकद लाभ (पहले बच्चे पर ₹5,000), बैंक खाते में किस्तों में।"
    ),
  },
  MGNREGA: {
    id: "MGNREGA",
    label: L("MGNREGA (job card)", "मनरेगा (जॉब कार्ड)"),
    source: "Mahatma Gandhi National Rural Employment Guarantee Act, 2005",
    asOf: "2005-09-07",
    url: "https://nrega.nic.in",
    note: L(
      "Guarantees up to 100 days of wage employment per rural household per year; the first step is a job card.",
      "हर ग्रामीण परिवार को साल में 100 दिन तक मज़दूरी रोज़गार की गारंटी; पहला कदम जॉब कार्ड है।"
    ),
  },
  AADHAAR: {
    id: "AADHAAR",
    label: L("Aadhaar enrolment", "आधार नामांकन"),
    source: "UIDAI — Aadhaar Enrolment / Update",
    asOf: "2024-01-01",
    url: "https://uidai.gov.in",
    note: L(
      "Free enrolment at an Aadhaar Seva Kendra. With no standard proof, an authorised 'introducer' or Head-of-Family enrolment is allowed.",
      "आधार सेवा केंद्र पर मुफ़्त नामांकन। प्रमाण न होने पर अधिकृत 'परिचयकर्ता' या परिवार-मुखिया आधारित नामांकन की अनुमति है।"
    ),
  },
  JANDHAN: {
    id: "JANDHAN",
    label: L("Bank account (DBT)", "बैंक खाता (DBT)"),
    source: "Pradhan Mantri Jan Dhan Yojana — zero-balance bank account",
    asOf: "2014-08-28",
    url: "https://pmjdy.gov.in",
    note: L(
      "A zero-balance Jan Dhan account can be opened with Aadhaar; needed for Direct Benefit Transfer of almost every cash scheme.",
      "आधार से शून्य-बैलेंस जन धन खाता खुल सकता है; लगभग हर नकद योजना के DBT के लिए ज़रूरी।"
    ),
  },
  EWS_OM_2019: {
    id: "EWS_OM_2019",
    label: L("EWS income & asset criteria", "EWS आय व संपत्ति मानदंड"),
    source: "DoPT / MoSJE O.M. (103rd Constitutional Amendment, 2019)",
    asOf: "2019-01-31",
    url: "https://socialjustice.gov.in",
    note: L(
      "EWS: gross annual family income below ₹8 lakh and within land/house limits; for the General category only.",
      "EWS: सकल वार्षिक पारिवारिक आय ₹8 लाख से कम और भूमि/मकान सीमा के भीतर; केवल सामान्य वर्ग हेतु।"
    ),
  },
  RAJ_CERT: {
    id: "RAJ_CERT",
    label: L("Rajasthan certificate process", "राजस्थान प्रमाणपत्र प्रक्रिया"),
    source: "Rajasthan e-Mitra / SSO portal; issuing authority Tehsildar / SDM",
    asOf: "2024-01-01",
    url: "https://sso.rajasthan.gov.in",
    note: L(
      "Caste/income/domicile/EWS certificates applied via e-Mitra; issued by Tehsildar/SDM.",
      "जाति/आय/निवास/EWS प्रमाण पत्र e-Mitra से; तहसीलदार/SDM द्वारा जारी।"
    ),
  },
  BIHAR_CERT: {
    id: "BIHAR_CERT",
    label: L("Bihar certificate process (RTPS)", "बिहार प्रमाणपत्र प्रक्रिया (RTPS)"),
    source: "Bihar Right to Public Services (RTPS) / ServicePlus; authority CO / SDO",
    asOf: "2024-01-01",
    url: "https://serviceonline.bihar.gov.in",
    note: L(
      "Caste/income/residence certificates applied via RTPS; issued within statutory time limits.",
      "जाति/आय/निवास प्रमाण पत्र RTPS से; निर्धारित समय-सीमा में जारी।"
    ),
  },
  DBT_FAIL: {
    id: "DBT_FAIL",
    label: L("Why approved benefits still fail", "मंज़ूर लाभ फिर भी क्यों रुकते हैं"),
    source: "NSP–PFMS / NPCI DBT operations; CitizenNest & RTI guidance on uncredited scholarships (2024–26)",
    asOf: "2025-01-01",
    url: "https://www.citizennest.com/guide/scholarship-payment-not-received-fix",
    note: L(
      "Roughly 8–12% of approved NSP scholarships are not paid each year for purely technical reasons — Aadhaar–bank seeding, name mismatch, or beneficiary-type errors. The benefit is sanctioned but never reaches the family.",
      "हर साल लगभग 8–12% मंज़ूर NSP छात्रवृत्तियाँ केवल तकनीकी कारणों से नहीं मिलतीं — आधार–बैंक सीडिंग, नाम बेमेल, या लाभार्थी-प्रकार त्रुटि। लाभ स्वीकृत होता है पर परिवार तक नहीं पहुँचता।"
    ),
  },
  AADHAAR_SEED: {
    id: "AADHAAR_SEED",
    label: L("Aadhaar–bank DBT seeding (NPCI)", "आधार–बैंक DBT सीडिंग (NPCI)"),
    source: "UIDAI / NPCI Aadhaar Payment Bridge (DBT seeding)",
    asOf: "2024-01-01",
    url: "https://uidai.gov.in/en/contact-support/have-any-question/308-english-uk/faqs/direct-benefit-transfer-dbt.html",
    note: L(
      "Cash benefits route to the ONE bank account 'seeded' with your Aadhaar in the NPCI mapper — not merely 'linked'. Seeding a new account de-links the old one, and an account dormant 12+ months bounces the payment. The name on the account must match Aadhaar exactly.",
      "नकद लाभ उसी एक बैंक खाते में जाते हैं जो NPCI मैपर में आपके आधार से 'सीड' है — सिर्फ़ 'लिंक' होना काफ़ी नहीं। नया खाता सीड करने पर पुराना हट जाता है, और 12+ माह से निष्क्रिय खाता भुगतान लौटा देता है। खाते का नाम आधार से बिल्कुल मेल खाना चाहिए।"
    ),
  },
  CSC: {
    id: "CSC",
    label: L("Common Service Centre / free help", "कॉमन सर्विस सेंटर / मुफ़्त मदद"),
    source: "Common Service Centres (CSC) e-Governance Services India Ltd.",
    asOf: "2024-01-01",
    url: "https://www.csc.gov.in",
    note: L(
      "Village-level CSC operators can help with applications and document collection.",
      "गाँव-स्तर के CSC संचालक आवेदन और दस्तावेज़ जुटाने में मदद कर सकते हैं।"
    ),
  },
};

export function collectCitations(ids: string[]): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const id of ids) {
    if (seen.has(id) || !CITATIONS[id]) continue;
    out.push(CITATIONS[id]);
    seen.add(id);
  }
  return out;
}
