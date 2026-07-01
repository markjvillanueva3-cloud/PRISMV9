---
type: "chat-session"
source: "claude-code-cli"
session_id: "b3f47ec7-5613-49ad-a7a9-19371bba1ac7"
title: "Investigate PRISM's blueprint OCR reading pipeline in H:/prism/mcp-server/src/en"
date: "2026-06-03"
first_ts: "2026-06-03T18:08:50.601Z"
last_ts: "2026-06-03T18:16:15.804Z"
cwd: "H:\\prism"
messages: 89
user_msgs: 38
assistant_msgs: 51
raw_file: "H:/.claude/projects/H--prism/b3f47ec7-5613-49ad-a7a9-19371bba1ac7/subagents/agent-a8d53a6b269bbacbb.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# Investigate PRISM's blueprint OCR reading pipeline in H:/prism/mcp-server/src/en

> **claude-code-cli** | 2026-06-03 | 89 msgs (38 user / 51 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b3f47ec7-5613-49ad-a7a9-19371bba1ac7/subagents/agent-a8d53a6b269bbacbb.jsonl`

## Transcript

### User | 2026-06-03T18:08:50.601Z

Investigate PRISM's blueprint OCR reading pipeline in H:/prism/mcp-server/src/engines/blueprint-vision/ and related dirs. I need concrete answers, cite file:line:

1. How does OCR currently work — is it heuristic/regex-based, or does it call a model (tesseract, an LLM, a vision model, a cloud OCR API)? List the primary engines (BlueprintVisionOCREngine, PDFBlueprintDimensionExtractorEngine, PDFBlueprintPatternRescueEngine, GDTCalloutParserEngine) and 1 line each on what each does and HOW (what library/model/method).
2. Is there any GPU-accelerated or model-based OCR path today, or a clear seam where a local vision/OCR model (llava, qwen2-vl, minicpm-v, got-ocr) could plug in to improve accuracy?
3. Is there a blueprint LoRA or training/fine-tune path (blueprint_lora_* actions, blueprint_rag_* actions)? Where is the training script, the corpus, the ground-truth registry? What format is the training data?
4. What are the accuracy gates (OCR per-field floor, CAD-fidelity, S(x)) and where are accuracy events logged (blueprint-accuracy-events.jsonl)?

Then answer the key question concretely: **"What would it actually take to use an RTX 6000 (96GB, can run 32B-class or vision models) to improve OCR blueprint reading accuracy here, and what is the smallest real, shippable improvement?"** Distinguish what's buildable now vs what's vaporware. Be concrete with file paths. Search breadth: very thorough.

### Assistant | 2026-06-03T18:09:02.046Z

I'll investigate PRISM's blueprint OCR pipeline thoroughly. Let me start by exploring the structure and understanding the current implementation.

### Assistant | 2026-06-03T18:09:02.269Z

[tool_use: Glob]

### Assistant | 2026-06-03T18:09:02.490Z

[tool_use: Glob]

### Assistant | 2026-06-03T18:09:02.684Z

[tool_use: Bash]

### User | 2026-06-03T18:09:04.643Z

[tool_result] No files found

### User | 2026-06-03T18:09:05.034Z

[tool_result] No files found

### User | 2026-06-03T18:09:12.306Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-03T18:09:18.403Z

Let me check if the directory structure exists and search more carefully.

### Assistant | 2026-06-03T18:09:18.597Z

[tool_use: Bash]

### Assistant | 2026-06-03T18:09:18.781Z

[tool_use: Bash]

### User | 2026-06-03T18:09:27.678Z

[tool_result] total 78969
drwxr-xr-x 1 wompu 197611      0 Jun  3 12:50 ./
drwxr-xr-x 1 wompu 197611      0 Jun  2 20:21 ../
drwxr-xr-x 1 wompu 197611      0 Apr 19 22:06 .claude/
-rw-r--r-- 1 wompu 197611   5863 May 24 12:18 A2AProtocolEngine.ts
-rw-r--r-- 1 wompu 197611   6909 Apr 16 11:36 AGISafetyContainmentEngine.ts
-rw-r--r-- 1 wompu 197611   4206 Mar  7 21:40 AHPEngine.ts
-rw-r--r-- 1 wompu 197611  22312
... [+3180 chars truncated]

### User | 2026-06-03T18:09:54.815Z

[tool_result] H:/prism/knowledge/memories/galaxies/blueprint-vision
H:/prism/knowledge/wiki/architecture/engines/blueprint
H:/prism/knowledge/wiki/architecture/tests/blueprint
H:/prism/mcp-server/src/engines/blueprint-vision
H:/prism/state/shared/cad-cam-pdf-nodes/blueprint

### Assistant | 2026-06-03T18:09:57.702Z

Let me check the blueprint-vision directory structure:

### Assistant | 2026-06-03T18:09:57.912Z

[tool_use: Bash]

### Assistant | 2026-06-03T18:09:58.174Z

[tool_use: Bash]

### User | 2026-06-03T18:10:08.459Z

[tool_result] total 1088
drwxr-xr-x 1 wompu 197611     0 May 29 12:54 ./
drwxr-xr-x 1 wompu 197611     0 Jun  3 12:50 ../
-rw-r--r-- 1 wompu 197611 15799 May 29 12:54 CLAUDE.md
-rw-r--r-- 1 wompu 197611  6899 May 29 10:16 GSD_BLUEPRINT_VISION.md
-rw-r--r-- 1 wompu 197611 10614 Jun  2 13:00 MEMORY.md
-rw-r--r-- 1 wompu 197611 13474 Jun  1 22:14 PATHS.md
-rw-r--r-- 1 wompu 197611  5490 May 29 08:54 TOOLBELT.md

### User | 2026-06-03T18:10:09.575Z

[tool_result] H:/prism/mcp-server/src/engines/blueprint-vision/CLAUDE.md
H:/prism/mcp-server/src/engines/blueprint-vision/GSD_BLUEPRINT_VISION.md
H:/prism/mcp-server/src/engines/blueprint-vision/MEMORY.md
H:/prism/mcp-server/src/engines/blueprint-vision/PATHS.md
H:/prism/mcp-server/src/engines/blueprint-vision/TOOLBELT.md

### Assistant | 2026-06-03T18:10:11.836Z

Let me read the key documentation files to understand the architecture:

### Assistant | 2026-06-03T18:10:11.837Z

[tool_use: Read]

### Assistant | 2026-06-03T18:10:12.150Z

[tool_use: Read]

### Assistant | 2026-06-03T18:10:12.270Z

[tool_use: Read]

### User | 2026-06-03T18:10:20.635Z

[tool_result] 1	# Blueprint-Vision Galaxy (XRAY slot)
2	
3	Operational scope per `state/shared/CHAT-SLOT-DOMAINS.md`:
4	> XRAY — OCR + BLUEPRINT READING + CAD FILE DATA EXTRACTION (operator-canonical 2026-05-28). Owns the vision/extraction pipeline: turning unstructured inputs (blueprints, PDFs, raster scans, native CAD files) into structured PRISM data (features, tolerances, GD&T callouts, geometry, materials)
... [+15599 chars truncated]

### User | 2026-06-03T18:10:20.680Z

[tool_result] 1	# Blueprint-Vision Galaxy — H:/-wide PATHS atlas (XRAY slot)
2	
3	> The O(N)→O(1) navigation map for slot:xray. Every path verified on disk 2026-05-29 (3 parallel inventory agents). Format: `<abs-path> | <purpose> | <maintainer-slot>`.
4	> ⚠ Paths the alpha seed invented that DO NOT exist are listed under `## Phantom paths` — never reference them.
5	
6	## Engine sources (mcp-server/src/engines/*
... [+13285 chars truncated]

### User | 2026-06-03T18:10:20.858Z

[tool_result] 1	# GSD — Blueprint-Vision domain protocol (slot:xray)
2	
3	> Domain-specific "Get Stuff Done" session protocol for the extraction pipeline. Sister to `mcp-server/data/docs/gsd/GSD_QUICK.md` (fleet session-lifecycle) — THIS doc is the **per-extraction operating procedure**. Built 2026-05-29 (U-PSGB-XRAY continuation), every asset verified on disk.
4	> **Provenance discipline:** the alpha seed hall
... [+6545 chars truncated]

### Assistant | 2026-06-03T18:10:24.668Z

Excellent. Now let me read the MEMORY file and explore the actual engine implementations:

### Assistant | 2026-06-03T18:10:24.737Z

[tool_use: Read]

### Assistant | 2026-06-03T18:10:24.741Z

[tool_use: Read]

### Assistant | 2026-06-03T18:10:24.845Z

[tool_use: Read]

### User | 2026-06-03T18:10:27.542Z

[tool_result] 1	# Blueprint-Vision Galaxy MEMORY.md — per-domain working brain (XRAY slot)
2	
3	> Append-only. Pointer-style. ≤200 lines · ≤140 chars/entry. Older entries archive to MEMORY-ARCHIVE.md.
4	
5	## Master-brain link
6	- **UP (pull from master):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md`
7	  — recall: `prism_memory:semantic_search query="blueprint ocr pdf cad-extract gdt tolerance" 
... [+10332 chars truncated]

### User | 2026-06-03T18:10:27.789Z

[tool_result] 1	// WIRE-EXEMPT: dispatcher import was removed by an unrelated peer revert mid-session
2	// (CAD-FUSION-LIVE-MS0 / 2026-05-06). Engine is consumed via direct import by
3	// PrintToFusion360Bridge + downstream OCR pipelines and does not need its own
4	// dispatcher action surface; restoring the previous prism_cad lazy import is
5	// scheduled in the same milestone's restoration commit alongside th
... [+5129 chars truncated]

### User | 2026-06-03T18:10:29.123Z

[tool_result] 1	/**
2	 * BlueprintOCREngine — Engineering Print & Blueprint Reading
3	 *
4	 * Extracts manufacturing-relevant data from engineering drawings/prints:
5	 * - Dimension callouts (linear, angular, radial, diameter)
6	 * - GD&T (Geometric Dimensioning & Tolerancing) symbols and frames
7	 * - Title block metadata (part number, revision, material, finish)
8	 * - Notes and annotations (process notes, ma
... [+4684 chars truncated]

### Assistant | 2026-06-03T18:10:32.688Z

Let me continue reading the OCR engines and then search for the LoRA, RAG, and training paths:

### Assistant | 2026-06-03T18:10:33.968Z

[tool_use: Read]

### Assistant | 2026-06-03T18:10:33.345Z

[tool_use: Read]

### Assistant | 2026-06-03T18:10:33.762Z

[tool_use: Read]

### User | 2026-06-03T18:10:37.677Z

[tool_result] 1	/**
2	 * PDFBlueprintDimensionExtractorEngine — Blueprint Dimension Extraction
3	 *
4	 * Extracts dimension callouts, GD&T symbols, surface finishes, thread
5	 * specifications, and part info from text-based PDF blueprint content.
6	 * Uses regex pattern matching for manufacturing drawing conventions.
7	 *
8	 * Actions: cad_pdf_blueprint_extract (via cadDispatcher)
9	 *
10	 * Sister engine for t
... [+2628 chars truncated]

### User | 2026-06-03T18:10:37.690Z

[tool_result] 1	/**
2	 * GDTCalloutParserEngine
3	 * =======================
4	 *
5	 * Parses ASME Y14.5 / ISO 1101 GD&T feature control frames (FCF) from
6	 * plain-text drawing callouts into structured data.
7	 *
8	 * Input formats accepted:
9	 *   "|⌀|0.02|A|B(M)|"              — unicode with separators
10	 *   "POS 0.02 A B M"                 — shorthand
11	 *   "⟂ 0.05 A"                       — perpendicu
... [+3353 chars truncated]

### User | 2026-06-03T18:10:37.699Z

[tool_result] 1	/**
2	 * PDFBlueprintPatternRescueEngine — additive regex patterns for US engineering
3	 * drawing conventions absent from PDFBlueprintDimensionExtractorEngine.
4	 *
5	 * BLUEPRINT-OCR-TRAINING-MS1 / U2 RESCUE (2026-05-16, slot bravo)
6	 * ============================================================================
7	 * Rescued value-add from the v8.89.002 monolith fork PRISM_OCR_ENGINE.js
8	 * 
... [+4229 chars truncated]

### Assistant | 2026-06-03T18:10:46.131Z

Now let me search for the LoRA and training-related engines and scripts:

### system

... [9 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-03T18:11:08.410Z

[tool_use: Bash]

### User | 2026-06-03T18:11:10.849Z

[tool_result] File content (53226 tokens) exceeds maximum allowed tokens (25000). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### User | 2026-06-03T18:11:24.546Z

[tool_result] (Bash completed with no output)

### User | 2026-06-03T18:11:24.579Z

[tool_result] -rw-r--r-- 1 wompu 197611 258K May 31 23:45 H:/prism/state/shared/blueprint-accuracy-events.jsonl
-rw-r--r-- 1 wompu 197611 2.3K May 24 12:55 H:/prism/state/shared/blueprint-extraction-100pct-proof-2026-05-24.jsonl
-rw-r--r-- 1 wompu 197611  16M May 24 01:52 H:/prism/state/shared/blueprint-extraction-accuracy-2026-05-24.jsonl
-rw-r--r-- 1 wompu 197611 497K May 24 01:57 H:/prism/state/shared/bluepr
... [+291 chars truncated]

### Assistant | 2026-06-03T18:11:28.132Z

Let me read the accuracy events file in chunks and also look at the training setup:

### Assistant | 2026-06-03T18:11:28.135Z

[tool_use: Read]

### Assistant | 2026-06-03T18:11:28.474Z

[tool_use: Read]

### Assistant | 2026-06-03T18:11:28.628Z

[tool_use: Read]

### User | 2026-06-03T18:11:36.827Z

[tool_result] File does not exist. Note: your current working directory is H:\prism.

### User | 2026-06-03T18:11:37.799Z

[tool_result] File content (28429 tokens) exceeds maximum allowed tokens (25000). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### User | 2026-06-03T18:11:38.463Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-blueprint-training-manifest.mjs — slot:xray (U-PSGB-XRAY training push, 2026-05-29)
4	 *
5	 * Partitions the DocuStrata classified index into training-readiness buckets so the
6	 * operator knows EXACTLY how many real blueprints need the GPU-OCR run before the
7	 * LoRA corpus can be assembled. Spec: state/shared/specs/BLUEPRINT-VISION-TRAINING-READINESS-2026
... [+4378 chars truncated]

### Assistant | 2026-06-03T18:11:42.276Z

Let me check the training directory structure and look for the Tesseract bridge engine:

### Assistant | 2026-06-03T18:11:42.623Z

[tool_use: Bash]

### Assistant | 2026-06-03T18:11:43.253Z

[tool_use: Read]

### Assistant | 2026-06-03T18:11:43.547Z

[tool_use: Bash]

### User | 2026-06-03T18:12:09.445Z

[tool_result] 1	/**
2	 * TesseractOCRBridgeEngine — U-QP-TESS-OCR (Axis J)
3	 *
4	 * Operator-stated (verbatim): "make sure the entire quoting feature is phone
5	 * friendly so salesmen can take pictures of prints and physical parts for
6	 * instant accurate quoting."
7	 *
8	 * Provider-agnostic OCR bridge. Browser side: tesseract.js worker. Node
9	 * server side: tesseract.js (Node bindings) OR pluggable Azure
... [+4802 chars truncated]

### User | 2026-06-03T18:12:14.297Z

[tool_result] total 20233
drwxr-xr-x 1 wompu 197611        0 May 20 01:15 ./
drwxr-xr-x 1 wompu 197611        0 Jun  3 08:15 ../
-rw-r--r-- 1 wompu 197611   178100 May  1 15:47 cam-unified-corpus.json
-rw-r--r-- 1 wompu 197611   231924 May  1 15:47 hypermill-automation-extracted.json
-rw-r--r-- 1 wompu 197611   185068 May  1 15:47 hypermill-batch-extracted.json
-rw-r--r-- 1 wompu 197611  1230758 May  1 15:47 hy
... [+1411 chars truncated]

### User | 2026-06-03T18:13:06.110Z

[tool_result] H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/agentic-flow/dist/router/providers/ollama.d.ts
H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/claude-flow/.claude/worktrees/adr-120-impl/v3/@claude-flow/providers/src/ollama-provider.ts
H:/prism/.cache/npm/_npx/09002f125df728b2/node_modules/claude-flow/.claude/worktrees/adr-135-integrate/v3/@claude-flow/providers/src/ollama-provider.ts
... [+1163 chars truncated]

### Assistant | 2026-06-03T18:13:09.131Z

Let me now check the ollama vision extraction library and the overall current OCR accuracy configuration:

### Assistant | 2026-06-03T18:13:09.596Z

[tool_use: Read]

### Assistant | 2026-06-03T18:13:10.302Z

[tool_use: Bash]

### Assistant | 2026-06-03T18:13:10.591Z

[tool_use: Bash]

### User | 2026-06-03T18:13:12.432Z

[tool_result] 1	// scripts/lib/ollama-vision-extract-lib.mjs
2	//
3	// U-TDP06 / U-PSGB-XRAY-RICH-SCHEMA — Ollama Vision Extractor (pure core).
4	//
5	// Builds the engineering-print extraction prompt and parses the model's JSON
6	// response into the RICH multi-zone BlueprintExtraction shape (title_block +
7	// dimensions + gdt + notes + profiles + part_bounds + thickness + surface
8	// finishes), mirroring th
... [+8811 chars truncated]

### User | 2026-06-03T18:13:21.082Z

[tool_result] H:/prism/mcp-server/src/engines/AcousticEmissionMonitoringEngine.ts:    return { state: "breakage", confidence: Math.min(0.98, 0.7 + maxKurt / 100), evidence };
H:/prism/mcp-server/src/engines/AcousticEmissionMonitoringEngine.ts:    return { state: "chipping", confidence: Math.min(0.95, 0.6 + maxKurt / 50), evidence };
H:/prism/mcp-server/src/engines/AcousticEmissionMonitoringEngine.ts:    return 
... [+3066 chars truncated]

### User | 2026-06-03T18:13:29.610Z

[tool_result] H:/prism/.claude/hooks/blueprint-accuracy-guard.mjs
H:/prism/.claude/hooks/blueprint-coverage-floor-guard.mjs
H:/prism/.claude/hooks/blueprint-coverage-floor-guard.test.mjs
H:/prism/.claude/hooks/blueprint-join-index-stale-check.mjs
H:/prism/.claude/hooks/cad-accuracy-gate.mjs
H:/prism/.claude/hooks/lib/enforce-formula-accuracy-gate.py
H:/prism/.claude/hooks/lib/enforce-formula-accuracy.py
H:/pris
... [+109 chars truncated]

### Assistant | 2026-06-03T18:13:32.859Z

Perfect. Now let me read the accuracy guard hook and verify the current GPU/model setup:

### Assistant | 2026-06-03T18:13:33.283Z

[tool_use: Read]

### Assistant | 2026-06-03T18:13:34.160Z

[tool_use: Bash]

### Assistant | 2026-06-03T18:13:34.689Z

[tool_use: Bash]

### User | 2026-06-03T18:13:37.403Z

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
... [+5108 chars truncated]

### User | 2026-06-03T18:13:46.373Z

[tool_result] 16://   instruction was proven ignored by qwen2.5-VL (the extracted proof values
23:// qwen3-vl:8b-instruct is the GPU-concurrency unlock (validated 2026-05-31, slot xray):
24:// loads at 8.1GB GPU-RESIDENT (vs qwen2.5vl:7b's 15.3GB which spills to CPU on a 16GB
26:// it fits CONCURRENTLY with the chat fleet's qwen2.5-coder offload. The INSTRUCT variant
27:// is mandatory — the bare qwen3-vl:8b is
... [+463 chars truncated]

### User | 2026-06-03T18:14:35.604Z

[tool_result] H:/prism/.claude/worktrees/rgs6-audit-v2/knowledge/wiki/architecture/hooks/runtime/blueprint-accuracy-guard.md
H:/prism/.claude/worktrees/rgs6-audit-v2/knowledge/wiki/architecture/layer-l6.md
H:/prism/knowledge/wiki/architecture/blueprint-vision-extraction-confidence.md
H:/prism/knowledge/wiki/architecture/blueprint-vision-galaxy.md
H:/prism/knowledge/wiki/architecture/blueprint-vision-knowledge-i
... [+7 chars truncated]

### Assistant | 2026-06-03T18:14:40.131Z

Excellent. Now let me read the blueprint vision knowledge index and do a final check on the ImageOCRPipelineEngine:

### Assistant | 2026-06-03T18:14:40.348Z

[tool_use: Read]

### Assistant | 2026-06-03T18:14:40.792Z

[tool_use: Read]

### Assistant | 2026-06-03T18:14:42.099Z

[tool_use: Bash]

### User | 2026-06-03T18:14:49.885Z

[tool_result] 1	/**
2	 * ImageOCRPipelineEngine — OCR Text Extraction from Images
3	 * U-AWR27: Image OCR Pipeline (550 images)
4	 */
5	
6	import { log } from '../utils/Logger.js';
7	
8	export type ImageFormat = 'jpg' | 'jpeg' | 'png' | 'tiff' | 'tif' | 'bmp' | 'gif' | 'webp';
9	export type OCRQuality = 'high' | 'medium' | 'low' | 'failed';
10	
11	export interface ImageMetadata {
12	  path: string;
13	  name: s
... [+3907 chars truncated]

### User | 2026-06-03T18:14:52.142Z

[tool_result] 1	---
2	name: blueprint-vision-extraction-confidence
3	type: architecture
4	domain: blueprint-vision
5	audience: [xray, delta, kilo, charlie, quality]
6	authored_by: xray
7	authored_on: 2026-05-29
8	related:
9	  - blueprint-vision-galaxy
10	  - blueprint-vision-multi-print-discipline
11	  - domain-tolerance
12	---
13	
14	# Extraction confidence + canonical-units + datum-tie doctrine
15	
16	**Why t
... [+2755 chars truncated]

### User | 2026-06-03T18:15:02.426Z

[tool_result] 30:- **OCR per-field floor = 0.70** (shipped, PRINT-TO-INSPECTION-PIPELINE-V2): below it → operator-confirm dialog with the highlighted region.
31:- **CAD-fidelity < 0.85** → flag for operator review before continuing.
32:- Safety output (feed/speed → machine) → S(x) ≥ 0.98 (shop_floor tier) downstream.
34:- ⚠ The seed's per-field "0.85 dims / 0.95 tol / 0.99 GD&T" tiering is a reasonable default 
... [+199 chars truncated]

### Assistant | 2026-06-03T18:16:15.804Z

Perfect. Now I have enough information. Let me compile the final comprehensive report.

---

## PRISM Blueprint OCR Pipeline Investigation — Complete Findings

Based on thorough exploration of `H:/prism/mcp-server/src/engines/blueprint-vision/` and related infrastructure, here are concrete answers to your questions:

### 1. **How OCR Currently Works — Architecture & Engines**

**Primary OCR engines (all verified on disk):**

| Engine | File | LOC | Method | How It Works |
|--------|------|-----|--------|-------------|
| **BlueprintVisionOCREngine** | `H:/prism/mcp-server/src/engines/BlueprintVisionOCREngine.ts` (37.9K) | ~800 | **Claude Vision API** (multimodal LLM) | Takes base64/file image → calls Anthropic SDK `claude-sonnet-4-20250514` → extracts dimensions, GD&T, title-block, profiles, surface finishes via structured JSON response. **Not Tesseract or heuristic.** Output: `BlueprintVisionResult` with per-field confidence scores. |
| **BlueprintOCREngine** | `H:/prism/mcp-server/src/engines/BlueprintOCREngine.ts` (35.7K) | ~850 | **Regex pattern matching** on pre-OCR'd text | Expects text-layer PDFs or extracted text (not raw images). Uses dimension/GD&T/thread/chamfer regex patterns. **Heuristic-based, no ML.** Returns `BlueprintAnalysis`. |
| **PDFBlueprintDimensionExtractorEngine** | `H:/prism/mcp-server/src/engines/PDFBlueprintDimensionExtractorEngine.ts` | ~400 | **Regex + symbol table** (GD&T unicode → symbol) | Extracts dims/GD&T/surface-finish from PDF text layer. Per-field confidence 0..1. Uses `GDT_SYMBOLS` lookup table (unicode ⌀ → "diameter", etc.). |
| **PDFBlueprintPatternRescueEngine** | `H:/prism/mcp-server/src/engines/PDFBlueprintPatternRescueEngine.ts` | ~300 | **Additive regex** (fractional/limit-pair/N-grade/microinch) | Rescued from v8.89.002 monolith. Captures US engineering conventions missed by sister engine: "1/2\"", "1.000/1.002", "N4..N12 Ra", "32 uin". **Purely regex, composition pattern with sibling.** |
| **GDTCalloutParserEngine** |
... [+17616 chars truncated]
