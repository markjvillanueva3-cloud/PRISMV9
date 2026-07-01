# CAG-HITRATE-HONESTY/U-CAG-WARM-RATE — [MAIN-FORCE] [CAG-HITRATE-HONESTY]/U-CAG-WARM-RATE (slot:alpha): segment CAG miss reasons (novel vs invalidated) + honest warm hit-rate

**Commit:** `439532e7aa3d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T20:29:59-05:00
**Tags:** cag-hitrate-honesty, u-cag-warm-rate, auto-distilled

## Subject
[MAIN-FORCE] [CAG-HITRATE-HONESTY]/U-CAG-WARM-RATE (slot:alpha): segment CAG miss reasons (novel vs invalidated) + honest warm hit-rate

## Body
```
[MAIN-FORCE] [CAG-HITRATE-HONESTY]/U-CAG-WARM-RATE (slot:alpha): segment CAG miss reasons (novel vs invalidated) + honest warm hit-rate

The CLAUDE-BRIEF "10% CAG hit-rate, below target" headline is a COLD-START
artifact: 29 of 38 misses are single first-ever per-galaxy lookups a cold cache
physically cannot serve. The only RECOVERABLE miss (invalidated = a cached answer
wiped by doctrine-fingerprint churn) was never recorded -> no one could tell if a
real problem existed. This makes the telemetry honest (alpha token-economy domain):

- galaxy-cag-cache.mjs: MISS_REASONS taxonomy + bumpCagStat(reason) +
  normalizeMissReasons + warmRateFields. warmHitRate = hits/(hits+invalidated)
  (recoverable traffic only); NULL-guard when untagged-legacy or no-warm-traffic
  so it never shows a misleading 0% (R12).
- galaxy-reasoning-bridge.mjs: classify each miss at the record site (present-but-
  stale key = invalidated; absent key = novel).
- cag-cache-stats.mjs + session-start-cag-hitrate-headline.mjs: surface warm-rate +
  miss-reason breakdown, self-explaining so the brief stops crying wolf at cold-start.
- sessionDispatcher.ts cag_stats: mirror the warm fields (R15 wired query surface).

Tests: 77 pass (22 lib + 45 bridge + 10 headline; reference-value, R9). Live: raw
9.5% preserved; warm null/"accumulating" on current untagged data; computed paths
proven on temp fixtures (cold-start -> warm 100% "not a defect"; churn -> warm 25%
!6inval exposes the fixable problem). tsc: sessionDispatcher clean.
```

## Files touched (3)
- CLAUDE.md                                                                          | 41 ++++++++++++++++++++++++++---------------
- knowledge/wiki/code-tribal/learnings/zulu-buildloop-parseshipped-prose-miscount.md | 42 ++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 68 insertions(+), 15 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 439532e7aa3d`
- Milestone envelope: `mcp-server/data/milestones/CAG-HITRATE-HONESTY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._