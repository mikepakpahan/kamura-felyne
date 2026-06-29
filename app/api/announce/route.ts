import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const isLoggedIn = req.cookies.has("kamura_auth");
  if (!isLoggedIn) {
    return NextResponse.json({ success: false, error: "Akses Ditolak!" }, { status: 401 });
  }

  try {
    const body = await req.json();
    // Kita tangkap variabel baru: useEmbed dan outerMessage
    const { channelId, useEmbed, outerMessage, title, content, color } = body;
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

    if (!channelId || !content) {
      return NextResponse.json({ success: false, error: "Channel ID dan Isi Pesan wajib diisi!" }, { status: 400 });
    }

    let payload: any = {};

    if (useEmbed) {
      // ==== MODE EMBED ====
      if (!title) {
        return NextResponse.json({ success: false, error: "Judul wajib diisi jika menggunakan format Embed!" }, { status: 400 });
      }

      let embedColor = 0x00aaff;
      if (color) {
        const cleanColor = color.replace("#", "");
        const parsedColor = parseInt(cleanColor, 16);
        if (!isNaN(parsedColor)) embedColor = parsedColor;
      }

      payload = {
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

      // Teks luar (bisa berisi mention, sapaan, dll)
      if (outerMessage) {
        payload.content = outerMessage;
      }
    } else {
      // ==== MODE PESAN BIASA ====
      // Kalau non-embed, kita cuma kirim teks murni. User bisa ngetag mention langsung di dalam textareanya.
      payload = {
        content: content,
      };
    }

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
