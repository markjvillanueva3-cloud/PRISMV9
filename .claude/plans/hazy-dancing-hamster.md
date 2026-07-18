# /fleet-reaper — slot-aware orphan process reaper pipeline

## Context

PRISM runs up to 7 concurrent Claude chats (`alpha..foxtrot` + `golf`). Each chat
spawns `node.exe` (hooks/helpers/MCP), `bash.exe` (Bash tool), and `git.exe`
children. When a chat crashes or is closed without firing its Stop hooks, those
children are orphaned — they pin RAM and, in aggregate across dead chats, cause
the commit-memory pressure that destabilizes the remaining live chats.

PRISM already has generic reapers (`node-process-janitor.mjs`,
`cleanup-orchestrator.mjs` + its 5 sub-cleaners, `03-memory-pressure-auto-relief.ps1`,
and the existing `PRISM Cleanup Orchestrator` 5-min scheduled task). **The gap:**
all of them use *generic heuristics* (age thresholds, dead-parent checks, cmdline
patterns). **None cross-reference `chat-slots.json`** — none can say "this node
process belongs to slot `delta`, and `delta` is *crashed* → reap it" or "belongs
to `alpha`, which is *alive* → leave it alone."

This pipeline adds the missing **slot-aware** layer: map every running
node/git/bash PID to its owning chat slot via process ancestry, and reap only
those whose owning slot is provably dead — gated by a confirm-after-N-ticks rule
so a brief heartbeat gap never kills a live chat's process. It is **additive** —
it does not modify or replace any existing reaper.

User decisions (asked during planning):
- **Persistence:** in-session Monitor **+** durable Windows scheduled task.
- **Kill policy:** confirm-after-N-ticks — only reap a process that has been
  continuously a candidate for ≥ N×interval of wall-clock (default N=2, 10 min),
  *on top of* its owning slot already being `crashed` (≥10 min no heartbeat).

## Core design

**Slot-ownership mapping.** Read `chat-slots.json` (7 slots, each with `pid`,
`chatId`, `lastHeartbeat`) + `state/shared/handoffs/.active-sessions-by-pid.json`.
Enumerate `node|git|bash|sh` processes via `Get-CimInstance Win32_Process`
(PID, PPID, CommandLine, CreationDate, WorkingSetSize). Build a PID→parent map;
for each target, walk ancestry. If an ancestor PID matches a slot's `pid` (or a
PID in the session registry) → owned by that slot. Classify the slot with the
existing `classifySlot()` thresholds (`alive` <2min, `stale` 2–10min,
`crashed` >10min). **Safety invariant: if ownership is uncertain, never kill** —
only reap `owned-by-crashed` or `unowned` (ancestry leads to a dead PID, no live
`claude.exe` ancestor).

**Confirm-after-N-ticks ledger.** `state/shared/fleet-reaper-candidates.json`
(schemaVersion'd), keyed by `${pid}:${creationTimeMs}` (PID-reuse safe). Stores
`firstSeenAt` per candidate. A process is reaped only when
`now - firstSeenAt >= KILL_AFTER_TICKS * INTERVAL` **and** it is still a
candidate this sweep. `firstSeenAt` resets if the PID drops off the candidate
list (slot came back). Using a timestamp (not a counter) makes it correct and
idempotent even when the Monitor + scheduled task + Stop hook all sweep
independently. Atomic write (tmp+rename) + short lockfile, mirroring
`chat-slots.mjs`.

**Memory stability.** Each sweep reads Windows commit-memory %. Above
`MEM_PRESSURE_PCT` (default 90) it emits a pressure event and drops
`KILL_AFTER_TICKS` to 1 for that sweep (pressure-adaptive). It does **not**
duplicate `03-memory-pressure-auto-relief.ps1` — that escalates to tsserver kills
+ the janitor; this only makes its own slot-aware kills more eager and surfaces
the signal.

**Protected processes (never killed):** PRISM MCP core (`dist/index.js`),
`tsserver`, `dashboard-serve.mjs`, `mcp-http-bridge.mjs`, anything with a live
`claude.exe` ancestor, the sweep's own process tree. Whitelist patterns reused
from `node-process-janitor.mjs` / `reap-zombie-procs.mjs`.

## Files to create

1. **`H:/prism/.claude/helpers/process-slot-map.mjs`** — reusable mapping module.
   Exports `enumerateProcesses()`, `buildAncestry()`, `mapPidsToSlots(procs, slots)`,
   `classifyProcess(proc, slotMap)`, `PROTECTED_PATTERNS`. Pure/testable; the
   PowerShell enumeration is the only side effect, injectable for tests.
   Imports `classifySlot` from `.claude/helpers/chat-slots.mjs` (reuse, don't reimplement).

2. **`H:/prism/scripts/fleet-reaper-sweep.mjs`** — the brain / CLI.
   - `--once` (default): one sweep — classify, update candidate ledger, reap
     confirmed candidates, check memory, emit summary (`--json` for machine form).
   - `--monitor-loop --interval <sec>`: `while true { sweep; emit only on
     reap/pressure/error; sleep interval }` — the command the Monitor tool runs.
   - `--dry-run`, `--kill-after <N>`, `--age-floor <sec>`, `--stop-event`, `--status`.
   - Logs every kill to `state/shared/fleet-reaper.log` (JSONL, 256 KiB rotation,
     same pattern as `cleanup-orchestrator.log`).
   - Exports pure functions (`shouldReap`, `updateLedger`, `summarize`) for tests;
     guarded `invokedAsCli` block like `cleanup-orchestrator.mjs:525`.

3. **`H:/prism/.claude/hooks/fleet-reaper-stop.mjs`** — Stop hook. Thin wrapper
   that runs `fleet-reaper-sweep.mjs --once --stop-event` with a ~5s timeout.
   Advisory only — always emits `{continue:true}`, never blocks Stop. Catches the
   just-ended chat's orphans promptly instead of waiting ≤5 min for the next tick.
   Honors `PRISM_FLEET_REAPER_DISABLE=1`.

4. **`H:/prism/.claude/helpers/install-fleet-reaper-task.ps1`** — Windows
   scheduled-task installer. Clone of `install-hook-janitor-task.ps1` pattern:
   `param(TaskName='PRISM Fleet Reaper', EveryMinutes=5, RunNow, Uninstall)`,
   portable-node detection (`H:\Tools\nodejs\node.exe` → PATH), `New-ScheduledTask*`,
   `Disable-ScheduledTask`-able, `-Uninstall` path. Action:
   `node fleet-reaper-sweep.mjs --once`.

5. **`H:/prism/.claude/commands/fleet-reaper.md`** — the `/fleet-reaper` skill.
   Frontmatter: `name`, `description`, `model: sonnet`, `effort: low`,
   `allowed-tools: [Bash, Read, Monitor]`, `triggers:` (keywords: `orphan process`,
   `reap`, `fleet hygiene`, `memory stable`, `close orphan`, `zombie process`,
   `end process`, `task manager`, `7 chats`), `impact:` block.
   Body protocol:
   - **Step 1** — immediate sweep: `node scripts/fleet-reaper-sweep.mjs --once --json`;
     report slots/candidates/reaped/memory %.
   - **Step 2** — ensure durable task: check `schtasks /Query /TN "PRISM Fleet Reaper"`;
     if missing, run the installer.
   - **Step 3** — launch in-session Monitor: `Monitor` tool, command
     `node scripts/fleet-reaper-sweep.mjs --monitor-loop --interval 300`,
     `persistent: true`, description `"fleet reaper: orphan node/git/bash + memory pressure"`.
   - **Step 4** — verdict block (slots alive/stale/crashed, candidates pending,
     reaped this run, commit-mem %, task + monitor status).
   - Flags: `--dry-run`, `--no-monitor`, `--no-task`, `--status`, `--uninstall`.

6. **`mcp-server/src/__tests__/fleet-reaper.test.ts`** — vitest. Imports the
   exported pure functions from #1 and #2 (synthetic process lists + synthetic
   `chat-slots.json` — never kills a real process). Covers: ancestry walk,
   PID→slot mapping, classify (`alive`/`stale`/`crashed`/`unowned`), protected
   whitelist, `shouldReap` gate (age floor, continuous-candidacy threshold,
   `firstSeenAt` reset on slot-revive), ledger increment idempotency under
   multi-writer, pressure-adaptive `kill-after=1`, dry-run, NaN/empty/oversize
   adversarial inputs. ≥ happy path + 3 failure modes + 2 adversarial per the
   build-enforce floor.

## Files to modify (wiring + close-out — all in one session)

- **`H:/.claude/settings.json`** — append `fleet-reaper-stop.mjs` to the `Stop`
  hook chain (timeout 5000). *Verify at execution time whether a
  `C:\Users\<user>\.claude\settings.json` mirror source exists and is the real
  edit target* (global CLAUDE.md says edit C: which mirrors to H:, but names a
  `wompu` path that may not exist on this machine — confirm, don't assume).
- **`H:/prism/CLAUDE.md`** — add a short "FLEET REAPER PIPELINE" section: artifact
  map + knobs + the slot-aware-vs-generic distinction.
- **`knowledge/wiki/architecture/fleet-reaper.md`** — new wiki entry (architecture
  diagram, safety invariants, knobs, relationship to existing reapers).
- **Memory** — new file under `C:\Users\Mark Villanueva\.claude\projects\H--PRISM\memory\`
  (`reference_fleet_reaper.md`) + a one-line `MEMORY.md` pointer.
- **`_skill-triggers.jsonl`** — regen via `node scripts/extract-skill-triggers.mjs`
  so `/fleet-reaper` is registered with the auto-trigger hook.

## Knobs (env vars)

`PRISM_FLEET_REAPER_DISABLE=1` (Stop hook no-op + sweep refuses to kill) ·
`PRISM_FLEET_REAPER_KILL_AFTER=N` (default 2) ·
`PRISM_FLEET_REAPER_AGE_FLOOR_SEC=N` (default 45) ·
`PRISM_FLEET_REAPER_INTERVAL_SEC=N` (default 300) ·
`PRISM_FLEET_REAPER_DRY_RUN=1` ·
`PRISM_FLEET_REAPER_MEM_PRESSURE_PCT=N` (default 90).

## Reused (not rebuilt)

- `classifySlot()` / slot thresholds — `.claude/helpers/chat-slots.mjs`
- Protected-process whitelist — `node-process-janitor.mjs`, `reap-zombie-procs.mjs`
- Scheduled-task installer pattern — `install-hook-janitor-task.ps1`
- Log-rotation + `invokedAsCli` guard pattern — `cleanup-orchestrator.mjs`
- PID→session registry — `state/shared/handoffs/.active-sessions-by-pid.json`
- Generic lock/claim/bash orphan reaping stays with the existing
  `PRISM Cleanup Orchestrator` task — this pipeline does **not** re-run it.

## Build discipline

Multi-file build → per-file scrutiny gate: after each file, dispatch 2 parallel
review agents (content-specialist + independent reviewer), fix all P0/P1, then
next file. Order: `process-slot-map.mjs` → `fleet-reaper-sweep.mjs` →
`fleet-reaper.test.ts` → `fleet-reaper-stop.mjs` → `install-fleet-reaper-task.ps1`
→ `fleet-reaper.md` → wiring/docs. End-of-task 3-of-3 scrutiny gate at Stop.

## Verification (end-to-end)

1. `node scripts/fleet-reaper-sweep.mjs --once --dry-run --json` — prints all 7
   slot classifications, candidate list, would-reap set, commit-mem %; kills nothing.
2. `cd mcp-server && npx vitest run src/__tests__/fleet-reaper.test.ts` — all green.
3. **Live orphan test:** spawn an ownerless orphan
   `node -e "setInterval(()=>{},1e9)"` (detached, no slot ancestor); run
   `fleet-reaper-sweep.mjs --once --kill-after 1 --age-floor 0` — confirm it is
   classified `unowned`, reaped, and logged to `fleet-reaper.log`. Confirm a
   process under a live slot is classified `owned-by-alive` and untouched.
4. `node .claude/helpers/install-fleet-reaper-task.ps1 -RunNow` then
   `schtasks /Query /TN "PRISM Fleet Reaper" /V /FO LIST` — task registered,
   `LastTaskResult=0`.
5. `/fleet-reaper` — runs sweep, ensures task, launches Monitor; verdict block
   renders. `/fleet-reaper --status` shows current state without side effects.
6. `node scripts/hook-health-check.mjs --window=1h` — `fleet-reaper-stop` fires
   clean, 0 broken hooks.
7. End a throwaway chat, confirm its orphans appear in the ledger within one tick
   and are reaped after the confirm window.
