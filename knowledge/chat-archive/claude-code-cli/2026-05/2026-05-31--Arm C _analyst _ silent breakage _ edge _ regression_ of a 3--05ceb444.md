---
type: "chat-session"
source: "claude-code-cli"
session_id: "05ceb444-c381-4be3-a54c-91d4043e4329"
title: "Arm C (analyst — silent breakage / edge / regression) of a 3-of-3 gate on the RA"
date: "2026-05-31"
first_ts: "2026-05-31T03:23:01.717Z"
last_ts: "2026-05-31T03:27:15.703Z"
cwd: "H:\\prism-slot-india"
messages: 29
user_msgs: 12
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/agent-a787afaf1ba55e690.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:56"
---

# Arm C (analyst — silent breakage / edge / regression) of a 3-of-3 gate on the RA

> **claude-code-cli** | 2026-05-31 | 29 msgs (12 user / 17 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/agent-a787afaf1ba55e690.jsonl`

## Transcript

### User | 2026-05-31T03:23:01.717Z

Arm C (analyst — silent breakage / edge / regression) of a 3-of-3 gate on the RAG-HYBRID unit for PRISM. Read:
- NEW: H:/prism-slot-india/mcp-server/src/utils/reciprocalRankFusion.ts + .test.ts
- NEW: H:/prism-slot-india/mcp-server/src/__tests__/mlDispatcher.ragSearchRerank.integration.test.ts
- MODIFIED: git -C H:/prism-slot-india diff -- mcp-server/src/schemas/mlActionSchemas.ts mcp-server/src/tools/dispatchers/mlDispatcher.ts
- Context: TribalRAGEngine.search returns {results:RetrievalResult[]} and degrades to [] when the index file is absent (no throw); ReRankerEngine.rerank returns {results:RetrievalResult[]} and its schema caps top_k at 20.

Weight (FAIL on any):
1. SILENT BREAKAGE: does adding "rag_search_rerank" to ML_ACTIONS break any other exhaustive consumer? Does the dispatcher case mutate/alias the retrieved result objects (the byId Map shares references — is that safe)? Any way fused ids reference an id not in byId (→ base undefined → the ?? fallbacks fire — is that reachable, and is "unknown" a valid source_type)?
2. RRF EDGE: empty rankings → []; k guard (throws on ≤0/NaN/Inf); weight guard; duplicate-id within an arm keeps first rank; malformed id skip. Any input that yields NaN/Infinity score or an infinite loop? The source-name collision branch (contributions key namespacing) — correct?
3. DETERMINISM: reciprocalRankFusion pure (no Date/random/fs)? sort stable (tie-break by id)? The dispatcher case: any nondeterminism beyond the corpus?
4. REGRESSION: purely additive to mlDispatcher (one new case, no existing case touched)? rerank top_k≤20 respected so rerank never throws on its own schema?

TERSE. First line 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: lines + ≤3 notes. If unsure, FAIL.

### Assistant | 2026-05-31T03:23:13.211Z

I'll review the RAG-HYBRID unit files now.

### Assistant | 2026-05-31T03:23:14.075Z

[tool_use: Bash]

### Assistant | 2026-05-31T03:23:15.020Z

[tool_use: Bash]

### Assistant | 2026-05-31T03:23:15.975Z

[tool_use: Bash]

### Assistant | 2026-05-31T03:23:16.807Z

[tool_use: Bash]

### User | 2026-05-31T03:23:21.760Z

[tool_result] /**
 * reciprocalRankFusion — combine several ranked lists into one consensus ranking
 * (Cormack, Clarke & Buettcher 2009). RAG hybrid-recall core (AI-Systems-Improvement
 * -Roadmap RAG #3, slot:india 2026-05-30).
 *
 * Why RRF and not score-averaging: the arms being fused (BM25/TF-IDF lexical retrieval,
 * a Jaccard/n-gram reranker, and — later — dense cosine recall) produce scores on
 * INCOMP
... [+4109 chars truncated]

### User | 2026-05-31T03:23:21.883Z

[tool_result] /**
 * Tests for reciprocalRankFusion (RAG hybrid-recall core). Concrete-value assertions on
 * the exact RRF arithmetic, the consensus property (an item ranked moderately in BOTH arms
 * beats an item ranked #1 in only one), determinism (stable id tie-break), and the
 * failure/adversarial modes (bad k, bad weight, malformed ids, empty input, duplicates).
 */
import { describe, it, expect } from 
... [+5521 chars truncated]

### User | 2026-05-31T03:23:24.134Z

[tool_result] /**
 * Dispatcher round-trip integration test for prism_ml:rag_search_rerank (RAG-HYBRID v1).
 * Invokes THROUGH the real registered handler (registerMLDispatcher → server.tool handler),
 * not the engines directly — proving the action is wired (enum + schema + case), the schema
 * gates missing/empty queries, and the case composes BM25 retrieve + rerank + RRF without
 * throwing and returns the d
... [+3012 chars truncated]

### User | 2026-05-31T03:23:28.253Z

[tool_result] mcp-server/src/schemas/mlActionSchemas.ts        | 15 +++++
 mcp-server/src/tools/dispatchers/mlDispatcher.ts | 73 ++++++++++++++++++++++++
 2 files changed, 88 insertions(+)

--- Changes ---

mcp-server/src/schemas/mlActionSchemas.ts
  @@ -53,6 +53,7 @@ export const ML_ACTIONS = [
  +  "rag_search_rerank",
     "provenance_create",
     "provenance_validate",
     // U-LEARN-05 LoRA composition a
... [+5540 chars truncated]

### Assistant | 2026-05-31T03:23:34.667Z

Let me verify the key contract assumptions — the `getEngine` map keys, the rerank schema cap, and whether `ML_ACTIONS` feeds any exhaustive consumer.

### Assistant | 2026-05-31T03:23:36.555Z

[tool_use: Bash]

### Assistant | 2026-05-31T03:23:37.165Z

[tool_use: Bash]

### User | 2026-05-31T03:23:43.366Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
23 matches in 10 files:

100:0:
102:0:
104:0:
41:0:typeof import("../../engines/TribalRAGEngine.js").tribalRAGEngine | null = null;
42:0:typeof import("../../engines/ReRankerEngine.js").reRankerEngine | null = null;
43:0:typeof import("../../engines/ProvenanceEngine.js").provenanceEngine | null = ...
5
... [+1615 chars truncated]

### User | 2026-05-31T03:26:30.006Z

[tool_result] H:/prism-slot-india/mcp-server/src/schemas/mlActionSchemas.ts:37:export const ML_ACTIONS = [
H:/prism-slot-india/mcp-server/src/schemas/mlActionSchemas.ts:140:export type MLAction = typeof ML_ACTIONS[number];
H:/prism-slot-india/mcp-server/src/schemas/mlActionSchemas.ts:921:  action: z.enum(ML_ACTIONS).describe("ML pipeline action"),
H:/prism-slot-india/mcp-server/src/tools/dispatchers/algorithmDi
... [+566 chars truncated]

### Assistant | 2026-05-31T03:26:32.800Z

The `algorithmDispatcher.ts` spreads `...ML_ACTIONS` into its own enum — that's the exhaustive-consumer concern. Let me check whether it switch-dispatches on those names (which would need a new case) or just re-routes to the ML handler.

### Assistant | 2026-05-31T03:26:33.751Z

[tool_use: Read]

### Assistant | 2026-05-31T03:26:34.333Z

[tool_use: Read]

### User | 2026-05-31T03:26:35.926Z

[tool_result] 1	/**
2	 * Algorithm Dispatcher — Wire 52 Algorithms to MCP Actions
3	 * PP-AGI-S0/U-S0-06: Wire dormant algorithms from AlgorithmRegistry
4	 *
5	 * Exposes algorithms across 11 domains:
6	 *   - signal: FFT, spectral analysis, digital filtering
7	 *   - control: PID, Kalman filter, transfer functions
8	 *   - optimization: gradient descent, ACO, local search
9	 *   - numerical: linear algebra, OD
... [+6686 chars truncated]

### User | 2026-05-31T03:26:37.083Z

[tool_result] 1	// WIRE-EXEMPT: tests in __tests__/engines/ragStackU-LEARN-04.test.ts
2	/**
3	 * ReRankerEngine — U-LEARN-04
4	 * =============================
5	 *
6	 * Cross-encoder reranking for RAG results. Takes top-N candidates from
7	 * initial retrieval and refines to top-K using deeper semantic matching.
8	 *
9	 * Scoring Strategy
10	 * ----------------
11	 * Since we don't have a neural cross-encoder 
... [+1880 chars truncated]

### Assistant | 2026-05-31T03:26:41.799Z

The `algorithmDispatcher.ts` ML_ACTIONS is a separate local array (2 RL actions only), unrelated to `mlActionSchemas.ML_ACTIONS` — no collision. Let me confirm the rerank top_k cap path (rerankCount can be ≤20, so within schema) and check there's no exhaustive `satisfies Record<MLAction,...>` consumer that would break.

### Assistant | 2026-05-31T03:26:42.751Z

[tool_use: Read]

### User | 2026-05-31T03:26:43.905Z

[tool_result] 300	    candidates: z.array(z.object({
301	      id: z.string(),
302	      score: z.number(),
303	      source_type: z.string(),
304	      title: z.string().nullable(),
305	      excerpt: z.string().nullable(),
306	      metadata: z.record(z.string(), z.unknown()).optional(),
307	    })).describe("Candidates to rerank"),
308	    top_k: z.number().int().min(1).max(20).default(3),
309	    diversity_
... [+1683 chars truncated]

### Assistant | 2026-05-31T03:26:44.469Z

[tool_use: Bash]

### User | 2026-05-31T03:26:46.224Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
1 matches in 1 files:

H:/.../schemas/citationSchema.ts:69:export type RetrievalResult = z.infer<typeof RetrievalResultSchema>;
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
11 matches in 11 files:

39:0:CitationSourceTypeSchema.describe("Type of sourc
... [+583 chars truncated]

### Assistant | 2026-05-31T03:26:50.027Z

Now let me confirm the two remaining edge concerns: (1) `RetrievalResult` `source_type` — its schema is `CitationSourceTypeSchema` (an enum that DOES include `"unknown"`, line 329 confirms it's a valid member), and (2) whether the `byId` reference-sharing is safe (the dispatcher builds fresh result objects, never mutating `base`). Let me read the RRF score reachability for the "unknown"/missing-id fallback.

### Assistant | 2026-05-31T03:26:50.886Z

[tool_use: Read]

### User | 2026-05-31T03:26:54.481Z

[tool_result] 20	export const CitationSourceTypeSchema = z.enum([
21	  "formula",       // Physics formula (Kienzle, Taylor, deflection)
22	  "constant",      // Physics constant from constants.ts
23	  "tribal_tip",    // Shop floor tribal knowledge
24	  "playbook_rule", // Playbook machining rule
25	  "program",       // Historical JM Die program
26	  "run_log",       // Machine run log data
27	  "lora_adapter
... [+2525 chars truncated]

### Assistant | 2026-05-31T03:27:15.703Z

All four review axes verified. I have what I need.

VERDICT: PASS

BLOCKER: (none)

Axis-by-axis (analyst weighting):

1. SILENT BREAKAGE — clean. `mlActionSchemas.ML_ACTIONS` has one new entry; the only other consumer is `mlDispatcher`'s own `z.enum(ML_ACTIONS)` + `ACTION_ML_SCHEMAS` record (schema added in lockstep). `algorithmDispatcher.ts` defines its OWN local `ML_ACTIONS` (2 RL actions) — no import, no collision. No `satisfies Record<MLAction,…>` exhaustive map exists, so adding an action can't break a type-level consumer. The `byId` Map shares references but the case **reads** `base` and constructs fresh literal objects (`{ id, score, source_type, … }`) — never mutates/aliases the retrieved objects, so reference-sharing is safe. The `?? "unknown"` / `?? 0` / `?? null` fallbacks are reachable only if a fused id isn't in `byId`: that happens for any id present **only** in the `reranked` arm but absent from `retrieved`. In this pipeline `reranked` is built from `retrieved.slice(...)` so every reranked id IS in `byId` — fallbacks are effectively dead but harmless, and `"unknown"` is a valid `CitationSourceTypeSchema` member (line 34), so even if reached the output stays schema-valid.

2. RRF EDGE — correct. Empty rankings → `[]`. `k` guard throws on ≤0/NaN/Inf (`!Number.isFinite(k) || k <= 0`). Weight guard throws on negative/non-finite, zero-weight skips cleanly. Duplicate-id-within-arm keeps first rank via `seenInThisArm`. Malformed id (non-string/empty) skipped via `typeof`/`.length`. Score = `weight/(k+rank)`: with guaranteed finite weight≥0 and k>0, rank≥1 ⇒ denominator>0 finite ⇒ no NaN/Inf, no division-by-zero. No unbounded loops (single forward pass per arm). Source-name-collision branch namespaces to `${source}#${i}` only for the contributions record — the score already summed both, so the breakdown stays faithful without double-counting; correct.

3. DETERMINISM — pure. No Date/random/fs/import in `reciprocalRankFusion`. Sort is `b.score - a.score` with
... [+1547 chars truncated]
