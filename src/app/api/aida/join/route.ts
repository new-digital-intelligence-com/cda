import { cleanText, displayCode, findOpenRoomByCode, livekitRoomName, normaliseCode } from "@/lib/aida";
import { isStaffRequest } from "@/lib/aidaStaff";
import { livekitConfigured, roomTicket } from "@/lib/livekit";
import { supabaseConfigured } from "@/lib/supabase";

// Join a room with its code. Open to everyone; an Aida staff token, when sent, is what makes the
// person an employee.
export async function POST(request: Request) {
  if (!livekitConfigured() || !supabaseConfigured()) {
    return Response.json({ error: "Rooms are not configured" }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = cleanText(body.name, 40);
  if (!name) return Response.json({ error: "Please enter your name" }, { status: 400 });

  const room = await findOpenRoomByCode(normaliseCode(body.code));
  if (!room) {
    return Response.json({ error: "That room code does not exist, or the room has ended." }, { status: 404 });
  }

  const role = (await isStaffRequest(request)) ? "employee" : "customer";
  const ticket = await roomTicket(livekitRoomName(room), name, role);
  return Response.json({ room: { code: displayCode(room.code), title: room.title }, ticket });
}
