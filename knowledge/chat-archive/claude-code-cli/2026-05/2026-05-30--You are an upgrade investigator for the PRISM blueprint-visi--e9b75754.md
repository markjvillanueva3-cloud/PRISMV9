---
type: "chat-session"
source: "claude-code-cli"
session_id: "e9b75754-b179-40b0-b0fb-7007d65b2056"
title: "You are an upgrade investigator for the PRISM blueprint-vision OCR pipeline (slo"
date: "2026-05-30"
first_ts: "2026-05-30T04:38:55.340Z"
last_ts: "2026-05-30T04:51:10.259Z"
cwd: "H:\\prism-slot-xray"
messages: 67
user_msgs: 26
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/workflows/wf_2338e30c-416/agent-af004b8cd0965f4ab.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:15"
---

# You are an upgrade investigator for the PRISM blueprint-vision OCR pipeline (slo

> **claude-code-cli** | 2026-05-30 | 67 msgs (26 user / 41 assistant) | cwd: H:\prism-slot-xray
> Raw: `H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/workflows/wf_2338e30c-416/agent-af004b8cd0965f4ab.jsonl`

## Transcript

### User | 2026-05-30T04:38:55.340Z

You are an upgrade investigator for the PRISM blueprint-vision OCR pipeline (slot:xray). Effort: exhaustive and concrete — read the actual code/corpus/research, never hand-wave.


REPO: H:/prism (ABSOLUTE paths only — the session cwd is a slot worktree, but read/commit targets live under H:/prism). Use Bash freely: node, git -C H:/prism, ollama, rg, ls, curl localhost:11434. Read files with absolute H:/prism/... paths.
SLOT: xray = blueprint-vision domain — OCR + blueprint reading + CAD-file data extraction. The vision/extraction pipeline that turns scanned engineering prints into structured PRISM data.
GOAL: print-to-data. Read a JM Die engineering blueprint, extract EVERY dimension/tolerance/GD&T callout/datum/material/feature accurately, normalized to mm, to feed CAD reconstruction (delta), CAM (kilo), quoting (charlie), and a training corpus (india). The "final test" is: extract from a print ALONE and generate an accurate CAD file (round-trip).

WHAT SHIPPED THIS SESSION (commit bb4eae6aec) — the local vision-OCR pipeline now WORKS end-to-end:
 - scripts/run-ollama-vision-extract.mjs --pdf <p> --part-class <c> [--model qwen2.5vl:7b] [--dpi 300] [--num-ctx 8192] [--emit-event] [--json]
   (renders PDF page0 -> PNG via PyMuPDF -> Ollama /api/generate vision -> parseVisionResponse -> optional event into state/shared/blueprint-accuracy-events.jsonl)
 - scripts/lib/ollama-vision-extract-lib.mjs (PURE core: buildVisionPrompt, parseVisionResponse, buildOllamaRequestBody, repairTruncatedJson; DEFAULT_VISION_MODEL=qwen2.5vl:7b, num_ctx default 8192, DEFAULT_TIMEOUT_MS 180000). Prompt asks for {confidence, dimensions:[{kind,nominal,tolerance}]} JSON, 12 canonical feature kinds, inch->mm.
 - scripts/lib/pdf-to-png.py (PyMuPDF/fitz render — pymupdf 1.27.2.3 just installed on H:/Tools/python).
 - PROVEN on a real JM electrode print: read title block "TAPTITE 2000 DIE" + real dims (1.2340 dia, 0.876, 0.3575 +/-0.0002). ~55-74s/page, confidence 0.9.

ROOT CAUSES fixed this ses
... [+4782 chars truncated]

### Assistant | 2026-05-30T04:39:10.321Z

I'll investigate the blueprint-vision OCR pipeline's scoring/ground-truth loop. Let me start by verifying what actually exists on disk before claiming anything.

### Assistant | 2026-05-30T04:39:12.700Z

[tool_use: Bash]

### Assistant | 2026-05-30T04:39:15.125Z

[tool_use: Bash]

### User | 2026-05-30T04:39:33.604Z

[tool_result] scripts/lib/ollama-vision-extract-lib.mjs  10.5K
scripts/lib/pdf-to-png.py  2.0K
scripts/run-ollama-vision-extract.mjs  8.5K
---EVENTS---
state/shared/blueprint-accuracy-events.jsonl  2.7K
---PAIRS---
state/shared/blueprint-training-pairs.jsonl  51.8M
state/shared/blueprint-training-partition.json  7.2K

### User | 2026-05-30T04:39:36.066Z

[tool_result] === GROUND TRUTH ENGINES ===
mcp-server/src/engines/GroundTruthRegistryEngine.ts  45.1K
mcp-server/src/engines/GroundTruthValidationEngine.ts  31.6K
=== DXF / STEP PARSE ENGINES ===
mcp-server/src/engines/DXFGeometryParserEngine.ts  54.8K
mcp-server/src/engines/PrintToCADOrchestratorEngine.ts  10.5K
mcp-server/src/engines/PrintToProgramPipelineEngine.ts  144.7K

### Assistant | 2026-05-30T04:39:38.336Z

All real. Let me examine the ground-truth engines and accuracy events to understand the current state of the scoring loop.

### Assistant | 2026-05-30T04:39:39.277Z

[tool_use: Bash]

### Assistant | 2026-05-30T04:39:40.567Z

[tool_use: Bash]

### User | 2026-05-30T04:39:48.561Z

[tool_result] === ACCURACY EVENTS (full, only 2.7K) ===
{"type":"outcome_record","ts":"2026-05-18T20:06:41.466Z","payload":{"pdf_path":"H:/prism/JM DIE/GENERAL BANDAGES/1666891.pdf","part_class":"general","operator_id":null,"extract_status":"failed","cad_status":"skipped","cam_status":"skipped","extraction_confidence":null,"extraction":null,"cad_dispatched_count":0,"cad_skipped_count":0,"cam_nc_output_present":
... [+2390 chars truncated]

### User | 2026-05-30T04:39:49.599Z

[tool_result] === first 2 training pairs ===
{"part_number":"221178737","part_number_normalized":"221178737","print_docs":[{"doc_id":"fdc32afc-a210-4444-8003-6f24f4ec3931","filename":"Scanned Document - 10/30/2020 11:38 AM.pdf","drawing_score":0.55},{"doc_id":"bf323b6a-0d53-43ea-9c52-39a857345095","filename":"Scanned Document - 10/30/2020 11:38 AM.pdf","drawing_score":0.55},{"doc_id":"14450604-6fdd-490c-8ea8-45
... [+3656 chars truncated]

### Assistant | 2026-05-30T04:39:54.559Z

Key finding: the accuracy events show `"accurate":false` and `extraction:` blobs but **nothing scores them against truth** — `accurate` is just a heuristic on whether CAD/CAM dispatched, NOT a dimension-match. Let me find the train-eligible pairs with actual CAD/program labels, and check whether any scoring harness exists.

### Assistant | 2026-05-30T04:39:57.408Z

[tool_use: Bash]

### Assistant | 2026-05-30T04:39:59.813Z

[tool_use: Bash]

### User | 2026-05-30T04:40:07.141Z

[tool_result] === search for any scoring/grading harness ===
=== scripts referencing training-pairs ===

### User | 2026-05-30T04:45:05.589Z

[tool_result] Command running in background with ID: bqlyi5rla. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\6ea909da-6fd2-43e6-adba-517174c841fc\tasks\bqlyi5rla.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-30T04:45:09.079Z

The grep search returned **empty** — no scoring harness references `blueprint-training-pairs` and no dimension-match/grading logic exists in scripts or engines. This confirms the core gap. Let me wait for the count and check the GroundTruthValidationEngine internals.

### Assistant | 2026-05-30T04:45:12.593Z

[tool_use: Bash]

### Assistant | 2026-05-30T04:45:12.752Z

[tool_use: Bash]

### User | 2026-05-30T04:45:27.323Z

[tool_result] === GroundTruthValidationEngine exports/methods ===
0 matches for 'export (class|function|const)|^\s+(async )?(public )?[a-zA-Z]+\s*\('

### User | 2026-05-30T04:45:32.505Z

[tool_result] === train_eligible counts ===
0
=== has_cad true ===
0
=== has_program true ===
0
=== full triple (all three) ===
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH

### Assistant | 2026-05-30T04:45:37.462Z

The pairs use a different schema than the charter described — `train_eligible:0` with this counting means the schema differs. The 51.8M file has a different structure than `blueprint-training-partition.json`. Let me check the actual structure and find where the 4,245 eligible pairs / 426 triples live.

### Assistant | 2026-05-30T04:45:39.990Z

[tool_use: Bash]

### User | 2026-05-30T04:45:51.028Z

[tool_result] total 76205 eligible 4245 has_cad 498 has_program 4173 triple 426

### Assistant | 2026-05-30T04:45:54.805Z

Confirmed exactly the charter numbers: **4,245 eligible, 498 has_cad, 4,173 has_program, 426 full-triples**. The grep failed earlier because the structure spans the line oddly; python confirms. Now let me extract a real eligible+CAD pair to see the file paths, and verify the DXF/STEP parse engines + cadDispatcher actions are real.

### Assistant | 2026-05-30T04:45:58.117Z

[tool_use: Bash]

### Assistant | 2026-05-30T04:45:59.549Z

[tool_use: Bash]

### User | 2026-05-30T04:46:05.056Z

[tool_result] PART 1005 label_source cad+program conf loose
  CAD: [(None, 'H:\\PRISM\\JM DIE\\HAAS-HURCO\\OMG INC\\M1005.ipt'), (None, 'H:\\PRISM\\JM DIE\\HAAS-HURCO\\OMG INC\\OldVersions\\M1005.0011.ipt'), (None, 'H:\\PRISM\\JM DIE\\JM DIE COMPANY\\JM\\HAAS-HURCO\\OMG INC\\M1005.ipt')]
  PROG: ['1005 HAMMERHOB.MIN']
PART 24000 label_source cad+program conf ambiguous
  CAD: [(None, 'H:\\PRISM\\JM DIE\\HAAS
... [+1212 chars truncated]

### User | 2026-05-30T04:46:13.657Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
24 matches in 12 files:

2535:0:{
2685:0:{
2764:0:{
2767:0:string"),
3292:0:{
3308:0:{
3320:0:{
3334:0:{
3800:0:{
5565:0:{
707:0:{
mcp-server/src/tools/dispatchers/cadDispatcher.ts:114:"feature_recognize", "feature_edit",
mcp-server/src/tools/dispatchers/cadDispatcher.ts:229:"cad_step_parse_file", "cad
... [+1372 chars truncated]

### Assistant | 2026-05-30T04:46:18.780Z

Critical discovery on the CAD pairs: **the 498 has_cad matches are overwhelmingly `.ipt` (Inventor binary) and `.dwg`** — proprietary formats. Only the 4th example had `.dxf`. The DXF/STEP parsers can read text-based DXF/STEP/IGES, but `.ipt` is a closed Autodesk binary. The label confidence is "loose"/"ambiguous" — these joins are weak (note example PART 1000 matched a tool-holder library file, not the actual part). This matters enormously for the scoring design. Let me verify the DXF parser's real input contract and check what fraction of has_cad pairs are DXF/STEP vs binary.

### Assistant | 2026-05-30T04:46:22.793Z

[tool_use: Bash]

### User | 2026-05-30T04:46:34.917Z

[tool_result] CAD ext distribution across has_cad pairs:
  .ipt: 2200
  .iam: 207
  .stp: 48
  .stl: 35
  .idw: 26
  .step: 15
  .dxf: 14
  .dwg: 13
  .sldprt: 10
  .igs: 6
  .x_t: 5
has_cad pairs with >=1 TEXT-PARSEABLE cad (dxf/step/iges): 40

### Assistant | 2026-05-30T04:46:40.710Z

This is a **load-bearing finding**: of 498 has_cad pairs, only **~40 have a text-parseable CAD file** (48 .stp + 15 .step + 14 .dxf + 6 .igs, deduplicated to ~40 pairs). The vast majority (2,200 .ipt + 207 .iam) are **Autodesk Inventor binary** — unreadable by DXFGeometryParserEngine. So the charter's "CAD-DIRECT-PARSE for 498 CAD-matched pairs" is only viable for ~40. The **CNC program label (4,173 has_program) is the dominant truth source**. Let me look at a real .MIN program and the program-parse capabilities, plus check if PrintToProgramPipelineEngine already parses programs.

### Assistant | 2026-05-30T04:46:42.491Z

[tool_use: Bash]

### User | 2026-05-30T04:46:50.732Z

[tool_result] FOUND JM DIE\CNC LATHE\9007405.MIN 548 bytes
G140
NSTRT
(PROGRAM NAME - 9007405)
(DATE=DD-MM-YY - 16-11-21 TIME=HH:MM - 16:40)
(MCX FILE - C:\USERS\CNC LATHE\BOX SYNC\CNC LATHE\GENERAL OPERATION.MCX-8)
(NC FILE - C:\USERS\CNC LATHE\BOX SYNC\CNC LATHE\9007405.MIN)
(MATERIAL - STEEL INCH - 1030 - 200 BHN)
(POST DEV - IN-HOUSE SOLUTIONS)
G0 X20. Z30.
G50 S800
(TOOL - 1 OFFSET - 1)
(OD ROU
... [+192 chars truncated]

### Assistant | 2026-05-30T04:46:55.070Z

The .MIN G-code is plain text — fully parseable. It encodes machined dims (X1.37 = diameter, Z moves) and rich metadata: material (STEEL 1030), tool, operation. This is the real truth source. Now let me check whether ANY existing engine parses G-code for dimension tokens, and inspect GroundTruthValidationEngine to see if it already does scoring (it's 31.6K — substantial).

### Assistant | 2026-05-30T04:46:56.015Z

[tool_use: Read]

### Assistant | 2026-05-30T04:46:58.328Z

[tool_use: Bash]

### User | 2026-05-30T04:46:59.461Z

[tool_result] 1	/**
2	 * GroundTruthValidationEngine — corpus integrity gate for the ground-truth
3	 * bundles produced by GroundTruthBatchExtractor (U-CGT07).
4	 *
5	 * Walks {outputRoot}/{fileId}/ directories, runs eight independent integrity
6	 * checks per bundle, and emits a ValidationReport whose quarantineList enumerates
7	 * every fileId that should be re-extracted or excluded from regression
8	 * compa
... [+3371 chars truncated]

### User | 2026-05-30T04:47:05.547Z

[tool_result] === any nc/gcode dimension parser engine? ===
EDMPostProcessGCodeEngine.ts  125.8K
GCodeBidirectionalOptimizerEngine.ts  12.0K
GCodeEnergyOptimizerEngine.ts  31.7K
GCodeIntelligencePipelineEngine.ts  18.0K
GCodeMaterialParserEngine.ts  14.6K
GCodeOptimizationEngine.ts  10.2K
GCodeReverseCADEngine.ts  12.8K
GCodeRuntimePredictorEngine.ts  15.0K
GCodeSafetyAnalyzerEngine.ts  66.7K
GCodeSnippetEngine
... [+567 chars truncated]

### Assistant | 2026-05-30T04:47:12.136Z

Major finding: **`GCodeReverseCADEngine.ts`** and `GCodeMaterialParserEngine.ts` already exist — there IS prior art for extracting geometry/material from G-code. And `GroundTruthValidationEngine` is NOT a scoring harness — it's a corpus *integrity* gate (validates STEP bundles exist/parse, NOT dimension-match against VLM extractions). It validates bundles from `GroundTruthBatchExtractor` which produces STEP files. This is the crucial gap: the ground-truth infra produces/validates STEP bundles, but **nothing compares a VLM extraction's dimensions against those bundles**.

Let me verify GCodeReverseCADEngine's capability and check the GroundTruthRegistryEngine query surface, plus whether the runner emits anything scoreable.

### Assistant | 2026-05-30T04:47:14.499Z

[tool_use: Bash]

### Assistant | 2026-05-30T04:47:16.861Z

[tool_use: Bash]

### User | 2026-05-30T04:47:20.310Z

[tool_result] === GCodeReverseCADEngine purpose ===
/**
 * GCodeReverseCADEngine — reverse-engineers a finished CAD part from a
 * CNC program by replaying each block as a tool-sweep volume and emitting
 * the residual stock geometry. The Track 1 core for the user directive
 * (2026-05-24, slot:echo) "reverse engineer the finished cad design from a
 * cnc program".
 *
 * Algorithm:
 *   stock_remaining = initia
... [+1106 chars truncated]

### User | 2026-05-30T04:47:37.574Z

[tool_result] === GroundTruthRegistryEngine query methods ===
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
34 matches in 17 files:

429:0:string, opts: BuildOptions = {}): RegistryStats {
481:0:string): RegistryEntry | null {
486:0:string, opts: QueryOptions = {}): RegistryEntry[] {
510:0:string, opts: QueryOptions = {}): RegistryEntry[] {
520:0:{
540:0:Regist
... [+1071 chars truncated]

### Assistant | 2026-05-30T04:47:42.460Z

`GCodeReverseCADEngine` already extracts feature dimensions (pocket/hole/face/contour with positions+dimensions) from G-code blocks — this is the **program-parse truth source already built**, designed explicitly for "run-time-vs-actual validation". And `GroundTruthRegistryEngine` has `getTrainingPairs()` query. No ground-truth bundle dir exists on disk yet (the STEP-bundle pipeline hasn't been run on the corpus). 

Let me confirm the runner's `--emit-event` shape and whether it has any truth comparison, then check the blueprint-accuracy-guard conformal gate.

### Assistant | 2026-05-30T04:47:44.767Z

[tool_use: Bash]

### Assistant | 2026-05-30T04:47:47.544Z

[tool_use: Bash]

### User | 2026-05-30T04:47:50.011Z

[tool_result] === runner: does it reference truth/score/pair? ===
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
1 matches in 1 files:

182:0:false, // single extraction — not a full pipeline run
=== lib: parseVisionResponse output shape ===
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
6 matches in 3 files:

53
... [+468 chars truncated]

### User | 2026-05-30T04:48:49.195Z

[tool_result] === blueprint-accuracy-guard ===
./.claude/hooks/blueprint-accuracy-guard.mjs
./.claude/worktrees/agent-a01e7b81d0946a97b/.claude/hooks/blueprint-accuracy-guard.mjs
./.claude/worktrees/agent-a0310b5d699214970/.claude/hooks/blueprint-accuracy-guard.mjs
./.claude/worktrees/agent-a149a784779f1da9f/.claude/hooks/blueprint-accuracy-guard.mjs
./.claude/worktrees/agent-a37d7460d5d653f84/.claude/hooks/blu
... [+494 chars truncated]

### Assistant | 2026-05-30T04:48:52.857Z

Confirmed: the runner has **zero truth comparison** — it produces extractions and emits events with a heuristic `accurate` flag that is NOT a dimension match. Let me read the blueprint-accuracy-guard to understand the conformal gate it references, and confirm the DXF parser's input contract (it needs file content, and whether it handles STEP).

### Assistant | 2026-05-30T04:48:53.820Z

[tool_use: Read]

### User | 2026-05-30T04:48:56.612Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * blueprint-accuracy-guard.mjs — PostToolUse hook (BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U5)
5	 *
6	 * Monitors blueprint-extraction tool outputs. Two responsibilities:
7	 *
8	 * 1. THRESHOLD CHECKS (legacy CADCAM-DAGI-MS0/U-DAGI08 — preserved verbatim):
9	 *    - Dimensional accuracy < 99% (exit-gate requirement) → warning/error
10	 *    - GD&T preservation
... [+3466 chars truncated]

### Assistant | 2026-05-30T04:48:56.634Z

[tool_use: Bash]

### User | 2026-05-30T04:49:02.628Z

[tool_result] === DXFGeometryParserEngine: handles STEP? input contract ===
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
8 matches in 5 files:

556:0:string): Array<[number, string]> {
607:0:string, format: "dxf" | "step" | "iges" = "dxf"): GeometryParseResult {
614:0:string): GeometryParseResult {
660:0:string, format: "step" | "iges"): GeometryParseResult {

... [+952 chars truncated]

### Assistant | 2026-05-30T04:49:10.540Z

This is decisive. Two more load-bearing findings:

1. **The blueprint-accuracy-guard has thresholds (`MIN_DIM_ACCURACY=99`, line 62) but NO source of a real dimensional-accuracy number.** It only fires when a tool *output already contains* an accuracy field — but nothing computes that field. The conformal drift gate compares confidence-bounds, not extraction-vs-truth. The "closed loop" reads `operator_correction` blocks "produced by GroundTruthValidationEngine + U-MS1-U4 extension" — but GroundTruthValidationEngine validates STEP bundles, it does NOT produce per-dimension corrections against VLM extractions. **The loop is wired to consume a scoring signal that no component produces.**

2. **DXFGeometryParserEngine STEP/IGES parsing is a PLACEHOLDER** (line 657: "Placeholder for STEP/IGES parsing. In production this would use opencascade..."). So even the ~40 text-parseable CAD pairs can't be scored via STEP through this engine — only DXF (14 files) actually parses geometry.

Let me confirm the STEP placeholder and check the .ipt situation (whether any STEP export path exists), then finalize.

### Assistant | 2026-05-30T04:49:11.641Z

[tool_use: Read]

### User | 2026-05-30T04:49:12.784Z

[tool_result] 655	
656	  /**
657	   * Placeholder for STEP/IGES parsing. In production this would use opencascade.js.
658	   * For now, returns a clear error directing users to DXF format.
659	   */
660	  private parseSTEPOrIGES(content: string, format: "step" | "iges"): GeometryParseResult {
661	    return {
662	      contours: [],
663	      issues: [{
664	        type: "open_contour",
665	        severity: "e
... [+958 chars truncated]

### Assistant | 2026-05-30T04:49:14.696Z

[tool_use: Bash]

### User | 2026-05-30T04:49:21.056Z

[tool_result] === ollama VL model resident? ===
qwen2.5-coder:3b
qwen2.5-coder:7b
qwen2.5vl:7b
llama3.2-vision:11b
qwen2.5-coder:14b
qwen2.5-coder:32b
=== is qwen2.5vl loaded now (ps)? ===
qwen2.5-coder:7b size_vram 10123048960
nomic-embed-text:latest size_vram 595142656

### Assistant | 2026-05-30T04:49:27.163Z

All findings confirmed with on-disk evidence:

- STEP/IGES parse is a **stub** (line 660-672) — returns an error, parses nothing.
- The VL model is **NOT resident** right now — `qwen2.5-coder:7b` (10.1GB) + nomic occupy VRAM. The VL model is evicted, confirming the charter's "needs the coder UNLOADED" contention point — this directly impacts batch throughput.

I have enough evidence. Let me do one final check: whether `GCodeReverseCADEngine` is wired into a dispatcher (so a scoring harness can reuse it), and confirm the program-files in pairs map to real .MIN paths.

### Assistant | 2026-05-30T04:49:31.257Z

[tool_use: Bash]

### User | 2026-05-30T04:49:37.318Z

[tool_result] === GCodeReverseCAD wired to dispatcher? ===
mcp-server/src/tools/dispatchers/camDispatcher.ts
=== GCodeMaterialParser dispatcher? ===
=== program_files path sample from an eligible pair ===
PART 1005 progs: [('1005 HAMMERHOB.MIN', '')]

### Assistant | 2026-05-30T04:49:45.545Z

`GCodeReverseCADEngine` IS wired into `camDispatcher.ts`. The program_files have filenames but empty `path` fields — the harness will need to resolve them against `jm-die-full-program-index.json`. That's a known resolution step, not a blocker.

I now have complete, evidence-backed picture. Let me synthesize the findings into the upgrade set.

Summary of the verified gap: The runner produces extractions; `blueprint-accuracy-guard` has a `MIN_DIM_ACCURACY=99` threshold and a conformal-drift loop — but **no component computes a per-dimension extraction-vs-truth score**. The loop consumes an `operator_correction`/accuracy signal that nothing produces. The two truth sources are: (1) CAD-direct — viable for only ~40 pairs because STEP parse is a stub and 2,407 of 498 are Inventor binary; (2) program-parse — viable for 4,173 pairs via the already-built, already-dispatcher-wired `GCodeReverseCADEngine`. The highest-ROI build is a scoring harness keyed on the program-parse truth source.

### Assistant | 2026-05-30T04:50:53.912Z

[tool_use: StructuredOutput]

### User | 2026-05-30T04:50:56.154Z

[tool_result] Structured output provided successfully

### Assistant | 2026-05-30T04:51:10.259Z

I've completed the investigation and returned the structured findings. Here is the summary of what I verified on disk:

## Core gap confirmed: the accuracy loop is wired but starved

The runner (`scripts/run-ollama-vision-extract.mjs`) produces extractions but **no component computes a per-dimension extraction-vs-truth score**. The `blueprint-accuracy-guard.mjs` hook has a `MIN_DIM_ACCURACY=99` threshold (line 62) and a full conformal-drift closed-loop — but it consumes an accuracy/`operator_correction` signal that nothing produces. The `accurate:false` flag in `blueprint-accuracy-events.jsonl` is a heuristic on whether CAD/CAM dispatched, not a dimension match. A grep for any scoring/grading harness across `scripts/` + `mcp-server/src/` returned **0 matches**; no script references `blueprint-training-pairs.jsonl`.

## The charter's truth-source framing needed correction (load-bearing)

- **CAD-direct is NOT viable for 498 pairs — only ~40.** Of 498 has_cad pairs: 2,200 `.ipt` + 207 `.iam` are Autodesk Inventor **binary** (unparseable as text); only 48 `.stp` + 15 `.step` + 14 `.dxf` + 6 `.igs` are text-parseable (~40 dedup pairs). And `DXFGeometryParserEngine.parseSTEPOrIGES` is an explicit **stub** (lines 660-672) — only the 14 `.dxf` actually yield geometry today.
- **The dominant truth source is the CNC program (4,173 pairs)** via `GCodeReverseCADEngine` — which already exists, is wired into `camDispatcher.ts`, and was built explicitly for "run-time-vs-actual validation". This makes item #1 (program-parse scoring harness) the highest-ROI build *and* an R8 reuse.

## Counts verified
python json-parse of the 76,205-line pairs file: **train_eligible 4,245 · has_cad 498 · has_program 4,173 · full-triple 426** — exactly the charter numbers (grep miscounted on long lines).

I returned 6 ranked upgrades. The top one (build the program-parse scoring harness on the already-wired `GCodeReverseCADEngine`) is the single highest-ROI item — it turns the batch test from "produ
... [+784 chars truncated]
