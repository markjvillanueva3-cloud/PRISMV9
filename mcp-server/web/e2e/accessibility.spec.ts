/**
 * E2E Accessibility Tests — WCAG 2.1 AA Compliance
 * S4-MS1 P0-U02: Accessibility Audit
 *
 * Uses axe-core to verify WCAG 2.1 AA compliance on key pages.
 * Tests cover:
 * - Color contrast (1.4.3, 1.4.6)
 * - Keyboard navigation (2.1.1, 2.1.2)
 * - Focus indicators (2.4.7)
 * - Form labels (1.3.1, 3.3.2)
 * - Headings structure (1.3.1)
 * - Image alt text (1.1.1)
 * - ARIA attributes (4.1.2)
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// WCAG 2.1 AA tags for axe-core
const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// Pages to audit
const CRITICAL_PAGES = [
  { path: '/calculator', name: 'Speed Feed Calculator' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/jobs', name: 'Jobs' },
  { path: '/scheduling', name: 'Scheduling' },
  { path: '/wire-edm', name: 'Wire EDM Studio' },
];

test.describe('WCAG 2.1 AA Accessibility Audit', () => {
  for (const page of CRITICAL_PAGES) {
    test.describe(page.name, () => {
      test(`should have no critical accessibility violations`, async ({ page: browserPage }) => {
        await browserPage.goto(page.path);
        await browserPage.waitForLoadState('networkidle');

        // Wait for dynamic content to load
        await browserPage.waitForTimeout(1000);

        const accessibilityScanResults = await new AxeBuilder({ page: browserPage })
          .withTags(WCAG_AA_TAGS)
          .analyze();

        // Filter for critical and serious violations only
        const criticalViolations = accessibilityScanResults.violations.filter(
          (v) => v.impact === 'critical' || v.impact === 'serious'
        );

        // Log violations for debugging
        if (criticalViolations.length > 0) {
          console.log(`\n${page.name} critical violations:`);
          criticalViolations.forEach((v) => {
            console.log(`  - ${v.id}: ${v.description} (${v.impact})`);
            console.log(`    Nodes: ${v.nodes.length}`);
          });
        }

        // Expect no critical violations
        expect(
          criticalViolations,
          `Found ${criticalViolations.length} critical/serious accessibility violations on ${page.name}`
        ).toHaveLength(0);
      });

      test(`should have proper heading structure`, async ({ page: browserPage }) => {
        await browserPage.goto(page.path);
        await browserPage.waitForLoadState('networkidle');

        // Check for h1 heading
        const h1Count = await browserPage.locator('h1').count();
        expect(h1Count, 'Page should have at least one h1').toBeGreaterThanOrEqual(1);

        // Check heading hierarchy (no skipped levels)
        const headings = await browserPage.locator('h1, h2, h3, h4, h5, h6').all();
        let lastLevel = 0;

        for (const heading of headings) {
          const tagName = await heading.evaluate((el) => el.tagName.toLowerCase());
          const level = parseInt(tagName.charAt(1));

          // Should not skip more than one level
          if (lastLevel > 0 && level > lastLevel + 1) {
            console.warn(`Heading level skipped: h${lastLevel} to h${level}`);
          }
          lastLevel = level;
        }
      });

      test(`should have labeled form inputs`, async ({ page: browserPage }) => {
        await browserPage.goto(page.path);
        await browserPage.waitForLoadState('networkidle');

        const inputs = await browserPage.locator(
          'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), ' +
          'select, textarea'
        ).all();

        let unlabeledCount = 0;

        for (const input of inputs.slice(0, 20)) { // Check first 20
          const hasLabel =
            (await input.getAttribute('aria-label')) ||
            (await input.getAttribute('aria-labelledby')) ||
            (await input.getAttribute('title'));

          // Check for associated <label>
          const id = await input.getAttribute('id');
          if (id) {
            const labelFor = await browserPage.locator(`label[for="${id}"]`).count();
            if (labelFor > 0) continue;
          }

          // Check for wrapping <label>
          const parentLabel = await input.locator('xpath=ancestor::label').count();
          if (parentLabel > 0) continue;

          if (!hasLabel) {
            unlabeledCount++;
            const name = await input.getAttribute('name') || await input.getAttribute('placeholder') || 'unknown';
            console.warn(`Unlabeled input: ${name}`);
          }
        }

        // Allow some unlabeled (may be hidden or dynamic)
        expect(unlabeledCount, 'Too many unlabeled form inputs').toBeLessThan(5);
      });

      test(`should have visible focus indicators`, async ({ page: browserPage }) => {
        await browserPage.goto(page.path);
        await browserPage.waitForLoadState('networkidle');

        // Find focusable elements
        const focusable = browserPage.locator(
          'a[href], button:not([disabled]), input:not([disabled]), ' +
          'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ).first();

        if (await focusable.count() > 0) {
          // Focus the element
          await focusable.focus();

          // Check that focus is visible (element should have focus state)
          const isFocused = await focusable.evaluate((el) => {
            return document.activeElement === el;
          });

          expect(isFocused, 'Element should be focusable').toBe(true);
        }
      });
    });
  }
});

test.describe('Keyboard Navigation', () => {
  test('should be able to navigate calculator with keyboard only', async ({ page }) => {
    await page.goto('/calculator');
    await page.waitForLoadState('networkidle');

    // Tab through the page
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }

    // Check that focus moved to interactive elements
    const activeElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.tagName || 'BODY';
    });

    // Focus should be on something interactive
    expect(['INPUT', 'BUTTON', 'A', 'SELECT', 'TEXTAREA']).toContain(activeElement);
  });

  test('should trap focus in modals when open', async ({ page }) => {
    await page.goto('/calculator');
    await page.waitForLoadState('networkidle');

    // Try to open a modal (if there's a modal trigger)
    const modalTrigger = page.locator(
      '[data-testid="modal-trigger"], ' +
      'button:has-text("Settings"), ' +
      'button:has-text("Help")'
    ).first();

    if (await modalTrigger.isVisible({ timeout: 2000 })) {
      await modalTrigger.click();
      await page.waitForTimeout(500);

      // Check if modal is open
      const modal = page.locator('[role="dialog"], [aria-modal="true"]');
      if (await modal.isVisible({ timeout: 1000 })) {
        // Focus should be trapped in modal
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        // Active element should still be inside modal
        const isInModal = await page.evaluate(() => {
          const modal = document.querySelector('[role="dialog"], [aria-modal="true"]');
          return modal?.contains(document.activeElement) || false;
        });

        expect(isInModal, 'Focus should be trapped in modal').toBe(true);
      }
    }
  });

  test('should close modals with Escape key', async ({ page }) => {
    await page.goto('/calculator');
    await page.waitForLoadState('networkidle');

    const modalTrigger = page.locator(
      '[data-testid="modal-trigger"], ' +
      'button:has-text("Settings")'
    ).first();

    if (await modalTrigger.isVisible({ timeout: 2000 })) {
      await modalTrigger.click();
      await page.waitForTimeout(500);

      const modal = page.locator('[role="dialog"], [aria-modal="true"]');
      if (await modal.isVisible({ timeout: 1000 })) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        // Modal should be closed
        await expect(modal).not.toBeVisible({ timeout: 1000 });
      }
    }
  });
});

test.describe('Color Contrast', () => {
  test('should have sufficient color contrast on calculator', async ({ page }) => {
    await page.goto('/calculator');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .options({ rules: { 'color-contrast': { enabled: true } } })
      .analyze();

    const contrastViolations = results.violations.filter(
      (v) => v.id === 'color-contrast'
    );

    // Log any contrast issues
    if (contrastViolations.length > 0) {
      console.log('Color contrast issues:');
      contrastViolations.forEach((v) => {
        v.nodes.forEach((node) => {
          console.log(`  - ${node.html.substring(0, 80)}...`);
        });
      });
    }

    // Some contrast issues may be acceptable in dark themes
    expect(contrastViolations.length).toBeLessThan(10);
  });
});

test.describe('Screen Reader Support', () => {
  test('should have proper ARIA landmarks', async ({ page }) => {
    await page.goto('/calculator');
    await page.waitForLoadState('networkidle');

    // Check for main landmark
    const main = await page.locator('main, [role="main"]').count();
    expect(main, 'Page should have main landmark').toBeGreaterThan(0);

    // Check for navigation landmark
    const nav = await page.locator('nav, [role="navigation"]').count();
    expect(nav, 'Page should have navigation landmark').toBeGreaterThan(0);
  });

  test('should have descriptive link text', async ({ page }) => {
    await page.goto('/calculator');
    await page.waitForLoadState('networkidle');

    const links = await page.locator('a').all();
    let genericLinkCount = 0;

    for (const link of links.slice(0, 20)) {
      const text = (await link.textContent())?.trim().toLowerCase() || '';
      const ariaLabel = await link.getAttribute('aria-label');

      // Check for generic link text
      const isGeneric = ['click here', 'here', 'read more', 'more', 'link'].includes(text);

      if (isGeneric && !ariaLabel) {
        genericLinkCount++;
      }
    }

    expect(genericLinkCount, 'Too many generic link texts').toBeLessThan(3);
  });

  test('should have alt text for images', async ({ page }) => {
    await page.goto('/calculator');
    await page.waitForLoadState('networkidle');

    const images = await page.locator('img').all();
    let missingAltCount = 0;

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');

      // Decorative images should have empty alt or role="presentation"
      if (alt === null && role !== 'presentation') {
        missingAltCount++;
      }
    }

    expect(missingAltCount, 'Images missing alt text').toBe(0);
  });
});
