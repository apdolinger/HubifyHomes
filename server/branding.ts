import { db } from "./db";
import { orgSubscriptions } from "@shared/schema";
import { eq } from "drizzle-orm";

type Tier = "starter"|"pro"|"grow"|"enterprise";
type BrandingLevel = "none"|"logo_only"|"logo_primary"|"full";

export async function getBrandingLevel(orgId: string): Promise<BrandingLevel> {
  const row = await db.select().from(orgSubscriptions).where(eq(orgSubscriptions.orgId, orgId)).limit(1);
  const tier = (row[0]?.tier ?? "starter") as Tier;
  switch (tier) {
    case "starter": return "logo_only";      // Logo upload only
    case "pro":     return "logo_primary";   // Logo + primary color
    case "grow":    return "full";           // Full theming
    case "enterprise": return "full";        // Full theming
    default: return "logo_only";
  }
}

export function enforceBrandingPolicy(level: BrandingLevel, incoming: any): any {
  const out = { ...incoming };
  if (!out.branding) out.branding = {};
  if (!out.theme) out.theme = {};
  if (!out.theme.tokens) out.theme.tokens = {};

  if (level === "logo_only") {
    out.theme.tokens = {};
  } else if (level === "logo_primary") {
    out.theme.tokens = { primary: out.theme.tokens.primary };
  } // "full" leaves all tokens intact
  return out;
}

export function getBrandingCapabilities(tier: Tier) {
  const capabilities = {
    logoUpload: false,
    primaryColor: false,
    secondaryColor: false,
    fullTheme: false,
    customDomain: false,
    whiteLabel: false,
  };

  switch (tier) {
    case "starter":
      capabilities.logoUpload = true;
      break;
    case "pro":
      capabilities.logoUpload = true;
      capabilities.primaryColor = true;
      break;
    case "grow":
      capabilities.logoUpload = true;
      capabilities.primaryColor = true;
      capabilities.secondaryColor = true;
      capabilities.fullTheme = true;
      capabilities.customDomain = true;
      break;
    case "enterprise":
      capabilities.logoUpload = true;
      capabilities.primaryColor = true;
      capabilities.secondaryColor = true;
      capabilities.fullTheme = true;
      capabilities.customDomain = true;
      capabilities.whiteLabel = true;
      break;
  }

  return capabilities;
}