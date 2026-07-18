# ~~P0 ALERT~~ RESOLVED — C: DRIVE FULL (ENOSPC) — 2026-07-02

**Status: RESOLVED 07:35Z (02:35 local) by golf self-heal.** C: free went 0 → 11.96 GB.
Fleet shell tooling (Bash/PowerShell in all sessions) is working again.

## What happened

C: (1.9 TB) hit 100% at ~04:30 local. The Claude Code harness could not create its
output-capture files (`%LOCALAPPDATA%\Temp\claude\...\tasks\*.output`) so EVERY
Bash/PowerShell tool call in EVERY fleet session failed with ENOSPC. Write/Edit on C:
were also dead (atomic tmp+rename needs a new file). PreToolUse hooks still executed
(pipe I/O), which became the recovery vector.

## Root cause (measured, not guessed)

- The suspects in the original alert (ollama models, claude transcripts) were WRONG —
  the detached diagnoser measured both at ~0 GB on C:.
- The recoverable hog was **NVIDIA shader/compute caches: 11.16 GB** at
  `%LOCALAPPDATA%\NVIDIA` (DXCache/GLCache/ComputeCache/OptixCache — rebuilt on demand).
- The rest of the 1.9 TB is long-standing data. **The drive remains ~99.4% full** —
  11 GB headroom is operating margin, not health.

## The fix (now permanent fleet infra)

`H:\prism\.claude\hooks\lib\emergency-c-temp-sweep.mjs`, invoked fail-soft from the
`rtk-prefix-reminder.mjs` PreToolUse:Bash hook (fires on every Bash call fleet-wide):

- statfs low-water guard (runs only when C: free < 500 MB), 2-min throttle marker on H:.
- Spawns a DETACHED sweeper (immune to hook timeouts + broken output capture) that
  deletes: consumed harness `*.output` temp files >10 min (lstat — never follows the
  agent-transcript symlinks), stale `cache-break-state-*.json` >2 h, `%TEMP%` top-level
  files >3 d, and the NVIDIA cache dirs.
- Spawns a detached diagnoser that sizes known hogs → `emergency-c-diagnose.log`.
- Logs: `state/shared/emergency-c-sweep.log`. Knob: `PRISM_EMERGENCY_C_SWEEP_DISABLE=1`.
- Live result: `sweep DONE files=176 bytes=11958930784 errs=6` (6 locked files, fail-soft).

## Operator follow-ups (non-urgent)

1. C: is still ~99.4% full of long-term data — golf will not touch it. When the NVIDIA
   cache regrows (weeks), the self-heal reclaims it again, but real headroom needs a
   storage decision (move data to H:, bigger drive, or Windows cleanmgr for system files).
2. The 6 locked cache files free up after a reboot/GPU-idle sweep.
3. Recovery lessons: wiki [[enospc-hook-hosted-self-heal]] (written this session).
