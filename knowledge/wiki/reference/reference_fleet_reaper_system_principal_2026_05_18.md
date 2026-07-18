---
title: "reference_fleet_reaper_system_principal_2026_05_18"
name: reference_fleet_reaper_system_principal_2026_05_18
kind: reference
status: promoted
category: reference
domain: knowledge-vault
promoted_from: knowledge/memories/reference/reference_fleet_reaper_system_principal_2026_05_18.md
promoted_at: 2026-06-06T04:55:53.121Z
source_refs: 3
---

# Fleet Reaper — SYSTEM principal + `--hunt` (FLEET-REAPER Tier 3, 2026-05-18)

**Problem (operator-reported).** The `PRISM Fleet Reaper` scheduled task ran as
**S4U** (current user). S4U can terminate only the installing user's
same-or-lower-integrity processes, so `Stop-Process` returned **"Access is
denied"** on elevated / cross-security-context `node` processes — those orphans
were never reaped. Symptom: a PowerShell window flashing access-denied as the
reaper tried to kill nodes.

**Fix — SYSTEM is now the default principal.** `install-fleet-reaper-task.ps1`
registers the task as `NT AUTHORITY\SYSTEM` by default. SYSTEM terminates ANY
process regardless of owner/integrity, needs no UAC, runs in session 0 (no
window). `-AsCurrentUser` = conservative S4U opt-out; `-AsSystem` = back-compat
no-op alias (pre-existing callers land in the now-SYSTEM default).

**Re-register the task (one elevated command — SYSTEM is the default):**
`! powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-fleet-reaper-task.ps1 -RunNow`

**`fleet-reaper-sweep.mjs` additions:**
- `classifyKillError(errMsg)` — pure, total → `ok|access-denied|not-found|other`.
  `reapProcesses` tags every kill result with `errorClass`, so an access-denied
  failure is named, not a generic error.
- `--hunt` CLI mode — `node scripts/fleet-reaper-sweep.mjs --hunt [--json] [--dry-run]`.
  Task-Manager view of every node/bash/git target + slot class + age + RSS +
  owner + reap verdict, heaviest-RSS first (`buildHuntReport()`). Reaps through
  the SAME confirm-after-N-ticks gate as `--once` (never more aggressive).
  The Claude-Code-invokable "check task manager + hunt orphans the scheduled
  reaper left" surface. Mutually exclusive with `--monitor-loop`/`--status`/`--detach`.

**Lessons.**
- A process reaper must run as **SYSTEM**, not the user — S4U/elevated-user
  still cannot kill cross-context processes; SYSTEM has no such limit.
- A markdown/installer default of "conservative" (S4U) is wrong when the tool's
  whole job is killing arbitrary processes. Default to the privilege the job
  needs; make the conservative mode the opt-out.
- `fleet-reaper-tier.test.mjs` had silently gone stale — it hard-coded
  `DEFAULT_MEM_CRITICAL_PCT=95` and was never updated when OPT-2 lowered the
  constant to 88 (7 pre-existing failures at HEAD). A test that hard-codes a
  constant the production code imports will rot the moment that constant moves
  — import the constant or assert against it explicitly.

Tests: `scripts/__tests__/fleet-reaper-hunt.test.mjs` (26 cases) + realigned
`fleet-reaper-tier.test.mjs`; 103/103 fleet-reaper green; 3-of-3 PASS.
Wiki: [[fleet-reaper]] (Tier 3 section). Related: [[reference_fleet_reaper_tier1_2026_05_17]],
[[reference_fleet_reaper]], [[feedback_golf_owns_reaper]].

## Source

Promoted from memory [[reference_fleet_reaper_system_principal_2026_05_18]] (referenced 3x across the vault). The memory remains the editable source of truth.
