---
type: "chat-session"
source: "claude-code-cli"
session_id: "c82292de-3196-443a-9079-0b9c268968eb"
title: "Review this NEW pure library file end-to-end for correctness and silent-breakage"
date: "2026-06-25"
first_ts: "2026-06-25T09:45:39.413Z"
last_ts: "2026-06-25T09:49:17.675Z"
cwd: "H:\\PRISM"
messages: 44
user_msgs: 17
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism/c82292de-3196-443a-9079-0b9c268968eb/subagents/agent-ab1bedb7280322e5d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# Review this NEW pure library file end-to-end for correctness and silent-breakage

> **claude-code-cli** | 2026-06-25 | 44 msgs (17 user / 27 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/c82292de-3196-443a-9079-0b9c268968eb/subagents/agent-ab1bedb7280322e5d.jsonl`

## Transcript

### User | 2026-06-25T09:45:39.413Z

Review this NEW pure library file end-to-end for correctness and silent-breakage risk: H:\PRISM\scripts\lib\node-structural-features.mjs

CONTEXT — what it must do: it builds a LEAKAGE-SAFE structural feature vector for a GNN tier-5 dispatcher classifier that is evaluated leave-one-out over labeled engine "ghost" nodes (a held-out engine is classified by cosine-kNN against the rest of the pool; label = the dispatcher it wires to). The CRITICAL correctness invariant is: an engine's structural feature MUST NOT encode its OWN dispatcher label (that is the prediction target and is absent for genuinely-unwired engines). The legitimate signal is the dispatcher classes of the engine's IMPORT NEIGHBORS (the company it keeps), computed from engine→engine import adjacency. The feature is then late-fusion concatenated to a 768-d nomic text embedding via concatWeighted(textVec, structVec, alpha).

Verify specifically (cite file:line):
1. LEAKAGE: confirm neighborDispatcherHistogram + structuralVector can NEVER include the engine's own label. Is there ANY path where an engine's own dispatcher leaks into its own feature?
2. The import-basename regex IMPORT_SPEC_RE — does it correctly capture static `from "x"`, dynamic `import("x")`, and side-effect `import "x"` while not matching false positives (e.g. the word "import" in a comment/string, `export ... from`)? Any catastrophic-backtracking risk?
3. buildEngineImportAdjacencyFromSources — directed edges, self-edge exclusion, total map (empty entries), correctness.
4. l2normalize / concatWeighted math: alpha=0 => text-only, alpha=1 => struct-only, all-zero struct => graceful text-only (no NaN/divide-by-zero). Confirm the cosine-fusion claim in the docstring is accurate.
5. loadEngineSources FS walk: stack-safe DFS, deterministic first-seen-wins on duplicate basenames, fail-soft on unreadable dir, the *Engine.ts filter, the normalizeDirent dir-detection heuristic (string entries with no extension assumed dir) — any correctness gap?
6
... [+408 chars truncated]

### Assistant | 2026-06-25T09:45:44.193Z

I'll review this file end-to-end for leakage and correctness. Let me start by reading the implementation and its test.

### Assistant | 2026-06-25T09:45:44.667Z

[tool_use: Read]

### Assistant | 2026-06-25T09:45:45.089Z

[tool_use: Read]

### User | 2026-06-25T09:45:45.601Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * node-structural-features.mjs -- leakage-safe STRUCTURAL feature augmentation for the GNN
4	 * tier-5 direct-embed dispatcher classifier (U-GNN-STRUCT-FEATURES, slot:india 2026-06-25).
5	 *
6	 * THE PROBLEM (measured, not guessed). analyze-ghost-embed-separability.mjs proved the deployed
7	 * 768-d nomic TEXT embeddings barely separate engines by dispatcher class: o
... [+15793 chars truncated]

### User | 2026-06-25T09:45:46.027Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * node-structural-features.test.mjs -- R9 tests for the leakage-safe structural feature lib
4	 * (U-GNN-STRUCT-FEATURES, slot:india 2026-06-25). Tests verify INTENT:
5	 *   - the leakage guard (an engine's OWN dispatcher label must NEVER appear in its own feature);
6	 *   - the separability rationale (same-class engines that keep similar company get high cosine,
7	 *
... [+13675 chars truncated]

### Assistant | 2026-06-25T09:45:50.018Z

Now let me trace the core leakage invariant carefully and check the regex for the catastrophic-backtracking and false-positive concerns. Let me verify how this module is actually consumed downstream, since the leakage invariant depends on the whole pipeline.

### Assistant | 2026-06-25T09:45:50.985Z

[tool_use: Grep]

### Assistant | 2026-06-25T09:45:52.145Z

[tool_use: Grep]

### User | 2026-06-25T09:45:59.471Z

[tool_result] Found 5 files
scripts\lib\node-structural-features.test.mjs
mcp-server\data\state\session-file-ownership.json
state\shared\WORK_CLAIMS.json
state\shared\ATOMIC_CLAIMS.json
scripts\lib\node-structural-features.mjs

### User | 2026-06-25T09:45:59.998Z

[tool_result] Found 2 files
scripts\lib\node-structural-features.test.mjs
scripts\lib\node-structural-features.mjs

### Assistant | 2026-06-25T09:46:05.269Z

The module is a pure library with no production consumer yet (only itself, its test, and claim/ownership ledgers). So my review is scoped to the library contract correctness; the leakage invariant must hold at the API boundary. Let me verify the regex behavior against the false-positive cases the prompt named, and check the `engineToDisp` single-label assumption against the real extractor that would feed it.

### Assistant | 2026-06-25T09:46:06.243Z

[tool_use: Grep]

### User | 2026-06-25T09:46:09.719Z

[tool_result] Found 13 files
knowledge\memories\reference\reference_gnn_action_surface_insitu_measure_2026_06_21.md
scripts\lib\node-structural-features.mjs
knowledge\wiki\code-tribal\learnings\ai-systems-gnn-u-action-surface-separability-measure.md
scripts\measure-action-surface-separability.mjs
scripts\fisher-reweight-embeddings.mjs
scripts\measure-codebase-wired-refpool-auroc.mjs
scripts\analyze-ghost-embed-
... [+295 chars truncated]

### Assistant | 2026-06-25T09:46:11.049Z

[tool_use: Bash]

### User | 2026-06-25T09:46:15.535Z

[tool_result] export-from                  ["ReExportEngine"]
comment-line                 ["CommentEngine"]
comment-block                ["BlockEngine"]
string-literal-import-word   []
import-in-string-with-from   ["StringEngine"]
require                      []
import-meta                  []
type-import                  ["TypeEngine"]
multiline-import             ["MultiEngine"]
from-property-access         
... [+2 chars truncated]

### Assistant | 2026-06-25T09:46:25.269Z

The regex has several false-positive behaviors. Key findings: it matches `export ... from`, captures imports inside comments, and captures imports embedded in string literals. Let me check `require()` is intentionally missed and verify the `engineToDisp` single-label contract from the real extractor, plus test the catastrophic-backtracking risk.

### Assistant | 2026-06-25T09:46:26.494Z

[tool_use: Read]

### User | 2026-06-25T09:46:27.587Z

[tool_result] read-once-guard: 'H:\PRISM\scripts\lib\wired-engine-mapper.mjs' was already read 9m ago in this session and is unchanged (mtime 1778894636226). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-25T09:46:44.622Z

[tool_use: Bash]

### User | 2026-06-25T09:46:48.572Z

[tool_result] evil1 ms 0 matches 0
evil2 ms 0 matches 0
evil3 ms 3 matches 0

### Assistant | 2026-06-25T09:46:52.332Z

No catastrophic backtracking - the regex is linear (no nested quantifiers; `[^"']+` is a negated class which can't backtrack ambiguously). Let me view the real extractor that produces `engineToDisp` to confirm the single-label Map contract, and check the `from`-as-identifier false positive impact more carefully.

### Assistant | 2026-06-25T09:46:54.217Z

[tool_use: Grep]

### User | 2026-06-25T09:46:55.936Z

[tool_result] 5: * Pure helper: scans dispatcher .ts files, extracts engine imports (both static
7: * and returns a map of engine class names → list of dispatcher namespaces that
15: *   buildEngineDispatcherMap(dispatchersDir) → Map<engineName, Set<prismNamespace>>
16: *   dispatcherFileToNamespace(filename) → string  // 'calcDispatcher.ts' → 'prism_calc'
17: *   inferDispatcherBySibling(unwiredName, wiredMap,
... [+818 chars truncated]

### Assistant | 2026-06-25T09:46:59.564Z

[tool_use: Bash]

### User | 2026-06-25T09:47:03.519Z

[tool_result] identifier-from FP: []
comment-import phantom edge A->B: [ 'BEngine' ]

### Assistant | 2026-06-25T09:47:24.907Z

Important finding confirmed: `buildEngineDispatcherMap` returns `Map<engineName, Set<dispatcher-namespace>>` (a **Set**, line 15), but this module's `engineToDisp` parameter is documented and consumed as `Map<engineName, string>` (single label). Let me verify how the values are consumed when a Set is passed, since this is an integration-coupling risk, and confirm the `from` identifier false-positive needs a quote to trigger.

### Assistant | 2026-06-25T09:47:26.274Z

[tool_use: Read]

### User | 2026-06-25T09:47:27.582Z

[tool_result] 79	 * Build the full engine → Set<dispatcher-namespace> map by scanning all
80	 * dispatcher .ts files in the directory.
81	 */
82	export function buildEngineDispatcherMap(dispatchersDir) {
83	  const map = new Map();
84	  if (!fs.existsSync(dispatchersDir)) return map;
85	  const files = fs.readdirSync(dispatchersDir).filter(
86	    (f) => f.endsWith(".ts") && !f.endsWith(".d.ts") && !f.endsWith(
... [+734 chars truncated]

### Assistant | 2026-06-25T09:47:30.703Z

[tool_use: Bash]

### User | 2026-06-25T09:47:35.074Z

[tool_result] buildClassList(Set-valued): []
hist(Set-valued): []
structVector(Set-valued): []

### Assistant | 2026-06-25T09:47:42.101Z

Confirmed integration-coupling finding: if the canonical `buildEngineDispatcherMap` output (`Map<engine, Set<dispatcher>>`) is passed directly, every function **silently returns empty** — `buildClassList` yields `[]`, histograms are empty, structural vectors are all-zero. No crash, no warning. The feature would silently contribute zero lift and the deploy-gate measurement would read "no improvement" rather than failing loud. The caller must convert Set→string first.

This is the most important silent-breakage risk, though it's a contract-mismatch with a sibling module, not a leak. Let me now nail down the leakage question definitively with an adversarial test, and confirm the `.cjs`/`.cts` extension gap (the SRC_EXT_RE includes cjs/jsx/tsx but the `isEngineFile` filter and loader basename strip differ).

### Assistant | 2026-06-25T09:47:49.824Z

[tool_use: Bash]

### User | 2026-06-25T09:47:53.873Z

[tool_result] adj E: [ 'NEngine' ]
E hist: [ [ 'prism_calc', 1 ] ] -- contains prism_safety(own)? false
E struct over [ 'prism_calc', 'prism_safety' ] = [ 1, 0 ]
E hist (N same class as E): [ [ 'prism_calc', 1 ] ] -- this is legit neighbour signal

### Assistant | 2026-06-25T09:47:59.499Z

Leakage invariant **holds**. There is no path for an engine's own label to enter its own feature:
- The histogram only reads `engineToDisp.get(n)` for `n` in the neighbour set, never `engineToDisp.get(engine)`.
- Self-edges are excluded twice (adjacency builder line 95, histogram line 138).
- The zero-fallback produces an all-zero block, never an own-label one-hot (proven by the test at line 115-122).
- When a neighbour shares E's class, that's legitimate company-keeping signal, not a self-leak.

Now let me check the extension-handling gap and the `from`-with-quote false positive impact on real engine code.

### Assistant | 2026-06-25T09:48:05.999Z

[tool_use: Bash]

### User | 2026-06-25T09:48:10.012Z

[tool_result] cjs strip: [ 'FooEngine' ]
cts NOT in SRC_EXT_RE: [ 'FooEngine.cts' ]
mts NOT in SRC_EXT_RE: [ 'FooEngine.mts' ]
json-from-field: [ ': ' ]

### Assistant | 2026-06-25T09:48:16.652Z

Two more notes confirmed: the `"from": "x"` JSON-field case does match (`\bfrom` followed by `: "..."` — captures garbage `": "` here but in `{"from":"./AddrEngine.js"}` it would capture the path). And `.mts`/`.cts` are absent from `SRC_EXT_RE`. These are minor since the engine universe is `.ts`-only basenames, so a mismatched/garbage basename simply fails the `engineNames.has(base)` membership test and produces no edge — fail-safe toward zero, never toward a leak.

Let me do a final check on the test suite passing and the degree-feature leak-neutrality (the degree scalar is class-agnostic, so it can't leak a label, but let me confirm it doesn't encode "is wired").

### Assistant | 2026-06-25T09:48:17.224Z

[tool_use: Bash]

### User | 2026-06-25T09:48:24.053Z

[tool_result] # tests 21
# suites 0
# pass 21
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 19.0819

### Assistant | 2026-06-25T09:48:28.755Z

All 21 tests pass. Let me do one final adversarial check on `concatWeighted`'s cosine claim in the docstring and the `degreeFeat` interaction with `l2normalize` to confirm the math claim is exact.

### Assistant | 2026-06-25T09:48:36.699Z

[tool_use: Bash]

### User | 2026-06-25T09:48:40.738Z

[tool_result] raw-dot identity lhs 0.25 rhs 0.25 match true
true cosine of concat: 0.4999999999999999 vs docstring expr: 0.25

### Assistant | 2026-06-25T09:49:17.675Z

Confirmed a docstring accuracy issue: the claim at line 198-199 states "Cosine similarity over the concatenation is `(1-alpha)^2 cos(text,text') + alpha^2 cos(struct,struct')`". That expression is the **un-normalized dot product** of the two concatenations, not the cosine. True cosine divides by `‖c1‖·‖c2‖`; the stated formula equals cosine only when each concat has unit norm, which requires both blocks to be non-zero unit vectors (then `‖c‖² = (1-a)² + a²`, generally ≠ 1). When the struct block is all-zero (the graceful-fallback case), `‖c‖² = (1-a)²` and the divisor differs again. The *directional trade-off intent* is correct and the code is correct; only the docstring's "cosine =" equation is imprecise (it's proportional to cosine, exact only up to the per-vector norm factor). This is a P2 documentation accuracy nit — it does not affect leakage or the deploy-gate measurement (kNN ranking by cosine on the actual concatenated vectors is well-defined and monotone in alpha as intended).

I have completed the full adversarial review. Here is my verdict.

---

VERDICT: PASS

summary: The core leakage invariant — an engine's own dispatcher label can never enter its own structural feature — holds on every path I traced (histogram reads only neighbour labels via `engineToDisp.get(n)`, self-edges excluded twice at lines 95 and 138, zero-fallback yields an all-zero block not an own-label one-hot). The regex is linear (no catastrophic backtracking), the fusion math is correct, and all 21 tests pass. The one real silent-breakage risk is an integration contract mismatch with the sibling extractor `buildEngineDispatcherMap` (returns `Map<engine, Set<dispatcher>>`) versus this module's `Map<engine, string>` expectation — passing the Set-valued map silently produces all-zero features (no crash, no warning), which would make the deploy-gate read "no lift" rather than fail loud. That is a measurement-honesty hazard, not a fake-positive leak.

findings:
- [P1] `scripts/lib/node-stru
... [+4473 chars truncated]
