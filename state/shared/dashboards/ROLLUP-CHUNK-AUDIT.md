# ROLLUP-CHUNK-AUDIT

> U-F5-ROLLUP-CHUNK-AUDIT (slot:quebec /goal-loop iter3)
> Generated: 2026-05-26T14:56:57.714Z
> Source: web/vite.config.ts manualChunks() + walk of web/src/

Total source files: **539** · total source LOC: **179,563**
Configured chunks (excl. default): **14**
Files routed to a named chunk: **27** · files in default: **512**

## Per-chunk routing (LOC desc)

| Chunk | Files | LOC | Bytes |
|---|---:|---:|---:|
| __default__ | 512 | 169,493 | 7,235,493 |
| learning-core | 15 | 3,729 | 153,907 |
| api-core | 2 | 2,637 | 78,763 |
| viewer-toolbar | 9 | 1,983 | 59,128 |
| academy-data | 1 | 1,721 | 80,745 |
| viewer-drei | 0 | 0 | 0 |
| viewer-fiber | 0 | 0 | 0 |
| viewer-three-extras | 0 | 0 | 0 |
| viewer-three-renderers | 0 | 0 | 0 |
| viewer-three-foundation | 0 | 0 | 0 |
| viewer-three-scene | 0 | 0 | 0 |
| viewer-three-core | 0 | 0 | 0 |
| charts-vendor | 0 | 0 | 0 |
| react-vendor | 0 | 0 | 0 |
| viewer-scene-data | 0 | 0 | 0 |

## Top-5 chunks by source LOC

### `__default__` — 169,493 LOC across 512 files

- web/src/pages/CalculatorPage.tsx (12,856 LOC)
- web/src/api/calculatorData.ts (3,961 LOC)
- web/src/pages/PostProcessorGeneratorPage.tsx (3,387 LOC)
- web/src/data/calculatorWorkspace.ts (3,226 LOC)
- web/src/pages/QuoteBuilderPage.tsx (2,426 LOC)

### `learning-core` — 3,729 LOC across 15 files

- web/src/components/learning/LessonView.tsx (487 LOC)
- web/src/components/learning/CourseCatalog.tsx (457 LOC)
- web/src/components/learning/LessonVisual.tsx (431 LOC)
- web/src/components/learning/CourseDetail.tsx (276 LOC)
- web/src/components/learning/MachineWizard.tsx (268 LOC)

### `api-core` — 2,637 LOC across 2 files

- web/src/api/client.ts (1,460 LOC)
- web/src/api/types.ts (1,177 LOC)

### `viewer-toolbar` — 1,983 LOC across 9 files

- web/src/api/viewer.ts (431 LOC)
- web/src/components/viewer/ViewerToolbar.tsx (337 LOC)
- web/src/components/viewer/ToolpathLayer.tsx (292 LOC)
- web/src/components/viewer/HeatmapOverlay.tsx (243 LOC)
- web/src/components/viewer/Viewer3D.tsx (215 LOC)

### `academy-data` — 1,721 LOC across 1 files

- web/src/data/academy.ts (1,721 LOC)

## Top-10 unbucketed pages (default chunk, by LOC)

Files matching NO `manualChunks()` rule land in per-route default chunks. Large files here are candidates for an explicit chunk rule.

| File | LOC |
|---|---:|
| web/src/pages/CalculatorPage.tsx | 12,856 |
| web/src/api/calculatorData.ts | 3,961 |
| web/src/pages/PostProcessorGeneratorPage.tsx | 3,387 |
| web/src/data/calculatorWorkspace.ts | 3,226 |
| web/src/pages/QuoteBuilderPage.tsx | 2,426 |
| web/src/utils/calculatorI18n.ts | 2,360 |
| web/src/features/operating-system/liveProvider.ts | 2,319 |
| web/src/__tests__/calculatorData.test.ts | 1,990 |
| web/src/utils/calculatorSurfaceFinish.ts | 1,779 |
| web/src/pages/JobsPage.tsx | 1,774 |

## Findings (R12 — fail-loud)

- **WARN** — Chunk `viewer-drei` has ZERO source-file matches. May only catch node_modules (which this audit doesn't walk) OR rule is dead.
- **WARN** — Chunk `viewer-fiber` has ZERO source-file matches. May only catch node_modules (which this audit doesn't walk) OR rule is dead.
- **WARN** — Chunk `viewer-three-extras` has ZERO source-file matches. May only catch node_modules (which this audit doesn't walk) OR rule is dead.
- **WARN** — Chunk `viewer-three-renderers` has ZERO source-file matches. May only catch node_modules (which this audit doesn't walk) OR rule is dead.
- **WARN** — Chunk `viewer-three-foundation` has ZERO source-file matches. May only catch node_modules (which this audit doesn't walk) OR rule is dead.
- **WARN** — Chunk `viewer-three-scene` has ZERO source-file matches. May only catch node_modules (which this audit doesn't walk) OR rule is dead.
- **WARN** — Chunk `viewer-three-core` has ZERO source-file matches. May only catch node_modules (which this audit doesn't walk) OR rule is dead.
- **WARN** — Chunk `charts-vendor` has ZERO source-file matches. May only catch node_modules (which this audit doesn't walk) OR rule is dead.
- **WARN** — Chunk `react-vendor` has ZERO source-file matches. May only catch node_modules (which this audit doesn't walk) OR rule is dead.
- **WARN** — Chunk `viewer-scene-data` has ZERO source-file matches. May only catch node_modules (which this audit doesn't walk) OR rule is dead.
- **INFO** — 23 unbucketed file(s) over 1000 LOC. Top: web/src/pages/CalculatorPage.tsx (12,856), web/src/api/calculatorData.ts (3,961), web/src/pages/PostProcessorGeneratorPage.tsx (3,387). Candidates for an explicit chunk rule.

## Spec link

Unit: U-F5-ROLLUP-CHUNK-AUDIT — `state/shared/specs/FRONTEND-PLAN-EXTENSION-2026-05-25.md` §9.2.