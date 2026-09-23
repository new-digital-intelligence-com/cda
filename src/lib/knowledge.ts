// Knowledge gaps: Ellie learns from the questions she could not answer, under staff control.
//
//   conversation ends → ElevenLabs' post-call analysis fills "unanswered_question" → post-call
//   webhook → knowledge_gaps → /admin "Knowledge" tab: Claude groups repeats and suggests wording
//   → staff edit and approve → knowledge_faq → published to Ellie as one document,
//   "CDA approved FAQ", which is always in her context (usage mode "prompt")
//
// Nothing reaches Ellie without a staff member approving it. Claude's suggestion is only a starting
// point: where it would need a CDA fact it cannot know, it writes [check: …], and an answer still
// holding such a marker cannot be approved.

import { anthropicConfigured, askClaude, parseJsonObject } from "./anthropic";
import { supabaseRest as rest } from "./supabase";

const q = encodeURIComponent;
const API = "https://api.elevenlabs.io/v1/convai";
export const DOC_NAME = "CDA approved FAQ";
/** Ellie's live branch ("Main", 100% of traffic). */
const BRANCH_ID = process.env.ELEVENLABS_BRANCH_ID || "agtbrch_9301m2p375xzetbbsyymxnbnsf1s";
const MAX_GAPS_PER_CONVERSATION = 5;
const MAX_QUESTION = 300;
const MAX_ANSWER = 1_500;
/** Ellie's other documents; far fewer on the agent means something is wrong, so nothing is changed. */
const MIN_OTHER_DOCUMENTS = 5;

export type Gap = { id: number; conversation_id: string | null; channel: string | null; question: string; created_at: string };
export type Faq = { id: number; question: string; answer: string; approved_by: string | null; updated_at: string };
export type Published = { document_id: string | null; entries: number; published_at: string | null };
export type GapGroup = { question: string; answer: string; ids: number[] };

export const UNFINISHED = /\[check/i;

// --- from the post-call webhook ------------------------------------------------------------------

/** "Q1 | Q2" from ElevenLabs' analysis → one row per question. Empty and filler values are ignored. */
export function splitQuestions(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return [
    ...new Set(
      value
        .split("|")
        .map((question) => question.trim().replace(/\s+/g, " "))
        .filter((question) => question.length >= 6 && !/^(none|n\/a|null|nothing|no questions?)\.?$/i.test(question))
        .map((question) => question.slice(0, MAX_QUESTION)),
    ),
  ].slice(0, MAX_GAPS_PER_CONVERSATION);
}

/** Which channel a conversation came from, for the admin page. Null when it cannot be told. */
async function conversationChannel(conversationId: string, isPhoneCall: boolean): Promise<string | null> {
  if (/_tg_\d+$/.test(conversationId)) return "telegram";
  if (isPhoneCall) return "phone";
  const rows = await rest<{ channel: string | null }[]>(
    `customer_conversations?conversation_id=eq.${q(conversationId)}&select=channel&limit=1`,
  );
  return rows[0]?.channel ?? null;
}

export async function recordGaps(conversationId: string, value: unknown, isPhoneCall = false): Promise<number> {
  const questions = splitQuestions(value);
  if (!questions.length) return 0;
  const channel = await conversationChannel(conversationId, isPhoneCall).catch(() => null);
  await rest("knowledge_gaps?on_conflict=conversation_id,question", {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=minimal",
    body: JSON.stringify(questions.map((question) => ({ conversation_id: conversationId, channel, question }))),
  });
  return questions.length;
}

// --- what the admin page shows ------------------------------------------------------------------

export async function knowledgeState(): Promise<{ gaps: Gap[]; faq: Faq[]; published: Published }> {
  const [gaps, faq, published] = await Promise.all([
    rest<Gap[]>("knowledge_gaps?status=eq.open&select=id,conversation_id,channel,question,created_at&order=created_at.desc&limit=200"),
    rest<Faq[]>("knowledge_faq?select=id,question,answer,approved_by,updated_at&order=id.asc"),
    rest<Published[]>("knowledge_publish?id=eq.1&select=document_id,entries,published_at"),
  ]);
  return { gaps, faq, published: published[0] ?? { document_id: null, entries: 0, published_at: null } };
}

const GROUP_SYSTEM = `You help CDA customer care staff (CDA: UK kitchen appliance brand) improve their virtual assistant.
You get questions customers asked that the assistant could not answer, each with an id.
Group the questions that ask the same thing. For each group:
- "question": the question once, clear and general, in British English, no personal details
- "answer": a suggested answer of 1 to 3 sentences for staff to check. Never invent CDA-specific facts
  (prices, policies, phone numbers, opening hours, model details, delivery areas, availability, dates),
  and never say whether CDA does or does not offer something: you do not know. Wherever such a fact is
  needed, write [check: what staff must confirm] in its place. If the whole answer depends on it, the
  answer is only the [check: …].
- "ids": the ids of every question in the group
Most asked first. Reply with JSON only: {"groups":[{"question":"...","answer":"...","ids":[1,2]}]}`;

/** Claude groups repeated questions and suggests wording. Nothing is stored: staff decide. */
export async function groupGaps(gaps: Gap[]): Promise<GapGroup[]> {
  if (!gaps.length) return [];
  if (!anthropicConfigured()) return gaps.map((gap) => ({ question: gap.question, answer: "", ids: [gap.id] }));
  const known = new Set(gaps.map((gap) => gap.id));
  const text = await askClaude({
    system: GROUP_SYSTEM,
    prompt: gaps.slice(0, 80).map((gap) => `${gap.id}: ${gap.question}`).join("\n"),
    maxTokens: 3_000,
  });
  const parsed = parseJsonObject<{ groups?: { question?: unknown; answer?: unknown; ids?: unknown }[] }>(text);
  const groups: GapGroup[] = [];
  const placed = new Set<number>();
  for (const group of parsed?.groups ?? []) {
    const ids = (Array.isArray(group.ids) ? group.ids : []).map(Number).filter((id) => known.has(id) && !placed.has(id));
    if (!ids.length || typeof group.question !== "string") continue;
    ids.forEach((id) => placed.add(id));
    groups.push({
      question: group.question.trim().slice(0, MAX_QUESTION),
      answer: typeof group.answer === "string" ? group.answer.trim().slice(0, MAX_ANSWER) : "",
      ids,
    });
  }
  // Anything Claude left out is still shown, on its own.
  for (const gap of gaps) if (!placed.has(gap.id)) groups.push({ question: gap.question, answer: "", ids: [gap.id] });
  return groups;
}

// --- what staff decide ----------------------------------------------------------------------------

function clean(question: unknown, answer: unknown): { question: string; answer: string } | string {
  const q1 = typeof question === "string" ? question.trim().slice(0, MAX_QUESTION) : "";
  const a1 = typeof answer === "string" ? answer.trim().slice(0, MAX_ANSWER) : "";
  if (q1.length < 6) return "Write the question.";
  if (a1.length < 2) return "Write the answer Ellie should give.";
  if (UNFINISHED.test(a1)) return "Replace every [check: …] with the real fact before approving.";
  return { question: q1, answer: a1 };
}

const ids = (value: unknown): number[] =>
  (Array.isArray(value) ? value : []).map(Number).filter((id) => Number.isInteger(id) && id > 0).slice(0, 200);

/** Approves an answer (for some gaps, or on its own) and publishes the document. Error text or null. */
export async function approve(input: { question: unknown; answer: unknown; gapIds?: unknown; approvedBy?: string | null }): Promise<string | null> {
  const entry = clean(input.question, input.answer);
  if (typeof entry === "string") return entry;
  const [faq] = await rest<Faq[]>("knowledge_faq", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({ ...entry, approved_by: input.approvedBy ?? null }),
  });
  const gapIds = ids(input.gapIds);
  if (gapIds.length) {
    await rest(`knowledge_gaps?id=in.(${gapIds.join(",")})`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ status: "answered", faq_id: faq.id }),
    });
  }
  await publish();
  return null;
}

export async function dismiss(gapIds: unknown): Promise<void> {
  const list = ids(gapIds);
  if (!list.length) return;
  await rest(`knowledge_gaps?id=in.(${list.join(",")})`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify({ status: "dismissed" }),
  });
}

export async function updateFaq(id: unknown, question: unknown, answer: unknown): Promise<string | null> {
  const entry = clean(question, answer);
  if (typeof entry === "string") return entry;
  await rest(`knowledge_faq?id=eq.${Number(id)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify({ ...entry, updated_at: new Date().toISOString() }),
  });
  await publish();
  return null;
}

export async function deleteFaq(id: unknown): Promise<void> {
  await rest(`knowledge_faq?id=eq.${Number(id)}`, { method: "DELETE", prefer: "return=minimal" });
  await publish();
}

// --- publishing to Ellie ------------------------------------------------------------------------------

type KnowledgeRef = { type: string; name: string; id: string; usage_mode?: string };

function apiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key || !process.env.ELEVENLABS_AGENT_ID) throw new Error("ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID must be set");
  return key;
}

async function elevenLabs<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { "xi-api-key": apiKey(), "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`ElevenLabs ${init.method ?? "GET"} ${path} failed with ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const body = await response.text();
  return (body ? JSON.parse(body) : undefined) as T;
}

function documentText(entries: Faq[]): string {
  return [
    `${DOC_NAME}`,
    "",
    "Answers written and approved by CDA customer care staff for questions customers asked.",
    "They are correct and current: when a customer asks one of these questions, give this answer.",
    "",
    ...entries.flatMap((entry) => [`Q: ${entry.question}`, `A: ${entry.answer}`, ""]),
  ].join("\n");
}

/**
 * Rebuilds the document from every approved answer and swaps it in on Ellie: a new document is
 * created, the agent's list gets it in place of the old one, and the old one is deleted. Only the
 * entry named "CDA approved FAQ" is touched; Ellie's other documents are kept exactly as they are.
 */
export async function publish(): Promise<Published> {
  const entries = await rest<Faq[]>("knowledge_faq?select=id,question,answer,approved_by,updated_at&order=id.asc");
  const agentPath = `/agents/${process.env.ELEVENLABS_AGENT_ID}?branch_id=${BRANCH_ID}`;
  const agent = await elevenLabs<{ conversation_config: { agent: { prompt: { knowledge_base?: KnowledgeRef[] } } } }>(agentPath);
  const current = agent.conversation_config.agent.prompt.knowledge_base ?? [];
  const others = current.filter((doc) => doc.name !== DOC_NAME);
  const old = current.filter((doc) => doc.name === DOC_NAME);
  if (others.length < MIN_OTHER_DOCUMENTS) throw new Error(`Ellie has only ${others.length} other documents; not changing her knowledge`);

  let documentId: string | null = null;
  if (entries.length) {
    const created = await elevenLabs<{ id: string }>("/knowledge-base/text", {
      method: "POST",
      body: JSON.stringify({ text: documentText(entries), name: DOC_NAME }),
    });
    documentId = created.id;
  }

  // Always in Ellie's context ("prompt"), so an approved answer works in the very next conversation
  // without waiting for search indexing. The document stays small: one line per answer.
  const next = documentId ? [...others, { type: "text", name: DOC_NAME, id: documentId, usage_mode: "prompt" }] : others;
  await elevenLabs(agentPath, {
    method: "PATCH",
    body: JSON.stringify({ conversation_config: { agent: { prompt: { knowledge_base: next } } } }),
  });

  for (const doc of old) {
    await elevenLabs(`/knowledge-base/${q(doc.id)}`, { method: "DELETE" }).catch((error) =>
      console.error("old FAQ document could not be deleted", doc.id, error),
    );
  }

  const published: Published = { document_id: documentId, entries: entries.length, published_at: new Date().toISOString() };
  await rest("knowledge_publish?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify({ id: 1, ...published }),
  });
  return published;
}
