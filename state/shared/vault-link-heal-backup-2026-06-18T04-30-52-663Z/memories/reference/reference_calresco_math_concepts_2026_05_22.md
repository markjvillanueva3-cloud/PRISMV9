---
name: reference-calresco-math-concepts-2026-05-22
description: "calresco.org math-techniques cut — 15-item catalogue, 4 concrete buildable items for PRISM manufacturing engines"
aliases: reference_calresco_math_concepts_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-18T04:19:52.565Z
---


# CALResCo math-techniques catalogue → PRISM engines (2026-05-22, slot november)

**Trigger:** operator re-ask — "calresco.org — see if we can use any of the math and concepts."
Third cut of the calresco research: the first was CAS-meta (fleet/GNN/Omega, F1-F12), the second
was topology; this one extracts the **formal math** for PRISM's **manufacturing** engines.

**15-item catalogue (C1-C15).** Most (C1-C3, C6, C11-C15: bifurcation, Takens embedding, attractor
classification, Pareto, Ashby variety, Boolean/NK nets, GA schema theorem, SOC power-laws,
hysteresis) are already captured by the F-series or topology T-series — cross-referenced, not
re-recommended.

**4 genuinely-new concrete buildable items:**
- **C4 — fractal dimension for surface metrology** (HIGH): box-counting D of a machined surface —
  a descriptor Ra/Rz miss; correlates with tool wear. No `fractal_dimension` action exists. Clean,
  numerically-stable math. Highest-confidence build.
- **C5 — NK landscape-ruggedness characterizer** (MED-HIGH): estimate epistasis K → auto-select
  among PRISM's 6 optimizers (ga/de/pso/sa/aco/bayesian) instead of ad hoc.
- **C7 — cellular-automata grain-growth** (MED): CA microstructure/solidification model feeding
  am_* + heat_treat_* + microstructure_analyze.
- **C8 — L-systems / IFS generative AM geometry** (MED): grammar-generated lattices / branching
  supports for additive_*; IFS fractal compression for toolpaths.

**Deliverable:** `state/shared/specs/CALRESCO-MATH-CONCEPTS-CATALOGUE-2026-05-22.md` — 15-item
table, 4 advisory units (P1: U-SURFACE-FRACTAL-DIM, U-LANDSCAPE-RUGGEDNESS). Advisory only.

Companion to [[reference-calresco-complexity-research-2026-05-22]] +
[[reference-topology-math-cad-cam-research-2026-05-22]].
