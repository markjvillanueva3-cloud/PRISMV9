# AI-SYSTEMS/U-SELFAWARE-COVERAGE-FILL-P1 — [MAIN-FORCE] [AI-SYSTEMS]/U-SELFAWARE-COVERAGE-FILL-P1 (slot:india): tighten getJMDieProgramPaths test to assert dir BASENAME (scrutiny P1 fix)

**Commit:** `a3e0117b28d5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T10:10:35-05:00
**Tags:** ai-systems, u-selfaware-coverage-fill-p1, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS]/U-SELFAWARE-COVERAGE-FILL-P1 (slot:india): tighten getJMDieProgramPaths test to assert dir BASENAME (scrutiny P1 fix)

## Body
```
[MAIN-FORCE] [AI-SYSTEMS]/U-SELFAWARE-COVERAGE-FILL-P1 (slot:india): tighten getJMDieProgramPaths test to assert dir BASENAME (scrutiny P1 fix)

Per-file scrutiny (test-review-agent) P1: the assertion checked the FULL path (p.toLowerCase().toContain('lathe')), which always contains the matched segment -- so it would NOT catch a regression from dir-name matching (engine line 857: e.toLowerCase().includes(q)) to full-path matching. Now extracts the last path segment and asserts the BASENAME contains the tag, matching the engine's real filter intent. 57/57 green. R9: test now fails if the filter logic regresses.
```

## Files touched (2)
- mcp-server/src/__tests__/PRISMSelfAwarenessEngine.test.ts | 7 ++++++-
- 1 file changed, 6 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a3e0117b28d5`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._