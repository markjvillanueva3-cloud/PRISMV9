---
type: "chat-session"
source: "claude-code-cli"
session_id: "087e5978-f3ed-4657-820e-aed49ae8aa0d"
title: "Adversarially verify the staged rewrite of the PRISM \"pdf-corpus\" galaxy CLAUDE."
date: "2026-06-13"
first_ts: "2026-06-13T22:10:09.295Z"
last_ts: "2026-06-13T22:20:29.279Z"
cwd: "H:\\PRISM"
messages: 34
user_msgs: 15
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_d3067214-b5f/agent-acea14a6a77447c9b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# Adversarially verify the staged rewrite of the PRISM "pdf-corpus" galaxy CLAUDE.

> **claude-code-cli** | 2026-06-13 | 34 msgs (15 user / 19 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_d3067214-b5f/agent-acea14a6a77447c9b.jsonl`

## Transcript

### User | 2026-06-13T22:10:09.295Z

Adversarially verify the staged rewrite of the PRISM "pdf-corpus" galaxy CLAUDE.md. Grade PASS or FAIL.

READ:
1. The DRAFT: H:/prism/state/shared/slot-claude-md-drafts/pdf-corpus.md
2. The assessment spec: H:/prism/state/shared/slot-claude-md-assessment/pdf-corpus.md
3. The template: H:/prism/state/shared/slot-claude-md-assessment/_TEMPLATE.md
4. The CURRENT live file: H:/prism/mcp-server/src/engines/pdf-corpus/CLAUDE.md

CHECK (be adversarial -- the draft was written by a cheaper model):
1. FABRICATION (the top risk): spot-check 4-6 of the engine/action/path/hook names the draft asserts -- Glob/Grep/Read to confirm each EXISTS. Any fabricated/nonexistent symbol that is NOT marked "// UNVERIFIED" = FAIL.
2. SAFETY SECTIONS intact: §0 universal-core pointer present; §4 constants/data-paths (NEVER-inline rule) present; §5 domain gotchas/safety present; §6 what-NOT-to-do present. Any of these MISSING or gutted of its safety numerics = FAIL.
3. NO LOSS: did the draft drop any load-bearing content from the CURRENT file that the assessment did NOT mark DROP? (e.g. a real domain gotcha, a units rule, a dispatcher action.) Material loss = FAIL.
4. TEMPLATE conformance: follows the 14-section order; token-lean (80-160 lines, allow up to ~180 for deep domains); boilerplate collapsed to the §0 pointer.
5. ACCURACY: the domain claims are correct for pdf-corpus (not copied from another galaxy).

Return: "VERDICT: PASS" or "VERDICT: FAIL" then a short bullet list of issues (with the specific fabricated symbol or missing section if FAIL). If PASS, note any P2 nits to fix on apply.

### Assistant | 2026-06-13T22:10:20.324Z

I'll read all four files in parallel to conduct the adversarial review.

### Assistant | 2026-06-13T22:10:21.150Z

[tool_use: Read]

### Assistant | 2026-06-13T22:10:21.440Z

[tool_use: Read]

### Assistant | 2026-06-13T22:10:21.973Z

[tool_use: Read]

### Assistant | 2026-06-13T22:10:22.260Z

[tool_use: Read]

### User | 2026-06-13T22:11:08.542Z

[tool_result] 1	# pdf-corpus Galaxy — fleet-managed (no dedicated slot)
2	> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
3	> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
4	> → `H:/prism/CLAUDE.md`. THIS file = pdf-corpus-domain doctrine ONLY; never re-inline universal prose.
5	
6	---
7	
8	## §1 — Dom
... [+12973 chars truncated]

### User | 2026-06-13T22:11:09.871Z

[tool_result] 1	# pdf-corpus — fleet-managed
2	
3	> Assessment date: 2026-06-13. Assessed by: subagent (sonnet-4-6). All engine names, dispatcher actions, and file paths verified by Grep/Read/Bash before citation.
4	
5	---
6	
7	## Current state
8	
9	**Size:** 9,335 bytes / 95 lines.
10	
11	**Quality grade: PARTIAL**
12	
13	The file has a solid structural skeleton but suffers from these concrete problems:
14	
15
... [+16664 chars truncated]

### User | 2026-06-13T22:11:10.110Z

[tool_result] 1	# PDF-Corpus Galaxy — Domain-local CLAUDE.md (P1 Galactic Center, 2026-05-27 — populated 2026-06-09)
2	
3	> Auto-loads when editing under `engines/pdf-corpus/`. **Populated 2026-06-09** (domain-knowledge core grounded from PATHS/MEMORY/synthesis). Canonical slot: lima (de-facto — owns pypdf page-by-page extraction per [[feedback_use_lima_pypdf_page_extractor]] CANONICAL).
4	
5	## 1. Domain scope
... [+9137 chars truncated]

### User | 2026-06-13T22:11:10.167Z

[tool_result] 1	# CANONICAL PER-SLOT GALAXY CLAUDE.md TEMPLATE
2	
3	> Synthesis lead output, 2026-06-13. Source: 34 domain-expert galaxy assessments in this directory
4	> (`state/shared/slot-claude-md-assessment/*.md`), every one read end-to-end.
5	> This file is the LOCKED skeleton every galaxy `mcp-server/src/engines/<galaxy>/CLAUDE.md` is rewritten to.
6	> Target per-galaxy size: **80–160 lines** (replaces t
... [+31609 chars truncated]

### Assistant | 2026-06-13T22:11:15.780Z

Now let me spot-check the key engine names and dispatcher actions claimed in the draft against actual files.

### Assistant | 2026-06-13T22:11:16.933Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:11:18.313Z

[tool_use: Grep]

### User | 2026-06-13T22:11:47.471Z

[tool_result] mcp-server\src\tools\dispatchers\devDispatcher.ts:36:[Omitted long matching line]
mcp-server\src\tools\dispatchers\devDispatcher.ts:2115:          case "pdf_pipeline_classify": {
mcp-server\src\tools\dispatchers\devDispatcher.ts:2121:          case "pdf_pipeline_extract": {
mcp-server\src\tools\dispatchers\devDispatcher.ts:2130:          case "pdf_pipeline_read": {
mcp-server\src\tools\dispatchers
... [+471 chars truncated]

### User | 2026-06-13T22:12:10.078Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-13T22:12:15.289Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:12:17.472Z

[tool_use: Grep]

### User | 2026-06-13T22:13:00.519Z

[tool_result] mcp-server\src\tools\dispatchers\resourceExtractionDispatcher.ts:6: *   archive_discover   — Discover archives in a directory
mcp-server\src\tools\dispatchers\resourceExtractionDispatcher.ts:7: *   archive_analyze    — Analyze archive contents without extracting
mcp-server\src\tools\dispatchers\resourceExtractionDispatcher.ts:8: *   classify_dark      — Classify hard-to-extract content
mcp-server\
... [+2940 chars truncated]

### User | 2026-06-13T22:13:56.029Z

[tool_result] PDFBlueprintDimensionExtractorEngine.ts
PDFBlueprintPatternRescueEngine.ts
pdf-corpus
pdf-corpus-mill
PDFFormulaExtractionEngine.ts
PDFHandbookBatchProcessorEngine.ts
PDFHighlightExtractorEngine.ts
PDFMaterialPropertyExtractionEngine.ts
PDFProcessingPipelineEngine.ts
PDFSourceRegistryEngine.ts
PDFStructureEngine.ts
PDFTableExtractionEngine.ts
QuoteExplainPDFEngine.ts
SpeedFeedPDFCorpusBridgeEngine
... [+3 chars truncated]

### Assistant | 2026-06-13T22:14:05.712Z

Now let me check the `drawing_summary` and `doc_upload/doc_extract` actions, plus verify the `prism_doc_learn` dispatcher and `galaxy-reasoning-bridge.mjs` script:

### Assistant | 2026-06-13T22:14:05.713Z

[tool_use: Grep]

### Assistant | 2026-06-13T22:14:05.714Z

[tool_use: Glob]

### User | 2026-06-13T22:14:41.141Z

[tool_result] mcp-server\src\tools\dispatchers\businessDispatcher.ts:1205:  "business_doc_extract",
mcp-server\src\tools\dispatchers\businessDispatcher.ts:1238:  "doc_get",
mcp-server\src\tools\dispatchers\businessDispatcher.ts:1239:  "doc_list",
mcp-server\src\tools\dispatchers\businessDispatcher.ts:1242:  "doc_list_copies",
mcp-server\src\tools\dispatchers\businessDispatcher.ts:5951:          case "business_d
... [+1939 chars truncated]

### User | 2026-06-13T22:15:13.608Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-13T22:15:16.448Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:15:28.694Z

[tool_use: Bash]

### User | 2026-06-13T22:18:04.270Z

[tool_result] documentDispatcher.ts
documentLearningDispatcher.ts

### User | 2026-06-13T22:18:04.273Z

[tool_result] galaxy-reasoning-bridge.mjs
galaxy-reasoning-bridge.test.mjs

### Assistant | 2026-06-13T22:18:10.550Z

Good. Now let me check the resourceExtractionDispatcher action count precisely and verify `drawing_summary` exists there, plus check the `prism_doc_learn` dispatcher name:

### Assistant | 2026-06-13T22:18:11.321Z

[tool_use: Read]

### Assistant | 2026-06-13T22:18:11.868Z

[tool_use: Read]

### User | 2026-06-13T22:19:46.904Z

[tool_result] 1	/**
2	 * prism_resource_extraction — Content Extraction Pipeline Dispatcher
3	 * AI-AWARE-HARDEN: Wires 7 extraction engines for comprehensive content processing
4	 *
5	 * 14 actions:
6	 *   archive_discover   — Discover archives in a directory
7	 *   archive_analyze    — Analyze archive contents without extracting
8	 *   classify_dark      — Classify hard-to-extract content
9	 *   dark_report  
... [+1799 chars truncated]

### User | 2026-06-13T22:19:46.905Z

[tool_result] 1	/**
2	 * Document Learning Dispatcher — CC-EXT-MS0 U06
3	 *
4	 * MCP tool for extracting knowledge from text documents (PDFs, notes, articles,
5	 * academic papers). Wraps the Python cad-engine document extraction pipeline.
6	 *
7	 * Actions:
8	 *   - doc_upload:   Register a document for extraction
9	 *   - doc_extract:  Run extraction on a registered document
10	 *   - doc_list:     List extra
... [+1357 chars truncated]

### Assistant | 2026-06-13T22:20:29.279Z

I now have all the data needed for a comprehensive verdict. Let me compile the findings.

**Fabrication spot-checks:**

1. **10 PDF-prefixed engines in §2** — all 10 confirmed present via `ls` output: `PDFProcessingPipelineEngine.ts`, `PDFSourceRegistryEngine.ts`, `PDFStructureEngine.ts`, `PDFTableExtractionEngine.ts`, `PDFHandbookBatchProcessorEngine.ts`, `PDFHighlightExtractorEngine.ts`, `PDFFormulaExtractionEngine.ts`, `PDFMaterialPropertyExtractionEngine.ts`, `PDFBlueprintDimensionExtractorEngine.ts`, `PDFBlueprintPatternRescueEngine.ts`. ALL VERIFIED.

2. **`prism_dev` PDF actions** — `pdf_pipeline_classify`, `pdf_pipeline_extract`, `pdf_pipeline_read`, `pdf_pipeline_summary`, `pdf_highlights_extract` confirmed at `devDispatcher.ts:2115-2147`. ALL VERIFIED.

3. **`prism_resource_extraction` 14 actions** — confirmed exact count 14 at `resourceExtractionDispatcher.ts:5`. `drawing_summary` IS present (line 13 of dispatcher header, line 39 of ACTIONS array). ALL VERIFIED. The draft's "14 actions (verified resourceExtractionDispatcher.ts:31-46)" is correct.

4. **`prism_doc_learn` actions** — `doc_upload`, `doc_extract`, `doc_list`, `doc_get`, `doc_delete` confirmed in `documentLearningDispatcher.ts:29-35`. ALL VERIFIED.

5. **`scripts/lib/galaxy-reasoning-bridge.mjs`** — confirmed exists. VERIFIED.

6. **`NOTABLE_CONFIG` in `scripts/extract-jm-die-corpus-page-by-page.py`** — not directly checked, but this is carried from the assessment spec (verified by the assessment author) and marked as a canonical constant reference, not fabricated.

**Section structure check against template:**

- §0 header + universal-core pointer: PRESENT (lines 1-4)
- §1 domain scope + slot identity: PRESENT
- §2 verified engines: PRESENT (10 verified PDF engines)
- §3 dispatcher quick-ref + MCP-down fallback: PRESENT (fallback on line 52)
- §4 canonical constants + data paths: PRESENT (NEVER-inline rule + notability floor + path table)
- §5 domain gotchas / safety rails: PRESENT (7 numbere
... [+4042 chars truncated]
