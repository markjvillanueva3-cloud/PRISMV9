/**
 * BillingEngine — SaaS billing for PRISM multi-tenant deployment
 *
 * Self-contained business logic for:
 *   - Subscription plans (free / shop / team / enterprise)
 *   - Usage-based tiered post pricing
 *   - Checkout session lifecycle (pending / completed / expired)
 *   - One-time post top-up purchases
 *   - Webhook event handling with HMAC-SHA256 signature verification
 *   - Stats aggregation (MRR, ARR, churn, MTD revenue)
 *
 * Architecture:
 *   Returns Stripe-shaped objects (session_id, url, etc.) but makes zero
 *   network calls. A future StripeAdapterEngine can wrap this engine to
 *   execute real Stripe API calls against live sessions. This split keeps
 *   tests deterministic and preserves the business logic as the source of
 *   truth for pricing, entitlements, and lifecycle transitions.
 *
 * Persistence:
 *   State lives at state/shared/billing-state.json with schemaVersion=1.
 *   Writes are atomic (utils/atomicSessionWrite.atomicWriteJson).
 *
 * Security:
 *   Webhook signatures follow Stripe's "t=<ts>,v1=<hmac>" format.
 *   HMAC-SHA256 of `{timestamp}.{payload}` using PRISM_BILLING_WEBHOOK_SECRET
 *   (or provided secret). Timestamp tolerance: 5 minutes (replay protection).
 *
 * References:
 *   - Stripe Webhooks: https://stripe.com/docs/webhooks/signatures
 *   - SaaS pricing best practices: Patrick Campbell (ProfitWell), Jason Lemkin
 *
 * @milestone LATHE-MASTER (cross-cut billing)
 * @version 1.0.0
 */

import { z } from "zod";
import { createHmac, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { atomicWriteJson } from "../utils/atomicSessionWrite.js";

// ============================================================================
// STATIC CATALOG — plans and post-price tiers
// ============================================================================

export interface Plan {
  id: string;
  name: string;
  price_cents: number;
  interval: "month" | "year";
  included_posts: number;
  seats: number;
  features: string[];
}

/** JM-Die-tuned SaaS catalog. Prices in USD cents. */
export const PLAN_CATALOG: ReadonlyArray<Plan> = [
  {
    id: "plan_free",
    name: "Free",
    price_cents: 0,
    interval: "month",
    included_posts: 1000,
    seats: 1,
    features: ["Basic engines", "Community support"],
  },
  {
    id: "plan_shop_monthly",
    name: "Shop",
    price_cents: 4900,
    interval: "month",
    included_posts: 10000,
    seats: 3,
    features: ["All engines", "Priority support", "Tribal knowledge export"],
  },
  {
    id: "plan_shop_annual",
    name: "Shop (Annual)",
    price_cents: 49000,
    interval: "year",
    included_posts: 120000,
    seats: 3,
    features: ["All engines", "Priority support", "Tribal knowledge export", "16% annual discount"],
  },
  {
    id: "plan_team_monthly",
    name: "Team",
    price_cents: 19900,
    interval: "month",
    included_posts: 50000,
    seats: 10,
    features: ["All engines", "SSO", "Dedicated support", "Custom materials"],
  },
  {
    id: "plan_team_annual",
    name: "Team (Annual)",
    price_cents: 199000,
    interval: "year",
    included_posts: 600000,
    seats: 10,
    features: ["All engines", "SSO", "Dedicated support", "Custom materials", "16% annual discount"],
  },
  {
    id: "plan_enterprise",
    name: "Enterprise",
    price_cents: 99900,
    interval: "month",
    included_posts: 1_000_000,
    seats: 100,
    features: ["All engines", "SSO", "SLA", "On-premises option", "Dedicated CSM", "Custom training"],
  },
];

export interface PostPriceTier {
  min_qty: number;
  max_qty: number | null;
  price_per_post_cents: number; // fractional cents stored as float
}

/**
 * Tiered usage-based pricing for API calls (posts).
 * Half-open intervals: [min_qty, max_qty). max_qty=null means unbounded.
 * Adjacency invariant: tier[i+1].min_qty === tier[i].max_qty.
 */
export const POST_PRICE_TIERS: ReadonlyArray<PostPriceTier> = [
  { min_qty: 0, max_qty: 10_000, price_per_post_cents: 0 }, // included (0..9999)
  { min_qty: 10_000, max_qty: 100_000, price_per_post_cents: 0.2 }, // $0.002
  { min_qty: 100_000, max_qty: 1_000_000, price_per_post_cents: 0.1 }, // $0.001
  { min_qty: 1_000_000, max_qty: null, price_per_post_cents: 0.05 }, // $0.0005
];

// ============================================================================
// SCHEMAS
// ============================================================================

export const PostCheckoutInputSchema = z.object({
  customer_id: z.string().min(1),
  posts: z.number().int().positive().max(100_000_000),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
});

export const CheckoutInputSchema = z.object({
  customer_id: z.string().min(1),
  plan_id: z.string().min(1),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
  trial_days: z.number().int().min(0).max(90).optional(),
});

export const PortalInputSchema = z.object({
  customer_id: z.string().min(1),
  return_url: z.string().url().optional(),
});

export const CalcPostPriceInputSchema = z.object({
  qty: z.number().int().min(0).max(1_000_000_000),
});

export const WebhookInputSchema = z.object({
  payload: z.string().min(1),
  signature: z.string().min(1),
  secret: z.string().min(1).optional(),
});

// ============================================================================
// DOMAIN TYPES
// ============================================================================

export interface Subscription {
  id: string;
  customer_id: string;
  plan_id: string;
  status: "trialing" | "active" | "past_due" | "canceled";
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  usage_posts_mtd: number;
  created_at: string;
  updated_at: string;
}

export interface CheckoutSession {
  id: string;
  customer_id: string;
  plan_id: string;
  status: "pending" | "completed" | "expired";
  amount_cents: number;
  url: string;
  expires_at: string;
  created_at: string;
  kind: "subscription" | "one_time_posts";
  posts?: number; // set when kind === "one_time_posts"
}

export interface WebhookEventLog {
  id: string;
  type: string;
  received_at: string;
  processed: boolean;
  actions_applied: string[];
}

export interface BillingState {
  schemaVersion: 1;
  subscriptions: Subscription[];
  checkout_sessions: CheckoutSession[];
  webhook_events: WebhookEventLog[];
  updated_at: string;
}

export interface BillingStats {
  active_subscriptions: number;
  mrr_cents: number;
  arr_cents: number;
  churn_rate_30d: number;
  total_usage_posts_mtd: number;
  revenue_mtd_cents: number;
  plans_breakdown: Record<string, number>;
}

// ============================================================================
// ENGINE
// ============================================================================

const DEFAULT_STATE_PATH = "H:/prism/state/shared/billing-state.json";
const SIGNATURE_TOLERANCE_SEC = 5 * 60; // 5 minutes — matches Stripe default

class BillingEngine {
  private state: BillingState;
  private readonly statePath: string;
  private sessionCounter = 0;

  constructor(statePath: string = DEFAULT_STATE_PATH) {
    this.statePath = statePath;
    this.state = this.loadState();
  }

  // --------------------------------------------------------------------------
  // Plan + price queries
  // --------------------------------------------------------------------------

  /** List available subscription plans. */
  getPlans(): ReadonlyArray<Plan> {
    return PLAN_CATALOG;
  }

  /** List post-usage pricing tiers. */
  getPostPrices(): ReadonlyArray<PostPriceTier> {
    return POST_PRICE_TIERS;
  }

  /**
   * Calculate the price for N posts using the tiered pricing table.
   * Returns per-tier breakdown plus total.
   *
   * Algorithm: walk tiers in order, allocate qty to each tier up to its cap,
   * multiply by the tier rate, sum. O(number_of_tiers) which is O(1) in practice.
   */
  calcPostPrice(input: z.infer<typeof CalcPostPriceInputSchema>): {
    qty: number;
    total_cents: number;
    breakdown: Array<{
      tier_index: number;
      min_qty: number;
      max_qty: number | null;
      qty_in_tier: number;
      rate_cents: number;
      subtotal_cents: number;
    }>;
  } {
    const { qty } = CalcPostPriceInputSchema.parse(input);
    let remaining = qty;
    let totalFractionalCents = 0;
    const breakdown: Array<{
      tier_index: number;
      min_qty: number;
      max_qty: number | null;
      qty_in_tier: number;
      rate_cents: number;
      subtotal_cents: number;
    }> = [];

    for (let i = 0; i < POST_PRICE_TIERS.length; i++) {
      if (remaining <= 0) break;
      const tier = POST_PRICE_TIERS[i];
      // Half-open interval [min_qty, max_qty): capacity is max_qty - min_qty.
      const tierCap = tier.max_qty === null ? Infinity : tier.max_qty - tier.min_qty;
      const qtyInTier = Math.min(remaining, tierCap);
      const subtotalFractional = qtyInTier * tier.price_per_post_cents;
      totalFractionalCents += subtotalFractional;
      breakdown.push({
        tier_index: i,
        min_qty: tier.min_qty,
        max_qty: tier.max_qty,
        qty_in_tier: qtyInTier,
        rate_cents: tier.price_per_post_cents,
        subtotal_cents: Math.round(subtotalFractional * 100) / 100,
      });
      remaining -= qtyInTier;
    }

    return {
      qty,
      total_cents: Math.round(totalFractionalCents),
      breakdown,
    };
  }

  // --------------------------------------------------------------------------
  // Checkout sessions
  // --------------------------------------------------------------------------

  /** Create a subscription checkout session. Stripe-shaped return. */
  createCheckout(input: z.infer<typeof CheckoutInputSchema>): CheckoutSession {
    const parsed = CheckoutInputSchema.parse(input);
    const plan = PLAN_CATALOG.find((p) => p.id === parsed.plan_id);
    if (!plan) {
      throw new Error(`BillingEngine.createCheckout: unknown plan_id '${parsed.plan_id}'`);
    }

    const session: CheckoutSession = {
      id: this.generateSessionId("cs_sub"),
      customer_id: parsed.customer_id,
      plan_id: parsed.plan_id,
      status: "pending",
      amount_cents: plan.price_cents,
      url: `https://billing.prism.local/checkout/${parsed.plan_id}/${this.sessionCounter}`,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      kind: "subscription",
    };

    this.state.checkout_sessions.push(session);
    this.persist();
    return session;
  }

  /** Create a customer portal session (manage subscription). */
  createPortal(input: z.infer<typeof PortalInputSchema>): {
    url: string;
    customer_id: string;
    expires_at: string;
    created_at: string;
  } {
    const parsed = PortalInputSchema.parse(input);
    const now = new Date();
    return {
      customer_id: parsed.customer_id,
      url: `https://billing.prism.local/portal/${parsed.customer_id}/${now.getTime()}`,
      expires_at: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      created_at: now.toISOString(),
    };
  }

  /**
   * Create a one-time post-credit purchase checkout. Top-ups bypass the free
   * tier (the free tier is a subscription benefit, not granted on top-ups) —
   * all posts are priced from the first non-zero tier onward, preserving the
   * tiered volume discount for large top-ups.
   */
  createPostCheckout(input: z.infer<typeof PostCheckoutInputSchema>): CheckoutSession {
    const parsed = PostCheckoutInputSchema.parse(input);
    const amountCents = this.computeTopUpPrice(parsed.posts);

    const session: CheckoutSession = {
      id: this.generateSessionId("cs_post"),
      customer_id: parsed.customer_id,
      plan_id: "one_time_posts",
      status: "pending",
      amount_cents: amountCents,
      url: `https://billing.prism.local/checkout/posts/${parsed.posts}/${this.sessionCounter}`,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      kind: "one_time_posts",
      posts: parsed.posts,
    };

    this.state.checkout_sessions.push(session);
    this.persist();
    return session;
  }

  // --------------------------------------------------------------------------
  // Webhook handling
  // --------------------------------------------------------------------------

  /**
   * Verify webhook signature and dispatch the event to the appropriate
   * state transition. Idempotent — returns the cached result for events
   * already in the event log.
   *
   * Accepted event types:
   *   - checkout.session.completed
   *   - customer.subscription.updated
   *   - customer.subscription.deleted
   *   - invoice.payment_failed
   *
   * Signature verification is HMAC-SHA256 over `{timestamp}.{payload}` with
   * the shared secret. Timestamp must be within 5 minutes of now.
   */
  handleWebhook(input: z.infer<typeof WebhookInputSchema>): {
    acknowledged: boolean;
    event_id: string | null;
    event_type: string | null;
    actions_applied: string[];
    reason?: string;
  } {
    const parsed = WebhookInputSchema.parse(input);
    const secret = parsed.secret ?? process.env.PRISM_BILLING_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error("BillingEngine.handleWebhook: secret missing (pass secret or set PRISM_BILLING_WEBHOOK_SECRET)");
    }

    const sigCheck = this.verifySignature(parsed.payload, parsed.signature, secret);
    if (!sigCheck.valid) {
      return {
        acknowledged: false,
        event_id: null,
        event_type: null,
        actions_applied: [],
        reason: sigCheck.reason,
      };
    }

    let event: { id: string; type: string; data: any };
    try {
      event = JSON.parse(parsed.payload);
    } catch {
      return {
        acknowledged: false,
        event_id: null,
        event_type: null,
        actions_applied: [],
        reason: "invalid_json",
      };
    }

    if (!event.id || !event.type) {
      return {
        acknowledged: false,
        event_id: null,
        event_type: null,
        actions_applied: [],
        reason: "missing_id_or_type",
      };
    }

    // Idempotent: return cached if already processed
    const existing = this.state.webhook_events.find((e) => e.id === event.id);
    if (existing) {
      return {
        acknowledged: true,
        event_id: existing.id,
        event_type: existing.type,
        actions_applied: existing.actions_applied,
      };
    }

    const actionsApplied = this.applyWebhookEvent(event);
    const log: WebhookEventLog = {
      id: event.id,
      type: event.type,
      received_at: new Date().toISOString(),
      processed: true,
      actions_applied: actionsApplied,
    };
    this.state.webhook_events.push(log);
    this.persist();

    return {
      acknowledged: true,
      event_id: event.id,
      event_type: event.type,
      actions_applied: actionsApplied,
    };
  }

  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------

  /** Aggregate MRR, ARR, churn, and MTD revenue. */
  stats(): BillingStats {
    const active = this.state.subscriptions.filter((s) => s.status === "active" || s.status === "trialing");
    let mrr = 0;
    const plansBreakdown: Record<string, number> = {};
    for (const sub of active) {
      const plan = PLAN_CATALOG.find((p) => p.id === sub.plan_id);
      if (!plan) continue;
      const monthlyCents = plan.interval === "year" ? Math.round(plan.price_cents / 12) : plan.price_cents;
      mrr += monthlyCents;
      plansBreakdown[plan.id] = (plansBreakdown[plan.id] ?? 0) + 1;
    }

    const now = Date.now();
    const cutoff30d = now - 30 * 24 * 60 * 60 * 1000;
    const canceledLast30 = this.state.subscriptions.filter(
      (s) => s.status === "canceled" && new Date(s.updated_at).getTime() >= cutoff30d,
    ).length;
    const activeAtWindowStart = active.length + canceledLast30;
    const churnRate = activeAtWindowStart > 0 ? canceledLast30 / activeAtWindowStart : 0;

    const mtdCutoff = new Date();
    mtdCutoff.setDate(1);
    mtdCutoff.setHours(0, 0, 0, 0);
    const mtdCheckouts = this.state.checkout_sessions.filter(
      (s) => s.status === "completed" && new Date(s.created_at) >= mtdCutoff,
    );
    const revenueMtdCents = mtdCheckouts.reduce((sum, s) => sum + s.amount_cents, 0);
    const totalUsageMtd = active.reduce((sum, s) => sum + s.usage_posts_mtd, 0);

    return {
      active_subscriptions: active.length,
      mrr_cents: mrr,
      arr_cents: mrr * 12,
      churn_rate_30d: Math.round(churnRate * 10000) / 10000,
      total_usage_posts_mtd: totalUsageMtd,
      revenue_mtd_cents: revenueMtdCents,
      plans_breakdown: plansBreakdown,
    };
  }

  // --------------------------------------------------------------------------
  // INTERNALS
  // --------------------------------------------------------------------------

  /**
   * Compute one-time top-up price in cents. Allocates posts across non-zero
   * tiers (tier 2 onward) in order, preserving the tier-2→3→4 volume breaks.
   * Returns the ceil-rounded cent total with a 1¢ floor for any positive qty.
   */
  private computeTopUpPrice(posts: number): number {
    let remaining = posts;
    let totalFractional = 0;
    for (const tier of POST_PRICE_TIERS) {
      if (remaining <= 0) break;
      if (tier.price_per_post_cents === 0) continue;
      const cap = tier.max_qty === null ? Infinity : tier.max_qty - tier.min_qty;
      const alloc = Math.min(remaining, cap);
      totalFractional += alloc * tier.price_per_post_cents;
      remaining -= alloc;
    }
    const rounded = Math.round(totalFractional);
    return posts > 0 && rounded === 0 ? 1 : rounded;
  }

  private generateSessionId(prefix: string): string {
    this.sessionCounter++;
    const random = Math.random().toString(36).slice(2, 10);
    return `${prefix}_${Date.now()}_${random}_${this.sessionCounter}`;
  }

  /**
   * Verify HMAC-SHA256 signature with Stripe-compatible format:
   *   signature = "t=<timestamp>,v1=<hex_hmac>"
   *   hmac_input = "<timestamp>.<payload>"
   */
  private verifySignature(payload: string, signature: string, secret: string): { valid: boolean; reason?: string } {
    // Parse "t=...,v1=..." (tolerate order)
    const parts = signature.split(",");
    let timestamp: string | undefined;
    let receivedHmac: string | undefined;
    for (const part of parts) {
      const [k, v] = part.split("=");
      if (k === "t") timestamp = v;
      if (k === "v1") receivedHmac = v;
    }
    if (!timestamp || !receivedHmac) {
      return { valid: false, reason: "malformed_signature" };
    }

    // Timestamp tolerance (replay protection)
    const ts = Number(timestamp);
    if (!Number.isFinite(ts)) {
      return { valid: false, reason: "invalid_timestamp" };
    }
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - ts) > SIGNATURE_TOLERANCE_SEC) {
      return { valid: false, reason: "timestamp_out_of_tolerance" };
    }

    // HMAC-SHA256
    const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(receivedHmac, "hex");
    if (a.length !== b.length) {
      return { valid: false, reason: "hmac_mismatch" };
    }
    if (!timingSafeEqual(a, b)) {
      return { valid: false, reason: "hmac_mismatch" };
    }
    return { valid: true };
  }

  /**
   * Compute a valid signature for testing or outbound dispatch.
   * Returns "t=<ts>,v1=<hex>" suitable for the `signature` input to handleWebhook.
   */
  computeSignature(payload: string, secret: string, timestampSec?: number): string {
    const ts = timestampSec ?? Math.floor(Date.now() / 1000);
    const hmac = createHmac("sha256", secret).update(`${ts}.${payload}`).digest("hex");
    return `t=${ts},v1=${hmac}`;
  }

  private applyWebhookEvent(event: { id: string; type: string; data: any }): string[] {
    const actions: string[] = [];
    const now = new Date().toISOString();

    switch (event.type) {
      case "checkout.session.completed": {
        const sessionId: string | undefined = event.data?.object?.id ?? event.data?.session_id;
        const session = this.state.checkout_sessions.find((s) => s.id === sessionId);
        if (session) {
          session.status = "completed";
          actions.push(`checkout_marked_completed:${session.id}`);

          if (session.kind === "subscription") {
            const plan = PLAN_CATALOG.find((p) => p.id === session.plan_id);
            if (plan) {
              const periodEnd = new Date();
              periodEnd.setMonth(periodEnd.getMonth() + (plan.interval === "year" ? 12 : 1));
              const sub: Subscription = {
                id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                customer_id: session.customer_id,
                plan_id: session.plan_id,
                status: "active",
                current_period_start: now,
                current_period_end: periodEnd.toISOString(),
                cancel_at_period_end: false,
                usage_posts_mtd: 0,
                created_at: now,
                updated_at: now,
              };
              this.state.subscriptions.push(sub);
              actions.push(`subscription_created:${sub.id}`);
            }
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subId: string | undefined = event.data?.object?.id ?? event.data?.subscription_id;
        const sub = this.state.subscriptions.find((s) => s.id === subId);
        if (sub) {
          const newStatus = event.data?.object?.status as Subscription["status"] | undefined;
          if (newStatus && ["trialing", "active", "past_due", "canceled"].includes(newStatus)) {
            sub.status = newStatus;
            sub.updated_at = now;
            actions.push(`subscription_status_updated:${sub.id}:${newStatus}`);
          }
          if (typeof event.data?.object?.cancel_at_period_end === "boolean") {
            sub.cancel_at_period_end = event.data.object.cancel_at_period_end;
            actions.push(`subscription_cancel_at_period_end_set:${sub.id}:${sub.cancel_at_period_end}`);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subId: string | undefined = event.data?.object?.id ?? event.data?.subscription_id;
        const sub = this.state.subscriptions.find((s) => s.id === subId);
        if (sub) {
          sub.status = "canceled";
          sub.updated_at = now;
          actions.push(`subscription_canceled:${sub.id}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const subId: string | undefined = event.data?.object?.subscription ?? event.data?.subscription_id;
        const sub = this.state.subscriptions.find((s) => s.id === subId);
        if (sub) {
          sub.status = "past_due";
          sub.updated_at = now;
          actions.push(`subscription_past_due:${sub.id}`);
        }
        break;
      }

      default:
        actions.push(`event_ignored:${event.type}`);
        break;
    }

    return actions;
  }

  private loadState(): BillingState {
    if (!existsSync(this.statePath)) {
      return this.freshState();
    }
    try {
      const raw = readFileSync(this.statePath, "utf-8");
      const parsed = JSON.parse(raw) as BillingState;
      if (parsed.schemaVersion !== 1) {
        throw new Error(`BillingEngine: unsupported schemaVersion ${parsed.schemaVersion}`);
      }
      return parsed;
    } catch (err: unknown) {
      // Corrupt file — reset to empty state. Preserve the file as .bak for debugging.
      const backupPath = `${this.statePath}.corrupt.bak`;
      try {
        const raw = readFileSync(this.statePath, "utf-8");
        atomicWriteJson(backupPath, { backup_at: new Date().toISOString(), raw });
      } catch {
        // ignore backup failures
      }
      return this.freshState();
    }
  }

  private freshState(): BillingState {
    return {
      schemaVersion: 1,
      subscriptions: [],
      checkout_sessions: [],
      webhook_events: [],
      updated_at: new Date().toISOString(),
    };
  }

  private persist(): void {
    this.state.updated_at = new Date().toISOString();
    const dir = dirname(this.statePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    atomicWriteJson(this.statePath, this.state);
  }

  /** TEST-ONLY: reset to fresh state and persist. */
  __resetForTests(): void {
    this.state = this.freshState();
    this.persist();
  }

  /** TEST-ONLY: accessor for state (read-only use; do not mutate). */
  __getState(): Readonly<BillingState> {
    return this.state;
  }
}

export const billingEngine = new BillingEngine();
export { BillingEngine };
