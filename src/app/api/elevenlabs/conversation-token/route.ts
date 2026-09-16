import { elevenLabsGet } from "@/lib/elevenlabs";

// WebRTC conversation token for voice conversations. Keeps the API key on the server.
export async function GET() {
  try {
    const { token } = await elevenLabsGet<{ token: string }>("/conversation/token");
    return Response.json({ conversationToken: token });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Could not start a voice session" }, { status: 502 });
  }
}
