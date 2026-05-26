import { verifyKey } from "discord-interactions";
import { NextRequest } from "next/server";
import { SignJWT, importPKCS8 } from "jose";

export const runtime = "edge";

// Helper untuk mengambil data dari Modal Form
function getModalValue(body: any, customId: string): string {
  const components = body.data?.components || [];
  for (const row of components) {
    const component = row.components?.find((c: any) => c.custom_id === customId);
    if (component) return component.value;
  }
  return "";
}

// --- HELPER: OTENTIKASI & GOOGLE SHEETS ---
async function getGoogleToken() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL!;
  // Memperbaiki format spasi baris (\n) pada private key saat dibaca dari environment Vercel
  const privateKey = process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, "\n");

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
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await res.json();
  return data.access_token;
}

async function appendToSheet(values: string[]) {
  const sheetId = process.env.SPREADSHEET_ID!;
  const token = await getGoogleToken();

  // Catatan: Pastikan nama tab/lembar kerja di file Google Sheets kamu adalah 'Sheet1'
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [values] }),
  });

  if (!res.ok) console.error("Gagal simpan ke Sheets:", await res.text());
  return res.ok;
}
// ------------------------------------------

export async function POST(req: NextRequest) {
  const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
  const APPROVAL_CHANNEL_ID = process.env.APPROVAL_CHANNEL_ID;

  if (!PUBLIC_KEY || !BOT_TOKEN || !APPROVAL_CHANNEL_ID) {
    return new Response("Internal Configuration Error", { status: 500 });
  }

  const signature = req.headers.get("x-signature-ed25519") || "";
  const timestamp = req.headers.get("x-signature-timestamp") || "";
  if (!signature || !timestamp) return new Response("Missing headers", { status: 401 });

  const rawBody = await req.text();
  const isValidRequest = verifyKey(rawBody, signature, timestamp, PUBLIC_KEY);
  if (!isValidRequest) return new Response("Bad signature", { status: 401 });

  const body = JSON.parse(rawBody);

  // --- 1. BALAS PING ---
  if (body.type === 1) {
    return new Response(JSON.stringify({ type: 1 }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  // --- 2. TANGANI SLASH COMMANDS ---
  if (body.type === 2) {
    const commandName = body.data.name;
    const username = body.member?.user?.username || "Hunter";

    if (commandName === "create-lobby") {
      const options = body.data.options || [];
      const lobbyId = options.find((opt: any) => opt.name === "lobby_id")?.value || "-";
      const password = options.find((opt: any) => opt.name === "password")?.value || "Open (Tanpa Password)";

      return new Response(
        JSON.stringify({
          type: 4,
          data: {
            embeds: [
              {
                title: "⚔️ Sesi Lobi Monster Hunter Aktif!",
                description: `Lobi baru saja dibuat oleh **@${username}**. Yuk merapat!`,
                color: 0x00ff00,
                fields: [
                  { name: "Lobby ID", value: `\`${lobbyId}\``, inline: true },
                  { name: "Password", value: `\`${password}\``, inline: true },
                ],
                footer: { text: "Sesi ini akan otomatis ditutup dalam 6 jam." },
                timestamp: new Date().toISOString(),
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
            title: "Submit Build Senjata MH Rise",
            components: [
              { type: 1, components: [{ type: 4, custom_id: "build_name", label: "Nama Build", style: 1, required: true, placeholder: "Contoh: Raw Meta Risen Valstrax" }] },
              { type: 1, components: [{ type: 4, custom_id: "weapon", label: "Senjata & Augment", style: 1, required: true, placeholder: "Contoh: Kamura LS - Attack +3" }] },
              { type: 1, components: [{ type: 4, custom_id: "armor", label: "Armor & Dekorasi (Jangan ubah formatnya)", style: 2, required: true, value: "Head :\nBody :\nArms :\nWaist :\nLegs :" }] },
              { type: 1, components: [{ type: 4, custom_id: "talisman", label: "Talisman & Dekorasi", style: 1, required: true }] },
              { type: 1, components: [{ type: 4, custom_id: "notes", label: "Catatan / Playstyle", style: 2, required: false }] },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // --- 3. TANGANI SUBMIT FORM ---
  if (body.type === 5) {
    if (body.data.custom_id === "modal_submit_build") {
      const username = body.member?.user?.username || "Hunter";
      const buildName = getModalValue(body, "build_name");
      const weapon = getModalValue(body, "weapon");
      const armor = getModalValue(body, "armor");
      const talisman = getModalValue(body, "talisman");
      const notes = getModalValue(body, "notes") || "-";

      const discordPayload = {
        embeds: [
          {
            title: `📝 [PENDING APPROVAL] Build Baru`,
            color: 0xffaa00,
            fields: [
              { name: "Nama Build", value: buildName },
              { name: "Senjata & Augment", value: weapon },
              { name: "Armor Set", value: `\`\`\`text\n${armor}\n\`\`\`` },
              { name: "Talisman", value: talisman },
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
          data: { flags: 64, content: "✅ Build kamu berhasil dikirim ke Admin untuk diperiksa!" },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // --- 4. TANGANI KLIK TOMBOL APPROVE/REJECT ---
  if (body.type === 3) {
    const customId = body.data.custom_id;
    const message = body.message;
    const embed = message.embeds[0];

    if (customId === "approve_build" || customId === "reject_build") {
      const isApproved = customId === "approve_build";
      const creator = embed.footer?.text.replace("Creator: ", "") || "Unknown";

      if (isApproved) {
        // Ambil data dari kotak Embed secara dinamis
        const buildName = embed.fields[0].value;
        const weapon = embed.fields[1].value;
        // Bersihkan tanda backtick (```) dari armor sebelum masuk Sheets
        const armor = embed.fields[2].value
          .replace(/```text\n?/g, "")
          .replace(/```/g, "")
          .trim();
        const talisman = embed.fields[3].value;
        const notes = embed.fields[4].value;

        // Eksekusi fungsi kirim ke Google Sheets
        await appendToSheet([buildName, weapon, armor, talisman, notes, creator]);
      }

      // Update pesan: Ganti warna, ubah judul, dan hilangkan array komponen (tombol)
      const updatedEmbed = {
        ...embed,
        title: isApproved ? `✅ [APPROVED] Build dari ${creator}` : `❌ [REJECTED] Build dari ${creator}`,
        color: isApproved ? 0x00ff00 : 0xff0000,
      };

      return new Response(
        JSON.stringify({
          type: 7, // Tipe 7 = UPDATE_MESSAGE
          data: {
            embeds: [updatedEmbed],
            components: [], // Kosongkan agar tombol hilang
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  return new Response("Unknown interaction type", { status: 400 });
}
