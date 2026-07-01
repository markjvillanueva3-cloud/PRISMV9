---
name: reference_india_queue_state_2026_06_22
description: "India AI-systems queue state after an exhaustive hunt (slot:india /loop 2026-06-22, 2nd loop this session). VERIFIED FINDING: the clean india-solo bounded build-queue is DRY -- engine-wiring audit shows 5 unwired total, NONE india's (AuthEngineV7/RegressionBaseline/PreMOU/IEngine-stub/SFCInferenceGateWire=oscar-in-flight); the 6 open-learning-loops are closed; the WEDM-neural train() R16 sibling is clean (no isTraining-stuck gap). India core VERIFIED GREEN: nn-graph-eval 80/80 + classifyGnn/nn-graph-health-inject 33/33. The ONE remaining india unit (GNN deploy-verdict MCP exposure) is a cross-layer DESIGN call, not a clean wire. Honest dry-queue, not idle -- hunted the full ladder."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.620Z
aliases: reference_india_queue_state_2026_06_22
---


# India AI-systems queue state -- exhaustive hunt (2026-06-22, 2nd loop)

After shipping the WEDM-neural transferLearn rollback (this session, earlier turn -> a895131184), the
follow-on /loop hunted the full india ladder for the next CLEAN bounded unit. Finding: the india-solo
clean queue is genuinely DRY. Documented so the next session does not re-walk the same dry rungs.

## What was hunted (the ladder)
1. **Engine-wiring ghosts (audit-unwired-engines.mjs):** 3825 engines, only **5 UNWIRED total**, NONE
   cleanly india's -- AuthEngineV7 (prism_auth), RegressionBaselineEngine + PreMOUKickoffChecklistEngine
   (infra/business, UNKNOWN dispatcher), IEngine (0kb interface stub), SFCInferenceGateWireEngine
   (prism_safety, mtime TODAY = oscar in-flight, safety-critical -> do NOT touch). Engine layer is clean.
2. **Open-learning-loops:** all 6 closed (Mill/Ensemble/Lathe-LoRA/PP-AGI/WEDM-neural-transfer +
   WEDM-neural-rollback). Remaining = 4 owner-design (CAM=kilo, CAD=delta, Quoting=charlie, Post=echo).
3. **R16 sibling check of the WEDM-neural fix:** `WEDMNeuralTrainingEngine.train()` (line ~2028) does
   NOT touch `isTraining` -- the flag is managed only by callers (transferLearn FIXED, setTrainingMode,
   reset). No isTraining-stuck-on-throw gap in train(); partial weight updates on a mid-train throw are
   acceptable for a learning engine. CLEAN -- no sibling bug.
4. **GNN selective-deploy (the surfaced PSN leg #10):** VERIFIED GREEN -- `scripts/lib/nn-graph-eval.mjs`
   80/80 (gradeSelectiveDeploy/selectiveDeployPoint/riskCoverageCurve/runAssessment) + the canonical
   reader `classifyGnn` in `.claude/hooks/nn-graph-health-inject.mjs` 33/33. The logic producing the live
   "AUROC 0.789, deploy-ready-selective @tau=0.7, 27% coverage" leg is sound.

## The ONE remaining india unit -- SCOPED for next session (NOT a clean wire; do deliberately)
**GNN deploy-verdict MCP exposure.** The selective-deploy API + classifyGnn are SCRIPT/HOOK-layer
(`scripts/lib/nn-graph-eval.mjs` + `.claude/hooks/nn-graph-health-inject.mjs`), NOT in `mcp-server/src`,
and are exposed through NO dispatcher (the dispatcher `gnn_*` actions are `tool_life_gnn_predict` in
dataDispatcher -- a DIFFERENT tool-life GNN, unrelated to the wiring-inference tier-5). So the GNN
deploy-gate verdict is queryable only by reading NN-EVAL.json / running a script, not via MCP.
- **Value:** india's mandate is "gate every promotion on REAL held-out metrics" -- making that verdict
  programmatically queryable via `prism_dev` is real R15 value.
- **Why it is NOT a quick iter (the architecture call):** a TS dispatcher in mcp-server/src cannot cleanly
  import the grading logic from scripts/ + .claude/hooks/ (layer boundary), and re-inlining GATE_THRESHOLDS
  is FORBIDDEN (india refuse-list: "never a re-inlined threshold"). CLEAN PATH (confirm first): a thin
  engine in mcp-server/src/engines that READS the already-graded NN-EVAL.json `deployGrade`/`checkpointMeta`
  and SURFACES it (no re-grading, no threshold inlining) -> wired to prism_dev + round-trip test. BEFORE
  building: verify NN-EVAL.json actually stores the final graded verdict (so it is a pure read, not a
  re-grade). If it does not, the unit needs runAssessment plumbing = bigger.

## Honest status (R12)
Not idle -- the full hunt ladder was walked. The clean india-solo bounded queue is dry; the remaining
india work is design-grade (GNN-MCP-exposure above) or compute-grade (GNN full-coverage = ref-pool growth
/ GPU retrain, high-variance per [[feedback_multiseed_before_auroc_claim]]). Per ANY-DOMAIN override india
may take fleet/cross-domain units next, but the cross-domain AI loops are owner-design (coordinate, do not
solo). Prior turn's WEDM-neural rollback: [[reference_wedm_neural_transfer_rollback_2026_06_22]].
Backlog: [[reference_india_open_loops_rescan_2026_06_22]].
