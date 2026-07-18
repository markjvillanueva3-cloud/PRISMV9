---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "You are reviewing a newly-written file for the PRISM project: `H:/prism/scripts/"
date: "2026-05-16"
first_ts: "2026-05-16T18:33:06.845Z"
last_ts: "2026-05-16T18:34:13.510Z"
cwd: "H:\\prism"
messages: 16
user_msgs: 6
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-a466f17b75b44eef7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# You are reviewing a newly-written file for the PRISM project: `H:/prism/scripts/

> **claude-code-cli** | 2026-05-16 | 16 msgs (6 user / 10 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-a466f17b75b44eef7.jsonl`

## Transcript

### User | 2026-05-16T18:33:06.845Z

You are reviewing a newly-written file for the PRISM project: `H:/prism/scripts/seed-ghost-gnn-classify.mjs`.

CONTEXT — this is unit U6 (U-NNG-INFERENCE-FIFTH-TIER) of milestone NN-GRAPH-MS0 ("Hybrid neural-symbolic GNN — GraphSAGE link-prediction over system-viz"). It is a NEW standalone Node ESM script (no TypeScript). Its job: add a 5th tier to an existing 4-tier wiring-inference cascade (keyword → expanded-keyword → sibling-prefix → LLM). For each UNKNOWN `ghost.unwired-engine` node in the 377k-node system-viz graph, it predicts which dispatcher the engine should wire to, using a GraphSAGE-embedding k-NN label-propagation method:
  1. Load a trained checkpoint (graceful skip if absent — the expected pre-U7 state).
  2. Reference set = ghost engines whose `proposed_wiring` is a valid `prism_*` dispatcher and whose `confidence >= refMinConf` (the cascade's own high-confidence output).
  3. Embed an edgeless subgraph of {targets ∪ references} via the U5 predictor's `embedGraph`.
  4. For each target, score the link to every reference via `scoreLink`, take top-K, confidence-weighted vote; winning vote share = prediction confidence (capped).

DESIGN INVARIANTS that MUST hold (flag any violation as P0):
  - Hybrid is the floor: a missing checkpoint OR `PRISM_NNG_DISABLE=1` must make this a pure no-op (`skipped:true`), so the LLM tier handles every engine exactly as before.
  - No leakage: a target must never vote on itself; the subgraph is edgeless on purpose (unwired engines are graph-isolated; embedding their proposed-wire neighbourhood would feed the cascade's own guesses back in).
  - Determinism: same graph + checkpoint must yield identical output (sort tie-breaks must be total).
  - It composes the U5 predictor (`loadPredictor`, `embedGraph`, `scoreLink` from `./lib/graphsage-predictor.mjs`) — it must NOT reimplement GraphSAGE.

The U5 predictor API (verified): `loadPredictor(jsonStringOrObj)` → `{model, calibrator, metadata}`; `embedGraph(model, graph, {maxNod
... [+1030 chars truncated]

### Assistant | 2026-05-16T18:33:13.362Z

I'll review the file end-to-end.

### Assistant | 2026-05-16T18:33:13.743Z

[tool_use: Read]

### User | 2026-05-16T18:33:14.526Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * seed-ghost-gnn-classify.mjs — NN-GRAPH-MS0 / U-NNG-INFERENCE-FIFTH-TIER (U6)
4	 *
5	 * The 5th tier of the wiring-inference cascade. The first four tiers —
6	 * keyword -> expanded-keyword -> sibling-prefix -> LLM (seed-ghost-llm-classify)
7	 * — classify UNKNOWN ghost.unwired-engine nodes into a dispatcher. This tier
8	 * adds a GraphSAGE-derived classifier and ru
... [+21044 chars truncated]

### Assistant | 2026-05-16T18:33:17.210Z

I've read the entire file. Let me also verify the U5 predictor API to confirm the composition contract.

### Assistant | 2026-05-16T18:33:17.648Z

[tool_use: Read]

### User | 2026-05-16T18:33:18.110Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\graphsage-predictor.mjs' was already read 13m ago in this session and is unchanged (mtime 1778939956222). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-16T18:33:20.792Z

The predictor API is already in context. Let me verify a couple of specific behaviors of `embedGraph` and `scoreLink` that the review hinges on.

### Assistant | 2026-05-16T18:33:22.015Z

[tool_use: Grep]

### User | 2026-05-16T18:33:22.620Z

[tool_result] 56:export function loadPredictor(input) {
57-  const { model, calibrator, metadata } = loadCheckpoint(input);
58-  return { model, calibrator: calibrator ?? null, metadata: metadata ?? null };
59-}
60-
61-/** Breakpoints of a bundled calibrator, or null when there is no usable one. */
62-function calibratorBreakpoints(calibrator) {
63-  if (calibrator && Array.isArray(calibrator.breakpoints) && ca
... [+3663 chars truncated]

### Assistant | 2026-05-16T18:33:25.186Z

I have everything needed. Let me check one critical thing — how `normalizeGraph` handles a subgraph with `edges: []` and whether `projectGraphFeatures` reads node features the ghost nodes carry.

### Assistant | 2026-05-16T18:33:26.289Z

[tool_use: Grep]

### User | 2026-05-16T18:33:26.950Z

[tool_result] No matches found

### Assistant | 2026-05-16T18:33:29.649Z

[tool_use: Grep]

### User | 2026-05-16T18:33:30.292Z

[tool_result] scripts\lib\edge-typology-normalizer.test.mjs:13:  normalizeGraph,
scripts\lib\edge-typology-normalizer.test.mjs:100:describe("normalizeGraph", () => {
scripts\lib\edge-typology-normalizer.test.mjs:102:    assert.throws(() => normalizeGraph(null));
scripts\lib\edge-typology-normalizer.test.mjs:103:    assert.throws(() => normalizeGraph(undefined));
scripts\lib\edge-typology-normalizer.test.mjs:104
... [+1433 chars truncated]

### Assistant | 2026-05-16T18:34:13.510Z

I have enough to complete the review. The internal `normalizeGraph` used by `embedGraph` lives in the predictor module and accepts `{nodes, edges}` with an empty edges array (the test confirms edgeless graphs normalize fine). My findings follow.

---

## Code Quality Analysis Report — `H:/prism/scripts/seed-ghost-gnn-classify.mjs`

### Summary
- Files Analyzed: 1 (with U5 predictor API cross-checked)
- Overall: well-structured, the design invariants are mostly honored. Two real defects found — one P0, one P1.

---

### P0 — Self-vote leakage when target labels are non-unique / not in the UNKNOWN set

**File:** `H:/prism/scripts/seed-ghost-gnn-classify.mjs:140-155` (`partitionGhosts`) interacting with `:184-202` (`voteDispatcher`)

The "no leakage" invariant ("a target must never vote on itself") is enforced in two places, and there is a gap between them.

`partitionGhosts` excludes references by **`targetIds`** (node `id`):
```js
const targetIds = new Set();
for (const n of ghosts) {
  if (isTarget(n)) { targets.push(n); targetIds.add(n.id); }
}
...
if (targetIds.has(n.id)) continue; // never let a target vote on itself
```
`voteDispatcher` independently re-excludes by **`id`**:
```js
if (!ref || ref.id === target.id) continue;
```

Both guards key on `id` — good. **But the actual leakage vector is `targetNames`, which is a `Set` of `label`s, not ids.** In `gnnClassifyUnknowns` (`:337`), the target set is built from `unknowns[].name`. The `isTarget` predicate (`:140-142`) then matches any ghost whose **`label`** is in that set.

Consider a UNKNOWN target ghost with `label = "FooEngine"` and a **second** ghost node, distinct `id`, also `label = "FooEngine"` (graph node ids and labels are independent in system-viz — duplicate labels across `ghost.unwired-engine` nodes are not prohibited anywhere), whose `proposed_wiring` is a valid dispatcher at high confidence. That second node:
- has a different `id`, so `targetIds.has(n.id)` is **false** → it is admitted to `refere
... [+5337 chars truncated]
