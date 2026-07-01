---
milestone: TOOL-INVENTORY-MS0
parent_roadmap: BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-2026-05-10.md
inherits_protocol: BACKEND-DEVTOOLS-RGS6-AUTONOMOUS-EXECUTION-PROTOCOL.md (§7 implicit)
assigned_lane: lane-F-misc-build
commit_prefix: "[lane-F-misc-build][TOOL-INVENTORY-MS0]"
total_units: 10
critical_path_role: external MCP/plugin adoption — expose existing PRISM engines through standard MCP surfaces; DO NOT duplicate
loop_registrations: 1 (mcp-registry-health 6h)
date: 2026-05-10
---

# TOOL-INVENTORY-MS0 — atomized (10 units)

> Adopt 8 external MCP servers as exposure-surfaces over existing PRISM engines. 8 of 18 surveyed servers overlap with existing PRISM functionality — adopt = wrap our engine as that server's tool, NOT pull in their implementation. Plus 1 registry unit + 1 wiring unit = 10. Lane-F owns this — no critical-path blockers, parallel-safe across all 10 sub-units (one-shot expose-and-test per server).

---

## U-TOOLINV-01 — Adopt `qdrant` MCP server as exposure over `QdrantMemoryEngine`

- pillar: tool
- tier: T1
- ai_priority_score: 72
- leverage_score: 11
- why: external `qdrant` MCP server provides a standard `vector_search` tool surface; our existing `QdrantMemoryEngine` does the same thing privately — exposing it via that surface lets external Claude sessions or peer MCPs query our memory without bespoke wiring
- depends_on: []
- blocks: [U-TOOLINV-09]
- parallel_with: [U-TOOLINV-02, U-TOOLINV-03, U-TOOLINV-04, U-TOOLINV-05, U-TOOLINV-06, U-TOOLINV-07, U-TOOLINV-08]
- viz_node_id: `core.mcp.qdrantsurface` (TBD-create)
- closes_synergy_edge: external-mcp × internal-engine
- loop_schedule: none (one-shot adopt; health-check in U-TOOLINV-09)

verifies_via:
  channel: e2e
  tool: `claude mcp list` then `mcp-call qdrant search "kienzle" --k 5`
  expected_signal: returns 5 hits from our existing memory store
  re_run_cost: 4s
  baseline: external `qdrant` MCP not registered; our QdrantMemoryEngine accessible only via internal dispatcher

micro_steps:
  - step-1:
      tool: Read
      path: `mcp-server/src/engines/QdrantMemoryEngine.ts`
      action: confirm public `search`, `upsert`, `delete`, `listCollections` methods
      verify: methods exist with stable signatures
  - step-2:
      tool: Write
      path: `mcp-server/src/mcp-exposures/qdrantSurface.ts`
      action: adapter that translates external MCP tool calls (`vector_search`, `vector_upsert`) → `QdrantMemoryEngine.*`; declare tool schema matching the public `qdrant` MCP spec
      verify: tsc clean
  - step-3:
      tool: Edit
      path: `.mcp.json` (or whichever MCP registry file Claude Code reads)
      action: register the new exposure under name `prism-qdrant` (do NOT collide with external `qdrant` if user has it installed)
      verify: `claude mcp list` includes `prism-qdrant`
  - step-4:
      tool: Bash
      path: `H:/prism/`
      action: smoke — invoke the tool with a known query
      verify: result includes ≥1 hit from existing memory collection

adversarial_cases:
  - external `qdrant` server already registered (collision) → name `prism-qdrant` avoids it; document in README
  - QdrantMemoryEngine collection doesn't exist yet on first call → auto-create empty
  - request volume spike → engine already has rate-limiting; surface inherits

variability_axis:
  - 0 / 100 / 1M vectors in our collection
  - tool-schema-strict / lenient parameters

failure_modes:
  - engine throws → surface catches and returns MCP error code 500 with message
  - schema mismatch (external caller sends wrong shape) → reject with 400 + field-list

---

## U-TOOLINV-02 — Adopt `sequential-thinking` MCP server as exposure over `prismCreativeReasoningEngine`

- pillar: tool
- tier: T1
- ai_priority_score: 70
- leverage_score: 11
- why: `sequential-thinking` MCP gives a stepwise reasoning tool surface; our `prismCreativeReasoningEngine.explore(problem, mode)` already does multi-step exploration — expose it
- depends_on: []
- blocks: [U-TOOLINV-09]
- parallel_with: [U-TOOLINV-01, U-TOOLINV-03..08]
- viz_node_id: `core.mcp.seqthinksurface` (TBD-create)
- closes_synergy_edge: external-mcp × creative-reasoning

verifies_via:
  channel: e2e
  tool: `mcp-call prism-sequential-thinking think "design adaptive feed rate"`
  expected_signal: returns ≥3 reasoning steps with mode escalation visible
  re_run_cost: 5s
  baseline: engine internal-only

micro_steps:
  - step-1:
      tool: Read
      path: `mcp-server/src/engines/PRISMCreativeReasoningEngine.ts`
      action: confirm `explore(problem, mode)` signature + valid modes
      verify: modes include {conventional, exploratory, hybrid, innovative, optimal}
  - step-2:
      tool: Write
      path: `mcp-server/src/mcp-exposures/sequentialThinkingSurface.ts`
      action: translate `think({problem, max_steps, mode})` → `prismCreativeReasoningEngine.explore`; stream steps as MCP progress events
      verify: tsc clean
  - step-3:
      tool: Edit
      path: `.mcp.json`
      action: register `prism-sequential-thinking`
      verify: visible in `claude mcp list`
  - step-4:
      tool: Bash
      path: `H:/prism/`
      action: smoke
      verify: ≥3 steps returned

adversarial_cases:
  - problem string empty → engine should refuse with `EMPTY_PROBLEM`
  - max_steps unbounded → cap at 20 per call
  - mode invalid → fall back to `optimal`

variability_axis:
  - simple / complex / cross-domain problems

failure_modes:
  - engine exception → 500 + message
  - timeout (mode=optimal can be slow) → soft cap 30s

---

## U-TOOLINV-03 — Adopt `semgrep` MCP server (security/lint exposure)

- pillar: tool
- tier: T1
- ai_priority_score: 65
- leverage_score: 10
- why: `semgrep` MCP gives security-rule scanning as a tool; we already have lint hooks but no semantic security scanner — this one we INSTALL externally (not wrap) but record what overlap exists in our `code-review-swarm` agent
- depends_on: []
- blocks: [U-TOOLINV-09]
- parallel_with: [U-TOOLINV-01, U-TOOLINV-02, U-TOOLINV-04..08]
- viz_node_id: `external.mcp.semgrep` (TBD-create)
- closes_synergy_edge: external-mcp × security

verifies_via:
  channel: e2e
  tool: `mcp-call semgrep scan --path mcp-server/src/`
  expected_signal: returns ≥1 finding or `0 findings, clean` if codebase is clean
  re_run_cost: 30s on full src tree
  baseline: no semantic security scanner present

micro_steps:
  - step-1:
      tool: WebFetch
      url: https://github.com/semgrep/mcp
      action: read the official install instructions
      verify: install command captured
  - step-2:
      tool: Bash
      path: `H:/prism/`
      action: `npm install -g @semgrep/mcp` (or pinned alternative)
      verify: binary on PATH
  - step-3:
      tool: Edit
      path: `.mcp.json`
      action: register `semgrep` server
      verify: visible in `claude mcp list`
  - step-4:
      tool: Bash
      path: `H:/prism/`
      action: smoke scan on a known small file
      verify: returns valid JSON

adversarial_cases:
  - semgrep registry offline → install fails; document fallback (manual rule download)
  - false positives flood → tune ruleset to baseline first

variability_axis:
  - 0 / 100 / 10000 source files

failure_modes:
  - install fails → record in `state/shared/external-mcp-adopt-log.jsonl` and skip; do not block milestone
  - scan exceeds memory → run per-package not per-monorepo

---

## U-TOOLINV-04 — Adopt `grafana` MCP server (telemetry visualization)

- pillar: tool
- tier: T1
- ai_priority_score: 60
- leverage_score: 10
- why: telemetry dashboards reduce time-to-diagnose; PRISM emits JSONL telemetry across many surfaces (cost-telemetry, scrutiny-ledger, ollama-offload-stats) — grafana MCP can query Loki/Prometheus over those JSONL files via tail-shipper
- depends_on: []
- blocks: [U-TOOLINV-09]
- parallel_with: [U-TOOLINV-01..03, U-TOOLINV-05..08]
- viz_node_id: `external.mcp.grafana` (TBD-create)
- closes_synergy_edge: external-mcp × observability

verifies_via:
  channel: e2e
  tool: `mcp-call grafana query "from(bucket:'prism') |> range(start: -1h)"`
  expected_signal: returns valid result envelope (data array, may be empty)
  re_run_cost: 1s per query
  baseline: no grafana wired; JSONL is read with ad-hoc grep

micro_steps:
  - step-1:
      tool: WebFetch
      url: https://github.com/grafana/mcp-grafana
      action: capture install + auth setup
      verify: doc clear on token requirement
  - step-2:
      tool: Bash
      path: `H:/prism/`
      action: install + register
      verify: `claude mcp list` includes `grafana`
  - step-3:
      tool: Write
      path: `mcp-server/data/state/grafana-shipper-config.json`
      action: list of JSONL files to tail-ship + label mapping
      verify: valid JSON
  - step-4:
      tool: Bash
      path: `H:/prism/`
      action: smoke query
      verify: returns 200 + envelope

adversarial_cases:
  - grafana instance not running → install yes, query fails gracefully with `GRAFANA_UNAVAILABLE`
  - auth token missing → surface clear error in install step
  - large JSONL (1GB) shipper backlog → bound shipper memory

variability_axis:
  - 0 / 1 / 10 grafana datasources

failure_modes:
  - install ok / runtime down → adopt-log + skip dashboards
  - auth fails → exit at install with clear remediation

---

## U-TOOLINV-05 — Adopt `freecad` MCP server (CAD bridge)

- pillar: tool
- tier: T1
- ai_priority_score: 60
- leverage_score: 10
- why: FreeCAD is an open-source CAD with scriptable Python; existing CAD tier-1 priority is Fusion > hyperMILL > Mastercam > Esprit, but FreeCAD bridges give us a tier-2 export-only path useful for headless CAD verification in CI
- depends_on: []
- blocks: [U-TOOLINV-09]
- parallel_with: [U-TOOLINV-01..04, U-TOOLINV-06..08]
- viz_node_id: `external.mcp.freecad` (TBD-create)
- closes_synergy_edge: external-mcp × cad

verifies_via:
  channel: e2e
  tool: `mcp-call freecad open --file test-data/sample.FCStd && mcp-call freecad export --format step`
  expected_signal: emits a `.step` file
  re_run_cost: 8s
  baseline: no headless CAD path in CI

micro_steps:
  - step-1:
      tool: WebFetch
      url: https://github.com/jtarr/freecad-mcp
      action: confirm exists + install path
      verify: install command captured
  - step-2:
      tool: Bash
      path: `H:/prism/`
      action: install (assumes FreeCAD already installed; if not, log skip)
      verify: `claude mcp list` includes `freecad` OR adopt-log records skip
  - step-3:
      tool: Write
      path: `test-data/cad/sample.FCStd`
      action: place a trivial fixture file (10mm cube)
      verify: file exists, opens in FreeCAD CLI
  - step-4:
      tool: Bash
      path: `H:/prism/`
      action: smoke
      verify: STEP file emitted

adversarial_cases:
  - FreeCAD not installed → skip with clear adopt-log entry
  - fixture file corrupt → fixture re-generation script in `scripts/fixtures/`
  - export format unsupported → emit clear error

variability_axis:
  - trivial / mid-size / complex CAD

failure_modes:
  - FreeCAD missing → graceful skip, do not block milestone
  - export hang → 30s timeout

---

## U-TOOLINV-06 — Adopt `opcua` MCP server as exposure over `OpcUaConnectorEngine` (overlap-expose, not import)

- pillar: tool
- tier: T1
- ai_priority_score: 70
- leverage_score: 11
- why: external `opcua` MCP server exists; our `OpcUaConnectorEngine` exists per MACHINE-CONNECTIVITY-MS0 audit — adopt = expose our engine via that surface, NOT install theirs (would duplicate)
- depends_on: [machine-connectivity::U-OPCUA-CONNECTOR-EXTEND]
- blocks: [U-TOOLINV-09]
- parallel_with: [U-TOOLINV-01..05, U-TOOLINV-07, U-TOOLINV-08]
- viz_node_id: `core.mcp.opcuasurface` (TBD-create)
- closes_synergy_edge: external-mcp × machine-connectivity

verifies_via:
  channel: e2e
  tool: `mcp-call prism-opcua browse --endpoint opc.tcp://localhost:4840`
  expected_signal: returns node tree or `ENDPOINT_UNREACHABLE` cleanly
  re_run_cost: 3s
  baseline: engine internal-only

micro_steps:
  - step-1:
      tool: Read
      path: `mcp-server/src/engines/OpcUaConnectorEngine.ts`
      action: confirm public `browse`, `subscribe`, `disconnect`
      verify: methods exist
  - step-2:
      tool: Write
      path: `mcp-server/src/mcp-exposures/opcuaSurface.ts`
      action: translate `browse`, `subscribe`, `read` to engine methods
      verify: tsc clean
  - step-3:
      tool: Edit
      path: `.mcp.json`
      action: register `prism-opcua`
      verify: visible in `claude mcp list`
  - step-4:
      tool: Bash
      path: `H:/prism/`
      action: smoke — endpoint will be unreachable on dev box; expect `ENDPOINT_UNREACHABLE`
      verify: clean error envelope returned

adversarial_cases:
  - endpoint unreachable → standard error
  - subscribe to non-existent node → standard error
  - session timeout → engine auto-reconnect

variability_axis:
  - real OPC-UA server / simulator / no-server

failure_modes:
  - engine throws → surface 500
  - schema drift between OPC-UA versions → adapter detects and adapts

---

## U-TOOLINV-07 — Adopt `ragex` MCP server (RAG-over-codebase) → expose over PRISM's `code-system-index`

- pillar: tool
- tier: T1
- ai_priority_score: 65
- leverage_score: 10
- why: ragex provides a RAG surface over a codebase; we already have `CodeSystemIndexEngine` + Qdrant memory — expose via the ragex tool schema for external clients
- depends_on: []
- blocks: [U-TOOLINV-09]
- parallel_with: [U-TOOLINV-01..06, U-TOOLINV-08]
- viz_node_id: `core.mcp.ragexsurface` (TBD-create)
- closes_synergy_edge: external-mcp × code-search

verifies_via:
  channel: e2e
  tool: `mcp-call prism-ragex search "DuplicationGuardEngine usage" --k 5`
  expected_signal: 5 file:line hits ranked by relevance
  re_run_cost: 4s
  baseline: code-search internal-only via mcp__claude-flow

micro_steps:
  - step-1:
      tool: Read
      path: `mcp-server/src/engines/CodeSystemIndexEngine.ts`
      action: confirm search API
      verify: `search(query, k)` exists
  - step-2:
      tool: Write
      path: `mcp-server/src/mcp-exposures/ragexSurface.ts`
      action: translate `search`, `index` to engine + Qdrant
      verify: tsc clean
  - step-3:
      tool: Edit
      path: `.mcp.json`
      action: register `prism-ragex`
      verify: `claude mcp list` shows it
  - step-4:
      tool: Bash
      path: `H:/prism/`
      action: smoke
      verify: 5 hits returned

adversarial_cases:
  - index stale → triggers re-index in background, returns degraded warning
  - query >2k tokens → truncate + warn
  - empty query → reject

variability_axis:
  - 0 / 1k / 100k indexed files

failure_modes:
  - Qdrant offline → fall back to BM25
  - schema drift → preserve old collection, re-index new

---

## U-TOOLINV-08 — Adopt `mcp-server-qdrant` (peer alternative) — record overlap as `WIRE-EXEMPT`

- pillar: tool
- tier: T2
- ai_priority_score: 45
- leverage_score: 8
- why: there is also an official `mcp-server-qdrant` from Qdrant Labs; we expose via U-TOOLINV-01. This unit records the overlap formally so dedup-guard understands the alternate exposure exists but we chose ours
- depends_on: [U-TOOLINV-01]
- blocks: []  # was [U-TOOLINV-09] — removed per audit-v2 tier-floor fix: a T2 unit must not gate a T1 unit. The registry (U-TOOLINV-09) enumerates `mcp-server-qdrant` as a known-but-not-adopted external from the adopt-log regardless of whether THIS T2 bookkeeping unit has run.
- parallel_with: []
- viz_node_id: `state.adoptlog.qdrantlabsalt` (TBD-create)
- closes_synergy_edge: dedup-guard × external-mcp-adoption

verifies_via:
  channel: doc
  tool: `grep WIRE-EXEMPT state/shared/external-mcp-adopt-log.jsonl`
  expected_signal: one entry naming `mcp-server-qdrant` with reason `wrapped via U-TOOLINV-01`
  re_run_cost: 0.5s
  baseline: no overlap registry exists

micro_steps:
  - step-1:
      tool: Write
      path: `state/shared/external-mcp-adopt-log.jsonl`
      action: append `{name:"mcp-server-qdrant", decision:"wire-exempt", reason:"wrapped via prism-qdrant exposure (U-TOOLINV-01)", date:"2026-05-10"}`
      verify: line present
  - step-2:
      tool: Edit
      path: `state/shared/PRISM-COMMANDS-MANIFEST.md` (or equivalent index)
      action: note overlap in cross-ref section
      verify: edit applied

adversarial_cases:
  - log file does not exist → create with schema header
  - duplicate decision rows → de-dup by name+decision

variability_axis:
  - 0 / 1 / 10 overlap decisions over time

failure_modes:
  - write race → file-claim guard

---

## U-TOOLINV-09 — Build `ExternalMCPRegistryEngine` (umbrella + health-check)

- pillar: tool
- tier: T1
- ai_priority_score: 70
- leverage_score: 11
- why: 8 separate adoptions need a single registry & health-check (drift, version, install-status); without it adoption-rot kills our exposure surface in weeks
- depends_on: [U-TOOLINV-01, U-TOOLINV-02, U-TOOLINV-03, U-TOOLINV-04, U-TOOLINV-05, U-TOOLINV-06, U-TOOLINV-07]  # was [...U-TOOLINV-08] — dropped per audit-v2: U-TOOLINV-08 is T2 and this unit is T1; T2 must not gate T1. U-TOOLINV-08's adopt-log row is read opportunistically by the registry, not a hard prereq.
- blocks: [U-TOOLINV-10]
- parallel_with: []
- viz_node_id: `core.engine.externalmcpregistry` (TBD-create)
- closes_synergy_edge: external-mcp × health-check
- loop_schedule: 6h

verifies_via:
  channel: test
  tool: `npx vitest run src/__tests__/ExternalMCPRegistryEngine.test.ts`
  expected_signal: 5/5 cases pass; health probe of `prism-qdrant` returns ok
  re_run_cost: 8s
  baseline: no umbrella; each adoption opaque

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/src/engines/ExternalMCPRegistryEngine.ts`
      action: implement `listRegistered()`, `healthCheck(name)`, `healthCheckAll()`, `versionDrift()`
      verify: tsc clean
  - step-2:
      tool: Write
      path: `mcp-server/src/__tests__/ExternalMCPRegistryEngine.test.ts`
      action: 5 cases (all-ok, one-unreachable, version-drift, install-missing, schema-broken)
      verify: 5/5 pass
  - step-3:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/devDispatcher.ts`
      action: register `mcp_registry_health` action
      verify: round-trip MCP returns health
  - step-4:
      tool: Bash
      path: `H:/prism/`
      action: cron register `0 */6 * * *`
      verify: registry contains entry

adversarial_cases:
  - registered server missing from `.mcp.json` (manually removed) → flag drift
  - server installed but binary not on PATH → flag install-missing
  - 8 simultaneous health checks → bound concurrency 3

variability_axis:
  - 0 / 8 / 50 registered exposures

failure_modes:
  - health check timeout (30s) → mark `degraded`, do not crash
  - cron registry write race → file-claim
  - server name collision with another tool → engine rejects registration

---

## U-TOOLINV-10 — Wire `ExternalMCPRegistryEngine` to `prism_dev` + `prism_session`

- pillar: tool
- tier: T1
- ai_priority_score: 60
- leverage_score: 10
- why: per CLAUDE.md ENGINE-WIRING law: every engine wires to all natural consumers — `prism_dev` for health + `prism_session` for adoption-log inspection
- depends_on: [U-TOOLINV-09]
- blocks: []
- parallel_with: []
- viz_node_id: `wire.dispatcher.toolinv` (TBD-create)
- closes_synergy_edge: engine × dispatcher

verifies_via:
  channel: e2e
  tool: `mcp-call prism_dev mcp_registry_health` + `mcp-call prism_session external_mcp_adopt_log`
  expected_signal: both return non-empty results
  re_run_cost: 2s
  baseline: engine accessible only via internal import

micro_steps:
  - step-1:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/devDispatcher.ts`
      action: add action enum entry `mcp_registry_health` + handler invoking engine
      verify: dispatcher tsc clean; action visible via dispatcher_map_compact
  - step-2:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/sessionDispatcher.ts`
      action: add `external_mcp_adopt_log` action returning the JSONL adopt-log
      verify: dispatcher tsc clean
  - step-3:
      tool: Bash
      path: `H:/prism/`
      action: round-trip both dispatcher actions
      verify: each returns valid JSON envelope

adversarial_cases:
  - engine throws mid-call → dispatcher wraps and returns MCP error
  - adopt-log file missing → dispatcher returns `[]` not error
  - action enum collision → tsc would catch

variability_axis:
  - empty / partial / full registry

failure_modes:
  - dispatcher import cycle → use lazy import pattern
  - action shape drift → schema declared in `schemas/`, dispatcher validates

---

## Milestone-level autonomous-execution hooks (inherited from AUTONOMOUS-EXECUTION-PROTOCOL.md §7)

- pre-unit: `prism_session:claim_milestone TOOL-INVENTORY-MS0`
- per-unit-pre: `duplication-hard-block` (especially loud here — many overlapping external servers)
- per-unit-post: `comprehensive-build-enforce`
- per-3-units: auto-compact threshold check
- per-milestone-end: `/handoff` writes `HANDOFF-<id>-TOOL-INVENTORY-MS0.md`

## Variability-axis summary

zero-state vs heavy-volume, install-success vs install-failure, online vs offline, name-collision vs name-clean. Every external adoption has graceful skip on install failure (recorded in `state/shared/external-mcp-adopt-log.jsonl`) — milestone does not block on one failed adoption.

## Failure-mode summary

Two distinct classes:
1. **Install-time** — server not available, registry offline, binary missing → all recorded in adopt-log, milestone continues.
2. **Runtime** — server installed but unreachable, schema drift → `ExternalMCPRegistryEngine.healthCheck` flags as `degraded`, alarms surface via cron.

## Lane ownership + commit format

- Lane: lane-F-misc-build
- Commit format: `[lane-F-misc-build][TOOL-INVENTORY-MS0]/U-TOOLINV-<n>: <title>`
- Worktree (if forked): `H:/prism-tool-inventory/` (branch `work/tool-inventory-ms0`)

## Next milestone in lane

LOOP-MIGRATE-MS0 + MACHINE-CONNECTIVITY-MS0 (no direct dep, lane-F continues).
