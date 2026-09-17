import { hasValidSession } from "@/lib/session";

const DEFAULT_MAX_SESSION_SECONDS = 180;

// Creates a short-lived LiveAvatar embed that talks to the ElevenLabs agent (via the stored voice agent).
// Keeps the LiveAvatar API key on the server.
export async function POST() {
  if (!(await hasValidSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.LIVEAVATAR_API_KEY;
  const avatarId = process.env.LIVEAVATAR_AVATAR_ID;
  const voiceAgentId = process.env.LIVEAVATAR_VOICE_AGENT_ID;
  if (!apiKey || !avatarId || !voiceAgentId) {
    return Response.json({ error: "The avatar is not configured" }, { status: 503 });
  }
  const maxSeconds = Number(process.env.LIVEAVATAR_MAX_SESSION_SECONDS) || DEFAULT_MAX_SESSION_SECONDS;

  try {
    const response = await fetch("https://api.liveavatar.com/v2/embeddings", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        avatar_id: avatarId,
        voice_agent_id: voiceAgentId,
        max_session_duration: maxSeconds,
        orientation: "horizontal",
      }),
      cache: "no-store",
    });
    const body = (await response.json()) as { data?: { url?: string }; message?: string };
    const url = body.data?.url;
    if (!response.ok || !url || new URL(url).hostname !== "embed.liveavatar.com") {
      console.error("LiveAvatar embed failed", response.status, body.message);
      return Response.json({ error: "Could not start the avatar" }, { status: 502 });
    }
    return Response.json({ url, maxSeconds });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Could not start the avatar" }, { status: 502 });
  }
}
