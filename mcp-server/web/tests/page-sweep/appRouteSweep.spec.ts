import { expect, test } from '@playwright/test';
import { PAGE_SURFACE_MANIFEST } from '../../src/testing/pageSurfaceManifest';
import { buildPathPattern, expectSignalVisible, openSurface } from './support/surfaceHarness';

test.describe('APPW page-sweep route smoke', () => {
  test.describe.configure({ mode: 'serial' });

  for (const surface of PAGE_SURFACE_MANIFEST) {
    test(`${surface.id} loads its canonical surface`, async ({ page }) => {
      await openSurface(page, surface.path, surface.minClearance);

      await expect(page).toHaveURL(buildPathPattern(surface.path));
      await expectSignalVisible(page, surface.primarySignal);
      await expect(page.locator('main, [role="main"], body').first()).toBeVisible();
      await expect(page.getByText('The requested route could not finish loading.', { exact: false })).toHaveCount(0);
    });
  }
});
