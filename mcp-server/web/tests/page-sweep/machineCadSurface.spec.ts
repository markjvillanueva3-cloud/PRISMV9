import { expect, test } from '@playwright/test';
import { MACHINE_CAD_SURFACE_MANIFEST } from '../../src/testing/machineCadSurfaceManifest';
import { buildPathPattern, expectSignalVisible, openSurface } from './support/surfaceHarness';

test.describe('APPW machine CAD surface sweep', () => {
  test.describe.configure({ mode: 'serial' });

  for (const surface of MACHINE_CAD_SURFACE_MANIFEST) {
    test(`${surface.id} keeps CAD intake and machine review cues visible`, async ({ page }) => {
      await openSurface(page, surface.path, surface.minClearance);

      await expect(page).toHaveURL(buildPathPattern(surface.path));
      await expectSignalVisible(page, surface.primarySignal);

      for (const signal of surface.sourceSignals) {
        await expectSignalVisible(page, signal);
      }

      for (const signal of surface.capabilitySignals) {
        await expectSignalVisible(page, signal);
      }

      await expect(page.getByText('The requested route could not finish loading.', { exact: false })).toHaveCount(0);
    });
  }
});
