---
type: "chat-session"
source: "claude-code-cli"
session_id: "7979e425-2dbf-471a-ad68-c7177d2219a4"
title: "Research enrichment data for the **delta** chat slot in PRISM. Delta's domain is"
date: "2026-05-26"
first_ts: "2026-05-26T03:17:32.099Z"
last_ts: "2026-05-26T03:49:50.245Z"
cwd: "H:\\prism"
messages: 70
user_msgs: 31
assistant_msgs: 39
raw_file: "H:/.claude/projects/H--prism/7979e425-2dbf-471a-ad68-c7177d2219a4/subagents/agent-a3e21b3fbd0cf1a95.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Research enrichment data for the **delta** chat slot in PRISM. Delta's domain is

> **claude-code-cli** | 2026-05-26 | 70 msgs (31 user / 39 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7979e425-2dbf-471a-ad68-c7177d2219a4/subagents/agent-a3e21b3fbd0cf1a95.jsonl`

## Transcript

### User | 2026-05-26T03:17:32.099Z

Research enrichment data for the **delta** chat slot in PRISM. Delta's domain is **CAD** (per JULIETT-12CHAT-ALLOCATION-MS0 partition).

This is for ZEBRA-CHAT-SLOT-NODES-MS1 enrichment — populating an in-memory node graph. You're returning structured data ONLY — no edits.

**Return a single fenced JSON block** with this exact shape (top-K=5 per substrate):

```json
{
  "slot": "delta",
  "domain": "cad",
  "engineRefs": [
    {"id": "EngineClassName", "path": "mcp-server/src/engines/EngineClassName.ts", "rationale": "1-line why this is cad-canonical"}
  ],
  "tribalRefs": [
    {"id": "tip-id-or-filename", "path": "knowledge/tribal/...md", "rationale": "1-line"}
  ],
  "wikiRefs": [
    {"slug": "wiki-entry-slug", "path": "knowledge/wiki/...md", "rationale": "1-line"}
  ],
  "resourceRefs": [
    {"kind": "step|cad|print|jm-die-folder", "path": "...", "rationale": "1-line"}
  ],
  "aiFeatureRefs": [
    {"id": "PRISMSomeEngineName", "path": "mcp-server/src/engines/PRISMSomeEngine.ts", "rationale": "1-line"}
  ],
  "activeWorkRefs": [
    {"commitSha": "abc1234", "subject": "[SCOPE]/U-ID short", "rationale": "1-line"}
  ]
}
```

**Search strategy:**
1. **Engines**: `mcp-server/src/engines/` — CADFeatureRecognize / CADGeometry / CADTopology / STEP / blueprint / fusion / inventor / solidworks engines. Cross-ref ENGINE_DIGEST.md + dispatcher `prism_cad`. Top-5 canonical.
2. **Tribal**: `knowledge/tribal/` — cad / blueprint / step-extract / drafting tribal tips. Top-5.
3. **Wiki**: `knowledge/wiki/` — grep for "cad" "blueprint" "step" "fusion" in titles. Top-3. Recent work includes cad-pipeline-closed-loop entries.
4. **Resources**: STEP/CAD files used in regression tests. Look at `H:/PRISM/JM DIE/` for representative blueprint/STEP examples. Also `mcp-server/data/cad-test-fixtures/` if exists. Top-3.
5. **AI features**: PRISM*Engine that scope to cad. Top-3.
6. **Active work**: `rtk git log --grep="slot:delta" --max-count=20 --oneline` — recent delta commits (cad-pipel
... [+261 chars truncated]

### Assistant | 2026-05-26T03:17:45.553Z

I'll search for delta/CAD-domain enrichment data across the PRISM codebase.

### Assistant | 2026-05-26T03:17:45.844Z

[tool_use: Glob]

### Assistant | 2026-05-26T03:17:46.007Z

[tool_use: Glob]

### Assistant | 2026-05-26T03:17:46.369Z

[tool_use: Bash]

### Assistant | 2026-05-26T03:17:46.226Z

[tool_use: Glob]

### User | 2026-05-26T03:17:59.623Z

[tool_result] mcp-server\src\engines\BatchProcessor.ts
mcp-server\src\engines\DfMRulesEngine.ts
mcp-server\src\engines\DiffEngine.ts
mcp-server\src\engines\FinancialAnalysisEngine.ts
mcp-server\src\engines\GCodeTemplateEngine.ts
mcp-server\src\engines\IntentDecompositionEngine.ts
mcp-server\src\engines\PurchasingDirectoryEngine.ts
mcp-server\src\engines\SpindleProtectionEngine.ts
mcp-server\src\engines\Sustaina
... [+4307 chars truncated]

### User | 2026-05-26T03:18:17.626Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-26T03:18:17.649Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-26T03:20:25.956Z

[tool_result] 3d7535feed [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-TRAINING-ORCHESTRATOR (slot:charlie /goal-yolo ...
b9c6ac1b55 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-DYNAMIC-SHOP-RATE (slot:charlie /goal-20 iter19): ...
f673354a65 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-EMPLOYEE-PAYROLL-GROSS-PAY (slot:hotel iter19 /goal): ERP capsto...
4e52127792 [MAIN] [BOOTSTRAP-SLOT-ENF
... [+2019 chars truncated]

### Assistant | 2026-05-26T03:20:28.090Z

Now let me search for CAD-specific engines and resources more narrowly:

### Assistant | 2026-05-26T03:20:28.947Z

[tool_use: Grep]

### Assistant | 2026-05-26T03:20:29.362Z

[tool_use: Bash]

### Assistant | 2026-05-26T03:20:29.587Z

[tool_use: Bash]

### Assistant | 2026-05-26T03:20:29.845Z

[tool_use: Bash]

### User | 2026-05-26T03:20:41.668Z

[tool_result] Found 30 files limit: 30
mcp-server\src\engines\JMDieErpSimulationEngine.ts
mcp-server\src\engines\EmployeeDailyDigestEngine.ts
mcp-server\src\engines\EmployeeShiftScheduleEngine.ts
mcp-server\src\engines\EmployeePerformanceFeedbackEngine.ts
mcp-server\src\engines\EmployeeRoleAcademyInjectionEngine.ts
mcp-server\src\engines\PostFeatureAuditEngine.ts
mcp-server\src\engines\SafetyTrainingRecordEngin
... [+1260 chars truncated]

### User | 2026-05-26T03:21:19.768Z

[tool_result] H:/prism/knowledge/wiki/.hook-cache/1c85cc3b40dde1ea048391cb213b8a0403cad330.json
H:/prism/knowledge/wiki/.hook-cache/24e71509405608fefe98912e06a5982cad2dec43.json
H:/prism/knowledge/wiki/.hook-cache/30ec2ae7cc27401e6faca17cad09ed6808452d62.json
H:/prism/knowledge/wiki/.hook-cache/31b84dbfa249394ae5cad4f316fac3d59028a50c.json
H:/prism/knowledge/wiki/.hook-cache/41a2a70e38017bde0c92e5a5b28bdcecad87
... [+1239 chars truncated]

### User | 2026-05-26T03:21:20.372Z

[tool_result] H:/prism/knowledge/tribal/bobcad-cam-tips-bc-001.md
H:/prism/knowledge/tribal/bobcad-cam-tips-bc-002.md
H:/prism/knowledge/tribal/bobcad-cam-tips-bc-003.md
H:/prism/knowledge/tribal/bobcad-cam-tips-bc-004.md
H:/prism/knowledge/tribal/bobcad-cam-tips-bc-005.md
H:/prism/knowledge/tribal/bobcad-cam-tips-bc-006.md
H:/prism/knowledge/tribal/bobcad-cam-tips-bc-007.md
H:/prism/knowledge/tribal/bobcad-cam
... [+639 chars truncated]

### User | 2026-05-26T03:21:56.093Z

[tool_result] 66541e6497 [LIMA] [PRISM-ACADEMY-FEATURES-MS0]/U-WEB-WIRE-35-42 (slot:lima it...
ccb76c4347 [delta] [CAD-PIPELINE-WIRE-MS0]/U-CAD-FULL-CORPUS-ROUNDTRIP (slot:...
845bcae13c [delta] [CAD-PIPELINE-WIRE-MS0]/U-CAD-FULL-CORPUS-ROUNDTRIP (slot:...
94c2218b26 [delta] [CAD-PIPELINE-WIRE-MS0]/U-CAD-ROUNDTRIP-AND-4CAM (slot:del...
4e52127792 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-EMPLOYEE-ROLE-ACADEMY-I
... [+85 chars truncated]

### Assistant | 2026-05-26T03:21:57.765Z

I'll continue searching for delta/CAD enrichment data with more targeted queries.

### Assistant | 2026-05-26T03:21:58.273Z

[tool_use: Bash]

### Assistant | 2026-05-26T03:21:58.615Z

[tool_use: Bash]

### Assistant | 2026-05-26T03:21:59.021Z

[tool_use: Bash]

### Assistant | 2026-05-26T03:21:59.199Z

[tool_use: Read]

### User | 2026-05-26T03:25:58.545Z

[tool_result] H:/prism/knowledge/wiki/architecture/actions/aireasoning/cascade-calibrate.md
H:/prism/knowledge/wiki/architecture/actions/aireasoning/cascade-run.md
H:/prism/knowledge/wiki/architecture/actions/aireasoning/cascade-status.md
H:/prism/knowledge/wiki/architecture/actions/business/blueprint-resolve-material.md
H:/prism/knowledge/wiki/architecture/actions/business/blueprint-to-quote.md
H:/prism/knowle
... [+328 chars truncated]

### User | 2026-05-26T03:26:30.645Z

[tool_result] 1	/**
2	 * PartMediaToCADEngine — generate a starting-bad parametric CAD scaffold
3	 * from photos and/or video of a PHYSICAL part (reverse engineering).
4	 *
5	 * **Distinct from existing assets (dedup-checked 2026-05-25, slot:echo):**
6	 *   • `BlueprintVisionOCREngine` — orthographic engineering drawings (dim
7	 *     lines, GD&T, title block). Tuned for blueprints, not raw part photos.
8	 *   
... [+26022 chars truncated]

### User | 2026-05-26T03:28:00.149Z

[tool_result] H:/prism/mcp-server/data/box-extraction/step-file-index.json
H:/prism/mcp-server/data/cad-functions/fusion360/assembly-operations.json
H:/prism/mcp-server/data/cad-functions/fusion360/drawing-operations.json
H:/prism/mcp-server/data/cad-functions/fusion360/feature-operations.json
H:/prism/mcp-server/data/cad-functions/fusion360/function-index.json
H:/prism/mcp-server/data/cad-functions/fusion360/m
... [+313 chars truncated]

### User | 2026-05-26T03:28:03.308Z

[tool_result] BASEBALL PARTS/
CNC LATHE/
CNC MILL HAAS/
CNC OKUMA MULTUS/
GENERAL BANDAGES/
HAAS-HURCO/
HURCO CNC PROGRAMS/
JM DIE COMPANY/
LATHE/
MACRO PROGRAMS/
MATTHEW programs/
OKUMA/
POST PROCESSORS/
PRISM CAD TESTING/
PRISM MODIFIED POST PROCESSORS/
QUEUE/
REVERSE ENGINEERING/
ROKU-ROKU/
SETUPS/
WIRE EDM/

### Assistant | 2026-05-26T03:28:05.282Z

Let me search for more specific CAD and delta-related resources:

### Assistant | 2026-05-26T03:28:05.729Z

[tool_use: Bash]

### Assistant | 2026-05-26T03:28:06.164Z

[tool_use: Bash]

### Assistant | 2026-05-26T03:28:06.583Z

[tool_use: Read]

### Assistant | 2026-05-26T03:28:07.033Z

[tool_use: Bash]

### User | 2026-05-26T03:28:26.083Z

[tool_result] 1	---
2	id: "bc-001"
3	title: "Adaptive Roughing Maintains Constant Tool Engagement"
4	source: "web:bobcad-adaptive-roughing"
5	confidence: 93
6	category: "cam_strategy"
7	tags: ["adaptive-roughing", "trochoidal", "constant-engagement", "tool-life", "mrr"]
8	_source: "bobcad-cam-tips.ts"
9	indexed_at: 2026-04-28T01:00:41.444Z
10	---
11	
12	# Adaptive Roughing Maintains Constant Tool Engagement
13	
... [+1034 chars truncated]

### User | 2026-05-26T03:30:29.185Z

[tool_result] arc.md  885B
assembly-add-component.md  1018B
assembly-add-mate.md  983B
assembly-bom.md  948B
assembly-create.md  969B
assembly-position.md  983B
assembly-to-cadquery.md  1004B
assembly.md  894B
available.md  902B
blisk-generate.md  963B
blisk-list-profiles.md  998B
blisk-recommend-blades.md  1019B
blisk-validate.md  963B
blisk.md  873B
blueprint-coverage-audit.md  1007B
blueprint-coverage-by-cus
... [+154 chars truncated]

### User | 2026-05-26T03:30:31.252Z

[tool_result] H:/prism/mcp-server/src/engines/AutoCADAddinPluginEngine.ts
H:/prism/mcp-server/src/engines/AutoCADDotNetBridgeEngine.ts
H:/prism/mcp-server/src/engines/BliskCADEngine.ts
H:/prism/mcp-server/src/engines/BlueprintCorpusHarvestEngine.ts
H:/prism/mcp-server/src/engines/BlueprintCoverageAuditEngine.ts
H:/prism/mcp-server/src/engines/BlueprintExtractionRAGEngine.ts
H:/prism/mcp-server/src/engines/Bluep
... [+513 chars truncated]

### User | 2026-05-26T03:31:28.289Z

[tool_result] ccb76c4347 [delta] [CAD-PIPELINE-WIRE-MS0]/U-CAD-FULL-CORPUS-ROUNDTRIP (slot:...
845bcae13c [delta] [CAD-PIPELINE-WIRE-MS0]/U-CAD-FULL-CORPUS-ROUNDTRIP (slot:...
94c2218b26 [delta] [CAD-PIPELINE-WIRE-MS0]/U-CAD-ROUNDTRIP-AND-4CAM (slot:del...

### Assistant | 2026-05-26T03:31:30.458Z

Let me search for the remaining enrichment categories more efficiently:

### Assistant | 2026-05-26T03:31:30.912Z

[tool_use: Read]

### Assistant | 2026-05-26T03:31:31.551Z

[tool_use: Bash]

### Assistant | 2026-05-26T03:31:31.964Z

[tool_use: Bash]

### Assistant | 2026-05-26T03:31:32.353Z

[tool_use: Bash]

### User | 2026-05-26T03:31:54.591Z

[tool_result] 1	/**
2	 * BlueprintToAllCADsOrchestratorEngine — image-to-6-CAD end-to-end pipeline
3	 * (CAD-COMPLETE-MS0/U-CADC-BPRINT-OCR-ORCH-01)
4	 *
5	 * Composes BlueprintVisionOCREngine + printToAllCADsOrchestrator. Closes the
6	 * last gap from claude-bf484a46's resume directive: "wire BlueprintVisionOCREngine
7	 * output → bridge in an end-to-end pipeline action".
8	 *
9	 * Two-mode entry surface:
10	 
... [+1680 chars truncated]

### User | 2026-05-26T03:32:30.062Z

[tool_result] ccb76c4347 [delta] [CAD-PIPELINE-WIRE-MS0]/U-CAD-FULL-CORPUS-ROUNDTRIP (slot:...
845bcae13c [delta] [CAD-PIPELINE-WIRE-MS0]/U-CAD-FULL-CORPUS-ROUNDTRIP (slot:...
94c2218b26 [delta] [CAD-PIPELINE-WIRE-MS0]/U-CAD-ROUNDTRIP-AND-4CAM (slot:del...

### User | 2026-05-26T03:33:18.005Z

[tool_result] PRISM_2475-037_Extrude_Punch Drawing v1.pdf  147.9K

### User | 2026-05-26T03:33:23.952Z

[tool_result] H:/prism/knowledge/wiki/architecture/actions/cad/arc.md
H:/prism/knowledge/wiki/architecture/actions/cad/assembly-add-component.md
H:/prism/knowledge/wiki/architecture/actions/cad/assembly-add-mate.md
H:/prism/knowledge/wiki/architecture/actions/cad/assembly-bom.md
H:/prism/knowledge/wiki/architecture/actions/cad/assembly-create.md
H:/prism/knowledge/wiki/architecture/actions/cad/assembly-position
... [+615 chars truncated]

### Assistant | 2026-05-26T03:33:25.900Z

Let me complete the search with targeted queries for the remaining substrates:

### Assistant | 2026-05-26T03:33:26.338Z

[tool_use: Bash]

### Assistant | 2026-05-26T03:33:26.980Z

[tool_use: Bash]

### Assistant | 2026-05-26T03:33:27.369Z

[tool_use: Bash]

### Assistant | 2026-05-26T03:33:27.600Z

[tool_use: Read]

### User | 2026-05-26T03:34:11.454Z

[tool_result] H:/prism/mcp-server/src/engines/AdvancedPostProcessorEngine.ts:      lines.push(`Q389=${config.max_stepover.toFixed(2)} ;STEPOVER`);
H:/prism/mcp-server/src/engines/AIExtractionReasonerEngine.ts:    reasoningChain.push("STEP 1: Classifying content with AI reasoning...");
H:/prism/mcp-server/src/engines/AIExtractionReasonerEngine.ts:    reasoningChain.push("STEP 2: Determining optimal routing with 
... [+290 chars truncated]

### User | 2026-05-26T03:38:48.813Z

[tool_result] Command running in background with ID: bcjp12aq8. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\7979e425-2dbf-471a-ad68-c7177d2219a4\tasks\bcjp12aq8.output. You will be notified when it completes. To check interim output, use Read on that file path.

### User | 2026-05-26T03:44:19.912Z

[tool_result] Command running in background with ID: bslpvsncd. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\7979e425-2dbf-471a-ad68-c7177d2219a4\tasks\bslpvsncd.output. You will be notified when it completes. To check interim output, use Read on that file path.

### User | 2026-05-26T03:44:35.922Z

[tool_result] 1	---
2	title: cad:arc
3	type: action
4	action_id: disp.caddispatcher.action.arc
5	dispatcher: cad
6	action_name: arc
7	parent_layer: L4a
8	generated_by: scripts/generate-action-wiki.mjs
9	last_verified: 2026-05-11
10	tags: [action, dispatcher-cad, manufacturing]
11	related:
12	  - knowledge/wiki/architecture/dispatcher-cad.md
13	  - knowledge/wiki/architecture/layer-l4a.md
14	---
15	
16	# cad:`ar
... [+557 chars truncated]

### Assistant | 2026-05-26T03:44:38.151Z

Let me refine my search with simpler commands:

### Assistant | 2026-05-26T03:44:38.588Z

[tool_use: Bash]

### Assistant | 2026-05-26T03:44:39.023Z

[tool_use: Bash]

### Assistant | 2026-05-26T03:44:39.197Z

[tool_use: Read]

### User | 2026-05-26T03:45:04.847Z

[tool_result] 1	/**
2	 * GeometryEngine — L2-P2-MS1 CAD/CAM Layer
3	 *
4	 * High-level geometry operations: boolean ops, offset, fillet, chamfer,
5	 * distance, area/volume, bounding box, coordinate transforms.
6	 * Composes CADKernelEngine primitives into manufacturing-useful operations.
7	 *
8	 * Actions: geometry_create, geometry_transform, geometry_analyze,
9	 *          geometry_boolean, geometry_offset, g
... [+1035 chars truncated]

### User | 2026-05-26T03:45:54.262Z

[tool_result] AtomicStepDecomposerEngine.ts  7.2K
AutoAdjustCascadeEngine.ts  28.6K
AutoCADAddinPluginEngine.ts  14.4K
AutoCADDotNetBridgeEngine.ts  14.1K
BliskCADEngine.ts  28.0K
BlueprintCorpusHarvestEngine.ts  22.3K
BlueprintCoverageAuditEngine.ts  10.2K
BlueprintExtractionRAGEngine.ts  21.0K
BlueprintLoRABridgeEngine.ts  13.0K
BlueprintOCRAdapter.ts  8.0K
BlueprintOCREngine.ts  35.7K
BlueprintProgramJoinEng
... [+320 chars truncated]

### User | 2026-05-26T03:47:35.869Z

[tool_result] arc.md  885B
assembly-add-component.md  1018B
assembly-add-mate.md  983B
assembly-bom.md  948B
assembly-create.md  969B
assembly-position.md  983B
assembly-to-cadquery.md  1004B
assembly.md  894B
available.md  902B
blisk-generate.md  963B
blisk-list-profiles.md  998B
blisk-recommend-blades.md  1019B
blisk-validate.md  963B
blisk.md  873B
blueprint-coverage-audit.md  1007B
blueprint-coverage-by-cus
... [+154 chars truncated]

### Assistant | 2026-05-26T03:47:39.443Z

Let me check the completed background task and consolidate my findings:

### Assistant | 2026-05-26T03:47:39.876Z

[tool_use: Read]

### Assistant | 2026-05-26T03:47:40.289Z

[tool_use: Bash]

### Assistant | 2026-05-26T03:47:40.496Z

[tool_use: Bash]

### User | 2026-05-26T03:47:58.774Z

[tool_result] 1	c86abb78cd [delta] [CAD-PIPELINE-WIRE-MS0]/U-CAD-COMMIT-DELTA-PASS-47 (slot:d...
2	0a49cffb45 [delta] [CAD-PIPELINE-WIRE-MS0]/U-CAD-COMMIT-DELTA-PASS-45 (slot:d...
3	08b7e70552 [delta] [CAD-PIPELINE-WIRE-MS0]/U-CAD-COMMIT-DELTA-PASS-42 (slot:d...
4	e6524aeecb [CAD-PIPELINE-WIRE-MS0]/U-CAD-FINAL-DOC-30 (slot:delta /loop iter+...
5	454a802566 [CAD-PIPELINE-WIRE-MS0]/U-CAD-LONG-TAIL-REVEAL (slot:de
... [+266 chars truncated]

### User | 2026-05-26T03:48:25.975Z

[tool_result] MillMasterOrchestratorFacadeEngine.ts  22.1K
MillPrismaticAdapterEngine.ts  5.3K
MillTurnLoRACadenceEngine.ts  2.5K
MillingLoRACadenceEngine.ts  2.7K
NeuralCADGenerationEngine.ts  23.4K
PDFBlueprintDimensionExtractorEngine.ts  17.4K
PDFBlueprintPatternRescueEngine.ts  15.6K
PartMediaToCADEngine.ts  24.2K
PerAppInCADInferenceAdapter.ts  20.8K
PrintToAllCADsOrchestrator.ts  9.2K
PrintToCADOrchestrat
... [+502 chars truncated]

### User | 2026-05-26T03:49:38.770Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-26T03:49:50.245Z

Now I have sufficient data. Let me compile the final JSON enrichment block for delta/CAD:

```json
{
  "slot": "delta",
  "domain": "cad",
  "engineRefs": [
    {"id": "BlueprintVisionOCREngine", "path": "mcp-server/src/engines/BlueprintVisionOCREngine.ts", "rationale": "OCR blueprint extraction for CAD generation; core delta capability"},
    {"id": "BlueprintToAllCADsOrchestratorEngine", "path": "mcp-server/src/engines/BlueprintToAllCADsOrchestratorEngine.ts", "rationale": "End-to-end 6-CAD orchestrator; primary delta pipeline"},
    {"id": "GeometryEngine", "path": "mcp-server/src/engines/GeometryEngine.ts", "rationale": "Boolean ops, offset, fillet, chamfer; canonical geometry layer"},
    {"id": "PartMediaToCADEngine", "path": "mcp-server/src/engines/PartMediaToCADEngine.ts", "rationale": "Reverse-engineer CAD from physical part photos/video"},
    {"id": "PrintToAllCADsOrchestrator", "path": "mcp-server/src/engines/PrintToAllCADsOrchestrator.ts", "rationale": "Multi-CAD target dispatch orchestrator"}
  ],
  "tribalRefs": [
    {"id": "bobcad-cam-tips-bc-001", "path": "knowledge/tribal/bobcad-cam-tips-bc-001.md", "rationale": "Adaptive roughing strategy; BobCAD trochoidal engagement"},
    {"id": "bobcad-cam-tips-bc-002", "path": "knowledge/tribal/bobcad-cam-tips-bc-002.md", "rationale": "BobCAD CAM workflow tips"},
    {"id": "bobcad-cam-tips-bc-003", "path": "knowledge/tribal/bobcad-cam-tips-bc-003.md", "rationale": "BobCAD design-to-manufacture bridging"},
    {"id": "bobcad-cam-tips-bc-004", "path": "knowledge/tribal/bobcad-cam-tips-bc-004.md", "rationale": "BobCAD advanced toolpath strategies"},
    {"id": "bobcad-cam-tips-bc-005", "path": "knowledge/tribal/bobcad-cam-tips-bc-005.md", "rationale": "BobCAD CAD kernel integration tips"}
  ],
  "wikiRefs": [
    {"slug": "cad-arc", "path": "knowledge/wiki/architecture/actions/cad/arc.md", "rationale": "CAD dispatcher arc action reference"},
    {"slug": "cad-blueprint-coverage-audit", "path": "knowledge/wiki/
... [+1827 chars truncated]
