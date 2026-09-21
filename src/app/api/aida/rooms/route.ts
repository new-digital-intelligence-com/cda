import { cleanText, createRoom, displayCode, listOpenRooms, livekitRoomName } from "@/lib/aida";
import { livekitConfigured, roomTicket } from "@/lib/livekit";
import { hasValidSession } from "@/lib/session";
import { supabaseConfigured } from "@/lib/supabase";

// Aida rooms. This route is outside the site password lock (see src/proxy.ts) because customers
// create rooms too. Who you are is decided here and nowhere else: holding the site password makes
// you a CDA employee, anything else makes you a customer. The name you type is only a label.

/** The employee lobby: every open room. */
export async function GET() {
  if (!(await hasValidSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!supabaseConfigured()) return Response.json({ error: "Rooms are not configured" }, { status: 503 });

  const rooms = await listOpenRooms();
  return Response.json({
    rooms: rooms.map((room) => ({
      code: displayCode(room.code),
      title: room.title,
      createdByRole: room.created_by_role,
      createdByName: room.created_by_name,
      createdAt: room.created_at,
    })),
  });
}

/** Create a room and get a ticket into it. */
export async function POST(request: Request) {
  if (!livekitConfigured() || !supabaseConfigured()) {
    return Response.json({ error: "Rooms are not configured" }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = cleanText(body.name, 40);
  if (!name) return Response.json({ error: "Please enter your name" }, { status: 400 });

  const role = (await hasValidSession()) ? "employee" : "customer";
  const title = cleanText(body.title, 60) || (role === "customer" ? `Help for ${name}` : null);

  try {
    const room = await createRoom(title, role, name);
    const ticket = await roomTicket(livekitRoomName(room), name, role);
    return Response.json({ room: { code: displayCode(room.code), title: room.title }, ticket });
  } catch (error) {
    console.error("Could not create an Aida room", error);
    return Response.json({ error: "Could not create the room. Please try again." }, { status: 502 });
  }
}
