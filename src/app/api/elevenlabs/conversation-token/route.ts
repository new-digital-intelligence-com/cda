import { elevenLabsGet } from "@/lib/elevenlabs";
import { hasValidSession } from "@/lib/session";

// WebRTC conversation token for voice conversations. Keeps the API key on the server.
export async function GET() {
  if (!(await hasValidSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { token } = await elevenLabsGet<{ token: string }>("/conversation/token");
    return Response.json({ conversationToken: token });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Could not start a voice session" }, { status: 502 });
  }
}
