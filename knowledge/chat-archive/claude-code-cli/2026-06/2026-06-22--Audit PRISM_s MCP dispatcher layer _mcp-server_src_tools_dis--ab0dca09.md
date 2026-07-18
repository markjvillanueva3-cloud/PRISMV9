---
type: "chat-session"
source: "claude-code-cli"
session_id: "ab0dca09-bdc3-4069-83d6-963041f28da6"
title: "Audit PRISM's MCP dispatcher layer (mcp-server/src/tools/dispatchers/*.ts) in H:"
date: "2026-06-22"
first_ts: "2026-06-22T13:43:48.383Z"
last_ts: "2026-06-22T13:49:49.347Z"
cwd: "H:\\prism"
messages: 84
user_msgs: 41
assistant_msgs: 43
raw_file: "H:/.claude/projects/H--prism/ab0dca09-bdc3-4069-83d6-963041f28da6/subagents/workflows/wf_bfbc1792-5ff/agent-af7995b7cd40b569c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Audit PRISM's MCP dispatcher layer (mcp-server/src/tools/dispatchers/*.ts) in H:

> **claude-code-cli** | 2026-06-22 | 84 msgs (41 user / 43 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ab0dca09-bdc3-4069-83d6-963041f28da6/subagents/workflows/wf_bfbc1792-5ff/agent-af7995b7cd40b569c.jsonl`

## Transcript

### User | 2026-06-22T13:43:48.383Z

Audit PRISM's MCP dispatcher layer (mcp-server/src/tools/dispatchers/*.ts) in H:/prism. GROUNDING (deterministic scout, slot:bravo 2026-06-22): 111 dispatchers, 14257 total actions (mcp-server/data/docs/DISPATCHER_DIGEST.md, regenerated today). Integrity detectors already run: dispatcher-import-liveness = 0 DEAD named imports; audit-dispatcher-engine-methods = 61 MISSING across 10 dispatchers (ledger state/shared/DISPATCHER-ENGINE-METHOD-AUDIT.{json,md}); audit-dispatcher-ghost-actions writes state/shared/DISPATCHER-GHOST-ACTION-AUDIT.json. NOTE: digest flags several dispatchers "(no server.tool found)" incl aiReasoningDispatcher (619 actions!), aiDispatcher (0), cplDispatcher (54), awarenessMiddleware (0), claudeAccountDispatcher (0) -- investigate whether genuinely unregistered/dead or a digest false-read. Big: camDispatcher 2488, calcDispatcher 1475, devDispatcher 1043, businessDispatcher 1042, aiReasoningDispatcher 619, cadDispatcher 600.

Use Bash (rtk), Read, Grep, Glob. Read REAL files -- do not guess. Cite file:line + exact numbers. Concise + rigorous; feeds a synthesis deciding ENHANCE-vs-BUILD. Return markdown: ## Findings (numbers + file:line), ## Severity (P0/P1/P2), ## Enhance-or-build signal.

DIMENSION = TEST COVERAGE (round-trip-through-dispatcher). (1) Glob mcp-server/src/__tests__/*dispatcher*.test.ts + *-wire.test.ts -- count vs 111 dispatchers. (2) Do the BIG dispatchers (cam/calc/dev/business/aiReasoning/cad) have wire tests through the registered handler vs only engine-singleton tests? (3) The CK-MS11 probe bug + 61 method-mismatches slipped past for lack of round-trip tests -- estimate round-trip coverage of 14257 actions. Is the test gap the root cause of the integrity bugs?

### Assistant | 2026-06-22T13:43:54.016Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:43:54.500Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:43:55.101Z

[tool_use: Bash]

### User | 2026-06-22T13:44:00.495Z

[tool_result] (Bash completed with no output)

### User | 2026-06-22T13:44:11.098Z

[tool_result] (Bash completed with no output)

### User | 2026-06-22T13:44:22.281Z

[tool_result] 0

### Assistant | 2026-06-22T13:44:24.933Z

[tool_use: Glob]

### Assistant | 2026-06-22T13:44:25.531Z

[tool_use: Glob]

### Assistant | 2026-06-22T13:44:25.797Z

[tool_use: Glob]

### User | 2026-06-22T13:44:48.730Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-22T13:44:48.804Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-22T13:44:48.879Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-22T13:44:51.630Z

The Glob tool is timing out on H:/prism. Let me use PowerShell directly.

### Assistant | 2026-06-22T13:44:52.571Z

[tool_use: PowerShell]

### Assistant | 2026-06-22T13:44:53.146Z

[tool_use: PowerShell]

### Assistant | 2026-06-22T13:44:53.752Z

[tool_use: PowerShell]

### User | 2026-06-22T13:44:54.942Z

[tool_result] [32;1mName[0m
[32;1m----[0m
adaptiveControlDispatcher.adaptive5.test.ts
adaptiveControlDispatcher.rtac.test.ts
adaptiveControlDispatcher.variability.test.ts
AEMonitoringDispatcherWiring.test.ts
agentDispatcher.test.ts
ai-dispatcher-knowledge-lineage-wire.test.ts
ai-dispatcher-ledger-wire.test.ts
ai-dispatcher-local-embedding-wire.test.ts
ai-dispatcher-p3-wire.test.ts
AIDispatcherCon
... [+22303 chars truncated]

### User | 2026-06-22T13:44:59.073Z

[tool_result] [32;1mName[0m
[32;1m----[0m
ai-dispatcher-knowledge-lineage-wire.test.ts
ai-dispatcher-ledger-wire.test.ts
ai-dispatcher-local-embedding-wire.test.ts
ai-dispatcher-p3-wire.test.ts
AIReasoningDispatcher.graphContextLens-wire.test.ts
AIReasoningDispatcher.graphrag-wire.test.ts
aiReasoningDispatcher.lora-bridge-wire.test.ts
aiReasoningDispatcher.lora-drift-wire.test.ts
AIReasoningDispat
... [+6057 chars truncated]

### User | 2026-06-22T13:45:04.007Z

[tool_result] [32;1mCount[0m
[32;1m-----[0m
  119

### Assistant | 2026-06-22T13:45:08.557Z

[tool_use: PowerShell]

### Assistant | 2026-06-22T13:45:09.844Z

[tool_use: PowerShell]

### User | 2026-06-22T13:45:12.070Z

[tool_result] Dispatcher test files: 555
Wire test files: 144
Total: 699
Dispatcher source files: 119

### User | 2026-06-22T13:45:15.807Z

[tool_result] adaptiveControlDispatcher
agentDispatcher
aiDispatcher
aiReasoningDispatcher
algorithmDispatcher
algorithmDispatcher.fuzzy.synergy.test
algorithmDispatcher.synergy.test
atcsDispatcher
authDispatcher
automationDispatcher
autonomousDispatcher
autoPilotDispatcher
awarenessMiddleware
awarenessMiddleware.test
bridgeDispatcher
businessDispatcher
cadAutomationDispatcher
cadDispatcher
ca
... [+2181 chars truncated]

### Assistant | 2026-06-22T13:45:23.253Z

[tool_use: PowerShell]

### Assistant | 2026-06-22T13:45:24.947Z

[tool_use: PowerShell]

### User | 2026-06-22T13:45:25.626Z

[tool_result] TOTAL dispatcher source files (excluding test files within /dispatchers): 111

Dispatchers with NO matching test file:
  - authDispatcher
  - autonomousDispatcher
  - autoPilotDispatcher
  - awarenessMiddleware
  - cadDrawingKnowledgeDispatcher
  - cimcoDispatcher
  - claudeAccountDispatcher
  - cncOpsDispatcher
  - complianceDispatcher
  - cplDispatcher
  - documentLearningDispatcher
... [+1280 chars truncated]

### User | 2026-06-22T13:45:27.883Z

[tool_result] > | aiDispatcher | ([7mno server.tool[0m found) | 0 |
> | aiReasoningDispatcher | ([7mno server.tool[0m found) | 619 |[0m
[7m[0m  | algorithmDispatcher | prism_algorithm — Algorithm execution dispatcher (${ACTIONS.length} actions... | 72 |[0m
> | awarenessMiddleware | ([7mno server.tool[0m found) | 0 |[0m
[7m[0m  | bridgeDispatcher | prism_bridge — Multi-protocol API gateway for e
... [+2138 chars truncated]

### Assistant | 2026-06-22T13:45:31.677Z

[tool_use: PowerShell]

### User | 2026-06-22T13:45:34.457Z

[tool_result] Dispatchers with 'no server.tool found' (16):
| aiDispatcher | (no server.tool found) | 0 |
| aiReasoningDispatcher | (no server.tool found) | 619 |
| awarenessMiddleware | (no server.tool found) | 0 |
| claudeAccountDispatcher | (no server.tool found) | 0 |
| cplDispatcher | (no server.tool found) | 54 |
| intakeDispatcher | (no server.tool found) | 1 |
| machineDispatcher | (no server.too
... [+496 chars truncated]

### Assistant | 2026-06-22T13:45:35.017Z

[tool_use: PowerShell]

### User | 2026-06-22T13:45:37.045Z

[tool_result] === aiReasoningDispatcher.ts: server.tool search ===

mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts:5338:  [7mserver.tool[0m(

=== cplDispatcher.ts: server.tool search ===

=== cplDispatcher.ts first 30 lines ===
/**
 * cplDispatcher — CAM-Pipeline Track Dispatcher
 *
 * Routes all CPL-track engine actions. Covers:
 * - CPL-MS2: Novel algorithms (clothoid, PH curves, Voron
... [+870 chars truncated]

### Assistant | 2026-06-22T13:45:42.164Z

[tool_use: PowerShell]

### Assistant | 2026-06-22T13:45:43.301Z

[tool_use: PowerShell]

### User | 2026-06-22T13:45:44.451Z

[tool_result] cplDispatcher.ts total lines: 346
    case "nl_cam_command":
    case "gcode_diff":
    case "dfm_analyze":
    case "dfm_feedback":
    case "cam_validate":
    case "integration_test": {
      // Lazy-load CPL-MS4 engines with method routing
      try {
        const { camKernelExtensionEngine: eng } = await import("../../engines/CAMKernelExtensionEngine.js");
        const methodMap: 
... [+1527 chars truncated]

### User | 2026-06-22T13:45:45.883Z

[tool_result] aiDispatcher.ts total lines: 94
/**
 * AI Dispatcher
 * Handles model routing and intelligent task delegation between local and cloud models.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerAIDispatcher(server: McpServer): void {
  (server as any).tool(
    "prism_ai",
    "AI model routing and task delegation.
... [+2029 chars truncated]

### Assistant | 2026-06-22T13:45:55.029Z

[tool_use: PowerShell]

### User | 2026-06-22T13:45:56.649Z

[tool_result] aiReasoningDispatcher.ts total lines: 5347
server.tool() occurrences: 1
  Line 5338: server.tool(

### Assistant | 2026-06-22T13:45:58.392Z

[tool_use: PowerShell]

### User | 2026-06-22T13:46:01.145Z

[tool_result] memoryDispatcher | lines=1528 | server.tool=False | export-register=True
shopDispatcher | lines=1983 | server.tool=True | export-register=True
machineDispatcher | lines=1117 | server.tool=True | export-register=True
mlDispatcher | lines=1411 | server.tool=False | export-register=True
multiDispatcher | lines=830 | server.tool=True | export-register=True
outcomeDispatcher | lines=679 | server.t
... [+104 chars truncated]

### system

... [4 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-22T13:46:18.756Z

[tool_use: PowerShell]

### User | 2026-06-22T13:46:20.425Z

[tool_result] Ghost action audit schema fields: generatedAt, dispatcherDir, method, stats, candidates, routingBlind, noActionArray

### Assistant | 2026-06-22T13:46:24.414Z

[tool_use: PowerShell]

### User | 2026-06-22T13:46:26.077Z

[tool_result] camDispatcher | all_tests=35 | wire_tests=18 | digest: camDispatcher| prism_cam — CAM/Toolpath dispatcher — toolpath generation, simulation...| 2488
calcDispatcher | all_tests=19 | wire_tests=11 | digest: calcDispatcher| prism_calc — Manufacturing calculations: cutting force, tool life, spe...| 1475
devDispatcher | all_tests=58 | wire_tests=26 | digest: devDispatcher| prism_dev — Dev workflow to
... [+1104 chars truncated]

### Assistant | 2026-06-22T13:46:31.245Z

[tool_use: PowerShell]

### Assistant | 2026-06-22T13:46:33.151Z

[tool_use: PowerShell]

### User | 2026-06-22T13:46:33.215Z

[tool_result] Stats: {
  "scanned": 111,
  "provenClean": 85,
  "candidatesNeedRuntimeProbe": 0,
  "routingNotStaticallyVisible": 4,
  "noActionArray": 22,
  "confirmedGhosts": 0
}

Routing blind dispatchers:
  - cadDrawingKnowledgeDispatcher.ts: 
  - machiningKnowledgeBaseDispatcher.ts: 
  - secondaryOpsDispatcher.ts: 
  - threadingPipelineDispatcher.ts: 

No action array dispatchers:
  - aiDis
... [+576 chars truncated]

### User | 2026-06-22T13:46:34.719Z

[tool_result] Total ghost action candidates: 0

### Assistant | 2026-06-22T13:46:44.735Z

[tool_use: PowerShell]

### Assistant | 2026-06-22T13:46:49.623Z

[tool_use: PowerShell]

### User | 2026-06-22T13:46:54.518Z

[tool_result] calcDispatcher wire tests: 11
  calcDispatcher.campaign-wire.test.ts: tests 0 actions: 
  calcDispatcher.peck-drill-optimize-wire.test.ts: tests 0 actions: 
  calcDispatcher.quick-calc-wire.test.ts: tests 0 actions:

### User | 2026-06-22T13:46:57.105Z

[tool_result] Total wire test files: 144
camDispatcher: 18 wire files | ~5 unique actions tested
calcDispatcher: 11 wire files | ~4 unique actions tested
devDispatcher: 26 wire files | ~3 unique actions tested
businessDispatcher: 8 wire files | ~6 unique actions tested
aiReasoningDispatcher: 5 wire files | ~0 unique actions tested

### Assistant | 2026-06-22T13:47:00.688Z

[tool_use: PowerShell]

### Assistant | 2026-06-22T13:47:01.446Z

[tool_use: PowerShell]

### User | 2026-06-22T13:47:03.403Z

[tool_result] /**
 * calcDispatcher × QuickCalcEngine wire — orphan-rescue wiring (OBSIDIAN-PRISM-OS-MS0).
 *
 * Before this wire: QuickCalcEngine was an orphan — built (161 LoC, 10 pure methods,
 * 14 vitest cases in quick-calc-engine.test.ts) but with no dispatcher reference.
 *
 * After this wire: 10 new prism_calc actions surface every engine method:
 *   quick_rpm · quick_feed_rate · quick_mrr · qui
... [+2433 chars truncated]

### User | 2026-06-22T13:47:07.390Z

[tool_result] /**
 * OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-GCODE-TEMPLATE — wire test
 *
 * Verifies 5 GCodeTemplateEngine actions land through camDispatcher's prism_cam tool:
 *   gcode_template_resolve_controller — alias → ControllerConfig
 *   gcode_template_generate            — controller + op + params → GCodeResult
 *   gcode_template_generate_program    — controller + ordered ops → composite GCodeR
... [+2223 chars truncated]

### Assistant | 2026-06-22T13:47:16.002Z

[tool_use: PowerShell]

### User | 2026-06-22T13:47:18.738Z

[tool_result] calcDispatcher.quick-calc-wire.test.ts: 0 actions: 
camDispatcher.gcode-template-wire.test.ts: 5 actions: gcode_template_generate, gcode_template_generate_program, gcode_template_list_controllers, gcode_template_list_operations, gcode_template_resolve_controller
devDispatcher.impact-analysis-wire.test.ts: 0 actions: 
businessDispatcher.commission-wire.test.ts: 0 actions: 
AIReasoningDispatcher
... [+32 chars truncated]

### Assistant | 2026-06-22T13:47:22.901Z

[tool_use: PowerShell]

### User | 2026-06-22T13:47:24.626Z

[tool_result] Wire tests (*-wire.test.ts): 144 files
  Total action invocations: 192
  Unique action names: 68
  Coverage of 14257 total actions: 0.5%

### Assistant | 2026-06-22T13:47:30.779Z

[tool_use: PowerShell]

### Assistant | 2026-06-22T13:47:32.392Z

[tool_use: PowerShell]

### User | 2026-06-22T13:47:32.621Z

[tool_result] All dispatcher tests: 555 files
  Total literal action invocations: 627
  Unique action names: 245
  Coverage estimate of 14257 total actions: 1.7%

### User | 2026-06-22T13:47:38.462Z

[tool_result] /**
 * E2E test: U-CAM74..U-CAM78 dispatcher wiring (CAM-EXHAUST-MS0)
 * ===========================================================================
 * Verifies all 5 new CAM engine actions reach their engine and return
 * production-mode results when invoked through camDispatcher.
 */

import { describe, it, expect } from "vitest";
import { ACTIONS, registerCamDispatcher } from "../tools/
... [+3413 chars truncated]

### Assistant | 2026-06-22T13:47:42.169Z

Good. I now have enough data. Let me read the DISPATCHER_DIGEST summary line count to confirm the 16 "no server.tool" entries, then compile the findings.

### Assistant | 2026-06-22T13:47:49.503Z

[tool_use: PowerShell]

### User | 2026-06-22T13:47:52.321Z

[tool_result] aiDispatcher : 0 actions
aiReasoningDispatcher : 619 actions
awarenessMiddleware : 0 actions
claudeAccountDispatcher : 0 actions
cplDispatcher : 54 actions
intakeDispatcher : 1 actions
machineDispatcher : 69 actions
memoryDispatcher : 57 actions
mlDispatcher : 129 actions
multiDispatcher : 49 actions
outcomeDispatcher : 46 actions
processDispatcher : 17 actions
sessionDocNodesAction : 
... [+233 chars truncated]

### Assistant | 2026-06-22T13:47:53.735Z

[tool_use: PowerShell]

### User | 2026-06-22T13:48:01.465Z

[tool_result] memoryDispatcher | .tool()=True | export-register=True | exported=True
mlDispatcher | .tool()=True | export-register=True | exported=True
cplDispatcher | .tool()=False | export-register=False | exported=True
aiDispatcher | .tool()=True | export-register=True | exported=True
intakeDispatcher | .tool()=True | export-register=True | exported=True
outcomeDispatcher | .tool()=True | export-registe
... [+166 chars truncated]

### Assistant | 2026-06-22T13:48:07.533Z

[tool_use: PowerShell]

### Assistant | 2026-06-22T13:48:09.277Z

[tool_use: PowerShell]

### User | 2026-06-22T13:48:12.296Z

[tool_result] Exit code 1
mcp-server\src\tools\dispatchers\cplDispatcher.ts:2: * [7mcplDispatcher[0m — CAM-Pipeline Track Dispatcher
mcp-server\src\tools\dispatchers\cplDispatcher.ts:10: * @module [7mcplDispatcher[0m
mcp-server\src\tools\dispatchers\cplDispatcher.ts:15:import { ACTION_CPL_SCHEMAS } [7mfrom "../../schemas/cpl[0mActionSchemas.js";
mcp-server\src\tools\dispatchers\cplDispatcher.ts:84:expo
... [+808 chars truncated]

### User | 2026-06-22T13:48:14.484Z

[tool_result] /**
 * E2E test for ENGINE-WIRE-CAM-MS0/U-WIRE-CAM-BATCH1 — 6 unwired CAM engines
 * wired into camDispatcher (prism_cam).
 */
import { describe, it, expect } from "vitest";
import { CAMRecommendEngine } from "../engines/CAMRecommendEngine.js";
import { HSMDwellAtCornerEngine } from "../engines/HSMDwellAtCornerEngine.js";

const TOOL_DIA_MM = 12;
const FZ_MM = 0.1;
const RPM = 8000;
con
... [+2600 chars truncated]

### Assistant | 2026-06-22T13:48:18.766Z

[tool_use: PowerShell]

### User | 2026-06-22T13:48:22.758Z

[tool_result] /**
 * E2E test for ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH1 — 6 unwired lathe
 * engines wired into turningDispatcher (prism_turning).
 */
import { describe, it, expect } from "vitest";
import { latheCSSOptimizerEngine } from "../engines/LatheCSSOptimizerEngine.js";
import { latheChipMechanicsEngine } from "../engines/LatheChipMechanicsEngine.js";
import { latheCoolantAdvisorEngine } from
... [+1407 chars truncated]

### Assistant | 2026-06-22T13:48:24.224Z

[tool_use: PowerShell]

### User | 2026-06-22T13:48:26.737Z

[tool_result] Total UnwiredBatch (singleton-only) test files: 25

[32;1mName[0m
[32;1m----[0m
aiReasoningDispatcherUnwiredBatch1.test.ts
cadAutomationDispatcherUnwiredBatch1.test.ts
camDispatcherUnwiredBatch1.test.ts
edmDispatcherUnwiredBatch1.test.ts
edmDispatcherUnwiredBatch2.test.ts
edmDispatcherUnwiredBatch3.test.ts
edmDispatcherUnwiredBatch4.test.ts
edmDispatcherUnwiredBatch5.test.ts
edmDis
... [+735 chars truncated]

### Assistant | 2026-06-22T13:48:45.470Z

[tool_use: PowerShell]

### User | 2026-06-22T13:48:47.307Z

[tool_result] === DIMENSION: TEST COVERAGE SUMMARY ===

111 dispatcher source files
14,257 total registered actions

Test file counts:
  555 dispatcher test files (*dispatcher*.test.ts)
  144 dedicated wire test files (*-wire.test.ts)
  432 tests with genuine round-trip (register -> handler invoke)
  25  UnwiredBatch tests (singleton-only, bypass dispatcher)
  58  dispatcher source files with NO test 
... [+898 chars truncated]

### Assistant | 2026-06-22T13:49:49.347Z

## Findings

### 1. Test file inventory vs dispatcher count

- **111** dispatcher source files in `mcp-server/src/tools/dispatchers/`
- **555** `*dispatcher*.test.ts` files + **144** `*-wire.test.ts` files = **699 total**
- **432** of those 699 have genuine round-trip pattern (capture `registerXxxDispatcher` into a fake server, invoke handler directly) — confirmed by `register\w+Dispatcher|fakeServer|MockMCPServer|capturedHandler` pattern
- **25** are `*UnwiredBatch*.test.ts` — these are **singleton-only**: they import and call the engine class directly, completely bypassing the dispatcher routing layer (e.g. `camDispatcherUnwiredBatch1.test.ts:8` imports `CAMRecommendEngine` directly; `turningDispatcherUnwiredBatch1.test.ts:8` imports `latheCSSOptimizerEngine` directly). These test the engine but provide zero proof that the action string routes correctly through the dispatcher.
- **58** dispatcher source files have **no test file at all** (grep-verified: authDispatcher, autonomousDispatcher, autoPilotDispatcher, awarenessMiddleware, cadDrawingKnowledgeDispatcher, cimcoDispatcher, claudeAccountDispatcher, cncOpsDispatcher, complianceDispatcher, cplDispatcher, documentLearningDispatcher, exportDispatcher, feasibilityDispatcher, fiveAxisDispatcher, fluidThermalDispatcher, formingCastingDispatcher, generatorDispatcher, grindingDispatcher, gsdDispatcher, hermesDispatcher, holePatternDispatcher, inboxDispatcher, industryDispatcher, infraDispatcher, intakeDispatcher, integrationDispatcher, l2EngineDispatcher, machineLiveDispatcher, machiningKnowledgeBaseDispatcher, materialProcessingDispatcher, mechanicalDesignDispatcher, multiAxisProgramDispatcher, multiOpDispatcher, nlHookDispatcher, omegaDispatcher, partsLibraryDispatcher, pfpDispatcher, processControlDispatcher, productDispatcher, provenPipelineDispatcher, resourceHarvesterDispatcher, resourceHarvestingDispatcher, schedulingDispatcher, scientificMathDispatcher, secondaryOpsDispatcher, securityDispatcher, sessionDocNod
... [+8272 chars truncated]
