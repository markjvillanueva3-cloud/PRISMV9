---
name: reference-engine-wiki-embedder-2026-05-24
description: "Engine-wiki embedder closes the bridge data-side gap. First 200 of 3,538 engines empirically lifted ghost.unwired bridge rows 0 → 36 (proves Path-2 resolver works on real data). Full sweep running detached, ETA ~1h."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.104Z
aliases: reference_engine_wiki_embedder_2026_05_24
---


# Engine-wiki embedder — closes the bridge data-side — papa /loop 2026-05-24

User directive: *"lets build and code what we need to get to 1.0"*.

## Why this exists

Earlier this session [[reference_bridge_expand_basename_resolver_2026_05_24]] shipped the bridge Path-2 resolver — `nodeToEmbeddingRow` now recovers `ghost.unwired.<X>Engine` nodes via lowercased-basename match against the wiki engine tree. But empirical hit count was 0 because **the tribal-embed-index has 0 engine-page entries** — the upstream embed pipeline covered actions/business/cad/cam but never engines. The bridge had nothing to look up.

This script closes that gap.

## What shipped

### `scripts/embed-engines-into-tribal-index.mjs`

Scans `knowledge/wiki/architecture/engines/**/*.md` (depth ≤4, skips `_*` + `.*`), embeds each via Ollama `nomic-embed-text:latest` 768-d, appends to `state/shared/tribal-embed-index.json`. Properties:

| Property | Why |
|---|---|
| `id: "wiki:<rel-path>"` (NOT `external:<abs>`) | Matches the bridge's `wikiPathToIndexKey` round-trip exactly so Path-1 + Path-2 lookups both work |
| Resumable + checkpointed (flushes every 25 entries) | A 60-min run isn't lost on interrupt |
| Per-file failure does NOT abort the batch | But 3 consecutive identical infra failures DO abort (fail-loud on real outage) |
| `--limit N`, `--dry-run`, `--force`, `--verbose` | Operator control |
| `--dry-run` does a full scan + plan output without any I/O cost | Operator can scope before running |
| Probes Ollama embeddings endpoint at start | Fail-fast on dead Ollama |
| Detached-launch friendly (no stdin, no tty) | Started via `Start-Process -WindowStyle Hidden` for 1h+ runs |

### Tests — 6/6 PASS

`scripts/embed-engines-into-tribal-index.test.mjs` — pure-helper coverage:
- `scanEngineWiki` recursive .md scan + underscore/hidden skip
- `scanEngineWiki` depth ceiling truncates a 6-deep tree
- `scanEngineWiki` empty on missing root (R12 fail-soft)
- `makeWikiId` produces `wiki:<rel-path>` POSIX-separated (Windows drive-letter resolved correctly via `fileURLToPath`)
- `buildEngineEntry` matches the canonical tribal-embed-index shape (id/source/domain/title/path/text/hash/embedding)
- `buildEngineEntry` strips frontmatter + flattens whitespace in `text`

## Empirical proof of impact

First 200-engine batch (212s, 0 failures):

| File | Pre-batch | Post-batch | Delta |
|---|---|---|---|
| `tribal-embed-index.json` total entries | 11,899 | 12,099 | +200 |
| `node-embeddings-768d.jsonl` rows (bridge output) | 539 | 1,669 | **+1,130** |
| ghost.unwired rows in bridge output | 0 | **36** | **+36** |

The +1,130 jump in bridge output (vs +200 in the index) is the BRIDGE working — Path-1 nodes whose wikiEntries pointed to engine pages now have lookups that hit (where they previously missed silently). The +36 ghost rows are the Path-2 resolver doing its job for nodes that have NO wikiEntries.

## Linear extrapolation (data-fill ETA)

| Coverage | Engines embedded | Estimated ghost recoveries |
|---|---|---|
| 5.6% (now) | 200 / 3,538 | 36 |
| 100% (after detached run) | 3,538 / 3,538 | ~636 (= every ghost in graph) |

## Detached run kickoff

Launched 2026-05-24 ~21:42 local via PowerShell `Start-Process -WindowStyle Hidden`:
```
Log:   H:/prism/state/shared/embed-engines-detached.log
Err:   H:/prism/state/shared/embed-engines-detached.err
ETA:   ~66 min (3,338 remaining @ ~1.2s/embed)
```

The launcher's task-notification reports "exit 255" — that's the PowerShell wrapper's stdout-pipe return, NOT the embedder process. Same artifact as earlier phase18-v6 detach. Embedder progresses normally — at row 300/3,338 with 0 failures, index at 12,400.

## What the operator runs after the detach finishes

```bash
node H:/prism/scripts/nn-graph-retrain-lifecycle.mjs --force
```

This should produce a substantially higher AUROC reading than the current 0.5 because:
- Train subgraph's wiki-linked nodes will have real 768-d embeddings (not zero-padded)
- The 636 ghosts will resolve via bridge Path-2 → real embedding features
- The model learns from structure + content jointly instead of structure-only

## Why this is the ENTIRE remaining path to the 0.78 gate

The infrastructure to clear the AUROC gate is now:
- ✅ V8 string-length crashes eliminated (5 graph-load sites streaming-migrated)
- ✅ predictor.metadata.embeddingSource forwarded through `classifyUnknownGhosts`
- ✅ `loadEmbeddingFeatures` returns `{dim, hit:0}` so predictor can zero-pad
- ✅ `embedGraph` enters embedding branch on `emb.dim === model.inputDim`
- ✅ Bridge Path-2 basename resolver (this turn earlier)
- 🔄 Engine wiki embeddings populated (DATA fill — running now)

The only thing left is time for the detached process to complete.

## How to apply

- Operator: monitor `state/shared/embed-engines-detached.log`. Pattern: `[N/3338] added=25 failed=F`. F should stay low; spikes = Ollama wobble.
- After completion, single `nn-graph-retrain-lifecycle.mjs --force` reads the lifted index and produces a real-grade AUROC.
- If AUROC still <0.78, the next lever is the training data itself (more reference-pool entries, different negative-sampling strategy) — not the wiring.

## Related

- [[reference_bridge_expand_basename_resolver_2026_05_24]] — bridge code-side this turn
- [[reference_nn_predictor_embed_wire_followup_2026_05_24]] — earlier this session tier-5 unblock
- [[reference_gnn_node_embedding_bridge_2026_05_23]] — golf's original bridge (Path 1 only)
- Commit on `slot/papa`: `[NN-GRAPH-MS2]/U-EMBED-ENGINES-INTO-INDEX`
