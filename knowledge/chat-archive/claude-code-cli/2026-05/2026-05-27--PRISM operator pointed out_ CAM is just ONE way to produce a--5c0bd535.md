---
type: "chat-session"
source: "claude-code-cli"
session_id: "5c0bd535-0ecb-4744-9e62-ac1ea40fbe71"
title: "PRISM operator pointed out: CAM is just ONE way to produce a machined part. The "
date: "2026-05-27"
first_ts: "2026-05-27T00:36:43.584Z"
last_ts: "2026-05-27T00:41:58.519Z"
cwd: "H:\\PRISM"
messages: 73
user_msgs: 32
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism/5c0bd535-0ecb-4744-9e62-ac1ea40fbe71/subagents/agent-aa96e8b537f2cb8f6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# PRISM operator pointed out: CAM is just ONE way to produce a machined part. The 

> **claude-code-cli** | 2026-05-27 | 73 msgs (32 user / 41 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/5c0bd535-0ecb-4744-9e62-ac1ea40fbe71/subagents/agent-aa96e8b537f2cb8f6.jsonl`

## Transcript

### User | 2026-05-27T00:36:43.584Z

PRISM operator pointed out: CAM is just ONE way to produce a machined part. The orchestrator also needs to handle:
1. HARD-CODED G-code (the machinist writes it by hand)
2. PARAMETER MACROS (Fanuc custom macros B, Okuma user-task, Heidenhain Q-parameters, Mitsubishi M2/M80, Mazak EIA)
3. CONVERSATIONAL programming (Mazatrol, Heidenhain conversational, Fanuc Manual Guide i, Haas VQC / Visual Quick Code, Hurco Ultimax / WinMax, Okuma OSP Advanced One Touch IGF)
4. ON-MACHINE programming (graphical pendants, lathe templating)

Your job: read-only audit of what PRISM has for each alternative.

Search:
- H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md
- H:/prism/.claude/commands/macro-*.md, post-*.md, controller-*.md, *conversational*, *mazatrol*, *heidenhain*, *fanuc*, *haas*, *okuma*, *hurco*, *mitsubishi*, *mazak*, *fadal*, *siemens*, *cps-*
- H:/prism/mcp-server/src/engines/*Macro*, *Conversational*, *Controller*, *Dialect*, *MasterPost*, *PostProcessor*, *CapabilityMatrix*

Under 500 words, organize as a coverage table:

| Path | Controllers covered | Engines | Skills | Coverage status |

Then surface:
- Which of (hard-coded / macro / conversational / on-machine) does PRISM cover well today?
- What's the macro/conversational footprint? (Mazatrol Smooth, Heidenhain TNC640, Fanuc 30i Manual Guide i — does PRISM know how to emit a conversational program for any?)
- What's needed for the orchestrator to choose between "emit CAM toolpath → post → G-code" vs "emit Fanuc macro" vs "emit Mazatrol conversational" based on the part + shop + operator skill?
- ≤3 example tribal-knowledge rules already documented for choosing macro vs CAM (e.g., "for hole patterns on a Fanuc, the macro is faster to author than the CAM program")

Tag P0/P1/P2. Note any controller PRISM has a capability JSON for vs ones that are unknown.

### Assistant | 2026-05-27T00:36:50.957Z

I'll conduct a thorough read-only audit of PRISM's coverage for alternative CNC programming methods. Let me search systematically across the documented areas.

### Assistant | 2026-05-27T00:36:51.200Z

[tool_use: Read]

### Assistant | 2026-05-27T00:36:51.630Z

[tool_use: Glob]

### Assistant | 2026-05-27T00:36:52.207Z

[tool_use: Glob]

### Assistant | 2026-05-27T00:36:52.644Z

[tool_use: Grep]

### User | 2026-05-27T00:37:01.208Z

[tool_result] .claude\commands\post-diff.md
.claude\commands\post-generate.md
.claude\commands\post-harden.md
.claude\commands\post-register.md
.claude\commands\post-validate.md
.claude\commands\macro-convert.md
.claude\commands\macro-program.md

### User | 2026-05-27T00:37:01.224Z

[tool_result] mcp-server\src\engines\RLPostProcessorEngine.ts
mcp-server\src\engines\ConversationalMemoryEngine.ts
mcp-server\src\engines\PostProcessorEngine.ts
mcp-server\src\engines\PIDControllerEngine.ts
mcp-server\src\engines\NovelPostProcessorBridgeEngine.ts
mcp-server\src\engines\PostProcessorVerificationEngine.ts
mcp-server\src\engines\PostProcessorAPIEngine.ts
mcp-server\src\engines\ControllerStrategyVa
... [+5396 chars truncated]

### User | 2026-05-27T00:37:01.395Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-596 of 3228 total (114915 tokens, cap 25000). Call Read with offset=597 limit=596 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	# ENGINE DIGEST
2	## 3217 engines indexed
3	## Auto-generated: 2026-05-12 (manually appended 4 entries f
... [+43844 chars truncated]

### User | 2026-05-27T00:37:09.004Z

[tool_result] Found 100 files limit: 100
mcp-server\src\data\tribal-tips\jm-die-curriculum\index.ts
mcp-server\src\data\tribal-tips\jm-die-curriculum\hurco-cited-tips.ts
mcp-server\src\data\tribal-tips\jm-die-curriculum\fanuc-cited-tips.ts
mcp-server\src\data\tribal-tips\jm-die-curriculum\okuma-cited-tips.ts
mcp-server\src\data\tribal-tips\jm-die-curriculum\mazak-cited-tips.ts
mcp-server\src\data\tribal-tips\jm
... [+5398 chars truncated]

### Assistant | 2026-05-27T00:37:11.984Z

Let me search systematically for PRISM's coverage of the four programming alternatives.

### Assistant | 2026-05-27T00:37:12.689Z

[tool_use: Read]

### Assistant | 2026-05-27T00:37:12.837Z

[tool_use: Read]

### Assistant | 2026-05-27T00:37:13.045Z

[tool_use: Read]

### Assistant | 2026-05-27T00:37:14.364Z

[tool_use: Grep]

### User | 2026-05-27T00:37:28.430Z

[tool_result] 1	# ENGINE DIGEST
2	## 3217 engines indexed
3	## Auto-generated: 2026-05-12 (manually appended 4 entries for TRAINING-LEARNING-MS0/U-TL-U5..U6)
4	
5	- **AbrasiveJetMachiningEngine**: Physics-Based Abrasive Waterjet Prediction
6	- **AbsorptionChillerEngine**: Absorption refrigeration cycle analysis
7	- **AbstractionHierarchyEngine**: Multi-level tip→principle→law generalization
8	- **AccessControlL
... [+14425 chars truncated]

### User | 2026-05-27T00:37:28.432Z

[tool_result] 1	---
2	policy:
3	  tier: 3
4	  triggers:
5	    - "macro-convert"
6	composes_with:
7	  - "/auto-speed-feed"
8	  - "/program-audit"
9	  - "/shop-knowledge"
10	consumes:
11	  - "prism_data:box_batch_convert_macros"
12	  - "prism_data:box_convert_to_macro"
13	  - "prism_data:box_evaluate_macro_vars"
14	  - "prism_data:box_generate_macro_header"
15	  - "prism_data:box_scan_dimensions"
16	  - "prism_da
... [+3722 chars truncated]

### User | 2026-05-27T00:37:28.442Z

[tool_result] 1	---
2	name: macro-program
3	description: Macro-program pipeline — the operator-facing front door for MACRO-PROGRAM-PIPELINE-MS0. Catalog the 4 JM Okuma-OSP macros, match parts to families, place labelled reference templates, fill VC vars from print dims, run the S(x) ≥ 0.70 safety gate, emit per-machine labelled .MIN files, and orchestrate the gated, operator-confirmed bulk fan-out. NEVER bulk-a
... [+18773 chars truncated]

### User | 2026-05-27T00:37:31.556Z

[tool_result] Found 50 files limit: 50
mcp-server\src\engines\MonolithSurfaceFinishDatabaseEngine.ts
mcp-server\src\engines\WedmTrainingPairBridgeEngine.ts
mcp-server\src\engines\PostProcessorNumericDialectEngine.ts
mcp-server\src\engines\EmployeeMachineDomainAcademyEngine.ts
mcp-server\src\engines\MasterPostProcessorUnifiedAGIEngine.ts
mcp-server\src\engines\PostProcessorGeneratorEngine.ts
mcp-server\src\engin
... [+2363 chars truncated]

### Assistant | 2026-05-27T00:37:35.437Z

Let me search more specifically for conversational, on-machine, and hard-coded programming coverage.

### Assistant | 2026-05-27T00:37:36.653Z

[tool_use: Grep]

### Assistant | 2026-05-27T00:37:36.862Z

[tool_use: Bash]

### Assistant | 2026-05-27T00:37:37.281Z

[tool_use: Bash]

### Assistant | 2026-05-27T00:37:37.374Z

[tool_use: Bash]

### User | 2026-05-27T00:38:10.674Z

[tool_result] Found 11 files
mcp-server\src\engines\MillOnMachineProbeCycleEngine.ts
mcp-server\src\engines\MacroFillOrchestratorEngine.ts
mcp-server\src\engines\MacroLibraryEngine.ts
mcp-server\src\engines\LatheOnMachineProbeCycleEngine.ts
mcp-server\src\engines\PPMacroVariableValidatorEngine.ts
mcp-server\src\engines\OkumaMacroConverterBridgeEngine.ts
mcp-server\src\engines\MacroProgramIntelligenceEngine.ts
m
... [+213 chars truncated]

### User | 2026-05-27T00:38:11.526Z

[tool_result] H:\PRISM\mcp-server\src\engines/AdvancedPostPhysicsEngine.ts
H:\PRISM\mcp-server\src\engines/AdvancedPostProcessorEngine.ts
H:\PRISM\mcp-server\src\engines/AutoPostmortemEngine.ts
H:\PRISM\mcp-server\src\engines/BlamelessPostMortemEngine.ts
H:\PRISM\mcp-server\src\engines/CAMPostInvokeOrchestratorEngine.ts
H:\PRISM\mcp-server\src\engines/CAMPostSelectorUIEngine.ts
H:\PRISM\mcp-server\src\engines/C
... [+2190 chars truncated]

### User | 2026-05-27T00:38:11.529Z

[tool_result] H:\PRISM\mcp-server\src\engines/BatchMacroConversionEngine.ts
H:\PRISM\mcp-server\src\engines/HyperMillMacroDBEngine.ts
H:\PRISM\mcp-server\src\engines/MacroBulkEmitOrchestratorEngine.ts
H:\PRISM\mcp-server\src\engines/MacroCandidateGateEngine.ts
H:\PRISM\mcp-server\src\engines/MacroConversionAnalyzerEngine.ts
H:\PRISM\mcp-server\src\engines/MacroFillOrchestratorEngine.ts
H:\PRISM\mcp-server\src\e
... [+729 chars truncated]

### User | 2026-05-27T00:38:11.531Z

[tool_result] H:\PRISM\mcp-server\src\engines/BatchCAMControllerEngines.ts
H:\PRISM\mcp-server\src\engines/CNCControllerDeepLearningEngine.ts
H:\PRISM\mcp-server\src\engines/ControllerDialectEngine.ts
H:\PRISM\mcp-server\src\engines/ControllerFeatureMatrixEngine.ts
H:\PRISM\mcp-server\src\engines/ControllerKnowledgeDBEngine.ts
H:\PRISM\mcp-server\src\engines/ControllerKnowledgeEngine.ts
H:\PRISM\mcp-server\src\
... [+891 chars truncated]

### Assistant | 2026-05-27T00:38:14.439Z

Now let me read key engine files to understand what's covered and search for conversational/hard-coded patterns.

### Assistant | 2026-05-27T00:38:15.125Z

[tool_use: Read]

### Assistant | 2026-05-27T00:38:15.151Z

[tool_use: Read]

### Assistant | 2026-05-27T00:38:16.889Z

[tool_use: Grep]

### Assistant | 2026-05-27T00:38:16.892Z

[tool_use: Read]

### User | 2026-05-27T00:38:29.261Z

[tool_result] 1	/**
2	 * ControllerDialectEngine — Deep G-code dialect rules for 15+ controller families
3	 *
4	 * Provides controller-specific G-code generation rules including:
5	 * - Canned cycle translation (G81 ↔ CYCLE81 ↔ BORE1 ↔ MCALL)
6	 * - Work offset syntax (G54 ↔ $P_UIFR ↔ DATUM ↔ G15 H)
7	 * - Sub-program conventions (M98/M99 ↔ CALL/RET ↔ EXTERN)
8	 * - Tool change sequences per ATC type
9	 * - Arc
... [+4263 chars truncated]

### User | 2026-05-27T00:38:29.264Z

[tool_result] Found 7 files
mcp-server\src\data\tribal-tips\jm-die-curriculum\index.ts
mcp-server\src\data\tribal-tips\jm-die-curriculum\hurco-cited-tips.ts
mcp-server\src\data\tribal-tips\jm-die-curriculum\haas-cited-tips.ts
mcp-server\src\data\tribal-tips\jm-die-curriculum\fanuc-cited-tips.ts
mcp-server\src\data\tribal-tips\jm-die-curriculum\okuma-cited-tips.ts
mcp-server\src\data\tribal-tips\jm-die-curriculu
... [+93 chars truncated]

### User | 2026-05-27T00:38:29.267Z

[tool_result] 1	/**
2	 * MacroProgramIntelligenceEngine — AI Intelligence for Parametric CNC Macro Programs
3	 *
4	 * Understands, generates, optimizes, translates, debugs, and explains parametric
5	 * CNC macro programs. Built on top of the existing Okuma parsing/generation stack
6	 * and grounded in real production macros from JM Die Company:
7	 *   - CASING_MACRO.MIN     (casing turning: face/OD rough, drill
... [+3228 chars truncated]

### User | 2026-05-27T00:38:29.268Z

[tool_result] 1	/**
2	 * AUTO-GENERATED by scripts/generate-cited-tips-from-candidates.mjs.
3	 * Source: mcp-server/data/ingestion_cache/curriculum-tribal-candidates/jm-die-curriculum-tribal-candidates.jsonl
4	 * Do not edit by hand — re-run the generator instead. Manual curation:
5	 * mark accepted tips with status:"approved" via a sibling overlay.
6	 */
7	
8	export interface CitedTip {
9	  readonly id: string
... [+2214 chars truncated]

### Assistant | 2026-05-27T00:38:44.860Z

Let me search for any conversational or on-machine programming references and tribal knowledge about macro vs CAM decisions.

### Assistant | 2026-05-27T00:38:46.069Z

[tool_use: Grep]

### Assistant | 2026-05-27T00:38:47.383Z

[tool_use: Bash]

### Assistant | 2026-05-27T00:38:47.929Z

[tool_use: Grep]

### User | 2026-05-27T00:38:58.072Z

[tool_result] mcp-server\src\data\tribal-tips\milling-pdf-cited-tips.ts:909:    headline: "Mazatrol Matrix programming — conversational + EIA-G-code dual-mode reference for Mazak Integrex / VARIAXIS machines.",
mcp-server\src\data\tribal-tips\milling-pdf-cited-tips.ts:910:    body: "JM Die operates Mazak machines; Mazatrol Matrix is the conversational programming language. When a customer drawing comes in for a
... [+631 chars truncated]

### User | 2026-05-27T00:39:17.450Z

[tool_result] (Bash completed with no output)

### User | 2026-05-27T00:39:28.963Z

[tool_result] mcp-server\src\data\tribal-tips\jm-die-curriculum\haas-cited-tips.ts:3: * Source: mcp-server/data/ingestion_cache/curriculum-tribal-candidates/jm-die-curriculum-tribal-candidates.jsonl
mcp-server\src\data\tribal-tips\jm-die-curriculum\siemens-cited-tips.ts:3: * Source: mcp-server/data/ingestion_cache/curriculum-tribal-candidates/jm-die-curriculum-tribal-candidates.jsonl
mcp-server\src\data\tribal-
... [+884 chars truncated]

### Assistant | 2026-05-27T00:39:32.209Z

Excellent! I found the Mazatrol reference. Let me now search for the complete tribal knowledge database and any orchestration logic that chooses between programming methods.

### Assistant | 2026-05-27T00:39:32.787Z

[tool_use: Read]

### Assistant | 2026-05-27T00:39:33.561Z

[tool_use: Grep]

### Assistant | 2026-05-27T00:39:34.353Z

[tool_use: Grep]

### User | 2026-05-27T00:39:54.062Z

[tool_result] 905	  },
906	  {
907	    id: "MILL-TIP-JMD-MAZATROL-MATRIX",
908	    operation: "ngc_control",
909	    headline: "Mazatrol Matrix programming — conversational + EIA-G-code dual-mode reference for Mazak Integrex / VARIAXIS machines.",
910	    body: "JM Die operates Mazak machines; Mazatrol Matrix is the conversational programming language. When a customer drawing comes in for a Mazak target, the wi
... [+4854 chars truncated]

### User | 2026-05-27T00:39:54.871Z

[tool_result] mcp-server\src\data\tribal-tips\post-pdf-cited-tips.ts:302:    headline: "Use M98 P<n> L<count> (Fanuc family) or CALL <subname> (Siemens) for repeated patterns — reduces program size by 5-20× on hole patterns and pocket arrays + lets the controller cache the subprogram in fast memory.",
mcp-server\src\data\tribal-tips\jm-die-curriculum\mazak-cited-tips.ts:1870: (It becomes possible to process all
... [+60 chars truncated]

### User | 2026-05-27T00:39:58.013Z

[tool_result] Found 30 files limit: 30
mcp-server\src\engines\WedmTrainingPairBridgeEngine.ts
mcp-server\src\engines\SpeedFeedPDFCorpusBridgeEngine.ts
mcp-server\src\engines\MasterPostProcessorUnifiedAGIEngine.ts
mcp-server\src\engines\SpeedFeedNineAxisOrchestratorEngine.ts
mcp-server\src\engines\QuotingTrainingOrchestratorEngine.ts
mcp-server\src\engines\PrintToProgramToQuoteBridgeEngine.ts
mcp-server\src\engi
... [+1336 chars truncated]

### Assistant | 2026-05-27T00:40:03.144Z

Let me now check the orchestrator engines and the PRISM inventory to understand the overall picture.

### Assistant | 2026-05-27T00:40:03.492Z

[tool_use: Read]

### Assistant | 2026-05-27T00:40:04.622Z

[tool_use: Bash]

### Assistant | 2026-05-27T00:40:04.874Z

[tool_use: Grep]

### User | 2026-05-27T00:40:18.019Z

[tool_result] 1	/**
2	 * PrintToProgramPipelineEngine — Upload Print → Get CNC Program
3	 *
4	 * The ultimate user-facing orchestrator: accepts engineering drawing data
5	 * (parsed features, dimensions, tolerances, material, surface finish) and
6	 * produces a complete CNC program with tool list, setup sheet, and
7	 * confidence scoring.
8	 *
9	 * Pipeline Stages:
10	 *   S1: Drawing Intake — validate complete
... [+5041 chars truncated]

### User | 2026-05-27T00:40:19.629Z

[tool_result]    * dialect. Defaults to "fanuc" (most common macro-B base) when the brand is
   * absent or unrecognized — exit condition: "Controller-specific probe macros".
    // fanuc / haas-on-fanuc / generic macro-B
   * order so the two reverse-engineered artifacts (probe macros + setup sheet)
   * dialect that subsumes haas / mazak-fanuc / generic macro-B controllers —

### User | 2026-05-27T00:40:19.821Z

[tool_result] mcp-server\src\engines\AdaptiveEngagementEngine.ts:106:      switch (strategy) {
mcp-server\src\engines\CADSequencePoolEngine.ts:191:    switch (strategy) {
mcp-server\src\engines\CADToSTEPPipelineEngine.ts:405:    switch (strategy) {
mcp-server\src\engines\CAMKernelOrchestratorEngine.ts:442:  switch (strategy) {
mcp-server\src\engines\CAMKernelOrchestratorEngine.ts:555:  switch (strategy) {
mcp-s
... [+3991 chars truncated]

### Assistant | 2026-05-27T00:40:21.892Z

Let me now search for any explicit decision logic or rules about choosing between programming methods.

### Assistant | 2026-05-27T00:40:23.004Z

[tool_use: Grep]

### Assistant | 2026-05-27T00:40:23.628Z

[tool_use: Read]

### Assistant | 2026-05-27T00:40:24.765Z

[tool_use: Bash]

### User | 2026-05-27T00:40:36.447Z

[tool_result] 300	    id: "POST-TIP-SUBPROGRAM-PATTERN",
301	    topic: "subprograms",
302	    headline: "Use M98 P<n> L<count> (Fanuc family) or CALL <subname> (Siemens) for repeated patterns — reduces program size by 5-20× on hole patterns and pocket arrays + lets the controller cache the subprogram in fast memory.",
303	    sourceId: "PDF-POST-TRAINING-AUTODESK",
304	    sourceTitle: "Post Processor Training
... [+2642 chars truncated]

### User | 2026-05-27T00:40:39.330Z

[tool_result] mcp-server\src\engines\AdditiveManufacturingTribalCorpusEngine.ts:295:        source: "operator_skill × process × material × symptom decision tree",
mcp-server\src\engines\AdvancedRegressionEngine.ts:931:      // Fit simple decision stump (depth-1 tree)
mcp-server\src\engines\AdvancedStatisticalLearningEngine.ts:10: * 4. Random Forest Classification — ensemble decision trees with bagging
mcp-serve
... [+6293 chars truncated]

### User | 2026-05-27T00:40:46.294Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-27T00:40:48.793Z

Let me do a final focused search for any capability matrix or decision engine that chooses between programming methods.

### Assistant | 2026-05-27T00:40:50.063Z

[tool_use: Grep]

### Assistant | 2026-05-27T00:40:50.287Z

[tool_use: Read]

### Assistant | 2026-05-27T00:40:50.473Z

[tool_use: Read]

### User | 2026-05-27T00:40:56.402Z

[tool_result] 1	/**
2	 * ControllerFeatureMatrixEngine — Controller Feature Matrix for MS5 U01-U04
3	 *
4	 * Comprehensive hardcoded feature matrix covering 15+ controller variants
5	 * across four major CNC families:
6	 *   U01 — Fanuc (0i-F, 0i-TF, 16i, 18i, 30i, 31i)
7	 *   U02 — Siemens (808D, 810D, 828D, 840C, 840D, 840D sl, SINUMERIK ONE)
8	 *   U03 — Heidenhain (iTNC 530, TNC 620, TNC 640, TNC7)
9	 *   U
... [+3413 chars truncated]

### User | 2026-05-27T00:40:56.424Z

[tool_result] 1	/**
2	 * PostProcessorCapabilityMatrixEngine — Controller Capability Matrix
3	 *
4	 * Builds a searchable capability matrix from 180 Fusion 360 CPS post processors
5	 * covering 15+ controller families and 30+ capability dimensions. Enables
6	 * controller comparison, capability queries, and post processor selection.
7	 *
8	 * Actions: matrix_get, matrix_query, matrix_compare, matrix_select_post
... [+2776 chars truncated]

### User | 2026-05-27T00:40:59.471Z

[tool_result] Found 20 files
mcp-server\src\engines\LathePrintFeatureStrategySelectorEngine.ts
mcp-server\src\engines\CADCapabilityNegotiatorEngine.ts
mcp-server\src\engines\CADSystemRouterEngine.ts
mcp-server\src\engines\Fusion360CodeGeneratorEngine.ts
mcp-server\src\engines\Fusion360CADGeneratorAdapter.ts
mcp-server\src\engines\EspritCodeGeneratorEngine.ts
mcp-server\src\engines\SolidWorksCodeGeneratorEngine.
... [+702 chars truncated]

### Assistant | 2026-05-27T00:41:58.519Z

Perfect! Now I have comprehensive data. Let me compile the audit report with all findings.

## READ-ONLY AUDIT: PRISM Alternative CNC Programming Coverage

Based on systematic search of `H:/PRISM/mcp-server` documentation, engines, skills, and tribal knowledge, here is PRISM's coverage for the four CNC programming alternatives:

---

### Coverage Table

| Path | Controllers Covered | Engines | Skills | Coverage Status |
|------|-------------------|---------|--------|-----------------|
| **Macro (Parametric)** | Fanuc (Macro-B G65/G66), Okuma OSP (V1-V99 variables), Mitsubishi M80, Heidenhain Q-params (partial) | MacroProgramIntelligenceEngine, OkumaMacroHeaderGeneratorEngine, BatchMacroConversionEngine, ProgramMacroConverterEngine, MacroLibraryEngine, MacroFillOrchestratorEngine, MacroPerMachineEmitterEngine, MacroValidationEngine, PPMacroVariableValidatorEngine, MacroCandidateGateEngine | `/macro-program`, `/macro-convert`, `/okuma-macro` | **P0 MATURE** — Okuma focus (4 catalog macros, VC variable system, S(x)≥0.70 safety gate) |
| **Hard-Coded G-code** | All (Fanuc, Haas, Okuma, Mazak, Siemens, Heidenhain, Hurco, Mitsubishi) | PostProcessorEngine (38 stages), MasterPostProcessorEngine, ControllerDialectEngine, LathePostProcessorEngine, FiveAxisPostEngine, EDMPostProcessorExtension | `/post-generate`, `/post-validate`, `/post-harden` | **P0 MATURE** — CAM→post→G-code pipeline fully implemented |
| **Conversational** | Mazak Mazatrol Matrix (EIA dual-mode), Heidenhain TNC640/TNC7, Fanuc Manual Guide i, Okuma OSP Advanced One Touch IGF, Haas VQC, Hurco Ultimax, Mazak Conversational (partial) | ControllerDialectEngine (conversational field), ControllerFeatureMatrixEngine (conversational boolean), PostProcessorCapabilityMatrixEngine | (tribal knowledge only) | **P1 STUBBED** — metadata captured; no emitter engines |
| **On-Machine (Graphical Pendant/Templating)** | Okuma (pendant-based edit), Haas (MDI), Renishaw probing (auto-setup), generic pendant editing | MillOnM
... [+7734 chars truncated]
