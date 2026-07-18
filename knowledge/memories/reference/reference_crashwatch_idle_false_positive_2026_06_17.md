---
name: reference_crashwatch_idle_false_positive_2026_06_17
description: "fleet-reaper crash-watch (detectCrashes) declares a 'CHAT CRASH' on frozen-heartbeat(>=10min)+unchanged-chatId ALONE -- so an IDLE-but-alive chat (operator away -> no prompts -> heartbeat frozen) is mislabeled crashed + gets a postmortem (810 rows; mislabeled india+romeo who had hb 1min). Additive/noise not harm, but it MISLED this session's health diagnosis. Fix = require window/process DEATH before declaring a crash."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.533Z
aliases: reference_crashwatch_idle_false_positive_2026_06_17
---


# Crash-watch false-positives on IDLE chats (2026-06-17, slot:golf)

## What
`scripts/lib/fleet-reaper-crash-watch.mjs::detectCrashes(prev, curr, now, staleMs)` flags a slot as a CRASH iff: heartbeat did NOT advance between two sweeps + chatId unchanged + frozen >= 10min. **It checks NO process/window liveness.** A chat heartbeats per PROMPT — so an alive chat that is simply IDLE (operator not prompting it, e.g. away) has a frozen heartbeat and, after 10min, is mislabeled `CHAT CRASH DETECTED` + gets a postmortem JSONL row. With 26 slots and an operator who drives a few at a time, MANY slots are idle >10min at any moment -> 810 accumulated postmortem rows, most false.

## Verified live
This session the reaper reported "CHAT CRASH DETECTED (6 slots): charlie india papa romeo sierra xray." I checked `state/shared/chat-slots.json` heartbeats: **india + romeo hb 1min (actively working), papa/sierra 21min, xray/charlie 33-35min — ALL ALIVE.** The reaper's OWN stale-slot-hunter agreed in the same sweep: "11 slots stale recorded PID, 0 reclaimable, all have live windows / fresh heartbeats; recorded PID dies across /compact." I initially RELAYED "6 chats crashed -> GPU-OOM crash trigger" to the operator before verifying -- then caught + corrected it (R12).

## Severity
LOW. The crash-watch is "STRICTLY ADDITIVE -- it never changes a reap decision" (its own docstring); 0 reaped. It's NOISE, not functional harm -- but it MISLED a human-facing diagnosis (mine), which is the real cost.

## Fix (owed -- careful dedicated unit, golf-domain)
Require process/WINDOW death (not just a frozen heartbeat) before declaring a crash. Reuse the reaper's stale-slot-hunter window-liveness check (already correct). Blocker: the crash-watch step (`fleet-reaper-sweep.mjs` ~line 1993) runs BEFORE process enumeration (`procs`/`livePidSet` ~line 2058), so the sweep must be reordered (or processes pre-enumerated) to inject liveness into `detectCrashes`. Risky (critical reaper infra) -> NOT a tail-of-session patch; do it as a focused unit with the per-file 2-arm + 3-of-3 gate. Idle vs crashed = frozen-hb + LIVE process (idle) vs frozen-hb + DEAD window (crash).

## Lesson (the recurring disease -- 4th instance this session)
A STALE/FROZEN signal must not DECLARE or ACTUATE without positive confirming evidence. Same R7-family lesson as: the false `/mcp reconnect` broadcast on a healthy server ([[reference_mcp_kickoff_falsepos_liveprobe_fix_2026_06_17]]), the 0-live-bridges "disconnect" ([[reference_golf_mcp_bridge_count_false_positive_2026_06_17]]), the stale token-awareness zone ([[reference_token_awareness_stale_zone_fix_2026_06_11]]). The reaper's detectors need a shared principle: confirm process/window death via a LIVE check before declaring/acting. I nearly propagated this one -- VERIFY a "X crashed/broken" signal against heartbeats/metrics before relaying it (R12).

Siblings: [[reference_mcp_retry_budget_harden_2026_06_17]] (same session) · [[reference_mcp_kickoff_falsepos_liveprobe_fix_2026_06_17]] · [[feedback_verify_actual_contract_not_proxy]].
