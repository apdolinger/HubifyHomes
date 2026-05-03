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

export function getHubifyHomesLogoUrl(): string {
  return `${getAppBaseUrl()}/hubify-homes-logo.png`;
}
