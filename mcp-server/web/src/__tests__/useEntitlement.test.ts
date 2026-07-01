/**
 * useEntitlement -- the foundation of EVERY FeatureGate. Tests the security
 * invariant first (R9): a plan-load FAILURE must DENY (never leak a paid
 * feature), an UNKNOWN plan string normalizes to 'free' (deny-by-default), and
 * a NOT-YET-LIVE feature is denied even on the top plan. Also the happy paths
 * (free/pro/enterprise) so can() tracks the live plan.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Control the billing-status response; the hook's plan->matrix logic runs for real.
const h = vi.hoisted(() => ({ plan: 'free' as string, reject: false, authenticated: true }));

vi.mock('../api/billing', () => ({
  billingApi: {
    getBillingStatus: () =>
      h.reject
        ? Promise.reject(new Error('network down'))
        : Promise.resolve({ plan: h.plan, authenticated: h.authenticated }),
  },
}));

import { useEntitlement, clearEntitlementCache } from '../hooks/useEntitlement';

beforeEach(() => {
  h.plan = 'free';
  h.reject = false;
  h.authenticated = true;
  clearEntitlementCache();
});

async function mountResolved() {
  const view = renderHook(() => useEntitlement());
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
}

describe('useEntitlement (gate foundation)', () => {
  it('DENIES by default when the plan load fails (never leak a paid feature)', async () => {
    h.reject = true;
    const { result } = await mountResolved();
    expect(result.current.plan).toBeNull();
    expect(result.current.error).not.toBeNull();
    // a load failure must deny EVERY feature -- even the free-capped basic calc
    expect(result.current.can('sfc.basic')).toBe(false);
    expect(result.current.can('wizard.mill')).toBe(false);
  });

  it('normalizes an UNKNOWN plan string to free (deny-by-default)', async () => {
    h.plan = 'platinum_does_not_exist';
    const { result } = await mountResolved();
    expect(result.current.plan).toBe('free');
    expect(result.current.can('wizard.mill')).toBe(false); // free has no wizard
  });

  it('denies a NOT-YET-LIVE feature even on the enterprise plan', async () => {
    h.plan = 'enterprise';
    const { result } = await mountResolved();
    expect(result.current.can('quoting')).toBe(false); // sold, not launched -> denied for all
    expect(result.current.can('erp')).toBe(false);
    expect(result.current.can('wizard.mill')).toBe(true); // enterprise has the live paid features
  });

  it('free plan: includes the capped basic calc, excludes paid features', async () => {
    h.plan = 'free';
    const { result } = await mountResolved();
    expect(result.current.can('sfc.basic')).toBe(true); // free = 10/day -> included
    expect(result.current.entitlement('sfc.basic')).toBe(10);
    expect(result.current.can('sfc.nine_axis')).toBe(false);
    expect(result.current.can('post.generate')).toBe(false);
  });

  it('pro plan: wizards + sim included, cadcam (shop+) still excluded', async () => {
    h.plan = 'pro';
    const { result } = await mountResolved();
    expect(result.current.plan).toBe('pro');
    expect(result.current.can('wizard.mill')).toBe(true);
    expect(result.current.can('print_to_cnc')).toBe(true);
    expect(result.current.can('cadcam')).toBe(false); // cadcam is shop+
  });

  it('exposes the authenticated flag from the billing status', async () => {
    h.plan = 'free';
    h.authenticated = false;
    const { result } = await mountResolved();
    expect(result.current.authenticated).toBe(false);
  });
});
