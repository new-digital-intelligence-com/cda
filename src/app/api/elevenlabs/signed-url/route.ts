import { elevenLabsGet } from "@/lib/elevenlabs";
import { hasValidSession } from "@/lib/session";
import { visitorId } from "@/lib/visitor";

// Signed WebSocket URL for text (chat) conversations. Keeps the API key on the server.
export async function GET() {
  if (!(await hasValidSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { signed_url } = await elevenLabsGet<{ signed_url: string }>("/conversation/get-signed-url");
    // The browser passes this back when it connects, so the agent can look the visitor up.
    return Response.json({ signedUrl: signed_url, visitorId: await visitorId() });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Could not start a chat session" }, { status: 502 });
  }
}
