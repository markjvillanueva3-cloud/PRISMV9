---
type: "chat-session"
source: "claude-code-cli"
session_id: "bca97ca9-6098-4f88-a0cc-d28918dd42b6"
title: "You are a read-only code surveyor for PRISM (manufacturing-intelligence platform"
date: "2026-06-03"
first_ts: "2026-06-03T03:15:27.694Z"
last_ts: "2026-06-03T03:47:07.133Z"
cwd: "H:\\prism"
messages: 86
user_msgs: 34
assistant_msgs: 52
raw_file: "H:/.claude/projects/H--prism/bca97ca9-6098-4f88-a0cc-d28918dd42b6/subagents/workflows/wf_c27f025f-070/agent-aa68ace956c5deddd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# You are a read-only code surveyor for PRISM (manufacturing-intelligence platform

> **claude-code-cli** | 2026-06-03 | 86 msgs (34 user / 52 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/bca97ca9-6098-4f88-a0cc-d28918dd42b6/subagents/workflows/wf_c27f025f-070/agent-aa68ace956c5deddd.jsonl`

## Transcript

### User | 2026-06-03T03:15:27.694Z

You are a read-only code surveyor for PRISM (manufacturing-intelligence platform) in repo H:/prism. Mill domain = slot foxtrot.
Do NOT write/edit anything. Locate evidence (file:line) and report STATE precisely.
The print-to-program pipeline is LARGELY ALREADY BUILT — your job is to find what is genuinely MISSING or UNWIRED, not to restate what exists.
Output CONCISE structured markdown ONLY, no preamble. For each component:
- COMPONENT: <name>
- STATE: one of [built+wired | built+UNWIRED | STUB | MISSING | partial]
- EVIDENCE: <file:line or "none found">
- GAP: <one line — what is missing for "read a print -> get a runnable program", or "none">
End with a 1-line VERDICT: the single highest-leverage gap in your facet for full 3->4->5 axis print-to-program.

FACET: PROGRAM REPLICATION FROM EXISTING CORPUS (the operator's stated goal: "generate replicated programs just by reading a print" using existing CAD/CAM/CNC programs). Is there ANY engine or action that, given a print's features, RETRIEVES a similar EXISTING JM program (JM DIE/CNC MILL HAAS 469 files, HURCO 25 .hnc) and ADAPTS/replicates it (re-dimension, re-material)? Search for: replicate, retrieval, similar-program, program-match, CAD-match, nearest-program, exemplar. Check H:/prism/mcp-server/src/engines/ broadly and jm-die-database (H:/prism/mcp-server/data/jm-die-database/, 111745 entries). This is the SUSPECTED CORE GAP — report exactly what exists vs what is missing for retrieval-augmented replication.

### Assistant | 2026-06-03T03:15:39.946Z

I'll conduct a thorough survey of the print-to-program pipeline with focus on program replication from the existing corpus. Let me search systematically.

### Assistant | 2026-06-03T03:15:40.672Z

[tool_use: Bash]

### User | 2026-06-03T03:16:26.453Z

[tool_result] ./.cache/npm/_npx/09002f125df728b2/node_modules/@claude-flow/memory/dist/smart-retrieval.d.ts
./.cache/npm/_npx/09002f125df728b2/node_modules/@claude-flow/memory/dist/smart-retrieval.js
./.cache/npm/_npx/09002f125df728b2/node_modules/@claude-flow/memory/dist/smart-retrieval.test.d.ts
./.cache/npm/_npx/09002f125df728b2/node_modules/@claude-flow/memory/dist/smart-retrieval.test.js
./.cache/npm/_npx/
... [+1897 chars truncated]

### Assistant | 2026-06-03T03:16:29.215Z

Let me focus on the actual source code in the prism directory, excluding node_modules:

### Assistant | 2026-06-03T03:16:29.518Z

[tool_use: Glob]

### User | 2026-06-03T03:16:40.205Z

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

### Assistant | 2026-06-03T03:16:41.964Z

Now let me search for retrieval, replication, and matching logic:

### Assistant | 2026-06-03T03:16:42.723Z

[tool_use: Grep]

### User | 2026-06-03T03:16:54.518Z

[tool_result] Found 250 files limit: 250
mcp-server\src\tools\dispatchers\knowledgeDispatcher.ts
mcp-server\src\index.ts
mcp-server\src\__tests__\MillProgramReplicationEngine.test.ts
mcp-server\src\engines\MillProgramReplicationEngine.ts
mcp-server\src\engines\DocumentInboxEngine.ts
mcp-server\src\tools\dispatchers\multiAxisProgramDispatcher.ts
mcp-server\src\tools\dispatchers\contextDispatcher.ts
mcp-server\sr
... [+13398 chars truncated]

### Assistant | 2026-06-03T03:16:57.536Z

Excellent signal. Let me examine the core replication engine and the database structure:

### Assistant | 2026-06-03T03:16:57.863Z

[tool_use: Read]

### User | 2026-06-03T03:17:13.584Z

[tool_result] 1	/**
2	 * MillProgramReplicationEngine — print-to-program by RETRIEVAL + ADAPTATION.
3	 *
4	 * The missing composer for the (previously orphaned, unwired) hyperMILL
5	 * replication chain. It is the "generate a CNC program just by reading a print"
6	 * capability: instead of synthesizing toolpaths from scratch, it RETRIEVES the
7	 * most similar existing program from a corpus and ADAPTS it to the
... [+20388 chars truncated]

### Assistant | 2026-06-03T03:17:16.159Z

Excellent context. Now let me search for the actual similarity and retrieval engines, plus check the JM Die database integration:

### Assistant | 2026-06-03T03:17:16.666Z

[tool_use: Read]

### Assistant | 2026-06-03T03:17:17.044Z

[tool_use: Read]

### Assistant | 2026-06-03T03:17:17.280Z

[tool_use: Bash]

### User | 2026-06-03T03:17:27.937Z

[tool_result] 1	/**
2	 * PartSimilaritySearchEngine — HM-KC-MS10-S2/U-HKC53
3	 *
4	 * Indexes FeatureSequenceRecords by geometric hash for O(1) bucket lookup.
5	 * Computes similarity metric: feature_type_overlap × dimension_proximity × material_match.
6	 * Returns top-N similar parts with per-feature adaptation suggestions.
7	 *
8	 * @milestone HM-KC-MS10/U-HKC53
9	 */
10	
11	import type { FeatureSequenceRecor
... [+15827 chars truncated]

### User | 2026-06-03T03:17:29.162Z

[tool_result] 1	/**
2	 * FeatureSequenceReplicatorEngine — HM-KC-MS10-S2/U-HKC54
3	 *
4	 * Takes a FeatureSequenceRecord template (from a similar part) + new part
5	 * description, adapts the sequence, and outputs an AC Python script.
6	 *
7	 * Adaptation steps:
8	 * 1. Scale dimensions proportionally
9	 * 2. Adjust S/F for new material using ISO group physics
10	 * 3. Add/remove features not in template
11	 * 
... [+26800 chars truncated]

### User | 2026-06-03T03:18:01.518Z

[tool_result] H:/prism/mcp-server/data/jm-die-database/jm-die-stock-material-catalog.json
H:/prism/mcp-server/data/jm-die-database/jm-die-tooling-catalog.json
H:/prism/mcp-server/data/jm-die-database/jm-die-tooling-stock-handoff.json
H:/prism/mcp-server/data/jm-die-database/jm-die-tooling-stock-master-manifest.json
H:/prism/mcp-server/data/jm-die-database/manifest.json

### Assistant | 2026-06-03T03:18:05.201Z

Now let me check the HMCProjectParser to understand the FeatureSequenceRecord schema and search for actual corpus loading logic:

### Assistant | 2026-06-03T03:18:06.096Z

[tool_use: Grep]

### Assistant | 2026-06-03T03:18:06.134Z

[tool_use: Bash]

### Assistant | 2026-06-03T03:18:06.257Z

[tool_use: Bash]

### User | 2026-06-03T03:18:16.158Z

[tool_result] Found 15 files limit: 15
mcp-server\src\tools\dispatchers\cadDispatcher.ts
mcp-server\src\engines\Form1099NECEngine.ts
mcp-server\src\__tests__\SVIEnhancedCalculatorEngine.test.ts
mcp-server\src\__tests__\SFPSNProvenanceAggregateWire.test.ts
mcp-server\src\__tests__\cad-validation-corpus.test.ts
mcp-server\src\engines\CADDrawAnyPartValidationHarnessEngine.ts
mcp-server\src\__tests__\PlaybookValida
... [+511 chars truncated]

### User | 2026-06-03T03:18:59.034Z

[tool_result] total 181
drwxr-xr-x 1 wompu 197611     0 May 29 14:44 ./
drwxr-xr-x 1 wompu 197611     0 Jun  2 14:23 ../
-rw-r--r-- 1 wompu 197611   398 May 29 10:10 .gitignore
-rw-r--r-- 1 wompu 197611  3099 May 29 10:37 README.md
-rw-r--r-- 1 wompu 197611 32308 May 29 14:44 jm-die-stock-material-catalog.json
-rw-r--r-- 1 wompu 197611 49680 May 29 14:44 jm-die-tooling-catalog.json
-rw-r--r-- 1 wompu 197611  72
... [+302 chars truncated]

### User | 2026-06-03T03:19:09.274Z

[tool_result] mcp-server/dist/engines/hypermill/HMCProjectParserEngine.d.ts
mcp-server/dist/engines/hypermill/HMCProjectParserEngine.d.ts.map
mcp-server/dist/engines/hypermill/HMCProjectParserEngine.js
mcp-server/dist/engines/hypermill/HMCProjectParserEngine.js.map
mcp-server/dist.bak-20260504-143257/engines/hypermill/HMCProjectParserEngine.d.ts
mcp-server/dist.bak-20260504-143257/engines/hypermill/HMCProjectPa
... [+242 chars truncated]

### Assistant | 2026-06-03T03:19:11.826Z

Let me check the indexed surfaces and then read the HMCProjectParser:

### Assistant | 2026-06-03T03:19:12.175Z

[tool_use: Read]

### Assistant | 2026-06-03T03:19:12.265Z

[tool_use: Read]

### User | 2026-06-03T03:19:15.573Z

[tool_result] 1	/**
2	 * HMCProjectParserEngine — HM-KC-MS10-S1/U-HKC51
3	 *
4	 * Reads hyperMILL .hmc project files (XML-based) and extracts complete
5	 * FeatureSequenceRecords: operations, parameters, tools, stock, WCS.
6	 * Handles v31 and v33 format variations. No USB key needed — .hmc files
7	 * are readable XML.
8	 *
9	 * @milestone HM-KC-MS10/U-HKC51
10	 */
11	
12	import type { RecognizedFeature, Featur
... [+8971 chars truncated]

### User | 2026-06-03T03:19:18.326Z

[tool_result] 1	# PRISM Shared Index Surfaces
2	
3	Generated: 2026-03-27T23:52:50.392Z
4	
5	## Purpose
6	
7	These are the canonical index and digest surfaces both Claude and Codex should prefer before broad repo sweeps when they need orientation, navigation, or low-token discovery.
8	
9	## Preferred Order
10	
11	1. Shared directives, handoff, and current position
12	2. Compact/system indexes and digests
13	3. T
... [+2226 chars truncated]

### Assistant | 2026-06-03T03:19:20.845Z

Now let me check the ENGINE_DIGEST to find corpus-loading infrastructure and then search for dispatcher wiring:

### Assistant | 2026-06-03T03:19:21.592Z

[tool_use: Bash]

### Assistant | 2026-06-03T03:19:21.913Z

[tool_use: Bash]

### User | 2026-06-03T03:20:13.867Z

[tool_result] - **CADCorpusFeaturePrevalenceLearnerEngine**: Learn class-feature prevalence
- **CADCorpusIngesterEngine**: CADCAM-DAGI-MS0/U-DAGI03
- **CADCorpusIngestionEngine**: Local-file CAD corpus learning surface.
- **CADCorpusPatternEngine**: Mine learning patterns from the local CAD corpus.
- **CADReplicationDurabilityEngine**: U-FS-11 (PHASE-47)
- **CADRetrievalAugmentationEngine**: CADCAM-DAGI-MS0/U-D
... [+973 chars truncated]

### User | 2026-06-03T03:20:13.934Z

[tool_result] mcp-server/src/tools/dispatchers/cadAutomationDispatcher.ts:  "cad_replication_set_target",
mcp-server/src/tools/dispatchers/cadAutomationDispatcher.ts:  "cad_replication_register_replica",
mcp-server/src/tools/dispatchers/cadAutomationDispatcher.ts:  "cad_replication_register_shard",
mcp-server/src/tools/dispatchers/cadAutomationDispatcher.ts:  "cad_replication_mark_replica_lost",
mcp-server/src/
... [+8238 chars truncated]

### Assistant | 2026-06-03T03:20:16.564Z

Excellent. Now let me check the dispatcher wiring for the replication engine and search for corpus loading:

### Assistant | 2026-06-03T03:20:16.987Z

[tool_use: Read]

### Assistant | 2026-06-03T03:20:17.510Z

[tool_use: Bash]

### system

... [6 middle messages omitted -- see raw_file] ...

### User | 2026-06-03T03:23:28.136Z

[tool_result] mcp-server/src/engines/Form1099NECEngine.ts: * the deferred cross-tree piece — it reconciles against juliett's canonical `jm-die-database` (do NOT
mcp-server/src/engines/JMDiePostProcessorLearningEngine.ts:    JMDiePostProcessorLearningEngine.cache = corpus;
mcp-server/src/engines/JMDiePostProcessorLearningEngine.ts:      `[JMDiePostProcLearning] learned ${corpus.profileCount} posts, ` +
mcp-serve
... [+277 chars truncated]

### Assistant | 2026-06-03T03:23:30.716Z

Excellent! Let me check the key corpus engines and the profile:

### Assistant | 2026-06-03T03:23:31.290Z

[tool_use: Read]

### Assistant | 2026-06-03T03:23:31.599Z

[tool_use: Read]

### Assistant | 2026-06-03T03:23:31.650Z

[tool_use: Read]

### User | 2026-06-03T03:23:46.988Z

[tool_result] 1	/**
2	 * JM Die Company Profile
3	 *
4	 * Test shop for PRISM development: 21 machines, 24,545+ programs, 100+ customers.
5	 * Location: Machesney Park, IL
6	 *
7	 * This module provides constants for customer names, machine categories,
8	 * and shop-specific configuration used across PRISM engines.
9	 *
10	 * @module data/jm-die-profile
11	 */
12	
13	/**
14	 * JM Die customer list — extracted f
... [+1245 chars truncated]

### User | 2026-06-03T03:23:47.012Z

[tool_result] 1	// WIRE-EXEMPT: tests in __tests__/engines/mlCorpusU-LEARN-03.test.ts
2	/**
3	 * JMDieTrainingCorpusEngine — U-LEARN-03
4	 * ========================================
5	 *
6	 * Orchestrator that crawls the JM Die program archive (22,721+ files),
7	 * parses each file using the appropriate parser (MINFileParser, NCFileParser),
8	 * joins with run logs, and produces training examples via TrainingEx
... [+3736 chars truncated]

### User | 2026-06-03T03:23:47.044Z

[tool_result] 1	/**
2	 * JMDieRecipeRetrieverEngine — Proven Recipe Retrieval (U-MIO42)
3	 * ===============================================================
4	 *
5	 * Queries JM DIE's 24,545 program archive to retrieve proven cutting parameters
6	 * (speed/feed/DOC) for similar materials and operations. Returns statistical
7	 * summaries with confidence intervals for use as parameter seeds.
8	 *
9	 * Capabiliti
... [+2894 chars truncated]

### Assistant | 2026-06-03T03:23:50.345Z

Perfect. Now let me check the actual test to see how the replication is being used, and verify the corpus loading mechanism:

### Assistant | 2026-06-03T03:23:50.788Z

[tool_use: Read]

### Assistant | 2026-06-03T03:23:51.536Z

[tool_use: Bash]

### User | 2026-06-03T03:23:57.553Z

[tool_result] 1	/**
2	 * MillProgramReplicationEngine — print-to-program by retrieval + adaptation.
3	 *
4	 * Verifies the composer that wires the (previously orphaned) hyperMILL
5	 * replication chain: retrieve the most similar existing program from a corpus,
6	 * axis-gate it (3 → 4 → 5), and adapt it to a new print.
7	 *
8	 * Tests encode INTENT, not just behavior:
9	 *  - the axis gate is a SAFETY invariant
... [+5318 chars truncated]

### User | 2026-06-03T03:26:01.946Z

[tool_result] mcp-server/src/engines/CADFeatureRecognitionEngine.ts:export class CADFeatureRecognitionEngine {
mcp-server/src/engines/CADFeatureRecognitionEngine.ts:export const cadFeatureRecognitionEngine = new CADFeatureRecognitionEngine();
mcp-server/src/engines/CADParameterPredictorEngine.ts: * U-CADC30 classifier thresholds, the FeatureRecognitionEngine taxonomy,
mcp-server/src/engines/FeatureRecognitionEn
... [+573 chars truncated]

### Assistant | 2026-06-03T03:26:04.656Z

Perfect. Now let me check if there's actual orchestration wiring that loads the corpus from the JM Die database for print-to-program:

### Assistant | 2026-06-03T03:26:05.258Z

[tool_use: Bash]

### Assistant | 2026-06-03T03:26:05.442Z

[tool_use: Bash]

### User | 2026-06-03T03:28:57.422Z

[tool_result] mcp-server/src/engines/AutoPrintToProgramBridgeEngine.ts
mcp-server/src/engines/LathePrintToProgramDLIntelligenceEngine.ts
mcp-server/src/engines/LathePrintToProgramKnowledgeGraphEngine.ts
mcp-server/src/engines/LathePrintToProgramReasoningEngine.ts
mcp-server/src/engines/MillingPrintToProgramEngine.ts
mcp-server/src/engines/MillPrintToProgramEngine.ts
mcp-server/src/engines/MultiAxisPrintToProgra
... [+2312 chars truncated]

### User | 2026-06-03T03:28:59.186Z

[tool_result] mcp-server/src/tools/dispatchers/multiAxisProgramDispatcher.ts-/**
mcp-server/src/tools/dispatchers/multiAxisProgramDispatcher.ts- * prism_multiaxis_program — Multi-Axis Print-to-Program Dispatcher
mcp-server/src/tools/dispatchers/multiAxisProgramDispatcher.ts- *
mcp-server/src/tools/dispatchers/multiAxisProgramDispatcher.ts- * 5 actions across 2 engines:
mcp-server/src/tools/dispatchers/multiAxis
... [+1944 chars truncated]

### Assistant | 2026-06-03T03:29:02.359Z

Let me check the PrintToProgramPipelineEngine to see if it orchestrates corpus loading:

### Assistant | 2026-06-03T03:29:02.795Z

[tool_use: Read]

### Assistant | 2026-06-03T03:29:03.168Z

[tool_use: Bash]

### User | 2026-06-03T03:29:27.821Z

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
... [+6078 chars truncated]

### User | 2026-06-03T03:31:19.147Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-03T03:31:22.637Z

Now let me check the key gap: is there actually an action/route that loads the corpus for the mill replication engine, or is that responsibility left to the caller?

### Assistant | 2026-06-03T03:31:23.522Z

[tool_use: Bash]

### Assistant | 2026-06-03T03:31:23.919Z

[tool_use: Bash]

### User | 2026-06-03T03:37:29.406Z

[tool_result] Command running in background with ID: bayv1tykn. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\bca97ca9-6098-4f88-a0cc-d28918dd42b6\tasks\bayv1tykn.output. You will be notified when it completes. To check interim output, use Read on that file path.

### User | 2026-06-03T03:37:29.957Z

[tool_result] Command running in background with ID: bs74vlov0. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\bca97ca9-6098-4f88-a0cc-d28918dd42b6\tasks\bs74vlov0.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-03T03:37:32.005Z

Let me read the background task results:

### Assistant | 2026-06-03T03:37:32.428Z

[tool_use: Read]

### Assistant | 2026-06-03T03:37:32.567Z

[tool_use: Read]

### User | 2026-06-03T03:38:33.052Z

[tool_result] 1	mcp-server/src/__tests__/MillProgramReplicationEngine.test.ts: * MillProgramReplicationEngine — print-to-program by retrieval + adaptation.
2	mcp-server/src/__tests__/MillProgramReplicationEngine.test.ts:} from "../engines/MillProgramReplicationEngine.js";
3	mcp-server/src/__tests__/MillProgramReplicationEngine.test.ts:  it("replicate_from_print routes through the dispatcher and returns ok:true"
... [+324 chars truncated]

### User | 2026-06-03T03:38:33.074Z

[tool_result] 1	mcp-server/src/tools/dispatchers/cadAutomationDispatcher.ts:            const stats = cadRetrievalAugmentationEngine.getCorpusStats(corpus);
2	mcp-server/src/tools/dispatchers/cadAutomationDispatcher.ts:            result = { ...stats, customers, source: "CADRetrievalAugmentationEngine.getCorpusStats" };
3	mcp-server/src/tools/dispatchers/camDispatcher.ts:  "jmdie_post_get_corpus",         // JM
... [+2354 chars truncated]

### Assistant | 2026-06-03T03:38:35.798Z

Excellent. Now let me compile the final evidence by checking what corpus data structure is expected and verifying if there's any actual loading integration:

### Assistant | 2026-06-03T03:38:36.420Z

[tool_use: Bash]

### User | 2026-06-03T03:45:43.267Z

[tool_result] Command running in background with ID: bv1gsmy1c. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\bca97ca9-6098-4f88-a0cc-d28918dd42b6\tasks\bv1gsmy1c.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-03T03:45:45.640Z

Let me read the schema file directly:

### Assistant | 2026-06-03T03:45:45.814Z

[tool_use: Read]

### User | 2026-06-03T03:46:47.290Z

[tool_result] 1	/**
2	 * Multi-Axis Program Action Schemas — Zod v4
3	 *
4	 * Schemas for MultiAxisPrintToProgramEngine (2 actions)
5	 */
6	
7	import { z } from "zod";
8	import type { ActionSchemaMap } from "./actionSchemaTypes.js";
9	
10	const orientationZ = z.object({
11	  A_deg: z.number(),
12	  B_deg: z.number(),
13	  C_deg: z.number(),
14	  lead_deg: z.number().optional(),
15	  lag_deg: z.number().optional
... [+4237 chars truncated]

### Assistant | 2026-06-03T03:47:07.133Z

Perfect! Now I have a complete picture. Let me compile the final report:

## VERDICT SUMMARY

**COMPONENT: PROGRAM REPLICATION FROM EXISTING CORPUS**  
**STATE: built+UNWIRED (engines exist but corpus loading is responsibility of caller, not orchestrated)**

**KEY FINDINGS:**

### Built Components (Evidence Locations):
1. **MillProgramReplicationEngine** (H:/prism/mcp-server/src/engines/MillProgramReplicationEngine.ts:1-457)
   - Composes similarity search + axis-gating + adaptation pipeline
   - Exports 3 actions: `replicate_from_print`, `replicate_similarity_search`, `replicate_corpus_index`
   - WIRED to dispatcher: multiAxisProgramDispatcher.ts:112-120
   - SCHEMA validated: multiAxisProgramActionSchemas.ts:74-93

2. **PartSimilaritySearchEngine** (H:/prism/mcp-server/src/engines/hypermill/PartSimilaritySearchEngine.ts:87-401)
   - LSH geometric hash indexing (O(1) bucket lookup)
   - Scores on 5-dimension breakdown: featureTypeOverlap, dimensionProximity, materialMatch, complexityMatch, operationOverlap
   - Weights: 0.30, 0.20, 0.20, 0.15, 0.15 (line 319-325)
   - Cross-material retrieval supported (materialMatch is weighted, NOT a hard filter)

3. **FeatureSequenceReplicatorEngine** (H:/prism/mcp-server/src/engines/hypermill/FeatureSequenceReplicatorEngine.ts:93-634)
   - Adapts template operations: dimension scaling (Kienzle-derived S/F adjustment)
   - Generates hyperMILL AC Python script (lines 385-491)
   - Feature reconciliation: adds/removes operations (lines 300-371)
   - Tool cascade resizing (line 220-243)

4. **HMCProjectParserEngine** (H:/prism/mcp-server/src/engines/hypermill/HMCProjectParserEngine.ts:1-250+)
   - Parses .hmc XML files (hyperMILL v31/v33)
   - Outputs FeatureSequenceRecord type (line 88)
   - Already built for live project data

5. **Dispatcher Integration** (H:/prism/mcp-server/src/tools/dispatchers/multiAxisProgramDispatcher.ts:112-120)
   - Actions `replicate_from_print`, `replicate_similarity_search`, `replicate_corpus_index` 
... [+3486 chars truncated]
