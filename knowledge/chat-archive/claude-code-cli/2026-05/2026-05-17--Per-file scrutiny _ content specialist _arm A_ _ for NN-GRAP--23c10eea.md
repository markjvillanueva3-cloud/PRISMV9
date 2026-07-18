---
type: "chat-session"
source: "claude-code-cli"
session_id: "23c10eea-c03b-414f-9e26-380e20195aee"
title: "Per-file scrutiny — content specialist (arm A) — for NN-GRAPH-MS2/U-NNG-768D-FEA"
date: "2026-05-17"
first_ts: "2026-05-17T21:16:51.988Z"
last_ts: "2026-05-17T21:17:55.015Z"
cwd: "H:\\PRISM"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/23c10eea-c03b-414f-9e26-380e20195aee/subagents/agent-ae9fd72a2bd89474a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# Per-file scrutiny — content specialist (arm A) — for NN-GRAPH-MS2/U-NNG-768D-FEA

> **claude-code-cli** | 2026-05-17 | 5 msgs (2 user / 3 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/23c10eea-c03b-414f-9e26-380e20195aee/subagents/agent-ae9fd72a2bd89474a.jsonl`

## Transcript

### User | 2026-05-17T21:16:51.988Z

Per-file scrutiny — content specialist (arm A) — for NN-GRAPH-MS2/U-NNG-768D-FEATURES.

File: H:/prism/scripts/lib/graphsage-train-pipeline.mjs

Read the WHOLE file end-to-end (it's ~28K — read it all). The unit adds:
1. PIPELINE_DEFAULTS.embeddingSource (default null — off).
2. New exported loadEmbeddingFeatures(filePath, nodeIds, opts) — streams a wiki-embedding JSONL ({__meta,dim,...} header + {n,q:[int8...]} rows), returns {features: Map<id, number[]>, dim, hit, scanned} or null on fail-soft.
3. runTrainingPipeline now branches: when cfg.embeddingSource is set AND the loader yields >0 hits, use the 768-d (or whatever dim) embeddings as features with zero-vector fallback for missing nodes; otherwise the legacy projected-feature path.
4. New metrics: featureSource ("projected"|"embedding"), embeddingDim, embeddingHitCount, embeddingMissCount.
5. parseArgs accepts --embedding-source <path>; USAGE updated; main() passes it through; CLI console.log shows the source.

CONTRACT THE REVIEW MUST PIN:
- Legacy path (embeddingSource=null/unset, or fail-soft fallthrough) MUST be byte-identical to pre-edit behavior — same features Map construction, same inputDim = projected.dim || FEATURE_DIM, same RNG sequence, no reordering. This preserves the MS1 stratified-negative parity invariant.
- Fail-soft (R12): unreadable / unparseable / zero-hit / non-string filePath → return null from the loader; pipeline then falls through to projected. NEVER throw.
- inputDim and featureSource MUST be consistent across the model creation, train(), forward(), and metrics emission.
- Stratified-negative path (extractNodeTypes / positiveTypeMarginal / sampleStratifiedEvalNegatives / sampleStratifiedNegativeEdges) must NOT be perturbed.
- Ragged data rows (q.length !== dim) MUST be skipped, never silently padded.
- int8 dequant via q[i]/127 (with non-finite → 0) is correct for nomic-embed-text quantization.

Grade PASS/FAIL with explicit P0 (blocks ship) + P1 (must-fix-before-next-file) findings. 
... [+100 chars truncated]

### Assistant | 2026-05-17T21:16:58.072Z

I'll read the entire file end-to-end and review it against the contract.

### Assistant | 2026-05-17T21:16:58.306Z

[tool_use: Read]

### User | 2026-05-17T21:17:00.357Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * graphsage-train-pipeline.mjs — end-to-end GraphSAGE link-prediction training
4	 * pipeline. Component (d), the training-script CLI orchestrator, of unit
5	 * U-NNG-GRAPHSAGE-TRAIN (U4) of NN-GRAPH-MS0.
6	 *
7	 * Composes the U1-U4 libs into one runnable pipeline:
8	 *   loadGraph (system-viz-graph)          load the system-viz graph from disk
9	 *   normalizeGraph 
... [+36368 chars truncated]

### Assistant | 2026-05-17T21:17:55.015Z

Now I'll trace through the contract pin-points systematically.

## Contract verification

### 1. Legacy path byte-identical parity

When `cfg.embeddingSource` is `null` (default) OR loader returns `null`:
- Line 487: `const emb = cfg.embeddingSource ? loadEmbeddingFeatures(...) : null;` — short-circuits to null when source is null.
- Line 492: `if (emb && Number.isFinite(emb.dim) && emb.dim > 0 && emb.hit > 0)` — falls through to `else` branch.
- Lines 505-513: `else` branch is identical to the pre-edit legacy: iterates `nodeIds`, pulls from `projected.features`, sets `inputDim = projected.dim || FEATURE_DIM`.

**RNG sequence preservation check**: The loader (`loadEmbeddingFeatures`) does NOT consume the pipeline's `rng` — it has no PRNG access. The `mulberry32(cfg.seed)` is created at line 520 AFTER the feature branch. So the first `rng()` consumer (splitEdges) sees the same call sequence as legacy.

**Map insertion order check**: Legacy iterates `nodeIds` (the buildAdjacency result). New code iterates `nodeIds` in the embedding path AND `nodeIds` in the projected path. **Same iteration order, same Map insertion order.** ✓

**inputDim default**: Legacy uses `projected.dim || FEATURE_DIM`. Preserved at line 512. ✓

**Verdict on legacy parity**: PASS — byte-identical preserved.

### 2. Fail-soft (R12)

`loadEmbeddingFeatures` returns `null` on:
- Non-string filePath (line 218) ✓
- Empty filePath (line 218) ✓
- nodeIds empty (line 222) ✓
- readFileImpl throws (lines 227-230, try/catch) ✓
- Non-string or empty raw (line 232) ✓
- Final: `dim === 0 || features.size === 0` (line 273) ✓
- Per-line JSON.parse failure → `continue`, not throw (lines 249-253) ✓

The runTrainingPipeline gate at line 492 requires `emb && Number.isFinite(emb.dim) && emb.dim > 0 && emb.hit > 0` — all four falsy paths fall through to `else`. **No throw paths reachable in the loader.** ✓

### 3. inputDim / featureSource consistency

Tracing:
- Embedding path: `inputDim = emb.dim` (line 497), `featur
... [+7248 chars truncated]
