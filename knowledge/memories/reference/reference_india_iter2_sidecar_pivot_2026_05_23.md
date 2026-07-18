---
name: india-iter2-sidecar-pivot-2026-05-23
description: India /loop iter2 pivoted from .cps source-edit rollout to unwired-engine wiring. Production .cps edits drive JM Die iron — shop-floor approval gate not in scope for an autonomous /loop.
aliases: reference_india_iter2_sidecar_pivot_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.618Z
---


# India iter2 pivot — sidecar rollout → unwired-engine wiring (2026-05-23)

## Original iter2 scope (deferred)

Roll out `writeSidecarJSON()` block from `PRISM-Master-Hurco-VM30i.cps` (15 sidecar refs — complete pattern) into 11 missing posts:
- HAAS_VF2_-Ai-Enhanced (iMachining).cps
- HURCO_VM30i_PRISM_Enhanced_v8.9.153.cps + " 2.cps"
- HURCO_VM30i_PRISM_v10_9_DRILLFIX_1.cps
- HURCO_VM30i_PRISM_v11.cps
- OKUMA_GENOS_L400II_P300LA-Ai-Enhanced.cps
- OKUMA_LATHE_LB3000-Ai-Enhanced 2.cps
- OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5_2_7.cps + " 2.cps"
- OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps
- Roku-Roku-Ai-Enhanced.cps

Detected by `JMDiePostProcessorLearningEngine.gapReport()` — patterns: `[/sidecar/i]`. Top gap: `sidecar_json_export 1/12`.

## Why deferred

These .cps files **drive real Hurco/Okuma/Haas iron at JM Die** when used by Fusion 360 to post. shop_floor safety tier (S(x)≥0.98, Ω≥0.95) → cannot ship an autonomous patch without operator runtime verification (post → load on machine → first-part inspection). Risk class: a malformed `writeSidecarJSON()` call could break the post emit entirely, halting production.

Same constraint applies to original iter3: prism_physics_integration for okuma family (5/5 missing).

## Pivot target — india-pure unwired engines (4 candidates)

Per UNWIRED-ENGINE-AUDIT-2026-05-07.json (generated 2026-05-22T21:00:20Z, 616 total unwired) filtered for india-pure (post-processor + master-post, not lathe/wedm/cam crossover):

| Engine | Size | Suggested | Notes |
|---|---|---|---|
| `CpsParserEngine` | 24 kB | UNKNOWN | foundational — feeds sidecar/dialect/master-post |
| `HybridPostMergeEngine` | 13 kB | UNKNOWN | merge across posts |
| `PostProcessorUnificationEngine` | 4 kB | prism_cam | unification adapter |
| `CAMPostInvokeOrchestratorEngine` | 8 kB | prism_cam | post-invoke orchestration |

Iter3 picks `CpsParserEngine` (highest-ROI single engine, foundational, 24 kB indicates real implementation not stub).

**Cross-domain residue** (NOT india's slot — recorded for reference):
- 6 DNC* engines → mike/golf (infrastructure)
- 6 WEDMPost* engines → charlie (wedm slot)
- 6 LatheMasterPost* engines → bravo (lathe slot)
- 5 Fusion* engines → echo (cam slot) + delta (cad slot)

## Apply

- Sidecar / physics-integration rollout to .cps files = **operator-approved follow-up unit**. Path: pp-resolve → operator-review → ship in slot worktree under shop_floor gate.
- For autonomous india /loop iters: prefer engine wiring + envelope close-outs (advisory mutations) over production post-source edits.

## Audit staleness caveat

UNWIRED-ENGINE-AUDIT lists `JMDiePostProcessorLearningEngine` as unwired (size 21 kB, mtime 2026-05-21). I shipped its wiring in iter1 (commit `398e671a45` 2026-05-20). Audit was regenerated 2026-05-22 yet still misses the wiring — `audit-unwired-engines.mjs` may have a stale-source-file cache or run before iter1 reconcile took effect. Pre-check every wire candidate against current dispatcher source before committing.

Related: [[reference_iter2_html_adopt_misattribution_2026_05_18]] · [[feedback_high_roi_backend_first_slot_queue]] · [[feedback_always_close_out]]
