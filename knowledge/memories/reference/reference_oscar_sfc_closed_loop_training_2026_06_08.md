---
name: reference_oscar_sfc_closed_loop_training_2026_06_08
description: PRISM SFC closed-loop training layer — derive+persist per-(ISO×mode) Vc calibration model from the live sweep ledger; PRISM is systematically conservative vs vendor baseline (the safe direction); apply is operator-gated never auto.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.250Z
aliases: reference_oscar_sfc_closed_loop_training_2026_06_08
---


# PRISM SFC closed-loop training — LIVE results (2026-06-08, slot:oscar)

The `/goal` "run the full SFC closed-loop training + tri-vendor compare on the new
CPU/128GB/RTX6000/NVMe" was answered. The training layer is no longer a dangling
wire — it derives + persists a real, schema-versioned calibration model.

## Built (committed)
- `SpeedFeedCalibrationPersistEngine.ts` — `parseLedger` → `derive` → `persist` →
  `buildFromLedgerFile`. Factor = `1/(1 + medianΔ%/100)` clamped [0.5, 1.5].
  Wired `prism_calc:speed_feed_calibration_persist`. 14 unit + 4 round-trip tests.
  Commit `16d6eecef4`.
- Upstream: `SpeedFeedTriComparatorEngine` (`speed_feed_tri_compare`, commit `a2dbfa76e1`),
  `SpeedFeedExhaustiveCombinationEngine` + `scripts/sfc-full-sweep-compare.mjs`
  (`speed_feed_exhaustive_sweep`, commit `891c66e728`), G-Wizard align `43e1b8e449`.

## Live training run (86 sweep cells → 62 usable → 12 regimes)
PRISM `prism_optimized` vs 5-vendor internal baseline DB:
- P/steel −33.2% · M/304 −25.9% · N/6061 −36.5% · K/cast-iron 0% (S/H excluded, no baseline).
- **PRISM is systematically BELOW the vendor baseline = the conservative, SAFE direction.**
- 8 of 12 regimes would need factor >1.0 (more aggressive) to match the baseline →
  every one flagged `increases_vc:true`.

## THE safety insight (why apply is gated, not auto)
Calibrating PRISM *toward* the vendor numbers makes it MORE aggressive against an
**un-safety-validated** target. So the persist engine is **advisory-only**: it records
the gap per regime, never pushes Vc up. Apply stays `PRISM_SFC_CALIB_APPLY` default-OFF
+ S(x)≥0.98 (a separate downstream unit, not yet built). Conservatism is a FEATURE.

## Vendor-baseline reality (honest, CTO-checkable)
- G-Wizard live `toolcrib.csv` = 41,210 rows, **0 with SFM/Vc** — geometry-only, cannot
  be a speed/feed baseline. Not a PRISM gap; a limitation of the export.
- HSMAdvisor `settings_v2.xml` = **one** open `<Cut>`, flagged `aligned:false`, consensus
  filter correctly excludes it. One data point, not a per-cell baseline.
- 5-vendor internal DB anchors 62/86 cells = the operative baseline.

## Pitfalls hit this session
- tsx inline `-e` and `/tmp` driver resolve relative imports against CWD/temp, not the
  source tree → `ERR_MODULE_NOT_FOUND`. Put driver files INSIDE `mcp-server/` so
  `../src/...` resolves. (`scripts/.calib-run-tmp.mts`, deleted after.)
- Sweep ledger + calibration model live under `mcp-server/state/outcomes/`; the
  `.jsonl` ledger is gitignored (regenerated data), the model JSON is a derived artifact
  — findings committed to the spec, not the state file.

Spec: `state/shared/specs/SFC-VC-ASSESSMENT-2026-06-08.md` §ADDENDUM. Retires that
report's blocker #7 ("closed loop is a dangling wire"). See
[[reference_oscar_sfc_backend_closed_loop_2026_06_08]] (prior-session backend findings).
