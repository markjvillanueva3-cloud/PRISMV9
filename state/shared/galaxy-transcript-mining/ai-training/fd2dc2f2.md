# ai-training session fd2dc2f2 (2026-06-03, 12MB, spine 106KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `93f85ec067` – U‑NN‑REFPOOL‑REEVAL + GRADED‑schema read fix (AUROC 0.5 honest).  
- `3a46eca4e7` – Rescued orphaned streaming‑reader (676 MB eval load).  
- `c354432cf6` – U‑NN‑EVAL‑DEGENERATE‑GUARD: constant‑vote collapse guard.  
- `f844af7eb3` – U‑NN‑DEGENERACY‑HOOK‑SURFACE: fleet `[DEGENERATE]` signal per prompt.  
- `8b9a724f00` – Doc‑reflect (CLAUDE.md regression + wiki lesson).  
- `44702e0cac` – Feature‑separability closed; embeddings non‑separable.  
- `56b942f50a` – CAG router bug: summarize() fallback fixed → `"→ (no sources)"`.  
- `nn-graph-eval.mjs` – added `detectDegeneracy(scores, predicted)` wired into assessment/report.

**DECISIONS**  
- Deploy degeneracy guard; flag AUROC≈0.5 ties.  
- Fix GRADED‑schema read for `nn‑graph‑health`, `psn‑leg‑state`.  
- Adopt GraphSAGE tier‑5 wiring‑inference; gate: AUROC ≥ 0.78, macro‑F1 ≥ 0.55, Brier ≤ 0.15.  
- Define NN‑EVAL.json shapes (DEFERRED vs GRADED) with grading logic.  
- Separate audit: majority‑baseline vs LOO nearest‑class‑centroid + cosine gap; int8 safe.  
- Handle cold‑start ghost nodes via structural signal prediction.  
- PSN 11‑leg taxonomy leg #10 surfaced via `psn-leg-state-inject.mjs`.  
- Enable YOLO mode (auto‑select priority, RTK bash prefix, Ollama offload, 3‑of‑3 scrutiny).  
- Close tier‑5 thread after disproving text‑embedding separability.

**OPERATOR DIRECTIVES**  
- `/checkin-india` → slot claim + full checkin.  
- `/loop [5m] /yolo-mode` → schedule 5 min cron (`35847521`) and invoke YOLO immediately.  
- Enable YOLO mode via `status`.  
- Build U2 “switch‑claude‑account.ps1”; seed rotation roster from six accounts in `Hermes-Acc.md`; store credentials under `H:/.claude-accounts/`.

**FINDINGS / BUGS**  
- Constant‑vote collapse (8‑dim & 768‑d) → AUROC 0.5; degeneracy guard required.  
- Feature‑pipeline coverage bug disproved; stale embeddings not cause.  
- Text embeddings non‑separable for dispatcher classes; structural signal absent in ghosts.  
- `classifyGnn` now reads `metrics.auroc/brier` instead of `checkpointMeta.auroc`.  
- `summarize()` fallback fixed (commit `56b942f50a`).  
- P3 test tightening pending stale `index.lock`; retry after clear.  
- Security risk: plaintext credentials in `Hermes-Acc.md`; move to vault, never commit.

**DOMAIN SPECIFICS**  
- NN/GNN leg #10 (tier‑5 deploy gate).  
- Units: U‑NN‑REFPOOL‑REEVAL, U‑NN‑EVAL‑DEGENERATE‑GUARD, U‑NN‑DEGENERACY‑HOOK‑SURFACE.  
- Metrics: AUROC 0.5, macro‑F1 0.133, Brier 0.26 (post‑eval); gate thresholds AUROC≥0.78, macro‑F1≥0.55, Brier≤0.15.  
- Paths: `nn‑graph‑eval.mjs`, `nn‑graph‑health‑inject.mjs`, `psn‑leg‑state‑inject.mjs`,
  `system-viz-query.mjs`, `wiki-query.mjs`, `scrutiny-3way.mjs`.

**TOOLS USED**  
- PRISM CLI: `/checkin-india`, `/loop`, `loop-state.mjs`.  
- RTK: prefix all bash (`rtk git`, `rtk vitest run`).  
- Ollama offload: `/ollama-*`, model `qwen2.5-coder:7b`.  
- System‑viz query (`node H:/prism/scripts/system-viz-query.mjs find`).  
- Wiki‑query (`/wiki-query`).  
- Master-index awareness (`prism_session:master_index_query`).  
- Scrutiny: two reviewers + `scrutiny-3way.mjs` (3‑of‑3 gate).  
- MCP dispatchers: `prism_calc`, `prism_safety`, `prism_ai`, `prism_dev`.

**OPEN THREADS**  
- P3 test tightening pending stale lock resolution.  
- Build/deploy U2 switch script + rotation layer; seed six Hermes accounts.  
- Resolve `index.lock` to allow clean commits.  
- Finalize GNN tier‑5 deployment gate thresholds & monitor live metrics.  
- Ensure PSN leg #10 fully wired into prompt‑injection pipeline.
