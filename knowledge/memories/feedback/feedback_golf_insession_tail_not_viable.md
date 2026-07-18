---
name: golf-insession-tail-not-viable
description: "The /fleet-reaper in-session live-feed tail dies (exit 255) in this harness — don't re-arm it; the durable task IS the reaper"
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.428Z
aliases: feedback_golf_insession_tail_not_viable
---


The `/fleet-reaper` skill's Step C tells you to arm a persistent in-session Monitor (a `tail -F H:/prism/state/shared/fleet-reaper.log | grep ...` background command). **In this Claude Code harness that background command reliably dies with exit 255** — the harness kills long-lived `tail -F` pipes (observed 3× in one golf session 2026-05-29/30). The `&`-backgrounded variant also fails (returns immediately → detaches → killed).

**Why:** The harness's background-task lifecycle terminates persistent stream-followers; there's no in-chat persistent Monitor tool available to this golf agent (the `/checkin-golf` Step C `Monitor({...persistent:true})` tool does not exist in this harness).

**Also confirmed non-viable: `fleet-reaper-sweep.mjs --monitor-loop --interval 300` via `Bash run_in_background` (2026-06-13, session 02a2de10).** It armed, emitted exactly 2 lines (the `monitor armed` banner + the first crash-detect caveat), then exited **code 0** before the first 300s interval tick — the harness ended the background task. So neither the `tail -F` pipe (exit 255) NOR the script's own `--monitor-loop` (exit 0) persists. Do not arm either; relay the durable-task state instead.

**Don't spiral re-arming it** (per [[feedback_autonomous_loop_drift_discipline]]). It is a **UX convenience feed only — NOT load-bearing.** The actual always-on reaper is:
1. The durable **`PRISM Fleet Reaper`** scheduled task (every ~2 min, S4U principal, survives chat exit + reboot). Verify with PowerShell `Get-ScheduledTaskInfo -TaskName "PRISM Fleet Reaper"` → `LastTaskResult=0`.
2. `golf-slot-reaper-guardian.mjs` (SessionStart + UserPromptSubmit) re-kicks a detached `--once` sweep each golf turn.
3. The Stop hook `fleet-reaper-stop.mjs`.

**To "launch reapers + monitors" in golf:** (a) run one `node scripts/fleet-reaper-sweep.mjs --once --json` for an immediate sweep + verdict; (b) `Get-ScheduledTask -TaskName "PRISM*"` to confirm 22/22 Ready + 0 disabled; (c) `Start-ScheduledTask -TaskName "PRISM Fleet Reaper"` (PowerShell — NOT git-bash `schtasks /Run`, which MSYS-mangles `/Run` → a path, see [[reference_golf_schtasks_via_powershell]]). Skip the in-session tail entirely.
