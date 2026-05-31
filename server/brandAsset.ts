import path from "path";
import fs from "fs";

const ROOT = path.resolve(import.meta.dirname, "..");

export const HUBIFY_HOMES_LOGO_PATH = path.join(
  ROOT,
  "attached_assets",
  "Hubify_Homes-2_1777805213575.png",
);

export const HUBIFY_HOMES_EMAIL_LOGO_PATH = path.join(
  ROOT,
  "attached_assets",
  "hubify-homes-logo-email.png",
);

export const HUBIFY_HOMES_EMAIL_LOGO_V2_PATH = path.join(
  ROOT,
  "attached_assets",
  "hubify-homes-logo-email-v2.png",
);

export const HUBIFY_HOMES_EMAIL_LOGO_V3_PATH = path.join(
  ROOT,
  "attached_assets",
  "hubify-homes-logo-email-v3.png",
);

export function getHubifyHomesLogoBuffer(): Buffer | null {
  try {
    return fs.readFileSync(HUBIFY_HOMES_LOGO_PATH);
  } catch {
    return null;
  }
}

export function getHubifyHomesEmailLogoBuffer(): Buffer | null {
  try {
    return fs.readFileSync(HUBIFY_HOMES_EMAIL_LOGO_PATH);
  } catch {
    return null;
  }
}

export function getHubifyHomesLogoDataUri(): string {
  const buf = getHubifyHomesLogoBuffer();
  if (!buf) return getHubifyHomesLogoUrl();
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
 * Returns the standard logo URL (used for non-email contexts).
 *
 * Priority:
 *  1. EMAIL_LOGO_URL env var — explicit override
 *  2. https://hubifyhomesonline.com — Cloudflare-fronted production domain
 */
export function getHubifyHomesLogoUrl(): string {
  if (process.env.EMAIL_LOGO_URL) return process.env.EMAIL_LOGO_URL;
  return "https://hubifyhomesonline.com/hubify-homes-logo.png";
}

/**
 * Returns the URL for the email-optimised logo.
 *
 * Uses hubify-homes-logo-email-v3.png: transparent background, tight crop,
 * 320×64 px (2× retina), displayed at 160 px wide in email templates.
 *
 * Priority:
 *  1. EMAIL_LOGO_URL env var — explicit override
 *  2. https://hubifyhomesonline.com/hubify-homes-logo-email-v3.png
 */
export function getHubifyHomesEmailLogoUrl(): string {
  if (process.env.EMAIL_LOGO_URL) return process.env.EMAIL_LOGO_URL;
  return "https://hubifyhomesonline.com/hubify-homes-logo-email-v3.png";
}
