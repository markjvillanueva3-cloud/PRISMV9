# AI-REASONING-FIX/U-AIDISPATCH-TSC-CLEAN — [MAIN-FORCE] [AI-REASONING-FIX]/U-AIDISPATCH-TSC-CLEAN (slot:india): fix 2 tsc errors in aiReasoningDispatcher -- vestigial experience-param type mismatch + meta_learning_recommend duplicate-scenario spread

**Commit:** `e1339d9553eb` · **By:** markjvillanueva3-cloud · **At:** 2026-06-20T23:11:39-05:00
**Tags:** ai-reasoning-fix, u-aidispatch-tsc-clean, auto-distilled

## Subject
[MAIN-FORCE] [AI-REASONING-FIX]/U-AIDISPATCH-TSC-CLEAN (slot:india): fix 2 tsc errors in aiReasoningDispatcher -- vestigial experience-param type mismatch + meta_learning_recommend duplicate-scenario spread

## Body
```
[MAIN-FORCE] [AI-REASONING-FIX]/U-AIDISPATCH-TSC-CLEAN (slot:india): fix 2 tsc errors in aiReasoningDispatcher -- vestigial experience-param type mismatch + meta_learning_recommend duplicate-scenario spread

Two TS errors in prism_ai's dispatcher (build was RED):
1. TS2345 ai_recommend_capability (L5286): my iter-12 dev-loop restore (d054aa5b91) re-added this case verbatim from the pre-clobber ancestor, passing ctx={experienceLevel:...} to AIAutoUtilizationEngine.analyze(input, ctx?: Partial<UserContext>). But the CURRENT UserContext has NO experienceLevel field (only recent_files/recent_engines/domain_focus/session_goals/error_history) -- so the cast failed type-check AND analyze would drop it (silent no-op). Honest fix (R12): dropped the vestigial `experience` param from the ai_recommend_capability schema and simplified the case to analyze(input). Documented inline that experience-aware context returns only after UserContext gains the field. Test (input-only happy path + empty-input rejection) unaffected.
2. TS2783 meta_learning_recommend (L2454): { scenario: p.scenario, recommendation, ...recommendation } -- the spread re-specifies scenario, overwriting the explicit one. Reordered to { recommendation, ...recommendation, scenario: p.scenario } so the explicit p.scenario is authoritative (recommend(p.scenario) returns a rec whose scenario === p.scenario, so behavior is identical; p.scenario is now the source of truth and tsc is satisfied).

VERIFY: tsc 0 errors (was 2 india errors + 1 flickering InventorCAD incremental-cache artifact, all clear in a clean run); aiReasoningDispatcher.test.ts 48/49 (only pre-existing foxtrot ai_route_mill_pipeline RED, untouched -- handed to foxtrot via chat bus); no assertion weakened; schema "all actions" + count(424) guards green.
```

## Files touched (3)
- mcp-server/src/schemas/aiReasoningActionSchemas.ts        |  1 -
- mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts | 14 +++++++++-----
- 2 files changed, 9 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- tilizationEngine.analyze(input, ctx?: Partial<UserContext>). But the CURRENT UserContext has NO experienceLevel field (only recent_files/recent_engines/domain_focus/session_goals/error_history) -- so the cast failed type-check AND analyze would drop it (silent no-op). Honest fix (R12): dropped the vestigial `experience` param from the ai_recommend_capability schema and simplified the case to analyze(

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e1339d9553eb`
- Milestone envelope: `mcp-server/data/milestones/AI-REASONING-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._