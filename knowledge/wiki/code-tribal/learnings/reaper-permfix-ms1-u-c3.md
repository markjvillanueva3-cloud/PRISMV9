# REAPER-PERMFIX-MS1/U-C3 — [MAIN] [REAPER-PERMFIX-MS1]/U-C3: shared 5s-TTL probe-cache daemon

**Commit:** `2c6fac84c634` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T14:26:47-05:00
**Tags:** reaper-permfix-ms1, u-c3, auto-distilled

## Subject
[MAIN] [REAPER-PERMFIX-MS1]/U-C3: shared 5s-TTL probe-cache daemon

## Body
```
[MAIN] [REAPER-PERMFIX-MS1]/U-C3: shared 5s-TTL probe-cache daemon

Tier-2 architectural fix for REAPER-PERMFIX-PLAN diagnosis #2 (fork-storm).

Today the --monitor-loop sweep forks ~5 subprocesses per cycle
(nvidia-smi, ollama /api/tags, ollama /api/ps, docker-health,
git). Across 12 chats × 12 sweeps/hr that is ~720 nvidia-smi forks/hr
— and every fork() at >=95% commit memory can ENOMEM-storm into
'xmalloc: cannot allocate 8192 bytes'. The reaper becomes a
fork-pressure SOURCE.

U-C3: ONE daemon polls all three probes every 5s and atomic-writes
state/shared/.probe-cache.json. All 12 chats READ that JSON (zero
forks). 720 forks/hr -> 12 forks/hr (just the daemon's own probes).

readProbeCache() is the exported reader for fleet-reaper-sweep.mjs +
any consumer: returns the snapshot, or null when the cache is missing
/ corrupt / stale (>15s). A null return is the caller's signal to
fall back to a direct probe — a dead daemon degrades gracefully, never
breaks a sweep. NOT wiring the sweep here (peer claude-23c10eea is
active in fleet-reaper-sweep.mjs) — the consumer side is a later
2-line import, this ships the producer + reader standalone.

Modes: default (daemon, forever) / --once / --status / --stop.
Singleton lock with dead-PID + stale-lock (>60s) steal. Knobs:
PRISM_PROBE_CACHE_{DISABLE,INTERVAL_MS,GPU_DISABLE}.

Pure-ish exports (probeGpu / probeOllamaDocker / readProbeCache) are
dependency-injected for hermetic testing — 14 node:test cases, all
green: valid parse, runner-null, runner-throws, malformed CSV, empty,
stray-units, non-JSON, staleness boundary, never-throws contract.

Live-verified: --once wrote cache; --status read back RTX 4080 SUPER
15052MB free / 27% util (the idle GPU the plan flagged), Docker down
(matches plan diagnosis 'Docker STOPPED').

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- scripts/probe-cache-daemon.mjs      | 310 ++++++++++++++++++++++++++++++++++++
- scripts/probe-cache-daemon.test.mjs | 124 +++++++++++++++
- 2 files changed, 434 insertions(+)

## Lessons surfaced in commit body
- til (the idle GPU the plan flagged), Docker down

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2c6fac84c634`
- Milestone envelope: `mcp-server/data/milestones/REAPER-PERMFIX-MS1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._