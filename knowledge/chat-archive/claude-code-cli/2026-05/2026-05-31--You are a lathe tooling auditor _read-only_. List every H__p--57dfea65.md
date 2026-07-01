---
type: "chat-session"
source: "claude-code-cli"
session_id: "57dfea65-d281-4590-a8f2-029d3352b0f0"
title: "You are a lathe tooling auditor (read-only). List every H:/prism-slot-whiskey/sc"
date: "2026-05-31"
first_ts: "2026-05-31T06:28:18.960Z"
last_ts: "2026-05-31T06:42:09.012Z"
cwd: "H:\\prism-slot-whiskey"
messages: 108
user_msgs: 40
assistant_msgs: 68
raw_file: "H:/.claude/projects/H--prism-slot-whiskey/57dfea65-d281-4590-a8f2-029d3352b0f0/subagents/workflows/wf_c8672ea7-3bc/agent-aca62e86cfd232fa7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:14"
---

# You are a lathe tooling auditor (read-only). List every H:/prism-slot-whiskey/sc

> **claude-code-cli** | 2026-05-31 | 108 msgs (40 user / 68 assistant) | cwd: H:\prism-slot-whiskey
> Raw: `H:/.claude/projects/H--prism-slot-whiskey/57dfea65-d281-4590-a8f2-029d3352b0f0/subagents/workflows/wf_c8672ea7-3bc/agent-aca62e86cfd232fa7.jsonl`

## Transcript

### User | 2026-05-31T06:28:18.960Z

You are a lathe tooling auditor (read-only). List every H:/prism-slot-whiskey/scripts/lib/lathe-*.mjs deterministic lib + its 1-line role (and whether it has a *.test.mjs). Identify AT MOST the single highest-ROI dedup-safe EXTENSION or SIBLING lib that is (a) buildable in-slot as a standalone .mjs + node:test, (b) NOT a duplicate of an existing lib OR an existing mcp-server engine — you MUST grep H:/prism/mcp-server/src/engines/ for a same-purpose engine and report whether one exists, (c) fills a real lathe physics/safety/program gap. HARD CONSTRAINTS for every candidate you propose:
- IN-SLOT-SAFE means: buildable/writable inside H:/prism-slot-whiskey on branch slot/whiskey WITHOUT depending on a file that exists only in the main tree H:/prism (the slot is 219 ahead / 1658 BEHIND cad-fusion-live-ms0 — 8391 files diverged).
- build:fast is RED in-slot for cross-tree reasons (missing LatheLiveToolingPlannerEngine.js + ideaBlockSchema.js) — do NOT propose anything that needs the mcp-server esbuild bundle to be green; slot-local scripts/lib/*.mjs validated by node:test are safe.
- NEVER propose inlining Kienzle/Taylor/material constants (must import from mcp-server/src/physics/constants.ts) or creating stub engines or softening safety thresholds.
- DEDUP IS MANDATORY: before proposing a 'build-lib' or 'fix', check BOTH H:/prism-slot-whiskey/mcp-server/src/engines/ AND H:/prism/mcp-server/src/engines/ AND H:/prism-slot-whiskey/scripts/lib/ for an existing same-purpose asset. State exactly what you checked in dupEvidence. If a same-purpose asset exists upstream, dupRisk=high and inSlotSafe=false.
Return STRICT JSON per the schema. Ground every candidate with a real file:line or commit ref. Be honest (R12) — if a source yields no real gap, return an empty candidates array with a summary saying so.

### Assistant | 2026-05-31T06:28:36.475Z

I'll help you audit the lathe tooling libraries in the slot and identify the highest-ROI extension opportunity. Let me start by exploring the structure.

### Assistant | 2026-05-31T06:28:36.662Z

[tool_use: Bash]

### User | 2026-05-31T06:31:23.404Z

[tool_result]  M .claude/settings.json
 M .mcp.json
 M mcp-server/data/state/ollama-offload-stats.json
?? .vscode/
?? mcp-server/.claude/cache/
?? mcp-server/data/state/SCRUTINY_LEDGER.json
?? mcp-server/mcp-server/
?? mcp-server/state/shared/TSC_BASELINE_CACHE.json
?? mcp-server/state/shared/TSC_BASELINE_ERRORS.json
?? state/shared/TSC_BASELINE_CACHE.json
?? state/shared/TSC_BASELINE_ERRORS.json

### Assistant | 2026-05-31T06:31:24.965Z

Now let me find all lathe-*.mjs files in the scripts/lib directory:

### Assistant | 2026-05-31T06:31:25.086Z

[tool_use: Glob]

### User | 2026-05-31T06:31:37.409Z

[tool_result] scripts\lib\lathe-academy-priors.mjs
scripts\lib\__tests__\lathe-academy-priors-test.mjs
scripts\lib\lathe-g76-thread-validator.test.mjs
scripts\lib\lathe-tribal-query-engine.test.mjs
scripts\lib\lathe-wizard-vendor-lookup.test.mjs
scripts\lib\lathe-engines-e2e-smoke.test.mjs
scripts\lib\lathe-stage-4-5-pipeline.test.mjs
scripts\lib\lathe-shop-tool-library-bridge.test.mjs
scripts\lib\lathe-trainin
... [+525 chars truncated]

### Assistant | 2026-05-31T06:31:39.145Z

Now let me read each lib file to understand their roles:

### Assistant | 2026-05-31T06:31:39.361Z

[tool_use: Read]

### Assistant | 2026-05-31T06:31:39.560Z

[tool_use: Read]

### Assistant | 2026-05-31T06:31:39.779Z

[tool_use: Read]

### Assistant | 2026-05-31T06:31:40.215Z

[tool_use: Read]

### Assistant | 2026-05-31T06:31:40.421Z

[tool_use: Read]

### Assistant | 2026-05-31T06:31:40.618Z

[tool_use: Read]

### Assistant | 2026-05-31T06:31:40.828Z

[tool_use: Read]

### Assistant | 2026-05-31T06:31:41.250Z

[tool_use: Read]

### Assistant | 2026-05-31T06:31:41.334Z

[tool_use: Read]

### User | 2026-05-31T06:32:00.093Z

[tool_result] 1	/**
2	 * lathe-academy-priors.mjs (pure functions)
3	 *
4	 * Extract structured turning-operation priors from PRISM Academy course
5	 * lesson source files (TypeScript). The priors shape matches what
6	 * LatheAITrainingEngine + LatheActiveLearningEngine can consume as
7	 * expert-authored validation baselines alongside the JM-Die archive corpus.
8	 *
9	 * INPUT  : raw source text of a course-N-
... [+2063 chars truncated]

### User | 2026-05-31T06:32:00.645Z

[tool_result] 1	// G76 thread-validator — implements U-LATHE-G76-THREAD-VALIDATOR
2	// Design memo: reference_lathe_g76_thread_validator_design_2026_05_27
3	// Session-final state: reference_whiskey_session_final_iter167_2026_05_27
4	// See scripts/lib/README-whiskey-lathe.md for full engine + test catalog.
5	//
6	// Validates threading-cycle-specific defects that generic G-code validators miss:
7	//   Rule 1: 
... [+1777 chars truncated]

### User | 2026-05-31T06:32:00.647Z

[tool_result] 1	// Lathe tribal-query engine — implements U-LATHE-TRIBAL-QUERY-DISPATCHER
2	// Design memo: reference_lathe_tribal_query_dispatcher_design_2026_05_27
3	// Session-final state: reference_whiskey_session_final_iter167_2026_05_27
4	// See scripts/lib/README-whiskey-lathe.md for full engine + test catalog.
5	//
6	// Two-tier search:
7	//   Tier 1: exact-match index lookup over vendor_grades hard con
... [+1489 chars truncated]

### User | 2026-05-31T06:32:01.142Z

[tool_result] 1	// Lathe wizard vendor-lookup — implements U-LATHE-WIZARD-VENDOR-LOOKUP
2	// Design memo: reference_lathe_wizard_vendor_lookup_design_2026_05_27
3	// Session-final state: reference_whiskey_session_final_iter167_2026_05_27
4	// See scripts/lib/README-whiskey-lathe.md for full engine + test catalog.
5	//
6	// selectInsert(spec) — given (iso_group, operation, material, customer, ...),
7	// pull can
... [+1783 chars truncated]

### User | 2026-05-31T06:32:02.536Z

[tool_result] 1	// Shop tool-library bridge — implements U-LATHE-SHOP-TOOL-LIBRARY-BRIDGE
2	// Design memo: reference_shop_tool_library_bridge_design_2026_05_27
3	// Session-final state: reference_whiskey_session_final_iter167_2026_05_27
4	// See scripts/lib/README-whiskey-lathe.md for full engine + test catalog.
5	//
6	// Resolves (customer, jobId, T-number, controller, machineModel) → ShopToolEntry
7	// via 3
... [+1705 chars truncated]

### User | 2026-05-31T06:32:02.594Z

[tool_result] 1	// Training-loop Stage 5 (GENERATE) — implements U-LATHE-LOOP-STAGE-IMPL-1-TO-5 (Stage 5 of 11)
2	// Design memo: reference_lathe_training_loop_stages_1_5_design_2026_05_27
3	// Session-final state: reference_whiskey_session_final_iter167_2026_05_27
4	// See scripts/lib/README-whiskey-lathe.md for full engine + test catalog.
5	//
6	// runStage5_Generate(originalProgram, reasonReport, ctx) → Prop
... [+1670 chars truncated]

### User | 2026-05-31T06:32:03.233Z

[tool_result] 1	// Training-loop Stage 4 (REASON) — implements U-LATHE-LOOP-STAGE-IMPL-1-TO-5 (Stage 4 of 11)
2	// Design memo: reference_lathe_training_loop_stages_1_5_design_2026_05_27
3	// Session-final state: reference_whiskey_session_final_iter167_2026_05_27
4	//
5	// runStage4_Reason(programReport, partSpec, engines) → ReasonReport
6	//
7	// Composes the 5 P0 engines built earlier this session to synthesi
... [+1538 chars truncated]

### User | 2026-05-31T06:32:05.328Z

[tool_result] 1	// lathe-gcode-lint.mjs — pure turning-program PHYSICS/SAFETY lint lib (slot:whiskey)
2	//
3	// Encodes the whiskey galaxy's 8 validated lathe gotchas
4	// (mcp-server/src/engines/lathe/CLAUDE.md §5) as deterministic PASS/FAIL checks
5	// against turning G-code TEXT or a turning program-PLAN object. PURE — no engine,
6	// no dist build, no MCP. Runs in milliseconds when port 3100 is down.
7	//
8
... [+2638 chars truncated]

### User | 2026-05-31T06:32:05.769Z

[tool_result] 1	// Lathe A/B-version locator — implements U-LATHE-AB-VERSION-LOCATOR
2	// Design memo: reference_lathe_ab_version_locator_design_2026_05_27
3	// Session-final state: reference_whiskey_session_final_iter167_2026_05_27
4	// See scripts/lib/README-whiskey-lathe.md for full engine + test catalog.
5	// Doctrine: B-versions are AI-generated PRISM v2.0.0 output — see feedback_jm_die_b_versions_are_ai_n
... [+1609 chars truncated]

### Assistant | 2026-05-31T06:32:09.205Z

Now let me check for corresponding test files and get a complete mapping:

### Assistant | 2026-05-31T06:32:09.781Z

[tool_use: Bash]

### User | 2026-05-31T06:33:10.310Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-31T06:33:11.998Z

Let me try a more direct approach:

### Assistant | 2026-05-31T06:33:12.536Z

[tool_use: PowerShell]

### User | 2026-05-31T06:33:34.286Z

[tool_result] [32;1mName                                         [0m[32;1m HasTest[0m
[32;1m----                                         [0m [32;1m-------[0m
lathe-ab-version-locator.mjs                     True
lathe-ab-version-locator.test.mjs               False
lathe-academy-priors.mjs                        False
lathe-engines-e2e-smoke.test.mjs                False
lathe-g76-thread-validator
... [+797 chars truncated]

### Assistant | 2026-05-31T06:33:35.719Z

Good! Now let me check if there's a README that describes these:

### Assistant | 2026-05-31T06:33:35.885Z

[tool_use: Read]

### User | 2026-05-31T06:33:48.316Z

[tool_result] 1	# Whiskey lathe-domain engines — entry point
2	
3	> **STATUS**: Session-final at iter285. All 6 P0 engines + AB-locator CLI scanner code-complete + **143+9=152 hermetic tests** (39 in lathe-quality-pipeline + 9 new in iter275/iter281 ab-locator tests) + **13 real-data-driven fixes (iter281 AB-locator PRISM_UPGRADED priority fix added)** + full JM-Die archive scan = **14,475 A/B pairs across 118 
... [+4348 chars truncated]

### Assistant | 2026-05-31T06:33:49.844Z

Now let me check if there's an academy-priors.test.mjs in the __tests__ directory:

### Assistant | 2026-05-31T06:33:50.320Z

[tool_use: Read]

### User | 2026-05-31T06:33:58.088Z

[tool_result] 1	import { describe, it } from "node:test";
2	import assert from "node:assert/strict";
3	import { readFileSync } from "node:fs";
4	import { resolve } from "node:path";
5	
6	import {
7	  TITLE_TO_TOOLTYPE,
8	  extractInserts,
9	  extractParamRanges,
10	  extractGMCodes,
11	  extractHeuristicRules,
12	  extractTitleBodyPairs,
13	  extractModuleTitleMap,
14	  buildPriorsForCourse,
15	  buildPriorBund
... [+956 chars truncated]

### Assistant | 2026-05-31T06:33:59.591Z

Good! Now I need to check what's upstream. Let me inspect the mcp-server engines directory in both trees:

### Assistant | 2026-05-31T06:33:59.880Z

[tool_use: Bash]

### system

... [28 middle messages omitted -- see raw_file] ...

### Assistant | 2026-05-31T06:39:21.911Z

[tool_use: Read]

### User | 2026-05-31T06:39:25.485Z

[tool_result] 1	// lathe-gcode-lint.mjs — pure turning-program PHYSICS/SAFETY lint lib (slot:whiskey)
2	//
3	// Encodes the whiskey galaxy's 8 validated lathe gotchas
4	// (mcp-server/src/engines/lathe/CLAUDE.md §5) as deterministic PASS/FAIL checks
5	// against turning G-code TEXT or a turning program-PLAN object. PURE — no engine,
6	// no dist build, no MCP. Runs in milliseconds when port 3100 is down.
7	//
8
... [+5886 chars truncated]

### Assistant | 2026-05-31T06:39:27.418Z

Now let me check what needs are not being met. Let me look at the PATHS.md to understand next priorities:

### Assistant | 2026-05-31T06:39:28.004Z

[tool_use: Read]

### User | 2026-05-31T06:39:29.452Z

[tool_result] 1	# Lathe Galaxy PATHS.md — H:/-wide path atlas (slot:whiskey)
2	
3	> THE highest-ROI artifact. Converts every future lathe Grep/Glob from O(N) → O(1). Format: `<path> | <purpose> | <maintainer>`. Built 2026-05-28, comprehensively re-mapped 2026-05-29 (3-agent path-atlas Workflow). When a path moves, fix it here FIRST. **Counts are live-verified 2026-05-29.**
4	
5	## Engine source (flat — `H:/pris
... [+10986 chars truncated]

### Assistant | 2026-05-31T06:39:31.657Z

Perfect! Now I have a comprehensive view. Let me now check what the highest-leverage extension opportunities are by looking at what's NOT yet covered. Let me check the README one more time for the next priorities:

### Assistant | 2026-05-31T06:39:32.181Z

[tool_use: Read]

### User | 2026-05-31T06:39:36.088Z

[tool_result] 35	## Entry point for next session
36	
37	Read `[[reference_whiskey_session_final_iter167_2026_05_27]]` in memory before doing anything else.
38	
39	Machine-readable sentinel: `mcp-server/data/ingestion_cache/whiskey-lathe-session-iter180.json` (iter181) — JSON-parseable summary with engine list, test counts, fixes, and next-session priority order.
40	
41	Highest-leverage next iters:
42	1. Real sh
... [+653 chars truncated]

### Assistant | 2026-05-31T06:39:37.740Z

Now let me analyze the gaps. Let me check what the machine-readable sentinel says:

### Assistant | 2026-05-31T06:39:37.857Z

[tool_use: Read]

### User | 2026-05-31T06:39:41.520Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "slot": "whiskey",
4	  "session_date": "2026-05-27",
5	  "final_iter": 206,
6	  "domain": "lathe",
7	  "status": "session-final-clean-exit",
8	  "doctrine": "feedback_yolo_mode_nonterminal_goal_pattern",
9	  "cron": {
10	    "id": "4d08d27a",
11	    "schedule": "*/5 * * * *",
12	    "recurring": true,
13	    "auto_continues_into_next_session": true
14	  },
15	
... [+2033 chars truncated]

### Assistant | 2026-05-31T06:39:44.318Z

Excellent! Now I have a complete picture. Let me now verify what the HIGHEST-ROI extension would be. Let me check if there's already work on spindle-force / cutting-force models or deflection validators:

### Assistant | 2026-05-31T06:39:44.611Z

[tool_use: Bash]

### User | 2026-05-31T06:40:00.466Z

[tool_result] scripts/lib/course-content-mine-lib.mjs:  "machining", "cutting", "tool", "spindle", "motor", "actuator", "kinematics",
scripts/lib/course-content-mine-lib.test.mjs:  assert.equal(corpusMfgPrior("control damping vibration thermal stress material tolerance machining cutting force"), 1);
scripts/lib/course-content-mine-lib.test.mjs:  const rich = "control mill machining tool spindle cutting force to
... [+1911 chars truncated]

### Assistant | 2026-05-31T06:40:02.737Z

Good! Now let me check what physics/safety gaps exist by looking at what gotchas are NOT automated. Let me re-examine gotcha #6 (sub-spindle) and gotcha #2 (boring-bar deflection) more carefully:

### Assistant | 2026-05-31T06:40:03.045Z

[tool_use: Read]

### User | 2026-05-31T06:40:12.276Z

[tool_result] 100	  for (const i of (thr && Array.isArray(thr.issues) ? thr.issues : [])) {
101	    findings.push({
102	      rule: `thread-${i.rule || "g76"}`, severity: G76_SEV[i.severity] || "INFO",
103	      line: Number.isInteger(i.block_index) ? i.block_index + 1 : 0,
104	      msg: i.message || "Threading rule violation.", fix: i.suggestion || "",
105	    });
106	  }
107	
108	  // R4/R5 — single modal-aw
... [+4228 chars truncated]

### Assistant | 2026-05-31T06:40:16.924Z

Perfect! Now I have a comprehensive understanding. Let me create a structured analysis. The key gaps I see are:

1. **Gotcha #6 (sub-spindle handoff phase)** - not covered in slot libs (requires M-code mapping + phase semantics)
2. **Boring-bar force/chatter prediction** - only L/D heuristic covered, not actual Kienzle force model
3. **Spindle envelope / torque gating** - referenced in CLAUDE.md but no deterministic slot lib for it
4. **Multi-pass threading optimization** - G76 validator only checks syntax, not pass-count optimization
5. **Tool deflection across all ops** - only boring-bar, not facing/OD tools

Let me verify one more thing - check if there's any force/deflection in the upstream engines:

### Assistant | 2026-05-31T06:40:17.309Z

[tool_use: Bash]

### User | 2026-05-31T06:40:30.520Z

[tool_result] AdaptiveSpindleControlEngine.ts  22.3K
BoltTorqueEngine.ts  8.4K
BoringBarDeflectionEngine.ts  7.2K
ChuckJawForceEngine.ts  8.3K
ClampingForceEngine.ts  9.0K
CrossProcessSymbolicConstraintEnforcerEngine.ts  11.4K
CuttingForceEngine.ts  8.6K
DeflectionOverlayEngine.ts  11.5K
DrillBreakthroughForceEngine.ts  11.8K
ExtrusionForceEngine.ts  7.5K
FaceDriverTorqueEngine.ts  4.9K
ForceCapabilityEngine.ts
... [+309 chars truncated]

### Assistant | 2026-05-31T06:40:32.695Z

Excellent! So there ARE upstream engines for this. Now let me verify the true gap - what can be built IN-SLOT that wouldn't duplicate upstream AND fills a real gap. Let me check if there's a spindle-torque-gate lib:

### Assistant | 2026-05-31T06:40:32.761Z

[tool_use: Bash]

### User | 2026-05-31T06:40:41.765Z

[tool_result] AdaptiveSpindleControlEngine.ts  22.3K
LatheSubSpindleTransferPurgeEngine.ts  8.6K
MultiSpindleAutomaticEngine.ts  30.8K
PPOkumaSubSpindleSyncEngine.ts  14.4K
PPSpindleSpeedSafetyEngine.ts  10.4K
PPSpindleStateValidatorEngine.ts  10.3K
SpindleBearingLoadEngine.ts  9.3K
SpindleHarmonicsQualityEngine.ts  11.1K
SpindleLoadMonitorEngine.ts  14.3K
SpindlePowerCheckEngine.ts  8.5K
SpindleProtectionEngin
... [+221 chars truncated]

### Assistant | 2026-05-31T06:40:44.661Z

Perfect! So `SpindleTorqueGateEngine` and `SubSpindleHandoffVerifierEngine` already exist. Now, my analysis is clear. Let me now identify the TRUE highest-ROI gap that is:
- NOT already upstream
- NOT in slot yet
- FILLS a real physics/safety gap
- BUILDABLE standalone with node:test

The best candidate appears to be a **spindle-envelope / CSS-overspeed catastrophic-failure detector** that goes beyond the simple G50 check. Let me verify this is not yet built:

### Assistant | 2026-05-31T06:40:45.203Z

[tool_use: Bash]

### User | 2026-05-31T06:40:51.404Z

[tool_result] Exit code 1

### User | 2026-05-31T06:40:53.047Z

Stop hook feedback:
You did not call StructuredOutput. You MUST call StructuredOutput to return your answer — the tool input IS your answer. Call it now.

### Assistant | 2026-05-31T06:40:55.936Z

Now let me compile my findings into the structured output format:

### Assistant | 2026-05-31T06:41:07.386Z

[tool_use: StructuredOutput]

### User | 2026-05-31T06:41:07.743Z

[tool_result] Output does not match required schema: root: must have required property 'summary'

### Assistant | 2026-05-31T06:41:08.860Z

Let me fix that:

### Assistant | 2026-05-31T06:41:21.949Z

[tool_use: StructuredOutput]

### User | 2026-05-31T06:41:24.365Z

[tool_result] Output does not match required schema: root: must have required property 'candidates'

### Assistant | 2026-05-31T06:41:25.952Z

Let me check the schema more carefully and fix the structure:

### Assistant | 2026-05-31T06:41:36.277Z

[tool_use: StructuredOutput]

### User | 2026-05-31T06:41:39.284Z

[tool_result] Output does not match required schema: root: must have required property 'candidates'

### Assistant | 2026-05-31T06:41:44.145Z

I see the issue - the candidates parameter needs to be a proper JSON array. Let me fix:

### Assistant | 2026-05-31T06:41:48.608Z

[tool_use: StructuredOutput]

### User | 2026-05-31T06:41:51.235Z

[tool_result] Structured output provided successfully

### Assistant | 2026-05-31T06:42:09.012Z

Perfect! Now let me provide a comprehensive text summary for the user as well:

## Lathe Tooling Audit Summary

I've completed a comprehensive read-only audit of the slot:whiskey lathe domain. Here are the findings:

### All Deterministic Slot-Local Libraries (scripts/lib/lathe-*.mjs)

| Library | Role | Has Test |
|---------|------|----------|
| `lathe-g76-thread-validator.mjs` | Validate G76/G92 threading rules (controller-aware) | ✓ 7/7 tests |
| `lathe-shop-tool-library-bridge.mjs` | Resolve (customer, T-num) → ANSI insert via 3-layer fallback | ✓ 12/12 tests |
| `lathe-tribal-query-engine.mjs` | Query 14-vendor / 87+ grade tribal corpus (Tier 1/2 search) | ✓ 12/12 tests |
| `lathe-wizard-vendor-lookup.mjs` | selectInsert(spec) — 7-component scoring via bridge+query | ✓ 9/9 tests |
| `lathe-ab-version-locator.mjs` | Parse JM DIE paths, pair A/B program versions (14,475 pairs) | ✓ 19+7 tests |
| `lathe-training-loop-stage-4-reason.mjs` | Compose 5 engines → ReasonReport (improvement recommendations) | ✓ 14/14 tests |
| `lathe-training-loop-stage-5-generate.mjs` | Apply recommendations → ProposedProgram (concrete edits) | ✓ 13/13 tests |
| `lathe-gcode-lint.mjs` | Pure physics/safety lint (8 gotchas: CSS cap, boring L/D, nose-radius, threading, parting peck, C-axis polar, IPR/IPM) | ✓ 28 tests |
| `lathe-academy-priors.mjs` | Extract turning-operation priors from PRISM Academy course source | ✓ (in `__tests__/lathe-academy-priors-test.mjs`) |

**Total: 9 libraries, 152+ hermetic tests, 0 cross-tree deps (deterministic via node:test)**

---

### Highest-ROI Extension Candidate (Proposed)

**`lathe-spindle-envelope-css-gate.mjs`** — Spindle CSS overspeed catastrophic-failure detector

**Why this is the single best candidate:**

1. **Real physics/safety gap:** Gotcha #1 (G96 CSS without G50 cap) is CATASTROPHIC—overspeed chucks eject parts at lethal velocity. Current `lathe-gcode-lint.mjs:70-78` only checks binary (is G50 present?). Production safety needs **continuo
... [+2704 chars truncated]
