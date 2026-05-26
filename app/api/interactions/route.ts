import { verifyKey } from "discord-interactions";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
  if (!PUBLIC_KEY) return new Response("Error", { status: 500 });

  const signature = req.headers.get("x-signature-ed25519") || "";
  const timestamp = req.headers.get("x-signature-timestamp") || "";
  if (!signature || !timestamp) return new Response("Missing headers", { status: 401 });

  const rawBody = await req.text();
  const isValidRequest = verifyKey(rawBody, signature, timestamp, PUBLIC_KEY);
  if (!isValidRequest) return new Response("Bad signature", { status: 401 });

  const body = JSON.parse(rawBody);

  // --- 1. BALAS PING DISCORD ---
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

    // A. Command: /create-lobby
    if (commandName === "create-lobby") {
      const options = body.data.options || [];
      const lobbyId = options.find((opt: any) => opt.name === "lobby_id")?.value || "-";
      const password = options.find((opt: any) => opt.name === "password")?.value || "Open (Tanpa Password)";

      // Merakit Pesan Embed
      const responseData = {
        type: 4, // 4 = Balas dengan pesan di channel
        data: {
          embeds: [
            {
              title: "⚔️ Sesi Lobi Monster Hunter Aktif!",
              description: `Lobi baru saja dibuat oleh **@${username}**. Yuk merapat!`,
              color: 0x00ff00, // Warna hijau
              fields: [
                { name: "Lobby ID", value: `\`${lobbyId}\``, inline: true },
                { name: "Password", value: `\`${password}\``, inline: true },
              ],
              footer: { text: "Sesi ini akan otomatis ditutup dalam 6 jam." },
              timestamp: new Date().toISOString(),
            },
          ],
        },
      };

      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // B. Command: /submit-build
    if (commandName === "submit-build") {
      // Merakit Pop-up Modal Form
      // Merakit Pop-up Modal Form
      const modalData = {
        type: 9,
        data: {
          custom_id: "modal_submit_build",
          title: "Submit Build Senjata MH Rise",
          components: [
            { type: 1, components: [{ type: 4, custom_id: "build_name", label: "Nama Build", style: 1, required: true, placeholder: "Contoh: Raw Meta Risen Valstrax" }] },
            { type: 1, components: [{ type: 4, custom_id: "weapon", label: "Senjata & Augment", style: 1, required: true, placeholder: "Contoh: Kamura LS - Attack +3" }] },
            {
              type: 1,
              components: [
                {
                  type: 4,
                  custom_id: "armor",
                  label: "Armor & Dekorasi (Jangan ubah formatnya)",
                  style: 2, // 2 = Text area (Paragraf)
                  required: true,
                  // INI RAHASIANYA: \n digunakan untuk membuat baris baru (Enter)
                  value: "Head :\nBody :\nArms :\nWaist :\nLegs :",
                },
              ],
            },
            { type: 1, components: [{ type: 4, custom_id: "talisman", label: "Talisman & Dekorasi", style: 1, required: true }] },
            { type: 1, components: [{ type: 4, custom_id: "notes", label: "Catatan / Playstyle", style: 2, required: false }] },
          ],
        },
      };

      return new Response(JSON.stringify(modalData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Unknown interaction type", { status: 400 });
}
