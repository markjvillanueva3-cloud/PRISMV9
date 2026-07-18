import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { FeatureGate } from '../components/entitlement';
import { clearEntitlementCache } from '../hooks/useEntitlement';
import type { FeatureKey } from '../data/pricing';

// Drive the live plan deterministically via a hoisted holder (avoids the TDZ
// trap of referencing test-scope vars inside the hoisted vi.mock factory).
const h = vi.hoisted(() => ({
  status: { plan: 'free', authenticated: true } as { plan: string; authenticated?: boolean },
}));

vi.mock('../api/billing', () => ({
  billingApi: { getBillingStatus: () => Promise.resolve(h.status) },
}));

function renderGate(feature: FeatureKey, fallback?: ReactNode) {
  return render(
    <MemoryRouter>
      <FeatureGate feature={feature} fallback={fallback}>
        <div data-testid="paid">PAID CONTENT</div>
      </FeatureGate>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  clearEntitlementCache();
  h.status = { plan: 'free', authenticated: true };
});

describe('FeatureGate (round-trip: hook -> matrix -> render)', () => {
  it('denies a free user a paid feature and renders the UpgradePrompt with the unlocking tier', async () => {
    h.status = { plan: 'free', authenticated: true };
    renderGate('sfc.nine_axis');
    await waitFor(() => expect(screen.getByText(/requires the Starter plan/i)).toBeTruthy());
    expect(screen.queryByTestId('paid')).toBeNull();
  });

  it('admits a starter user to a starter-included feature (renders children, no prompt)', async () => {
    h.status = { plan: 'starter', authenticated: true };
    renderGate('sfc.nine_axis');
    await waitFor(() => expect(screen.getByTestId('paid')).toBeTruthy());
    expect(screen.queryByText(/requires the/i)).toBeNull();
  });

  it('denies a pro feature to a starter user (calibration is pro+)', async () => {
    h.status = { plan: 'starter', authenticated: true };
    renderGate('sfc.calibration');
    await waitFor(() => expect(screen.getByText(/requires the Pro plan/i)).toBeTruthy());
    expect(screen.queryByTestId('paid')).toBeNull();
  });

  it('shows COMING SOON (not an upgrade CTA) for a not-yet-live feature even on enterprise', async () => {
    h.status = { plan: 'enterprise', authenticated: true };
    renderGate('quoting');
    await waitFor(() => expect(screen.getByText(/coming soon/i)).toBeTruthy());
    expect(screen.queryByTestId('paid')).toBeNull();
    expect(screen.queryByText(/requires the/i)).toBeNull();
  });

  it('renders a custom fallback instead of the default UpgradePrompt when denied', async () => {
    h.status = { plan: 'free', authenticated: true };
    renderGate('cadcam', <div data-testid="custom-fallback">LOCKED</div>);
    await waitFor(() => expect(screen.getByTestId('custom-fallback')).toBeTruthy());
    expect(screen.queryByTestId('paid')).toBeNull();
  });

  it('denies by default when the plan value is unrecognized (deny-by-default)', async () => {
    h.status = { plan: 'mystery-tier', authenticated: true };
    renderGate('sfc.nine_axis');
    await waitFor(() => expect(screen.getByText(/requires the Starter plan/i)).toBeTruthy());
    expect(screen.queryByTestId('paid')).toBeNull();
  });
});
