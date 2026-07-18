# FLEET-SEARCH-DAEMON-MS0/U-DAEMON — [MAIN-FORCE] [FLEET-SEARCH-DAEMON-MS0]/U-DAEMON: warm persistent master-index search daemon (resurrects the dead 262MB sidecar)

**Commit:** `4df1127cd67d` · **By:** markjvillanueva3-cloud · **At:** 2026-06-14T11:02:48-05:00
**Tags:** fleet-search-daemon-ms0, u-daemon, auto-distilled

## Subject
[MAIN-FORCE] [FLEET-SEARCH-DAEMON-MS0]/U-DAEMON: warm persistent master-index search daemon (resurrects the dead 262MB sidecar)

## Body
```
[MAIN-FORCE] [FLEET-SEARCH-DAEMON-MS0]/U-DAEMON: warm persistent master-index search daemon (resurrects the dead 262MB sidecar)

Cross-cutting fleet infra. The 262MB full search sidecar (system-graph-index.json,
built nightly off the 745MB graph) is REJECTED on every fleet search: the lib caps
sidecar parsing at ~35% of the calling heap, and per-spawn hooks run at a 384MB cap
(~151MB ceiling) -> every search silently degrades to the 59MB architecture-graph.
On a 136GB Blackwell box that is "stale low default, gap is utilization not capacity".

- scripts/master-index-daemon.mjs (NEW): long-lived process, big heap, parses the
  262MB sidecar ONCE into the lib's warm process-cache, serves /health + /search +
  /tribal on 127.0.0.1:3101. Single-instance via :3101 EADDRINUSE preflight (atomic
  bind, no TOCTOU). Fail-soft handlers + kept-alive on uncaught. Verified live:
  warm 2133ms, /search 82ms full-coverage.
- scripts/lib/master-index-search-lib.mjs: searchViaDaemon() (async, fail-soft,
  anti-recursion via PRISM_INDEX_DAEMON_SELF, 8MB cap, 250ms timeout, instant
  ECONNREFUSED fallback) + masterIndexSearch() (daemon-first, in-process fallback).
  runMasterIndexSearch UNCHANGED -> sync consumers backward-compatible. +14 tests
  (real stub server) all pass.
- .claude/helpers/install-index-daemon-task.ps1: scheduled-task installer (mirrors
  install-mcp-server-task.ps1; AtStartup+AtLogon+5min-repeat, SYSTEM principal,
  --max-old-space-size, single-instance-preflight makes repeats safe).
- fleet-reaper-sweep.mjs + process-slot-map.mjs: add master-index-daemon to BOTH
  reaper protect sets so the warm daemon is never reaped.

Purely additive: daemon down -> existing in-process degraded search (nothing breaks).
Activation (operator, elevated): install-index-daemon-task.ps1 -RunNow.
Self-scrutiny PASS (agents rate-limited; formal 3-of-3 at Stop). FLEET-SEARCH-DAEMON-MS0.
```

## Files touched (7)
- .claude/helpers/install-index-daemon-task.ps1       | 139 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/helpers/process-slot-map.mjs                |   1 +
- scripts/fleet-reaper-sweep.mjs                      |   1 +
- scripts/lib/master-index-search-lib.daemon.test.mjs | 140 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/master-index-search-lib.mjs             |  69 ++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/master-index-daemon.mjs                     | 170 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 6 files changed, 520 insertions(+)

## Lessons surfaced in commit body
- tilization not capacity".

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4df1127cd67d`
- Milestone envelope: `mcp-server/data/milestones/FLEET-SEARCH-DAEMON-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._