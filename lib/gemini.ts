// Server-side ONLY. The Gemini key never reaches the browser.
//
// The LLM has a deliberately narrow job in ClaimKaro:
//   1. parse free-text into structured Profile fields (NLP intake), and
//   2. explain a verdict the deterministic engine already computed.
// It never decides eligibility and never invents a threshold.
//
// Every LLM call has a deterministic fallback so the demo still works if the
// API key is missing, rate-limited, or invalid.
//
// NOTE: imported only by server-side route handlers — the key stays on the server.

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const KEY = process.env.GEMINI_API_KEY || "";

export function geminiConfigured(): boolean {
  return KEY.length > 0;
}

interface GenOpts {
  json?: boolean;
  temperature?: number;
  // Optional inline image for multi-modal vision calls (document scan).
  // Base64 WITHOUT the "data:" prefix. Stays server-side only.
  inlineData?: { mimeType: string; data: string };
}

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

// Low-level call to the Gemini REST API. Returns null on any failure so callers
// fall back to deterministic behaviour.
async function geminiCall(prompt: string, opts: GenOpts = {}): Promise<string | null> {
  if (!KEY) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const parts: GeminiPart[] = opts.inlineData
    ? [{ text: prompt }, { inlineData: { mimeType: opts.inlineData.mimeType, data: opts.inlineData.data } }]
    : [{ text: prompt }];
  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: opts.temperature ?? 0.2,
      // These are simple structuring/restating tasks — skip the model's
      // "thinking" budget (2.5+) for lower latency. Older models ignore it.
      thinkingConfig: { thinkingBudget: 0 },
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      // Send the key as a header (works for AI Studio API keys) — avoids leaking
      // it in any logged URL.
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify(body),
      // Don't hang the request if Gemini is slow.
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) {
      console.error(`[gemini] ${res.status} ${res.statusText}: ${(await res.text()).slice(0, 300)}`);
      return null;
    }
    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ?? null;
  } catch (err) {
    console.error("[gemini] call failed:", (err as Error).message);
    return null;
  }
}

export interface ParsedProfile {
  category?: "SC" | "ST" | "OBC" | "EWS" | "GENERAL";
  gender?: "male" | "female" | "other";
  state?: "RAJASTHAN" | "BIHAR" | "CENTRAL";
  age?: number;
  annualHouseholdIncome?: number;
  bpl?: boolean;
  occupation?: "landless_laborer" | "small_farmer" | "informal" | "salaried" | "unemployed" | "homemaker" | "other";
  landAcres?: number;
  disability?: "none" | "benchmark" | "severe";
  household?: Partial<{
    isWidow: boolean;
    isPregnantOrLactating: boolean;
    hasSchoolGoingChild: boolean;
    hasElderly60Plus: boolean;
    lacksPuccaHouse: boolean;
    lacksLpg: boolean;
    isRural: boolean;
  }>;
  documentsHave?: ("aadhaar" | "bank" | "caste" | "income" | "ews" | "domicile" | "ration_bpl" | "disability_udid")[];
  language?: "en" | "hi";
}

const PARSE_SYSTEM = `You are the intake parser for ClaimKaro, a tool that helps poor and marginalised Indian families discover the government welfare schemes and certificates they may be entitled to.
Extract ONLY what the user actually stated or clearly implied. Do not guess, do not decide eligibility — you only structure what they said.
Return STRICT JSON with any of these keys (omit keys you cannot determine):
{
 "category": "SC"|"ST"|"OBC"|"EWS"|"GENERAL",
 "gender": "male"|"female"|"other",
 "state": "RAJASTHAN"|"BIHAR"|"CENTRAL",
 "age": number,
 "annualHouseholdIncome": number (rupees; convert 'lakh' e.g. 1.8 lakh => 180000),
 "bpl": boolean (true if they say poor/below poverty line/BPL/Antyodaya or hold a BPL ration card),
 "occupation": "landless_laborer"|"small_farmer"|"informal"|"salaried"|"unemployed"|"homemaker"|"other",
 "landAcres": number,
 "disability": "none"|"benchmark"|"severe",
 "household": { "isWidow": bool, "isPregnantOrLactating": bool, "hasSchoolGoingChild": bool, "hasElderly60Plus": bool, "lacksPuccaHouse": bool, "lacksLpg": bool, "isRural": bool },
 "documentsHave": array of "aadhaar"|"bank"|"caste"|"income"|"ews"|"domicile"|"ration_bpl"|"disability_udid",
 "language": "en"|"hi"
}
Notes: daily-wage/labourer with no land => "landless_laborer"; farmer/khet => "small_farmer"; street vendor/domestic/self-employed => "informal". "widow"/पति की मृत्यु => isWidow. pregnant/expecting/गर्भवती => isPregnantOrLactating. child in school/college => hasSchoolGoingChild. kachha/mud house => lacksPuccaHouse. no gas/LPG/चूल्हा => lacksLpg. village/गाँव => isRural true. Map any mentioned documents (Aadhaar, ration card, bank account, caste/income/domicile certificate) into documentsHave. If text is in Hindi set language "hi".`;

// Deterministic fallback parser — keyword/number heuristics so the
// conversational box still does something useful without the API.
function fallbackParse(text: string): ParsedProfile {
  const t = text.toLowerCase();
  const out: ParsedProfile = {};
  const hh: NonNullable<ParsedProfile["household"]> = {};
  if (/[ऀ-ॿ]/.test(text)) out.language = "hi";

  if (/\bobc\b|other backward|पिछड़ा/.test(t)) out.category = "OBC";
  else if (/\bsc\b|scheduled caste|dalit|दलित|अनुसूचित जाति/.test(t)) out.category = "SC";
  else if (/\bst\b|scheduled tribe|adivasi|आदिवासी/.test(t)) out.category = "ST";
  else if (/\bews\b|economically weaker/.test(t)) out.category = "EWS";
  else if (/general|सामान्य/.test(t)) out.category = "GENERAL";

  const lakh = t.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac|लाख)/);
  if (lakh) out.annualHouseholdIncome = Math.round(parseFloat(lakh[1]) * 100000);
  else {
    const thou = t.match(/(\d{4,7})\s*(?:per year|a year|annual|sal|साल)/);
    if (thou) out.annualHouseholdIncome = parseInt(thou[1], 10);
  }

  const age = t.match(/\b(\d{1,3})\s*(?:years?|yrs?|saal|साल|उम्र|year-old|age)\b/);
  if (age) out.age = parseInt(age[1], 10);

  if (/\bbpl\b|below poverty|poor|गरीब|antyodaya|अंत्योदय/.test(t)) out.bpl = true;

  if (/daily wage|labour|labor|दिहाड़ी|मजदूर|landless/.test(t)) out.occupation = "landless_laborer";
  else if (/farmer|farm|khet|खेत|किसान|zameen|land/.test(t)) out.occupation = "small_farmer";
  else if (/vendor|domestic|self-employed|informal/.test(t)) out.occupation = "informal";

  const acre = t.match(/(\d+(?:\.\d+)?)\s*(?:acre|एकड़|bigha)/);
  if (acre) { out.landAcres = parseFloat(acre[1]); if (!out.occupation) out.occupation = "small_farmer"; }

  if (/disab|divyang|दिव्यांग|विकलांग|handicap/.test(t)) out.disability = "severe";

  if (/rajasthan|राजस्थान/.test(t)) out.state = "RAJASTHAN";
  else if (/bihar|बिहार/.test(t)) out.state = "BIHAR";

  if (/\bwoman\b|\bfemale\b|\bgirl\b|daughter|wife|mother|बेटी|महिला|लड़की|पत्नी|माँ/.test(t)) out.gender = "female";
  else if (/\bman\b|\bmale\b|\bson\b|husband|father|बेटा|पति|पिता/.test(t)) out.gender = "male";

  if (/widow|पति की मृत्यु|पति की मौत|विधवा/.test(t)) hh.isWidow = true;
  if (/pregnan|expecting|गर्भवती|बच्चा होने|maternity|baby/.test(t)) hh.isPregnantOrLactating = true;
  if (/school|college|पढ़|class \d|कक्षा|student|बच्चे.*स्कूल/.test(t)) hh.hasSchoolGoingChild = true;
  if (/kachha|kaccha|mud house|कच्चा|no house|no pucca/.test(t)) hh.lacksPuccaHouse = true;
  if (/no gas|no lpg|बिना गैस|चूल्ह|firewood|lakdi/.test(t)) hh.lacksLpg = true;
  if (/village|gaon|गाँव|gram|rural|देहात/.test(t)) hh.isRural = true;

  // documents
  const docs: NonNullable<ParsedProfile["documentsHave"]> = [];
  if (/aadhaar|aadhar|आधार/.test(t)) docs.push("aadhaar");
  if (/bank|खाता|jan dhan/.test(t)) docs.push("bank");
  if (/ration|राशन/.test(t)) docs.push("ration_bpl");
  if (/caste certificate|जाति प्रमाण/.test(t)) docs.push("caste");
  if (/income certificate|आय प्रमाण/.test(t)) docs.push("income");
  if (/domicile|निवास प्रमाण/.test(t)) docs.push("domicile");
  if (docs.length) out.documentsHave = docs;

  if (Object.keys(hh).length) out.household = hh;
  return out;
}

export async function parseProfileText(
  text: string
): Promise<{ parsed: ParsedProfile; source: "gemini" | "fallback" }> {
  const llm = await geminiCall(`${PARSE_SYSTEM}\n\nUSER TEXT:\n"""${text}"""`, {
    json: true,
    temperature: 0,
  });
  if (llm) {
    try {
      const cleaned = llm.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
      const parsed = JSON.parse(cleaned) as ParsedProfile;
      return { parsed, source: "gemini" };
    } catch {
      /* fall through */
    }
  }
  return { parsed: fallbackParse(text), source: "fallback" };
}

// ---- Explanation generation (explain-only, never decides) ----

const EXPLAIN_SYSTEM = `You are the explainer for ClaimKaro, speaking to a poor, possibly low-literacy Indian family who often don't know what help they're entitled to. A deterministic rules engine has ALREADY decided everything below. Your ONLY job is to restate it warmly, simply, and encouragingly.
HARD RULES:
- Do NOT change, add, or invent any scheme, number, verdict, or document. Only restate what is given.
- Keep the cautious framing: "you may be eligible" — never promise "you will get" or "you qualify".
- Use the actual situation details in the facts summary. Mention the person’s context (student, pregnancy, widow, age, income, documents, etc.) only if those details are present in the facts.
- Explain why the first benefits listed matter for this exact situation, instead of giving a generic template.
- Lead with hope: name the main benefits they may get, then the ONE or TWO documents that unlock the most.
- Use very simple words and short sentences (imagine explaining to someone who left school early). No jargon, no markdown headers.
- 4-7 sentences, then one line telling them they can get free help at their Gram Panchayat or a Common Service Centre (CSC), and to confirm there.`;

export async function explainAssessment(
  engineFacts: string,
  language: "en" | "hi"
): Promise<{ text: string; source: "gemini" | "fallback" }> {
  const langInstr =
    language === "hi"
      ? "Write the explanation in simple conversational Hindi (Devanagari)."
      : "Write the explanation in simple conversational English.";
  const llm = await geminiCall(`${EXPLAIN_SYSTEM}\n${langInstr}\n\nENGINE FACTS:\n${engineFacts}`, {
    temperature: 0.3,
  });
  if (llm) return { text: llm.trim(), source: "gemini" };
  return { text: "", source: "fallback" };
}

const CHAT_SYSTEM = `You are "ClaimKaro Sahayak" (ClaimKaro सहायक), a warm, empathetic, and friendly AI assistant for ClaimKaro.
Your target users are low-income, low-literacy, or rural Indian families who need help finding government benefits, checking documents, and tracking applications.

ClaimKaro features:
1. "Find benefits" (लाभ ढूँढें) under /schemes:
   - Users describe their situation in their own words in the "Situation Box" (स्थिति बॉक्स), or use the quick buttons (widow, disabled, rural, BPL, etc.).
   - Guide them to write key details in the situation box, such as: age, gender, state (Rajasthan or Bihar), annual income, occupation (e.g. daily wage worker, farmer), widow status, pregnant status, children in school, or documents they have.
   - A private rules engine runs on their device to check eligibility. AI only reads text and explains the result; it never decides eligibility.
2. "My documents" (मेरे दस्तावेज़) under /documents:
   - A private vault to add the documents they have.
   - The rejection audit catches errors (name mismatch, Aadhaar-bank seeding issues, dormant accounts, expired income certificates) that get applications rejected even after approval.
3. "Tracker" (ट्रैकर) under /tracker:
   - Tracks applications from "To start" -> "Applied" -> "Under verification" -> "Approved" -> "Money received".

Instructions:
- Keep your answers short and clear (2-4 sentences max).
- Encourage users to use the microphone button to speak their situation or questions.
- Remind them that their data is completely private, stored only in their browser (localStorage), and never uploaded.
- If the user asks a question not related to ClaimKaro, gently guide them back to how ClaimKaro can help them with welfare benefits.
- Provide step-by-step guidance on how to get started.`;

export async function chatWithAssistant(
  messages: { role: "user" | "model"; content: string }[],
  profileSummary?: string,
  language: "en" | "hi" = "hi"
): Promise<{ text: string; source: "gemini" | "fallback" }> {
  // Build a conversation prompt for geminiCall
  let prompt = CHAT_SYSTEM;
  if (language === "hi") {
    prompt += `\n\nLANGUAGE REQUIREMENT: You must speak in warm, simple, conversational Hindi (written in Devanagari script). Even if the user asks in English, reply in Hindi. Keep your language simple and easy to understand (avoid heavy Sanskritized or Urdu-heavy words; use common terms people use in daily life, like "दस्तावेज़/कागज़", "सरकारी योजना", "अस्वीकार", "मदद"). Keep sentences short.`;
  } else {
    prompt += `\n\nLANGUAGE REQUIREMENT: You must speak in warm, simple, conversational English. Even if the user asks in Hindi, reply in English. Keep your language simple and easy to understand for someone who left school early. Keep sentences short and clear.`;
  }

  if (profileSummary) {
    prompt += `\n\nCURRENT USER PROFILE FACTS (from rules engine): ${profileSummary}`;
  }
  prompt += `\n\nCONVERSATION HISTORY:`;
  for (const m of messages) {
    prompt += `\n${m.role === "user" ? "User" : "Assistant"}: ${m.content}`;
  }
  prompt += `\nAssistant:`;

  const llm = await geminiCall(prompt, {
    temperature: 0.4,
  });
  
  if (llm) return { text: llm.trim(), source: "gemini" };
  
  // Fallback if Gemini fails or is not configured
  const lastMsg = messages[messages.length - 1]?.content.toLowerCase() || "";
  let text = "";
  const isHi = language === "hi";

  if (/स्थिति|लिख|बॉक्स|story|box|write|describe|situation/i.test(lastMsg)) {
    text = isHi
      ? "स्थिति बॉक्स (Situation Box) में आप अपने बारे में सरल शब्दों में लिख सकते हैं। जैसे: 'मैं बिहार के एक गाँव में रहता हूँ, मेरी आयु 45 वर्ष है, मैं खेती करता हूँ और मेरे पास आधार कार्ड है।' आप बोलकर भी लिख सकते हैं!"
      : "In the Situation Box, you can describe yourself in simple words. For example: 'I live in a village in Bihar, I am 45 years old, I am a farmer, and I only have an Aadhaar card.' You can also speak to write!";
  } else if (/दस्तावेज़|कागज़|प्रमाण|audit|रिजेक्ट|अस्वीकार|reject|document|caste|income|bank|aadhaar/i.test(lastMsg)) {
    text = isHi
      ? "'मेरे दस्तावेज़' (My Documents) पेज पर आप अपने दस्तावेज़ जोड़ सकते हैं। वहाँ नाम बेमेल या आधार-बैंक लिंक न होने जैसी गलतियों की जाँच होती है, जिससे आपका फॉर्म रिजेक्ट होने से बच सके।"
      : "On the 'My Documents' page, you can add your documents. We will check for errors like name mismatches or missing Aadhaar-bank links to prevent rejection of your forms.";
  } else if (/ट्रैक|आवेदन|tracker|track|apply/i.test(lastMsg)) {
    text = isHi
      ? "'ट्रैकर' (Tracker) पेज पर आप अपने आवेदनों को सहेज सकते हैं और ट्रैक कर सकते हैं कि आवेदन किस चरण में है (जैसे: आवेदन किया, मंज़ूर हुआ, या पैसा मिल गया)।"
      : "On the 'Tracker' page, you can save and follow your applications step-by-step, from starting to money received.";
  } else if (/योजना|लाभ|फायदा|scheme|benefit/i.test(lastMsg)) {
    text = isHi
      ? "'लाभ ढूँढें' (Find Benefits) पेज पर जाकर आप कुछ आसान सवालों के जवाब देकर या अपनी स्थिति लिखकर जान सकते हैं कि आप किन सरकारी योजनाओं के हकदार हैं।"
      : "On the 'Find Benefits' page, you can answer a few simple questions or type your situation to find out which government schemes you are eligible for.";
  } else {
    text = isHi
      ? "नमस्ते! मैं ClaimKaro सहायक हूँ। आप मुझसे पूछ सकते हैं कि स्थिति बॉक्स में क्या लिखना है, दस्तावेज़ों की जाँच कैसे करनी है, या ट्रैकर का उपयोग कैसे करना है।"
      : "Hello! I am ClaimKaro Assistant. You can ask me how to use the situation box, check documents, or track your benefits.";
  }
  
  return { text, source: "fallback" };
}

// ---------------------------------------------------------------------------
// Snap & Listen — document vision scan.
// Reads a photo of a Ration Card / Caste Certificate and returns structured
// fields. Vision never decides eligibility — it only extracts what is printed
// on the page, and the deterministic engine keeps owning all verdicts.
// ---------------------------------------------------------------------------

export type ScanDocId = "ration_bpl" | "caste";
export interface ScanResult {
  docId: ScanDocId | null;
  nameOnDoc?: string;
  confidence: "high" | "medium" | "low";
  source: "gemini" | "fallback";
}

const SCAN_SYSTEM = `You read photos of Indian government welfare documents and extract key facts.
Look ONLY for these two document types:
- "ration_bpl" — Ration Card (राशन कार्ड / खाद्य सुरक्षा कार्ड), any Indian state, Hindi or English text
- "caste" — Caste Certificate (जाति प्रमाण पत्र / SC/ST/OBC certificate)

Return STRICT JSON only, no markdown:
{"docId": "ration_bpl" | "caste" | null, "nameOnDoc": "<holder name exactly as printed, or empty>", "confidence": "high" | "medium" | "low"}

Rules:
- docId null if the photo is unreadable, blurry, dark, or is neither of the two documents.
- nameOnDoc: transcribe the holder's name EXACTLY as printed (Hindi stays in Hindi). Empty string if unclear.
- confidence: "high" only if both document type AND name are clearly legible; "low" if anything is uncertain.
- Never invent data. If you cannot read something, say so via confidence, do not guess.`;

export async function scanDocument(
  base64: string,
  mimeType: string,
): Promise<ScanResult> {
  if (!geminiConfigured()) return { docId: null, confidence: "low", source: "fallback" };
  const text = await geminiCall(SCAN_SYSTEM, {
    json: true,
    temperature: 0,
    inlineData: { mimeType, data: base64 },
  });
  if (!text) return { docId: null, confidence: "low", source: "fallback" };
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      docId?: string | null;
      nameOnDoc?: string;
      confidence?: string;
    };
    const docId: ScanDocId | null =
      parsed.docId === "ration_bpl" || parsed.docId === "caste" ? parsed.docId : null;
    const confidence: ScanResult["confidence"] =
      parsed.confidence === "high" || parsed.confidence === "medium" ? parsed.confidence : "low";
    return {
      docId,
      nameOnDoc: parsed.nameOnDoc?.trim() || undefined,
      confidence,
      source: "gemini",
    };
  } catch {
    return { docId: null, confidence: "low", source: "fallback" };
  }
}

