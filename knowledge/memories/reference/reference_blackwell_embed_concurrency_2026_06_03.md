---
name: reference_blackwell_embed_concurrency_2026_06_03
description: Embedding/DB generation was serialized one /api/embeddings call at a time — concurrency gives 15x on the RTX PRO 6000 Blackwell (vectors identical). Use PRISM_EMBED_CONCURRENCY.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.029Z
aliases: reference_blackwell_embed_concurrency_2026_06_03
---


PRISM's embedding/vector-DB generators (nomic-embed-text 768-d via Ollama) were **all serialized** — one `/api/embeddings` request awaited at a time — leaving the new RTX PRO 6000 Blackwell (96GB) at **2% GPU util** because the 137M embed model is idle, not saturated.

**Measured on the live Blackwell (300 embeds, 768-d):** serial **3.3 eps** → array-batch(`/api/embed` plural input) **30 eps (9×)** → concurrency-16 **51 eps (15.3×)**. Vectors are **byte-identical** (min cosine 1.0) — the lever is throughput, not accuracy. The 26,051-file tribal-embedding backlog (31.5% coverage) drops from **~2.2h → ~8.5min**.

**Shipped** (`U-EMBED-CONCURRENCY`, slot:juliett, commit `7d7c88b20f`, 2026-06-03):
- `scripts/lib/tribal-graph-embedding.mjs` — `embedBatch(items, {concurrency})`. `DEFAULT_CONCURRENCY=1` = exact legacy sequential (deterministic issue order, all 109 prior tests unchanged); `concurrency>1` = order-preserving bounded worker pool. `embedClusters` forwards it via `...rest`, so the GNN node-embedding bridge + tribal builds benefit for free.
- `scripts/build-wiki-embeddings.mjs` — reads `PRISM_EMBED_CONCURRENCY` (default 1); cache-hits resolved up front (pure-CPU), fresh items go through the pool.

**How to apply:** any DB/embedding generator → set `PRISM_EMBED_CONCURRENCY=8..16` (or pass `concurrency` to `embedBatch`). Still-serial consumers to wire next: the 4 `embed-*-into-tribal-index.mjs` (the 26k backlog), `build-node-embeddings.mjs`, `build-memory-embeddings-sidecar.mjs`. The legacy `/api/embeddings` (singular) endpoint works; `/api/embed` (plural) also enables true array batching for a further win. Pairs with the home_blackwell ModelRoutingEngine profile + [[reference_fleet_reaper|fleet-reaper]] blackwell host preset. See [[feedback_check_units_first]] is unrelated; relates to NN-GRAPH retrain ([[reference_gnn_node_embedding_bridge_2026_05_23]]).
