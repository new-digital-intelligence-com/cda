"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// Ellie learns from the questions she could not answer. They arrive here after each conversation
// (ElevenLabs' post-call analysis); Claude can group repeats and suggest wording; staff write or fix
// the answer and approve it, and it is published to Ellie as "CDA approved FAQ" straight away.

type Gap = { id: number; conversation_id: string | null; channel: string | null; question: string; created_at: string };
type Faq = { id: number; question: string; answer: string; approved_by: string | null; updated_at: string };
type Published = { document_id: string | null; entries: number; published_at: string | null };
type Group = { question: string; answer: string; ids: number[] };
type State = { gaps: Gap[]; faq: Faq[]; published: Published };

const CHANNELS: Record<string, string> = {
  website: "Website",
  telegram: "Telegram",
  email: "Email",
  instagram: "Instagram",
  messenger: "Messenger",
  phone: "Phone",
  alexa: "Alexa",
};

const UNFINISHED = /\[check/i;

const when = (iso: string) =>
  new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const keyOf = (group: Group) => group.ids.join("-");

export function KnowledgePanel({ staffToken, onSignOut }: { staffToken: string; onSignOut: () => void }) {
  const [state, setState] = useState<State | null>(null);
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { question: string; answer: string }>>({});
  const [editing, setEditing] = useState<Record<number, { question: string; answer: string }>>({});
  const [manual, setManual] = useState({ question: "", answer: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const call = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const response = await fetch(path, {
        ...init,
        headers: { "x-aida-staff": staffToken, "Content-Type": "application/json" },
      });
      if (response.status === 401) {
        onSignOut();
        return null;
      }
      const body = (await response.json().catch(() => ({}))) as Partial<State> & { groups?: Group[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Something went wrong. Please try again.");
      return body;
    },
    [staffToken, onSignOut],
  );

  const load = useCallback(async () => {
    try {
      const body = await call("/api/admin/knowledge");
      if (body?.gaps && body.faq && body.published) setState({ gaps: body.gaps, faq: body.faq, published: body.published });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the knowledge gaps.");
    }
  }, [call]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  /** Change something, then show the fresh state the server sends back. */
  async function change(label: string, payload: object, done?: string) {
    setBusy(label);
    setError(null);
    setNotice(null);
    try {
      const body = await call("/api/admin/knowledge", { method: "POST", body: JSON.stringify(payload) });
      if (body?.gaps && body.faq && body.published) {
        setState({ gaps: body.gaps, faq: body.faq, published: body.published });
        const open = new Set(body.gaps.map((gap) => gap.id));
        setGroups((current) => current?.map((group) => ({ ...group, ids: group.ids.filter((id) => open.has(id)) })).filter((group) => group.ids.length) ?? null);
        if (done) setNotice(done);
        return true;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
    return false;
  }

  async function group() {
    setBusy("group");
    setError(null);
    try {
      const body = await call("/api/admin/knowledge/group", { method: "POST" });
      if (body?.groups) {
        setGroups(body.groups);
        setDrafts({});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Claude could not group the questions.");
    } finally {
      setBusy(null);
    }
  }

  const gapsById = useMemo(() => new Map((state?.gaps ?? []).map((gap) => [gap.id, gap])), [state]);
  // Before Claude has grouped them, every question is its own card.
  const cards: Group[] = groups ?? (state?.gaps ?? []).map((gap) => ({ question: gap.question, answer: "", ids: [gap.id] }));

  if (!state) {
    return <p className="text-sm text-cda-text">{error ?? "Loading…"}</p>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="flex items-start justify-between gap-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-cda-red-dark">
          {error}
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss">
            ✕
          </button>
        </p>
      )}
      {notice && <p className="rounded-xl bg-green-50 px-4 py-2 text-sm text-green-800">{notice}</p>}

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-cda-dark">Ellie learns from what she could not answer</h2>
            <p className="mt-1 text-sm text-cda-text">
              After every conversation, on every channel, the questions Ellie could not answer from her knowledge appear
              below. Write the right answer and approve it: Ellie uses it from her next conversation on. Nothing reaches her
              without your approval.
            </p>
          </div>
          <button type="button" onClick={() => void load()} className="text-xs text-cda-text underline">
            Refresh
          </button>
        </div>
        <p className="mt-3 rounded-lg bg-cda-grey-light px-3 py-2 text-xs text-cda-dark">
          📚 <strong>CDA approved FAQ</strong> in Ellie&apos;s knowledge: {state.published.entries} answer
          {state.published.entries === 1 ? "" : "s"}
          {state.published.published_at ? ` · published ${when(state.published.published_at)}` : " · not published yet"}
          {state.faq.length !== state.published.entries && (
            <button
              type="button"
              onClick={() => void change("publish", { action: "publish" }, "Published to Ellie.")}
              disabled={busy !== null}
              className="ml-2 font-semibold text-cda-red underline"
            >
              Publish again
            </button>
          )}
        </p>
      </section>

      <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-cda-dark">Questions Ellie could not answer ({state.gaps.length})</h2>
          {state.gaps.length > 1 && (
            <button
              type="button"
              onClick={() => void group()}
              disabled={busy !== null}
              className="rounded-full bg-cda-dark px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy === "group" ? "Claude is reading…" : "✨ Group and suggest answers"}
            </button>
          )}
        </div>
        {cards.length === 0 && (
          <p className="text-sm text-cda-text">Nothing open. New questions appear here a minute after a conversation ends.</p>
        )}

        {cards.map((card) => {
          const key = keyOf(card);
          const draft = drafts[key] ?? { question: card.question, answer: card.answer };
          const asked = card.ids.map((id) => gapsById.get(id)).filter((gap): gap is Gap => Boolean(gap));
          const channels = [...new Set(asked.map((gap) => (gap.channel ? CHANNELS[gap.channel] ?? gap.channel : "Unknown")))];
          const latest = asked.map((gap) => gap.created_at).sort().at(-1);
          const unfinished = UNFINISHED.test(draft.answer);
          const setDraft = (field: "question" | "answer", value: string) =>
            setDrafts((current) => ({ ...current, [key]: { ...draft, [field]: value } }));
          return (
            <div key={key} className="space-y-2 rounded-lg border border-cda-grey p-3">
              <p className="text-xs text-cda-text">
                Asked {card.ids.length} time{card.ids.length === 1 ? "" : "s"} · {channels.join(", ")}
                {latest ? ` · last ${when(latest)}` : ""}
                {card.ids.length > 1 && asked.length > 0 && (
                  <span className="block italic">“{asked.map((gap) => gap.question).join("” · “")}”</span>
                )}
              </p>
              <input
                value={draft.question}
                onChange={(event) => setDraft("question", event.target.value)}
                className="w-full rounded-lg border border-cda-grey px-3 py-2 text-sm font-semibold"
              />
              <textarea
                value={draft.answer}
                onChange={(event) => setDraft("answer", event.target.value)}
                placeholder="The answer Ellie should give…"
                rows={3}
                className="w-full rounded-lg border border-cda-grey px-3 py-2 text-sm"
              />
              {unfinished && <p className="text-xs text-cda-red">Replace every [check: …] with the real fact before approving.</p>}
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => void change(`dismiss-${key}`, { action: "dismiss", gapIds: card.ids })}
                  disabled={busy !== null}
                  className="rounded-full border border-cda-grey px-4 py-1.5 text-xs font-semibold text-cda-text disabled:opacity-50"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void change(
                      `approve-${key}`,
                      { action: "approve", question: draft.question, answer: draft.answer, gapIds: card.ids },
                      "Approved. Ellie uses this answer from her next conversation.",
                    )
                  }
                  disabled={busy !== null || !draft.answer.trim() || unfinished}
                  className="rounded-full bg-cda-red px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {busy === `approve-${key}` ? "Teaching Ellie…" : "Approve and teach Ellie"}
                </button>
              </div>
            </div>
          );
        })}
      </section>

      <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-cda-dark">Approved answers ({state.faq.length})</h2>
        {state.faq.length === 0 && <p className="text-sm text-cda-text">None yet.</p>}
        {state.faq.map((entry) => {
          const edit = editing[entry.id];
          return (
            <div key={entry.id} className="space-y-1 rounded-lg bg-cda-grey-light p-3 text-sm">
              {edit ? (
                <>
                  <input
                    value={edit.question}
                    onChange={(event) => setEditing((current) => ({ ...current, [entry.id]: { ...edit, question: event.target.value } }))}
                    className="w-full rounded-lg border border-cda-grey px-3 py-2 text-sm font-semibold"
                  />
                  <textarea
                    value={edit.answer}
                    onChange={(event) => setEditing((current) => ({ ...current, [entry.id]: { ...edit, answer: event.target.value } }))}
                    rows={3}
                    className="w-full rounded-lg border border-cda-grey px-3 py-2 text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing((current) => {
                        const next = { ...current };
                        delete next[entry.id];
                        return next;
                      })}
                      className="text-xs text-cda-text underline"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={async () => {
                        const saved = await change(`update-${entry.id}`, { action: "update", id: entry.id, ...edit }, "Updated. Ellie uses the new wording now.");
                        if (saved) setEditing((current) => {
                          const next = { ...current };
                          delete next[entry.id];
                          return next;
                        });
                      }}
                      className="rounded-full bg-cda-red px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="font-semibold text-cda-dark">{entry.question}</p>
                  <p className="whitespace-pre-wrap text-cda-dark">{entry.answer}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-cda-text">
                    <span>
                      {entry.approved_by ? `Approved by ${entry.approved_by} · ` : ""}
                      {when(entry.updated_at)}
                    </span>
                    <span className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setEditing((current) => ({ ...current, [entry.id]: { question: entry.question, answer: entry.answer } }))}
                        className="underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => void change(`delete-${entry.id}`, { action: "delete", id: entry.id }, "Removed from Ellie's knowledge.")}
                        className="text-cda-red underline"
                      >
                        Delete
                      </button>
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        })}

        <details className="rounded-lg border border-dashed border-cda-grey p-3">
          <summary className="cursor-pointer text-sm font-semibold text-cda-dark">+ Add an answer yourself</summary>
          <div className="mt-2 space-y-2">
            <input
              value={manual.question}
              onChange={(event) => setManual((current) => ({ ...current, question: event.target.value }))}
              placeholder="Question, e.g. Do CDA ovens come with a plug fitted?"
              className="w-full rounded-lg border border-cda-grey px-3 py-2 text-sm"
            />
            <textarea
              value={manual.answer}
              onChange={(event) => setManual((current) => ({ ...current, answer: event.target.value }))}
              placeholder="The answer Ellie should give"
              rows={3}
              className="w-full rounded-lg border border-cda-grey px-3 py-2 text-sm"
            />
            <div className="flex justify-end">
              <button
                type="button"
                disabled={busy !== null || !manual.question.trim() || !manual.answer.trim()}
                onClick={async () => {
                  const saved = await change("add", { action: "add", ...manual }, "Added. Ellie uses this answer from her next conversation.");
                  if (saved) setManual({ question: "", answer: "" });
                }}
                className="rounded-full bg-cda-red px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                Add and teach Ellie
              </button>
            </div>
          </div>
        </details>
      </section>
    </div>
  );
}
