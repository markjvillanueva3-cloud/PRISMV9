---
type: "chat-session"
source: "claude-code-cli"
session_id: "05ceb444-c381-4be3-a54c-91d4043e4329"
title: "Review the EMBEDDING-SSOT Unit 2 changes for PRISM — wiring 3 embedding backends"
date: "2026-05-31"
first_ts: "2026-05-31T01:51:22.557Z"
last_ts: "2026-05-31T01:54:30.593Z"
cwd: "H:\\prism-slot-india\\mcp-server"
messages: 26
user_msgs: 11
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/agent-a769521c5d74c5eb8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:56"
---

# Review the EMBEDDING-SSOT Unit 2 changes for PRISM — wiring 3 embedding backends

> **claude-code-cli** | 2026-05-31 | 26 msgs (11 user / 15 assistant) | cwd: H:\prism-slot-india\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/agent-a769521c5d74c5eb8.jsonl`

## Transcript

### User | 2026-05-31T01:51:22.557Z

Review the EMBEDDING-SSOT Unit 2 changes for PRISM — wiring 3 embedding backends to consume the SSOT contract (src/config/embeddingContract.ts, already shipped + tested). Read the full diff yourself: `git -C H:/prism-slot-india diff HEAD -- mcp-server/src/engines/LocalEmbeddingEngine.ts mcp-server/src/engines/OllamaEmbedderEngine.ts mcp-server/src/engines/EmbeddingPipelineEngine.ts` and read the new test `H:/prism-slot-india/mcp-server/src/__tests__/embedding-backend-contracts.test.ts`. Also read `H:/prism-slot-india/mcp-server/src/config/embeddingContract.ts` for the API being consumed.

WHAT U2 DOES: each backend now (a) imports the SSOT, (b) sources its model/dim from a contract instead of private literals (must be VALUE-PRESERVING — same strings/numbers), (c) exposes a `contract()` accessor. The three contracts: LocalEmbeddingEngine→minilm-384, OllamaEmbedderEngine→nomic-768 (resolved dynamically from this.model via contractForModel, throws on unregistered model), EmbeddingPipelineEngine→mpnet-768 declared as TARGET only (this engine is lexical/trigram and emits NO vectors — the wiring must be HONEST about that, not claim it produces mpnet vectors).

VERIFY (first line 'VERDICT: PASS' or 'VERDICT: FAIL'; then BLOCKER: lines; then <=5 notes):
1. VALUE PRESERVATION: are the exported/declared model+dim byte-identical to the pre-U2 literals? (Local "Xenova/all-MiniLM-L6-v2"/384; Ollama default "nomic-embed-text"; Pipeline "all-mpnet-base-v2"/768). Any behavior change to existing callers of DEFAULT_MODEL/DEFAULT_DIM/getModel()/getStats()?
2. R12 HONESTY on EmbeddingPipelineEngine: does the code make clear it does NOT emit mpnet vectors (it's lexical), or does it now falsely imply it produces them? Is `contract()` documented as a target, not production?
3. Ollama dynamic contract(): contractForModel(this.model) throws on an unregistered model — is that the correct fail-loud behavior, and is it tested? Could it break any EXISTING caller (i.e. does anything already call
... [+510 chars truncated]

### Assistant | 2026-05-31T01:51:30.882Z

I'll review the EMBEDDING-SSOT Unit 2 changes. Let me start by reading the diff, the new test, and the contract being consumed.

### Assistant | 2026-05-31T01:51:33.859Z

[tool_use: Bash]

### Assistant | 2026-05-31T01:51:33.975Z

[tool_use: Read]

### Assistant | 2026-05-31T01:51:34.012Z

[tool_use: Read]

### User | 2026-05-31T01:51:45.714Z

[tool_result] mcp-server/src/engines/EmbeddingPipelineEngine.ts | 21 +++++++++++++++++++--
 mcp-server/src/engines/LocalEmbeddingEngine.ts    | 21 +++++++++++++++++++--
 mcp-server/src/engines/OllamaEmbedderEngine.ts    | 16 +++++++++++++++-
 3 files changed, 53 insertions(+), 5 deletions(-)

--- Changes ---

mcp-server/src/engines/EmbeddingPipelineEngine.ts
  @@ -13,6 +13,7 @@
  +import { getContract, type Emb
... [+4656 chars truncated]

### User | 2026-05-31T01:51:50.036Z

[tool_result] 1	/**
2	 * U2 integration test (EMBEDDING-SSOT): the three embedding backends now CONSUME the
3	 * single-source-of-truth contract (config/embeddingContract.ts). Asserts:
4	 *   1. each backend reports the correct contract via .contract()
5	 *   2. the wiring is value-preserving (exported model/dim literals unchanged)
6	 *   3. an unregistered model fails loud (you cannot tag a vector you can't co
... [+3510 chars truncated]

### User | 2026-05-31T01:51:50.039Z

[tool_result] 1	/**
2	 * EmbeddingContract — single source of truth for the embedding {model, dim,
3	 * quantization} across PRISM's embedding backends (GOAL: close the cross-cutting
4	 * embedding-fragmentation gap, AI-Systems-Improvement-Roadmap #1, slot:india 2026-05-30).
5	 *
6	 * Problem this solves: three backends declared three different models/dims with NO
7	 * shared contract —
8	 *   - OllamaEmbedderE
... [+9118 chars truncated]

### Assistant | 2026-05-31T01:51:53.405Z

Let me verify the value-preservation claims against the actual pre-U2 literals and confirm the structural details. I'll check the pre-U2 versions and the `getStats().mode` / `EmbeddingStats` definitions.

### Assistant | 2026-05-31T01:51:54.876Z

[tool_use: Bash]

### Assistant | 2026-05-31T01:51:55.746Z

[tool_use: Bash]

### User | 2026-05-31T01:51:58.815Z

[tool_result] 46:  /** Override the model name. Default nomic-embed-text */
72:const DEFAULT_MODEL = "nomic-embed-text";
117:    this.model = opts.model ?? DEFAULT_MODEL;

### User | 2026-05-31T01:52:03.276Z

[tool_result] 6: * - Text-to-vector embedding (pluggable model backend)
9: * - In-memory fallback when pgvector/model unavailable
11: * Model: sentence-transformers/all-mpnet-base-v2 (768 dims)
25:  model: string;
46:  model: string;
47:  dimensions: number;
49:  mode: "pgvector" | "memory" | "disabled";
107:  private mode: "pgvector" | "memory" | "disabled" = "disabled";
108:  private modelName = "all-mpnet-ba
... [+373 chars truncated]

### Assistant | 2026-05-31T01:52:06.637Z

Let me confirm the pre-U2 Local literals, that `this.model` is set before `contract()` could be called, and that nothing existing calls `contract()` transitively. Also confirm `embeddingContract.ts` imports nothing from engines.

### Assistant | 2026-05-31T01:52:09.953Z

[tool_use: Bash]

### Assistant | 2026-05-31T01:52:10.817Z

[tool_use: Bash]

### User | 2026-05-31T01:53:26.119Z

[tool_result] 4: * Phase external-infra. Runs Xenova's ONNX-backed MiniLM (or any feature-
35:export const DEFAULT_MODEL = "Xenova/all-MiniLM-L6-v2";
36:export const DEFAULT_DIM = 384;
40:  private model = DEFAULT_MODEL;
44:    const model = options.model ?? DEFAULT_MODEL;
160:    this.model = DEFAULT_MODEL;
---IMPORTS in embeddingContract---
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Bi
... [+133 chars truncated]

### User | 2026-05-31T01:53:32.092Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
0 matches for 'this.model\s*=\|opts.model\|constructor'

### Assistant | 2026-05-31T01:53:34.798Z

The grep patterns failed due to ripgrep escaping. Let me use the dedicated Grep tool to confirm the Ollama constructor sets `this.model` and check for existing `.contract(` callers properly.

### Assistant | 2026-05-31T01:53:35.752Z

[tool_use: Grep]

### Assistant | 2026-05-31T01:53:37.154Z

[tool_use: Grep]

### Assistant | 2026-05-31T01:53:37.818Z

[tool_use: Grep]

### User | 2026-05-31T01:54:08.493Z

[tool_result] Found 1 file
src\__tests__\embedding-backend-contracts.test.ts

### User | 2026-05-31T01:54:10.211Z

[tool_result] No matches found

### User | 2026-05-31T01:54:10.310Z

[tool_result] 119:  constructor(opts: OllamaEmbedderOptions = {}) {
121:    this.model = opts.model ?? DEFAULT_MODEL;

### Assistant | 2026-05-31T01:54:30.593Z

All claims verified. Let me confirm the Ollama instance-level `this.model` (the construction line shows `opts.model ?? DEFAULT_MODEL`, and `DEFAULT_MODEL` now resolves from `canonicalContract()`), and that the pipeline `getStats()` reads `this.modelName`/`this.dimensions` (which now flow from `targetContract`). All confirmed in the reads above. I have everything I need.

VERDICT: PASS

BLOCKER: (none)

Notes:

1. **Value preservation — confirmed byte-identical.** Pre-U2 literals (`git show HEAD`): Local `DEFAULT_MODEL="Xenova/all-MiniLM-L6-v2"`/`DEFAULT_DIM=384`; Ollama `DEFAULT_MODEL="nomic-embed-text"`; Pipeline `modelName="all-mpnet-base-v2"`/`dimensions=768`. The SSOT registry rows (`minilm-384`, `nomic-768`, `mpnet-768` at `embeddingContract.ts:60-62`) carry exactly those strings/numbers. `DEFAULT_MODEL`/`DEFAULT_DIM` remain `export const` with the same identity; `getStats()` still returns `this.modelName`/`this.dimensions`, now sourced via `targetContract.model/.dim` → no caller-visible behavior change. Ollama's `DEFAULT_MODEL = canonicalContract().model` resolves to `"nomic-embed-text"` and is still consumed by `this.model = opts.model ?? DEFAULT_MODEL` (constructor unchanged).

2. **R12 honesty on EmbeddingPipelineEngine — HONEST.** The added comment (`EmbeddingPipelineEngine.ts:106`) and the `contract()` JSDoc both explicitly state the engine is LEXICAL today, emits NO vectors, and that `contract()` is the *declared target space, NOT proof of production* — directing readers to `getStats().mode` as the live signal. The field is named `targetContract` (not `contract`). It does not falsely imply mpnet vectors are produced. The follow-up (making it real or renaming) is tracked in-comment.

3. **Ollama dynamic `contract()` fail-loud — correct and tested.** `contractForModel(this.model)` throws on an unregistered model (`embeddingContract.ts:93-98`), tested at test line 41-44 with `toThrow(/no embedding contract for model/)` using `text-embedding-ada-002`. No exi
... [+1505 chars truncated]
