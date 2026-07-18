# india session fd2dc2f2 (2026-06-03, 12MB, spine 106KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `93f85ec067`: GRADED‑schema read fix – classifyGnn now reads metrics.auroc.  
- `3a46eca4e7`: rescued orphaned streaming‑reader patch.  
- `c354432cf6`: degenerate‑guard: eval fails loudly on constant‑vote collapse.  
- `f844af7eb3`: fleet‑wide `[DEGENERATE]` signal (psn‑leg‑state & nn‑graph‑health).  
- `44702e0cac`: feature‑separability closure – text embeddings non‑separable → tier‑5 GNN retrain closed.  
- `40a4b05b95`, `8b9a724f00`: doc‑reflection updates for above units.  
- `56b942f50a`: fixed CAG/RAG hybrid summarizer fallback (`" + "` → `"(no sources)"`); 3‑of‑3 scrutiny pass.

**DECISIONS**  
- Adopt single‑source reader (`classifyGnn`) for deferred & graded eval shapes.  
- Implement degenerate‑guard to block retrains when AUROC collapses to class prior.  
- Tier‑5 GNN dormant due to non‑separable text embeddings; feature‑separability closed.  
- Set GraphSAGE deploy gate: AUROC ≥ 0.78, macro‑F1 ≥ 0.55, Brier ≤ 0.15.  
- Define NN‑EVAL.json shapes: DEFERRED (`{deferred:true,…}`) & GRADED (`{deferred:false,…}`).  
- Add `detectDegeneracy(scores,predicted)` in `nn-graph-eval.mjs` (constant‑confidence collapse when distinctConfidences ≤ 1, ≥2 samples).  
- Separability audit: majority‑baseline vs LOO nearest‑class‑centroid accuracy + intra/inter cosine gap; int8 quantization safe.  
- Cold‑start: ghost nodes lack dispatcher edges → missing structural signal.  
- PSN taxonomy leg #10 surfaced via `psn-leg-state-inject.mjs` across 26 slots.  
- Ollama embedding service at `http://127.0.0.1:11434`, nomic‑embed‑text, 768‑dim vectors.

**OPERATOR DIRECTIVES**  
- `/checkin-india`: claim slot, run full `/checkin`.  
- `/loop [5m] /yolo-mode`: schedule recurring cron (`35847521`) to fire `/yolo-mode` every 5 min; activate YOLO mode (auto‑select highest priority task).  
- Build account‑rotation layer **U2** for Hermes accounts: seed with six email/password entries from `Hermes-Acc.md`; use `claude-account-lib.mjs` primitives (`nextInRotation()`, `switchAccount()`); ensure switch script fails loudly until credentials captured via `captureCredentials`.

**FINDINGS/BUGS**  
- Constant‑vote collapse in 8‑dim & 768‑d models → AUROC 0.5 (class prior).  
- `classifyGnn` misread metrics when eval shape changed from deferred to graded (missing checkpointMeta).  
- Feature pipeline staleness: wiki‑basename match missing for ~89% of reference ghosts → no embeddings.  
- Text embeddings produce near‑identical vectors across dispatchers → non‑separable; dispatcher labels unlearnable.  
- CAG/RAG hybrid summarizer fallback produced `" + "` instead of `"(no sources)"` when both hot & cold empty – fixed in commit `56b942f50a`.  
- P3 test‑tightening assertion mis‑matched old bug (`"→  + "`); updated to discriminate new output; pending due to stale `index.lock`.  
- Stale `index.lock` (~5 min) from peer’s aborted `git add`; cannot remove lock; defer P3 commit until cleared.

**AI‑SYSTEM SPECIFICS**  
- Engines/Actions: `nn-graph-eval.mjs`, `assessHoldout`, `classifyGnn`, `formatDigest`.  
- Metrics (graded eval): AUROC 0.5, Brier 0.26, macro‑F1 0.133; GraphSAGE tier‑5: AUROC ≥ 0.78, macro‑F1 ≥ 0.55, Brier ≤ 0.15.  
- Deploy Gates: `assessHoldout`, degenerate‑guard.  
- Model names: 8‑dim checkpoint (constant‑vote), 768‑d embedding source (`node-embeddings-768d.jsonl`).  
- Dataset/Corpus paths: `graph-node-embedding-bridge.mjs`, `node-embeddings-768d.jsonl`, live graph `system-graph.json`.  
- NN‑EVAL.json shapes defined; real deploy gate uses `auroc` from graded results.  
- Separability audit details (majority‑baseline vs LOO nearest‑class‑centroid accuracy + intra/inter cosine gap); int8 quantization safe.  
- PSN taxonomy 11-leg, leg #10 for NN/GNN.  
- Embedding service: Ollama nomic‑embed‑text, 768‑dim vectors at `http://127.0.0.1:11434`.

**OPEN THREADS**  
- No remaining work on NN/GNN tier‑5; retrain loop closed.  
- Next work‑order domain (CAG/RAG/LoRA) pending; to start in fresh session after context reset.  
- P3 test‑tightening commit pending; resolve stale `index.lock` or defer until peer finishes.  
- Monitor & clean shared‑tree index.lock contention (`cad-fusion-live-ms0` diverged +2463 ahead / –1 behind).  
- Implement account‑rotation layer U2 for Hermes accounts, integrate with `claude-account-lib.mjs`.
