# SEARCH-EFFICIENCY/U-GREPCACHE-FAILSOFT — [MAIN] [SEARCH-EFFICIENCY]/U-GREPCACHE-FAILSOFT (slot:alpha): harden grep-result-cache.mjs stdin parse + env-injectable cache dir + honest docstring + first test

**Commit:** `d664487dcd4c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T21:33:02-05:00
**Tags:** search-efficiency, u-grepcache-failsoft, auto-distilled

## Subject
[MAIN] [SEARCH-EFFICIENCY]/U-GREPCACHE-FAILSOFT (slot:alpha): harden grep-result-cache.mjs stdin parse + env-injectable cache dir + honest docstring + first test

## Body
```
[MAIN] [SEARCH-EFFICIENCY]/U-GREPCACHE-FAILSOFT (slot:alpha): harden grep-result-cache.mjs stdin parse + env-injectable cache dir + honest docstring + first test

The codebase-search-efficiency stack (master-index-precheck + pre-grep/read/bash graph-inject + grep-index-first + grep-result-cache + route-suggest + taken-correlator) is comprehensive + fleet-wide + healthy (verified: live grep-cache.json fresh Jun-11 21:30, 6.4KB). One real fail-soft gap: grep-result-cache.mjs:18 parsed stdin with NO try/catch -- a malformed/empty PostToolUse payload crashed the hook and silently killed the grep cache for that turn, while its sibling grep-index-first.mjs guards the same parse. Fix: stdin try/catch -> {continue:true} fail-soft (R12); PRISM_GREP_CACHE_DIR env knob (testability); corrected the docstring overclaim ("90%+ savings" -> honest "post-hoc repeat-grep NUDGE, not a token-returning cache" since PostToolUse fires AFTER the grep ran). +5 behavioral node:test (malformed/empty stdin fail-soft, non-Grep passthrough, first-grep records, repeat nudges). No duplicate built -- the stack already meets the goal; this is the one robustness gap.
```

## Files touched (3)
- .claude/hooks/__tests__/grep-result-cache.test.mjs | 64 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/grep-result-cache.mjs                | 19 +++++++++++++++----
- 2 files changed, 79 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d664487dcd4c`
- Milestone envelope: `mcp-server/data/milestones/SEARCH-EFFICIENCY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._