# PRISM Fleet AI-Systems Roadmap — Consolidated (slot:india)

> **Provenance:** Produced 2026-06-29 by the `per-domain-ai-improvement` Workflow (run `wf_da23ce47-0da`) — operator directive "utilize parallel hermes agents for each primary domain to train/improve their AI systems + synergy". 4 domains analyzed via Hermes/Grok (mill, lathe, wedm, cam), 5 via parallel repo-grounded code-analyzer agents (cad, quoting, business, speed-feed, post-processor), 1 synthesis agent. 892K subagent tokens, all outside the main context. Every cited file verified on disk.

**Date:** 2026-06-29 · **Branch:** cad-fusion-live-ms0 · **Scope:** 8 domains -> one prioritized fleet plan
**Grounding:** NN-EVAL.json (live), the four outcome-capture wire engines, the dim-correction harness, the cross-substrate edge spine — all verified on disk.

---

## 1. Convergent cross-domain themes

All 9 plans (4 prior Grok + 5 repo-grounded) collapse onto four recurring AI levers; the new plans add a fifth.

| # | Theme | Confirmed by | What it actually is |
|---|---|---|---|
| **T1** | **Physics-informed GNN node/edge features -> break the macroF1 floor** | mill/wedm/cam (Grok) + all 5 new | Every plan named *features, not calibration* as the binding lever. Each domain owns unique deterministic features: CAD STEP geometry (`extractBboxMm`/`extractRadiiMm`), SFC ISO-group `kc1.1` bands (constants.ts P1800/M2100/K1100/N700/S2800/H3200), post vendor/dialect one-hots (`controller-knowledge.json`), business 5-category cost-variance, quoting signed `gap_pct`. |
| **T2** | **Real-outcome holdout augmentation** | mill/wedm (Grok) + all 5 new reframe it | The augmentation source is NOT synthetic — it's the real (s,a,r,s') outcome ledgers that already exist. The data is dark, not missing. |
| **T3** | **Per-domain QLoRA on validated trajectories** | mill/lathe/wedm/cam (Grok) + cad/speed-feed/post | All converge on `vault-to-lora-dataset.mjs` as the single training-data assembler (36 refs already). Adapters exist; the correction->dataset edge is unwired. |
| **T4** | **Domain-specific CAG cache, RAG reserved for live corpus** | mill/lathe/cam (Grok) + cad/speed-feed/business | static/deterministic standards -> CAG; live JM shop data -> RAG. `galaxy-reasoning-bridge.mjs` ~20% hit wastes RAG on cacheable standards. |
| **T5 (NEW)** | **Close the half-wired outcome loops — producers exist, consumers don't** | all 5 new, independently | The dominant new finding. cad/quoting/business/speed-feed/post each have a built emit/producer side and a missing/unwired learner side. A WIRING problem, the cheapest build. |

**Verdict:** The Grok four-theme convergence holds; the new plans add T5 and reclassify T2 from "manufacture synthetic data" to "consume the real dark outcome streams." Both shift the roadmap toward **wiring over training**.

---

## 2. THE single highest-leverage fleet-wide action

### -> Land and standardize the outcome-capture -> feedback-bridge -> LoRA/GNN-holdout closed loop across all domains, via one shared bridge contract.

1. **Common substrate under T2, T3, AND T5 simultaneously** — closing the loop yields real GNN holdout labels (T2), the QLoRA corpus (T3), and the (s,a,r,s') backbone (T5). One action, three themes.
2. **Producers built; only the join is missing.** Verified: `SFCOutcomeCaptureWireEngine.ts`, `SpeedFeedOutcomeFeedbackBridgeEngine.ts`, `QuotingOutcomeCaptureWireEngine.ts`, `PPGOutcomeCaptureWireEngine.ts` all exist. Ledgers live + large: `state/outcomes/speed_feed.jsonl` (181 MB), `lathe.jsonl` (3 MB), `cad/wedm/sinker_edm/mill.jsonl`. `cad-gen-dim-correction-run.mjs` writes `cad-fix-training-ledger.jsonl` (38 KB) but doesn't feed `cad-dimension-dataset*.jsonl`. `vault-to-lora-dataset.mjs` + `vault-to-gnn-refpool.mjs` both exist — pipes terminate one hop short.
3. **Directly attacks the measured GNN blocker.** Live `NN-EVAL.json`: holdout grew to **n~200 across 39 classes**, macroF1 peaks **~0.41** (tau 0.7), Brier never clears (>=0.20 at every tau). Blocker is now **too many classes, too few labeled examples per class, weak per-node features** — real per-domain outcome labels are the only cheap source of class-balanced ground truth. (This SUPERSEDES the n=13 framing in [[reference_gnn_gate_blocker_macrof1_starved_holdout_2026_06_29]] — the live eval moved on.)
4. **Two surgical blockers:** Quoting USD-drop (`QuotingOutcomeCaptureWireEngine.ts:179-180` omits cost_usd due to a closed machining-physics allowlist — add a parallel `cost_usd` lane); P0-U04 bridge `OutcomeCaptureBusToFeedbackBridgeEngine` ABSENT on `cad-fusion-live-ms0` (must merge).

**One sentence:** every domain already paid to build its outcome producer; the fleet win is the cheap join that turns 180+ MB of dark (s,a,r,s') data into GNN holdout labels and LoRA rows — no new model, no GPU for the wiring itself.

---

## 3. Ranked per-domain action table (ROI = leverage / build-cost)

| Rank | Domain | Top action | AI subsystem | ROI rationale |
|---|---|---|---|---|
| **1** | speed-feed (oscar) | Wire `SFCParameterRefinementEngine` median/IQR actual/recommended ratios (clamp [0.25,4.0]) -> `vault-to-lora-dataset.mjs` + GNN holdout rows | Closed-loop + GNN-holdout | Largest live ledger (181 MB); `captureSFC` already fixed; ratios already computed. Pure join. |
| **2** | post-processor (echo) | Auto-call `pp_outcome_emit` from `PostProcessorPipelineEngine` P6 + feed `post-gen-reward.mjs::scorePost` -> `MasterPostFineTuningEngine` | Closed-loop | Emit wired (`PPGOutcomeCaptureWireEngine`) but not auto-invoked. 160,582 NC + 13,790 .cps -> free (s,a,r,s'). |
| **3** | cad (delta) | Wire `cad-gen-dim-correction-run.mjs --apply` (`cad-fix-training-ledger.jsonl`) -> `cad-dimension-dataset*.jsonl` retrain feed | Closed-loop | Producer + dataset both exist, disconnected by one hop. Highest ROI / lowest build. |
| **4** | business (hotel) | Emit `ERPCostFeedbackEngine` 5-category `actual_cost_variance` as structured per-category reward via `xproc_outcome_publish{slot:'hotel'}` | Closed-loop | Only real business-economic reward; `xproc_outcome_publish` currently `// UNVERIFIED`. Per-category avoids reward-collapse. |
| **5** | quoting (charlie) | Merge P0-U04 `OutcomeCaptureBusToFeedbackBridgeEngine` + add `cost_usd` lane (`QuotingOutcomeCaptureWireEngine.ts:179`) | Closed-loop | Producer persists to `quote.jsonl`; consumer absent. One merge + one lane = full quote->ship learner. |
| **6** | speed-feed (oscar) | Emit ISO-group `kc1.1` band + Taylor C/n regime + feed-unit + clamp-vs-target as GNN node features | GNN features (T1) | Richest deterministic per-node signal; attacks the 39-class macroF1 floor. |
| **7** | cam (kilo) | Feed CAM accessible-feature embeddings (clearance envelopes, hyperMILL impeller tilt / Esprit Ti stepover) as GNN node features | GNN features (T1) | Only domain that can supply machinability features; pairs with cad geometry for a joint head. |
| **8** | cad (delta) | CAG the static AP242/ISO-286 taxonomy (`ToleranceDB.json` 260 entries); reserve RAG for live JM corpus | CAG-RAG (T4) | Frees ~20% RAG budget spent on cacheable tolerances. |
| **9** | speed-feed (oscar) | Warm `SFCRAGWarmStartEngine` (top_k=5) from `ProvenSpeedFeedAggregatorEngine` 41,192-tool DB | CAG-RAG (T4) | Densest corpus PRISM owns; lifts retrieval on the highest-traffic surface. |

> mill/lathe/wedm (Grok) slot into the same structure: GNN-feature actions are row-6-class, QLoRA actions are row-1-5-class (gated on `mill.jsonl`/`lathe.jsonl`/`wedm.jsonl`, all present), CAG actions are row-8/9-class.

---

## 4. Cross-domain synergies (pay off once the loops close)

1. Shared 384-d tribal embedding space mill<->lathe<->wedm<->sinker (deflection/harmonic + plasma/flush transfer; lathe's 650 chuck-jaw cases as seed schema).
2. **oscar -> india LoRA feed (the spine of section 2):** `SFCParameterRefinementEngine` correction factors -> `vault-to-lora-dataset.mjs` -> the ~95 LoRA adapters. CLAUDE.md edge made real.
3. oscar -> echo per-block feed provenance: `cam_speedfeed_compute` confidence/CI95 into post P4; one GNN head over SFC+post union.
4. cad -> quoting dimensional-truth transfer (`CADGeometryComparisonEngine` + `cad-fix-training-ledger` corrected dims -> quotes inherit dimensional truth).
5. **business -> quoting actual-cost closure (outermost loop):** `ERPCostFeedbackEngine` actuals + `ActualCostEngine.listJobIds()` -> charlie's underquote LoRA via `QuotingActualOutcomeLoaderEngine`. The quote->ship->actual->relearn loop with real settled-price labels.
6. Joint GNN heads over {cad geometry + cam machinability + sfc physics-band} features — orthogonal signal attacking the 39-class macroF1 floor.

---

## 5. Agent-doable NOW (no GPU) vs needs a GPU run

**Agent-doable now (wiring/emit/CAG — ship this week):** section-3 rows 1-5 (outcome->dataset joins, deterministic transforms — R5 code not model); quoting `cost_usd` lane; P0-U04 merge; GNN node-feature emit (rows 6-7) into `node-embeddings-768d.jsonl`; CAG indexing (rows 8-9) with the resident ONNX 384-d encoder; tribal-ONNX expansion; cross-substrate synergy edges via `generate-cross-substrate-edges.mjs` (ADD-only).

**Needs GPU (Blackwell, gate on metrics):** per-domain QLoRA (T3 — gate: run only AFTER section-2 closes the loops; multi-seed before any lift claim); GNN retrain via `nn-graph-retrain-lifecycle.mjs` (gate: AUROC>=0.78/macroF1>=0.55/Brier<=0.15; live macroF1 ~0.41, Brier never clears -> keep selective-deploy minConf=0.7 until gate clears); synthetic holdout (T2 fallback, run AFTER real-outcome augmentation); cam collision-predictor QLoRA (120k segments).

---

## 6. Execution sequence (dependency-ordered, R13)

1. **Week 1 (agent-doable, parallel across slots, NO GPU):** close the 5 outcome loops (rows 1-5), fix quoting USD-drop, merge P0-U04, emit GNN node features (6-7), populate CAG caches (8-9). This is the section-2 action; unblocks everything below.
2. **Week 2 (verify, R12 with numbers):** prove `vault-to-lora-dataset.mjs` + `vault-to-gnn-refpool.mjs` now ingest non-empty rows per domain; confirm holdout class-balance improved.
3. **Week 3 (GPU batch, gated):** one GNN retrain with new features + real-outcome-augmented holdout vs the 0.78/0.55/0.15 gate, multi-seed. If macroF1 still <0.55, run synthetic augmentation + per-domain QLoRA; keep selective-deploy until the gate clears.
4. **Continuous:** wire cross-domain synergy edges 1-6.

**R12 corrections embedded:** `OutcomeCaptureBusToFeedbackBridgeEngine` NOT present on `cad-fusion-live-ms0` (merge needed); `nn-graph-eval.mjs` is at `scripts/lib/` not `scripts/`; live NN-EVAL holdout is n~200/39-class (not n=13) -> blocker is class-count + per-node feature weakness, strengthening the section-2 loop-closure as the dominant action.
