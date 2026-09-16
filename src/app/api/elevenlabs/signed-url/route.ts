import { elevenLabsGet } from "@/lib/elevenlabs";

// Signed WebSocket URL for text (chat) conversations. Keeps the API key on the server.
export async function GET() {
  try {
    const { signed_url } = await elevenLabsGet<{ signed_url: string }>("/conversation/get-signed-url");
    return Response.json({ signedUrl: signed_url });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Could not start a chat session" }, { status: 502 });
  }
}
