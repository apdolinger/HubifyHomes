/**
 * Beta org auto-provisioning
 *
 * Called by the Stripe webhook (and the free-tier path) immediately after
 * payment is confirmed. ALL database writes run inside a single transaction
 * that starts by locking the prospect row with SELECT...FOR UPDATE, so
 * concurrent webhook retries are serialized and cannot create duplicate orgs.
 *
 * Idempotent: if the prospect already has an orgId the function returns the
 * existing (unclaimed) setup token or the login URL if already claimed.
 */

import crypto from "crypto";
import { sql, eq, and, isNull } from "drizzle-orm";
import { db } from "./db";
import {
  onboardingProspects,
  accountSetupTokens,
  orgs,
  orgSubscriptions,
  orgSetupProgress,
  users,
} from "@shared/schema";
import { log } from "./vite";

function getHubifyLogoUrl(): string {
  return "https://storage.googleapis.com/hubify-assets/hubify-homes-logo.png";
}

function mapTier(
  suggested: string | null | undefined
): "starter" | "pro" | "grow" | "enterprise" {
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
  const expiry = expiresAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
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
        to set your password and start using Hubify.
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
        to request a new one.
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

export interface ProvisionOpts {
  /** Stripe customer ID from the checkout session */
  stripeCustomerId?: string | null;
  /** Stripe subscription ID from the checkout session */
  stripeSubscriptionId?: string | null;
}

/**
 * Provisions a beta org for the given prospect.
 *
 * All DB writes are inside a single transaction that begins with a
 * SELECT ... FOR UPDATE lock on the prospect row, ensuring concurrent
 * Stripe webhook retries serialize cleanly without creating duplicates.
 *
 * @param prospectId UUID of the onboarding_prospects row
 * @param baseUrl    e.g. "https://app.hubifyhomesonline.com"
 * @param opts       Optional Stripe IDs forwarded from the webhook session
 */
export async function provisionBetaOrg(
  prospectId: string,
  baseUrl: string,
  opts: ProvisionOpts = {}
): Promise<ProvisionResult> {
  let emailPayload: {
    to: string;
    firstName: string;
    orgName: string;
    setupUrl: string;
    tokenExpiresAt: Date;
  } | null = null;

  const result = await db.transaction(async (tx) => {
    // ── 1. Lock the prospect row for the duration of this transaction ─────────
    // Concurrent retries will block here until the first transaction commits,
    // so only one will proceed past the orgId check.
    const lockRes = await tx.execute(
      sql`SELECT * FROM onboarding_prospects WHERE id = ${prospectId} FOR UPDATE LIMIT 1`
    );
    const prospect = (lockRes as any).rows?.[0] as Record<string, any> | undefined;
    if (!prospect) throw new Error(`Prospect ${prospectId} not found`);

    // ── 2. Idempotency guard ──────────────────────────────────────────────────
    if (prospect.org_id) {
      // Already provisioned — return existing unclaimed token if available
      const tokenRows = await tx
        .select()
        .from(accountSetupTokens)
        .where(
          and(
            eq(accountSetupTokens.prospectId, prospectId),
            isNull(accountSetupTokens.claimedAt)
          )
        )
        .limit(1);
      const tok = tokenRows[0];
      if (tok && new Date(tok.expiresAt) > new Date()) {
        const setupUrl = `${baseUrl}/setup-account/${tok.token}`;
        return {
          orgId: prospect.org_id as string,
          userId: tok.userId,
          setupToken: tok.token,
          setupUrl,
        } satisfies ProvisionResult;
      }
      return {
        orgId: prospect.org_id as string,
        userId: "",
        setupToken: "",
        setupUrl: `${baseUrl}/staff/login`,
      } satisfies ProvisionResult;
    }

    // ── 3. Derive metadata from prospect ─────────────────────────────────────
    const orgName =
      (prospect.agreement_organization_name as string) ||
      (prospect.company as string) ||
      (prospect.name as string) ||
      "My Organization";
    const firstName =
      (prospect.first_name as string) ||
      ((prospect.name as string) || "").split(" ")[0] ||
      "";
    const lastName =
      (prospect.last_name as string) ||
      ((prospect.name as string) || "").split(" ").slice(1).join(" ") ||
      "";

    // ── 4. Create org ─────────────────────────────────────────────────────────
    const chosenSlug = (prospect.workspace_slug as string | null) || undefined;
    const [org] = await tx
      .insert(orgs)
      .values({
        name: orgName,
        slug: chosenSlug,
        isActive: true,
        orgStatus: "onboarding",
        phone: (prospect.phone as string) ?? undefined,
      })
      .returning();

    // ── 5. Create subscription with Stripe linkage ────────────────────────────
    const trialStart = new Date();
    const trialEnd = new Date(trialStart);
    trialEnd.setDate(trialEnd.getDate() + 30);

    await tx.insert(orgSubscriptions).values({
      orgId: org.id,
      tier: mapTier(
        (prospect.suggested_tier as string) ?? (prospect.portfolio_tier as string)
      ),
      status: "trialing",
      currentPeriodStart: trialStart,
      currentPeriodEnd: trialEnd,
      betaPriceLocked: !!(prospect.discounted_monthly_price),
      setupFeeCents: Math.round((Number(prospect.setup_fee) || 0) * 100),
      stripeCustomerId:
        opts.stripeCustomerId ??
        (prospect.beta_stripe_customer_id as string | null) ??
        null,
      stripeSubscriptionId:
        opts.stripeSubscriptionId ??
        (prospect.beta_stripe_subscription_id as string | null) ??
        null,
    });

    // ── 6. Create setup progress ──────────────────────────────────────────────
    await tx.insert(orgSetupProgress).values({ orgId: org.id });

    // ── 7. Create admin user (password set later via setup-account flow) ──────
    const userId = crypto.randomUUID();
    await tx.insert(users).values({
      id: userId,
      orgId: org.id,
      email: (prospect.email as string) ?? undefined,
      firstName,
      lastName,
      role: "admin",
      isAdminAccount: true,
      isActive: true,
      passwordHash: null,
    });

    // ── 8. Generate 7-day account-setup token ─────────────────────────────────
    const setupToken = crypto.randomBytes(32).toString("hex"); // 64 hex chars
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await tx.insert(accountSetupTokens).values({
      prospectId,
      userId,
      token: setupToken,
      expiresAt: tokenExpiresAt,
    });

    // ── 9. Update prospect (inside same transaction) ──────────────────────────
    const now = new Date();
    const existingHistory: any[] = Array.isArray(prospect.stage_history)
      ? prospect.stage_history
      : [];
    await tx
      .update(onboardingProspects)
      .set({
        orgId: org.id,
        stage: "converted",
        convertedAt: now,
        provisionedAt: now,
        provisioningFailed: false,
        stageHistory: [
          ...existingHistory,
          {
            stage: "converted",
            enteredAt: now.toISOString(),
            note: "Auto-provisioned after payment",
          },
        ],
      } as any)
      .where(eq(onboardingProspects.id, prospectId));

    const setupUrl = `${baseUrl}/setup-account/${setupToken}`;

    // Capture email data — email is sent after the transaction commits
    emailPayload = {
      to: (prospect.email as string) ?? "",
      firstName,
      orgName,
      setupUrl,
      tokenExpiresAt,
    };

    log(`[betaProvisioning] Provisioned org ${org.id} for prospect ${prospectId}`);
    return {
      orgId: org.id,
      userId,
      setupToken,
      setupUrl,
    } satisfies ProvisionResult;
  });

  // ── Send workspace-ready email (outside transaction — failure is non-fatal) ─
  if (emailPayload) {
    const { to, firstName, orgName, setupUrl, tokenExpiresAt } = emailPayload;
    try {
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        const { Resend } = await import("resend");
        const resend = new Resend(resendKey);
        const fromEmail =
          process.env.RESEND_FROM_EMAIL || "no-reply@hubifyhomesonline.com";
        await resend.emails.send({
          from: fromEmail,
          replyTo: "contact@hubifyhomes.com",
          to,
          subject: "Your Hubify workspace is ready — set up your account",
          html: buildWorkspaceReadyEmail({
            firstName,
            orgName,
            setupUrl,
            expiresAt: tokenExpiresAt,
          }),
        });
        log(`[betaProvisioning] Workspace-ready email sent to ${to}`);
      }
    } catch (emailErr) {
      log(`[betaProvisioning] Failed to send workspace-ready email: ${emailErr}`);
    }
  }

  return result;
}
