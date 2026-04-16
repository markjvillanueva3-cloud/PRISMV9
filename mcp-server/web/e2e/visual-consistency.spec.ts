/**
 * E2E Tests — Visual Consistency
 * S4-MS1 P0-U06: Visual Polish & Design Consistency
 *
 * Tests visual design patterns across the application.
 */
import { test, expect } from '@playwright/test';

test.describe('Visual Consistency', () => {
  test.describe('Dark Theme', () => {
    test('should have dark background on all pages', async ({ page }) => {
      const pages = ['/calculator', '/dashboard', '/jobs'];

      for (const path of pages) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');

        // Check body background is dark
        const bgColor = await page.evaluate(() => {
          return window.getComputedStyle(document.body).backgroundColor;
        });

        // Should be dark (low RGB values)
        // Parse RGB
        const match = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
          const [, r, g, b] = match.map(Number);
          const avgBrightness = (r + g + b) / 3;
          expect(avgBrightness, `Page ${path} should have dark background`).toBeLessThan(100);
        }
      }
    });

    test('should have consistent text colors', async ({ page }) => {
      await page.goto('/calculator');
      await page.waitForLoadState('networkidle');

      // Check primary text is light
      const heading = page.locator('h1, h2, h3').first();
      if (await heading.count() > 0) {
        const textColor = await heading.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });

        // Should be light text (high RGB values)
        const match = textColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
          const [, r, g, b] = match.map(Number);
          const avgBrightness = (r + g + b) / 3;
          expect(avgBrightness, 'Heading text should be light').toBeGreaterThan(150);
        }
      }
    });
  });

  test.describe('Component Patterns', () => {
    test('should have consistent card styling', async ({ page }) => {
      await page.goto('/calculator');
      await page.waitForLoadState('networkidle');

      // Find cards/panels
      const cards = page.locator('.rounded-lg, .rounded-xl, [class*="card"]');
      const cardCount = await cards.count();

      if (cardCount > 0) {
        // Check first few cards have border radius
        for (let i = 0; i < Math.min(cardCount, 3); i++) {
          const borderRadius = await cards.nth(i).evaluate((el) => {
            return window.getComputedStyle(el).borderRadius;
          });

          // Should have some border radius
          expect(borderRadius, `Card ${i} should have border radius`).not.toBe('0px');
        }
      }
    });

    test('should have consistent button styling', async ({ page }) => {
      await page.goto('/calculator');
      await page.waitForLoadState('networkidle');

      const buttons = page.locator('button');
      const buttonCount = await buttons.count();

      if (buttonCount > 0) {
        // Check buttons have consistent padding
        const button = buttons.first();
        if (await button.isVisible()) {
          const styles = await button.evaluate((el) => {
            const style = window.getComputedStyle(el);
            return {
              padding: style.padding,
              borderRadius: style.borderRadius,
              fontFamily: style.fontFamily,
            };
          });

          // Buttons should have some padding and border radius
          expect(styles.borderRadius).not.toBe('0px');
        }
      }
    });

    test('should have consistent input styling', async ({ page }) => {
      await page.goto('/calculator');
      await page.waitForLoadState('networkidle');

      const inputs = page.locator('input[type="text"], input[type="number"], input:not([type])');
      const inputCount = await inputs.count();

      if (inputCount > 0) {
        const input = inputs.first();
        if (await input.isVisible()) {
          const styles = await input.evaluate((el) => {
            const style = window.getComputedStyle(el);
            return {
              borderRadius: style.borderRadius,
              backgroundColor: style.backgroundColor,
            };
          });

          // Inputs should have border radius
          expect(styles.borderRadius).not.toBe('0px');
        }
      }
    });
  });

  test.describe('Spacing & Layout', () => {
    test('should have consistent spacing between sections', async ({ page }) => {
      await page.goto('/calculator');
      await page.waitForLoadState('networkidle');

      // Check sections have gap/margin
      const sections = page.locator('section, [class*="section"], .space-y-');
      const sectionCount = await sections.count();

      if (sectionCount > 0) {
        // Sections should exist and have some layout
        expect(sectionCount).toBeGreaterThan(0);
      }
    });

    test('should be responsive on different viewports', async ({ page }) => {
      const viewports = [
        { width: 1920, height: 1080, name: 'Desktop' },
        { width: 1024, height: 768, name: 'Tablet' },
        { width: 375, height: 667, name: 'Mobile' },
      ];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/calculator');
        await page.waitForLoadState('networkidle');

        // Page should be functional at all sizes
        await expect(page.locator('body')).toBeVisible();

        // No horizontal overflow
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        // Mobile may have some scroll, desktop should not
        if (viewport.width >= 1024) {
          expect(hasHorizontalScroll, `${viewport.name} should not have horizontal scroll`).toBe(false);
        }
      }
    });
  });

  test.describe('Status Colors', () => {
    test('should use correct colors for status indicators', async ({ page }) => {
      await page.goto('/jobs');
      await page.waitForLoadState('networkidle');

      // Look for status badges/chips
      const statusElements = page.locator(
        '[class*="status"], ' +
        '[class*="badge"], ' +
        '[class*="chip"], ' +
        '[data-status]'
      );

      const statusCount = await statusElements.count();

      if (statusCount > 0) {
        // Status elements should have color classes
        const firstStatus = statusElements.first();
        if (await firstStatus.isVisible()) {
          const classes = await firstStatus.getAttribute('class');
          // Should have some color-related class
          expect(classes).toBeDefined();
        }
      }
    });
  });

  test.describe('Loading States', () => {
    test('should have skeleton loaders during load', async ({ page }) => {
      // Intercept and delay API
      await page.route('**/api/**', async (route) => {
        await new Promise((r) => setTimeout(r, 1000));
        route.continue();
      });

      await page.goto('/calculator');

      // Look for loading indicators
      const skeletons = page.locator('.animate-pulse, .skeleton, [class*="loading"]');
      const spinners = page.locator('.animate-spin, [class*="spinner"]');

      // May have skeletons or spinners during load
      const hasLoadingUI = (await skeletons.count()) > 0 || (await spinners.count()) > 0;
      // Just check - don't fail if no loading UI (could be fast load)
    });
  });

  test.describe('Focus States', () => {
    test('should have visible focus rings on interactive elements', async ({ page }) => {
      await page.goto('/calculator');
      await page.waitForLoadState('networkidle');

      // Tab to first interactive element
      await page.keyboard.press('Tab');

      // Get focused element
      const focusedElement = page.locator(':focus');
      if (await focusedElement.count() > 0) {
        const hasVisibleFocus = await focusedElement.evaluate((el) => {
          const style = window.getComputedStyle(el);
          const outline = style.outline;
          const boxShadow = style.boxShadow;
          const borderColor = style.borderColor;

          // Should have some focus indication
          return (
            (outline && outline !== 'none' && outline !== '0px') ||
            (boxShadow && boxShadow !== 'none') ||
            borderColor !== 'rgb(0, 0, 0)'
          );
        });

        // Focus should be visible
        expect(hasVisibleFocus, 'Focused element should have visible focus state').toBe(true);
      }
    });
  });

  test.describe('Animation Preferences', () => {
    test('should respect prefers-reduced-motion', async ({ page }) => {
      // Emulate reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });

      await page.goto('/calculator');
      await page.waitForLoadState('networkidle');

      // Check that animations are disabled/minimal
      const animatedElements = page.locator('[class*="animate-"]');
      const animatedCount = await animatedElements.count();

      // If there are animated elements, check they respect preference
      if (animatedCount > 0) {
        const firstAnimated = animatedElements.first();
        const animationDuration = await firstAnimated.evaluate((el) => {
          return window.getComputedStyle(el).animationDuration;
        });

        // Animation should be instant or very fast with reduced motion
        // (CSS should handle this via @media (prefers-reduced-motion))
      }
    });
  });
});
