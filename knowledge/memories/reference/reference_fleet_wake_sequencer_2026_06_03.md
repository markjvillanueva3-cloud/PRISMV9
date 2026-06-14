---
name: reference_fleet_wake_sequencer_2026_06_03
description: Staggered token-gated fleet wake sequencer (ZULU orchestrator) + active-fleet.json 17-slot roster — the proactive WAKE that closed the ZULU fleet-control gap.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.119Z
aliases: reference_fleet_wake_sequencer_2026_06_03
---


`scripts/fleet-wake-sequencer.mjs` (HERMES-ORCHESTRATOR-MS1/U-FLEET-WAKE-SEQUENCER, commit `ae96c9995d`, slot:bravo, 2026-06-03) — the proactive, staggered, token-gated WAKE that the 2026-06-03 ZULU-fleet-control assessment found to be the ONE missing link. The PULL loop (slot-brief delivery via [[reference_slot_brief_channel_2026_06_02]]) already worked; what was missing was a way to wake idle slots one-at-a-time without a thundering-herd of simultaneous account-checks.

**What it does:** wakes slots ONE AT A TIME in a staggered order (golf reaper front-loaded), and after each successful wake WAITS until that chat's transcript shows tokens accumulating (a new `.jsonl` session file appeared OR the same file grew ≥ min-growth bytes) before waking the next. Per-slot timeout SKIPS a dead/closed window so one stuck chat never blocks the fleet. DRY-RUN default; `--apply` actuates. Implements the operator ask: "stagger each chat continuation to avoid api errors for all chats trying to start up at the same time during account checks; wait until tokens start accumulating before moving on to the next chat."

**Architecture:** pure-core (`computeWakePlan` / `classifyAccumulation` / `nextAction` gate state machine) + injected I/O. Composes existing primitives — does NOT reinvent: resolves the window by the STABLE `PRISM <slot>` caption via `scripts/lib/resolve-hwnd-by-title.mjs` (R12 skip-on-ambiguous — a wrong HWND would type into the wrong chat), then sends via `.claude/helpers/send-keys-to-window.ps1` (env gate `PRISM_SENDKEYS_CONFIRM`, dry-run strips an ambient value). Transcript stat checks the slot-worktree dir `H--prism-slot-<slot>/` then falls back to the exact shared-tree `H--prism/<sessionId>.jsonl` (golf runs in the shared tree). Lockfile single-runner guard.

**CLI:** `node scripts/fleet-wake-sequencer.mjs --active-fleet --apply` (or `--slots a,b,c` / `--all-pending`); knobs `--stagger-ms/--poll-ms/--timeout-ms/--min-growth/--wake-cmd`.

**active-fleet.json** (`state/shared/active-fleet.json`) — single source of truth for the operator's **17 active slots** (alpha bravo charlie delta echo foxtrot golf hotel india juliett kilo lima mike oscar whiskey xray romeo); NOT all 26. Read the file, never hard-code. fleet-wake-sequencer + the Hermes `SOUL.md` both read it. Set by operator directive 2026-06-03.

**Scrutiny (R9 lesson worth keeping):** the 2-arm review FAILED first pass on three defects, ALL in the actuation seam the injected-I/O tests routed AROUND — exactly the "pure-core + injected readers MUST ship a real-data E2E" rule: (P0) resolved the window by the volatile `topic` not `PRISM <slot>` (topicless golf unwakeable + wrong-window substring risk; canonical contract = `zulu-orchestrator-sweep.mjs:433` + `rename-window-intercept.mjs:composeSlotTitle`), (P1) `env` with the confirm gate was computed but never passed to spawn → `--apply` was a silent no-op, (P1) transcript stat ignored shared-tree slots → golf gate-timed-out forever. Fixed + added real actuation-seam tests → re-verified PASS. 47 node:test cases. Lesson: when a file is "pure-core + injected I/O," the injected tests prove the core but you MUST also test the real integration seam (the default adapter), or the bugs hide exactly there. See [[feedback_parallel_scrutiny_per_file]].
