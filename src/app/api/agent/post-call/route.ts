import { hasValidWebhookSignature } from "@/lib/agentAuth";
import { addNote } from "@/lib/customers";

/** Notes are a reminder, not a transcript: one short line is enough for the next conversation. */
const MAX_NOTE_LENGTH = 400;

// ElevenLabs post-call webhook. It fires after every conversation on every channel, which is why
// the memory is written here instead of costing an extra tool call during the chat.
export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!(await hasValidWebhookSignature(rawBody, request.headers.get("elevenlabs-signature")))) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { type?: string; data?: { conversation_id?: string; analysis?: { transcript_summary?: string } } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json({ ok: true, ignored: "unreadable body" });
  }

  // Only the transcription event carries a summary; other event types are acknowledged and dropped.
  if (event.type !== "post_call_transcription") return Response.json({ ok: true, ignored: event.type });

  const conversationId = event.data?.conversation_id;
  const summary = event.data?.analysis?.transcript_summary?.trim();
  if (!conversationId || !summary) return Response.json({ ok: true, ignored: "no summary" });

  try {
    // False simply means nobody was identified in that conversation, which is the normal case.
    const saved = await addNote(conversationId, summary.slice(0, MAX_NOTE_LENGTH));
    return Response.json({ ok: true, saved });
  } catch (error) {
    console.error("post-call note failed", error);
    // 500 so ElevenLabs retries; the note is worth a second attempt.
    return Response.json({ error: "Could not store the note" }, { status: 500 });
  }
}
