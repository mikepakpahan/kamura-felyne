import { verifyKey } from "discord-interactions";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;

  if (!PUBLIC_KEY) {
    return new Response("Missing public key", { status: 500 });
  }

  const signature = req.headers.get("x-signature-ed25519") || "";

  const timestamp = req.headers.get("x-signature-timestamp") || "";

  if (!signature || !timestamp) {
    return new Response("Missing signature headers", {
      status: 401,
    });
  }

  const rawBody = await req.text();

  const isValidRequest = await verifyKey(rawBody, signature, timestamp, PUBLIC_KEY);

  if (!isValidRequest) {
    return new Response("Invalid request signature", {
      status: 401,
    });
  }

  const body = JSON.parse(rawBody);

  // Discord PING
  if (body.type === 1) {
    return Response.json({ type: 1 });
  }

  return new Response("OK", { status: 200 });
}
