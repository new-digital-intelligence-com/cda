const API_BASE = "https://api.elevenlabs.io/v1/convai";

function credentials() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!apiKey || !agentId) {
    throw new Error("ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID must be set in .env.local");
  }
  return { apiKey, agentId };
}

/**
 * A one-use token that lets a browser stream its microphone to Scribe (live speech to text)
 * without ever seeing the API key.
 */
export async function realtimeScribeToken(): Promise<string> {
  const { apiKey } = credentials();
  const response = await fetch("https://api.elevenlabs.io/v1/single-use-token/realtime_scribe", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`ElevenLabs single-use token failed with ${response.status}`);
  }
  return ((await response.json()) as { token: string }).token;
}

/**
 * Calls an ElevenLabs endpoint with the server-side API key and returns its JSON body. It targets
 * Ellie unless `params.agent_id` names another agent, such as Aida.
 */
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
