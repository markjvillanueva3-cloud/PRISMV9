---
name: reference_oscar_sfc_page_overpower_bug_2026_06_23
description: "SFC web-page closed-loop testing (slot:oscar 2026-06-23, /goal DO-IT-ALL) CAUGHT + FIXED a silent over-power safety bug + surfaced that the page runs a PARALLEL engine from the validated physics core. (1) ProductEngine.calculateSafetyScore rated a 6.25kW cut 'safe' on the 5.6kW Haas OM-2 -- >100% spindle power now deducts 0.5 (never 'safe'). (2) The SFC page's sfc_calculate uses ProductEngine.sfcCalculate->ManufacturingCalculations, NOT the 2851-LOC SpeedFeedOrchestratorEngine that the 11.2M corpus validated -- a product-integrity divergence. (3) Variability batch re-enabled. (4) tool-life 9999 = legit clamp (SpeedFeedOrchestrator:2895, x5 sites), magic-number smell. (5) Shared-tree git lesson: use git commit -- <paths>."
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:46.710Z
aliases: reference_oscar_sfc_page_overpower_bug_2026_06_23
---


**`/goal` "DO IT ALL" (2026-06-23): closed-loop SFC page testing caught a real safety bug + surfaced a product-integrity divergence.**

## 1. SILENT OVER-POWER SAFETY BUG (caught + FIXED) -- the headline
The JM-fleet page-path closed-loop test (`sfc-jm-fleet-page-closed-loop.test.ts`, drives `productSFC("sfc_calculate")` = the real `/api/v1/sfc/calculate` engine) caught: the SFC web page rated a **6.25 kW cut "safe" on the Haas OM-2 (5.6 kW office mill)** cutting steel -- a silent over-power that would STALL the spindle. Root cause: `ProductEngine.calculateSafetyScore` (`ProductEngine.ts:556`) deducted only 0.3 for >95% capacity (capping at the 0.7 "safe" boundary) with **no escalation for EXCEEDING 100% spindle power**. Fix: `if (power > machinePower) score -= 0.5` -- provably forces score < 0.7 "safe" (score starts 1.0, only ever decrements). HARDENING (soul-permitted). Commit `U-SFC-JM-FLEET-CLOSED-LOOP` (e0003bce). 2-arm scrutiny PASS (math-verified). Deferred P2: graduated ">150% -> danger" tier; advisory when machine_power_kw absent.

## 2. PARALLEL-ENGINE DIVERGENCE (product-integrity finding for the operator)
The SFC web page's `sfc_calculate` runtime chain is `routes/sfc.ts:23` -> `callTool("prism_product","sfc_calculate")` -> `productDispatcher:36 productSFC` -> `ProductEngine.sfcCalculate:582` -> `ManufacturingCalculations.calculateSpeedFeed`. This is a **completely separate, simpler engine from `SpeedFeedOrchestratorEngine`** (the 2851-LOC physics core that the 11.2M variability corpus validated + that `sfc_nine_axis` uses). The page does NOT show the orchestrator's numbers; the two diverge (see [[reference_oscar_sfc_engine_divergence_magnitude_2026_06_21]]). All the physics depth went into an engine the customer-facing page doesn't use. Two closed-loop tests now pin both: `sfc-jm-fleet-closed-loop.test.ts` (orchestrator/physics-core, 17 tests) + `sfc-jm-fleet-page-closed-loop.test.ts` (page path, 15 tests). **Operator decision: should the page be rewired to the validated orchestrator?**

## 3. VARIABILITY BATCH re-enabled (a)
The 3 "PRISM SFC Variability *" scheduled tasks (disabled since 6/17) were re-enabled + the Guard relaunched the mill+lathe batches (State=Running). Accuracy already proven on the existing 11.2M corpus ([[reference_oscar_sfc_accuracy_auditor_2026_06_23]]); this extends coverage.

## 4. TOOL-LIFE 9999 verdict (c)
9999 is a HARD CLAMP `Math.max(1, Math.min(9999, toolLifeMin))` at `SpeedFeedOrchestratorEngine.ts:2895` (+ 3164/3241/3505 + `SpeedFeedResourceIntegrationEngine:987`). 166 hr = effectively-infinite single-edge life, a legit range clamp -- NOT a calc bug. 81% saturation = the variability corpus is light-cut-dominated. Smell: magic number duplicated 5x (extract to `TOOL_LIFE_CAP_MIN`) + the ML pipeline (india) should detect saturation explicitly.

## 5. SHARED-TREE GIT LESSON (bug avoided)
`git add <my files>` + `git commit` swept a pre-staged deletion of `PRISMSelfAwarenessEngine.test.ts` (lurking in the shared `H:/prism` index) into my SFC commit. Restored from the intact working-tree copy. **On the shared tree, commit with `git commit -- <paths>` (commits ONLY those paths), never `git add` + bare `git commit` (commits the whole pre-loaded index).** Prior 1121-line version recoverable at HEAD~2 if the 342-line on-disk version is wrong.
