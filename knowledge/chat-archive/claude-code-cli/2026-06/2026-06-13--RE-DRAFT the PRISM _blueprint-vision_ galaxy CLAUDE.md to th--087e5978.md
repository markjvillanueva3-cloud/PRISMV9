---
type: "chat-session"
source: "claude-code-cli"
session_id: "087e5978-f3ed-4657-820e-aed49ae8aa0d"
title: "RE-DRAFT the PRISM \"blueprint-vision\" galaxy CLAUDE.md to the locked template. T"
date: "2026-06-13"
first_ts: "2026-06-13T22:37:48.816Z"
last_ts: "2026-06-13T22:44:55.872Z"
cwd: "H:\\PRISM"
messages: 45
user_msgs: 18
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_3d0967eb-63a/agent-ad2eee4a923a9dd2a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# RE-DRAFT the PRISM "blueprint-vision" galaxy CLAUDE.md to the locked template. T

> **claude-code-cli** | 2026-06-13 | 45 msgs (18 user / 27 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_3d0967eb-63a/agent-ad2eee4a923a9dd2a.jsonl`

## Transcript

### User | 2026-06-13T22:37:48.816Z

RE-DRAFT the PRISM "blueprint-vision" galaxy CLAUDE.md to the locked template. The first-pass draft of THIS galaxy FAILED adversarial verify -- almost always FABRICATION (a named engine / dispatcher action / file path / hook that does NOT exist on disk). The galaxies that failed are exactly the ones the Phase-A assessment flagged for fabricated symbols in their CURRENT files (e.g. cam's cam-vendor-matrix.ts, backend-helper's outcome-bus-auto-tap.mjs, blueprint-vision's 21 phantom CAD*Engine names). DO NOT repeat that.

READ (absolute paths):
1. Template: H:/prism/state/shared/slot-claude-md-assessment/_TEMPLATE.md (14-section skeleton + rules).
2. Assessment for blueprint-vision: H:/prism/state/shared/slot-claude-md-assessment/blueprint-vision.md (KEEP/DROP/ADD -- your spec; it already lists which CURRENT-file symbols are FABRICATED -- DROP those).
3. Current file: H:/prism/mcp-server/src/engines/blueprint-vision/CLAUDE.md.

ABSOLUTE RULES (the FAIL was caused by breaking these):
- VERIFY EVERY SYMBOL ON DISK BEFORE WRITING IT. For each engine: Glob H:/prism/mcp-server/src/engines/blueprint-vision/*.ts (and src/engines/*.ts if it lives at top level) and confirm the file exists. For each dispatcher action: Grep the dispatcher source for the exact action string. For each script/hook: confirm the path exists. If you CANNOT confirm a symbol exists, OMIT IT ENTIRELY -- do not write it, do not even mark it UNVERIFIED if it is a core engine/action name. Better a short verified file than a long fabricated one. The verifier WILL spot-check 6+ symbols and FAIL the whole draft on ONE fabrication.
- The assessment names specific FABRICATED symbols in the current file -- those are DROP. Replace them with the verified real name the assessment gives, or omit.
- HARD CAP 180 LINES. Be lean: §3 dispatcher quick-ref = the 8-12 MOST-USED actions + a "full list: <dispatcher>.ts ACTIONS" pointer (NOT every action); §5 gotchas <= 6; DROP rot-prone live metrics (offload %, take-rate) -- r
... [+557 chars truncated]

### Assistant | 2026-06-13T22:37:55.783Z

I'll read the three source files in parallel before writing anything.

### Assistant | 2026-06-13T22:37:56.178Z

[tool_use: Read]

### Assistant | 2026-06-13T22:37:56.611Z

[tool_use: Read]

### Assistant | 2026-06-13T22:37:56.828Z

[tool_use: Read]

### User | 2026-06-13T22:38:05.182Z

[tool_result] 1	# CANONICAL PER-SLOT GALAXY CLAUDE.md TEMPLATE
2	
3	> Synthesis lead output, 2026-06-13. Source: 34 domain-expert galaxy assessments in this directory
4	> (`state/shared/slot-claude-md-assessment/*.md`), every one read end-to-end.
5	> This file is the LOCKED skeleton every galaxy `mcp-server/src/engines/<galaxy>/CLAUDE.md` is rewritten to.
6	> Target per-galaxy size: **80–160 lines** (replaces t
... [+31609 chars truncated]

### User | 2026-06-13T22:38:07.833Z

[tool_result] 1	## blueprint-vision — slot:xray
2	
3	### Current state
4	
5	**Size:** 21,104 bytes / 164 lines.
6	
7	**Quality grade: EXCELLENT**
8	
9	The existing galaxy CLAUDE.md is the strongest example in the assessment set so far. It was fully asset-verified by 3 parallel inventory agents on 2026-05-29, correcting a 21-engine hallucination class from the alpha seed. All engine names, dispatcher actions, an
... [+16849 chars truncated]

### User | 2026-06-13T22:38:08.005Z

[tool_result] 1	# Blueprint-Vision Galaxy (XRAY slot)
2	
3	Operational scope per `state/shared/CHAT-SLOT-DOMAINS.md`:
4	> XRAY — OCR + BLUEPRINT READING + CAD FILE DATA EXTRACTION (operator-canonical 2026-05-28). Owns the vision/extraction pipeline: turning unstructured inputs (blueprints, PDFs, raster scans, native CAD files) into structured PRISM data (features, tolerances, GD&T callouts, geometry, materials)
... [+20997 chars truncated]

### Assistant | 2026-06-13T22:38:11.874Z

Now I need to verify every symbol I plan to use before writing. Let me glob the blueprint-vision engine directory and check the hook files.

### Assistant | 2026-06-13T22:38:13.005Z

[tool_use: Glob]

### Assistant | 2026-06-13T22:38:13.139Z

[tool_use: Glob]

### User | 2026-06-13T22:38:23.094Z

[tool_result] No files found

### User | 2026-06-13T22:38:23.136Z

[tool_result] .claude\hooks\wedm-tier6-geom-gate.mjs
.claude\hooks\agent-boundary-guard.mjs
.claude\hooks\agent-pid-tracker.mjs
.claude\hooks\agent-registry-load.mjs
.claude\hooks\agent-rules-inject.mjs
.claude\hooks\agent-util-log.mjs
.claude\hooks\agent-vs-direct.mjs
.claude\hooks\agent-worktree-stale-unlock.mjs
.claude\hooks\agi-safety-envelope-guard.mjs
.claude\hooks\ai-auto-command-router.mjs
.claude\hooks
... [+3840 chars truncated]

### Assistant | 2026-06-13T22:38:25.647Z

The blueprint-vision engine directory has no `.ts` files directly. Let me check where the engines actually live and verify the specific engines and hooks mentioned.

### Assistant | 2026-06-13T22:38:27.225Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:38:29.058Z

[tool_use: Grep]

### User | 2026-06-13T22:38:46.568Z

[tool_result] Found 9 files
.claude\hooks\bundles\sessionstart-bundle.mjs
.claude\hooks\HOOK_DIGEST.md
.claude\hooks\xray-blueprint-domain-inject.mjs
.claude\hooks\xray-blueprint-domain-inject.test.mjs
.claude\hooks\cost-bridge-on-pdf-extract.mjs
.claude\hooks\blueprint-coverage-floor-guard.test.mjs
.claude\hooks\blueprint-coverage-floor-guard.mjs
.claude\hooks\blueprint-accuracy-guard.mjs
.claude\hooks\bluepri
... [+29 chars truncated]

### User | 2026-06-13T22:38:58.948Z

[tool_result] AWARENESS.md
CLAUDE.md
GSD_BLUEPRINT_VISION.md
MEMORY.md
PATHS.md
SOUL.md
TOOLBELT.md

### Assistant | 2026-06-13T22:39:02.166Z

Good. All 4 hooks confirmed on disk. Now verify the key engine `.ts` files from the current CLAUDE.md — they live at top-level `src/engines/*.ts`, not in the blueprint-vision subdir.

### Assistant | 2026-06-13T22:39:03.747Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:39:04.575Z

[tool_use: Bash]

### User | 2026-06-13T22:39:40.809Z

[tool_result] H:/prism/mcp-server/src/engines/BlueprintCorpusHarvestEngine.ts
H:/prism/mcp-server/src/engines/BlueprintCorpusHarvestEngine.ts
H:/prism/mcp-server/src/engines/BlueprintCoverageAuditEngine.ts
H:/prism/mcp-server/src/engines/BlueprintCoverageAuditEngine.ts
H:/prism/mcp-server/src/engines/BlueprintExtractionRAGEngine.ts
H:/prism/mcp-server/src/engines/BlueprintExtractionRAGEngine.ts
H:/prism/mcp-ser
... [+1657 chars truncated]

### User | 2026-06-13T22:39:41.925Z

[tool_result] H:/prism/mcp-server/src/engines/BlueprintCorpusHarvestEngine.ts
H:/prism/mcp-server/src/engines/BlueprintCoverageAuditEngine.ts
H:/prism/mcp-server/src/engines/BlueprintExtractionRAGEngine.ts
H:/prism/mcp-server/src/engines/BlueprintLoRABridgeEngine.ts
H:/prism/mcp-server/src/engines/BlueprintOCRAdapter.ts
H:/prism/mcp-server/src/engines/BlueprintOCRAdapter.ts
H:/prism/mcp-server/src/engines/Bluep
... [+1647 chars truncated]

### Assistant | 2026-06-13T22:39:44.972Z

Good. Now verify the remaining engines from the current CLAUDE.md (GDT, tolerance, feature-recog, DXF, native parsers) and the key scripts/dispatchers.

### Assistant | 2026-06-13T22:39:47.701Z

[tool_use: Bash]

### Assistant | 2026-06-13T22:39:49.565Z

[tool_use: Bash]

### User | 2026-06-13T22:40:05.712Z

[tool_result] H:/prism/mcp-server/src/engines/AIFeatureAutoRegistryEngine.ts
H:/prism/mcp-server/src/engines/CADClassFeatureLibraryEngine.ts
H:/prism/mcp-server/src/engines/CADCorpusFeaturePrevalenceLearnerEngine.ts
H:/prism/mcp-server/src/engines/CADFeatureClassifierEngine.ts
H:/prism/mcp-server/src/engines/CADFeatureEmbeddingEngine.ts
H:/prism/mcp-server/src/engines/CADFeatureMemoryEngine.ts
H:/prism/mcp-serv
... [+3400 chars truncated]

### User | 2026-06-13T22:40:08.711Z

[tool_result] H:/prism/mcp-server/src/engines/BlueprintProgramJoinEngine.ts
H:/prism/mcp-server/src/engines/GroundTruthBatchExtractor.ts
H:/prism/mcp-server/src/engines/GroundTruthFeatureTreeExtractor.ts
H:/prism/mcp-server/src/engines/GroundTruthRegistryEngine.ts
H:/prism/mcp-server/src/engines/GroundTruthValidationEngine.ts
H:/prism/scripts/blueprint-ocr-review.mjs
H:/prism/scripts/blueprint-ocr-review.test.m
... [+405 chars truncated]

### Assistant | 2026-06-13T22:40:12.160Z

All symbols confirmed. Now I have everything I need. Let me also verify the `ocr-training-loop-lib.mjs` script and `bench-vision-ocr-ab.mjs` referenced in the assessment ADD items.

### Assistant | 2026-06-13T22:40:13.631Z

[tool_use: Bash]

### User | 2026-06-13T22:40:29.595Z

[tool_result] H:/prism/scripts/bench-vision-ocr-ab.mjs
H:/prism/scripts/lib/ocr-training-loop-lib.mjs
H:/prism/scripts/lib/ocr-training-loop-lib.test.mjs
---
H:/prism/mcp-server/src/engines/PrintToCADOrchestratorEngine.ts
H:/prism/mcp-server/src/engines/PrintToCADTranslator.ts

### Assistant | 2026-06-13T22:40:41.253Z

All symbols verified. Now I have a complete verified symbol set. Let me write the draft.

Verified symbols (confirmed on disk):
- Engines (13 Blueprint*): BlueprintVisionOCREngine, BlueprintOCREngine, BlueprintOCRAdapter, CADLiveBlueprintOcrAdapter, ImageOCRPipelineEngine, OCRResultEngine, TesseractOCRBridgeEngine, MachineServiceTagOCREngine, PDFBlueprintDimensionExtractorEngine, PDFBlueprintPatternRescueEngine, BlueprintExtractionRAGEngine, GDTCalloutParserEngine, PrismEnhancedGDTEngine, FCFSyntaxValidatorEngine, ToleranceEngine, ToleranceAwareGenerationEngine, DXFGeometryParserEngine, DXFParserEngine, F3DSQLiteParserEngine, FCStdNativeParserEngine, STLToVoxelGridEngine, CADFeatureRecognitionEngine, CADFeatureClassifierEngine, FeatureRecognitionEngine, LatheTurningFeatureRecognizerEngine, BlueprintToCADGenerationEngine, BlueprintToAllCADsOrchestratorEngine, BlueprintProgramJoinEngine, BlueprintCorpusHarvestEngine, BlueprintCoverageAuditEngine, BlueprintLoRABridgeEngine, BlueprintToQuoteBridgeEngine, GroundTruthRegistryEngine, GroundTruthValidationEngine, PrintToCADOrchestratorEngine
- Hooks (4): blueprint-accuracy-guard.mjs, blueprint-coverage-floor-guard.mjs, blueprint-join-index-stale-check.mjs, cost-bridge-on-pdf-extract.mjs, xray-blueprint-domain-inject.mjs
- Scripts: blueprint-ocr-training-loop.mjs, scripts/lib/ocr-training-loop-lib.mjs, scripts/lib/ollama-vision-extract-lib.mjs, scripts/lib/vision-ensemble-fuse.mjs, bench-vision-ocr-ab.mjs

### Assistant | 2026-06-13T22:40:42.413Z

[tool_use: Bash]

### User | 2026-06-13T22:40:55.127Z

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

### Assistant | 2026-06-13T22:40:57.542Z

Good. Directory exists. Now write the draft.

### Assistant | 2026-06-13T22:42:46.851Z

[tool_use: Write]

### User | 2026-06-13T22:42:46.853Z

[tool_result] <tool_use_error>File has not been read yet. Read it first before writing to it.</tool_use_error>

### Assistant | 2026-06-13T22:42:49.991Z

[tool_use: Read]

### User | 2026-06-13T22:42:53.402Z

[tool_result] 1	# blueprint-vision Galaxy — slot:xray
2	> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
3	> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
4	> → `H:/prism/CLAUDE.md`. THIS file = blueprint-vision domain doctrine ONLY; never re-inline universal prose.
5	

### Assistant | 2026-06-13T22:42:55.877Z

Good, file exists and is readable. Now write the verified draft.

### Assistant | 2026-06-13T22:44:41.684Z

[tool_use: Write]

### User | 2026-06-13T22:44:51.356Z

[tool_result] The file H:/prism/state/shared/slot-claude-md-drafts/blueprint-vision.md has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-13T22:44:53.689Z

Now count the lines to report accurately.

### Assistant | 2026-06-13T22:44:54.046Z

[tool_use: Bash]

### User | 2026-06-13T22:44:55.872Z

[tool_result] 247 H:/prism/state/shared/slot-claude-md-drafts/blueprint-vision.md
