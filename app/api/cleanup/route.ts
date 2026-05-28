import { NextRequest, NextResponse } from "next/server";
import { SignJWT, importPKCS8 } from "jose";

export const runtime = "edge";
export const dynamic = "force-dynamic";

async function getGoogleToken() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL!;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY!;
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) privateKey = privateKey.slice(1, -1);
  privateKey = privateKey.replace(/\\n/g, "\n");

  const alg = "RS256";
  const pkcs8 = await importPKCS8(privateKey, alg);
  const jwt = await new SignJWT({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  })
    .setProtectedHeader({ alg, typ: "JWT" })
    .sign(pkcs8);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const data = await res.json();
  return data.access_token;
}

export async function GET(req: NextRequest) {
  // 1. CEK KUNCI RAHASIA (Gembok Keamanan)
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Akses Ditolak!" }, { status: 401 });
  }

  const sheetId = process.env.SPREADSHEET_ID!;
  const token = await getGoogleToken();
  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

  // 2. AMBIL DATA LOBI
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Lobby!A:H`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return NextResponse.json({ error: "Gagal baca sheet" }, { status: 500 });

  const data = await res.json();
  const rows = data.values || [];

  const now = Date.now();
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  let deletedCount = 0;

  // 3. LAKUKAN RAZIA LOBI KADALUARSA
  for (let i = 1; i < rows.length; i++) {
    const [, , , creator, createdAt, status, lChannelId, lMessageId] = rows[i];

    if (status === "Aktif") {
      const createdTimeMs = Number(createdAt);
      if (isNaN(createdTimeMs)) continue;

      if (now - createdTimeMs > SIX_HOURS) {
        // Matikan status di Google Sheets
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Lobby!F${i + 1}?valueInputOption=USER_ENTERED`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ values: [["Tutup"]] }),
        });

        // Hapus pesannya di Discord secara brutal!
        if (lChannelId && lMessageId) {
          await fetch(`https://discord.com/api/v10/channels/${lChannelId}/messages/${lMessageId}`, {
            method: "DELETE",
            headers: { Authorization: `Bot ${BOT_TOKEN}` },
          });
        }
        deletedCount++;
      }
    }
  }

  return NextResponse.json({
    success: true,
    message: `Operasi pembersihan selesai. ${deletedCount} lobi usang telah dimusnahkan.`,
  });
}
