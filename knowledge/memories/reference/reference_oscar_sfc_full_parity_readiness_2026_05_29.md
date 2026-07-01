---
name: reference_oscar_sfc_full_parity_readiness_2026_05_29
description: Backend gap assessment for resuming FULL-combination SFC parity testing (every combo vs HSMAdvisor+G-Wizard). VERDICT NOT-READY. Biggest blocker — full-combo path (PRISM-only batch-run) and tri-vendor path (10K-capped) are disjoint, never composed. Spec: state/shared/specs/SFC-FULL-PARITY-READINESS-2026-05-29.md.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.706Z
aliases: reference_oscar_sfc_full_parity_readiness_2026_05_29
---


# SFC full-combination parity readiness — NOT-READY (2026-05-29, slot:oscar)

Operator: "what more do we need for the backend before going back to full variability / full combination testing against HSMAdvisor and G-Wizard for every combo input." Assessed via workflow `wf_988683dd-db8` (4 assessors both trees + synth, 724K tok) + inline corroboration; cross-verified vs git/files. Full spec: **`state/shared/specs/SFC-FULL-PARITY-READINESS-2026-05-29.md`**.

## VERDICT: NOT-READY. Biggest blocker = disjoint paths
The full-combo enumeration path and the tri-vendor compare path are **architecturally disjoint, never composed in one tree**: `sfc-variability-batch-run.mjs` streams the 200M-500M enumeration but computes PRISM-ONLY (`SpeedFeedOrchestratorEngine.compute()`, zero vendor refs); `SpeedFeedTriVendorBatchComparatorEngine` does the real 3-way diff but is hard-capped `max_cells=10_000` + enumerates its own tiny matrix. No script streams the full enumeration through a per-cell 3-vendor compare.

## 5 BLOCKERS (dependency order)
- B1 — engines (slot/oscar) + harness (main tree) in ONE tree (golf-merge OR build B3 in oscar tree).
- B2 — commit the `sfc-variability-*` harness (8 scripts+2 tests, ALL untracked in main → unreproducible).
- B3 — **build `scripts/sf-tri-vendor-batch-run.mjs`**: streaming tri-vendor pump, no 10K cap (THE missing piece; reuse exported `computeResumeSkip`/`groupChunksByWorker`).
- B4 — unify PRISM column on `speedFeedNineAxisOrchestratorEngine.run` (batch-run uses the flat orchestrator → values not self-consistent). Folds into B3.
- B5 — populate `PROD_MATERIALS_BY_ISO` N:[] + H:[] (else not "every combo"); referenced `sf-exhaustive-sweep.mjs` doesn't exist.

## P1 — vendor-independence (hard greenfield, decides if the scorecard is REAL parity or PRISM-vs-itself)
- HSMAdvisor: no headless/API (.NET GUI); the "HSMAdvisor axis" is actually a STATIC baseline table, not HSMAdvisor's computed rec. Needs HSMAdvisorCalcDriverEngine OR offline combo-keyed dataset.
- G-Wizard: circular — reads back the toolcrib.csv PRISM itself wrote (geometry, not recs). Needs GWizardCalcDriverEngine OR published dataset. No GWizardMachineExporterEngine.
- 84.6% ceiling + CatalogJoiner backfills from PRISM's OWN tables → joiner cells are PRISM-vs-PRISM. Add `vendor_independent_coverage` metric; flag joiner cells non-independent (true vendor-covered ~15%).
- Reproducibility: both vendor axes read live %APPDATA% → ZERO cells off the operator's box. Commit sanitized toolcrib fixture + frozen HSMAdvisor snapshot. Shop-tools-*.csv (7) gitignored = the tool axis.

## ALREADY IN PLACE (B1-B5 is mostly composition+commit, NOT greenfield)
Enumeration ✅ (mill 12-axis + lathe 11-axis, full cartesian + dedupe), scale-out scaffolding ✅ (multi-worker pump + cache + resume-guard, exported pure resume-math), 3-way engine ✅ (5-class verdict + percentiles, lift its per-cell logic), adapters/exporters/41K-catalog ✅ tracked on slot/oscar, smoke ✅ (sf-tri-vendor-smoke ~162 cells = B3 seed).

Lessons: [[reference_oscar_sfc_galaxy_completeness_audit_2026_05_29]] (workflow+codex find what inline misses) · vendor desktop apps have no per-combo API — parity is fundamentally bounded by their stored-library coverage. See [[reference_oscar_sfc_vendor_parity_state]] · [[reference_oscar_sfc_baseline_coverage_ceiling]] · [[reference_oscar_sfc_divergence_investigation_2026_05_27]].
