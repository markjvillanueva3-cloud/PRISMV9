---
type: "chat-session"
source: "claude-code-cli"
session_id: "cb7f240f-2c6d-48c0-b225-0a2fba99eec8"
title: "Inventory PRISM's wiki and tribal-knowledge entries about blueprint reading, OCR"
date: "2026-05-27"
first_ts: "2026-05-27T18:37:32.012Z"
last_ts: "2026-05-27T18:44:27.026Z"
cwd: "H:\\PRISM"
messages: 136
user_msgs: 65
assistant_msgs: 71
raw_file: "H:/.claude/projects/H--prism/cb7f240f-2c6d-48c0-b225-0a2fba99eec8/subagents/agent-a5f34ac43bc552a6d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:27"
---

# Inventory PRISM's wiki and tribal-knowledge entries about blueprint reading, OCR

> **claude-code-cli** | 2026-05-27 | 136 msgs (65 user / 71 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/cb7f240f-2c6d-48c0-b225-0a2fba99eec8/subagents/agent-a5f34ac43bc552a6d.jsonl`

## Transcript

### User | 2026-05-27T18:37:32.012Z

Inventory PRISM's wiki and tribal-knowledge entries about blueprint reading, OCR, and CAD file parsing. Report under 300 words, dense bullet format only.

Scope:
- Wiki entries under `H:/prism-slot-mike/knowledge/wiki/**/*.md` matching keywords: blueprint, OCR, print-reading, PDF, dimension-extract, CAD-import, DXF, DWG, STEP, IGES, SLDPRT, vision-OCR, page-by-page, Llava. For EACH: path, 1-line summary from the file's H1/`description:` frontmatter line. Do NOT read full body.
- Tribal knowledge nodes in `H:/prism-slot-mike/mcp-server/src/data/*.ts` matching blueprint/OCR/CAD-reading topics. Look at `wedm-knowledge-tips.ts`, `mill-knowledge-tips.ts`, `lathe-knowledge-tips.ts`, `blueprint-knowledge-tips.ts` (if exists), `cad-knowledge-tips.ts` (if exists), `general-knowledge-tips.ts`. Report: file path, count of OCR/blueprint/CAD tips, top 5 tip ids with one-phrase topic.
- Course material under `H:/prism-slot-mike/knowledge/courses/` or `H:/prism-slot-mike/data/courses/` that covers print-reading or CAD interpretation. Path + course title.
- The blueprint-ocr-operator-wisdom wiki entry — find its exact path and the count of distinct rules it documents.

Use Glob/Grep + read only the first 20 lines of each matched file (frontmatter + H1 + description).

Goal: dense atlas a downstream chat can grep. Output format strictly:
```
WIKI:
  path | 1-line summary
TRIBAL:
  file | count | top-5 ids
COURSES:
  path | title
```
Nothing else.

### Assistant | 2026-05-27T18:37:47.320Z

I'll inventory the PRISM knowledge base for blueprint/OCR/CAD entries.

### Assistant | 2026-05-27T18:37:47.718Z

[tool_use: Glob]

### Assistant | 2026-05-27T18:37:49.950Z

[tool_use: Glob]

### Assistant | 2026-05-27T18:37:49.952Z

[tool_use: Glob]

### Assistant | 2026-05-27T18:37:49.953Z

[tool_use: Glob]

### User | 2026-05-27T18:37:49.992Z

[tool_result] <tool_use_error>Directory does not exist: H:/prism-slot-mike/knowledge/courses. Note: your current working directory is H:\PRISM.</tool_use_error>

### User | 2026-05-27T18:37:50.023Z

[tool_result] <tool_use_error>Directory does not exist: H:/prism-slot-mike/data/courses. Note: your current working directory is H:\PRISM.</tool_use_error>

### User | 2026-05-27T18:38:01.975Z

[tool_result] H:\prism-slot-mike\mcp-server\src\data\additional-tool-catalog.ts
H:\prism-slot-mike\mcp-server\src\data\agie-power-extracted.ts
H:\prism-slot-mike\mcp-server\src\data\ampc-tool-catalog.ts
H:\prism-slot-mike\mcp-server\src\data\auto-ingested-tips.ts
H:\prism-slot-mike\mcp-server\src\data\benchmark-industry-programs.ts
H:\prism-slot-mike\mcp-server\src\data\benchmark-parts-index.ts
H:\prism-slot-mi
... [+6212 chars truncated]

### User | 2026-05-27T18:38:16.450Z

[tool_result] H:\prism-slot-mike\knowledge\wiki\architecture\_disconnected-graph-nodes.md
H:\prism-slot-mike\knowledge\wiki\architecture\_orphans-rescue.md
H:\prism-slot-mike\knowledge\wiki\architecture\action-trace-engine.md
H:\prism-slot-mike\knowledge\wiki\architecture\actions\adaptivecontrol\acal.md
H:\prism-slot-mike\knowledge\wiki\architecture\actions\adaptivecontrol\adachat.md
H:\prism-slot-mike\knowledg
... [+8379 chars truncated]

### Assistant | 2026-05-27T18:38:26.427Z

Now let me narrow the search with targeted grep queries instead of broad globs.

### Assistant | 2026-05-27T18:38:28.152Z

[tool_use: Grep]

### Assistant | 2026-05-27T18:38:29.179Z

[tool_use: Glob]

### Assistant | 2026-05-27T18:38:34.233Z

[tool_use: Glob]

### Assistant | 2026-05-27T18:38:34.235Z

[tool_use: Glob]

### Assistant | 2026-05-27T18:38:34.236Z

[tool_use: Glob]

### Assistant | 2026-05-27T18:38:34.237Z

[tool_use: Glob]

### Assistant | 2026-05-27T18:38:34.238Z

[tool_use: Glob]

### Assistant | 2026-05-27T18:38:35.086Z

[tool_use: Glob]

### Assistant | 2026-05-27T18:38:35.087Z

[tool_use: Glob]

### Assistant | 2026-05-27T18:38:35.399Z

[tool_use: Glob]

### Assistant | 2026-05-27T18:38:38.515Z

[tool_use: Glob]

### User | 2026-05-27T18:38:52.400Z

[tool_result] H:\prism-slot-mike\knowledge\wiki\architecture\actions\intelligence\xprocraps.md
H:\prism-slot-mike\knowledge\wiki\architecture\actions\intelligence\xprocreplaysampler.md
H:\prism-slot-mike\knowledge\wiki\architecture\actions\intelligence\xprocrewardshaper.md
H:\prism-slot-mike\knowledge\wiki\architecture\actions\intelligence\xprocruleextracted.md
H:\prism-slot-mike\knowledge\wiki\architecture\act
... [+493 chars truncated]

### User | 2026-05-27T18:38:52.408Z

[tool_result] H:\prism-slot-mike\knowledge\wiki\architecture\actions\business\blueprint-resolve-material.md
H:\prism-slot-mike\knowledge\wiki\architecture\actions\business\blueprint-to-quote.md
H:\prism-slot-mike\knowledge\wiki\architecture\actions\business\blueprintquotebridge.md
H:\prism-slot-mike\knowledge\wiki\architecture\actions\cad\blueprint-to-3d-model.md
H:\prism-slot-mike\knowledge\wiki\architecture\a
... [+2263 chars truncated]

### User | 2026-05-27T18:38:52.508Z

[tool_result] H:\prism-slot-mike\mcp-server\src\data\academy\course-0c-blueprint-reading.ts

### User | 2026-05-27T18:38:52.510Z

[tool_result] H:\prism-slot-mike\knowledge\wiki\architecture\actions\aireasoning\ai-wedm-print-to-program.md
H:\prism-slot-mike\knowledge\wiki\architecture\actions\business\blueprint-resolve-material.md
H:\prism-slot-mike\knowledge\wiki\architecture\actions\business\blueprint-to-quote.md
H:\prism-slot-mike\knowledge\wiki\architecture\actions\business\blueprintquotebridge.md
H:\prism-slot-mike\knowledge\wiki\arc
... [+8377 chars truncated]

### User | 2026-05-27T18:38:52.665Z

[tool_result] H:\prism-slot-mike\knowledge\wiki\architecture\actions\cad\cad-pdf-blueprint-extract.md
H:\prism-slot-mike\knowledge\wiki\architecture\actions\cam\cam-solidworks-automation-export-pdf.md
H:\prism-slot-mike\knowledge\wiki\architecture\actions\data\pdf-material-save.md
H:\prism-slot-mike\knowledge\wiki\architecture\actions\data\pdf-material-stats.md
H:\prism-slot-mike\knowledge\wiki\architecture\act
... [+1593 chars truncated]

### User | 2026-05-27T18:38:52.817Z

[tool_result] H:\prism-slot-mike\mcp-server\src\data\controller-knowledge-tips.ts
H:\prism-slot-mike\mcp-server\src\data\tribal-knowledge-tips.ts
H:\prism-slot-mike\mcp-server\src\data\wedm-knowledge-tips.ts

### User | 2026-05-27T18:38:53.297Z

[tool_result] H:\prism-slot-mike\mcp-server\src\data\bobcad-cam-tips.ts
H:\prism-slot-mike\mcp-server\src\data\hypercad-python-api.ts
H:\prism-slot-mike\mcp-server\src\data\cad-validation-corpus.ts

### User | 2026-05-27T18:38:53.796Z

[tool_result] H:\prism-slot-mike\knowledge\wiki\architecture\actions\cad\assembly-to-cadquery.md
H:\prism-slot-mike\knowledge\wiki\architecture\actions\cad\blueprint-to-all-cads-capabilities.md
H:\prism-slot-mike\knowledge\wiki\architecture\actions\cad\blueprint-to-all-cads-validate.md
H:\prism-slot-mike\knowledge\wiki\architecture\actions\cad\blueprint-to-all-cads.md
H:\prism-slot-mike\knowledge\wiki\architect
... [+8219 chars truncated]

### User | 2026-05-27T18:38:53.799Z

[tool_result] H:\prism-slot-mike\knowledge\wiki\architecture\courses\academy-course-0c-blueprint-reading-blueprint-reading-gd-t.md

### User | 2026-05-27T18:38:53.812Z

[tool_result] No files found

### User | 2026-05-27T18:39:10.868Z

[tool_result] Found 195 files
H:\prism-slot-mike\knowledge\wiki\code-tribal\mike-bridge-wiring-race-mitigation-2026-05-23.md
H:\prism-slot-mike\knowledge\wiki\os\commands\quote-to-ship.md
H:\prism-slot-mike\knowledge\wiki\os\commands\cad-from-blueprint.md
H:\prism-slot-mike\knowledge\wiki\lessons\fleet-task-health-recovery.md
H:\prism-slot-mike\knowledge\wiki\lessons\feature-gap-audit-digest-staleness.md
H:\pri
... [+14041 chars truncated]

### Assistant | 2026-05-27T18:39:17.241Z

[tool_use: Glob]

### Assistant | 2026-05-27T18:39:19.346Z

[tool_use: Grep]

### Assistant | 2026-05-27T18:39:20.457Z

[tool_use: Read]

### Assistant | 2026-05-27T18:39:20.880Z

[tool_use: Read]

### User | 2026-05-27T18:39:42.689Z

[tool_result] No files found

### User | 2026-05-27T18:39:44.819Z

[tool_result] 1	/**
2	 * Course 0C: Blueprint Reading & GD&T
3	 * Level: Novice | 12 Modules | ~10 hours
4	 *
5	 * Read any engineering drawing — from basic orthographic views
6	 * through full GD&T feature control frames. The longest
7	 * pre-machining course because blueprint literacy is essential
8	 * for every single job a machinist touches.
9	 */
10	
11	import type { Module, Lesson, Question } from
12	  ".
... [+318 chars truncated]

### User | 2026-05-27T18:39:44.931Z

[tool_result] 1	/**
2	 * Tribal Knowledge Tips (legacy schema) — used by Okuma-specific catalogs.
3	 *
4	 * Used by:
5	 *   - data/lathe-tribal-tips-okuma.ts (OKUMA_LATHE_TRIBAL_TIPS)
6	 *   - engines/OkumaGosigerTranscriptMinerEngine.ts
7	 *
8	 * This is a parallel shape to data/tribal-knowledge-types.ts — kept separate
9	 * because the Okuma tips use `id` + `tip` (one-line guidance) instead of
10	 * `tip_id` 
... [+290 chars truncated]

### system

... [56 middle messages omitted -- see raw_file] ...

### Assistant | 2026-05-27T18:41:35.147Z

[tool_use: Read]

### Assistant | 2026-05-27T18:41:36.139Z

[tool_use: Read]

### Assistant | 2026-05-27T18:41:36.643Z

[tool_use: Read]

### Assistant | 2026-05-27T18:41:37.462Z

[tool_use: Read]

### User | 2026-05-27T18:42:02.895Z

[tool_result] Found 4 files
H:\prism-slot-mike\knowledge\wiki\architecture\engines\cad\blueprintextractionragengine.md
H:\prism-slot-mike\knowledge\wiki\architecture\engines\cad\blueprintcorpusharvestengine.md
H:\prism-slot-mike\knowledge\wiki\architecture\engines\ai\blueprintlorabridgeengine.md
H:\prism-slot-mike\knowledge\memories\reference\reference_blueprint_ocr_training_ms1_collision.md

### User | 2026-05-27T18:42:03.879Z

[tool_result] 1	/**
2	 * Controller Knowledge Tips — CNC Controller Programming Intelligence
3	 *
4	 * 50 expert-level tips covering 22 controller families across 48 machine brands.
5	 * Covers: Fanuc, Siemens, Heidenhain, Haas, Mazak, Okuma, Hurco, Makino,
6	 *         Brother, Citizen, Mitsubishi, Fidia, Sodick, DATRON, Fadal, Traub,
7	 *         Kitamura, Index, EMAG, Heller, and cross-controller best practi
... [+795 chars truncated]

### User | 2026-05-27T18:42:03.946Z

[tool_result] 1	/**
2	 * BobCAD-CAM Tribal Knowledge Tips
3	 * 220 expert-level tips covering BobCAD-CAM V36/V37
4	 * Generated 2026-03-13
5	 */
6	import type { KnowledgeTip } from "../engines/TribalKnowledgeEngine";
7	
8	export const BOBCAD_CAM_TIPS: KnowledgeTip[] = [
9	  // === Adaptive Roughing (bc-001 to bc-010) ===
10	  {
11	    id: "bc-001",
12	    title: "Adaptive Roughing Maintains Constant Tool Engage
... [+801 chars truncated]

### User | 2026-05-27T18:42:04.009Z

[tool_result] 1	/**
2	 * cad-validation-corpus.ts — CAD-DRAW-MAX-MS1/U-VALIDATION-50-CORPUS
3	 *
4	 * Curated starter corpus of 12 JM-Die-derived validation cases spanning
5	 * mill / lathe / wire-EDM. Each case is a {@link ValidationTestCase} that
6	 * the CADDrawAnyPartValidationHarnessEngine can run end-to-end against
7	 * the orchestrator.
8	 *
9	 * Scope (v1, this unit):
10	 *   - 12 hand-crafted cases (4 
... [+627 chars truncated]

### User | 2026-05-27T18:42:04.032Z

[tool_result] 1	/**
2	 * hyperCAD-S / hyperMILL Python API Reference
3	 *
4	 * Complete Python scripting API for CAD/CAM automation via OPEN MIND's SDK.
5	 * Use this instead of building custom CAD — hyperCAD-S is fully programmable.
6	 *
7	 * Key modules:
8	 * - om.cad.core — Document management, selection, undo
9	 * - om.cad.commands — Sketch, properties, file operations
10	 * - om.cad.booleans — Solid boolea
... [+319 chars truncated]

### User | 2026-05-27T18:42:17.695Z

[tool_result] Found 7 files
H:\prism-slot-mike\state\shared\zebra-awareness-index.json
H:\prism-slot-mike\state\shared\specs\DOMAIN-PIPELINE-MS0-CONFIG.json
H:\prism-slot-mike\state\shared\slot-souls\foxtrot.md
H:\prism-slot-mike\knowledge\wiki\lessons\bug-findings-wiki-gate.md
H:\prism-slot-mike\mcp-server\src\engines\ExceptionLearningEngine.ts
H:\prism-slot-mike\mcp-server\src\__tests__\aiReasoningDispatcher.
... [+86 chars truncated]

### User | 2026-05-27T18:42:17.939Z

[tool_result] No files found

### Assistant | 2026-05-27T18:42:22.801Z

The graph references "Blueprint OCR / Print-Reading — Operator Wisdom" but the file isn't found by Glob. Let me check the system graph node and the foxtrot soul for paths, plus count rules.

### Assistant | 2026-05-27T18:42:24.603Z

[tool_use: Grep]

### Assistant | 2026-05-27T18:42:26.237Z

[tool_use: Grep]

### Assistant | 2026-05-27T18:42:27.196Z

[tool_use: Read]

### Assistant | 2026-05-27T18:42:27.644Z

[tool_use: Read]

### Assistant | 2026-05-27T18:42:29.771Z

[tool_use: Grep]

### Assistant | 2026-05-27T18:42:31.466Z

[tool_use: Grep]

### Assistant | 2026-05-27T18:42:32.397Z

[tool_use: Grep]

### User | 2026-05-27T18:42:47.997Z

[tool_result] No matches found

Found 0 total occurrences across 0 files.

### User | 2026-05-27T18:42:48.281Z

[tool_result] H:\prism-slot-mike\mcp-server\src\data\wedm-knowledge-tips.ts:30

Found 30 total occurrences across 1 file.

### User | 2026-05-27T18:42:48.304Z

[tool_result] H:\prism-slot-mike\mcp-server\src\data\controller-knowledge-tips.ts:121

Found 121 total occurrences across 1 file.

### User | 2026-05-27T18:42:50.681Z

[tool_result] 1	---
2	title: Blueprint pattern — linear
3	slug: blueprint-dim-linear
4	kind: code-tribal
5	status: shipped
6	date: 2026-05-21
7	milestone: PRINT-OCR-100PCT-MS0
8	unit: U4
9	generated: true
10	---
11	
12	# Reading `linear` regions on blueprints
13	
14	Observed in the corpus: **0 regions** across all customer families.
15	

### User | 2026-05-27T18:42:51.433Z

[tool_result] 1	---
2	title: Blueprint pattern — gdt_positional
3	slug: blueprint-dim-gdt-positional
4	kind: code-tribal
5	status: shipped
6	date: 2026-05-21
7	milestone: PRINT-OCR-100PCT-MS0
8	unit: U4
9	generated: true
10	---
11	
12	# Reading `gdt_positional` regions on blueprints
13	
14	Observed in the corpus: **0 regions** across all customer families.
15	

### User | 2026-05-27T18:42:52.273Z

[tool_result] No files found

### User | 2026-05-27T18:42:53.528Z

[tool_result] Found 2 files
H:\prism-slot-mike\state\shared\memory-index-sidecar.json
H:\prism-slot-mike\state\shared\atomic-roadmap.json

### Assistant | 2026-05-27T18:42:57.635Z

Let me look at the slot-soul and atomic-roadmap to find the operator-wisdom file path, then count tribal-knowledge-tips ids.

### Assistant | 2026-05-27T18:42:59.712Z

[tool_use: Read]

### Assistant | 2026-05-27T18:43:00.182Z

[tool_use: Grep]

### Assistant | 2026-05-27T18:43:02.138Z

[tool_use: Grep]

### Assistant | 2026-05-27T18:43:03.427Z

[tool_use: Grep]

### Assistant | 2026-05-27T18:43:04.671Z

[tool_use: Grep]

### Assistant | 2026-05-27T18:43:05.626Z

[tool_use: Glob]

### User | 2026-05-27T18:43:21.385Z

[tool_result] No matches found

### User | 2026-05-27T18:43:21.909Z

[tool_result] 30:  id: string;

### User | 2026-05-27T18:43:21.911Z

[tool_result] H:\prism-slot-mike\mcp-server\src\data\academy\course-0a-shop-math.ts
H:\prism-slot-mike\mcp-server\src\data\academy\course-0b-hand-tools.ts
H:\prism-slot-mike\mcp-server\src\data\academy\course-0c-blueprint-reading.ts
H:\prism-slot-mike\mcp-server\src\data\academy\course-1-manufacturing-fundamentals.ts
H:\prism-slot-mike\mcp-server\src\data\academy\course-2-speed-feed-mastery.ts
H:\prism-slot-mik
... [+289 chars truncated]

### User | 2026-05-27T18:43:21.912Z

[tool_result] H:\prism-slot-mike\mcp-server\src\data\tribal-knowledge-tips.ts:1

Found 1 total occurrence across 1 file.

### User | 2026-05-27T18:43:22.489Z

[tool_result] H:\prism-slot-mike\mcp-server\src\data\controller-knowledge-tips.ts:5

Found 5 total occurrences across 1 file.

### User | 2026-05-27T18:43:24.874Z

[tool_result] 1	---
2	slot: foxtrot
3	role: tribal-knowledge-specialist
4	voice: shop-floor-direct
5	tone: pragmatic
6	escalation_path: validate-tip-confidence-before-promote; defer-physics-to-bravo
7	refuse_list:
8	  - promoting-low-confidence-tribal-to-doctrine
9	  - dropping-source-attribution-on-ingest
10	  - softening-tribal-conflict-by-averaging
11	preferred_subagent_type: reviewer
12	domain_filter: triba
... [+1599 chars truncated]

### Assistant | 2026-05-27T18:44:27.026Z

I have enough data. The "Blueprint OCR / Print-Reading — Operator Wisdom" appears to be a graph node title (likely a milestone/spec), not a wiki .md file — no file exists with that name. Let me finalize.

```
WIKI:
  knowledge/wiki/architecture/engines/cad/pdfblueprintdimensionextractorengine.md | PDFBlueprintDimensionExtractorEngine (L5, built, domain-cad)
  knowledge/wiki/architecture/engines/cad/blueprintextractionragengine.md | BlueprintExtractionRAGEngine (L5, blueprint-ocr-training-ms1)
  knowledge/wiki/architecture/engines/cad/blueprintcorpusharvestengine.md | BlueprintCorpusHarvestEngine (blueprint-ocr-training-ms1)
  knowledge/wiki/architecture/engines/cad/jmdiearchivebackannotationengine.md | JMDieArchiveBackAnnotationEngine (ms-docu-ingest)
  knowledge/wiki/architecture/engines/ai/blueprintlorabridgeengine.md | BlueprintLoRABridgeEngine (vision-LoRA bridge)
  knowledge/wiki/architecture/engines/pdf/imageocrpipelineengine.md | ImageOCRPipelineEngine (domain-pdf L5)
  knowledge/wiki/architecture/engines/cam/blueprintprogramjoinengine.md | BlueprintProgramJoinEngine (cam joiner)
  knowledge/wiki/architecture/engines/dev/pdfprocessingpipelineengine.md | PDFProcessingPipelineEngine
  knowledge/wiki/architecture/engines-unwired/pdftableextractionengine.md | PDFTableExtractionEngine (UNWIRED ghost)
  knowledge/wiki/architecture/engines-unwired/pdfhandbookbatchprocessorengine.md | PDFHandbookBatchProcessorEngine (UNWIRED)
  knowledge/wiki/architecture/engines-unwired/pdfsourceregistryengine.md | PDFSourceRegistryEngine (UNWIRED)
  knowledge/wiki/architecture/hooks/runtime/blueprint-accuracy-guard.md | blueprint-accuracy-guard PostToolUse hook
  knowledge/wiki/architecture/skills/user/blueprint-read.md | /blueprint-read user skill
  knowledge/wiki/architecture/skills/project/cad-from-blueprint.md | /cad-from-blueprint project skill
  knowledge/wiki/architecture/skills/user/lathe-print-to-program.md | /lathe-print-to-program
  knowledge/wiki/architecture/actions/qu
... [+7617 chars truncated]
