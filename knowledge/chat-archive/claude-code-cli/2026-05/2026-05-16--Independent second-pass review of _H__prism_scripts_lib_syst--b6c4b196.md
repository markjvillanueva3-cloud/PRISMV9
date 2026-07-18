---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "Independent second-pass review of `H:/prism/scripts/lib/systemviz-node-feature-p"
date: "2026-05-16"
first_ts: "2026-05-16T04:54:13.147Z"
last_ts: "2026-05-16T04:55:16.262Z"
cwd: "H:\\prism"
messages: 17
user_msgs: 7
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-af6255b011e06efb4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Independent second-pass review of `H:/prism/scripts/lib/systemviz-node-feature-p

> **claude-code-cli** | 2026-05-16 | 17 msgs (7 user / 10 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-af6255b011e06efb4.jsonl`

## Transcript

### User | 2026-05-16T04:54:13.147Z

Independent second-pass review of `H:/prism/scripts/lib/systemviz-node-feature-projector.test.mjs` (unit U3c of NN-GRAPH-MS0). The file under test, `H:/prism/scripts/lib/systemviz-node-feature-projector.mjs`, projects a system-viz graph node into a fixed 8-d feature vector for a GraphSAGE GNN. The suite passes 30/30. Read both files.

Another reviewer is checking invariant strength / coverage. YOU are weighted toward what they may miss:

1. **Fixture realism** — the `node()` helper and the `variedGraph` fixture: do they match the REAL node schema in `state/shared/system-viz/system-graph-normalized.json` (schemaVersion 2.29.0): `{id, layer, subgroup, label, info, status, size, tier, awareness:{svi,testCount,complexity,coverage,actionCount,registryEntries}, businessValue:{tags,roi,rationale}}`? A test fixture that does not resemble production data can pass while the projector breaks on real input.
2. **The `node()` spread-override footgun** — `node(over)` does `{ ...base, ...over }`. If a test passes `over = { awareness: {complexity: c} }` the ENTIRE base `awareness` object is replaced, not merged — so `svi`, `coverage` etc. silently vanish. Several tests do exactly this (the P99 test, the fit test). Is that intended and harmless here, or does it mean those tests are accidentally exercising the missing-field path instead of what they intend? Trace it.
3. **Math the tests hard-code** — `6/15` for layer L5, `3/5` for tier, `log1p(99)` for the P99 scale, `Math.log1p(50)/Math.log1p(1_000_000)` for the max-scaling comparison. Independently recompute each and confirm. Especially: in the P99-resistance test, the fixture is 99 nodes (complexity 1..99) + 1 outlier = 100 nodes; nearest-rank P99 of 100 values — is the 99th sorted value really what the code's `percentileValue` returns? Verify against the .mjs `percentileValue` implementation.
4. **Convention conformance** — compare structure/imports against the sibling `H:/prism/scripts/lib/node2vec-embedder.test.mjs` and `graph-
... [+418 chars truncated]

### Assistant | 2026-05-16T04:54:18.487Z

I'll review both files.

### Assistant | 2026-05-16T04:54:19.349Z

[tool_use: Read]

### Assistant | 2026-05-16T04:54:19.733Z

[tool_use: Read]

### User | 2026-05-16T04:54:20.100Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\systemviz-node-feature-projector.mjs' was already read 15s ago in this session and is unchanged (mtime 1778906968313). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CA
... [+6 chars truncated]

### Assistant | 2026-05-16T04:54:20.197Z

[tool_use: Read]

### User | 2026-05-16T04:54:20.352Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\systemviz-node-feature-projector.test.mjs' was already read 15s ago in this session and is unchanged (mtime 1778907183995). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_RE
... [+11 chars truncated]

### Assistant | 2026-05-16T04:54:20.397Z

[tool_use: Read]

### User | 2026-05-16T04:54:21.055Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\graph-random-walk.test.mjs' was already read 15m ago in this session and is unchanged (mtime 1778904704715). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-16T04:54:21.897Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * node2vec-embedder.test.mjs — node:test suite for U3b of NN-GRAPH-MS0.
4	 *
5	 * The load-bearing test is the community-separation invariant: node2vec's
6	 * defining property is that nodes in the same graph community embed closer
7	 * (cosine) than nodes across communities. That is asserted on a real 2-clique
8	 * graph fed through the U3a walk generator — a falsif
... [+17835 chars truncated]

### Assistant | 2026-05-16T04:54:24.928Z

The cache guard says both projector files were read 15s ago, but I don't have them in my visible context. Let me re-read them.

### Assistant | 2026-05-16T04:54:26.287Z

[tool_use: Bash]

### User | 2026-05-16T04:54:35.694Z

[tool_result] ---PROJECTOR MJS---
#!/usr/bin/env node
/**
 * systemviz-node-feature-projector.mjs — projects a PRISM system-viz graph
 * node into a fixed 8-dimensional numeric feature vector. Unit U3c of
 * NN-GRAPH-MS0 (U-NNG-NODE2VEC-TOPOLOGY).
 *
 * Where this fits: U3a generates biased random walks, U3b learns a *topology*
 * embedding from those walks (structural identity). U3c is the complement —
 * a no
... [+23207 chars truncated]

### Assistant | 2026-05-16T04:54:37.891Z

Both files read. Now verifying the math and tracing the footguns.

### Assistant | 2026-05-16T04:54:44.659Z

[tool_use: Bash]

### User | 2026-05-16T04:54:50.974Z

[tool_result] L5 6/15: 0.4 Float32: 0.4000000059604645
L4a 5/15: 0.3333333333333333
tier 3/5: 0.6
n=100 rank: 99 idx: 98 value: 99
outlier graph n=100 idx: 98 value: 99
fitOnA f[4]: 0.8537850880489681
mid n50: 0.8537850880489681 maxScaled: 0.2845950087499927
mid > maxScaled*2: true
default-stats complexity10: 1

### Assistant | 2026-05-16T04:55:16.262Z

All hardcoded math confirmed correct. Now tracing the spread-override footgun.

The `node()` helper does `{...base, ...over}`. The P99 test passes `over = { awareness: { complexity: c } }` — this **replaces the entire base `awareness`**, so `svi`, `coverage`, `actionCount`, `testCount`, `registryEntries` all vanish. But that test only reads `complexityScale`, which `computeFeatureStats` derives solely from `a.complexity`. The vanished fields are irrelevant — **harmless, but accidentally exercising the missing-field path** for those fields.

The "places each feature at its index" test (line ~199) passes an explicit `awareness: { svi: 0.8, coverage: 0.5, complexity: 10, actionCount: 4 }` — `testCount`/`registryEntries` drop, but those aren't projected features at all. Harmless. The fit/transform test: same — only `complexity` read. The clamp test passes `awareness: {svi:5, coverage:-1, complexity:-3, actionCount:2}` — `actionCount:2` present, fine. All traced: the footgun exists but no test silently passes a wrong assertion because of it.

---

## Review findings

**Fixture realism** — `node()` matches schema 2.29.0 exactly: `id, layer, subgroup, label, status, size, tier, awareness:{svi,testCount,complexity,coverage,actionCount,registryEntries}, businessValue:{tags,roi,rationale}`. Only `info` is absent — projector never reads it. `variedGraph` covers L0/Lgit/L8 + garbage layers, full tier range, all status/roi classes, a bare node. Realistic and adversarial.

**P3 — spread-override footgun (`node()`, line ~31; tests ~159, ~199, ~242, ~256).** `node(over)` shallow-merges, so any `over.awareness` blows away the base `awareness`. Confirmed harmless for all five call sites (each test reads only the field it overrides), but it is a latent trap: a future test that overrides `awareness: {complexity:X}` and then asserts on `f[2]` (svi) would silently get `0` instead of `0.875` and could be written to "pass" against the wrong value. Recommend a `nodeWith({awareness})` deep-m
... [+1975 chars truncated]
