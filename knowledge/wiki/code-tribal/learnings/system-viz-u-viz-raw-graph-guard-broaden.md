# SYSTEM-VIZ/U-VIZ-RAW-GRAPH-GUARD-BROADEN — [MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-RAW-GRAPH-GUARD-BROADEN (slot:sierra): broaden raw-graph-parse guard recursively to .claude/hooks+helpers+mcp-server/scripts

**Commit:** `cb09c71d4573` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T21:48:25-05:00
**Tags:** system-viz, u-viz-raw-graph-guard-broaden, auto-distilled

## Subject
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-RAW-GRAPH-GUARD-BROADEN (slot:sierra): broaden raw-graph-parse guard recursively to .claude/hooks+helpers+mcp-server/scripts

## Body
```
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-RAW-GRAPH-GUARD-BROADEN (slot:sierra): broaden raw-graph-parse guard recursively to .claude/hooks+helpers+mcp-server/scripts

The scripts/-only scope missed the live landmine in .claude/hooks (dead-pixel-guard, fixed in 42bf1c598c). Single-sourced SCAN_ROOTS_REL [scripts, .claude/hooks, .claude/helpers, mcp-server/scripts] + recursive scanTreeForRawGraphParse (skips test/node_modules/.git; exempts cap-safe-reader files). CLI, FLEET LOCK test, and the PreToolUse commit guard now share the SAME broadened scope. Tests scanner 18/18 + hook 18/18; CLI lint clean; LIVE: wired hook blocks a synthetic .claude/hooks violation (was invisible before).
```

## Files touched (4)
- .claude/hooks/raw-graph-parse-precommit-guard.mjs | 20 +++++++++++---------
- scripts/lib/raw-graph-parse-guard.mjs             | 53 +++++++++++++++++++++++++++++++++++++++++++++++------
- scripts/lib/raw-graph-parse-guard.test.mjs        | 60 ++++++++++++++++++++++++++++++++++++++++++++----------------
- 3 files changed, 102 insertions(+), 31 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cb09c71d4573`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._