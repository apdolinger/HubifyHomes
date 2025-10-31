import Stripe from "stripe";
import { nanoid } from "nanoid";
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

// Handle setup_intent.succeeded to save payment method
async function handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent, orgId: string) {
  const paymentMethodId = setupIntent.payment_method;
  if (!paymentMethodId || typeof paymentMethodId !== 'string') {
    console.log('No payment method attached to setup intent');
    return;
  }

  const clientId = setupIntent.metadata?.clientId;
  if (!clientId) {
    console.log('No clientId in setup intent metadata');
    return;
  }

  try {
    // Get the Stripe instance for this org
    const orgStripeConnection = await getOrgStripe(orgId);
    if (!orgStripeConnection) {
      console.error('Organization Stripe connection not found');
      return;
    }

    // Retrieve full payment method details from Stripe
    const paymentMethod = await orgStripeConnection.stripe.paymentMethods.retrieve(paymentMethodId);

    // Determine if this should be the default payment method
    const existingPaymentMethods = await storage.getClientPaymentMethods(clientId);
    const isFirst = existingPaymentMethods.length === 0;

    // Save payment method to database
    await storage.createClientPaymentMethod({
      id: nanoid(),
      orgId,
      clientId,
      stripePaymentMethodId: paymentMethod.id,
      paymentMethodType: paymentMethod.type,
      last4: paymentMethod.type === 'card' 
        ? paymentMethod.card?.last4 || null
        : paymentMethod.type === 'us_bank_account'
          ? paymentMethod.us_bank_account?.last4 || null
          : null,
      brand: paymentMethod.type === 'card' ? paymentMethod.card?.brand || null : null,
      expMonth: paymentMethod.type === 'card' ? paymentMethod.card?.exp_month || null : null,
      expYear: paymentMethod.type === 'card' ? paymentMethod.card?.exp_year || null : null,
      bankName: paymentMethod.type === 'us_bank_account' 
        ? paymentMethod.us_bank_account?.bank_name || null 
        : null,
      isDefault: isFirst, // First payment method is default
    });

    console.log(`Payment method ${paymentMethod.id} saved for client ${clientId}`);
  } catch (error) {
    console.error('Error saving payment method:', error);
    throw error;
  }
}

// Handle payment_method.detached to remove payment method
async function handlePaymentMethodDetached(paymentMethod: Stripe.PaymentMethod, orgId: string) {
  try {
    // Find and delete the payment method from our database
    const dbPaymentMethod = await storage.getClientPaymentMethodByStripeId(paymentMethod.id);
    if (dbPaymentMethod) {
      await storage.deleteClientPaymentMethod(dbPaymentMethod.id);
      console.log(`Payment method ${paymentMethod.id} removed from database`);
    }
  } catch (error) {
    console.error('Error removing payment method:', error);
    throw error;
  }
}

// Organization-level webhook handler for client invoice payments
export async function handleOrgWebhook(event: Stripe.Event, orgId: string) {
  // Record the webhook event
  await storage.recordWebhookEvent({
    stripeEventId: event.id,
    eventSource: "organization",
    orgId,
    eventType: event.type,
    eventData: event.data as any,
  });

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, orgId);
        break;
      
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent, orgId);
        break;
      
      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge, orgId);
        break;
      
      case "setup_intent.succeeded":
        await handleSetupIntentSucceeded(event.data.object as Stripe.SetupIntent, orgId);
        break;
      
      case "payment_method.detached":
        await handlePaymentMethodDetached(event.data.object as Stripe.PaymentMethod, orgId);
        break;
    }

    await storage.markWebhookProcessed(event.id);
  } catch (error) {
    await storage.markWebhookProcessed(event.id, (error as Error).message);
    throw error;
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent, orgId: string) {
  // Find invoice by stripePaymentIntentId
  const invoiceId = paymentIntent.metadata.invoiceId;
  if (!invoiceId) {
    console.warn(`Payment intent ${paymentIntent.id} has no invoiceId in metadata`);
    return;
  }

  await storage.updateInvoicePaymentStatus(invoiceId, {
    status: "paid",
    paymentStatus: "succeeded",
    paymentMethod: paymentIntent.payment_method_types?.[0] || "card",
    paymentDate: new Date(),
    stripePaymentIntentId: paymentIntent.id,
    paymentError: null,
  });

  console.log(`Invoice ${invoiceId} payment succeeded via ${paymentIntent.id}`);
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent, orgId: string) {
  const invoiceId = paymentIntent.metadata.invoiceId;
  if (!invoiceId) {
    console.warn(`Payment intent ${paymentIntent.id} has no invoiceId in metadata`);
    return;
  }

  const errorMessage = paymentIntent.last_payment_error?.message || "Payment failed";

  await storage.updateInvoicePaymentStatus(invoiceId, {
    paymentStatus: "failed",
    paymentError: errorMessage,
    stripePaymentIntentId: paymentIntent.id,
  });

  // Send notification email about failed payment
  await sendPaymentFailureNotification(invoiceId, errorMessage);

  console.log(`Invoice ${invoiceId} payment failed: ${errorMessage}`);
}

async function handleChargeRefunded(charge: Stripe.Charge, orgId: string) {
  // Find invoice by stripePaymentIntentId from charge
  const paymentIntentId = typeof charge.payment_intent === "string" 
    ? charge.payment_intent 
    : charge.payment_intent?.id;

  if (!paymentIntentId) {
    console.warn(`Charge ${charge.id} has no payment intent`);
    return;
  }

  await storage.updateInvoicePaymentStatusByStripePaymentIntent(paymentIntentId, {
    paymentStatus: "refunded",
    status: "void",
  });

  console.log(`Charge ${charge.id} refunded for payment intent ${paymentIntentId}`);
}

async function sendPaymentFailureNotification(invoiceId: string, errorMessage: string) {
  try {
    // Get invoice details
    const invoice = await storage.getClientInvoice(invoiceId);
    if (!invoice) {
      console.warn(`Invoice ${invoiceId} not found for payment failure notification`);
      return;
    }

    // Get client details
    const client = await storage.getClient(invoice.clientId);
    if (!client) {
      console.warn(`Client not found for invoice ${invoiceId}`);
      return;
    }

    // Get organization details
    const org = await storage.getOrg(invoice.orgId);
    if (!org) {
      console.warn(`Organization not found for invoice ${invoiceId}`);
      return;
    }

    // Import SendGrid
    const sgMail = (await import("@sendgrid/mail")).default;
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    const supportEmailFrom = process.env.SUPPORT_EMAIL_FROM || "noreply@hubify.app";

    if (!SENDGRID_API_KEY) {
      console.warn("SENDGRID_API_KEY not configured, skipping email notification");
      return;
    }

    sgMail.setApiKey(SENDGRID_API_KEY);

    // Format amount
    const amountFormatted = `$${(invoice.amountCents / 100).toFixed(2)}`;

    // Build email HTML
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Failed</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 40px 20px; text-align: center; color: white; }
    .content { padding: 40px 30px; }
    .alert-box { background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
    .invoice-details { background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-label { font-weight: 600; color: #6b7280; }
    .detail-value { color: #111827; }
    .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { background-color: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Payment Failed</h1>
    </div>
    <div class="content">
      <h2>Payment Attempt Unsuccessful</h2>
      <p>We were unable to process the payment for your recent invoice. Please review the details below and update your payment method.</p>
      
      <div class="alert-box">
        <strong>Error:</strong> ${errorMessage}
      </div>
      
      <div class="invoice-details">
        <div class="detail-row">
          <span class="detail-label">Invoice Number:</span>
          <span class="detail-value">${invoice.invoiceNumber || 'N/A'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Amount:</span>
          <span class="detail-value">${amountFormatted}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Due Date:</span>
          <span class="detail-value">${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}</span>
        </div>
      </div>
      
      <p><strong>What to do next:</strong></p>
      <ul>
        <li>Verify your payment method has sufficient funds</li>
        <li>Update your payment information if needed</li>
        <li>Contact us if you need assistance</li>
      </ul>
      
      ${invoice.hostedInvoiceUrl ? `<a href="${invoice.hostedInvoiceUrl}" class="button">View Invoice & Retry Payment</a>` : ''}
    </div>
    <div class="footer">
      <p>${org.name}<br/>
      This is an automated notification. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `;

    const msg = {
      to: client.email,
      from: supportEmailFrom,
      subject: `Payment Failed - Invoice ${invoice.invoiceNumber || invoiceId}`,
      html: htmlContent,
    };

    await sgMail.send(msg);
    console.log(`Payment failure notification sent to ${client.email} for invoice ${invoiceId}`);
  } catch (error) {
    console.error(`Error sending payment failure notification for invoice ${invoiceId}:`, error);
    // Don't throw - email failure shouldn't break webhook processing
  }
}

// Client payment method collection functions

/**
 * Ensure a Stripe customer exists for the client
 * Creates a new customer if one doesn't exist, or returns existing customer ID
 */
export async function ensureStripeCustomerForClient(
  orgId: string,
  clientId: string,
  clientEmail: string,
  clientName?: string
): Promise<string> {
  const orgStripe = await getOrgStripe(orgId);
  if (!orgStripe) {
    throw new Error("Organization Stripe account not configured");
  }

  // Check if client already has a Stripe customer ID
  const client = await storage.getClient(clientId);
  if (!client) {
    throw new Error("Client not found");
  }

  // Check existing invoices for stripe customer ID
  const existingInvoices = await storage.getClientInvoicesByClient(clientId);
  const existingCustomerId = existingInvoices.find(inv => inv.stripeCustomerId)?.stripeCustomerId;

  if (existingCustomerId) {
    return existingCustomerId;
  }

  // Create new Stripe customer
  const customer = await orgStripe.stripe.customers.create({
    email: clientEmail,
    name: clientName || `${client.firstName || ''} ${client.lastName || ''}`.trim() || clientEmail,
    metadata: {
      clientId,
      orgId,
    },
  }, orgStripe.accountId ? { stripeAccount: orgStripe.accountId } : undefined);

  return customer.id;
}

/**
 * Create a SetupIntent for collecting payment methods
 * Returns client_secret for Stripe Elements
 */
export async function createSetupIntentForClient(
  orgId: string,
  clientId: string,
  clientEmail: string,
  paymentMethodTypes: ('card' | 'us_bank_account')[] = ['card', 'us_bank_account']
): Promise<{ clientSecret: string; setupIntentId: string }> {
  const orgStripe = await getOrgStripe(orgId);
  if (!orgStripe) {
    throw new Error("Organization Stripe account not configured");
  }

  // Ensure customer exists
  const customerId = await ensureStripeCustomerForClient(orgId, clientId, clientEmail);

  // Create SetupIntent
  const setupIntent = await orgStripe.stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: paymentMethodTypes,
    usage: 'off_session', // For future payments
    metadata: {
      clientId,
      orgId,
    },
  }, orgStripe.accountId ? { stripeAccount: orgStripe.accountId } : undefined);

  return {
    clientSecret: setupIntent.client_secret!,
    setupIntentId: setupIntent.id,
  };
}

/**
 * Retrieve payment method details from Stripe
 */
export async function getPaymentMethodDetails(
  orgId: string,
  paymentMethodId: string
): Promise<{
  type: 'card' | 'us_bank_account';
  brand?: string;
  last4: string;
  expMonth?: number;
  expYear?: number;
}> {
  const orgStripe = await getOrgStripe(orgId);
  if (!orgStripe) {
    throw new Error("Organization Stripe account not configured");
  }

  const paymentMethod = await orgStripe.stripe.paymentMethods.retrieve(
    paymentMethodId,
    orgStripe.accountId ? { stripeAccount: orgStripe.accountId } : undefined
  );

  if (paymentMethod.type === 'card' && paymentMethod.card) {
    return {
      type: 'card',
      brand: paymentMethod.card.brand,
      last4: paymentMethod.card.last4,
      expMonth: paymentMethod.card.exp_month,
      expYear: paymentMethod.card.exp_year,
    };
  } else if (paymentMethod.type === 'us_bank_account' && paymentMethod.us_bank_account) {
    return {
      type: 'us_bank_account',
      brand: paymentMethod.us_bank_account.bank_name || 'Bank',
      last4: paymentMethod.us_bank_account.last4,
    };
  }

  throw new Error(`Unsupported payment method type: ${paymentMethod.type}`);
}

/**
 * Detach a payment method from Stripe customer
 */
export async function detachPaymentMethod(
  orgId: string,
  paymentMethodId: string
): Promise<void> {
  const orgStripe = await getOrgStripe(orgId);
  if (!orgStripe) {
    throw new Error("Organization Stripe account not configured");
  }

  await orgStripe.stripe.paymentMethods.detach(
    paymentMethodId,
    orgStripe.accountId ? { stripeAccount: orgStripe.accountId } : undefined
  );
}
