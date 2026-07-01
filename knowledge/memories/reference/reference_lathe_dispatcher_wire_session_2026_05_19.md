---
name: reference-lathe-dispatcher-wire-session-2026-05-19
description: 2026-05-19 kilo — 8-unit BACKEND-DEV-LOOP session wiring the JM Die lathe-upgrade engine surface to the turning-dispatcher (19 new MCP-callable actions across 8 unwired engines)
aliases: reference_lathe_dispatcher_wire_session_2026_05_19
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.637Z
---


2026-05-19, slot kilo (claude-c0eb54b9), `/checkin-kilo /goal start upgrading the existing lathe programs in the jm die ecosystem ... /loop [5m] /goal`. Session shipped 8 backend-dev wire-up units in sequence, exposing 19 previously-unreachable lathe-engine methods as MCP-callable dispatcher actions on `prism_cam` (turning-dispatcher). Each unit followed the same R11 sibling pattern: ACTIONS enum + Zod schema with `.passthrough()` + `.describe()` per field + lazy import inside switch case + action-name-prefixed type-guard throws (R12) + wire-gate test with anti-regression source-grep and negative-sibling guards.

**Shipped units** (all via pathspec commits; some absorbed peer FEATURE-GAP-AUDIT-MS0 hunks per [[reference_cross_chat_commit_misattribution_2026_05_18]]):

| # | Unit | Engine (LOC) | New actions | Commit | Tests |
|---|------|--------------|-------------|--------|-------|
| 1 | [[reference_u_lathe_prog_opt_wire_2026_05_18|U-LATHE-PROG-OPT-WIRE]] | LatheProgramOptimizerEngine (1512) | `lathe_program_optimize` + `lathe_program_estimate` | `1a9c3374e6` | 17/17 |
| 2 | U-WIRE-LATHE-BIRDNEST | LatheBirdNestPredictorEngine (291) | `lathe_bird_nest_predict` + `lathe_bird_nest_stats` | (commit in main) | 16/16 |
| 3 | U-WIRE-LATHE-PARTING-CLEAR | LathePartingChipClearanceEngine (194) | `lathe_parting_clearance_evaluate` + `lathe_parting_clearance_stats` | `fb6748796a` | 16/16 |
| 4 | U-WIRE-LATHE-PART-COST | LathePartCostModelEngine (185) | `lathe_part_cost_compute` + `lathe_part_cost_stats` | (commit in main) | 19/19 |
| 5 | U-WIRE-LATHE-SUBSPINDLE-PURGE | LatheSubSpindleTransferPurgeEngine (267) | `lathe_subspindle_purge_plan` + `lathe_subspindle_purge_stats` | (commit in main) | 16/16 |
| 6 | U-WIRE-LATHE-OP-TIME-BREAKDOWN | LatheOpTimeBreakdownEngine (257) | `lathe_op_time_compute` + `lathe_op_time_aggregate` + `lathe_op_time_stats` | `07e9a3be77` | 15/15 |
| 7 | U-WIRE-LATHE-REPLAY-FRAME | LatheReplayFrameCompilerEngine (138) | `lathe_replay_frame_compile` + `lathe_replay_frame_stats` | (commit in main) | 17/17 |
| 8 | U-WIRE-LATHE-PART-CLASSIFIER | LathePartClassifierEngine (447) | `lathe_part_classify` + `lathe_part_classify_batch` + `lathe_part_family_profile` + `lathe_part_family_list` | (commit in main) | 17/17 |

**Closing the user-facing directive at the platform layer**: with 8 engines wired, any chat/skill/external MCP client can now invoke the full lathe-upgrade pipeline against a JM Die `.min`/`.MIN`/`.PRG` lathe program: classify the part → estimate upgrade gain → optimize program → predict bird's-nest chip-wrap risk → evaluate parting chip-clearance → compute 7-bucket per-part cost → plan sub-spindle transfer purge → break down op-time bottlenecks → compile a front-end replay frame stream. Pre-wire all 8 engines were built+tested but unreachable beyond direct engine-API calls in TypeScript.

**Why** (R8 dedup discipline): the user's directive triggered an R8 dedup-preflight search before any code was written. Found 13 lathe-program engines already built — `LatheProgramOptimizerEngine` exactly matched the user request ("transform amateur lathe programs into production-ready code" — its own docstring). Building a parallel parser+upgrader would have been ~1500 LOC of redundant code. Saved by R8.

**Recurring lessons codified this session:**

1. **Engine-method test-shape gotcha (R9):** the engine's `getFamilyProfile` returns `FamilyProfile & { family }` — fields `workholding`/`roughing`/`sequence`/`thermal`. Distinct from `ClassificationResult` (fields `workholding_default`/`roughing_cycle`/`sequence_template`/`thermal_approach`). Reading the engine's actual interface declaration before writing the test would have caught it; instead 1 test failed and was fixed in-loop. R12 doctrine: "fix the test, not the code" — never weaken the assertion.

2. **Empirical-formula test-fixture miscalculation (U-WIRE-LATHE-PARTING-CLEAR):** the engine's coolant-jet-reach formula `Lj = 40 × sqrt(P_bar) × d_nozzle × reachFactor` is generous — 5bar × 2.5mm × 0.4 = 89mm, NOT inadequate for a 25mm slot. The first test fixture wrongly assumed inadequacy; FIX was strengthening the fixture (1bar × 1mm = 16mm jet on 50mm slot), NOT changing the engine. R12 reinforced.

3. **Slice-window-too-small bug class:** the next-case-aware slice (`indexOf('case "', startIdx + label.length)`) is more robust than a fixed-width window — adding a single new type-guard line in the dispatcher case shouldn't break the routing assertion.

4. **Schema enum drift checks** (R9 — verify intent): every wire-gate test compares Zod enum lists byte-identical against the engine type literals. Across 19 actions and ~30 enum overlaps in this session, zero drift detected. The negative-sibling routing guard (`expect block contains correct method AND does NOT contain sibling-method-name`) caught zero copy-paste-to-wrong-method bugs — because the pattern is now reflex.

5. **Cross-chat commit absorption is a class, not an incident.** This session's pathspec commits picked up peer FEATURE-GAP-AUDIT-MS0 working-tree hunks (`live_tool_plan` + `lathe_tribal_*`) on the very first commit. The slot-worktree migration ([[reference_slot_worktree_activation_2026_05_16]]) is the structural fix; not done this session.

**Related**: [[reference_u_lathe_prog_opt_wire_2026_05_18]] (the iter-1 detail memory) · [[feedback_box_programs_amateur]] (original directive that produced LatheProgramOptimizerEngine) · [[feedback_prioritize_devtools_backend]] (this whole session is devtools/backend work — the standing rule) · [[feedback_autonomous_loop_drift_discipline]] (capped the failed demo-driver investigation to 1 iter before pivoting).
