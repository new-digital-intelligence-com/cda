// The /api/agent/* routes are called by ElevenLabs, not by a logged-in browser, so they are
// exempt from the site password (see src/proxy.ts) and carry their own proof instead:
// a shared secret header for the tools, and ElevenLabs' HMAC signature for the post-call webhook.

import { constantTimeEqual, sha256Hex } from "./auth";

export const AGENT_SECRET_HEADER = "x-cda-agent-secret";

/** Replay window for the post-call webhook, matching ElevenLabs' own examples. */
const MAX_SIGNATURE_AGE_SECONDS = 30 * 60;

export function agentToolSecretConfigured(): boolean {
  return Boolean(process.env.AGENT_TOOL_SECRET);
}

export async function hasValidToolSecret(request: Request): Promise<boolean> {
  const expected = process.env.AGENT_TOOL_SECRET;
  const provided = request.headers.get(AGENT_SECRET_HEADER);
  if (!expected || !provided) return false;
  // Compare hashes so the comparison time does not depend on the secret's length.
  return constantTimeEqual(await sha256Hex(provided), await sha256Hex(expected));
}

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Header format is `t=<unix seconds>,v0=<hex>`, signed over `<t>.<raw body>` with SHA-256. */
export async function hasValidWebhookSignature(rawBody: string, header: string | null): Promise<boolean> {
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;
  if (!secret || !header) return false;

  const parts = new Map<string, string>();
  for (const piece of header.split(",")) {
    const separator = piece.indexOf("=");
    if (separator > 0) parts.set(piece.slice(0, separator).trim(), piece.slice(separator + 1).trim());
  }
  const timestamp = parts.get("t");
  const signature = parts.get("v0");
  if (!timestamp || !signature) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > MAX_SIGNATURE_AGE_SECONDS) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  return constantTimeEqual(await sha256Hex(hex(mac)), await sha256Hex(signature));
}
