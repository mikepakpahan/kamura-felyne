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
  if (!res.ok) throw new Error(`Google Auth Failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function appendToSheet(values: string[]) {
  const sheetId = process.env.SPREADSHEET_ID!;
  const token = await getGoogleToken();
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values: [values] }),
  });
  if (!res.ok) throw new Error(`Google Sheets API Error: ${await res.text()}`);
  return res.ok;
}

export async function POST(req: NextRequest) {
  const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
  const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
  const APPROVAL_CHANNEL_ID = process.env.APPROVAL_CHANNEL_ID;

  if (!PUBLIC_KEY || !BOT_TOKEN || !APPROVAL_CHANNEL_ID) return new Response("Config Error", { status: 500 });

  const signature = req.headers.get("x-signature-ed25519") || "";
  const timestamp = req.headers.get("x-signature-timestamp") || "";
  if (!signature || !timestamp) return new Response("Missing headers", { status: 401 });

  const rawBody = await req.text();
  const isValidRequest = verifyKey(rawBody, signature, timestamp, PUBLIC_KEY);
  if (!isValidRequest) return new Response("Bad signature", { status: 401 });

  const body = JSON.parse(rawBody);

  if (body.type === 1) return new Response(JSON.stringify({ type: 1 }), { status: 200, headers: { "Content-Type": "application/json" } });

  if (body.type === 2) {
    const commandName = body.data.name;
    const username = body.member?.user?.username || "Hunter";

    // --- COMMAND BARU: /builder ---
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
            title: "Submit Build via Encoding",
            components: [
              { type: 1, components: [{ type: 4, custom_id: "build_name", label: "Nama Build", style: 1, required: true }] },
              { type: 1, components: [{ type: 4, custom_id: "weapon", label: "Jenis Senjata", style: 1, required: true, placeholder: "Contoh: Long Sword" }] },
              // Menambahkan instruksi dan link di Placeholder
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
  }

  // --- SUBMIT FORM & KLIK TOMBOL (Sama seperti sebelumnya) ---
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
          await appendToSheet([buildName, weapon, encoding, notes, creator]);
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
