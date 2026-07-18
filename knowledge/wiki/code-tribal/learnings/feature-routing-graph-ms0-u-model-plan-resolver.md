# FEATURE-ROUTING-GRAPH-MS0/U-MODEL-PLAN-RESOLVER — [MAIN-FORCE] [FEATURE-ROUTING-GRAPH-MS0]/U-MODEL-PLAN-RESOLVER (slot:alpha): structured model-routing resolver + $0 cloud fallback ladder -- folds the fleet's live Ollama/CLOUD-OVERFLOW-MS0 work into the graph

**Commit:** `da42da43b03c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T21:25:24-05:00
**Tags:** feature-routing-graph-ms0, u-model-plan-resolver, auto-distilled

## Subject
[MAIN-FORCE] [FEATURE-ROUTING-GRAPH-MS0]/U-MODEL-PLAN-RESOLVER (slot:alpha): structured model-routing resolver + $0 cloud fallback ladder -- folds the fleet's live Ollama/CLOUD-OVERFLOW-MS0 work into the graph

## Body
```
[MAIN-FORCE] [FEATURE-ROUTING-GRAPH-MS0]/U-MODEL-PLAN-RESOLVER (slot:alpha): structured model-routing resolver + $0 cloud fallback ladder -- folds the fleet's live Ollama/CLOUD-OVERFLOW-MS0 work into the graph

Operator (2026-06-18): 'they're all working on ollama models -- update the graph relative
to what they're working on' + bravo's work-request to fold the cloud/16-model reality in.

The prose Model column now has a machine-checkable structured TWIN, single-sourced from
MODEL_IDS, emitted into feature-routing-graph.json (modelIds/modelPlans/fallbackLadder):
- resolveModelPlan(taskClass): reasoning=ALWAYS Opus (claude-opus-4-8, never a local/cloud
  reasoner); coding=Sonnet @ max (claude-sonnet-4-6) + LOCAL coder ensemble
  (qwen2.5-coder:32b + qwen3-coder:30b combined), Opus escalation-only. R12 honesty:
  coding.localEnsembleWired:false -- the live octopus picker seats gpt-oss:120b + ONE coder,
  NOT two (verified vs MultiModelConsensusEngine.pickBestOllamaModel); needs a coding-aware
  picker or a deepseek-coder pull.
- FALLBACK_LADDER (spec twin of model-routing-policy/ollama-task-offloader/smart resolveExecutor,
  R8 mirror-not-reimplement): Ollama-free -> $0 OpenRouter nemotron-3-super-120b-a12b:free (1M,
  READ-only) -> cheap-Claude -> Opus. Rules: cloud READ-only (CLOUD_VETO keeps codegen on
  Claude -> 'deepseek-coder cloud-if-free' needs a codegen-capable rung), safety NEVER egresses,
  candidates gated by assess-cloud-candidate.mjs.
- assertModelRoleCoherence() (injectable, fail-loud; wired into the generator) keeps the
  structured map from drifting off the prose modelTier.
- modelPolicyDrift() operationalizes the surfaced R7 conflict (declared Sonnet coding policy
  vs a live router that routes build/fix -> Opus) into a detectable signal -- evidence, not
  assertion, without touching india's router.

65/65 lib tests (+14: reasoning-Opus/coding-Sonnet+coders/never-opus-coder/mechanical/mixed/
unknown-null, ladder, cloud READ-only, drift true+false+null, coherence THROW path via DI for
every branch, nested-array freeze). prompt-route-inject 33/33 (no consumer regression).
Per-file 2-arm scrutiny PASS (arm A 0 findings; arm B 2 P2s -- weak THROW-path test + shallow
freeze -- both fixed in-loop, R16). Spec FEATURE-ROUTING-GRAPH.md sec.1d documents it.

Wiki/memory follow-up in handoff.
```

## Files touched (6)
- scripts/generate-feature-routing-graph.mjs  |  13 +++++++-
- scripts/lib/feature-routing-graph.mjs       | 196 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/feature-routing-graph.test.mjs  | 151 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/feature-routing-graph.json     | 239 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/specs/FEATURE-ROUTING-GRAPH.md |  21 ++++++++++++
- 5 files changed, 619 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show da42da43b03c`
- Milestone envelope: `mcp-server/data/milestones/FEATURE-ROUTING-GRAPH-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._