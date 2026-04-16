import { test } from '@playwright/test';
import { PAGE_INTERACTION_MANIFEST } from '../../src/testing/pageInteractionManifest';
import { expectSignalVisible, openSurface } from './support/surfaceHarness';

test.describe('APPW purchase-intelligence surfaces', () => {
  test.describe.configure({ mode: 'serial' });

  for (const surface of PAGE_INTERACTION_MANIFEST) {
    test(`${surface.id} exposes its staged buying signals`, async ({ page }) => {
      await openSurface(page, surface.path, surface.minClearance);

      for (const signal of surface.signals) {
        await expectSignalVisible(page, signal);
      }
    });
  }
});
