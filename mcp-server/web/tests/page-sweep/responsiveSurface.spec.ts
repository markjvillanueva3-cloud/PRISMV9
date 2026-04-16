import { expect, test } from '@playwright/test';
import { RESPONSIVE_PAGE_SURFACE_MANIFEST } from '../../src/testing/pageSurfaceManifest';
import { expectSignalVisible, openSurface } from './support/surfaceHarness';

const VIEWPORTS = [
  { id: 'desktop', size: { width: 1440, height: 960 } },
  { id: 'tablet-768', size: { width: 768, height: 1024 } },
];

test.describe('APPW responsive surface sweep', () => {
  for (const viewport of VIEWPORTS) {
    test.describe(viewport.id, () => {
      test.describe.configure({ mode: 'serial' });

      for (const surface of RESPONSIVE_PAGE_SURFACE_MANIFEST) {
        test(`${surface.id} stays legible at ${viewport.id}`, async ({ page }) => {
          await page.setViewportSize(viewport.size);
          await openSurface(page, surface.path, surface.minClearance);

          await expectSignalVisible(page, surface.primarySignal);
          await expect(page.locator('main, [role="main"]').first()).toBeVisible();

          const overflowDelta = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          );
          expect(overflowDelta).toBeLessThanOrEqual(24);
        });
      }
    });
  }
});
