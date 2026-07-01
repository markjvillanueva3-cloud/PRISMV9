/**
 * UpgradePrompt -- shown when a plan lacks a feature. Tells the user the
 * cheapest tier that unlocks it (or "coming soon" for a not-yet-live wave) and
 * routes them to /pricing or the billing portal. Pure presentation off the
 * canonical registry + entitlement rules; no fetch.
 */
import { useNavigate } from 'react-router-dom';
import { FEATURE_LABELS, PLAN_TIERS, formatPrice, type FeatureKey } from '../../data/pricing';
import { isAddonAt, isNotYetLive, notYetLiveNote, requiredPlanFor } from '../../lib/entitlement';
import { Button } from '../ui';

export interface UpgradePromptProps {
  feature: FeatureKey;
  /** The user's current plan id (for the "You are on X" line). */
  currentPlan?: string | null;
  /** Hide the explanatory price line (for tight inline placements). */
  compact?: boolean;
  className?: string;
}

export function UpgradePrompt({
  feature,
  currentPlan,
  compact = false,
  className = '',
}: UpgradePromptProps) {
  const navigate = useNavigate();
  const label = FEATURE_LABELS[feature];
  const needed = requiredPlanFor(feature);
  const neededTier = needed ? PLAN_TIERS[needed] : null;
  const addon = needed ? isAddonAt(feature, needed) : false;

  // Sold but its wave has not launched -- no upgrade CTA, just a "coming soon".
  if (isNotYetLive(feature)) {
    return (
      <div
        role="status"
        className={`rounded-xl border border-violet-300 bg-violet-50 px-5 py-4 text-sm dark:border-violet-700 dark:bg-violet-950/40 ${className}`}
      >
        <p className="font-semibold text-violet-800 dark:text-violet-200">{label} -- coming soon</p>
        <p className="mt-1 text-violet-700 dark:text-violet-300">
          {notYetLiveNote(feature) ?? 'Included on your plan when this feature launches.'}
        </p>
      </div>
    );
  }

  return (
    <div
      role="status"
      className={`rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 dark:border-amber-700 dark:bg-amber-950/40 ${className}`}
    >
      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
        {label} requires {neededTier ? `the ${neededTier.name} plan` : 'an upgrade'}
        {addon ? ' (available as an add-on)' : ''}
      </p>
      {!compact && neededTier && (
        <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
          {currentPlan ? `You are on the ${currentPlan} plan. ` : ''}
          Unlock it from {neededTier.name} -- {formatPrice(neededTier.monthlyUsd)}/mo.
        </p>
      )}
      {/* Canonical app primary/secondary buttons (components/ui Button) so the
          CTA renders identically to every other primary button in the app.
          h-11 keeps the mobile tap target >=44pt (iOS HIG); md:h-auto restores
          the desktop sizing. */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="primary"
          onClick={() => navigate('/pricing')}
          className="h-11 md:h-auto"
        >
          View Plans
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate('/subscription')}
          className="h-11 md:h-auto"
        >
          Manage Plan
        </Button>
      </div>
    </div>
  );
}
