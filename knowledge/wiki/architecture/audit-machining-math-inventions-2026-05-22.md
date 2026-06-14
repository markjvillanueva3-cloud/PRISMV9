---
title: Machining-Math Inventions Audit
type: audit
date: 2026-05-22
slot: november
---

# Audit — Machining × Math Inventions (2026-05-22)

`/forge-audit-v2`. Fifth and final spec of the session's math-research arc.

## Headline finding F0 — Precision-engine cluster DORMANT (P0, operator-directed)

PRISM has built the engines for **0.00005" / 1.27 μm / sub-micron accuracy** — ~22 actions across
the `acc_*` (machine error), `diamond_turning_*`, `laser_interferometer_*`, `spm_*` (statistical
process monitoring), `cad_probe_drift_*`, `thermal_machine_error`, and `vibration_isolator_calc`
clusters. **None of them are wired into any workflow.** Every grep hit is dispatcher boilerplate
(`calcDispatcher`, `camDispatcher`, `cadDispatcher`) plus one keyword-router entry in
`ToolRouterEngine.ts` that exposes them to operator queries but never invokes them
engine-to-engine. **67 CAM-strategy files exist; ZERO call any `diamond_turning_*` action.**

Recommended unit: `U-PRECISION-ENGINE-ACTIVATION` — wire each precision action into its natural
consumer surface per the activation map in the audit doc. Start with `acc_thermal_error →
post_inject_motion`.

## Other findings (8)

F1 RL closed-loop adaptive control · F2 causal scrap root-cause · F3 active-learning DOE for
Taylor/Kienzle · F4 variational toolpath generation (Lagrangian module exists, not toolpath-applied)
· F5 symbolic G-code compiler pass · F6 persistent-homology toolpath validity · F7 controller
look-ahead-state model · F8 coupled-PDE adjoint verification.

## META tool

`scripts/machining-math-intersection-map.mjs` — re-runnable, measures **14 math × surface
intersections**: 11 SILOED · 3 thin · 0 wired. Each intersection re-measures one finding every
run.

## Peer review

SHIP. F0 verified by independent random-sample grep (4/4 precision actions confirmed
dispatcher-boilerplate-only). Two refinements adopted: (1) `acc_volumetric` also wires upstream to
`cad_machine_capability_get` so strategy selection sees the volumetric envelope; (2) the
keyword-router exposure is humans-only, not engine-to-engine — F0's framing now reflects this.

## Companion specs (same session)

`CALRESCO-COMPLEXITY-APPLICABILITY` · `TOPOLOGY-MATH-CAD-CAM-APPLICABILITY` ·
`CALRESCO-MATH-CONCEPTS-CATALOGUE` · `MATH-SCIENCE-COVERAGE-AUDIT`.
