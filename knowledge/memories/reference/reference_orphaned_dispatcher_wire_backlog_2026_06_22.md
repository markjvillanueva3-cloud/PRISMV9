---
name: reference_orphaned_dispatcher_wire_backlog_2026_06_22
description: "ORPHANED-DISPATCHER-WIRE backlog (slot:india /loop 2026-06-22). A new high-ROI theme beyond the now-exhausted open-learning-loops: INTERRUPTED wire units where an UNTRACKED *.test.ts under mcp-server/src/__tests__/ was written (full contract) but the dispatcher impl never landed -> the test FAILS, blocking the fleet's stop_on_failing_tests. 3 CLOSED this session (SFC-RAG-WARMSTART, RAG-PSN-OS, WIRE-BACKLOG-TRIBAL); >=4 more VERIFIED-failing remain + ~89 untracked mcp-server tests to triage. Pattern to close each: read the orphaned test contract -> verify the engine + methods EXIST (R8) -> wire enum+case+schema cloning the proven sister -> 20/20 green + tsc clean -> git add the untracked test + commit via pathspec. All 3 closed were clean read-only wires of existing engines (no new engine code)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.688Z
aliases: reference_orphaned_dispatcher_wire_backlog_2026_06_22
---


# Orphaned dispatcher-wire backlog (india /loop 2026-06-22)

**The theme:** the open-learning-loops theme is exhausted for india-solo (see
[[reference_india_open_loops_rescan_2026_06_22]]). The NEXT high-ROI vein is
**orphaned dispatcher wires** -- an UNTRACKED `*.test.ts` under
`mcp-server/src/__tests__/` was committed-as-written by some slot, specifying the
full wire contract (enum + actions + result shapes), but the dispatcher impl never
landed on the `cad-fusion-live-ms0` tree (terminal churn / interrupted unit). The
test FAILS -> blocks the fleet `stop_on_failing_tests`. Each is a clean read-only
wire of an ALREADY-BUILT engine.

## How to find them
```
git -C H:/prism status --short | grep -E '^\?\?.*mcp-server/src/__tests__/.*\.test\.ts$'   # 89 untracked
# then batch-run a filtered subset (e.g. *Wire/*Dispatcher names) to find the FAILING (orphaned) ones:
cd mcp-server && rtk npx vitest run <files...> 2>&1 | grep -E 'Tests |failed'
```
~89 untracked mcp-server test files total; most are peer in-flight (PASS) -- only the
FAILING ones are orphaned wires. Do NOT sweep-commit passing ones (peer lane).

## CLOSED this session (slot:india, all read-only wires, eval-gated 100% + tsc clean)
| commit | unit | wire |
|---|---|---|
| `b92ab4a334` | U-SFC-RAG-WARMSTART-WIRE | sfc_rag_warmstart{,_stats} -> prism_calc (SFCRAGWarmStartEngine, JM Die corpus visibility). Also fixed 2 wrong test premises (disk-loaded index; slimResponse omits empty arrays). |
| `24805e912a` | U-RAG-PSN-OS-WIRE | rag_rerank -> prism_operating_system (3rd surface; clone of prism_ai/prism_ml sister). |
| `fb3012f003` | U-WIRE-BACKLOG-TRIBAL | 7 playbook_rules_* -> prism_knowledge (PlaybookRulesEngine, 133KB/500+ rules -- largest single unwired engine). |

## REMAINING verified-failing orphaned wires (triage each with R8 before building)
- `sessionDispatcher.slot-session-history-wire.test.ts` (4/4 fail) -- romeo's
  [WIRING]/U-WIRE-SLOT-SESSION-HISTORY: `slot_session_history_read` -> prism_session
  (SlotSessionHistoryEngine, GENUINE_ORPHAN per classify-engine-reachability.mjs).
  CLEAN single read action; test uses a real temp fixture under state/shared. NEXT.
- `turningCostEstimate.dispatcher.test.ts` (22/22 fail) -- lathe/quoting (whiskey/charlie domain). Larger; verify engine methods exist.
- `operator-gate-dispatcher.test.ts` (15/15 fail) -- prism_safety:operator_gate_* (safety domain; R12 fail-loud throws expected). Verify OperatorGate engine.
- `devDispatcher.formula-harvest-wire.test.ts` (2/4 fail) -- formula-harvest "REAL disk parse" -- 2 pass, so PARTIAL; the 2 fails may be ENV/data (disk parse of 3 JS files), not a wiring gap. Assess before building.
- (+ re-scan the full 89 untracked list with broader name filters -- the Wire/Dispatcher filter caught these; engine-named ones like CohortBridgeShimEngine/GCodeMaterialParserEngine/etc. may also be orphaned.)

## The closing recipe (proven 3x this session)
1. Read the orphaned test END-TO-END -- it IS the contract (result shapes, error formats, slimResponse-elision notes).
2. R8: `ls` the engine + grep its methods -- confirm EVERY method the test needs EXISTS (scouts/tests over-promise; PlaybookRules HAD all 7, but verify).
3. Find the proven SISTER wire if it's a clone (rag_rerank: prism_ml/prism_ai).
4. Wire: enum entry + case (`result = ...; break` or `return slimResponse(...)` per the dispatcher's convention) + permissive/strict schema in the `<domain>ActionSchemas.ts` map.
   - Dispatcher error contract: `validateActionParams` fail -> `dispatcherError("Invalid params for '<action>': ...")` -> blob contains "invalid" (covers min(1) too).
   - `slimResponse` (responseSlimmer.ts:42-43) ELIDES null + undefined + empty arrays -> tests assert "array-or-omitted".
5. Eval gate: full test file green + `tsc --noEmit` clean.
6. `git add <untracked test>` then `git commit -F msg -- <paths>` (pathspec; untracked test must be explicitly added).

Sibling: [[reference_india_open_loops_rescan_2026_06_22]] · [[reference_open_learning_loops_backlog_2026_06_22]].
