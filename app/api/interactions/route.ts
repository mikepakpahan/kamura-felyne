import { verifyKey } from "discord-interactions";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Helper untuk mengambil data dari kolom Modal Discord
function getModalValue(body: any, customId: string): string {
  const components = body.data?.components || [];
  for (const row of components) {
    const component = row.components?.find((c: any) => c.custom_id === customId);
    if (component) return component.value;
  }
  return "";
}

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
    return new Response(JSON.stringify({ type: 1 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
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

  // --- 3. TANGANI MODAL SUBMIT (Ketika User klik kirim Form Build) ---
  if (body.type === 5) {
    const customId = body.data.custom_id;

    if (customId === "modal_submit_build") {
      const username = body.member?.user?.username || "Hunter";

      // Ambil seluruh data dari form input
      const buildName = getModalValue(body, "build_name");
      const weapon = getModalValue(body, "weapon");
      const armor = getModalValue(body, "armor");
      const talisman = getModalValue(body, "talisman");
      const notes = getModalValue(body, "notes") || "-";

      // Jalur belakang: Tembak pesan embed berisi data build ke private channel approval
      const discordPayload = {
        embeds: [
          {
            title: `📝 [PENDING APPROVAL] Build Baru dari @${username}`,
            color: 0xffaa00, // Warna Oranye tanda menunggu
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
        // Tambahkan komponen tombol interaktif khusus untuk Admin (Kamu)
        components: [
          {
            type: 1,
            components: [
              { type: 2, style: 3, label: "Approve", custom_id: "approve_build" }, // Tombol Hijau
              { type: 2, style: 4, label: "Reject", custom_id: "reject_build" }, // Tombol Merah
            ],
          },
        ],
      };

      // Melakukan HTTP Request langsung ke API Discord untuk mengirim pesan ke channel private
      await fetch(`https://discord.com/api/v10/channels/${APPROVAL_CHANNEL_ID}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bot ${BOT_TOKEN}`,
        },
        body: JSON.stringify(discordPayload),
      });

      // Balasan instan ke si pengirim form (Pesan Ephemeral: Hanya dia yang bisa lihat)
      return new Response(
        JSON.stringify({
          type: 4,
          data: {
            flags: 64, // Flag 64 membuat pesan berstatus Ephemeral (Privat)
            content: "✅ Build kamu berhasil dikirim ke Admin untuk diperiksa! Terima kasih sudah berkontribusi.",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  return new Response("Unknown interaction type", { status: 400 });
}
