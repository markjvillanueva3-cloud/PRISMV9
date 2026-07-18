/**
 * attachUserPlan -- resolves the authenticated user's subscription plan + today's
 * usage onto req.user (U-COMM-03).
 *
 * THE keystone wire: tierGate.requireTier and billing /status read
 * `req.user.plan` / `req.user.usage`, but nothing ever populated them, so every
 * request resolved to the "free" fail-safe (entitlement enforcement dormant).
 * Mount this GLOBALLY immediately after optionalToken so /status + every gated
 * route see the real plan.
 *
 * Pure-ish: a single sync store read + a single sync counter read. No I/O on the
 * request hot path beyond the in-memory maps (store is lazy-loaded once).
 */
import type { Request, Response, NextFunction } from "express";
import { subscriptionStore } from "../engines/SubscriptionStore.js";
import { entitlementOverrideStore } from "../engines/EntitlementOverrideStore.js";
import { licenseStore } from "../engines/LicenseStore.js";
import { getUsageCounterSync } from "./usageCounter.js";

export function attachUserPlan(req: Request, _res: Response, next: NextFunction): void {
  try {
    const userId = req.userId; // set by verifyToken/optionalToken (may be undefined for anon)
    const plan = subscriptionStore.getPlan(userId);
    const usage = userId ? getUsageCounterSync().getDayCounts(userId) : {};
    // U-COMM-05: per-seat overrides (a shop admin may DENY a feature below the
    // plan ceiling). requireTier consults req.user.overrides[feature] === false.
    const overrides = userId ? entitlementOverrideStore.getOverrides(userId) : {};
    // U-COMM-08: blanket GATED_FEATURES granted by an active perpetual license
    // (e.g. sfc_perpetual -> "speed_feed"). requireTier grants on membership ABOVE
    // the plan ceiling. Controller-scoped post grants are NOT here (checked per
    // controller at the post route via licenseStore.hasPostLicense).
    const licenses = userId ? licenseStore.grantedFeatures(userId) : [];
    const role = req.userRoles?.[0] ?? "viewer";
    (req as any).user = {
      ...((req as any).user ?? {}),
      userId: userId ?? "anonymous",
      plan,
      role,
      usage,
      overrides,
      licenses,
    };
  } catch (e) {
    // Fail safe: never block a request because plan/license resolution hiccuped.
    // A corrupt store throws (getPlan / getOverrides / grantedFeatures) -> default
    // the request to free + no entitlements here so the API stays up. LOG it: this
    // path silently downgrades a paying user, so it MUST be observable (a corrupt
    // store would otherwise strip every perpetual/subscription customer to free with
    // no signal). The stores do not log corruption themselves -- this is the signal.
    console.error("[attachUserPlan] plan/entitlement resolution failed; defaulting to free + no entitlements:", (e as Error)?.message ?? e);
    (req as any).user = {
      ...((req as any).user ?? {}),
      userId: req.userId ?? "anonymous",
      plan: "free",
      role: req.userRoles?.[0] ?? "viewer",
      usage: {},
      overrides: {},
      licenses: [],
    };
  }
  next();
}

/**
 * Record one use of a gated feature for the current request's user, AFTER the
 * handler succeeds. Pair with requireTier on the same route so daily caps count.
 */
export function recordFeatureUse(req: Request, feature: string): void {
  const userId = req.userId;
  if (userId) getUsageCounterSync().increment(userId, feature);
}
