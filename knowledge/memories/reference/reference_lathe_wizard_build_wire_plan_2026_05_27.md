---
name: reference-lathe-wizard-build-wire-plan-2026-05-27
description: Comprehensive deep-dive (4 parallel Explore agents) of lathe wizard build/wire gaps. Identifies 5 critical print-to-program gaps + 5 closed-loop training gaps. Defines execution order keyed to canonical 12-stage lathe operation pipeline. Built per operator directive 2026-05-27.
type: reference
slot: whiskey
source: prism-memory
synced: 2026-06-09T14:54:09.193Z
aliases: reference_lathe_wizard_build_wire_plan_2026_05_27
---


# Lathe Wizard — Build/Wire Execution Plan

## Print-to-program canonical pipeline (12 stages, real-data verified)

| # | Stage | G-code | Engine (exists?) | Wired? |
|---|-------|--------|------------------|--------|
| 1 | Face | G50/G96 | `LatheSequenceOptimizerEngine` | YES |
| 2 | Center drill | G97 | `LatheSequenceOptimizerEngine` | YES |
| 3 | Rough OD | G85/G71 | `LathePrintSequencePlannerEngine` | NO (no dispatcher action) |
| 4 | Semi-finish OD | G87 | `OperationSequencerEngine` | YES |
| 5 | Finish OD | G87/G70 | `LatheSequenceOptimizerEngine` | YES |
| 6 | Grooves | G1 | `LathePrintSequencePlannerEngine` | NO |
| 7 | Thread external | G76 | `LatheSequenceOptimizerEngine` | YES |
| 8 | Peck drill | G74 | `LathePrintSequencePlannerEngine` | NO |
| 9 | Bore/Ream | G1 | `LathePrintSequencePlannerEngine` | NO |
| 10 | Tap/Ream | G97 | `LathePrintSequencePlannerEngine` | NO |
| 11 | Chamfer/Knurl | G1+A-axis | `LatheSequenceOptimizerEngine` | YES |
| 12 | Part-off | G96 low SFM | `LatheSequenceOptimizerEngine` | YES (always LAST) |

Source: `LatheSequenceOptimizerEngine` PRIORITY_TIER + `LathePrintSequencePlannerEngine` PRECEDENCE_RULES + real ALCOA/132A04-0018-27.nc NAT01-NAT11 sequence.

## Critical gaps (in execution priority)

### Gap 1: No end-to-end orchestrator (HIGH IMPACT)

`TurningPrintToProgramEngine` exists at `mcp-server/src/engines/TurningPrintToProgramEngine.ts` but does NOT auto-chain upstream stages. Wizard must call 5+ actions separately.

**Fix**: Add `turning_wizard_full_pipeline` action to `turningProgramDispatcher.ts`. Chain: blueprint intake → CAD import → feature taxonomy → material parse → machine select → setup select → sequence plan → tool select → speed/feed calc → toolpath gen → post-process → safety gate → file emit.

**Effort**: ~150 lines (dispatcher case + chained engine invocations + integration test)

### Gap 2: Machine selection unwired

`MonolithMachineSpecStandardEngine` knows Okuma LTH-01..07 specs but is never invoked in pipeline. Programs default to "generic-lathe", potentially requesting operations the chosen machine can't perform.

**Fix**: Add `turning_machine_select` action. Wire into Gap 1 orchestrator before feature→op mapping.

**Effort**: ~80 lines

### Gap 3: Operation sequencing not gated

`LathePrintSequencePlannerEngine` generates the 12-stage sequence but no dispatcher action exposes it; no validation that sequence respects turret slot count.

**Fix**: Add `turning_sequence_plan` action with `validate: { turret_slots, tool_count }` check.

**Effort**: ~60 lines

### Gap 4: Workholding setup unwired

`LathePrintSetupSelectionEngine` chooses chuck/collet/centers but unreachable from `turningProgramDispatcher`. Force engines wired but setup TYPE selection isn't.

**Fix**: Add `turning_setup_select` action; wire result to existing force engines.

**Effort**: ~60 lines

### Gap 5: No S(x) safety gate before file emit

Generated programs not gated by S(x)≥0.70 threshold. Collision/thrust/speed checks run advisory only.

**Fix**: Mandatory `S(x) ≥ 0.70` gate before output emit; generate `HOLD_FOR_REVIEW` marker on failure with `risk_factors` JSON.

**Effort**: ~80 lines

### Gap 6: No file I/O dispatcher

`TurningPrintToProgramEngine.calculate()` returns program_text string only; no audit trail.

**Fix**: Add `turning_program_emit` action with `{ program_text, machine_id, customer, part_num, S_x_score, approval_state }` → writes to `state/shared/generated-programs/<customer>/<part>.nc` + audit log.

**Effort**: ~70 lines

## Closed-loop training gaps (5 changes, ~360 lines)

### CL-1: MCP override submission action (~60 lines)

`PPGSFCClosedLoopOrchestratorEngine` has `injectOverrideHistory()` for tests but no MCP action for shop-floor operators.

**Fix**: Add `submit_sfm_override` action to `mlDispatcher.ts` (or `aiReasoningDispatcher.ts`). Schema: `{ lineage_id, recommended_sfm, actual_sfm, override_factor, reason }`.

### CL-2: Adapter persistence (~80 lines)

`adapterRegistry` and `overrideHistory` are in-memory Maps. Lost on restart.

**Fix**: Create `AdapterPersistenceEngine.ts` with `load()`/`save()` to `data/state/lora-adapter-registry.json` + override-history.jsonl. Wire to PersistenceBridge.

### CL-3: Auto-trigger LoRA training (~40 lines)

Phase 4 orchestrator creates metadata but never calls `continualLoRAEngine.train()`.

**Fix**: When threshold≥30, orchestrator invokes `mlDispatcher` action `continual_lora_train` with override history as experiences.

### CL-4: Real Brier oracle for shadow mode (~150 lines)

Phase 5 currently simulates outcomes with `Math.random()`. Need real cut-outcome events.

**Fix**: Create `LatheOutcomeOracleEngine.ts` capturing tool-life/surface-finish/cycle-time deltas. Query via new `submit_cut_outcome` MCP action.

### CL-5: Configurable promotion threshold (~30 lines)

Phase 6 promotes any `improvement > 0`. No quality bar.

**Fix**: Read `brier_improvement_threshold` from config (default 0.01 = 1% improvement min).

## Execution order

1. **CL-1 (~60 lines)**: operator override capture → kickoff closed-loop data accumulation
2. **CL-2 (~80 lines)**: adapter persistence → no data lost between restarts
3. **Gap 1 (~150 lines)**: end-to-end orchestrator → unblocks full pipeline test
4. **Gap 5 (~80 lines)**: S(x) safety gate → no unsafe programs reach shop floor
5. **Gap 2 (~80 lines)**: machine selection → no capability mismatches
6. **Gap 3-4 (~120 lines)**: sequence plan + setup select wiring
7. **Gap 6 (~70 lines)**: file I/O with audit
8. **CL-3 (~40 lines)**: auto-trigger LoRA on threshold
9. **CL-4 (~150 lines)**: real Brier oracle (needs cut-outcome MCP action)
10. **CL-5 (~30 lines)**: promotion threshold config

Total: ~860 lines real production code across 10 ships.

## Closed-loop activation gate

Closed-loop CAN START after CL-1 + CL-2 + CL-3 (~180 lines). At that point:
- Operators can submit overrides via MCP
- Overrides persist to disk
- LoRA training auto-triggers at 30-experience threshold

What it WON'T do until CL-4+CL-5 ship: produce reliable shadow-mode validation. Adapters will train but promotion will be unreliable until real cut outcomes feed in.

## Related

- `[[reference_wizard_closed_loop_training_paths_2026_05_27]]` — iter302/303 4-path roadmap
- `[[reference_iter218_alcoa_outlier_retraction_2026_05_27]]` — R12 retraction
- `[[reference_whiskey_lathe_complete_asset_map_2026_05_27]]` — full asset atlas
- `[[reference_jm_die_v2_upgrade_pattern_2026_05_27]]` — v2.0.0 patterns
- `mcp-server/src/engines/PPGSFCClosedLoopOrchestratorEngine.ts` — closed-loop framework
- `mcp-server/src/engines/TurningPrintToProgramEngine.ts` — print-to-program orchestrator (needs upstream chaining)
- `mcp-server/src/engines/LathePrintSequencePlannerEngine.ts` — operation precedence rules
