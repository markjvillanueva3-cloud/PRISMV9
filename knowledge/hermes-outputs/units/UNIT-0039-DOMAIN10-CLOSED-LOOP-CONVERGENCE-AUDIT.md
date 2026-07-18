# UNIT-0039 — Closed-Loop Training Convergence Audit

**Unit ID**: 0039
**Domain**: CAD Modeling & Engineering (Domain 10)
**Title**: Closed-Loop Training Convergence Audit (unify all lanes → one metric)
**Status**: Not Started
**Priority**: P1
**Estimated Effort**: 4-6 hours

## Description

Capstone/integration unit. Once the per-modality lanes (0035 prints, 0036 CNC, 0037 MCAD, 0038 BREP) feed the closed loop, this unit proves the terminal goal: **closed-loop training is COMPLETE across all prints, CAD models, and CNC programs**. It emits a single convergence dashboard — per-asset-class coverage (%fed into loop), per-class accuracy (generate→compare→correct convergence), and the residual (uncovered/failing) — so "complete" is proven by numbers, not asserted.

## Acceptance Criteria

- [ ] Dashboard reports, per asset class: total count, count fed into training loop, %coverage, mean convergence accuracy, residual (with reason)
- [ ] Coverage numbers reconcile to canonical-counts.json (no phantom 100%)
- [ ] Convergence accuracy uses the PROVEN metric (kernel-bbox GT / Hausdorff shape gate / feature-recall) — NOT bbox-volume proxy alone [[reference_delta_eval_harness_2026_06_28]]
- [ ] Residual is enumerated + classified (unparseable format / no reader / failing-convergence) — R12 fail-loud, no silent 100%
- [ ] Wired to `prism_cad` convergence-audit action + `/system-viz` roost
- [ ] 3-of-3 scrutiny on live dashboard output; regenerable via a script/cron

## Dependencies

- UNIT-0035, 0036, 0037, 0038 (all lanes must exist to audit them)
- Existing: night-summary.jsonl, eval harness (dim+geom modality), kernel-bbox GT
- **This is the LAST unit** — dependency order per R13

## Deliverables

- Convergence-audit engine + dispatcher action
- Live dashboard (`state/shared/cad-closed-loop-night/convergence-dashboard.{json,md}`)
- Regen script + cron; system-viz roost
- Final proof-of-goal report (numbers)

## Autonomous Execution Notes

Build LAST — auditing lanes that don't exist yet is a fabrication. Until 0035-0038 land, this unit's gap analysis + spec is the only honest work. The dashboard is the operator-facing proof that the north-star goal is met; it must fail loud on any class below 100% coverage rather than round up.
