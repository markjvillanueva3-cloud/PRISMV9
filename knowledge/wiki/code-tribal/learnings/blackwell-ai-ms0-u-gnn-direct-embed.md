# BLACKWELL-AI-MS0/U-GNN-DIRECT-EMBED — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-GNN-DIRECT-EMBED (slot:india): BREAK the NN/GNN constant-vote degeneracy — 2a ghost embeddings + 2d direct-embed (AUROC 0.5->0.848, isDegenerate false)

**Commit:** `8abba4f27cf5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T09:53:15-05:00
**Tags:** blackwell-ai-ms0, u-gnn-direct-embed, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-GNN-DIRECT-EMBED (slot:india): BREAK the NN/GNN constant-vote degeneracy — 2a ghost embeddings + 2d direct-embed (AUROC 0.5->0.848, isDegenerate false)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-AI-MS0]/U-GNN-DIRECT-EMBED (slot:india): BREAK the NN/GNN constant-vote degeneracy — 2a ghost embeddings + 2d direct-embed (AUROC 0.5->0.848, isDegenerate false)

ROOT (code+empirically verified): deployed 8-d checkpoint + edgeless inference collapsed every ghost to a uniform vector -> uniform cosines -> constant vote (AUROC 0.5). Base-rate norm (prior commit) was necessary but insufficient.

2a (scripts/build-node-embeddings.mjs): added --graph/--ghosts-only/--out + ghostEmbedText() (LEAK-FREE — strips the info clause that embeds proposed_wiring, the eval TRUTH; first run scored a FAKE 0.9833 because the answer was in the text, R12 catch). Ran the DORMANT full-coverage builder ghost-scoped on the CURRENT graph -> 636/636 distinct nomic vectors (state/shared/nn-graph/ghost-node-embeddings.jsonl) in ~25s on the Blackwell.

2d (scripts/seed-ghost-gnn-classify.mjs): PRISM_NNG_DIRECT_EMBED=1 votes raw 768-d nomic cosine k-NN (dequant q*s, base-rate-normalized), bypassing the broken 8-d edgeless-SAGE. loadDirectEmbeddings (fail-soft, memory-bounded). Threaded through nn-graph-eval (skip checkpoint in direct mode).

HONEST result (leak-free, 62 holdout): AUROC 0.848 PASS, macro-F1 0.326 / Brier 0.154 below-gate, isDegenerate FALSE. PSN leg #10 DEGENERATE -> below-gate (honest). Residual = class-imbalance + name-only features (reference-pool growth + source-docblock embedding next), NOT degeneracy. AUROC = embedding<->keyword-tier agreement (internal-consistency, not verified-wiring). 140 tests pass incl leak-strip + distinct-prediction.
```

## Files touched (7)
- scripts/build-node-embeddings.mjs                   |  72 ++++++++++++++++++------
- scripts/build-node-embeddings.test.mjs              |  22 ++++++++
- scripts/lib/nn-graph-eval.mjs                       |  15 +++--
- scripts/seed-ghost-gnn-classify.mjs                 | 125 ++++++++++++++++++++++++++++++++----------
- scripts/seed-ghost-gnn-classify.test.mjs            |  46 ++++++++++++++++
- state/shared/specs/GNN-DEGENERATE-FIX-2026-06-04.md |   8 +++
- 6 files changed, 237 insertions(+), 51 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8abba4f27cf5`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-AI-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._