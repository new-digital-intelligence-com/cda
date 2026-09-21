import { secretMatches } from "@/lib/agentAuth";
import { emailChannelConfigured, processInbox, startInboxWatch } from "@/lib/emailInbox";
import { refreshInstagramToken } from "@/lib/instagram";
import { supabaseConfigured } from "@/lib/supabase";

// Vercel Cron, once a day (vercel.json), with `Authorization: Bearer <CRON_SECRET>`:
// - renews the Gmail watch (it stops after 7 days) and catches up on any missed email
// - refreshes the Instagram token every 7 days (Meta's tokens last 60 days)
// Each job runs even if the other fails.
export async function GET(request: Request) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!(await secretMatches(bearer, process.env.CRON_SECRET))) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [gmail, instagramToken] = await Promise.allSettled([
    emailChannelConfigured()
      ? startInboxWatch().then(async (watch) => ({ watchExpiresAt: watch.expiresAt, ...(await processInbox(watch.historyId)) }))
      : Promise.resolve({ skipped: "email channel not configured" }),
    supabaseConfigured() && process.env.INSTAGRAM_ACCESS_TOKEN
      ? refreshInstagramToken()
      : Promise.resolve({ skipped: "Instagram not configured" }),
  ]);

  const report = (result: PromiseSettledResult<unknown>) => {
    if (result.status === "fulfilled") return result.value;
    console.error("daily job failed", result.reason);
    return { error: result.reason instanceof Error ? result.reason.message : "failed" };
  };
  return Response.json({ gmail: report(gmail), instagramToken: report(instagramToken) });
}
