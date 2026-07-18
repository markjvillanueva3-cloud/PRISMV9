# INTRA-PAGE-SEAM-AUDIT

> U-F3-SEAM-AUDIT (slot:quebec /goal-loop yolo iter5)
> Generated: 2026-06-25T20:27:10.542Z
> Source: the 9 intra-page split candidates from U-B1.

Pages scanned: **9**
Total seam candidates: **14**
Pages with ZERO detected seams: **8**

## Per-page seam map

### web/src/pages/CalculatorPage.tsx — 12,818 LOC · 14 seam(s)

Seam kinds: switch-case=12, function-panel=2

| Line | Kind | Identifier |
|---:|---|---|
| 563 | function-panel | `guideFocusSelectorForPanel` |
| 1980 | switch-case | `mill` |
| 1992 | switch-case | `lathe` |
| 2005 | switch-case | `edm` |
| 2017 | switch-case | `wire_edm` |
| 2029 | switch-case | `laser` |
| 2041 | switch-case | `waterjet` |
| 2085 | switch-case | `mill` |
| 2101 | switch-case | `lathe` |
| 2118 | switch-case | `edm` |
| 2132 | switch-case | `wire_edm` |
| 2144 | switch-case | `laser` |
| … | (2 more) | … |

### web/src/pages/PostProcessorGeneratorPage.tsx — 3,387 LOC · 0 seam(s)

_No tab / section / wizard / panel / switch-case seams detected. This page is a single-flow surface — intra-page React.lazy is NOT the right tool here; consider extracting heavy sub-components into separate files instead._

### web/src/pages/QuoteBuilderPage.tsx — 2,426 LOC · 0 seam(s)

_No tab / section / wizard / panel / switch-case seams detected. This page is a single-flow surface — intra-page React.lazy is NOT the right tool here; consider extracting heavy sub-components into separate files instead._

### web/src/pages/JobsPage.tsx — 1,774 LOC · 0 seam(s)

_No tab / section / wizard / panel / switch-case seams detected. This page is a single-flow surface — intra-page React.lazy is NOT the right tool here; consider extracting heavy sub-components into separate files instead._

### web/src/pages/ShopFloorClockPage.tsx — 1,723 LOC · 0 seam(s)

_No tab / section / wizard / panel / switch-case seams detected. This page is a single-flow surface — intra-page React.lazy is NOT the right tool here; consider extracting heavy sub-components into separate files instead._

### web/src/pages/ProgramReleasePage.tsx — 1,425 LOC · 0 seam(s)

_No tab / section / wizard / panel / switch-case seams detected. This page is a single-flow surface — intra-page React.lazy is NOT the right tool here; consider extracting heavy sub-components into separate files instead._

### web/src/pages/TravelerPage.tsx — 1,180 LOC · 0 seam(s)

_No tab / section / wizard / panel / switch-case seams detected. This page is a single-flow surface — intra-page React.lazy is NOT the right tool here; consider extracting heavy sub-components into separate files instead._

### web/src/pages/PostProcessorPage.tsx — 1,172 LOC · 0 seam(s)

_No tab / section / wizard / panel / switch-case seams detected. This page is a single-flow surface — intra-page React.lazy is NOT the right tool here; consider extracting heavy sub-components into separate files instead._

### web/src/pages/CustomerPortalPage.tsx — 1,117 LOC · 0 seam(s)

_No tab / section / wizard / panel / switch-case seams detected. This page is a single-flow surface — intra-page React.lazy is NOT the right tool here; consider extracting heavy sub-components into separate files instead._

## Recommendations

For each page with **>=3 seam candidates of the same kind**, the operator-gated unit U-F3-TAB-LEVEL-DYNAMIC-IMPORTS (P1, 4-8h per page) is the right next step:

1. Extract each named tab / section / wizard into its own file under `web/src/pages/<PageName>/<TabName>.tsx`.
2. Replace the inline render with `React.lazy(() => import("./<TabName>"))` + a `<Suspense>` boundary.
3. Wire into `vite.config.ts manualChunks()` so the per-tab chunk is named (parallel to the existing `viewer-toolbar` / `learning-core` / `academy-data` entries).
4. Re-run U-F5-ROLLUP-CHUNK-AUDIT after the split — the unbucketed LOC for that page should drop into the new chunks.

## Findings (R12 — fail-loud, surface-only)

- **INFO** — 8 candidate page(s) have ZERO tab/section/wizard seams. These are single-flow surfaces — extract heavy sub-components into separate files instead of intra-page lazy. Pages: PostProcessorGeneratorPage.tsx, QuoteBuilderPage.tsx, JobsPage.tsx, ShopFloorClockPage.tsx, ProgramReleasePage.tsx, TravelerPage.tsx, PostProcessorPage.tsx, CustomerPortalPage.tsx.
- **INFO** — 1 page(s) have >=3 seam candidates and are ready for U-F3-TAB-LEVEL-DYNAMIC-IMPORTS (operator-gated, 4-8h per page). Top: CalculatorPage.tsx (14 seams).

## Spec link

Unit: U-F3-SEAM-AUDIT — `state/shared/specs/FRONTEND-PLAN-EXTENSION-2026-05-25.md` §9.2 + line 224. Bridges U-B1 (which pages) to operator-gated U-F3 (where to cut).