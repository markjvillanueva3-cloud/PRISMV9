---
title: SELF-STARTUP-MS0 -- the self-startup actuator (symmetric twin of self-compact)
type: architecture
status: built
created: 2026-06-17
slot: bravo
galaxy: hermes-zulu
tags: [self-startup, self-compact, sendkeys, actuation, auto-resume, loop, fleet]
---

# SELF-STARTUP-MS0

The symmetric twin of [self-compact](self-compact). Operator: *"we solved self compaction but not
self startup."*

## Problem

`self-compact.mjs` SendKeys `/compact` into a chat's OWN window (a real actuator). But the
**re-entry** after that compaction was only **advisory**: `session-start-auto-resume.mjs` INJECTS
`/startup-<slot> /loop [10m] /goal` as SessionStart `additionalContext`, and injected context is
background, not a user instruction -- so the model does not reliably fire it (the hook's own header
admits "sometimes resumes, sometimes stalls"). `zulu-orchestrator-sweep` re-enters only at
RED/CRITICAL pressure. So a chat that self-compacts in the prudent **YELLOW** band, or simply stalls
mid-`/loop`, sits idle. Self-compaction had an actuator; self-startup did not.

## Design

`scripts/self-startup.mjs` -- a **self-scoped** actuator that SendKeys the full
`/startup-<slot> /loop [10m] /goal` re-entry into THIS chat's own window. Reuses (no fork):

| Reused from | What |
|---|---|
| `self-compact.mjs` | `resolveOwnWindow` (SAFE tiered UIA->title->owning-pid resolver, refuses ambiguous WT tab), `resolveSlot` |
| `fleet-wake-sequencer.mjs` | `statSlotTranscript`, `classifyAccumulation` |
| `lib/send-keys.mjs` | `sendKeysToWindow` (the env-var send path) |

**Two gates** make auto-fire safe:
- **STALL gate** (`classifyStall` inverts `classifyAccumulation`): skip if the chat is still
  producing tokens (auto-continued / mid-work) -- never interrupt a working chat.
- **LOOP-ACTIVE gate** (`isLoopActive`): only restart a chat that was mid-`/loop` (handoff carries a
  `RESUME_LOOP` section or a `/loop ... /goal` directive) -- never force-restart a stopped chat.

**Pairing:** `self-compact.mjs`, after a CONFIRMED `/compact` send (`action:"sent"` only), spawns a
detached/unref'd/hard-timeout (`WATCH_HARD_TIMEOUT_MS` 300s) `self-startup --watch --confirm
--loop-active`. The watcher waits 90s (settle) + samples 30s, then re-enters IFF the chat stalled
(auto-continue -> the stall gate no-ops; true stall -> SendKeys). Robust to all four post-compact
cases, including "the /compact never fired" (a still-growing transcript -> skip).

## Safety

- **DRY-RUN BY DEFAULT** (`resolveDryRun`): a bare invocation only probes; `--confirm` actuates; an
  explicit `--dry-run` always wins (hard override). The pairing spawns WITH `--confirm`, WITHOUT
  `--dry-run`.
- **SELF-SCOPED**: own window only (not fleet control -- within the bravo soul's
  `unsafe-fleet-control-before-governance` gate). The fleet-wide cron scan (re-entering OTHER stalled
  slots) is the governance-gated surface and is **deferred**.
- Kill-switch `PRISM_SELF_STARTUP_DISABLE=1`; pairing opt-out `PRISM_SELF_COMPACT_NO_AUTOSTART=1`.
- Hard self-timeout + bounded delay/poll so the detached watcher cannot orphan (R14).

## Known limitation (R12)

The stall gate reads transcript-file GROWTH, so a chat mid a single >120s tool call (no growth) is
read as "stalled". Bounded + non-destructive: fires ONCE per self-compact (not a recurring cron), and
the typed command is queued as TYPE-AHEAD that only lands at the next turn boundary (cannot interrupt
the in-flight tool). Future refinement: detect an awaiting-continuation last transcript entry.

## Tests / validation

`scripts/self-startup.test.mjs` (29: pure gates + `runOnce`/`runWatch` with injected deps) +
3 watcher-wiring tests in `self-compact.test.mjs` (29 total). 3-of-3 scrutiny PASS (arm B
mutation-tested the gates). LIVE: a dry-run probe resolves the live window (hwnd 854018, UIA tab
BRAVO) and would send `/startup-bravo /loop [10m] /goal`.

## See also

- [[self-compact]] -- the /compact actuator this mirrors
- `reference_self_startup_ms0_2026_06_17` (memory)
- `reference_self_compact_yellow_branch_fix_2026_06_18`, `reference_self_compact_confirm_env_fix_2026_06_18`
