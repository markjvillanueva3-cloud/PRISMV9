# AI-SYSTEMS-NEURAL/U-UNCERTAINTY-PIPELINE-WIRE — [MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-UNCERTAINTY-PIPELINE-WIRE (slot:india): fix dark uncertainty_pipeline_run -> real propagate (4th/last india clean)

**Commit:** `82aa392d6adb` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T19:50:36-05:00
**Tags:** ai-systems-neural, u-uncertainty-pipeline-wire, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-UNCERTAINTY-PIPELINE-WIRE (slot:india): fix dark uncertainty_pipeline_run -> real propagate (4th/last india clean)

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-UNCERTAINTY-PIPELINE-WIRE (slot:india): fix dark uncertainty_pipeline_run -> real propagate (4th/last india clean)

aiReasoningDispatcher's uncertainty_pipeline_run was facade-wired to run/execute/process
(none exist on UncertaintyPropagationPipelineEngine) -> always "method not callable".
Real method = propagate(PipelineInput): AtomicValue<PipelineResult>.

Unlike the prior 3 india fixes, this engine did NOT self-validate -> propagate +
propagateMC/FOSM/PCE deref input.uncertain_params + input.stages with no guard (TypeError
on undefined). Per the proven pattern, added a SELF-GUARD clause at the top of propagate
(india owns the engine): throws if uncertain_params or stages is missing/empty -> every
caller fails loud, not crashes. Then rewired the dispatcher bare (no schema; engine
self-validates), dropping the facade's inner {success,data} double-wrap (AtomicValue is
now at data.value).

- engine: 2-line self-guard (additive; only rejects already-broken empty/missing input).
- dispatcher: rewire to propagate(...).
- test (3, via executeAIReasoningAction): real PipelineResult (method "mc", 2 StageResults,
  final.mean number, ci_95 array, sensitivities array); empty uncertain_params rejected;
  empty stages rejected.

REGRESSION-VERIFIED: 91/91 existing uncertainty engine tests pass (advanced-uncertainty
15 + advanced-uncertainty-methods 27 + chain-uncertainty-learning 49) -- the self-guard
does not affect valid-input callers. tsc 0 my files (16GB heap); 3/3 new.

ALL 4 verified india clean dark actions now FIXED (cross_domain/foresight/wet_run/
uncertainty). Remaining india dark = 4 ambiguous (need a type-discriminator decision) +
4 needs-build (no suitable engine method) -- NOT clean 1:1, queued for owner/operator
scoping. 72 cross-domain dark actions -> owning slots via DARK-FACADE-AUDIT backlog.
```

## Files touched (4)
- .../src/__tests__/aiReasoningDispatcher.uncertainty-pipeline-wire.test.ts   | 50 +++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/UncertaintyPropagationPipelineEngine.ts              | 11 ++++++++
- mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts                   |  7 ++++--
- 3 files changed, 66 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 82aa392d6adb`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-NEURAL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._