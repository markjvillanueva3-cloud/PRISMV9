---
type: "chat-session"
source: "claude-code-cli"
session_id: "e9b75754-b179-40b0-b0fb-7007d65b2056"
title: "You are verifying real on-disk assets for the PRISM \"blueprint-vision\" galaxy (s"
date: "2026-05-29"
first_ts: "2026-05-29T13:18:59.157Z"
last_ts: "2026-05-29T13:24:17.054Z"
cwd: "H:\\prism-slot-xray"
messages: 77
user_msgs: 34
assistant_msgs: 43
raw_file: "H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/agent-a7b370ebcc5a0ea7a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:15"
---

# You are verifying real on-disk assets for the PRISM "blueprint-vision" galaxy (s

> **claude-code-cli** | 2026-05-29 | 77 msgs (34 user / 43 assistant) | cwd: H:\prism-slot-xray
> Raw: `H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/agent-a7b370ebcc5a0ea7a.jsonl`

## Transcript

### User | 2026-05-29T13:18:59.157Z

You are verifying real on-disk assets for the PRISM "blueprint-vision" galaxy (slot:xray = OCR + blueprint reading + CAD-file extraction). Work in the MAIN tree at H:/prism (NOT H:/prism-slot-xray — that worktree is stale).

TASK 1 — Verify these engine names actually exist on disk. For EACH, report EXISTS (with exact relative path under mcp-server/src/) or MISSING. Use Glob on H:/prism/mcp-server/src/engines/ :
- BlueprintVisionOCREngine
- CADBlueprintGenerationEngine
- CADPDFBlueprintExtractEngine
- CADPDFPatternRescueExtractionEngine
- CADGDTParseEnhancedEngine
- CADGDTCalloutParseEngine
- CADFCFValidateEngine
- CADToleranceApplyEngine
- CADToleranceStackupEngine
- CADToleranceITGradeEngine
- CADToleranceFitAnalyzeEngine
- CADSTEPParseEngine
- CADBrepTessellateEngine
- CADDXFGeomParseEngine
- CADDXFParsePolygonsEngine
- CADDXFGeomValidateWedmEngine
- CADSVGParsePolygonsEngine
- CADFCStdParseEngine
- CADFCStdParseBufferEngine
- CADF3DParseEngine
- CADF3DParseF3zEngine
- CADF3DTimelineEngine
- CADSTLAnalyzeEngine

TASK 2 — Find any ADDITIONAL real blueprint/OCR/PDF/feature-recognition engines I didn't list. Glob H:/prism/mcp-server/src/engines for filenames matching: Blueprint*, *OCR*, *PDFBlueprint*, *FeatureRecogn*, CADPDF*, CADGDT*. Report exact paths.

TASK 3 — Dispatcher actions. Grep H:/prism/mcp-server/src/tools/dispatchers/ for action strings related to: blueprint, ocr, pdf_blueprint, gdt, feature_recognize, cad_extract, print_to_program, blueprint_to_quote. Report dispatcher-file:action-name pairs (e.g. cadDispatcher.ts: cad_pdf_blueprint_extract). Just the real ones that exist.

Return a tight structured report: (1) verified-existing engines with paths, (2) MISSING/hallucinated names, (3) extra real engines found, (4) real dispatcher.action pairs. No prose padding. This feeds a PATHS.md atlas so accuracy matters — do NOT report a path you didn't confirm with Glob/Grep.

### Assistant | 2026-05-29T13:19:11.860Z

I'll verify these assets against the real on-disk state in the main tree. Let me run the Glob and Grep operations in parallel.

### Assistant | 2026-05-29T13:19:13.202Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:19:13.715Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:19:14.107Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:19:15.147Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:19:15.530Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:19:15.979Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:19:16.960Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:19:17.726Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:19:18.375Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:19:18.804Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:19:19.750Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:19:20.230Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:19:21.140Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:19:21.507Z

[tool_use: Glob]

### User | 2026-05-29T13:19:35.882Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-29T13:19:36.448Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-29T13:19:36.656Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-29T13:19:37.669Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-29T13:19:38.573Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-29T13:19:38.965Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-29T13:19:42.059Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-29T13:19:43.714Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-29T13:19:45.312Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-29T13:19:45.799Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-29T13:19:45.878Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-29T13:19:46.346Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-29T13:19:46.514Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-29T13:19:47.443Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-29T13:19:52.054Z

The recursive `**` globs are timing out because the engines tree is huge. Let me use a non-recursive pattern (the engines live directly in the `engines/` dir) which ripgrep handles much faster.

### Assistant | 2026-05-29T13:19:52.529Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:19:53.515Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:19:53.940Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:19:54.900Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:19:55.348Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:19:55.895Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:19:56.750Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:19:57.348Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:19:58.227Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:19:59.408Z

[tool_use: Glob]

### User | 2026-05-29T13:20:13.955Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-29T13:20:15.561Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-29T13:20:16.341Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-29T13:20:17.482Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-29T13:20:17.937Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-29T13:20:18.516Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-29T13:20:19.880Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-29T13:20:21.344Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-29T13:20:22.656Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-29T13:20:22.924Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-29T13:20:27.895Z

Glob (ripgrep-backed) is timing out, likely due to the huge tree plus filesystem contention on the shared main tree. Let me switch to a direct shell-based directory listing, which is far cheaper since the engines sit in a single flat directory.

### Assistant | 2026-05-29T13:20:29.275Z

[tool_use: Bash]

### Assistant | 2026-05-29T13:20:29.927Z

[tool_use: Bash]

### User | 2026-05-29T13:20:41.262Z

[tool_result] blueprint-vision/
BlueprintCorpusHarvestEngine.ts  22.3K
BlueprintCoverageAuditEngine.ts  10.2K
BlueprintExtractionRAGEngine.ts  21.0K
BlueprintLoRABridgeEngine.ts  13.0K
BlueprintOCRAdapter.ts  8.0K
BlueprintOCREngine.ts  35.7K
BlueprintProgramJoinEngine.ts  45.4K
BlueprintToAllCADsOrchestratorEngine.ts  9.7K
BlueprintToCADGenerationEngine.ts  20.9K
BlueprintToQuoteBridgeEngine.ts  15.0K
Blueprin
... [+780 chars truncated]

### User | 2026-05-29T13:20:42.524Z

[tool_result] blueprint-vision/
pdf-corpus/
pdf-corpus-mill/
BlueprintCorpusHarvestEngine.ts  22.3K
BlueprintCoverageAuditEngine.ts  10.2K
BlueprintExtractionRAGEngine.ts  21.0K
BlueprintLoRABridgeEngine.ts  13.0K
BlueprintOCRAdapter.ts  8.0K
BlueprintOCREngine.ts  35.7K
BlueprintProgramJoinEngine.ts  45.4K
BlueprintToAllCADsOrchestratorEngine.ts  9.7K
BlueprintToCADGenerationEngine.ts  20.9K
BlueprintToQuoteBr
... [+764 chars truncated]

### Assistant | 2026-05-29T13:20:46.379Z

The flat `ls` works well. I have the candidate filenames. Now let me check the subdirectories (`blueprint-vision/`, `pdf-corpus/`, `pdf-corpus-mill/`) and verify the remaining specific names not yet seen, plus check the dispatchers.

### Assistant | 2026-05-29T13:20:48.306Z

[tool_use: Bash]

### Assistant | 2026-05-29T13:20:52.253Z

[tool_use: Bash]

### User | 2026-05-29T13:21:00.195Z

[tool_result] === blueprint-vision/ ===
CLAUDE.md  8.2K
MEMORY.md  3.9K
=== pdf-corpus/ ===
CLAUDE.md  1.6K
MEMORY.md  804B
=== pdf-corpus-mill/ ===
CLAUDE.md  930B
MEMORY.md  347B

### User | 2026-05-29T13:21:17.126Z

[tool_result] MISSING CADBlueprintGenerationEngine
MISSING CADPDFBlueprintExtractEngine
MISSING CADPDFPatternRescueExtractionEngine
MISSING CADGDTParseEnhancedEngine
MISSING CADGDTCalloutParseEngine
MISSING CADFCFValidateEngine
MISSING CADToleranceApplyEngine
MISSING CADToleranceStackupEngine
MISSING CADToleranceITGradeEngine
MISSING CADToleranceFitAnalyzeEngine
MISSING CADSTEPParseEngine
MISSING CADBrepTessell
... [+318 chars truncated]

### Assistant | 2026-05-29T13:21:22.954Z

Most of the `CAD*Parse/Tolerance/STEP/DXF/F3D` names are MISSING as standalone engine files. These may be subdirectory engines, or implemented as functions/sub-files rather than top-level `*Engine.ts`. Many of these names (e.g. `CADDXFGeomParseEngine`, `CADF3DParseEngine`) match the "CAD-file native readers" pattern. Let me check whether they exist anywhere under the engines tree (including subdirs) and also verify the two task-1 PDF names that DID surface under different filenames. Let me run targeted `find` on the engines dir only (bounded), plus the dispatcher greps.

### Assistant | 2026-05-29T13:21:26.476Z

[tool_use: Bash]

### User | 2026-05-29T13:21:44.794Z

[tool_result] mcp-server/src/engines/CADToleranceSignalEncoderEngine.ts

### Assistant | 2026-05-29T13:21:50.627Z

Confirmed: none of those `CAD*Parse/Tolerance/STEP/DXF/F3D/FCStd/SVG/STL/Brep/GDT/FCF/Blueprint/PDF` engine names exist anywhere in the engines tree (only `CADToleranceSignalEncoderEngine.ts`, which is not on the list). These names are likely sub-functions or dispatcher actions, not engine files. Let me now grep the dispatchers for the action strings.

### Assistant | 2026-05-29T13:21:54.315Z

[tool_use: Grep]

### User | 2026-05-29T13:22:02.025Z

[tool_result] <persisted-output>
Output too large (28.5KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism-slot-xray\e9b75754-b179-40b0-b0fb-7007d65b2056\tool-results\toolu_01VTj33YsUTNAx6RFX7PFL5U.txt

Preview (first 2KB):
H:\prism\mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts:85:// BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U8 spec "Wire to: prism_ai" requirement.
H:\prism\mcp-server\src\too
... [+1819 chars truncated]

### Assistant | 2026-05-29T13:22:06.644Z

Let me read the full grep output to extract the concrete action strings, then narrow to actual quoted action names.

### Assistant | 2026-05-29T13:22:10.249Z

[tool_use: Grep]

### User | 2026-05-29T13:22:14.295Z

[tool_result] H:\prism\mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts:91:  "blueprint_lora_prepare_set",
H:\prism\mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts:92:  "blueprint_lora_export",
H:\prism\mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts:93:  "blueprint_lora_register_endpoint",
H:\prism\mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts:94:  "blueprint_lora_histo
... [+6899 chars truncated]

### Assistant | 2026-05-29T13:22:22.328Z

This is comprehensive. The action grep reveals the key insight: the Task-1 names like `CADGDTParseEnhancedEngine`, `CADPDFBlueprintExtractEngine`, `CADToleranceApplyEngine` etc. are **action names** (`cad_gdt_parse_enhanced`, `cad_pdf_blueprint_extract`, `cad_tolerance_apply`) backed by **differently-named engines** (`PrismEnhancedGDTEngine`, `PDFBlueprintDimensionExtractor`, `ToleranceAwareGenerationEngine`). The "Engine" names on the list are not the real on-disk engine class names.

Let me verify the actual backing engine files named in those dispatcher comments exist, so the report is accurate.

### Assistant | 2026-05-29T13:22:29.709Z

[tool_use: Bash]

### User | 2026-05-29T13:23:11.923Z

[tool_result] EXISTS  PDFBlueprintDimensionExtractorEngine.ts
EXISTS  PDFBlueprintPatternRescueEngine.ts
EXISTS  PrismEnhancedGDTEngine.ts
EXISTS  PrismGDTFCFParserEngine.ts
EXISTS  GDTCalloutParserEngine.ts
EXISTS  GDTStackupEngine.ts
EXISTS  FCFSyntaxValidatorEngine.ts
EXISTS  ToleranceAwareGenerationEngine.ts
EXISTS  ToleranceEngine.ts
EXISTS  FCStdNativeParserEngine.ts
EXISTS  F3DSQLiteParserEngine.ts
EXIST
... [+166 chars truncated]

### Assistant | 2026-05-29T13:23:16.869Z

All confirmed. I now have everything needed for an accurate report. Note the F3z parse action (`CADF3DParseF3zEngine` / `cad_f3d_parse_f3z`) didn't appear in the grep — line 316 was skipped. Let me confirm whether that action exists.

### Assistant | 2026-05-29T13:23:18.723Z

[tool_use: Grep]

### User | 2026-05-29T13:23:33.591Z

[tool_result] 199:  // join, treating .ipt/.iam/.f3d/.f3z/.sldprt/.sldasm as program-equivalent for
315:  "cad_f3d_parse",                 // F3DSQLiteParserEngine — Fusion .f3d → timeline
316:  "cad_f3d_parse_f3z",             // F3DSQLiteParserEngine — Fusion .f3z (multi-doc archive)
3735:          case "cad_f3d_parse": {
3739:                new Error("cad_f3d_parse requires file_path"),
3748:          case 
... [+172 chars truncated]

### Assistant | 2026-05-29T13:24:17.054Z

Confirmed `cad_f3d_parse_f3z` exists and is wired (case handler at line 3748, backed by `f3dSqliteParserEngine.parseF3Z`). I have everything verified. Final report.

---

# Blueprint-Vision Galaxy — On-Disk Asset Verification (main tree H:/prism)

All engines live flat in `mcp-server/src/engines/`. Paths below are relative to that dir unless noted.

## KEY FINDING
Of the 23 names in TASK 1, only **2 are real engine class files**. The other 21 are **NOT engine filenames** — they are **dispatcher action strings** (e.g. `cad_gdt_parse_enhanced`) backed by **differently-named engine classes** (e.g. `PrismEnhancedGDTEngine`). Reporting them as engine paths would be wrong. The capability is real; the engine name is hallucinated.

## (1) VERIFIED-EXISTING ENGINES (from the TASK-1 list)
| Listed name | Path | Size |
|---|---|---|
| BlueprintVisionOCREngine | `mcp-server/src/engines/BlueprintVisionOCREngine.ts` | 37.9K |

Only this one of the 23 listed names matches a real engine file.

## (2) MISSING / HALLUCINATED ENGINE NAMES (21)
These do NOT exist as engine files anywhere under `mcp-server/src/engines/` (verified via flat `ls` + bounded `find` to depth 3). Each maps to a real ACTION + real backing engine with a DIFFERENT name (see column 3):

| Hallucinated engine name | Real action (exists) | Real backing engine file (exists) |
|---|---|---|
| CADBlueprintGenerationEngine | `blueprint_to_all_cads` / (gen) | `BlueprintToCADGenerationEngine.ts` |
| CADPDFBlueprintExtractEngine | `cad_pdf_blueprint_extract` | `PDFBlueprintDimensionExtractorEngine.ts` |
| CADPDFPatternRescueExtractionEngine | `cad_pdf_pattern_rescue_extract` | `PDFBlueprintPatternRescueEngine.ts` |
| CADGDTParseEnhancedEngine | `cad_gdt_parse_enhanced` | `PrismEnhancedGDTEngine.ts` |
| CADGDTCalloutParseEngine | `cad_gdt_callout_parse` | `GDTCalloutParserEngine.ts` |
| CADFCFValidateEngine | `cad_fcf_validate` | `FCFSyntaxValidatorEngine.ts` |
| CADToleranceApplyEngine | `cad_tolerance_apply` | `ToleranceA
... [+6719 chars truncated]
