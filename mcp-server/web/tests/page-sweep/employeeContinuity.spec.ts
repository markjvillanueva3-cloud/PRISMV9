import { expect, test } from '@playwright/test';
import type { ClearanceLevel } from '../../src/contexts/AuthContext';
import type { PageSweepSignal } from '../../src/testing/pageSurfaceManifest';
import { buildPathPattern, expectSignalVisible, openSurface } from './support/surfaceHarness';

type EmployeeContinuitySurface = {
  id: string;
  path: string;
  minClearance: ClearanceLevel;
  primarySignal: PageSweepSignal;
  continuitySignals: PageSweepSignal[];
};

const EMPLOYEE_CONTINUITY_SURFACES: EmployeeContinuitySurface[] = [
  {
    id: 'machinist-home-shell',
    path: '/employee?profile=machinist',
    minClearance: 'shop_floor',
    primarySignal: { kind: 'heading', value: 'Avery Stone' },
    continuitySignals: [
      { kind: 'text', value: 'My active jobs' },
      { kind: 'text', value: 'Shop clock' },
      { kind: 'text', value: 'Capture ops' },
      { kind: 'text', value: 'Messages' },
      { kind: 'text', value: 'Recommended learning' },
      { kind: 'text', value: 'Shift priorities' },
      { kind: 'text', value: 'Blockers and handoffs' },
    ],
  },
  {
    id: 'machinist-messages-handoff',
    path: '/employee/messages?profile=machinist',
    minClearance: 'shop_floor',
    primarySignal: { kind: 'heading', value: 'Messages' },
    continuitySignals: [
      { kind: 'heading', value: 'MC-04 setup handoff for JOB-4821' },
      { kind: 'text', value: 'Acknowledge handoff workspace', exact: false },
      { kind: 'link', value: 'Open linked job' },
      { kind: 'link', value: 'Open Jobs follow-up' },
      { kind: 'link', value: 'Open Print to CNC' },
      { kind: 'text', value: 'Action workspace', exact: false },
      { kind: 'text', value: 'Workflow follow-up', exact: false },
    ],
  },
  {
    id: 'machinist-shop-clock',
    path: '/employee/shop-clock?profile=machinist',
    minClearance: 'shop_floor',
    primarySignal: { kind: 'heading', value: 'Shop Floor Clock Offline' },
    continuitySignals: [
      { kind: 'link', value: 'Open Capture Ops' },
      { kind: 'link', value: 'Open Messages follow-up' },
      { kind: 'button', value: 'Register job' },
      { kind: 'button', value: 'Check into department' },
      { kind: 'text', value: 'Traveler scan + department gate', exact: false },
      { kind: 'text', value: 'Mobile task board', exact: false },
    ],
  },
];

test.describe('APPW employee continuity sweep', () => {
  test.describe.configure({ mode: 'serial' });

  for (const surface of EMPLOYEE_CONTINUITY_SURFACES) {
    test(`${surface.id} preserves handoff and task continuity`, async ({ page }) => {
      await openSurface(page, surface.path, surface.minClearance);

      await expect(page).toHaveURL(buildPathPattern(surface.path));
      await expectSignalVisible(page, surface.primarySignal);

      for (const signal of surface.continuitySignals) {
        await expectSignalVisible(page, signal);
      }

      await expect(page.getByText('Access Restricted')).toHaveCount(0);
      await expect(page.getByText('The requested route could not finish loading.', { exact: false })).toHaveCount(0);
    });
  }
});
