import { NextResponse } from "next/server";

export async function GET() {
  const APP_ID = process.env.DISCORD_APP_ID;
  const TOKEN = process.env.DISCORD_BOT_TOKEN;

  if (!APP_ID || !TOKEN) {
    return NextResponse.json({ error: "APP_ID atau TOKEN tidak ditemukan" }, { status: 500 });
  }

  const commands = [
    {
      name: "create-lobby",
      description: "Buat sesi lobi mabar Monster Hunter",
      options: [
        { name: "lobby_id", description: "ID Lobby di dalam game", type: 3, required: true },
        { name: "password", description: "Password Lobby (kosongkan jika tidak ada)", type: 3, required: false },
        { name: "catatan", description: "Contoh: UP Master Rank, Quest Event, Farming, dll.", type: 3, required: false }, // OPSI BARU
      ],
    },
    { name: "close-lobby", description: "Tutup sesi lobi aktif yang kamu buat sebelumnya" },
    { name: "info-lobby", description: "Lihat info sesi lobi mabar yang sedang aktif saat ini" },
    { name: "submit-build", description: "Buka form untuk menyumbang build senjata" },
    { name: "builder", description: "Dapatkan link website GameCat Armorset Builder" },
    {
      name: "build-info",
      description: "Cari dan lihat rekomendasi build senjata dari database Kamura",
      options: [
        {
          name: "keyword",
          description: "Cari nama senjata (misal: Long Sword) atau nama build. Kosongkan untuk lihat semua.",
          type: 3,
          required: false,
        },
      ],
    },
    {
      name: "list-build",
      description: "Dapatkan link website untuk melihat semua koleksi build dari server kita!",
    },
    {
      name: "share-live",
      description: "Promosikan live stream kamu ke seluruh server!",
      options: [
        {
          name: "platform",
          description: "Pilih platform tempat kamu live",
          type: 3,
          required: true,
          choices: [
            { name: "TikTok", value: "tiktok" },
            { name: "Twitch", value: "twitch" },
            { name: "YouTube", value: "youtube" },
          ],
        },
        {
          name: "username",
          description: "Username channel/akun kamu (tanpa tanda @)",
          type: 3,
          required: true,
        },
        {
          name: "pesan",
          description: 'Pesan tambahan (misal: "Ayo mabar Quest Event!")',
          type: 3,
          required: false,
        },
      ],
    },
  ];

  const response = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/commands`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bot ${TOKEN}` },
    body: JSON.stringify(commands),
  });

  if (response.ok) {
    return NextResponse.json({ success: true, message: "Slash Commands updated successfully!" });
  } else {
    return NextResponse.json({ success: false, error: await response.text() }, { status: 500 });
  }
}
