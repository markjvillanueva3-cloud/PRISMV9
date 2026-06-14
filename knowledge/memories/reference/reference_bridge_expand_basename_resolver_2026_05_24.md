---
name: reference-bridge-expand-basename-resolver-2026-05-24
description: "Bridge Path-2 resolver — ghost.unwired.* nodes can now match wiki engine pages by lowercased basename. Code-side complete + 60/60 tested. Data-side blocker: tribal-embed-index covers 0 engine pages (operator must extend the index to clear the AUROC gate)."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.036Z
aliases: reference_bridge_expand_basename_resolver_2026_05_24
---


# Bridge expand — basename resolver — papa /loop 2026-05-24

User directive: *"expand bridging and wiring"* (after `/loop` /continue arc).

## The gap this closes

The graph-node-embedding bridge ([[reference_gnn_node_embedding_bridge_2026_05_23]]) only matched nodes whose graph entry carried explicit `knowledge.wikiEntries[]`. The 6,516 `ghost.unwired.<X>Engine` nodes have NO wikiEntries (ghosts are undocumented by definition) — so they NEVER produced embedding rows, leaving the NN tier-5 retrain at hit=22/6000 = 0.4% (well below the ~50% rule-of-thumb for clearing the AUROC ≥0.78 gate).

## What shipped (commit on slot/papa)

### New exports in `scripts/lib/graph-node-embedding-bridge.mjs`

1. **`candidateBasenames(node)`** — derives ordered, lowercase basename candidates from a node's identity. Priority: `label` → label-without-Engine-suffix → last segment of `id` → that-without-Engine-suffix. Deterministic, deduplicated.

2. **`buildEngineWikiBasenameIndex(engineWikiRoot, opts)`** — scans `knowledge/wiki/architecture/engines/**` once (DFS, depth ≤4, skips `_*` + `.*`), returns `Map<basename, full-path>`. First-write-wins on basename collisions for cross-rescan stability. R12 fail-soft on missing root.

3. **`nodeToEmbeddingRow(node, lookup, opts)`** — new `opts.basenameIndex` argument. Strictly additive: Path 1 (`wikiEntries`) still wins; Path 2 (basename) only fires when Path 1 produced zero vectors. One match per node is sufficient for tier-5 voting signal.

### Bridge integration

`buildEmbeddingSource` builds the index once via `path.join(PRISM_ROOT, "knowledge/wiki/architecture/engines")` then threads it into every per-node call. Result object surfaces `basenameIndexSize` + `basenameMatched` (count of nodes recovered via Path 2) for lifecycle ledger attribution.

### Tests

`scripts/lib/graph-node-embedding-bridge.test.mjs` — **60/60 PASS** (+9 net new):
- 5 `nodeToEmbeddingRow` Path-2 scenarios: ghost-recovery happy path · Engine-suffix-strip fallback · Path-1 dominance preserved · honest-miss returns null · `candidateBasenames` ordering
- 4 `buildEngineWikiBasenameIndex` scenarios: nested DFS + `_*`/`.txt` skip · ENOENT fail-soft → empty Map · first-write-wins collision · graceful label-less / id-less

## The data-side gate that's still in front

Empirical retrain post-expansion: still hit=22/6000. Reason: **the tribal-embed-index has 0 engine-page entries**.

```
$ node -e "const fs=require('fs'); const idx=JSON.parse(fs.readFileSync('state/shared/tribal-embed-index.json','utf8'));
let eng=0, oth=0;
for (const e of idx.entries) {
  if (typeof e.id === 'string' && e.id.includes('/engines/')) eng++;
  else oth++;
}
console.log({total: idx.entries.length, engineEntries: eng, otherEntries: oth});"
{total: 11896, engineEntries: 0, otherEntries: 11896}
```

The 11,896 entries cover `architecture/actions/**`, `architecture/business/**`, `architecture/cad/**`, `architecture/cam/**` — but the upstream embedding pipeline never embedded the ~3,000 engine wiki pages under `architecture/engines/**`. My bridge expansion is *correct* + *ready*, but a Path-2 lookup hits the basename index → finds the wiki-path key → calls `lookup.get(key)` → returns undefined because the embedding index has no row for that key.

## Operator path to clear the AUROC gate

1. **Extend the upstream embedding pipeline** to cover `knowledge/wiki/architecture/engines/**`. Likely already a job in the wiki-embed/tribal-corpus tooling — needs the engine bucket added to its scan paths.
2. Regenerate `state/shared/tribal-embed-index.json` (will grow from 11,896 → ~14,900 entries).
3. Re-run the retrain — should see hit-rate jump from 22 to **thousands** automatically because my bridge expansion already threads engines through Path 2.

Note: per the session `Ollama silently broken` banner, the Ollama instance for `nomic-embed-text:latest` is timing out — fixing the Ollama daemon is a prerequisite for the index regeneration.

## Why the bridge expansion still ships now (not deferred)

- Code-side wiring is *correct* + tested independently of the upstream data state.
- The moment operator extends the embedding index, tier-5 unblocks WITHOUT any further code change.
- Bridges that ship before their upstream data is the canonical PSN pattern — wire first, populate second.
- Operator can verify via the new `result.basenameMatched` field in the lifecycle ledger (currently 0; will become non-zero once engine entries arrive).

## Related

- [[reference_nn_predictor_embed_wire_followup_2026_05_24]] — earlier this session: tier-5 unblocked (AUROC 0.096 → 0.5 ungated)
- [[reference_gnn_node_embedding_bridge_2026_05_23]] — golf's original bridge (Path 1 only)
- [[reference_psn_viz_pipeline_complete_2026_05_24]] — V8 string-length close-out arc
- Commit on `slot/papa`: `[NN-GRAPH-MS2]/U-NN-PREDICTOR-EMBED-WIRE-BRIDGE-EXPAND`
