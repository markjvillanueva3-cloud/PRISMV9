/**
 * GatedError -- reactive 403->UpgradePrompt companion to FeatureGate (LAUNCH-FE 2026-06-23).
 *
 * A gated dispatcher call that returns 403 (backend requireTier denial) must render the
 * upgrade CTA, NOT a raw error; every other error (network/500/401/validation) falls
 * through to the page's normal error UI. Pins the gate discrimination so a page wiring
 * GatedError into its error path is provably correct -- and proves the dormant-safe
 * contract (non-403 == unchanged behavior) so pre-wiring ahead of papa's gate is safe (R9).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { GatedError } from '../components/entitlement';
import { clearEntitlementCache } from '../hooks/useEntitlement';
import { ApiError } from '../api/requestCore';
import type { FeatureKey } from '../data/pricing';

const h = vi.hoisted(() => ({
  status: { plan: 'free', authenticated: true } as { plan: string; authenticated?: boolean },
}));

vi.mock('../api/billing', () => ({
  billingApi: { getBillingStatus: () => Promise.resolve(h.status) },
}));

const FALLBACK: ReactNode = <div data-testid="page-error">Network unavailable</div>;

function renderGated(error: unknown, feature: FeatureKey = 'wizard.lathe', fallback: ReactNode = FALLBACK) {
  return render(
    <MemoryRouter>
      <GatedError error={error} feature={feature} fallback={fallback} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  clearEntitlementCache();
  h.status = { plan: 'free', authenticated: true };
});

describe('GatedError (reactive 403 -> UpgradePrompt; everything else -> fallback)', () => {
  it('403 ApiError renders the upgrade CTA for the feature (not the fallback)', async () => {
    renderGated(new ApiError(403, 'Forbidden'));
    await waitFor(() => expect(screen.getByText(/Lathe Wizard requires the Pro plan/i)).toBeTruthy());
    expect(screen.queryByTestId('page-error')).toBeNull();
  });

  it('403 for a DIFFERENT gated feature shows that feature\'s prompt (feature-driven, not page-driven)', async () => {
    renderGated(new ApiError(403, 'Forbidden'), 'wizard.wedm');
    await waitFor(() => expect(screen.getByText(/Wire-EDM Wizard requires the Pro plan/i)).toBeTruthy());
  });

  it('500 ApiError falls through to the page error UI (server error is NOT a gate)', async () => {
    renderGated(new ApiError(500, 'Server error'));
    await waitFor(() => expect(screen.getByTestId('page-error')).toBeTruthy());
    expect(screen.queryByText(/requires the/i)).toBeNull();
  });

  it('401 ApiError falls through (not-signed-in is an AUTH concern, not an upgrade)', async () => {
    renderGated(new ApiError(401, 'Unauthorized'));
    await waitFor(() => expect(screen.getByTestId('page-error')).toBeTruthy());
    expect(screen.queryByText(/requires the/i)).toBeNull();
  });

  it('null error renders the fallback (dormant-safe: no error -> unchanged)', async () => {
    renderGated(null);
    await waitFor(() => expect(screen.getByTestId('page-error')).toBeTruthy());
  });

  it('a non-ApiError with a 403-looking status field is NOT treated as a gate (instanceof guard)', async () => {
    // A plain object that merely mimics { status: 403 } must not unlock the CTA --
    // only a real ApiError(403) from the dispatcher is a tier-gate denial.
    renderGated({ status: 403, message: 'fake' });
    await waitFor(() => expect(screen.getByTestId('page-error')).toBeTruthy());
    expect(screen.queryByText(/requires the/i)).toBeNull();
  });

  it('a thrown plain Error falls through to the fallback', async () => {
    renderGated(new Error('boom'));
    await waitFor(() => expect(screen.getByTestId('page-error')).toBeTruthy());
  });

  it('a 403 on a NOT-YET-LIVE feature shows "coming soon", never an upgrade CTA', async () => {
    renderGated(new ApiError(403, 'Forbidden'), 'quoting');
    await waitFor(() => expect(screen.getByText(/coming soon/i)).toBeTruthy());
    expect(screen.queryByText(/requires the/i)).toBeNull();
  });

  it('renders NOTHING extra when no fallback is provided and the error is a non-gate', async () => {
    const { container } = renderGated(new ApiError(500, 'Server error'), 'wizard.lathe', undefined);
    await waitFor(() => expect(screen.queryByText(/requires the/i)).toBeNull());
    // no fallback + non-gate -> empty render (page owns its own error UI separately)
    expect(container.textContent).toBe('');
  });

  // --- prop forwarding: prove compact actually reaches UpgradePrompt (not silently dropped) ---
  // UpgradePrompt hides the "Unlock it from <tier> -- $<price>/mo" price line when compact=true
  // (UpgradePrompt.tsx: `!compact && neededTier && <price line>`). These two cases fail if the
  // compact prop is dropped on the GatedError -> UpgradePrompt pass-through.

  it('default (non-compact) 403 shows the price line', async () => {
    render(
      <MemoryRouter>
        <GatedError error={new ApiError(403, 'Forbidden')} feature="wizard.lathe" fallback={FALLBACK} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/Unlock it from the Pro plan/i)).toBeTruthy());
  });

  it('compact 403 forwards compact -> the price line is suppressed (but the requires-line stays)', async () => {
    render(
      <MemoryRouter>
        <GatedError error={new ApiError(403, 'Forbidden')} feature="wizard.lathe" fallback={FALLBACK} compact />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText(/Lathe Wizard requires the Pro plan/i)).toBeTruthy());
    expect(screen.queryByText(/Unlock it from/i)).toBeNull();
  });
});
