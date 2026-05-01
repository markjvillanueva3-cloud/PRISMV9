/**
 * StripeBillingEngine — unit tests (test mode only, no Stripe API calls)
 * MIT 6.005: tests as specs — each test documents a contract.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { StripeBillingEngine } from "../engines/StripeBillingEngine.js";

let engine: StripeBillingEngine;

beforeAll(() => {
  engine = new StripeBillingEngine({ testMode: true });
});

// ============================================================================
// Plan prices
// ============================================================================
describe("getPlanPrices", () => {
  it("has starter plan", () => {
    const prices = engine.getPlanPrices();
    expect(prices["starter"]).toBeDefined();
    expect(prices["starter"].monthly_cents).toBeGreaterThan(0);
  });

  it("has pro plan", () => {
    const prices = engine.getPlanPrices();
    expect(prices["pro"]).toBeDefined();
  });

  it("has shop plan", () => {
    const prices = engine.getPlanPrices();
    expect(prices["shop"]).toBeDefined();
  });

  it("has enterprise plan", () => {
    const prices = engine.getPlanPrices();
    expect(prices["enterprise"]).toBeDefined();
  });

  it("does not include free plan (no Stripe product)", () => {
    const prices = engine.getPlanPrices();
    expect(prices["free"]).toBeUndefined();
  });
});

// ============================================================================
// Post-processor prices
// ============================================================================
describe("getPostProcessorPrices", () => {
  it("has monthly entry", () => {
    const prices = engine.getPostProcessorPrices();
    expect(prices["monthly"]).toBeDefined();
    expect(prices["monthly"].cents).toBe(900);
  });

  it("has annual entry", () => {
    const prices = engine.getPostProcessorPrices();
    expect(prices["annual"]).toBeDefined();
    expect(prices["annual"].cents).toBe(7900);
  });

  it("has permanent entry", () => {
    const prices = engine.getPostProcessorPrices();
    expect(prices["permanent"]).toBeDefined();
    expect(prices["permanent"].cents).toBe(19900);
  });

  it("has bundle_5 entry", () => {
    const prices = engine.getPostProcessorPrices();
    expect(prices["bundle_5"]).toBeDefined();
    expect(prices["bundle_5"].cents).toBe(79900);
  });

  it("has bundle_all entry", () => {
    const prices = engine.getPostProcessorPrices();
    expect(prices["bundle_all"]).toBeDefined();
    expect(prices["bundle_all"].cents).toBe(249900);
  });
});

// ============================================================================
// calculatePostProcessorPrice — pure function
// ============================================================================
describe("calculatePostProcessorPrice", () => {
  it("monthly 1 controller = 900 cents ($9)", () => {
    expect(engine.calculatePostProcessorPrice("monthly", 1)).toBe(900);
  });

  it("monthly 3 controllers = 2700 cents", () => {
    expect(engine.calculatePostProcessorPrice("monthly", 3)).toBe(2700);
  });

  it("annual 1 controller = 7900 cents ($79)", () => {
    expect(engine.calculatePostProcessorPrice("annual", 1)).toBe(7900);
  });

  it("annual 2 controllers = 15800 cents", () => {
    expect(engine.calculatePostProcessorPrice("annual", 2)).toBe(15800);
  });

  it("permanent 1 controller = 19900 cents ($199)", () => {
    expect(engine.calculatePostProcessorPrice("permanent", 1)).toBe(19900);
  });

  it("permanent 4 controllers = 79600 cents (4 × single, below bundle threshold)", () => {
    expect(engine.calculatePostProcessorPrice("permanent", 4)).toBe(79600);
  });

  it("permanent 5 controllers = 79900 cents (bundle_5 kicks in at qty >= 5)", () => {
    expect(engine.calculatePostProcessorPrice("permanent", 5)).toBe(79900);
  });

  it("permanent 10 controllers = 79900 cents (still bundle_5)", () => {
    expect(engine.calculatePostProcessorPrice("permanent", 10)).toBe(79900);
  });

  it("permanent 20 controllers = 249900 cents (bundle_all at qty >= 20)", () => {
    expect(engine.calculatePostProcessorPrice("permanent", 20)).toBe(249900);
  });

  it("permanent 50 controllers = 249900 cents (bundle_all)", () => {
    expect(engine.calculatePostProcessorPrice("permanent", 50)).toBe(249900);
  });

  it("throws on unknown type", () => {
    expect(() => engine.calculatePostProcessorPrice("unknown" as any, 1)).toThrow();
  });
});

// ============================================================================
// createCheckoutSession (test mode)
// ============================================================================
describe("createCheckoutSession (test mode)", () => {
  it("returns a mock URL string", async () => {
    const result = await engine.createCheckoutSession("user-123", "pro");
    expect(typeof result.url).toBe("string");
    expect(result.url.length).toBeGreaterThan(0);
  });

  it("URL contains userId and plan", async () => {
    const result = await engine.createCheckoutSession("user-456", "shop");
    expect(result.url).toContain("user-456");
    expect(result.url).toContain("shop");
  });

  it("returns sessionId in test mode", async () => {
    const result = await engine.createCheckoutSession("user-789", "starter");
    expect(result.sessionId).toBeDefined();
    expect(typeof result.sessionId).toBe("string");
  });
});

// ============================================================================
// createPortalSession (test mode)
// ============================================================================
describe("createPortalSession (test mode)", () => {
  it("returns a mock portal URL", async () => {
    const result = await engine.createPortalSession("cus_mock_123");
    expect(typeof result.url).toBe("string");
    expect(result.url).toContain("cus_mock_123");
  });
});

// ============================================================================
// createPostPurchaseCheckout (test mode)
// ============================================================================
describe("createPostPurchaseCheckout (test mode)", () => {
  it("returns URL containing controller and type", async () => {
    const result = await engine.createPostPurchaseCheckout("user-1", "fanuc_30i", "permanent");
    expect(result.url).toContain("fanuc_30i");
    expect(result.url).toContain("permanent");
  });
});

// ============================================================================
// handleWebhookEvent
// ============================================================================
describe("handleWebhookEvent", () => {
  it("checkout.session.completed → action = subscription_created", async () => {
    const event = {
      type: "checkout.session.completed",
      data: { object: { metadata: { userId: "u1", plan: "pro" }, customer: "cus_1", subscription: "sub_1" } },
    };
    const result = await engine.handleWebhookEvent(event);
    expect(result.action).toBe("subscription_created");
    expect(typeof result.data).toBe("object");
  });

  it("customer.subscription.updated → action = subscription_updated", async () => {
    const event = { type: "customer.subscription.updated", data: { object: { id: "sub_1", customer: "cus_1", status: "active" } } };
    const result = await engine.handleWebhookEvent(event);
    expect(result.action).toBe("subscription_updated");
  });

  it("customer.subscription.deleted → action = subscription_canceled", async () => {
    const event = { type: "customer.subscription.deleted", data: { object: { id: "sub_1", customer: "cus_1" } } };
    const result = await engine.handleWebhookEvent(event);
    expect(result.action).toBe("subscription_canceled");
  });

  it("invoice.payment_failed → action = payment_failed", async () => {
    const event = { type: "invoice.payment_failed", data: { object: { customer: "cus_1", subscription: "sub_1", amount_due: 7900 } } };
    const result = await engine.handleWebhookEvent(event);
    expect(result.action).toBe("payment_failed");
  });

  it("unknown event type → action = unhandled (no throw)", async () => {
    const result = await engine.handleWebhookEvent({ type: "some.future.event", data: {} });
    expect(result.action).toBe("unhandled");
  });

  it("null/undefined event → action = unhandled (no throw)", async () => {
    const result = await engine.handleWebhookEvent(null);
    expect(result.action).toBe("unhandled");
  });

  it("always returns { action: string, data: object } shape", async () => {
    const result = await engine.handleWebhookEvent({ type: "anything" });
    expect(typeof result.action).toBe("string");
    expect(typeof result.data).toBe("object");
  });
});

// ============================================================================
// stats
// ============================================================================
describe("stats", () => {
  it("returns engineName", () => {
    const s = engine.stats();
    expect(s.engineName).toBe("StripeBillingEngine");
  });

  it("returns methods array", () => {
    const s = engine.stats();
    expect(Array.isArray(s.methods)).toBe(true);
    expect(s.methods.length).toBeGreaterThan(0);
  });

  it("testMode is true", () => {
    const s = engine.stats();
    expect(s.testMode).toBe(true);
  });
});
