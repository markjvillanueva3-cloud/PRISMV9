---
type: "chat-session"
source: "claude-code-cli"
session_id: "05ceb444-c381-4be3-a54c-91d4043e4329"
title: "Arm B (test-integrity + scope, INDEPENDENT) of a 3-of-3 gate on the EMBEDDING-SS"
date: "2026-05-31"
first_ts: "2026-05-31T02:13:16.383Z"
last_ts: "2026-05-31T02:17:10.565Z"
cwd: "H:\\prism-slot-india"
messages: 29
user_msgs: 11
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/agent-a501b3aadc395f458.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:56"
---

# Arm B (test-integrity + scope, INDEPENDENT) of a 3-of-3 gate on the EMBEDDING-SS

> **claude-code-cli** | 2026-05-31 | 29 msgs (11 user / 18 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/05ceb444-c381-4be3-a54c-91d4043e4329/subagents/agent-a501b3aadc395f458.jsonl`

## Transcript

### User | 2026-05-31T02:13:16.383Z

Arm B (test-integrity + scope, INDEPENDENT) of a 3-of-3 gate on the EMBEDDING-SSOT milestone for PRISM. Do not assume arm A caught anything. Read `git -C H:/prism-slot-india diff HEAD~3..HEAD` (6 files) yourself.

Weight (FAIL on any violation):
1. TEST INTEGRITY — every assertion concrete + would fail on a logic regression; no blanket stubs; no synthetic loops. Specifically verify the load-bearing cases are REAL: nomic-768 vs mpnet-768 judged INCOMPATIBLE (same 768 dim, different model); selectEmbedderContract REFUSES a healthy different-contract fallback (ok:false) when primary down; cosine cross-contract throws; dim-mismatch/NaN/overflow throw.
2. SCOPE — additive only? No behavior drift to the backends' existing embed/cosine/lexical-search paths? No removed assertions? The 3 backend edits must be value-preserving (same model strings + dims).
3. WIRING/ORPHAN — embeddingContract.ts is a config module consumed by the 3 backends (import edges exist) → not an orphan; no dispatcher action needed. Confirm no stop_on_unwired risk.
4. CONSTANTS — no Kienzle/Taylor/physics numbers; model/dim values are embedding identity, correctly housed in the SSOT.

TERSE. First line 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: lines + ≤3 notes. If unsure, FAIL.

### Assistant | 2026-05-31T02:13:29.532Z

I'll review the EMBEDDING-SSOT milestone diff myself.

### Assistant | 2026-05-31T02:13:30.148Z

[tool_use: Bash]

### User | 2026-05-31T02:13:46.531Z

[tool_result] .../__tests__/embedding-backend-contracts.test.ts  |  70 ++++++
 mcp-server/src/config/embeddingContract.test.ts    | 235 +++++++++++++++++++
 mcp-server/src/config/embeddingContract.ts         | 256 +++++++++++++++++++++
 mcp-server/src/engines/EmbeddingPipelineEngine.ts  |  22 +-
 mcp-server/src/engines/LocalEmbeddingEngine.ts     |  21 +-
 mcp-server/src/engines/OllamaEmbedderEngine.ts     |  1
... [+56 chars truncated]

### Assistant | 2026-05-31T02:13:48.634Z

Let me read the full diff for each file.

### Assistant | 2026-05-31T02:13:49.525Z

[tool_use: Bash]

### Assistant | 2026-05-31T02:13:50.301Z

[tool_use: Bash]

### User | 2026-05-31T02:14:41.405Z

[tool_result] mcp-server/src/config/embeddingContract.ts | 256 +++++++++++++++++++++++++++++
 1 file changed, 256 insertions(+)

--- Changes ---

mcp-server/src/config/embeddingContract.ts
  @@ -0,0 +1,256 @@
  +/**
  + * EmbeddingContract — single source of truth for the embedding {model, dim,
  + * quantization} across PRISM's embedding backends (GOAL: close the cross-cutting
  + * embedding-fragmentation gap
... [+5285 chars truncated]

### User | 2026-05-31T02:15:10.744Z

[tool_result] mcp-server/src/config/embeddingContract.test.ts | 235 ++++++++++++++++++++++++
 1 file changed, 235 insertions(+)

--- Changes ---

mcp-server/src/config/embeddingContract.test.ts
  @@ -0,0 +1,235 @@
  +/**
  + * Tests for the EmbeddingContract SSOT (EMBEDDING-SSOT v1). Concrete-value assertions on
  + * the registry + the load-bearing guard behavior: that two SAME-DIM-DIFFERENT-MODEL
  + * contra
... [+4790 chars truncated]

### Assistant | 2026-05-31T02:15:13.081Z

The diff is being truncated. Let me read the full files directly to verify the load-bearing logic and tests completely.

### Assistant | 2026-05-31T02:15:13.575Z

[tool_use: Read]

### Assistant | 2026-05-31T02:15:14.159Z

[tool_use: Read]

### User | 2026-05-31T02:15:18.257Z

[tool_result] read-once-guard: 'H:\prism-slot-india\mcp-server\src\config\embeddingContract.ts' was already read 81s ago in this session and is unchanged (mtime 1780193312699). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_RE
... [+11 chars truncated]

### User | 2026-05-31T02:15:21.488Z

[tool_result] 1	/**
2	 * Tests for the EmbeddingContract SSOT (EMBEDDING-SSOT v1). Concrete-value assertions on
3	 * the registry + the load-bearing guard behavior: that two SAME-DIM-DIFFERENT-MODEL
4	 * contracts (nomic-768 vs mpnet-768) are INCOMPATIBLE, that cross-contract cosine throws,
5	 * and that dim/NaN/zero-norm edge cases behave exactly as specified (R9 — these fail if
6	 * the comparability logic re
... [+11429 chars truncated]

### Assistant | 2026-05-31T02:15:24.071Z

The test file is fully read. Now let me read the implementation file (it was in the truncated diff). Let me read the full implementation to verify the load-bearing logic matches the tests.

### Assistant | 2026-05-31T02:15:25.343Z

[tool_use: Read]

### User | 2026-05-31T02:15:43.951Z

[tool_result] 100	    throw new Error(`embedding model "${model}" is contract ${match.id} (dim ${match.dim}), but caller declared dim ${dim} — refuse to mix`);
101	  }
102	  return match;
103	}
104	
105	/** True IFF the two contracts are the SAME vector space (cosine-comparable). */
106	export function isCompatible(a: EmbeddingContract | string, b: EmbeddingContract | string): boolean {
107	  const ca = typeof 
... [+7666 chars truncated]

### Assistant | 2026-05-31T02:15:46.934Z

Now let me verify the `selectEmbedderContract` "primary vs fallback" logic against the test for the unknown-ghost-primary case (line 224-230). And read the 3 backend edits.

### Assistant | 2026-05-31T02:15:49.128Z

[tool_use: Bash]

### User | 2026-05-31T02:16:12.202Z

[tool_result] .../__tests__/embedding-backend-contracts.test.ts  | 70 ++++++++++++++++++++++
 mcp-server/src/engines/EmbeddingPipelineEngine.ts  | 22 ++++++-
 mcp-server/src/engines/LocalEmbeddingEngine.ts     | 21 ++++++-
 mcp-server/src/engines/OllamaEmbedderEngine.ts     | 16 ++++-
 4 files changed, 124 insertions(+), 5 deletions(-)

--- Changes ---

mcp-server/src/__tests__/embedding-backend-contracts.test.
... [+8743 chars truncated]

### Assistant | 2026-05-31T02:16:22.291Z

I now have all 6 files in full. Let me verify the load-bearing claims by tracing the logic carefully against the tests.

Key verification points:

1. **nomic-768 vs mpnet-768 INCOMPATIBLE (same 768 dim, different model)** — `isCompatible` (line 112) returns `ca.model === cb.model && ca.dim === cb.dim`. nomic model `"nomic-embed-text"` ≠ mpnet `"all-mpnet-base-v2"` → `false`. Test line 70-73 + 160 + integration test assert this. REAL.

2. **selectEmbedderContract REFUSES healthy different-contract fallback** — line 239 filters candidates to only compatible ones; the 384/mpnet candidate is excluded from `compatible`. Test 187-208: `ok:false`, `consideredCompatible:["nomic-768"]`. REAL.

3. **cosine cross-contract throws** — line 159 `assertSameContract` first. Test 118-120. REAL.

4. **dim-mismatch/NaN/overflow throw** — lines 161-162 (dim), 170-171 (non-finite), 179-183 (overflow). Tests 122-142. REAL — note overflow test uses 1e200 (na = 1e400 = Infinity) which genuinely produces NaN cosine.

Let me verify the one subtle case: the "ghost-primary" test (line 224-230) and the `primary` vs `fallback` reason logic, plus check `EmbeddingPipelineEngine.getStats().mode` starts `"disabled"` as the test asserts.

### Assistant | 2026-05-31T02:16:24.249Z

[tool_use: Grep]

### Assistant | 2026-05-31T02:16:25.530Z

[tool_use: Grep]

### User | 2026-05-31T02:16:32.036Z

[tool_result] 50:  mode: "pgvector" | "memory" | "disabled";
108:  private mode: "pgvector" | "memory" | "disabled" = "disabled";
117:  private modelName = this.targetContract.model;
128:          this.mode = "pgvector";
135:    this.mode = "memory";
149:    if (this.mode === "pgvector") {
222:      model: this.modelName,
225:      mode: this.mode,

### User | 2026-05-31T02:16:34.685Z

[tool_result] 117-  private readonly fetchImpl: FetchLike;
118-
119:  constructor(opts: OllamaEmbedderOptions = {}) {
120-    this.url = opts.url ?? DEFAULT_URL;
121:    this.model = opts.model ?? DEFAULT_MODEL;
122-    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
123-    this.fetchImpl = opts.fetchImpl ?? (globalThis.fetch as FetchLike);

### Assistant | 2026-05-31T02:16:43.113Z

Both confirmed:
- `EmbeddingPipelineEngine.mode` initializes to `"disabled"` (line 108) → test line 51 (`new EmbeddingPipelineEngine().getStats().mode` === `"disabled"`) is REAL and would fail if init() logic regressed.
- `OllamaEmbedderEngine.model = opts.model ?? DEFAULT_MODEL` → `contract()` resolves dynamically; custom mpnet → mpnet-768, unregistered ada-002 → throws. REAL.

Now the ghost-primary subtle case (test 224-230): candidates = `[ghost-9999(healthy), nomic-768(healthy)]`. `compatible` filters to `[nomic-768]` (ghost excluded via `isCompatible` → false). Loop hits nomic-768 healthy. `isPrimary` check: `list[0].contractId === "ghost-9999"` ≠ `"nomic-768"` → false → reason `"fallback"`. Test expects `reason: "fallback"`. REAL and correctly distinguishes.

Let me verify there are no removed assertions or behavior drift in the backends — confirm the only changes to the 3 backends are additive (new import + new `contract()` method + sourcing consts from SSOT). The diff shows pure additions. Let me confirm `getStats()` in EmbeddingPipelineEngine still returns `model`/`dimensions` from the same fields (now SSOT-sourced but value-identical), and check for any orphan/unwired risk on the new config module.

### Assistant | 2026-05-31T02:16:44.023Z

[tool_use: Grep]

### User | 2026-05-31T02:16:49.924Z

[tool_result] mcp-server\src\config\embeddingContract.test.ts:21:} from "./embeddingContract.js";
mcp-server\src\engines\EmbeddingPipelineEngine.ts:16:import { getContract, type EmbeddingContract } from "../config/embeddingContract.js";
mcp-server\src\__tests__\embedding-backend-contracts.test.ts:20:import { assertSameContract, isCompatible } from "../config/embeddingContract.js";
mcp-server\src\engines\LocalEm
... [+265 chars truncated]

### Assistant | 2026-05-31T02:17:10.565Z

Import edges confirmed: `embeddingContract.ts` is consumed by all 3 backends (real import edges) → not an orphan. It's a `config/` module, not an engine, so `stop_on_unwired_assets` (scans engines for dispatcher refs) does not apply — config modules are consumed via direct import, no dispatcher action needed. Correctly characterized in arm-3 requirement.

Final checks on the remaining requirements:

- **Constants**: model strings (`nomic-embed-text`, `Xenova/all-MiniLM-L6-v2`, `all-mpnet-base-v2`) and dims (768/384) are embedding identity, correctly housed in the SSOT. No Kienzle/Taylor/physics numbers. The `1e200`/`1e400` and `3,4,5` in tests are math fixtures, not physics. PASS.
- **Value-preservation**: integration test (line 28-35, 38-41) asserts `LOCAL_DEFAULT_MODEL`/`DIM`, ollama default → nomic-768, pipeline stats `model`/`dimensions` are byte-identical to prior literals. The diff confirms old literals (`"all-mpnet-base-v2"`/`768`, `"Xenova/all-MiniLM-L6-v2"`/`384`, `"nomic-embed-text"`) now flow through SSOT with identical values. No behavior drift; the existing `embed`/`cosine`/`getStats` paths are untouched (only consts re-sourced + new `contract()` method added).
- **No removed assertions / no blanket stubs / no synthetic loops**: every test uses concrete expected values (`24/25`, `[]`, exact object equality, regex throw messages). No `toBeDefined()` stubs. Each would fail on a real logic regression (e.g., regressing `isCompatible` to dim-only flips lines 70-73 and the integration test). PASS.

One nuance worth noting (not a blocker): the overflow test comment says `1e400 = Infinity → cos = NaN`, and the guard at line 179 catches `!Number.isFinite(cos)` — `dot = 1e400 = Infinity`, `na=nb=Infinity`, `Infinity/Infinity = NaN`, NaN is non-finite → throws. Correct. The `na===0` zero-norm short-circuit (line 177) precedes it so zero-norm returns 0, not throw — matches test 126-131.

VERDICT: PASS

BLOCKER: (none)

Notes (≤3):
1. Load-bearing cases all verified
... [+1416 chars truncated]
