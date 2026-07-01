/**
 * FeatureGate -- renders children only if the live plan can use `feature`,
 * otherwise an UpgradePrompt (or a custom fallback). The single FE chokepoint
 * for plan-tier gating; pairs with the backend `requireTier` 403 (caught via
 * isEntitlementError) so a gate lands without 403-ing an anonymous caller.
 */
import type { ReactNode } from 'react';
import type { FeatureKey } from '../../data/pricing';
import { useEntitlement } from '../../hooks/useEntitlement';
import { UpgradePrompt } from './UpgradePrompt';

export interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  /** Rendered while the plan is loading (default: null -- render nothing). */
  loadingFallback?: ReactNode;
  /** Rendered when the plan lacks the feature (default: <UpgradePrompt>). */
  fallback?: ReactNode;
}

export function FeatureGate({
  feature,
  children,
  loadingFallback = null,
  fallback,
}: FeatureGateProps) {
  const { can, loading, plan } = useEntitlement();
  if (loading) return <>{loadingFallback}</>;
  if (can(feature)) return <>{children}</>;
  return <>{fallback ?? <UpgradePrompt feature={feature} currentPlan={plan} />}</>;
}
