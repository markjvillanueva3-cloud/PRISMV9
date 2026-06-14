---
name: reference-insert-edge-rotation-strategy-2026-05-27
description: Insert edge-rotation + multi-edge utilization strategy. Closes the 0% insert-coverage gap surfaced by ALCOA baseline (iter7). Each ANSI insert geometry has a different edge count + rotation discipline; the lathe wizard must encode this.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-09T14:54:09.162Z
aliases: reference_insert_edge_rotation_strategy_2026_05_27
---


# Insert edge-rotation strategy (ANSI lathe inserts)

## Edge count by geometry

| ANSI | Shape           | Edges | Notes |
|------|-----------------|-------|-------|
| **R** | Round           | 4-8   | Continuous edge — index in 45° increments; effective edges depend on DOC. |
| **W** | Trigon (80°)    | 6     | Single-sided; 3 edges per side × 2 sides = 6 (negative). |
| **C** | Rhombic (80°)   | 4     | Single-sided (negative CNMG/CNMG-NF) = 4; double-sided (positive CCMT/CCGT) = 2 (one nose per side). |
| **D** | Diamond (55°)   | 4     | Acute single-sided = 2 functional nose-edges per face × 2 = 4 (negative DNMG). |
| **T** | Triangle (60°)  | 6     | Single-sided negative TNMG = 3 edges × 2 sides = 6; positive TCMT = 3 (top only). |
| **S** | Square (90°)    | 4     | SNMG/SCMT — 4 edges × 1 face if single-sided (negative). |
| **V** | Diamond (35°)   | 4     | Sharp-acute profiling = 2 functional × 2 faces = 4 (negative VNMG). |
| **K** | Parallelogram (55°) | 4 | KNUX (positive) ramping inserts; 4 edges total. |

## Rotation discipline

1. **Track edge-life by part-count** — not by "looks worn"; modern coatings fail catastrophically not gradually.
2. **Index at suggested tool-life threshold** — typically expressed as VB-max (flank wear) of 0.3 mm or per-edge minutes (manufacturer spec).
3. **Maintain insert-tracking sheet** at the machine — paper-card or HMI-side log keyed to T-number.
4. **Always index BEFORE the finish pass on a new part** — never enter a finish op with an edge near retirement.

## Why 0% insert-coverage on ALCOA programs is a P0 wizard gap

The ALCOA baseline (iter7) showed 0/11 programs with ANSI insert codes in the program preamble — they reference shop T-numbers only (`T0101`, `T0202`). The wizard:
1. Can't validate insert-grade fit to material without the ANSI geometry.
2. Can't suggest edge-rotation cadence (because it doesn't know the insert).
3. Can't propose insert-substitution when a current insert grade is wrong for the material.

## Wizard remediation pipeline

```
Shop-Tool-Library Bridge → Insert Edge-Life Tracker → Edge-Rotation Advisor
       (T-num → ANSI)        (count parts/edge)      (suggest "rotate now")
                                                   → Insert Substitution Advisor
                                                     (suggest grade change)
```

Concrete next-iter unit: **U-LATHE-SHOP-TOOL-LIBRARY-BRIDGE** — map (customer T-number, controller T-line context) → (ANSI insert code, vendor grade, edge count) using a per-customer reference table seeded from the AB-version "upgraded" programs (U-LATHE-AB-VERSION-LOCATOR).

## Common amateur anti-patterns

- ❌ Treating CNMG, WNMG, DNMG, TNMG as "the same" → wildly different geometries (80° rhombic vs 80° trigon vs 55° diamond vs 60° triangle)
- ❌ Running rougher on profiling-grade or vice-versa → 5× tool-life loss
- ❌ Single-tip cycling — using only "the tip nearest the toolholder" repeatedly without rotation
- ❌ Not tracking which side of a double-sided negative was used last

## Related

- [[lathe-baseline-ALCOA-2026-05-26]] — surfaced this gap as P0
- [[reference_lathe_cycle_time_levers_2026_05_27]] — Tier-1 lever-3 is multi-edge utilization
- [[reference_whiskey_lathe_corpus_state_2026_05_27_iter101]] — corpus including iter84 carbide-tooling deep-dive
- LatheCAMIntelligenceEngine.selectInsert needs this geometry table as a foundation
