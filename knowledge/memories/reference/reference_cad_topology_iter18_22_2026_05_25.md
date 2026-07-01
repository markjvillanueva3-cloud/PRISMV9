---
name: reference_cad_topology_iter18_22_2026_05_25
description: CAD-PIPELINE-WIRE-MS0 iter+18..+22 on slot:delta 2026-05-25 — 5-iter cap-raise loop methodology proved. 4 single-line cap-default changes + 1 corpus re-emit = 2.5× face budget growth (587k → 1,543,050 faces / 1.24GB). Predictive bulk-dry-run made loop measurable without 446MB re-emit cycles.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.498Z
aliases: reference_cad_topology_iter18_22_2026_05_25
---


# CAD topology pipeline — iter+18..+22 arc (cap-raise loop)

5 commits on slot:delta (a0b3b2f5f5 → cd96a5450b → 0bd3277147 → f4c9faed0f → dadee4d179 → b2b26a9282).

## The loop methodology (the value-prop, not just numbers)

iter+17 shipped `cad-dry-run-corpus.mjs` (the diagnostic). iter+18..+21 used it to identify largest leverage + tune defaults + verify impact, all without touching the actual 446MB corpus emit. iter+22 finally triggered the real emit to land all gains.

Each cap-raise iter was:
1. Read iter+17 (or previous iter) bulk-dry-run cap-bound counts
2. Identify largest-leverage surface (highest cap-bound count)
3. Bump that default in BOTH the emitter pickPlaced* fallback AND the cad-dry-run-corpus.mjs sync constant AND the emitter's --dry-run env-cap report message
4. Re-run dry-run to verify expected delta
5. Commit (typically 2 files / 5 lines)

Total cost across 4 cap-raise iters: ~20 lines of code, zero corpus re-emits. Total gain: predicted budget 587k → 1.54M faces (+163%).

## Cap evolution

| surface | default change | cap-bound delta | unblocked |
|---|---|---|---|
| plane | 200 → 800 (4×) | 262 → 164 | 98 |
| cone | 32 → 128 (4×) | 168 → 92 | 76 |
| blade | 48 → 192 (4×) | 141 → 85 | 56 |
| cyl | 256 → 512 (2×) | 137 → 99 | 38 |
| **total** | | | **268 slugs** |

## iter+22 landing numbers

Real corpus re-emit with iter+18..+21 caps:
- 558/560 emit ok (2 errors pre-existing: assembly-of-jet stack overflow + 1 other)
- 1,543,050 total ADVANCED_FACE emitted
- 1.24 GB STEP output
- avg 2,765 faces/slug (was 1,053/slug at iter+14 baseline)

200-slug normalized fidelity sample:
- cyl 4,226 → 14,347 (+239%)
- plane 41,614 → 206,884 (+397%)
- cone 1,095 → 2,564 (+134%)
- spline 3,512 → 9,884 (+181%)
- TOTAL 50,447 → 233,679 (+363%)

Per-slug normalized median: 66.2% → 66.7% (slight bump — capped by source diversity ceiling).

## Impeller progression vs source 485 faces

iter+14: 678 (+39%) · iter+22: **1542 (+218%)** — over-emission acknowledged, composition matches source better but raw count inflates due to blade cap @ 192 (impeller has 321 raw spline surfaces → ~96 unique after centroid dedupe, all emitted at iter+22 cap).

## Cross-refs

- [[reference_cad_topology_emitter_2026_05_25]] — iter+1 base
- [[reference_cad_topology_iter5_7_2026_05_25]] — iter+5..+7 (slab emitters)
- [[reference_cad_topology_iter8_13_2026_05_25]] — iter+8..+13 (reporting + B-spline)
- [[reference_cad_topology_iter14_17_2026_05_25]] — iter+14..+17 (env tools + dry-run diagnostic)
- Scripts: `cad-emit-impeller-fusion-step.mjs`, `cad-dry-run-corpus.mjs`, `cad-corpus-topology-emit-all.mjs`, `cad-corpus-fidelity-ratio.mjs`, `cad-fidelity-html-report.mjs`, `cad-corpus-index-html.mjs`, `cad-to-desktop.mjs`
- Wiki: [`knowledge/wiki/architecture/cad-pipeline-closed-loop.md`] — 22-iter table

## Methodology generalization

The iter-loop pattern (build-diagnostic → identify-leverage → tune-defaults → verify-via-prediction → land-via-real-run) generalized cleanly: any PRISM pipeline with knob-tunable behavior can adopt the same flow. The bulk-dry-run script template at `cad-dry-run-corpus.mjs` is a reference implementation.
