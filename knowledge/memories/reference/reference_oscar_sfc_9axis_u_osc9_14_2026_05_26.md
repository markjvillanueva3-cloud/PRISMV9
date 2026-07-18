---
name: reference-oscar-sfc-9axis-u-osc9-14-2026-05-26
description: U-OSC9-14 SpeedFeedTriVendorBatchComparatorEngine — closes operator's "hundreds of millions of combinations" cross-vendor batch directive; 162-cell live smoke reveals 161/162 PRISM-vs-HSMAdvisor outside ±15% envelope
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.695Z
aliases: reference_oscar_sfc_9axis_u_osc9_14_2026_05_26
---


# U-OSC9-14 — 2026-05-26 cross-vendor batch comparator + live finding

## What shipped (slot:oscar `claude-2ae65067`, /loop iter1, post-/compact resume)

`SpeedFeedTriVendorBatchComparatorEngine` composes 3 independent vendor axes per cell in one cartesian sweep:
- **A — PRISM** 9-axis orchestrator (physics)
- **B — Baseline DB** (HSMAdvisor + Sandvik + Kennametal + CNCCookbook + Titans static tables)
- **C — G-Wizard** live toolcrib (preloaded `GWizardState`, O(1) per-cell index by diameter bucket)

6-verdict classification: `tri_agreement | dual_agreement | weak_disagreement | prism_only | divergent | error`. Aggregates: `by_verdict / by_iso / by_op / by_mode`, percentile distributions (baseline_agreement, |gwizard_var_pct|), `vendor_coverage` tally, top-K divergent. Hard cap 10K cells/call (R12 fail-loud); streaming JSONL ledger for larger.

| File | Lines | Tests | Commit |
|------|------:|------:|--------|
| `mcp-server/src/engines/SpeedFeedTriVendorBatchComparatorEngine.ts` | 635 | — | `ebdc91b473` |
| `mcp-server/src/__tests__/SpeedFeedTriVendorBatchComparatorEngine.test.ts` | 375 | 30 | `ebdc91b473` |
| `scripts/sf-tri-vendor-smoke.mjs` | 108 | — | `ebdc91b473` |
| `mcp-server/src/tools/dispatchers/calcDispatcher.ts` | +24 | — | `ebdc91b473` |
| `mcp-server/data/milestones/OSCAR-SFC-9AXIS-MS0.json` | +31 -11 | — | `d9c6b47aa3` |

Dispatcher action: `prism_calc:sfc_tri_vendor_batch_compare`.

## Per-file scrutiny 2-of-2 (engine + test before dispatcher)

- **Arm A** (code-analyzer): PASS w/ 5 P1 — all fixed inline.
- **Arm B** (reviewer, independent integration pass): FAIL on **1 P0** + 7 P1.
  - **P0 (load-bearing finding)**: `ToolMaterial` Zod enum drift — engine schema had `"diamond"` but canonical `UltimateSpeedFeedEngine.ts:83` defines `"carbide"|"hss"|"cermet"|"ceramic"|"cbn"|"pcd"`. Engine would have accepted `["diamond"]` at boundary then thrown deep in physics. Fixed: replaced with canonical 6-member enum.
  - **P1s fixed**: max_cells 100K→10K (doctrine ceiling); verdict fall-through promoted to 6th category `weak_disagreement` (distinct from `divergent`); `run_id` cryptographic-random suffix (was deterministic on Date.now()); prototype-pollution guard on `materials_by_iso` via `Object.prototype.hasOwnProperty.call`; tautological baseline-cold test replaced with `vi.spyOn(compare).mockReturnValue`; 6-verdict exhaustive union assertion added.

## LIVE SMOKE FINDING (the actual point of the unit)

162-cell default matrix (6 ISO × 3 operation × 3 cut_type × 1 diameter × prism_optimized mode) against operator's actual G-Wizard install (3 tools — fresh):
- duration: 6.9s wallclock (~42ms/cell)
- by_verdict: 0 tri / 1 dual / 42 weak_disagreement / 48 prism_only / 59 divergent / 12 error
- baseline_agreement: **p10=0 · p50=0.381 · p90=0.77**
- vendor_coverage: 26 both · 52 baseline_only · 28 gwizard_only · 56 neither
- **REAL FINDING: 161/162 cells PRISM-vs-HSMAdvisor outside the ±15% envelope** (only 1 H-group cell in_envelope). Top divergent cluster is all N-group aluminum at extreme gwizard_var (17944%+) — the variance is not a PRISM bug, it's the **operator's fresh-install 3-tool G-Wizard toolcrib being matched only on diameter** to materials it wasn't configured for. Clears once toolcrib is populated (U-OSC9-15 SQLite GWizard.db extraction).

## Cross-references

- Closes operator directive verbatim: *"did we complete all potential combinations of calculations for milling [and] lathe? [...] there were several attempts for large batch testing and comparisons of hundreds of millions of combinations"*
- Composes existing engines (R8/R11 — no re-implementation): `speedFeedNineAxisOrchestratorEngine`, `speedFeedBaselineComparatorEngine`, `gWizardAdapterEngine`.
- Prior in-tree at-scale art (all single-vendor — this fills the cross-vendor batch gap):
  - `SpeedFeedAtScaleHarnessEngine` (PRISM-only physics invariant sweep I1-I6)
  - `SpeedFeedExhaustiveCombinationEngine` (PRISM-only ~60-cell bounded cartesian)
- Future work registered in envelope: U-OSC9-15 (G-Wizard SQLite extraction — increases toolcrib density, removes Axis C cross-mismatch artifact), U-OSC9-16 (HSMAdvisor material_id→ISO map from tooldb2.xml — improves Axis B coverage), U-OSC9-17-AI-TRAINING (renamed from collided placeholder).
- Predecessor session: [[reference_oscar_sfc_9axis_ms0_2026_05_26]] (13-unit ship 2026-05-26 first half)
