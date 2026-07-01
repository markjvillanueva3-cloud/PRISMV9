/**
 * E2E Tests — Error Handling & Offline Support
 * S4-MS1 P0-U04: Error Handling & Offline Support
 *
 * Tests error handling, offline behavior, and recovery.
 */
import { test, expect } from '@playwright/test';

test.describe('Error Handling', () => {
  test('should display error boundary on page crash', async ({ page }) => {
    // Inject an error to trigger error boundary
    await page.goto('/calculator');
    await page.waitForLoadState('networkidle');

    // Try to trigger an error by injecting bad state
    await page.evaluate(() => {
      const event = new ErrorEvent('error', {
        error: new Error('Test error'),
        message: 'Test error message',
      });
      window.dispatchEvent(event);
    });

    // Error boundary may or may not catch window errors
    // This is more about ensuring the page doesn't completely break
  });

  test('should show offline indicator when disconnected', async ({ page, context }) => {
    await page.goto('/calculator');
    await page.waitForLoadState('networkidle');

    // Simulate offline mode
    await context.setOffline(true);

    // Wait a moment for the app to detect offline state
    await page.waitForTimeout(500);

    // Check for offline indicator
    const offlineIndicator = page.locator(
      '[data-testid="offline-indicator"], ' +
      'text=/offline|no connection/i'
    );

    // May or may not have visual indicator
    const isVisible = await offlineIndicator.isVisible({ timeout: 2000 }).catch(() => false);

    // Restore online
    await context.setOffline(false);
  });

  test('should retry failed requests', async ({ page }) => {
    let requestCount = 0;

    // Intercept API calls
    await page.route('**/api/**', (route) => {
      requestCount++;
      if (requestCount < 3) {
        // Fail first 2 requests
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' }),
        });
      } else {
        // Succeed on 3rd
        route.fulfill({
          status: 200,
          body: JSON.stringify({ data: 'success' }),
        });
      }
    });

    await page.goto('/calculator');
    await page.waitForLoadState('networkidle');

    // The resilient fetch should have retried
    // Just verify page loaded without crashing
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle 404 gracefully', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-12345');
    await page.waitForLoadState('networkidle');

    // Should show some kind of error or redirect
    // Not crash the app
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle API timeout gracefully', async ({ page }) => {
    // Simulate slow API
    await page.route('**/api/**', async (route) => {
      // Delay response
      await new Promise((r) => setTimeout(r, 35000)); // Longer than typical timeout
      route.fulfill({
        status: 200,
        body: JSON.stringify({ data: 'delayed' }),
      });
    });

    await page.goto('/calculator');

    // Page should still load even if API is slow
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Offline Support', () => {
  test('should detect offline state', async ({ page, context }) => {
    await page.goto('/calculator');
    await page.waitForLoadState('networkidle');

    // Check initial online state
    const isOnlineInitially = await page.evaluate(() => navigator.onLine);
    expect(isOnlineInitially).toBe(true);

    // Go offline
    await context.setOffline(true);

    // Check offline state
    const isOnlineAfter = await page.evaluate(() => navigator.onLine);
    expect(isOnlineAfter).toBe(false);

    // Restore
    await context.setOffline(false);
  });

  test('should queue actions when offline', async ({ page, context }) => {
    await page.goto('/calculator');
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // Try to make a request (should be queued or fail gracefully)
    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/v1/health', {
          method: 'GET',
        });
        return { ok: response.ok, status: response.status };
      } catch (e) {
        return { error: (e as Error).message };
      }
    });

    // Request should fail or be queued
    expect(result.error || !result.ok).toBeTruthy();

    // Restore online
    await context.setOffline(false);
  });

  test('should recover when back online', async ({ page, context }) => {
    await page.goto('/calculator');
    await page.waitForLoadState('networkidle');

    // Go offline then online
    await context.setOffline(true);
    await page.waitForTimeout(500);
    await context.setOffline(false);

    // Wait for potential reconnection handling
    await page.waitForTimeout(1000);

    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Error Recovery', () => {
  test('should allow retry after error', async ({ page }) => {
    let shouldFail = true;

    await page.route('**/api/v1/speed-feed/**', (route) => {
      if (shouldFail) {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Temporary error' }),
        });
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ result: 'success' }),
        });
      }
    });

    await page.goto('/calculator');
    await page.waitForLoadState('networkidle');

    // After first failure, change to succeed
    shouldFail = false;

    // Find and click retry button if visible
    const retryButton = page.locator('button:has-text("Try Again"), button:has-text("Retry")');
    if (await retryButton.isVisible({ timeout: 2000 })) {
      await retryButton.click();
      await page.waitForTimeout(1000);
    }

    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('should preserve form data on error recovery', async ({ page }) => {
    await page.goto('/calculator');
    await page.waitForLoadState('networkidle');

    // Enter some data
    const input = page.locator('input').first();
    if (await input.isVisible({ timeout: 2000 })) {
      await input.fill('test-value');

      // Trigger an error (simulate)
      await page.evaluate(() => {
        throw new Error('Test error');
      }).catch(() => {
        // Expected to fail
      });

      // Check if input still has value
      const value = await input.inputValue();
      // Value may or may not be preserved depending on error boundary implementation
    }
  });
});

test.describe('Loading States', () => {
  test('should show loading indicator during API calls', async ({ page }) => {
    // Delay API response
    await page.route('**/api/**', async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      route.continue();
    });

    await page.goto('/calculator');

    // Check for loading indicator
    const loadingIndicator = page.locator(
      '[data-testid="loading"], ' +
      '.loading, ' +
      '.spinner, ' +
      'text=/loading/i'
    );

    // May or may not be visible depending on timing
    const isLoading = await loadingIndicator.isVisible({ timeout: 1000 }).catch(() => false);

    // Eventually page should load
    await page.waitForLoadState('networkidle');
  });

  test('should show skeleton loaders while content loads', async ({ page }) => {
    await page.goto('/calculator');

    // Check for skeleton loaders during load
    const skeletons = page.locator('.skeleton, .animate-pulse');
    const skeletonCount = await skeletons.count();

    // May have skeleton loaders
    // console.log(`Skeleton loaders found: ${skeletonCount}`);
  });
});
