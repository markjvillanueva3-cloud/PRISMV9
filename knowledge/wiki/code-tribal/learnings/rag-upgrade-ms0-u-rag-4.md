# RAG-UPGRADE-MS0/U-RAG-4 — [MAIN] [RAG-UPGRADE-MS0]/U-RAG-4 (slot:bravo): close-out — synergy-wiring 4/4 done (system-viz + wiki + memories + GNN bridge)

**Commit:** `8105fbf76d9c` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T17:53:15-05:00
**Tags:** rag-upgrade-ms0, u-rag-4, auto-distilled

## Subject
[MAIN] [RAG-UPGRADE-MS0]/U-RAG-4 (slot:bravo): close-out — synergy-wiring 4/4 done (system-viz + wiki + memories + GNN bridge)

## Body
```
[MAIN] [RAG-UPGRADE-MS0]/U-RAG-4 (slot:bravo): close-out — synergy-wiring 4/4 done (system-viz + wiki + memories + GNN bridge)

GNN bridge research finding: NN-1 (commit per reference_nn_graph_ms2_nn1_768d_features_2026_05_17)
already accepts --embedding-source knowledge/wiki/architecture/_embeddings.jsonl
and U2 auto-promotes on AUROC>=0.78 gate-pass. The RAG-UPGRADE -> GNN bridge
IS the existing --embedding-source flag; no new code needed. Remaining 768-d
retrain is operator-action only (gated on <90% commit memory). Wiki entry
extended with GNN integration section + operator trigger command. Spec
status table updated U-RAG-4 PARTIAL -> DONE. 5 per-unit reference memories
(U-RAG-2..6) auto-fed to knowledge/memories/reference/ via Stop hook.
```

## Files touched (8)
- ...eference_u_rag_2_two_stage_rerank_2026_05_22.md | 48 ++++++++++++++++++++++
- ...ence_u_rag_3_contextual_retrieval_2026_05_22.md | 43 +++++++++++++++++++
- .../reference_u_rag_4_synergy_wiring_2026_05_22.md | 43 +++++++++++++++++++
- .../reference_u_rag_5_eval_harness_2026_05_22.md   | 36 ++++++++++++++++
- ...nce_u_rag_6_gpu_embedder_deferred_2026_05_22.md | 38 +++++++++++++++++
- .../wiki/architecture/two-stage-lexical-rerank.md  | 18 ++++++++
- state/shared/specs/RAG-UPGRADE-MS0.md              |  4 +-
- 7 files changed, 228 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8105fbf76d9c`
- Milestone envelope: `mcp-server/data/milestones/RAG-UPGRADE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._