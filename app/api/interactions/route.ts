import { verifyKey } from "discord-interactions";
import { NextRequest } from "next/server";
import { SignJWT, importPKCS8 } from "jose";

export const runtime = "edge";

function getModalValue(body: any, customId: string): string {
  const components = body.data?.components || [];
  for (const row of components) {
    const component = row.components?.find((c: any) => c.custom_id === customId);
    if (component) return component.value;
  }
  return "";
}

// ==========================================
// --- HELPER: OTENTIKASI & GOOGLE SHEETS ---
// ==========================================
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

async function appendToSheet(tabName: string, values: string[]) {
  const sheetId = process.env.SPREADSHEET_ID!;
  const token = await getGoogleToken();
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${tabName}!A1:append?valueInputOption=USER_ENTERED`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: [values] }),
  });
}

async function getSheetData(tabName: string) {
  const sheetId = process.env.SPREADSHEET_ID!;
  const token = await getGoogleToken();
  // Mengambil kolom A sampai H untuk data lobi lengkap
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${tabName}!A:H`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.values || [];
}

async function updateLobbyStatus(rowIndex: number, status: string) {
  const sheetId = process.env.SPREADSHEET_ID!;
  const token = await getGoogleToken();
  // Di format baru, Kolom Status bergeser ke Kolom F
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Lobby!F${rowIndex + 1}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: [[status]] }),
  });
}
// ==========================================

export async function POST(req: NextRequest) {
  const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
  const APPROVAL_CHANNEL_ID = process.env.APPROVAL_CHANNEL_ID;

  // PENGAMAN 1: Discord selalu meminta balasan 401 (bukan 500) jika ada masalah dengan sistem keamanan
  if (!PUBLIC_KEY) return new Response("Missing Public Key", { status: 401 });

  const signature = req.headers.get("x-signature-ed25519") || "";
  const timestamp = req.headers.get("x-signature-timestamp") || "";

  if (!signature || !timestamp) {
    return new Response("Missing signature headers", { status: 401 });
  }

  let rawBody = "";
  try {
    rawBody = await req.text();
    // PENGAMAN 2: Proses validasi utama
    const isValidRequest = verifyKey(rawBody, signature, timestamp, PUBLIC_KEY);
    if (!isValidRequest) {
      return new Response("Bad signature", { status: 401 });
    }
  } catch (error) {
    // PENGAMAN 3: Jika Discord sengaja mengirim payload rusak yang membuat sistem error,
    // tangkap error-nya di sini dan tetap kembalikan 401!
    return new Response("Validation Exception", { status: 401 });
  }

  // Jika kode berhasil lewat dari sini, berarti request 100% aman dan valid dari Discord asli
  if (!BOT_TOKEN || !APPROVAL_CHANNEL_ID) {
    return new Response("Internal Configuration Error", { status: 500 });
  }

  const body = JSON.parse(rawBody);

  if (body.type === 1) return new Response(JSON.stringify({ type: 1 }), { status: 200, headers: { "Content-Type": "application/json" } });

  if (body.type === 2) {
    const commandName = body.data.name;
    const username = body.member?.user?.username || "Hunter";
    const channelId = body.channel_id;

    if (commandName === "builder") {
      return new Response(
        JSON.stringify({
          type: 4,
          data: {
            embeds: [
              {
                title: "🛠️ GameCat Armorset Builder",
                description: "Gunakan website ini untuk merakit armor tanpa batas dan mendapatkan kode **Encoding**-nya.\n\n🔗 **[Klik di sini untuk buka GameCat](https://gamecat.fun/e/#xxxxxs2OxYuux)**",
                color: 0x00aaff,
              },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (commandName === "submit-build") {
      return new Response(
        JSON.stringify({
          type: 9,
          data: {
            custom_id: "modal_submit_build",
            title: "Submit Build via Encoding",
            components: [
              { type: 1, components: [{ type: 4, custom_id: "build_name", label: "Nama Build", style: 1, required: true }] },
              { type: 1, components: [{ type: 4, custom_id: "weapon", label: "Jenis Senjata", style: 1, required: true, placeholder: "Contoh: Long Sword" }] },
              {
                type: 1,
                components: [{ type: 4, custom_id: "encoding", label: "Build Encoding (Paste di sini)", style: 2, required: true, placeholder: "Buka https://gamecat.fun/e/#xxxxxs2OxYuux lalu copy-paste kode Export-nya ke sini." }],
              },
              { type: 1, components: [{ type: 4, custom_id: "notes", label: "Catatan (Opsional)", style: 2, required: false }] },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // A. LOGIKA UTAMA BARU: /create-lobby
    if (commandName === "create-lobby") {
      const options = body.data.options || [];
      const lobbyId = options.find((opt: any) => opt.name === "lobby_id")?.value || "-";
      const password = options.find((opt: any) => opt.name === "password")?.value || "Open (Tanpa Password)";
      const catatan = options.find((opt: any) => opt.name === "catatan")?.value || "-";
      const currentTime = new Date().toISOString();

      // Atur tag sebutan role hunter
      const mentionTarget = process.env.HUNTER_ROLE_ID ? `<@&${process.env.HUNTER_ROLE_ID}>` : "@here";

      // Merakit payload pengumuman publik
      const publicPayload = {
        content: `📢 ${mentionTarget} Bersiap! Ada sesi mabar baru dibuka!`,
        embeds: [
          {
            title: "⚔️ Sesi Lobi Monster Hunter Aktif!",
            description: `Lobi baru saja dibuat oleh **@${username}**. Yuk merapat!`,
            color: 0x00ff00,
            fields: [
              { name: "Lobby ID", value: `\`${lobbyId}\``, inline: true },
              { name: "Password", value: `\`${password}\``, inline: true },
              { name: "Catatan Sesi", value: catatan, inline: false },
            ],
            footer: { text: "Sesi ini akan otomatis ditutup dalam 6 jam. Gunakan /close-lobby jika sudah selesai." },
            timestamp: currentTime,
          },
        ],
      };

      // Tembak pesan publik ke channel lewat jalur API belakang
      const msgRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bot ${BOT_TOKEN}` },
        body: JSON.stringify(publicPayload),
      });

      let messageId = "";
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        messageId = msgData.id; // TANGKAP ID PESAN NYA!
      }

      // Simpan seluruh data lengkap ke baris Google Sheets
      await appendToSheet("Lobby", [lobbyId, password, catatan, username, currentTime, "Aktif", channelId, messageId]);

      // Kirim balasan ephemeral instan ke si pembuat agar tidak mengotori chat publik
      return new Response(
        JSON.stringify({
          type: 4,
          data: { flags: 64, content: `✅ Lobi berhasil dibuat dan pengumuman telah dikirim ke channel!` },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // B. LOGIKA UTAMA BARU: /info-lobby (Menjadi EPHEMERAL)
    if (commandName === "info-lobby") {
      const rows = await getSheetData("Lobby");
      const activeFields: any[] = [];
      const now = Date.now();
      const SIX_HOURS = 6 * 60 * 60 * 1000;

      for (let i = 1; i < rows.length; i++) {
        const [lobbyId, password, catatan, creator, createdAt, status, lChannelId, lMessageId] = rows[i];

        if (status === "Aktif") {
          const createdTimeMs = Date.parse(createdAt);

          if (now - createdTimeMs > SIX_HOURS) {
            // Auto-Close 6 Jam: Ubah status di Sheets
            await updateLobbyStatus(i, "Tutup");
            // SEKALIGUS HAPUS PESAN NYA DI DISCORD!
            if (lChannelId && lMessageId) {
              await fetch(`https://discord.com/api/v10/channels/${lChannelId}/messages/${lMessageId}`, {
                method: "DELETE",
                headers: { Authorization: `Bot ${BOT_TOKEN}` },
              });
            }
          } else {
            activeFields.push({
              name: `🔹 Lobi @${creator}`,
              value: `**ID:** \`${lobbyId}\` | **PW:** \`${password}\` ${catatan !== "-" ? `\n*Catatan:* ${catatan}` : ""}`,
              inline: false,
            });
          }
        }
      }

      const embed = {
        title: "📡 Daftar Sesi Lobi Mabar Aktif",
        color: activeFields.length > 0 ? 0x00ffff : 0xff0000,
        description: activeFields.length > 0 ? "Berikut adalah lobi mabar yang sedang membuka lowongan slot Hunter:" : "❌ Tidak ada sesi lobi yang aktif saat ini. Silakan buat lobi baru menggunakan perintah `/create-lobby`!",
        fields: activeFields,
        timestamp: new Date().toISOString(),
      };

      return new Response(
        JSON.stringify({
          type: 4,
          data: {
            flags: 64, // DIUBAH JADI EPHEMERAL (Hanya bisa dilihat oleh pengirim command)
            embeds: [embed],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // C. LOGIKA UTAMA BARU: /close-lobby (HAPUS PESAN PENGUMUMAN)
    if (commandName === "close-lobby") {
      const rows = await getSheetData("Lobby");
      let foundIndex = -1;
      let targetChannelId = "";
      let targetMessageId = "";

      for (let i = 1; i < rows.length; i++) {
        const [, , , creator, , status, lChannelId, lMessageId] = rows[i];
        if (creator === username && status === "Aktif") {
          foundIndex = i;
          targetChannelId = lChannelId;
          targetMessageId = lMessageId;
          break;
        }
      }

      if (foundIndex !== -1) {
        // 1. Matikan statusnya di Sheets
        await updateLobbyStatus(foundIndex, "Tutup");

        // 2. JALUR PENGHAPUSAN: Perintahkan bot menghapus pesan lobi lama di discord agar clean
        // 2. JALUR PENGHAPUSAN: Perintahkan bot menghapus pesan lobi lama di discord agar clean
        if (targetChannelId && targetMessageId) {
          await fetch(`https://discord.com/api/v10/channels/${targetChannelId}/messages/${targetMessageId}`, {
            method: "DELETE",
            headers: { Authorization: `Bot ${BOT_TOKEN}` },
          });
        }

        // SEKARANG DIUBAH JADI EPHEMERAL (HANYA BISA DILIHAT OLEH USER YANG MENUTUP)
        return new Response(
          JSON.stringify({
            type: 4,
            data: {
              flags: 64, // Baris ajaib ini yang bikin pesan jadi privat
              content: "✅ Sesi lobi kamu ditutup, dan pesan pengumuman telah dihapus dari channel!",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      } else {
        return new Response(
          JSON.stringify({
            type: 4,
            data: { flags: 64, content: "⚠️ Kamu tidak memiliki sesi lobi aktif yang terdaftar di sistem." },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
    }
  }

  // --- LOGIKA FORM BUILD & TOMBOL APPROVE (Tetap sama seperti versi encoding sebelumnya) ---
  if (body.type === 5) {
    if (body.data.custom_id === "modal_submit_build") {
      const username = body.member?.user?.username || "Hunter";
      const buildName = getModalValue(body, "build_name");
      const weapon = getModalValue(body, "weapon");
      const encoding = getModalValue(body, "encoding");
      const notes = getModalValue(body, "notes") || "-";

      const discordPayload = {
        embeds: [
          {
            title: `📝 [PENDING APPROVAL] Build Baru`,
            color: 0xffaa00,
            fields: [
              { name: "Nama Build", value: buildName },
              { name: "Senjata", value: weapon },
              { name: "Encoding", value: `\`${encoding}\`` },
              { name: "Catatan", value: notes },
            ],
            footer: { text: `Creator: ${username}` },
            timestamp: new Date().toISOString(),
          },
        ],
        components: [
          {
            type: 1,
            components: [
              { type: 2, style: 3, label: "Approve", custom_id: "approve_build" },
              { type: 2, style: 4, label: "Reject", custom_id: "reject_build" },
            ],
          },
        ],
      };

      await fetch(`https://discord.com/api/v10/channels/${APPROVAL_CHANNEL_ID}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bot ${BOT_TOKEN}` },
        body: JSON.stringify(discordPayload),
      });

      return new Response(
        JSON.stringify({
          type: 4,
          data: { flags: 64, content: "✅ Build berhasil dikirim. Gunakan /builder jika butuh link GameCat lagi." },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  if (body.type === 3) {
    const customId = body.data.custom_id;
    const message = body.message;
    const embed = message.embeds[0];

    if (customId === "approve_build" || customId === "reject_build") {
      const isApproved = customId === "approve_build";
      const creator = embed.footer?.text.replace("Creator: ", "") || "Unknown";

      try {
        if (isApproved) {
          const buildName = embed.fields[0].value;
          const weapon = embed.fields[1].value;
          const encoding = embed.fields[2].value.replace(/`/g, "").trim();
          const notes = embed.fields[3].value;
          await appendToSheet("Sheet1", [buildName, weapon, encoding, notes, creator]);
        }

        return new Response(
          JSON.stringify({
            type: 7,
            data: {
              embeds: [{ ...embed, title: isApproved ? `✅ [APPROVED] Build dari ${creator}` : `❌ [REJECTED] Build dari ${creator}`, color: isApproved ? 0x00ff00 : 0xff0000 }],
              components: [],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      } catch (error: any) {
        return new Response(
          JSON.stringify({
            type: 7,
            data: { embeds: [{ ...embed, title: `💥 Gagal Memproses Tombol`, description: `**Eror:**\n\`${error.message || error}\``, color: 0x990000 }] },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
    }
  }

  return new Response("Unknown interaction type", { status: 400 });
}
