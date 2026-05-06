---
name: cad-fusion-live-ms0-integration-discovery
type: lesson
tags: [cad, fusion-live, training, integration, github, research]
session: 5ea0222e
date: 2026-05-06
parent_milestone: CAD-FUSION-LIVE-MS0
---

# CAD-FUSION-LIVE-MS0 Integration Discovery — Local + GitHub

Two parallel research arms surveyed (a) PRISM engines on disk that should feed the new training surface and (b) open-source projects on GitHub that would meaningfully improve it. Both reports below are ranked by ROI, ruthless about practical adoption, and scope-bounded to print-to-CAD visual-fidelity gains (not just volumetric match).

---

## Part A — Local engines on H: drive

**Tier 1 — wire NOW (5 engines, real fidelity gain):**

1. **STEPGeometryParserEngine** (already shipped) — currently `WIRE-EXEMPT`, only consumed by a script. Add `evidenceForFeatureKinds(parseResult)` and call from `CADCorpusFeaturePrevalenceLearnerEngine.learnPrevalence()` to displace the broken filename-token signal. Single highest-leverage fix on the branch — the prevalence learner's own header documents the failure.
2. **CADRetrievalAugmentationEngine** + **CADFeatureEmbeddingEngine** — RAG over the JM Die corpus to pull k=5 most-similar punches as build exemplars. The class-feature library encodes shop conventions; RAG encodes *this customer's* conventions. Biggest visual-fidelity lever — directly addresses 2475-037 failure mode (right volume, wrong shape because no per-customer style anchor).
3. **CADAccuracyValidatorEngine** — 5-layer validator (Hausdorff distance, topology, DFM, tolerance stack, visual-feature comparison). `cadAITrainingSurface()` returns `predicted_fidelity` but has no post-build validation. Wire as a sibling `validateBuildFidelity()` method on master CAD brain. Closes the corpus → library → live-bridge → outcome loop.
4. **CADKnowledgeGraphEngine** — DAG enforcement on the build sequence. Fillet on working-tip taper references the taper which references the stepped-axis. Today the orchestrator builds in list order and hopes references resolve; the graph engine enforces the actual dependency structure and detects cycles + orphans before the live build fires.
5. **CADDrawingKnowledgeEngine** — ASME Y14.5-2018 GD&T rules with machining-impact mappings. `BlueprintVisionOCREngine` extracts GD&T frames as raw symbols; the class-feature library has zero GD&T awareness. Wire `lookupRule(symbol)` into `buildSequenceFor()` so cylindricity 0.003 to datum A becomes a turn-then-grind strategy, not a generic crossDrillHoles call.

**Tier 2 — defer (real but redundant or premature):** CADGeometricAugmentationEngine, CADRegenerationTestEngine (overlaps Tier 1 #3), CADGeometryComparisonEngine (subset of #3 layer 5), CADParameterPredictorEngine, CADFeatureClassifierEngine, CADIntentDecomposerEngine, CADReasoningChainEngine, CADAssemblyGraphEngine, CADRevisionDetectorEngine, MasterAITrainingLedgerEngine, BlueprintToCADGenerationEngine.

**Reject (duplicates/stubs):** CADFeatureRecognitionEngine (header says "real engine never existed, returns empty features"), CADSearchUniversalEngine (orthogonal — user-facing search, not training), BlueprintOCREngine vs Vision (text fallback only, no new wiring needed).

---

## Part B — GitHub projects ranked by ROI

| # | Repo | License | Maturity | Cost | Surface | Why |
|---|------|---------|----------|------|---------|-----|
| 1 | **AAGNet** github.com/whjdark/AAGNet | MIT | Active | 2-3w | Replaces filename-token learner | Multi-task GNN for B-Rep machining feature segmentation. Ships **MFInstSeg dataset (60K labeled STEPs)** — direct pretraining for punch/die. |
| 2 | **CAD-Recode** github.com/filaPro/cad-recode | Apache 2.0 | Active (ICCV 2025) | 3-4w | Direct alternative to fidelity scoring | SOTA point-cloud → executable CadQuery code. Outputs are parametric, not volumetric — fixes the working-tip-taper / shoulder-fillet miss class structurally. |
| 3 | **BRepNet** github.com/AutodeskAILab/BRepNet | Apache 2.0 | Stable | 1-2w | Plug-in upgrade to STEP parser | Topological message passing on B-Rep. PRISM counts entities textually; BRepNet uses real face/edge graph. Pretrained, Autodesk-backed. |
| 4 | **Fusion 360 Gallery** github.com/AutodeskAILab/Fusion360GalleryDataset | CC BY-NC-SA (verify) | Stable | 1w | Pretraining corpus | 8,625 human design sequences with full sketch+extrude provenance. Best public corpus for build sequence learning. **Non-commercial** — verify deployment plan. |
| 5 | **ABC Dataset** deep-geometry.github.io/abc-dataset | MIT (data) | Stable | 1w | Mass pretraining | 1M parametric CAD models with curve/surface params, sharp-feature annotations. PRISM's 11,695 files too small to train modern GNNs alone — ABC is the obvious supplement. |
| 6 | **occt-import-js** github.com/kovacsv/occt-import-js | MIT | Active | <1w | Drop-in STEP parser replacement | Emscripten OCCT — full topology, runs in Node. Removes ISO 10303-21 entity-counting heuristic entirely. |
| 7 | **eDOCr2** github.com/javvi51/edocr2 | MIT | Active (2025) | 2-3w | New surface — print PDF → structured dims | YOLOv11 + VLM hybrid. **94.77% precision on GD&T detection, F1=97.3%**. Fills the front of the pipeline. |
| 8 | **BrepMFR** github.com/zhangshuming0668/BrepMFR | MIT | Active | 2w | Parallel to AAGNet | Transformer + GAT with **domain adaptation** — handles synthetic→real distribution shift (the exact problem PRISM hits going clean STEP → messy JM Die files). |
| 9 | **Point2CAD** github.com/prs-eth/point2cad | MIT | Stable | 3-4w | New capability — scan → CAD | Reverse-engineers point clouds → analytic surfaces. Lower priority than CAD-Recode but more general for scanned-part inputs. |
| 10 | **DeepCAD** github.com/rundiwu/DeepCAD | MIT | Stable | 2-3w | Construction grammar pretraining | Transformer over CAD commands. Best for learning extrude→fillet→chamfer ordering — exactly what 2475-037 missed. |
| 11 | **build123d + CadQuery** github.com/gumyr/build123d, github.com/CadQuery/cadquery | Apache 2.0 / Apache 2.0 | Active | <1w | Replaces hand-tuned Fusion scripts | Pythonic OCCT-backed parametric CAD. CAD-Recode emits CadQuery directly. Far better build target than Fusion API for the training loop. |
| 12 | **BRepMAE** github.com/yyyycccccc/BRepMAE | MIT | Active (2026) | 2w | SSL backbone for ALL B-Rep tasks | Masked autoencoder on B-Rep — the BERT-equivalent for CAD. PRISM's 11,695 unlabeled local files = perfect SSL pretraining data. |

**Rejected:** ShapeNet/PartNet (non-commercial, mesh-only), Vitruvion/Sketch2CAD/SkexGen/ComplexGen (subsumed by CAD-Recode/DeepCAD), GenCAD (third-party reproduction only), Thingi10K (hobbyist meshes), BrepGen (generative diffusion, wrong direction).

### Top 3 GitHub integrations by ROI

1. **Week 1-2: occt-import-js + BRepNet** — fixes shoulder-fillet/base-chamfer miss class because PRISM stops being blind to face adjacency. Cost: 2 dev-weeks, no GPU needed.
2. **Week 3-6: AAGNet + MFInstSeg pretrain → JM Die fine-tune** with BRepMAE SSL on the 11,695 local files first. Replaces the broken filename-token learner (22/23 false negatives) with a real feature recognizer. Cost: 3 dev-weeks + 1 GPU-week.
3. **Week 7-10: CAD-Recode → CadQuery → Fusion 360 round-trip** — output is a build sequence with explicit fillet/chamfer/taper operations. The missed working-tip taper becomes a parameter to predict, not an emergent property to hope for. Cost: 4 dev-weeks + GPU for inference.

---

## Key risks

- **License audit before commercial use** — Fusion 360 Gallery is CC BY-NC-SA (non-commercial); ShapeNet/PartNet non-commercial. Verify each repo's LICENSE at integration time.
- **STEP support varies** — AAGNet/BrepMFR expect MFCAD-style STEP; PRISM's IPT/SLDPRT need conversion to STEP first via FreeCAD or pythonOCC.
- **GPU requirement** — BRepNet/AAGNet/BRepMAE/CAD-Recode all need at least one decent GPU for fine-tuning; inference can run CPU but slowly.

---

## Combined sequencing (local + GitHub)

**Week 0 (immediate, free wins):** Wire local Tier 1 #1 (STEP parser → prevalence learner) — already on disk, no external deps. Drops `WIRE-EXEMPT` and replaces the broken filename-token signal in days, not weeks.

**Week 1-2:** Local Tier 1 #2-5 (RAG, validator, knowledge graph, GD&T rules). All on disk, all unblocked.

**Week 2-4:** GitHub #6 (occt-import-js) replaces text-based STEP parser with real OCCT topology.

**Week 4-8:** GitHub #1 (AAGNet) + #12 (BRepMAE) — pretrain on local corpus, fine-tune on labeled JM Die subset.

**Week 8-12:** GitHub #2 (CAD-Recode) + #11 (build123d/CadQuery) — output target switches from Fusion 360 Python to executable CadQuery.

The 5 local wires alone are likely sufficient to fix the 2475-037-class failure mode. GitHub additions are force multipliers that get us from "matches volume + most features" to "matches CMM at JM Die."
