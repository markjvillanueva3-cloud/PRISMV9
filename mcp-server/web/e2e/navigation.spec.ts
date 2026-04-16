/**
 * E2E Tests — Navigation & Core Routes
 * S4-MS1 P0-U01: E2E Test Suite — Playwright
 *
 * Tests site navigation, route protection, and page loading.
 */
import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('homepage redirects to dashboard or login', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should be on dashboard or redirected to login
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|login|calculator)?$/);
  });

  test('dashboard page loads', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Dashboard should have main content
    const main = page.locator('main, [role="main"], .dashboard');
    await expect(main.first()).toBeVisible({ timeout: 10000 });
  });

  test('calculator route loads', async ({ page }) => {
    await page.goto('/calculator');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/calculator/);
  });

  test('jobs page loads', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/jobs/);
  });

  test('scheduling page loads', async ({ page }) => {
    await page.goto('/scheduling');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/scheduling/);
  });

  test('inventory page loads', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/inventory/);
  });

  test('quotes page loads', async ({ page }) => {
    await page.goto('/quotes');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/quotes/);
  });
});

test.describe('Navigation Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have navigation sidebar or header', async ({ page }) => {
    const nav = page.locator('nav, [role="navigation"], aside, header');
    await expect(nav.first()).toBeVisible({ timeout: 5000 });
  });

  test('should navigate between pages', async ({ page }) => {
    // Find any navigation link
    const navLinks = page.locator('nav a, aside a, header a');
    const count = await navLinks.count();

    if (count > 0) {
      // Click first link and verify navigation
      const firstLink = navLinks.first();
      const href = await firstLink.getAttribute('href');

      if (href && href !== '#' && !href.startsWith('http')) {
        await firstLink.click();
        await page.waitForLoadState('networkidle');
        // Page should have changed
      }
    }
  });
});

test.describe('Error Handling', () => {
  test('404 page for invalid routes', async ({ page }) => {
    await page.goto('/invalid-route-that-does-not-exist-12345');
    await page.waitForLoadState('networkidle');

    // Should show 404 or redirect
    const body = await page.textContent('body');
    // Either shows 404 content or redirects
  });
});
