---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "Review `H:/prism/scripts/lib/graphsage-model.test.mjs` end-to-end for test quali"
date: "2026-05-16"
first_ts: "2026-05-16T05:25:51.630Z"
last_ts: "2026-05-16T05:26:15.476Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-a7ad0c6c1feee44fe.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Review `H:/prism/scripts/lib/graphsage-model.test.mjs` end-to-end for test quali

> **claude-code-cli** | 2026-05-16 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-a7ad0c6c1feee44fe.jsonl`

## Transcript

### User | 2026-05-16T05:25:51.630Z

Review `H:/prism/scripts/lib/graphsage-model.test.mjs` end-to-end for test quality. It is the `node:test` suite for the forward-pass half of U4 (U-NNG-GRAPHSAGE-TRAIN) of NN-GRAPH-MS0 — a 2-layer GraphSAGE GNN forward pass. The file under test is `H:/prism/scripts/lib/graphsage-model.mjs` — read it too. The suite passes 29/29.

PRISM test doctrine (CLAUDE.md R9): tests verify intent, not behavior; every test must be able to FAIL when the logic breaks; no stubs.

FOCUS:
1. **The hand-computed forward tests** — `describe("forward — hand-computed math")`. These build a model with KNOWN weight matrices (`handModel`) and assert exact outputs. Independently verify the arithmetic:
   - "select-self" test: W rows `[1,0,0,0]`/`[0,1,0,0]` → `pre = concat[0..1] = self features`. Node x feat `[3,4]` → ReLU → norm 5 → h1 `[0.6,0.8]` → layer 2 same → z `[0.6,0.8]`. Is this correct? Does the test correctly assert z_x ignores the neighbour?
   - "select-aggregator" test: W0 rows `[0,0,1,0]`/`[0,0,0,1]` → `pre = concat[2..3] = aggregated mean`. Node b with neighbours a=`[1,0]`, c=`[3,0]` → mean `[2,0]` → ReLU → norm 2 → h1_b `[1,0]`. Correct?
   - the no-neighbour test.
   Are these genuinely falsifiable — would they fail if matVec, the concat layout, ReLU, or L2-norm were wrong?
2. **Invariant tests on random models** — L2-norm unit invariant, determinism, structural equivariance (two identical nodes embed identically). Is the equivariance test real — would it fail if the GNN leaked node identity? Is the L2-norm test's `||z||≈1 OR ==0` disjunction honest or a loophole?
3. **Coverage** — every export (`sigmoid`, `dot`, `glorotLimit`, `createModel`, `forward`, `linkScore`, `MODEL_DEFAULTS`/`DEFAULTS`). Are the validation throws covered (wrong-length feature, non-finite feature, non-2-layer model)? Is the cache structure tested? Is the cache-decoupling fix (private feature copies) tested? Is the in-batch neighbour filtering tested?
4. **Assertion strength** — exact vs tolerance. The h
... [+460 chars truncated]

### Assistant | 2026-05-16T05:25:56.004Z

I'll review the GraphSAGE test suite against PRISM's R9 doctrine: tests must verify intent and be falsifiable.

### Assistant | 2026-05-16T05:25:56.278Z

[tool_use: Read]

### Assistant | 2026-05-16T05:25:56.289Z

[tool_use: Read]

### User | 2026-05-16T05:25:57.426Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * graphsage-model.test.mjs — node:test suite for the forward-pass half of
4	 * U4 (U-NNG-GRAPHSAGE-TRAIN) of NN-GRAPH-MS0.
5	 *
6	 * Load-bearing tests:
7	 *  - hand-computed forward passes with KNOWN weight matrices (select-self and
8	 *    select-aggregator) — verify the GraphSAGE math exactly, not just shapes;
9	 *  - the L2-normalization invariant (every embeddin
... [+13393 chars truncated]

### User | 2026-05-16T05:25:57.493Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * graphsage-model.mjs — GraphSAGE forward pass + model construction.
4	 * The model half of unit U-NNG-GRAPHSAGE-TRAIN (U4) of NN-GRAPH-MS0; the
5	 * training half (backprop + loss + negative sampling) lives in the sibling
6	 * graphsage-trainer.mjs, and U5's link predictor consumes this forward pass
7	 * directly with frozen weights.
8	 *
9	 * Architecture — 2-layer
... [+11359 chars truncated]

### Assistant | 2026-05-16T05:26:15.476Z

I'll verify the hand-computed forward tests against the source code logic.

**Hand-computed test 1 ("select-self"):**
- W0 = `[1,0,0,0, 0,1,0,0]` (2 rows × 4 cols): rows select indices [0,1] of the 4-wide concat.
- concat layout per line 150-152: `[self[0], self[1], agg[0], agg[1]]`
- So W0 rows select the self half. ✓
- Node x with features `[3,4]`, neighbour y with `[10,10]`.
- Layer 1: pre = W0 · [3,4,mean([10,10])] = W0 · [3,4,10,10] = `[3,4]` (self only)
- ReLU: `[3,4]` → norm √(9+16) = 5 → h1 = `[0.6,0.8]` ✓
- Layer 2 uses same W, h1 as input, neighbours' h1 same → same math → z = `[0.6,0.8]` ✓
- **Test is falsifiable:** wrong matVec, wrong concat layout, wrong ReLU, or wrong L2-norm code would fail it.

**Hand-computed test 2 ("select-aggregator"):**
- W0 = `[0,0,1,0, 0,0,0,1]`: rows select indices [2,3] = the aggregated half of concat.
- Node b, neighbours a=`[1,0]`, c=`[3,0]`.
- Layer 1: agg = mean([1,0], [3,0]) = `[2,0]`, concat = `[9,9,2,0]` (b's features are ignored per line 149), pre = W0 · concat = `[2,0]`.
- ReLU: `[2,0]` → norm 2 → h1_b = `[1,0]` ✓
- Test assertion at line 154 checks exact `[1,0]` with 1e-9 tolerance. **Falsifiable.**

**Hand-computed test 3 (no neighbours):**
- Node "lone" with no neighbours: agg = zero vector (line 137-146 initializes agg to zero, deg stays 0, agg stays zero). ✓
- pre = W0 · [5,7,0,0] = `[0,0]` (select-aggregator), ReLU `[0,0]`, norm 0.
- Line 163: normInv = 0 when norm ≤ NORM_EPS (line 163), h = `[0,0]`. ✓
- **Falsifiable:** wrong zero handling or divide-by-zero would fail.

**Equivariance test (line 210–224):**
- Constructs two isomorphic subgraphs: (p, pn) and (q, qn) with identical features and structure.
- Asserts `embeddings.get("p") === embeddings.get("q")` via `deepEqual` (exact equality).
- **Falsifiable:** if node IDs leaked into the computation (e.g., hash seeding or ordering), embeddings would differ. ✓

**L2-norm invariant (line 190–198):**
- Assert `norm(z) ≈ 1` OR `norm(z) == 0` with tolerance 1e-9.

... [+2080 chars truncated]
