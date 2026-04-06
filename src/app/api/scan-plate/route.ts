import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    // Auth check: verify Supabase session
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "OCR service not configured" }, { status: 503 });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data,
        },
      },
      {
        text: `You are an expert Bangladeshi vehicle number plate reader. 
Extract the EXACT text from this vehicle number plate photo.

CRITICAL RULES:
1. MUST output ONLY in Bengali (Bangla) script and Bengali numerals (১, ২, ৩, ৪, ৫, ৬, ৭, ৮, ৯, ০).
2. DO NOT translate or transliterate into English. (e.g., Do NOT write "mymensign", you MUST write "ময়মনসিংহ").
3. Format example: "ময়মনসিংহ-ল ১২-৯৮৪৪"
4. Return ONLY the plate text, absolutely nothing else.
5. If the plate is completely unreadable, respond with: UNREADABLE`,
      },
    ]);

    const plateText = result.response.text().trim();

    if (plateText === "UNREADABLE" || plateText.length < 3) {
      return NextResponse.json({ plate: null, error: "Could not read plate" });
    }

    return NextResponse.json({ plate: plateText });
  } catch (e) {
    console.error("Plate scan error:", e);
    return NextResponse.json({ error: "Scan failed" }, { status: 500 });
  }
}