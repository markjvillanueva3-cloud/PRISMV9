---
name: fleet-reaper
description: ALWAYS-ON fleet hygiene baseline for the 13-chat fleet (alpha..mike + golf). Alpha owns the reaper (per [[feedback_alpha_owns_reaper]]) — /checkin-alpha auto-invokes this skill on every alpha session, so bare /fleet-reaper is the canonical re-arm and the answer to "is the reaper on?" is unconditionally YES. Stays on via dual coverage: (1) durable Windows scheduled task "PRISM Fleet Reaper" (5-min cadence, S4U principal, AtStartup trigger, restart-on-failure ×3 — survives every chat closing AND host reboots) + (2) a persistent in-session Monitor armed in this chat (live event feed for the lifetime of the session). The skill is idempotent — re-running never duplicates the Monitor (TaskList dedup) or the task (schtasks /Query gate). Maps every running node/git/bash process to the chat slot that spawned it (chat-slots.json) and reaps orphans of crashed/dead chats — gated by a confirm-after-N-ticks rule so a live chat's process is never killed. FLEET-REAPER-MS1 adds three layers: a leftover-bash-task classifier (catches Bash-tool Monitor loops orphaned under a lingering unpinned harness), soft RAM/CPU relief (reversible BelowNormal priority + working-set trim on stale-slot processes under memory pressure), and an Ollama coordinator (pre-warms a GPU model + writes a routing hint that nudges ollama-task-offloader.mjs to absorb more hook-eligible work — converting idle VRAM into Claude-CLI throughput). Use to re-arm after the Monitor died (chat-restart, /compact crash, force-close), to verify always-on status, when orphan node/bash/git are piling up, when host memory is unstable, or when the GPU sits idle while commit pressure is high.
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
    - state/shared/fleet-reaper.log (JSONL audit of every reap + soft-relief + coordinator outcome)
    - state/shared/.fleet-reaper-actions.jsonl (FLEET-REAPER-MS1 — append-only soft-relief forensic trail)
    - state/shared/.ollama-routing-hint.json (FLEET-REAPER-MS1 — TTL'd hint read by ollama-task-offloader.mjs)
    - Windows scheduled task "PRISM Fleet Reaper" (registered if absent; needs an elevated shell)
    - an in-session Monitor watch (live event feed; dies with the chat that armed it)
    - reaped node/git/bash processes owned by crashed chat slots; leftover Bash-tool Monitor loops
    - BelowNormal CPU priority + trimmed working sets on stale-slot processes (reversible)
    - a pre-warmed Ollama model in GPU VRAM (fire-and-forget, keep_alive-bounded)
  bounded: true
  reversible: true  # task is Disable/Uninstall-able; Monitor is TaskStop-able; PRISM_FLEET_REAPER_DISABLE=1 is the fleet-wide kill switch; soft relief + hint self-expire
---

# /fleet-reaper — ALWAYS-ON slot-aware fleet hygiene baseline (13-chat fleet)

> **This skill is designed to STAY ON.** Alpha owns the reaper (per
> [[feedback_alpha_owns_reaper]]) and `/checkin-alpha` auto-invokes this skill
> on every alpha session — so by doctrine the reaper is *always running*. Bare
> `/fleet-reaper` is the canonical re-arm: idempotent, additive, never
> duplicates the Monitor or the scheduled task. The skill exists in two states
> only: **active** (default) or **explicitly disabled via the kill switch**.

> PRISM runs up to 13 concurrent chats (alpha..mike + golf). Each spawns
> `node.exe` (hooks/MCP), `bash.exe` (the Bash tool), `git.exe` children. When a
> chat crashes or is closed without firing its Stop chain, those children are
> orphaned — they pin RAM and, across several dead chats, cause the commit-memory
> pressure that destabilizes the *surviving* chats. The reaper maps each process
> to its owning slot and kills only the genuinely dead ones.

> **🛑 KILL SWITCH — `PRISM_FLEET_REAPER_DISABLE=1` is the ONLY way to turn it
> off.** This pipeline kills processes unattended (a 5-min scheduled task + an
> in-session Monitor + a Stop hook). Setting that one env var makes the sweep
> refuse to kill, nudge, prewarm, or write a hint in *every* runner, fleet-wide,
> regardless of which chat armed it. `--uninstall` only tears down *this chat's*
> Monitor + the (global) task — and the next `/checkin-alpha` will re-register
> the task and re-arm the Monitor. If the reaper ever kills something it
> shouldn't, set the env var first, investigate after.

> **Run `/fleet-reaper` in ONE chat only — by doctrine, alpha.** The scheduled
> task is global and the Stop hook fires in every chat — a second chat's
> Monitor is just redundant load on the host this skill exists to protect (it
> spawns the very `node.exe` processes the reaper hunts). If another chat
> previously armed a Monitor, run `--uninstall` there first, then re-arm in
> alpha. The `alpha-slot-reaper-guardian.mjs` SessionStart hook enforces this
> doctrine automatically — non-alpha chats are silent no-ops.

## Always-on semantics

**The reaper is on by default.** Two layers keep it that way:

1. **Durable scheduled task `PRISM Fleet Reaper`** — registered once with an
   elevated installer (`install-fleet-reaper-task.ps1`), runs every 5 min,
   uses an S4U principal (no stored password, runs whether the user is logged
   on or not), restarts on failure ×3, and has an `AtStartup` trigger so it
   resumes pre-login on reboot. **One elevated install = set-and-forget for
   the life of the box.** This is the load-bearing layer — the in-session
   Monitor is just a UX feed on top of it.
2. **Per-session persistent Monitor** — armed by `/checkin-alpha` (which is
   auto-fired on every alpha session via session-start hooks) and by bare
   `/fleet-reaper`. Dies when this chat closes; re-arms automatically on the
   next alpha session.

**Re-arm scenarios** (use bare `/fleet-reaper`):
- After `/compact` if the Monitor didn't survive the compact boundary
- After a chat crash or force-close (the new chat is now alpha)
- To verify always-on status (the §verdict block tells you all three layers)
- If `schtasks /Query /TN "PRISM Fleet Reaper"` returns absent (the elevated
  installer must be re-run; the skill surfaces the exact command)

**Idempotence guarantees** — re-running this skill is always safe:
- The Monitor is gated by `TaskList` — if a fleet-reaper Monitor already runs
  for this session, step C is skipped (the §verdict says `monitor: already armed`)
- The scheduled task is gated by `schtasks /Query` — if Ready, step B is skipped
- The sweep is read-mostly; soft relief + the coordinator are reversible

## When to use

- **By default — never need to invoke manually.** `/checkin-alpha` auto-fires
  this skill; alpha is always on; the reaper is always on. The §verdict block
  is the answer to "is the reaper still on?" without any other ceremony.
- Re-arm after the Monitor died (`/compact` crash, chat force-close, session
  restart) — `/fleet-reaper` is the canonical re-arm
- Orphan `node.exe` / `bash.exe` / `git.exe` are accumulating in the OS process list
- Host memory is creeping up and the 13 chats are getting sluggish / OOM-y
- A leftover Bash-tool Monitor loop (`while true; do …; sleep N; done`) is still
  running hours after the chat that spawned it closed — the FLEET-REAPER-MS1
  `leftover-bash-task` classifier catches these even when the orphaned chat's
  `claude.exe` lingered unpinned
- Commit memory is > 90 % and the GPU sits idle — the coordinator pre-warms a
  local Ollama model and writes a 5-min routing hint so `ollama-task-offloader`
  absorbs more hook-eligible work instead of competing for the commit budget
- After a chat crashed or was force-closed (its children are now orphans)

## When NOT to use

- To reap stale **claims / locks / chat-bus** entries — that's the generic
  `node .claude/helpers/cleanup-orchestrator.mjs` (and the `PRISM Cleanup
  Orchestrator` scheduled task). This skill owns the **slot-attributed process**
  layer those reapers lack — run BOTH; they cover different things.
- To kill a *specific* process you know is bad — just `taskkill` it directly;
  the reaper is for the "which of these 400 processes are orphans?" problem.
- As a memory *panacea* — soft relief (working-set trim) is reversible and
  bounded: a process actively touching most of its working set pages it back in
  within milliseconds. The trim relieves *idle* stale-slot footprint; the
  *coordinator* (idle GPU → Ollama offload) is the lever that actually moves
  throughput. Don't expect the trim alone to fix a genuinely overcommitted box.

## Args: $ARGUMENTS

- *(empty)* — **canonical always-on re-arm.** Full pipeline: immediate sweep → ensure scheduled task → launch persistent Monitor. **The Monitor is armed unconditionally** — a healthy scheduled task is NOT a reason to skip it, because the Monitor provides the operator's live event feed (the task's reaps go to the JSONL log but are invisible without the Monitor). Idempotent — if the Monitor is already armed for this session (TaskList dedup), step C no-ops. This is what `/checkin-alpha` runs automatically.
- `--status` — report only: read-only sweep classification + scheduled-task state. No ledger write, no install, no Monitor, no kills. **Use to verify always-on status without re-arming.**
- `--dry-run` — burn-in: every runner this skill arms (the immediate sweep AND the Monitor) gets `--dry-run` — it classifies + decides but NEVER kills. Use to watch slot attribution before going live.
- `--no-task` — skip the scheduled-task step. ⚠ If no task was already registered, reaping stops when this chat closes (Monitor-only).
- `--no-monitor` — skip the in-session Monitor. ⚠ If the scheduled task also isn't registered, NOTHING is armed — the confirm clock will never advance.
- `--no-relief` — skip FLEET-REAPER-MS1 Layer 1 (soft RAM/CPU relief — BelowNormal priority + working-set trim on stale-slot processes). Orphan reaping + the coordinator still run.
- `--no-coord` — skip FLEET-REAPER-MS1 Layers 2-3 (the GPU/Ollama probe + coordinator pre-warm + routing hint). Orphan reaping + soft relief still run. Use when there is no NVIDIA GPU, Ollama is intentionally down, or you want the reaper purely as a process janitor.
- `--uninstall` — stop the Monitor armed by THIS chat (TaskStop) and unregister the global "PRISM Fleet Reaper" scheduled task (needs an elevated shell — same as install). Monitors armed in *other* chats are unaffected; for a true fleet-wide stop, use `PRISM_FLEET_REAPER_DISABLE=1`.

`--no-task` / `--no-monitor` / `--uninstall` are pure SKILL-orchestration flags —
they change what *this skill* arms; the sweep binary does not recognise them.
`--status` is BOTH: it is a real sweep-CLI flag (the sweep runs read-only) AND it
tells this skill to skip the install + Monitor steps. `--dry-run` / `--no-coord`
/ `--no-relief` are sweep-CLI flags: this skill passes those three straight
through to every runner it arms (the immediate sweep AND the Monitor). The scheduled task takes NO CLI args, so it honours
`--no-coord` / `--no-relief` only via the `PRISM_FLEET_REAPER_OLLAMA_COORD_DISABLE`
/ `PRISM_FLEET_REAPER_SOFT_RELIEF_DISABLE` env knobs.

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
Report from the JSON:
- the process-class counts under the `slots` field (`slots["owned-by-alive"]` /
  `owned-by-stale` / `owned-by-crashed` / `leftover-bash-task` / `unowned` /
  `protected` — the JSON field is *named* `slots` but holds PROCESS counts, not
  slot counts), `pending` vs `reapedOk`, `mem.usedPct` (the headline memory % —
  the max of physical & commit), and any `caveats`;
- **FLEET-REAPER-MS1** — `softRelief` (`priorityDemoted` / `workingSetTrimmed` /
  `rssReclaimedBytes`), `gpu` (`available` / `freeMb` / `utilizationPct`),
  `ollama` (`reachable` / `loaded[]`), and `coordinator` (`shouldPrewarm` /
  `prewarmFired` / `hintWritten` / `thresholdDelta` / `skipped`).

**For `--status`: also run `schtasks /Query /TN "PRISM Fleet Reaper"
2>/dev/null` to report task state, then STOP — skip Steps 2-4's install/Monitor
and just print the verdict.** `--status` still PROBES the GPU + Ollama (read-only)
so the verdict can surface them, but never fires prewarm or writes the hint.

A sweep reaps a process only when ALL hold: it is `owned-by-crashed`,
`unowned`, or `leftover-bash-task`, older than the age floor (45s), AND has been
continuously a candidate for ≥ `kill-after × interval` of wall-clock (default
2 × 300s = 10 min — a mid-cycle first-sighting waits up to one extra interval, so
~10-15 min in practice). The `leftover-bash-task` class carries extra gates at
classification time (shell name + 15-min age floor + a structural cmd-pattern
match + an *unpinned* `claude.exe` ancestor + resolved slot data). So the first
`/fleet-reaper` rarely reaps anything — it *starts the confirm clock*. The
scheduled task / Monitor close the loop on later ticks.

Soft relief + the coordinator act on EVERY sweep that is not `--status` /
disabled / `--dry-run` — they do not wait for the confirm clock (their actions
are reversible / fire-and-forget, not kills).

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
- description: `fleet reaper: orphan reaps + soft relief + Ollama coordinator`
- `persistent: true`

The monitor-loop only emits on noteworthy sweeps (reaps, pressure, soft-relief
nudges, coordinator prewarm/hint, caveats, errors) — quiet sweeps print nothing,
so it won't flood the chat. The Monitor dies when THIS chat closes; only the
scheduled task survives a chat exit.

### Step 4 — Verdict block
Print the boxed summary, choosing the `verdict:` line by what was actually armed.

## Verdict block

```
┌─ /fleet-reaper ────────────────────────────────────────
│ sweep:       ✓ procs: 12 alive · 1 stale · 1 crashed-owned · 1 leftover-bash · 2 unowned · mem 91% ⚠
│ reaped:      0 this run · 4 candidates pending (confirm window)
│ soft-relief: nudged 3 priority · 2 working-set (~410M reclaimed) · 5 stale-slot targets
│ gpu:         NVIDIA GeForce RTX 3080  8.5G free / 10G · 4% util
│ ollama:      reachable · loaded: qwen2.5-coder:7b (4.1G)
│ docker:      ✓ ollama · ✓ docker · ✓ postgres · ✓ qdrant · ✓ prometheus
│ hint:        aggressive-offload Δ=-0.15 · TTL 5m · → ollama-task-offloader will absorb more
│ prewarm:     fired qwen2.5-coder:7b (keep_alive)
│ task:        ✓ "PRISM Fleet Reaper" registered (5-min scheduled task)
│ monitor:     ✓ armed (--monitor-loop 300s, persistent) — THIS chat only
│ ledger:      state/shared/fleet-reaper-candidates.json
│ audit logs:  state/shared/fleet-reaper.log · state/shared/.fleet-reaper-actions.jsonl
│ verdict:     ✅ FLEET HYGIENE ACTIVE — orphans reaped after ~10-15 min confirm; idle VRAM → throughput
└────────────────────────────────────────────────────────
```

When each line appears:
- `soft-relief` — only when Layer 1 had targets (memory at/above the pressure
  floor with ≥1 stale-slot process). Absent under `--no-relief` or no pressure.
- `gpu` / `ollama` — whenever the coordinator layer ran at all. Under `--no-coord`
  they still print, but in their `unavailable — coordinator skipped (--no-coord)` /
  `unreachable — coordinator skipped (--no-coord)` form (the probes were skipped,
  not the lines). Under `--status` they print real probe data (probes are
  read-only) — only the *actions* below are suppressed.
- `hint` / `prewarm` — only when the coordinator actually wrote a hint / fired a
  pre-warm. Absent under `--no-coord`, under `--status` (actions suppressed), and
  on any sweep where the decision was "no action".

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

Alphabetical. MS0 knobs first, then the FLEET-REAPER-MS1 soft-relief + coordinator knobs.

| knob | effect |
|------|--------|
| `PRISM_FLEET_REAPER_AGE_FLOOR_SEC=N` | minimum process age to consider for reap (default 45) |
| `PRISM_FLEET_REAPER_DISABLE=1` | **kill switch** — sweep refuses to kill, nudge, prewarm, or write a hint; every runner, fleet-wide |
| `PRISM_FLEET_REAPER_DRY_RUN=1` | classify + decide, take no action (env-global equivalent of `--dry-run`) |
| `PRISM_FLEET_REAPER_INTERVAL_SEC=N` | confirm-tick length in seconds (default 300) |
| `PRISM_FLEET_REAPER_KILL_AFTER=N` | confirm ticks before a kill (default 2) |
| `PRISM_FLEET_REAPER_MEM_PRESSURE_PCT=N` | commit/phys % above which kill-after drops to 1 (default 90) |
| `PRISM_FLEET_REAPER_GPU_DISABLE=1` | **MS1** — skip the GPU probe (`readGpuState` returns unavailable); the coordinator then no-ops |
| `PRISM_FLEET_REAPER_GPU_FREE_MIN_MB=N` | **MS1** — GPU free-VRAM floor below which the coordinator takes no action (default 2048) |
| `PRISM_FLEET_REAPER_HINT_THRESHOLD_DELTA=N` | **MS1** — magnitude of the offload-threshold nudge written to the hint, applied negatively; hard-clamped to ≤ 0.30 (default 0.15) |
| `PRISM_FLEET_REAPER_HINT_TTL_SEC=N` | **MS1** — routing-hint validity window in seconds (default 300 — equal to one sweep interval) |
| `PRISM_FLEET_REAPER_OLLAMA_COORD_DISABLE=1` | **MS1** — skip Layers 2-3 entirely (env equivalent of `--no-coord`) |
| `PRISM_FLEET_REAPER_OLLAMA_KEEP_ALIVE=S` | **MS1** — `keep_alive` passed to the Ollama pre-warm POST (default `10m`) |
| `PRISM_FLEET_REAPER_OLLAMA_PREWARM_MODEL=name` | **MS1** — model the coordinator pre-warms into VRAM (default `qwen2.5-coder:7b`) |
| `PRISM_FLEET_REAPER_SOFT_RELIEF_AGE_SEC=N` | **MS1** — minimum process age before a soft-relief nudge (default 180) |
| `PRISM_FLEET_REAPER_SOFT_RELIEF_DISABLE=1` | **MS1** — skip Layer 1 entirely (env equivalent of `--no-relief`) |
| `PRISM_FLEET_REAPER_SOFT_RELIEF_PRESSURE_PCT=N` | **MS1** — commit/phys % at or above which soft relief + the coordinator act (default 90) |
| `OLLAMA_URL` | **MS1** — Ollama base URL for the probe + pre-warm (default `http://127.0.0.1:11434`; shared with the rest of the Ollama hook stack) |

## Why it exists

The host runs a fork-storm-prone Windows environment with up to 13 Claude chats.
PRISM already had generic reapers (`node-process-janitor`, `cleanup-orchestrator`
+ 5 sub-cleaners) — but every one uses *generic* heuristics (age, dead-parent,
cmdline patterns). None cross-reference `chat-slots.json`, so none can say "this
node.exe belongs to slot delta, and delta is crashed → reap it" vs "belongs to
alpha, which is alive → leave it." This pipeline is that missing slot-aware
layer. It is additive — it does not modify or replace any existing reaper.

**It's always-on by doctrine.** The 13-chat fleet generates orphans constantly
(every /compact spawns + reaps node.exe; every Bash-tool call forks bash.exe;
crashed chats leave behind harness children that pin RAM). On-demand reaping
isn't enough — orphans accumulate between invocations and destabilize the
fleet. So the reaper runs unconditionally: the scheduled task ticks every
5 min independent of any chat; alpha's Monitor gives operator-visible event
feed when alpha is up; and `alpha-slot-reaper-guardian.mjs` SessionStart-fires
on every alpha session to re-arm if either layer dropped. The doctrine is:
**alpha is always on → the reaper is always on**. The kill switch
(`PRISM_FLEET_REAPER_DISABLE=1`) is the ONLY way to make it not so.

**FLEET-REAPER-MS1** extends the *reframe* from "kill more" to "use what's
idle": the box runs near commit-memory ceiling while the GPU sits at single-digit
utilization. So MS1 (a) catches the specific orphan class the MS0 dead-ancestor
rule missed — a Bash-tool Monitor loop whose chat died but whose `claude.exe`
lingered unpinned — and (b) converts idle stale-slot RAM + idle GPU VRAM into
throughput for the surviving chats, soft-first (reversible priority/trim) and
kill-last, with the Ollama coordinator the load-bearing lever.

Companion surfaces:
- `scripts/fleet-reaper-sweep.mjs` — the sweep brain (`--once` / `--monitor-loop` / `--status`); MS1 added the soft-relief + GPU/Ollama coordinator layers
- `.claude/helpers/process-slot-map.mjs` — the PID→slot classifier; MS1 added the `leftover-bash-task` class
- `.claude/hooks/ollama-task-offloader.mjs` — **MS1** — the routing-hint CONSUMER (`loadRoutingHint` lowers its offload bar when the coordinator says the GPU can absorb more)
- `.claude/hooks/fleet-reaper-stop.mjs` — Stop-hook arm (prompt sweep when a chat ends)
- `.claude/helpers/install-fleet-reaper-task.ps1` — the scheduled-task installer
- `state/shared/.ollama-routing-hint.json` — **MS1** — the TTL'd hint file (producer: the sweep; consumer: `ollama-task-offloader.mjs`); contract in `knowledge/wiki/architecture/ollama-routing-hint.md`
- `state/shared/.fleet-reaper-actions.jsonl` — **MS1** — append-only soft-relief forensic trail (a *dedicated* file — deliberately NOT the kills log `.janitor-kills.jsonl`)
- `node .claude/helpers/cleanup-orchestrator.mjs` / `/reap-zombies` — the generic
  locks/claims/bash reaper layer (sibling — covers what this pipeline does NOT)
