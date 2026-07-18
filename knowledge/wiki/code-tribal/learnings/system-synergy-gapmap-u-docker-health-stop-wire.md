# SYSTEM-SYNERGY-GAPMAP/U-DOCKER-HEALTH-STOP-WIRE — [MAIN] [SYSTEM-SYNERGY-GAPMAP]/U-DOCKER-HEALTH-STOP-WIRE (slot:golf): wire the docker-service guard to a Stop advisory (closes the R15 gap on fb314a6fd1)

**Commit:** `14b8b383a2fa` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T23:59:56-05:00
**Tags:** system-synergy-gapmap, u-docker-health-stop-wire, auto-distilled

## Subject
[MAIN] [SYSTEM-SYNERGY-GAPMAP]/U-DOCKER-HEALTH-STOP-WIRE (slot:golf): wire the docker-service guard to a Stop advisory (closes the R15 gap on fb314a6fd1)

## Body
```
[MAIN] [SYSTEM-SYNERGY-GAPMAP]/U-DOCKER-HEALTH-STOP-WIRE (slot:golf): wire the docker-service guard to a Stop advisory (closes the R15 gap on fb314a6fd1)

Completes the docker-service-health guard: a Stop-hook arm that rides the fleet's
near-continuous Stop stream (mirrors fleet-task-health-stop.mjs) and surfaces a
downed prism-* container the moment any chat stops — with the correct fix incl.
the renamed-leftover case. Now the NEXT qdrant-down (4th) gets caught
automatically instead of by a human noticing degraded semantic search.

- .claude/hooks/docker-service-health-stop.mjs (T3 observer): throttled (one
  `docker ps` per 5min across all fleet Stops, cached in between), fail-soft
  (docker down → silent), ADVISORY-ONLY (always {continue:true}, never blocks,
  never starts/stops anything — --fix stays operator-invoked on the CLI).
  Reuses the tested pure core from scripts/docker-service-health-check.mjs.
- Knob: PRISM_DOCKER_HEALTH_ADVISORY_DISABLE=1.
- WIRED: C:/Users/wompu/.claude/settings.json Stop chain (after fleet-task-
  health-stop, timeout 4000); c-to-h-mirror replicated to H:; BOTH validated as
  parseable JSON with the entry present (settings.json lives outside the repo by
  convention, so not in this commit).
- TESTED: 4/4 hook (pure buildDockerAdvisory: null-when-healthy, names downed +
  renamed real name + --fix path, 5-cap; + the always-{continue:true} contract
  via a real piped Stop event). VALIDATED LIVE: healthy stack → bare
  {continue:true} (no false alarm).
[[reference_qdrant_down_created_leftover_2026_06_08]]
```

## Files touched (3)
- .claude/hooks/docker-service-health-stop.mjs      | 145 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/docker-service-health-stop.test.mjs |  51 ++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 196 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 14b8b383a2fa`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-SYNERGY-GAPMAP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._