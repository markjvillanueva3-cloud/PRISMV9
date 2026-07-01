---
name: reference-psn-outcome-wire-2026-05-22
description: PSN-SYNERGY/U-OUTCOME-WIRE — 8 dormant Outcome engines wired into new prism_outcome dispatcher (0% to 100% domain coverage)
aliases: reference_psn_outcome_wire_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.133Z
---


# PSN-SYNERGY / U-OUTCOME-WIRE — 8 dormant Outcome engines wired

**Shipped:** 2026-05-22 slot oscar (claude-c5942427), commit `0fd90359de` on `cad-fusion-live-ms0`. `/checkin-oscar /goal synergize PSN ... /loop` autonomous run, iter 3 of target 12.

## What

The **Outcome domain** was PRISM's highest-ROI dormant cluster per AWARENESS-SNAPSHOT: 8 engines on disk, **0 dispatcher coverage (0%)**. They form the closed-loop learning backbone — without dispatcher entry, the entire feedback loop from job outcomes back into RL/calibration/episodic-memory was unreachable from MCP.

Wired all 8 to new `prism_outcome` dispatcher + cross-wired the 4 most-consumed actions into `aiReasoningDispatcher` per CLAUDE.md §ENGINE WIRING — WIRE TO ALL SOURCES.

## Engines wired (8/8)

| Engine | Action group | Count |
|--------|--------------|-------|
| OutcomeCaptureBusEngine | `capture_bus_*` | 4 |
| OutcomeTrackingEngine | `outcome_log/query/for_program/stats` | 4 |
| OutcomeTraceEngine | `outcome_trace_record` | 1 |
| OutcomePublishAdapterEngine | `outcome_publish*`, `outcome_update`, `outcome_adapter_stats` | 6 |
| OutcomeReplayBufferBridgeEngine | `replay_*` | 7 |
| OutcomeRLBridgeEngine | `rl_bridge_*` | 8 |
| OutcomeDriftCalibrationBridgeEngine | `drift_*` | 5 |
| OutcomeEpisodicMemoryBridgeEngine | `episodic_*` | 5 |

40 actions total. Cross-wires into `prism_ai`: `outcome_trace_record`, `outcome_log`, `outcome_query`, `outcome_stats`.

## Why

Coverage uplift identified via the AWARENESS-SNAPSHOT §COVERAGE-BY-DOMAIN table — Outcome was the only domain at 0% wired, making it the maximum-leverage unwiring to close. The closed-loop learning system was on disk but invisible to dispatcher consumers, so every "we should log this outcome" call site had nowhere to route. Wiring this single domain restores the data flow into the existing RL/drift/calibration consumers.

## How to apply (next-time)

When the work order is "synergize / find dormant high-ROI nodes / wire / improve utilization", the canonical pipeline is:

1. Read `state/shared/BUILD_STATE.json` `.COVERAGE_BY_DOMAIN.rows[]` — find rows where `coverage_pct == 0` (or lowest non-trivial). These are dormant high-ROI clusters.
2. Confirm with `state/shared/AWARENESS-SNAPSHOT.md` §Largest unwired backlog.
3. Inspect engines via `ls mcp-server/src/engines/<Domain>*.ts` + check singleton exports via Grep.
4. Delegate the actual dispatcher wiring to the `dispatcher-wirer` subagent (purpose-built — z.enum, schemas, lazy imports, real-value tests). Brief it with: engine list, public method signatures, the new dispatcher path, AND the cross-wire instruction for the closest aiReasoning/prism_ai consumer per §WIRE TO ALL SOURCES.
5. Verify independently — never trust agent-reported test counts; re-run `npx vitest run` and `npx tsc --noEmit` and grep the TS errors specifically for the new files. The agent's cross-wire missed adding new actions to the `AIAction` union — TS catches it instantly.
6. Commit with pathspec scope (`git commit -m ... -- <only-my-files>`) on the shared `H:/prism` tree to avoid sweeping peer staging.

## Pitfalls hit this run

- The agent (dispatcher-wirer) emitted early `return` statements in `aiReasoningDispatcher` for the 4 cross-wire actions — but the canonical pattern there is `result = ...; break;` followed by the unified `return { success: true, data: slimResponse(result) }` at the bottom. The TS errors were `TS2741 'success' missing in type` (literal evidence of the contract mismatch) + `TS2678 Type "outcome_*" is not comparable to type 'AIAction'` (the action wasn't in the union). Fix: extend `ALL_AI_ACTIONS` + `ALL_AI_SCHEMAS` + union type with a 3rd group, AND convert returns to `result = ...; break;`.
- Pre-existing tech-debt: `CAMLoRAAdapterTrainerEngine` + `CrossProcessOutcomeStore` reference different `OutcomeRequestSummary` / `OutcomeCategoricalFeatures` types missing an index signature — 5 unrelated TS errors that look like they'd be in scope. They aren't. Verify by `git diff --stat HEAD -- <path>` returning empty.

## Refs

- Commit: `0fd90359de` on `cad-fusion-live-ms0`
- Dispatcher: `mcp-server/src/tools/dispatchers/outcomeDispatcher.ts` (NEW)
- Schemas: `mcp-server/src/schemas/outcomeActionSchemas.ts` (NEW)
- Tests: `mcp-server/src/__tests__/outcomeDispatcher.test.ts` (NEW, 40 cases)
- Cross-wire: `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts` (+4 cases)
- Registration: `mcp-server/src/index.ts`
- Related doctrine: [[feedback_high_roi_backend_first_slot_queue]] · CLAUDE.md §ENGINE WIRING — WIRE TO ALL SOURCES · CLAUDE.md §MASTER INDEX + [[reference_awareness_stack|AWARENESS STACK]]

## Next candidates (same playbook)

From AWARENESS-SNAPSHOT after this commit:
- **Outcome**: 0/8 → **8/8 (100%)** ✅
- Shop: 8/16 (50%) — 8 unwired, next-highest absolute gap with non-trivial baseline
- Process: 3/10 (30%) — 7 unwired
- Multi: 20/29 (69%) — 9 unwired
- Machine: 33/45 (73%) — 12 unwired

A future `/checkin-oscar /loop` continuation should pick **Shop** (one of the 8 dormant domains with the lowest absolute wired count alongside Outcome — same playbook applies).
