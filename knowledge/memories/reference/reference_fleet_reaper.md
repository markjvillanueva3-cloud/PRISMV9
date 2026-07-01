---
name: reference-fleet-reaper
description: FLEET-REAPER-MS0 — slot-aware orphan-process reaper for the 7-chat fleet (2026-05-14)
aliases: reference_fleet_reaper
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.576Z
---


Slot-aware orphan-process reaper pipeline shipped 2026-05-14 (`FLEET-REAPER-MS0`).
Maps every running node/git/bash PID to its owning chat slot via process
ancestry (`chat-slots.json` + the registry at `.active-sessions-by-pid.json`)
and reaps orphans of provably dead slots — gated by a confirm-after-N-ticks
rule so a wedged-but-running harness or a PID-reused live process is never
killed.

**Three runners, all writing the same `firstSeenAt`-merged ledger:**
- In-session `Monitor` (launched by `/fleet-reaper`) — `--monitor-loop --interval 300`
- Windows scheduled task `PRISM Fleet Reaper` (5-min, +210s phase offset)
- Stop hook `fleet-reaper-stop.mjs` (throttled to 45s — burst-of-Stops → one sweep)

**Kill gate (all four must hold):** classified `owned-by-crashed` or `unowned`,
age ≥ 45s, continuously a candidate for ≥ `kill-after × interval` (default
2 × 300 = 10 min), not status/disabled/dry-run mode. Under memory pressure
(≥90% commit or phys) `kill-after` drops to 1 — confirm window halves.

**Kill switch:** `PRISM_FLEET_REAPER_DISABLE=1` makes every runner refuse to
kill anything, fleet-wide. The one lever that stops ALL reaping at once;
`--uninstall` only tears down THIS chat's Monitor + the global task.

**Distinct from generic reapers:** `node-process-janitor`, `cleanup-orchestrator`
+ 5 sub-cleaners, `03-memory-pressure-auto-relief.ps1` — all use age /
dead-parent / cmdline heuristics, none cross-reference `chat-slots.json`. This
is the slot-aware layer those four lack. Run all of them — they cover different
cruft.

**Artifact map:** `scripts/fleet-reaper-sweep.mjs` (the brain — `parseArgs`,
`shouldReap`, `updateLedger`, `summarize`, `runSweep`, `reapProcesses`,
`readHostMemory` all exported) · `.claude/helpers/process-slot-map.mjs` (the
classifier; vendors `SLOT_NAMES`/`classifySlot`/`readSlots` module-private
because chat-slots.mjs is vitest-unloadable — KEEP-IN-SYNC marker + a
drift-guard test pins canonical values) · `.claude/helpers/fleet-reaper.test.mjs`
(66 tests, all green) · `.claude/hooks/fleet-reaper-stop.mjs` (Stop arm, bounded
async stdin, stamp-file throttle, spawn-detached) · `.claude/helpers/install-fleet-reaper-task.ps1`
(`-DryRun` burn-in, elevation probe, `-RunNow` poll, `-Uninstall`) ·
`.claude/commands/fleet-reaper.md` (the `/fleet-reaper` skill).

**Run /fleet-reaper in ONE chat only** — the scheduled task is global, a second
chat's Monitor is redundant load on the host the reaper is protecting.

**Why this exists** — answers user request 2026-05-14: "look at current tasks
in task manager every 5 mins to determine when to close orphan nodes, git and
bash tasks left open by one of the 7 chats going. if its not being used, please
end process. make sure memory is always stable so 7 chats can work at the same
time." The slot-aware layer is what makes "not being used" provable — "not
being used" means "the chat that spawned it is gone." Generic age-only
heuristics can't tell.

**Related:** [[reference_harness_hang_prevention]] (the fork-storm context that
motivated this) · [[feedback_never_delete_only_disable]] (`-Uninstall` /
`Disable-ScheduledTask` are the reversal levers) · architecture wiki at
`knowledge/wiki/architecture/fleet-reaper.md`.
