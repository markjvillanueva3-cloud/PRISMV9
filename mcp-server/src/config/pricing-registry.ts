/**
 * PRISM canonical backend pricing + plan-limit registry (U-COMM-01).
 *
 * SINGLE SOURCE OF TRUTH for subscription prices + per-tier feature limits.
 * Resolves the prior triplication:
 *   - AuthEngineV7.LIMITS        (per-tier feature limits)
 *   - tierGate.TIER_LIMITS       (identical copy -- drove the entitlement gate)
 *   - StripeBillingEngine.PLAN_PRICES / POST_PROCESSOR_PRICES (cents)
 * All three now import from here.
 *
 * Mirrors the frontend registry mcp-server/web/src/data/pricing.ts (prices there
 * are DOLLARS; here CENTS = dollars x 100). FE<->BE parity is asserted in
 * src/__tests__/pricing-registry.test.ts.
 *
 * NOTE: BillingEngine.ts carries a DIVERGENT legacy catalog (shop $49 / team
 * $199 / enterprise $999) that is DEPRECATED and intentionally NOT part of this
 * canonical set -- see state/shared/specs/PRISM-PRICING-AND-ENTITLEMENT-2026-06-21.md.
 */
import type { Plan, TierLimits } from "../engines/AuthEngineV7.js";

export interface PlanPriceEntry {
  monthly_cents: number;
  annual_cents: number;
  label: string;
}

// ============================================================================
// Per-tier feature limits (-1 = unlimited). Canonical.
// ============================================================================
export const PLAN_LIMITS: Record<Plan, TierLimits> = {
  free: {
    speed_feed_per_day: 10,
    program_generate_per_day: 0,
    materials_count: 20,
    machines_count: 5,
    playbook_rules_per_query: 5,
    simulation: false,
    dfm_rules: 0,
    stochastic: false,
    api_access: false,
    max_users: 1,
  },
  starter: {
    speed_feed_per_day: -1,
    program_generate_per_day: 0,
    materials_count: -1,
    machines_count: -1,
    playbook_rules_per_query: 20,
    simulation: false,
    dfm_rules: 0,
    stochastic: false,
    api_access: false,
    max_users: 1,
  },
  pro: {
    speed_feed_per_day: -1,
    program_generate_per_day: 5,
    materials_count: -1,
    machines_count: -1,
    playbook_rules_per_query: -1,
    simulation: true,
    dfm_rules: 10,
    stochastic: false,
    api_access: false,
    max_users: 1,
  },
  shop: {
    speed_feed_per_day: -1,
    program_generate_per_day: -1,
    materials_count: -1,
    machines_count: -1,
    playbook_rules_per_query: -1,
    simulation: true,
    dfm_rules: 30,
    stochastic: true,
    api_access: false,
    max_users: 5,
  },
  enterprise: {
    speed_feed_per_day: -1,
    program_generate_per_day: -1,
    materials_count: -1,
    machines_count: -1,
    playbook_rules_per_query: -1,
    simulation: true,
    dfm_rules: -1,
    stochastic: true,
    api_access: true,
    max_users: -1,
  },
};

// ============================================================================
// Subscription prices in CENTS (USD x 100). Canonical.
// ============================================================================
export const PLAN_PRICES: Record<Plan, PlanPriceEntry> = {
  free: { monthly_cents: 0, annual_cents: 0, label: "Free" },
  starter: { monthly_cents: 2900, annual_cents: 29000, label: "Starter" },
  pro: { monthly_cents: 7900, annual_cents: 79000, label: "Pro" },
  shop: { monthly_cents: 19900, annual_cents: 199000, label: "Shop" },
  enterprise: { monthly_cents: 49900, annual_cents: 499000, label: "Enterprise" },
};

// ============================================================================
// Post-processor per-controller prices in CENTS. Canonical.
// ============================================================================
export const POST_PROCESSOR_PRICES = {
  monthly: 900, // $9 / controller / month
  annual: 7900, // $79 / controller / year
  permanent: 19900, // $199 / controller (single)
  bundle_5: 79900, // $799 / 5+ controllers
  bundle_all: 249900, // $2499 / 20+ (all)
} as const;

// ============================================================================
// One-time (perpetual) license products (U-COMM-08). Canonical.
//
// These are NON-subscription purchases that grant a feature forever via a license
// key (see engines/LicenseStore.ts). The operator's launch ask: "a logical price
// for one time payment for the sfc and a single post processor."
//
//   - `grantsFeature`: the GATED_FEATURES key this product unlocks blanket (null
//     for a controller-scoped product whose grant is checked per-controller at the
//     route, NOT as a blanket feature -- avoids over-granting all program output
//     from a single-controller purchase).
//   - `scope`: "none" = blanket feature grant; "controller" = the license is bound
//     to one controller id (resolved at activation).
//
// `grantsFeature` MUST be a member of tierGate.GATED_FEATURES (validated at wire
// time by isGatedFeature) -- typed as string here to keep this registry free of a
// tierGate import (pricing-registry is the lowest config layer).
// ============================================================================
export interface OneTimeProduct {
  id: string;
  label: string;
  price_cents: number;
  grantsFeature: string | null;
  scope: "none" | "controller";
}

export const ONE_TIME_PRODUCTS: Record<string, OneTimeProduct> = {
  sfc_perpetual: {
    id: "sfc_perpetual",
    label: "Speed & Feed Calculator (Perpetual)",
    price_cents: 29900, // $299 one-time -- unlimited speed_feed forever
    grantsFeature: "speed_feed",
    scope: "none",
  },
  post_perpetual: {
    id: "post_perpetual",
    label: "Single Post Processor (Perpetual)",
    price_cents: POST_PROCESSOR_PRICES.permanent, // $199 / controller (one)
    grantsFeature: null, // controller-scoped -- checked per-controller, not blanket
    scope: "controller",
  },
} as const;

/** True if a product id is a known one-time license product. */
export function isOneTimeProduct(productId: string): boolean {
  return Object.prototype.hasOwnProperty.call(ONE_TIME_PRODUCTS, productId);
}

export const PRICING_REGISTRY_META = {
  specVersion: "2026-06-21",
  source: "state/shared/specs/PRISM-PRICING-AND-ENTITLEMENT-2026-06-21.md",
  feMirror: "mcp-server/web/src/data/pricing.ts",
} as const;
