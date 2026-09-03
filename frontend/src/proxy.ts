import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { REFRESH_COOKIE } from "@/lib/auth-tokens";

/**
 * Optimistic auth gate (Next 16 "proxy", formerly middleware).
 *
 * This is a cheap presence check on the refresh-token cookie — NOT full
 * authorization. The real check is `GET /auth/me` in the AuthProvider, which
 * clears state and bounces to /login if the token is actually invalid.
 */

const PUBLIC_PATHS = ["/login", "/auth/callback"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(REFRESH_COOKIE)?.value);
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // Signed-in users never need the marketing / login screens.
  if (hasSession && (pathname === "/" || pathname === "/login")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // The root path is a pure entry redirect.
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!hasSession && !isPublic) {
    const url = new URL("/login", request.url);
    if (pathname !== "/dashboard") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals, the API, and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
