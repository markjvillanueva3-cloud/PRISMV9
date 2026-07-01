# Plan — Enforce "close your tool calls / background tasks when done"

## Context

Across this golf session the assistant repeatedly spawned `run_in_background` Bash tasks (tail-monitors, warm-loops, copies) and left some running — the exact orphans the fleet-reaper then has to clean. The operator wants this **prevented at the source**: an enforcement that **forces the chat to close its own background tasks before the turn can end**, plus the doctrine (rule + galaxy memory + CLAUDE.md rule) so every slot/galaxy internalizes it.

Enforcement strength (operator-chosen): **BLOCK until closed** — Stop is blocked with the list of lingering tasks; auto-passes after N attempts and auto-reaps as the deadlock-proof fallback.

This is a fleet-wide discipline that golf (fleet-hygiene owner) builds; it complements — does not replace — the existing fleet-wide janitors (`stop-bash-orphan-cleaner.mjs` @30-min idle, `fleet-reaper-stop.mjs`). Those are the safety net; this is the immediate, session-scoped, discipline-forcing layer.

## Detection mechanism (reliable, low false-positive)

At Stop, the turn's **foreground** tools have already exited. Any **`bash.exe` that is a descendant of THIS chat's `claude.exe` and still alive** = an un-closed `run_in_background` Bash task. (Detached processes — the guardian sweep etc. — `unref()` away from claude.exe, so the ancestry filter excludes them. node.exe is excluded entirely: too noisy — MCP server, hooks. We key on `bash.exe`, the precise `run_in_background` signal.)

Resolve this chat's `claude.exe` PID from `session_id` via the PIN registry pattern in `H:/prism/.claude/helpers/stable-session-id.mjs` (`.active-sessions-by-pid.json` reverse-lookup) with a `chat-slots.json` fallback. Reuse process enumeration from `H:/prism/.claude/helpers/process-slot-map.mjs` (`snapshotFleet()`) + `collectAncestors()`.

## Files

### 1. Enforcement hook (core) — `H:/prism/.claude/hooks/stop-close-own-bg-tasks.mjs` (NEW)
- **Pure core** `selectUnclosedBgTasks(procList, chatPid, { ageFloorSec, now })` → `[{pid, ppid, cmd, ageSec}]` — filters `bash.exe` whose ancestry includes `chatPid`, alive, `ageSec >= floor` (default 10s, avoids catching a just-finishing command). Injectable procList + clock => unit-testable.
- **main()**: read `session_id` from stdin (pattern from `stop_close_prism_nodes_v2.mjs`); resolve chatPid; enumerate; if none -> `{continue:true}`. If found -> read+increment a per-session block counter at `state/shared/.close-bg-tasks-attempts.json` (keyed by session_id, mirrors the scrutiny-gate escape):
  - attempts `< MAX_BLOCKS` (default 2) -> **`{continue:false, decision:"block", reason, hookSpecificOutput:{...}}`** listing each lingering task's PID + command + the exact remediation (`TaskList` -> `TaskStop <id>`, or kill PID).
  - attempts `>= MAX_BLOCKS` -> **auto-reap** the lingering bash via `reapProcesses()` (from `fleet-reaper-sweep.mjs`), reset counter, `{continue:true, systemMessage:"auto-reaped N un-closed bg tasks after 2 blocks"}` (deadlock-proof).
- **Modes / knobs**: `PRISM_CLOSE_BG_TASKS_DISABLE=1` · `PRISM_CLOSE_BG_TASKS_MODE=block|advisory|reap` (default `block`) · `PRISM_CLOSE_BG_TASKS_AGE_SEC` · `PRISM_CLOSE_BG_TASKS_MAX_BLOCKS`.
- Time-bounded stdin drain + fail-open (`main().catch(() => emit {continue:true})`) — a hook bug must never wedge Stop.

### 2. Test — `H:/prism/.claude/hooks/stop-close-own-bg-tasks.test.mjs` (NEW, node:test)
Real-value tests on the pure core + counter: (a) flags a `bash.exe` descendant of chatPid; (b) ignores `bash.exe` under a different chat; (c) ignores `node.exe`; (d) ignores bash younger than the age floor; (e) ignores detached/re-parented bash; (f) block->block->auto-reap counter transition; (g) empty list -> continue. No `toBeDefined()` stubs.

### 3. Wiring — `C:/Users/wompu/.claude/settings.json` (Stop chain; auto-mirrors to H:)
Append one Stop hook entry referencing the absolute hook path, alongside the existing reaper Stop hooks. Verify via `echo '{"session_id":"x"}' | node stop-close-own-bg-tasks.mjs` -> valid JSON, exit 0. (Use the `update-config` skill or a careful targeted edit; additive only, never reorder peers.)

### 4. CLAUDE.md rule — `C:/Users/wompu/.claude/CLAUDE.md` §"CLAUDE.md RULES 5-13"
Add **R14** after R13 (one line, preserve the <=20-line discipline):
> **R14 — Close your tool calls.** Every `run_in_background` Bash task, Monitor, or detached process you spawn, you close — `TaskStop` it (or kill it) the moment its purpose is served, and verify none linger before Stop. Un-closed background tasks are the orphans the fleet-reaper must reap. -> PRISM: `stop-close-own-bg-tasks.mjs` (blocks Stop on lingering bash) + [[feedback_close_background_tasks_at_stop]].

### 5. Galaxy memory (fleet-hygiene = golf) — 2 files
- `H:/prism/mcp-server/src/engines/fleet-hygiene/MEMORY.md` — add a High-ROI line: `- [[feedback_close_background_tasks_at_stop]] — close run_in_background bash before Stop; stop-close-own-bg-tasks.mjs blocks otherwise`.
- `H:/prism/mcp-server/src/engines/fleet-hygiene/CLAUDE.md` — add to the "every golf session" contract: *"close any `run_in_background` Bash tasks you spawned before Stop."*

### 6. Standing-doctrine memory — `C:/Users/wompu/.claude/projects/H--prism/memory/feedback_close_background_tasks_at_stop.md` (NEW)
`type: feedback` frontmatter + **Why** / **How to apply** body (close bg tasks proactively; the reaper is a net, not a substitute). Link `[[feedback_always_close_out]]` (orthogonal — that's roadmap/doc close-out; this is process close-out), `[[feedback_golf_owns_reaper]]`, `[[feedback_golf_insession_tail_not_viable]]`. Add a <=140-char pointer row to the master `MEMORY.md` index (standing-doctrine section).

## Build order (logical, R13)
1. Hook pure core + main (the verifiable core). 2. Test -> green. 3. Live smoke (`echo {session_id} | node hook`). 4. Wire into settings.json + verify it fires. 5. Then the doctrine layer (R14, galaxy memory, feedback memory, index pointer). Each file gets the 2-parallel-reviewer per-file scrutiny gate; 3-of-3 at Stop.

## Verification (end-to-end)
- Unit: `cd H:/prism && npx vitest run .claude/hooks/stop-close-own-bg-tasks.test.mjs` (or `node --test`).
- Live positive: spawn a `tail -f` via run_in_background, then trigger Stop -> confirm the hook **blocks** with the task listed; `TaskStop` it; Stop again -> passes.
- Deadlock-proof: force 2 blocks -> confirm auto-reap fires + Stop continues.
- Fail-open: feed malformed stdin -> `{continue:true}`, exit 0.
- Disable knob: `PRISM_CLOSE_BG_TASKS_DISABLE=1` -> always `{continue:true}`.
