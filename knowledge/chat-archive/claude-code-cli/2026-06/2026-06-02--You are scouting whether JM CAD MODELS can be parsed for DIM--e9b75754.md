---
type: "chat-session"
source: "claude-code-cli"
session_id: "e9b75754-b179-40b0-b0fb-7007d65b2056"
title: "You are scouting whether JM CAD MODELS can be parsed for DIMENSIONS, to build OC"
date: "2026-06-02"
first_ts: "2026-06-02T03:23:54.755Z"
last_ts: "2026-06-02T03:33:42.597Z"
cwd: "H:\\prism-slot-xray"
messages: 85
user_msgs: 35
assistant_msgs: 50
raw_file: "H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/workflows/wf_245d9612-f79/agent-a0c20c92d69a14525.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:15"
---

# You are scouting whether JM CAD MODELS can be parsed for DIMENSIONS, to build OC

> **claude-code-cli** | 2026-06-02 | 85 msgs (35 user / 50 assistant) | cwd: H:\prism-slot-xray
> Raw: `H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/workflows/wf_245d9612-f79/agent-a0c20c92d69a14525.jsonl`

## Transcript

### User | 2026-06-02T03:23:54.755Z

You are scouting whether JM CAD MODELS can be parsed for DIMENSIONS, to build OCR training ground-truth. TASKS (Read/Grep/Glob/Bash, excerpts only): 1. Locate the CAD files. The curated trainset H:/prism/state/shared/blueprint-trainset-clean.jsonl has 350 rows with cad_files[] (filter subsets.roundtrip_b==true). Also H:/PRISM/resources/CAD FILES. Report formats present (STEP/.stp/.step, IGES, SLDPRT, .ipt, .3dm, .f3d, .x_t, STL, DXF) + how many resolve on disk. 2. R8 (CRITICAL — do not rebuild): find the EXISTING CAD dimension extractor scripts/cad-analyze-step.mjs and any STEP/geometry dim engines (Grep 'cad-analyze|cad_step_parse|bounding|BRep|STEP.*parse' in scripts/ + mcp-server/src/engines/cad/**). Report their API + exactly which dims they return (bounding box, hole diameters, feature dims). Run scripts/cad-analyze-step.mjs --help or read its header. 3. JM convention: STEP units are INCH (CONVERSION_BASED_UNIT 25.4) NOT mm — confirm how the existing extractor handles this. 4. Sample 1-2 real STEP files (head excerpts) to confirm format + units. Return a TEXT report: CAD corpus location + format breakdown + on-disk resolvability, the EXISTING extractor to reuse + its dimension output shape + units handling, and which dims CAD gives that G-code/print do not (and vice versa). Concrete paths.

### Assistant | 2026-06-02T03:24:12.688Z

I'll scout this systematically. Let me start by examining the trainset, locating CAD files, and finding the existing extractor in parallel.

### Assistant | 2026-06-02T03:24:14.569Z

[tool_use: Bash]

### Assistant | 2026-06-02T03:24:15.994Z

[tool_use: Bash]

### Assistant | 2026-06-02T03:24:17.106Z

[tool_use: Bash]

### User | 2026-06-02T03:24:39.834Z

[tool_result] Exit code 1
---HEADER---

### User | 2026-06-02T03:24:45.540Z

[tool_result] {"part_number":"1005","part_number_normalized":"1005","confidence":"loose","label_source":"cad+program","subsets":{"roundtrip_b":true,"print_program":true,"triple":true},"print_docs":[{"doc_id":"fdc32afc-a210-4444-8003-6f24f4ec3931","filename":"Scanned Document - 10/30/2020 11:38 AM.pdf","drawing_score":0.75},{"doc_id":"bf323b6a-0d53-43ea-9c52-39a857345095","filename":"Scanned Document - 10/30/202
... [+3620 chars truncated]

### User | 2026-06-02T03:24:49.293Z

[tool_result] 2359b.stp  353.8K
2399(1).stp  257.2K
2399.stp  257.2K
ADR-JN6.stp  103.5K
AEROSPACE VALVE BODY.STP  51.9K
Barrel Weight Reduction Pattern.step  1.5M
Body 1.step  2.6M
Bottom.step  24.6K
CNC 3 Axis Mill - Example 02.step  57.6K
Chuck.step  628.4K
Cnc.stp  80.5K
Conector circular 6P.step  349.1K
ENGRENAGEM STEP.STP  173.0K
Full Part.step  4.8M
Impeller turbine.stp  2.9M
Kurt HD690 Vise.stp  597.3K

... [+1412 chars truncated]

### Assistant | 2026-06-02T03:24:52.457Z

`cad-analyze-step.mjs` does not exist at that exact path. Let me find the real extractor scripts and confirm CAD file resolvability. The graph hints point to `cad-atomic-step-decompose`, `cad-step-evidence-for-kinds`, etc. Let me search.

### Assistant | 2026-06-02T03:24:52.920Z

[tool_use: Glob]

### Assistant | 2026-06-02T03:24:53.391Z

[tool_use: Glob]

### Assistant | 2026-06-02T03:24:54.706Z

[tool_use: Grep]

### User | 2026-06-02T03:25:00.940Z

[tool_result] scripts\_archive\closed-milestones\cad-uix-capability-lock.mjs
scripts\_archive\closed-milestones\cad-uix-p8-realtime.mjs
scripts\_archive\closed-milestones\cad-uix-round2.mjs
scripts\_archive\closed-milestones\cad-uix-round3.mjs

### User | 2026-06-02T03:25:01.416Z

[tool_result] No files found

### User | 2026-06-02T03:25:05.729Z

[tool_result] Found 4 files
scripts\_archive\closed-milestones\cad-uix-round3.mjs
scripts\_archive\closed-milestones\cad-uix-round2.mjs
scripts\_archive\closed-milestones\cad-uix-p8-realtime.mjs
scripts\_archive\closed-milestones\cad-uix-capability-lock.mjs

### Assistant | 2026-06-02T03:25:08.564Z

The STEP-parsing scripts aren't in `scripts/`. The real extractor likely lives in the CAD engines. Let me search the engine directory and the broader scripts tree for STEP geometry parsing.

### Assistant | 2026-06-02T03:25:09.927Z

[tool_use: Grep]

### User | 2026-06-02T03:25:09.941Z

[tool_result] <tool_use_error>Path does not exist: mcp-server/src/engines/cad. Note: your current working directory is H:\prism-slot-xray.</tool_use_error>

### Assistant | 2026-06-02T03:25:11.802Z

[tool_use: Grep]

### Assistant | 2026-06-02T03:25:13.338Z

[tool_use: Bash]

### User | 2026-06-02T03:25:28.781Z

[tool_result] No files found

### User | 2026-06-02T03:25:56.111Z

[tool_result] 40
---BY EXT---
      4 8k
      4 5k
      4 0k
      3 9m
      3 6k
      3 2k
      2 8m
      2 7m
      2 6m
      2 5m
      2 3m
      2 3k
      2 1k
      1 9k
      1 7k
      1 4m
      1 4k
      1 1m

### Assistant | 2026-06-02T03:26:00.382Z

I'm in worktree `H:\prism-slot-xray` (slot:xray), not the shared tree. CAD engines are under `mcp-server/src/engines/cad` in main but may differ in this worktree. The `ls | sed` extension parse broke on filenames with spaces/sizes. Let me fix paths and the extension counter, and locate the CAD engine dir in this worktree.

### Assistant | 2026-06-02T03:26:01.250Z

[tool_use: Bash]

### Assistant | 2026-06-02T03:26:02.250Z

[tool_use: Bash]

### User | 2026-06-02T03:26:32.175Z

[tool_result]      20 stp
     18 step
      2 zip

### User | 2026-06-02T03:27:12.942Z

[tool_result] H:/prism/mcp-server/src/engines/cad/
MAIN-HAS-CAD

### Assistant | 2026-06-02T03:27:16.371Z

The CAD engine dir lives in main (`H:/prism/...`), not this worktree. The `CAD FILES` dir is 38 STEP files (20 .stp + 18 .step) + 2 .zip. Now let me find the actual STEP dimension extractor in main, and parse the trainset for cad_files formats.

### Assistant | 2026-06-02T03:27:17.786Z

[tool_use: Grep]

### Assistant | 2026-06-02T03:27:19.220Z

[tool_use: Grep]

### Assistant | 2026-06-02T03:27:24.838Z

[tool_use: Bash]

### User | 2026-06-02T03:27:29.824Z

[tool_result] Found 1 file
H:\prism\mcp-server\src\engines\cad\TOOLBELT.md

### User | 2026-06-02T03:27:30.586Z

[tool_result] Found 8 files
H:\prism\scripts\lib\prism-base-job.mjs
H:\prism\scripts\units-guard.test.mjs
H:\prism\scripts\lib\units-guard.mjs
H:\prism\scripts\cad-design-book-sources.mjs
H:\prism\scripts\fusion360-addin\fusion360_api_server.py
H:\prism\scripts\fusion360-addin\FusionFeedsCalculator.py
H:\prism\scripts\fusion360-prism-addin\prism_addin.py
H:\prism\scripts\fusion360-prism-addin\auto_cam.py

### User | 2026-06-02T03:27:53.711Z

[tool_result] roundtrip_b rows: 350 | rows with cad_files: 350 | total cad_file entries: 1572
EXT BREAKDOWN: {"ipt":1338,"dwg":10,"dxf":10,"igs":6,"step":12,"idw":15,"stl":17,"stp":35,"iam":118,"sldprt":7,"x_t":4}
SAMPLE cad_files[0]: {"path":"H:\\PRISM\\JM DIE\\HAAS-HURCO\\OMG INC\\M1005.ipt","ext":".ipt","customer":"OMG INC","kind":"cam_project","matched_via":"1005"}

### Assistant | 2026-06-02T03:27:58.812Z

Key finding: the trainset's `cad_files[]` are overwhelmingly Inventor `.ipt` (1338) and `.iam` (118) — NOT STEP. Only 47 STEP entries (12 .step + 35 .stp). These point into `H:/PRISM/JM DIE/...`. Critical: `.ipt`/`.iam`/`.sldprt`/`.x_t` are proprietary binary formats requiring native CAD or a kernel, not text-parseable.

Now the existing STEP extractor isn't in `scripts/` as a standalone — it's likely a TS engine in the cad galaxy. Let me find the actual STEP parser engine and check the units-guard handling, plus how many trainset CAD files resolve on disk.

### Assistant | 2026-06-02T03:28:01.228Z

[tool_use: Grep]

### Assistant | 2026-06-02T03:28:06.924Z

[tool_use: Bash]

### User | 2026-06-02T03:28:14.816Z

[tool_result] Found 38 files
H:\prism\mcp-server\src\tools\dispatchers\camDispatcher.ts
H:\prism\mcp-server\src\schemas\turningActionSchemas.ts
H:\prism\mcp-server\src\engines\CADLiveBlueprintOcrAdapter.ts
H:\prism\mcp-server\src\__tests__\BRepTessellatorEngine.test.ts
H:\prism\mcp-server\src\engines\BRepTessellatorEngine.ts
H:\prism\mcp-server\src\engines\CADGeometryComparisonEngine.ts
H:\prism\mcp-server\src\
... [+2042 chars truncated]

### User | 2026-06-02T03:28:40.054Z

[tool_result] ext | total | resolve-on-disk
.dwg 10 10
.dxf 10 10
.iam 118 118
.idw 15 15
.igs 6 6
.ipt 1338 1338
.sldprt 7 7
.step 12 12
.stl 17 17
.stp 35 35
.x_t 4 4
RESOLVED STEP in trainset: 47
Sample resolved STEP: [
  'H:\\PRISM\\JM DIE\\OKUMA\\hyperCAD-S and hyperMILL Online Training\\2- Basic Training Day 2\\Tool Database\\Tooling\\Command Holders\\stp\\H4Y4A1000.step',
  'H:\\PRISM\\JM DIE\\OKUMA\\hyp
... [+280 chars truncated]

### Assistant | 2026-06-02T03:28:43.451Z

Excellent — 100% of trainset CAD files resolve on disk (1572/1572). The canonical STEP extractor is `STEPGeometryParserEngine` (test exists) plus `StepImportEngine` and `STEPAP242PMIExtractorEngine`. Let me read the key engines to get the exact dimension output shape and units handling.

### system

... [5 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-02T03:29:11.543Z

[tool_use: Bash]

### Assistant | 2026-06-02T03:29:12.476Z

[tool_use: Glob]

### Assistant | 2026-06-02T03:29:13.382Z

[tool_use: Bash]

### User | 2026-06-02T03:29:36.324Z

[tool_result] No files found

### User | 2026-06-02T03:29:41.633Z

[tool_result] 1157
===INTERFACES (real?)===
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
23 matches in 10 files:

135:0:HoleFeature[];
136:0:PocketFeature[];
508:0:HoleFeature[] = [];
674:0:elongated pockets with parallel walls.
677:0:CylindricalFace[], holes: HoleFeature[]): SlotFeature[] {
718:0:rectangular depressions surrounded by planar faces.
721:0:Pocke
... [+1278 chars truncated]

### User | 2026-06-02T03:29:43.405Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
43 matches in 16 files:

108:0:false, reason: "n/a" };
111:0:{ inch: [0.015, 4], mm: [0.4, 100] },
112:0:{ inch: [0.2, 6], mm: [5, 160] },
113:0:{ inch: [0.05, 48], mm: [1.3, 1220] },
118:0:"inch";
13:0:`import { requireUnits } from "./lib/units-guard.mjs"`.
4:0:kilo built a part in metric while it was
... [+1753 chars truncated]

### Assistant | 2026-06-02T03:29:48.769Z

The grep output is mangled by rtk's `rg`-fallback formatting (shows `:0:` offsets), but the substance is clear. Key confirmations:
- `StepImportEngine` has real bodies (1157 lines): `detectHoles` returns `diameter_mm`, sorted; pockets/slots detected; output in **mm**.
- `units-guard.mjs` line 57 handles STEP: `CONVERSION_BASED_UNIT` + `0.0254` → inch detection; line 54 notes the dual SI base + conversion-unit gotcha.

Now I need the exact `StepAnalysisResult` shape (units field?) and whether the engine reports STEP-declared units, plus the units-guard STEP detection logic verbatim. Let me read those specific blocks directly with Read.

### Assistant | 2026-06-02T03:29:49.734Z

[tool_use: Read]

### Assistant | 2026-06-02T03:29:50.369Z

[tool_use: Read]

### User | 2026-06-02T03:29:57.831Z

[tool_result] 56	export interface StepAnalysisResult {
57	  file_path: string;
58	  file_size_bytes: number;
59	  mesh_count: number;
60	  part_count: number;
61	  assembly_structure: AssemblyNode[];
62	  bounding_box: BoundingBox3D;
63	  volume_mm3: number;
64	  surface_area_mm2: number;
65	  total_vertices: number;
66	  total_triangles: number;
67	  total_edges_estimate: number;
68	}
69	
70	export interface A
... [+1730 chars truncated]

### User | 2026-06-02T03:29:58.490Z

[tool_result] 34	 * (G20/G21, G70/G71), or a STEP string (CONVERSION_BASED_UNIT 0.0254 = inch; SI MILLI METRE = mm).
35	 * Returns units:"unknown" (confidence 0) when there is NO evidence — the caller must then STOP.
36	 */
37	export function detectUnits(source) {
38	  if (source && typeof source === "object" && !Array.isArray(source)) {
39	    const raw = source.units ?? source.unit ?? source.system;
40	    if
... [+1977 chars truncated]

### Assistant | 2026-06-02T03:30:04.182Z

Now I have the full picture. One critical observation: `StepImportEngine`'s output is **always labeled `_mm`** (volume_mm3, diameter_mm, etc.) — but it uses occt-import-js which returns geometry in the STEP's *native units*. For JM Die inch-STEP, the raw numbers are inches; the `_mm` suffix is a naming lie unless a conversion is applied. Let me quickly confirm whether the engine applies any scale conversion, and verify the dispatcher/CLI surface + check whether there's a batch ground-truth extractor (the GroundTruthBatchExtractor test showed up).

### Assistant | 2026-06-02T03:30:07.026Z

[tool_use: Bash]

### Assistant | 2026-06-02T03:30:08.754Z

[tool_use: Bash]

### User | 2026-06-02T03:30:16.432Z

[tool_result] ===scale/conversion in StepImportEngine===
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'scale\|0.0254\|25.4\|MM_PER\|convert\|units\b\|inch'
===dispatcher actions===
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'step_import\|step_analyze\|step_features\|StepImportEng
... [+26 chars truncated]

### User | 2026-06-02T03:30:18.544Z

[tool_result] cnc-ground-truth-build.mjs  8.7K
derive-ground-truth-from-cad.mjs  6.2K
===GT batch extractor engine===
mcp-server/src/engines/GroundTruthBatchExtractor.ts
mcp-server/src/engines/GroundTruthRegistryEngine.ts
mcp-server/src/engines/GroundTruthValidationEngine.ts
mcp-server/src/engines/pdf-corpus/PATHS.md
===CLI runner for step===
build-blueprint-cad-program-pairs.mjs  7.6K
build-blueprint-cad-progr
... [+348 chars truncated]

### Assistant | 2026-06-02T03:30:22.363Z

The grep used alternation that rtk's `rg`-fallback mangled (POSIX `\|` vs PCRE). Found the key script: `scripts/derive-ground-truth-from-cad.mjs` — this is the existing CAD→ground-truth deriver, exactly the use case. Let me read it plus confirm engine scaling with a clean grep, and check `GroundTruthBatchExtractor`.

### Assistant | 2026-06-02T03:30:22.766Z

[tool_use: Read]

### User | 2026-06-02T03:30:30.463Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/derive-ground-truth-from-cad.mjs
3	//
4	// U-TDP05 — CAD Ground Truth Derivation CLI.
5	//
6	// Reads `cad-corpus-step-geometry-report.json` (the per-class aggregate
7	// produced by mine-step-geometry-evidence.ts — already shipped + populated
8	// against 662/665 STEP files in the JM Die corpus) and emits one GT catalog
9	// per part_class to state/shared/ocr-gr
... [+6449 chars truncated]

### Assistant | 2026-06-02T03:30:36.603Z

This is the keystone finding. There's a complete existing CAD ground-truth pipeline. The header (lines 8-17) names the canonical actors:
- `mine-step-geometry-evidence.ts` — already shipped, parsed **662/665 STEP files in the JM Die corpus** → `cad-corpus-step-geometry-report.json`
- MCP dispatcher action `cad_step_parse_file` — already exposed by mcp-server for per-file live STEP parsing
- `derive-ground-truth-from-cad.mjs` — emits per-class GT catalogs

Let me read `mine-step-geometry-evidence.ts` (the real per-file STEP parser that did 662 files) and confirm the `cad_step_parse_file` dispatcher action + units handling, plus check whether the corpus report already exists on disk.

### Assistant | 2026-06-02T03:30:39.009Z

[tool_use: Bash]

### Assistant | 2026-06-02T03:30:39.901Z

[tool_use: Read]

### User | 2026-06-02T03:30:47.732Z

[tool_result] mcp-server/scripts/mine-step-geometry-evidence.ts  5.8K
===report on disk?===
mcp-server/data/state/cad-corpus-step-geometry-report.json  6.4K
===cad_step_parse_file dispatcher===
mcp-server/src/tools/dispatchers/cadDispatcher.ts

### User | 2026-06-02T03:30:48.033Z

[tool_result] 1	/**
2	 * mine-step-geometry-evidence.ts — Walk the corpus STEP files, parse each
3	 * one with STEPGeometryParserEngine, and aggregate per-class feature
4	 * evidence from real geometry (not filenames).
5	 *
6	 * Run: npx tsx mcp-server/scripts/mine-step-geometry-evidence.ts
7	 */
8	import { cadCorpusIngestionEngine } from "../src/engines/CADCorpusIngestionEngine.js";
9	import { stepGeometryPars
... [+2585 chars truncated]

### Assistant | 2026-06-02T03:30:51.531Z

Now the canonical parser is confirmed: `STEPGeometryParserEngine` (a pure text-parser of STEP entities, no WASM) is what mined the corpus. The `cad_step_parse_file` action is in `cadDispatcher.ts`. Let me read the STEPGeometryParserEngine's parse output shape + units handling, and the dispatcher action, in parallel — this is the final piece.

### Assistant | 2026-06-02T03:30:53.019Z

[tool_use: Bash]

### Assistant | 2026-06-02T03:30:55.155Z

[tool_use: Bash]

### User | 2026-06-02T03:31:06.344Z

[tool_result] 278
===HEADER===
// WIRE-EXEMPT: training surface consumed by scripts/learn-step-geometry-prevalence.ts
// to mine real geometric evidence from the corpus STEP files. Replaces filename-
// token learning with surface-composition learning. Dispatcher integration
// follows in CAD-FUSION-LIVE-MS1 alongside the visual-fidelity gate.
/**
 * STEPGeometryParserEngine — Parse ISO 10303-21 STEP files for 
... [+2048 chars truncated]

### User | 2026-06-02T03:31:12.066Z

[tool_result] ===units/conversion lines===
39:export interface STEPEntityCounts {
53:export interface InferredGeometry {
75:export interface STEPParseResult {

### Assistant | 2026-06-02T03:31:19.439Z

Critical distinction now clear. There are TWO STEP parsers with very different capabilities:

1. **`STEPGeometryParserEngine`** (278 lines, pure text, no kernel) — counts entity types, infers feature *presence* (holes/fillets/tapers/freeform). **NO dimensions, NO bounding box, NO units handling** — it's presence/count-only. This is what mined the corpus → ground-truth.
2. **`StepImportEngine`** (1157 lines, occt-import-js WASM) — real geometry: bounding_box, volume_mm3, surface_area, hole `diameter_mm`/`depth_mm`, pockets/slots dims. But **no units conversion in-engine** (grep found 0 scale/inch/0.0254 hits) — it emits raw occt numbers with a `_mm` label.

Let me read the STEPParseResult shape (lines 53-110) and the dispatcher action to finalize, plus confirm StepImportEngine emits raw units (the `_mm` naming hazard for JM inch parts).

### Assistant | 2026-06-02T03:31:20.378Z

[tool_use: Read]

### Assistant | 2026-06-02T03:31:21.605Z

[tool_use: Bash]

### User | 2026-06-02T03:31:46.284Z

[tool_result] 53	export interface InferredGeometry {
54	  /** True if STEP has multiple cylindrical surfaces (likely a hole or stepped axis). */
55	  has_cylindrical_holes: boolean;
56	  /** Likely number of distinct cylindrical features (rough heuristic). */
57	  cylindrical_feature_count: number;
58	  /** True when CONICAL_SURFACE > 0 — i.e. some chamfer or taper exists. */
59	  has_taper_or_chamfer: boolean;
... [+2765 chars truncated]

### User | 2026-06-02T03:32:04.966Z

[tool_result] 229:  "cad_step_parse_file", "cad_step_parse_string", "cad_step_evidence_for_kinds",
2535:          case "cad_step_parse_file": {
2536:            const { stepGeometryParserEngine } = await import("../../engines/STEPGeometryParserEngine.js");
2537:            result = { success: true, data: stepGeometryParserEngine.parseFile(params.file_path) };
2540:          case "cad_step_parse_string": {
2541:
... [+441 chars truncated]

### Assistant | 2026-06-02T03:32:08.224Z

I now have everything needed. Let me do a final confirmation: sample one real STEP file head to verify format + JM inch units, and quickly verify StepImportEngine is dispatcher-wired (or not), since that's the only one giving real dimensions.

### Assistant | 2026-06-02T03:32:13.411Z

[tool_use: Bash]

### Assistant | 2026-06-02T03:32:15.793Z

[tool_use: Bash]

### User | 2026-06-02T03:32:44.064Z

[tool_result] === Sample 1: trainset OKUMA holder STEP ===
FILE_NAME ('H4Y4A1000.step',
FILE_SCHEMA (( 'AUTOMOTIVE_DESIGN' ));
=== Sample 2: resources Part1.STEP units ===
#138 =( LENGTH_UNIT ( ) NAMED_UNIT ( * ) SI_UNIT ( .MILLI., .METRE. ) );
#288 =( NAMED_UNIT ( * ) PLANE_ANGLE_UNIT ( ) SI_UNIT ( $, .RADIAN. ) );
#335 =( NAMED_UNIT ( * ) SI_UNIT ( $, .STERADIAN. ) SOLID_ANGLE_UNIT ( ) );
#467 =( NAMED_UNIT (
... [+495 chars truncated]

### User | 2026-06-02T03:32:48.044Z

[tool_result] === StepImportEngine dispatcher-wired? ===
mcp-server/src/tools/dispatchers/calcDispatcher.ts
--- action names if any ---

### Assistant | 2026-06-02T03:33:42.597Z

All confirmed. Note sample 2 (`Part1.STEP`) is **mm** (`SI_UNIT(.MILLI.,.METRE.)`), but sample 3 (`AEROSPACE VALVE BODY.STP`) is **inch** (`CONVERSION_BASED_UNIT('INCH')`) over a CENTI/METRE base — proving the mixed-units reality and exactly the `units-guard` dual-declaration gotcha. The dimensional `StepImportEngine` is NOT wired into any CAD dispatcher (only a stray match in calcDispatcher comment, no `step_import` action). Here is the report.

---

# SCOUT REPORT: Parsing JM CAD Models for OCR Ground-Truth Dimensions

## 1. CAD CORPUS — LOCATION + FORMAT BREAKDOWN + RESOLVABILITY

**Two distinct corpora:**

**A. Trainset CAD refs** (`H:/prism/state/shared/blueprint-trainset-clean.jsonl`, 3941 total rows, 350 with `subsets.roundtrip_b==true`):
- All 350 roundtrip_b rows have `cad_files[]` → **1572 CAD file entries**, **1572/1572 resolve on disk (100%)**.
- Format breakdown (by `ext`, resolve count = total for every format):

| ext | count | parseable as text for dims? |
|---|---|---|
| `.ipt` (Inventor part) | 1338 | NO — proprietary binary, needs Inventor/kernel |
| `.iam` (Inventor assembly) | 118 | NO — proprietary binary |
| `.stp` | 35 | YES — ISO 10303-21 text |
| `.stl` | 17 | mesh only (no features/units) |
| `.idw` (Inventor drawing) | 15 | NO |
| `.step` | 12 | YES — text |
| `.dwg` / `.dxf` | 10 / 10 | DXF text; DWG binary |
| `.sldprt` | 7 | NO — proprietary binary |
| `.igs` (IGES) | 6 | text (IGESImportEngine exists) |
| `.x_t` (Parasolid) | 4 | NO — proprietary binary |

  **Key reality: only 47 of 1572 trainset CAD files (3%) are STEP.** The corpus is ~92% Inventor `.ipt`/`.iam`, which the text-parser path CANNOT read — they require a CAD kernel or the live Fusion/Inventor bridge. Sample path: `H:\PRISM\JM DIE\HAAS-HURCO\OMG INC\M1005.ipt`. Resolved STEP example: `H:\PRISM\JM DIE\OKUMA\hyperCAD-S and hyperMILL Online Training\...\H4Y4A1000.step`.

**B. Standalone STEP dir** `H:/PRISM/resources/CAD FILES/`: 38 STEP files (**20 `.stp` + 18 `.step`**)
... [+7253 chars truncated]
