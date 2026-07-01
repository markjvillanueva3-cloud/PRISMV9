---
name: reference_gnn_deploy_status_mcp_2026_06_22
description: "GNN deploy-gate verdict is now consumable via MCP (slot:india, commit a6b2664658). GnnDeployStatusEngine -- a PURE reader of state/shared/nn-graph/NN-EVAL.json -- wired to prism_dev:gnn_deploy_status. Closes the R15 gap where the selective-deploy verdict (produced by nn-graph-eval.runAssessment, surfaced by the classifyGnn hook for PSN injection) had NO MCP surface. Never re-grades, never inlines a threshold (gates read from the report's own gates field). Live-validated: auroc 0.7891, selective deploy-ready @tau=0.7 coverage 0.2738 classes 2/13. 13/13 tests, tsc clean, 2-arm scrutiny PASS. This was the scoped next unit from reference_india_queue_state_2026_06_22 -- now SHIPPED."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.590Z
aliases: reference_gnn_deploy_status_mcp_2026_06_22
---


# GNN deploy-verdict MCP exposure -- SHIPPED (slot:india /loop 2026-06-22, commit a6b2664658)

The scoped next-unit from [[reference_india_queue_state_2026_06_22]] -- built end-to-end this session
when the operator said "build" (ultracode on). India-core R15: wire the built selective-deploy
capability to the MCP surface so the GNN deploy verdict is programmatically queryable.

## The gap (R15)
`scripts/lib/nn-graph-eval.mjs::runAssessment` writes the GNN tier-5 deploy-gate verdict to
`state/shared/nn-graph/NN-EVAL.json`; the hook reader `.claude/hooks/nn-graph-health-inject.mjs::classifyGnn`
surfaces it for the per-prompt PSN-leg #10 injection. But the verdict was queryable ONLY by reading the
JSON or running a script -- NO MCP surface. A consumer (a chat, a tool, system-viz) could not ask
"is tier-5 deploy-ready? at what AUROC/Brier/coverage?" through prism_*.

## The build (3 files, commit a6b2664658)
- **`mcp-server/src/engines/GnnDeployStatusEngine.ts`** (NEW, 282 lines) -- PURE reader. `classify(report)`
  surfaces stored fields; `readStatus(opts)` reads NN-EVAL.json fail-soft (missing/garbage -> `{found:false}`,
  never throws). Surfaces: deferred, graded (structural), metrics{auroc,macroF1,brier,accuracy},
  pretextAuroc (deferred-only checkpointMeta link-pred signal, labeled), gates (STORED thresholds),
  fullCoverage{pass,verdict,failures}, selectiveDeploy{ready,verdict,productionGate,robustAboveGate,
  concentrated,globalAuroc,operatingPoint}, degeneracy, assessedAt + stalenessMs.
- **`mcp-server/src/tools/dispatchers/devDispatcher.ts`** (+20) -- action `gnn_deploy_status` (ACTIONS enum
  + case). Optional `eval_path` override (dual-read: normalizeParams does NOT alias eval_path). `{success:true,data}`.
- **`mcp-server/src/__tests__/GnnDeployStatusEngine.test.ts`** (NEW, 234 lines) -- 13 tests.

## CRITICAL invariant (india doctrine -- the reason this was a careful build, not a quick wire)
NEVER re-grades, NEVER inlines a gate threshold. The `gates` come from the report's OWN `gates` field
(NN-EVAL.json stores `gates:{auroc:0.78,macroF1:0.55,brier:0.15}`). The verdicts (`grade.pass`,
`selective.deployGrade.pass`) are STORED by runAssessment and surfaced as-is. The NO-INLINE test feeds a
fixture with `gates:{auroc:0.9,...}` and asserts they surface (failing on any hardcoded 0.78). Sibling
hook-reader: classifyGnn (same source, hook surface). Documented divergence: classifyGnn reshapes
`concentrated` INTO its operatingPoint; this engine surfaces it at the deployGrade level (matching the
JSON schema) -- a cross-ref comment locks it so consumers read the right path.

## VALIDATE (live, with numbers -- R15)
The real NN-EVAL.json round-trips through prism_dev: `auroc 0.7891`, `gates {0.78,0.55,0.15}`,
`fullCoverage "shipped-research-only"`, `selective "deploy-ready-selective" tau 0.7 coverage 0.2738
classes 2/13`, staleness 120.7h. Matches the live PSN leg #10 exactly.

## Verification
13/13 tests (pure classify x7 incl no-inline + non-object adversarial + staleness; readStatus fail-soft
x4; dispatcher round-trip x2). tsc clean. 2-arm scrutiny PASS (code-analyzer + reviewer, both PASS,
2 P2 clarity comments applied). Dedup verified (ToolLifeGnnEngine is a different tool-life GNN). The
ultracode verification Workflow was fanout-gate-capped (8 agents > cap 12) -> fell back to the mandated
2-arm per-file scrutiny with comprehensive briefs.

## Lane note
Committed FAST to the shared cad-fusion-live-ms0 tree via node-wrapper -> landed with CORRECT attribution
this time (commit a6b2664658, 3 files, no peer absorption) -- unlike the prior WEDM fix that got swept
into a peer git-add-all. The fast-commit-after-build + cleared sequencer is the working mitigation when
the slot worktree H:/prism-slot-india is not set up. Prior session work: [[reference_wedm_neural_transfer_rollback_2026_06_22]].
