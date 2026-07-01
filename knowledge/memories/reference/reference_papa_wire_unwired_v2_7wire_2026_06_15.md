---
name: reference_papa_wire_unwired_v2_7wire_2026_06_15
description: "papa WIRE-UNWIRED-PAPA v2 (2026-06-15, session claude-2ac3eecf): 7 dispatcher-unwired engines wired this session (prism_dev x5, prism_calc x2), all dual-PASS scrutiny + tsc-0-new. Captures the reusable dispatcher-wire recipe + operational discoveries (tight-retry commit for the index.lock storm, diff-verify-before-add, slim-survivor test discipline, 16GB-heap tsc, 638 pre-existing baseline)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.725Z
aliases: reference_papa_wire_unwired_v2_7wire_2026_06_15
---


# papa WIRE-UNWIRED-PAPA v2 -- 7-wire session (2026-06-15, slot:papa)

Continued the cross-galaxy WIRE-UNWIRED loop ([[feedback_papa_cross_galaxy_work_commit_to_their_worktrees]]).
Wired 7 of the 11 CLEAN engines from `state/shared/specs/PAPA-WIRE-UNWIRED-WORKLIST-2026-06-15.md`,
each commit `[MAIN-FORCE] [WIRE-UNWIRED-PAPA]/U-WIRE-<NAME>` to the shared tree (cad-fusion-live-ms0),
all 2-of-2 per-file scrutiny PASS, all tsc-0-new-from-my-symbols, all round-trip-through-dispatcher tested.

## Wired (7)
| Engine | Action(s) | Dispatcher | Commit | Tests |
|---|---|---|---|---|
| CohortBridgeShimEngine | cohort_shim_nodenext_suffix/_rewrite_imports/_build_shape_coerce/_recommend_bridges | prism_dev | d35e85d8ed | 22 |
| HzpDashAuditEngine | hzp_audit_build/_to_jsonl/_render_line | prism_dev | 7b784ba8a0 | 15 |
| UnifiedProgramParserEngine | program_parse_content | prism_dev | e2af8b8d3c | 10 |
| MillProgramCorpusEngine | mill_corpus_stats | prism_dev | d51ad52e6d | 7 |
| DesignToFloorPipelineEngine | d2f_preflight/_job_count/_calibration_state | prism_dev | a118efaf1d | 11 |
| MOEAStoppingCriterion | moea_stopping_evaluate | prism_calc | e70bffb7af | 12 |
| SpeedFeedPSNDecisionPriorEngine | sfc_psn_decision_prior | prism_calc | ef8ebf72aa | 8 |

## Remaining 4 (handed to durable cron b2c54f1f + handoff)
- SlotSessionHistoryEngine -> prism_session (golf; read methods getAllSlotsState/getLatestForSlot/getHistoryForSlot; record* excluded)
- CoolantStrategyAdapter / EntryExitStrategyAdapter / IntelligentSequencingAdapter -> prism_cam (kilo; selectXxxOrchestrated(req); **commit to slot/kilo worktree**, shared-tree [MAIN-FORCE] fallback)

## Reusable dispatcher-wire recipe (devDispatcher / calcDispatcher pattern -- proven 7x)
1. **dup-check ALL branches**: `git -C /h/prism log --all --oneline | grep -i <engine>` + `grep -rl <engine> mcp-server/src/tools/dispatchers/`. A peer who built it on a slot branch but didn't wire it = clear; a peer who WIRED it = skip.
2. **3 edits**: add the action string to the `ACTIONS as const` array; add a Zod entry to `ACTION_<X>_SCHEMAS`; add a `case "<action>": { const { engine } = await import("../../engines/<E>.js"); result = engine.method(params.<f> as ...); break; }` before `default:`. Result auto-wrapped by `slimResponse`; errors -> `dispatcherError` (top-level success:false). Sub-schemas (`const _xxx = z.object(...).passthrough()`) declared before the map; MIRROR engine schemas, don't import (engine re-validates).
3. **stateful engines** (MOEA): build a FRESH instance per call (no module singleton) and feed the whole input SEQUENCE in one call -- stateless boundary.
4. **test** = MockMCPServer + a `call()` helper (find tool by name; classify error shapes) + engine-direct reference values + LIVE round-trip + schema-rejection + fail-loud. Assert slimResponse **survivors** only.

## Operational discoveries (load-bearing)
- **slimResponse strips null/undefined/empty-array; KEEPS false/0/""** (a reviewer myth that "false is stripped" was corrected mid-session). Round-trip assertions must target survivors; null-default checks go in engine-direct (bypass slim).
- **tsc**: raw `npx tsc --noEmit` OOMs at the 4GB default -> ALWAYS `NODE_OPTIONS=--max-old-space-size=16384`. Baseline is **638 pre-existing stale-branch errors**; "0 new" = grep the log for YOUR symbols (empty) + total unchanged. Some engines carry their OWN pre-existing errors (UnifiedProgramParserEngine L1206/1226/1240 'probe' OperationType gap -> echo/india) -- not mine, flagged not fixed (lane discipline).
- **index.lock storm**: the shared tree runs ~10 concurrent git procs -> `git commit` fails on a held lock. A 5s poll MISSES the free windows; a **tight-retry** `for i in $(seq 1 60); do git add ...&& git commit ...&& break; sleep 2; done` catches one (succeeded attempt 1 every time). NEVER delete an active peer's index.lock (only stale >5min crashed-proc locks).
- **diff-verify before `git add`**: a shared dispatcher file may already be `M` from a peer; `git add <file>` would sweep their hunks ([[reference_git_add_sweeps_pretracked_changes_2026_06_08]]). Before staging: `git diff <file> | grep '^+' | grep -v <my-symbols>` must be empty.
- **ascii-guard** blocks non-ASCII in code (em-dash -> `--`); and a `*/` INSIDE a block comment (e.g. "record*/submit*") prematurely closes it -> parse error. Avoid both.
- **per-file test-legitimacy gate** rejects `typeof x === "number"` presence-only asserts -> replace with engine-output-equality (`r.data.X === direct.X`) for a faithful-wire proof.

Related: [[feedback_papa_cross_galaxy_work_commit_to_their_worktrees]] · [[feedback_papa_no_gates_full_pathways]] · [[reference_papa_wire_unwired_loki_tenant_sbom_2026_06_13]] · [[reference_git_add_sweeps_pretracked_changes_2026_06_08]] · [[reference_system_viz_fs_coverage_layer_absent_2026_06_15]].
