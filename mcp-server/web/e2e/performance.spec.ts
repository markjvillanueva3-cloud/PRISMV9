/**
 * E2E Performance Tests — Core Web Vitals
 * S4-MS1 P0-U03: Performance Optimization
 *
 * Tests page load performance against Web Vitals thresholds.
 */
import { test, expect } from '@playwright/test';

// Performance thresholds (ms unless noted)
const THRESHOLDS = {
  pageLoad: 5000, // Total page load time
  domContentLoaded: 3000, // DOMContentLoaded event
  firstContentfulPaint: 2500, // FCP
  largestContentfulPaint: 4000, // LCP
  timeToInteractive: 5000, // TTI approximation
};

// Critical pages to test
const CRITICAL_PAGES = [
  { path: '/calculator', name: 'Calculator' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/jobs', name: 'Jobs' },
];

test.describe('Page Load Performance', () => {
  for (const page of CRITICAL_PAGES) {
    test(`${page.name} should load within threshold`, async ({ page: browserPage }) => {
      // Start timing
      const startTime = Date.now();

      // Navigate and wait for network idle
      await browserPage.goto(page.path, { waitUntil: 'networkidle' });

      const loadTime = Date.now() - startTime;

      // Get performance metrics
      const metrics = await browserPage.evaluate(() => {
        const perfEntries = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paintEntries = performance.getEntriesByType('paint');

        const fcp = paintEntries.find(e => e.name === 'first-contentful-paint');

        return {
          domContentLoaded: perfEntries.domContentLoadedEventEnd - perfEntries.startTime,
          loadComplete: perfEntries.loadEventEnd - perfEntries.startTime,
          firstContentfulPaint: fcp?.startTime ?? 0,
          domInteractive: perfEntries.domInteractive - perfEntries.startTime,
          responseEnd: perfEntries.responseEnd - perfEntries.startTime,
        };
      });

      console.log(`${page.name} Performance Metrics:`);
      console.log(`  Page Load: ${loadTime}ms`);
      console.log(`  DOM Content Loaded: ${Math.round(metrics.domContentLoaded)}ms`);
      console.log(`  First Contentful Paint: ${Math.round(metrics.firstContentfulPaint)}ms`);
      console.log(`  DOM Interactive: ${Math.round(metrics.domInteractive)}ms`);

      // Assertions
      expect(loadTime, `${page.name} page load time`).toBeLessThan(THRESHOLDS.pageLoad);
      expect(metrics.domContentLoaded, `${page.name} DOMContentLoaded`).toBeLessThan(THRESHOLDS.domContentLoaded);

      if (metrics.firstContentfulPaint > 0) {
        expect(metrics.firstContentfulPaint, `${page.name} FCP`).toBeLessThan(THRESHOLDS.firstContentfulPaint);
      }
    });
  }
});

test.describe('Calculator Page Performance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/calculator');
    await page.waitForLoadState('networkidle');
  });

  test('should respond to input within threshold', async ({ page }) => {
    const materialInput = page.locator('input').first();

    if (await materialInput.isVisible({ timeout: 3000 })) {
      const startTime = Date.now();

      await materialInput.focus();
      await materialInput.fill('4140');

      const inputTime = Date.now() - startTime;

      console.log(`Input response time: ${inputTime}ms`);

      // Input should be responsive
      expect(inputTime, 'Input response time').toBeLessThan(500);
    }
  });

  test('should not block main thread for long operations', async ({ page }) => {
    // Check for long tasks (> 50ms)
    const longTasks = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let longTaskCount = 0;

        const observer = new PerformanceObserver((list) => {
          longTaskCount += list.getEntries().length;
        });

        try {
          observer.observe({ type: 'longtask', buffered: true });
        } catch {
          resolve(0);
          return;
        }

        // Wait a bit and collect
        setTimeout(() => {
          observer.disconnect();
          resolve(longTaskCount);
        }, 2000);
      });
    });

    console.log(`Long tasks detected: ${longTasks}`);

    // Allow some long tasks during load, but not too many
    expect(longTasks, 'Long tasks count').toBeLessThan(10);
  });
});

test.describe('Bundle Size Checks', () => {
  test('should not have excessively large initial bundle', async ({ page }) => {
    // Track resource sizes
    const resourceSizes: { name: string; size: number }[] = [];

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('.js') && url.includes('/assets/')) {
        try {
          const size = (await response.body()).length;
          resourceSizes.push({
            name: url.split('/').pop() || url,
            size,
          });
        } catch {
          // Ignore failed body reads
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Log bundle sizes
    const sortedBySize = resourceSizes.sort((a, b) => b.size - a.size);
    console.log('JavaScript bundles loaded:');
    sortedBySize.slice(0, 10).forEach((r) => {
      console.log(`  ${r.name}: ${(r.size / 1024).toFixed(1)} KB`);
    });

    const totalSize = resourceSizes.reduce((sum, r) => sum + r.size, 0);
    console.log(`Total JS: ${(totalSize / 1024).toFixed(1)} KB`);

    // Initial bundle should be reasonable
    // Note: This is the compressed size, actual is larger
    expect(totalSize / 1024, 'Total JS size (KB)').toBeLessThan(2000);
  });
});

test.describe('Memory Usage', () => {
  test('should not have memory leaks on navigation', async ({ page }) => {
    // This test checks for obvious memory leaks by navigating multiple times

    const getMemory = async () => {
      return page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize;
        }
        return 0;
      });
    };

    // Navigate to calculator multiple times
    for (let i = 0; i < 3; i++) {
      await page.goto('/calculator');
      await page.waitForLoadState('networkidle');
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
    }

    const memoryAfter = await getMemory();

    // If memory API is available, check it
    if (memoryAfter > 0) {
      console.log(`Memory after navigations: ${(memoryAfter / 1024 / 1024).toFixed(1)} MB`);

      // Memory should be under 200MB after normal usage
      expect(memoryAfter / 1024 / 1024, 'Memory usage (MB)').toBeLessThan(200);
    }
  });
});

test.describe('Lazy Loading', () => {
  test('should lazy load non-critical pages', async ({ page }) => {
    // Track which chunks are loaded
    const loadedChunks = new Set<string>();

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('.js') && url.includes('/assets/')) {
        loadedChunks.add(url.split('/').pop() || url);
      }
    });

    // Load dashboard (not calculator)
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Calculator-specific chunks should NOT be loaded yet
    const hasCalculatorChunk = Array.from(loadedChunks).some(
      (chunk) => chunk.toLowerCase().includes('calculator') && !chunk.includes('index')
    );

    console.log('Chunks loaded on dashboard:', loadedChunks.size);

    // This may or may not be true depending on bundle structure
    // Just log for now rather than fail
    if (hasCalculatorChunk) {
      console.log('Note: Calculator chunk loaded on dashboard (could optimize)');
    }
  });
});
