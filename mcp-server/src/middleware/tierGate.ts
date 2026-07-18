/**
 * PRISM MCP Server — Tier Gate Middleware
 * Enforces subscription plan feature limits on API endpoints.
 *
 * Spec (MIT 6.005 contract):
 *   - TIER_LIMITS is the single source of truth — exported for tests
 *   - checkTierAccess is a pure function (no side effects)
 *   - requireTier returns a standard Express middleware factory
 *   - 403 on blocked access with structured error body
 *   - Defaults to "free" plan if req.user.plan is absent (fail safe)
 */
import type { Request, Response, NextFunction } from "express";
import type { Plan, TierLimits } from "../engines/AuthEngineV7.js";

// ============================================================================
// Types
// ============================================================================

/** Features that can be gated by tier */
export type GatedFeature =
  | "speed_feed"
  | "program_generate"
  | "simulation"
  | "dfm"
  | "stochastic"
  | "api_access"
  | "print_to_program"
  | "edm_program"
  | "laser_program"
  | "waterjet_program";

export interface TierCheckResult {
  allowed: boolean;
  reason: string;
}

/**
 * Runtime list of the feature keys the entitlement layer actually ENFORCES
 * (the GatedFeature union). The per-seat override admin endpoint validates
 * against this so a shop admin can NEVER store an override on a key that
 * nothing checks (the silent-no-op revoke / R12 honesty gap). Keep in sync with
 * the GatedFeature union above.
 */
export const GATED_FEATURES: readonly GatedFeature[] = [
  "speed_feed",
  "program_generate",
  "simulation",
  "dfm",
  "stochastic",
  "api_access",
  "print_to_program",
  "edm_program",
  "laser_program",
  "waterjet_program",
];

/** True if a feature key is one the entitlement layer actually enforces. */
export function isGatedFeature(feature: string): feature is GatedFeature {
  return (GATED_FEATURES as readonly string[]).includes(feature);
}

// ============================================================================
// Tier limits table — single source of truth
// ============================================================================

export const TIER_LIMITS: Record<Plan, TierLimits> = {
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
// Pure access-check function
// ============================================================================

/**
 * Check whether a plan permits usage of a feature given current daily usage.
 * Pure function — no I/O, no side effects, deterministic.
 *
 * @param plan         - user's subscription plan
 * @param feature      - feature name being checked
 * @param currentUsage - how many times this feature was used today (default 0)
 * @returns { allowed, reason }
 */
export function checkTierAccess(
  plan: Plan,
  feature: GatedFeature | string,
  currentUsage: number = 0
): TierCheckResult {
  const limits = TIER_LIMITS[plan];
  if (!limits) {
    return { allowed: false, reason: `Unknown plan: ${plan}` };
  }

  switch (feature) {
    case "speed_feed": {
      const limit = limits.speed_feed_per_day;
      if (limit === -1) return { allowed: true, reason: "Unlimited" };
      if (currentUsage < limit) return { allowed: true, reason: `${currentUsage}/${limit} used today` };
      return { allowed: false, reason: `Speed/feed limit reached (${limit}/day). Upgrade to Starter or higher.` };
    }

    case "program_generate":
    case "print_to_program":
    case "edm_program":
    case "laser_program":
    case "waterjet_program": {
      const limit = limits.program_generate_per_day;
      if (limit === -1) return { allowed: true, reason: "Unlimited" };
      if (limit === 0) return { allowed: false, reason: `Program generation not available on ${plan} plan. Upgrade to Pro or higher.` };
      if (currentUsage < limit) return { allowed: true, reason: `${currentUsage}/${limit} used today` };
      return { allowed: false, reason: `Program generation limit reached (${limit}/day). Upgrade to Shop or higher.` };
    }

    case "simulation": {
      if (limits.simulation) return { allowed: true, reason: "Simulation enabled" };
      return { allowed: false, reason: `CNC simulation not available on ${plan} plan. Upgrade to Pro or higher.` };
    }

    case "dfm": {
      const limit = limits.dfm_rules;
      if (limit === -1) return { allowed: true, reason: "Unlimited DFM rules" };
      if (limit === 0) return { allowed: false, reason: `DFM rules not available on ${plan} plan. Upgrade to Pro or higher.` };
      return { allowed: true, reason: `${limit} DFM rules available` };
    }

    case "stochastic": {
      if (limits.stochastic) return { allowed: true, reason: "Stochastic analysis enabled" };
      return { allowed: false, reason: `Stochastic analysis not available on ${plan} plan. Upgrade to Shop or higher.` };
    }

    case "api_access": {
      if (limits.api_access) return { allowed: true, reason: "API access enabled" };
      return { allowed: false, reason: `API access not available on ${plan} plan. Upgrade to Enterprise.` };
    }

    default:
      // Unknown feature — deny by default (fail safe)
      return { allowed: false, reason: `Unknown feature: ${feature}` };
  }
}

// ============================================================================
// Express middleware factory
// ============================================================================

/**
 * Express middleware factory — gates an endpoint by plan feature.
 * Must be used after auth middleware that sets req.user.
 *
 * @param feature - feature name to check (see GatedFeature)
 * @returns Express middleware
 *
 * @example
 *   router.post("/simulate", verifyToken, requireTier("simulation"), handler)
 */
export function requireTier(feature: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Read plan from augmented request — default to "free" if not set
    const user = (req as any).user as { plan?: Plan; usage?: Record<string, number>; overrides?: Record<string, boolean>; licenses?: string[] } | undefined;
    const plan: Plan = user?.plan ?? "free";
    const currentUsage: number = user?.usage?.[feature] ?? 0;

    // U-COMM-05: a per-seat admin override can DENY a feature below the plan
    // ceiling (it never grants above it). Check the deny BEFORE everything else --
    // an admin revoke is the strongest control and must beat even a perpetual grant.
    if (user?.overrides?.[feature] === false) {
      res.status(403).json({
        error: {
          status: 403,
          message: `Access to "${feature}" has been disabled for your account by your administrator.`,
          code: "ENTITLEMENT_REVOKED",
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // U-COMM-08: a one-time perpetual license (e.g. sfc_perpetual -> "speed_feed")
    // grants the feature ABOVE the plan ceiling. Checked after the admin-deny and
    // before the plan check, so a perpetual buyer is never blocked by free-tier
    // caps. Controller-scoped post grants are NOT here -- those are enforced per
    // controller at the post-generation route via licenseStore.hasPostLicense.
    if (user?.licenses?.includes(feature)) {
      next();
      return;
    }

    const result = checkTierAccess(plan, feature as GatedFeature, currentUsage);

    if (!result.allowed) {
      res.status(403).json({
        error: {
          status: 403,
          message: result.reason,
          code: "TIER_LIMIT",
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}
