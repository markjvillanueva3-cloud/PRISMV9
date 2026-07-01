import { describe, it, expect } from 'vitest';
import { computePostOwnership, ownsController } from '../lib/postOwnership';
import type { LicenseSummary } from '../api/billing';

function lic(over: Partial<LicenseSummary>): LicenseSummary {
  return {
    licenseKey: 'Kienzle-POST-x-y',
    product: 'post_perpetual',
    feature: null,
    scope: 'fanuc-30i',
    status: 'active',
    activatedAt: '2026-06-22',
    ...over,
  };
}

describe('computePostOwnership', () => {
  it('marks the scoped controller owned for an active post_perpetual license', () => {
    const o = computePostOwnership([lic({ scope: 'fanuc-30i' })], 'pro');
    expect(o.allOwned).toBe(false);
    expect(o.owned.has('fanuc-30i')).toBe(true);
    expect(o.owned.has('haas-ngc')).toBe(false);
    expect(o.owned.size).toBe(1);
  });

  it('aggregates multiple per-controller licenses', () => {
    const o = computePostOwnership(
      [lic({ scope: 'fanuc-30i' }), lic({ scope: 'haas-ngc', licenseKey: 'k2' })],
      'pro',
    );
    expect(o.owned.has('fanuc-30i')).toBe(true);
    expect(o.owned.has('haas-ngc')).toBe(true);
    expect(o.owned.size).toBe(2);
  });

  it('enterprise plan owns all controllers regardless of licenses', () => {
    const o = computePostOwnership([], 'enterprise');
    expect(o.allOwned).toBe(true);
    expect(ownsController(o, 'any-controller-id')).toBe(true);
  });

  it('an active post_bundle_all license owns all controllers', () => {
    const o = computePostOwnership(
      [lic({ product: 'post_bundle_all', feature: 'post.library', scope: null })],
      'shop',
    );
    expect(o.allOwned).toBe(true);
    expect(ownsController(o, 'okuma-p300')).toBe(true);
  });

  it('ignores REVOKED licenses (adversarial -- a revoked perpetual is not owned)', () => {
    const o = computePostOwnership([lic({ scope: 'fanuc-30i', status: 'revoked' })], 'pro');
    expect(o.allOwned).toBe(false);
    expect(o.owned.has('fanuc-30i')).toBe(false);
  });

  it('does NOT blanket-own from a post_bundle_5 (which 5 is purchase-time, not per-license scope)', () => {
    const o = computePostOwnership(
      [lic({ product: 'post_bundle_5', feature: 'post.library', scope: null })],
      'shop',
    );
    expect(o.allOwned).toBe(false);
    expect(o.owned.size).toBe(0);
  });

  it('handles an empty license set on a non-enterprise plan (owns nothing)', () => {
    const o = computePostOwnership([], 'free');
    expect(o.allOwned).toBe(false);
    expect(o.owned.size).toBe(0);
    expect(ownsController(o, 'fanuc-0i')).toBe(false);
  });

  it('a post_perpetual without a scope does not crash and owns nothing', () => {
    const o = computePostOwnership([lic({ scope: null })], 'pro');
    expect(o.owned.size).toBe(0);
  });
});
