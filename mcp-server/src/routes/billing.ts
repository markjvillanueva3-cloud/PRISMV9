/**
 * PRISM MCP Server — Billing Routes
 * Stripe subscription management and post-processor purchases.
 *
 * Endpoints:
 *   POST /api/v1/billing/create-checkout   — create subscription checkout
 *   POST /api/v1/billing/portal            — customer billing portal
 *   POST /api/v1/billing/webhook           — Stripe webhook (no auth, raw body)
 *   GET  /api/v1/billing/status            — get user's subscription status
 *   POST /api/v1/billing/purchase-post     — purchase/subscribe to post-processor
 */
import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { StripeBillingEngine } from "../engines/StripeBillingEngine.js";
import { verifyToken, optionalToken } from "../middleware/auth.js";
import { rateLimitMiddleware } from "../middleware/rateLimit.js";
import type { Plan } from "../engines/AuthEngineV7.js";

const billing = new StripeBillingEngine({
  testMode: process.env["STRIPE_TEST_MODE"] !== "false",
});

/**
 * Creates billing router.
 * @returns Express Router
 */
export function createBillingRouter(): Router {
  const router = Router();

  // --------------------------------------------------------------------------
  // POST /create-checkout — initiate subscription checkout
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
  // POST /portal — customer billing portal
  // --------------------------------------------------------------------------
  router.post(
    "/portal",
    rateLimitMiddleware("RL-BILLING", "ip"),
    verifyToken,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const { customerId } = req.body as { customerId?: string };
        if (!customerId) {
          res.status(400).json({
            error: { status: 400, message: "customerId is required", code: "MISSING_FIELD" },
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
  // POST /webhook — Stripe webhook (NO auth middleware, raw body required)
  // --------------------------------------------------------------------------
  router.post(
    "/webhook",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // In production, verify Stripe signature here:
        //   const sig = req.headers["stripe-signature"];
        //   const event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
        // We pass the parsed event body directly (body-parser must use raw for this route)
        const event = req.body;
        const result = await billing.handleWebhookEvent(event);

        // Respond 200 quickly to acknowledge receipt
        res.json({ received: true, action: result.action });

        // Side-effect: update DB subscription state based on result.action
        // (DB calls are fire-and-forget here — webhook handler already returned 200)
      } catch (e) {
        next(e);
      }
    }
  );

  // --------------------------------------------------------------------------
  // GET /status — get user's current subscription status
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
  // POST /purchase-post — purchase/subscribe to post-processor controller
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

  return router;
}
