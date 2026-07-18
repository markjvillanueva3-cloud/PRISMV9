---
name: feedback_india_oom_streaming_embed
description: 768d embedding of 372K nodes OOMs in-memory — use a streaming JSONL reader
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.430Z
aliases: feedback_india_oom_streaming_embed
---


Bulk-embedding the full PRISM node graph (≈372K nodes, 768d) dies on an in-memory load.

**Why:** 372K × 768 × 4 bytes ≈ 1.1 GB of raw floats plus object overhead exceeds the Node heap on this box.

**How to apply:** `scripts/build-node-embeddings.mjs` streams `node-embeddings-768d.jsonl` line-by-line; never `JSON.parse` the whole corpus. Same rule for any per-node pass over the embedding corpus.
