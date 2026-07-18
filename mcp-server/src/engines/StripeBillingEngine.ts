/**
 * PRISM MCP Server — StripeBillingEngine
 * Stripe subscription + post-processor purchase billing.
 *
 * Spec (MIT 6.005 contract):
 *   - testMode: true  → all methods return mock data, zero Stripe API calls
 *   - testMode: false → uses Stripe SDK with STRIPE_SECRET_KEY env var
 *   - calculatePostProcessorPrice is pure — no I/O
 *   - All pricing in cents (USD × 100)
 *   - handleWebhookEvent always returns { action, data } — never throws on unknown events
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Plan } from "./AuthEngineV7.js";

// ============================================================================
// Webhook signature verification (U-COMM-02 -- security P0)
// ============================================================================

/**
 * Verify a Stripe webhook signature against the raw request body.
 * Implements Stripe's documented scheme (no SDK dependency):
 *   - header `Stripe-Signature: t=<ts>,v1=<hex_hmac>[,v1=...]`
 *   - signed payload = `${t}.${rawBody}`
 *   - HMAC-SHA256 with the endpoint signing secret (whsec_...)
 *   - constant-time compare; optional timestamp tolerance (replay window)
 *
 * Pure function, exported for tests. Returns false on any malformed input
 * (fail closed): a missing/garbled signature is never "valid".
 *
 * @param rawBody       exact bytes Stripe POSTed (NOT a re-serialized object)
 * @param sigHeader     value of the Stripe-Signature header
 * @param secret        STRIPE_WEBHOOK_SECRET
 * @param toleranceSec  max age of the signed timestamp (0 = skip age check)
 * @param nowSec        injectable clock for tests (default Date.now()/1000)
 */
export function verifyStripeSignature(
  rawBody: string,
  sigHeader: string,
  secret: string,
  toleranceSec = 300,
  nowSec?: number,
): boolean {
  if (!rawBody || !sigHeader || !secret) return false;
  // Parse "t=...,v1=...,v1=..."
  let t: string | null = null;
  const v1: string[] = [];
  for (const part of sigHeader.split(",")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k === "t") t = v;
    else if (k === "v1") v1.push(v);
  }
  if (!t || v1.length === 0) return false;

  if (toleranceSec > 0) {
    const ts = Number(t);
    if (!Number.isFinite(ts)) return false;
    const now = nowSec ?? Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > toleranceSec) return false; // replay / stale
  }

  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`, "utf8").digest("hex");
  const expBuf = Buffer.from(expected, "utf8");
  // Any provided v1 matching (constant-time) is accepted (Stripe rotates secrets).
  for (const sig of v1) {
    const sigBuf = Buffer.from(sig, "utf8");
    if (sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf)) return true;
  }
  return false;
}

// ============================================================================
// Types
// ============================================================================

export interface PlanPrice {
  plan: Plan;
  monthly_cents: number;
  annual_cents: number;
  label: string;
}

export type PostPurchaseType = "monthly" | "annual" | "permanent";

export interface PostProcessorPrice {
  type: PostPurchaseType | "bundle_5" | "bundle_all";
  cents: number;
  label: string;
}

export interface CheckoutResult {
  url: string;
  sessionId?: string;
}

export interface WebhookResult {
  action: string;
  data: Record<string, any>;
}

// ============================================================================
// Pricing constants — single source of truth
// ============================================================================

const PLAN_PRICES: Record<Plan, { monthly_cents: number; annual_cents: number; label: string }> = {
  free:       { monthly_cents: 0,      annual_cents: 0,       label: "Free" },
  starter:    { monthly_cents: 2900,   annual_cents: 29000,   label: "Starter" },
  pro:        { monthly_cents: 7900,   annual_cents: 79000,   label: "Pro" },
  shop:       { monthly_cents: 19900,  annual_cents: 199000,  label: "Shop" },
  enterprise: { monthly_cents: 49900,  annual_cents: 499000,  label: "Enterprise" },
};

const POST_PROCESSOR_PRICES = {
  monthly:    900,    // $9 / controller / month
  annual:     7900,   // $79 / controller / year
  permanent:  19900,  // $199 / controller (single)
  bundle_5:   79900,  // $799 / 5+ controllers
  bundle_all: 249900, // $2499 / 20+ (all)
} as const;

// ============================================================================
// StripeBillingEngine
// ============================================================================

/**
 * Stripe billing integration with test-mode support.
 *
 * @param options.testMode - if true, returns mock data (no Stripe calls). Default: true.
 */
export class StripeBillingEngine {
  readonly engineName = "StripeBillingEngine";
  readonly version = "7.0.0";

  private readonly testMode: boolean;
  private stripe: any = null; // Lazy-loaded real Stripe instance

  constructor(options?: { testMode?: boolean }) {
    this.testMode = options?.testMode !== false; // default true (safe)
    if (!this.testMode) {
      this._initStripe();
    }
  }

  /** Lazily initialize real Stripe SDK */
  private _initStripe(): void {
    const key = process.env["STRIPE_SECRET_KEY"];
    if (!key) {
      throw new Error("StripeBillingEngine: STRIPE_SECRET_KEY env var required in live mode");
    }
    // Use native fetch against Stripe REST API (no SDK dependency)
    this.stripe = {
      _key: key,
      async _request(method: string, path: string, body?: Record<string, string>) {
        const url = `https://api.stripe.com/v1${path}`;
        const headers: Record<string, string> = {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/x-www-form-urlencoded",
        };
        const res = await fetch(url, {
          method,
          headers,
          body: body ? new URLSearchParams(body).toString() : undefined,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
          throw new Error(`Stripe API error: ${(err as any).error?.message ?? res.statusText}`);
        }
        return res.json();
      },
      checkout: {
        sessions: {
          create: (params: Record<string, any>) =>
            (this.stripe as any)._request("POST", "/checkout/sessions", params),
        },
      },
      subscriptions: {
        retrieve: (id: string) => (this.stripe as any)._request("GET", `/subscriptions/${id}`),
        cancel: (id: string) => (this.stripe as any)._request("DELETE", `/subscriptions/${id}`),
      },
      webhooks: {
        constructEvent: (payload: string, sig: string, secret: string) => {
          // In live mode without SDK, return parsed payload (signature verification requires Stripe SDK)
          return JSON.parse(payload);
        },
      },
    };
  }

  // --------------------------------------------------------------------------
  // Pricing queries (always available, no Stripe calls)
  // --------------------------------------------------------------------------

  /**
   * Return plan name → price mapping.
   * Includes all plans except free (which has no Stripe product).
   */
  getPlanPrices(): Record<string, { monthly_cents: number; annual_cents: number; label: string }> {
    const result: Record<string, typeof PLAN_PRICES[Plan]> = {};
    for (const [plan, price] of Object.entries(PLAN_PRICES)) {
      if (plan !== "free") {
        result[plan] = price;
      }
    }
    return result;
  }

  /**
   * Return post-processor purchase type → price mapping (in cents).
   */
  getPostProcessorPrices(): Record<string, { cents: number; label: string }> {
    return {
      monthly:    { cents: POST_PROCESSOR_PRICES.monthly,    label: "$9/controller/month" },
      annual:     { cents: POST_PROCESSOR_PRICES.annual,     label: "$79/controller/year" },
      permanent:  { cents: POST_PROCESSOR_PRICES.permanent,  label: "$199/controller (single)" },
      bundle_5:   { cents: POST_PROCESSOR_PRICES.bundle_5,   label: "$799 bundle (5+ controllers)" },
      bundle_all: { cents: POST_PROCESSOR_PRICES.bundle_all, label: "$2,499 all controllers (20+)" },
    };
  }

  /**
   * Calculate post-processor price in cents.
   * Pure function — no I/O.
   *
   * @param type     - "monthly" | "annual" | "permanent"
   * @param quantity - number of controllers
   * @returns price in cents
   */
  calculatePostProcessorPrice(type: PostPurchaseType, quantity: number): number {
    if (type === "monthly") return POST_PROCESSOR_PRICES.monthly * quantity;
    if (type === "annual")  return POST_PROCESSOR_PRICES.annual  * quantity;

    // permanent — check bundle thresholds
    if (type === "permanent") {
      if (quantity >= 20) return POST_PROCESSOR_PRICES.bundle_all;
      if (quantity >= 5)  return POST_PROCESSOR_PRICES.bundle_5;
      return POST_PROCESSOR_PRICES.permanent * quantity;
    }

    throw new Error(`calculatePostProcessorPrice: unknown type "${type}"`);
  }

  // --------------------------------------------------------------------------
  // Checkout sessions
  // --------------------------------------------------------------------------

  /**
   * Create a Stripe Checkout session for a subscription plan.
   * In test mode returns a mock URL.
   *
   * @param userId - PRISM user id (stored in metadata)
   * @param plan   - target subscription plan
   * @returns { url } redirect URL for Stripe Checkout
   */
  async createCheckoutSession(userId: string, plan: Plan): Promise<CheckoutResult> {
    if (this.testMode) {
      return {
        url: `https://checkout.stripe.com/mock/session?user=${userId}&plan=${plan}`,
        sessionId: `cs_test_mock_${userId}_${plan}_${Date.now()}`,
      };
    }

    const prices = PLAN_PRICES[plan];
    if (!prices || prices.monthly_cents === 0) {
      throw new Error(`createCheckoutSession: plan "${plan}" has no paid price`);
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: `PRISM ${prices.label}` },
          unit_amount: prices.monthly_cents,
          recurring: { interval: "month" },
        },
        quantity: 1,
      }],
      metadata: { userId, plan },
      success_url: `${process.env["APP_URL"] ?? "https://app.prism.ai"}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env["APP_URL"] ?? "https://app.prism.ai"}/billing/cancel`,
    });

    return { url: session.url ?? "", sessionId: session.id };
  }

  /**
   * Create a Stripe Billing Portal session for managing subscription.
   *
   * @param customerId - Stripe customer ID
   * @returns { url } redirect URL for Billing Portal
   */
  async createPortalSession(customerId: string): Promise<{ url: string }> {
    if (this.testMode) {
      return { url: `https://billing.stripe.com/mock/portal?customer=${customerId}` };
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env["APP_URL"] ?? "https://app.prism.ai"}/settings/billing`,
    });

    return { url: session.url };
  }

  /**
   * Create a Checkout session for a post-processor controller purchase.
   *
   * @param userId     - PRISM user id
   * @param controller - controller name (e.g. "fanuc_30i")
   * @param type       - "monthly" | "annual" | "permanent"
   * @returns { url } redirect URL
   */
  async createPostPurchaseCheckout(
    userId: string,
    controller: string,
    type: string
  ): Promise<CheckoutResult> {
    if (this.testMode) {
      return {
        url: `https://checkout.stripe.com/mock/post?user=${userId}&ctrl=${controller}&type=${type}`,
        sessionId: `cs_test_mock_post_${userId}_${controller}_${type}_${Date.now()}`,
      };
    }

    const cents = this.calculatePostProcessorPrice(type as PostPurchaseType, 1);
    const isRecurring = type === "monthly" || type === "annual";
    const interval = type === "monthly" ? "month" : type === "annual" ? "year" : null;

    const priceData: any = {
      currency: "usd",
      product_data: { name: `PRISM Post-Processor: ${controller} (${type})` },
      unit_amount: cents,
    };
    if (isRecurring && interval) {
      priceData.recurring = { interval };
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: isRecurring ? "subscription" : "payment",
      payment_method_types: ["card"],
      line_items: [{ price_data: priceData, quantity: 1 }],
      metadata: { userId, controller, purchase_type: type },
      success_url: `${process.env["APP_URL"] ?? "https://app.prism.ai"}/post-processor/success`,
      cancel_url:  `${process.env["APP_URL"] ?? "https://app.prism.ai"}/post-processor`,
    });

    return { url: session.url ?? "", sessionId: session.id };
  }

  // --------------------------------------------------------------------------
  // Webhook handler
  // --------------------------------------------------------------------------

  /**
   * Process a Stripe webhook event.
   * Always returns { action, data } — never throws on unknown event types.
   *
   * @param event - Stripe event object (already verified by route layer)
   * @returns { action, data }
   */
  async handleWebhookEvent(event: any): Promise<WebhookResult> {
    const type: string = event?.type ?? "unknown";

    switch (type) {
      case "checkout.session.completed": {
        const session = event.data?.object ?? {};
        return {
          action: "subscription_created",
          data: {
            userId:         session.metadata?.userId,
            plan:           session.metadata?.plan,
            customerId:     session.customer,
            subscriptionId: session.subscription,
          },
        };
      }

      case "customer.subscription.updated": {
        const sub = event.data?.object ?? {};
        return {
          action: "subscription_updated",
          data: {
            subscriptionId: sub.id,
            customerId:     sub.customer,
            status:         sub.status,
            planId:         sub.items?.data?.[0]?.price?.id,
          },
        };
      }

      case "customer.subscription.deleted": {
        const sub = event.data?.object ?? {};
        return {
          action: "subscription_canceled",
          data: {
            subscriptionId: sub.id,
            customerId:     sub.customer,
          },
        };
      }

      case "invoice.payment_failed": {
        const inv = event.data?.object ?? {};
        return {
          action: "payment_failed",
          data: {
            customerId:     inv.customer,
            subscriptionId: inv.subscription,
            amount:         inv.amount_due,
          },
        };
      }

      case "invoice.payment_succeeded": {
        const inv = event.data?.object ?? {};
        return {
          action: "payment_succeeded",
          data: {
            customerId:     inv.customer,
            subscriptionId: inv.subscription,
            amount:         inv.amount_paid,
            periodEnd:      inv.period_end,
          },
        };
      }

      case "payment_intent.succeeded": {
        const pi = event.data?.object ?? {};
        return {
          action: "post_processor_purchased",
          data: {
            paymentIntentId: pi.id,
            customerId:      pi.customer,
            metadata:        pi.metadata ?? {},
          },
        };
      }

      default:
        return {
          action: "unhandled",
          data: { type, received: new Date().toISOString() },
        };
    }
  }

  // --------------------------------------------------------------------------
  // PRISM standard stats
  // --------------------------------------------------------------------------

  stats() {
    return {
      engineName: this.engineName,
      version: this.version,
      testMode: this.testMode,
      methods: [
        "getPlanPrices",
        "getPostProcessorPrices",
        "calculatePostProcessorPrice",
        "createCheckoutSession",
        "createPortalSession",
        "createPostPurchaseCheckout",
        "handleWebhookEvent",
        "stats",
      ],
      planCount: Object.keys(PLAN_PRICES).length,
    };
  }
}
