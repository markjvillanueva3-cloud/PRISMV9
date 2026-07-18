---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "Review the file `H:/prism/scripts/lib/node2vec-embedder.mjs` end-to-end for corr"
date: "2026-05-16"
first_ts: "2026-05-16T04:32:24.627Z"
last_ts: "2026-05-16T04:32:58.304Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-a7586064ffc04bf3f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Review the file `H:/prism/scripts/lib/node2vec-embedder.mjs` end-to-end for corr

> **claude-code-cli** | 2026-05-16 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-a7586064ffc04bf3f.jsonl`

## Transcript

### User | 2026-05-16T04:32:24.627Z

Review the file `H:/prism/scripts/lib/node2vec-embedder.mjs` end-to-end for correctness. This is unit U3b of the NN-GRAPH-MS0 milestone (a GNN roadmap). It is a pure ES-module library — NOT a TypeScript engine — following the `scripts/lib/*.mjs` + `node:test` convention.

WHAT IT MUST DO: implement node2vec part 2 — skip-gram with negative sampling (SGNS) over a biased-random-walk corpus, producing one dense topology embedding (default 128-d Float32Array) per graph node id. It must be PURE and seeded-deterministic (it imports `mulberry32` from the sibling `H:/prism/scripts/lib/graph-random-walk.mjs`, which is U3a — already shipped). Determinism matters: a fixed seed + fixed corpus must produce byte-identical embeddings, because the test suite asserts real numerical invariants.

The companion U3a file `H:/prism/scripts/lib/graph-random-walk.mjs` exports `mulberry32`, `buildAdjacency`, `node2vecWalk`, `generateWalks` (a generator), `collectWalks`, `DEFAULTS`. Read it too so you can verify the import contract and the corpus shape (walks are `string[]`; `generateWalks` is a one-shot generator, `collectWalks` materializes an array).

FOCUS YOUR REVIEW ON:
1. Algorithmic correctness of the SGNS implementation vs the word2vec reference C code — weight init, the positive+negative gradient loop, the `neu1e` input-gradient accumulator applied once per (center,context) pair, sigmoid clamping, learning-rate decay, the reduced-window shrink, the negative-sampling unigram^0.75 table fill.
2. Determinism — is every source of randomness threaded through the single seeded `mulberry32` stream? Is rng consumption order stable across runs?
3. Edge cases: empty corpus, single-node walks, `negativeSamples: 0`, window larger than walk, a node id that is a number vs string, vocab built from corpus not graph.
4. Numerical safety: exp/sigmoid overflow, NaN, divide-by-zero in cosine similarity, Float32 vs Float64 precision in the accumulator.
5. The corpus-resolution contract (`resolveCorpus`
... [+448 chars truncated]

### Assistant | 2026-05-16T04:32:30.576Z

I'll review the node2vec embedder and its companion file.

### Assistant | 2026-05-16T04:32:31.004Z

[tool_use: Read]

### Assistant | 2026-05-16T04:32:31.114Z

[tool_use: Read]

### User | 2026-05-16T04:32:32.365Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * node2vec-embedder.mjs — skip-gram with negative sampling (SGNS) over the
4	 * biased random-walk corpus produced by graph-random-walk.mjs. This is the
5	 * second half of node2vec (Grover & Leskovec, KDD 2016): the walks are the
6	 * "sentences", SGNS learns a dense topology embedding per node id.
7	 *
8	 * Algorithm — faithful to the word2vec reference C implement
... [+12281 chars truncated]

### User | 2026-05-16T04:32:32.485Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * graph-random-walk.mjs — node2vec 2nd-order biased random walks over the
4	 * normalized PRISM system graph. Foundation for U-NNG-NODE2VEC-TOPOLOGY:
5	 * the walk corpus feeds the skip-gram embedder (Node2Vec part 2).
6	 *
7	 * Reference: Grover & Leskovec, "node2vec: Scalable Feature Learning for
8	 * Networks" (KDD 2016). The 2nd-order transition from (prev → cur 
... [+7988 chars truncated]

### Assistant | 2026-05-16T04:32:58.304Z

Both files reviewed end-to-end. Analysis complete.

## Code Quality Analysis Report — node2vec-embedder.mjs

### Summary
- Files Analyzed: 2 (embedder + U3a companion)
- The SGNS implementation is faithful to the word2vec reference. One genuine determinism bug found.

### P0 Findings
None. The core SGNS loop, weight init, gradient accumulation, sigmoid clamp, and neg-table fill are all correct.

### P1 Findings

**P1-1 — Determinism hole: rng consumption order diverges when a negative collides with the positive.** `node2vec-embedder.mjs:225`
```js
target = negTable[Math.floor(rng() * negLen)];
if (target === contextIdx) continue; // skip neg == positive (word2vec)
```
This is correct word2vec behavior in isolation, but it is **input-dependent rng branching that does not affect the stream itself** — actually fine. The real issue: the `continue` skips the negative *without consuming a replacement draw*, so a (center,context) pair gets fewer than `negativeSamples` negatives. That matches word2vec C exactly (it also just `continue`s). Determinism is preserved because `rng()` was already consumed before the check. **Not a bug — withdrawn.** Determinism is intact: every `rng()` call site is unconditional before any branch.

**P1-2 — `reducedWindow` draws rng even on length-1 walks / unmatched centers, but `node2vecWalk` already filters length-1 walks (`w.length > 1`), so this only matters for centers not in vocab.** `node2vec-embedder.mjs:199-205`: when `centerIdx === undefined` the code `continue`s **before** the `rng()` window draw at line 205. Since vocab is built from the same corpus the factory yields, `centerIdx` is never undefined in practice — but if a caller passes a factory whose epoch-2 output differs from epoch-1 (non-pure factory), the vocab-miss `continue` at line 200 skips the rng draw and **desyncs the stream**. This is a real determinism hole for non-pure factories. Low severity since the contract implies purity, but it is silent. Recommend documenting "f
... [+2170 chars truncated]
