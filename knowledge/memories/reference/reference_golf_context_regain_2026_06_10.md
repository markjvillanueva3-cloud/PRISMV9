---
name: reference_golf_context_regain_2026_06_10
description: "One-read context-regain for the golf / fleet-hygiene slot — ownership, assets, open threads, ranked open-work queue (verified wire-status), and the slot/golf↔main-tree fragmentation finding (2026-06-10)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.596Z
aliases: reference_golf_context_regain_2026_06_10
---


# Golf / fleet-hygiene — fast context regain (snapshot 2026-06-10, slot:golf session 99abda93)

Read THIS first when re-entering golf. Built by a 4-agent parallel gather + direct verification. Supersedes ad-hoc re-derivation. Galaxy brain (deeper, but lives on the live tree): `mcp-server/src/engines/fleet-hygiene/MEMORY.md`.

## Ownership
Golf = process janitor + GPU/Ollama coordinator + service-health watchdog + fleet-config doctor for the 26-chat fleet. **Full work slot since 2026-05-20** (hygiene-only restriction lifted; `golf-slot-write-allowlist.mjs` UNWIRED but preserved on disk). Additionally **owns the fleet-reaper** (doctrine moved alpha→golf 2026-05-16). [[feedback_golf_owns_reaper]]

## Key assets (paths)
- Sweep brain: `scripts/fleet-reaper-sweep.mjs` (`--once|--monitor-loop|--status|--json`)
- `scripts/fleet-memory-monitor.mjs` (5-min cron, per-claude.exe-tree RAM advisor) · `scripts/fleet-task-health-watch.mjs` (watchdog-over-watchdogs) · `scripts/fleet-services-watchdog.mjs` · `scripts/fleet-status.mjs`
- Helpers: `.claude/helpers/chat-slots.mjs` (reclaim/claim/golf-liveness) · `process-slot-map.mjs` (PID→slot ancestry) · `install-fleet-reaper-task.ps1` (ELEVATED) · `fleet-reaper-enum-cache.mjs` · `fleet-reaper-host-presets.mjs` · `cleanup-orchestrator.mjs`
- Hooks: `golf-slot-reaper-guardian.mjs` (SessionStart+UserPromptSubmit backstop) · `fleet-reaper-stop.mjs` · `critical-memory-compact-nudge.mjs` · `alpha-slot-reaper-guardian.mjs` (LEGACY/unwired/preserved)
- Scheduled tasks: `PRISM Fleet Reaper` (5-min, +210s) · `PRISM Fleet Memory Monitor` (5-min, +330s)
- Skills: `/fleet-reaper` `/checkin-golf` `/reap-zombies`

## Open threads / known failure modes (operator-relevant)
1. **Reaper-guardian false negatives** — guardian banner emits "not-registered" even for confirmed tasks. [[reference_reaper_guardian_false_negative_2026_05_26]]
2. **Fleet-task-health drift** — `fleet-task-health-watch` misses some registered PRISM tasks; multi-stage fix in-progress. [[reference_fleet_task_health_drift_sync_2026_06_01]]
3. **MCP boot-grace dormant wiring** — boot-grace flap-prevention built but dormant; needs activation + wiring into reconnect spawn. [[reference_mcp_bootgrace_dormant_wiring_2026_06_04]]
4. **ERROR_LEARN_LEDGER saturation** — 500-entry hard cap, 92.8% held by git-lock-contention pattern → new error classes evicted before 3-hit promotion. Fix = per-pattern-bucket eviction in `error-learn-store.mjs`.
5. **mcp-server transport leak** (`mcp-server/src/index.ts:973–983`) — `U-MCP-FACTORY-REFACTOR` queued (dedicated-chat P0).

## Ranked open-work queue (verified 2026-06-10)
1. **`stop-mcp-server-heal.mjs`** — DORMANT. File exists on `slot/golf` ONLY (absent from live tree), wired in NEITHER settings.json. ROI: 26 chats × Stop = 26 MCP-keepalive layers, zero elevation. Commit `6270570625` (said "operator review before opt-in"). Proper wire needs the file in the live tree AND a settings.json PreToolUse-Stop entry + a fire test.
2. **`hermes-orchestration-advisory-inject.mjs`** — DORMANT. Same split (slot/golf only, unwired). UserPromptSubmit; surfaces parallel-agent-batch guidance on orchestrate/coordinate/synergize keywords. Commit `771b59f4ec`.
3. **Launcher snapshot auto-refresh Stop hook** — PLANNED/deferred (commit `49c517e117`, "operator opt-in").
4. **vLLM Phase-0 POC** — PLANNED, awaiting operator go/no-go (commit `c2b86de650`, DRAFT; harness `4a5ba7f59d` built).
5. **MCP fail-loud unhandledRejection** — shipped opt-in only (`73d6fa49ea`); no follow-up to make default.
6. **66 engines NEEDS_WIRING fleet-wide** (BUILD_STATE) — golf owns the wiring-audit surface; one sweep could triage+delegate.

## ⚠️ Branch fragmentation finding (NEW 2026-06-10)
Golf's work is **split across two branches**: the dormant hooks live on `slot/golf` (my worktree) while the fleet-hygiene **galaxy dir + MEMORY.md live on the live tree** (`cad-fusion-live-ms0`). Consequence: (a) settings.json hook paths can't resolve a slot/golf-only file when chats run from the live tree — wiring requires the file to land in the live tree first; (b) editing the galaxy MEMORY.md is impossible from the slot/golf worktree (file not present). **Integration action needed:** reconcile golf's slot/golf commits into the live tree (golf is the integrator slot) OR build new golf assets directly on the live tree. Until reconciled, "finished but unwired" hooks stay dormant by construction, not just by opt-in.

## Stale context-retention surfaces (enhancement targets)
- Project `CLAUDE.md` §GOLF SLOT (project-local copy): still "hygiene-only" framing + dead knobs (`PRISM_GOLF_DISABLE`, `PRISM_GOLF_FAIL_CLOSED`) + `/checkin --golf`. → collapse to a pointer to the corrected global §GOLF SLOT.
- `knowledge/wiki/architecture/fleet-reaper.md` — MS3 (2026-05-19) absent; title still "7-chat fleet". MS3 detail lives in `fleet-reaper-ms3.md`.
- Galaxy `MEMORY.md` — sync-stamp `2026-05-29` (stale); MS3 missing from §Owned-assets/§Wiki-cross-refs.
- `fleet-hygiene-galaxy.md` wiki — says "write-allowlist constrained" (pre-2026-05-20).
- `hooks/runtime/golf-slot-reaper-guardian.md` wiki — no behavior description, `last_verified 2026-05-18`.

## Regain fast
`/checkin-golf` → reads this memory + galaxy MEMORY.md + recent `HANDOFF-golf-*.md`. Last in-progress before this session: `HANDOFF-golf-golf-queue-exec.md` (2026-06-10 03:59, backend backlog). The resume-directive `/goal` "compile operator X-article doctrines" produced no file — that doctrine is live in CLAUDE.md R5–R15 + the loop/goal-discipline injects + wiki `[[agent-loop-design-rules]]`.

**Why:** golf's context was fragmenting across sessions/branches; a 4-agent gather had to re-derive it from scratch. One durable artifact makes the next regain a single read.
**How to apply:** on `/checkin-golf`, read this before re-deriving; pick the next item from the ranked queue; before wiring any "dormant" hook, resolve the branch-fragmentation first (file must be in the tree chats run from). Refresh this snapshot when the queue materially changes.
