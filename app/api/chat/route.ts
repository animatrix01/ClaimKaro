import { NextResponse } from "next/server";
import { chatWithAssistant, geminiConfigured } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { messages, profileSummary, language } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages array required" }, { status: 400 });
    }
    const lang = language === "en" ? "en" : "hi";
    const { text, source } = await chatWithAssistant(messages, profileSummary, lang);
    return NextResponse.json({ text, source, geminiConfigured: geminiConfigured() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
