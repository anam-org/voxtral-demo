import { NextResponse } from "next/server";

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || "";

const ALLOWED_VOICES = new Set([
  "en_paul_confident",
  "gb_oliver_cheerful",
  "gb_jane_confident",
  "fr_marie_happy",
  "gb_oliver_neutral",
  "gb_jane_curious",
]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const voice = searchParams.get("voice");

  if (!voice || !ALLOWED_VOICES.has(voice)) {
    return new NextResponse("Invalid voice", { status: 400 });
  }

  try {
    const res = await fetch("https://api.mistral.ai/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "voxtral-mini-tts-2603",
        input: "Hi there! I'm excited to chat with you today.",
        voice_id: voice,
        response_format: "mp3",
      }),
    });

    if (!res.ok) {
      return new NextResponse("TTS generation failed", { status: 502 });
    }

    const data = await res.json();
    const audioBytes = Buffer.from(data.audio_data, "base64");

    return new NextResponse(audioBytes, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return new NextResponse("TTS failed", { status: 500 });
  }
}
