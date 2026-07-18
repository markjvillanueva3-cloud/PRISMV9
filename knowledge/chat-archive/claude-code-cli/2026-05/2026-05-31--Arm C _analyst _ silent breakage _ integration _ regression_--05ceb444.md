---
type: "chat-session"
source: "claude-code-cli"
session_id: "05ceb444-c381-4be3-a54c-91d4043e4329"
title: "Arm C (analyst — silent breakage / integration / regression) of a 3-of-3 gate on"
date: "2026-05-31"
first_ts: "2026-05-31T02:13:21.666Z"
last_ts: "2026-05-31T02:16:02.319Z"
cwd: "H:\\prism-slot-india"
messages: 21
user_msgs: 8
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/agent-af358804e12611f55.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:56"
---

# Arm C (analyst — silent breakage / integration / regression) of a 3-of-3 gate on

> **claude-code-cli** | 2026-05-31 | 21 msgs (8 user / 13 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/agent-af358804e12611f55.jsonl`

## Transcript

### User | 2026-05-31T02:13:21.666Z

Arm C (analyst — silent breakage / integration / regression) of a 3-of-3 gate on the EMBEDDING-SSOT milestone for PRISM. Read `git -C H:/prism-slot-india diff HEAD~3..HEAD` (6 files) + grep for consumers yourself.

Weight (FAIL on any):
1. SILENT BREAKAGE — re-sourcing OllamaEmbedderEngine/LocalEmbeddingEngine/EmbeddingPipelineEngine model+dim from the SSOT: does any EXISTING importer of DEFAULT_MODEL/DEFAULT_DIM/getStats() get a changed value or break? (grep importers). Module-load order / circular-import risk (embeddingContract imports nothing — confirm). Does adding contract() that throws on unregistered models break any existing caller? (it's new → should not).
2. DETERMINISM/PURITY — embeddingContract.ts has no Date.now/Math.random/fs; selectEmbedderContract does no IO (caller supplies health). Confirm.
3. EDGE/ADVERSARIAL completeness — selectEmbedderContract on empty list, unknown requested (throws), candidate w/ unknown contract (skipped), zero-norm/NaN/overflow in cosine. Any reachable path that returns a wrong-but-not-throwing value?
4. REGRESSION — purely additive to the 3 engines (no signature/result-shape change to embed()/getStats())?

TERSE. First line 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: lines + ≤3 notes. If unsure, FAIL.

### Assistant | 2026-05-31T02:13:31.418Z

I'll review the EMBEDDING-SSOT diff as Arm C. Let me read the diff and grep for consumers.

### Assistant | 2026-05-31T02:13:32.638Z

[tool_use: Bash]

### User | 2026-05-31T02:13:47.558Z

[tool_result] .../__tests__/embedding-backend-contracts.test.ts  |  70 ++++++
 mcp-server/src/config/embeddingContract.test.ts    | 235 +++++++++++++++++++
 mcp-server/src/config/embeddingContract.ts         | 256 +++++++++++++++++++++
 mcp-server/src/engines/EmbeddingPipelineEngine.ts  |  22 +-
 mcp-server/src/engines/LocalEmbeddingEngine.ts     |  21 +-
 mcp-server/src/engines/OllamaEmbedderEngine.ts     |  1
... [+56 chars truncated]

### Assistant | 2026-05-31T02:13:49.662Z

Let me read the full diff and the new contract file.

### Assistant | 2026-05-31T02:13:50.201Z

[tool_use: Read]

### User | 2026-05-31T02:14:12.128Z

[tool_result] 1	/**
2	 * EmbeddingContract — single source of truth for the embedding {model, dim,
3	 * quantization} across PRISM's embedding backends (GOAL: close the cross-cutting
4	 * embedding-fragmentation gap, AI-Systems-Improvement-Roadmap #1, slot:india 2026-05-30).
5	 *
6	 * Problem this solves: three backends declared three different models/dims with NO
7	 * shared contract —
8	 *   - OllamaEmbedderE
... [+12926 chars truncated]

### Assistant | 2026-05-31T02:14:14.489Z

Now the three engine diffs and how they consume the SSOT.

### Assistant | 2026-05-31T02:14:15.966Z

[tool_use: Bash]

### User | 2026-05-31T02:15:07.918Z

[tool_result] mcp-server/src/engines/EmbeddingPipelineEngine.ts | 22 ++++++++++++++++++++--
 mcp-server/src/engines/LocalEmbeddingEngine.ts    | 21 +++++++++++++++++++--
 mcp-server/src/engines/OllamaEmbedderEngine.ts    | 16 +++++++++++++++-
 3 files changed, 54 insertions(+), 5 deletions(-)

--- Changes ---

mcp-server/src/engines/EmbeddingPipelineEngine.ts
  @@ -13,6 +13,7 @@
  +import { getContract, type Em
... [+4693 chars truncated]

### Assistant | 2026-05-31T02:15:11.221Z

Now let me verify the critical regression/silent-breakage concerns: existing consumers of `DEFAULT_MODEL`/`DEFAULT_DIM`/`getStats()`, the `this.model` field on OllamaEmbedderEngine (does it always equal a registered model?), and that embeddingContract imports nothing.

### Assistant | 2026-05-31T02:15:12.540Z

[tool_use: Grep]

### Assistant | 2026-05-31T02:15:13.529Z

[tool_use: Grep]

### User | 2026-05-31T02:15:20.933Z

[tool_result] No matches found

### User | 2026-05-31T02:15:23.474Z

[tool_result] mcp-server\src\config\embeddingContract.ts:27: * 2026-05-30). The three backends hold their OWN `DEFAULT_MODEL`/`DEFAULT_DIM` consts —
mcp-server\src\config\embeddingContract.ts:67: * is nomic-embed-text (`OllamaEmbedderEngine` DEFAULT_MODEL — verified in this tree). The
mcp-server\src\engines\WikiIngestRouterEngine.ts:464:export const WIKI_INGEST_DEFAULT_MODEL = DEFAULT_OLLAMA_MODEL;
mcp-server\s
... [+5399 chars truncated]

### Assistant | 2026-05-31T02:15:29.602Z

Key findings confirmed:
- `embeddingContract.ts` imports nothing (grep-clean) → no circular-import / module-load-order risk. Confirmed.
- `LocalEmbeddingEngine` `DEFAULT_MODEL`/`DEFAULT_DIM` are still consumed at lines 48, 52, 177 internally and re-exported. The existing test `local-embedding-engine.test.ts:27-28` asserts `"Xenova/all-MiniLM-L6-v2"` / `384`. The SSOT registry row `minilm-384` has exactly those values → byte-identical, no regression.

Now the OllamaEmbedderEngine `contract()` throw-risk and whether `this.model` can be a non-registered value (the one real silent-breakage vector). Let me check the constructor and any custom-model callers, plus existing `getStats()` shape consumers for the pipeline engine.

### Assistant | 2026-05-31T02:15:30.544Z

[tool_use: Read]

### Assistant | 2026-05-31T02:15:32.020Z

[tool_use: Grep]

### User | 2026-05-31T02:15:45.640Z

[tool_result] mcp-server\src\__tests__\embedding-backend-contracts.test.ts:4: *   1. each backend reports the correct contract via .contract()
mcp-server\src\__tests__\embedding-backend-contracts.test.ts:24:    expect(localEmbeddingEngine.contract().id).toBe("minilm-384");
mcp-server\src\__tests__\embedding-backend-contracts.test.ts:35:    expect(ollamaEmbedderEngine.contract().id).toBe("nomic-768");
mcp-server
... [+3524 chars truncated]

### User | 2026-05-31T02:15:45.765Z

[tool_result] 108	  return dot / (Math.sqrt(na) * Math.sqrt(nb));
109	}
110	
111	export class OllamaEmbedderEngine {
112	  readonly name = "OllamaEmbedderEngine";
113	
114	  private readonly url: string;
115	  private readonly model: string;
116	  private readonly timeoutMs: number;
117	  private readonly fetchImpl: FetchLike;
118	
119	  constructor(opts: OllamaEmbedderOptions = {}) {
120	    this.url = opts.ur
... [+1200 chars truncated]

### Assistant | 2026-05-31T02:16:02.319Z

I have what I need. The `contract()` throw on OllamaEmbedderEngine is only reachable when a caller explicitly passes a non-registered `model:` (default + existing callers all use `nomic-embed-text` or mocks that don't call `.contract()`), and it's a NEW method with no existing callers (grep shows only test callers). No existing `getStats()`/`embed()` consumer touches `contract()`. Let me confirm the cosine purity claim — there's a pre-existing bare `cosineSimilarity` at line ~108 in OllamaEmbedderEngine (separate from the guarded one), confirming the SSOT's guarded version is additive, not a replacement of existing behavior.

The OllamaEmbedderEngine has its own `cosineSimilarity` (line 108, pre-existing, unchanged) — the SSOT's `cosineSimilarityGuarded` is a separate additive primitive, no existing call rerouted. Determinism confirmed: no `Date.now`/`Math.random`/`fs` in embeddingContract.ts. I have sufficient evidence.

VERDICT: PASS

BLOCKER: (none)

Notes:
1. **Silent breakage — none.** `DEFAULT_MODEL`/`DEFAULT_DIM` re-exported from `LocalEmbeddingEngine` are byte-identical (`minilm-384` row = `"Xenova/all-MiniLM-L6-v2"`/384); existing assertions in `local-embedding-engine.test.ts:27-28` still hold. Ollama `DEFAULT_MODEL = canonicalContract().model` = `"nomic-embed-text"` (unchanged); internal `this.model`/`getStats()`/`embed()` signatures + shapes untouched. `embeddingContract.ts` imports nothing (grep-clean) → no circular-import / load-order risk. New `contract()` methods have zero existing callers (only the new test) → additive; `contractForModel` throw is unreachable for the default + all existing instantiations (all use `nomic-embed-text` or never call `.contract()`).
2. **Determinism/purity confirmed.** No `Date.now`/`Math.random`/`fs`/`fetch` anywhere in `embeddingContract.ts`; `selectEmbedderContract` consumes caller-supplied `healthy` flags, does no IO, deterministic. `EMBEDDING_CONTRACTS` deep-frozen.
3. **Edge/adversarial — no wrong-but-silent path fo
... [+615 chars truncated]
