// Customer memory shared by every channel. Tables live in Supabase (see supabase/schema.sql)
// and are reached over its REST API, so no extra npm package is needed.
//
// The email address is the bridge: each channel key (Telegram chat id, Instagram sender id,
// website cookie, ...) points at one customer row, and that row is found by email.

export const CHANNELS = ["telegram", "instagram", "email", "website", "slack"] as const;
export type Channel = (typeof CHANNELS)[number];

export type Customer = { id: string; email: string; name: string | null };
export type Identity = { channel: Channel; key: string };

/** What the agent is told about a customer. Deliberately no email, address or order details. */
export type Profile = { name: string | null; channels: Channel[]; recent: string[] };

function credentials() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
  }
  return { url: url.replace(/\/+$/, ""), key };
}

export function customerStoreConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function rest<T>(path: string, init: RequestInit & { prefer?: string } = {}): Promise<T> {
  const { url, key } = credentials();
  const { prefer, ...rest } = init;
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...rest,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Supabase ${path} failed with ${response.status}: ${await response.text()}`);
  }
  // `return=minimal` answers 201 with an empty body, which response.json() would choke on.
  const body = await response.text();
  return (body ? JSON.parse(body) : undefined) as T;
}

const q = encodeURIComponent;

/** Loose on purpose: this only rejects obvious rubbish, it does not police valid addresses. */
export function normaliseEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const email = input.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * The agent sends every identifier it might have; only the current channel's one is filled in,
 * because dynamic variables like {{integration__telegram_chat_id}} are empty on other channels.
 */
export function identityFrom(body: Record<string, unknown>): Identity | null {
  const explicit = text(body.channel);
  const explicitKey = text(body.channel_key);
  if (explicit && explicitKey && (CHANNELS as readonly string[]).includes(explicit)) {
    return { channel: explicit as Channel, key: explicitKey };
  }

  const candidates: Identity[] = [
    { channel: "telegram", key: text(body.telegram_chat_id) },
    { channel: "instagram", key: text(body.instagram_id) },
    { channel: "website", key: text(body.website_id) },
    { channel: "slack", key: text(body.slack_user_id) },
    // On email the address itself is the key, so that channel never needs a question.
    { channel: "email", key: normaliseEmail(body.email_address) ?? "" },
  ];
  return candidates.find((candidate) => candidate.key !== "") ?? null;
}

export async function findByChannel({ channel, key }: Identity): Promise<Customer | null> {
  const rows = await rest<{ customers: Customer | Customer[] | null }[]>(
    `customer_channels?channel=eq.${q(channel)}&channel_key=eq.${q(key)}&select=customers(id,email,name)&limit=1`,
  );
  // PostgREST returns an embedded row as an object, but older versions wrap it in an array.
  const embedded = rows[0]?.customers;
  return (Array.isArray(embedded) ? embedded[0] : embedded) ?? null;
}

export async function findByEmail(email: string): Promise<Customer | null> {
  const rows = await rest<Customer[]>(`customers?email=eq.${q(email)}&select=id,email,name&limit=1`);
  return rows[0] ?? null;
}

/** Creates the customer if the email is new, then points this channel key at them. */
export async function linkChannel(identity: Identity, email: string, name?: string): Promise<Customer> {
  // Sending `name` only when we have one keeps an earlier name instead of overwriting it with null.
  const [customer] = await rest<Customer[]>("customers?on_conflict=email&select=id,email,name", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: JSON.stringify(name ? { email, name } : { email }),
  });
  await rest("customer_channels?on_conflict=channel,channel_key", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify({ channel: identity.channel, channel_key: identity.key, customer_id: customer.id }),
  });
  return customer;
}

export async function profileFor(customer: Customer): Promise<Profile> {
  const [channels, notes] = await Promise.all([
    rest<{ channel: Channel }[]>(`customer_channels?customer_id=eq.${q(customer.id)}&select=channel`),
    rest<{ summary: string }[]>(
      `customer_notes?customer_id=eq.${q(customer.id)}&select=summary&order=created_at.desc&limit=3`,
    ),
  ]);
  return {
    name: customer.name,
    channels: [...new Set(channels.map((row) => row.channel))],
    recent: notes.map((note) => note.summary),
  };
}

/** Lets the post-call webhook file its note against the right customer. */
export async function rememberConversation(conversationId: string, customer: Customer, channel: Channel) {
  if (!conversationId) return;
  await rest("customer_conversations?on_conflict=conversation_id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify({ conversation_id: conversationId, customer_id: customer.id, channel }),
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
