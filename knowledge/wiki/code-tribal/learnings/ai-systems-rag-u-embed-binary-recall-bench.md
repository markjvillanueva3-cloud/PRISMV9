# AI-SYSTEMS-RAG/U-EMBED-BINARY-RECALL-BENCH — [MAIN-FORCE] [AI-SYSTEMS-RAG]/U-EMBED-BINARY-RECALL-BENCH (slot:india): binary 32x VALIDATED on real GNN embeddings -- recall@5 99.8pct

**Commit:** `7c7235349fbb` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T19:35:45-05:00
**Tags:** ai-systems-rag, u-embed-binary-recall-bench, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-RAG]/U-EMBED-BINARY-RECALL-BENCH (slot:india): binary 32x VALIDATED on real GNN embeddings -- recall@5 99.8pct

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-RAG]/U-EMBED-BINARY-RECALL-BENCH (slot:india): binary 32x VALIDATED on real GNN embeddings -- recall@5 99.8pct

Non-destructive measurement harness over the tested binary-embed-quantize lib.
Answers the gating question for the GNN direct-embed path (leg #10): does 32x
binary two-stage retrieve (Hamming prefilter -> cosine rescore) recover the SAME
top-k neighbours as the deployed full-precision cosine?

LIVE RESULT on the real 355 ghost-node embeddings (768-d):
  recall@5 (binary two-stage vs exact cosine) = 99.8pct
  footprint: float32 1.04MB | int8 0.26MB (4x) | binary 0.03MB (32x)
  VERDICT: binary preserves recall (>=95pct) -- 32x is safe for this store.

So the two-stage rescore recovers virtually all retrieval quality at 32x: the
GNN store is GREEN for binary adoption. (R12 nuance: recall@5 99.8pct is a strong
proxy -- the definitive gate is nn-graph-eval AUROC>=0.78 run over binary
embeddings; 99.8pct top-k overlap makes the kNN VOTE -- and thus the AUROC --
near-certain to hold, but that eval is the final confirmation before deploy.)

ALSO CORRECTS a dedup overclaim in b0c88809ac: PRISM ALREADY int8-quantizes BOTH
GNN stores (ghost q+s, node-768d q -- inline in build-node-embeddings.mjs); the
BINARY tier is the novel 32x contribution (int8->binary = a further 8x), not int8.
Tests 2/2 (parseArgs defaults/overrides, loadVectors skips meta/non-vector/blank).
```

## Files touched (3)
- scripts/bench-embed-quantize-recall.mjs      | 94 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/bench-embed-quantize-recall.test.mjs | 37 +++++++++++++++++++++++++++++++++++++
- 2 files changed, 131 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7c7235349fbb`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-RAG.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._