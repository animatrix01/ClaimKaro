import { NextResponse } from "next/server";
import { parseProfileText } from "@/lib/gemini";

export const runtime = "nodejs";

// NLP intake: free text -> structured profile fields (the user then confirms).
export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "text required" }, { status: 400 });
    }
    const { parsed, source } = await parseProfileText(text.slice(0, 4000));
    return NextResponse.json({ parsed, source });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
