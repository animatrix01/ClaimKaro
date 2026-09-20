import { L, type ApplyAt, type DocId, type Localized, type Profile, type StateId } from "./types";

interface DocInfo {
  id: DocId;
  name: string;
  hindiName: string;
  icon: string;
  what: Localized;
  prerequisites: DocId[];
  supportingDocs: Localized[];
  alternativesForPoor?: Localized;
  noEligibilityBar: boolean;
  citationIds: string[];
  baseCitationId?: string; // "STATE" => state-issued certificate
}

const STATE_CERT: Record<StateId, { authority: Localized; portal: Localized; portalUrl: string; citationId: string }> = {
  ANDHRA_PRADESH: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  ARUNACHAL_PRADESH: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  ASSAM: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  BIHAR: {
    authority: L("Circle Officer (CO) / SDO", "अंचल अधिकारी (CO) / SDO"),
    portal: L("RTPS — ServicePlus Bihar", "RTPS — सर्विसप्लस बिहार"),
    portalUrl: "https://serviceonline.bihar.gov.in",
    citationId: "BIHAR_CERT",
  },
  CHHATTISGARH: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  GOA: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  GUJARAT: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  HARYANA: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  HIMACHAL_PRADESH: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  JHARKHAND: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  KARNATAKA: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  KERALA: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  MADHYA_PRADESH: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  MAHARASHTRA: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  MANIPUR: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  MEGHALAYA: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  MIZORAM: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  NAGALAND: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  ODISHA: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  PUNJAB: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  RAJASTHAN: {
    authority: L("Tehsildar / SDM (Revenue)", "तहसीलदार / SDM (राजस्व)"),
    portal: L("e-Mitra / SSO Rajasthan", "ई-मित्र / SSO राजस्थान"),
    portalUrl: "https://sso.rajasthan.gov.in",
    citationId: "RAJ_CERT",
  },
  SIKKIM: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  TAMIL_NADU: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  TELANGANA: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  TRIPURA: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  UTTAR_PRADESH: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  UTTARAKHAND: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  WEST_BENGAL: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  ANDAMAN_AND_NICOBAR_ISLANDS: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  CHANDIGARH: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  DADRA_AND_NAGAR_HAVELI_AND_DAMAN_AND_DIU: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  DELHI: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  JAMMU_AND_KASHMIR: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  LADAKH: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  LAKSHADWEEP: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  PUDUCHERRY: {
    authority: L("State revenue / district office", "राज्य राजस्व / जिला कार्यालय"),
    portal: L("State e-District portal or CSC", "राज्य e-District पोर्टल या CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "STATE_CERT",
  },
  CENTRAL: {
    authority: L("Tehsildar / SDM (local revenue office)", "तहसीलदार / SDM (स्थानीय राजस्व कार्यालय)"),
    portal: L("your State e-District portal or nearest CSC", "अपने राज्य का e-District पोर्टल या नज़दीकी CSC"),
    portalUrl: "https://www.csc.gov.in",
    citationId: "CSC",
  },
};

export const DOCUMENTS: Record<DocId, DocInfo> = {
  aadhaar: {
    id: "aadhaar",
    name: "Aadhaar card",
    hindiName: "आधार कार्ड",
    icon: "🪪",
    what: L("Your basic identity number. Almost every scheme and certificate needs it.", "आपका बुनियादी पहचान नंबर। लगभग हर योजना और प्रमाण पत्र के लिए ज़रूरी।"),
    prerequisites: [],
    supportingDocs: [L("Any identity/address proof you have", "कोई भी पहचान/पता प्रमाण जो आपके पास हो")],
    alternativesForPoor: L(
      "No documents at all? An authorised 'introducer' or Head-of-Family enrolment lets you still get Aadhaar.",
      "कोई दस्तावेज़ नहीं? अधिकृत 'परिचयकर्ता' या परिवार-मुखिया नामांकन से भी आधार बन सकता है।"
    ),
    noEligibilityBar: true,
    citationIds: ["AADHAAR"],
  },
  bank: {
    id: "bank",
    name: "Bank account",
    hindiName: "बैंक खाता",
    icon: "🏦",
    what: L("Cash benefits are paid straight into a bank account (DBT). A free Jan Dhan account works.", "नकद लाभ सीधे बैंक खाते में आते हैं (DBT)। मुफ़्त जन धन खाता काफ़ी है।"),
    prerequisites: ["aadhaar"],
    supportingDocs: [L("Aadhaar card", "आधार कार्ड")],
    alternativesForPoor: L("A zero-balance Jan Dhan account can be opened with just Aadhaar — no minimum balance.", "सिर्फ़ आधार से शून्य-बैलेंस जन धन खाता खुल सकता है — कोई न्यूनतम बैलेंस नहीं।"),
    noEligibilityBar: true,
    citationIds: ["JANDHAN"],
  },
  caste: {
    id: "caste",
    name: "Caste certificate (SC/ST/OBC)",
    hindiName: "जाति प्रमाण पत्र",
    icon: "📜",
    what: L("Proves your SC/ST/OBC status — the one document that unlocks reserved-category schemes & scholarships.", "आपकी SC/ST/OBC स्थिति का प्रमाण — वह एक दस्तावेज़ जो आरक्षित-वर्ग योजनाएँ व छात्रवृत्ति खोलता है।"),
    prerequisites: ["aadhaar", "domicile"],
    supportingDocs: [L("Proof of residence / domicile", "निवास प्रमाण"), L("A relative's caste certificate, if any", "किसी रिश्तेदार का जाति प्रमाण पत्र, यदि हो")],
    alternativesForPoor: L(
      "No relative's certificate? Village/panchayat records, an old school certificate, or two known witnesses can support your application.",
      "रिश्तेदार का प्रमाण पत्र नहीं? गाँव/पंचायत रिकॉर्ड, पुराना स्कूल प्रमाण पत्र, या दो ज्ञात गवाह आवेदन में मदद कर सकते हैं।"
    ),
    noEligibilityBar: false,
    citationIds: ["TRAP_RESEARCH"],
    baseCitationId: "STATE",
  },
  income: {
    id: "income",
    name: "Income certificate",
    hindiName: "आय प्रमाण पत्र",
    icon: "💰",
    what: L("States your family's yearly income. Needed for scholarships, EWS, and many means-tested schemes.", "आपके परिवार की सालाना आय बताता है। छात्रवृत्ति, EWS व कई आय-आधारित योजनाओं हेतु ज़रूरी।"),
    prerequisites: ["aadhaar"],
    supportingDocs: [L("Salary slip / employer letter (if salaried)", "वेतन पर्ची / नियोक्ता पत्र (यदि वेतनभोगी)"), L("Residence proof", "निवास प्रमाण")],
    alternativesForPoor: L(
      "Daily-wage / informal worker with no salary slip? A self-declaration attested by the Patwari, Gram Panchayat, or ward member is accepted as income proof.",
      "दिहाड़ी / असंगठित कामगार जिसके पास वेतन पर्ची नहीं? पटवारी, ग्राम पंचायत या वार्ड सदस्य द्वारा सत्यापित स्व-घोषणा आय-प्रमाण के रूप में मान्य है।"
    ),
    noEligibilityBar: true,
    citationIds: [],
    baseCitationId: "STATE",
  },
  ews: {
    id: "ews",
    name: "EWS certificate",
    hindiName: "EWS प्रमाण पत्र",
    icon: "📄",
    what: L("For General-category families under ₹8 lakh income and within asset limits.", "₹8 लाख से कम आय व संपत्ति सीमा के भीतर वाले सामान्य-वर्ग परिवारों हेतु।"),
    prerequisites: ["aadhaar", "income"],
    supportingDocs: [L("Income proof", "आय प्रमाण"), L("Land/property records", "भूमि/संपत्ति रिकॉर्ड")],
    noEligibilityBar: false,
    citationIds: ["EWS_OM_2019"],
    baseCitationId: "STATE",
  },
  domicile: {
    id: "domicile",
    name: "Domicile / residence certificate",
    hindiName: "निवास प्रमाण पत्र",
    icon: "🏠",
    what: L("Proves you live in the state. Needed for state schemes, the caste certificate, and admissions.", "प्रमाण कि आप राज्य में रहते हैं। राज्य योजनाओं, जाति प्रमाण पत्र व प्रवेश हेतु ज़रूरी।"),
    prerequisites: ["aadhaar"],
    supportingDocs: [L("Ration card / electricity bill / rent proof", "राशन कार्ड / बिजली बिल / किराया प्रमाण")],
    noEligibilityBar: false,
    citationIds: [],
    baseCitationId: "STATE",
  },
  ration_bpl: {
    id: "ration_bpl",
    name: "Ration card (NFSA / BPL)",
    hindiName: "राशन कार्ड",
    icon: "🍚",
    what: L("Subsidised foodgrain AND your proof of BPL status — which itself unlocks pensions, Ujjwala and more.", "रियायती अनाज और आपकी BPL स्थिति का प्रमाण — जो खुद पेंशन, उज्ज्वला आदि खोलता है।"),
    prerequisites: ["aadhaar"],
    supportingDocs: [L("Aadhaar of all family members", "सभी सदस्यों का आधार"), L("Residence proof", "निवास प्रमाण")],
    alternativesForPoor: L(
      "Apply through the state Food & Civil Supplies portal or a CSC; AAY (Antyodaya) cards are reserved for the lowest-income families.",
      "राज्य के खाद्य एवं रसद पोर्टल या CSC से आवेदन करें; AAY (अंत्योदय) कार्ड सबसे कम-आय परिवारों के लिए हैं।"
    ),
    noEligibilityBar: false,
    citationIds: ["NFSA"],
    baseCitationId: "STATE",
  },
  disability_udid: {
    id: "disability_udid",
    name: "Disability certificate / UDID",
    hindiName: "दिव्यांगता प्रमाण पत्र / UDID",
    icon: "♿",
    what: L("Certifies your disability and percentage — needed for the disability pension and reservations.", "आपकी दिव्यांगता व प्रतिशत प्रमाणित करता है — दिव्यांग पेंशन व आरक्षण हेतु ज़रूरी।"),
    prerequisites: ["aadhaar"],
    supportingDocs: [L("Medical assessment at a government hospital", "सरकारी अस्पताल में चिकित्सा मूल्यांकन")],
    alternativesForPoor: L("The assessment is free at a notified government hospital; apply via the UDID portal or a CSC.", "अधिसूचित सरकारी अस्पताल में मूल्यांकन मुफ़्त है; UDID पोर्टल या CSC से आवेदन करें।"),
    noEligibilityBar: false,
    citationIds: [],
    baseCitationId: "STATE",
  },
};

export function docApplyAt(docId: DocId, state: StateId): ApplyAt {
  const info = DOCUMENTS[docId];
  if (info.baseCitationId === "STATE") {
    const s = STATE_CERT[state];
    return { authority: s.authority, portal: s.portal, portalUrl: s.portalUrl };
  }
  if (docId === "aadhaar") return { authority: L("UIDAI", "UIDAI"), portal: L("Aadhaar Seva Kendra", "आधार सेवा केंद्र"), portalUrl: "https://uidai.gov.in" };
  if (docId === "bank") return { authority: L("Any bank / Bank Mitra", "कोई भी बैंक / बैंक मित्र"), portal: L("Jan Dhan account", "जन धन खाता"), portalUrl: "https://pmjdy.gov.in" };
  return { authority: L("Nearest CSC", "नज़दीकी CSC"), portal: L("Common Service Centre", "कॉमन सर्विस सेंटर"), portalUrl: "https://www.csc.gov.in" };
}

export function docCitationIds(docId: DocId, state: StateId): string[] {
  const info = DOCUMENTS[docId];
  const ids = [...info.citationIds];
  if (info.baseCitationId === "STATE") ids.push(STATE_CERT[state].citationId);
  return ids;
}

export function hasDoc(p: Profile, docId: DocId): boolean {
  return p.documentsHave.includes(docId);
}
