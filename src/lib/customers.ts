// Customer memory shared by every channel. Tables live in Supabase (see supabase/schema.sql).
//
// A customer is a person. Every way of reaching them - a Telegram chat, an email address, an
// Instagram sender id, a website cookie - is a row in customer_channels, so one person can have
// several of the same kind with no special case.
//
// Ellie never asks anyone to identify themselves. A channel becomes linked either automatically
// (its id is inside the conversation id) or because the person signed in on the website and sent
// the short code from that channel.

import { supabaseConfigured, supabaseRest as rest } from "./supabase";

export const CHANNELS = ["telegram", "instagram", "email", "website", "slack"] as const;
export type Channel = (typeof CHANNELS)[number];

export type Customer = { id: string; name: string | null };
export type Identity = { channel: Channel; key: string; name?: string };
export type LinkedChannel = { channel: Channel; channel_key: string; verified: boolean };

/** What the agent is told. Deliberately no addresses, order numbers or other personal details. */
export type Profile = { name: string | null; channels: Channel[]; verified: boolean; recent: string[] };

export const customerStoreConfigured = supabaseConfigured;

const q = encodeURIComponent;

/** Loose on purpose: this only rejects obvious rubbish, it does not police valid addresses. */
export function normaliseEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const email = input.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
}

// --- working out who is speaking -------------------------------------------------------------

/**
 * The channel's own id is inside the conversation id, and system__conversation_id is the only
 * dynamic variable that exists on every channel. Binding a tool parameter to a channel-specific
 * variable (integration__telegram_chat_id, or our own website_id) makes the conversation fail on
 * every other channel with "Missing required dynamic variables", so we do not use them.
 */
const TELEGRAM_CHAT = /_tg_(\d+)$/;
const FRESHDESK_TICKET = /_fd_(\d+)$/;

async function freshdeskRequester(ticket: string): Promise<{ email: string; name?: string } | null> {
  const apiKey = process.env.FRESHDESK_API_KEY;
  const subdomain = process.env.FRESHDESK_SUBDOMAIN;
  if (!apiKey || !subdomain) return null;

  try {
    // Freshdesk signs in with the API key as the username and "X" as the password.
    const response = await fetch(`https://${subdomain}.freshdesk.com/api/v2/tickets/${ticket}?include=requester`, {
      headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:X`).toString("base64")}` },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { requester?: { email?: string; name?: string } };
    const email = normaliseEmail(body.requester?.email);
    return email ? { email, name: body.requester?.name?.trim() || undefined } : null;
  } catch (error) {
    console.error("Freshdesk requester lookup failed", error);
    return null;
  }
}

/** Who this turn is from, worked out from the conversation id alone. */
export async function resolveIdentity(body: Record<string, unknown>): Promise<Identity | null> {
  const explicitChannel = typeof body.channel === "string" ? body.channel : "";
  const explicitKey = typeof body.channel_key === "string" ? body.channel_key.trim() : "";
  if (explicitKey && (CHANNELS as readonly string[]).includes(explicitChannel)) {
    return { channel: explicitChannel as Channel, key: explicitKey };
  }

  const conversationId = typeof body.conversation_id === "string" ? body.conversation_id : "";

  const telegram = conversationId.match(TELEGRAM_CHAT)?.[1];
  if (telegram) return { channel: "telegram", key: telegram };

  const ticket = conversationId.match(FRESHDESK_TICKET)?.[1];
  if (ticket) {
    const requester = await freshdeskRequester(ticket);
    if (requester) return { channel: "email", key: requester.email, name: requester.name };
  }

  return null;
}

// --- customers and their channels ------------------------------------------------------------

export async function findByChannel({ channel, key }: Identity): Promise<{ customer: Customer; verified: boolean } | null> {
  const rows = await rest<{ verified: boolean; customers: Customer | Customer[] | null }[]>(
    `customer_channels?channel=eq.${q(channel)}&channel_key=eq.${q(key)}&select=verified,customers(id,name)&limit=1`,
  );
  const row = rows[0];
  if (!row) return null;
  // PostgREST returns an embedded row as an object; older versions wrap it in an array.
  const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
  return customer ? { customer, verified: row.verified } : null;
}

export async function createCustomer(name?: string, authUserId?: string): Promise<Customer> {
  const [customer] = await rest<Customer[]>("customers?select=id,name", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({ name: name ?? null, auth_user_id: authUserId ?? null }),
  });
  return customer;
}

export async function attachChannel(customerId: string, { channel, key }: Identity, verified: boolean) {
  await rest("customer_channels?on_conflict=channel,channel_key", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify({ channel, channel_key: key, customer_id: customerId, verified }),
  });
}

export async function listChannels(customerId: string): Promise<LinkedChannel[]> {
  return rest<LinkedChannel[]>(
    `customer_channels?customer_id=eq.${q(customerId)}&select=channel,channel_key,verified&order=created_at.asc`,
  );
}

export async function removeChannel(customerId: string, channel: string, key: string) {
  await rest(
    `customer_channels?customer_id=eq.${q(customerId)}&channel=eq.${q(channel)}&channel_key=eq.${q(key)}`,
    { method: "DELETE", prefer: "return=minimal" },
  );
}

/** Finds the customer this channel belongs to, creating an anonymous record the first time. */
export async function customerForChannel(identity: Identity, verified: boolean): Promise<Customer> {
  const known = await findByChannel(identity);
  if (known) return known.customer;
  const customer = await createCustomer(identity.name);
  await attachChannel(customer.id, identity, verified);
  return customer;
}

/**
 * Website chat, voice and the avatar have no channel id inside the conversation id, and binding a
 * website-only dynamic variable would break every other channel. Instead the web app registers the
 * conversation as soon as it starts, and the agent's lookup finds it here.
 */
export async function customerForConversation(conversationId: string): Promise<Customer | null> {
  if (!conversationId) return null;
  const rows = await rest<{ customers: Customer | Customer[] | null }[]>(
    `customer_conversations?conversation_id=eq.${q(conversationId)}&select=customers(id,name)&limit=1`,
  );
  const customer = rows[0]?.customers;
  return (Array.isArray(customer) ? customer[0] : customer) ?? null;
}

export async function profileFor(customer: Customer): Promise<Profile> {
  const [channels, notes] = await Promise.all([
    listChannels(customer.id),
    rest<{ summary: string }[]>(
      `customer_notes?customer_id=eq.${q(customer.id)}&select=summary&order=created_at.desc&limit=3`,
    ),
  ]);
  return {
    name: customer.name,
    channels: [...new Set(channels.map((row) => row.channel as Channel))],
    verified: channels.some((row) => row.verified),
    recent: notes.map((note) => note.summary),
  };
}

// --- the account on the website --------------------------------------------------------------

/**
 * The customer behind a signed-in website account. If that email was already seen on the email
 * channel, the existing record is adopted so nothing they told us before is lost.
 */
export async function customerForAccount(authUserId: string, email: string, name?: string): Promise<Customer> {
  const byAuth = await rest<Customer[]>(
    `customers?auth_user_id=eq.${q(authUserId)}&select=id,name&limit=1`,
  );
  if (byAuth[0]) return byAuth[0];

  const existing = await findByChannel({ channel: "email", key: email });
  const customer = existing?.customer ?? (await createCustomer(name));

  await rest(`customers?id=eq.${q(customer.id)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify(name ? { auth_user_id: authUserId, name } : { auth_user_id: authUserId }),
  });
  // Signing in with that address proves it, so the email channel counts as verified.
  await attachChannel(customer.id, { channel: "email", key: email }, true);
  return { id: customer.id, name: name ?? customer.name };
}

// --- link codes ------------------------------------------------------------------------------

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0 or 1 to read out loud
const CODE_TTL_MINUTES = 30;

export async function createLinkCode(customerId: string): Promise<{ code: string; expiresAt: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const code = `CDA-${Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("")}`;
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString();
  await rest("link_codes", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify({ code, customer_id: customerId, expires_at: expiresAt }),
  });
  return { code, expiresAt };
}

export type RedeemResult =
  | { ok: true; customer: Customer; profile: Profile }
  | { ok: false; reason: "unknown_code" | "expired" | "already_used" };

/** Turns a code sent from a channel into a verified link for that channel. */
export async function redeemLinkCode(rawCode: string, identity: Identity): Promise<RedeemResult> {
  const code = rawCode.trim().toUpperCase().replace(/\s+/g, "");
  const rows = await rest<{ code: string; customer_id: string; expires_at: string; used_at: string | null }[]>(
    `link_codes?code=eq.${q(code)}&select=code,customer_id,expires_at,used_at&limit=1`,
  );
  const row = rows[0];
  if (!row) return { ok: false, reason: "unknown_code" };
  if (row.used_at) return { ok: false, reason: "already_used" };
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, reason: "expired" };

  // That channel may already belong to an anonymous record created while they were chatting.
  // Move its notes over and drop it, so nothing they told us before the link is lost.
  const existing = await findByChannel(identity);
  if (existing && existing.customer.id !== row.customer_id) {
    const owners = await rest<{ id: string; auth_user_id: string | null }[]>(
      `customers?id=eq.${q(existing.customer.id)}&select=id,auth_user_id&limit=1`,
    );
    if (owners[0] && !owners[0].auth_user_id) {
      await rest(`customer_notes?customer_id=eq.${q(existing.customer.id)}`, {
        method: "PATCH",
        prefer: "return=minimal",
        body: JSON.stringify({ customer_id: row.customer_id }),
      });
      await rest(`customer_conversations?customer_id=eq.${q(existing.customer.id)}`, {
        method: "PATCH",
        prefer: "return=minimal",
        body: JSON.stringify({ customer_id: row.customer_id }),
      });
      await rest(`customers?id=eq.${q(existing.customer.id)}`, { method: "DELETE", prefer: "return=minimal" });
    }
  }

  await attachChannel(row.customer_id, identity, true);
  await rest(`link_codes?code=eq.${q(code)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify({
      used_at: new Date().toISOString(),
      used_channel: identity.channel,
      used_key: identity.key,
    }),
  });

  const customers = await rest<Customer[]>(`customers?id=eq.${q(row.customer_id)}&select=id,name&limit=1`);
  const customer = customers[0];
  return { ok: true, customer, profile: await profileFor(customer) };
}

// --- the memory itself -------------------------------------------------------------------------

/** Lets the post-call webhook file its note against the right customer. */
export async function rememberConversation(conversationId: string, customerId: string, channel: Channel) {
  if (!conversationId) return;
  await rest("customer_conversations?on_conflict=conversation_id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify({ conversation_id: conversationId, customer_id: customerId, channel }),
  });
}

/** Returns false when the conversation was never tied to a customer, which is normal. */
export async function addNote(conversationId: string, summary: string): Promise<boolean> {
  const rows = await rest<{ customer_id: string; channel: string | null }[]>(
    `customer_conversations?conversation_id=eq.${q(conversationId)}&select=customer_id,channel&limit=1`,
  );
  const link = rows[0];
  if (!link) return false;
  await rest("customer_notes", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify({ customer_id: link.customer_id, channel: link.channel, summary }),
  });
  return true;
}
