---
name: fleet-memory-monitor
type: architecture
created: 2026-05-16
slot: golf-work
canonical: scripts/fleet-memory-monitor.mjs
related: [[fleet-reaper]] [[session-continuity-stack]] [[memory-size-watch]]
---

# Fleet Memory Monitor

Durable **system-RAM + per-chat-tree memory monitor** for the 13-chat PRISM fleet.
Runs every 5 minutes via Windows Scheduled Task, **independent of any single
chat** (survives `/compact`, every claude session closing, reboot when installed
elevated).

## Why this exists (the gap fleet-reaper leaves)

`fleet-reaper-sweep.mjs` reaps orphan processes of **crashed** slots — a 10-min
confirm window before any kill. It works perfectly for post-crash cleanup but
has nothing to do when all 13 chats are **alive**: zero reap candidates, sweep
returns `ok 0 candidates`, and meanwhile system memory drifts past 90% commit
because every live chat's claude.exe tree is ~700-900MB plus its node/git
descendants.

The doctrine added 2026-05-14 makes alpha the reaper owner via
`alpha-slot-reaper-guardian.mjs`. That's correct for reaping — but it also means
when alpha goes through `/compact`, the in-session Monitor pauses. The scheduled
task survives, but the user's stated pain was clear: **"fleet-reaper isn't
enough since it drops during alpha's compaction."**

This monitor closes the gap by answering a different question:

| Tool                      | Answers                                                   | Action       |
|---------------------------|-----------------------------------------------------------|--------------|
| `fleet-reaper-sweep.mjs`  | "Which orphan processes of crashed slots can I kill?"     | destructive  |
| `fleet-memory-monitor.mjs`| "Which LIVE chat tree is largest, and is the box at risk?"| advisory     |

## Architecture

### Attribution unit: claude.exe process trees, NOT chat-slots.pid

Initial design tried to attribute RSS by joining processes to slots via
`chat-slots.json`'s `state.pid` field. Live verification showed **slot.pid is
ephemeral** — it's whatever subshell happened to call `chat-slots.mjs claim`
(typically a bash.exe spawned by the Bash tool, exiting seconds later). The
`terminalWindowId` field encodes a parent shell pid that's also recycled across
`/compact`. Neither survives long enough to anchor a 5-min sweep.

What IS stable: the **claude.exe process itself**. Each open chat IS a claude.exe
process; the harness restart on `/compact` spawns a NEW claude.exe whose
descendants are clean (the previous one truly dies). So the chat-tree
attribution unit is **"claude.exe PID + all descendants via parent chain"**.

13 chats → 13 claude.exe processes. If a sweep counts a different number,
that's the honest live state, not an attribution error.

### Slot label overlay (best-effort, never invented)

When a slot's `state.pid` happens to land on a live claude.exe (rare but
possible), the tree carries the slot's name. Otherwise the tree key is
`tree-<PID>` and the operator identifies the window by PID themselves. We
**never invent** a slot label.

### Sample → decide → emit pipeline

1. **Sample** (`samplePowerShell`) — one PS5.1 `Get-CimInstance` call:
   - `Win32_OperatingSystem` for `TotalVisibleMemorySize` / `FreePhysicalMemory`
     (physical RAM) + `TotalVirtualMemorySize` / `FreeVirtualMemory` (commit).
   - `Win32_Process` filtered to `node.exe|claude.exe|bash.exe|git.exe|pwsh.exe|powershell.exe`,
     selecting `ProcessId / ParentProcessId / Name / WorkingSetSize`.
   - C0 control bytes stripped INSIDE PowerShell before `ConvertTo-Json`
     (per the 2026-05-16b lesson on reaper enumeration blinding from raw bytes
     in CommandLine — defensive even though we don't emit CommandLine).
   - 10s timeout; fail loud per R12 (exit 3 on PS error).

2. **Attribute** (`attributeProcesses`):
   - Anchor set = every live claude.exe pid.
   - For each enumerated proc, walk parent chain (max 32 hops, cycle-safe) until
     hitting a claude.exe ancestor → that tree gets the RSS + count.
   - Procs with no claude.exe ancestor → `unowned` bucket (rare).

3. **Decide** (`decideLevel`):
   - `worst = max(physUsedPct, commitUsedPct)` — commit pressure causes hard
     chat-death on Windows even with physical RAM available, so the worst-of-two
     wins.
   - `clean` < `warnPct` (default 80) ≤ `warn` < `critPct` (default 92) ≤ `critical`.

4. **Advise** (`decideAdvisory`):
   - `critical` → emit immediately if cooldown elapsed.
   - `warn` → emit only after N consecutive warn ticks (default 2) AND cooldown.
   - `clean` → never emits; resets the warn counter.
   - Cooldown defaults to 600s (10 min) — prevents AGENT_CHAT.jsonl spam during
     sustained-pressure incidents.

5. **Emit** — one JSONL append to `state/shared/AGENT_CHAT.jsonl`:
   ```json
   {"ts":"...","from":"fleet-memory-monitor","kind":"memory-pressure",
    "level":"critical","physUsedPct":74.5,"commitUsedPct":96.0,
    "largestTree":"tree-46816","largestTreePid":46816,
    "largestRssBytes":899780608,"liveChatTrees":12,
    "message":"system memory pressure CRITICAL ... recommend /compact on tree-46816 (PID 46816, 858MB tree)"}
   ```

## Telemetry

Every sample appends one row to `state/shared/fleet-memory-history.jsonl`
(size-rotated at 512KB → `.1` backup). Schema fields documented in the script
header.

Read:
```bash
node H:/prism/scripts/fleet-memory-monitor.mjs --status     # last sample summary
node H:/prism/scripts/fleet-memory-monitor.mjs --history 50 # last 50 rows
```

## Independence invariant

Three layers compound:

1. **Windows Scheduled Task `PRISM Fleet Memory Monitor`** — every 5 min,
   S4U principal (when installed elevated) → runs whether logged on or not +
   AtStartup trigger → boot resumes monitoring before any login. Survives
   every chat closing. Restart 3×1m on crash.
2. **No alpha dependency** — unlike `alpha-slot-reaper-guardian.mjs`, this
   monitor has no chat-side guardian, no in-session Monitor. The scheduled
   task IS the only firing surface.
3. **Phase offset +330s** — lands between the 5-min "Cleanup Orchestrator"
   (+60s), "Memory Pressure Auto-Relief" (+120s), and "PRISM Fleet Reaper"
   (+210s) so all four 5-min host tasks don't phase-lock onto the same minute.

## Files

| Path                                                                   | Role                                |
|------------------------------------------------------------------------|-------------------------------------|
| `scripts/fleet-memory-monitor.mjs`                                     | Main sweep                          |
| `scripts/fleet-memory-monitor.test.mjs`                                | 28 unit tests (pure functions)      |
| `.claude/helpers/install-fleet-memory-monitor-task.ps1`                | Elevated installer (S4U/AtStartup)  |
| `.claude/helpers/register-fleet-memory-task-unelevated.ps1`            | Unelevated current-user fallback    |
| `state/shared/fleet-memory-history.jsonl`                              | Telemetry (rotated at 512KB)        |
| `state/shared/fleet-memory-monitor-state.json`                         | Warn-tick + cooldown ledger         |
| `state/shared/AGENT_CHAT.jsonl`                                        | Advisory emit target (shared)       |

## CLI

```bash
node scripts/fleet-memory-monitor.mjs                # one sample, text
node scripts/fleet-memory-monitor.mjs --once --json  # one sample, JSON
node scripts/fleet-memory-monitor.mjs --status       # read-only summary
node scripts/fleet-memory-monitor.mjs --history [N]  # tail N rows (default 20)
node scripts/fleet-memory-monitor.mjs --reset        # clear telemetry+ledger
node scripts/fleet-memory-monitor.mjs --no-advisory  # sample+telemetry, no chat-bus emit
node scripts/fleet-memory-monitor.mjs --dry-run      # full sample, no writes

Exit codes: 0 clean · 1 warn · 2 critical · 3 measurement/IO failure
```

## Env knobs

| Var                                              | Default | Effect                                          |
|--------------------------------------------------|---------|-------------------------------------------------|
| `PRISM_FLEET_MEMMON_DISABLE=1`                   | off     | Sweep refuses to write/emit                     |
| `PRISM_FLEET_MEMMON_WARN_PCT`                    | 80      | Warn threshold (% of worst-of-phys-or-commit)   |
| `PRISM_FLEET_MEMMON_CRIT_PCT`                    | 92      | Critical threshold                              |
| `PRISM_FLEET_MEMMON_ADVISORY_COOLDOWN_SEC`       | 600     | Min seconds between AGENT_CHAT emits            |
| `PRISM_FLEET_MEMMON_SUSTAINED_TICKS`             | 2       | Consecutive warn ticks before warn advisory     |
| `PRISM_FLEET_MEMMON_PS_TIMEOUT_MS`               | 10000   | PowerShell sample timeout                       |

## Hardening from unelevated → elevated

The first registration uses `register-fleet-memory-task-unelevated.ps1` (runs
as current user, while logged in). For full autonomy (S4U + AtStartup +
runs-when-logged-off), run from an **elevated** PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File H:\prism\.claude\helpers\install-fleet-memory-monitor-task.ps1 -RunNow
# Add -AsSystem for SYSTEM-account mode (can attribute ANY user's processes).
```

## Live verification (2026-05-16, slot=golf-work, claude-629a6355)

- Sample: phys 74.5% / commit 96.0% / 12 chat trees detected → exit code 2 (critical)
- Largest tree: PID 46816 (858MB)
- Advisory emitted to AGENT_CHAT.jsonl with `/compact` target
- Scheduled task `NextRunTime` cadence confirmed at 5-min intervals
- 28/28 unit tests pass (`node --test scripts/fleet-memory-monitor.test.mjs`)
