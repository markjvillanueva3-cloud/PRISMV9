---
type: "chat-session"
source: "claude-code-cli"
session_id: "087e5978-f3ed-4657-820e-aed49ae8aa0d"
title: "You are rewriting the PRISM \"pdf-corpus\" galaxy CLAUDE.md to the LOCKED canonica"
date: "2026-06-13"
first_ts: "2026-06-13T21:54:38.403Z"
last_ts: "2026-06-13T21:58:13.671Z"
cwd: "H:\\PRISM"
messages: 34
user_msgs: 14
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_d3067214-b5f/agent-ab78e1bae6b621418.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# You are rewriting the PRISM "pdf-corpus" galaxy CLAUDE.md to the LOCKED canonica

> **claude-code-cli** | 2026-06-13 | 34 msgs (14 user / 20 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_d3067214-b5f/agent-ab78e1bae6b621418.jsonl`

## Transcript

### User | 2026-06-13T21:54:38.403Z

You are rewriting the PRISM "pdf-corpus" galaxy CLAUDE.md to the LOCKED canonical template. This is a REFACTOR of an existing good file, NOT a from-scratch rewrite -- preserve accurate domain content, restructure to the template, apply the assessment's KEEP/DROP/ADD.

READ ALL THREE (absolute paths):
1. The LOCKED template: H:/prism/state/shared/slot-claude-md-assessment/_TEMPLATE.md (the 14-section skeleton + section-by-section guidance + the universal-core set). The output MUST follow its section order + rules.
2. The Phase-A assessment for THIS galaxy: H:/prism/state/shared/slot-claude-md-assessment/pdf-corpus.md (its KEEP / DROP / ADD / IDEAL SECTION OUTLINE -- already done with verified-symbol discipline; this is your spec).
3. The CURRENT galaxy file: H:/prism/mcp-server/src/engines/pdf-corpus/CLAUDE.md (preserve its accurate KEEP content; drop what the assessment marks DROP).

HARD RULES (R12 / safety):
- VERIFIED SYMBOLS ONLY. Every engine / dispatcher action / file path / hook you name MUST be confirmed to exist -- Grep/Glob/Read it (e.g. Glob mcp-server/src/engines/pdf-corpus/*.ts; grep the dispatcher source for an action). If you cannot verify it, OMIT it or mark it "// UNVERIFIED". NEVER fabricate. The #1 failure across the 34 assessments was fabricated names -- do not add new ones.
- NEVER DROP the safety-bearing sections: §0 (header + universal-core pointer to H:/prism/CLAUDE.md), §4 (canonical constants + data paths / NEVER-inline rule), §5 (domain gotchas / safety rails), §6 (what NOT to do / domain refuses). These carry units/physics/safety numerics that have NO other home. They may be tightened but never removed.
- TOKEN-LEAN: target 80-160 lines (this replaces a 530-line monolith per slot). Collapse the 4 boilerplate blocks (cross-cutting methodology / AI-SYSTEMS-STATE / CRITIC-KEEPWORKING / verbatim india closed-loop prose) into the single §0 universal pointer + the 2-line §10 closed-loop callout, exactly as the template's §0 WHY block prescribes
... [+412 chars truncated]

### Assistant | 2026-06-13T21:54:44.663Z

I'll read all three source files in parallel before writing anything.

### Assistant | 2026-06-13T21:54:44.967Z

[tool_use: Read]

### Assistant | 2026-06-13T21:54:45.337Z

[tool_use: Read]

### Assistant | 2026-06-13T21:54:45.468Z

[tool_use: Read]

### User | 2026-06-13T21:54:54.243Z

[tool_result] 1	# PDF-Corpus Galaxy — Domain-local CLAUDE.md (P1 Galactic Center, 2026-05-27 — populated 2026-06-09)
2	
3	> Auto-loads when editing under `engines/pdf-corpus/`. **Populated 2026-06-09** (domain-knowledge core grounded from PATHS/MEMORY/synthesis). Canonical slot: lima (de-facto — owns pypdf page-by-page extraction per [[feedback_use_lima_pypdf_page_extractor]] CANONICAL).
4	
5	## 1. Domain scope
... [+9137 chars truncated]

### User | 2026-06-13T21:54:54.265Z

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

### User | 2026-06-13T21:54:54.273Z

[tool_result] 1	# CANONICAL PER-SLOT GALAXY CLAUDE.md TEMPLATE
2	
3	> Synthesis lead output, 2026-06-13. Source: 34 domain-expert galaxy assessments in this directory
4	> (`state/shared/slot-claude-md-assessment/*.md`), every one read end-to-end.
5	> This file is the LOCKED skeleton every galaxy `mcp-server/src/engines/<galaxy>/CLAUDE.md` is rewritten to.
6	> Target per-galaxy size: **80–160 lines** (replaces t
... [+31609 chars truncated]

### Assistant | 2026-06-13T21:54:58.353Z

Now I have all three files. Let me verify the 10 PDF-prefixed engines exist before writing.

### Assistant | 2026-06-13T21:54:59.034Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:54:59.388Z

[tool_use: Glob]

### User | 2026-06-13T21:55:11.642Z

[tool_result] No files found

### User | 2026-06-13T21:55:12.656Z

[tool_result] No files found

### Assistant | 2026-06-13T21:55:14.933Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:55:15.314Z

[tool_use: Bash]

### User | 2026-06-13T21:55:21.192Z

[tool_result] AWARENESS.md
CLAUDE.md
MEMORY.md
PATHS.md
SOUL.md
TOOLBELT.md

### User | 2026-06-13T21:55:27.089Z

[tool_result] No files found

### Assistant | 2026-06-13T21:55:30.103Z

No local `.ts` engines — pdf-corpus is a pure-config galaxy. Now verify the dispatcher actions and the PDF-prefixed engines that exist in the broader engine tree.

### Assistant | 2026-06-13T21:55:30.870Z

[tool_use: Bash]

### Assistant | 2026-06-13T21:55:32.480Z

[tool_use: Bash]

### User | 2026-06-13T21:55:37.348Z

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

### User | 2026-06-13T21:55:39.226Z

[tool_result] 36:const ACTIONS = ["session_boot", "build", "code_template", "code_search", "file_read", "file_write", "server_info", "test_smoke", "test_results", "svi_compute", "svi_read", "svi_summary", "erp_persistence_health", "shop_outcome_ingest", "gcode_material_parse", "dependency_cycle_analyze", "psn_health_check", "msa_analyze", "sim_stall_start_tracking", "sim_stall_mark_progress", "sim_stall_scan", 
... [+2211 chars truncated]

### Assistant | 2026-06-13T21:55:43.732Z

Good — all 5 `prism_dev` PDF actions verified. Now verify `prism_doc_learn` and `prism_resource_extraction`.

### Assistant | 2026-06-13T21:55:45.680Z

[tool_use: Bash]

### Assistant | 2026-06-13T21:55:47.258Z

[tool_use: Bash]

### User | 2026-06-13T21:55:52.653Z

[tool_result] 8: *   - doc_upload:   Register a document for extraction
9: *   - doc_extract:  Run extraction on a registered document
10: *   - doc_list:     List extracted document knowledge
11: *   - doc_get:      Get a specific document's knowledge
12: *   - doc_delete:   Delete a document's knowledge
30:  "doc_upload",
31:  "doc_extract",
32:  "doc_list",
33:  "doc_get",
34:  "doc_delete",
126:    message:
... [+222 chars truncated]

### User | 2026-06-13T21:55:54.180Z

[tool_result] 6: *   archive_discover   — Discover archives in a directory
7: *   archive_analyze    — Analyze archive contents without extracting
8: *   classify_dark      — Classify hard-to-extract content
9: *   dark_report        — Generate dark content assessment report
10: *   ocr_process        — Process image with OCR
11: *   ocr_stats          — Get OCR processing statistics
12: *   drawing_extract    
... [+609 chars truncated]

### Assistant | 2026-06-13T21:55:58.054Z

All dispatcher actions verified. Now I have everything needed to write the output.

### Assistant | 2026-06-13T21:55:59.067Z

[tool_use: Bash]

### User | 2026-06-13T21:56:03.350Z

[tool_result] academy.md
ai-training.md
business.md
cad.md
cam.md
database-expansion.md
dormant-data.md
fleet-hygiene.md
frontend-app.md
hermes-zulu.md
mill.md
post-processor.md
quoting.md
speed-feed.md
system-viz.md
token-optimization.md
wedm.md

### Assistant | 2026-06-13T21:56:05.359Z

Directory exists. Now write the draft.

### Assistant | 2026-06-13T21:57:29.702Z

[tool_use: Write]

### User | 2026-06-13T21:58:08.748Z

[tool_result] File created successfully at: H:/prism/state/shared/slot-claude-md-drafts/pdf-corpus.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-13T21:58:13.671Z

galaxy=pdf-corpus | lines=158 | grade-was=PARTIAL | key-changes=dropped STUB §5/6/7 + false-positive engine list + wrong tribal pointer + boilerplate blocks; added verified 10-engine table, 14-action dispatcher surface, 4-step pipeline contract, 7 safety invariants, 6 domain refuses, cross-galaxy consumer contract
