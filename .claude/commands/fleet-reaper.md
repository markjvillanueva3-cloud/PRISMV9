---
name: fleet-reaper
description: Launch the slot-aware orphan-process reaper for the 7-chat fleet. Maps every running node/git/bash process to the chat slot that spawned it (chat-slots.json) and reaps orphans of crashed/dead chats — gated by a confirm-after-N-ticks rule so a live chat's process is never killed. Runs an immediate sweep, ensures the durable 5-min scheduled task, and launches an in-session Monitor for a live reap/memory event feed. Use when orphan node/bash/git processes are piling up, host memory is unstable, or you want hands-off fleet hygiene while 7 chats run concurrently.
type: skill
model: sonnet
effort: low
context: development
allowed-tools:
  - Bash
  - Monitor
triggers:
  - event: UserPromptSubmit
    matcher:
      type: keyword
      value: "fleet reaper|orphan process|reap orphan|close orphan|zombie process|orphan node|stale bash|fleet hygiene|orphan processes piling up|host memory unstable"
    score: 0.8
    action: suggest
impact:
  upstream:
    - operator manual invocation when orphans pile up / host memory is unstable
    - the FLEET-REAPER pipeline doctrine in H:/PRISM/CLAUDE.md
  downstream:
    - state/shared/fleet-reaper-candidates.json (confirm-after-N-ticks ledger)
    - state/shared/fleet-reaper.log (JSONL audit of every reap)
    - Windows scheduled task "PRISM Fleet Reaper" (registered if absent; needs an elevated shell)
    - an in-session Monitor watch (live event feed; dies with the chat that armed it)
    - reaped node/git/bash processes owned by crashed chat slots
  bounded: true
  reversible: true  # task is Disable/Uninstall-able; Monitor is TaskStop-able; PRISM_FLEET_REAPER_DISABLE=1 is the fleet-wide kill switch
---

# /fleet-reaper — slot-aware orphan reaper for the 7-chat fleet

> PRISM runs up to 7 concurrent chats (alpha..foxtrot + golf). Each spawns
> `node.exe` (hooks/MCP), `bash.exe` (the Bash tool), `git.exe` children. When a
> chat crashes or is closed without firing its Stop chain, those children are
> orphaned — they pin RAM and, across several dead chats, cause the commit-memory
> pressure that destabilizes the *surviving* chats. This skill stands up the
> reaper that maps each process to its owning slot and kills only the genuinely
> dead ones.

> **🛑 KILL SWITCH — `PRISM_FLEET_REAPER_DISABLE=1`.** This pipeline kills
> processes unattended (a 5-min scheduled task + an in-session Monitor + a Stop
> hook). Setting that one env var makes the sweep refuse to kill anything in
> *every* runner, fleet-wide, regardless of which chat armed it. It is the only
> lever that stops ALL reaping at once — `--uninstall` only tears down *this
> chat's* Monitor + the (global) task. If the reaper ever kills something it
> shouldn't, set the env var first, investigate after.

> **Run `/fleet-reaper` in ONE chat only.** The scheduled task is global and the
> Stop hook fires in every chat — a second chat's Monitor is just redundant load
> on the host this skill exists to protect (it spawns the very `node.exe`
> processes the reaper hunts). To move the Monitor to another chat, `--uninstall`
> in the old one first.

## When to use

- Orphan `node.exe` / `bash.exe` / `git.exe` are accumulating in the OS process list
- Host memory is creeping up and the 7 chats are getting sluggish / OOM-y
- You want hands-off fleet hygiene running for the rest of the session
- After a chat crashed or was force-closed (its children are now orphans)

## When NOT to use

- To reap stale **claims / locks / chat-bus** entries — that's the generic
  `node .claude/helpers/cleanup-orchestrator.mjs` (and the `PRISM Cleanup
  Orchestrator` scheduled task). This skill owns the **slot-attributed process**
  layer those reapers lack — run BOTH; they cover different things.
- To kill a *specific* process you know is bad — just `taskkill` it directly;
  the reaper is for the "which of these 400 processes are orphans?" problem.

## Args: $ARGUMENTS

- *(empty)* — full pipeline: immediate sweep → ensure scheduled task → launch Monitor
- `--status` — report only: read-only sweep classification + scheduled-task state. No ledger write, no install, no Monitor, no kills.
- `--dry-run` — burn-in: every runner this skill arms (the immediate sweep AND the Monitor) gets `--dry-run` — it classifies + decides but NEVER kills. Use to watch slot attribution before going live.
- `--no-task` — skip the scheduled-task step. ⚠ If no task was already registered, reaping stops when this chat closes (Monitor-only).
- `--no-monitor` — skip the in-session Monitor. ⚠ If the scheduled task also isn't registered, NOTHING is armed — the confirm clock will never advance.
- `--uninstall` — stop the Monitor armed by THIS chat (TaskStop) and unregister the global "PRISM Fleet Reaper" scheduled task (needs an elevated shell — same as install). Monitors armed in *other* chats are unaffected; for a true fleet-wide stop, use `PRISM_FLEET_REAPER_DISABLE=1`.

## Protocol

### Step 1 — Sweep (always)
Default / `--dry-run`:
```bash
node H:/prism/scripts/fleet-reaper-sweep.mjs --once --json
# add --dry-run too if the user passed --dry-run
```
`--status` (read-only — does NOT write the ledger):
```bash
node H:/prism/scripts/fleet-reaper-sweep.mjs --status --json
```
Report from the JSON: the process-class counts under the `slots` field
(`slots["owned-by-alive"]` / `owned-by-stale` / `owned-by-crashed` / `unowned` /
`protected` — the JSON field is *named* `slots` but holds PROCESS counts, not
slot counts), `pending` vs `reapedOk`, `mem.usedPct` (the headline memory % —
the max of physical & commit), and any `caveats` (e.g. a live slot whose PID
couldn't be resolved). **For `--status`: also run `schtasks /Query /TN "PRISM
Fleet Reaper" 2>/dev/null` to report task state, then STOP — skip Steps 2-4's
install/Monitor and just print the verdict.**

A sweep reaps a process only when ALL hold: it is `owned-by-crashed` or
`unowned`, older than the age floor (45s), AND has been continuously a candidate
for ≥ `kill-after × interval` of wall-clock (default 2 × 300s = 10 min — a
mid-cycle first-sighting waits up to one extra interval, so ~10-15 min in
practice). So the first `/fleet-reaper` rarely reaps anything — it *starts the
confirm clock*. The scheduled task / Monitor close the loop on later ticks.

### Step 2 — Ensure the durable scheduled task (skip with `--no-task` / `--status`)
```bash
schtasks /Query /TN "PRISM Fleet Reaper" 2>/dev/null
```
If the task does not exist, register it (this is the "survives all 7 chats
closing" backbone — a 5-min sweep independent of any session):
```bash
powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-fleet-reaper-task.ps1 -RunNow
```
Registering (and `-Uninstall`'ing) a scheduled task needs an **elevated** shell.
If the installer throws the "Run from an ELEVATED PowerShell" error, do NOT
retry — hand the operator the command to run themselves in an admin terminal:
> `! powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-fleet-reaper-task.ps1 -RunNow`
>
> (add `-DryRun` for a burn-in install that classifies but never kills.)

If the task could not be registered, the verdict's `task:` line must show ⚠ and
the overall verdict degrades (see below) — do not report a green "active".

### Step 3 — Launch the in-session Monitor (skip with `--no-monitor` / `--status`)
Use the **Monitor** tool — it gives a live event feed (one line per reap / memory
pressure / error) while this chat stays open:
- command: `node H:/prism/scripts/fleet-reaper-sweep.mjs --monitor-loop --interval 300`
  — **if the user passed `--dry-run`, append `--dry-run` to this command** so the
  Monitor is a burn-in watch that never kills. (The hardcoded form above is the
  LIVE, process-killing watch.)
- description: `fleet reaper: orphan node/git/bash reaps + memory pressure`
- `persistent: true`

The monitor-loop only emits on noteworthy sweeps (reaps, pressure, caveats,
errors) — quiet sweeps print nothing, so it won't flood the chat. The Monitor
dies when THIS chat closes; only the scheduled task survives a chat exit.

### Step 4 — Verdict block
Print the boxed summary, choosing the `verdict:` line by what was actually armed.

## Verdict block

```
┌─ /fleet-reaper ────────────────────────────────────────
│ sweep:       ✓ procs: 12 alive · 1 crashed-owned · 2 unowned · mem 78%
│ reaped:      0 this run · 4 candidates pending (confirm window)
│ task:        ✓ "PRISM Fleet Reaper" registered (5-min scheduled task)
│ monitor:     ✓ armed (--monitor-loop 300s, persistent) — THIS chat only
│ ledger:      state/shared/fleet-reaper-candidates.json
│ audit log:   state/shared/fleet-reaper.log
│ verdict:     ✅ FLEET HYGIENE ACTIVE — orphans reaped after ~10-15 min confirm
└────────────────────────────────────────────────────────
```

`verdict:` line — pick the honest one:
- **✅ FLEET HYGIENE ACTIVE** — scheduled task registered AND/OR Monitor armed; a runner will advance the confirm clock.
- **⚠ MONITOR-ONLY** — task NOT registered (needs an elevated operator); reaping stops when this chat closes. Print the `task:` line as `⚠ NOT registered — run the elevated installer`.
- **❌ NO RUNNER ARMED** — `--no-monitor` AND no task registered. The sweep started a confirm clock no runner will ever re-check. Tell the operator to install the task or drop `--no-monitor`.

Other ⚠/❌ states:
- ⚠ sweep `caveats` non-empty → a live slot's PID is unresolved; the reaper stays
  conservative (uncertain ownership is never reaped) — just surface it.
- ❌ sweep script missing → `fleet-reaper-sweep.mjs` not found; the Stop hook and
  installer both name the exact expected path in their errors — check `git status`.

## Knobs (env — read by the sweep)

| knob | effect |
|------|--------|
| `PRISM_FLEET_REAPER_DISABLE=1` | **kill switch** — sweep refuses to kill anything, every runner, fleet-wide |
| `PRISM_FLEET_REAPER_DRY_RUN=1` | classify + decide, never kill (env-global equivalent of `--dry-run`) |
| `PRISM_FLEET_REAPER_KILL_AFTER=N` | confirm ticks before a kill (default 2) |
| `PRISM_FLEET_REAPER_AGE_FLOOR_SEC=N` | minimum process age to consider (default 45) |
| `PRISM_FLEET_REAPER_INTERVAL_SEC=N` | confirm-tick length in seconds (default 300) |
| `PRISM_FLEET_REAPER_MEM_PRESSURE_PCT=N` | commit/phys % above which kill-after drops to 1 (default 90) |

## Why it exists

The host runs a fork-storm-prone Windows environment with up to 7 Claude chats.
PRISM already had generic reapers (`node-process-janitor`, `cleanup-orchestrator`
+ 5 sub-cleaners) — but every one uses *generic* heuristics (age, dead-parent,
cmdline patterns). None cross-reference `chat-slots.json`, so none can say "this
node.exe belongs to slot delta, and delta is crashed → reap it" vs "belongs to
alpha, which is alive → leave it." This pipeline is that missing slot-aware
layer. It is additive — it does not modify or replace any existing reaper.

Companion surfaces:
- `scripts/fleet-reaper-sweep.mjs` — the sweep brain (`--once` / `--monitor-loop` / `--status`)
- `.claude/helpers/process-slot-map.mjs` — the PID→slot classifier
- `.claude/hooks/fleet-reaper-stop.mjs` — Stop-hook arm (prompt sweep when a chat ends)
- `.claude/helpers/install-fleet-reaper-task.ps1` — the scheduled-task installer
- `node .claude/helpers/cleanup-orchestrator.mjs` / `/reap-zombies` — the generic
  locks/claims/bash reaper layer (sibling — covers what this pipeline does NOT)
