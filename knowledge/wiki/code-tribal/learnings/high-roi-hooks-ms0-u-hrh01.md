# HIGH-ROI-HOOKS-MS0/U-HRH01 — [MAIN] [HIGH-ROI-HOOKS-MS0]/U-HRH01: build-cache-guard — cache + deny redundant build/test re-runs

**Commit:** `7340a93f641e` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T21:31:39-05:00
**Tags:** high-roi-hooks-ms0, u-hrh01, auto-distilled

## Subject
[MAIN] [HIGH-ROI-HOOKS-MS0]/U-HRH01: build-cache-guard — cache + deny redundant build/test re-runs

## Body
```
[MAIN] [HIGH-ROI-HOOKS-MS0]/U-HRH01: build-cache-guard — cache + deny redundant build/test re-runs

PreToolUse:Bash denies a redundant npm-build/tsc/vitest re-run when the cached result is a confirmed PASS within TTL with no source edit since. PostToolUse:Bash captures, PostToolUse:Edit invalidates. Per-session cache files; editTs race-free in its own file. 34 tests incl 7 subprocess oracles. Wired x3 in settings.json.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- .claude/hooks/build-cache-guard.mjs      | 390 +++++++++++++++++++++++++++++
- .claude/hooks/build-cache-guard.test.mjs | 407 +++++++++++++++++++++++++++++++
- 2 files changed, 797 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7340a93f641e`
- Milestone envelope: `mcp-server/data/milestones/HIGH-ROI-HOOKS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._