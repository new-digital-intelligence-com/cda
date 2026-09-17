import { hasValidToolSecret } from "@/lib/agentAuth";
import {
  customerStoreConfigured,
  findByChannel,
  linkChannel,
  profileFor,
  rememberConversation,
  resolveIdentity,
} from "@/lib/customers";

// Tool `customer_lookup`: Ellie calls this silently at the start of every conversation.
// It only reads, so a wrong guess can never overwrite anything.
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

    // On email the address itself is the key, so that channel identifies people with no question
    // at all — and creating the record here lets later channels match on the same address.
    const customer =
      (await findByChannel(identity)) ??
      (identity.channel === "email" ? await linkChannel(identity, identity.key, identity.name) : null);
    if (!customer) return Response.json({ found: false });

    const conversationId = typeof body.conversation_id === "string" ? body.conversation_id : "";
    await rememberConversation(conversationId, customer, identity.channel);

    return Response.json({ found: true, ...(await profileFor(customer)) });
  } catch (error) {
    console.error("customer-lookup failed", error);
    return Response.json({ found: false });
  }
}
