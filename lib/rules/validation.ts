import { L, type Issue, type Localized, type Profile, type Readiness, type SchemeMatch } from "./types";

// Rejection-proofing: a deterministic pre-submission audit.
//
// Most benefits are lost AFTER a family is found eligible — to documentation and
// data-hygiene errors that silently reject the form or bounce the payment:
//   • name spelled differently across Aadhaar / bank / certificate
//   • Aadhaar not "seeded" to the bank account in the NPCI mapper (DBT)
//   • dormant bank account, wrong IFSC, stale certificate, OBC not marked NCL
// ~8–12% of *approved* scholarships are never paid for exactly these reasons.
//
// A chat can mention these in general; it cannot run an exact, repeatable audit
// over a specific person's documents. This module does — purely deterministically.

// Schemes that pay cash via DBT (so seeding / name-match matter for them).
const CASH_SCHEMES = new Set(["ignoaps", "ignwps", "igndps", "pmkisan", "pmmvy", "scholarship_postmatric"]);

// Normalise a name for comparison: uppercase, strip punctuation, collapse spaces.
function normName(s: string): string {
  return s.toUpperCase().replace(/[^A-Zऀ-ॿ\s]/g, "").replace(/\s+/g, " ").trim();
}

const IFSC_RE = /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/;

export function auditReadiness(profile: Profile, eligible: SchemeMatch[]): Readiness {
  const d = profile.docDetails;
  const issues: Issue[] = [];
  const cashEligible = eligible.filter((m) => CASH_SCHEMES.has(m.id));
  const cashNames: Localized[] = cashEligible.map((m) => ({ en: m.name, hi: m.hindiName }));
  const hasScholarship = eligible.some((m) => m.id === "scholarship_postmatric");
  const has = (doc: string) => profile.documentsHave.includes(doc as never);

  // 1) Cross-document NAME MISMATCH — the #1 silent killer.
  if (d?.names) {
    const entries = Object.entries(d.names).filter(([, v]) => v && v.trim().length > 1) as [string, string][];
    const distinct = new Set(entries.map(([, v]) => normName(v)));
    if (entries.length >= 2 && distinct.size > 1) {
      issues.push({
        id: "name_mismatch",
        severity: "blocker",
        title: L("Your name is spelled differently across documents", "आपके दस्तावेज़ों पर नाम अलग-अलग लिखा है"),
        detail: L(
          `We found different spellings: ${entries.map(([k, v]) => `${k}: "${v.trim()}"`).join(" · ")}. Even a missing surname or an initial makes the payment system reject the transfer — this is a top reason approved benefits never arrive.`,
          `अलग-अलग वर्तनी मिली: ${entries.map(([k, v]) => `${k}: "${v.trim()}"`).join(" · ")}। उपनाम छूटना या आद्याक्षर का अंतर भी भुगतान को रोक देता है — मंज़ूर लाभ न पहुँचने का यह प्रमुख कारण है।`
        ),
        fix: L(
          "Make the name identical to your Aadhaar everywhere. Ask the bank to update the account name using an Aadhaar copy (usually done in ~1 day).",
          "हर जगह नाम को आधार जैसा बिल्कुल एक जैसा कराएँ। बैंक से आधार की प्रति देकर खाते का नाम अपडेट कराएँ (आमतौर पर ~1 दिन में)।"
        ),
        affects: cashNames,
        citationIds: ["DBT_FAIL", "AADHAAR_SEED"],
      });
    }
  }

  // 2) Aadhaar–bank DBT SEEDING — money only reaches the seeded account.
  if (cashEligible.length > 0 && has("bank")) {
    if (d?.bankAadhaarSeeded === "no") {
      issues.push({
        id: "dbt_seeding",
        severity: "blocker",
        title: L("Your bank account isn't Aadhaar-seeded for payments (DBT)", "आपका बैंक खाता भुगतान के लिए आधार-सीड नहीं है (DBT)"),
        detail: L(
          "Even after approval, cash benefits go ONLY to the account 'seeded' with your Aadhaar in the NPCI system. 'Linked' is not the same as 'seeded'. Without it, the money bounces back.",
          "मंज़ूरी के बाद भी नकद लाभ केवल उसी खाते में जाते हैं जो NPCI में आपके आधार से 'सीड' है। 'लिंक' और 'सीड' अलग हैं। इसके बिना पैसा वापस लौट जाता है।"
        ),
        fix: L(
          "Ask your bank to 'seed' your Aadhaar for DBT (give written consent). Seed only the one account you want the money in.",
          "अपने बैंक से DBT हेतु आधार 'सीड' करने को कहें (लिखित सहमति दें)। केवल वही एक खाता सीड कराएँ जिसमें पैसा चाहिए।"
        ),
        affects: cashNames,
        citationIds: ["AADHAAR_SEED", "DBT_FAIL"],
      });
    } else if (d?.bankAadhaarSeeded === "unsure" || d?.bankAadhaarSeeded == null) {
      issues.push({
        id: "dbt_seeding_check",
        severity: "warning",
        title: L("Check that your bank is Aadhaar-seeded for DBT", "जाँचें कि आपका बैंक DBT हेतु आधार-सीड है"),
        detail: L(
          "Cash benefits route only to the Aadhaar-seeded account. Many people have it 'linked' but not 'seeded', and don't find out until the money never comes.",
          "नकद लाभ केवल आधार-सीड खाते में जाते हैं। कई लोगों का खाता 'लिंक' होता है पर 'सीड' नहीं — और पता तब चलता है जब पैसा नहीं आता।"
        ),
        fix: L(
          "Confirm at your bank or by dialling *99# / the bank app that your Aadhaar is seeded for DBT on this account.",
          "बैंक में या *99# / बैंक ऐप से पुष्टि करें कि इस खाते पर आधार DBT हेतु सीड है।"
        ),
        affects: cashNames,
        citationIds: ["AADHAAR_SEED"],
      });
    }
    if (d?.bankDormant === "yes") {
      issues.push({
        id: "dormant",
        severity: "blocker",
        title: L("Your bank account looks dormant", "आपका बैंक खाता निष्क्रिय लगता है"),
        detail: L("An account with no transaction for 12+ months is treated as dormant, and DBT credits to it bounce back.", "12+ माह से बिना लेन-देन वाला खाता निष्क्रिय माना जाता है, और उसमें DBT जमा वापस लौट जाता है।"),
        fix: L("Do one small deposit/withdrawal to reactivate it before you apply.", "आवेदन से पहले एक छोटा जमा/निकासी कर उसे फिर सक्रिय कराएँ।"),
        affects: cashNames,
        citationIds: ["AADHAAR_SEED"],
      });
    }
  }

  // 3) IFSC format check — a pure deterministic validation.
  if (d?.bankIfsc && d.bankIfsc.trim() && !IFSC_RE.test(d.bankIfsc.trim())) {
    issues.push({
      id: "ifsc",
      severity: "blocker",
      title: L("That IFSC code looks invalid", "वह IFSC कोड अमान्य लगता है"),
      detail: L(`"${d.bankIfsc.trim()}" is not a valid IFSC. A valid IFSC is 11 characters: 4 letters, a 0, then 6 characters. A wrong IFSC sends money to the wrong place or fails.`, `"${d.bankIfsc.trim()}" मान्य IFSC नहीं है। मान्य IFSC 11 अक्षर का होता है: 4 अक्षर, एक 0, फिर 6 अक्षर। गलत IFSC से पैसा गलत जगह जाता है या रुक जाता है।`),
      fix: L("Recheck the IFSC printed on your passbook/cheque (e.g. SBIN0001234).", "अपनी पासबुक/चेक पर छपा IFSC दोबारा जाँचें (उदा. SBIN0001234)।"),
      affects: cashNames,
      citationIds: ["AADHAAR_SEED"],
    });
  }

  // 4) Aadhaar mobile linked — needed for the OTPs that gate online applications.
  if (eligible.length > 0 && has("aadhaar") && (d?.aadhaarMobileLinked === "no" || d?.aadhaarMobileLinked === "unsure")) {
    issues.push({
      id: "aadhaar_mobile",
      severity: "warning",
      title: L("Link a mobile number to your Aadhaar", "अपने आधार से मोबाइल नंबर जोड़ें"),
      detail: L("Most online applications and seeding steps send an OTP to the mobile linked with Aadhaar. Without it you can get stuck mid-application.", "ज़्यादातर ऑनलाइन आवेदन व सीडिंग आधार से जुड़े मोबाइल पर OTP भेजते हैं। इसके बिना आवेदन बीच में अटक सकता है।"),
      fix: L("Update your mobile number at an Aadhaar Seva Kendra (small fee).", "आधार सेवा केंद्र पर अपना मोबाइल नंबर अपडेट कराएँ (मामूली शुल्क)।"),
      affects: [],
      citationIds: ["AADHAAR"],
    });
  }

  // 5) Income certificate recency (scholarships reject certificates > 3 years old).
  if (hasScholarship && has("income") && d?.incomeCertYear) {
    const age = new Date().getFullYear() - d.incomeCertYear;
    if (age > 3) {
      issues.push({
        id: "income_recency",
        severity: "blocker",
        title: L("Your income certificate is too old for the scholarship", "आपका आय प्रमाण पत्र छात्रवृत्ति हेतु बहुत पुराना है"),
        detail: L(`The scholarship needs an income certificate not older than 3 years; yours is from ${d.incomeCertYear} (~${age} years old).`, `छात्रवृत्ति हेतु आय प्रमाण पत्र 3 वर्ष से पुराना नहीं होना चाहिए; आपका ${d.incomeCertYear} का है (~${age} वर्ष पुराना)।`),
        fix: L("Get a fresh income certificate before applying on the National Scholarship Portal.", "नेशनल स्कॉलरशिप पोर्टल पर आवेदन से पहले नया आय प्रमाण पत्र बनवाएँ।"),
        affects: [{ en: "Post-Matric Scholarship", hi: "पोस्ट-मैट्रिक छात्रवृत्ति" }],
        citationIds: ["SCHOLARSHIP"],
      });
    }
  }

  // 6) OBC must be Non-Creamy-Layer for the scholarship.
  if (hasScholarship && profile.category === "OBC" && has("caste") && d?.casteIsNCL !== "yes") {
    issues.push({
      id: "obc_ncl",
      severity: d?.casteIsNCL === "no" ? "blocker" : "warning",
      title: L("Your OBC certificate must say 'Non-Creamy-Layer'", "आपके OBC प्रमाण पत्र पर 'नॉन-क्रीमी-लेयर' लिखा होना चाहिए"),
      detail: L("A plain OBC certificate is rejected for the scholarship — it must explicitly state Non-Creamy-Layer (NCL) and be of the current financial year.", "सादा OBC प्रमाण पत्र छात्रवृत्ति हेतु अस्वीकृत होता है — उस पर स्पष्ट रूप से नॉन-क्रीमी-लेयर (NCL) लिखा हो और वह चालू वित्त वर्ष का हो।"),
      fix: L("Get an OBC-NCL certificate for the current financial year from your Tehsildar / SDM.", "अपने तहसीलदार / SDM से चालू वित्त वर्ष का OBC-NCL प्रमाण पत्र बनवाएँ।"),
      affects: [{ en: "Post-Matric Scholarship", hi: "पोस्ट-मैट्रिक छात्रवृत्ति" }],
      citationIds: ["SCHOLARSHIP", "TRAP_RESEARCH"],
    });
  }

  // 7) Scholarship institute verification — a step people don't know about.
  if (hasScholarship) {
    issues.push({
      id: "institute_verify",
      severity: "info",
      title: L("After you apply, your school/college must verify it", "आवेदन के बाद आपके स्कूल/कॉलेज को इसे सत्यापित करना होगा"),
      detail: L("On the National Scholarship Portal the institute must approve your application, or it stays pending forever and no money is released.", "नेशनल स्कॉलरशिप पोर्टल पर संस्थान को आपका आवेदन स्वीकृत करना होता है, वरना वह हमेशा लंबित रहता है और पैसा जारी नहीं होता।"),
      fix: L("After submitting, personally follow up with your institute's scholarship nodal officer to verify it.", "जमा करने के बाद अपने संस्थान के छात्रवृत्ति नोडल अधिकारी से व्यक्तिगत रूप से सत्यापन कराएँ।"),
      affects: [{ en: "Post-Matric Scholarship", hi: "पोस्ट-मैट्रिक छात्रवृत्ति" }],
      citationIds: ["SCHOLARSHIP"],
    });
  }

  const blockers = issues.filter((i) => i.severity === "blocker").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const score = Math.max(0, 100 - blockers * 30 - warnings * 10);
  // Order: blockers, then warnings, then info.
  const rank = { blocker: 0, warning: 1, info: 2 } as const;
  issues.sort((a, b) => rank[a.severity] - rank[b.severity]);

  return { score, blockers, warnings, issues };
}
