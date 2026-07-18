// QX1 entitlement keystone -- single import surface for plan-tier gating.
// Components:
export { FeatureGate, type FeatureGateProps } from './FeatureGate';
export { GatedError, type GatedErrorProps } from './GatedError';
export { UpgradePrompt, type UpgradePromptProps } from './UpgradePrompt';
// Hook (live plan + can(feature)) -- consumed by gated pages + post-checkout flows:
export { useEntitlement, clearEntitlementCache, type UseEntitlement } from '../../hooks/useEntitlement';
// Pure rules -- consumed by route-403 handlers (isEntitlementError) + custom gates:
export {
  canUseFeature,
  requiredPlanFor,
  isAddonAt,
  entitlementAt,
  isNotYetLive,
  notYetLiveNote,
  resolvePlan,
  isFeatureKey,
  isEntitlementError,
  isAuthRequiredError,
} from '../../lib/entitlement';
