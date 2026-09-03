import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { REFRESH_COOKIE } from "@/lib/auth-tokens";

/**
 * Optimistic auth gate (Next 16 "proxy", formerly middleware).
 *
 * A cheap presence check on the refresh-token cookie — NOT authorization. The
 * real gate is `GET /auth/me` + `role === "admin"` in the AuthProvider / shell,
 * which shows the access-denied screen for a non-admin and bounces to /login for
 * an invalid token.
 */

const PUBLIC_PATHS = ["/login", "/auth/callback"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(REFRESH_COOKIE)?.value);
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (hasSession && (pathname === "/" || pathname === "/login")) {
    return NextResponse.redirect(new URL("/overview", request.url));
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL(hasSession ? "/overview" : "/login", request.url));
  }

  if (!hasSession && !isPublic) {
    const url = new URL("/login", request.url);
    if (pathname !== "/overview") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
