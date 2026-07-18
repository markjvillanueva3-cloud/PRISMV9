# U-OBSOLETE-REAPER-TASKS — disable 3 reapers superseded by Fleet Reaper MS1+ (2026-05-25)

> Unit: U-OBSOLETE-REAPER-TASKS (FLEET-REAPER-MS1, cost=S). Originally surfaced by JULIETT iter-3.5. Closed in /loop iter6, slot:golf, claude-9e91d800.

## TL;DR

3 reaper-class scheduled tasks were running concurrent with the canonical `PRISM Fleet Reaper` (MS1+MS2+MS3, golf-owned per [[feedback_golf_owns_reaper]]) → PID-reuse race risk (multiple reapers scanning + killing PIDs from stale snapshots). All 3 **disabled** (NOT deleted, per [[feedback_never_delete_only_disable]]). Script files preserved on disk — reversible via `Enable-ScheduledTask`.

## Disabled tasks

| Task | Action | Why obsolete |
|---|---|---|
| `PRISM Orphan Process Reaper (PS)` | `powershell.exe ... reap-orphan-procs.ps1 -Quiet` | Pre-Fleet-Reaper-MS0 PowerShell-based orphan reaper. Lacks PID→slot ancestry mapping. |
| `PRISM Zombie Reaper v2` | `node ... stop_close_prism_nodes_v2.mjs` | Pre-Fleet-Reaper-MS0 Node-based zombie reaper. Lacks confirm-after-N-ticks gating + watchdog coordination. |
| `PRISM Node Orphan Cleaner` | `node ... node-orphan-cleaner.mjs --scheduled` | Node-process orphan cleaner. Functionality absorbed into Fleet Reaper MS2 enumeration-cache + cross-PC host filter. |

All three were last successful (LastResult=0x00000000) at 17:00 today — they were healthy reapers; just superseded.

## Canonical replacement: `PRISM Fleet Reaper`

| Element | Value |
|---|---|
| Task name | `PRISM Fleet Reaper` |
| Owner | slot:golf (doctrine moved alpha → golf 2026-05-16) |
| Action | `node H:/PRISM/scripts/fleet-reaper-sweep.mjs --once` |
| Last run | 2026-05-25 17:02:02 (success) |
| Capability superset | PID→slot ancestry mapping (chat-slots.json) · confirm-after-N-ticks gating (default 2×300s) · Tier-1 graduated pressure gate (MS1) · critical-memory ballast · Tier-2 service-restart coordination (Docker NEVER auto-restart) · Tier-3 GPU/Ollama coordinator · enumeration-cache sidecar (MS2) · cross-PC host filter (MS2) · SYSTEM principal mode · `--hunt` operator surface |

The Fleet Reaper does everything the 3 disabled tasks did, plus the seven additional safety mechanisms listed above. Running the older tasks concurrently is **strictly net-negative** (race risk, no additional coverage).

## Reversal path

If Fleet Reaper ever falls back (regression in MS1+ wiring) and the older reapers need to step in:

```powershell
Enable-ScheduledTask -TaskName "PRISM Orphan Process Reaper (PS)"
Enable-ScheduledTask -TaskName "PRISM Zombie Reaper v2"
Enable-ScheduledTask -TaskName "PRISM Node Orphan Cleaner"
```

Script files remain on disk at the paths recorded in the Actions table above. No files were deleted.

## Kill-switch awareness

Fleet Reaper recognizes these env-var kill-switches (already documented in CLAUDE.md §FLEET-REAPER):

- `PRISM_FLEET_REAPER_DISABLE=1` — disables ALL reaping fleet-wide
- `PRISM_GOLF_GUARDIAN_DISABLE=1` — disables the golf-slot guardian arm only
- `PRISM_ALPHA_GUARDIAN_DISABLE=1` — back-compat alias for the above (carried forward from alpha-owned era)

If any kill-switch is set today, the disabling of the 3 older tasks above means **no reaping happens until the switch is cleared**. As of this writing, no kill-switch is active.

## Verification post-disable

```powershell
Get-ScheduledTask -TaskName "PRISM Orphan Process Reaper (PS)" | %{ $_.State }   # → Disabled
Get-ScheduledTask -TaskName "PRISM Zombie Reaper v2"           | %{ $_.State }   # → Disabled
Get-ScheduledTask -TaskName "PRISM Node Orphan Cleaner"        | %{ $_.State }   # → Disabled
Get-ScheduledTask -TaskName "PRISM Fleet Reaper"               | %{ $_.State }   # → Ready (active)
```

All 4 outputs verified at 2026-05-25 17:02:02 CST.

— Closed 2026-05-25 by claude-9e91d800 (slot:golf, /loop iter6).
