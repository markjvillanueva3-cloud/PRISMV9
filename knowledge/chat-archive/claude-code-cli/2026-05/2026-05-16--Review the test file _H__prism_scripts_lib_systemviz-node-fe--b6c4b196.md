---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "Review the test file `H:/prism/scripts/lib/systemviz-node-feature-projector.test"
date: "2026-05-16"
first_ts: "2026-05-16T04:53:59.477Z"
last_ts: "2026-05-16T04:54:29.710Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-abd73f7620f55858c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Review the test file `H:/prism/scripts/lib/systemviz-node-feature-projector.test

> **claude-code-cli** | 2026-05-16 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-abd73f7620f55858c.jsonl`

## Transcript

### User | 2026-05-16T04:53:59.477Z

Review the test file `H:/prism/scripts/lib/systemviz-node-feature-projector.test.mjs` end-to-end for test quality. It is the `node:test` suite for unit U3c of NN-GRAPH-MS0 — a pure library that projects a PRISM system-viz graph node into a fixed 8-d numeric feature vector for a GraphSAGE GNN. The file under test is `H:/prism/scripts/lib/systemviz-node-feature-projector.mjs` — read it too. The suite passes 30/30 in ~0.1s.

PRISM test doctrine (CLAUDE.md R9): "Tests verify intent, not behavior. Every test encodes WHY the behavior matters. A test that can't fail when the business logic changes is worthless. `toBeDefined()`-style stubs are rejected."

FOCUS:
1. **Real invariants vs stubs** — does each test pin down correct behavior? The three load-bearing tests are: (a) the [0,1]-bound invariant over an adversarial graph (a node with svi=5, coverage=-1, complexity=-3, tier=99, an unknown layer, plus a bare node); (b) the fit/transform discipline test — projecting graph B with stats fitted on graph A must differ from fitting on B itself; (c) the P99-outlier-resistance test. Are these genuinely falsifiable? Would (c) actually fail if the code used `max` instead of P99? Would (b) fail if `opts.stats` were ignored?
2. **Coverage gaps** — every export of the .mjs (`parseLayerOrdinal`, `statusScore`, `roiScore`, `computeFeatureStats`, `projectNodeFeatures`, `projectGraphFeatures`, plus the constants) — is each tested, and meaningfully? Is the new `throws on out-of-range percentile` behavior covered? Are `missingAwareness`/`missingBusinessValue` counters covered?
3. **Assertion strength** — note: one assertion was just changed from `assert.equal(f[0], 6/15)` to a `Math.abs(...) < 1e-6` tolerance because `f[0]` is read from a `Float32Array` (6/15 rounds to the nearest Float32). Confirm that was the correct call (a Float32 storage contract, not assertion-weakening) and that no OTHER exact-equality assertion in the file has the same latent Float32-precision bug.
4. **Off-by-one i
... [+533 chars truncated]

### Assistant | 2026-05-16T04:54:04.259Z

I'll read both files and conduct a thorough test quality review.

### Assistant | 2026-05-16T04:54:04.423Z

[tool_use: Read]

### Assistant | 2026-05-16T04:54:04.457Z

[tool_use: Read]

### User | 2026-05-16T04:54:06.603Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * systemviz-node-feature-projector.mjs — projects a PRISM system-viz graph
4	 * node into a fixed 8-dimensional numeric feature vector. Unit U3c of
5	 * NN-GRAPH-MS0 (U-NNG-NODE2VEC-TOPOLOGY).
6	 *
7	 * Where this fits: U3a generates biased random walks, U3b learns a *topology*
8	 * embedding from those walks (structural identity). U3c is the complement —
9	 * a node
... [+10185 chars truncated]

### User | 2026-05-16T04:54:06.859Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * systemviz-node-feature-projector.test.mjs — node:test suite for U3c of
4	 * NN-GRAPH-MS0.
5	 *
6	 * Load-bearing invariants:
7	 *  - every one of the 8 features, for every node (including adversarial /
8	 *    out-of-range input), lands in [0,1] — a GNN input contract;
9	 *  - fit/transform is honest: normalizing graph B with stats fitted on graph
10	 *    A genuin
... [+14566 chars truncated]

### Assistant | 2026-05-16T04:54:29.710Z

I'll conduct a thorough review of test quality per PRISM R9 and the focus areas you specified.

## Review Analysis

**1. Real Invariants vs Stubs**

✅ **PASS (a) [0,1]-bound invariant** — Line 232–244 is load-bearing. The `variedGraph` contains adversarial inputs: `tier: 99`, `svi: 5`, `coverage: -1`, `complexity: -3`, `layer: "weird"`, and a bare node `{}`. The test assertion (line 238–241) checks **every feature of every node** stays in `[0, 1]` and is finite. This WILL fail if `clamp01()` is removed or if `safeNum()` is gutted. Falsifiable.

✅ **PASS (b) fit/transform discipline** — Lines 284–301. Graph A (1..100 complexities → P99=99) vs Graph B (single node, complexity=50). The test asserts:
- `fitOnB` saturates near 1.0 (50 IS B's P99)
- `fitOnA` stays <0.95 (50 is below A's P99=99)
- `fitOnA !== fitOnB` (opts.stats must change projection)

This WILL fail if `opts.stats` parameter is ignored in line 214. Falsifiable and correctly tight.

✅ **PASS (c) P99-outlier-resistance** — Lines 303–322. Builds 99 nodes (complexities 1..99) + one outlier (1,000,000). Asserts:
- `stats.complexityScale === log1p(99)` (line 311) — the P99 is 99, not 1M
- Mid-node (complexity 50) feature stays >0.5 (line 317)
- Mid-node feature > 2× max-scaled equivalent (line 318)
- Outlier clamps at 1.0 (line 321)

This WILL fail if the code switches to `max()` instead of P99 percentile. Falsifiable.

---

**2. Coverage Gaps**

✅ All 7 exports tested:
- `parseLayerOrdinal` — 71–92 (known layers, fallback parsing, garbage, bounds)
- `statusScore` — 95–113 (built/wired/unwired/needs-wiring/ghost/planned/stub/null)
- `roiScore` — 115–128 (high/medium/med/low/bogus/null)
- `computeFeatureStats` — 130–166 (empty graph, percentile default, RangeError on 1.5/0/-0.1/NaN, missing-field counts, P99 arithmetic)
- `projectNodeFeatures` — 169–216 (Float32Array type, null input, feature indexing, missing fields, out-of-range clamping)
- `projectGraphFeatures` — 247–281 (Map return type, id-skipping, dupli
... [+3645 chars truncated]
