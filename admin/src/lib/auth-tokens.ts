/**
 * Token storage for the admin panel.
 *
 * The backend OAuth flow (started with `?state=admin`) redirects to
 * `{ADMIN_URL}/auth/callback?accessToken=…&refreshToken=…`. The backend sets no
 * cookie, so this app owns storage.
 *
 * Cookie names are deliberately DISTINCT from the main frontend's (`cv_at` /
 * `cv_rt`): browsers key cookies by host without the port, so on a dev machine
 * `localhost:3000` and `localhost:3100` share a cookie jar. Distinct names keep
 * an admin session and a user session from clobbering each other.
 */

export const ACCESS_COOKIE = "cv_admin_at";
export const REFRESH_COOKIE = "cv_admin_rt";

const ACCESS_MAX_AGE = 60 * 30; // 30 min ceiling; real expiry is server-side
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

/** Fired when a refresh attempt fails and the operator must sign in again. */
export const AUTH_EXPIRED_EVENT = "cv-admin:auth-expired";

export function notifyAuthExpired() {
  if (isBrowser()) {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }
}
