import { describe, it, expect } from 'vitest';
import {
  PLAN_ORDER,
  PLAN_TIERS,
  ONE_TIME_PRODUCTS,
  POST_SUBSCRIPTION_USD,
  ENTITLEMENT_MATRIX,
  FEATURE_LABELS,
  entitlementFor,
  planIncludes,
  formatPrice,
  entitlementLabel,
  matrixCellToken,
  FEATURE_NOT_YET_LIVE,
  getPlan,
  type FeatureKey,
} from '../data/pricing';

describe('pricing registry -- canonical tiers (anchored on StripeBillingEngine.PLAN_PRICES)', () => {
  it('has the 5 canonical plan IDs in ascending order', () => {
    expect(PLAN_ORDER).toEqual(['free', 'starter', 'pro', 'shop', 'enterprise']);
  });

  it('subscription prices match the tested backend catalog (reference values)', () => {
    // StripeBillingEngine.ts:47 PLAN_PRICES (cents -> dollars)
    expect([PLAN_TIERS.free.monthlyUsd, PLAN_TIERS.free.annualUsd]).toEqual([0, 0]);
    expect([PLAN_TIERS.starter.monthlyUsd, PLAN_TIERS.starter.annualUsd]).toEqual([29, 290]);
    expect([PLAN_TIERS.pro.monthlyUsd, PLAN_TIERS.pro.annualUsd]).toEqual([79, 790]);
    expect([PLAN_TIERS.shop.monthlyUsd, PLAN_TIERS.shop.annualUsd]).toEqual([199, 1990]);
    expect([PLAN_TIERS.enterprise.monthlyUsd, PLAN_TIERS.enterprise.annualUsd]).toEqual([499, 4990]);
  });

  it('annual = 10x monthly for every paid tier (2 months free)', () => {
    for (const id of PLAN_ORDER) {
      const t = PLAN_TIERS[id];
      if (t.monthlyUsd > 0) expect(t.annualUsd).toBe(t.monthlyUsd * 10);
    }
  });

  it('getPlan returns the matching tier object; only pro is featured', () => {
    expect(getPlan('pro').id).toBe('pro');
    expect(getPlan('pro').featured).toBe(true);
    expect(getPlan('starter').featured ?? false).toBe(false);
  });
});

describe('pricing registry -- one-time products (operator-required)', () => {
  it('SFC perpetual is $299 and single-post perpetual is $199 (StripeBillingEngine.ts:58)', () => {
    expect(ONE_TIME_PRODUCTS.sfc_perpetual.priceUsd).toBe(299);
    expect(ONE_TIME_PRODUCTS.post_perpetual.priceUsd).toBe(199);
    expect(ONE_TIME_PRODUCTS.post_perpetual.unit).toBe('per controller');
  });

  it('each one-time product grants only feature keys that exist in the matrix', () => {
    const matrixKeys = Object.keys(ENTITLEMENT_MATRIX) as FeatureKey[];
    for (const p of Object.values(ONE_TIME_PRODUCTS)) {
      expect(p.grants.length === 0).toBe(false);
      for (const g of p.grants) {
        expect(matrixKeys).toContain(g);
      }
    }
    expect(ONE_TIME_PRODUCTS.sfc_perpetual.grants).toContain('sfc.nine_axis');
    expect(ONE_TIME_PRODUCTS.post_perpetual.grants).toContain('post.safety');
  });

  it('post-processor subscription cadence prices match the tested backend ($9/mo, $79/yr)', () => {
    // StripeBillingEngine.POST_PROCESSOR_PRICES monthly:900 / annual:7900 cents
    expect(POST_SUBSCRIPTION_USD.monthly).toBe(9);
    expect(POST_SUBSCRIPTION_USD.annual).toBe(79);
    // bundles + perpetual stay in ONE_TIME_PRODUCTS
    expect(ONE_TIME_PRODUCTS.post_bundle_5.priceUsd).toBe(799);
    expect(ONE_TIME_PRODUCTS.post_bundle_all.priceUsd).toBe(2499);
  });
});

describe('pricing registry -- entitlement matrix', () => {
  it('every feature row defines exactly the 5 canonical plans with valid entitlement values', () => {
    const validKeys = [...PLAN_ORDER].sort();
    for (const fk of Object.keys(ENTITLEMENT_MATRIX) as FeatureKey[]) {
      expect(Object.keys(ENTITLEMENT_MATRIX[fk]).sort()).toEqual(validKeys);
      for (const id of PLAN_ORDER) {
        const v = ENTITLEMENT_MATRIX[fk][id];
        const isValid = v === true || v === false || v === 'addon' || typeof v === 'number';
        expect(isValid).toBe(true);
      }
    }
  });

  it('every entitlement key maps to a descriptive (3+ char) string label', () => {
    for (const fk of Object.keys(ENTITLEMENT_MATRIX) as FeatureKey[]) {
      expect(typeof FEATURE_LABELS[fk]).toBe('string');
      expect(FEATURE_LABELS[fk].length >= 3).toBe(true);
    }
  });

  it('entitlementFor returns the exact ceiling per the spec', () => {
    expect(entitlementFor('sfc.basic', 'free')).toBe(10); // 10/day free cap
    expect(entitlementFor('sfc.basic', 'starter')).toBe(true);
    expect(entitlementFor('api_access', 'shop')).toBe(false);
    expect(entitlementFor('api_access', 'enterprise')).toBe(true);
    expect(entitlementFor('quoting', 'shop')).toBe('addon');
    expect(entitlementFor('post.generate', 'pro')).toBe(1);
    expect(entitlementFor('post.generate', 'enterprise')).toBe(-1);
  });

  it('planIncludes treats addon and positive numeric as included, 0/false as excluded', () => {
    expect(planIncludes('api_access', 'free')).toBe(false);
    expect(planIncludes('api_access', 'enterprise')).toBe(true);
    expect(planIncludes('post.generate', 'pro')).toBe(true); // numeric 1
    expect(planIncludes('quoting', 'shop')).toBe(true); // addon
    expect(planIncludes('cadcam', 'pro')).toBe(false);
  });

  it('free plan gates everything except limited SFC basic', () => {
    expect(planIncludes('sfc.basic', 'free')).toBe(true); // 10/day
    expect(planIncludes('sfc.nine_axis', 'free')).toBe(false);
    expect(planIncludes('post.generate', 'free')).toBe(false);
    expect(planIncludes('quoting', 'free')).toBe(false);
  });

  it('plan ceilings are monotonic for SFC core features (higher tier never loses access)', () => {
    const core: FeatureKey[] = ['sfc.basic', 'sfc.nine_axis', 'sfc.export'];
    for (const fk of core) {
      let seenIncluded = false;
      for (const id of PLAN_ORDER) {
        const inc = planIncludes(fk, id);
        if (seenIncluded) expect(inc).toBe(true);
        if (inc) seenIncluded = true;
      }
    }
  });
});

describe('pricing registry -- display helpers', () => {
  it('formatPrice renders dollars with grouping, Free for zero', () => {
    expect(formatPrice(0)).toBe('Free');
    expect(formatPrice(199)).toBe('$199');
    expect(formatPrice(1990)).toBe('$1,990');
    expect(formatPrice(4990)).toBe('$4,990');
  });

  it('entitlementLabel maps each entitlement kind to its ASCII token', () => {
    expect(entitlementLabel(true)).toBe('Included');
    expect(entitlementLabel(false)).toBe('-');
    expect(entitlementLabel('addon')).toBe('Add-on');
    expect(entitlementLabel(-1)).toBe('Unlimited');
    expect(entitlementLabel(10)).toBe('10/day');
    expect(entitlementLabel(0)).toBe('0/day');
  });

  it('numeric entitlements use the right unit per feature (controllers vs per-day)', () => {
    // post.generate counts CONTROLLERS, not daily calcs (regression: was "1/day")
    expect(entitlementLabel(1, 'post.generate')).toBe('1 controller');
    expect(entitlementLabel(5, 'post.generate')).toBe('5 controllers');
    expect(entitlementLabel(-1, 'post.generate')).toBe('Unlimited');
    // sfc.basic is a real daily cap
    expect(entitlementLabel(10, 'sfc.basic')).toBe('10/day');
    // the matrix values render correctly through the helper
    expect(entitlementLabel(entitlementFor('post.generate', 'pro'), 'post.generate')).toBe('1 controller');
    expect(entitlementLabel(entitlementFor('post.generate', 'shop'), 'post.generate')).toBe('5 controllers');
  });
});

describe('pricing registry -- matrixCellToken (not-yet-live cells never read as live)', () => {
  it('renders Soon where a plan WOULD include a not-yet-live feature (true OR addon ceiling)', () => {
    // quoting/erp are FEATURE_NOT_YET_LIVE: enterprise grants them (true), shop grants via addon.
    expect(matrixCellToken('quoting', 'enterprise')).toBe('Soon'); // true -> Soon, not "Included"
    expect(matrixCellToken('quoting', 'shop')).toBe('Soon'); // addon -> Soon, not "Add-on"
    expect(matrixCellToken('erp', 'enterprise')).toBe('Soon');
    expect(matrixCellToken('erp', 'shop')).toBe('Soon');
  });

  it('renders the exclusion dash where a not-yet-live feature is NOT granted by the plan', () => {
    // free/starter/pro do not include quoting/erp -> the cell stays excluded, never "Soon".
    expect(matrixCellToken('quoting', 'free')).toBe('-');
    expect(matrixCellToken('quoting', 'pro')).toBe('-');
    expect(matrixCellToken('erp', 'starter')).toBe('-');
  });

  it('renders LIVE features with their normal entitlement label (no Soon downgrade)', () => {
    expect(matrixCellToken('sfc.nine_axis', 'starter')).toBe('Included');
    expect(matrixCellToken('sfc.basic', 'free')).toBe('10/day');
    expect(matrixCellToken('post.generate', 'pro')).toBe('1 controller');
    expect(matrixCellToken('post.generate', 'starter')).toBe('Add-on'); // live addon stays Add-on
    expect(matrixCellToken('cadcam', 'pro')).toBe('-');
  });

  it('INVARIANT: no not-yet-live feature ever shows an included token in ANY plan cell', () => {
    // The whole point of F4 -- a "coming soon" feature must never render Included/Add-on/a
    // numeric grant in the public matrix (that contradicts its coming-soon badge). Every cell
    // for a not-yet-live feature must be exactly 'Soon' (would-include) or '-' (excluded).
    const OVERSELL = new Set(['Included', 'Add-on', 'Unlimited']);
    for (const fk of Object.keys(FEATURE_NOT_YET_LIVE) as FeatureKey[]) {
      for (const id of PLAN_ORDER) {
        const token = matrixCellToken(fk, id);
        expect(token === 'Soon' || token === '-').toBe(true);
        expect(OVERSELL.has(token)).toBe(false);
        expect(/\d/.test(token)).toBe(false); // no numeric grant ("10/day", "5 controllers")
      }
    }
  });

  it('matrixCellToken agrees with entitlementLabel for every LIVE feature cell', () => {
    // For features NOT in FEATURE_NOT_YET_LIVE, the token must be byte-identical to the old
    // render path -- this change is a no-op for live features (no accidental regression).
    for (const fk of Object.keys(ENTITLEMENT_MATRIX) as FeatureKey[]) {
      if (fk in FEATURE_NOT_YET_LIVE) continue;
      for (const id of PLAN_ORDER) {
        expect(matrixCellToken(fk, id)).toBe(entitlementLabel(ENTITLEMENT_MATRIX[fk][id], fk));
      }
    }
  });
});
