---
name: reference_commit_pressure_rootfix_2026_06_10
description: "Root-cause fix for the recurring 98% commit-maxout that trips the Stop PRESSURE GATE (slot:alpha, 2026-06-10). Operator-authorized the two fixes golf flagged as 'operator-config': (1) raised the pagefile commit ceiling, (2) made auto-relief commit-aware. Plus guard-audit: the 'always says compact' feeling is NOT a phantom guard."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.526Z
aliases: reference_commit_pressure_rootfix_2026_06_10
---


# Commit-pressure root fix + guard-audit (alpha, 2026-06-10)

Continues [[reference_wsl_commit_pressure_relief_2026_06_08]] (golf). Operator
explicitly authorized the two fixes golf flagged as "operator-config, not golf's
to make unprompted": raise the pagefile + bound the relief. Done both.

## Live diagnosis (measure first, R12)
- Commit hit 98.8% (224/227GB); killed 11 zombie tsservers (12.8GB) -> 91.6%.
- THE metric bug, proven live: `Get-MemoryPct -> physPct=70.1 commitPct=89.8`.
  Physical RAM was MODERATE while COMMIT was the crisis -- because commit =
  reserved address space (WSL + 70+ V8 heaps + a 41GB llama-server + tsserver
  leaks), most of it reserved-not-resident.
- Dominant consumers (auto-relief log topProcs): vmmemWSL (capped 16GB now, was
  38GB pre-cap), llama-server 41.6GB resident, tsserver pile-ups ~12GB.

## Fixes shipped (commit 530afadcfa)
1. **03-memory-pressure-auto-relief.ps1** -- `Get-MemoryPct` now reads BOTH
   physical% AND commit% from one Win32_OperatingSystem query
   (TotalVirtualMemorySize/FreeVirtualMemory) and escalates on the MAX. The old
   physical-only read NOOPed (<85%) while commit was 90% and the Stop gate blocked.
2. **02-kill-zombie-tsservers.ps1** -- (a) ONE batch CIM query for all node
   cmdlines (per-proc WMI blew the ZombieCapSec timeout under 70+ procs ->
   reaped nothing); (b) added `typingsInstaller` (was MISSED -> leaked stale
   @types installers); (c) runaway override (>3GB, >20min) catches fresh
   language-server leaks while sparing active editors.

## Commit-ceiling raise (NOT in repo -- system config, operator-authorized)
- Pagefiles were FIXED at 100GB (Initial==Max -> no dynamic growth -> hard 227GB wall).
- Raised: C: max 4->192GB, G: max 32->56GB (dynamic, NO REBOOT -> commit grows toward
  ~439GB under pressure now). Added H:\pagefile.sys 64GB/512GB via registry (H: has
  1.9TB free) -> AFTER REBOOT: immediate floor ~291GB, dynamic ceiling ~951GB (4x old).
- Reversal: registry `HKLM:\...\Memory Management\PagingFiles`, or set Max back to Initial.
- **A REBOOT activates the H: pagefile + the higher floor.** No-reboot growth already helps.

## Guard-audit (Workflow wf_8aad5adf-f68): "always says compact" is NOT a phantom guard
Attribution: (a) the REAL RAM leak [now fixed] -- the PRESSURE GATE was correct;
(c) the /loop prompt's own "checkpoint at YELLOW / compact before the spiral" text
injected unconditionally every pass (loop-iteration-inject.mjs:41,
goal-prereq-inject.mjs:36); (b) un-deduped Stop advisories (stop-session-spend-summary
+ session-consolidate-graph re-fire identical text EVERY Stop -- dedup machinery
loop-inject-dedup.mjs exists but is only wired into UserPromptSubmit, never Stop).
Real CONFLICT: `critical-memory-compact-nudge.mjs:204` says "MEMORY CRITICAL ->
/compact" but /compact does NOTHING for host RAM (the fix is reap zombies) -- a
mislabeled remedy. Plus 3 redundant ctx-token compact injectors (token-awareness +
zulu-bundle + precompact-auto-trigger) reading one sidecar -> up to 3 compact
signals/prompt + stale-flag divergence (GREEN-suppress + RED-nudge same turn).

## SAFE TO RELAX (kills the noise, keeps the safety net) -- NOT yet done, operator-gated
1. Relabel critical-memory-compact-nudge: "host RAM critical -> reap zombies /
   reduce process load", NOT "/compact".
2. Dedup the Stop advisories (wire loop-inject-dedup into spend-summary +
   consolidate-graph Stop hooks).
3. Collapse the 3 ctx-token compact injectors to one source-of-truth.
KEEP (load-bearing): the PRESSURE GATE (caught a real 12.8GB leak), precompact-auto-trigger
HARD ceiling, scrutinize/test/wiring Stop gates. Compaction-survival (handoff
auto-write + auto-resume + terminal-pin) is robust -> compaction itself is cheap/lossless.
