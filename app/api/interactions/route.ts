import { verifyKey } from "discord-interactions";
import { NextRequest, NextResponse } from "next/server";
import { handleCommands, handleModals, handleComponents } from "../../../handlers/discord"; // GANTI path ini sesuai lokasi file handlers/discord.ts yang kamu buat

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
  const APPROVAL_CHANNEL_ID = process.env.APPROVAL_CHANNEL_ID;

  if (!PUBLIC_KEY) return NextResponse.json({ error: "Missing Public Key" }, { status: 401 });
  if (!BOT_TOKEN || !APPROVAL_CHANNEL_ID) return NextResponse.json({ error: "Config Error" }, { status: 500 });

  // 1. Validasi Keamanan (Wajib dari Discord)
  const signature = req.headers.get("x-signature-ed25519") || "";
  const timestamp = req.headers.get("x-signature-timestamp") || "";
  if (!signature || !timestamp) return NextResponse.json({ error: "Missing headers" }, { status: 401 });

  let rawBody = "";
  try {
    rawBody = await req.text();
    const isValidRequest = await verifyKey(rawBody, signature, timestamp, PUBLIC_KEY);
    if (!isValidRequest) {
      return NextResponse.json({ error: "Bad signature" }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Validation Exception" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);

  // 2. PING dari Discord
  if (body.type === 1) return NextResponse.json({ type: 1 });

  // 3. Routing (Pembagian Tugas)
  if (body.type === 2) {
    // Tipe 2: Slash Commands
    return await handleCommands(body);
  } else if (body.type === 5) {
    // Tipe 5: Modal Submissions
    return await handleModals(body);
  } else if (body.type === 3) {
    // Tipe 3: Component/Button Interactions
    return await handleComponents(body);
  }

  // Fallback jika tidak dikenali
  return NextResponse.json({ error: "Unknown interaction type" }, { status: 400 });
}
