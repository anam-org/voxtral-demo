import { NextResponse } from "next/server";

const ANAM_API_KEY = process.env.ANAM_API_KEY || "";
const ANAM_API_URL = "https://api.anam.ai";

const AVATAR_IDS = [
  "6cc28442-cccd-42a8-b6e4-24b7210a09c5", // Gabriel
  "ae2ea8c1-db28-47e3-b6ea-493e4ed3c554", // Layla
  "edf6fdcb-acab-44b8-b974-ded72665ee26", // Mia
  "960f614f-ea88-47c3-9883-f02094f70874", // Cara
];

export async function GET() {
  try {
    const avatars = await Promise.all(
      AVATAR_IDS.map(async (id) => {
        const res = await fetch(`${ANAM_API_URL}/v1/avatars/${id}`, {
          headers: { Authorization: `Bearer ${ANAM_API_KEY}` },
          next: { revalidate: 1800 }, // cache 30 min (video URLs expire in 1h)
        });
        if (!res.ok) return null;
        const data = await res.json();
        return {
          id: data.id,
          name: data.displayName,
          imageUrl: data.imageUrl,
          videoUrl: data.videoUrl,
        };
      })
    );

    return NextResponse.json(avatars.filter(Boolean));
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}
