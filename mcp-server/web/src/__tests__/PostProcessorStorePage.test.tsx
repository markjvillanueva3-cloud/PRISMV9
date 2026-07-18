import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PostProcessorStorePage from '../pages/PostProcessorStorePage';
import type { LicenseSummary } from '../api/billing';

// Mock only the billing client; computePostOwnership + the page render for real
// (round-trip: license -> ownership -> "Owned" cell).
const h = vi.hoisted(() => ({
  status: { plan: 'pro' } as { plan: string },
  licenses: { licenses: [] as LicenseSummary[], count: 0 },
  failLicenses: false,
}));

vi.mock('../api/billing', () => ({
  billingApi: {
    getBillingStatus: () => Promise.resolve(h.status),
    getLicenses: () =>
      h.failLicenses ? Promise.reject(new Error('401 unauthorized')) : Promise.resolve(h.licenses),
    purchasePost: vi.fn(),
  },
}));

function activePostLicense(scope: string): LicenseSummary {
  return { licenseKey: `k-${scope}`, product: 'post_perpetual', feature: null, scope, status: 'active' };
}

beforeEach(() => {
  h.status = { plan: 'pro' };
  h.licenses = { licenses: [], count: 0 };
  h.failLicenses = false;
});

describe('PostProcessorStorePage ownership display', () => {
  it('marks an owned (licensed) controller "Owned" and leaves the rest buyable', async () => {
    h.licenses = { licenses: [activePostLicense('fanuc-30i')], count: 1 };
    render(<PostProcessorStorePage />);
    // 20 controllers; exactly one is owned (fanuc-30i), the other 19 buyable.
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^Owned$/ }).length).toBe(1));
    expect(screen.getAllByRole('button', { name: /^Buy/ }).length).toBe(19);
  });

  it('enterprise plan shows every controller as Included (allOwned)', async () => {
    h.status = { plan: 'enterprise' };
    render(<PostProcessorStorePage />);
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^Included$/ }).length).toBe(20));
    expect(screen.queryAllByRole('button', { name: /^Buy/ }).length).toBe(0);
  });

  it('owns nothing (all buyable) when the license fetch fails -- graceful 401', async () => {
    h.failLicenses = true;
    render(<PostProcessorStorePage />);
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^Buy/ }).length).toBe(20));
    expect(screen.queryAllByRole('button', { name: /^Owned$/ }).length).toBe(0);
  });

  it('an all-controllers bundle license owns every controller (non-enterprise plan)', async () => {
    h.status = { plan: 'shop' };
    h.licenses = {
      licenses: [{ licenseKey: 'kb', product: 'post_bundle_all', feature: 'post.library', scope: null, status: 'active' }],
      count: 1,
    };
    render(<PostProcessorStorePage />);
    // allOwned but not enterprise -> "Owned" (not "Included") on all 20.
    await waitFor(() => expect(screen.getAllByRole('button', { name: /^Owned$/ }).length).toBe(20));
  });
});
