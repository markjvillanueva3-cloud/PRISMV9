# AI-SYSTEMS-GNN/U-REFPOOL-GROW-FIX-ESTIMATE — [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-REFPOOL-GROW-FIX-ESTIMATE (slot:india): scrutiny-caught mislabel -- prism_business:estimate -> estimate_create

**Commit:** `783615cd36f6` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T03:41:16-05:00
**Tags:** ai-systems-gnn, u-refpool-grow-fix-estimate, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-REFPOOL-GROW-FIX-ESTIMATE (slot:india): scrutiny-caught mislabel -- prism_business:estimate -> estimate_create

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-REFPOOL-GROW-FIX-ESTIMATE (slot:india): scrutiny-caught mislabel -- prism_business:estimate -> estimate_create

Per-file 2-arm scrutiny (reviewer + code-analyzer) BOTH FAILed U-REFPOOL-GROW-CLASSES
(348252bfec) on one entry: prism_business:estimate is a MISLABELED Tier-A positive. Bare
"estimate" exists in businessDispatcher.ts ONLY as an engine-loader key (case "estimate"
at :197 inside getEngine(name)), NOT in the dispatchable ACTIONS z.enum -- so
prism_business:estimate would Zod-reject. My original grep-only verification
(grep -c "estimate" -> 2) matched the engine-key, not a dispatchable action: grep
PRESENCE != DISPATCHABILITY (the exact poison the scrutiny gate exists to catch; a wrong
Tier-A label poisons the GNN).

FIX: prism_business:estimate -> prism_business:estimate_create -- dispatch-verified (in
ACTIONS enum businessDispatcher.ts:1560 AND top-level case :1962). The other 9 entries
were confirmed by BOTH arms as genuine dispatchable actions (cad feature_recognize/
geometry_create/mesh_generate, business quote_generate, intelligence job_plan/setup_sheet,
safety's 3 COLLISION_ACTIONS-set members routed via COLLISION_ACTIONS.has(action)). Still
37 entries, 4 new classes, JSON valid, policy preserved.

LESSON (compounding): refpool-growth verification must check ENUM-MEMBERSHIP +
top-level-case (dispatchability), not bare grep -- an engine-loader nickname can collide
with an action name. [[reference_gnn_pool_collapse_confidence_deflation_2026_06_15]] sibling.

[MAIN-FORCE]: fleet-AI india unit on the shared cad-fusion-live-ms0 tree.
```

## Files touched (2)
- state/shared/nn-graph/reference-pool-seed-2026-05-23.json | 2 +-
- 1 file changed, 1 insertion(+), 1 deletion(-)

## Lessons surfaced in commit body
- till
- LESSON (compounding): refpool-growth verification must check ENUM-MEMBERSHIP +

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 783615cd36f6`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-GNN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._