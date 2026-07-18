## ai-training — Full System Training (AI/NN/GNN/LoRA/RAG/DL/ML)
- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="ai training" topK=20`
- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
- **MASTER-INDEX edge:** master `MEMORY.md` carries the `[galaxy:ai-training]` back-pointer (discovery edge wired 2026-05-29)
- **Last master-sync:** 2026-05-29   ← STALE: master MEMORY.md updated 2026-06-04; this file edited 2026-06-08 (NN-GRAPH/RAG-HYBRID work) without a master re-pull. Re-pull before next india session.
- **#4 GNN active-learning ghost selector — SHIPPED 2026-06-10** (`U-GNN-ACTIVE-POOL-SELECT`, commit `f512700c56` + testfix `b0ae289273`). `scripts/lib/gnn-active-pool-select.mjs`: ranks unlabeled ghosts by acquisition = wU·uncertainty + wB·classRarity (greedy class-diversity re-rank; NO per-node hetero
…[card truncated]
