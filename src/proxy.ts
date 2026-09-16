import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSession, sitePasswordConfigured } from "@/lib/auth";

const PUBLIC_PATHS = new Set(["/login", "/api/login"]);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

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
