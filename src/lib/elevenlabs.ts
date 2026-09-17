const API_BASE = "https://api.elevenlabs.io/v1/convai";

function credentials() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!apiKey || !agentId) {
    throw new Error("ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID must be set in .env.local");
  }
  return { apiKey, agentId };
}

/** Calls an ElevenLabs endpoint with the server-side API key and returns its JSON body. */
export async function elevenLabsGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const { apiKey, agentId } = credentials();
  const query = new URLSearchParams({ agent_id: agentId, ...params });
  const response = await fetch(`${API_BASE}${path}?${query}`, {
    headers: { "xi-api-key": apiKey },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`ElevenLabs ${path} failed with ${response.status}`);
  }
  return (await response.json()) as T;
}
