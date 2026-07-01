import "@testing-library/jest-dom/vitest";

// jsdom does not implement ResizeObserver, which Recharts' ResponsiveContainer
// (used by the quote analytics workspace, ERP dashboards, and other chart
// surfaces) references at mount. Without this polyfill those pages throw
// "ReferenceError: ResizeObserver is not defined" in tests -- a harness gap, not
// a real defect. Minimal no-op stub: the observer callback simply never fires,
// which is correct for render/assertion tests (charts mount, report no resize).
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
