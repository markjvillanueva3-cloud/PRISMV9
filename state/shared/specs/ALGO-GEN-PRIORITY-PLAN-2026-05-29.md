# Algorithm-Generation Priority Plan — slot:tango (2026-05-29)

> Operator /goal: *"generate algorithms to improve efficiency, productivity and feature enhancements in priority order: ai systems, lora, nn, gnn, deep learning, deep reasoning, sfc, cad, cam, mill, lathe, wire, post, quoting, erp | goal clear: wired, tested, validated and synergized to all compatible galaxies, PSN and SystemViz"*.
>
> **Discovery-first, deduped** against the 115 existing `mcp-server/src/algorithms/*.ts` + the `prism_algorithm` action groups (signal/control/opt/num/graph/search/interp/toolpath/surface). Advisory — each item carries a dedup grep; run `duplicationGuardEngine.mustCheckBeforeCreating()` before building.

## Status legend
✅ shipped this session · 🔜 next (high-leverage, low-friction) · ◻ queued · 🔗 synergy-wire of an EXISTING algorithm (no new build)

## Ranked queue

| # | Algorithm | Priority domain | Status | Leverage / why | Dedup grep |
|---|-----------|-----------------|--------|----------------|------------|
| 1 | **HeterophilyAwareAggregator** (H2GCN) | nn / gnn | ✅ `985e96ec37` | Unblocks the deferred NN/GNN PSN leg #10 (AUROC 0.096 heterophily); model-side lever named in CLAUDE.md NN-1. Wired `prism_algorithm:graph_heterophily_aggregate`, 31 tests. | `heterophil\|h2gcn` → none |
| 2 | **`ml_*` dispatcher action group** | ai / nn / deep-learning | 🔗 next | 9 ML algorithms exist as files but are UNWIRED to `prism_algorithm` (NeuralInference, ActivationFunctionsAlgorithm, RegressionEngine, DecisionTreeClassifier, ClusteringEngine, DBSCANAlgorithm, KMedoidsAlgorithm, TSNEAlgorithm, EnsemblePredictorModel). Highest ROI: coverage win, no new code. | grep `ml_` in algorithmDispatcher → absent |
| 3 | **LowRankDecomposition** (randomized/truncated SVD) | lora | 🔜 | The math core under ~95 LoRA engines; NO SVD/low-rank primitive in algorithms/. Serves every LoRA adapter (rank selection, weight compression). | `svd\|low.?rank\|randomized` → none in algorithms/ |
| 4 | **AttentionMechanism** (scaled dot-product / multi-head) | deep-learning | 🔜 | Foundational DL primitive; none exists. Feeds CAM/CAD/CNC deep-learning engines + cross-process attention engines. | `attention` → engines only, no algorithm |
| 5 | **MonteCarloTreeSearch** (UCT) | deep-reasoning | ◻ | search_* has astar/beam/ida/rbfs but NO MCTS — the canonical reasoning/planning search. | `mcts\|monte.?carlo.?tree\|uct` → none (MonteCarlo.ts is sampling, not MCTS) |
| 6 | **LayerNorm / BatchNorm normalizer** | deep-learning | ◻ | Normalization primitive for any NN feature pipeline (incl. feeding #1's embeddings). | `layernorm\|batchnorm` → none |
| 7 | SFC multi-objective tradeoff | sfc | 🔗 | Synergy-wire existing HypervolumeIndicator + MOEAStoppingCriterion into speed-feed Pareto selection (MRR vs tool-life vs Ra). Physics models already exist — do NOT rebuild Kienzle/Taylor. | existing |
| 8 | Mesh quadric-edge-collapse simplification | cad | ◻ | CAD has GeometryEngine/MeshEngine but no LOD/decimation primitive. | `quadric\|decimat\|simplif` in algorithms/ → none |
| 9 | Toolpath corner-smoothing (G64-style) | cam | ◻ | toolpath_* has morph/trochoidal/adaptive/rest; no corner-rounding/look-ahead smoother. | `corner.?smooth\|look.?ahead` → none |
| 10 | Price-elasticity optimizer | quoting | ◻ | quoting has QuoteConfidenceEstimator/CustomerLtvDcf/PriceBreakOptimizationFormula; gap = demand-elasticity-aware price point. Coordinate with charlie. | `elasticit` → none |
| 11 | Job-shop scheduler (disjunctive/Giffler-Thompson) | erp | ◻ | ILPAssignment + CriticalPathSchedulingFormula exist; no true job-shop sequencer. Coordinate with hotel. | `job.?shop\|giffler\|disjunctive` → none |

> mill / lathe / wire / post are physics- or dialect-bound and already well-covered by existing models (Kienzle/Taylor/Merchant/FRF/StabilityLobe, WedmLeadInOutGeometry, controller dialects). Their "algorithm" gains are mostly **synergy-wires** of existing primitives, not new generation — flagged 🔗 where they appear.

## Synergy contract (per item — the "goal clear" bar)

Each shipped algorithm must: (1) live in `src/algorithms/` as `Algorithm<I,O>`; (2) be **wired** to `prism_algorithm` (enum + lazy-import case + enum-membership test); (3) carry **real tests** (reference values, ≥3 failure + ≥2 adversarial); (4) declare its **galaxy bridge** (which slot's engine consumes it) + **PSN leg** + **SystemViz** relevance in the doc comment; (5) record a `reference_tango_*` memory.

## Cross-slot handoffs
- #1 HeterophilyAwareAggregator → **india** (wire into `scripts/lib/graphsage-train-pipeline.mjs` as the feature transform) — deep training-loop integration is india's domain.
- #7 SFC → **oscar**; #9 CAM → **kilo**; #10 quoting → **charlie**; #11 ERP → **hotel**. Tango generates+wires the primitive; the domain slot integrates into its pipeline.

_Built by slot:tango claude-2c3adfc7. Advisory + mustHumanVerify. Next session: pick top unbuilt 🔜/◻, dedup-confirm, build to the synergy contract above._
