import Stripe from "stripe";
import { storage } from "./storage";

// Master Stripe instance for billing organizations (Hubify's Stripe account)
let masterStripe: Stripe | null = null;

if (process.env.STRIPE_SECRET_KEY) {
  masterStripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-11-20.acacia",
  });
}

export function getMasterStripe(): Stripe {
  if (!masterStripe) {
    throw new Error("Master Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.");
  }
  return masterStripe;
}

// Create a Stripe instance for a specific organization using their connected account
export async function getOrgStripe(orgId: string): Promise<{ stripe: Stripe; accountId?: string } | null> {
  const connection = await storage.getOrgStripeConnection(orgId);
  
  if (!connection || !connection.isActive) {
    return null;
  }

  // If using Stripe Connect
  if (connection.accountType === "connect" && connection.stripeAccountId) {
    if (!masterStripe) {
      throw new Error("Master Stripe is required for Stripe Connect operations");
    }
    // Return master stripe with account ID to use stripeAccount parameter in API calls
    return {
      stripe: masterStripe,
      accountId: connection.stripeAccountId,
    };
  }

  // If using direct API keys
  if (connection.accountType === "direct" && connection.stripeSecretKey) {
    return {
      stripe: new Stripe(connection.stripeSecretKey, {
        apiVersion: "2024-11-20.acacia",
      }),
    };
  }

  return null;
}

// Master billing functions for organization subscriptions
export async function createSubscription(orgId: string, orgName: string, email: string, priceId: string) {
  const stripe = getMasterStripe();
  
  // Create or retrieve customer
  const customer = await stripe.customers.create({
    email,
    name: orgName,
    metadata: { orgId },
  });

  // Create subscription with orgId in metadata
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: priceId }],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    expand: ["latest_invoice.payment_intent"],
    metadata: { orgId }, // Critical: Add orgId to subscription metadata
  });

  // Upsert org subscription in database
  await storage.upsertOrgSubscription(orgId, {
    orgId,
    stripeCustomerId: customer.id,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    status: subscription.status as any,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  return {
    subscriptionId: subscription.id,
    clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
  };
}

export async function cancelSubscription(orgId: string, cancelAtPeriodEnd: boolean = true) {
  const stripe = getMasterStripe();
  const orgSub = await storage.getOrgSubscription(orgId);
  
  if (!orgSub?.stripeSubscriptionId) {
    throw new Error("No active subscription found");
  }

  const subscription = await stripe.subscriptions.update(orgSub.stripeSubscriptionId, {
    cancel_at_period_end: cancelAtPeriodEnd,
  });

  await storage.updateOrgSubscription(orgId, {
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    status: subscription.status as any,
  });

  return subscription;
}

export async function updateSubscription(orgId: string, newPriceId: string) {
  const stripe = getMasterStripe();
  const orgSub = await storage.getOrgSubscription(orgId);
  
  if (!orgSub?.stripeSubscriptionId) {
    throw new Error("No active subscription found");
  }

  const subscription = await stripe.subscriptions.retrieve(orgSub.stripeSubscriptionId);
  
  const updatedSubscription = await stripe.subscriptions.update(orgSub.stripeSubscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
  });

  await storage.updateOrgSubscription(orgId, {
    stripePriceId: newPriceId,
    status: updatedSubscription.status as any,
  });

  return updatedSubscription;
}

// Stripe Connect functions for per-organization connections
export async function createStripeConnectAccount(orgId: string, orgName: string, email: string) {
  const stripe = getMasterStripe();

  const account = await stripe.accounts.create({
    type: "standard",
    email,
    business_profile: {
      name: orgName,
    },
    metadata: { orgId },
  });

  await storage.createOrgStripeConnection({
    orgId,
    stripeAccountId: account.id,
    accountType: "connect",
    isActive: false, // Will be activated after onboarding
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
  });

  return account;
}

export async function createStripeConnectAccountLink(accountId: string, returnUrl: string, refreshUrl: string) {
  const stripe = getMasterStripe();

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });

  return accountLink;
}

// Webhook handlers
export async function handleMasterWebhook(event: Stripe.Event) {
  // Record the webhook event
  await storage.recordWebhookEvent({
    stripeEventId: event.id,
    eventSource: "master",
    orgId: null,
    eventType: event.type,
    eventData: event.data as any,
  });

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }

    await storage.markWebhookProcessed(event.id);
  } catch (error) {
    await storage.markWebhookProcessed(event.id, (error as Error).message);
    throw error;
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const orgId = subscription.metadata.orgId;
  if (!orgId) return;

  // Use upsert to handle cases where the subscription row doesn't exist yet
  await storage.upsertOrgSubscription(orgId, {
    orgId,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: subscription.customer as string,
    status: subscription.status as any,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const orgId = subscription.metadata.orgId;
  if (!orgId) return;

  await storage.updateOrgSubscription(orgId, {
    status: "canceled",
  });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscription = invoice.subscription;
  if (!subscription || typeof subscription !== "string") return;

  const sub = await getMasterStripe().subscriptions.retrieve(subscription);
  const orgId = sub.metadata.orgId;
  if (!orgId) return;

  await storage.updateOrgSubscription(orgId, {
    renewedAt: new Date(),
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscription = invoice.subscription;
  if (!subscription || typeof subscription !== "string") return;

  const sub = await getMasterStripe().subscriptions.retrieve(subscription);
  const orgId = sub.metadata.orgId;
  if (!orgId) return;

  await storage.updateOrgSubscription(orgId, {
    status: "past_due",
  });
}
