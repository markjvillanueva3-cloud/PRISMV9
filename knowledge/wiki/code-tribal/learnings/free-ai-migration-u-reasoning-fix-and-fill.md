# FREE-AI-MIGRATION/U-REASONING-FIX-AND-FILL — [MAIN-FORCE] [FREE-AI-MIGRATION]/U-REASONING-FIX-AND-FILL (slot:india): activate dormant reasoning subsystem -- fix 2 runtime bugs + wire prism_ai:inference_chain_run executor

**Commit:** `25d2482696a5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-20T19:21:00-05:00
**Tags:** free-ai-migration, u-reasoning-fix-and-fill, auto-distilled

## Subject
[MAIN-FORCE] [FREE-AI-MIGRATION]/U-REASONING-FIX-AND-FILL (slot:india): activate dormant reasoning subsystem -- fix 2 runtime bugs + wire prism_ai:inference_chain_run executor

## Body
```
[MAIN-FORCE] [FREE-AI-MIGRATION]/U-REASONING-FIX-AND-FILL (slot:india): activate dormant reasoning subsystem -- fix 2 runtime bugs + wire prism_ai:inference_chain_run executor

Operator chose "fix and fill gaps" on the audited (dormant-but-intended) reasoning layer
that sits atop the now-free Ollama-first parallelAPICalls substrate. Three closes:

BUG 1 -- prism_autopilot_d:brainstorm_lenses threw on every call: the dispatcher cast to a
  non-existent ap.brainstorm(). Added a real public AutoPilot.brainstorm(problem,context)
  (classifyTask + brainstormReal) + dropped the brainstorm gate's !hasValidApiKey() clause so a
  keyless run does the REAL 7-lens brainstorm for free (offline -> empty arrays, never fabricated).
  AutoPilot.ts + autoPilotDispatcher.ts.

BUG 2 -- AutoPilotV2.generatePlan referenced WORKING_TOOLS.calculations / WORKING_TOOLS.data,
  keys that never existed -> undefined.slice -> TypeError on every plan-gen for calculation /
  data_lookup tasks. Both -> WORKING_TOOLS.manufacturing (holds prism_data + prism_calc).

GAP -- prism_ai:inference_chain_run was a discovery-only stub (listChainTypes). Now a real executor:
  steps provided -> runInferenceChain through the free substrate (mode:"execute"); no steps -> the
  chain-type discovery list (mode:"discovery"). aiReasoningDispatcher.ts. InferenceChainEngine SCOPE
  NOTE corrected (was "DORMANT -- no dispatcher executor"; now LIVE via inference_chain_run).

Tests: src/__tests__/autopilot-inference-fix-and-fill.test.ts (6/6) -- each fails if its fix is
reverted (R9): brainstorm spy fires 7 lenses, generatePlan no longer throws + uses real tools,
inference_chain_run completes a real chain (status completed + final_output) vs the discovery list.
Prior FREE-AI substrate tests still green (5/5). tsc clean on all 6 edited files (sole repo tsc
error is the pre-existing peer InventorCADCodeGeneratorEngine:139). 2-arm scrutiny PASS/PASS, P2s
folded in (mode discriminant, dead optional-call, SCOPE NOTE, test hermeticity comment).

NOT in scope (surfaced, not silently changed): the execute()-path key gates (requireRealAPI@275 +
swarm@516 + ralph@590) still gate autopilot/autopilot_quick -- freeing those needs the swarm
provider chain verified free (separate unit). The bounds/explain dispatcher tests target actions
(ai_pac_sample_complexity/ai_vc_bound/ai_explain) absent from this dispatcher build = pre-existing
test-vs-dispatcher drift, unrelated to this change.
```

## Files touched (7)
- mcp-server/src/__tests__/autopilot-inference-fix-and-fill.test.ts | 143 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/InferenceChainEngine.ts                    |   7 +++---
- mcp-server/src/orchestration/AutoPilot.ts                         |  22 ++++++++++++++++-
- mcp-server/src/orchestration/AutoPilotV2.ts                       |   9 +++++--
- mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts         |  32 +++++++++++++++++++++----
- mcp-server/src/tools/dispatchers/autoPilotDispatcher.ts           |   4 +++-
- 6 files changed, 206 insertions(+), 11 deletions(-)

## Lessons surfaced in commit body
- till green (5/5). tsc clean on all 6 edited files (sole repo tsc
- till gate autopilot/autopilot_quick -- freeing those needs the swarm

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 25d2482696a5`
- Milestone envelope: `mcp-server/data/milestones/FREE-AI-MIGRATION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._