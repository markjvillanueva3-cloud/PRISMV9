# academy session fd2dc2f2 (2026-06-03, 12MB, spine 106KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `93f85ec067` – GRADED‑schema read fix (honest AUROC reporting)  
- `3a46eca4e7` – rescued orphaned streaming‑retry for eval  
- `c354432cf6` – U‑NN‑EVAL‑DEGENERATE‑GUARD (fail‑loud constant‑vote collapse)  
- `f844af7eb3` – U‑NN‑DEGENERACY‑HOOK‑SURFACE (fleet‑wide DEGENERATE signal)  
- `44702e0cac` – definitive feature‑separability closure (text embeddings non‑separable)  
- `56b942f50a` – fixed `summarize()` HYBRID‑empty‑sources fallback, added 4 tests  

**DECISIONS**  
- Adopt single‑source `classifyGnn`; read `degeneracy.isDegenerate` → `[DEGENERATE]`  
- Implement `detectDegeneracy(scores,predicted)` in eval; flag constant‑vote collapse  
- Use GraphSAGE as tier‑5 classifier; gate: AUROC ≥ 0.78, macro‑F1 ≥ 0.55, Brier ≤ 0.15  
- Split NN‑EVAL.json into DEFERRED (checkpoint) and GRADED (holdout) shapes  
- Treat ghost nodes via predicted label for cold‑start; separability audit: majority‑baseline vs LOO nearest‑class‑centroid + intra/inter cosine gap; int8 quantization safe  
- PSN taxonomy leg #10 injected via `psn-leg-state-inject.mjs` across 26 slots  
- Resolve shared‑tree lock contention by deferring non‑critical commits until stale lock clears  

**OPERATOR DIRECTIVES**  
- `/checkin-india`: force‑take india slot, run full /checkin pipeline  
- `/loop [5m] /yolo-mode`: schedule recurring 5 min cron for YOLO mode  
- Commit P3 test‑tightening after stale `index.lock` cleared (or peer commit finishes)  
- Proceed with U2 swap layer implementation for Hermes account rotation, seed from `Hermes‑Acc.md`  

**FINDINGS/BUGS**  
- Constant‑vote collapse in 8‑dim & 768‑d models → AUROC 0.5, Brier 0.26  
- Feature pipeline bug: only 7/62 ghosts had wiki‑based embeddings; regen ineffective  
- Text (name) embeddings non‑separable for dispatcher classes  
- `classifyGnn` previously read only `checkpointMeta.auroc`; fixed to use `metrics.auroc`  
- `summarize()` HYBRID branch produced `" + "` when sources empty → misleading output; fixed  
- Stale `index.lock` on shared tree blocking commits; resolved by waiting for lock clear, not deleting  
- Missing U2 swap script (`switch‑claude‑account.ps1`) and empty `.claude‑accounts/` vault  
- Security risk: plaintext credentials in `Hermes‑Acc.md`; must map to rotation system  

**DOMAIN SPECIFICS**  
- Engines: `ghost.unwired‑engine`, Lathe*, FusionMaterialPhysicsBridge, etc.  
- Actions: `U‑NN‑REFPOOL‑REEVAL`, `U‑NN‑EVAL‑DEGENERATE‑GUARD`, `U‑NN‑DEGENERACY‑HOOK‑SURFACE`  
- Dispatchers: `psn‑leg‑state`, `nn‑graph-health‑inject`, `classifyGnn`  
- Metrics: AUROC, macro‑F1, Brier, poolSize, degeneracy flag  
- Paths: `H:/prism/.claude/helpers/chat-slots.mjs`, `H:/prism/.claude/commands/checkin.md`, `node H:/prism/scripts/system-viz-query.mjs`, `nn-graph-eval.mjs`, `classifyGnn.js`, `psn-leg-state-inject.mjs`  

**TOOLS USED**  
- PRISM commands: `/checkin-india`, `/loop`, `/yolo-mode`  
- Scripts: `chat-slots.mjs`, `checkin.md`, `nn-graph-eval.mjs`, `classifyGnn.js`, `psn-leg-state-inject.mjs`, `formatDigest.js`  
- RTK, Vitest, TSC  
- Ollama offload via `/ollama-*` skills (`qwen2.5-coder`)  
- System‑viz query tool (`system-viz-query.mjs`)  
- Git, Obsidian & wiki queries (`/wiki-query`, `prism_memory:semantic_search`)  
- Master‑index awareness (`prism_session:master_index_query`)  

**OPEN THREADS**  
- P3 test‑tightening commit pending lock clearance  
- Implementation of U2 swap layer for Hermes account rotation; capture credentials, build rotation order  
- Final integration/testing of PSN leg #10 injection across 26 slots  
- Resolve shared‑tree lock contention strategy (automated retry or lock‑wait queue)  
- Expand GNN tier‑5 metrics coverage (AUROC, macro‑F1, Brier) in CI
