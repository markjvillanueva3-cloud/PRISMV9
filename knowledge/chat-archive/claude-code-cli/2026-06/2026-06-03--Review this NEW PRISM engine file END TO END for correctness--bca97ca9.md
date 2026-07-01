---
type: "chat-session"
source: "claude-code-cli"
session_id: "bca97ca9-6098-4f88-a0cc-d28918dd42b6"
title: "Review this NEW PRISM engine file END TO END for correctness, edge cases, and si"
date: "2026-06-03"
first_ts: "2026-06-03T04:17:46.027Z"
last_ts: "2026-06-03T04:44:24.260Z"
cwd: "H:\\prism"
messages: 48
user_msgs: 19
assistant_msgs: 29
raw_file: "H:/.claude/projects/H--prism/bca97ca9-6098-4f88-a0cc-d28918dd42b6/subagents/agent-a389616ea8a547ad8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Review this NEW PRISM engine file END TO END for correctness, edge cases, and si

> **claude-code-cli** | 2026-06-03 | 48 msgs (19 user / 29 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/bca97ca9-6098-4f88-a0cc-d28918dd42b6/subagents/agent-a389616ea8a547ad8.jsonl`

## Transcript

### User | 2026-06-03T04:17:46.027Z

Review this NEW PRISM engine file END TO END for correctness, edge cases, and silent-failure risk. Grade PASS or FAIL and list every P0/P1 issue with file:line.

FILE (read the whole thing): H:/prism/mcp-server/src/engines/MillProgramCorpusEngine.ts

WHAT IT DOES: It is the "producer" that materializes a corpus of existing JM mill CNC programs for the already-built MillProgramReplicationEngine ("generate a program just by reading a print" — retrieves the most-similar existing program and adapts it). It:
1. Discovers JM mill `.hmc` hyperMILL CAM project files via juliett's index JSONL at mcp-server/data/jm-die-database/tables/files.jsonl (each row: {path, ext, customer, machine, kind, size, stem}).
2. Parses each file's XML content via the EXISTING hmcProjectParserEngine.parse(content, {projectName}) → returns {record: FeatureSequenceRecord, confidence, stats}.
3. Persists records to JSONL + a manifest.json (mcp-server/data/mill-corpus/).
4. Serves a cached corpus via getCorpus() to the dispatcher, which injects it as the default `corpus` for replicate_from_print when none is passed.

CONTRACTS TO VERIFY AGAINST (read as needed):
- FeatureSequenceRecord shape + deriveAxisCount(record):AxisCount export — H:/prism/mcp-server/src/engines/MillProgramReplicationEngine.ts (deriveAxisCount at line ~153) and the type at H:/prism/mcp-server/src/engines/hypermill/HMCProjectParserEngine.ts line 88.
- hmcProjectParserEngine.parse signature — same HMCProjectParserEngine.ts line 416 (returns HMCParseResult {record, stats, confidence, sourceDescription}).
- The dispatcher that will consume it: H:/prism/mcp-server/src/tools/dispatchers/multiAxisProgramDispatcher.ts (replicate_from_print currently requires inline corpus).

FOCUS ON:
1. Correctness of buildCorpus / persist / load / getCorpus / computeStats / calculate.
2. The empty-discovery branch that FLIPS result.ok from false→true (around the emptyBuild call) — is that logic sound and non-confusing? Does it leak a stale `reason`?

... [+1046 chars truncated]

### Assistant | 2026-06-03T04:18:18.700Z

I'll review this engine file end to end. Let me start by reading the file itself, then the contracts it depends on.

### Assistant | 2026-06-03T04:18:19.175Z

[tool_use: Read]

### Assistant | 2026-06-03T04:18:19.710Z

[tool_use: Read]

### Assistant | 2026-06-03T04:18:20.169Z

[tool_use: Read]

### User | 2026-06-03T04:19:40.555Z

[tool_result] 1	/**
2	 * MillProgramCorpusEngine — the REAL fuel for print-to-program replication.
3	 *
4	 * {@link MillProgramReplicationEngine} ("generate a CNC program just by reading a
5	 * print") retrieves the most-similar existing program from a
6	 * `corpus: FeatureSequenceRecord[]` and adapts it. But nothing ever materialized
7	 * that corpus from the real shop history — so the capability was DARK for 
... [+22119 chars truncated]

### User | 2026-06-03T04:19:46.467Z

[tool_result] 1	/**
2	 * MillProgramReplicationEngine — print-to-program by RETRIEVAL + ADAPTATION.
3	 *
4	 * The missing composer for the (previously orphaned, unwired) hyperMILL
5	 * replication chain. It is the "generate a CNC program just by reading a print"
6	 * capability: instead of synthesizing toolpaths from scratch, it RETRIEVES the
7	 * most similar existing program from a corpus and ADAPTS it to the
... [+20388 chars truncated]

### User | 2026-06-03T04:19:48.362Z

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
... [+36107 chars truncated]

### Assistant | 2026-06-03T04:19:51.356Z

Now let me look at the dispatcher that consumes this engine, and a couple of details I need to verify.

### Assistant | 2026-06-03T04:19:52.021Z

[tool_use: Read]

### User | 2026-06-03T04:23:03.258Z

[tool_result] 1	/**
2	 * prism_multiaxis_program — Multi-Axis Print-to-Program Dispatcher
3	 *
4	 * 5 actions across 2 engines:
5	 *   MultiAxisPrintToProgramEngine (2): multiaxis_print_to_program, multiaxis_process_plan
6	 *   MillProgramReplicationEngine (3):  replicate_from_print, replicate_similarity_search,
7	 *                                      replicate_corpus_index
8	 *
9	 * Generates CNC programs fo
... [+5260 chars truncated]

### Assistant | 2026-06-03T04:23:11.422Z

I now have all the contracts. Let me verify a few specific things: whether the dispatcher actually wires `MillProgramCorpusEngine` (the review claims it injects the corpus, but the dispatcher I read does NOT reference it), whether `RecognizedFeature.orientation` is optional (relevant to `deriveAxisCount` and `featureNeedsRotary` on persisted records), and the exact `replicate_corpus_index`/`getCorpus` consumption path.

### Assistant | 2026-06-03T04:23:11.423Z

[tool_use: Grep]

### Assistant | 2026-06-03T04:23:11.427Z

[tool_use: Grep]

### User | 2026-06-03T04:24:56.070Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-03T04:25:22.083Z

[tool_result] 26:export interface RecognizedFeature {
27-  id: string;
28-  type: FeatureType;
29-  confidence: number;                  // 0-1
--
32:  orientation: { axis: "x" | "y" | "z" | "custom"; angle_deg?: number };
33-  tolerance?: { type: string; value_mm: number };
34-  surface_finish_ra?: number;
35-  notes: string[];
--
155:        orientation: { axis: "z" },
156-        notes: [],
157-      };
158-

### Assistant | 2026-06-03T04:25:25.607Z

The root grep timed out (38K-file tree). Let me scope the search to the relevant directories to confirm the dispatcher wiring claim — this is the most important contract to verify.

### Assistant | 2026-06-03T04:25:27.079Z

[tool_use: Grep]

### Assistant | 2026-06-03T04:25:28.398Z

[tool_use: Grep]

### User | 2026-06-03T04:26:55.273Z

[tool_result] mcp-server\src\tools\dispatchers\cadAutomationDispatcher.ts:334:  "cad_corpus_stats",
mcp-server\src\tools\dispatchers\cadAutomationDispatcher.ts:2928:            const stats = cadRetrievalAugmentationEngine.getCorpusStats(corpus);
mcp-server\src\tools\dispatchers\cadAutomationDispatcher.ts:2930:            result = { ...stats, customers, source: "CADRetrievalAugmentationEngine.getCorpusStats" };

... [+3237 chars truncated]

### User | 2026-06-03T04:26:58.496Z

[tool_result] No matches found

### Assistant | 2026-06-03T04:27:07.585Z

Confirmed a critical wiring gap. The dispatcher (`multiAxisProgramDispatcher.ts`) does NOT reference `MillProgramCorpusEngine`, `millProgramCorpusEngine`, or `getCorpus` anywhere — and `MultiAxisPrintToProgramEngine.ts` doesn't either. The grep across all dispatchers shows zero hits for this new engine. Let me verify the new engine has a companion test file and that no dispatcher consumes its `corpus_build`/`corpus_stats` actions.

### Assistant | 2026-06-03T04:27:08.447Z

[tool_use: Glob]

### Assistant | 2026-06-03T04:27:08.569Z

[tool_use: Glob]

### User | 2026-06-03T04:27:48.921Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-03T04:27:48.924Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-03T04:27:51.685Z

The recursive globs from repo root time out. Let me scope directly to the `__tests__` directory and the engines directory with explicit paths.

### Assistant | 2026-06-03T04:27:52.947Z

[tool_use: Bash]

### User | 2026-06-03T04:34:23.560Z

[tool_result] Command running in background with ID: bmizjix6y. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\bca97ca9-6098-4f88-a0cc-d28918dd42b6\tasks\bmizjix6y.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-03T04:34:25.963Z

[tool_use: Read]

### User | 2026-06-03T04:36:17.175Z

[tool_result] <system-reminder>Warning: the file exists but is shorter than the provided offset (1). The file has 1 lines.</system-reminder>

### Assistant | 2026-06-03T04:36:19.558Z

Empty so far. Let me wait for it to complete.

### Assistant | 2026-06-03T04:36:21.250Z

[tool_use: Bash]

### User | 2026-06-03T04:39:06.994Z

[tool_result] Command running in background with ID: bev9d97xq. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\bca97ca9-6098-4f88-a0cc-d28918dd42b6\tasks\bev9d97xq.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-03T04:39:10.501Z

Both bash calls are being routed to background. Let me wait for the completion notification by reading the output files after a moment.

### Assistant | 2026-06-03T04:39:11.003Z

[tool_use: Read]

### User | 2026-06-03T04:40:25.438Z

[tool_result] <system-reminder>Warning: the file exists but is shorter than the provided offset (1). The file has 1 lines.</system-reminder>

### Assistant | 2026-06-03T04:40:28.688Z

Let me use the LSP to find references instead, which avoids the filesystem timeout. Actually, let me just check directly with a targeted Glob scoped to the tests directory path (non-recursive).

### Assistant | 2026-06-03T04:40:29.172Z

[tool_use: Glob]

### Assistant | 2026-06-03T04:40:29.719Z

[tool_use: Glob]

### User | 2026-06-03T04:41:55.228Z

[tool_result] mcp-server\src\engines\JMDieMillProgramHarvestEngine.ts
mcp-server\src\engines\JMDieMillProgramHarvesterEngine.ts
mcp-server\src\engines\MillProgramLearningEngine.ts
mcp-server\src\engines\MillProgramOptimizerEngine.ts
mcp-server\src\engines\MillProgramBacktraceEngine.ts
mcp-server\src\engines\MillProgramSignoffDossierEngine.ts
mcp-server\src\engines\MillProgramAnalyzerEngine.ts
mcp-server\src\eng
... [+86 chars truncated]

### User | 2026-06-03T04:41:57.164Z

[tool_result] mcp-server\src\__tests__\JMDieMillProgramHarvesterEngine.test.ts
mcp-server\src\__tests__\JMDieMillProgramHarvestEngine.test.ts
mcp-server\src\__tests__\MillProgramLearningEngine.test.ts
mcp-server\src\__tests__\MillProgramOptimizerEngine.test.ts
mcp-server\src\__tests__\MillProgramBacktraceEngine.test.ts
mcp-server\src\__tests__\MillProgramSignoffDossierEngine.test.ts
mcp-server\src\__tests__\Mil
... [+92 chars truncated]

### Assistant | 2026-06-03T04:42:05.429Z

Now I have the complete picture. This confirms two critical findings:

1. **`MillProgramCorpusEngine.ts` exists but has NO companion test file** in `src/__tests__/` (the directory `stop_on_unwired_assets.mjs` scans). The docstring at lines 28-31 explicitly claims "proven against a real JM `.hmc` in the companion test" — that test does not exist. Every sibling `MillProgram*Engine.ts` has a `.test.ts`; this one does not.

2. **The engine is NOT wired into any dispatcher.** The review prompt's stated contract — "the dispatcher injects it as the default `corpus` for `replicate_from_print` when none is passed" — is not implemented. The dispatcher grep returned zero hits for `MillProgramCorpusEngine`/`millProgramCorpusEngine`/`getCorpus`, and `MultiAxisPrintToProgramEngine.ts` doesn't reference it either. The `corpus_build`/`corpus_stats` actions are unreachable.

Let me clean up the lingering background tasks before finalizing.

### Assistant | 2026-06-03T04:42:05.889Z

[tool_use: TaskStop]

### Assistant | 2026-06-03T04:42:06.245Z

[tool_use: TaskStop]

### User | 2026-06-03T04:43:14.295Z

[tool_result] {"message":"Successfully stopped task: bev9d97xq (echo \"TESTS:\" ; ls \"H:/prism/mcp-server/src/__tests__/\" 2>/dev/null | grep -i \"MillProgram\" ; echo \"ENGINES:\" ; ls \"H:/prism/mcp-server/src/engines/\" 2>/dev/null | grep -i \"MillProgram\")","task_id":"bev9d97xq","task_type":"local_bash","command":"echo \"TESTS:\" ; ls \"H:/prism/mcp-server/src/__tests__/\" 2>/dev/null | grep -i \"MillProg
... [+107 chars truncated]

### User | 2026-06-03T04:43:14.303Z

[tool_result] {"message":"Successfully stopped task: bmizjix6y (ls \"H:/prism/mcp-server/src/__tests__/\" | grep -i \"MillProgram\\|Corpus\" ; echo \"---ENGINES---\" ; ls \"H:/prism/mcp-server/src/engines/\" | grep -i \"MillProgram\")","task_id":"bmizjix6y","task_type":"local_bash","command":"ls \"H:/prism/mcp-server/src/__tests__/\" | grep -i \"MillProgram\\|Corpus\" ; echo \"---ENGINES---\" ; ls \"H:/prism/mc
... [+51 chars truncated]

### Assistant | 2026-06-03T04:44:24.260Z

I've read the engine end to end, plus all four contract files (`MillProgramReplicationEngine`, `HMCProjectParserEngine`, `FeatureRecognitionEngine.RecognizedFeature`, and the consuming dispatcher). Here is the full review.

---

## Code Quality Analysis Report — MillProgramCorpusEngine.ts

### Verdict: **FAIL**

The engine's internal logic is genuinely high quality — clean fail-soft, correct mtime cache, sound stats, justified `any` usages. But it FAILS on two integration-level P0s that defeat its stated purpose ("the missing PRODUCER… the dispatcher injects it as the default corpus"): it is wired to **nothing**, and its docstring asserts a companion test that **does not exist**. Both are the exact failure classes PRISM gates against (`stop_on_unwired_assets`, R12 fail-loud, the "ship a real-data E2E" rule the file itself cites).

---

### P0 — Critical

**P0-1 — Engine is not wired into any dispatcher; the entire producer is dead code.**
`H:/prism/mcp-server/src/engines/MillProgramCorpusEngine.ts:521` (`millProgramCorpusEngine` export)
The file header (lines 22-25) and the review's stated contract say the multi-axis dispatcher "injects it into replicate_from_print / replicate_similarity_search when no inline corpus is supplied." It does not. `multiAxisProgramDispatcher.ts:112-120` calls `getReplicationEngine().calculate(...)` and passes `params` straight through — it never imports `MillProgramCorpusEngine`, never calls `getCorpus()`, never back-fills a default `corpus`. A scoped grep across all of `src/tools/dispatchers/` returns **zero** references to `MillProgramCorpusEngine` / `millProgramCorpusEngine` / `getCorpus` for this engine, and `MultiAxisPrintToProgramEngine.ts` has none either. Consequently:
- `corpus_build` and `corpus_stats` (calculate, lines 405/407) are **unreachable** — no dispatcher routes them.
- `replicate_from_print` with no inline `corpus` still hits `MillProgramReplicationEngine.validate` → returns `"empty corpus — no existing programs to re
... [+10606 chars truncated]
