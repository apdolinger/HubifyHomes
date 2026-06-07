/**
 * Beta org auto-provisioning
 *
 * Called by the Stripe webhook (and the free-tier path) immediately after payment
 * is confirmed. Creates the org, admin user, and account-setup token in one go,
 * then sends the "Workspace Ready" email so the prospect can set their password.
 *
 * Idempotent: if the prospect already has an orgId the function returns the
 * existing setup token (or the login URL if the token was already claimed).
 */

import crypto from "crypto";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "./db";
import { onboardingProspects, accountSetupTokens, users } from "@shared/schema";
import { storage } from "./storage";
import { log } from "./vite";

function getHubifyLogoUrl(): string {
  return "https://storage.googleapis.com/hubify-assets/hubify-homes-logo.png";
}

function mapTier(suggested: string | null | undefined): "starter" | "pro" | "grow" | "enterprise" {
  if (!suggested) return "starter";
  const s = suggested.toLowerCase();
  if (s.includes("growth") || s === "grow" || s === "pricing_growth") return "grow";
  if (s.includes("professional") || s === "pro" || s === "pricing_professional") return "pro";
  if (s.includes("enterprise")) return "enterprise";
  return "starter";
}

function buildWorkspaceReadyEmail(opts: {
  firstName: string;
  orgName: string;
  setupUrl: string;
  expiresAt: Date;
}): string {
  const { firstName, orgName, setupUrl, expiresAt } = opts;
  const expiry = expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff">
      <div style="text-align:center;margin-bottom:28px">
        <img src="${getHubifyLogoUrl()}" alt="Hubify Homes" width="180"
          style="width:180px;max-width:180px;height:auto;display:block;margin:0 auto;border:0;outline:none;text-decoration:none;">
      </div>
      <h1 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px">
        Your Hubify workspace is ready, ${firstName}!
      </h1>
      <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 20px">
        Your organization <strong>${orgName}</strong> has been set up. Click the button below
        to set your password and start using Hubify — the whole thing takes under two minutes.
      </p>
      <div style="text-align:center;margin-bottom:28px">
        <a href="${setupUrl}"
          style="display:inline-block;background:#0d9488;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px">
          Enter Your Workspace →
        </a>
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:28px">
        <p style="font-size:13px;color:#64748b;margin:0 0 6px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">
          Quick-start checklist
        </p>
        <ol style="padding-left:18px;margin:0;color:#334155;font-size:14px;line-height:1.9">
          <li>Set your password using the button above</li>
          <li>Complete your company profile in Settings</li>
          <li>Add your first property and invite a team member</li>
        </ol>
      </div>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px" />
      <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0">
        This setup link expires on ${expiry}. After that, email
        <a href="mailto:contact@hubifyhomes.com" style="color:#94a3b8">contact@hubifyhomes.com</a>
        to request a new one.<br/>
        Questions? Reply to this email — we're happy to help.
      </p>
    </div>
  `;
}

export interface ProvisionResult {
  orgId: string;
  userId: string;
  setupToken: string;
  setupUrl: string;
}

/**
 * Provisions a beta org for the given prospect.
 * @param prospectId  UUID of the onboarding_prospects row
 * @param baseUrl     e.g. "https://app.hubifyhomesonline.com"
 */
export async function provisionBetaOrg(
  prospectId: string,
  baseUrl: string
): Promise<ProvisionResult> {
  const rows = await db
    .select()
    .from(onboardingProspects)
    .where(eq(onboardingProspects.id, prospectId))
    .limit(1);
  const prospect = rows[0];
  if (!prospect) throw new Error(`Prospect ${prospectId} not found`);

  // ── Idempotency guard ─────────────────────────────────────────────────────
  if (prospect.orgId) {
    const tokenRows = await db
      .select()
      .from(accountSetupTokens)
      .where(
        and(
          eq(accountSetupTokens.prospectId, prospectId),
          isNull(accountSetupTokens.claimedAt)
        )
      )
      .limit(1);
    if (tokenRows[0]) {
      const setupUrl = `${baseUrl}/setup-account/${tokenRows[0].token}`;
      return { orgId: prospect.orgId, userId: tokenRows[0].userId, setupToken: tokenRows[0].token, setupUrl };
    }
    return { orgId: prospect.orgId, userId: "", setupToken: "", setupUrl: `${baseUrl}/staff/login` };
  }

  const p = prospect as any;

  // ── Create org ─────────────────────────────────────────────────────────────
  const orgName = p.agreementOrganizationName || prospect.company || prospect.name;
  const org = await storage.createOrg({
    name: orgName,
    isActive: true,
    orgStatus: "onboarding",
    phone: prospect.phone ?? undefined,
  });

  // ── Create subscription ────────────────────────────────────────────────────
  const trialStart = new Date();
  const trialEnd = new Date(trialStart);
  trialEnd.setDate(trialEnd.getDate() + 30);

  await storage.upsertOrgSubscription({
    orgId: org.id,
    tier: mapTier(p.suggestedTier),
    status: "trialing",
    currentPeriodStart: trialStart,
    currentPeriodEnd: trialEnd,
    betaPriceLocked: !!p.discountedMonthlyPrice,
    setupFeeCents: Math.round((p.setupFee ?? 0) * 100),
  } as any);

  // ── Create setup progress ──────────────────────────────────────────────────
  await storage.createOrgSetupProgress(org.id);

  // ── Create admin user (password set later via setup-account flow) ──────────
  const userId = crypto.randomUUID();
  const firstName = p.firstName || (prospect.name || "").split(" ")[0] || "";
  const lastName = p.lastName || (prospect.name || "").split(" ").slice(1).join(" ") || "";

  await storage.upsertUser({
    id: userId,
    orgId: org.id,
    email: prospect.email ?? undefined,
    firstName,
    lastName,
    role: "admin",
    isAdminAccount: true,
    isActive: true,
    passwordHash: null,
  } as any);

  // ── Generate account-setup token ───────────────────────────────────────────
  const setupToken = crypto.randomBytes(32).toString("hex");
  const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.insert(accountSetupTokens).values({
    prospectId: prospect.id,
    userId,
    token: setupToken,
    expiresAt: tokenExpiresAt,
  });

  // ── Update prospect ────────────────────────────────────────────────────────
  const now = new Date();
  const existingHistory: any[] = p.stageHistory ?? [];
  await db
    .update(onboardingProspects)
    .set({
      orgId: org.id,
      stage: "converted",
      convertedAt: now,
      provisionedAt: now,
      provisioningFailed: false,
      stageHistory: [
        ...existingHistory,
        { stage: "converted", enteredAt: now.toISOString(), note: "Auto-provisioned after payment" },
      ],
    } as any)
    .where(eq(onboardingProspects.id, prospect.id));

  // ── Send workspace-ready email ─────────────────────────────────────────────
  const setupUrl = `${baseUrl}/setup-account/${setupToken}`;
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const { Resend } = await import("resend");
      const resend = new Resend(resendKey);
      const fromEmail = process.env.RESEND_FROM_EMAIL || "no-reply@hubifyhomesonline.com";
      await resend.emails.send({
        from: fromEmail,
        replyTo: "contact@hubifyhomes.com",
        to: prospect.email ?? "",
        subject: "Your Hubify workspace is ready — set up your account",
        html: buildWorkspaceReadyEmail({ firstName, orgName, setupUrl, expiresAt: tokenExpiresAt }),
      });
      log(`[betaProvisioning] Workspace-ready email sent to ${prospect.email}`);
    }
  } catch (emailErr) {
    log(`[betaProvisioning] Failed to send workspace-ready email: ${emailErr}`);
  }

  log(`[betaProvisioning] Provisioned org ${org.id} for prospect ${prospect.id}`);
  return { orgId: org.id, userId, setupToken, setupUrl };
}
