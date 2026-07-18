# HIGH-ROI-HOOKS-MS0/U-HRH02 — [MAIN] [HIGH-ROI-HOOKS-MS0]/U-HRH02: mcp-readonly-cache — dedup duplicate read-only MCP dispatcher calls

**Commit:** `546ee980ea50` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T21:45:52-05:00
**Tags:** high-roi-hooks-ms0, u-hrh02, auto-distilled

## Subject
[MAIN] [HIGH-ROI-HOOKS-MS0]/U-HRH02: mcp-readonly-cache — dedup duplicate read-only MCP dispatcher calls

## Body
```
[MAIN] [HIGH-ROI-HOOKS-MS0]/U-HRH02: mcp-readonly-cache — dedup duplicate read-only MCP dispatcher calls

PreToolUse on mcp__prism*. Denies an identical re-call of a read-only dispatcher action (gap_scan_read, db_health, master_index_query, ...) within 3min — the prior JSON envelope is already in context. Conservative read-only classifier (read suffix AND no mutating verb, ~95-verb gate); soft deny + count-based escape means a misclassification only delays, never drops, a re-issued call. 25 tests incl 6 subprocess oracles. 2 review rounds.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- .claude/hooks/mcp-readonly-cache.mjs      | Bin 0 -> 10983 bytes
- .claude/hooks/mcp-readonly-cache.test.mjs | 314 ++++++++++++++++++++++++++++++
- 2 files changed, 314 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 546ee980ea50`
- Milestone envelope: `mcp-server/data/milestones/HIGH-ROI-HOOKS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._