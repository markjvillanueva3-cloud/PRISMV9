/**
 * GatedError -- the REACTIVE companion to <FeatureGate> (LAUNCH-FE 2026-06-23).
 *
 * <FeatureGate> gates a feature PROACTIVELY (client-side `can(feature)` -> no API
 * call for a wrong-plan user). GatedError closes the other half: when a page DID
 * call a gated dispatcher and the backend `requireTier` returned 403, render the
 * upgrade CTA instead of a raw error string. Any non-gate error (network, 500,
 * validation) falls through to the page's normal error UI.
 *
 * It composes the canonical pieces -- `isEntitlementError` (the single definition
 * of a 403 tier-gate denial) + the live plan from `useEntitlement` -- so one import
 * gates a page's error path without each page re-plumbing the plan lookup. The page
 * only has to RETAIN the caught error object and pass it here.
 *
 * Dormant-safe: until the backend route actually returns 403, `isEntitlementError`
 * is false and the fallback renders exactly as before -- so wiring this in ahead of
 * the backend gate changes nothing user-visible until the gate lands. The cheap
 * `isEntitlementError` predicate is checked BEFORE any hook, so a non-gate / no-error
 * mount never even calls `useEntitlement` (no wasted GET /billing/status across the
 * many pages that mount this in their error slot).
 *
 * Router contract: the gate branch renders <UpgradePrompt>, which calls useNavigate,
 * so a mounted-and-gated GatedError must have a react-router <Router> ancestor (every
 * App.tsx page does; a modal/error-boundary outside the router tree would not).
 */
import type { ReactNode } from 'react';
import type { FeatureKey } from '../../data/pricing';
import { isEntitlementError } from '../../lib/entitlement';
import { useEntitlement } from '../../hooks/useEntitlement';
import { UpgradePrompt } from './UpgradePrompt';

export interface GatedErrorProps {
  /** The caught error from the gated dispatcher call. A 403 ApiError -> UpgradePrompt. */
  error: unknown;
  /** Feature to upgrade toward when the error is a tier-gate denial. */
  feature: FeatureKey;
  /** Rendered for any NON-gate error (the page's normal error UI). Default: nothing. */
  fallback?: ReactNode;
  /** Forwarded to UpgradePrompt for tight inline placements. */
  compact?: boolean;
  className?: string;
}

/**
 * The gate branch, split into its own component so `useEntitlement` (which fetches
 * the live plan) only runs when there is actually a 403 to render -- not on every
 * dormant mount. Rules-of-Hooks safe: this component ALWAYS calls the hook; the
 * CONDITION lives in the parent (which component renders), not in a conditional hook.
 */
function GateUpgrade({ feature, compact, className }: Pick<GatedErrorProps, 'feature' | 'compact' | 'className'>) {
  const { plan } = useEntitlement();
  return <UpgradePrompt feature={feature} currentPlan={plan} compact={compact} className={className} />;
}

export function GatedError({ error, feature, fallback = null, compact, className }: GatedErrorProps) {
  // Cheap, hook-free predicate first -> a no-error / non-gate mount costs nothing.
  if (!isEntitlementError(error)) return <>{fallback}</>;
  return <GateUpgrade feature={feature} compact={compact} className={className} />;
}
