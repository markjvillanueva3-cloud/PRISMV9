---
name: reference-delta-closed-loop-replication-methodology-2026-06-10
description: "Canonical PRISM closed-loop REPLICATION methodology (training session, slot:delta) for any H-drive artifact: CAD STEP / blueprint print / CNC program. 6-stage loop INGEST->PARAMETERIZE->GENERATE->COMPARE->CORRECT->CONVERGE; honest '100% = metric convergence + topological parity, NOT byte identity (byte-exact = re-import, not regenerate)'. Full doctrine + per-artifact metric/threshold/ceiling table + acceptance gates at state/shared/specs/CLOSED-LOOP-REPLICATION-METHODOLOGY-2026-06-10.md. KEY LESSON: I generated a blisk BLIND (30 blades, generic) without reading the reference -- blisk.stp actually has 48 blades (DFT k=48). ALWAYS run INGEST+PARAMETERIZE on the reference BEFORE generating. Toolchain ~85% built; Stage-6 CORRECT is the only real gap (no engine reads a compare() delta and re-drives generation). 3 compare() defects found."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-27T20:30:46.546Z
aliases: reference_delta_closed_loop_replication_methodology_2026_06_10
---


# Closed-loop REPLICATION methodology + blisk.stp reverse-engineering (2026-06-10, slot:delta)

Operator reframed the blisk task as a TRAINING SESSION: "your task was to replicate it [blisk.stp]... lets use this as a training session so we know what to do for future closed loop testing across all cad files, prints and cnc programs in the h drive." Produced via the `blisk-replication-training` 4-agent workflow.

## THE KEY LESSON (the mistake that triggered this)
I generated a blisk BLIND -- 30 blades, generic dims -- WITHOUT reading the reference. The operator caught it ("blisk is missing the whole main body or was just that a test for blades?"). Reverse-engineering blisk.stp shows it has **48 blades** (DFT of the angular CARTESIAN_POINT histogram, clean fundamental k=48, pitch 7.5deg, conf 0.9), bore Ø300, disk-rim Ø~730, tip Ø~1209, span ~240mm. **DOCTRINE: always run INGEST + PARAMETERIZE on the reference BEFORE GENERATE.** Generating from assumed params = the blind-generation anti-pattern.

## Canonical methodology -> state/shared/specs/CLOSED-LOOP-REPLICATION-METHODOLOGY-2026-06-10.md
6-stage loop (INGEST->PARAMETERIZE->GENERATE->COMPARE->CORRECT->CONVERGE) + per-artifact (CAD/print/CNC) metric+threshold+convergence-var+honest-ceiling table + acceptance gates. "100% accurate" = metric convergence within tolerance + topological parity, NOT byte identity (byte-exact = re-import the file, NOT regenerate -- regeneration is approximation-with-bounded-error by construction).

## Toolchain audit: ~85% built, Stage-6 CORRECT is the gap
INGEST/PARAMETERIZE/GENERATE/COMPARE all have built+wired PRISM engines (STEPGeometryParserEngine, CADReverseTemplateEngine, CADToSTEPPipelineEngine, CADGeometryComparisonEngine, live PRISMBridge). The one real gap: **no CADRegenCorrectionEngine** -- nothing reads a compare() delta + the parameterized template and iterates GENERATE->COMPARE to convergence. That is THE build to close for full automation.

## 3 compare()/extractMetrics DEFECTS found (flag before trusting volume/bbox gates)
1. **VOLUME unreliable** -- extractMetrics reports blisk.stp vol 451.5M mm^3 > its bounding cylinder 354.6M mm^3 (pi*603.45^2*310) = PHYSICALLY IMPOSSIBLE. Gate on bbox+topology+blade-count, NOT raw volume, until fixed. (follow-up U-CAD-VOLUME-METRIC-FIX)
2. **No unit normalization** -- inch candidate vs mm reference -> 25.4x-confounded delta (UNITS-FIRST rail). (follow-up U-CAD-COMPARE-UNIT-NORMALIZE)
3. 2 feature-recognition engines coexist (R7 dedup); bridge port const 18360 vs live 18361.

See [[reference_delta_live_fusion_nurbs_emit_proven_2026_06_10]] (the live-kernel NURBS-emit capability this builds on) - [[reference_delta_real_blisk_reference_characterized_2026_06_10]] - [[feedback_never_claim_absence_without_deep_search]].
