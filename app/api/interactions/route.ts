import { verifyKey } from "discord-interactions";
import { NextRequest, NextResponse } from "next/server";
import { SignJWT, importPKCS8 } from "jose";

export const runtime = "edge";
export const dynamic = "force-dynamic";

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

  if (!PUBLIC_KEY) return NextResponse.json({ error: "Missing Public Key" }, { status: 401 });

  const signature = req.headers.get("x-signature-ed25519") || "";
  const timestamp = req.headers.get("x-signature-timestamp") || "";
  if (!signature || !timestamp) return NextResponse.json({ error: "Missing headers" }, { status: 401 });

  let rawBody = "";
  try {
    rawBody = await req.text();
    // Berhasil menggunakan perbaikan kode milikmu (ditambahkan await)
    const isValidRequest = await verifyKey(rawBody, signature, timestamp, PUBLIC_KEY);
    if (!isValidRequest) {
      return NextResponse.json({ error: "Bad signature" }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Validation Exception" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);

  if (body.type === 1) return NextResponse.json({ type: 1 });

  if (!BOT_TOKEN || !APPROVAL_CHANNEL_ID) return NextResponse.json({ error: "Config Error" }, { status: 500 });

  if (body.type === 2) {
    const commandName = body.data.name;
    const username = body.member?.user?.username || "Hunter";
    const channelId = body.channel_id;

    if (commandName === "builder") {
      return NextResponse.json({
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
      });
    }

    if (commandName === "submit-build") {
      return NextResponse.json({
        type: 9,
        data: {
          custom_id: "modal_submit_build",
          title: "Submit Build via Encoding",
          components: [
            { type: 1, components: [{ type: 4, custom_id: "build_name", label: "Nama Build", style: 1, required: true }] },
            { type: 1, components: [{ type: 4, custom_id: "weapon", label: "Jenis Senjata", style: 1, required: true, placeholder: "Contoh: Long Sword" }] },
            { type: 1, components: [{ type: 4, custom_id: "encoding", label: "Build Encoding (Paste di sini)", style: 2, required: true, placeholder: "Buka https://gamecat.fun/e/#xxxxxs2OxYuux lalu copy-paste kode Export-nya ke sini." }] },
            { type: 1, components: [{ type: 4, custom_id: "notes", label: "Catatan (Opsional)", style: 2, required: false }] },
          ],
        },
      });
    }

    if (commandName === "create-lobby") {
      const rows = await getSheetData("Lobby");
      let hasActiveLobby = false;

      for (let i = 1; i < rows.length; i++) {
        const [, , , creator, , status] = rows[i];
        if (creator === username && status === "Aktif") {
          hasActiveLobby = true;
          break;
        }
      }

      if (hasActiveLobby) {
        return NextResponse.json({
          type: 4,
          data: { flags: 64, content: "⚠️ **Gagal:** Kamu masih memiliki sesi lobi mabar yang sedang aktif! Silakan tutup lobi sebelumnya dengan `/close-lobby` sebelum membuat yang baru." },
        });
      }

      const options = body.data.options || [];
      const lobbyId = options.find((opt: any) => opt.name === "lobby_id")?.value || "-";
      const password = options.find((opt: any) => opt.name === "password")?.value || "Open (Tanpa Password)";
      const catatan = options.find((opt: any) => opt.name === "catatan")?.value || "-";

      // AKSI PERBAIKAN:
      const rawTimestampString = Date.now().toString(); // Angka mentah milidetik dikonversi ke string untuk disimpan ke Sheets
      const displayTimeISO = new Date().toISOString(); // Tetap pakai ISO murni khusus untuk tampilan estetik footer Discord

      const mentionTarget = process.env.HUNTER_ROLE_ID ? `<@&${process.env.HUNTER_ROLE_ID}>` : "@here";

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
            timestamp: displayTimeISO,
          },
        ],
      };

      const msgRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bot ${BOT_TOKEN}` },
        body: JSON.stringify(publicPayload),
      });

      let messageId = "";
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        messageId = msgData.id;
      }

      // Menyimpan nilai mentah angka milidetik (rawTimestampString) ke kolom waktu di Sheets
      await appendToSheet("Lobby", [lobbyId, password, catatan, username, rawTimestampString, "Aktif", channelId, messageId]);

      return NextResponse.json({
        type: 4,
        data: { flags: 64, content: `✅ Lobi berhasil dibuat dan pengumuman telah dikirim ke channel!` },
      });
    }

    if (commandName === "info-lobby") {
      const rows = await getSheetData("Lobby");
      const activeFields: any[] = [];
      const now = Date.now();
      const SIX_HOURS = 6 * 60 * 60 * 1000;

      for (let i = 1; i < rows.length; i++) {
        const [lobbyId, password, catatan, creator, createdAt, status, lChannelId, lMessageId] = rows[i];

        if (status === "Aktif") {
          // AKSI PERBAIKAN: Mengonversi langsung string angka milidetik dari Sheets ke tipe data Number
          const createdTimeMs = Number(createdAt);

          // Mencegah error pembacaan data baris teks yang rusak/bukan angka
          if (isNaN(createdTimeMs)) continue;

          if (now - createdTimeMs > SIX_HOURS) {
            await updateLobbyStatus(i, "Tutup");
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

      return NextResponse.json({
        type: 4,
        data: { flags: 64, embeds: [embed] },
      });
    }

    if (commandName === "build-info") {
      const options = body.data.options || [];
      const keyword = options.find((opt: any) => opt.name === "keyword")?.value?.toLowerCase() || "";

      // Mengambil data dari Sheet1 (tempat build disimpan)
      const rows = await getSheetData("Sheet1");
      const results: any[] = [];

      // Loop dari baris 1 (melewati header) ke bawah
      for (let i = 1; i < rows.length; i++) {
        const [buildName, weapon, encoding, notes, creator] = rows[i];

        // Pencarian cerdas (case-insensitive) pada Nama Build atau Jenis Senjata
        const matchBuild = buildName?.toLowerCase().includes(keyword);
        const matchWeapon = weapon?.toLowerCase().includes(keyword);

        // Jika keyword kosong, tampilkan semua. Jika ada keyword, cek kecocokan.
        if (!keyword || matchBuild || matchWeapon) {
          results.push({ buildName, weapon, encoding, notes, creator });
        }
      }

      // Jika tidak ada yang cocok
      if (results.length === 0) {
        return NextResponse.json({
          type: 4,
          data: {
            flags: 64, // Ephemeral
            content: `❌ Tidak ditemukan build dengan kata kunci **"${keyword}"**. Coba gunakan nama senjata atau sebutan lain.`,
          },
        });
      }

      // Membalik urutan array agar build terbaru (paling bawah di Sheets) muncul duluan
      results.reverse();

      // Membatasi hasil maksimal 5 agar pesan Discord tidak terlalu panjang dan error
      const maxDisplay = 5;
      const displayResults = results.slice(0, maxDisplay);

      const fields = displayResults.map((b) => ({
        name: `🔹 ${b.buildName} (${b.weapon})`,
        value: `**Creator:** @${b.creator}\n**Encoding:** \`${b.encoding}\`\n*Catatan:* ${b.notes !== "-" ? b.notes : "Tidak ada catatan."}`,
        inline: false,
      }));

      const hiddenCount = results.length - maxDisplay;

      const embed = {
        title: "🛡️ Database Build Kamura",
        description: keyword
          ? `Hasil pencarian untuk: **${keyword}**\n🔗 *Copy kode Encoding di bawah dan paste di menu Import pada [GameCat Builder](https://gamecat.fun/e/#xxxxxs2OxYuux).*`
          : `Menampilkan daftar build terbaru.\n🔗 *Copy kode Encoding di bawah dan paste di menu Import pada [GameCat Builder](https://gamecat.fun/e/#xxxxxs2OxYuux).*`,
        color: 0x00aaff,
        fields: fields,
        footer: {
          text: hiddenCount > 0 ? `Ada +${hiddenCount} build lain disembunyikan. Gunakan /build-info dengan keyword lebih spesifik.` : "Sistem Database Kamura Felyne",
        },
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json({
        type: 4,
        data: {
          // Sengaja DIBUAT PUBLIK agar member lain bisa ikut melihat hasil pencarian build
          embeds: [embed],
        },
      });
    }

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
        await updateLobbyStatus(foundIndex, "Tutup");

        if (targetChannelId && targetMessageId) {
          await fetch(`https://discord.com/api/v10/channels/${targetChannelId}/messages/${targetMessageId}`, {
            method: "DELETE",
            headers: { Authorization: `Bot ${BOT_TOKEN}` },
          });
        }

        return NextResponse.json({
          type: 4,
          data: { flags: 64, content: "✅ Sesi lobi kamu ditutup, dan pesan pengumuman telah dihapus dari channel!" },
        });
      } else {
        return NextResponse.json({
          type: 4,
          data: { flags: 64, content: "⚠️ Kamu tidak memiliki sesi lobi aktif yang terdaftar di sistem." },
        });
      }
    }
    if (commandName === "list-build") {
      // Ganti dengan URL Vercel kamu yang asli
      const websiteUrl = "https://kamura-felyne.vercel.app";

      return NextResponse.json({
        type: 4,
        data: {
          embeds: [
            {
              title: "🌐 Website Database Kamura",
              description:
                'Semua build senjata yang dikirim oleh hunter di server kita sekarang tersedia di website khusus!\n\nKamu bisa melihat daftarnya dan langsung klik tombol **"Buka di GameCat"** untuk meng-import armornya secara otomatis.',
              color: 0x10b981, // Warna Hijau Emerald yang senada dengan tema light
              fields: [{ name: "Akses Website Di Sini:", value: `👉 **[Buka Kamura Armory](${websiteUrl})**`, inline: false }],
              thumbnail: {
                url: "https://cdn-icons-png.flaticon.com/512/3214/3214746.png", // Icon buku/database opsional
              },
            },
          ],
        },
      });
    }
    if (commandName === "share-live") {
      const LIVE_CHANNEL_ID = process.env.LIVE_CHANNEL_ID;
      if (!LIVE_CHANNEL_ID) {
        return NextResponse.json({ type: 4, data: { flags: 64, content: "⚠️ Admin belum mengatur LIVE_CHANNEL_ID di server." } });
      }

      const options = body.data.options || [];
      const platform = options.find((opt: any) => opt.name === "platform")?.value;
      // Menghapus tanda '@' jika user bandel tetap memasukkannya
      const rawUsername = options.find((opt: any) => opt.name === "username")?.value.replace("@", "") || "";
      const pesan = options.find((opt: any) => opt.name === "pesan")?.value || "Sedang live sekarang, yuk ramaikan!";

      let liveUrl = "";
      let color = 0x000000;
      let platformName = "";
      let emoji = "";

      // Setingan spesifik tiap platform
      if (platform === "tiktok") {
        liveUrl = `https://www.tiktok.com/@${rawUsername}/live`;
        color = 0xff0050; // Merah-Pink TikTok
        platformName = "TikTok";
        emoji = "📱";
      } else if (platform === "twitch") {
        liveUrl = `https://www.twitch.tv/${rawUsername}`;
        color = 0x9146ff; // Ungu Twitch
        platformName = "Twitch";
        emoji = "🟪";
      } else if (platform === "youtube") {
        liveUrl = `https://www.youtube.com/@${rawUsername}/live`;
        color = 0xff0000; // Merah YouTube
        platformName = "YouTube";
        emoji = "🟥";
      }

      const publicPayload = {
        content: `📢 **@here, Hunter kita lagi LIVE!**`,
        embeds: [
          {
            title: `${emoji} @${username} sedang Live di ${platformName}!`,
            description: `**Pesan:**\n${pesan}\n\n👉 **[KLIK DI SINI UNTUK NONTON](${liveUrl})**`,
            color: color,
            thumbnail: {
              // Bisa pakai avatar Discord milik user sebagai thumbnail
              url: body.member?.user?.avatar ? `https://cdn.discordapp.com/avatars/${body.member.user.id}/${body.member.user.avatar}.png` : undefined,
            },
            timestamp: new Date().toISOString(),
          },
        ],
      };

      // Tembak pengumuman ke channel Live
      await fetch(`https://discord.com/api/v10/channels/${LIVE_CHANNEL_ID}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
        body: JSON.stringify(publicPayload),
      });

      // Balasan privat (ephemeral) ke streamer
      return NextResponse.json({
        type: 4,
        data: { flags: 64, content: `✅ Pengumuman live kamu berhasil disebarkan ke channel <#${LIVE_CHANNEL_ID}>!` },
      });
    }
  }

  // --- 3. TANGANI SUBMIT FORM & TOMBOL APPROVE ---
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

      return NextResponse.json({
        type: 4,
        data: { flags: 64, content: "✅ Build berhasil dikirim. Gunakan /builder jika butuh link GameCat lagi." },
      });
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

        return NextResponse.json({
          type: 7,
          data: {
            embeds: [{ ...embed, title: isApproved ? `✅ [APPROVED] Build dari ${creator}` : `❌ [REJECTED] Build dari ${creator}`, color: isApproved ? 0x00ff00 : 0xff0000 }],
            components: [],
          },
        });
      } catch (error: any) {
        return NextResponse.json({
          type: 7,
          data: { embeds: [{ ...embed, title: `💥 Gagal Memproses Tombol`, description: `**Eror:**\n\`${error.message || error}\``, color: 0x990000 }] },
        });
      }
    }
  }

  return NextResponse.json({ error: "Unknown interaction" }, { status: 400 });
}
