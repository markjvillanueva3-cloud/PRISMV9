# Plan-scrutiny — Arm B (training rigor + quality gates + ML soundness)

**Plan reviewed:** `H:\.claude\plans\steady-kindling-tide.md` — NN-GRAPH-MS0 (7 units, GraphSAGE link-prediction over system-viz graph).

**Verdict: PASS-WITH-FIXES.** The architecture and parallel-buildable unit decomposition are sound. The ML rigor section has three P0 issues (calibration timing, split-leakage ambiguity, negative-sampling design) and several P1s that, if uncorrected, will produce a gate that either silently fails or silently passes for the wrong reason. None are fatal; all are addressable inside the existing 7-unit envelope.

---

## P0 — must fix before ExitPlanMode

### P0-1. AUROC ≥ 0.85 is *aspirational*, not realistic, on this dataset — and the "ship anyway with raised threshold" mitigation weakens the gate dishonestly (CLAUDE.md R12).

**What's wrong.** 2-4k positive edges on a 373k-node heterogeneous graph, 16-class implicit choice (16 dispatchers), 3× random negatives. Published benchmarks for link prediction on heterogeneous KGs:
- TransE / DistMult / ComplEx on FB15k-237, WN18RR (homogeneous-style relational): AUROC 0.75-0.88
- R-GCN / HAN / HGT on heterogeneous benchmarks (DBLP, IMDB, ACM): AUROC 0.78-0.91
- GraphSAGE specifically on heterogeneous link prediction without relation-aware aggregation: typically 0.70-0.82
- Cold-start link prediction (test edges where one endpoint has few neighbors — common in PRISM where unwired engines have ~0 dispatcher edges by definition): drops another 5-10 pp.

The plan uses **vanilla** GraphSAGE (mean-pool, not relation-aware), so the realistic ceiling is **~0.78-0.85 AUROC** on val, possibly lower on held-out test if split-leakage is controlled (see P0-2). The plan's own risk register concedes "AUROC may stall at 0.75-0.85" — the gate threshold and the realistic outcome are the same number, which means the gate is biased to fail.

The mitigation "ship with raised `PRISM_NNG_MIN_CONF=0.9`" is honest-sounding but is a **silent gate-weakening** if not paired with explicit operator awareness. R12 violation: the artifact ships, the milestone closes, but the deliverable is *not what the plan claimed*.

**Fix.**
1. Lower the **primary gate** to **AUROC ≥ 0.78** (the realistic floor for vanilla SAGE on heterogeneous data). Cite the benchmarks in the plan body and `NN-EVAL.md`.
2. Keep **AUROC ≥ 0.85 as a stretch target**, but tied to a *deliverable upgrade*, not the gate. If 0.85 hits, ship gate at 0.7 confidence. If 0.78-0.85, ship gate at 0.9 confidence with explicit `NN-EVAL.md` "GNN is selective tier, not dominant tier" callout. If < 0.78, **DO NOT SHIP THE GATE ENABLED.** Ship as research-only, close milestone with `status: shipped-research-only`, never auto-flip to `status: complete`.
3. Add **macro-F1 ≥ 0.55** as a second mandatory gate. AUROC alone hides per-class collapse (see P1-1).

### P0-2. Calibration deferral to U6 is too late — U4's AUROC gate uses uncalibrated probabilities.

**What's wrong.** Plan says: "U4 ships sigmoid outputs; Brier < 0.15 measured in U4; if > 0.15, fit isotonic regression in U6." But:
- **AUROC is calibration-invariant** (it's based on rankings), so the U4 gate can pass with arbitrarily miscalibrated probs. This is OK for AUROC.
- **The threshold of 0.7 in U5 is meaningless on uncalibrated outputs.** A model could have AUROC=0.85 with all positive predictions in [0.3, 0.5] and negatives in [0.1, 0.4] — `MIN_CONF=0.7` would preempt *zero* LLM calls. The "GNN tier" becomes a no-op that closed-out as "shipped."
- **Brier < 0.15** is a calibration gate, but the plan measures it in U4 before any post-hoc fix. If Brier is 0.22 in U4, the gate fails and U4 doesn't ship — but U6 is the unit that contains the fix. Circular dependency.

**Fix.**
1. Move **isotonic regression calibrator** from U6 into U4 as a mandatory training-loop component (not optional). Standard sklearn-style: fit on validation set after early-stopping, apply at inference. ~30 lines of pure JS; PRISM has no sklearn but the algorithm is trivial (pool-adjacent-violators on val predictions).
2. U4 ships two artifacts: `graphsage-best.json` (raw model) + `graphsage-calibrator.json` (isotonic mapping).
3. U4 quality gate becomes: **AUROC ≥ 0.78** (uncalibrated) **AND Brier ≤ 0.15** (POST-calibration on val). If post-cal Brier still > 0.15, the model is fundamentally miscalibrated and shouldn't ship.
4. U6 keeps the *evaluation* of calibration (reliability diagram, per-bucket Brier on held-out test) but no longer owns the *fix*.

### P0-3. Random negative sampling will train the GNN to oppose the milestone's purpose.

**What's wrong.** "3× random `(engine, dispatcher)` pairs with no edge" as negatives. But PRISM's whole reason for this milestone is that **most engines should wire to a dispatcher but haven't yet** — the unwired engines are the prediction target. Sampling random `(unwired_engine, plausible_dispatcher)` pairs as negatives teaches the GNN: "these should NOT wire" — exactly opposite of ground truth.

Concrete example: `KienzleForceModel` (unwired in graph) sampled as negative against `prism_calc` (its correct home). Training drives `P(KienzleForceModel → prism_calc)` down. At inference, the GNN now refuses to predict `prism_calc` for it.

**Fix.** Three-stage negative sampling:
1. **Hard negatives (proven non-wires):** engine-dispatcher pairs where the existing 4-tier heuristic produced confidence < 0.2 in BOTH the keyword tier AND the sibling-prefix tier. These are pairs that two independent signal sources say "definitely not." ~60% of negatives.
2. **Domain-distant negatives:** engine in domain X (e.g., WEDM), dispatcher serving domain Y (e.g., turning). Use the wiki domain bias from `reference_wiki_domain_bias.md` as the domain assignment. ~30% of negatives.
3. **Random negatives (true uniform):** filtered to exclude any pair where either node is currently unwired AND the candidate dispatcher matches the engine's L2 prefix. ~10% of negatives — kept small as a regularizer against overfitting to the hard-negative distribution.

This is **hard negative mining** in the IR-retrieval sense. Cite the paper: Xiong et al. "Approximate nearest neighbor negative contrastive learning" (ANCE), or simpler — the original DPR (Karpukhin 2020) hard-negative scheme.

---

## P1 — should fix; defer-able only with explicit waiver in NN-EVAL.md

### P1-1. Train/val/test split is silent on inductive vs transductive — and the difference is load-bearing.

**What's wrong.** Plan says "70/15/15 split on positive edges." Doesn't say if held-out edges are between nodes that ARE in the training graph (transductive: easier, can leak via shared neighbors) or between nodes ENTIRELY held out (inductive: harder, cleaner generalization claim).

For PRISM's actual deployment scenario — predicting wires for **NEW engines that didn't exist at training time** — the inductive setting is what matters. A transductive AUROC of 0.85 may translate to inductive AUROC of 0.70.

**Fix.**
1. Default to **inductive split**: hold out 200 engine nodes entirely (their incident edges go to test); training graph has zero edges and zero feature aggregation through those nodes.
2. Report both transductive AUROC (for benchmarking against literature) AND inductive AUROC (for deployment honesty) in `NN-EVAL.md`.
3. The U4 gate uses **inductive AUROC** because that's the real deployment metric.

### P1-2. Per-dispatcher class imbalance is severe; macro-F1 is the more honest gate.

**What's wrong.** With 16 dispatchers in `VALID_DISPATCHERS` and ~2-4k positive edges, expected counts:
- `prism_calc`, `prism_cam`, `prism_ai`: hundreds each (well-represented)
- `prism_omega`, `prism_atcs`, `prism_5axis`: tens or fewer (severe minority)
- 600 val + 600 test → ~37 per class on average, but minority classes get **5-10 samples** → AUROC unreliable, F1 noisy.

The plan's aggregate AUROC could be 0.85 while `prism_omega` F1 is 0.0 (predicts nothing for it). The gate passes; the actual deliverable is broken for 5/16 dispatchers.

**Fix.**
1. Add **macro-F1 ≥ 0.55** as second mandatory gate (per P0-1).
2. `NN-EVAL.md` reports per-dispatcher F1 with sample-count next to each — minority-class numbers are surfaced, not hidden.
3. Consider **focal loss** (γ=2) as alternative training objective if BCE produces dispatchers with F1 = 0. Plan should name this explicitly as the first failover, not just "tune learning rate."

### P1-3. Loss/optimizer/schedule choices are reasonable but plan names no alternatives — defaults-only is a footgun on small data.

**What's wrong.** Adam @ lr=1e-3, cosine schedule, 100-step warmup, 50 epochs, dropout 0.3, L2=1e-4, patience 10. Reasonable defaults for ImageNet-scale data; **probably wrong for 2-4k positive edges**:
- L2=1e-4 is too weak for 120k params on 2-4k samples (params:examples = 30:1). Likely overfits hard. Should try L2=1e-3 or 5e-3.
- Dropout 0.3 between SAGE layers but plan doesn't say if BatchNorm is *before or after* activation. Standard practice for SAGE is BN→ReLU→Dropout. Plan says "BatchNorm on hidden" — ambiguous.
- Cosine schedule with 50-epoch max + patience 10 likely triggers early-stop around epoch 15-25 before cosine decay does anything useful. Plan should use **constant lr with patience-based reduction** (ReduceLROnPlateau, factor 0.5, patience 5) on this data size.
- 100-step warmup with batch-size unspecified — on 2-4k positives + 6-12k negatives (3×), 100 steps is < 1 epoch if batch-size is 32. Effectively no warmup; just slow first epoch.

**Fix.** Plan should specify a **named fallback ladder** if defaults don't converge by epoch 10:
1. **Fallback 1** (high overfitting signal: train-val gap > 5% at epoch 10): L2 → 1e-3, dropout → 0.5, halve hidden dim 64 → 32.
2. **Fallback 2** (high underfit signal: train loss not decreasing): switch optimizer to AdamW, lr → 3e-4, lr-schedule → linear-warmup-then-constant.
3. **Fallback 3** (class collapse — one dispatcher dominates predictions): switch BCE → focal loss (γ=2), reweight by inverse-class-frequency.

Document the fallback ladder in U4's plan body so the chat executing U4 doesn't have to invent it under pressure.

### P1-4. Inference latency gate < 5ms/edge is ambiguous and probably wrong.

**What's wrong.** Plan says "< 5ms/edge on 4080." But U5's `predictDispatcher` calls `predict(engineId, dispatcherId)` once **per candidate dispatcher** — 16 forward passes per engine query. At 5ms/edge that's 80ms/query, which on PRISM's hot path (`seed-ghost-llm-classify` already optimized for sub-100ms per engine) is significant.

The gate as written doesn't make clear whether 5ms is per-forward-pass (achievable on 4080) or per-engine-query (16× harder).

**Fix.**
1. Specify: **< 5ms per forward pass, < 80ms per engine-query (16 dispatchers)**. Add a third gate: **< 200ms p99 per engine-query** end-to-end (load checkpoint + features + 16 forwards + arg-max + reason string).
2. Add a **batched-inference path**: `predictAllDispatchers(engineId) → Map<dispatcherId, prob>` that does the 16 forwards in a single batch of 16 — typical 4080 throughput collapses 16× sequential to ~1.5× batched. Plan U5's tests around this.

### P1-5. Continual learning — EWC is mentioned for `CrossProcessNeuralLearningEngine` but not adopted for GraphSAGE.

**What's wrong.** Plan says "cron weekly retrain — training is cheap (<1h on 4080)" and explicitly does *not* claim catastrophic-forgetting protection. But:
- Full retrain weekly means every Monday the model is brand-new — no continuity with the model that served predictions Sat/Sun.
- The graph CHANGES weekly (new engines, new wires from manual labeling). Predictions on a stable engine can drift wildly week-to-week as the training graph shifts under it.
- EWC (or simpler: warm-start from last week's checkpoint + low lr) is cheap and addresses this.

**Fix.** Add to U4: **warm-start from previous best checkpoint if present**, lr halved for warm-start runs. EWC is overkill; warm-start gets 80% of the benefit at 5% of the complexity. Document the trade-off in U4 wiki entry.

---

## P2 — nice to have

### P2-1. The 200-engine holdout is built by U6 but consumed by U4 — circular if U4 runs first.

Plan acknowledges this ("U6 starts BEFORE U4 finishes — runs in parallel with U2+U3 once U1 is done") but the dependency graph in the table shows U4 → U6. The DAG should explicitly split U6 into **U6a (build holdout, no U4 dep)** and **U6b (run eval, depends on U4+U5)**.

### P2-2. The 50 OOD names in U6 holdout — calibration test for *low* confidence — is good. But "no real dispatcher should match with high confidence" is binary; suggest concrete OOD acceptance criterion.

Fix: **Median GNN confidence on OOD set < 0.4** AND **top-1 confidence > 0.7 on < 5% of OOD samples**. If GNN confidently predicts dispatchers for `XyzzyFooBarEngine`, it's overconfident generally and the calibrator hasn't done its job.

### P2-3. Wiki entry for `system-viz-edge-typology` should freeze the 49→7 mapping as a hash-locked table.

The 7-type ontology is load-bearing for the GNN's message-passing semantics. Any future contributor extending edge types should bump the ontology version and retrigger training. Plan should specify `EDGE_TYPE_MAP_VERSION = 1` in U1, with a hash-check at training time.

---

## Recommended changes to plan before ExitPlanMode

- [ ] **Lower primary AUROC gate to 0.78**, keep 0.85 as stretch; add `macro-F1 ≥ 0.55` as parallel mandatory gate (P0-1).
- [ ] **Move isotonic calibrator from U6 into U4** as mandatory training-loop component; U4 ships `graphsage-best.json` + `graphsage-calibrator.json` (P0-2).
- [ ] **Replace random 3× negatives with 60/30/10 hard-mined / domain-distant / filtered-random** (P0-3).
- [ ] **Declare split as inductive** (200 entire engines held out); report both transductive + inductive AUROC; gate uses inductive (P1-1).
- [ ] **Specify per-dispatcher F1 reporting in NN-EVAL.md**; surface minority-class counts (P1-2).
- [ ] **Add named 3-rung fallback ladder** for U4 if defaults don't converge by epoch 10 (P1-3).
- [ ] **Disambiguate latency gate**: < 5ms/forward, < 80ms/query (16 dispatchers), < 200ms p99 end-to-end; add batched-inference path (P1-4).
- [ ] **Add warm-start from previous checkpoint** for weekly retrains, lr halved (P1-5).
- [ ] **Split U6 into U6a (holdout build) + U6b (eval run)** to make the U4 dependency honest (P2-1).
- [ ] **Concrete OOD acceptance criterion**: median conf < 0.4 on OOD, < 5% with conf > 0.7 (P2-2).
- [ ] **Hash-lock the 49→7 edge ontology** in U1; gate retrains on version bump (P2-3).

If none of the above lands, the milestone can still ship — but the U4 gate will pass or fail for the wrong reasons, and `NN-EVAL.md` will not be the honest arbiter the plan claims.

---

**Reviewer:** plan-scrutiny arm B (training rigor + quality gates + ML soundness).
**Read-only.** No edits or builds performed.
