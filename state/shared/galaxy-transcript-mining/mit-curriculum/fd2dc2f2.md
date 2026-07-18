# mit-curriculum session fd2dc2f2 (2026-06-03, 12MB, spine 106KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `93f85ec067` – GRADED‑schema read fix (honest AUROC reporting).  
- `3a46eca4e7` – rescued orphaned streaming‑reader patch (676 MB eval).  
- `c354432cf6` – DEGENERATE guard: eval fails loudly on constant‑vote collapse.  
- `f844af7eb3` – fleet‑wide `[DEGENERATE]` signal via `classifyGnn`.  
- `44702e0cac` – feature‑separability closure (text embeddings cannot separate dispatcher classes).  
- `40a4b05b95`, `8b9a724f00` – doc‑reflection & wiki entry for above fixes.  
- `56b942f50a` – CAG router dead‑code fix (`" + "` → `"(no sources)"`).  

**DECISIONS**  
- Close NN/GNN tier‑5 loop: keep degeneracy guard, schema read fix, fleet signal only.  
- `classifyGnn` reads new `degeneracy.isDegenerate`; all hooks report `[DEGENERATE]`.  
- Deploy GraphSAGE as 5th tier; gate AUROC ≥ 0.78, macro‑F1 ≥ 0.55, Brier ≤ 0.15.  
- Split `NN‑EVAL.json` into DEFERRED (checkpointed, poolSize) & GRADED (holdoutN, metrics).  
- Add `detectDegeneracy` to `nn-graph-eval.mjs`: flag constant‑confidence collapse (`distinctConfidences ≤ 1`).  
- Separability audit: majority‑baseline vs LOO nearest‑class‑centroid accuracy + intra/inter cosine gap.  
- Define cold‑start as ghost nodes lacking dispatcher edges; predicted label = missing structural signal.  
- PSN leg #10 surfaced via `psn-leg-state-inject.mjs` across 26 slots.  
- PRISM discipline: per‑file 2‑reviewer scrutiny, 3‑of‑3 stop gate, no stubs, RTK bash prefix, slot‑worktree, doc‑reflection, feedback_close_background_tasks, R6 token budget.

**OPERATOR DIRECTIVES**  
- `/checkin-india` – force‑take slot “india” and run full `/checkin` pipeline.  
- `/loop [5m] /yolo-mode` – schedule recurring 5 min cron (job 35847521) invoking `/yolo-mode`.  
- Hand‑off: `HANDOFF‑claude-fd2dc2f2‑psn‑synergy‑collect-.md`.

**FINDINGS/BUGS**  
- Constant‑vote degeneracy in 8‑dim & 768‑dim GNNs (AUROC 0.5, Brier 0.26).  
- Regenerated embeddings cover only ~11 % of reference ghosts; feature‑pipeline staleness disproved.  
- Text‑embedding fallback (`nomic‑embed‑text` on names) non‑separable; dispatcher signal cannot be learned from semantics alone.  
- Schema read bug: `classifyGnn` expected `checkpointMeta.auroc`; now reads `metrics.auroc`.  
- CAG router dead‑code returned `" + "` instead of honest `"(no sources)"`.  
- Stale `index.lock` blocks shared‑tree commits; workholding DB commit stalled.  
- `Hermes-Acc.md` contains 6 plaintext credentials—must not be committed.

**DOMAIN SPECIFICS**  
- Slot: **india** (full‑system AI training).  
- Engines/dispatchers: `ghost.unwired-engine`, ~62 ghosts reference pool.  
- Metrics: AUROC, macro‑F1, Brier; degeneracy flag.  
- Key paths: `nn‑graph‑eval.mjs`, `assessHoldout`, `runAssessment`, `classifyGnn`, `formatDigest`, `psn‑leg‑state`, `H:/prism/scripts/lib/nn-graph-eval.mjs`, `psn-leg-state-inject.mjs`, `summarize()` (line 431‑441), `Hermes-Acc.md`.  
- Unique: tier‑5 GNN leg #10, constant‑vote collapse, honest degeneracy reporting.

**TOOLS USED**  
- Node scripts: `chat-slots.mjs`, `checkin.md`, `nn‑graph‑eval.mjs`, `assessHoldout`, `runAssessment`.  
- RTK wrapper (`rtk git`, `rtk vitest run`).  
- Ollama offload via `/ollama-*` (including `qwen2.5-coder:7b`).  
- System‑viz query: `system-viz-query.mjs`.  
- Wiki/Obsidian queries: `wiki-query`, `prism_memory:semantic_search`.  
- Master-index & awareness: `prism_session:master_index_query`.  
- MCP dispatchers: `prism_calc`, `prism_safety`, `prism_cam`, `prism_cad`, `prism_turning`, `prism_ai`, `prism_dev`.  
- Scrutiny agents: `code-reviewer`, `pr‑review‑toolkit`, `code-analyzer`.  
- Loop state: `loop-state.mjs`; CronCreate for `/yolo-mode`.  
- Git hooks: `feedback_commit_to_slot_worktree`.

**OPEN THREADS**  
- India galaxy NN/GNN loop closed; remaining work in other galaxies (CAG/RAG/LoRA).  
- P3 test‑tightening commit deferred until stale `index.lock` cleared.  
- Build account‑rotation layer U2 (`switch-claude-account.ps1`) for Hermes accounts; seed from `Hermes-Acc.md`.  
- Resolve workholding DB commit & clean shared‑tree lock.  
- Monitor PSN leg #10 integration (NN/GNN) for downstream dispatchers.
