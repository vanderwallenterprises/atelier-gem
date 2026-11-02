/**
 * Where to send someone after signing in. Only same-site paths are allowed, so a crafted
 * `?next=https://evil.example` or `//evil.example` link can't bounce users off the site.
 */
export function safeNext(raw: unknown, fallback = "/account"): string {
  if (typeof raw !== "string" || raw.length > 512) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\\]/.test(raw)) return fallback;
  if (raw.startsWith("/auth/")) return fallback;
  return raw;
}

export function signInHref(next: string): string {
  return `/sign-in?next=${encodeURIComponent(safeNext(next))}`;
}
