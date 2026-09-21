import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSession, sitePasswordConfigured } from "@/lib/auth";

// The icon is linked from the login page itself, so it has to be readable before signing in.
const PUBLIC_PATHS = new Set(["/login", "/api/login", "/icon.svg"]);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  // ElevenLabs calls these (agent tools and the post-call webhook), so there is no browser and no
  // site password. They prove themselves with a shared secret header or an HMAC signature instead
  // — see src/lib/agentAuth.ts — and each route rejects anything unsigned.
  if (pathname.startsWith("/api/agent/")) return NextResponse.next();

  // Aida: customers join rooms without the site password, using a room code. The join page and
  // the Aida routes are therefore open, and every route decides for itself: the site password
  // cookie makes you an employee, a signed room ticket proves you are in the room. The employee
  // lobby at /aida stays behind the lock like the rest of the site.
  if (pathname === "/aida/join" || pathname.startsWith("/api/aida/")) return NextResponse.next();

  const isApi = pathname.startsWith("/api/");
  if (!sitePasswordConfigured()) {
    // Fail closed: without SITE_PASSWORD nothing is reachable.
    if (isApi) return Response.json({ error: "Site password is not configured" }, { status: 503 });
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (await isValidSession(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }

  if (isApi) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
