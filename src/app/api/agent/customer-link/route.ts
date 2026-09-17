import { hasValidToolSecret } from "@/lib/agentAuth";
import {
  customerStoreConfigured,
  identityFrom,
  linkChannel,
  normaliseEmail,
  profileFor,
  rememberConversation,
} from "@/lib/customers";

// Tool `customer_link`: called once, after someone gives their email address. This is the moment
// two channels become one person, so the reply already contains what they told us elsewhere.
export async function POST(request: Request) {
  if (!(await hasValidToolSecret(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!customerStoreConfigured()) {
      console.error("customer-link: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
      return Response.json({ ok: false, reason: "unavailable" });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const email = normaliseEmail(body.email);
    if (!email) return Response.json({ ok: false, reason: "invalid_email" });

    const identity = identityFrom(body);
    if (!identity) return Response.json({ ok: false, reason: "no_channel_key" });

    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 80) : undefined;
    const customer = await linkChannel(identity, email, name);

    const conversationId = typeof body.conversation_id === "string" ? body.conversation_id : "";
    await rememberConversation(conversationId, customer, identity.channel);

    return Response.json({ ok: true, ...(await profileFor(customer)) });
  } catch (error) {
    console.error("customer-link failed", error);
    return Response.json({ ok: false, reason: "unavailable" });
  }
}
