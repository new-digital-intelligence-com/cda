import { isStaffRequest } from "@/lib/aidaStaff";
import { importMoods, markHandled, moodOverview } from "@/lib/mood";
import { moodAlertStatus } from "@/lib/moodAlert";
import { supabaseConfigured } from "@/lib/supabase";

// The "😊 Mood" tab on /admin. Staff only (Aida staff token).
//   GET  ?days=7|30 → mood counts per channel and per day, and the unhappy conversations
//   POST { action: "import" }                          → stores the mood of past conversations (free reads)
//   POST { action: "handled", conversationId, handled, by } → marks one as followed up (or not)

const PERIODS = new Set([7, 30]);

export async function GET(request: Request) {
  if (!(await isStaffRequest(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!supabaseConfigured()) return Response.json({ error: "The database is not configured" }, { status: 503 });
  const days = Number(new URL(request.url).searchParams.get("days"));
  try {
    const alerts = moodAlertStatus();
    return Response.json({ ...(await moodOverview(PERIODS.has(days) ? days : 7)), alertsOn: alerts.on, alerts });
  } catch (error) {
    console.error("mood overview failed", error);
    // Most likely supabase/schema.sql has not been run again since the mood tables were added.
    return Response.json({ error: "Could not load the moods. Has supabase/schema.sql been run?" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!(await isStaffRequest(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!supabaseConfigured()) return Response.json({ error: "The database is not configured" }, { status: 503 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    if (body.action === "import") {
      return Response.json(await importMoods({ days: 30, max: 150 }));
    }
    if (body.action === "handled" && typeof body.conversationId === "string" && body.conversationId) {
      const by = typeof body.by === "string" && body.by.trim() ? body.by.trim().slice(0, 80) : null;
      await markHandled(body.conversationId, by, body.handled !== false);
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("mood action failed", error);
    return Response.json({ error: "That did not work. Please try again." }, { status: 502 });
  }
}
