import { expect, test } from '@playwright/test';
import type { ClearanceLevel } from '../../src/contexts/AuthContext';
import type { PageSweepSignal } from '../../src/testing/pageSurfaceManifest';
import { expectSignalVisible, openSurface } from './support/surfaceHarness';

const ACCESS_MATRIX: Array<{
  id: string;
  path: string;
  role: ClearanceLevel;
  shouldAllow: boolean;
  allowedSignal?: PageSweepSignal;
}> = [
  {
    id: 'shop-floor-can-open-calculator',
    path: '/calculator',
    role: 'shop_floor',
    shouldAllow: true,
    allowedSignal: { kind: 'text', value: 'ULTIMATE MACHINING TOOL', exact: false },
  },
  {
    id: 'shop-floor-blocked-from-machine-rates',
    path: '/machine-rates',
    role: 'shop_floor',
    shouldAllow: false,
  },
  {
    id: 'lead-can-open-machine-rates',
    path: '/machine-rates',
    role: 'lead',
    shouldAllow: true,
    allowedSignal: { kind: 'heading', value: 'Machine Rates' },
  },
  {
    id: 'lead-blocked-from-employees',
    path: '/employees',
    role: 'lead',
    shouldAllow: false,
  },
  {
    id: 'hr-can-open-employees',
    path: '/employees',
    role: 'hr_manager',
    shouldAllow: true,
    allowedSignal: { kind: 'heading', value: 'Employee Directory' },
  },
  {
    id: 'hr-blocked-from-financial-analysis',
    path: '/financial-analysis',
    role: 'hr_manager',
    shouldAllow: false,
  },
  {
    id: 'admin-can-open-financial-analysis',
    path: '/financial-analysis',
    role: 'admin',
    shouldAllow: true,
    allowedSignal: { kind: 'heading', value: 'Financial Analysis' },
  },
];

test.describe('APPW role access matrix', () => {
  test.describe.configure({ mode: 'serial' });

  for (const scenario of ACCESS_MATRIX) {
    test(scenario.id, async ({ page }) => {
      await openSurface(page, scenario.path, scenario.role);

      if (scenario.shouldAllow) {
        await expectSignalVisible(page, scenario.allowedSignal!);
        await expect(page.getByText('Access Restricted')).toHaveCount(0);
        return;
      }

      await expect(page.getByRole('heading', { name: 'Access Restricted' })).toBeVisible();
    });
  }

  test('unauthenticated users are redirected to login for protected routes', async ({ page }) => {
    await openSurface(page, '/machine-rates');
    await expect(page).toHaveURL(/\/login$/);
  });
});
