# AI-SYSTEMS/U-INCRLEARN-STALE-MODEL-TAG — [MAIN-FORCE] [AI-SYSTEMS]/U-INCRLEARN-STALE-MODEL-TAG (slot:india): fix stale IncrementalLearningEngine test -- retired qwen2.5-coder:7b -> rot-proof family match

**Commit:** `e2a41e1af978` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T10:48:52-05:00
**Tags:** ai-systems, u-incrlearn-stale-model-tag, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS]/U-INCRLEARN-STALE-MODEL-TAG (slot:india): fix stale IncrementalLearningEngine test -- retired qwen2.5-coder:7b -> rot-proof family match

## Body
```
[MAIN-FORCE] [AI-SYSTEMS]/U-INCRLEARN-STALE-MODEL-TAG (slot:india): fix stale IncrementalLearningEngine test -- retired qwen2.5-coder:7b -> rot-proof family match

Root cause (R12, deterministic failure on the unswept root india tests): 'prepareJob writes manifest + job record when threshold met' asserted r.manifest.baseModel === 'qwen2.5-coder:7b', but the engine's DEFAULT_BASE_MODEL is 'qwen2.5-coder:32b' (IncrementalLearningEngine.ts:132) -- the :3b/:7b/:14b tags were RETIRED 2026-06-04 (Blackwell migration, per CLAUDE.md TOKEN ECONOMY). The ENGINE is correct (uses the current canonical heavy-code model); the TEST expectation rotted.

Fix (R9, test-only -- engine untouched): assert toMatch(/^qwen2\.5-coder:\d+(\.\d+)?b$/) -- verifies a valid coder base model (family + size tag) flows into the manifest, matches :32b/:1.5b/future sizes, and will NOT re-rot on the next size migration (the prior hardcoded :7b rotted silently in the unswept root test set). 14/14 green; found via NEVER-IDLE rung-3 sweep of pure-india root tests.
```

## Files touched (2)
- mcp-server/src/__tests__/IncrementalLearningEngine.test.ts | 7 ++++++-
- 1 file changed, 6 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e2a41e1af978`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._