import { NextResponse } from "next/server";
import { appendToSheet, getSheetData, updateLobbyStatus, getSettings } from "../lib/google";

// Helper function
export function getModalValue(body: any, customId: string): string {
  const components = body.data?.components || [];
  for (const row of components) {
    const component = row.components?.find((c: any) => c.custom_id === customId);
    if (component) return component.value;
  }
  return "";
}

// Handler untuk Slash Commands (Type 2)
export async function handleCommands(body: any) {
  const commandName = body.data.name;
  const username = body.member?.user?.username || "Hunter";
  const channelId = body.channel_id;
  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

  if (commandName === "create-lobby") {
    // 1. Ambil pengaturan dari Google Sheets
    const config = await getSettings();

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
      // Gunakan pesan error dinamis dari Sheet (fallback ke pesan default jika kosong)
      const activeError = config["msg_lobby_active_error"] || "⚠️ **Gagal:** Kamu masih memiliki sesi lobi mabar yang sedang aktif! Silakan tutup lobi sebelumnya dengan `/close-lobby` sebelum membuat yang baru.";

      return NextResponse.json({
        type: 4,
        data: { flags: 64, content: activeError },
      });
    }

    const options = body.data.options || [];
    const lobbyId = options.find((opt: any) => opt.name === "lobby_id")?.value || "-";
    const password = options.find((opt: any) => opt.name === "password")?.value || "Open (Tanpa Password)";
    const catatan = options.find((opt: any) => opt.name === "catatan")?.value || "-";

    const rawTimestampString = Date.now().toString();
    const displayTimeISO = new Date().toISOString();

    // 2. Siapkan data dinamis untuk Embed & Pesan
    const roleMention = config["role_mention"] || "@here";

    // Replace {mention} dengan role mention asli
    const lobbyContent = (config["msg_lobby_create_content"] || `📢 {mention} Bersiap! Ada sesi mabar baru dibuka!`).replace("{mention}", roleMention);

    const lobbyTitle = config["msg_lobby_create_title"] || "⚔️ Sesi Lobi Monster Hunter Aktif!";

    // Replace {username} dengan nama pembuat lobi
    const lobbyDesc = (config["msg_lobby_create_desc"] || `Lobi baru saja dibuat oleh **@{username}**. Yuk merapat!`).replace("{username}", username);

    const lobbyFooter = config["msg_lobby_footer"] || "Sesi ini akan otomatis ditutup dalam 6 jam. Gunakan /close-lobby jika sudah selesai.";

    const publicPayload = {
      content: lobbyContent,
      embeds: [
        {
          title: lobbyTitle,
          description: lobbyDesc,
          color: 0x00ff00,
          fields: [
            { name: "Lobby ID", value: `\`${lobbyId}\``, inline: true },
            { name: "Password", value: `\`${password}\``, inline: true },
            { name: "Catatan Sesi", value: catatan, inline: false },
          ],
          footer: { text: lobbyFooter },
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

    await appendToSheet("Lobby", [lobbyId, password, catatan, username, rawTimestampString, "Aktif", channelId, messageId]);

    return NextResponse.json({
      type: 4,
      data: { flags: 64, content: `✅ Lobi berhasil dibuat dan pengumuman telah dikirim ke channel!` },
    });
  }

  if (commandName === "info-lobby") {
    // Ambil pengaturan dari Google Sheets
    const config = await getSettings();

    const rows = await getSheetData("Lobby");
    const activeFields: any[] = [];
    const now = Date.now();
    const SIX_HOURS = 6 * 60 * 60 * 1000;

    for (let i = 1; i < rows.length; i++) {
      const [lobbyId, password, catatan, creator, createdAt, status, lChannelId, lMessageId] = rows[i];

      if (status === "Aktif") {
        const createdTimeMs = Number(createdAt);
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

    // Ambil pesan lobi kosong dari sheet
    const emptyLobbyMsg = config["msg_lobby_empty"] || "❌ Tidak ada sesi lobi yang aktif saat ini. Silakan buat lobi baru menggunakan perintah `/create-lobby`!";

    const embed = {
      title: "📡 Daftar Sesi Lobi Mabar Aktif",
      color: activeFields.length > 0 ? 0x00ffff : 0xff0000,
      description: activeFields.length > 0 ? "Berikut adalah lobi mabar yang sedang membuka lowongan slot Hunter:" : emptyLobbyMsg,
      fields: activeFields,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      type: 4,
      data: { flags: 64, embeds: [embed] },
    });
  }

  if (commandName === "close-lobby") {
    // Ambil pengaturan dari Google Sheets
    const config = await getSettings();

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

      // Ambil pesan sukses dinamis (kamu bisa tambahkan key ini di sheet jika belum ada)
      const closeSuccess = config["msg_lobby_close_success"] || "✅ Sesi lobi kamu ditutup, dan pesan pengumuman telah dihapus dari channel!";

      return NextResponse.json({
        type: 4,
        data: { flags: 64, content: closeSuccess },
      });
    } else {
      // Ambil pesan error dinamis jika tidak ada lobi (tambahkan key ini di sheet)
      const closeError = config["msg_lobby_close_error"] || "⚠️ Kamu tidak memiliki sesi lobi aktif yang terdaftar di sistem.";

      return NextResponse.json({
        type: 4,
        data: { flags: 64, content: closeError },
      });
    }
  }

  if (commandName === "builder") {
    // Ambil pengaturan
    const config = await getSettings();
    const gamecatUrl = config["url_gamecat"] || "https://gamecat.fun/e/#xxxxxs2OxYuux";
    const title = config["msg_builder_title"] || "🛠️ GameCat Armorset Builder";
    const desc = config["msg_builder_desc"] || "Gunakan website ini untuk merakit armor tanpa batas dan mendapatkan kode **Encoding**-nya.";

    return NextResponse.json({
      type: 4,
      data: {
        embeds: [
          {
            title: title,
            description: `${desc}\n\n🔗 **[Klik di sini untuk buka GameCat](${gamecatUrl})**`,
            color: 0x00aaff,
          },
        ],
      },
    });
  }

  if (commandName === "submit-build") {
    // Ambil URL GameCat untuk ditaruh di placeholder modal
    const config = await getSettings();
    const gamecatUrl = config["url_gamecat"] || "https://gamecat.fun/e/#xxxxxs2OxYuux";

    return NextResponse.json({
      type: 9,
      data: {
        custom_id: "modal_submit_build",
        title: "Submit Build via Encoding",
        components: [
          { type: 1, components: [{ type: 4, custom_id: "build_name", label: "Nama Build", style: 1, required: true }] },
          { type: 1, components: [{ type: 4, custom_id: "weapon", label: "Jenis Senjata", style: 1, required: true, placeholder: "Contoh: Long Sword" }] },
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: "encoding",
                label: "Build Encoding (Paste di sini)",
                style: 2,
                required: true,
                placeholder: `Buka ${gamecatUrl} lalu copy-paste kode Export-nya ke sini.`,
              },
            ],
          },
          { type: 1, components: [{ type: 4, custom_id: "notes", label: "Catatan (Opsional)", style: 2, required: false }] },
        ],
      },
    });
  }

  if (commandName === "build-info") {
    const options = body.data.options || [];
    const keyword = options.find((opt: any) => opt.name === "keyword")?.value?.toLowerCase() || "";

    const rows = await getSheetData("Build");
    const results: any[] = [];

    for (let i = 1; i < rows.length; i++) {
      const [buildName, weapon, encoding, notes, creator] = rows[i];
      const matchBuild = buildName?.toLowerCase().includes(keyword);
      const matchWeapon = weapon?.toLowerCase().includes(keyword);

      if (!keyword || matchBuild || matchWeapon) {
        results.push({ buildName, weapon, encoding, notes, creator });
      }
    }

    if (results.length === 0) {
      return NextResponse.json({
        type: 4,
        data: { flags: 64, content: `❌ Tidak ditemukan build dengan kata kunci **"${keyword}"**. Coba gunakan nama senjata atau sebutan lain.` },
      });
    }

    results.reverse();
    const maxDisplay = 5;
    const displayResults = results.slice(0, maxDisplay);

    const fields = displayResults.map((b) => ({
      name: `🔹 ${b.buildName} (${b.weapon})`,
      value: `**Creator:** @${b.creator}\n**Encoding:** \`${b.encoding}\`\n*Catatan:* ${b.notes !== "-" ? b.notes : "Tidak ada catatan."}`,
      inline: false,
    }));

    const hiddenCount = results.length - maxDisplay;

    // Ambil URL GameCat dinamis
    const config = await getSettings();
    const gamecatUrl = config["url_gamecat"] || "https://gamecat.fun/e/#xxxxxs2OxYuux";

    return NextResponse.json({
      type: 4,
      data: {
        embeds: [
          {
            title: "🛡️ Database Build Kamura",
            description: keyword
              ? `Hasil pencarian untuk: **${keyword}**\n🔗 *Copy kode Encoding di bawah dan paste di menu Import pada [GameCat Builder](${gamecatUrl}).*`
              : `Menampilkan daftar build terbaru.\n🔗 *Copy kode Encoding di bawah dan paste di menu Import pada [GameCat Builder](${gamecatUrl}).*`,
            color: 0x00aaff,
            fields: fields,
            footer: { text: hiddenCount > 0 ? `Ada +${hiddenCount} build lain disembunyikan. Gunakan /build-info dengan keyword lebih spesifik.` : "Sistem Database Kamura Felyne" },
            timestamp: new Date().toISOString(),
          },
        ],
      },
    });
  }

  if (commandName === "list-build") {
    // Ambil pengaturan
    const config = await getSettings();
    const websiteUrl = config["url_kamura_web"] || "https://kamura-felyne.vercel.app";
    const title = config["msg_listbuild_title"] || "🌐 Website Database Kamura";
    const desc =
      config["msg_listbuild_desc"] ||
      'Semua build senjata yang dikirim oleh hunter di server kita sekarang tersedia di website khusus!\n\nKamu bisa melihat daftarnya dan langsung klik tombol **"Buka di GameCat"** untuk meng-import armornya secara otomatis.';

    return NextResponse.json({
      type: 4,
      data: {
        embeds: [
          {
            title: title,
            description: desc,
            color: 0x10b981,
            fields: [{ name: "Akses Website Di Sini:", value: `👉 **[Buka Kamura Armory](${websiteUrl})**`, inline: false }],
            thumbnail: { url: "https://cdn-icons-png.flaticon.com/512/3214/3214746.png" },
          },
        ],
      },
    });
  }

  if (commandName === "share-live") {
    const LIVE_CHANNEL_ID = process.env.LIVE_CHANNEL_ID;
    if (!LIVE_CHANNEL_ID) return NextResponse.json({ type: 4, data: { flags: 64, content: "⚠️ Admin belum mengatur LIVE_CHANNEL_ID di server." } });

    const options = body.data.options || [];
    const platform = options.find((opt: any) => opt.name === "platform")?.value;
    const rawUsername = options.find((opt: any) => opt.name === "username")?.value.replace("@", "") || "";
    const pesan = options.find((opt: any) => opt.name === "pesan")?.value || "Sedang live sekarang, yuk ramaikan!";

    // === TANGKAP ID USER UNTUK MENTION ===
    const userId = body.member?.user?.id || body.user?.id;
    const userMention = userId ? `<@${userId}>` : "Hunter kita";

    let liveUrl = "";
    let color = 0x000000;
    let platformName = "";
    let emoji = "";
    if (platform === "tiktok") {
      liveUrl = `https://www.tiktok.com/@${rawUsername}/live`;
      color = 0xff0050;
      platformName = "TikTok";
      emoji = "📱";
    } else if (platform === "twitch") {
      liveUrl = `https://www.twitch.tv/${rawUsername}`;
      color = 0x9146ff;
      platformName = "Twitch";
      emoji = "🟪";
    } else if (platform === "youtube") {
      liveUrl = `https://www.youtube.com/@${rawUsername}/live`;
      color = 0xff0000;
      platformName = "YouTube";
      emoji = "🟥";
    }

    // ==========================================
    // --- AMBIL PENGATURAN DARI GOOGLE SHEETS ---
    // ==========================================
    const config = await getSettings();
    const roleMention = config["role_mention"] || "@here";

    const formatText = (text: string) => {
      if (!text) return "";
      return text
        .replace(/\\n/g, "\n")
        .replace(/\{user\}/gi, userMention)
        .replace(/\{username\}/gi, username)
        .replace(/\{mention\}/gi, roleMention)
        .replace(/\{platform\}/gi, platform)
        .replace(/\{emoji\}/gi, emoji);
    };

    const liveContent = formatText(config["msg_live_content"] || "📢 {mention}, {user} sedang Live di {platform}!");
    const liveTitle = formatText(config["msg_live_title"] || "🔴 LIVE STREAM: {platform}");
    const liveDescTemplate = formatText(config["msg_live_desc"] || "**Pesan:**\n{pesan}\n\n👉 **[KLIK DI SINI UNTUK NONTON]({url})**");

    // Ganti nilai khusus untuk Deskripsi
    const liveDesc = liveDescTemplate.replace(/\{pesan\}/gi, pesan).replace(/\{url\}/gi, liveUrl);

    // Cek Pengaturan Format (Embed atau Text Biasa)
    const liveFormat = config["share_live_format"] || "embed";
    let publicPayload: any = {};

    if (liveFormat === "text") {
      // JIKA FORMAT: TEKS BIASA
      // Kita gabungkan Judul, Pesan Luar, Deskripsi, dan URL jadi satu pesan rapi
      const plainText = `${liveContent}\n\n**${liveTitle}**\n**Pesan:** ${pesan}\n\n👉 **Link Nonton:** ${liveUrl}`;
      publicPayload = { content: plainText };
    } else {
      // JIKA FORMAT: EMBED (Default)
      const embed = {
        title: liveTitle,
        description: liveDesc,
        color: platform.toLowerCase() === "youtube" ? 0xff0000 : platform.toLowerCase() === "tiktok" ? 0x000000 : 0x9146ff,
        url: liveUrl,
        timestamp: new Date().toISOString(),
        author: {
          name: `${username} is now live!`,
          icon_url: { url: body.member?.user?.avatar ? `https://cdn.discordapp.com/avatars/${body.member.user.id}/${body.member.user.avatar}.png` : undefined },
        },
      };
      publicPayload = { content: liveContent, embeds: [embed] };
    }

    // 5. Kirim ke Channel Live
    await fetch(`[https://discord.com/api/v10/channels/$](https://discord.com/api/v10/channels/$){LIVE_CHANNEL_ID}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bot ${BOT_TOKEN}` },
      body: JSON.stringify(publicPayload),
    });

    return NextResponse.json({
      type: 4,
      data: { flags: 64, content: `✅ Berhasil membagikan stream kamu ke server!` },
    });
  }

  return NextResponse.json({ error: "Command not found" }, { status: 400 });
}

// Handler untuk Modal Submissions (Type 5)
export async function handleModals(body: any) {
  if (body.data.custom_id === "modal_submit_build") {
    const username = body.member?.user?.username || "Hunter";
    const buildName = getModalValue(body, "build_name");
    const weapon = getModalValue(body, "weapon");
    const encoding = getModalValue(body, "encoding");
    const notes = getModalValue(body, "notes") || "-";
    const APPROVAL_CHANNEL_ID = process.env.APPROVAL_CHANNEL_ID!;
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

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
  return NextResponse.json({ error: "Modal not found" }, { status: 400 });
}

// Handler untuk Button Interactions (Type 3)
export async function handleComponents(body: any) {
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
        await appendToSheet("Build", [buildName, weapon, encoding, notes, creator]);
      }

      return NextResponse.json({
        type: 7,
        data: {
          embeds: [{ ...embed, title: isApproved ? `✅ [APPROVED] Build dari ${creator}` : `❌ [REJECTED] Build dari ${creator}`, color: isApproved ? 0x00ff00 : 0xff0000 }],
          components: [], // Hapus tombol setelah ditekan
        },
      });
    } catch (error: any) {
      return NextResponse.json({
        type: 7,
        data: { embeds: [{ ...embed, title: `💥 Gagal Memproses Tombol`, description: `**Eror:**\n\`${error.message || error}\``, color: 0x990000 }] },
      });
    }
  }
  return NextResponse.json({ error: "Component not found" }, { status: 400 });
}
