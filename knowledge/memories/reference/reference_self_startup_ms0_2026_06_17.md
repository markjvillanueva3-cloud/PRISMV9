---
name: reference_self_startup_ms0_2026_06_17
description: "Operator: 'we solved self compaction but not self startup.' The symmetric twin of self-compact. self-compact.mjs SendKeys /compact into a chat's OWN window, but nothing actuated the RE-ENTRY afterward -- session-start-auto-resume.mjs only INJECTS `/startup-<slot> /loop [10m] /goal` as advisory additionalContext (which the model treats as background, not an instruction, so it doesn't fire), and zulu-orchestrator-sweep only re-enters at RED/CRITICAL pressure. So a chat that self-compacts in the new prudent YELLOW band (or stalls mid-loop) sits idle. FIX: scripts/self-startup.mjs, a self-scoped actuator (SELF-STARTUP-MS0, U-SELFSTARTUP-PAIR) that SendKeys the full re-entry into THIS chat's own window, gated by a STALL gate + a LOOP-ACTIVE gate; self-compact.mjs spawns a detached/hard-timeout watcher after a confirmed /compact send."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.152Z
aliases: reference_self_startup_ms0_2026_06_17
---


# Self-startup: the missing symmetric actuator (SELF-STARTUP-MS0, 2026-06-17, slot:bravo)

## The gap (symmetric to self-compaction)
self-compact.mjs gives the model a real ACTUATOR to /compact its own window. But the RE-ENTRY
after that compaction was only ADVISORY: `session-start-auto-resume.mjs` INJECTS
`/startup-<slot> /loop [10m] /goal` as SessionStart `additionalContext` -- and injected context is
background, not a user instruction, so the model does not reliably fire it (the hook's own header
admits "sometimes resumes, sometimes stalls"). `zulu-orchestrator-sweep` types a re-entry only at
RED/CRITICAL pressure. Net: a chat that self-compacts in the new prudent YELLOW band
([[reference_self_compact_yellow_branch_fix_2026_06_18]]) -- or simply stalls mid-loop -- gets NO
re-entry actuation and idles. (This very session was the proof: after a self-compact send I sat
idle through a re-block storm.)

## The fix: scripts/self-startup.mjs + the self-compact pairing
A self-scoped actuator -- the exact mirror of self-compact -- that SendKeys
`/startup-<slot> /loop [10m] /goal` into THIS chat's OWN window. It REUSES (no fork, R8):
`resolveOwnWindow`/`resolveSlot` (self-compact -- the SAFE tiered resolver that refuses an
ambiguous WT tab), `statSlotTranscript`/`classifyAccumulation` (fleet-wake-sequencer),
`sendKeysToWindow` (send-keys, the path fixed by [[reference_self_compact_confirm_env_fix_2026_06_18]]).

TWO gates make it safe to auto-fire:
- **STALL gate** (`classifyStall` inverts `classifyAccumulation`): if the chat is still producing
  tokens (it auto-continued after /compact, or is mid-work), SKIP -- never interrupt a working chat.
- **LOOP-ACTIVE gate** (`isLoopActive`): only a chat mid-`/loop` (handoff has a RESUME_LOOP section
  or a `/loop ... /goal` directive) is restarted -- never force-restart a deliberately-stopped chat.

**Pairing:** self-compact.mjs, after a CONFIRMED /compact send (`action:"sent"`, never on
dry-run/fallback), spawns a detached/unref'd/hard-timeout (`WATCH_HARD_TIMEOUT_MS` 300s)
`self-startup --watch --confirm --loop-active`. The watcher waits 90s (settle) + samples 30s, then
re-enters IFF the chat stalled (auto-continue -> stall gate no-ops; true stall -> SendKeys re-entry).
Robust to all four cases incl "the /compact never fired" (a still-growing transcript -> skip).

**Safety contract:** DRY-RUN BY DEFAULT (`resolveDryRun` -- a bare invocation only probes;
`--confirm` actuates; an explicit `--dry-run` always wins). SELF-SCOPED (own window only -- NOT
fleet control, so within the bravo soul's `unsafe-fleet-control-before-governance` gate). Kill-switch
`PRISM_SELF_STARTUP_DISABLE`; pairing opt-out `PRISM_SELF_COMPACT_NO_AUTOSTART`. The fleet-wide cron
scan (re-entering OTHER stalled slots) is the governance-gated surface and is DEFERRED.

## Validation
- 26 self-startup tests + 3 watcher-wiring tests + the existing self-compact suite (29) all green.
- 3-of-3 scrutiny PASS (arm B mutation-tested 5 gates: each turns the suite red when broken).
- LIVE: self-startup --slot bravo (no --confirm) -> dry-run, resolves hwnd 854018 (UIA tab BRAVO),
  would send `/startup-bravo /loop [10m] /goal`.

## Known limitation (R12)
The stall gate reads transcript-file GROWTH, so a chat mid a single >120s tool call (no growth) is
read as "stalled". Bounded + non-destructive: fires ONCE per self-compact (not a recurring cron), and
Claude Code queues the typed command as TYPE-AHEAD that only lands at the next turn boundary (cannot
interrupt the in-flight tool). Future refinement: detect an awaiting-continuation last transcript
entry instead of pure growth.

Related: [[reference_self_compact_yellow_branch_fix_2026_06_18]] (the decision-layer sibling),
[[reference_self_compact_confirm_env_fix_2026_06_18]] (the send-path fix this relies on),
[[reference_self_compact_and_wt_actuation_dormant_2026_06_13]], [[reference_fleet_wake_sequencer_2026_06_03]].
