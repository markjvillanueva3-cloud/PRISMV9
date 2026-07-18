// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';
import { ShellCommerceControls } from '../components/shell/ShellCommerceControls';

describe('ShellCommerceControls', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows live billing posture without replacing the staged tier catalog', async () => {
    const liveBillingServices = {
      ...fixtureOperatingSystemServices,
      async getShellCommerceCatalog() {
        const fallback = await fixtureOperatingSystemServices.getShellCommerceCatalog();
        return {
          ...fallback,
          billingPosture: {
            source: 'live' as const,
            authenticated: true,
            currentPlanId: 'pro',
            currentPlanLabel: 'Standard',
            roleLabel: 'engineer',
            detail:
              'Live billing status is connected. Backend currently reports engineer access on the Standard billing lane while the staged catalog keeps the broader PRISM packaging story visible.',
            planPrices: [
              {
                planId: 'starter',
                label: 'Starter',
                monthlyLabel: '$29 / month',
                annualLabel: '$290 / year',
              },
              {
                planId: 'pro',
                label: 'Pro',
                monthlyLabel: '$79 / month',
                annualLabel: '$790 / year',
              },
            ],
            mappedTierId: 'standard',
            mappedTierLabel: 'Standard',
            lastSyncLabel: 'Mar 29, 1:15 PM',
          },
        };
      },
    };

    render(
      <OperatingSystemProvider services={liveBillingServices}>
        <ShellCommerceControls />
      </OperatingSystemProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Tier features' })).toBeDefined();
    });

    expect(screen.getByText('Live billing ready')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Tier features' }));

    expect(screen.getByRole('dialog', { name: 'Tier features' })).toBeDefined();
    expect(screen.getByText('Billing posture')).toBeDefined();
    expect(screen.getByText('Live billing status')).toBeDefined();
    expect(screen.getByText(/Billing sync Mar 29, 1:15 PM/i)).toBeDefined();
    expect(screen.getAllByText('Standard').length).toBeGreaterThan(0);
    expect(screen.getByText('$79 / month')).toBeDefined();
    expect(screen.getByText('$790 / year')).toBeDefined();
    expect(screen.getByText('Live billing plan')).toBeDefined();
  });
});
