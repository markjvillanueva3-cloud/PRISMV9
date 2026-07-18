/**
 * resolveCheckout -- the revenue-critical plan-selection resolver. Tests the
 * intent (R9): free -> sign in; enterprise -> sales mailto; paid -> the Stripe
 * URL; and the failure modes that must NOT silently strand a buyer (no url in
 * the response, the call throwing with or without a message).
 */
import { describe, it, expect } from 'vitest';
import {
  resolveCheckout,
  isSelfServeCheckout,
  ENTERPRISE_MAILTO,
  bundleSalesMailto,
  resolvePostPurchase,
  resolveBillingPortal,
} from '../lib/checkout';
import { ONE_TIME_PRODUCTS, formatPrice } from '../data/pricing';

describe('resolveCheckout (plan -> checkout intent)', () => {
  it('free -> redirect to the free calculator (no checkout call, no login wall)', async () => {
    let called = false;
    const out = await resolveCheckout('free', async () => {
      called = true;
      return { url: 'should-not-happen' };
    });
    expect(out).toEqual({ kind: 'redirect', href: '/speed-feed-calc' });
    expect(called).toBe(false);
  });

  it('enterprise -> sales mailto (no self-serve checkout call)', async () => {
    let called = false;
    const out = await resolveCheckout('enterprise', async () => {
      called = true;
      return { url: 'should-not-happen' };
    });
    expect(out).toEqual({ kind: 'redirect', href: ENTERPRISE_MAILTO });
    expect(out.kind === 'redirect' && out.href.startsWith('mailto:')).toBe(true);
    expect(called).toBe(false);
  });

  it('paid plan with a checkout url -> redirect to that exact url', async () => {
    const out = await resolveCheckout('pro', async (plan) => {
      expect(plan).toBe('pro');
      return { url: 'https://checkout.stripe.test/c/sess_abc123' };
    });
    expect(out).toEqual({ kind: 'redirect', href: 'https://checkout.stripe.test/c/sess_abc123' });
  });

  it('paid plan but the response has NO url -> actionable error (never a blank redirect)', async () => {
    const out = await resolveCheckout('shop', async () => ({}));
    expect(out.kind).toBe('error');
    expect(out.kind === 'error' && out.message).toContain('could not be started');
  });

  it('paid plan but createCheckout throws -> surfaces the thrown message', async () => {
    const out = await resolveCheckout('starter', async () => {
      throw new Error('Stripe is unavailable');
    });
    expect(out).toEqual({ kind: 'error', message: 'Stripe is unavailable' });
  });

  it('paid plan, throw with no message -> a generic fallback (never empty)', async () => {
    const out = await resolveCheckout('pro', async () => {
      throw new Error('');
    });
    expect(out.kind).toBe('error');
    expect(out.kind === 'error' && out.message.length).toBeGreaterThan(0);
    expect(out.kind === 'error' && out.message).toContain('Checkout failed');
  });
});

describe('resolvePostPurchase (single-controller post checkout)', () => {
  it('forwards each cadence + returns the redirect url (monthly/annual/permanent)', async () => {
    for (const type of ['monthly', 'annual', 'permanent'] as const) {
      const out = await resolvePostPurchase('fanuc-30i', type, async (controllerId, t) => {
        expect(controllerId).toBe('fanuc-30i');
        expect(t).toBe(type);
        return { url: `https://checkout.stripe.test/${type}` };
      });
      expect(out).toEqual({ kind: 'redirect', href: `https://checkout.stripe.test/${type}` });
    }
  });

  it('no url in the response -> actionable error (never a blank redirect)', async () => {
    const out = await resolvePostPurchase('haas-ngc', 'monthly', async () => ({}));
    expect(out.kind).toBe('error');
    expect(out.kind === 'error' && out.message).toContain('could not be started');
  });

  it('purchasePost throws -> surfaces the thrown message', async () => {
    const out = await resolvePostPurchase('haas-ngc', 'annual', async () => {
      throw new Error('card declined');
    });
    expect(out).toEqual({ kind: 'error', message: 'card declined' });
  });

  it('throw with empty message -> generic "Purchase failed" (never empty)', async () => {
    const out = await resolvePostPurchase('okuma-osp', 'permanent', async () => {
      throw new Error('');
    });
    expect(out.kind === 'error' && out.message).toContain('Purchase failed');
  });
});

describe('resolveBillingPortal (manage / upgrade / cancel via Stripe portal)', () => {
  it('portal url -> redirect to it', async () => {
    const out = await resolveBillingPortal(async () => ({ url: 'https://billing.stripe.test/portal' }));
    expect(out).toEqual({ kind: 'redirect', href: 'https://billing.stripe.test/portal' });
  });

  it('no url (no Stripe customer on file yet) -> actionable "not available yet"', async () => {
    const out = await resolveBillingPortal(async () => ({}));
    expect(out.kind).toBe('error');
    expect(out.kind === 'error' && out.message).toContain('not available yet');
  });

  it('createPortal throws -> surfaces the thrown message', async () => {
    const out = await resolveBillingPortal(async () => {
      throw new Error('no customer on file');
    });
    expect(out).toEqual({ kind: 'error', message: 'no customer on file' });
  });

  it('throw with empty message -> generic "not available yet"', async () => {
    const out = await resolveBillingPortal(async () => {
      throw new Error('');
    });
    expect(out.kind === 'error' && out.message).toContain('not available yet');
  });
});

describe('isSelfServeCheckout', () => {
  it('paid tiers are self-serve; free + enterprise are not', () => {
    expect(isSelfServeCheckout('starter')).toBe(true);
    expect(isSelfServeCheckout('pro')).toBe(true);
    expect(isSelfServeCheckout('shop')).toBe(true);
    expect(isSelfServeCheckout('free')).toBe(false);
    expect(isSelfServeCheckout('enterprise')).toBe(false);
  });
});

describe('bundleSalesMailto (bundles route to sales at the CORRECT price, not a mis-priced self-serve checkout)', () => {
  it('5-pack -> sales mailto carrying the bundle name + its $799 price', () => {
    const href = bundleSalesMailto('post_bundle_5');
    expect(href.startsWith('mailto:sales@kienzle.tools')).toBe(true);
    const decoded = decodeURIComponent(href);
    expect(decoded).toContain(ONE_TIME_PRODUCTS.post_bundle_5.name);
    expect(decoded).toContain(formatPrice(ONE_TIME_PRODUCTS.post_bundle_5.priceUsd));
  });

  it('all-controllers -> sales mailto carrying the all-bundle name + its $2,499 price', () => {
    const href = bundleSalesMailto('post_bundle_all');
    const decoded = decodeURIComponent(href);
    expect(decoded).toContain(ONE_TIME_PRODUCTS.post_bundle_all.name);
    expect(decoded).toContain(formatPrice(ONE_TIME_PRODUCTS.post_bundle_all.priceUsd));
  });

  it('regression guard: the bundle price quoted is NOT the $199 single-post price', () => {
    // The bug was charging the single price for a bundle. Prove the quoted bundle
    // prices genuinely differ from the single post_perpetual price.
    const single = formatPrice(ONE_TIME_PRODUCTS.post_perpetual.priceUsd);
    expect(formatPrice(ONE_TIME_PRODUCTS.post_bundle_5.priceUsd)).not.toBe(single);
    expect(formatPrice(ONE_TIME_PRODUCTS.post_bundle_all.priceUsd)).not.toBe(single);
  });
});
