export type AidaRole = "employee" | "customer";

export type RoomTicket = { url: string; token: string; identity: string; name: string; role: AidaRole };

export type JoinedRoom = { room: { code: string; title: string | null }; ticket: RoomTicket };

/** Messages sent between browsers in a room, over LiveKit's data channel. */
export type WireMessage =
  | { type: "speech"; id: string; text: string }
  | { type: "chat"; id: string; text: string }
  | { type: "suggestion"; id: string; text: string; replyTo: string }
  | { type: "approved"; suggestionId: string; text: string }
  | { type: "declined"; suggestionId: string };

export type TimelineLine = {
  id: string;
  kind: "speech" | "chat" | "approved" | "system";
  name: string;
  role: AidaRole | "system";
  text: string;
  mine?: boolean;
  /** For an approved reply: which employee sent it. Only employees are shown this. */
  approvedBy?: string;
};

export type Suggestion = {
  id: string;
  text: string;
  replyTo: string;
  status: "pending" | "approved" | "declined";
  decidedBy?: string;
};

export type Person = { identity: string; name: string; role: AidaRole; speaking: boolean; isMe: boolean };

/** Joining and creating rooms share one response shape. */
export async function requestRoom(
  path: "/api/aida/rooms" | "/api/aida/join",
  body: Record<string, string>,
): Promise<JoinedRoom> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = (await response.json().catch(() => ({}))) as Partial<JoinedRoom> & { error?: string };
  if (!response.ok || !result.ticket || !result.room) {
    throw new Error(result.error ?? "Something went wrong. Please try again.");
  }
  return { room: result.room, ticket: result.ticket };
}

const NAME_KEY = "aida-name";

/** Remembering the name is a convenience only; private windows or blocked storage just start empty. */
export function savedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function rememberName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // Storage unavailable: nothing to do.
  }
}
