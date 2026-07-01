# ROUTE-LAZY-AUDIT

> U-B1-LAZY-SPLIT-AUDIT (slot:quebec /goal-loop iter5)
> Generated: 2026-05-26T15:22:43.687Z
> Source: web/src/App.tsx + walk of web/src/pages/

Routes scanned: **121** · lazy-wrapped: **119** · eager: **2**
lazyNamed() declarations: **93**
Pages walked: **111** · pages >=1000 LOC and lazy-routed: **9**

## Eager routes (NOT using lazyElement)

| Route | Element |
|---|---|
| `*` | `<div />` |
| `(unknown)` | `<Layout />` |

## Intra-page split candidates (>=1000 LOC AND lazy-routed)

These pages get their own chunk via route-level lazy, but their internal tabs/sections would benefit from a SECOND tier of `React.lazy()` inside the page (spec §9.2). Per-page work is **operator-gated** per spec line 224.

| Page | LOC | Spec-named |
|---|---:|:-:|
| web/src/pages/CalculatorPage.tsx | 12,856 | **yes** |
| web/src/pages/PostProcessorGeneratorPage.tsx | 3,387 | **yes** |
| web/src/pages/QuoteBuilderPage.tsx | 2,426 | **yes** |
| web/src/pages/JobsPage.tsx | 1,774 | — |
| web/src/pages/ShopFloorClockPage.tsx | 1,723 | — |
| web/src/pages/ProgramReleasePage.tsx | 1,425 | — |
| web/src/pages/TravelerPage.tsx | 1,180 | — |
| web/src/pages/PostProcessorPage.tsx | 1,172 | — |
| web/src/pages/CustomerPortalPage.tsx | 1,117 | — |

## Imported-but-unrouted lazyNamed declarations (dead imports)

_(none — every lazyNamed() declaration is referenced by at least one route element.)_

## Findings (R12 — fail-loud, surface-only)

- **WARN** — 2 route(s) NOT using lazyElement — each one is in the eager initial bundle.
- **INFO** — 9 lazy-routed page(s) >=1000 LOC are intra-page split candidates. Top: CalculatorPage (12,856 LOC), PostProcessorGeneratorPage (3,387 LOC), QuoteBuilderPage (2,426 LOC).

## Spec link

Unit: U-B1-LAZY-SPLIT-AUDIT — `state/shared/specs/FRONTEND-PLAN-EXTENSION-2026-05-25.md` §6 (reframed at line 368) + §9.2.