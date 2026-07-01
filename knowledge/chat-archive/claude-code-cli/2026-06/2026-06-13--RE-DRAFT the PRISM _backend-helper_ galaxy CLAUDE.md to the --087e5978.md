---
type: "chat-session"
source: "claude-code-cli"
session_id: "087e5978-f3ed-4657-820e-aed49ae8aa0d"
title: "RE-DRAFT the PRISM \"backend-helper\" galaxy CLAUDE.md to the locked template. The"
date: "2026-06-13"
first_ts: "2026-06-13T22:37:48.815Z"
last_ts: "2026-06-13T22:44:15.267Z"
cwd: "H:\\PRISM"
messages: 68
user_msgs: 27
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_3d0967eb-63a/agent-a74709d661a2f9cbf.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# RE-DRAFT the PRISM "backend-helper" galaxy CLAUDE.md to the locked template. The

> **claude-code-cli** | 2026-06-13 | 68 msgs (27 user / 41 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_3d0967eb-63a/agent-a74709d661a2f9cbf.jsonl`

## Transcript

### User | 2026-06-13T22:37:48.815Z

RE-DRAFT the PRISM "backend-helper" galaxy CLAUDE.md to the locked template. The first-pass draft of THIS galaxy FAILED adversarial verify -- almost always FABRICATION (a named engine / dispatcher action / file path / hook that does NOT exist on disk). The galaxies that failed are exactly the ones the Phase-A assessment flagged for fabricated symbols in their CURRENT files (e.g. cam's cam-vendor-matrix.ts, backend-helper's outcome-bus-auto-tap.mjs, blueprint-vision's 21 phantom CAD*Engine names). DO NOT repeat that.

READ (absolute paths):
1. Template: H:/prism/state/shared/slot-claude-md-assessment/_TEMPLATE.md (14-section skeleton + rules).
2. Assessment for backend-helper: H:/prism/state/shared/slot-claude-md-assessment/backend-helper.md (KEEP/DROP/ADD -- your spec; it already lists which CURRENT-file symbols are FABRICATED -- DROP those).
3. Current file: H:/prism/mcp-server/src/engines/backend-helper/CLAUDE.md.

ABSOLUTE RULES (the FAIL was caused by breaking these):
- VERIFY EVERY SYMBOL ON DISK BEFORE WRITING IT. For each engine: Glob H:/prism/mcp-server/src/engines/backend-helper/*.ts (and src/engines/*.ts if it lives at top level) and confirm the file exists. For each dispatcher action: Grep the dispatcher source for the exact action string. For each script/hook: confirm the path exists. If you CANNOT confirm a symbol exists, OMIT IT ENTIRELY -- do not write it, do not even mark it UNVERIFIED if it is a core engine/action name. Better a short verified file than a long fabricated one. The verifier WILL spot-check 6+ symbols and FAIL the whole draft on ONE fabrication.
- The assessment names specific FABRICATED symbols in the current file -- those are DROP. Replace them with the verified real name the assessment gives, or omit.
- HARD CAP 180 LINES. Be lean: §3 dispatcher quick-ref = the 8-12 MOST-USED actions + a "full list: <dispatcher>.ts ACTIONS" pointer (NOT every action); §5 gotchas <= 6; DROP rot-prone live metrics (offload %, take-rate) -- replace wit
... [+543 chars truncated]

### Assistant | 2026-06-13T22:37:54.142Z

I'll systematically read the required files, verify symbols on disk, then write the draft.

### Assistant | 2026-06-13T22:37:54.362Z

[tool_use: Read]

### User | 2026-06-13T22:37:58.703Z

[tool_result] 1	# CANONICAL PER-SLOT GALAXY CLAUDE.md TEMPLATE
2	
3	> Synthesis lead output, 2026-06-13. Source: 34 domain-expert galaxy assessments in this directory
4	> (`state/shared/slot-claude-md-assessment/*.md`), every one read end-to-end.
5	> This file is the LOCKED skeleton every galaxy `mcp-server/src/engines/<galaxy>/CLAUDE.md` is rewritten to.
6	> Target per-galaxy size: **80–160 lines** (replaces t
... [+31609 chars truncated]

### Assistant | 2026-06-13T22:38:01.207Z

Now let me read the assessment and current file in parallel.

### Assistant | 2026-06-13T22:38:01.623Z

[tool_use: Read]

### Assistant | 2026-06-13T22:38:02.280Z

[tool_use: Read]

### User | 2026-06-13T22:38:12.043Z

[tool_result] 1	## backend-helper — slot:papa
2	
3	### Current state
4	
5	**Size:** CLAUDE.md is 111 lines / ~6.3 KB. MEMORY.md is 98 lines. PATHS.md is 77 lines. TOOLBELT.md is 29 lines. SOUL.md is 47 lines. AWARENESS.md exists (not read — small by pattern).
6	
7	**Quality grade: PARTIAL**
8	
9	The current CLAUDE.md has a good core concept (cross-cutting build assist, not a domain specialist) and the anti-patt
... [+13033 chars truncated]

### User | 2026-06-13T22:38:12.145Z

[tool_result] 1	# Backend Helper Galaxy (PAPA slot)
2	
3	Operational scope per `H:/CHAT-SLOT-DOMAINS.md`:
4	> PAPA - BACKEND HELPER
5	
6	Papa is the cross-cutting backend assist slot: TypeScript build hygiene, dispatcher wiring completeness, type-system errors, MCP server lifecycle, route/schema validation, test-harness scaffolding, refactors. Not a domain specialist — a force multiplier behind every other slot
... [+8426 chars truncated]

### Assistant | 2026-06-13T22:38:15.159Z

Now let me verify the symbols on disk before writing anything.

### Assistant | 2026-06-13T22:38:15.934Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:38:16.322Z

[tool_use: Glob]

### User | 2026-06-13T22:38:38.819Z

[tool_result] No files found

### User | 2026-06-13T22:38:38.820Z

[tool_result] No files found

### Assistant | 2026-06-13T22:38:40.827Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:38:41.398Z

[tool_use: Glob]

### User | 2026-06-13T22:39:04.284Z

[tool_result] No files found

### User | 2026-06-13T22:39:06.294Z

[tool_result] No files found

### Assistant | 2026-06-13T22:39:08.461Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:39:08.871Z

[tool_use: Glob]

### User | 2026-06-13T22:39:30.730Z

[tool_result] No files found

### User | 2026-06-13T22:39:30.731Z

[tool_result] No files found

### Assistant | 2026-06-13T22:39:33.992Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:39:34.634Z

[tool_use: Bash]

### User | 2026-06-13T22:39:52.115Z

[tool_result] aggressive-killer-stop.mjs
chat-cleanup-on-stop.mjs
commit-pressure-stop-gate.mjs
cost-ceiling-stop.mjs
docker-service-health-stop.mjs
docker-service-health-stop.test.mjs
duplication-guard-stop.mjs
fleet-reaper-stop.mjs
fleet-task-health-stop.mjs
git-sync-stop.mjs
handoff-memory-seed-stop.mjs
memory-autocompact-stop.mjs
memory-autocompact-stop.test.mjs
rgs-outcome-record-stop.mjs
rtk-savings-stop-
... [+164 chars truncated]

### User | 2026-06-13T22:39:52.669Z

[tool_result] devDispatcher.ts

### Assistant | 2026-06-13T22:39:54.935Z

Good — `devDispatcher.ts` confirmed. Now verify the specific hooks and engine files.

### Assistant | 2026-06-13T22:39:56.469Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:39:57.263Z

[tool_use: Bash]

### User | 2026-06-13T22:40:14.894Z

[tool_result] BuildAdvisorEngine.ts
BuildContextClassifier.py
BuildDebriefEngine.ts
BuildGuardChainEngine.ts
BuildPlannerEngine.ts
CounterfactualBuildSimulatorEngine.ts
CourseBuilderEngine.ts
FiveAxisLoRADatasetBuilderEngine.ts
GrindingLoRADatasetBuilderEngine.ts
LaserLoRADatasetBuilderEngine.ts
LatheLoRADatasetBuilderEngine.ts
MillingLoRADatasetBuilderEngine.ts
MillTurnLoRADatasetBuilderEngine.ts
PhysicsSideca
... [+122 chars truncated]

### User | 2026-06-13T22:40:15.811Z

[tool_result] comprehensive-build-enforce.mjs
stop_on_awareness_degraded.mjs
stop_on_broken_imports.mjs
stop_on_build_error.mjs
stop_on_c_drive_write.mjs
stop_on_circular_deps.mjs
stop_on_content_deletion.mjs
stop_on_cutting_calculation_protocol.mjs
stop_on_dirty_registry.mjs
stop_on_duplicate_created.mjs

### Assistant | 2026-06-13T22:40:19.375Z

Good. Now verify the remaining hooks and check specific devDispatcher actions.

### Assistant | 2026-06-13T22:40:20.298Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:40:23.086Z

[tool_use: Bash]

### User | 2026-06-13T22:40:34.019Z

[tool_result] stop_on_failing_tests.mjs
stop_on_unwired_assets.mjs

### User | 2026-06-13T22:40:35.961Z

[tool_result] 36:const ACTIONS = ["session_boot", "build", "code_template", "code_search", "file_read", "file_write", "server_info", "test_smoke", "test_results", "svi_compute", "svi_read", "svi_summary", "erp_persistence_health", "shop_outcome_ingest", "gcode_material_parse", "dependency_cycle_analyze", "psn_health_check", "msa_analyze", "sim_stall_start_tracking", "sim_stall_mark_progress", "sim_stall_scan", 
... [+8091 chars truncated]

### Assistant | 2026-06-13T22:40:39.677Z

All symbols verified. Now check the remaining paths and verify `BackendRouterEngine.ts` and `CounterfactualBuildSimulatorEngine.ts` existence, plus `scripts/audit-unwired-engines.mjs`.

### Assistant | 2026-06-13T22:40:41.524Z

[tool_use: Bash]

### User | 2026-06-13T22:40:56.475Z

[tool_result] BackendRouterEngine.ts
CounterfactualBuildSimulatorEngine.ts
CounterfactualMillEngine.ts
CounterfactualReasoningEngine.ts
CrossProcessCounterfactualPredictorEngine.ts
audit-unwired-engines.mjs
audit-unwired-engines.test.mjs
audit-unwired-hooks-2026-05-27.mjs
devActionSchemas.ts

### Assistant | 2026-06-13T22:41:00.168Z

All symbols confirmed. Now check `index.ts` and `mcp-server/data/state/BASELINE_INVENTORY.json` exist, then write the draft.

### Assistant | 2026-06-13T22:41:01.320Z

[tool_use: Bash]

### User | 2026-06-13T22:41:08.006Z

[tool_result] Exit code 2
ls: cannot access 'H:/prism/mcp-server/src/tools/index.ts': No such file or directory

### Assistant | 2026-06-13T22:41:14.360Z

Let me verify those remaining paths efficiently in one shot.

### Assistant | 2026-06-13T22:41:15.373Z

[tool_use: Bash]

### User | 2026-06-13T22:41:20.510Z

[tool_result] Exit code 1

### Assistant | 2026-06-13T22:41:32.002Z

I have enough verified symbols. Let me write the draft now.

Verified symbols:
- CONFIRMED engines (top-level `mcp-server/src/engines/`): `BuildAdvisorEngine.ts`, `BuildDebriefEngine.ts`, `BuildGuardChainEngine.ts`, `BuildPlannerEngine.ts`, `CounterfactualBuildSimulatorEngine.ts`, `BackendRouterEngine.ts`
- CONFIRMED hooks: `stop_on_unwired_assets.mjs`, `stop_on_failing_tests.mjs`, `comprehensive-build-enforce.mjs` (all in `.claude/hooks/`)
- CONFIRMED dispatcher: `devDispatcher.ts` with verified actions: `build_guard_validate`, `build_guard_chain`, `build_guard_typecheck`, `build_guard_affected_tests`, `build_guard_classify`, `auto_wiring_analyze`, `auto_wiring_scan`, `test_gap_scan`, `schema_gap_scan`, `gap_scan`, `gap_scan_file`, `gap_scan_batch`, `build_advise`, `build_debrief`, `build_debrief_recent`, `simulate_build`, `schema_coverage_audit`, `build_plan`, `build_plan_from_unit`, `error_remediation`, `type_aware_references`, `symbol_impact`, `type_flow_trace`, `rollback_plan`, `rollback_verify`, `rollback_plan_and_verify`, `rollback_render_script`, `quality_score`, `quality_dashboard`, `import_cost_analyze`, `import_cost_heavy`, `import_cost_report`, `copy_paste_detect`, `stale_segment_record`, `stale_segment_prune`
- CONFIRMED scripts: `scripts/audit-unwired-engines.mjs`
- CONFIRMED schemas: `mcp-server/src/schemas/devActionSchemas.ts`
- NOT CONFIRMED: `mcp-server/src/tools/index.ts` (omit), `BASELINE_INVENTORY.json` (omit from verified list — use qualified path), `BUILD_STATE.md` (omit)
- FABRICATED (DROP): `outcome-bus-auto-tap.mjs`, `xproc_outcome_publish`, `xproc_kg_project_features`, `xproc_calibration_monitor_record`

### Assistant | 2026-06-13T22:41:32.862Z

[tool_use: Bash]

### User | 2026-06-13T22:41:38.529Z

[tool_result] academy.md
agent-orchestration.md
ai-training.md
blueprint-vision.md
bug-hunting.md
business.md
cad.md
cad-fusion-live.md
cam.md
compliance-safety.md
corpus-aggregation.md
database-expansion.md
discovery.md
dormant-data.md
fleet-hygiene.md
frontend-app.md
hermes-zulu.md
knowledge-conversion.md
lathe.md
mill.md
mit-curriculum.md
pdf-corpus.md
pdf-corpus-mill.md
post-processor.md
quality.md
quoting.
... [+104 chars truncated]

### Assistant | 2026-06-13T22:41:40.847Z

Now write the draft.

### Assistant | 2026-06-13T22:42:58.733Z

[tool_use: Write]

### User | 2026-06-13T22:43:08.635Z

[tool_result] File created successfully at: H:/prism/state/shared/slot-claude-md-drafts/backend-helper.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-13T22:43:11.140Z

Now count the lines to report accurately.

### Assistant | 2026-06-13T22:43:11.871Z

[tool_use: Bash]

### User | 2026-06-13T22:43:15.932Z

[tool_result] 209 state/shared/slot-claude-md-drafts/backend-helper.md

### Assistant | 2026-06-13T22:43:19.166Z

209 lines exceeds the 180-line hard cap. I need to trim. The main bloat is the multi-table dispatcher quick-ref. Let me tighten it.

### Assistant | 2026-06-13T22:43:35.267Z

[tool_use: Edit]

### User | 2026-06-13T22:43:38.232Z

[tool_result] The file H:/prism/state/shared/slot-claude-md-drafts/backend-helper.md has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-13T22:43:40.571Z

[tool_use: Bash]

### User | 2026-06-13T22:43:41.375Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### Assistant | 2026-06-13T22:43:43.990Z

[tool_use: Bash]

### User | 2026-06-13T22:43:48.949Z

[tool_result] 181 H:/prism/state/shared/slot-claude-md-drafts/backend-helper.md

### Assistant | 2026-06-13T22:43:51.427Z

181 — one line over cap. Remove one blank line.

### Assistant | 2026-06-13T22:43:56.570Z

[tool_use: Edit]

### User | 2026-06-13T22:44:01.437Z

[tool_result] The file H:/prism/state/shared/slot-claude-md-drafts/backend-helper.md has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-13T22:44:03.352Z

Final line count check:

### Assistant | 2026-06-13T22:44:04.026Z

[tool_use: Bash]

### User | 2026-06-13T22:44:07.135Z

[tool_result] 177 H:/prism/state/shared/slot-claude-md-drafts/backend-helper.md

### Assistant | 2026-06-13T22:44:15.267Z

177 lines — within cap.

**Symbol tally:**
- Verified on disk (confirmed by Glob/ls/grep before writing): `BuildAdvisorEngine.ts`, `BuildDebriefEngine.ts`, `BuildGuardChainEngine.ts`, `BuildPlannerEngine.ts`, `CounterfactualBuildSimulatorEngine.ts`, `BackendRouterEngine.ts`, `stop_on_unwired_assets.mjs`, `stop_on_failing_tests.mjs`, `comprehensive-build-enforce.mjs`, `devDispatcher.ts`, `devActionSchemas.ts`, `scripts/audit-unwired-engines.mjs`, and 35 dispatcher action names grep-confirmed in `devDispatcher.ts` ACTIONS array = **48 symbols verified**
- Dropped as fabricated: `outcome-bus-auto-tap.mjs`, `xproc_outcome_publish`, `xproc_kg_project_features`, `xproc_calibration_monitor_record` = **4 dropped**

galaxy=backend-helper | lines=177 | symbols-verified=48 | symbols-dropped-as-fabricated=4
