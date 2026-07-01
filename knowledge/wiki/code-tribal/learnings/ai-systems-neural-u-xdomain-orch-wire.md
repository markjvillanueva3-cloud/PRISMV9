# AI-SYSTEMS-NEURAL/U-XDOMAIN-ORCH-WIRE — [MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-XDOMAIN-ORCH-WIRE (slot:india): fix dark cross_domain_orchestrate -> real static planJob (1st from the verified india queue)

**Commit:** `964535033a2f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T19:35:31-05:00
**Tags:** ai-systems-neural, u-xdomain-orch-wire, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-XDOMAIN-ORCH-WIRE (slot:india): fix dark cross_domain_orchestrate -> real static planJob (1st from the verified india queue)

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-XDOMAIN-ORCH-WIRE (slot:india): fix dark cross_domain_orchestrate -> real static planJob (1st from the verified india queue)

First fix from the U-DARK-FACADE-INDIA-VERIFY clean queue. aiReasoningDispatcher's
`cross_domain_orchestrate` (line 4684) was facade-wired to orchestrate/plan/execute
(none exist on CrossDomainOrchestratorEngine) -> always "method not callable". The
real method is the static `planJob(OrchestrationInput): OrchestrationPlan`.

- rewire to `crossDomainOrchestratorEngine.planJob(...)` (the exported const IS the
  class; planJob is `static planJob = planJob`).
- NO dispatcher schema added: planJob SELF-VALIDATES via OrchestrationInputSchema.parse
  (features[].min(1)) and throws on bad input -> dispatcherError. (Unlike the fiveAxis
  fixes whose engines did not self-validate.)
- dropped the prior facade's inner {success,data} wrap: executeAIReasoningAction already
  adds the {success,data} envelope, so `result = planJob(...)` (bare) yields a clean
  data.plan_id (the old double-wrap put it at data.data; the action was dark so no
  consumer relied on the shape).
- 4 tests via executeAIReasoningAction: real multi-domain plan (plan_id/segments/
  schemaVersion 1.0.0/total_domains>=1); domain_pin override resolves to five_axis;
  empty-features rejected (engine self-validation); unknown feature type -> graceful
  unresolved_features (no crash).

tsc --noEmit 0 errors my files (16GB heap); 4/4 new; aiReasoning bijection test green
(no schema change). The pre-existing ai_route_mill_pipeline aluminum red is foxtrot's
(unrelated, documented). 3 india clean targets remain (uncertainty_pipeline_run,
foresight_orchestrate, wet_run_pilot_orchestrate) per DARK-FACADE-INDIA-FIXLIST.
```

## Files touched (3)
- mcp-server/src/__tests__/aiReasoningDispatcher.cross-domain-wire.test.ts | 57 ++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts                | 10 +++++--
- 2 files changed, 65 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 964535033a2f`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-NEURAL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._