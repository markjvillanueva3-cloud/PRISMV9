---
milestone: LOOP-MIGRATE-MS0
parent_roadmap: BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-2026-05-10.md
inherits_protocol: BACKEND-DEVTOOLS-RGS6-AUTONOMOUS-EXECUTION-PROTOCOL.md (§7 implicit)
assigned_lane: lane-F-misc-build
commit_prefix: "[lane-F-misc-build][LOOP-MIGRATE-MS0]"
total_units: 5
critical_path_role: migrate PRISM cadence runner → Boris /loop + cyrilXBT recurring + Reflexion memory patterns; provides infra for AUTO-LEARNING-LOOP-MS0
loop_registrations: 1 (cadence-migrate-audit weekly)
date: 2026-05-10
---

# LOOP-MIGRATE-MS0 — atomized (5 units)

> Migrate from PRISM's bespoke cadence runner to industry-standard loop patterns: Boris `/loop` (iter-gate + verification), cyrilXBT recurring cron, Reflexion-pattern memory inside the loop, `mcpmon` for dev hot-reload, and `/go` composite gate. Lane-F owns this — direct dependency from AUTO-LEARNING-LOOP-MS0 cron infrastructure.

---

## U-LOOP-MIGRATE-CADENCE — Migrate cadence runner to dynamic /loop pacing

- pillar: loop
- tier: T1
- ai_priority_score: 75
- leverage_score: 12
- why: PRISM has 40 cadence functions firing on fixed intervals; Boris `/loop` doctrine specifies the agent picks its own delay each tick — cheaper, more responsive, never burns cache miss for nothing
- depends_on: []
- blocks: [U-LOOP-REFLEXION-MEM, U-LOOP-ITER-GATE]
- parallel_with: [U-MCPMON-DEV, U-FORGE-GO-CHAIN]
- viz_node_id: `core.engine.cadencemigrate` (TBD-create)
- closes_synergy_edge: cadence × loop-doctrine
- loop_schedule: weekly audit (cron `0 6 * * 1`)

verifies_via:
  channel: test
  tool: `npx vitest run src/__tests__/CadenceMigrateEngine.test.ts`
  expected_signal: 5/5 cases pass; one cadence migrated from fixed cron to dynamic-pacing returns same observable behavior
  re_run_cost: 8s
  baseline: 40 cadences all fixed-interval

micro_steps:
  - step-1:
      tool: Read
      path: `mcp-server/src/cadence/index.ts` (or current cadence-registry source)
      action: confirm cadence shape, identify the 5 highest-fire cadences as migration candidates
      verify: 40 cadences enumerated; 5 picked for first wave
  - step-2:
      tool: Write
      path: `mcp-server/src/engines/CadenceMigrateEngine.ts`
      action: implement `migrateCadence(name)` that wraps the existing handler in a `pickDelay(state)` decision function; emit equivalent ScheduleWakeup-style requests
      verify: tsc clean
  - step-3:
      tool: Write
      path: `mcp-server/src/__tests__/CadenceMigrateEngine.test.ts`
      action: 5 cases (happy single cadence migrate, idempotent re-migrate, malformed cadence rejected, observable-behavior equivalence, rollback on error)
      verify: 5/5 pass
  - step-4:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/sessionDispatcher.ts`
      action: register `cadence_migrate` action
      verify: round-trip MCP returns migration status
  - step-5:
      tool: Bash
      path: `H:/prism/`
      action: migrate the 5 first-wave cadences; run 24h soak
      verify: `state/shared/cadence-migration-log.jsonl` shows no behavioral regressions

adversarial_cases:
  - cadence handler depends on tick-count not wall-clock → migration must preserve via decision-state
  - cadence registered twice (legacy + new) → de-dup
  - external consumer hardcoded the old interval → rollback path required
  - migration mid-fire → wait for handler quiesce before swap

variability_axis:
  - 1 / 5 / 40 cadences migrated
  - high-freq (every min) / low-freq (daily) cadences

failure_modes:
  - migration regression → automatic rollback via `state/shared/cadence-rollback-points.jsonl`
  - dispatcher action collision → tsc catches
  - schedule-wakeup quota exceeded → fall back to fixed interval, log degradation

---

## U-LOOP-REFLEXION-MEM — Reflexion-style memory inside the loop body

- pillar: loop
- tier: T1
- ai_priority_score: 70
- leverage_score: 11
- why: Reflexion pattern (Shinn 2303.11366) — every loop iteration writes a structured reflection ("what worked, what didn't, why") that the next iteration consumes; PRISM loops today have no introspection memory
- depends_on: [U-LOOP-MIGRATE-CADENCE]
- blocks: []
- parallel_with: [U-LOOP-ITER-GATE, U-MCPMON-DEV, U-FORGE-GO-CHAIN]
- viz_node_id: `core.engine.loopreflexionmem` (TBD-create)
- closes_synergy_edge: loop × memory
- loop_schedule: none (embedded in every migrated cadence body)

verifies_via:
  channel: test
  tool: `npx vitest run src/__tests__/LoopReflexionMemEngine.test.ts`
  expected_signal: 5/5 cases pass; 5-iteration test produces 5 reflection entries each visible to subsequent iteration
  re_run_cost: 6s
  baseline: no reflection memory

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/src/engines/LoopReflexionMemEngine.ts`
      action: implement `writeReflection({loopName, iteration, outcome, reasoning, next_action})` → append to `mcp-server/data/state/loop-reflexion/<loopName>.jsonl`; `readRecent(loopName, k)` returns last k entries
      verify: tsc clean
  - step-2:
      tool: Write
      path: `mcp-server/src/__tests__/LoopReflexionMemEngine.test.ts`
      action: 5 cases (happy 5-iter, malformed reflection rejected, file rotation at 10k entries, concurrent read+write, missing loop name)
      verify: 5/5 pass
  - step-3:
      tool: Edit
      path: `mcp-server/src/engines/CadenceMigrateEngine.ts`
      action: inject reflection-write into the migrated handler wrapper; previous reflections available as input arg
      verify: smoke shows reflection appended after each tick
  - step-4:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/memoryDispatcher.ts`
      action: register `loop_reflexion_read` action
      verify: round-trip MCP

adversarial_cases:
  - 1M reflections → file rotation to `<loopName>.<date>.jsonl.zst`
  - concurrent ticks of same loop → append-only ensures no corruption
  - reflection body 100KB+ → cap body length, truncate with marker
  - missing loop directory → auto-create

variability_axis:
  - 0 / 100 / 1M reflection entries
  - small / medium / large body

failure_modes:
  - filesystem full → loop catches, logs `REFLECTION_DROPPED`, continues
  - JSONL corruption mid-write → atomic append via O_APPEND, defensive parse on read
  - concurrent rotation → file-claim on rotation operation

---

## U-LOOP-ITER-GATE — Iteration gate (Boris pattern, verifier hook)

- pillar: loop
- tier: T1
- ai_priority_score: 68
- leverage_score: 11
- why: Boris doctrine — each loop iteration must pass a verifier before advancing; without a gate, broken iterations compound silently. The gate also unlocks parallel-Claude usage by isolating bad iterations
- depends_on: [U-LOOP-MIGRATE-CADENCE]
- blocks: []
- parallel_with: [U-LOOP-REFLEXION-MEM, U-MCPMON-DEV, U-FORGE-GO-CHAIN]
- viz_node_id: `core.engine.loopitergate` (TBD-create)
- closes_synergy_edge: loop × verification

verifies_via:
  channel: e2e
  tool: synthetic loop with 1 deliberately-bad iteration → gate blocks → loop pauses with `ITER_GATE_FAIL` status
  expected_signal: loop does not advance past failed iteration without explicit override
  re_run_cost: 5s
  baseline: no gate; failed iterations advance silently

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/src/engines/LoopIterGateEngine.ts`
      action: implement `gate(loopName, iteration, verifierFn)` that runs verifierFn; on fail, write to `state/shared/loop-iter-gate-blocks.jsonl` and refuse advance; on pass, mark `iter-N-ok`
      verify: tsc clean
  - step-2:
      tool: Write
      path: `mcp-server/src/__tests__/LoopIterGateEngine.test.ts`
      action: 5 cases (happy pass, single fail, override semantics, verifier throws, verifier times out)
      verify: 5/5 pass
  - step-3:
      tool: Edit
      path: `mcp-server/src/engines/CadenceMigrateEngine.ts`
      action: wrap migrated handler in gate (gate runs declared verifier from migration config)
      verify: a synthetic bad tick fails the gate
  - step-4:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/sessionDispatcher.ts`
      action: register `loop_iter_gate_status` action
      verify: round-trip MCP

adversarial_cases:
  - verifierFn hangs → 30s timeout, fail gate
  - verifierFn always passes → gate is no-op, log warning if 100 consecutive trivial passes (suggest tightening verifier)
  - manual override left on indefinitely → expire after 24h
  - blocking many loops → bound jsonl size, rotate

variability_axis:
  - 0 / 1 / 100 gate failures per day

failure_modes:
  - verifier throws → fail gate (safe default)
  - jsonl write race → file-claim
  - override file corrupted → ignore override, fail closed

---

## U-MCPMON-DEV — Integrate `mcpmon` for MCP dev hot-reload

- pillar: loop
- tier: T1
- ai_priority_score: 60
- leverage_score: 10
- why: every MCP server change today requires manual `npm run build:fast` + Claude Code restart; `mcpmon` (community tool) auto-rebuilds and signals MCP clients on file change — meaningful productivity win during the engine-build runway
- depends_on: []
- blocks: []
- parallel_with: [U-LOOP-MIGRATE-CADENCE, U-LOOP-REFLEXION-MEM, U-LOOP-ITER-GATE, U-FORGE-GO-CHAIN]
- viz_node_id: `external.devtool.mcpmon` (TBD-create)
- closes_synergy_edge: dev-loop × mcp-rebuild

verifies_via:
  channel: e2e
  tool: edit a known engine file → `mcpmon` triggers `npm run build:fast` → `claude mcp list --health` shows server re-connected
  expected_signal: rebuild + reconnect under 8s
  re_run_cost: 8s manual loop
  baseline: full restart cycle ~30s

micro_steps:
  - step-1:
      tool: WebFetch
      url: https://github.com/<community-repo>/mcpmon
      action: confirm install + config
      verify: install command captured (or alternate found if repo gone)
  - step-2:
      tool: Bash
      path: `H:/prism/`
      action: install `mcpmon` globally or as dev-dep
      verify: binary on PATH
  - step-3:
      tool: Write
      path: `mcpmon.config.json` (at repo root)
      action: watch `mcp-server/src/**`, trigger `npm run build:fast`, signal `prism` MCP server
      verify: config valid JSON
  - step-4:
      tool: Bash
      path: `H:/prism/`
      action: smoke run + edit a fixture file
      verify: rebuild fires, server reconnects within 8s

adversarial_cases:
  - mcpmon repo gone → record skip in `state/shared/external-mcp-adopt-log.jsonl`, fall back to `npm-run-all --parallel watch:* serve:*`
  - rapid edits (10 in 1s) → debounce 500ms
  - build fail → don't signal reconnect; surface error
  - locked file (windows) → retry x3

variability_axis:
  - 1 / 10 / 100 watched files / minute

failure_modes:
  - watcher crash → restart, log
  - build fail → keep old server running, surface failure in console
  - mcpmon unmaintained → fall back path documented

---

## U-FORGE-GO-CHAIN — `/go` composite gate (build + test + lint + verify-hooks)

- pillar: loop
- tier: T1
- ai_priority_score: 65
- leverage_score: 11
- why: Boris `/go` doctrine — a single composite command that runs the canonical pre-ship gauntlet; PRISM has the pieces (`npm run build`, `vitest`, `verify-hook-refs`, etc) but no single gate; without it, partial-ship is the default
- depends_on: []
- blocks: []
- parallel_with: [U-LOOP-MIGRATE-CADENCE, U-LOOP-REFLEXION-MEM, U-LOOP-ITER-GATE, U-MCPMON-DEV]
- viz_node_id: `core.skill.go` (TBD-create)
- closes_synergy_edge: pre-ship × verification

verifies_via:
  channel: e2e
  tool: `/go --dry-run`
  expected_signal: lists every step planned in order; live run on clean tree exits 0
  re_run_cost: 60-120s on clean tree
  baseline: pre-ship is informal; verify-step is verify-step

micro_steps:
  - step-1:
      tool: Write
      path: `.claude/commands/go.md` (skill manifest)
      action: define `/go` skill — runs `npm run build`, `npx vitest run`, `node scripts/verify-hook-refs.mjs`, `node .claude/scripts/scrutiny-3way.mjs --status`, `node scripts/build-state-snapshot.mjs`
      verify: skill registered + discoverable in skill list
  - step-2:
      tool: Write
      path: `.claude/scripts/go-runner.mjs`
      action: orchestrates the chain with explicit fail-fast; emit JSON report `state/shared/go-runs.jsonl`
      verify: smoke run produces valid JSON
  - step-3:
      tool: Bash
      path: `H:/prism/`
      action: `/go --dry-run` → run on clean main
      verify: exits 0 on clean tree

adversarial_cases:
  - build fails → chain stops, surfaces tsc errors
  - test fails → chain stops, surfaces failed file list
  - hook-ref broken → chain stops, surfaces missing path
  - scrutiny gate not cleared → chain warns but continues (advisory)

variability_axis:
  - clean / dirty tree
  - small / large test suite

failure_modes:
  - any step fails → fail-fast with clear surface
  - JSON report write race → file-claim
  - chain runs >10min → cap with timeout per step

---

## Milestone-level autonomous-execution hooks (inherited from AUTONOMOUS-EXECUTION-PROTOCOL.md §7)

- pre-unit: `prism_session:claim_milestone LOOP-MIGRATE-MS0`
- per-unit-pre: `duplication-hard-block` + `inventory-check-guard`
- per-unit-post: `comprehensive-build-enforce` + `stop_on_unwired_assets`
- per-3-units: auto-compact threshold check
- per-milestone-end: `/handoff` writes `HANDOFF-<id>-LOOP-MIGRATE-MS0.md`

## Variability-axis summary

Each unit covers zero-state / nominal / saturated. Failure-mode addresses crash recovery, race, timeout. No silent-failure path.

## Failure-mode summary

The five loop-domain units share three failure-mode classes:
1. Process-level (timeout, crash, OOM) → bounded with timeouts + rotation
2. Schema drift (loop config, mcpmon config, gate config) → schema-validate + fall back
3. Concurrent fires (multiple ticks, multiple migrations, multiple gate writes) → file-claim or atomic-append

## Lane ownership + commit format

- Lane: lane-F-misc-build
- Commit format: `[lane-F-misc-build][LOOP-MIGRATE-MS0]/<U-id>: <title>`
- Worktree (if forked): `H:/prism-loop-migrate/` (branch `work/loop-migrate-ms0`)

## Next milestone in lane

MACHINE-CONNECTIVITY-MS0 (no direct dep, lane-F continues).
