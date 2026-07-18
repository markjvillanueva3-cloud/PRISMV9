# AI-SYSTEMS-NEURAL/U-SMARTTOOL-ORCH-WIRE — [MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-SMARTTOOL-ORCH-WIRE (slot:india): fix dark smart_tool_select -> real selectToolOrchestrated (was mis-flagged ambiguous; verified clean)

**Commit:** `29af45fc1226` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T19:57:31-05:00
**Tags:** ai-systems-neural, u-smarttool-orch-wire, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-SMARTTOOL-ORCH-WIRE (slot:india): fix dark smart_tool_select -> real selectToolOrchestrated (was mis-flagged ambiguous; verified clean)

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-NEURAL]/U-SMARTTOOL-ORCH-WIRE (slot:india): fix dark smart_tool_select -> real selectToolOrchestrated (was mis-flagged ambiguous; verified clean)

The verify pass tiered smart_tool_select "ambiguous" (it appears in BOTH camDispatcher
+ orchestrationDispatcher). Sound-logic re-verification (operator: "use sound logic"):
the two are DISTINCT capabilities, not a dup to remove --
  - prism_cam:smart_tool_select -> smartToolSelectorEngine.select() (raw candidate list)
  - prism_orchestrate:smart_tool_select -> SmartToolSelectorOrchestratorAdapter.selectToolOrchestrated()
    (the ORCHESTRATED variant: candidates + a pipeline decision)
Two dispatchers exposing related-but-different capabilities under one name is fine
(precedent: xproc_orchestrate_full lives in both aiReasoning + intelligence). So the
orchestration dark surface is a CLEAN fix, not a decision.

- rewire to selectToolOrchestrated. No crash-guard: the adapter destructures req + returns
  {no_candidates:true} gracefully when nothing matches (verified), never crashes on {}.
- mock-server test (2): realistic 4140/milling request -> orchestrated shape
  (decision/smart_result/no_candidates, never method-not-callable); unmatchable request
  -> graceful no_candidates (not a crash/stub).

tsc 0 my files (16GB heap); 2/2. india dark progress: 5 clean fixed (4 verified-clean +
this re-verified). Remaining india dark: 3 ambiguous (mit_course_knowledge_query/
sampling_plan_generate/roadmap_dag_build) -- verifying each before accepting "ambiguous"
(smart_tool_select proves the tier can contain clean fixes) -- + 4 needs-build.
```

## Files touched (3)
- mcp-server/src/__tests__/orchestrationDispatcher.smarttool-wire.test.ts | 62 +++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/orchestrationDispatcher.ts             |  8 ++++--
- 2 files changed, 68 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 29af45fc1226`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-NEURAL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._