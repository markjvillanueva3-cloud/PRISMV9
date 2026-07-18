# RAG-UPGRADE-MS0/U-GNN-NODE-EMBED-BRIDGE — [MAIN] [RAG-UPGRADE-MS0]/U-GNN-NODE-EMBED-BRIDGE (slot:golf): graph-node → wiki-embedding bridge + lifecycle wire

**Commit:** `e853edcf93f8` · **By:** markjvillanueva3-cloud · **At:** 2026-05-23T15:04:20-05:00
**Tags:** rag-upgrade-ms0, u-gnn-node-embed-bridge, auto-distilled

## Subject
[MAIN] [RAG-UPGRADE-MS0]/U-GNN-NODE-EMBED-BRIDGE (slot:golf): graph-node → wiki-embedding bridge + lifecycle wire

## Body
```
[MAIN] [RAG-UPGRADE-MS0]/U-GNN-NODE-EMBED-BRIDGE (slot:golf): graph-node → wiki-embedding bridge + lifecycle wire

Closes the empirical-retrain finding from graphsage-checkpoint-768d-rag-upgrade.json:
embeddingHitCount=0 because the wiki tribal-embed-index is keyed by wiki:<rel-path>
but the trainer's loadEmbeddingFeatures is keyed by n: <node.id>. The bridge walks
each graph node's knowledge.wikiEntries[].path, translates to the index id,
aggregates multiple hits via L2-norm centroid, int8-quantizes to the loader's
q[i]/127 dequant protocol.

Files:
  scripts/lib/graph-node-embedding-bridge.mjs       8 exports, fail-soft shell
  scripts/lib/graph-node-embedding-bridge.test.mjs  49 node:test cases, 49/49 PASS
  scripts/nn-graph-retrain-lifecycle.mjs            pre-retrain stage emits a fresh
                                                    JSONL; trainer --embedding-source
  knowledge/wiki/architecture/gnn-node-embedding-bridge.md
  state/shared/specs/RAG-UPGRADE-MS0.md             U-GNN-NODE-EMBED-BRIDGE +
                                                    U-RAG-3-CONTEXTUAL-CORPUS-RUN rows
  CLAUDE.md                                          §NN-GRAPH pointer

First live build: 562 nodes matched of 258914 (was 0). The 258K unmatched are L12
filesystem-leaf ghost nodes with no wiki entries by design; the 562 are the real
wiki-attached engine/dispatcher/skill/concept nodes.

Ollama U-RAG-3 contextual re-embed batch in-flight: index 1612 -> 2853 entries,
withCtx 1500 -> 2000. Durable + resumable; each Claude BG pass adds ~500 before
the BG-task timeout. Full-corpus completion is operator-action across sessions.

Test coverage: HAPPY x 3 variability (dim 3/8/768), FAILURE x 5, ADVERSARIAL x 3,
protocol conformance to loader fixture (q:[127,0,-127] <-> [1,0,-1]).

P0 follow-up surfaced (NOT introduced, pre-existing): graphsage-train-pipeline.mjs
imports positiveTypeMarginal + sampleStratifiedNegativeEdges from graphsage-trainer.mjs
but those exports are absent. Tracked as U-NN-TRAINER-EXPORT-RESTORE. Detail in
reference_trainer_export_regression_2026_05_23 (auto-feeds to obsidian on Stop).
```

## Files touched (7)
- CLAUDE.md                                          |   3 +-
- .../wiki/architecture/gnn-node-embedding-bridge.md | 118 +++++
- scripts/lib/graph-node-embedding-bridge.mjs        | 445 +++++++++++++++++
- scripts/lib/graph-node-embedding-bridge.test.mjs   | 540 +++++++++++++++++++++
- scripts/nn-graph-retrain-lifecycle.mjs             |  63 ++-
- state/shared/specs/RAG-UPGRADE-MS0.md              |   2 +
- 6 files changed, 1168 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e853edcf93f8`
- Milestone envelope: `mcp-server/data/milestones/RAG-UPGRADE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._