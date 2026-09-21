import { hasValidToolSecret } from "@/lib/agentAuth";
import {
  customerForChannel,
  customerForConversation,
  customerStoreConfigured,
  mayBeRegisteredLate,
  profileFor,
  rememberConversation,
  resolveIdentity,
  type Profile,
} from "@/lib/customers";

const LATE_REGISTRATION_CHECKS = 3;
const LATE_REGISTRATION_WAIT_MS = 400;

/** Only say "found" when there is something worth saying, not merely that a row exists. */
function answer(profile: Profile) {
  return Response.json({ found: Boolean(profile.name) || profile.recent.length > 0, ...profile });
}

// Tool `customer_lookup`: Ellie calls this silently at the start of every conversation.
//
// Anything that goes wrong answers "not found" with status 200 on purpose: a customer must never
// see an error because a lookup failed. Problems are logged for us instead.
export async function POST(request: Request) {
  if (!(await hasValidToolSecret(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!customerStoreConfigured()) {
      console.error("customer-lookup: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
      return Response.json({ found: false });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const conversationId = typeof body.conversation_id === "string" ? body.conversation_id : "";

    // Website chat, voice and the avatar registered themselves when their session was created.
    const registered = await customerForConversation(conversationId);
    if (registered) return answer(await profileFor(registered));

    const identity = await resolveIdentity(body);
    if (!identity) {
      // An email is registered a moment after Ellie receives it, so give that a second to land.
      for (let attempt = 0; attempt < LATE_REGISTRATION_CHECKS && mayBeRegisteredLate(conversationId); attempt++) {
        await new Promise((resolve) => setTimeout(resolve, LATE_REGISTRATION_WAIT_MS));
        const late = await customerForConversation(conversationId);
        if (late) return answer(await profileFor(late));
      }
      return Response.json({ found: false });
    }

    // First time on this channel: remember it anyway, so the next conversation on the same channel
    // picks up where this one left off. An email address comes from the email itself (the Gmail
    // message or the Freshdesk ticket), which is taken as proof; a Telegram chat id proves nothing
    // until they link it with a code.
    const customer = await customerForChannel(identity, identity.channel === "email");
    await rememberConversation(conversationId, customer.id, identity.channel);

    return answer(await profileFor(customer));
  } catch (error) {
    console.error("customer-lookup failed", error);
    return Response.json({ found: false });
  }
}
