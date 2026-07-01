---
milestone: COST-CASCADE-MS0
parent_roadmap: BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-2026-05-10.md
inherits_protocol: BACKEND-DEVTOOLS-RGS6-AUTONOMOUS-EXECUTION-PROTOCOL.md (§7 implicit)
assigned_lane: lane-C-octopus-cost
commit_prefix: "[lane-C-octopus-cost][COST-CASCADE-MS0]"
total_units: 8
critical_path_role: multi-LLM cost discipline — calibrate cascades, register K2 mid-tier, build MoA layer-2, two-pass wrap; depends on K2-CLOUD landing first
loop_registrations: 2 (cost-telemetry-emit hourly, cost-alarm-check 15min)
date: 2026-05-10
---

# COST-CASCADE-MS0 — atomized (8 units)

> Multi-LLM cost discipline: probe cascades, register all tentacles in the cost model, build the MoA layer-2 aggregator, wrap dispatcher calls with two-pass logic, fallback chain, dashboard, alarm, token-budget guard. Lane-C owns this — strictly serial with K2-CLOUD-MS0 (K2 must be transport-callable before cascade calibration probes it).

---

## U-CASCADE-CALIBRATE — Build `CascadeCalibrationEngine` (probe cost-quality frontier)

- pillar: cost
- tier: T1
- ai_priority_score: 80
- leverage_score: 12
- why: cost cascade today is hand-tuned per dispatcher; calibration auto-probes 50 representative prompts across 5 tentacles, fits cost-quality frontier, emits updated `cost-cascade-config.json` per task class
- depends_on: [K2-CLOUD-MS0::K2-K0]
- blocks: [U-CASCADE-FALLBACK-CHAIN]
- parallel_with: [U-MULTI-AGENT-COST-TELEMETRY, U-BUILD-MOA-LAYER2, U-DISPATCHER-ACTION-TWO-PASS]
- viz_node_id: `core.engine.cascadecalibrate` (TBD-create)
- closes_synergy_edge: octopus × cost-model
- loop_schedule: weekly (cron `0 4 * * 2`)

verifies_via:
  channel: test
  tool: `npx vitest run src/__tests__/CascadeCalibrationEngine.test.ts`
  expected_signal: 5/5 cases pass; probe of 50 prompts emits config with non-empty frontier
  re_run_cost: ~5 min real-LLM probe; ~10s with mock LLM in tests
  baseline: no probe engine; cascade hand-tuned

micro_steps:
  - step-1:
      tool: Read
      path: `mcp-server/data/state/cost-cascade-config.json` (if exists, else assume empty)
      action: confirm schema; if missing, define
      verify: schema confirmed or defined
  - step-2:
      tool: Write
      path: `mcp-server/src/engines/CascadeCalibrationEngine.ts`
      action: implement `calibrate({prompts, tentacles, scoreFn})` → returns `{frontier: [{tentacle, expectedCost, expectedQuality}], recommendation}`; persists to `cost-cascade-config.json`
      verify: tsc clean
  - step-3:
      tool: Write
      path: `mcp-server/src/__tests__/CascadeCalibrationEngine.test.ts`
      action: 5 cases (happy frontier, one-tentacle-fails, scoreFn-zero, prompt-too-long, frontier-degenerate)
      verify: 5/5 pass with mock LLM
  - step-4:
      tool: Write
      path: `scripts/calibrate-cascade.mjs`
      action: CLI wrapper; `--probe-set <path>`, `--apply`, `--dry-run`
      verify: dry-run emits frontier without writing config
  - step-5:
      tool: Bash
      path: `H:/prism/`
      action: cron register weekly
      verify: registry contains entry

adversarial_cases:
  - tentacle down mid-probe → mark as `unavailable`, recommend without it
  - scoreFn flips signs (cost positive vs negative reward) → schema-validate at construction
  - all 50 prompts identical → frontier-degenerate, warn caller
  - probe runs > 30min → soft kill, return partial

variability_axis:
  - 1 / 3 / 5 tentacles available
  - 5 / 50 / 500 probe prompts

failure_modes:
  - probe set missing → exit clean with `PROBE_SET_MISSING`
  - config write race → file-claim
  - cost API rate-limit → exponential backoff per tentacle

---

## U-MULTI-AGENT-COST-TELEMETRY — Cost telemetry (per-tentacle, per-task-class)

- pillar: cost
- tier: T1
- ai_priority_score: 75
- leverage_score: 11
- why: cost discipline requires evidence; we record per-call cost in `cost-telemetry.jsonl` keyed by tentacle, task-class, prompt-tokens, completion-tokens, latency; without telemetry, calibration is unfounded
- depends_on: []
- blocks: [U-COST-DASHBOARD, U-COST-ALARM]
- parallel_with: [U-CASCADE-CALIBRATE, U-BUILD-MOA-LAYER2, U-DISPATCHER-ACTION-TWO-PASS]
- viz_node_id: `core.engine.multiagentcosttelemetry` (TBD-create)
- closes_synergy_edge: octopus × telemetry
- loop_schedule: continuous (every call); rotation hourly

verifies_via:
  channel: test
  tool: `npx vitest run src/__tests__/MultiAgentCostTelemetryEngine.test.ts`
  expected_signal: 5/5 cases pass; synthetic 100-call burst produces 100 JSONL lines + correct aggregate
  re_run_cost: 4s
  baseline: cost telemetry is partial in `ollama-offload-stats.json` only

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/src/engines/MultiAgentCostTelemetryEngine.ts`
      action: implement `record({tentacle, taskClass, inputTokens, outputTokens, latencyMs, costUSD})` → append to `mcp-server/data/state/cost-telemetry.jsonl`; `aggregate(windowHours)` returns per-tentacle and per-task-class sums
      verify: tsc clean
  - step-2:
      tool: Write
      path: `mcp-server/src/__tests__/MultiAgentCostTelemetryEngine.test.ts`
      action: 5 cases (happy record, missing fields rejected, rotation at 10MB, concurrent writes, aggregate over empty window)
      verify: 5/5 pass
  - step-3:
      tool: Edit
      path: `mcp-server/src/engines/AISystemRouterEngine.ts`
      action: instrument route-execution to call `record(...)` post-call
      verify: smoke route generates a telemetry line
  - step-4:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/devDispatcher.ts`
      action: register `cost_telemetry_aggregate` action
      verify: round-trip MCP returns aggregate
  - step-5:
      tool: Bash
      path: `H:/prism/`
      action: cron register hourly rotation
      verify: registry contains entry

adversarial_cases:
  - cost field missing for ollama (local, $0) → record `costUSD: 0` explicitly
  - 1000 calls/min burst → bounded buffer, flush every 5s
  - JSONL corruption (interrupted write) → atomic append, defensive read
  - tentacle returns no usage info → record `inputTokens: null` with warning

variability_axis:
  - 0 / 100 / 100000 calls per hour
  - 1 / 3 / 5 tentacles

failure_modes:
  - filesystem full → drop record, log `TELEMETRY_DROPPED`
  - rotation race → file-claim on rotation
  - aggregate over huge file → stream-read

---

## U-BUILD-MOA-LAYER2 — Build `MoaLayer2Engine` (aggregator across 3-of-3 verdicts)

- pillar: cost
- tier: T1
- ai_priority_score: 78
- leverage_score: 12
- why: today's scrutiny-3way returns 3 independent verdicts (Codex + Gemini + Opus); MoA layer-2 (Wang 2406.04692) aggregates them into a single high-confidence verdict, reducing variance + improving signal/noise; foundation for moving from 3-of-3 to 5-of-5
- depends_on: []
- blocks: [U-CASCADE-FALLBACK-CHAIN]
- parallel_with: [U-CASCADE-CALIBRATE, U-MULTI-AGENT-COST-TELEMETRY, U-DISPATCHER-ACTION-TWO-PASS]
- viz_node_id: `core.engine.moalayer2` (TBD-create)
- closes_synergy_edge: scrutiny × moa

verifies_via:
  channel: test
  tool: `npx vitest run src/__tests__/MoaLayer2Engine.test.ts`
  expected_signal: 5/5 cases pass; 3 known verdicts (2 pass / 1 fail) aggregate to PASS with explanation citing dissent
  re_run_cost: 6s
  baseline: scrutiny-3way emits 3 separate marks; no aggregate engine

micro_steps:
  - step-1:
      tool: Read
      path: `.claude/scripts/scrutiny-3way.mjs`
      action: confirm output shape (codex/gemini/opus mark fields)
      verify: shape captured
  - step-2:
      tool: Write
      path: `mcp-server/src/engines/MoaLayer2Engine.ts`
      action: implement `aggregate({marks: [{judge, verdict, rationale, confidence}]})` → returns `{verdict, confidence, dissent_summary}`; weighted by judge calibration table
      verify: tsc clean
  - step-3:
      tool: Write
      path: `mcp-server/src/__tests__/MoaLayer2Engine.test.ts`
      action: 5 cases (3-pass, 2-pass-1-fail, all-fail, judge-missing, malformed-mark)
      verify: 5/5 pass
  - step-4:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/aiDispatcher.ts` (and/or `prism_intelligence`)
      action: register `moa_aggregate` action
      verify: round-trip MCP
  - step-5:
      tool: Edit
      path: `.claude/scripts/scrutiny-3way.mjs`
      action: optional flag `--aggregate` calls into engine to emit single consensus verdict
      verify: synthetic run emits aggregate

adversarial_cases:
  - judge weights all zero → reject construction
  - all judges abstain → return `INSUFFICIENT_QUORUM`
  - calibration table stale (>30 days) → warn caller, still aggregate
  - mark shapes diverge across judges → schema-coerce + warn

variability_axis:
  - 2 / 3 / 5 judges
  - all-agree / split / all-dissent

failure_modes:
  - judge unreachable → exclude with `JUDGE_UNAVAILABLE` note in dissent_summary
  - schema drift → schema-validate per mark
  - confidence below threshold → flag for human review

---

## U-DISPATCHER-ACTION-TWO-PASS — `prism_ai:two_pass` dispatcher action (cheap-then-strong)

- pillar: cost
- tier: T1
- ai_priority_score: 72
- leverage_score: 11
- why: many tasks can be solved by a cheap tentacle on first pass; only escalate to expensive tentacle if quality gate fails; FrugalGPT (Chen 2305.05176) shows 50-98% cost reduction at constant quality
- depends_on: []
- blocks: [U-CASCADE-FALLBACK-CHAIN]
- parallel_with: [U-CASCADE-CALIBRATE, U-MULTI-AGENT-COST-TELEMETRY, U-BUILD-MOA-LAYER2]
- viz_node_id: `core.dispatcher.aitwopass` (TBD-create)
- closes_synergy_edge: cascade × cheap-then-strong

verifies_via:
  channel: e2e
  tool: `mcp-call prism_ai two_pass --prompt "<test>" --quality-threshold 0.7`
  expected_signal: returns `{ pass: "cheap" | "strong", result, costUSD, qualityScore }` with cheap chosen when score ≥ 0.7
  re_run_cost: 3-10s depending on pass
  baseline: dispatcher always routes to one tentacle, no escalation

micro_steps:
  - step-1:
      tool: Read
      path: `mcp-server/src/tools/dispatchers/aiDispatcher.ts`
      action: confirm dispatcher shape
      verify: shape captured
  - step-2:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/aiDispatcher.ts`
      action: register `two_pass` action — first calls cheap tentacle, scores via quality function (LLM-as-judge or rule-based), escalates if below threshold
      verify: dispatcher tsc clean
  - step-3:
      tool: Write
      path: `mcp-server/src/__tests__/aiDispatcher.two_pass.test.ts`
      action: 5 cases (cheap-pass, cheap-fail-strong-pass, both-fail, threshold-edge, missing-quality-fn)
      verify: 5/5 pass
  - step-4:
      tool: Bash
      path: `H:/prism/`
      action: round-trip MCP
      verify: response includes both `pass` and `costUSD`

adversarial_cases:
  - cheap tentacle returns gibberish → escalate
  - judge function unreachable → conservatively escalate (treat as fail)
  - prompt requires reasoning depth → caller can force-strong
  - cost telemetry not registered → still works; record only when available

variability_axis:
  - quality threshold 0.3 / 0.7 / 0.95
  - prompts: simple lookup / mid reasoning / complex

failure_modes:
  - both passes throw → return error envelope with both failure surfaces
  - dispatcher cycle → lazy import handles
  - judge LLM-as-judge cost explodes → use rule-based judge for trivial classes

---

## U-CASCADE-FALLBACK-CHAIN — Fallback chain (cheap → mid → strong with circuit-breaker)

- pillar: cost
- tier: T1
- ai_priority_score: 65
- leverage_score: 10
- why: two-pass is binary; real cascades need 3+ levels with circuit-breaker (skip dead tentacles, expire breaker windows); without it, partial outages cause repeated retry-loops
- depends_on: [U-DISPATCHER-ACTION-TWO-PASS, U-BUILD-MOA-LAYER2, U-CASCADE-CALIBRATE]
- blocks: []
- parallel_with: [U-COST-DASHBOARD, U-COST-ALARM, U-TOKEN-BUDGET-GUARD]
- viz_node_id: `core.engine.cascadefallback` (TBD-create)
- closes_synergy_edge: cascade × resilience

verifies_via:
  channel: test
  tool: `npx vitest run src/__tests__/CascadeFallbackChainEngine.test.ts`
  expected_signal: 5/5 cases pass; chain with synthetic-down mid tier still resolves via strong
  re_run_cost: 8s
  baseline: no chain; ad-hoc retry in callers

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/src/engines/CascadeFallbackChainEngine.ts`
      action: implement `execute({taskClass, prompt})` walking calibrated cascade with circuit-breaker per tentacle (open after N fails, half-open after T minutes); records to cost telemetry
      verify: tsc clean
  - step-2:
      tool: Write
      path: `mcp-server/src/__tests__/CascadeFallbackChainEngine.test.ts`
      action: 5 cases (happy-cheap, mid-down-strong-up, all-down, breaker-open-half-open, calibration-stale)
      verify: 5/5 pass
  - step-3:
      tool: Edit
      path: `mcp-server/src/engines/AISystemRouterEngine.ts`
      action: route invokes chain for task classes flagged `cascadable: true`
      verify: smoke route + telemetry shows cascade transitions
  - step-4:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/aiDispatcher.ts`
      action: register `cascade_status` action returning breaker state
      verify: round-trip MCP

adversarial_cases:
  - all breakers open → return `ALL_BREAKERS_OPEN` + last failure reason
  - breaker flip-flap (1ms close-open) → debounce window
  - cascade contains tentacle not registered → skip + log
  - calibration disagrees with breaker reality → trust breaker

variability_axis:
  - 0 / 1 / N breakers open
  - 2 / 3 / 5 cascade levels

failure_modes:
  - chain throws → telemetry-record + return clean error envelope
  - breaker state corrupted → reset all, log `BREAKER_STATE_RESET`
  - cascade config missing → exit `CALIBRATION_MISSING`

---

## U-COST-DASHBOARD — Cost dashboard (web view of telemetry)

- pillar: cost
- tier: T1
- ai_priority_score: 55
- leverage_score: 9
- why: numbers in JSONL are inert; a 1-page dashboard with charts (per-tentacle USD, per-task-class breakdown, hourly heatmap) makes cost visible enough to manage
- depends_on: [U-MULTI-AGENT-COST-TELEMETRY]
- blocks: []
- parallel_with: [U-CASCADE-FALLBACK-CHAIN, U-COST-ALARM, U-TOKEN-BUDGET-GUARD]
- viz_node_id: `core.web.costdashboard` (TBD-create)
- closes_synergy_edge: cost × visualization

verifies_via:
  channel: e2e
  tool: `curl http://localhost:3100/cost-dashboard` (after server up)
  expected_signal: returns HTML page with non-empty data
  re_run_cost: 1s render
  baseline: no dashboard; aggregate available only via dispatcher

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/web/cost-dashboard.html`
      action: minimal single-page (chart.js or vanilla SVG) — pulls from `/api/cost-aggregate` endpoint
      verify: opens in browser
  - step-2:
      tool: Edit
      path: `mcp-server/src/web/server.ts` (or equivalent web handler)
      action: register `/cost-dashboard` route + `/api/cost-aggregate` JSON endpoint
      verify: server tsc clean; routes respond
  - step-3:
      tool: Write
      path: `mcp-server/src/__tests__/cost-dashboard.test.ts`
      action: 3 cases (empty telemetry, full window, partial tentacle outage)
      verify: 3/3 pass
  - step-4:
      tool: Bash
      path: `H:/prism/`
      action: smoke open dashboard
      verify: charts render

adversarial_cases:
  - 1M JSONL entries → aggregate stream + cache 5-min window
  - chart library CDN down → bundle locally
  - cross-origin call from claude-code IDE → same-origin only, no CORS hole

variability_axis:
  - empty / mid / heavy telemetry
  - 1 / 5 / 50 task classes

failure_modes:
  - aggregator throws → render error banner, dashboard still loads
  - file unreadable → 503 + reason
  - rendering JS errors → server-side fallback HTML with raw counts

---

## U-COST-ALARM — Cost alarm (threshold-based, alert to chat)

- pillar: cost
- tier: T1
- ai_priority_score: 60
- leverage_score: 10
- why: dashboards require eyes-on; alarms fire automatically when daily/weekly USD or token budgets exceed configured thresholds — operator notified before bill arrives
- depends_on: [U-MULTI-AGENT-COST-TELEMETRY]
- blocks: []
- parallel_with: [U-CASCADE-FALLBACK-CHAIN, U-COST-DASHBOARD, U-TOKEN-BUDGET-GUARD]
- viz_node_id: `core.engine.costalarm` (TBD-create)
- closes_synergy_edge: cost × alerting
- loop_schedule: 15min (cron `*/15 * * * *`)

verifies_via:
  channel: e2e
  tool: synthetic telemetry triggering threshold → alarm posts to `state/shared/AGENT_CHAT.md` (or configured channel)
  expected_signal: alarm message appears with exceeded amount + suggested action
  re_run_cost: 2s
  baseline: no alarms; budget excursions discovered post-hoc

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/data/state/cost-alarm-config.json`
      action: define thresholds per task class + daily/weekly window + cool-down period
      verify: valid JSON, default thresholds set
  - step-2:
      tool: Write
      path: `mcp-server/src/engines/CostAlarmEngine.ts`
      action: implement `check()` — aggregates last 24h / 7d, compares vs config, emits alarms to `state/shared/cost-alarm-log.jsonl` + `AGENT_CHAT.md` if cool-down elapsed
      verify: tsc clean
  - step-3:
      tool: Write
      path: `mcp-server/src/__tests__/CostAlarmEngine.test.ts`
      action: 5 cases (below-threshold-no-alarm, above-daily, above-weekly-not-daily, cool-down-suppresses, config-missing)
      verify: 5/5 pass
  - step-4:
      tool: Bash
      path: `H:/prism/`
      action: cron register `*/15 * * * *`
      verify: registry contains entry

adversarial_cases:
  - config thresholds set to 0 → alarm fires every 15min (cool-down still gates)
  - clock skew → use telemetry timestamps not wall-clock
  - alarm channel down → log to JSONL only, retry next tick
  - 1000 alarms in 1h → bound alarm-log size with rotation

variability_axis:
  - $0 / $10 / $1000 daily spend
  - sparse / dense telemetry

failure_modes:
  - aggregator throws → log + skip tick
  - config malformed → use safe defaults + warn
  - file race → file-claim on alarm log

---

## U-TOKEN-BUDGET-GUARD — Token budget guard (pre-call gate)

- pillar: cost
- tier: T1
- ai_priority_score: 60
- leverage_score: 10
- why: alarms detect spend after the fact; a guard hook refuses a call if it would push daily token budget over (configurable per session/task-class). Hard-cap on runaway loops
- depends_on: [U-MULTI-AGENT-COST-TELEMETRY]
- blocks: []
- parallel_with: [U-CASCADE-FALLBACK-CHAIN, U-COST-DASHBOARD, U-COST-ALARM]
- viz_node_id: `core.hook.tokenbudgetguard` (TBD-create)
- closes_synergy_edge: cost × pre-call enforcement

verifies_via:
  channel: e2e
  tool: synthetic session at 95% of daily budget → next large call gets BLOCKED by hook with clear remediation
  expected_signal: PreToolUse hook returns `block` + message naming current/cap
  re_run_cost: 1s per call (cache 30s)
  baseline: no pre-call cap; runaway loops can burn unbounded

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/data/state/token-budget-config.json`
      action: define daily token cap per session + overage policy
      verify: valid JSON
  - step-2:
      tool: Write
      path: `.claude/hooks/token-budget-guard.mjs`
      action: PreToolUse hook for LLM-call tools (Task, mcp__claude-flow__*) — aggregates today's tokens, refuses if next-call estimate exceeds cap (or warns if within 10%)
      verify: hook self-test passes
  - step-3:
      tool: Edit
      path: `.claude/settings.json`
      action: register hook on PreToolUse with appropriate tool matchers
      verify: `verify-hook-refs --self-test` passes
  - step-4:
      tool: Bash
      path: `H:/prism/`
      action: synthetic over-cap test
      verify: hook returns block envelope

adversarial_cases:
  - hook itself slow → cache aggregate for 30s
  - cap set to 0 → no calls allowed (refuse with clear remediation)
  - estimate diverges from actual → use 90th-percentile of last-100 actuals
  - bypass attempt (PRISM_HOOK_PROFILE=off) → guard added to MINIMAL_ALLOWLIST

variability_axis:
  - 0 / 100k / 10M tokens used today
  - cap 50k / 1M / 100M

failure_modes:
  - telemetry unreadable → fail-OPEN (allow call) with `BUDGET_TELEMETRY_UNAVAILABLE` warning (better than blocking work on infra glitch)
  - hook throws → fail-OPEN with warning (above)
  - estimate engine unreachable → fall back to fixed estimate per tool type

---

## Milestone-level autonomous-execution hooks (inherited from AUTONOMOUS-EXECUTION-PROTOCOL.md §7)

- pre-unit: `prism_session:claim_milestone COST-CASCADE-MS0`
- per-unit-pre: `file-claim-guard` + `duplication-hard-block` (especially U-BUILD-MOA-LAYER2 since multiple aggregator candidates exist)
- per-unit-post: `comprehensive-build-enforce`
- per-3-units: auto-compact threshold check
- per-milestone-end: `/handoff` writes `HANDOFF-<id>-COST-CASCADE-MS0.md`

## Variability-axis summary

Each unit covers zero-state, mid-traffic, saturated/spike. Failure-mode addresses unreachable infrastructure, schema drift, concurrent writes. Token-budget guard explicitly fail-OPEN (favoring availability over false-positive blocks) — opposite stance to scrutiny gate (which fails closed).

## Failure-mode summary

Three classes shared across the 8 units:
1. Telemetry unavailable → fail-open with warning (do not block work)
2. Schema drift between LLM providers → adapter at edges
3. Concurrent writes (telemetry, alarm-log, config) → file-claim + atomic-append

## Lane ownership + commit format

- Lane: lane-C-octopus-cost
- Commit format: `[lane-C-octopus-cost][COST-CASCADE-MS0]/<U-id>: <title>`
- Worktree (if forked): `H:/prism-cost-cascade/` (branch `work/cost-cascade-ms0`)

## Next milestone in lane

OCTOPUS-NEURAL-MS0 (already atomized in Round-1; lane-C continues there).
