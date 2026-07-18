---
name: reference_echo_rokuroku_engine_2026_06_25
description: U-PP-ROKUROKU-ENGINE (slot:echo, commit 4259b15e63) -- the Fanuc-31i mill master post for JM VMC-05 Roku-Roku HC 658-II, the LAST JM machine with neither track. Full R15 (wire+test+validate+scrutiny). Plus the foxtrot "non-gap" reconciliation (descriptor layer != generation layer) and a HaasNGC sibling-bug follow-up.
type: reference
slot: echo
source: prism-memory
synced: 2026-06-27T20:30:46.564Z
aliases: reference_echo_rokuroku_engine_2026_06_25
---


# Echo -- Roku-Roku Fanuc-31i mill master post (2026-06-25, commit 4259b15e63)

JM VMC-05 Roku-Roku HC 658-II (Fanuc 31i-B5) -- JM's primary ELECTRODE mill ([[reference_roku_roku_primary_electrode_machine_2026_05_27]]) -- was the ONLY JM machine with NEITHER track (`master_post_by_machine` else-REJECTED it). Now it has its PRISM-routed (Track-PRISM) post.

## Shipped (full R15)
- **`RokuRokuFanuc31iMillMasterPostEngine.ts`** -- a faithful clone of the proven `HaasNGCMillMasterPostEngine` (~90% universal-ISO/Fanuc emit transfers verbatim) with FIVE Fanuc-31i deltas: (1) header `(MACHINE: ROKU-ROKU HC 658-II)` + `(CONTROL: FANUC 31i-B5)`; (2) `G05.1 Q1`/`Q0` AICC-II look-ahead opt-in (NOT Haas G187); (3) `controller:"fanuc"`/`dialect:"fanuc-31i"`; (4) machine envelope RPM/force checks run ONLY with a caller-supplied limit -- NO fabricated Roku-Roku datasheet value (R12); (5) TSC coolant falls back to M8 flood + warn (unverified M-code not fabricated). Reuses the shared `HaasMillOperation`/`HaasDrillCycle` contract (import, not re-declare).
- **TEST** `RokuRokuFanuc31iMillMasterPostEngine.test.ts` -- 14 R9 cases (happy + 5 failure + 3 adversarial), all green. **The test caught a REAL safety bug:** `emitToolpath` emitted `G0 XNaN` for a non-finite coordinate (only the first-approach XY was guarded). Fixed: per-move `Number.isFinite(c.x/c.y)` skip+warn + `Number.isFinite(c.z)` guard.
- **WIRE** `camDispatcher.ts master_post_by_machine` -- new branch (ROKU / HC 658 only, machine-identity not bare-controller per scrutiny P2) before the else-reject; updated the reject's supported-list.
- **VALIDATE** live block-audit of the actual emit: 39 blocks, **0 ERROR**, clean Fanuc-31i vocab (G05.1/G83/G99/G80/G43/G54, M3/M5/M8/M9/M30), look-ahead + program-end present.
- **SCRUTINY** physics-reviewer PASS (4 formulas correct, canonical constants, no fabricated datasheet = SAFE) + reviewer PASS (genuine non-dup, order-safe wiring, real tests). P2 (false-header on a hypothetical non-Roku Fanuc mill) FIXED by scoping the matcher to ROKU/HC 658.

## R12 reconciliation -- foxtrot "non-gap" was a DIFFERENT LAYER (verify-before-build paid off)
Memory recall surfaced [[reference_vmc05_roku_post_gap_2026_05_30]]: foxtrot (2026-05-30) said "VMC-05 ALREADY covered -- NOT a gap." I STOPPED and verified before committing (R12 + dedup): foxtrot's "coverage" = the PostProcessorRegistry **descriptor** `PP-FANUC-5AX-001` (metadata, controller-string lookup) -- exactly like `PP-FANUC-3AX-001` "covers" Haas while the actual Haas GENERATION is `HaasNGCMillMasterPostEngine`. There is NO existing Fanuc-31i mill **generation** engine (`FanucLegacyControllerEngine` = legacy 15/16i only). So both are right: descriptor exists (foxtrot's layer) AND the generation engine was missing (the operator's "PRISM-routed higher tier" ask). My engine fills the generation layer -- NOT a duplicate. Lesson: a registry DESCRIPTOR "covering" a controller != a GENERATION engine existing; verify the layer before claiming a gap is filled OR building. [[feedback_read_full_content_not_titles]]

## Follow-up queued (sibling bug -- auto-fix-inline candidate)
- **U-PP-HAASNGC-NONFINITE-GUARD:** physics-reviewer confirmed `HaasNGCMillMasterPostEngine.emitToolpath` has the SAME latent non-finite-coordinate bug (emits `XNaN`/`ZNaN` -- Haas line ~345 guards Z with only `!== undefined`). Clone the RokuRoku fix (per-move finite X/Y skip+warn + finite-Z guard) into HaasNGC + a regression test. Separate engine = separate scrutiny.

## Remaining JM dual-track gaps (now 2, was 3)
- **U-PP-FA10S-WIRE:** FA10S mis-routes to MV1200R; needs a W31MV-2 dialect profile on the Mitsubishi WEDM engine.
- **U-PP-EA-SINKER-ROUTE:** reconcile the two sinker engines (`edm_sinker_program`->EDMProgramAssembler vs canonical PPSinkerEDMPost; EA12D added 669c03dacf). Needs R8 first.
Operator-gated: U-CIMCO-BASELINE-SIM, U-LEGAL-13. See ECHO-ULTIMATE-ROADMAP-v3 + U-PP-ROKUROKU-ENGINE-BUILD-SPEC.
