/**
 * Token storage.
 *
 * The backend OAuth flow redirects back to `{FRONTEND_URL}/auth/callback` with
 * `accessToken` and `refreshToken` in the query string (see backend/api.md → Auth).
 * The backend does NOT set an httpOnly cookie, so the frontend owns storage.
 *
 * We keep both tokens in non-httpOnly cookies so that:
 *   - the API client (client components) can attach the access token, and
 *   - `src/proxy.ts` (Next middleware) can gate protected routes on the refresh token.
 *
 * Access tokens are short-lived (~15 min) and rotate on refresh, which limits the
 * exposure of client-readable storage.
 */

export const ACCESS_COOKIE = "cv_at";
export const REFRESH_COOKIE = "cv_rt";

const ACCESS_MAX_AGE = 60 * 30; // 30 min ceiling; real expiry is enforced server-side
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function isBrowser() {
  return typeof document !== "undefined";
}

function readCookie(name: string): string | null {
  if (!isBrowser()) return null;
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1") + "=([^;]*)"),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, maxAge: number) {
  if (!isBrowser()) return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function deleteCookie(name: string) {
  if (!isBrowser()) return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getAccessToken(): string | null {
  return readCookie(ACCESS_COOKIE);
}

export function getRefreshToken(): string | null {
  return readCookie(REFRESH_COOKIE);
}

export function setTokens(accessToken: string, refreshToken: string) {
  writeCookie(ACCESS_COOKIE, accessToken, ACCESS_MAX_AGE);
  writeCookie(REFRESH_COOKIE, refreshToken, REFRESH_MAX_AGE);
}

export function clearTokens() {
  deleteCookie(ACCESS_COOKIE);
  deleteCookie(REFRESH_COOKIE);
}

export function hasSession(): boolean {
  return Boolean(getRefreshToken());
}

/** Fired when a refresh attempt fails and the user must sign in again. */
export const AUTH_EXPIRED_EVENT = "cv:auth-expired";

export function notifyAuthExpired() {
  if (isBrowser()) {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }
}
