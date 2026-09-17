import { hasValidToolSecret } from "@/lib/agentAuth";
import {
  attachChannel,
  createCustomer,
  customerStoreConfigured,
  findByChannel,
  profileFor,
  rememberConversation,
  resolveIdentity,
} from "@/lib/customers";

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
    const identity = await resolveIdentity(body);
    if (!identity) return Response.json({ found: false });

    const known = await findByChannel(identity);
    let customer = known?.customer;

    if (!customer) {
      // First time on this channel. Remember it anyway so the next conversation on the same
      // channel picks up where this one left off. An email address arrives from the Freshdesk
      // ticket, which proves it; a Telegram chat id proves nothing until they link it.
      customer = await createCustomer(identity.name);
      await attachChannel(customer.id, identity, identity.channel === "email");
    }

    const conversationId = typeof body.conversation_id === "string" ? body.conversation_id : "";
    await rememberConversation(conversationId, customer.id, identity.channel);

    const profile = await profileFor(customer);
    // "found" means we have something worth saying, not merely that a row exists.
    const found = Boolean(profile.name) || profile.recent.length > 0;
    return Response.json({ found, ...profile });
  } catch (error) {
    console.error("customer-lookup failed", error);
    return Response.json({ found: false });
  }
}
