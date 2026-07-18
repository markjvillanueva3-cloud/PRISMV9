import { describe, it, expect } from "vitest";
import {
  PLAN_LIMITS,
  PLAN_PRICES,
  POST_PROCESSOR_PRICES,
  ONE_TIME_PRODUCTS,
} from "../config/pricing-registry.js";
import { TIER_LIMITS } from "../middleware/tierGate.js";
import { AuthEngineV7, type Plan } from "../engines/AuthEngineV7.js";
import { StripeBillingEngine } from "../engines/StripeBillingEngine.js";

const PLANS: Plan[] = ["free", "starter", "pro", "shop", "enterprise"];

describe("pricing-registry -- canonical reference values (R9)", () => {
  it("subscription prices in cents match the launch pricing spec", () => {
    expect(PLAN_PRICES.free.monthly_cents).toBe(0);
    expect(PLAN_PRICES.starter.monthly_cents).toBe(2900);
    expect(PLAN_PRICES.starter.annual_cents).toBe(29000);
    expect(PLAN_PRICES.pro.monthly_cents).toBe(7900);
    expect(PLAN_PRICES.pro.annual_cents).toBe(79000);
    expect(PLAN_PRICES.shop.monthly_cents).toBe(19900);
    expect(PLAN_PRICES.shop.annual_cents).toBe(199000);
    expect(PLAN_PRICES.enterprise.monthly_cents).toBe(49900);
    expect(PLAN_PRICES.enterprise.annual_cents).toBe(499000);
  });

  it("post-processor prices in cents match the spec", () => {
    expect(POST_PROCESSOR_PRICES.monthly).toBe(900);
    expect(POST_PROCESSOR_PRICES.annual).toBe(7900);
    expect(POST_PROCESSOR_PRICES.permanent).toBe(19900);
    expect(POST_PROCESSOR_PRICES.bundle_5).toBe(79900);
    expect(POST_PROCESSOR_PRICES.bundle_all).toBe(249900);
  });

  it("tier feature limits match the spec (key gates)", () => {
    expect(PLAN_LIMITS.free.speed_feed_per_day).toBe(10);
    expect(PLAN_LIMITS.free.program_generate_per_day).toBe(0);
    expect(PLAN_LIMITS.free.simulation).toBe(false);
    expect(PLAN_LIMITS.starter.program_generate_per_day).toBe(0);
    expect(PLAN_LIMITS.starter.speed_feed_per_day).toBe(-1);
    expect(PLAN_LIMITS.pro.program_generate_per_day).toBe(5);
    expect(PLAN_LIMITS.pro.simulation).toBe(true);
    expect(PLAN_LIMITS.shop.stochastic).toBe(true);
    expect(PLAN_LIMITS.enterprise.api_access).toBe(true);
    expect(PLAN_LIMITS.enterprise.max_users).toBe(-1);
  });
});

describe("pricing-registry -- cross-source single-source-of-truth guard (U-COMM-01)", () => {
  it("tierGate.TIER_LIMITS equals the canonical registry for every plan", () => {
    for (const p of PLANS) {
      expect(TIER_LIMITS[p]).toEqual(PLAN_LIMITS[p]);
    }
  });

  it("AuthEngineV7.getTierLimits equals the canonical registry for every plan", () => {
    const auth = new AuthEngineV7("test-secret-0123456789-abcdefghijklmnop");
    for (const p of PLANS) {
      expect(auth.getTierLimits(p)).toEqual(PLAN_LIMITS[p]);
    }
  });

  it("StripeBillingEngine.getPlanPrices equals the canonical registry (paid plans; free has no Stripe product)", () => {
    const stripe = new StripeBillingEngine({ testMode: true });
    const prices = stripe.getPlanPrices();
    const paid: Plan[] = ["starter", "pro", "shop", "enterprise"];
    for (const p of paid) {
      expect(prices[p]).toEqual(PLAN_PRICES[p]);
    }
    // free is intentionally excluded (no Stripe product)
    expect("free" in prices).toBe(false);
    expect(Object.keys(prices).sort()).toEqual(paid.slice().sort());
  });
});

describe("pricing-registry -- FE<->BE parity (R15)", () => {
  it("cents/100 equals the frontend dollar tiers (web/src/data/pricing.ts)", () => {
    // FE PLAN_TIERS monthlyUsd: free 0, starter 29, pro 79, shop 199, enterprise 499
    const feMonthly: Record<Plan, number> = { free: 0, starter: 29, pro: 79, shop: 199, enterprise: 499 };
    for (const p of PLANS) {
      expect(PLAN_PRICES[p].monthly_cents / 100).toBe(feMonthly[p]);
    }
    // FE one-time: single post perpetual $199, bundle_5 $799, bundle_all $2499
    expect(POST_PROCESSOR_PRICES.permanent / 100).toBe(199);
    expect(POST_PROCESSOR_PRICES.bundle_5 / 100).toBe(799);
    expect(POST_PROCESSOR_PRICES.bundle_all / 100).toBe(2499);
  });

  it("ONE_TIME_PRODUCTS ids + prices match the frontend (web/src/data/pricing.ts) -- no webhook-rejection drift", () => {
    // FE ONE_TIME_PRODUCTS keys: sfc_perpetual ($299), post_perpetual ($199) [+ FE-only
    // bundles post_bundle_5/all, deferred BE-side]. The BE ids MUST match the FE ids or
    // a one-time checkout POSTing the FE id would be rejected by isOneTimeProduct.
    expect(ONE_TIME_PRODUCTS.sfc_perpetual.id).toBe("sfc_perpetual");
    expect(ONE_TIME_PRODUCTS.sfc_perpetual.price_cents / 100).toBe(299);
    expect(ONE_TIME_PRODUCTS.post_perpetual.id).toBe("post_perpetual");
    expect(ONE_TIME_PRODUCTS.post_perpetual.price_cents / 100).toBe(199);
    // the BE id set is a subset of the FE id set (bundles deferred) -- guard the two core ids exactly
    expect(Object.keys(ONE_TIME_PRODUCTS).sort()).toEqual(["post_perpetual", "sfc_perpetual"]);
  });
});
