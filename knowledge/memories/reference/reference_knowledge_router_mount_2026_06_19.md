---
name: reference_knowledge_router_mount_2026_06_19
description: india shipped /api/v1/knowledge REST router (14 frontend AI/learning endpoints were 404); + queued latheAI /api/v1/ai/reasoning gap; + absorbed-commit attribution note
type: reference
slot: india
galaxy: ai-training
source: prism-memory
synced: 2026-06-27T20:30:46.635Z
aliases: reference_knowledge_router_mount_2026_06_19
---


# U-KNOWLEDGE-ROUTER-MOUNT (slot:india, 2026-06-19)

**Work order:** /checkin-india /goal /loop -- complete india tasks then backend, to unblock frontend (web/phone app).

## What shipped (iter1)
`mcp-server/src/routes/knowledge.ts` (`createKnowledgeRouter`) mounted at `/api/v1/knowledge` in `routes/index.ts`. The web client `web/src/api/knowledge.ts` (consumed by `AILearningDashboardPage`, `FleetLearningDashboardPage`, knowledge-search + course-builder UIs) calls 14 endpoints under `/api/v1/knowledge/*` but NO router was ever mounted there -- only the unrelated `/api/v1/knowledge-ext`. So every call **404'd** (live-verified on the running :3100 server: `Cannot POST /api/v1/knowledge/fleet/summary`). Backend logic already existed as verified `prism_knowledge` (knowledgeDispatcher) `learn_*` actions -- this was purely the missing R15 WIRE.

- 14 endpoints -> verified `learn_*` actions: ingest(by content_type)/auto-tag/search/stats/courses{catalog,build,quiz,pricing,export}/fleet{status,summary,similarity,record,feedback}.
- Fleet read normalizers map REAL `FleetDeploymentLearningEngine` fields to the calibration-shaped frontend contract; deployment-currency->calibration mappings are **documented proxies**, absent fields (`worst_machine`) default explicitly -- NO fabricated numbers (R12). Merge-preserve keeps the engine's real breakdown.
- 26 tests (routing + normalization reference values + empty/adversarial + fabrication-guard + production `callTool` `{error}` passthrough). tsc clean. 2-arm per-file scrutiny PASS (both findings fixed: JSDoc/merge-preserve + error-shape test).
- Activates on next server bundle rebuild (did NOT restart fleet-shared :3100).

## ABSORBED-COMMIT note (attribution lost)
My staged 3 files (539 insertions, matching exactly) were swept into a CONCURRENT peer commit **`9cce7bb894`** ([MAIN-FORCE] [TOOL-LIBRARIES]/U-BRAND-CATALOG-CORE slot:romeo) -- the documented shared-tree hazard ([[feedback_commit_to_slot_worktree]]). Code is 100% intact in the tree, just mislabeled. Did not rewrite shared history. Lane note: `git-add-lane-guard` armed off chat-slots `india.branch=slot/india` (a derived `h:/prism-slot-india` scope, no real worktree); disarmed by patching `state/shared/chat-slots.json india.branch -> cad-fusion-live-ms0` (matches the fleet's MAIN-FORCE-on-shared-tree operating mode). The `PRISM_GIT_ADD_LANE_DISABLE=1` inline env does NOT reach the PreToolUse hook (reads harness env).

## iter3 latheAI reasoning route -- BUILT, scrutiny-FAILED, REVERTED (CORRECTED finding)
First diagnosis (iter2) said: just mount an engine-backed `/api/v1/ai/reasoning` route to `LatheAIUltraEngine.executeAction` returning `{result}`. I built exactly that (route + mount + 8 tests, all green, tsc clean). BOTH per-file scrutiny reviewers FAILED it -- and were right. **The mount does NOT unblock the frontend** -- `web/src/api/latheAI.ts` and `LatheAIUltraEngine` have **DIVERGENT contracts**:
- `getController` sends `{controller_id}` but engine reads `params.controller` -> 400 "Unknown controller: undefined".
- `compareControllers` sends `{controller_ids}`; engine reads `controller1`/`controller2`.
- `assistHardCode`/`generateMacro`/`translateNL`/`recommendCAM`/`deepReason` send flat/differently-named params; engine expects `context{}`/`macroType`/`command`/`operation{}`/`chainType`+`input`.
- `recommendCAM` is **un-bridgeable in the route** -- the client never sends `partDiameter_mm` the engine needs.
- the entire **`postAIApi` family (9 `post_ai_*` actions) has ZERO engine cases** -> all 400.
- my test masked it (used the engine's key `controller`, not the client's `controller_id`) -- a real R9 miss the reviewer caught.

**REVERTED** (removed route+test+mount; R12/R16 -- a route that 400s on most real calls is a false-"done"). The real fix is a **client<->engine contract reconciliation spanning whiskey (LatheAIUltraEngine param contract) + quebec (latheAI.ts client)** -- NOT a route adapter india can hack unilaterally. Lesson: a "frontend client calls unmounted route" gap is only a clean wire when the client's payload SHAPE matches the backend; verify the param contract both ways before claiming it unblocks the FE. (iter1 knowledge router WAS clean because the actions + params matched; this one was not.)
**Queued for whiskey+quebec:** reconcile latheAI.ts param names to LatheAIUltraEngine.executeAction (or add a per-action param-bridge + build the missing `post_ai_*` engine), THEN mount the route.

## India domain status (for "complete all india tasks")
India's own LoRA/GNN queue is **complete except 8 per-machine LoRA datasets legitimately blocked on peer slots dropping real actuals** (india can't fabricate -- R12; only lathe has rich in-repo real data, already done). 0 unwired AI engines (the 7 fleet-unwired are CAD/CAM bridges -> delta/kilo). So india pivoted to backend->frontend wiring per the work order.
