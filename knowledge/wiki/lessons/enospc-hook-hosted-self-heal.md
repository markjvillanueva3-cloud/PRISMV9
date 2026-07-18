---
title: ENOSPC hook-hosted self-heal — recovering shell access when C: is full
tags: [lessons, fleet-hygiene, enospc, hooks, disk, outage, self-heal]
created: 2026-07-02
by: claude-7fae921d (slot:golf)
unit: FLEET-HYGIENE/U-GOLF-ENOSPC-SELFHEAL
---

# ENOSPC hook-hosted self-heal

Live P0 outage 2026-07-02 ~04:30: C: (1.9TB) hit 100%. **Every Bash/PowerShell tool
call in every fleet session failed** — the Claude Code harness creates an
output-capture file per shell command under
`%LOCALAPPDATA%\Temp\claude\<proj>\<session>\tasks\*.output`, and file CREATION fails
on a full NTFS volume. The agent loses exactly the tools it needs to free space.

## The capability map under total C:-ENOSPC (measured, not assumed)

| Path | Status | Why |
|---|---|---|
| Bash / PowerShell tools | ✗ dead | output-capture file creation fails |
| Write / Edit on C: | ✗ dead | atomic tmp+rename needs a NEW file |
| Read / Glob / Grep | ✓ work | in-process, read-only |
| Write / Edit on H: | ✓ work | other volume |
| **PreToolUse/Stop hooks** | ✓ **run** | pipe I/O, no capture file — they fire even on the failing call |
| Detached `spawn(..., {detached, stdio:"ignore"})` | ✓ works | no capture file, survives parent |
| `fs.unlinkSync` / `rmdirSync` on C: | ✓ work | deletion is the one mutation a full volume allows |

**The recovery vector**: an existing WIRED PreToolUse hook's script file (H:-hosted,
re-executed fresh per event — no settings reload needed) gains a fail-soft call into a
new module that detects the crisis and spawns a DETACHED sweeper. The very Bash call
that triggers the hook can then complete.

## Four pitfalls hit live (each cost a failed iteration)

1. **`statfsSync("C:\\")` threw on win32 node22** → fell back to a 1-byte probe write,
   which **false-passed** in the thrash regime (fleet churn leaves a few MB free for
   milliseconds) → self-heal froze on the space-ok branch while the harness still
   ENOSPC'd. Fix: statfs `os.tmpdir()` first; probe fallback writes **4MB** (conclusive).
2. **In-hook walks get killed by the hook timeout** — the sweep marker was written but
   the completion log never appeared. Fix: hook does guards only; a detached child does
   the walks (no timeout, survives parent exit).
3. **Crumbs don't help**: freeing 83MB of old `.output` files restored shells for ONE
   command before the fleet re-consumed it. The lever that mattered was found by a
   detached **diagnoser** sizing known hogs to an H: log: NVIDIA shader/compute caches
   (`%LOCALAPPDATA%\NVIDIA`) held **11.16GB** — safely deletable, rebuilt on demand
   (same target as Windows Disk Cleanup). Freed 11.96GB total → fleet restored.
   Corollary: the original alert blamed ollama models + transcripts; both measured ~0GB
   on C:. **Diagnose before prescribing** — even (especially) in an outage.
4. **Agent-task `.output` files are SYMLINKS to live subagent transcripts** — a naive
   `*.output` delete would destroy transcript data. `lstat` + skip non-regular-files;
   the test suite carries an adversarial case for it.

## The permanent asset

`H:/prism/.claude/hooks/lib/emergency-c-temp-sweep.mjs` (+ 7/7 node:test suite), called
fail-soft from `rtk-prefix-reminder.mjs` (PreToolUse:Bash — fires on every Bash call
fleet-wide). Cheap-when-healthy: statfs low-water guard (<500MB), 2-min H:-marker
throttle, per-file try/catch, never throws into the host hook. Logs to
`state/shared/emergency-c-sweep.log` + `emergency-c-diagnose.log`.
Knob: `PRISM_EMERGENCY_C_SWEEP_DISABLE=1`.

Sibling lessons: [[worktree-integration-graft-pitfalls]] · [[live-shared-file-size-assertions-flake]].
Alert/runbook: `state/shared/ALERT-C-DRIVE-FULL-2026-07-02.md`.
