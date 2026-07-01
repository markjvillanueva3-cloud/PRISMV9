# INDIA-CONTEXT-LEDGER — full-system AI training (slot:india)

> **Read this FIRST on `/startup-india`** to regain full domain context in ONE read
> (supersedes stitching the handoff + galaxy MEMORY + git-log + the 8-agent survey map).
> Curated, ROI-ordered, git-reconciled. Reconcile §2 (done) + §3 (open) on each
> `/handoff-india`. The india analogue of `DELTA-CONTEXT-LEDGER.md` /
> `BRAVO-HERMES-ZULU-OPEN-TASKS-LEDGER.md`. Galaxy: `mcp-server/src/engines/ai-training/`.
> Last reconcile: 2026-06-11 (slot:india, session claude-72879035).

## §0 — Domain (what india owns)
INDIA = full-system AI training: NN/GNN, LoRA, RAG, deep learning, ML, pattern
recognition, loop-learning self-improving training, octopus multi-model consensus.
India owns 4 surfaces others wire INTO: **OutcomeFeedbackBus · NN-GRAPH retrain ·
RAG/tribal · calibration/conformal**. Soul refuses: promote-failing-candidate ·
train-without-stratify · overwrite-live-checkpoint · assert-AUROC-without-eval.

**The keystone fact:** the tier-5 GraphSAGE/direct-embed ghost-wiring classifier passes
AUROC (0.808 ≥ 0.78) but FAILS macro-F1 (0.439 < 0.55). Root cause = **LABEL-STARVED,
not architecture-starved**. Calibration is a MEASURED DEAD-END (Murphy miscalibration
0.0197 of the 0.179 Brier). The real lever = **grow the reference pool with operator
labels** (selective-deploy at τ=0.7 already validated: emitted Brier 0.041, F1 1.0, 32%
coverage — abstain below gate, defer to LLM tier).

## §1 — DONE / shipped (git-reconciled — DO NOT REBUILD)
- **#4 GNN active-learning ghost selector** — `scripts/lib/gnn-active-pool-select.mjs`
  (`f512700c56` + testfix `b0ae289273`). Ranks unlabeled ghosts by
  acquisition = wU·uncertainty + wB·classRarity (greedy class-diversity re-rank); streams
  the 713MB graph past the V8 string cap via `graph-io.streamGraphArray`; **default
  direct-embed** (model-mode collapses to a uniform vote). Emits
  `state/shared/nn-graph/active-label-worklist.{json,md}`. WIRED: CLI +
  `selectFromClassifications` pure seam + fail-soft `refreshActiveLabelWorklist` in
  `nn-graph-retrain-lifecycle` (fires on not-promoted). 30/30 + 62 lifecycle tests,
  3-of-3 PASS, live-validated (33 unlabeled / 23 refs / 5 classes).
- **Worklist surfaced in india awareness** (`8016636bb6` + hook-track `81166fcb95`) —
  `ai-training-awareness.mjs` shows N unlabeled ghosts + top + the label→seed→retrain
  path every india session.
- **Ollama second-opinion label proposer** (`9371ce90e9`, U-OLLAMA-WORKLIST-PROPOSER) —
  `scripts/propose-worklist-labels.mjs` + pure `scripts/lib/worklist-label-proposer.mjs`
  (16/16). An INDEPENDENT local-LLM dispatcher proposal per worklist ghost (qwen2.5-coder:32b
  reads each engine's source head; anti-hallucination-gated to valid dispatchers via
  `verifiedOffload`+`enumMember` — the keystone's FIRST india consumer). Emits
  `active-label-worklist-proposed.{json,md}` (CONFLICTs first). WIRED into awareness.
  **KEY FINDING (live 31 ghosts): the GNN has CLASS-COLLAPSED — predicts `prism_cam` for
  ALL 31 (~0.27 conf) → 0/31 agree / 31 conflict.** This concretely explains macro-F1
  0.439; the lever is now **class-BALANCED** labels (the CONFLICT set = the diverse seeds),
  not just more prism_cam. → [[reference_gnn_class_collapse_finding_2026_06_11]].
- **Ollama fleet-fix set** (this session, fleet infra — tangential to AI-training but
  india-routed): Sonnet/Claude fallback + IPv4 + keep_alive + timeout-scaling +
  rerank-drift. See [[reference_ollama_fleet_fixes_2026_06_11]] + `OLLAMA-FLEET-AUDIT-2026-06-11.md`
  SHIPPED log. The auto-utilization HARNESS wiring is blocked from the india worktree.
- **Galaxy brain enhanced** (`889a1260e1` + reflect `02d6fcc7d3`) — fixed the stale
  synthesis fill-block + the REMAINING-WORK STATE in `ai-training/MEMORY.md`.
- **git-discipline rule** — india commits to `slot/india` ([[feedback_india_commit_own_slot_branch]]);
  `slot/india` reset to the live tip 2026-06-11 (now india's current canonical lane).
- **4 dedup catches (already-built, do NOT rebuild):** RAG hybrid dense→lexical (U-RAG-2
  two-stage `tribal-rerank.mjs`→`lexical-rerank.mjs` + `hybrid-retrieval.mjs` RRF) ·
  CAG COLD/HOT/HYBRID (`cag-router.mjs`) · cross-run loop lessons
  (`handoff-memory-seed-stop.mjs`) · **Ollama octopus co-residency tuning** (live env
  already has MAX_LOADED_MODELS=4, NUM_PARALLEL=4, FLASH_ATTENTION=1, KEEP_ALIVE=30m,
  KV_CACHE_TYPE=f16). Plus the DONE-SKIP block (retrain lifecycle, node-embedding bridge,
  selective-deploy τ=0.7, 3-of-3 judges, capability-probe oracle).

## §2 — OPEN threads (ROI-ordered)
> NET (verified twice vs the 8-agent survey `AI-SYSTEMS-IMPROVEMENTS-2026-06-10.md`):
> **no clean runnable-now india CODE unit remains** — the levers are operator/GPU-gated.

1. **[OPERATOR] Label the active-learning worklist** — label the ranked top-K in
   `state/shared/nn-graph/active-label-worklist.md` → seed `scripts/vault-to-gnn-refpool.mjs`
   → next `nn-graph-retrain-lifecycle` run lifts macro-F1 0.439 toward the 0.55 gate. The
   selector ranks exactly which ghosts buy the most lift. **← the #1 lever; india built
   the tool, the operator supplies the labels.**
2. **[GPU] rsLoRA r=32-64, 16-bit, all attn+MLP projections** — train runs on the
   Blackwell GPU (corpus assembly is already runnable; `vault-to-lora-dataset.mjs` +
   `assemble-fleet-lora-corpus.mjs` ship). Change: `use_rslora=True`, alpha=2r, LR 2e-4
   cosine, 2-3 epochs, 16-bit (not 4-bit QLoRA) for ≤32B.
3. **[GPU+DATA, gated behind #1] #8 heterophily-aware LP encoder** — separated node
   embeddings + learnable decoder (replace dot-product) for link-pred under heterophily;
   `graphsage-trainer.mjs` + `graphsage-train-pipeline.mjs`. Require ≥3 seeds before any
   AUROC claim ([[feedback_multiseed_before_auroc_claim]]).
4. **[LOW] Qdrant DENSE arm of `hybrid-retrieval.mjs`** — honestly deferred in RAG-HYBRID
   v1 pending a precomputed dense index over the tribal corpus (the live injectors already
   have dense-cosine + lexical two-stage).

## §3 — Key paths (the substrate map)
| What | Path |
|------|------|
| Galaxy brain / doctrine | `mcp-server/src/engines/ai-training/{MEMORY,CLAUDE,SOUL,PATHS,TOOLBELT}.md` |
| Canonical remaining-work survey | `state/shared/specs/AI-SYSTEMS-IMPROVEMENTS-2026-06-10.md` |
| Tier-5 classifier | `scripts/seed-ghost-gnn-classify.mjs` (`classifyUnknownGhosts`, `isValidDispatcher`, `GNN_DEFAULTS`) |
| Active-learning selector | `scripts/lib/gnn-active-pool-select.mjs` (+ `.test.mjs`) |
| Retrain lifecycle (6h scheduled) | `scripts/nn-graph-retrain-lifecycle.mjs` |
| Eval / deploy gate | `scripts/lib/nn-graph-eval.mjs` (AUROC≥0.78, macroF1≥0.55, Brier≤0.15) |
| Graph (713MB, stream it) | `state/shared/system-viz/system-graph.json` via `graph-io.streamGraphArray` |
| Live checkpoints | `state/shared/nn-graph/graphsage-checkpoint{,.candidate,.prev}.json` |
| Worklist (operator labels these) | `state/shared/nn-graph/active-label-worklist.{json,md}` |
| Domain awareness (auto-injected) | `scripts/ai-training-awareness.mjs` + `.claude/hooks/india-awareness-inject.mjs` |
| Algorithm primitives (prism_algorithm) | ml_attention/multihead/layernorm/transformer_block, ml_lowrank (LoRA core), ml_knn (RAG), graph_heterophily_aggregate (#8 lever) |

## §4 — Working rules
- **Commit:** india → `slot/india` worktree (`H:/prism-slot-india`) for isolated domain
  code; running fleet hooks/generators stay on the main tree + merge. `[<SCOPE>]/U-ID: title (slot:india)`.
- **Gate every promotion** on REAL held-out AUROC/macro-F1/Brier; never assert AUROC
  without an eval; never promote a sub-gate candidate.
- **Shard discipline:** stream the graph (V8 string cap ~536MB); never in-memory-load the monolith.
- **Ollama-first** for reads/searches/summaries (operator directive); reserve Claude for judgment + safety.

## §5 — Pointers
Galaxy MEMORY `mcp-server/src/engines/ai-training/MEMORY.md` (§REMAINING-WORK STATE) ·
survey `state/shared/specs/AI-SYSTEMS-IMPROVEMENTS-2026-06-10.md` · handoff
`state/shared/handoffs/HANDOFF-claude-*-india-*.md` · memory
[[feedback_india_commit_own_slot_branch]] · [[reference_gnn_selective_deploy_2026_06_06]] ·
PSN-LEG-STATE #10 (NN/GNN, owner india).
