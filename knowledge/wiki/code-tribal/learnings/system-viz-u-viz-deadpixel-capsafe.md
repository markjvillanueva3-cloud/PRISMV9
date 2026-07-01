# SYSTEM-VIZ/U-VIZ-DEADPIXEL-CAPSAFE — [MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-DEADPIXEL-CAPSAFE (slot:sierra): fix dead-pixel-guard raw 875MB-graph utf8 parse (string-cap crash class)

**Commit:** `05a57c501266` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T21:47:10-05:00
**Tags:** system-viz, u-viz-deadpixel-capsafe, auto-distilled

## Subject
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-DEADPIXEL-CAPSAFE (slot:sierra): fix dead-pixel-guard raw 875MB-graph utf8 parse (string-cap crash class)

## Body
```
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-DEADPIXEL-CAPSAFE (slot:sierra): fix dead-pixel-guard raw 875MB-graph utf8 parse (string-cap crash class)

dead-pixel-guard.mjs raw-parsed the ~875MB merged system-graph.json via JSON.parse(readFileSync(...,utf8)) -- the V8 512MiB string-cap crash class (caught by broadening the raw-graph-parse probe into .claude/hooks, which the scripts/-scoped guard did not cover). It is an UNWIRED orphan with a try/catch, so it soft-skipped silently rather than hard-crashing, but its dead-pixel analysis has been non-functional since the graph crossed 512MiB. Fix: cap-safe readGraphStreaming (graph-io.mjs, off-heap Buffer-incremental) + a 150MB size-gate that soft-skips gracefully instead of OOMing under the ~384MB hook-heap cap ([[windows-commit-reservation-hook-heap]]) -- now safe to wire. LIVE: soft-skips the 834MB graph (exit 0, no crash); re-probe of .claude/hooks+helpers+mcp-server/scripts = 0 violations.
```

## Files touched (4)
- mcp-server/src/__tests__/cadDispatcher.incad-infer-faillaud.test.ts | 99 +++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/PerAppInCADInferenceAdapter.ts               | 48 +++++++++++++++++++++-
- mcp-server/src/tools/dispatchers/cadDispatcher.ts                   | 23 +++++++++--
- 3 files changed, 165 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 05a57c501266`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._