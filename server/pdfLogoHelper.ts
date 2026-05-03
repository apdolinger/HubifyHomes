import { getHubifyHomesLogoBuffer } from "./brandAsset";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 5000;

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\./,
  /^\[?::1\]?$/,
  /^\[?fc[0-9a-f]{2}/i,
  /^\[?fd[0-9a-f]{2}/i,
  /^\[?fe80/i,
];

function isPublicHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname;
    if (!host) return false;
    if (PRIVATE_HOST_PATTERNS.some((re) => re.test(host))) return false;
    return true;
  } catch {
    return false;
  }
}

async function fetchLogoBuffer(url: string): Promise<Buffer | null> {
  if (!isPublicHttpUrl(url)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: controller.signal, redirect: "follow" });
    if (!r.ok) return null;
    const ct = (r.headers.get("content-type") || "").toLowerCase();
    if (!ct.startsWith("image/")) return null;
    const len = Number(r.headers.get("content-length") || "0");
    if (len && len > MAX_LOGO_BYTES) return null;
    const arr = await r.arrayBuffer();
    if (arr.byteLength > MAX_LOGO_BYTES) return null;
    return Buffer.from(arr);
  } catch (err) {
    console.warn("[pdfLogoHelper] Failed to fetch logo:", err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolve the header logo for a PDF. Tries the org-uploaded logo first; if it
 * is missing, unreachable, or fails validation, falls back to the bundled
 * Hubify Homes platform logo. Returns null only when both lookups fail.
 *
 * SSRF mitigations: HTTP(S) only, public hostnames only (private/loopback/link-local
 * blocked), `image/*` content-type required, 2 MB cap, 5 s timeout.
 */
export async function resolvePdfHeaderLogo(orgLogoUrl?: string | null): Promise<Buffer | null> {
  if (orgLogoUrl) {
    const buf = await fetchLogoBuffer(orgLogoUrl);
    if (buf) return buf;
  }
  return getHubifyHomesLogoBuffer();
}
