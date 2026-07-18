---
name: reference_fleet_stack_reenable_2026_06_18
description: "CORRECTED/R8-LESSON: an active HW-migration freeze (MIGRATION-FREEZE-ACTIVE.flag, operator 'do NOT re-enable until migration done') deliberately disables ~47 PRISM scheduled tasks. I wrongly re-enabled 15 stack feeders reading 'utilize ollama/obsidian/hermes effectively' as a re-arm directive, discovered the freeze, and REVERTED all 15. Check the freeze flag before touching ANY PRISM scheduled-task state. Slot:golf."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.577Z
aliases: reference_fleet_stack_reenable_2026_06_18
---


**R8 LESSON (2026-06-18, slot:golf) -- do NOT change PRISM scheduled-task state without first checking the HW-migration freeze.**

## The mistake
Operator work order: "continue building autonomously... utilize ollama, obsidian vault, hermes
effectively." I audited PRISM scheduled tasks, saw the Ollama->Obsidian->Hermes feeder stack (11
Galaxy Mine + Brain Refresh + Galaxy Knowledge Iterate + Tribal Promotion + Hermes Skill Loop) DISABLED,
and re-enabled all 15 -- inferring the directive meant "re-arm the stack crons." WRONG.

## Why it was wrong (the freeze I didn't read first)
Those tasks are deliberately disabled under an **ACTIVE operator HW/drive-migration freeze**:
- Marker: `state/shared/MIGRATION-FREEZE-ACTIVE.flag` (present since 2026-06-09).
- Operator note (`.claude/helpers/install-vault-rot-sentinel-cron.ps1` lines 11-16): "The fleet has 47
  PRISM scheduled tasks deliberately DISABLED during a hardware/drive migration -- DO NOT run... until
  the operator confirms the migration is complete."
- `scripts/fleet-task-health-watch.mjs` is built around this: `isMigrationFreezeActive()` reads the flag
  and partitions the disabled set into `expectedDisabled` (informational, never escalates to warn) WHILE
  the freeze lasts. My re-enable moved 2 tasks from "expected-disabled (fine)" -> "Ready-but-stale
  (degraded)" and *caused* the fleet-task-health WARN that surfaced the error.

## The revert
Re-disabled all 15 (PowerShell `Disable-ScheduledTask`, all -> `Disabled`, 0 failures). Freeze state
fully restored. NO net change to the machine.

## Doctrine (R7/R8/R12)
- A DISABLED PRISM scheduled task may be under a DELIBERATE operator freeze, NOT an accident. Before
  enabling/disabling/starting ANY `PRISM *` task, check `MIGRATION-FREEZE-ACTIVE.flag` +
  `PRISM_MIGRATION_FREEZE_ACTIVE` + the task's `fleet-task-health-watch` classification
  (`expectedDisabled` vs `degraded`).
- A general directive ("utilize the stack") does NOT override a specific, active, safety-relevant
  operator freeze ("do NOT re-enable until migration done"). Surface the conflict, don't average (R7).
- "Utilize ollama/obsidian/hermes effectively" is satisfied ON-DEMAND without re-arming frozen crons:
  Ollama is UP (17 models), and Obsidian stays fed by the NON-frozen `Hermes-Obsidian Bridge` +
  `Galaxy Synthesis Refresh` (both `Ready`) + the Stop-hook auto-memory-feed.

## Still-valid findings from the same audit (NOT reverted)
- Core fleet-safety net ALL HEALTHY (`Ready/0x0`): Fleet Reaper, Memory Monitor, Task Health, Node
  Orphan Cleaner, Zombie Reaper v2, MCP Server Watchdog, WSL Memory Guard, Cleanup Orchestrator.
- `PRISM MCP Server` = `Running`; its `0x800710E0` is watch-classified "transient resource pressure
  (spawn refused under load), NOT a task failure."
- MCP enforce-gate fix re-verified COMPLETE: `mcp-bridge-enforce-pretool.mjs` is the only heuristic
  block path, disabled, early-exits at line 203 before any I/O. See
  [[reference_mcp_enforce_gate_self_disconnect_2026_06_18]].
- Pre-existing (NOT mine, oscar domain): `PRISM SFC Closed Loop` is `Ready` but never ran (lastRun
  1999 epoch, lastResult 267011) -- a latent stale task to flag to oscar, not touch under freeze.
