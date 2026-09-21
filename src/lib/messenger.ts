// Facebook Messenger for the "New Digital Intelligence" Page, handled by the web app rather than
// Make.com (Make's free plan allows two active scenarios, and Instagram uses both):
//
//   customer message → Meta webhook → /api/messenger/webhook → Ellie via her "CDA Messenger" Custom Channel
//   Ellie's answer   → /api/messenger/reply → Messenger Send API
//
// A person's messages continue the same ElevenLabs conversation for 10 minutes, like Instagram.
// Supabase keeps one row per person (messenger_threads): which conversation they are in and the
// last reply sent, so a repeated delivery never sends twice. No message text is stored.

import { customerForChannel, rememberConversation } from "./customers";
import { plainReply } from "./emailParse";
import { supabaseConfigured, supabaseRest as rest } from "./supabase";

const GRAPH = "https://graph.facebook.com/v25.0";
/** A new message within this time continues the same conversation. */
const CONTINUE_MS = 10 * 60_000;
/** Ties Ellie's answer back to the person: ElevenLabs returns it in user_message_ids. */
const MESSAGE_ID_PREFIX = "msgr|";
/** Messenger's limit for one text message. */
const MAX_TEXT = 2000;

const q = encodeURIComponent;

export function messengerConfigured(): boolean {
  return Boolean(
    supabaseConfigured() &&
      process.env.MESSENGER_PAGE_TOKEN &&
      process.env.MESSENGER_PAGE_ID &&
      process.env.MESSENGER_CHANNEL_INBOUND_URL &&
      process.env.MESSENGER_CHANNEL_INBOUND_SECRET,
  );
}

type Thread = { psid: string; conversation_id: string | null; updated_at: string; last_reply: string | null };

async function graph(path: string, body: unknown) {
  const response = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.MESSENGER_PAGE_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Messenger ${path} failed with ${response.status}: ${(await response.text()).slice(0, 300)}`);
}

/** The person's name, asked once when they first write, so Ellie can greet them. Best effort. */
async function senderName(psid: string): Promise<string | undefined> {
  try {
    const response = await fetch(`${GRAPH}/${q(psid)}?fields=first_name,last_name`, {
      headers: { Authorization: `Bearer ${process.env.MESSENGER_PAGE_TOKEN}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return undefined;
    const body = (await response.json()) as { first_name?: string; last_name?: string };
    return [body.first_name, body.last_name].filter(Boolean).join(" ") || undefined;
  } catch {
    return undefined;
  }
}

// --- a message from Messenger ------------------------------------------------------------------

type MessagingEvent = {
  sender?: { id?: string };
  message?: { mid?: string; text?: string; is_echo?: boolean; attachments?: unknown[] };
};
export type MessengerWebhook = { object?: string; entry?: { messaging?: MessagingEvent[] }[] };

async function sendToEllie(psid: string, mid: string, text: string, conversationId: string | null): Promise<string> {
  const response = await fetch(process.env.MESSENGER_CHANNEL_INBOUND_URL ?? "", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Webhook-Secret": process.env.MESSENGER_CHANNEL_INBOUND_SECRET ?? "" },
    body: JSON.stringify({
      data: { type: "user_message", text: text.slice(0, 4000), user_identifier: psid },
      user_message_id: `${MESSAGE_ID_PREFIX}${psid}|${mid}`,
      ...(conversationId ? { conversation_id: conversationId } : {}),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await response.json().catch(() => ({}))) as { conversation_id?: string };
  if (!response.ok || !body.conversation_id) throw new Error(`Messenger Custom Channel inbound failed with ${response.status}`);
  return body.conversation_id;
}

async function passToEllie(psid: string, mid: string, text: string) {
  // "…" in Messenger while Ellie writes. Cosmetic, so a failure is ignored.
  void graph("me/messages", { recipient: { id: psid }, sender_action: "typing_on" }).catch(() => {});

  const [thread] = await rest<Thread[]>(`messenger_threads?psid=eq.${q(psid)}&select=*`);
  const customer = await customerForChannel({ channel: "messenger", key: psid, name: thread ? undefined : await senderName(psid) }, false);

  const continueId =
    thread?.conversation_id && Date.now() - new Date(thread.updated_at).getTime() < CONTINUE_MS ? thread.conversation_id : null;
  let conversationId: string;
  try {
    conversationId = await sendToEllie(psid, mid, text, continueId);
  } catch (error) {
    // A conversation ElevenLabs will not continue any more: start a new one instead.
    if (!continueId) throw error;
    conversationId = await sendToEllie(psid, mid, text, null);
  }

  await Promise.all([
    rest("messenger_threads?on_conflict=psid", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: JSON.stringify({ psid, conversation_id: conversationId, updated_at: new Date().toISOString() }),
    }),
    rememberConversation(conversationId, customer.id, "messenger"),
  ]);
}

/** Handles every message in one webhook call. Our own Page's echoes and empty events are skipped. */
export async function handleMessengerWebhook(payload: MessengerWebhook): Promise<number> {
  if (payload.object !== "page") return 0;
  let handled = 0;
  for (const entry of payload.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const psid = event.sender?.id;
      const message = event.message;
      if (!psid || !message?.mid || message.is_echo || psid === process.env.MESSENGER_PAGE_ID) continue;
      const text =
        message.text?.trim() ||
        (message.attachments?.length ? "[The customer sent a photo or file, which you cannot see on Messenger.]" : "");
      if (!text) continue;
      try {
        await passToEllie(psid, message.mid, text);
        handled++;
      } catch (error) {
        console.error("Messenger message could not be passed to Ellie", error);
      }
    }
  }
  return handled;
}

// --- Ellie's answer ------------------------------------------------------------------------------

export type MessengerReply = {
  conversation_id?: string;
  user_message_ids?: string[];
  status?: string;
  data?: { type?: string; event?: { agent_response?: unknown; response_id?: unknown } }[];
};

/** Splits a long answer at paragraph breaks into Messenger-sized messages. */
function chunks(text: string): string[] {
  const parts: string[] = [];
  let current = "";
  for (const paragraph of text.split(/\n{2,}/)) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length <= MAX_TEXT) {
      current = next;
      continue;
    }
    if (current) parts.push(current);
    current = paragraph.length > MAX_TEXT ? paragraph.slice(0, MAX_TEXT) : paragraph;
  }
  if (current) parts.push(current);
  return parts;
}

/**
 * One call per turn. The row's last_reply is claimed before sending, so a repeated delivery of the
 * same answer stops here; if Messenger refuses, the claim is released and ElevenLabs' retry can
 * send it.
 */
export async function handleMessengerReply(payload: MessengerReply): Promise<{ outcome: string }> {
  let psid = payload.user_message_ids
    ?.find((id) => typeof id === "string" && id.startsWith(MESSAGE_ID_PREFIX))
    ?.slice(MESSAGE_ID_PREFIX.length)
    .split("|")[0];
  if (!psid && payload.conversation_id) {
    const [thread] = await rest<Thread[]>(`messenger_threads?conversation_id=eq.${q(payload.conversation_id)}&select=psid&limit=1`);
    psid = thread?.psid;
  }
  if (!psid) return { outcome: "not a Messenger conversation" };
  if (payload.status === "failed") {
    console.error("Ellie could not answer a Messenger message", payload.conversation_id);
    return { outcome: "failed" };
  }

  const answers = (payload.data ?? []).filter((item) => item.type === "agent_response");
  const text = plainReply(
    answers
      .map((item) => item.event?.agent_response)
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join("\n\n"),
  );
  if (!text) return { outcome: "no text in this turn" };

  const responseIds = answers.map((item) => String(item.event?.response_id ?? "")).join(".");
  const key = `${payload.conversation_id ?? ""}.${responseIds || (payload.user_message_ids ?? []).join(".")}`.replace(/[^\w.-]/g, "");

  await rest("messenger_threads?on_conflict=psid", {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=minimal",
    body: JSON.stringify({ psid, conversation_id: payload.conversation_id ?? null, updated_at: new Date().toISOString() }),
  });
  const claimed = await rest<Thread[]>(`messenger_threads?psid=eq.${q(psid)}&or=(last_reply.is.null,last_reply.neq.${key})`, {
    method: "PATCH",
    prefer: "return=representation",
    body: JSON.stringify({ last_reply: key, updated_at: new Date().toISOString() }),
  });
  if (!claimed.length) return { outcome: "already sent" };

  try {
    for (const part of chunks(text)) {
      await graph("me/messages", { recipient: { id: psid }, messaging_type: "RESPONSE", message: { text: part } });
    }
    return { outcome: "sent" };
  } catch (error) {
    await rest(`messenger_threads?psid=eq.${q(psid)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ last_reply: null }),
    }).catch(() => {});
    throw error;
  }
}
