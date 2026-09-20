import { NextResponse } from "next/server";
import { explainAssessment, geminiConfigured } from "@/lib/gemini";

export const runtime = "nodejs";

// Privacy note: the rules engine runs on the user's device. This endpoint only
// receives a short, de-identified FACTS summary (scheme verdicts + the fixes) —
// never document numbers, names, or the raw profile — and asks the LLM to
// restate it kindly. The caller sends it only with the user's consent.
export async function POST(req: Request) {
  try {
    const { facts, language } = await req.json();
    if (typeof facts !== "string" || !facts.trim()) {
      return NextResponse.json({ error: "facts required" }, { status: 400 });
    }
    const lang = language === "hi" ? "hi" : "en";
    const { text, source } = await explainAssessment(facts.slice(0, 6000), lang);
    return NextResponse.json({ text, source, geminiConfigured: geminiConfigured() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
