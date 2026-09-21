import { secretMatches } from "@/lib/agentAuth";
import { constantTimeEqual, sha256Hex } from "@/lib/auth";
import { handleMessengerWebhook, messengerConfigured, type MessengerWebhook } from "@/lib/messenger";

// The Meta app's Messenger webhook (Callback URL). No browser and no site password: the secret in
// the URL (?token=) is the proof, and it is also the "Verify token" typed in the Meta app. With
// META_APP_SECRET set, Meta's X-Hub-Signature-256 is checked as well.

/** Meta checks the Callback URL once, when it is saved in the app. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ok =
    url.searchParams.get("hub.mode") === "subscribe" &&
    (await secretMatches(url.searchParams.get("hub.verify_token"), process.env.MESSENGER_WEBHOOK_SECRET));
  if (!ok) return new Response("Forbidden", { status: 403 });
  return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
}

async function validMetaSignature(rawBody: string, header: string | null): Promise<boolean> {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return true;
  if (!header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = Array.from(new Uint8Array(mac), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return constantTimeEqual(await sha256Hex(hex), await sha256Hex(header.slice("sha256=".length)));
}

/** New messages. Always 200 once the secret matches: Meta turns off webhooks that keep failing. */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!(await secretMatches(token, process.env.MESSENGER_WEBHOOK_SECRET))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const rawBody = await request.text();
  if (!(await validMetaSignature(rawBody, request.headers.get("x-hub-signature-256")))) {
    return Response.json({ error: "Invalid signature" }, { status: 403 });
  }
  if (!messengerConfigured()) {
    console.error("messenger webhook: Messenger is not configured");
    return Response.json({ ok: false, reason: "not configured" });
  }

  let payload: MessengerWebhook;
  try {
    payload = JSON.parse(rawBody) as MessengerWebhook;
  } catch {
    return Response.json({ ok: true, ignored: "unreadable body" });
  }
  try {
    return Response.json({ ok: true, handled: await handleMessengerWebhook(payload) });
  } catch (error) {
    console.error("messenger webhook failed", error);
    return Response.json({ ok: false });
  }
}
