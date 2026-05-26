import { NextResponse } from "next/server";

export async function GET() {
  const APP_ID = process.env.DISCORD_APP_ID;
  const TOKEN = process.env.DISCORD_BOT_TOKEN;

  if (!APP_ID || !TOKEN) {
    return NextResponse.json({ error: "APP_ID atau TOKEN tidak ditemukan di .env" }, { status: 500 });
  }

  // 1. Definisikan daftar Slash Commands
  const commands = [
    {
      name: "create-lobby",
      description: "Buat sesi lobi mabar Monster Hunter",
      options: [
        {
          name: "lobby_id",
          description: "ID Lobby di dalam game",
          type: 3, // Tipe 3 artinya input teks (STRING)
          required: true,
        },
        {
          name: "password",
          description: "Password Lobby (kosongkan jika tidak ada)",
          type: 3,
          required: false,
        },
      ],
    },
    {
      name: "submit-build",
      description: "Buka form untuk menyumbang build senjata",
    },
  ];

  // 2. Kirim data (PUT Request) ke API Discord
  const response = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/commands`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bot ${TOKEN}`,
    },
    body: JSON.stringify(commands),
  });

  // 3. Cek apakah berhasil
  if (response.ok) {
    return NextResponse.json({
      success: true,
      message: "Slash Commands berhasil didaftarkan ke Discord!",
    });
  } else {
    const errorData = await response.text();
    return NextResponse.json(
      {
        success: false,
        error: errorData,
      },
      { status: 500 },
    );
  }
}
