# SIERRA-BACKEND/U-FE-ROUTE-P0-ZERO — [MAIN-FORCE] [SIERRA-BACKEND]/U-FE-ROUTE-P0-ZERO (slot:sierra): resolve all 22 mounted FE-route dispatcher-action P0s -> gate baseline 22->0

**Commit:** `0762bde969fb` · **By:** markjvillanueva3-cloud · **At:** 2026-06-20T20:39:51-05:00
**Tags:** sierra-backend, u-fe-route-p0-zero, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-BACKEND]/U-FE-ROUTE-P0-ZERO (slot:sierra): resolve all 22 mounted FE-route dispatcher-action P0s -> gate baseline 22->0

## Body
```
[MAIN-FORCE] [SIERRA-BACKEND]/U-FE-ROUTE-P0-ZERO (slot:sierra): resolve all 22 mounted FE-route dispatcher-action P0s -> gate baseline 22->0

7 renamed-action REWIRES to the real action (engine-handler params verified, no silent 200+{error}):
- milling.ts prism_calc:speed_feed_calc -> speed_feed (canonical calc action)
- erp.ts troubleshoot_diagnose prism_manufacturing -> prism_knowledge (action lives there; tool-name fix)
- erp.ts kaizen_list -> kaizen_list_suggestions (/kaizen-suggestions; passthrough req.query)
- erp.ts top_customers -> jm_db_top_customers (n??limit??10 default)
- erp.ts academy_curriculum(student_dashboard) -> academy_dashboard
- erp.ts academy_curriculum(complete_lesson) -> academy_complete_lesson
- pipeline.ts roi_advisor -> roi_advisor_analyze (ROIAdvisorEngine.analyze, defaulted params)

15 genuinely-absent dispatcher actions -> honest 501 (admin.ts doctrine; message names the missing
action + owner so the build path is explicit; kills the silent 200+{error} footgun the SPA cannot detect):
- erp.ts: value_stream_map, dispatch_board, root_cause_list, a3_report_list, a3_report_get,
  cash_flow_summary, operations_kpis, margin_trends, oee_six_losses, timecard_audit_log (owner: hotel/ERP)
- manus.ts: web_research, code_sandbox (prism_manus exposes code_reasoning+knowledge_lookup only)
- orchestration.ts: unified_execute/classify/route (unified PUOA never built; agent_*/swarm_*/plan_* exist)

EVAL: audit-fe-route-action-contract.mjs --p0-only = 0 P0 (was 22), CLEAN:true. fe-route-contract-gate.test.ts 3/3.
tsc --noEmit: 0 errors in the 5 route files (project total still 1, the pre-existing untouched
InventorCADCodeGeneratorEngine error). KNOWN_MOUNTED_P0 baseline emptied -> ratchet now enforces ZERO.
Follow-up (queued, owner hotel): build the 10 absent prism_business read actions; the 501s name each.
```

## Files touched (7)
- mcp-server/src/__tests__/fe-route-contract-gate.test.ts |   33 +-
- mcp-server/src/routes/erp.ts                            | 1100 +++++++++++++++++++++++++++----------------------------
- mcp-server/src/routes/manus.ts                          |   14 +-
- mcp-server/src/routes/milling.ts                        |    2 +-
- mcp-server/src/routes/orchestration.ts                  |   31 +-
- mcp-server/src/routes/pipeline.ts                       |    2 +-
- 6 files changed, 571 insertions(+), 611 deletions(-)

## Lessons surfaced in commit body
- lesson) -> academy_complete_lesson
- till 1, the pre-existing untouched

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0762bde969fb`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-BACKEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._