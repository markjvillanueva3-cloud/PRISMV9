# HIGH-ROI-AI-PSN-SCOPE — exhaustive enumeration of viable RAG + NN/GNN + ML + DL builds wired across PSN
**Created:** 2026-05-23 (slot golf, claude-9fbbe420)
**Status:** PLANNING SCOPE — no builds in this artifact. Each unit is intended for downstream pickup.
**Scope mandate:** `[ scope high roi builds for RAG + Neural network + GNN + Machine Learning + deep learning across the entire PSN | completed and wired to all viable nodes + synergized to PSN ]`

## PSN legs (canonical 11)
1. Obsidian brain (memory vault)
2. PRISM OS (`prism_operating_system` dispatcher)
3. Wiki (`knowledge/wiki/`)
4. Memories (`knowledge/memories/`)
5. Tribal (`tribal-embed-index.json` + the 4 inject hooks)
6. System-Viz (`/system-viz`, `system-graph.json`, roost generators)
7. Engines (`mcp-server/src/engines/*.ts`)
8. Algorithms (`mcp-server/src/algorithms/*.ts`)
9. Formulas (`mcp-server/src/physics/constants.ts` + `formulas/`)
10. NN/GNN (`state/shared/nn-graph/`, GraphSAGE tier-5)
11. PRISM AI (`prism_ai` dispatcher)

---

# A. RAG track (retrieval-augmented generation) — 10 units

Status legend: ✅ shipped · 🟡 in-flight · ⏸ deferred/blocked · 🆕 new in this scope

| # | Unit | Why | Depends on | Blocks | PSN legs | Status |
|---|---|---|---|---|---|---|
| A1 | `U-RAG-1` wiki corpus embed | 4 inject hooks need >0% wiki coverage to work | Ollama + nomic-embed-text | A3, A8, A9, A10 | 3,5,11 | 🟡 (5500/33027 entries, ~17%; durable resumable) |
| A2 | `U-RAG-2` two-stage lexical rerank | First-stage BM25 alone surfaces noise; rerank narrows | A1 | A4 | 5,11 | ✅ shipped 2026-05-22 (4 hooks) |
| A3 | `U-RAG-3` contextual blurb embed | Anthropic technique: −35-49% failed retrieval by prepending blurb | A1 + Ollama qwen2.5-coder | A4 | 3,5 | ✅ lib shipped; 🟡 corpus pass 3000/2352+ withCtx |
| A4 | `U-RAG-4` edge-ordering + synergy | "Lost in the middle" — strongest hits head+tail | A2, A3 | (nothing downstream) | 5,6,10 | ✅ shipped 2026-05-22 |
| A5 | `U-RAG-5` retrieval eval harness | precision@k/recall@k baseline — changes were unmeasurable before | (nothing) | A1..A4 ranking | 11 | ✅ shipped |
| A6 | `U-RAG-6-GPU-EMBEDDER-MIGRATION` | Swap nomic 768d → nv-embedqa-e5-v5 1024d for joint corpus+query upgrade | NIM GPU service + index rebuild | A1, A3, A7 | 3,5,10,11 | ⏸ deferred; requires joint migration |
| A7 | `U-RAG-RERANK-LLM` 🆕 | Stage-3 cross-encoder beats lexical-only Stage-2 (+15-30% precision per spec § U-RAG-2) | bge-reranker-v2-m3 pull OR deepseek-r1:14b score | A8 | 5,11 | 🆕 — deferred from this session (Ollama CLI path issue) |
| A8 | `U-RAG-HYDE` 🆕 | Hypothetical Document Embeddings: terse-query recall boost (HyDE paper 2022) | A1, qwen2.5-coder:14b | A10 | 5,11 | 🆕 |
| A9 | `U-RAG-MULTI-HOP` 🆕 | retrieve→reason→re-retrieve for cross-domain bridges (the bridge-synergy graph layer) | A1, A2, A3 | A10 | 5,7,11 | 🆕 |
| A10 | `U-RAG-QUERY-EXPANSION` 🆕 | LLM-generated query variants → retrieve union → dedupe → rerank | A1, A2, A7 | (nothing) | 5,11 | 🆕 |
| A11 | `U-RAG-CHUNK-SEMANTIC` 🆕 | Semantic-cluster chunking vs per-file naive — better intra-file recall | A1 | A1 future re-embed | 3,5 | 🆕 |
| A12 | `U-RAG-METADATA-PREFILTER` 🆕 | Pre-filter by domain/tag/layer before vector search (lower noise, faster) | A1 | (nothing) | 5,6,11 | 🆕 |
| A13 | `U-RAG-CONTEXT-COMPRESSION` 🆕 | LLM-compress top-k chunks → 3× more fit in Claude context | A1, qwen2.5-coder:14b | A14 (next-gen inject hooks) | 1,5,11 | 🆕 |
| A14 | `U-RAG-OBSIDIAN-INDEX` 🆕 | Index memories vault too (currently wiki-only); the 5 memory subdirs carry shipped doctrine | A1 pattern | (nothing) | 1,4,5 | 🆕 |
| A15 | `U-RAG-CODE-EMBED` 🆕 | Embed `src/engines/*.ts` + `scripts/*.mjs` as code-corpus; code-search becomes RAG | A1 pattern | A16 | 5,7,11 | 🆕 |
| A16 | `U-RAG-AUTO-CITATION` 🆕 | Inject hooks emit citations (which wiki entries informed the answer) — operator trust | A1 | (nothing) | 1,3,5 | 🆕 |

---

# B. NN / GNN track (GraphSAGE tier-5 + extensions) — 11 units

Status legend: ✅ shipped this fleet · 🟡 in-flight · ⏸ blocked

| # | Unit | Why | Depends on | Blocks | PSN legs | Status |
|---|---|---|---|---|---|---|
| B1 | `NN-GRAPH-MS0/U4` GraphSAGE trainer | Tier-5 wiring-cascade for UNKNOWN ghost-engine classification | system-graph.json | B2..B11 | 6,7,10 | ✅ |
| B2 | `NN-GRAPH-MS1/U-NNG-PIPELINE-STRATIFIED-WIRE` | Stratified neg-sampling matches eval AUROC to train | B1 | B5 | 10 | ✅ |
| B3 | `NN-GRAPH-MS2/U1` reference-pool seed | Self-retrain needs a real pool, not 0 ghosts | B1, regen-viz | B4 | 6,10 | ✅ |
| B4 | `NN-GRAPH-MS2/U2-SELF-RETRAIN-LIFECYCLE` | Autonomous half — durable scheduled task | B1, B3 | B5..B11 | 2,10 | ✅ |
| B5 | `NN-GRAPH-MS2/NN-1-768D-FEATURES` | Swap 8-d projected → 768-d wiki embeddings (model-side AUROC lever) | A1 (wiki corpus embed) | B6 | 5,10 | ✅ |
| B6 | `U-GNN-NODE-EMBED-BRIDGE` | Map graph node.id → wiki path → 768-d vector (the missing mapping the empirical retrain exposed) | A1, B5 | B7 | 3,5,6,10 | ✅ shipped this session (e853edcf93) |
| B7 | `U-NN-TRAINER-EXPORT-RESTORE` | `positiveTypeMarginal` + `sampleStratifiedNegativeEdges` were lost; retrain silent-fails to AUROC=0.5 | B2 | B8..B11 | 10 | ✅ shipped this session (29529f05b2) |
| B8 | `U-NN-RETRAIN-EXECUTE` 🆕 | Actually run retrain with bridge JSONL; measure new AUROC vs 0.78 gate | B6, B7 | B9, promotion | 6,10 | 🆕 — next retrain tick should do this auto-magically; needs operator verification |
| B9 | `U-NN-TIER4-LLM-FALLBACK` 🆕 | When GraphSAGE confidence < threshold → deepseek-r1:14b reasoning | B8 + Ollama | (nothing) | 10,11 | 🆕 |
| B10 | `U-NN-NODE-CLASSIFICATION` 🆕 | Separate head: ghost.unwired-engine → suggested-dispatcher (currently 1-hop heuristic) | B1 | B11 | 6,7,10 | 🆕 |
| B11 | `U-NN-GAT-ATTENTION` 🆕 | Swap GraphSAGE → Graph Attention Network for attention weights = explainability | B1 | B12 | 10 | 🆕 |
| B12 | `U-NN-FEATURE-AUGMENT` 🆕 | Concatenate hand-features (in/out degree, betweenness, PageRank) to 768-d | B5 | (nothing) | 10 | 🆕 |
| B13 | `U-NN-DRIFT-DETECTOR-V2` 🆕 | Current drift is graph-size only; add embedding-distribution drift (KS test) | B4 | (nothing) | 10 | 🆕 |
| B14 | `U-NN-EVAL-V2` 🆕 | Stratified holdout (current is random); per-node-type AUROC breakdown | B4 | better promotion gating | 10 | 🆕 |
| B15 | `U-NN-CALIBRATION-V2` 🆕 | Temperature scaling per node-type vs single isotonic threshold | B4 | (nothing) | 10 | 🆕 |
| B16 | `U-NN-EXPLAINABILITY` 🆕 | Output top-k contributing neighbors per prediction (GNNExplainer or attention) | B11 (or B1) | operator trust | 6,10 | 🆕 |
| B17 | `U-NN-HARD-NEGATIVE-MINING` 🆕 | Use model's own top errors as next-batch negatives vs random sampling | B2 | (nothing) | 10 | 🆕 |
| B18 | `U-NN-EDGE-PREDICTION-DIRECTED` 🆕 | Currently undirected; add directed (X imports Y, X calls Y) | B1 | better dispatcher-wire suggestions | 10 | 🆕 |

---

# C. Machine Learning track (supervised / unsupervised / RL) — 11 units

| # | Unit | Why | Depends on | Blocks | PSN legs | Status |
|---|---|---|---|---|---|---|
| C1 | `U-ML-CAM-STRATEGY-CLASSIFIER` 🆕 | Classify ops (rough/finish/contour/drill) from CAM params; supervised on JM Die corpus | JM Die labeled data | C2 | 7,11 | 🆕 |
| C2 | `U-ML-TOOL-LIFE-REGRESSOR` 🆕 | Predict tool wear/life from (material, vc, fz, ap) → cycles; replaces Taylor when data is sufficient | Taylor canonical data + shop-floor cycles | (nothing) | 7,9,11 | 🆕 |
| C3 | `U-ML-FEED-OPTIMIZER-RL` 🆕 | RL agent for feed override; reward = MRR×cycle×Q − chatter/breakage penalty | shop-floor signals + simulator | (nothing) | 7,11 | 🆕 |
| C4 | `U-ML-SETUP-PLANNER-CLUSTERING` 🆕 | Cluster setup sheets to recommend fixture/workholding from part features | JM Die setup-sheet corpus | C5 | 7,11 | 🆕 |
| C5 | `U-ML-QUALITY-PREDICTOR` 🆕 | Predict CPK from (op params, machine health) BEFORE running — go/no-go gate | C1, machine telemetry | (nothing) | 7,11 | 🆕 |
| C6 | `U-ML-PROCESS-DRIFT-SPC` 🆕 | SPC-style drift on shop-floor signals (spindle load, vibration, current) | machine telemetry | (nothing) | 2,7,11 | 🆕 |
| C7 | `U-ML-MATERIAL-CLUSTERING` 🆕 | Cluster materials by machinability → infer missing Kienzle/Taylor coefficients for new alloys | physics canonical constants | C2 | 7,9 | 🆕 |
| C8 | `U-ML-CYCLE-TIME-REGRESSOR` 🆕 | Predict cycle time from (CAM strategy, machine, material, complexity) — quote-accuracy boost | CAM corpus + actuals | (nothing) | 7,11 | 🆕 |
| C9 | `U-ML-POST-CODE-EMBED-CLUSTER` 🆕 | code2vec on JM Die post-processor library → cluster similar customizations for recommendation | JM Die `.cps` corpus | D7 | 7,11 | 🆕 |
| C10 | `U-ML-CHATTER-CLASSIFIER-AUDIO` 🆕 | Train on chatter audio recordings → real-time chatter detection (when mic integration exists) | mic + labeled audio | (nothing) | 7,11 | 🆕 (depends on hardware) |
| C11 | `U-ML-DIAGNOSIS-DECISION-TREE` 🆕 | Decision tree on diagnosis-engine outcomes to learn rule weights | diagnosis training set | (nothing) | 7,11 | 🆕 |

---

# D. Deep Learning track (transformers, vision, audio, LoRA) — 10 units

| # | Unit | Why | Depends on | Blocks | PSN legs | Status |
|---|---|---|---|---|---|---|
| D1 | `U-DL-CAD-VISION-OCR` 🆕 | Wire llama3.2-vision:11b into blueprint OCR pipeline (PMI/GD&T extraction) | llama3.2-vision (pulled) + CAD pipeline | D8 | 7,11 | 🆕 |
| D2 | `U-DL-CAD-CLASSIFIER-CNN` 🆕 | CNN on CAD corpus (62K parts) → part-type (gear/shaft/bracket/housing) | CAD corpus + labels | C1, C4, C8 | 7,11 | 🆕 |
| D3 | `U-DL-FEATURE-RECOGNITION-POINTNET` 🆕 | PointNet++ on point-cloud → adaptive CAM strategy selection | CAD STEP corpus → point-cloud sampling | C1 | 7,11 | 🆕 |
| D4 | `U-DL-SURFACE-FINISH-CNN` 🆕 | CNN on surface micrograph → predict Ra (needs CMM + imaging integration) | imaging hardware + Ra labels | C5 | 7,11 | 🆕 (depends on hardware) |
| D5 | `U-DL-AUDIO-CHATTER-WAV2VEC` 🆕 | Wav2Vec2 + classifier head on chatter audio | mic + labeled audio | C10 | 7,11 | 🆕 |
| D6 | `U-DL-PRISM-LORA-CODE` 🆕 | LoRA fine-tune qwen2.5-coder:14b on JM Die + monolith corpus → PRISM-specific code model | training infra (16 GB VRAM is borderline; 48 GB Ada ideal) | D7 | 7,11 | 🆕 |
| D7 | `U-DL-MASTER-POST-LORA` 🆕 | LoRA fine-tune on Mastercam/hyperMILL/Okuma post examples → custom-post generator | C9 + training infra | (nothing) | 7,11 | 🆕 |
| D8 | `U-DL-GDT-PARSER-SEQ2SEQ` 🆕 | Seq2seq: GD&T callout text → structured tolerance object | D1 + labeled tolerance pairs | C5 | 7,11 | 🆕 |
| D9 | `U-DL-CROSS-PROCESS-CAUSAL-NCM` 🆕 | Neural causal model: CAM choices → quality outcomes across JM Die history | JM Die outcome corpus | C5 | 7,10,11 | 🆕 |
| D10 | `U-DL-LSTM-TOOL-WEAR-RUL` 🆕 | LSTM on spindle-load time-series → RUL (remaining useful life) | machine telemetry | C2 | 7,11 | 🆕 |

---

# E. Cross-cutting AI infrastructure — 7 units

| # | Unit | Why | Depends on | Blocks | PSN legs | Status |
|---|---|---|---|---|---|---|
| E1 | `U-AI-FEATURE-STORE` 🆕 | Central feature extraction + caching across all 30+ models — DRY for features | (nothing) | every ML/DL model | 2,4,7,11 | 🆕 |
| E2 | `U-AI-EXPERIMENT-TRACKING` 🆕 | Extend `ai_training_ledger_*` actions to full MLflow-style run tracking | existing `aiReasoningDispatcher` | E3 | 2,11 | 🆕 (partial — actions exist) |
| E3 | `U-AI-MODEL-REGISTRY` 🆕 | Versioned model + deploy-gate metadata (which model trained on which data when) | E2 | E4, B8 promotion | 2,11 | 🆕 |
| E4 | `U-AI-EVAL-HARNESS-UNIFIED` 🆕 | Single test fixture set across all 10+ ML/DL models (consistent precision/recall/AUC) | E3 | promotion gating | 11 | 🆕 |
| E5 | `U-AI-DATA-VALIDATION-PIPELINE` 🆕 | Schema validation + drift detection on input data BEFORE training (R12 fail-loud) | (nothing) | every training run | 11 | 🆕 |
| E6 | `U-AI-INFERENCE-ROUTER` 🆕 | Runtime route: tier1=Ollama → tier2=PRISM-LoRA → tier3=Claude API by complexity | aiSystemRouterEngine exists; extend | every dispatcher call | 11 | 🆕 (partial) |
| E7 | `U-AI-CONTEXT-PROVENANCE` 🆕 | Every inference logs (model, version, inputs hash, output, ts) for audit | E2 | shop-floor Ω≥0.95 audit trail | 1,2,4,11 | 🆕 |

---

# Total: 48 unit-class items across A/B/C/D/E

## ROI ranking (top 10 — operator pickup order)

| Rank | Unit | Reason it's #1-class |
|---|---|---|
| 1 | **A1 (finish corpus pass)** | Every other RAG unit unblocks once coverage ≥ 80% — the single compounder |
| 2 | **B8 (run the retrain, verify AUROC)** | Closes the unblock the bridge + trainer-restore enabled — 5 min of work + measures whether the chain produced real lift |
| 3 | **A7 (LLM/cross-encoder rerank Stage-3)** | Spec § U-RAG-2 expected +15-30% precision; currently lexical-only |
| 4 | **E1 (feature store)** | Every C/D unit assumes one; building it first prevents 10× duplicate feature code |
| 5 | **D1 (blueprint OCR vision wire)** | llama3.2-vision is pulled, idle. Blueprint OCR is the bottleneck of the print-to-program pipeline |
| 6 | **C1 (CAM strategy classifier)** | Labeled training data already exists in JM Die corpus; 1-week unit |
| 7 | **B9 (NN tier-4 LLM fallback)** | deepseek-r1:14b is loaded, fleet-reaper prewarms it. Wire is small |
| 8 | **C8 (cycle-time regressor)** | Direct revenue impact via quote accuracy; existing JM Die actuals are the training set |
| 9 | **A14 (Obsidian memories index)** | Wiki RAG works; the memory vault contains the standing-doctrine feedback memories that should also retrieve |
| 10 | **A8 (HyDE)** | Cheap; just needs a query-rewrite hop before retrieve; major recall boost on operator's terse shop-floor queries |

## PSN-leg synergy matrix (which legs each unit class touches)

| Leg | RAG (A1-16) | NN/GNN (B1-18) | ML (C1-11) | DL (D1-10) | Infra (E1-7) |
|---|---|---|---|---|---|
| 1 Obsidian brain | A13, A14, A16 | — | — | — | E7 |
| 2 PRISM OS | — | B4 | C6 | — | E1, E2, E3, E7 |
| 3 Wiki | A1, A3, A6, A11, A14, A16 | B6 | — | — | — |
| 4 Memories | A14 | — | — | — | E1, E7 |
| 5 Tribal | A1-15 | B5, B6 | — | — | — |
| 6 System-Viz | A12 | B3, B4, B6, B8, B10, B16 | — | — | — |
| 7 Engines | A15, A9 | B1, B10, B18 | C1-11 | D1-10 | E1 |
| 8 Algorithms | — | B1, B2, B11, B17, B18 | C3, C7 | D3, D8, D9, D10 | — |
| 9 Formulas | — | — | C2, C7 | — | — |
| 10 NN/GNN | A4, A6 | B1-18 | — | D9 | — |
| 11 PRISM AI | A1-16 | B9 | C1-11 | D1-10 | E2-7 |

## Sequencing (DAG)

```
                 A1 (RAG-1 wiki embed) ──┬─→ A3 (contextual) ──┐
                                          ├─→ A6 (GPU embedder) ─┼─→ A2 → A4 → A5
                                          ├─→ A11, A14, A15 ────┘
                                          ├─→ A7 → A8, A9, A10, A12, A13, A16
                                          └─→ B5 (768-d swap) ──→ B6 (bridge) ──→ B7 ──→ B8 ──→ B9..B18
                                                                                              ↑
                                                                  E1 (feature store) ─────────┤
                                                                  E2 → E3 → E4 ───────────────┤
                                                                  E5, E6, E7 ─────────────────┘

                              D1 (vision OCR) → D8 (GD&T parser) ──┐
                                                                    ├─→ C5 (quality predictor)
                              C1 (CAM classifier) → D2 (CAD CNN) ──┤
                                                                    │
                              D3 (PointNet) → C1 path ──────────────┤
                                                                    │
                              C9 → D7 (master-post LoRA) ───────────┘
                              D6 (PRISM LoRA code) — independent

                              C10 ← D5 (chatter) ← hardware mic
                              D4 (surface CNN) ← hardware imaging
                              C2 → C5  · C2 ← D10 (LSTM tool wear)
                              C6 → C5  · C7 → C2 · C8 — independent revenue unit
                              C3 (RL feed) ← C5 ← C6 (simulator-coupled)
```

## Variability axes pinned (per planning-scope §3)

- **RAG configs:** {query-type: terse / verbose / structured / code-symbol} × {corpus: wiki / memory / code} × {rerank tier: none / lexical / LLM / cross-encoder}
- **NN/GNN configs:** {feature dim: 8 / 768 / 768+hand} × {model: GraphSAGE / GAT / hybrid} × {neg sampling: uniform / stratified / hard-mining} × {calibration: none / isotonic / per-type temp}
- **ML configs (most domain-specific):** {material: P/M/K/N/S/H} × {process: mill/lathe/wedm/grind} × {machine class: 3-axis VMC / 5-axis HMC / lathe / wedm}
- **DL configs:** {modality: text / vision / audio / point-cloud} × {fine-tune scheme: full / LoRA / adapter} × {base model: 7B / 14B / 70B}
- **Adversarial axes for ALL:** NaN inputs, empty inputs, oversize (10× budget), wrong-dim (loader fail-loud), data-leak (test in train), distribution shift (eval set drawn from different domain)

## Hardware tier dependencies

- **RTX 4080 SUPER 16 GB (current):** A1-16, B1-18, C1-11 (small models), D1, D5 (inference only), E1-7. **Blocked: D6 LoRA 14B, D7 LoRA master-post, D2 CNN training >batch-32**
- **RTX 6000 Ada 48 GB (proposed):** all of the above + D2/D3 training at full batch, D6 LoRA 14B, 70B-model inference for B9 tier-4 fallback, joint A6 GPU-embed migration practical
- **RTX 6000 Blackwell 96 GB:** D7 LoRA 72B-class master-post, 405B inference, ensemble inference for C5 shop-floor go/no-go

## Operator notes

- Per `feedback_high_roi_backend_first_slot_queue` and `feedback_prioritize_devtools_backend` — pick from this spec preferring E (infra) > A1, B8 (completing in-flight) > C8 (revenue) before any speculative new train.
- Per `feedback_do_optional_high_roi_work` — operator may proactively suggest in-scope items from this list during any /checkin or /loop session.
- This scope is ADVISORY. Each unit row above is the minimum spec for a future pickup; round-trip implementation requires the usual per-unit spec + 3-of-3 scrutiny + per-file scrutiny on multi-file builds.
