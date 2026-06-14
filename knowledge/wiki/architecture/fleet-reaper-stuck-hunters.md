---
title: Fleet-Reaper Stuck Hunters
type: architecture
unit: U-FR-STUCK-HUNT
scope: FLEET-REAPER
date: 2026-05-21
slot: golf
status: shipped
---

# Fleet-Reaper Stuck Hunters

Three hunters added to `fleet-reaper-sweep.mjs` (2026-05-21, U-FR-STUCK-HUNT)
that catch stuck processes the slot-aware reap loop **skips by design**.

## The blind spot

The base fleet-reaper keys reaps on **dead parents** and **stale chat slots**.
That correctly protects live work — but three process classes fall through:

| Class | Why the base loop skips it |
|-------|----------------------------|
| Stuck `bash.exe` hook shell | Parent `claude.exe` is still alive → not an orphan. A wedged hook chain can sit for hours. |
| `git fsmonitor--daemon` orphan | Detaches intentionally (`--detach`); the 60 s dead-parent grace window meant to protect legit short spawns lets a multi-hour fsmonitor slip past forever. |
| Stale chat-slots PID | Slot's stored PID is dead → crash-watch writes a postmortem but nothing reclaims the slot. |

Observed 2026-05-21 (slot golf): bash shells stuck **19 h / 1 h 40 m / 31 min**,
all under live `claude.exe` parents — invisible to every prior reaper tier.

## Design

- **Pure-core lib** — `scripts/lib/fleet-reaper-stuck-hunters.mjs`. Functions
  take a normalized `procs` array (`{pid,ppid,name,cmd,createdMs,rssBytes}`)
  + a live-PID `Set` → classification arrays. No I/O. The sweep owns the kill
  via the existing `reapProcesses()`.
  - `findStuckBashes` — bash.exe with (live parent ∧ age > 5 min) OR (dead
    parent ∧ age > 60 s grace).
  - `findFsmonitorOrphans` — git fsmonitor daemon, stale > 2 h.
  - `findStaleSlotPidEntries` — chat-slots entry with a dead stored PID.
    Advisory only — returns descriptors, defers reclaim to `chat-slots.mjs`
    (the conflict-fork rule: don't fork the slot-state owner).
  - `runStuckHunters` — one-call orchestrator the sweep uses.
- **Wiring** — strictly-additive step in `runSweep` after crash-watch.
  try/catch isolated, never flips `ok`, never aborts the sweep. Detection
  runs in dry-run too (so `--dry-run --json` audits would-be reaps).
- **Safety clamps** — every age threshold has a MIN/MAX bound so an operator
  typo (`AGE_SEC=0`) cannot turn the bash hunter into a chainsaw against the
  live hook chains keeping the fleet alive.

## Knobs

| Env var | Default | Effect |
|---------|---------|--------|
| `PRISM_FR_HUNT_DISABLE` | — | `1` disables all three hunters |
| `PRISM_FR_HUNT_STUCK_BASH_DISABLE` | — | `1` disables the bash hunter |
| `PRISM_FR_HUNT_FSMONITOR_DISABLE` | — | `1` disables the fsmonitor hunter |
| `PRISM_FR_HUNT_STALE_SLOT_DISABLE` | — | `1` disables the stale-slot hunter |
| `PRISM_FR_HUNT_STUCK_BASH_AGE_SEC` | 300 | bash stuck-age threshold (clamp 60–86400) |
| `PRISM_FR_HUNT_FSMONITOR_AGE_SEC` | 7200 | fsmonitor stale-age threshold (clamp 300–604800) |
| `PRISM_FR_HUNT_ORPHAN_GRACE_SEC` | 60 | dead-parent grace before orphan-bash kill (clamp 5–3600) |

## Tests

`scripts/lib/fleet-reaper-stuck-hunters.test.mjs` — 23/23 node:test. Each
test states WHY: a relaxed rule reaps live hook bashes (fleet outage), a
tightened rule lets 19 h bashes accumulate (the original bug).

## Known characteristic

A live sweep may report `reaped 0/N — N kill failure(s)` when the enumeration
cache holds bashes that exited between snapshot and kill. Benign and surfaced
honestly (R12 fail-loud) — the caveat names the count rather than hiding it.

## Scrutiny

Per-file gate, 2 parallel reviewers on the lib (PASS + PASS). 3 P1s fixed:
record-vs-array `chat-slots.json` shape mismatch (would have silently no-op'd
the stale-slot hunter), case-insensitive bash/sh name match, and
`git-fsmonitor--daemon.exe` binary-name detection.

## Related

- [[fleet-reaper]] — the base sweep
- [[fleet-reaper-ms1]] · [[fleet-memory-monitor]]
- [[feedback_golf_owns_reaper]] — golf owns the reaper
