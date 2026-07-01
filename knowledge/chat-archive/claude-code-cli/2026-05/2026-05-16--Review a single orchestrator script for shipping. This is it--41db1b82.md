---
type: "chat-session"
source: "claude-code-cli"
session_id: "41db1b82-95ec-4f76-bff8-293146973f7e"
title: "Review a single orchestrator script for shipping. This is iter 6 of a /loop. Con"
date: "2026-05-16"
first_ts: "2026-05-16T03:17:03.537Z"
last_ts: "2026-05-16T03:18:17.338Z"
cwd: "H:\\prism"
messages: 17
user_msgs: 6
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/41db1b82-95ec-4f76-bff8-293146973f7e/subagents/agent-a2e95897a3f33028a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Review a single orchestrator script for shipping. This is iter 6 of a /loop. Con

> **claude-code-cli** | 2026-05-16 | 17 msgs (6 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/41db1b82-95ec-4f76-bff8-293146973f7e/subagents/agent-a2e95897a3f33028a.jsonl`

## Transcript

### User | 2026-05-16T03:17:03.537Z

Review a single orchestrator script for shipping. This is iter 6 of a /loop. Context budget is constrained so this is a focused single-arm review (the embedding LIBRARY it composes — tribal-graph-embedding.mjs — already passed a full 3-round 2-arm scrutiny gate at commit 862137931; this orchestrator is glue over it).

**File:** `H:\prism\scripts\tribal-graph-course-embed.mjs` (~165 LOC)

**What it does:** Loads syllabus-level course nodes from `state/shared/tribal-graph/course-tribal-nodes.json`, embeds each via `embedClusters()` from tribal-graph-embedding.mjs (Ollama nomic-embed-text 768d, checkpointed), builds course↔course lateral wires via `buildLateralWires()` (cosine ≥0.75, max 8/node), writes embedding refs + lateralWires back to the sidecar, and emits `course-semantic-similarity` edges into `state/shared/system-viz/system-graph.json` (dedup by from\x1fto\x1fkind).

**Production run already done successfully:** 192/192 embedded, 0 failures, 618 wires (weights 0.750–0.997), 186 nodes wired, checkpoint persisted (192 vectors). So the happy path works.

**Review focus — the orchestrator's OWN logic only:**
- `courseEmbedText` determinism (re-runs must hit the embedding checkpoint, not re-call Ollama — is the text byte-identical across runs? sorted tags? sliced description deterministic?)
- Edge dedup correctness: `from\x1fto\x1fkind` key — buildLateralWires already emits fromId<toId canonical, so is dedup against an existing graph correct? Any double-emit risk on re-run?
- Sidecar write: `updatedNodes` maps ALL sidecar nodes, only mutating embedded ones — does it preserve the 17 non-syllabus + 6 unwired nodes untouched?
- Atomic write tmp+rename + unlink-on-fail — correct?
- `--dry-run` truly side-effect-free? (checkpointPath set to null on dry-run — confirm no sidecar/graph write)
- bidirectional lateralWires: each wire pushed to BOTH from and to node's list — correct for an undirected semantic relation? any duplicate-within-node-list risk?
- Failure handling:
... [+329 chars truncated]

### Assistant | 2026-05-16T03:17:08.896Z

I'll review the orchestrator script. Let me read it and its key dependency.

### Assistant | 2026-05-16T03:17:09.112Z

[tool_use: Read]

### User | 2026-05-16T03:17:09.882Z

[tool_result] 1	#!/usr/bin/env node
2	// tribal-graph-course-embed.mjs
3	// Iter 6: Ollama nomic-embed-text pass over the syllabus-level course nodes,
4	// then buildLateralWires (cosine) to emit course↔course semantic-similarity
5	// edges into system-graph.json. Completes the graph-of-graphs lateral layer.
6	//
7	// Composes tribal-graph-embedding.mjs (commit 862137931) — no fork.
8	//
9	// Usage:
10	//   nod
... [+7441 chars truncated]

### Assistant | 2026-05-16T03:17:12.434Z

Now let me check the key contract points in the embedding library it composes.

### Assistant | 2026-05-16T03:17:14.509Z

[tool_use: Grep]

### User | 2026-05-16T03:17:15.354Z

[tool_result] 7:// failures return { ok: false, error, partial: [...] } — we do NOT silently
71:export function cosineSimilarity(a, b) {
128: * Returns: array of { fromId, toId, weight, type: "semantic-similarity" } sorted by id-pair.
129: * Each unordered pair appears once — fromId < toId lexicographically.
131:export function buildLateralWires(clusters, vectors, threshold = LATERAL_WIRE_THRESHOLD_DEFAULT, opt
... [+2262 chars truncated]

### Assistant | 2026-05-16T03:17:17.643Z

Let me verify the embedClusters `ok` semantics and how partial/failure interacts with the checkpoint.

### Assistant | 2026-05-16T03:17:18.462Z

[tool_use: Read]

### User | 2026-05-16T03:17:19.189Z

[tool_result] 620	// ──────────────────────────────────────────────────────────────────────────
621	
622	/**
623	 * Embed cluster nodes (output of aggregateLevel / clusterByJaccard).
624	 * Each cluster MUST have id + textFor (function or precomputed string).
625	 * Returns combined { ok, vectors, failures, stats, checkpoint }.
626	 * If checkpointPath is given, loads existing → resumes → merges → saves.
627	 *
... [+3633 chars truncated]

### Assistant | 2026-05-16T03:17:22.774Z

Critical finding here. Note line 686-699: `embedClusters` returns `batchResult.vectors` — which is **only the vectors embedded in THIS run** (skipIds-skipped ids are NOT in `batchResult.vectors`, they're in the merged `checkpoint`). Let me confirm what `embedBatch` returns when items are skipped via `skipIds`.

### Assistant | 2026-05-16T03:17:23.472Z

[tool_use: Read]

### User | 2026-05-16T03:17:24.730Z

[tool_result] 320	    skipIds = new Set([...skipIdsRaw]);
321	  } else if (Array.isArray(skipIdsRaw)) {
322	    skipIds = new Set(skipIdsRaw);
323	  } else {
324	    throw new TypeError(`embedBatch: skipIds must be Set or Array, got ${typeof skipIdsRaw}`);
325	  }
326	  const seen = new Set();
327	  const vectors = [];
328	  const failures = [];
329	  // Two-bucket failure tracking so the caller can distinguish
... [+3057 chars truncated]

### Assistant | 2026-05-16T03:17:37.216Z

Confirmed. This is a **P0 correctness bug** in the orchestrator's re-run path.

`embedBatch` line 356-359: when an id is in `skipIds` (i.e., already in the checkpoint from a prior run), it is `continue`d — **NOT pushed to `vectors`**. So `embedClusters` returns `batchResult.vectors` containing **only vectors freshly embedded this run**, not the full checkpoint.

The orchestrator at line 122 builds `vectorMap` exclusively from `result.vectors`:
```js
const vectorMap = new Map(result.vectors.map(v => [v.id, v.vector]));
```

The full set of embeddings lives in `result.checkpoint` (line 690 `mergeIntoCheckpoint`), which the orchestrator **never reads**.

**Consequence on any re-run** (the explicitly stated design goal — "re-runs must hit the embedding checkpoint, not re-call Ollama"): when all 192 nodes are already checkpointed, `skipIds` skips all of them, `batchResult.vectors` is `[]`, so `result.vectors.length < 2` triggers the line 116 early exit. The script prints "fewer than 2 embeddings — cannot build lateral wires. Exiting." and **emits zero wires / zero graph edges**. A partial re-run (e.g., resume after Ollama died at node 100) would build lateral wires from **only the ~92 newly-embedded nodes**, ignoring the 100 already-checkpointed — producing a silently truncated wire set that looks complete (R12 violation).

The first production run worked only because the checkpoint started empty so every vector flowed through `batchResult.vectors`. The script is **not idempotent and not resume-correct**, directly contradicting the stated contract.

Let me confirm the checkpoint vector shape to specify the fix precisely.

### Assistant | 2026-05-16T03:17:39.397Z

[tool_use: Grep]

### User | 2026-05-16T03:17:39.971Z

[tool_result] 7:// failures return { ok: false, error, partial: [...] } — we do NOT silently
127: * vectors: Map<id, Float64Array> or array of { id, vector }
271:      return { ok: true, vector: vec, attempts: attempt + 1 };
284:  return { ok: false, error: String(errMsg), attempts: maxRetries + 1 };
293: * Returns { ok, vectors: [{id, vector}], failures: [{id, error}], stats }.
391:  return {
424:export functi
... [+1587 chars truncated]

### Assistant | 2026-05-16T03:18:17.338Z

Confirmed the fix surface. Line 433: checkpoint stores `vectors: [{ id, embedding: Array }]`. Line 605-612: `mergeIntoCheckpoint` returns the full merged set in `.vectors`. The orchestrator must source its `vectorMap` from `result.checkpoint.vectors` (full set), not `result.vectors` (this-run-only).

## Code Quality Analysis Report

### Summary
- Files Analyzed: 1 orchestrator (`tribal-graph-course-embed.mjs`) + contract verification against `lib/tribal-graph-embedding.mjs`
- Grade: **FAIL**
- Critical Issues: 1 P0, 1 P1

### Critical Issues

**P0 — Re-run/resume produces empty or silently-truncated wire set (the exact contract this script claims to honor)**
- File: `scripts/tribal-graph-course-embed.mjs:122` (and dependent `:116`, `:123`, `:140`)
- Severity: High
- Root cause: `embedClusters` returns `result.vectors = batchResult.vectors`, which contains **only vectors embedded in the current run**. Checkpoint-skipped ids (`embedding.mjs:356-359` `continue`s skipped items — never pushes to `vectors`) live only in `result.checkpoint.vectors`. The orchestrator never reads `result.checkpoint`.
- Consequence:
  - Full re-run (all 192 checkpointed): `result.vectors` is `[]` → line 116 `result.vectors.length < 2` early-exit → **0 wires, 0 graph edges emitted**. Directly contradicts the stated design goal ("re-runs must hit the embedding checkpoint... instead of re-calling Ollama" — they do hit the checkpoint, but then the script does nothing).
  - Partial resume (Ollama died mid-run, e.g. 100 done, resume embeds remaining 92): `vectorMap` has only the 92 fresh vectors → `buildLateralWires` runs over 92 of 192 nodes → a **silently truncated wire set written to the sidecar + graph that looks complete**. This is the R12 fail-loud violation the review flagged as a concern — confirmed real.
  - The successful production run only worked because the checkpoint began empty (every vector flowed through `batchResult.vectors`).
- Fix: source the full embedding set from the merged c
... [+4591 chars truncated]
