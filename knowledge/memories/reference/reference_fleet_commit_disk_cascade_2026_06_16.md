---
name: reference_fleet_commit_disk_cascade_2026_06_16
description: "Fleet resource cascade (2026-06-16, slot:alpha observed): Windows COMMIT CHARGE hit ~97.4% (205.5/211.4 GB) -> pagefile ballooned on C: -> C: went FULL (ENOSPC) -> BOTH the Bash and PowerShell tool output-capture files (under C:/Users/<u>/AppData/Local/Temp/claude/.../tasks/*.output) became unwritable -> EVERY shell command failed before executing. Root cause: accumulated zombie tsservers + idle Claude chats + fleet procs. Recovery: pressure-gate auto-relief + fleet-reaper sweeps slowly freed headroom until a small `git checkout` succeeded; then `find $TEMP/claude -name '*.output' -mmin +30 -delete` reclaimed C: (-> 41G free). Heavy work (32B Ollama load, all-transcript reads) is UNSAFE while commit>90% -- it re-triggers the crash the pressure gate blocks for."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.573Z
aliases: reference_fleet_commit_disk_cascade_2026_06_16
---


# Fleet commit-charge -> disk-full -> shell-death cascade (2026-06-16)

## The failure chain (each link caused the next)
1. Windows **commit charge** climbed to ~97.4% (205.5 / 211.4 GB = 136GB RAM + pagefile).
2. The pagefile (on **C:**) grew to absorb the pressure -> **C: filled to 0 bytes free**.
3. The Claude Code shell tools (Bash + PowerShell) write each command's stdout/stderr to a
   capture file at `C:/Users/wompu/AppData/Local/Temp/claude/H--prism/<session>/tasks/*.output`.
   With C: full, `open()` on that file threw **ENOSPC BEFORE the command ran** -> every Bash and
   PowerShell call failed identically, regardless of what the command was.
4. Net effect: total shell lockout. Could still Read/Write/Edit (those target H: / don't use the
   C: capture), but no `git`, `node`, `npm`, test, or script could run.

## Why it's an alpha (resource-economy) finding
The trigger was fleet resource accumulation: zombie tsservers (TS language servers from many
chats), 26 idle Claude chats, and fleet daemons all holding committed memory. This is the
token/compute-economy failure mode at the OS layer. **golf owns the reaper fix**; alpha owns
surfacing the efficiency incident.

## Recovery sequence that worked (operator-runnable via `!` when shell is dead)
1. `H:/prism/scripts/system-health/02-kill-zombie-tsservers.ps1` (or `06-aggressive-killer.mjs`) -- frees RAM.
2. `find $TEMP/claude -name '*.output' -mmin +30 -type f -delete` (Bash) OR the PowerShell
   `Get-ChildItem ... *.output | Remove-Item` equivalent -- frees C:. (PS guard false-couples
   `Remove-Item` with any `H:/prism` string in the SAME script -> keep temp-cleanup script free of
   `H:/prism` references.)
3. `/compact` the heaviest chat + close idle chats (the pressure gate's own remedy).
- Self-heal DID partially work unattended (pressure-gate auto-relief 97.4%->96.9% + fleet-reaper
  sweeps), enough that a small `git checkout` eventually ran. But it did not fully clear 90%.

## Operating rule (R12 + the pressure gate)
While **commit > ~90%**, do NOT add heavy load (load a 20GB 32B Ollama model, read hundreds of
transcripts, run a 34-galaxy sweep). That re-spikes commit and risks the crash cascade the gate
exists to prevent. The correct move under pressure is REDUCE load (kill zombies, /compact, close
chats), not push more through. Verify `commit<90%` + `C: free>20G` before any heavy build.

Related: [[reference_fleet_memory_monitor_2026_05_16]] (golf's monitor), [[feedback_golf_owns_reaper]].
