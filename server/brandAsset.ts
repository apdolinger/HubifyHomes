import path from "path";
import fs from "fs";

const ROOT = path.resolve(import.meta.dirname, "..");

export const HUBIFY_HOMES_LOGO_PATH = path.join(
  ROOT,
  "attached_assets",
  "Hubify_Homes-2_1777805213575.png",
);

export function getHubifyHomesLogoBuffer(): Buffer | null {
  try {
    return fs.readFileSync(HUBIFY_HOMES_LOGO_PATH);
  } catch {
    return null;
  }
}

export function getHubifyHomesLogoDataUri(): string | null {
  const buf = getHubifyHomesLogoBuffer();
  if (!buf) return null;
  return `data:image/png;base64,${buf.toString("base64")}`;
}

export function getAppBaseUrl(): string {
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) {
    return `https://${domains.split(",")[0]}`;
  }
  return process.env.PUBLIC_URL || "http://localhost:5000";
}

/**
 * Returns the logo URL for use in transactional emails.
 *
 * Priority:
 *  1. EMAIL_LOGO_URL env var — explicit override for any environment
 *  2. https://hubifyhomesonline.com — the production custom domain, served
 *     through Cloudflare. No Replit dev-domain restrictions, no auth wall,
 *     no x-robots-tag. The /hubify-homes-logo.png route in routes.ts serves
 *     the PNG from attached_assets/ on every request to this domain.
 */
export function getHubifyHomesLogoUrl(): string {
  if (process.env.EMAIL_LOGO_URL) return process.env.EMAIL_LOGO_URL;
  return "https://hubifyhomesonline.com/hubify-homes-logo.png";
}
