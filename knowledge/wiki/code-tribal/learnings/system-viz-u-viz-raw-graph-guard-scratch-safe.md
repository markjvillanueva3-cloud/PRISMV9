# SYSTEM-VIZ/U-VIZ-RAW-GRAPH-GUARD-SCRATCH-SAFE — [MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-RAW-GRAPH-GUARD-SCRATCH-SAFE (slot:sierra): skip scratch/symlink files so a stray .tmp violator cannot false-block every commit

**Commit:** `d816c76a11b7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T22:03:12-05:00
**Tags:** system-viz, u-viz-raw-graph-guard-scratch-safe, auto-distilled

## Subject
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-RAW-GRAPH-GUARD-SCRATCH-SAFE (slot:sierra): skip scratch/symlink files so a stray .tmp violator cannot false-block every commit

## Body
```
[MAIN-FORCE] [SYSTEM-VIZ]/U-VIZ-RAW-GRAPH-GUARD-SCRATCH-SAFE (slot:sierra): skip scratch/symlink files so a stray .tmp violator cannot false-block every commit

Scrutiny arm C P2: the recursive scan is git-status-blind (scans disk, not the index), so a stray .tmp-/__tmp scratch file containing a raw merged-graph parse -- dropped by ANY chat anywhere under the 4 roots -- would block EVERY commit fleet-wide (one such file, scripts/.tmp-ghost-h2h-precheck.mjs, already exists untracked). Fix: scanTreeForRawGraphParse now skips scratch names (.tmp-/__tmp/dot-prefixed -- never committed code) and never follows symlinks (cycle/escape guard; listEntries threads isSymlink). Single shared-lib fix -> hook + CLI + FLEET LOCK all benefit. LIVE: a scratch violator -> CLI clean (skipped); a non-scratch control -> exit 1 (still caught). Tests scanner 19/19 (+scratch/symlink R9 case), hook 18/18. 3-of-3 gate PASS/PASS/PASS on the prior 3 commits.
```

## Files touched (5)
- .claude/hooks/raw-graph-parse-precommit-guard.mjs      |  2 +-
- .claude/hooks/raw-graph-parse-precommit-guard.test.mjs |  4 ++--
- scripts/lib/raw-graph-parse-guard.mjs                  | 24 +++++++++++++++++++-----
- scripts/lib/raw-graph-parse-guard.test.mjs             | 27 ++++++++++++++++++++++++++-
- 4 files changed, 48 insertions(+), 9 deletions(-)

## Lessons surfaced in commit body
- till caught). Tests scanner 19/19 (+scratch/symlink R9 case), hook 18/18. 3-of-3 gate PASS/PASS/PASS on the prior 3 commits.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d816c76a11b7`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._