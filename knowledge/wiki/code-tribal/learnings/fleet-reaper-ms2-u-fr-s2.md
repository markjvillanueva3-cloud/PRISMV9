# FLEET-REAPER-MS2/U-FR-S2 — [MAIN] [FLEET-REAPER-MS2]/U-FR-S2: enumeration cache sidecar (~70% dup cost cut)

**Commit:** `b8b4a5ea7869` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T09:27:44-05:00
**Tags:** fleet-reaper-ms2, u-fr-s2, auto-distilled

## Subject
[MAIN] [FLEET-REAPER-MS2]/U-FR-S2: enumeration cache sidecar (~70% dup cost cut)

## Body
```
[MAIN] [FLEET-REAPER-MS2]/U-FR-S2: enumeration cache sidecar (~70% dup cost cut)

Pure-core + injected-deps helper that wraps process-slot-map.enumerateProcesses
with a per-host, mtime-gated cache. At 12-chat × 2-PC scale, scheduled-task +
Stop-hook + in-session Monitor each trigger their own PS5.1 Get-CimInstance
pass (2-5s each). Burst overlap produces dozens of duplicate enumerations/min;
this caches the result for 60s (knob-tunable 5-3600s) so subsequent sweeps
inside the window reuse the snapshot.

Safety invariants:
  - Per-host keyed (defaultCachePathFor(hostname)) — PC-A's cache file is
    physically separate from PC-B's, dodging the shared-H:/ ping-pong defeat.
  - Atomic write (tmp + rename) — concurrent readers see one complete JSON,
    never half a file.
  - Schema-mismatch / different-host / corrupt → enumerate fresh + rewrite.
  - Live enumerate FAILS + cache <5×TTL → serve stale with fromStaleCache:true
    (fail-soft so the reaper isn't blind during PS5.1 hiccups).
  - Live enumerate FAILS + no usable cache → empty (preserves the existing
    "safe degraded" reaper behavior — never throws).
  - Kill switch: PRISM_FLEET_REAPER_ENUM_CACHE_DISABLE=1 → bypass entirely.

Wiring: opt-out, not opt-in. CLI main + monitorLoop default to cachedEnumerate
when cfg.enumerator is unset; any direct runSweep({enumerator:...}) caller
(tests, advisory mode, hermetic harness) bypasses the cache via the explicit
opts.enumerator already wired through snapshotFleet. Byte-identical behavior
on cache miss vs. pre-MS2.

Tests: 56 cases via node:test in .claude/helpers/fleet-reaper-enum-cache.test.mjs.
Coverage spans the 5 pure-decision fns (decideCacheFresh / decideStaleFallback /
buildCacheRecord / ttlFromEnv / disabledFromEnv) + injected-I/O readCache/
writeCache + the 10-case orchestrator suite (disabled / fresh-hit / stale-miss /
live-failure-with-stale-fallback / live-failure-no-cache / different-host /
corrupt-cache / custom-predicate) + per-host path suffix (4 cases) + a 2-case
real-fs tmpdir integration oracle proving the production wiring matches the
pure-core contract (the "hermetic fakes don't prove production wiring" defense
per reference_rgs_tool_autoinvoke_ms1_2026_05_16).

Live-fire verification on MARKV (RTX 3080, Ryzen 5 5600X, 32GB, ~48% commit):
  - First --status call: cache created at
    state/shared/.fleet-reaper-enum-cache-MarkV.json (67KB process table).
  - Second --status call: cache hit. End-to-end sweep ~4s (enumeration step
    now near-instant; remaining time is host-mem/GPU/Ollama/NIM probes —
    addressable by future units S1, A1).

Knobs:
  PRISM_FLEET_REAPER_ENUM_CACHE_DISABLE=1   bypass cache entirely (raw enumerate)
  PRISM_FLEET_REAPER_ENUM_CACHE_TTL_SEC=N   freshness window (default 60, clamp 5..3600)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .claude/helpers/fleet-reaper-enum-cache.mjs      | 316 ++++++++++++++
- .claude/helpers/fleet-reaper-enum-cache.test.mjs | 509 +++++++++++++++++++++++
- scripts/fleet-reaper-sweep.mjs                   |  34 +-
- 3 files changed, 856 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b8b4a5ea7869`
- Milestone envelope: `mcp-server/data/milestones/FLEET-REAPER-MS2.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._