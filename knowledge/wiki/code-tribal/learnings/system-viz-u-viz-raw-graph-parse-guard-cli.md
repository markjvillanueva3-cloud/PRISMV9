# SYSTEM-VIZ/U-VIZ-RAW-GRAPH-PARSE-GUARD-CLI — [MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-RAW-GRAPH-PARSE-GUARD-CLI (slot:sierra): make the raw-graph-parse guard a runnable lint (pre-commit/manual sweep)

**Commit:** `d777e57aa693` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T20:55:54-05:00
**Tags:** system-viz, u-viz-raw-graph-parse-guard-cli, auto-distilled

## Subject
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-RAW-GRAPH-PARSE-GUARD-CLI (slot:sierra): make the raw-graph-parse guard a runnable lint (pre-commit/manual sweep)

## Body
```
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-RAW-GRAPH-PARSE-GUARD-CLI (slot:sierra): make the raw-graph-parse guard a runnable lint (pre-commit/manual sweep)

The guard previously locked the 875MB-graph string-cap class only when the test
suite ran. This adds a main-guarded CLI -- `node scripts/lib/raw-graph-parse-guard.mjs`
scans scripts/ + scripts/lib/, prints violations, exits 1 if any (0 if clean) --
so it's usable in pre-commit / CI / a manual sweep, not just the test. Main-guard
matches the module basename (the .test.mjs importer never triggers it).

- New export scanDirForRawGraphParse(dir, readFile, listDir) -- injectable for
  hermetic tests; skips *.test.mjs fixtures.
- +2 tests (dir-walk skips fixtures + flags a real .mjs; unreadable degrades to
  empty, no throw). 15/15. LIVE CLI: exit 0, "clean -- no raw merged-graph parses".

Additive only -- pure scanForRawGraphParse/mergedGraphPathBindings unchanged.
```

## Files touched (3)
- scripts/lib/raw-graph-parse-guard.mjs      | 48 ++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/raw-graph-parse-guard.test.mjs | 21 ++++++++++++++++++++-
- 2 files changed, 68 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d777e57aa693`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._