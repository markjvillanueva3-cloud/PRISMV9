/**
 * Entitlement resolution -- pure FE logic bridging a user's live plan to the
 * canonical entitlement matrix (data/pricing.ts) and the backend 403 contract.
 *
 * Single source of truth for "can this plan use this feature right now":
 *   - the matrix (ENTITLEMENT_MATRIX) decides per-plan inclusion;
 *   - FEATURE_NOT_YET_LIVE (quoting/erp) makes a SOLD-but-not-active feature
 *     deny at the gate (R12 -- never let a not-yet-launched wave look usable);
 *   - the backend `requireTier` middleware returns HTTP 403 when a gated route
 *     is called without entitlement (401 = not signed in) -- isEntitlementError
 *     lets a page turn that 403 into an UpgradePrompt instead of a raw error.
 *
 * No React / no fetch here -- keeps the rules unit-testable. The hook
 * (hooks/useEntitlement.ts) supplies the live plan; the components
 * (components/entitlement/*) render the gate + upgrade CTA.
 */
import {
  PLAN_ORDER,
  ENTITLEMENT_MATRIX,
  FEATURE_NOT_YET_LIVE,
  entitlementFor,
  planIncludes,
  type PlanId,
  type FeatureKey,
  type Entitlement,
} from '../data/pricing';
import { ApiError } from '../api/requestCore';

const PLAN_SET: ReadonlySet<string> = new Set<string>(PLAN_ORDER);

/** True iff `f` is a known feature key (guards untrusted/string inputs). */
export function isFeatureKey(f: unknown): f is FeatureKey {
  return typeof f === 'string' && f in ENTITLEMENT_MATRIX;
}

/**
 * Normalize an arbitrary backend plan string to a canonical PlanId.
 * Unknown / missing -> 'free' (deny-by-default: never grant paid access off a
 * plan value we don't recognize).
 */
export function resolvePlan(raw: string | null | undefined): PlanId {
  return raw && PLAN_SET.has(raw) ? (raw as PlanId) : 'free';
}

/** Sold but its tier-inclusion only activates on its launch wave (quoting/erp). */
export function isNotYetLive(feature: FeatureKey): boolean {
  return feature in FEATURE_NOT_YET_LIVE;
}

/** Human note for a not-yet-live feature (e.g. "Included when Quoting launches (Wave 2)"). */
export function notYetLiveNote(feature: FeatureKey): string | undefined {
  return FEATURE_NOT_YET_LIVE[feature];
}

/**
 * Can `plan` actually USE `feature` right now?
 * Included in the plan (matrix true/addon/positive-number) AND live.
 * A not-yet-live feature denies for every plan (it is sold, not yet usable).
 */
export function canUseFeature(feature: FeatureKey, plan: PlanId): boolean {
  if (isNotYetLive(feature)) return false;
  return planIncludes(feature, plan);
}

/**
 * Lowest plan (in PLAN_ORDER) that includes `feature` at all (true, addon, or
 * a positive numeric ceiling). null if no plan includes it. Used by the
 * UpgradePrompt to tell the user the cheapest tier that unlocks the feature.
 */
export function requiredPlanFor(feature: FeatureKey): PlanId | null {
  for (const plan of PLAN_ORDER) {
    if (planIncludes(feature, plan)) return plan;
  }
  return null;
}

/** Is the feature only a purchasable ADD-ON at `plan` (not bundled-in)? */
export function isAddonAt(feature: FeatureKey, plan: PlanId): boolean {
  return entitlementFor(feature, plan) === 'addon';
}

/** Raw entitlement value for (feature, plan) -- re-exported convenience. */
export function entitlementAt(feature: FeatureKey, plan: PlanId): Entitlement {
  return entitlementFor(feature, plan);
}

/**
 * Backend `requireTier` denial: signed-in but the plan lacks the feature.
 * Show an UpgradePrompt. (Distinct from 401 = not signed in -> sign-in.)
 */
export function isEntitlementError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 403;
}

/** Not-signed-in (401) -- route to sign-in, not upgrade. */
export function isAuthRequiredError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}
