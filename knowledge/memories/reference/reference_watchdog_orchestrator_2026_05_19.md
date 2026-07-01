---
name: watchdog-orchestrator-2026-05-19
description: U-WD-ORCHESTRATE — ensure-all-watchdogs.ps1 brings up the 10-watchdog scheduled-task stack as /fleet-reaper Step 0
aliases: reference_watchdog_orchestrator_2026_05_19
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.253Z
---


# Watchdog-stack orchestrator — /[[reference_fleet_reaper|fleet-reaper]] Step 0 (U-WD-ORCHESTRATE, 2026-05-19)

Commit `bfb498bc42` (slot/hotel, MCP-RESILIENCY-MS0). New
`.claude/helpers/ensure-all-watchdogs.ps1` iterates a canonical **10-watchdog**
table and installs/enables any Absent/Disabled scheduled task; Ready ones
no-op. Wired into `/fleet-reaper` as **Step 0** so one command brings up the
whole [[feedback_golf_owns_reaper|fleet-hygiene]] safety net.

The 10 watchdogs: PRISM MCP Server · MCP Server Watchdog · [[reference_fleet_reaper|Fleet Reaper]] ·
[[reference_fleet_memory_monitor_2026_05_16|Fleet Memory Monitor]] · Cleanup Orchestrator · Memory Pressure Auto-Relief ·
Zombie Reaper v2 · Hook Janitor · Node Orphan Cleaner · [[reference_synergy_regression_watch_2026_05_16|Synergy Regression Watch]].

**Two scrutiny-caught design corners (2 reviewers ×2 rounds, PASS/PASS):**

1. **Exit-code capture** — `Install-Watchdog` does NOT trust `$LASTEXITCODE`
   from a nested `& powershell ... 2>&1` (unreliable — reported false
   `INSTALL-FAILED` while the task registered fine, observed live on the
   Cleanup Orchestrator). Load-bearing check is now a post-install
   `Get-ScheduledTask` probe: task present after the attempt ⇒ INSTALLED.

2. **Elevation downgrade, not throw** — registering a scheduled task needs an
   elevated shell, but `/fleet-reaper` Step 0 runs from a normal non-elevated
   Bash/MCP shell. The orchestrator's first cut `throw`'d there → would abort
   the whole `/fleet-reaper` pipeline on every routine run, AND the skill doc
   claimed a "-WhatIf fallback" the code didn't do (both reviewers FAILed
   round 1 on the R12 doc-vs-code lie). Fixed: a non-elevated shell downgrades
   to `-WhatIf` (report-only), warns, prints `⚠ REPORT-ONLY` + an `elevate:`
   line with the exact admin re-run command, and exits 0 so Step 0 never
   aborts the sweep.

**Lessons** — (a) never trust `$LASTEXITCODE` through a nested `& pwsh 2>&1`;
verify state directly (post-install probe). (b) A skill doc that describes a
"graceful fallback" the code doesn't implement is an R12 fail-loud violation —
fix the *code* to match when the fallback is what makes the feature usable.
(c) `$helpersDir` is intentionally pinned to the main tree — scheduled tasks +
installers are host-global, not slot-scoped.

Skill: `/fleet-reaper` Step 0. Knobs: `--no-ensure-watchdogs` (skip Step 0);
orchestrator `-WhatIf`/`-Force`/`-Quiet`/`-Only`/`-Skip`. Wiki:
[[fleet-reaper]] §Step 0. Sister to [[reference_mcp_dropping_permanent_fix_2026_05_19]].
