---
name: reference_cad_topology_iter8_13_2026_05_25
description: CAD-PIPELINE-WIRE-MS0 iter+8..+13 on slot:delta 2026-05-25 — relaxed filters + B-spline emission + reporting layer + calibration. Topology fidelity: 65.2% normalized median (slab-inflation corrected), 558-part HTML dashboards shipped, per-surface-type coverage cyl 42% / plane 15% / cone 27% / spline 17%.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.499Z
aliases: reference_cad_topology_iter8_13_2026_05_25
---


# CAD topology pipeline — iter+8..+13 arc (slot:delta 2026-05-25)

6 commits on slot:delta (b9af8eaebc → afbc5813d2) building on the iter+5..+7 arc.

## Iter-by-iter summary

| iter | commit | headline |
|---|---|---|
| iter+8 | b9af8eaebc | MIN_RADIUS 1→0.1mm + plane zAxis fallback → single-hub fallback 170→27 |
| iter+9 | b3913565d8 | HTML compare page + corpus fidelity-ratio script + /cad-fusion-verify skill |
| iter+10 | 41725f9032 | per-surface-type counts + slab-normalized fidelity (truth-revealing: raw 306% → norm 82.1%) |
| iter+11 | 26c35400f8 | blade top/bot on B_SPLINE_SURFACE_WITH_KNOTS + cyl-no-placement fallback → spline 0%→29.6%, cyl 18.9%→42.4% |
| iter+12 | 9c0dd8fbb2 | calibration: blade cap 96→48 (over-emission cut), plane dedupe 0.1mm→5mm, cone 16→32 → honest median 81.3%→65.2% |
| iter+13 | afbc5813d2 | HTML fidelity dashboard + corpus index v2 + --open browser flag (558-part report) |

## Per-surface-type coverage (200-slug, iter+12 normalized)

- CYLINDRICAL_SURFACE: 42.4% (was 18.9% before fallback placement)
- PLANE unique: 15.0% (raw 6:1 slab inflation; dedupe ~50/part)
- CONICAL_SURFACE: 26.6%
- B_SPLINE_SURFACE: 17.4% (was 0% before iter+11)
- per-slug normalized median: 65.2%

## Why the metric dropped iter+11 → iter+12

Iter+11 over-emitted blades (96 cap × 2 spline faces = 192/part vs source ~96). Iter+12 tightened to 48 blades = 96 splines, matching source count. Normalized median dropped 81.3% → 65.2% — NOT because we got worse, but because raw counts were misleading.

The HONEST metric is per-surface-type coverage. Raw face count over-counts due to:
- Plane slabs: 6 PLANE entities per slab vs source 1 per flat face
- Blade slabs: 4 PLANE side faces + 2 B-spline top/bot vs source 1-3 B_SPLINE per blade

## Operator dashboards shipped (iter+13)

Two HTML pages drop into `state/shared/cad-regen-output/`:
- `index.html` (277.9 KB) — sortable corpus table, sorted by fidelity ratio, with `topo.step` per-row open link
- `fidelity-report.html` (114.5 KB) — headline cards + per-surface-type stacked bars + sortable top-200 detail

Both auto-open via `--open` flag (Windows `start` command, detached).

## Cross-refs

- [[reference_cad_topology_emitter_2026_05_25]] — iter+1 base topology emitter
- [[reference_cad_topology_iter5_7_2026_05_25]] — iter+5..+7 (plane slabs + cone frustums + blade slabs)
- [[cad-pipeline-closed-loop]] — wiki with full 13-iter table
- Scripts: `cad-emit-impeller-fusion-step.mjs` (placement + slab emitters), `cad-corpus-fidelity-ratio.mjs` (per-type coverage), `cad-fidelity-html-report.mjs` (dashboard)

## Next-phase targets (post iter+13)

- Improve plane unique-coverage past 15% (consider extracting source EDGE_LOOPs to bound each plane at true extent, eliminating slab dedupe collisions)
- Push spline coverage past 17% (real B_SPLINE_SURFACE_WITH_KNOTS emission with full control net + computed knot vectors — would also give curved blades in Fusion)
- Reduce plane slab face-count inflation (alternative emit modes: SHELL_BASED_SURFACE_MODEL with OPEN_SHELL single face vs current 6-face closed slab)
