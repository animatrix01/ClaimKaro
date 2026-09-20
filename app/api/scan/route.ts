import { NextResponse } from "next/server";
import { scanDocument, geminiConfigured } from "@/lib/gemini";

export const runtime = "nodejs";

// Snap & Listen: accepts a base64 image of a Ration Card / Caste Certificate
// photo and returns structured extraction. The image is processed in-memory
// and NEVER persisted server-side.
export async function POST(req: Request) {
  try {
    const { image, mimeType } = (await req.json()) as {
      image?: string;
      mimeType?: string;
    };
    if (!image || !image.trim()) {
      return NextResponse.json({ error: "Missing image" }, { status: 400 });
    }
    // Reject oversized payloads early (base64 of an 8MB binary ~ 10.7MB text).
    if (image.length > 10_500_000) {
      return NextResponse.json({ error: "Image too large (max ~8MB)" }, { status: 413 });
    }
    const safeMime =
      mimeType && /^(image\/(jpeg|png|webp|heic|heif))$/i.test(mimeType) ? mimeType : "image/jpeg";

    const result = await scanDocument(image, safeMime);
    return NextResponse.json({ ...result, geminiConfigured: geminiConfigured() });
  } catch (err) {
    console.error("[scan] failed:", (err as Error).message);
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}
