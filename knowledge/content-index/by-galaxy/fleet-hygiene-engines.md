---
name: fleet-hygiene-engines
description: Strategic engine + substrate digest for the fleet-hygiene galaxy (slot golf) -- fleet reaper, slot-aware orphan/zombie reaping, chat-slot hygiene, memory monitor, task-health watchdog, GPU/Ollama coordinator. Predominantly script/hook/helper-based; few dedicated .ts engines.
type: reference
galaxy: fleet-hygiene
node_type: memory
---

# fleet-hygiene galaxy -- engine digest

## Overview

The fleet-hygiene galaxy (slot **golf**, position 7 of 26 NATO) keeps the 26-chat fleet
alive and lean. Its job is process janitorial + resource coordination, NOT machining
feature work. Core responsibilities: **slot-aware orphan reaping** (map every
node/bash/git PID to its owning chat slot via full process-ancestry walk, reap only
provably-dead-slot orphans after a confirm window), **chat-slot hygiene** (stale
heartbeat / dead-PID reclaim), **fleet memory-pressure monitor** (name the ONE chat to
`/compact` under critical RAM), **task-health watchdog** (audit every `PRISM *`
scheduled task), and **GPU/Ollama coordinator** (health checks + routing-hint TTL).

**STRUCTURAL FACT (verified, R12):** this galaxy has essentially NO dedicated `.ts`
engines under `mcp-server/src/engines/fleet-hygiene/` -- the galaxy CLAUDE.md sec 2 states
outright "No local `.ts` engines ... the galaxy is implemented entirely in
scripts/hooks/helpers." The flat `mcp-server/src/engines/*.ts` files matching the
Fleet/Reaper/Slot/Coordinator name heuristic are almost all **adjacent-domain false
positives** (LoRA-pipeline coordinators, JM-scan coordinators, swarm/consensus
coordinators, the `SlottingEngine` slot-MILLING physics calculator). The genuinely
fleet-hygiene-relevant `.ts` engines are a small hermes-zulu-shared set (fleet-health
synthesis, fleet-authority governor, slot-session recovery, soul rollup). The real body
of this galaxy is the **substrate**: ~15 core scripts + ~12 helpers + ~15 hooks + 3
Windows scheduled tasks. This digest covers engines honestly and gives the substrate
its due weight.

Golf has **no named MCP dispatcher** (`prism_fleet` does NOT exist) -- all command/
control routes through `prism_session`. MCP-down fallback: every script runs as a
pure-node CLI, no MCP needed.

## Strategic categories

1. **Reaper core (slot-aware orphan kill)** -- the load-bearing sweep + its PID->slot
   classifier + the confirm-window ledger. Reaps only ancestry-confirmed orphans of
   crashed slots.
2. **Fleet watchdogs (durable scheduled tasks)** -- memory monitor, task-health
   watchdog, services watchdog. Survive every chat closing; close the "all chats live,
   box saturating, reaper has no candidates" gap.
3. **Chat-slot hygiene (roster CRUD + heartbeat)** -- 26-slot roster reclaim/claim/
   liveness/find, per-slot session history recovery, slot-task claims.
4. **Fleet-health synthesis + authority (.ts engines, hermes-zulu shared)** -- normalize
   raw slot signals into a comparable readiness score; deterministic authority gate.
5. **GPU / Ollama / MCP coordinator** -- Docker+Ollama health, offload-stats dashboard,
   routing-hint TTL, MCP daemon lifecycle (port 3100).
6. **Guardian + Stop-hook backstops** -- SessionStart/UserPromptSubmit re-arm layer,
   Stop-hook sweep arm (throttled), critical-memory `/compact` nudge.
7. **Generic cleanup layer (sibling, run BOTH)** -- locks/claims/chat-bus reaper,
   tmp-orphan janitor, bash/node orphan cleaners -- covers stale claims/locks the
   slot-aware reaper does NOT.

## Key engines + scripts (detailed)

### fleet-reaper-sweep.mjs (script -- THE load-bearing layer)
The slot-aware orphan-process reaper (3498 lines). Maps every running node/git/bash PID
to its owning chat slot via `process-slot-map.mjs` (full ancestry walk) and reaps only
processes whose owning slot is provably dead, gated by a confirm-after-N-ticks rule
(default 2 x 300sec) so a brief heartbeat gap never kills a live chat. Kill gate (ALL
must hold): classified `owned-by-crashed`/`unowned`, older than the 45sec age floor,
past the confirm window, cmdline does NOT match `DEFAULT_PRISM_WORKER_PROTECT_REGEX`,
and not a live `non-claude-parent` MCP node. Modes: `--once` / `--monitor-loop` /
`--status` / `--json` / `--dry-run`. MS1 added soft-relief (priority demote + working-
set trim) + GPU/Ollama coordinator; MS2 added enum cache + cross-PC host filter.
`H:/prism/scripts/fleet-reaper-sweep.mjs`

### process-slot-map.mjs (helper -- PID->slot classifier)
The missing slot-ownership layer (911 lines, import-only, pure except enumeration). All
prior generic reapers used age/dead-parent/cmdline heuristics; NONE cross-reference
`chat-slots.json`, so none can distinguish "this node.exe belongs to crashed slot delta
-> reap" from "belongs to live alpha -> leave alone." Classifies ONLY (never kills);
adds the `leftover-bash-task` class for orphaned Bash-tool monitor loops. Consumed by
`fleet-reaper-sweep.mjs` + `fleet-reaper-stop.mjs`.
`H:/prism/.claude/helpers/process-slot-map.mjs`

### fleet-memory-monitor.mjs (script + scheduled task)
Durable system-RAM + per-slot memory monitor (978 lines) that sits ALONGSIDE the reaper.
The reaper covers post-crash cleanup but leaves a gap: when ALL chats are LIVE and the
box drifts toward commit-memory saturation, the reaper has no candidates and pressure
climbs unnoticed until a chat dies hard. Every 5 min (Windows Scheduled Task, +330sec
phase) it samples Win32_OperatingSystem physical + commit budget, enumerates
node/claude/bash/git/powershell working-set, and names the largest `claude.exe` tree so
`critical-memory-compact-nudge.mjs` can target `/compact` at that ONE chat.
`H:/prism/scripts/fleet-memory-monitor.mjs`

### fleet-task-health-watch.mjs (script -- watchdog-over-watchdogs)
Audits every `PRISM *` Windows scheduled task; only HRESULT launch-failure codes count
as failing (avoids false-positives from tasks that ran-and-exited-clean). Advisory only
-- NEVER auto-restarts the Docker daemon (that would kill Qdrant/Postgres -> BM25-only
degraded fleet). Paired Stop hook `fleet-task-health-stop.mjs`.
`H:/prism/scripts/fleet-task-health-watch.mjs`

### ZuluFleetHealthSynthesisEngine.ts (engine -- hermes-zulu shared)
Pure-core fleet-health synthesis (352 lines, HZP/HZD family). Synthesizes three raw
fleet signals -- chat-slot liveness (heartbeat freshness), per-slot task-queue depth,
galaxy coverage -- into a single scored `FleetHealthVector`. This is the genuine gap the
watcher SCRIPTS do NOT fill: they probe + alert, they do not produce a normalized,
comparable per-slot readiness score for downstream schedulers/auctioneers. Liveness
thresholds mirror `chat-slots.mjs`. `mcp-server/src/engines/ZuluFleetHealthSynthesisEngine.ts`

### ZuluFleetGovernorEngine.ts (engine -- hermes-zulu shared)
Pure-core authority gate (143 lines, HZD-02). Given `(slot, soul, task_text)` returns
`{authorized, reason}` from the slot's hermes_role / domain_filter / refuse_list. R12
fail-CLOSED: a malformed domain_filter regex does NOT fall through to accept. Consulted
by the dashboard control server before any state-changing assign/veto/promote-refuse.
`mcp-server/src/engines/ZuluFleetGovernorEngine.ts`

### SlotSessionHistoryEngine.ts (engine -- slot recovery)
Per-slot session-history sidecar (727 lines, SLOT-RECOVERY-MS0/U-SR01). Solves the
"20-chat crash left the operator unable to identify which session_id belonged to which
slot" problem -- `chat-slots.json` stores only the CURRENT chatId per slot. Append-only
`state/shared/slot-sessions/<nato>.jsonl` with session-start / heartbeat / session-end
(exitState: clean/precompact/stop/crash-inferred) events. `mcp-server/src/engines/SlotSessionHistoryEngine.ts`

### chat-slots.mjs (helper -- slot roster CRUD)
The 26-slot roster source of truth: `reclaim` (dead-PID slots) / `claim` (force-take) /
`golf-liveness` / `find`. NEVER raw-edit `chat-slots.json` -- CLI only. Backs slot
heartbeats, terminal binding, and the reaper's is-slot-alive decision.
`H:/prism/.claude/helpers/chat-slots.mjs`

### cleanup-orchestrator.mjs (helper -- generic sibling layer)
GENERIC locks/claims/chat-bus reaper (`/reap-zombies`). Run BOTH this AND the slot-aware
reaper -- it covers stale claims/locks/chat-bus entries the slot-attributed reaper does
NOT touch. Runs under the separate "PRISM Cleanup Orchestrator" scheduled task.
`H:/prism/.claude/helpers/cleanup-orchestrator.mjs`

### golf-slot-reaper-guardian.mjs (hook -- backstop)
SessionStart + UserPromptSubmit guardian (golf-only; non-golf chats no-op). Re-arms the
reaper if a layer dropped and surfaces the reaper status banner. Knob
`PRISM_GOLF_GUARDIAN_DISABLE=1`. The legacy `alpha-slot-reaper-guardian.mjs` is preserved
but unwired (ownership moved alpha->golf 2026-05-16). `H:/prism/.claude/hooks/golf-slot-reaper-guardian.mjs`

### ollama-docker-health.mjs + ollama-offload-dashboard.mjs (scripts -- coordinator)
Docker + Ollama health probe and the offload-stats dashboard (healthy install offload
rate >=30%). Detect the Docker-daemon-wedge failure (Qdrant/Postgres/Prometheus all
DOWN -> silent BM25-only fleet) and the Ollama cold-load stall (`/api/chat` mmap-loads
9.6GB from spinning `H:` >150sec instead of VRAM when `OLLAMA_MODELS` is wrong).
`H:/prism/scripts/ollama-docker-health.mjs` + `H:/prism/scripts/ollama-offload-dashboard.mjs`

## Full index

| Asset | Kind | Category | One-line |
|-------|------|----------|----------|
| fleet-reaper-sweep.mjs | script | Reaper core | Slot-aware orphan reaper; ancestry-confirmed kill, confirm-window gated (3498 lines) |
| process-slot-map.mjs | helper | Reaper core | PID->slot classifier via full ancestry walk; classify-only, never kills |
| fleet-reaper-enum-cache.mjs | helper | Reaper core | Process-enumeration cache sidecar (MS2) |
| fleet-reaper-host-presets.mjs | helper | Reaper core | Cross-PC host filter (MS2; this box DESKTOP-N7MI1VB) |
| zombie-reaper-daemon.mjs | helper | Reaper core | Standalone zombie daemon |
| ram-zombie-watch.mjs | helper | Reaper core | RAM-zombie watch (name-derived) |
| node-orphan-cleaner.mjs | hook/helper | Reaper core | Node-orphan cleaner; `isProtected` cmdline-allowlist gate (10/10 tests) |
| bash-orphan-cleaner.mjs | hook | Reaper core | Orphaned Bash-tool child cleaner (name-derived) |
| fleet-reaper-stop.mjs | hook | Guardian/backstop | Stop-hook sweep arm (45sec global throttle) |
| golf-slot-reaper-guardian.mjs | hook | Guardian/backstop | SessionStart+UserPromptSubmit reaper re-arm (golf-only) |
| alpha-slot-reaper-guardian.mjs | hook | Guardian/backstop | LEGACY guardian, unwired but preserved |
| session-start-zombie-reap.mjs | hook | Guardian/backstop | Zombie reap on SessionStart (name-derived) |
| stop_close_prism_nodes_v2.mjs | hook | Guardian/backstop | Stop-close prism nodes; OPEN same reaping-vector risk (name-derived) |
| stop_close_prism_nodes.mjs | hook | Guardian/backstop | v1 stop-close prism nodes (name-derived) |
| stop_on_orphan_children.mjs | hook | Guardian/backstop | Stop-gate on orphaned children (name-derived) |
| critical-memory-compact-nudge.mjs | hook | Fleet watchdogs | UserPromptSubmit; ONE `/compact` target per critical episode |
| fleet-memory-monitor.mjs | script | Fleet watchdogs | Durable RAM/per-slot-tree advisor, 5-min task +330sec (978 lines) |
| fleet-task-health-watch.mjs | script | Fleet watchdogs | Watchdog-over-watchdogs; audits all `PRISM *` tasks (HRESULT only) |
| fleet-task-health-stop.mjs | hook | Fleet watchdogs | Task-health Stop audit arm |
| fleet-services-watchdog.mjs | script | Fleet watchdogs | Docker/service health watchdog |
| fleet-survival-status.mjs | script | Fleet watchdogs | Fleet-survival status rollup (name-derived) |
| fleet-survival-advisory.mjs | hook | Fleet watchdogs | Fleet-survival advisory inject (name-derived) |
| mcp-server-watchdog.mjs | script | Fleet watchdogs | MCP daemon (port 3100) watchdog (name-derived) |
| monitor-mcp-and-reaper.mjs | script | Fleet watchdogs | Combined MCP + reaper monitor (name-derived) |
| ensure-index-daemon-guardian.mjs | hook | Fleet watchdogs | Index-daemon liveness guardian (name-derived) |
| chat-slots.mjs | helper | Slot hygiene | 26-slot roster CRUD (reclaim/claim/golf-liveness/find) |
| SlotSessionHistoryEngine.ts | engine | Slot hygiene | Per-slot session-history sidecar (crash session_id recovery) |
| slot-session-sidecar.mjs | helper | Slot hygiene | Session sidecar state (name-derived) |
| slot-identity-cache.mjs | helper | Slot hygiene | Slot-identity cache (name-derived) |
| window-slot-bindings.mjs | helper | Slot hygiene | Terminal-window->slot binding (name-derived) |
| slot-constants.mjs | helper | Slot hygiene | Shared slot constants (name-derived) |
| slot-task-claim.mjs | helper | Slot hygiene | Per-slot unit-claim lockfile CRUD |
| chat-slot-heartbeat.mjs | hook | Slot hygiene | Chat-slot heartbeat push (name-derived) |
| live-fleet-heartbeat-push.mjs | hook | Slot hygiene | Live fleet heartbeat push (name-derived) |
| session-start-claim-slot.mjs | hook | Slot hygiene | Claim slot on SessionStart (name-derived) |
| precompact-release-slot.mjs | hook | Slot hygiene | Release slot on precompact (name-derived) |
| stop-release-slot.mjs | hook | Slot hygiene | Release slot on Stop (name-derived) |
| session-cleanup.mjs | hook | Slot hygiene | Session cleanup on Stop (name-derived) |
| chat-cleanup-on-stop.mjs | hook | Slot hygiene | Chat cleanup on Stop (name-derived) |
| slot-bind-enforce.mjs | hook | Slot hygiene | Slot-binding enforce (name-derived) |
| stale-slot-cron-advisory.mjs | hook | Slot hygiene | Stale-slot cron advisory (name-derived) |
| golf-slot-write-allowlist.mjs | hook | Slot hygiene | Golf write-allowlist (UNWIRED, preserved) |
| golf-slot-takeover.mjs | script | Slot hygiene | Golf slot force-takeover (name-derived) |
| ZuluFleetHealthSynthesisEngine.ts | engine | Health synthesis | Normalize liveness+queue-depth+coverage -> scored FleetHealthVector |
| ZuluFleetGovernorEngine.ts | engine | Health synthesis | Pure-core authority gate (fail-CLOSED on bad regex) |
| ZuluFleetHealthSynthesisEngine (dispatch) | engine | Health synthesis | (see above) |
| SoulFleetRollupEngine.ts | engine | Health synthesis | Fleet-wide soul rollup (who-refuses-what, JSON+HTML grid) |
| fleet-status.mjs | script | Health synthesis | Slot-roster renderer (dead PIDs, stale heartbeats) |
| fleet-doctrine-sweep.mjs | script | Health synthesis | Doctrine-compliance sweep |
| fleet-survival-status.test.mjs | script/test | Health synthesis | Survival-status coverage (name-derived) |
| ollama-docker-health.mjs | script | GPU/Ollama/MCP | Docker + Ollama health probe (detect daemon-wedge + cold-load) |
| ollama-offload-dashboard.mjs | script | GPU/Ollama/MCP | Ollama offload-stats dashboard (healthy >=30%) |
| ollama-offload.mjs | script | GPU/Ollama/MCP | Ollama offload router (name-derived) |
| golf-watchdog-wiring-bridge.mjs | script | GPU/Ollama/MCP | Golf watchdog wiring bridge (name-derived) |
| cleanup-orchestrator.mjs | helper | Generic cleanup | GENERIC locks/claims/chat-bus reaper (run BOTH) |
| tmp-orphan-janitor.mjs | script | Generic cleanup | Tmp-file orphan janitor (found ~16GB leak) |
| orphan-inventory.mjs | script | Generic cleanup | Orphan-asset inventory (name-derived) |
| refresh-orphan-report.mjs | script | Generic cleanup | Orphan-report refresh (name-derived) |
| audit-orphan-doctrine.mjs | script | Generic cleanup | Orphan-doctrine audit (name-derived) |
| helper-orphan-rank.mjs | script | Generic cleanup | Helper-orphan ranking (name-derived) |
| hook-orphan-scan.mjs | script | Generic cleanup | Hook-orphan scan (name-derived) |
| jsonl-orphan-scan.mjs | script | Generic cleanup | JSONL-orphan scan (name-derived) |
| lint-wiki-orphans.mjs | script | Generic cleanup | Wiki-orphan lint (name-derived) |
| orphan-type-detector.mjs | hook | Generic cleanup | Orphan-type detector (name-derived) |
| stop-bash-orphan-cleaner.mjs | hook | Generic cleanup | Bash-orphan cleaner Stop arm (name-derived) |
| stop_on_orphan_engine.mjs | hook | Generic cleanup | Stop-gate on orphan engine (name-derived) |
| install-fleet-reaper-task.ps1 | helper | Scheduled tasks | Registers durable `PRISM Fleet Reaper` (S4U, 5-min, elevated) |

_Note: `SlottingEngine.ts`, the LoRA-pipeline / JM-scan / swarm-consensus `*Coordinator*`
and `*Fleet*Learning*` engines matched the name heuristic but are NOT fleet-hygiene --
they are mill/lathe/ai-training-domain assets and are deliberately EXCLUDED (R12). "Name-
derived" rows above are enumerated-by-name from disk with role inferred from filename +
PATHS/MEMORY doctrine; their exact bodies were not read this pass._

## Honest counts (R12)

- **Dedicated fleet-hygiene `.ts` engines:** ~4 genuinely-relevant (ZuluFleetHealthSynthesis,
  ZuluFleetGovernor, SlotSessionHistory, SoulFleetRollup) -- all hermes-zulu-shared / slot-
  recovery, NONE under a `fleet-hygiene/` engine subdir (doctrine confirms zero local `.ts`).
  The galaxy is genuinely script/hook/helper-based.
- **Scripts:** ~15 core fleet-hygiene scripts (reaper-sweep, memory-monitor, task-health-
  watch, services-watchdog, status, doctrine-sweep, ollama-docker-health, offload-dashboard,
  tmp-orphan-janitor, orphan-inventory family, etc.) out of a much larger `scripts/*fleet*|
  *slot*|*orphan*` namespace dominated by LoRA/allocation/generate false positives.
- **Helpers:** ~12 (chat-slots, process-slot-map, cleanup-orchestrator, fleet-reaper-enum-
  cache, fleet-reaper-host-presets, zombie-reaper-daemon, node-orphan-cleaner, slot-task-
  claim, slot-session-sidecar, slot-identity-cache, window-slot-bindings, install-fleet-
  reaper-task.ps1).
- **Hooks:** ~15 (golf-slot-reaper-guardian, fleet-reaper-stop, fleet-task-health-stop,
  critical-memory-compact-nudge, node-orphan-cleaner, session-start-zombie-reap, stop_close_
  prism_nodes[_v2], stop_on_orphan_children, bash-orphan-cleaner, alpha-slot-reaper-guardian
  legacy, etc.).
- **Scheduled tasks (3):** `PRISM Fleet Reaper` (5-min, +210sec), `PRISM Fleet Memory
  Monitor` (5-min, +330sec), `PRISM Fleet Task Health` (advisory Stop hook).

## Notable / uncertain

- **No `prism_fleet` dispatcher** -- C2 via `prism_session`; do not grep DISPATCHER_DIGEST
  for it.
- **OPEN reaping-vector risk:** `stop_close_prism_nodes_v2.mjs` shares the reaper's kill
  vector (`OUR_PATTERNS` matches `H:/prism/scripts` -> detached workers get reaped); fix =
  add `DEFAULT_PRISM_WORKER_PROTECT_REGEX` exclusion (blocked by cross-worktree harness from
  a slot chat). Documented in CLAUDE.md sec 5 gotcha 3 + sec 12 open thread.
- **Name-derived rows** were enumerated from disk and role-inferred from filename +
  PATHS.md/MEMORY.md; bodies not read this pass (R12 -- do not treat as body-verified).
- The `*Coordinator*`/`*Fleet*Learning*`/`Slotting` name-heuristic matches are excluded as
  adjacent-domain (mill/lathe/ai-training), NOT padded in.
