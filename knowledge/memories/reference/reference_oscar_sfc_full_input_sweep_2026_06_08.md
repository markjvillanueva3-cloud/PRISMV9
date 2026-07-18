---
name: reference_oscar_sfc_full_input_sweep_2026_06_08
description: "SFC full-input-space sweep (69,120 cells = all app-page selectable inputs, 803× the 86-cell sample) reveals PRISM conservatism is MATERIAL-DEPENDENT, and the GPU judge pins the only safety flag to aggressive_rush mode on hard materials (+32.9% too_aggressive)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.705Z
aliases: reference_oscar_sfc_full_input_sweep_2026_06_08
---


# SFC full-input-space sweep + GPU H/K judgment (2026-06-08, slot:oscar)

The /goal said "all potential inputs for selection within the SFC app page." The
prior sweep covered 86 demo/prod cells — a <60s test-suite cap, NOT the real space.
This unit expands to the actual selectable input space and reruns the comparison.

## Built (committed `3a1c20fca2`; corrected `<follow-up>`)
- `SpeedFeedExhaustiveCombinationEngine` gained `sample_mode:"full"` — 15 canonical
  CANONICAL_MATERIAL_DB material NAMES × full diameter(3-25mm)/flute(2-5)/cut/strategy/
  coolant/holder grids × 3 modes = **69,120 input COMBINATIONS** (803× the 86). Plus a
  `runStreaming` generator (yields cell-at-a-time, no 50-cap, memory-safe on 128GB).

## SCRUTINY CORRECTION (R12 — two reviewers caught it, empirically verified)
The 15 material NAMES are real selectable inputs, but PRISM's SFC resolves material
physics at the **ISO-GROUP level** (kc1.1 per group), NOT per-alloy. Within a group the
names produce IDENTICAL Vc: 6061≡7075=365, 304≡316=100, D2≡A2≡WC-Co=76, 1018≡4140=140.
So 15 names collapse to **6 distinct physics profiles**. This is a REAL product finding:
the app page's per-alloy dropdown is finer than the physics → per-alloy Vc would need
alloy-specific kc1.1 corrections (an SFC enhancement). The sweep is over input
COMBINATIONS, not 15 distinct materials. Locked by a test (4 N-names → 1 Vc). Also fixed
a `cells.length` ReferenceError in the driver's non-json print path (streaming refactor
left a dead var; masked because the live run used --json).
- `scripts/sfc-full-sweep-compare.mjs --mode full` streams the tri-vendor compare.
- 17/17 engine tests (full-mode grid-product counts, axis diversity, real DB names,
  exotic-material resolution, streaming-yields-all contract).

## THE finding — full input space CORRECTS the sample (R12: the sample was incomplete)
86-cell sample said "PRISM uniformly conservative." 69,228-cell full sweep (0 fail):
PRISM conservatism is **MATERIAL-DEPENDENT**:
- N (alu/cu/brass, 18432 cells) −60.6% · P (steel, 13932) −36.4% — strongly conservative
- M (stainless) −21.1% · S (Ti/Inconel) −2.7% · K (cast iron) 0.0% — balanced
- H (hardened/carbide, 13824) **+7.6% — slightly AGGRESSIVE**
PRISM is cautious on soft/non-ferrous, tracks-to-exceeds baseline on hard/abrasive.

## GPU judge on H/K aggressive regimes (the actionable part — Blackwell in the loop)
qwen2.5-coder:32b 100%-resident (35724 MiB), 8 distinct hard-material regimes:
- `prism_optimized` (DEFAULT) on D2/A2/WC-Co/cast-iron: **sound_match 4/4** (+17.6-25.9%)
  — GPU: "aligns closely, balancing speed and tool life." The default is SOUND on hard mat.
- `aggressive_rush`: **too_aggressive 4/4** (+32.9%) — GPU: "risking tool/spindle wear
  without clear benefit."

**Actionable safety recommendation (advisory, NOT auto-applied):** tighten the
`aggressive_rush` Vc multiplier for ISO H/K. The DEFAULT mode is fine; only the
aggressive mode over-pushes on hardened materials. This is the closed loop working:
full input space → material-dependent finding → GPU machinist judgment → specific fix.

## Vendor baselines at scale
G-Wizard contributed **0 of 69,228** (definitively confirms the toolcrib.csv has no
SFM/Vc — geometry-only). HSMAdvisor one open cut matched 108 cells.

## Pitfalls
- Driver imports `../src/*.js` → MUST run with `npx tsx`, not plain `node`
  (ERR_MODULE_NOT_FOUND otherwise — the .js resolves to the .ts only under tsx).
- 69K × per-cell `appendFileSync` + per-cell live-vendor file reads is slow; vendor-
  offline (`--no-vendor`) is the fast path (vendor contributes ~0 anyway). A `timeout`
  wrapper killing the process at 600s (exit 137) can fire AFTER the streamed ledger is
  already complete — check the ledger row count before assuming failure.
- `run().results` is capped at 50; assert axis diversity via `runStreaming`, not results.

Spec: `state/shared/specs/SFC-VC-ASSESSMENT-2026-06-08.md` §FULL input-space sweep.
Siblings: [[reference_oscar_sfc_closed_loop_training_2026_06_08]],
[[reference_oscar_sfc_gpu_judge_blackwell_2026_06_08]].
