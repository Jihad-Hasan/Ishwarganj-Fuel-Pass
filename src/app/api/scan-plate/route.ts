import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Remove data URL prefix to get raw base64
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
        text: `You are a Bangladeshi vehicle number plate reader.
Extract the EXACT text from this vehicle number plate photo.

Bangladesh plates use Bangla script. Example format: ঢাকা মেট্রো-গ ৫০-০২০৩

Rules:
- Return ONLY the plate text, nothing else
- Keep the original Bangla script (do NOT transliterate to English)
- Include the city name, class letter, and numbers exactly as shown
- Use hyphens (-) between parts as they appear on the plate
- If you cannot read the plate clearly, respond with: UNREADABLE`,
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
