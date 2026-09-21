import { hasValidWebhookSignature } from "@/lib/agentAuth";
import { handleMessengerReply, type MessengerReply } from "@/lib/messenger";

// The "Reply Webhook URL" of Ellie's "CDA Messenger" Custom Channel trigger: ElevenLabs posts her
// answer here, signed with that trigger's Outbound Signing Secret, and it goes out on Messenger.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("elevenlabs-signature");
  if (!(await hasValidWebhookSignature(rawBody, signature, process.env.MESSENGER_CHANNEL_SIGNING_SECRET))) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: MessengerReply;
  try {
    payload = JSON.parse(rawBody) as MessengerReply;
  } catch {
    return Response.json({ ok: true, ignored: "unreadable body" });
  }

  try {
    return Response.json({ ok: true, ...(await handleMessengerReply(payload)) });
  } catch (error) {
    // 500 so ElevenLabs delivers it again; the claim on the reply was released.
    console.error("messenger reply failed", error);
    return Response.json({ error: "The reply could not be sent" }, { status: 500 });
  }
}
