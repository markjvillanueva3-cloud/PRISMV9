# HERMES-GRAPH-IMPROVE/U-ALPHA-HERMES-GRAPH-IMPROVE-FRESHNESS — [MAIN-FORCE] [HERMES-GRAPH-IMPROVE]/U-ALPHA-HERMES-GRAPH-IMPROVE-FRESHNESS (slot:alpha): regenerate gap source before planning + R12 staleness guard -- the loop was planning against a 4-week-stale snapshot

**Commit:** `cc6201554ae4` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T22:51:05-05:00
**Tags:** hermes-graph-improve, u-alpha-hermes-graph-improve-freshness, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-GRAPH-IMPROVE]/U-ALPHA-HERMES-GRAPH-IMPROVE-FRESHNESS (slot:alpha): regenerate gap source before planning + R12 staleness guard -- the loop was planning against a 4-week-stale snapshot

## Body
```
[MAIN-FORCE] [HERMES-GRAPH-IMPROVE]/U-ALPHA-HERMES-GRAPH-IMPROVE-FRESHNESS (slot:alpha): regenerate gap source before planning + R12 staleness guard -- the loop was planning against a 4-week-stale snapshot

Root cause (found validating the U6 finding): the driver read LEVERAGE-WIRING-QUEUE.json,
last regenerated 2026-05-29 -- 4 weeks stale. The fleet wires engines constantly, so the
loop fanned out opus agents for engines wired since. PROVEN: a fresh regen from the (today-
fresh, 67MB OOM-safe) architecture-graph.json drops 118 unwired -> 4. The U6 batch's "14/15
already wired" was this staleness, not a broken audit (audit-unwired-engines.mjs is already
sophisticated).

Fix (R12 + R13):
- driver --refresh: regenerate the leverage queue (spawn leverage-ranked-wiring-queue.mjs,
  fail-soft) BEFORE planning, so each tick targets CURRENT gaps.
- queueStaleness() pure guard: surfaces graphGeneratedAt age; >7d (or null/unparseable) ->
  STALE warning in stdout + the ledger (queueStale/queueAgeDays/graphGeneratedAt fields). A
  stale source never silently plans obsolete work.
- cron now runs --refresh --apply, so the scheduled task self-refreshes every tick.

Live-validation caught a real bug the unit tests missed (injected spawn): the default spawn
used `require("child_process")` -- ESM .mts has no require -> regen silently failed. Fixed to
a top-level `import { spawnSync }`. RE-VALIDATED: --refresh ok:true; the live cron tick now
records gapsTotal=4 (was 118), queueStale=false, graphGeneratedAt=today.

16/16 driver tests (5 staleness + 4 refresh-injected-spawn + graphGeneratedAt read). Extends
the 3-of-3-PASS U-ALPHA-HERMES-GRAPH-IMPROVE (164cce5ceb) same session.
```

## Files touched (4)
- .claude/helpers/install-hermes-graph-improvement-task.ps1 |   8 +++++---
- scripts/hermes-graph-improvement-driver.mts               | 104 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-----
- scripts/hermes-graph-improvement-driver.test.mjs          |  63 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- 3 files changed, 166 insertions(+), 9 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cc6201554ae4`
- Milestone envelope: `mcp-server/data/milestones/HERMES-GRAPH-IMPROVE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._