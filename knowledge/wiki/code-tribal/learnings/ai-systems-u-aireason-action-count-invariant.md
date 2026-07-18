# AI-SYSTEMS/U-AIREASON-ACTION-COUNT-INVARIANT — [MAIN-FORCE] [AI-SYSTEMS]/U-AIREASON-ACTION-COUNT-INVARIANT (slot:india): replace brittle magic-count test with structural enum<->schema invariant

**Commit:** `6eeebd9642a7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T15:12:26-05:00
**Tags:** ai-systems, u-aireason-action-count-invariant, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS]/U-AIREASON-ACTION-COUNT-INVARIANT (slot:india): replace brittle magic-count test with structural enum<->schema invariant

## Body
```
[MAIN-FORCE] [AI-SYSTEMS]/U-AIREASON-ACTION-COUNT-INVARIANT (slot:india): replace brittle magic-count test with structural enum<->schema invariant

aiReasoningDispatcher.test.ts asserted toHaveLength(424) on AI_REASONING_ACTIONS, but the fleet wired +2 actions (real count 426) so the test went red -- a magic-count test that breaks on every legitimate addition (already bumped once). R9 fix: encode the real intent as a structural invariant -- no duplicate actions (Set size == length), bijective with the schema map (schemaKeys.length == actions.length; verified live 426==426, 0 dups, 0 orphans, 0 schemaless), and a regression floor (>=426 baseline) so additions pass but a lost/dropped action still fails. NOT a weakening: catches dups, orphans, schemaless actions, and mass-loss that the frozen number never did, and never needs a manual bump again. The remaining red in this file (ai_route_mill_pipeline data.success:false) is PROVABLY owner-blocked to foxtrot -- india's dispatcher routing is correct (aiReasoningDispatcher.ts:1496-1535, maps params + handles NotWiredError); the success:false originates in MillMasterOrchestratorFacadeEngine (mill domain).
```

## Files touched (2)
- mcp-server/src/__tests__/aiReasoningDispatcher.test.ts | 13 +++++++++++--
- 1 file changed, 11 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- till fails. NOT a weakening: catches dups, orphans, schemaless actions, and mass-loss that the frozen number never did, and never needs a manual bump again. The remaining red in this file (ai_route_mill_pipeline data.success:false) is PROVABLY owner-blocked to foxtrot -- india's dispatcher routing is correct (aiReasoningDispatcher.ts:1496-1535, maps params + handles NotWiredError); the success:false

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6eeebd9642a7`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._