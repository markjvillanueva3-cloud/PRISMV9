/**
 * PRISM MCP Server -- Billing Routes
 * Stripe subscription management and post-processor purchases.
 *
 * Endpoints:
 *   POST /api/v1/billing/create-checkout   -- create subscription checkout
 *   POST /api/v1/billing/portal            -- customer billing portal
 *   POST /api/v1/billing/webhook           -- Stripe webhook (no auth, raw body)
 *   GET  /api/v1/billing/status            -- get user's subscription status
 *   POST /api/v1/billing/purchase-post     -- purchase/subscribe to post-processor
 */
import express, { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { StripeBillingEngine, verifyStripeSignature } from "../engines/StripeBillingEngine.js";
import { verifyToken, optionalToken, requireRole } from "../middleware/auth.js";
import { rateLimitMiddleware } from "../middleware/rateLimit.js";
import { subscriptionStore } from "../engines/SubscriptionStore.js";
import { licenseStore, LicenseStore } from "../engines/LicenseStore.js";
import type { Plan } from "../engines/AuthEngineV7.js";
import type { SubscriptionStatus } from "../engines/SubscriptionStore.js";
import { log } from "../utils/Logger.js";

const billing = new StripeBillingEngine({
  testMode: process.env["STRIPE_TEST_MODE"] !== "false",
});

const VALID_PLANS: readonly Plan[] = ["free", "starter", "pro", "shop", "enterprise"];

/**
 * U-COMM-02b: apply a verified webhook event to the SubscriptionStore.
 * Pure-ish (single store call); exported for tests. Returns what it did.
 */
export function applyWebhookToStore(
  result: { action: string; data: Record<string, any> },
  store = subscriptionStore,
): { applied: boolean; reason: string } {
  const { action, data } = result;
  const customerId: string | undefined = data?.customerId;
  switch (action) {
    case "subscription_created": {
      const userId: string | undefined = data?.userId;
      const plan = data?.plan as Plan | undefined;
      if (!userId || !plan || !VALID_PLANS.includes(plan)) {
        return { applied: false, reason: "missing userId/plan in checkout metadata" };
      }
      store.setPlan(userId, plan, "active");
      if (customerId) store.linkCustomer(userId, customerId);
      return { applied: true, reason: `set ${userId} -> ${plan}` };
    }
    case "subscription_updated": {
      if (!customerId) return { applied: false, reason: "no customerId" };
      const userId = store.getUserIdByCustomer(customerId);
      if (!userId) return { applied: false, reason: "unknown customer" };
      const status = (data?.status as SubscriptionStatus) ?? "active";
      const rec = store.getRecord(userId);
      store.setPlan(userId, rec?.plan ?? "free", status);
      return { applied: true, reason: `${userId} status -> ${status}` };
    }
    case "subscription_canceled": {
      if (!customerId) return { applied: false, reason: "no customerId" };
      const userId = store.getUserIdByCustomer(customerId);
      if (!userId) return { applied: false, reason: "unknown customer" };
      const rec = store.getRecord(userId);
      store.setPlan(userId, rec?.plan ?? "free", "canceled");
      return { applied: true, reason: `${userId} canceled -> free entitlements` };
    }
    case "payment_failed": {
      if (!customerId) return { applied: false, reason: "no customerId" };
      const userId = store.getUserIdByCustomer(customerId);
      if (!userId) return { applied: false, reason: "unknown customer" };
      const rec = store.getRecord(userId);
      store.setPlan(userId, rec?.plan ?? "free", "past_due");
      return { applied: true, reason: `${userId} past_due -> free entitlements` };
    }
    default:
      return { applied: false, reason: `no-op for action ${action}` };
  }
}

// ============================================================================
// U-COMM-08b: one-time perpetual license endpoints (pure ops, store-injectable
// for tests -- mirrors applyWebhookToStore). The router wraps each with
// res.status(r.status).json(r.body). LicenseStore is the SoT; these are thin.
// ============================================================================

/** Activate a one-time perpetual license key for the authenticated user. */
export function activateLicenseOp(
  licenseKey: string | undefined,
  userId: string | undefined,
  store: LicenseStore = licenseStore,
): { status: number; body: Record<string, any> } {
  if (!licenseKey) return { status: 400, body: { error: { status: 400, message: "licenseKey is required", code: "MISSING_FIELD" } } };
  if (!userId) return { status: 401, body: { error: { status: 401, message: "authentication required", code: "UNAUTHENTICATED" } } };
  try {
    const rec = store.activate(licenseKey, userId);
    return { status: 200, body: { licenseKey: rec.licenseKey, product: rec.product, feature: rec.feature, scope: rec.scope ?? null, status: rec.status, activatedAt: rec.activatedAt } };
  } catch (e) {
    const msg = (e as Error).message;
    const code = /signature/.test(msg) ? "INVALID_KEY"
      : /unknown license key/.test(msg) ? "UNKNOWN_KEY"
      : /another account/.test(msg) ? "ALREADY_ACTIVATED"
      : /revoked/.test(msg) ? "REVOKED"
      : "ACTIVATION_FAILED";
    const status = code === "ALREADY_ACTIVATED" ? 409 : 400;
    return { status, body: { error: { status, message: msg, code } } };
  }
}

/** List the authenticated user's perpetual licenses. */
export function listLicensesOp(
  userId: string | undefined,
  store: LicenseStore = licenseStore,
): { status: number; body: Record<string, any> } {
  const licenses = userId ? store.getUserLicenses(userId) : [];
  return { status: 200, body: { licenses, count: licenses.length } };
}

/**
 * ADMIN issuance (comps / support / manual). Stripe one-time-payment webhook
 * issuance is the U-COMM-07 follow-up (handleWebhookEvent currently emits
 * subscription_created for every checkout.session.completed regardless of mode).
 */
export function issueLicenseOp(
  params: { product?: string; userId?: string; scope?: string },
  store: LicenseStore = licenseStore,
): { status: number; body: Record<string, any> } {
  if (!params.product) return { status: 400, body: { error: { status: 400, message: "product is required", code: "MISSING_FIELD" } } };
  try {
    const rec = store.issue({ product: params.product, userId: params.userId, scope: params.scope, source: "admin" });
    return { status: 200, body: { licenseKey: rec.licenseKey, product: rec.product, feature: rec.feature, scope: rec.scope ?? null, status: rec.status, userId: rec.userId } };
  } catch (e) {
    return { status: 400, body: { error: { status: 400, message: (e as Error).message, code: "ISSUE_FAILED" } } };
  }
}

/**
 * U-COMM-02: dedicated Stripe webhook router with RAW body + signature
 * verification. MUST be mounted BEFORE express.json (see index.ts intake
 * precedent) so the HMAC sees the exact bytes Stripe signed.
 */
export function createBillingWebhookRouter(): Router {
  const router = Router();
  router.post(
    "/webhook",
    express.raw({ type: "application/json", limit: "1mb" }),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        const sig = req.headers["stripe-signature"];
        const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";

        // In test mode (no secret provisioned) accept + parse without verify so
        // local/dev flows work; in live mode a valid signature is REQUIRED.
        const testMode = process.env["STRIPE_TEST_MODE"] !== "false";
        if (!testMode) {
          if (!secret) {
            res.status(500).json({ error: { status: 500, message: "STRIPE_WEBHOOK_SECRET not configured", code: "CONFIG" } });
            return;
          }
          if (typeof sig !== "string" || !verifyStripeSignature(rawBody, sig, secret)) {
            log.warn("[billing] webhook signature verification FAILED -- rejecting");
            res.status(400).json({ error: { status: 400, message: "Invalid signature", code: "BAD_SIGNATURE" } });
            return;
          }
        }

        let event: any;
        try {
          event = rawBody ? JSON.parse(rawBody) : {};
        } catch {
          res.status(400).json({ error: { status: 400, message: "Invalid JSON body", code: "BAD_BODY" } });
          return;
        }

        const result = await billing.handleWebhookEvent(event);
        // PERSIST BEFORE ACK (scrutiny P1): a 200 tells Stripe "delivered" and it
        // will NOT retry -- so a persist failure must surface as a non-2xx so the
        // verified event is redelivered, never silently lost.
        try {
          const applied = applyWebhookToStore(result);
          log.info(`[billing] webhook ${result.action}: ${applied.reason}`);
        } catch (e) {
          log.error(`[billing] webhook persist failed (returning 500 for Stripe retry): ${(e as Error).message}`);
          res.status(500).json({ error: { status: 500, message: "Webhook persist failed", code: "PERSIST_FAILED" } });
          return;
        }
        res.json({ received: true, action: result.action });
      } catch (e) {
        next(e);
      }
    },
  );
  return router;
}

/**
 * Creates billing router.
 * @returns Express Router
 */
export function createBillingRouter(): Router {
  const router = Router();

  // --------------------------------------------------------------------------
  // POST /create-checkout -- initiate subscription checkout
  // --------------------------------------------------------------------------
  router.post(
    "/create-checkout",
    rateLimitMiddleware("RL-BILLING", "ip"),
    verifyToken,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { plan } = req.body as { plan?: Plan };
        if (!plan) {
          res.status(400).json({
            error: { status: 400, message: "plan is required", code: "MISSING_FIELD" },
          });
          return;
        }

        const userId = req.userId ?? (req as any).user?.userId ?? "anonymous";
        const result = await billing.createCheckoutSession(userId, plan);
        res.json({ url: result.url, sessionId: result.sessionId });
      } catch (e) {
        next(e);
      }
    }
  );

  // --------------------------------------------------------------------------
  // POST /portal -- customer billing portal
  // --------------------------------------------------------------------------
  router.post(
    "/portal",
    rateLimitMiddleware("RL-BILLING", "ip"),
    verifyToken,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // U-COMM-02b: resolve the Stripe customerId from the authenticated user's
        // subscription record (the FE has no customerId). Fall back to an
        // explicit body customerId for back-compat / admin tooling.
        const bodyCustomerId = (req.body as { customerId?: string })?.customerId;
        const customerId = bodyCustomerId ?? subscriptionStore.getStripeCustomerId(req.userId ?? "");
        if (!customerId) {
          res.status(409).json({
            error: { status: 409, message: "No billing customer on file for this account yet. Complete a checkout first.", code: "NO_CUSTOMER" },
          });
          return;
        }

        const result = await billing.createPortalSession(customerId);
        res.json({ url: result.url });
      } catch (e) {
        next(e);
      }
    }
  );

  // --------------------------------------------------------------------------
  // POST /webhook -- MOVED to createBillingWebhookRouter() (U-COMM-02), mounted
  // BEFORE express.json in index.ts so HMAC sees the raw bytes. The old route
  // here parsed an already-json'd body with NO signature verification (security
  // P0); it is intentionally removed so there is exactly one webhook handler.
  // --------------------------------------------------------------------------

  // --------------------------------------------------------------------------
  // GET /status -- get user's current subscription status
  // --------------------------------------------------------------------------
  router.get(
    "/status",
    optionalToken,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const userId = req.userId ?? (req as any).user?.userId;
        const user = (req as any).user as { plan?: Plan; role?: string } | undefined;
        res.json({
          userId: userId ?? "anonymous",
          plan: user?.plan ?? "free",
          role: user?.role ?? "viewer",
          prices: billing.getPlanPrices(),
          authenticated: !!userId,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        next(e);
      }
    }
  );

  // --------------------------------------------------------------------------
  // POST /purchase-post -- purchase/subscribe to post-processor controller
  // --------------------------------------------------------------------------
  router.post(
    "/purchase-post",
    rateLimitMiddleware("RL-BILLING", "ip"),
    verifyToken,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { controller, type } = req.body as {
          controller?: string;
          type?: string;
        };

        if (!controller) {
          res.status(400).json({
            error: { status: 400, message: "controller is required", code: "MISSING_FIELD" },
          });
          return;
        }
        if (!type) {
          res.status(400).json({
            error: { status: 400, message: "type is required (monthly|annual|permanent)", code: "MISSING_FIELD" },
          });
          return;
        }

        const userId = req.userId ?? (req as any).user?.userId ?? "anonymous";
        const result = await billing.createPostPurchaseCheckout(userId, controller, type);
        res.json({ url: result.url, sessionId: result.sessionId });
      } catch (e) {
        next(e);
      }
    }
  );

  // --------------------------------------------------------------------------
  // POST /license/activate -- activate a one-time perpetual license key (U-COMM-08b)
  // --------------------------------------------------------------------------
  router.post(
    "/license/activate",
    rateLimitMiddleware("RL-BILLING", "ip"),
    verifyToken,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { licenseKey } = req.body as { licenseKey?: string };
        const userId = req.userId ?? (req as any).user?.userId;
        const r = activateLicenseOp(licenseKey, userId);
        res.status(r.status).json(r.body);
      } catch (e) {
        next(e);
      }
    }
  );

  // --------------------------------------------------------------------------
  // GET /licenses -- the authenticated user's perpetual licenses (U-COMM-08b)
  // --------------------------------------------------------------------------
  router.get(
    "/licenses",
    verifyToken,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const userId = req.userId ?? (req as any).user?.userId;
        const r = listLicensesOp(userId);
        res.status(r.status).json(r.body);
      } catch (e) {
        next(e);
      }
    }
  );

  // --------------------------------------------------------------------------
  // POST /license/issue -- ADMIN issuance (comps/support/manual). Admin-gated.
  // Stripe one-time-payment webhook issuance is the U-COMM-07 follow-up.
  // --------------------------------------------------------------------------
  router.post(
    "/license/issue",
    rateLimitMiddleware("RL-BILLING", "ip"),
    verifyToken,
    requireRole("admin"),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { product, userId, scope } = req.body as { product?: string; userId?: string; scope?: string };
        const r = issueLicenseOp({ product, userId, scope });
        res.status(r.status).json(r.body);
      } catch (e) {
        next(e);
      }
    }
  );

  return router;
}
