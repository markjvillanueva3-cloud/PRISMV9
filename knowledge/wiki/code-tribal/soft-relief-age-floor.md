---
title: Soft-relief age floor — why 180s sits between the alive-floor and the crashed-threshold
type: code-tribal
status: shipped
shipped: 2026-05-14
tags: [fleet-reaper, soft-relief, memory-pressure, thresholds]
milestone: FLEET-REAPER-MS1
---

# Soft-relief age floor — 180 s

## The number

`PRISM_FLEET_REAPER_SOFT_RELIEF_AGE_SEC = 180`. A stale-slot process is only a
soft-relief target (BelowNormal priority + working-set trim) once it is older
than 180 s.

## Why 180 s specifically — it is bounded on both sides

The fleet reaper has three pre-existing age constants. 180 s was chosen to sit
*strictly between* two of them. **The literal values below (`AGE_FLOOR_SEC`,
`CRASH_TTL_MS`) are the constants as of 2026-05-14 — they live in
`fleet-reaper-sweep.mjs` / `process-slot-map.mjs`; if either moves, the 180 s
floor must be re-derived against the new neighbors. The *principle* — "between
the alive-floor and the crashed-slot threshold" — is the durable part; the exact
numbers are a snapshot.**

- **Above the alive-floor (45 s).** `AGE_FLOOR_SEC` (45 s) is the minimum age
  before a process is even *considered* for reap. Soft relief must be **slower**
  than that — a process under a minute old might be a fresh helper that simply
  hasn't done its work yet. Demoting its priority or trimming its working set at
  45 s would penalize legitimate just-spawned work. 180 s gives a helper three
  minutes to prove itself before the slot it belongs to is treated as idle.
- **Below the crashed-slot threshold (10 min).** A slot is classified `crashed`
  at `CRASH_TTL_MS` = 10 min of heartbeat silence, after which its processes
  become full reap candidates. Soft relief must fire **before** that — the whole
  point is to relieve pressure on a *stale* (2-10 min) slot's footprint *while
  there's still a chance the chat recovers*, rather than waiting for the
  irreversible kill path. Relieve first, reap last.

## The lesson

When you add a new threshold to a system that already has a ladder of them,
don't pick a round number in isolation — locate it on the existing ladder. The
right value is usually defined by its neighbors: "slower than X so we don't
punish the innocent, faster than Y so we act before the destructive step." A
threshold with no relationship to the thresholds around it is a future bug.

Related: [[fleet-reaper]] · [[leftover-monitor-bash-pattern]]
