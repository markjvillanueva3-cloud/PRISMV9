// U-F6-LIGHTHOUSE-CI-GATE (slot:quebec /goal-loop iter5-extended)
// Spec: state/shared/specs/FRONTEND-PLAN-EXTENSION-2026-05-25.md §9.3 +
// table line 432: "HIGHEST single ROI in the entire spec".
//
// Run locally: npm run lhci
// Run in CI: see .github/workflows/lhci.yml (companion to this file).
// Install: npm install --save-dev @lhci/cli  (already in package.json devDeps)
//
// Budgets are the Core Web Vitals "good" thresholds (Google 2026 guidance):
//   LCP <= 2500ms (Largest Contentful Paint)
//   INP <= 200ms  (Interaction to Next Paint, replaces FID in 2024)
//   CLS <= 0.1    (Cumulative Layout Shift)
//   TBT <= 200ms  (Total Blocking Time)
// Plus per-resource size budgets sized to the existing 9 mega-page reality:
// CalculatorPage at 12,856 LOC and 660KB on-disk will need the SCRIPT
// budget set above its baseline (700KB) to land green initially; tighten
// once U-F3-TAB-LEVEL-DYNAMIC-IMPORTS ships per-page splits.

module.exports = {
  ci: {
    collect: {
      url: [
        "http://localhost:3100/",
        "http://localhost:3100/calculator",
        "http://localhost:3100/quote",
        "http://localhost:3100/jobs",
        "http://localhost:3100/dashboard",
      ],
      numberOfRuns: 3,
      settings: {
        // Mobile-emulation is the default Lighthouse profile and the right
        // target for the shop-floor tablet usage (per web/DESIGN.md).
        preset: "desktop",
        // Skip throttling for now; the audit's job at first is to MEASURE,
        // not to gate on artificial slowdown. Re-enable in a later milestone.
        throttlingMethod: "provided",
      },
    },
    assert: {
      // ASSERTIONS — fail PR if any of these regress.
      // Threshold rationale: Core Web Vitals "good" thresholds per
      // https://web.dev/articles/vitals (2024 revision: INP replaced FID).
      assertions: {
        "categories:performance": ["warn", { minScore: 0.7 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["warn", { minScore: 0.85 }],
        "categories:seo": ["warn", { minScore: 0.85 }],
        // Core Web Vitals — explicit thresholds (ms / unitless).
        "largest-contentful-paint": ["warn", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["warn", { maxNumericValue: 200 }],
        "interactive": ["warn", { maxNumericValue: 3800 }],
        // Resource budgets — wide initially per U-F5 findings, tighten after
        // U-F3 ships intra-page splits.
        "resource-summary:script:size": ["warn", { maxNumericValue: 700_000 }],
        "resource-summary:stylesheet:size": ["warn", { maxNumericValue: 200_000 }],
        "resource-summary:image:size": ["warn", { maxNumericValue: 500_000 }],
        "resource-summary:total:size": ["warn", { maxNumericValue: 1_500_000 }],
      },
    },
    upload: {
      // Use the public LHCI server for build-to-build comparison. Operator
      // may swap for a private LHCI instance later.
      target: "temporary-public-storage",
    },
    server: {
      // Inert — only used when running `lhci server` for a persistent UI.
    },
  },
};
