import { db } from "./db";
import { orgs } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function initializeDefaultOrganization() {
  console.log("[SEED] Starting default organization initialization...");
  try {
    const defaultOrgId = "00000000-0000-0000-0000-000000000001";
    
    console.log("[SEED] Checking if default organization exists...");
    const existingOrg = await db.select().from(orgs).where(eq(orgs.id, defaultOrgId)).limit(1);
    
    if (existingOrg.length === 0) {
      console.log("[SEED] Seeding default test organization...");
      await db.insert(orgs).values({
        id: defaultOrgId,
        name: "Test Organization",
        isActive: true,
      });
      console.log("[SEED] Default test organization created successfully!");
    } else {
      console.log("[SEED] Default organization already exists");
    }
  } catch (error) {
    console.error("[SEED] Error initializing default organization:", error);
  }
}
