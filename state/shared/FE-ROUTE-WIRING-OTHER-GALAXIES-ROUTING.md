# FE-route action wiring — remaining galaxies routing (slot:sierra, 2026-06-19)

Continuation of the FE-route action-contract campaign ("do wiring for other galaxies"). The verifier
`scripts/audit-fe-route-action-contract.mjs` found mounted+unmounted routers calling **non-existent**
dispatcher actions (-> silent HTTP 200 + {error}). Sierra wired everything cleanly in-reach; the 5
files below are **ascii-guard-blocked mature files in other domains** (a 2-line fix would force a risky
full ASCII rewrite) and/or need domain-owner judgment. Each call is researched below — owners apply.

## Already wired by sierra (verified, committed)
- **vibration.ts** (`7597992f31`): stability-lobes->`chatter_stable_rpm_recommend`, chatter->`regenerative_chatter_predict`, damping->`vibration_dampening_calculate`, modal->501.
- **cncOps.ts** (`e5a045e8f6`): assemble->`prism_cam:program_assemble`, magazine->`prism_cam:cam_tool_magazine`, setup-sheet->`prism_cam:setup_sheet_generate`, motion-profile->501.
- **cost.ts** (`93dcf472bb`, U-FE-COST-ACTION-FIX): the LAST 2 mounted P0s. `/compare`->501 (no cost_compare; shop_compare needs `{scenarios}` + no live caller commits a shape) + `/history/:jobId`->501 (no job-scoped cost_history; erp_cost_history returns GLOBAL cost-feedback, ignores jobId -> wiring it silently drops the filter). +cost-route-contract.test.ts 5/5. 3-of-3 PASS.
- Earlier mounted P0s: auth, safety, quality, schedule, export, admin.

## STATUS (CORRECTED 2026-06-19, R12): the "0 P0" reading was a VERIFIER BLIND SPOT -- TRUE count is **22 LIVE mounted P0s**.
The earlier "mounted-P0 19->0 / clean" was measured while `stripComments` had a block-before-line comment bug (fixed in U-FE-VERIFIER-STRIPCOMMENTS-FIX) that deleted 58 of 75 router import lines from `index.ts`, so `mountedRouterFiles` saw only 17 routers and mis-graded the other 58's P0s as INFO/unmounted. The 3-of-3 analyst arm caught it. Verifier now sees the true 75-router mounted surface.

**TRUE audit: `--p0-only` = 22 mounted P0 / 0 INFO / 0 unverifiable.** The visible-17 fixes (auth/safety/quality/admin/schedule/export/cost/vibration/cncOps) were GENUINE. The 22 below are LIVE silent 200+{error} footguns (NOT "unmounted, lower priority" -- that was the blind mis-grade). All 5 routers confirmed `app.use`'d in index.ts (erp:167, orchestration:177, manus:198, pipeline:206, milling:266).

These 22 are now the documented baseline in `mcp-server/src/__tests__/fe-route-contract-gate.test.ts` (KNOWN_MOUNTED_P0) -- the gate blocks NEW P0s and ratchets down as each is fixed. Fix = wire the real action OR honest 501, then delete that line from the baseline in the same PR.

### The 22 LIVE mounted P0s (owner -> fix plan)
- **erp.ts (14, owner hotel):** `prism_knowledge:academy_curriculum`, `prism_business:{kaizen_list,value_stream_map,dispatch_board,root_cause_list,a3_report_list,a3_report_get,cash_flow_summary,top_customers,operations_kpis,margin_trends,oee_six_losses,timecard_audit_log}`, `prism_manufacturing:troubleshoot_diagnose` (tool doesn't exist). All actions GENUINELY ABSENT -> honest 501 now (no owner judgment needed to 501), build real later.
- **manus.ts (2):** `prism_manus:{web_research,code_sandbox}` absent (manus has 11 actions) -> 501.
- **orchestration.ts (3):** `prism_orchestrate:{unified_execute,unified_classify,unified_route}` absent (71 actions; closest plan_execute/conversation_classify_segment/local_model_route are stretches) -> 501.
- **milling.ts (1, owner foxtrot):** `prism_calc:speed_feed_calc` absent (prism_calc has 1475 actions -- find the REAL speed/feed action, likely exists; lookup before 501).
- **pipeline.ts (1):** `prism_business:roi_advisor` absent -> 501.

## CORRECTION (2026-06-19, slot:sierra): ascii-guard does NOT block surgical ASCII-only edits.
Earlier this campaign assumed ascii-guard blocks editing ANY file containing pre-existing non-ASCII (em-dashes), forcing risky full rewrites -> the 5 files below were routed to owners on that basis. **That was wrong.** cost.ts (10 non-ASCII lines) was fixed with a surgical ASCII-only Edit with NO block. ascii-guard only rejects NEW non-ASCII content in your diff. **So the UNMOUNTED files below (orchestration/pipeline/manus + erp.ts's mappable subset) CAN be fixed by surgical ASCII edits directly** -- they were deferred only for being UNMOUNTED (INFO, not frontend-blocking) + needing domain-owner semantic judgment on absent business actions, NOT for ascii-guard.

## RULE for every fix (arm-C lesson [[feedback_route_fix_verify_param_contract]])
All 5 target dispatchers STRICT-validate (`validateActionParams`). For a POST route forwarding
`req.body`, the SPA owns the param shape -> mapping to the real action is safe. For a GET-`{}` or
GET-query route, the chosen action's Zod schema MUST accept those params (else 200+{error} again) —
verify the schema in `mcp-server/src/schemas/<domain>ActionSchemas.ts` before mapping; else honest 501.

---

## cost.ts — owner: charlie (quoting). MOUNTED (the last 2 LIVE P0s). 10 non-ASCII lines.
- `POST /compare` -> `cost_compare` (absent). Candidate: **`prism_intelligence:shop_compare`** (POST body; verify it compares cost scenarios, not just shops) OR `machine_compare_upgrade_outsource`. If neither fits -> 501.
- `GET /history/:jobId` -> `cost_history` (absent). Candidate: **`prism_intelligence:erp_cost_history`** — but it is a GET passing `{ jobId }`; intelligence strict-validates, so CONFIRM erp_cost_history's schema accepts `{ jobId }`/`{ job_id }` (map the field) before wiring, else 501. (arm-C trap.)

## erp.ts — owner: hotel (business/ERP). UNMOUNTED. 33 non-ASCII lines, 14 broken inline calls.
The flagged `prism_business` actions are GENUINELY ABSENT (confirmed: 0 files; businessDispatcher uses `const ACTIONS=[...]`+z.enum, parser-complete). They are real FEATURES whose actions were never built/renamed. Hotel: build the real action OR map to the correct existing name OR 501. Per call:
- `prism_knowledge:academy_curriculum` (x2, lines 209/219) -> candidate `academy_courses` / `learn_curriculum_*` (verify).
- `prism_manufacturing:troubleshoot_diagnose` (275) -> **prism_manufacturing TOOL DOES NOT EXIST** — reroute to the real diagnosis dispatcher or 501.
- `prism_business`: `kaizen_list`(242), `value_stream_map`(252), `dispatch_board`(258), `root_cause_list`(266), `a3_report_list`(281), `a3_report_get`(288), `cash_flow_summary`(297), `top_customers`(303), `operations_kpis`(309), `margin_trends`(315), `oee_six_losses`(348), `timecard_audit_log`(358) — all absent from the 1041-action dispatcher. Find the real names (e.g. kaizen_list->kaizen_get/_summary?) or build + 501 meanwhile. NOTE: `operations_kpis` is a GET-`{}` (line 309) -> needs a `{}`-accepting action.

## orchestration.ts — owner: ? (orchestration). UNMOUNTED. 30 non-ASCII lines.
- `unified_execute`/`unified_classify`/`unified_route` (all absent on prism_orchestrate, 71 actions). Closest existing: `plan_execute`/`agent_execute`/`swarm_execute` (execute), `conversation_classify_segment` (classify), `local_model_route` (route) — all semantic STRETCHES. Recommend 501 with these candidates unless the owner confirms intent.

## pipeline.ts — owner: ? (pipeline). UNMOUNTED. 12 non-ASCII lines.
- `prism_business:roi_advisor` (absent). Candidate: search prism_business for `roi_*` / `roi_analysis`; else 501.

## manus.ts — owner: ? (manus integration). UNMOUNTED. 1 non-ASCII line (header em-dash).
- `prism_manus:web_research` -> NO candidate (manus has 11 actions; nearest `code_reasoning`) -> 501.
- `prism_manus:code_sandbox` -> candidate `code_reasoning` (stretch) or 501.

---
Re-verify after any fix: `node scripts/audit-fe-route-action-contract.mjs --p0-only` (target 0 P0).
Wire the verifier as a permanent CI/Stop gate: `node scripts/audit-fe-route-action-contract.mjs --fail-on-p0`.
