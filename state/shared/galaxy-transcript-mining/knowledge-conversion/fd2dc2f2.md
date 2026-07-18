# knowledge-conversion session fd2dc2f2 (2026-06-03, 12MB, spine 106KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `93f85ec067` – GRADED‑schema read fix (honest AUROC reporting)  
- `3a46eca4e7` – rescued orphaned streaming‑retry helper (`ERR_STRING_TOO_LONG`)  
- `c354432cf6` – degenerate‑guard: eval now fails loudly on constant‑vote collapse  
- `f844af7eb3` – fleet‑wide `[DEGENERATE]` per‑prompt signal (classifyGnn + psn‑leg‑state)  
- `44702e0cac` – definitive feature‑separability closure (text embeddings cannot separate dispatchers)  
- `56b942f50a` – fixed dead‑code in `summarize()` for HYBRID‑empty sources; added missing tests (44/44)

**DECISIONS**  
- Adopt single‑source `classifyGnn` reading `degeneracy.isDegenerate`; fleet sees `[DEGENERATE]` instead of `[BELOW‑GATE]`.  
- Keep tier‑5 GNN retrain dormant; guard prevents wasted cycles on unlearnable tasks.  
- Close NN/GNN loop after proving text embeddings non‑separable (no further feature engineering).  
- GNN tier‑5 classifier gate: AUROC ≥ 0.78, macro‑F1 ≥ 0.55, Brier ≤ 0.15 for `ghost.unwired-engine` nodes.  
- Degeneracy detection added to `nn-graph-eval.mjs`: flag constant‑confidence collapse (`distinctConfidences ≤ 1`).  
- YOLO mode rules: no questions, auto‑select highest priority task, immediate execution, use RTK prefix, Ollama offload for heavy NLP, system‑viz first, Obsidian queries before re‑derivation, 3‑of‑3 scrutiny gate, session continuity hooks (`/precompact`, `/compact`).

**OPERATOR DIRECTIVES**  
- `/checkin-india` → slot‑claim, run full `/checkin`.  
- `/loop [5m] /yolo-mode` → schedule cron `35847521`, auto‑run `/yolo-mode` every 5 min.  
- Handle `h:Hermes-Acc.md`: build account‑rotation layer (U2) and seed rotation roster from six email/password accounts.

**FINDINGS/BUGS**  
- Constant‑vote collapse in both 8‑dim and 768‑d models (AUROC = 0.5).  
- Text‑based embeddings (wiki or name) are non‑separable for dispatcher classes; ~11 % of reference ghosts had vectors, regen did not help.  
- `summarize()` fallback dead code → `" + "` rendered instead of `"→ (no sources)"` for ~99 % low‑confidence prompts.  
- Missing test case: HYBRID with empty sources.  
- Stale `index.lock` blocking shared‑tree commits; peer’s `git add` crashed leaving lock and staged files.

**DOMAIN SPECIFICS**  
- Engines: `ghost.unwired-engine` nodes (Lathe*, Fusion*, etc.).  
- Actions/dispatchers: `classifyGnn`, `psn-leg-state-inject.mjs`, `nn-graph-health-inject.mjs`.  
- Metrics: AUROC, macro‑F1, Brier; new `degeneracy.isDegenerate` flag.  
- Paths: `H:/prism/.claude/helpers/chat-slots.mjs`, `nn-graph-eval.mjs`, `graph-node-embedding-bridge.mjs`.  
- GNN tier‑5 wiring‑inference cascade (`classifyGnn`) for unknown nodes.  
- NN‑EVAL.json shapes: DEFERRED vs GRADED with metrics and grading.  
- Schema‑read blindness regression class: single‑source reader mis‑reads untested shapes.  
- Separability audit metrics (cosine gap, LOO accuracy).  
- Cold‑start problem: ghost nodes lack dispatcher edges; predicted label is missing structural signal.

**TOOLS USED**  
- PRISM tooling: `/checkin-india`, `loop-state.mjs`, `CronCreate`, `rtk git/vitest/tsc/npm run build`, RTK (`rtk git`, `rtk vitest run`), Ollama offload (`/ollama-*`).  
- Scripts/hooks: `chat-slots.mjs`, `audit-roadmap-drift.mjs`, `nn-graph-eval.mjs`, `classifyGnn.js`, `psn-leg-state-inject.mjs`, `nn-graph-health-inject.mjs`, `system-viz-query.mjs`, `wiki-precheck-inject.mjs`.  
- External: Ollama `nomic-embed-text` (name‑embedding test, 768d, local at 127.0.0.1:11434).  
- Git hooks: `duplicationGuardEngine.mustCheckBeforeCreating()`, 3‑of‑3 scrutiny (`scrutiny-3way.mjs`).  
- Shared‑tree git branch `cad-fusion-live-ms0` (2463 ahead / 1 behind).

**OPEN THREADS**  
- Build U2 (switch‑claude‑account.ps1) and seed rotation roster from `Hermes-Acc.md`.  
- Resolve stale `index.lock` to allow future shared‑tree commits.  
- Finalize P3 test tightening once lock cleared.  
- Continue YOLO mode integration for remaining low‑confidence prompt handling.  
- Separate large work‑orders remain: CAG/RAG hybrids, LoRA, other galaxies.  
- Cron job `35847521` continues to fire `/yolo-mode` every 5 min for future autonomous loops.
