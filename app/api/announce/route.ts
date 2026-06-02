import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  // Keamanan Ekstra: Cek tiket login (Cookie)
  const isLoggedIn = req.cookies.has("kamura_auth");
  if (!isLoggedIn) {
    return NextResponse.json({ success: false, error: "Akses Ditolak!" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { channelId, title, content, color } = body;
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

    if (!channelId || !title || !content) {
      return NextResponse.json({ success: false, error: "Data form belum lengkap!" }, { status: 400 });
    }

    // Mengubah warna Hex (#00ff00) ke format Decimal Discord
    let embedColor = 0x00aaff; // Default biru muda
    if (color) {
      const cleanColor = color.replace("#", "");
      const parsedColor = parseInt(cleanColor, 16);
      if (!isNaN(parsedColor)) embedColor = parsedColor;
    }

    const payload = {
      embeds: [
        {
          title: title,
          description: content,
          color: embedColor,
          timestamp: new Date().toISOString(),
          footer: { text: "📢 Pengumuman Resmi Kamura" },
        },
      ],
    };

    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${BOT_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || "Gagal mengirim ke Discord. Pastikan ID Channel benar.");
    }

    return NextResponse.json({ success: true, message: "Pengumuman berhasil disiarkan!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
