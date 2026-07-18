---
name: scheduled-task-patterns
category: code-tribal
domain: backend-dev
tags: [scheduled-task, cron, windows-task, s4u, system-principal, prism-development, ai-development]
last_updated: 2026-05-18
---

# Scheduled-Task Patterns — Windows tasks, S4U, SYSTEM, /loop cron

PRISM ships 8+ scheduled tasks (Fleet Reaper, Fleet Memory Monitor, Cleanup Orchestrator, Node Orphan Cleaner, Zombie Reaper v2, Hook Janitor, Synergy Regression Watch, NN-Graph Retrain Lifecycle). The right principal + cadence makes the difference between "task runs reliably" and "task silently never fires".

## Principal selection — SYSTEM beats S4U for PRISM tasks

The 2026-05-18 hotel U-FR-ADMIN-HUNT lesson: the fleet-reaper task ran as S4U (current user) and `Stop-Process` returned "Access is denied" on elevated / cross-context node processes. PRISM switched to SYSTEM as the DEFAULT principal.

Principal trade-offs:

| Principal | Pros | Cons |
|-----------|------|------|
| SYSTEM | Terminates ANY process regardless of owner/integrity; no UAC; runs session 0 (no window) | No user-context env vars; can't access mapped drives without remapping |
| S4U (current user) | Survives logoff (Service-For-User); user env vars available | Can't kill elevated peers; can't kill SYSTEM-spawned children |
| Interactive | Full user env; pops UAC for elevation | Doesn't run if user not logged in; window flashes on every fire |

PRISM default: **SYSTEM** for any task whose job is to reap/manage other processes. **S4U** for user-context maintenance (e.g. memory-feed). **Interactive** almost never.

## Registration triggers

Two complementary triggers:

1. **AtStartup** — task runs once per boot. Resumes pre-login on reboot.
2. **Cadence** (per-minute/hour) — periodic firing.

Both: `-RestartCount 3 -RestartInterval 1m` recovery for transient failures.

## The "no -Principal omits it" trick

`Register-ScheduledTask -Principal $null` FAILS — the cmdlet treats `$null` as "I want a principal but you sent garbage". Use splatting and OMIT the `-Principal` key entirely when going legacy/Interactive:

```ps1
$params = @{ Action = $act; Trigger = $trig }
if ($useSystem) { $params.Principal = $sysPrincipal }
Register-ScheduledTask @params
```

## One-elevated-command install

The PRISM convention:

```
! powershell -NoProfile -ExecutionPolicy Bypass -File <installer>.ps1 -RunNow
```

The `!` prefix runs in the operator's session so UAC pops in their PowerShell. Installer detects elevation, picks SYSTEM if elevated, S4U if not. `-RunNow` polls until first run completes.

## Cron job vs Scheduled task — when each

PRISM uses BOTH:

- **Anthropic CronCreate** (session-only) — for `/loop` in a single chat. Auto-expires 7d. Dies when claude session exits.
- **Windows scheduled task** — for cross-session, host-pinned work (fleet hygiene). Persists across reboots.

Don't mix: a session-only `/loop` is wrong for fleet-wide hygiene (only fires while THIS chat is alive). A scheduled task is wrong for per-chat work (no chat context).

## The Anthropic CronCreate contract

`CronCreate({cron, prompt, recurring})` — fires the prompt back into THIS chat session. Subject to:
- **Cache TTL: 5 min.** Sleeps ≥5 min pay a cache miss; prefer 270s over 300s when possible.
- **Skewed minute marks**: avoid `:00` — every chat at `0 9 * * *` lands on the API at the same instant. Prefer `57 8 * * *` or `3 9 * * *` for round-number requests.
- **7-day auto-expire** on recurring jobs.

## The "self-rounding cron" gotcha

`*/7 * * * *` looks reasonable but produces uneven gaps at :56→:00 (7 doesn't divide 60). The Anthropic cron pattern table rounds: 7m → "every 5m or 10m, pick one". Be explicit when the divisor is odd.

## Multi-host scheduled tasks (the cross-PC pattern)

Slot IDs are NOT host-pinned. Each PC runs its OWN scheduled task instance (fleet-reaper on PC-A AND PC-B). The fleet-reaper-MS2 U-FR-S3 cross-PC host filter prevents PC-A's task from acting on PC-B's processes via PID reuse.

Implication for new scheduled tasks: include a host filter on enumeration paths. Use `os.hostname()` at task start; reject targets where host doesn't match.

## Phase offsets to avoid pile-on

Scheduled tasks in the same 5-min window can pile onto the same Windows API queue. Phase offset their start times:
- Fleet Reaper: +210s
- Fleet Memory Monitor: +330s
- Cleanup Orchestrator: +60s
- Memory Pressure Auto-Relief: +120s

Pattern: `install-<task>.ps1` takes `-StartOffsetSeconds N` parameter.

## Telemetry rotation

Long-running scheduled tasks accumulate telemetry. PRISM rotates at 512KB per JSONL file:

```js
if (stats.size > 512*1024) { fs.renameSync(path, path + ".1.jsonl"); }
```

Without rotation, the JSONL files grow unbounded and stop fitting in memory for analysis.

## Common failures

- **Task installed but Logon Mode = Interactive only**: never fires unless logged in. Fix: `-Principal SYSTEM` or S4U.
- **Stale stamp-throttle file**: task fires but always returns "skipped, throttle active". Fix: delete stamp; sweep on next fire.
- **PowerShell ConvertTo-Json + control bytes**: PS 5.1 emits raw C0 bytes in JSON strings. `JSON.parse` throws. Strip `[\x00-\x1F]` before serialization.
- **Get-CimInstance vs deprecated wmic**: prefer Get-CimInstance; wmic is deprecated and flaky on Win11.
- **`-Execute` points at the `portable-node` bash shim**: `H:\.claude\bin\portable-node` is a `#!/bin/bash` script; Task Scheduler's `CreateProcessW` cannot launch a shebang script, so the task shows `State: Ready` but every fire fails silently with `LastTaskResult = 2147942593` (`0x80070001 ERROR_INVALID_FUNCTION`; sometimes `0xC1 ERROR_BAD_EXE_FORMAT`) — no output, no ledger row, no alarm. An "autonomous, no-down-time" cron is then dead on arrival while looking healthy. **Fix:** `-Execute 'H:\Tools\nodejs\node.exe'` (the real 82MB PE binary every working PRISM installer uses), or the sibling `portable-node.cmd`; never the extensionless bash script. Live-validate a fire — don't trust `State: Ready`. For a user-authenticated local service (e.g. the Hermes OAuth proxy on :8645) pair with `-Principal` **S4U current-user** (not SYSTEM, which can't reach it) so it fires logged-off. (HERMES-UNIT-PLAN/U-ZULU-UNITPLAN-CRON-EXEC-FIX `e306e41329`, 2026-07-02; see [[reference_hermes_unit_plan_harness_2026_07_02]].)

## Knobs

- `-DryRun` on installer: verify task definition without writing
- `-Uninstall`: remove cleanly
- `-RunNow`: install + fire immediately + poll
- `-AsCurrentUser` / `-AsSystem` / `-Interactive`: principal opt-outs

## Related

- [[hook-lifecycle-anatomy]] — Stop hooks run in-chat; scheduled tasks run cross-chat
- [[multi-chat-coordination]] — slot worktrees + scheduled tasks compose
- CLAUDE.md "FLEET-REAPER-MS0/MS1/MS2/Tier-1-3" — canonical scheduled-task examples
- CLAUDE.md "FLEET-MEMORY-MONITOR-MS0" — cross-chat RAM watchdog
