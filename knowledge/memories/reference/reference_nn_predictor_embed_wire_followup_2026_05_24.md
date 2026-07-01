---
name: reference-nn-predictor-embed-wire-followup-2026-05-24
description: "NN tier-5 unblock — papa /loop 2026-05-24. Forwarded predictor.metadata.embeddingSource through classifyUnknownGhosts→embedGraph + migrated 4 graph-load call sites to streaming JSON. AUROC 0.096 (deferred-forever) → 0.3833 (real grade)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.664Z
aliases: reference_nn_predictor_embed_wire_followup_2026_05_24
---


# NN tier-5 unblocked — papa /loop, 2026-05-24

User directive: *"check what chats are doing training then asess and scope how we can utilize all this data to train the system"* + *"continue"*.

Assessed: most-leverage move identified as `U-NN-PREDICTOR-EMBED-WIRE` (named in PSN-LEG-STATE inject). golf's 2026-05-23 attempt landed half the fix: trainer-exports restored + predictor's `embedGraph` knew how to consume `opts.embeddingSource` + checkpoint metadata baked it in — but the CONSUMER (`classifyUnknownGhosts` in `seed-ghost-gnn-classify.mjs:307`) wasn't forwarding `predictor.metadata.embeddingSource` to `embedGraph()`. The 768-d checkpoint silently fell back to 8-d projected features and threw `checkpoint inputDim 768 does not match projected-feature dim 8` on every eval.

## What shipped (commit on slot/papa)

### Wire fix (1 surgical edit)

`scripts/seed-ghost-gnn-classify.mjs:307` — pull `predictor.metadata.embeddingSource` into `embedGraph()` opts, with caller-override seam preserved. 2 new tests covering both paths (metadata→embedGraph + caller override).

### V8 string-length crash class — 4 additional graph-load call sites migrated to streaming

The 541MB production graph hits V8's ~512MB max-string-length on `JSON.parse(fs.readFileSync(...))`. My session-1 fix migrated 10 sites; 4 more were uncovered by chasing the retrain failure:

1. `scripts/lib/system-viz-graph.mjs::readAndParse` — text path now `statSync`-gates to streaming for >256MB graphs + `ERR_STRING_TOO_LONG` rescue.
2. `scripts/lib/graphsage-train-pipeline.mjs::main` (CLI `--graph` arg) — same gate.
3. `scripts/lib/graph-node-embedding-bridge.mjs::buildEmbeddingSource` — same gate (preserves the test-seam `readFileImpl`).
4. `scripts/seed-ghost-gnn-classify.mjs::readGraph` — same gate.
5. `scripts/lib/nn-graph-eval.mjs::runAssessment` — same gate.

Each migration is conditional + size-gated so existing tests (which inject smaller graphs) still take the legacy path.

## Empirical impact (lifecycle retrain on 541MB live graph)

| Metric | Before (2026-05-24 deferred-forever state) | After this session |
|---|---|---|
| Eval state | `DEFERRED — graph-load-failed: ERR_STRING_TOO_LONG` | **Graded, ungated** |
| AUROC | 0.096 (untrustworthy — no eval ran) | **0.3833** |
| Brier (calibrated) | 0.249 (stale) | **0.250** |
| Eval substrate | crashed on graph parse | Live 282,549-node · 978,509-edge graph |
| Features | n/a (eval never ran) | embedding 768d (hit=22/6000) + projected fallback |

**Gate status:** still `shipped-research-only` (AUROC 0.3833 < 0.78 promotion gate). Remaining gap is **data-side embedding coverage**, not code-side wiring.

## Why hit=22/6000 (and the path to the gate)

`graphsage-checkpoint-768d-rag-upgrade.json` reported 562 matched nodes; current retrain matched 22. The drop is the [[reference_gnn_node_embedding_bridge_2026_05_23]] join sparsity surfacing again on the latest graph. The bridge joins:
- wiki-embedding entries keyed by `wiki:<rel-path>` / `external:<...>`
- graph node IDs keyed by `n:<node.id>`

When the subgraph for classification is the `ghost.unwired-engine` neighborhood, the node IDs `ghost.unwired.<EngineName>` rarely overlap with the wiki-embedding's `wiki:` keys. **Operator path forward:** expand the embedding source to cover engine nodes (or extend the bridge's join logic to match `engine.<Name>` ↔ `wiki:knowledge/wiki/architecture/engines/<Name>.md`).

## Tests

- `scripts/seed-ghost-gnn-classify.test.mjs` — **60/60 PASS** (+ 2 new for metadata.embeddingSource + caller-override)
- `scripts/lib/nn-graph-eval.test.mjs` — **48/48 PASS** (no test breakage from streaming gate)

## How to apply

- Operator runs `node H:/prism/scripts/nn-graph-retrain-lifecycle.mjs --force` to retrain and grade against the live graph (was crashing pre-fix).
- Next promotion gate clearance requires `embedding hit ≥ ~50% of training nodes` (rule of thumb) — currently the bridge produces ~0.4% hit rate.
- Operator follow-up: extend `graph-node-embedding-bridge` to match `engine.<X>` graph IDs to `wiki:` index entries via the canonical engine→wiki-page mapping.

## Related

- [[reference_nn_graph_ms2_u2_2026_05_17]] — self-retrain lifecycle (the script I just unblocked)
- [[reference_nn_predictor_embed_wire_2026_05_23]] — golf's 2026-05-23 half-fix (set up trainer + predictor; lacked consumer-side forward)
- [[reference_gnn_node_embedding_bridge_2026_05_23]] — the bridge that joins `wiki:` keys to `n:` keys; current join sparsity is the active blocker
- [[reference_psn_viz_pipeline_complete_2026_05_24]] — earlier this session's V8-string-length close-out (10 call sites; this commit adds the final 5)
- [[reference_blueprint_100pct_bypass_2026_05_24]] — earlier this session's literal-100% proof
- [[reference_jm_die_library_consolidation_2026_05_24]] — earlier this session's customer-folder organization
