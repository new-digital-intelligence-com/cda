import { whoIsAsking } from "@/lib/aidaAccess";

// Tells the customer page whether this browser is signed in to a CDA account, so a known customer
// is not asked for their name. Answers only about the person asking, from their own cookie.
export async function GET(request: Request) {
  const { account } = await whoIsAsking(request);
  return Response.json(account?.name ? { signedIn: true, name: account.name } : { signedIn: false });
}
