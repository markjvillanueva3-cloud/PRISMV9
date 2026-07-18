# AI-SYSTEMS-GNN/U-GNN-DEPLOY-STATUS-MCP — [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-DEPLOY-STATUS-MCP (slot:india): expose the GraphSAGE tier-5 deploy-gate verdict via prism_dev (pure read of NN-EVAL.json)

**Commit:** `a6b2664658b9` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T15:26:23-05:00
**Tags:** ai-systems-gnn, u-gnn-deploy-status-mcp, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-DEPLOY-STATUS-MCP (slot:india): expose the GraphSAGE tier-5 deploy-gate verdict via prism_dev (pure read of NN-EVAL.json)

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-GNN-DEPLOY-STATUS-MCP (slot:india): expose the GraphSAGE tier-5 deploy-gate verdict via prism_dev (pure read of NN-EVAL.json)

The GNN selective-deploy verdict (state/shared/nn-graph/NN-EVAL.json, written by
scripts/lib/nn-graph-eval.mjs runAssessment) was queryable only by reading the JSON or
running a script -- the hook reader classifyGnn surfaces it for the PSN-leg injection, but
there was NO MCP surface. This closes that R15 gap: GnnDeployStatusEngine is a PURE reader
that surfaces the already-graded verdict, wired to prism_dev:gnn_deploy_status.

CRITICAL (india doctrine): never re-grades, never inlines a gate threshold -- gates come from
the report's own `gates` field (the NO-INLINE test feeds gates 0.9 and asserts they surface,
failing on any hardcoded 0.78). Surfaces stored grade.pass / selective.deployGrade.pass +
operatingPoint + metrics + degeneracy + staleness. Fail-soft: a missing/garbage report is
data (found:false), never a throw.

VALIDATE (live numbers): the real NN-EVAL.json round-trips through prism_dev as auroc 0.7891,
gates {0.78,0.55,0.15}, fullCoverage "shipped-research-only", selective "deploy-ready-selective"
tau 0.7 coverage 0.2738 classes 2/13 -- matches the live PSN leg #10 exactly.

13/13 tests (pure classify x7 incl no-inline + non-object adversarial + staleness; readStatus
fail-soft x4; dispatcher round-trip x2). tsc clean. 2-arm scrutiny PASS (2 P2 clarity comments
applied: concentrated-placement vs classifyGnn; normalizeParams-no-alias dual-read). Dedup
verified (ToolLifeGnnEngine is a different tool-life GNN). Sibling hook-reader: classifyGnn.
```

## Files touched (4)
- mcp-server/src/__tests__/GnnDeployStatusEngine.test.ts | 234 +++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/GnnDeployStatusEngine.ts        | 282 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/devDispatcher.ts      |  20 ++++
- 3 files changed, 536 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a6b2664658b9`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-GNN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._