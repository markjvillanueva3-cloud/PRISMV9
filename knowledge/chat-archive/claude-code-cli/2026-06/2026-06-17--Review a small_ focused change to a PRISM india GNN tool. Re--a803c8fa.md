---
type: "chat-session"
source: "claude-code-cli"
session_id: "a803c8fa-8407-40f0-81d9-0a56f2031bb5"
title: "Review a small, focused change to a PRISM india GNN tool. Read both files; focus"
date: "2026-06-17"
first_ts: "2026-06-17T03:43:32.431Z"
last_ts: "2026-06-17T03:45:08.308Z"
cwd: "H:\\prism-slot-india"
messages: 21
user_msgs: 8
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-a614f351843844e51.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# Review a small, focused change to a PRISM india GNN tool. Read both files; focus

> **claude-code-cli** | 2026-06-17 | 21 msgs (8 user / 13 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-a614f351843844e51.jsonl`

## Transcript

### User | 2026-06-17T03:43:32.431Z

Review a small, focused change to a PRISM india GNN tool. Read both files; focus ONLY on the NEW idempotency delta (the prior extraction-broaden change in the same files was already reviewed + committed):
- H:/prism/scripts/vault-to-gnn-refpool.mjs  -- NEW exported pure fns `nodeContentEqual` + `mergeVaultGhosts` (just after `buildGhostFromVault`), and the `main()` `--apply` block now calls `mergeVaultGhosts` and SKIPS the graph write when `merge.changed === false`.
- H:/prism/scripts/vault-to-gnn-refpool.test.mjs  -- the new "nodeContentEqual" + "mergeVaultGhosts" describe blocks at the END.

CONTEXT: `--apply` merges high-confidence vault ghost nodes into the 542MB system-graph.json (the GNN reference pool). PROBLEM solved: the old loop always REPLACED existing nodes (re-stamping the volatile `proposed_at`) and ALWAYS wrote the 542MB graph -- so a durable periodic / post-regen re-apply would churn the graph AND the retrain drift fingerprint on every run (spurious GPU retrains). FIX: `mergeVaultGhosts` updates a node only when content differs (ignoring `proposed_at` via `nodeContentEqual`), edges are ADD-only, and returns `changed`; `--apply` skips the write when `!changed`.

CRITICAL checks (R12 -- this writes the live GNN graph):
1. DATA-LOSS: can the skip-write-when-unchanged ever skip a write that SHOULD have happened? i.e. is `changed` correctly true whenever any node/edge was actually added or updated? Trace `mergeVaultGhosts` add/update/edge accounting.
2. STALE-LABEL: does `nodeContentEqual` compare ALL the fields that can legitimately change for a given ghost id (proposed_wiring/confidence/info/reason/sourceMemory/label/kind)? `buildGhostFromVault` sets the node -- confirm no meaningful field is omitted such that a real dispatcher-label change would be missed (kept stale). The constant fields (layer/subgroup/status/size/tier/ghost/proposed_by) and the volatile `proposed_at` are intentionally excluded -- verify that's correct.
3. MUTATION: `mergeVaultGhosts
... [+431 chars truncated]

### Assistant | 2026-06-17T03:43:34.969Z

I'll review the new idempotency delta in both files. Let me start by reading them.

### Assistant | 2026-06-17T03:43:35.886Z

[tool_use: Read]

### Assistant | 2026-06-17T03:43:35.893Z

[tool_use: Read]

### User | 2026-06-17T03:43:38.514Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * vault-to-gnn-refpool.mjs -- feed the NN/GNN reference pool from CONFIRMED
4	 * vault wiring decisions (OBSIDIAN-AI-SYNERGY, slot:kilo 2026-06-09).
5	 *
6	 * THE GAP THIS CLOSES: nn-graph-eval.mjs buildHoldout() builds its leave-out
7	 * holdout from graph nodes where kind==="ghost.unwired-engine" AND
8	 * isValidDispatcher(proposed_wiring) AND confidence>=refMinCon
... [+21998 chars truncated]

### User | 2026-06-17T03:43:38.562Z

[tool_result] 1	// vault-to-gnn-refpool.test.mjs -- real-behavior tests for the vault->GNN
2	// reference-pool feeder. Asserts CONFIRMED-only extraction (speculative lines
3	// excluded), valid-dispatcher gating, conflict handling, and the ghost-node
4	// shape buildHoldout() consumes (kind/proposed_wiring/confidence>=0.8).
5	import { describe, it } from "node:test";
6	import assert from "node:assert/strict";
7
... [+14276 chars truncated]

### Assistant | 2026-06-17T03:43:41.738Z

I have both files fully read. Let me verify the dependencies the new code relies on, then trace each critical path. Let me check the graph-io contract (what `readGraphStreaming` returns) and `mcpToolToDispNodeId` to confirm edge-key consistency.

### Assistant | 2026-06-17T03:43:41.825Z

[tool_use: Read]

### User | 2026-06-17T03:43:43.128Z

[tool_result] 1	/**
2	 * scripts/lib/graph-io.mjs — streaming read+write for `system-graph.json`
3	 *
4	 * Bypasses V8's ~512MB max-string-length ceiling that crashes legacy
5	 * `JSON.parse(fs.readFileSync(p, "utf8"))` (read) and `JSON.stringify(G)`
6	 * (write) calls once the graph passes ~512MB serialized.
7	 *
8	 * Discovered: papa /loop 2026-05-23, U-PSN-VIZ-REGEN, on the 541MB graph.
9	 * Memory: `referen
... [+15898 chars truncated]

### Assistant | 2026-06-17T03:43:47.295Z

`readGraphStreaming` returns a fully materialized `{nodes:[...], edges:[...]}` object, so `mergeVaultGhosts(g, ghosts)` operating on `graph.nodes`/`graph.edges` arrays is correct. Now let me verify `mcpToolToDispNodeId` (used in `buildGhostFromVault` to construct the edge `to`, which feeds the edge-key) is deterministic and pure, since the edge-key dedup depends on it.

### Assistant | 2026-06-17T03:43:48.701Z

[tool_use: Grep]

### Assistant | 2026-06-17T03:43:49.810Z

[tool_use: Grep]

### User | 2026-06-17T03:43:50.085Z

[tool_result] No matches found

### User | 2026-06-17T03:43:50.837Z

[tool_result] 195:    proposed_at: new Date().toISOString(),
287:    byDispatcher[node.proposed_wiring] = (byDispatcher[node.proposed_wiring] || 0) + 1;

### Assistant | 2026-06-17T03:43:59.618Z

The first grep returned no content match for the exact string. Let me find the actual definition of `mcpToolToDispNodeId`.

### Assistant | 2026-06-17T03:44:04.472Z

[tool_use: Grep]

### User | 2026-06-17T03:44:05.812Z

[tool_result] 32:import { MCP_TOOL_TO_DISP_NODE_ID, mcpToolToDispNodeId } from "./lib/viz-dispatcher-node-id.mjs";
33-
34-const __dirname = path.dirname(fileURLToPath(import.meta.url));
35-const ROOT = path.resolve(__dirname, "..");
36-const ENGINES_DIR = path.join(ROOT, "mcp-server", "src", "engines");
37-const DISPATCHERS_DIR = path.join(ROOT, "mcp-server", "src", "tools", "dispatchers");
38-\ WIRE-NOTE (U-VI
... [+579 chars truncated]

### Assistant | 2026-06-17T03:44:08.629Z

`mcpToolToDispNodeId` is re-exported from `viz-dispatcher-node-id.mjs`. It's a pure deterministic mapping from dispatcher name to node id (same input → same output), so the edge `to` is stable across runs. Let me quickly confirm it's deterministic (no timestamp/randomness).

### Assistant | 2026-06-17T03:44:08.822Z

[tool_use: Read]

### User | 2026-06-17T03:44:09.745Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * viz-dispatcher-node-id.mjs — canonical MCP-tool-name → system-graph
4	 * dispatcher node-id resolver (SSOT for every ghost / bridge producer).
5	 *
6	 * BACKGROUND (the G4 dead-edge class, sierra):
7	 * The dispatcher INFERENCE rules + the per-kind bridge tables across PRISM all
8	 * speak the MCP *tool* name (`prism_calc`, `prism_safety`, …). But the merged
9	 * `
... [+3815 chars truncated]

### Assistant | 2026-06-17T03:45:08.308Z

`mcpToolToDispNodeId` is pure and deterministic (frozen table + lowercase fallback). The edge `to` for a given dispatcher is stable across runs, so the edge-key `${from}::${to}::${type}` is reproducible. Now let me trace each critical check rigorously.

## Critical analysis

### Check 1 — DATA-LOSS (can a needed write be skipped?)

`mergeVaultGhosts` (lines 268-284) accounts:
- **Add** (line 274-275): `!prior` → push node, `nodesAdded++`. ✓
- **Update** (line 276-278): `!nodeContentEqual(prior, node)` → replace, `nodesUpdated++`. ✓
- **Edge** (line 280-281): ADD-only by key, `edgesAdded++`. ✓
- `changed: nodesAdded + nodesUpdated + edgesAdded > 0` (line 283). ✓

Every code path that mutates the graph increments exactly one counter, and `changed` is the sum > 0. There is no path that adds/updates a node or adds an edge without incrementing. The skip-write at line 348 (`if (!merge.changed)`) therefore only triggers when literally nothing was mutated. **No data-loss path.**

One subtle correctness point worth confirming: when a node is content-equal but the edge is missing (test at line 242-249), the node branch does nothing (`nodesUpdated` stays 0) but the edge branch fires (`edgesAdded=1`) → `changed=true` → write happens. Correct — the durability invariant (a regen-viz wipe that removes the ghost nodes AND edges) is detected via either the node-re-add or the edge-re-add. ✓

### Check 2 — STALE-LABEL (does `nodeContentEqual` cover all mutable fields?)

`buildGhostFromVault` (lines 212-229) sets these node fields. Cross-referencing against `nodeContentEqual` (lines 249-258):

| Field | Set by buildGhost | Derived from | In nodeContentEqual? | Can change for same id? |
|---|---|---|---|---|
| `id` | `ghost.vault-wired.${w.engine}` | engine | (the merge key) | no (it IS the key) |
| `label` | `w.engine` | engine | ✓ | engine is in the id, so no — but harmless to include |
| `info` | dispatcher+conf+reason+src | all of them | ✓ | yes |
| `proposed_wiring` | `w.dispatcher
... [+8788 chars truncated]
