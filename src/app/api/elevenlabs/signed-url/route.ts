import { elevenLabsGet } from "@/lib/elevenlabs";
import { hasValidSession } from "@/lib/session";
import { registerWebsiteConversation } from "@/lib/websiteSession";

// Signed WebSocket URL for text (chat) conversations. Keeps the API key on the server.
export async function GET() {
  if (!(await hasValidSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { signed_url, conversation_id } = await elevenLabsGet<{
      signed_url: string;
      conversation_id?: string;
    }>("/conversation/get-signed-url", { include_conversation_id: "true" });

    // Tie this conversation to the visitor now, so Ellie's lookup recognises them.
    await registerWebsiteConversation(conversation_id);

    return Response.json({ signedUrl: signed_url });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Could not start a chat session" }, { status: 502 });
  }
}
