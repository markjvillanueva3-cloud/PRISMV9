---
title: Fleet Wake Sequencer
domain: architecture
status: built
created: 2026-06-03
by: claude-5e210e4e (slot:bravo)
commit: ae96c9995d
related: [hermes-master-orchestrator, slot-brief-channel, zulu-orchestrator-sweep, session-continuity-stack]
---

# Fleet Wake Sequencer

`scripts/fleet-wake-sequencer.mjs` — the proactive, **staggered, token-gated** wake for the
ZULU/Hermes orchestrator. Closes the one gap the 2026-06-03 ZULU-fleet-control assessment
found: the fleet had a working **pull** loop (slot-brief delivery) but no way to proactively
**wake** idle slots without all 17 chats hitting account-check simultaneously (thundering
herd → API errors).

## Contract

Wake slots **one at a time**, in a staggered order (golf reaper first), and after each
successful wake **wait until that chat's transcript shows tokens accumulating** before waking
the next. A per-slot timeout **skips** a dead/closed window so one stuck chat never blocks the
fleet. This is exactly the operator ask: *"stagger each chat continuation to avoid API errors …
wait until tokens start accumulating before moving on to the next chat."*

## Architecture (pure-core + injected I/O)

| Layer | Functions |
|---|---|
| **Pure core** (unit-tested) | `computeWakePlan` (order/dedup/drop-unknown/never-wake-self/golf-front-load) · `classifyAccumulation` (before/after transcript snapshot → `accumulating`\|`waiting`) · `nextAction` (gate state machine → `advance`\|`skip`\|`wait`) |
| **Injected I/O** (fail-soft) | `readActiveFleet` · `listPendingBriefSlots` · `readSlotsState` · `statSlotTranscript` · `defaultSendKeys` |
| **Orchestration** | `runSequencer` — drives the above one slot at a time, gated |

It **composes existing primitives, does not reinvent them**:
- `scripts/lib/resolve-hwnd-by-title.mjs` — resolves the window by the **stable `PRISM <slot>`
  caption** (NOT the volatile topic; canonical contract `zulu-orchestrator-sweep.mjs:433` +
  `rename-window-intercept.mjs:composeSlotTitle`). Ambiguous / no-match → **skip, never guess**
  (R12 — a wrong HWND types into the wrong chat).
- `.claude/helpers/send-keys-to-window.ps1` — sends the wake keystrokes (gate env
  `PRISM_SENDKEYS_CONFIRM`; dry-run strips any ambient value).
- transcript stat: slot-worktree dir `H--prism-slot-<slot>/` (newest `.jsonl`) → fallback to the
  **exact** shared-tree `H--prism/<sessionId>.jsonl` (golf runs in the shared tree).

## Usage

```
node scripts/fleet-wake-sequencer.mjs --active-fleet --apply
node scripts/fleet-wake-sequencer.mjs --slots golf,alpha,kilo --apply
node scripts/fleet-wake-sequencer.mjs --all-pending          # only slots with a queued brief
```

DRY-RUN is the default; `--apply` actuates. Knobs: `--stagger-ms` (floor between wakes, def 5000),
`--poll-ms` (transcript re-stat, def 4000), `--timeout-ms` (per-slot wait before skip, def 120000),
`--min-growth` (bytes counting as accumulating, def 500), `--wake-cmd` (`{slot}` substituted, def
`/checkin-{slot}`). Lockfile `state/shared/.cron-locks/fleet-wake-sequencer.lock` (single runner).

## Active roster

`state/shared/active-fleet.json` is the single source of truth for the **17 active slots**
(alpha bravo charlie delta echo foxtrot golf hotel india juliett kilo lima mike oscar whiskey
xray romeo). Read the file; never hard-code. The Hermes `SOUL.md` references it too.

## Scrutiny lesson (R9)

The 2-arm review FAILED first pass on three defects ALL in the actuation seam the injected-I/O
tests routed around (P0 topic-vs-`PRISM <slot>` title, P1 dropped spawn `env`, P1 shared-tree
transcript). When a file is "pure-core + injected I/O", the injected tests prove the core but
the **real integration seam (the default adapter) must also be tested** or the bugs hide there.
Fixed + real-seam tests added → re-verified PASS. 47 node:test cases.
