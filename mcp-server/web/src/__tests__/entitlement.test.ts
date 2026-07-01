import { describe, it, expect } from 'vitest';
import {
  isFeatureKey,
  resolvePlan,
  isNotYetLive,
  notYetLiveNote,
  canUseFeature,
  requiredPlanFor,
  isAddonAt,
  entitlementAt,
  isEntitlementError,
  isAuthRequiredError,
} from '../lib/entitlement';
import { FEATURE_NOT_YET_LIVE } from '../data/pricing';
import { ApiError } from '../api/requestCore';

describe('isFeatureKey', () => {
  it('accepts canonical keys', () => {
    expect(isFeatureKey('sfc.basic')).toBe(true);
    expect(isFeatureKey('post.generate')).toBe(true);
    expect(isFeatureKey('api_access')).toBe(true);
  });
  it('rejects unknown / non-string (adversarial)', () => {
    expect(isFeatureKey('sfc.nonexistent')).toBe(false);
    expect(isFeatureKey('')).toBe(false);
    expect(isFeatureKey(null)).toBe(false);
    expect(isFeatureKey(undefined)).toBe(false);
    expect(isFeatureKey(42)).toBe(false);
    expect(isFeatureKey({})).toBe(false);
  });
});

describe('resolvePlan (deny-by-default normalization)', () => {
  it('passes through canonical plan ids', () => {
    expect(resolvePlan('free')).toBe('free');
    expect(resolvePlan('starter')).toBe('starter');
    expect(resolvePlan('pro')).toBe('pro');
    expect(resolvePlan('shop')).toBe('shop');
    expect(resolvePlan('enterprise')).toBe('enterprise');
  });
  it('falls back to free for unknown / missing (never grant off an unknown value)', () => {
    expect(resolvePlan('garbage')).toBe('free');
    expect(resolvePlan('')).toBe('free');
    expect(resolvePlan(null)).toBe('free');
    expect(resolvePlan(undefined)).toBe('free');
    expect(resolvePlan('ENTERPRISE')).toBe('free'); // case-sensitive on purpose
  });
});

describe('isNotYetLive / notYetLiveNote', () => {
  it('quoting + erp are sold-but-not-yet-live', () => {
    expect(isNotYetLive('quoting')).toBe(true);
    expect(isNotYetLive('erp')).toBe(true);
    expect(notYetLiveNote('quoting')).toBe(FEATURE_NOT_YET_LIVE.quoting);
    expect(notYetLiveNote('erp')).toBe(FEATURE_NOT_YET_LIVE.erp);
  });
  it('live features are not flagged and carry no note', () => {
    expect(isNotYetLive('sfc.basic')).toBe(false);
    expect(isNotYetLive('post.generate')).toBe(false);
    expect(isNotYetLive('cadcam')).toBe(false);
    expect(notYetLiveNote('sfc.basic') ?? 'no-note').toBe('no-note');
  });
});

describe('canUseFeature (plan ceiling AND live)', () => {
  it('free tier: only basic SFC (numeric cap counts as usable), everything paid denied', () => {
    expect(canUseFeature('sfc.basic', 'free')).toBe(true); // 10/day != 0
    expect(canUseFeature('sfc.nine_axis', 'free')).toBe(false);
    expect(canUseFeature('post.generate', 'free')).toBe(false);
    expect(canUseFeature('cadcam', 'free')).toBe(false);
  });
  it('starter unlocks the SFC pro band but not pro-tier features', () => {
    expect(canUseFeature('sfc.nine_axis', 'starter')).toBe(true);
    expect(canUseFeature('sfc.sld', 'starter')).toBe(true);
    expect(canUseFeature('sfc.vendor_parity', 'starter')).toBe(true);
    expect(canUseFeature('sfc.calibration', 'starter')).toBe(false);
    expect(canUseFeature('sfc.stochastic', 'starter')).toBe(false);
  });
  it('addon entitlement is plan-permitted at the gate (backend 403 enforces the purchase)', () => {
    // post.generate is an addon at starter -> matrix permits; not-bought is a
    // backend 403 (isEntitlementError), not an FE matrix denial.
    expect(canUseFeature('post.generate', 'starter')).toBe(true);
  });
  it('pro unlocks calibration/stochastic/simulation/print_to_cnc/wizards', () => {
    expect(canUseFeature('sfc.calibration', 'pro')).toBe(true);
    expect(canUseFeature('sfc.stochastic', 'pro')).toBe(true);
    expect(canUseFeature('print_to_cnc', 'pro')).toBe(true);
    expect(canUseFeature('wizard.mill', 'pro')).toBe(true);
    expect(canUseFeature('cadcam', 'pro')).toBe(false); // cadcam is shop+
  });
  it('shop unlocks cadcam; api_access stays enterprise-only', () => {
    expect(canUseFeature('cadcam', 'shop')).toBe(true);
    expect(canUseFeature('api_access', 'shop')).toBe(false);
    expect(canUseFeature('api_access', 'enterprise')).toBe(true);
  });
  it('NOT-YET-LIVE features deny even on enterprise (R12 -- sold != usable)', () => {
    expect(canUseFeature('quoting', 'enterprise')).toBe(false);
    expect(canUseFeature('erp', 'enterprise')).toBe(false);
    expect(canUseFeature('quoting', 'shop')).toBe(false);
  });
});

describe('requiredPlanFor (cheapest unlocking tier)', () => {
  it('returns the lowest plan that includes the feature', () => {
    expect(requiredPlanFor('sfc.basic')).toBe('free'); // free has 10/day
    expect(requiredPlanFor('sfc.nine_axis')).toBe('starter');
    expect(requiredPlanFor('sfc.calibration')).toBe('pro');
    expect(requiredPlanFor('post.generate')).toBe('starter'); // addon at starter counts
    expect(requiredPlanFor('cadcam')).toBe('shop');
    expect(requiredPlanFor('quoting')).toBe('shop'); // addon at shop
    expect(requiredPlanFor('api_access')).toBe('enterprise');
  });
});

describe('isAddonAt / entitlementAt', () => {
  it('flags addon-only tiers', () => {
    expect(isAddonAt('post.generate', 'starter')).toBe(true);
    expect(isAddonAt('quoting', 'shop')).toBe(true);
    expect(isAddonAt('erp', 'shop')).toBe(true);
  });
  it('bundled features are not addons', () => {
    expect(isAddonAt('sfc.nine_axis', 'starter')).toBe(false);
    expect(isAddonAt('cadcam', 'shop')).toBe(false);
  });
  it('entitlementAt returns the raw matrix value', () => {
    expect(entitlementAt('post.generate', 'pro')).toBe(1);
    expect(entitlementAt('post.generate', 'shop')).toBe(5);
    expect(entitlementAt('post.generate', 'enterprise')).toBe(-1);
    expect(entitlementAt('sfc.basic', 'free')).toBe(10);
    expect(entitlementAt('api_access', 'free')).toBe(false);
  });
});

describe('isEntitlementError / isAuthRequiredError (backend contract)', () => {
  it('403 = entitlement (upgrade), 401 = auth (sign-in)', () => {
    expect(isEntitlementError(new ApiError(403, 'forbidden'))).toBe(true);
    expect(isAuthRequiredError(new ApiError(403, 'forbidden'))).toBe(false);
    expect(isAuthRequiredError(new ApiError(401, 'unauthorized'))).toBe(true);
    expect(isEntitlementError(new ApiError(401, 'unauthorized'))).toBe(false);
  });
  it('other statuses and non-ApiError values are neither (adversarial)', () => {
    expect(isEntitlementError(new ApiError(500, 'boom'))).toBe(false);
    expect(isEntitlementError(new ApiError(0, 'offline'))).toBe(false);
    expect(isEntitlementError(new Error('plain'))).toBe(false);
    expect(isEntitlementError(null)).toBe(false);
    expect(isEntitlementError(undefined)).toBe(false);
    expect(isEntitlementError({ status: 403 })).toBe(false); // not an ApiError instance
    expect(isAuthRequiredError('401')).toBe(false);
  });
});
