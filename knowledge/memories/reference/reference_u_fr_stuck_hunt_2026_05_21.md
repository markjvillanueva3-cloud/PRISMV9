---
name: reference_u_fr_stuck_hunt_2026_05_21
description: "FLEET-REAPER/U-FR-STUCK-HUNT (2026-05-21, slot:golf) — 3 hunters for stuck bash shells, fsmonitor orphans, stale slot PIDs. The slot-aware reap loop skips these by design."
type: reference
metadata:
  date: 2026-05-21
  slot: golf
  unit: U-FR-STUCK-HUNT
  scope: FLEET-REAPER
---

# U-FR-STUCK-HUNT — fleet-reaper stuck-process hunters

Shipped 2026-05-21 (slot:golf) after an operator observed memory maxing at
95-97% with the fleet-reaper firing but `reaped=0` every sweep. Investigation
found three classes of stuck process the slot-aware reap loop **skips by
design** — closing that blind spot.

## What the slot-aware loop misses (and why)

1. **Stuck `bash.exe` shells** — Claude Code fires bash for every hook
   (UserPromptSubmit, Stop, PreToolUse). A hook chain finishes in 1-3 s. But
   when a chain wedges, the bash stays alive — and because its `claude.exe`
   parent is still running, the slot-aware reaper (which keys on dead parents
   / stale slots) leaves it. Real finding this session: bashes stuck **19 h**,
   **1 h 40 m**, **31 min**, all under live claude parents.
2. **`git fsmonitor--daemon` orphans** — fsmonitor intentionally detaches
   (`--detach`), so dead-parent is expected. The reaper's 60 s dead-parent
   grace window (which protects legit short-lived detached spawns) lets a
   fsmonitor that runs for hours slip past forever.
3. **Stale chat-slots PIDs** — `chat-slots.json` entries whose stored PID is
   dead. The CLI labels them "crashed", crash-watch writes a postmortem, but
   nothing reclaims the slot — stale state confuses the resume-picker.

## Implementation

- **Pure-core lib**: `scripts/lib/fleet-reaper-stuck-hunters.mjs` — 4 exports
  (`findStuckBashes`, `findFsmonitorOrphans`, `findStaleSlotPidEntries`,
  `runStuckHunters`) + 3 default constants. No I/O — takes a normalized
  `procs` array (`{pid,ppid,name,cmd,createdMs,rssBytes}` from
  `process-slot-map.mjs`) + a live-PID `Set` → classification arrays. The
  caller owns the kill side-effect via the existing `reapProcesses()`.
- **Tests**: `scripts/lib/fleet-reaper-stuck-hunters.test.mjs` — 23/23
  node:test. Each test encodes WHY: a relaxed rule reaps live hook bashes
  (fleet outage); a tightened rule lets 19 h bashes accumulate (the bug).
- **Wiring**: strictly-additive step in `runSweep` after crash-watch.
  try/catch isolated — never flips `ok`, never aborts the sweep. Runs in
  dry-run too (gate is `!isStatus && !disabled`, not `actionsAllowed`) so
  operators audit "what WOULD reap" without killing.

## Knobs

- `PRISM_FR_HUNT_DISABLE=1` — all three hunters off
- `PRISM_FR_HUNT_STUCK_BASH_DISABLE` / `_FSMONITOR_DISABLE` / `_STALE_SLOT_DISABLE` — per-hunter
- `PRISM_FR_HUNT_STUCK_BASH_AGE_SEC` (default 300), `_FSMONITOR_AGE_SEC` (default 7200),
  `_ORPHAN_GRACE_SEC` (default 60) — clamped to sane MIN/MAX so an operator
  typo (`AGE_SEC=0`) cannot scorched-earth the live hook chains.

## Scrutiny — 3 P1s caught by reviewers, all fixed

The pure-core lib went through the per-file gate (2 parallel reviewers, both
PASS). Three P1 issues found and fixed before wiring:

1. **Slot-data shape mismatch (reviewer B — critical).** `chat-slots.json`
   canonical on-disk shape is a **record** `{slots:{alpha:{...}}}`, not an
   array. The first draft of `findStaleSlotPidEntries` expected an array and
   would have **silently returned `[]` forever**. Fixed to accept both record
   (canonical) and array (CLI `status` output) shapes. Lesson: verify the
   actual on-disk shape, don't assume — `node -e` dumped it in one line.
2. **Case-sensitive name match (reviewer A).** `p.name !== "bash.exe"` would
   miss `Bash.exe`/`BASH.EXE` variants some Git-for-Windows shells produce.
   Fixed to case-insensitive + a tunable name Set (also covers `sh.exe`).
3. **fsmonitor binary-name variant.** Some Git distributions name the binary
   `git-fsmonitor--daemon.exe` directly, not `git.exe` + a fsmonitor arg.
   Detection now matches both.

## Known characteristic (not a bug)

A live sweep may report `reaped 0/N — N kill failure(s)` when the enumeration
cache holds bashes that exited between snapshot and kill. This is benign and
surfaced honestly (R12 fail-loud) — the caveat names the failure count rather
than hiding it. Genuinely-wedged bashes (19 h old) are not transient and DO
get killed.

## Related

- [[reference_fleet_reaper]] · [[reference_fleet_reaper_ms1]] · [[reference_fleet_reaper_ms2_2026_05_18]]
- [[feedback_golf_owns_reaper]] — golf owns the reaper
- [[feedback_conflict_fork_rule]] — why `findStaleSlotPidEntries` stays advisory (defers reclaim to chat-slots.mjs)
- CLAUDE.md §FLEET-REAPER — **pointer line still needs the U-FR-STUCK-HUNT addition** (blocked from the golf worktree by the cross-worktree shared-state hook; a main-tree chat should splice it)
