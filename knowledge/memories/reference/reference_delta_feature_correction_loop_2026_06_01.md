---
name: reference_delta_feature_correction_loop_2026_06_01
description: "Delta's CAD auto-correction loop — missing xray feature → build op → re-probe verify; the producer-must-emit-derived-counts P0 lesson"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.548Z
aliases: reference_delta_feature_correction_loop_2026_06_01
---


The closed-loop CAD-vs-xray-print pipeline now has its **auto-correction** half (commit `ca43b6369f`, `U-CADTP-FEATURE-CORRECTION`). The full stack, all pure-core + injected-deps + tested + per-file-scrutinized:

- **detect** — `cad-fusion-feature-alias.mjs` : recognized geometry → xray FUNCTIONAL names (central_oil_hole / working_tip_taper / stepped_revolved_axis / cross_drilled_relief_holes). bevel_face_chamfer is NEVER emitted (undetectable). [[reference_delta_xray_feature_presence_roundtrip_2026_06_01]]
- **compare** — `cad-fusion-xray-print-diff.mjs` : `diffXrayPrints(source, candidate)` presence-set diff → `{matched, missing, scorePct, verdict}`.
- **correct** — `cad-fusion-feature-correction.mjs` (NEW) : `proposeFeatureCorrections(diff)` maps each MISSING feature → a concrete build op + the face-geometry signature to expect (central_oil_hole→axial-bore, cross_drilled_relief_holes→radial-hole, working_tip_taper→taper-tip, stepped_revolved_axis→add-step; bevel_face_chamfer→NOT BUILDABLE w/ explicit reason). `verifyCorrectionApplied(before, after, expect)` MEASURES the result through the real producer counts (never assumes). `correctionsToTrainingData` emits one dual-training datum per correction (print-reading side + cad/cam side + verified flag) → feeds the cad-fix ledger.

Loop contract: **build → diff → propose → apply → re-probe → VERIFY → re-diff**. PAYOFF test proves a die diff rises 3/5 → 4/5 (only the undetectable chamfer stays missing).

## The P0 lesson (both scrutiny reviewers FAIL'd the first cut — same finding)

`verifyCorrectionApplied`'s metric map referenced `internalCoaxialCylinders / internalRadialCylinders / externalDistinctDiameters`, but `summarizeFaceGeometry(...).counts` (the documented producer) emitted ONLY `internalCylinders / externalCylinders / internalCones / externalCones`. → 3 of 4 corrections would **silently never-verify in production** (`Number(undefined)=NaN → satisfied:false`). The hermetic tests MASKED it by hand-feeding the rich count keys no producer emits — the recurring **"hermetic fakes don't prove production wiring"** class.

**Fix (single source of truth):** extend the PRODUCER — `summarizeFaceGeometry.counts` now derives `internalCoaxialCylinders` (coaxial===true), `internalRadialCylinders` (coaxial===false), `externalDistinctDiameters` (distinct radii in the coaxial-preferred pool) from the per-face flags it already had. coaxial===null counts as NEITHER (an unknown-axis run can't mis-satisfy). Plus a **real-producer E2E regression oracle**: drive `verifyCorrectionApplied` through `summarizeFaceGeometry(realFaces).counts`, NOT fabricated keys — incl. a granularity-negative (a radial bore must NOT satisfy a central-bore expect). Reviewer B mutation-tested the oracles (collapse the coaxial distinction → 2 fail; weaken absent-before guard → P2 fails).

**Standing rule:** a "MEASURE not assume" verify fn MUST be tested through its REAL producer's output shape; a count/metric a consumer needs belongs in the producer (single source), never re-derived only in the consumer. Sister: [[feedback_verify_actual_contract_not_proxy]].

## LIVE 4/5 ACHIEVED (2026-06-01, commit 299ee16b97)
The closed correction loop is PROVEN LIVE end-to-end on a real die via `scripts/cad-fusion-correction-loop-live.mjs` (injects the real bridge into `runCorrectionCycle`): BEFORE 60% (3/5) → propose cross_drilled_relief_holes → APPLY (real cut) → re-probe VERIFIED (internalRadialCylinders 0→2) → AFTER 80% (4/5), trustworthy, reap clean. Only the undetectable bevel_face_chamfer remains. Full arc: print → CAD → compare → FIX → re-compare, live.

## BRIDGE BUGS found (running PRISM_Fusion_Drive add-in, :18365) — report to operator
1. `/extrude operation:"cut"` → "No target body found to cut or intersect!" (doesn't bind a participant body).
2. `/combine operation:"cut"` → "FEATURE_FAILED_TO_CREATE" + leaves 0 bodies.
3. `/new {name}` creates **2 docs** per call (body-index ambiguity; body_count jumps).
4. A FAILED `/extrude cut` leaves a STRAY tool body the face-probe misreads as an internal radial cylinder → a SPURIOUS feature match.
**WORKAROUND (shipped):** radial cut via `/execute` with `participantBodies=[die]` (mm→cm: Fusion internal units are cm) — live-proven 0→2 radial voids.

## HONESTY GUARD (the load-bearing R12 catch)
The spurious stray-body artifact gave a FALSE 4/5 with ZERO verified corrections. The orchestrator now computes `verifiedCount` + `unverifiedGain` (scoreDelta>0 && verifiedCount===0) + `trustworthyScorePct` (falls back to before when unverified). A gain is only real if a correction was MEASURED to apply. This distinguishes the genuine verified 80% (working cut) from the artifact 80% (failed cut). Lesson: a re-diff that rises is NOT proof of a fix — only a verified per-correction re-probe is. [[feedback_verify_actual_contract_not_proxy]]

## Doc lifecycle
`/new` named docs do NOT leak — they auto-drop; `reapByPrefix` reports `closed:0` but `remaining` is accurate (the prefix docs are gone). Operator/kilo docs were NOT open this session (Fusion reopened fresh → one Untitled scratch). reap prefix-scoped `PRISM-DELTA-CLIVE-*`, saveChanges false. [[reference_delta_fusion_isolation_flaky_regressed_2026_06_01]]
