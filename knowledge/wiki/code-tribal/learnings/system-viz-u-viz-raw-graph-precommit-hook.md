# SYSTEM-VIZ/U-VIZ-RAW-GRAPH-PRECOMMIT-HOOK — [MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-RAW-GRAPH-PRECOMMIT-HOOK (slot:sierra): block commits reintroducing a raw merged-graph utf8 parse (512MiB cap crash)

**Commit:** `0c0f7f7bfcec` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T21:37:15-05:00
**Tags:** system-viz, u-viz-raw-graph-precommit-hook, auto-distilled

## Subject
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-RAW-GRAPH-PRECOMMIT-HOOK (slot:sierra): block commits reintroducing a raw merged-graph utf8 parse (512MiB cap crash)

## Body
```
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-RAW-GRAPH-PRECOMMIT-HOOK (slot:sierra): block commits reintroducing a raw merged-graph utf8 parse (512MiB cap crash)

New PreToolUse(Bash) gate scans scripts/+scripts/lib via the proven scanDirForRawGraphParse on every git commit; blocks {decision:block} on any raw JSON.parse(readFileSync(<merged system-graph.json>,utf8)). Fail-open on all errors; NO [MAIN-FORCE] bypass (correctness gate, not lane); kill switch PRISM_RAW_GRAPH_GUARD_DISABLE=1. Wired settings.json PreToolUse Bash (C:+H:). Closes the stop_on_failing_tests affected-files gap (FLEET LOCK test only fires on its own file). Tests 18/18 (pure + spawn E2E incl block path) + guard-lib 15/15 FLEET-LOCK green. Per-file 2-arm scrutiny PASS.
```

## Files touched (3)
- .claude/hooks/raw-graph-parse-precommit-guard.mjs      | 138 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/raw-graph-parse-precommit-guard.test.mjs | 165 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 303 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0c0f7f7bfcec`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._