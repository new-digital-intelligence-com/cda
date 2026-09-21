import { closeRoom, findRoomByLivekitName } from "@/lib/aida";
import { deleteLivekitRoom, ticketFromRequest } from "@/lib/livekit";
import { hasValidSession } from "@/lib/session";

// Ends a room for everyone: closes it in our records and removes it from LiveKit, which
// disconnects every participant. Employees only.
export async function POST(request: Request) {
  const ticket = await ticketFromRequest(request);
  if (!ticket || ticket.role !== "employee" || !(await hasValidSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const room = await findRoomByLivekitName(ticket.roomName);
  if (!room) return Response.json({ error: "Room not found" }, { status: 404 });

  await closeRoom(room.id);
  await deleteLivekitRoom(ticket.roomName);
  return Response.json({ ok: true });
}
