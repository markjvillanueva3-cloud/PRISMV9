/**
 * Performance Utilities — PRISM Web
 * S4-MS1 P0-U03: Performance Optimization
 *
 * Web Vitals monitoring, performance marks, and optimization helpers.
 */

/**
 * Core Web Vitals thresholds (based on Google recommendations)
 */
export const WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint (ms)
  FID: { good: 100, poor: 300 }, // First Input Delay (ms)
  CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint (ms)
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte (ms)
  INP: { good: 200, poor: 500 }, // Interaction to Next Paint (ms)
} as const;

export type WebVitalMetric = keyof typeof WEB_VITALS_THRESHOLDS;

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

/**
 * Rate a metric value based on thresholds
 */
export function rateMetric(
  name: WebVitalMetric,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const threshold = WEB_VITALS_THRESHOLDS[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Collect and report Web Vitals
 */
export function reportWebVitals(
  onReport: (metric: PerformanceMetric) => void
): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  // Largest Contentful Paint
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        onReport({
          name: 'LCP',
          value: lastEntry.startTime,
          rating: rateMetric('LCP', lastEntry.startTime),
          timestamp: Date.now(),
        });
      }
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    // LCP not supported
  }

  // First Input Delay
  try {
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        const fidEntry = entry as PerformanceEventTiming;
        const fid = fidEntry.processingStart - fidEntry.startTime;
        onReport({
          name: 'FID',
          value: fid,
          rating: rateMetric('FID', fid),
          timestamp: Date.now(),
        });
      });
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
  } catch {
    // FID not supported
  }

  // Cumulative Layout Shift
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as PerformanceEntry & {
          hadRecentInput: boolean;
          value: number;
        };
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value;
        }
      }
      onReport({
        name: 'CLS',
        value: clsValue,
        rating: rateMetric('CLS', clsValue),
        timestamp: Date.now(),
      });
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // CLS not supported
  }

  // First Contentful Paint
  try {
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find((e) => e.name === 'first-contentful-paint');
      if (fcpEntry) {
        onReport({
          name: 'FCP',
          value: fcpEntry.startTime,
          rating: rateMetric('FCP', fcpEntry.startTime),
          timestamp: Date.now(),
        });
      }
    });
    fcpObserver.observe({ type: 'paint', buffered: true });
  } catch {
    // FCP not supported
  }
}

/**
 * Mark a performance event for later measurement
 */
export function markPerformance(name: string): void {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(name);
  }
}

/**
 * Measure duration between two marks
 */
export function measurePerformance(
  name: string,
  startMark: string,
  endMark?: string
): number | null {
  if (typeof performance === 'undefined' || !performance.measure) {
    return null;
  }

  try {
    if (endMark) {
      performance.measure(name, startMark, endMark);
    } else {
      performance.measure(name, startMark);
    }
    const entries = performance.getEntriesByName(name, 'measure');
    return entries[entries.length - 1]?.duration ?? null;
  } catch {
    return null;
  }
}

/**
 * Debounce function for performance-sensitive operations
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Throttle function for rate-limiting operations
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Request idle callback polyfill
 */
export function requestIdleCallback(
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
): number {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  }

  // Fallback using setTimeout
  const start = Date.now();
  return window.setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
    });
  }, 1) as unknown as number;
}

/**
 * Cancel idle callback
 */
export function cancelIdleCallback(handle: number): void {
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(handle);
  } else {
    clearTimeout(handle);
  }
}

/**
 * Preload a component/module during idle time
 */
export function preloadDuringIdle<T>(
  loader: () => Promise<T>,
  options?: IdleRequestOptions
): Promise<T> {
  return new Promise((resolve, reject) => {
    requestIdleCallback(
      async () => {
        try {
          const result = await loader();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      },
      options
    );
  });
}

/**
 * Check if the page is hidden (for pausing expensive operations)
 */
export function isPageHidden(): boolean {
  return typeof document !== 'undefined' && document.hidden;
}

/**
 * Listen for visibility changes
 */
export function onVisibilityChange(
  callback: (hidden: boolean) => void
): () => void {
  const handler = () => callback(document.hidden);
  document.addEventListener('visibilitychange', handler);
  return () => document.removeEventListener('visibilitychange', handler);
}

/**
 * Estimate connection speed for adaptive loading
 */
export function getConnectionSpeed(): 'slow' | 'medium' | 'fast' | 'unknown' {
  if (typeof navigator === 'undefined') return 'unknown';

  const connection =
    (navigator as Navigator & { connection?: { effectiveType?: string } })
      .connection;

  if (!connection?.effectiveType) return 'unknown';

  switch (connection.effectiveType) {
    case 'slow-2g':
    case '2g':
      return 'slow';
    case '3g':
      return 'medium';
    case '4g':
      return 'fast';
    default:
      return 'unknown';
  }
}

/**
 * Check if user prefers reduced data
 */
export function prefersReducedData(): boolean {
  if (typeof navigator === 'undefined') return false;

  const connection =
    (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;

  return connection?.saveData ?? false;
}

/**
 * Memory usage monitoring (Chrome only)
 */
export function getMemoryUsage(): {
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
} | null {
  if (
    typeof performance !== 'undefined' &&
    'memory' in performance
  ) {
    const memory = (performance as Performance & {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    }).memory;

    if (memory) {
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }
  }
  return null;
}
