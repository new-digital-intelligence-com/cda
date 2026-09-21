import { closeRoom, findOpenRoomByCode, findRoomByLivekitName, livekitRoomName, normaliseCode } from "@/lib/aida";
import { isStaffRequest } from "@/lib/aidaStaff";
import { deleteLivekitRoom, ticketFromRequest } from "@/lib/livekit";

// Ends a room for everyone: closes it in our records and removes it from LiveKit, which
// disconnects every participant. Staff only, in one of two ways:
// - from inside the room, with their employee ticket (only ever issued to staff), or
// - from the lobby, with their staff token and the room's code, without joining it first.
export async function POST(request: Request) {
  const ticket = await ticketFromRequest(request);

  let room = null;
  if (ticket?.role === "employee") {
    room = await findRoomByLivekitName(ticket.roomName);
  } else if (await isStaffRequest(request)) {
    const body = (await request.json().catch(() => ({}))) as { code?: unknown };
    room = await findOpenRoomByCode(normaliseCode(body.code));
  } else {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!room) return Response.json({ error: "Room not found" }, { status: 404 });

  await closeRoom(room.id);
  await deleteLivekitRoom(livekitRoomName(room));
  return Response.json({ ok: true });
}
