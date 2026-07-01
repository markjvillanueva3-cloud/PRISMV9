---
title: QuoteToShip stage executors call engines with the wrong shape -- pipeline stalls e2e
tags: [quoting, quote-to-ship, erp-autofeed, stage-contract, call-convention, r12, regression]
created: 2026-06-30
slot: juliett
related: [reference_qts_stage_call_convention_2026_06_30, reference_kienzle_quote_erp_portal_merge_2026_06_30]
---

# QuoteToShip stage-executor call-convention bugs

The print->ship -> ERP-autofeed pipeline (`QuoteToShipOrchestratorEngine`, QUOTING-ERP-AUTOFEED)
does **not complete end-to-end** on representative input -- a CHAIN of stage-contract bugs, each
masking the next. The downstream `ErpAutofeedProjectionEngine` is correct, but with the pipeline
stalled at stage 3 it projects only ~2/21 operator fields, so in production the "auto-feed the ERP"
promise ships a near-empty payload.

## The class

Each stage executor (`executeDfmCheck`, `executeFeasibility`, ...) calls its engine method with an
**assumed shape** (a single `{features, material, ...}` options object) but the engine's REAL
signature differs (positional args, or a typed job). The engine then iterates/derefs a field that
isn't there. Same root class as the FE dead-panel envelope bugs -- but on the BACKEND
stage-to-stage seams, not the FE<->route wire.

## DFM_CHECK (FIXED, commit 0fd58058fa)

`executeDfmCheck` called `DFMFeedbackEngine.analyze({features, material, quantity, tolerances})`
passing a single options OBJECT. But the engine signature is **positional**
`analyze(features, material_iso_group?, machine_axes?)` and does `for (const f of features)` -- so it
iterated the OBJECT, not the array inside it -> `TypeError: features is not iterable` -> the whole
pipeline died at stage 3. **Fix:** call positionally with a guaranteed array + ISO group
(`QuoteToShipOrchestratorEngine.ts:1511-1519`). Live-verified: pipeline advanced 2->3 passing stages.

A defense-in-depth `Array.isArray(...)? : []` coercion is necessary but NOT sufficient -- an empty
array is iterable, so the coercion alone left the bug live; the OBJECT wrapper was the real defect.

## FEASIBILITY (NEXT BLOCKER, charlie)

`executeFeasibility` passes `{features, material, machine_ids, geometry}` but
`FeasibilityOrchestratorEngine.fullAnalysis(job: FeasibilityJob)` reads `job.operations.map(...)` +
`job.stock.height_mm` (`FeasibilityOrchestratorEngine.ts:88,117,230`) -> "Cannot read properties of
undefined (reading 'map')". Fix = build a `FeasibilityJob` adapter; `operations` likely come from
PROCESS_PLAN (which shows `missing` in the autofeed gaps) -> may need PROCESS_PLAN wired FIRST
(R13 dependency order).

## How to peel the chain

1. Add a stack-capture to the stage's `catch` (mirror the DFM `PRISM_DFM_DEBUG_STACK` pattern -- a
   gated `console.error(err?.stack)`), so the swallowed-into-`errors[]` throw reveals its real line.
2. Run the live harness `scripts/verify-erp-autofeed-live.mts` (real engines, real stages,
   `PRISM_EAF_REEXEC=1` tsx; pairs `drawing_pdf`+`drawing_text` so INTAKE passes).
3. Read the throw line; fix the call to match the engine's REAL signature (positional vs
   options-object; typed-job shape).
4. Remove the debug line; re-run; confirm the pipeline advances one more stage.
5. Each fix needs a STAGE-CHAIN test (the missing coverage that let this ship -- unit tests passed in
   isolation).

## Doctrine

A stage executor MUST call its engine with the EXACT signature the engine exposes -- never an assumed
`{...}`. Read the engine method's signature (positional/typed) before wiring the call. Until
`runFullPipeline` reaches `status:"complete"`, do NOT run a live closed-loop quoting test (R12) --
the autofeed payload is structurally near-empty.

Full work order + reconciliation table: `state/shared/specs/KIENZLE-QUOTE-ERP-PORTAL-MERGE-2026-06-30.md`.
