# PATHS.md — slot:india (ai-training) H:/-wide path atlas

> Converts future Grep/Glob from O(N) → O(1) for slot:india. **`(✓)` = verified on the canonical MAIN tree `H:/prism` (where shared/fleet substrate lives), 2026-05-28/29.**
> ⚠ **Worktree-staleness disclosure (R12/AI-T8):** this `slot/india` worktree is ~874 commits behind `origin/main`. The shared NN-GRAPH scripts (`scripts/lib/graphsage-*`, `scripts/nn-graph-*`) + `state/shared/nn-graph/` + `outcome-bus.jsonl` are confirmed on **MAIN** but are NOT in this local checkout; the 4 buildout wiki entries + `KNOWLEDGE.md`/`RULES.md` are worktree-committed **pending golf merge to main**. So `(✓)` means "exists on the canonical tree", not "exists in this local worktree". Always re-verify fleet assets against `H:/prism` before relying on them. Format: `<path> | <purpose>`.
> Maintainer: slot:india.

## Galaxy files (this dir — mcp-server/src/engines/ai-training/)
- `CLAUDE.md` (✓) | operational scope + verified engine/dispatcher inventory + anti-patterns + PSN edges
- `MEMORY.md` (✓) | cross-session brain (Master-brain link header + High-ROI + failure modes)
- `PATHS.md` (✓) | this atlas
- `TOOLBELT.md` (✓) | india's grep/glob/bash/read/dispatcher patterns
- `RULES.md` (✓) | domain rules AI-T1..AI-T8 + GSD lifecycle protocol (cite like R5–R12)
- `KNOWLEDGE.md` (✓) | compiled wiki+tribal+action index for the domain (auto-invoked via awareness hook)

## NN / GNN core — wiring-inference tier-5 (H:/prism/scripts/)
- `scripts/lib/graphsage-model.mjs` (✓) | GraphSAGE forward + neighbor aggregation
- `scripts/lib/graphsage-trainer.mjs` (✓) | training loop (loss, backprop)
- `scripts/lib/graphsage-predictor.mjs` (✓) | inference / node classification
- `scripts/lib/graphsage-train-pipeline.mjs` (✓) | end-to-end train orchestration
- `scripts/lib/graphsage-checkpoint.mjs` (✓) | checkpoint save/load (candidate→live discipline)
- `scripts/lib/nn-graph-eval.mjs` (✓) | deploy-gate eval — AUROC / macro-F1 / Brier
- `scripts/nn-graph-retrain-lifecycle.mjs` (✓) | autonomous 6h retrain orchestrator (S4U scheduled task)
- `scripts/nn-eval-refresh.mjs` (✓) | refresh NN-EVAL.{md,json}
- `scripts/build-node-embeddings.mjs` (✓) | 768d node embeddings (streaming JSONL — OOM-safe)
- `scripts/seed-ghost-gnn-classify.mjs` (✓) | classify UNKNOWN ghost nodes
- `scripts/nn-feedback-to-memory.mjs` (✓) | NN feedback rows → memory store
- `scripts/generate-gnn-embed-bridge-features.mjs` (✓) · `scripts/lib/graph-node-embedding-bridge.mjs` (✓) · `scripts/lib/node2vec-embedder.mjs` (✓)

## NN / GNN state (H:/prism/state/shared/nn-graph/) — all (✓)
- `graphsage-checkpoint.json` | LIVE checkpoint (gate-passed)
- `graphsage-checkpoint.candidate.json` | candidate (promote only on gate-pass)
- `graphsage-checkpoint-768d-rag-upgrade.json` | 768d RAG-upgrade checkpoint
- `node-embeddings-768d.jsonl` | 768d node-embedding corpus
- `NN-EVAL.{md,json}` | latest deploy-gate metrics
- `retrain-lifecycle.jsonl` | retrain audit log · `retrain-baseline.json` | baseline metrics
- `feedback-captured.json` | captured feedback rows · `reference-pool-seed-2026-05-23.json` | reference ghost-pool seed

## LoRA stack (H:/prism/mcp-server/src/engines/ — ~95 engines)
- `LatheLoRA*Engine.ts` (✓ ~48) | lathe LoRA stack — cadence/drift/deployment/monitoring/ensemble/master-orchestrator/dataset-builder/physics-augmented-inference
- `MillLoRA*Engine.ts` (✓ ~14) | mill LoRA stack
- `{FiveAxis,MillTurn,WEDM,SinkerEDM,Laser,Waterjet,Grinding,Milling}LoRA{DatasetBuilder,Cadence}Engine.ts` (✓) | per-domain dataset + cadence
- Cross-domain (✓): `LoRAMoEGatingEngine` · `AdaLoRARankAllocatorEngine` · `OrthogonalLoRAEngine` · `LoRACompositionEngine` · `FederatedLoRAEngine` · `ContinualLoRAEngine` · `LoRAAdapterRegistryEngine` · `LoRADriftCoordinatorEngine` · `InferenceLoRAGateEngine` · `PRISMLoRAAdapterEngine` · `CAMLoRAEngine` · `BlueprintLoRABridgeEngine` · `MachineLoRABaseEngine` · `DetachedLoRARunnerEngine`
- `scripts/lib/lora-training-pipeline.mjs` (✓) | LoRA training pipeline

## RAG + corpus engines (H:/prism/mcp-server/src/engines/ — all (✓))
- RAG: `BlueprintExtractionRAGEngine` · `TribalRAGEngine` · `CAMTribalRAGEngine` · `JMDieProgramRAGEngine` · `SFCRAGWarmStartEngine` · `PPGRAGDialectMatchEngine` · `WikiRAGFeatureEngine` · `OllamaEmbedderEngine`
- CAD corpus: `CADCorpusIngesterEngine` · `CADCorpusIngestionEngine` · `CADCorpusPatternEngine` · `CADCorpusFeaturePrevalenceLearnerEngine` · `CADTrainingCorpusOrchestratorEngine`
- MIT-OCW: `MITCourseRegistryEngine` · `MITCourseDeepLearningEngine` · `MITCourseIntegrationEngine` · `MITCourseExpansionEngine` · `MITCourseFullIntegrationEngine` · `MITCourseKnowledgeEngine` · `CurriculumEngine` · `KnowledgeCurriculumBridgeEngine`
- PDF corpus: `PDFProcessingPipelineEngine` · `PDFHandbookBatchProcessorEngine` · `PDFTableExtractionEngine` · `PDFFormulaExtractionEngine` · `PDFHighlightExtractorEngine` · `PDFStructureEngine` · `PDFSourceRegistryEngine`
- Tribal corpus: `TribalCorpusOrchestratorEngine` + `{SinkerEDM,LaserCutting,WaterjetCutting,Grinding,Welding,AdditiveManufacturing}TribalCorpusEngine`

## Deep reasoning + ML (H:/prism/mcp-server/src/engines/ — all (✓))
- `CrossProcessNeuralLearningEngine` · `MetaLearningOptimizerEngine` (threshold @ 2848 outcomes)
- `MultiPathReasoningEngine` · `CausalReasoningEngine` · `CounterfactualReasoningEngine` · `ScientificReasoningEngine` · `TemporalReasoningEngine` · `BeliefStateReasoningEngine` · `DecisionReasoningEngine` · `PRISMCreativeReasoningEngine` · `ReasoningExplainerEngine` · `ReasoningChainSharingEngine` · `MultiAssetReasoningEngine`
- `MillingNeuralCognitiveEngine` · `PostProcessorCognitiveEngine` · `CognitiveBudgetAllocatorEngine`

## Self-improvement / closed-loop backbone (H:/prism/mcp-server/src/engines/ — all (✓))
- Outcome bus: `OutcomeCaptureBusEngine` → `state/shared/outcome-bus.jsonl` (✓) · `OutcomePublishAdapterEngine` · `OutcomeRLBridgeEngine` · `OutcomeReplayBufferBridgeEngine` · `OutcomeEpisodicMemoryBridgeEngine` · `OutcomeDriftCalibrationBridgeEngine` · `OutcomeTraceEngine` · `OutcomeTrackingEngine` · `CrossProcessOutcomeStore` · `OutcomeFeedbackOverrideStoreEngine`
- Calibration/conformal: `CrossProcessConformalPredictionEngine` · `CrossProcessConformalClassificationEngine` · `ConformalCalibrationMonitorEngine` · `ConformalPredictionLogEngine` · `CrossProcessCalibrationAuditorEngine` · `StratifiedCalibrationEngine` · `CascadeCalibrationEngine` · `CalibrationEngine` · `PredictionCalibrationEngine`
- Drift: `CrossProcessDriftDetectorEngine` · `DriftDetectionEngine` · `SchemaDriftDetectorEngine` · `CAMMLDriftMonitorEngine`
- Reward/threshold: `CrossProcessRewardShaperEngine` · `WEDMRewardShapingEngine` · `AdaptiveThresholdEngine` · `HookEfficiencyEngine`

## Training pipelines (H:/prism/scripts/ — all (✓))
- `scripts/generate-ai-training-units.mjs` | ai-training roadmap-unit generator
- `scripts/build-fleet-training-corpus-inventory.mjs` | corpus inventory
- `scripts/build-psn-training-corpus.mjs` | PSN training corpus
- `scripts/generate-cadcam-training-corpus-features.mjs` | CAD/CAM corpus features
- `scripts/generate-training-curriculum.mjs` + `scripts/lib/training-curriculum-query.mjs` + `scripts/lib/training-difficulty-ranker.mjs` | curriculum
- `scripts/train-lathe-full-archive.mjs` | lathe archive training
- `scripts/harvest-prints-to-training.mjs` · `scripts/wiki-canonical-to-training-pairs.mjs` | data → training pairs
- `scripts/quoting-train-{cycle,history-summary,drift-alert}.mjs` | quoting training loop
- Embedding setup: `scripts/setup-embedding-model.mjs` · `scripts/embed-all-{skills,engines,actions,wiki}.mjs`

## Wiki (H:/prism/knowledge/wiki/)
- `architecture/nn-graph-ms0.md` (✓ pre-existing) | wiring-inference cascade + GNN tier-5
- `architecture/ai-training-galaxy.md` (✓ this buildout) | galaxy map + 4-axis brain
- `architecture/ai-training-closed-loop.md` (✓ this buildout) | 4 closed-loop surfaces
- `lessons/heterophily-collapse-class.md` (✓ this buildout) | uniform neg-sampling failure + fix
- `architecture/ai-training-gsd-protocol.md` (✓) | GSD protocol + AI-T rules (wiki mirror of RULES.md)

## Corpus subtrees (verify location before harvest — R12)
- `H:/prism/extracted/` (✓) | machine DBs (`machines/ENHANCED/`) + material DBs — **NOT** mit-ocw (brief seed-root `extracted/mit-ocw/` does NOT exist)
- MIT-OCW corpus | reached via `MITCourseRegistryEngine` (data dir: resolve via the engine, not a fixed path)
- JM Die corpus | `H:/PRISM/JM DIE/` (24,545 files) → training via `JMDieTrainingCorpusEngine`

## Hooks + skills
- **Custom domain-awareness (U-PSGB-INDIA-AUDIT):** `scripts/ai-training-awareness.mjs` (pure renderBlock — live NN-GRAPH gate / checkpoint / retrain / closed-loop) + `.claude/hooks/india-awareness-inject.mjs` (slot-gated UserPromptSubmit inject — NO-OP for non-india; resolves script via `../../scripts/`). Wired in settings.json. Knob: `PRISM_INDIA_AWARENESS_DISABLE=1`. Run: `node scripts/ai-training-awareness.mjs [--json]`.
- Hooks: `H:/prism/.claude/hooks/` — `india-awareness-inject.mjs` (CUSTOM), `nn-graph-health-inject.mjs`, `slot-context-bundle-inject.mjs` (loads this galaxy), `outcome-*`, `tribal-by-domain-inject.mjs`
- Skills: `H:/prism/.claude/commands/` + `C:/Users/wompu/.claude/commands/` — `/ai-reason` `/ai-optimize` `/ai-analyze` `/learn` `/predict` `/calibrate` `/forge-learn`; **`/ai-train-india`** + **`/galaxy-audit-india`** (this buildout)

## Dispatchers + schemas + data (route + contract layer — H:/prism/mcp-server/)
- Dispatchers (`src/tools/dispatchers/` — engines route through these for invocation): `aiReasoningDispatcher.ts` (✓ prism_ai — `xproc_neural_*` / `xproc_outcome_*` / `lora_*` / `neural_*` / `ai_training_{master,lathe,ledger}_*`) · `intelligenceDispatcher.ts` (✓ prism_intelligence — `xproc_neural_*` / `digital_twin_*` / `ai_orchestrate_*`) · `outcomeDispatcher.ts` (✓ prism_outcome — `capture_bus_*` / `outcome_*` / `replay_*` / `rl_bridge_*`) · `mlDispatcher.ts` (✓ `adalora_*` / `continual_lora_*` / `fedlora_*` / `lora_compose|gate` / `loramoe` / `olora_*`) · `l2EngineDispatcher.ts` (✓ local L2 engine routing)
- Schemas (`src/schemas/`): `loraAdapterSchema.ts` (✓) · `loraCompositionSchema.ts` (✓) · `outcomeEventSchema.ts` (✓) · `outcomeActionSchemas.ts` (✓)
- Data/state (`mcp-server/data/state/`): `dev-outcomes.jsonl` (✓ outcome rows) · `ollama-offload-stats.json` (✓ offload telemetry) — NN-GRAPH model state lives in `state/shared/nn-graph/` (above)
- scripts/lib ML libraries (✓): `node2vec-embedder.mjs` · `graph-node-embedding-bridge.mjs` · `tribal-graph-embedding.mjs` · `training-driver-lib.mjs` · `training-difficulty-ranker.mjs` · `training-curriculum-query.mjs` · `lora-training-pipeline.mjs` (graphsage-* under NN/GNN core)
- Embedding/index scripts (✓): `scripts/embed-{wiki,engines,cited-tips,knowledge-store}-into-tribal-index.mjs` · `scripts/tribal-graph-course-embed.mjs` · `scripts/build-wiki-embeddings.mjs`
- **Compiled wiki+tribal+action index:** `KNOWLEDGE.md` (one-stop; auto-invoked via the awareness hook)

<!-- BEGIN:critical-resource-roots (generated by scripts/wire-galaxies-to-resource-roots.mjs — do not hand-edit) -->
## 🌐 Critical resource roots (fleet-wide — operator-canonical 2026-05-30)
> The 3 most important data/resource roots in PRISM — EVERY galaxy is wired to these. Source of truth: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.json` · human atlas: `mcp-server/src/engines/database-expansion/CRITICAL-RESOURCE-ROOTS.md` · owner: juliett.
- `H:/PRISM/resources` | CAD/CAM/training/catalog/post/machine-model resource trove — the platform's reference + learning corpus across every CAM seat (Fusion, HSMWorks, Mastercam, SolidCAM, SolidWorks, hyperMILL/OPEN MIND, Inventor HSM, Freecad) plus manufacturer/workholding catalogs, MIT courses, machine-sim models, and macro/post libraries. | index: H:/PRISM/resources/RESOURCES-INDEX.md
- `H:/PRISM/JM DIE` | JM Die Company test-shop archive — the canonical real-shop ground truth: machine programs by controller (Haas mill, Okuma MULTUS, Hurco, lathe, Roku-Roku, wire-EDM), 100+ customer program sets under CNC LATHE, post-processors (stock + PRISM-modified), Fusion CAD/CAM files, setups, reverse-engineering, controllers, and the TRIBAL+WIKI knowledge corpus. | consolidated: H:/prism/mcp-server/data/jm-die-database/ (38,251 files indexed via build-jm-die-database.mjs)
- `H:/PRISM/Docustrata` | JM Die business/order/financial document corpus (257,992 files) — quotes, sales orders, packing slips, closed orders, A/R-A/P, taxes, UPS shipping, laser sheets, scans. The quote-to-ship + ERP ground truth. ALREADY indexed: do NOT re-OCR — search manifest.json + .index/ + the consolidated jm-die-database. | index: H:/PRISM/Docustrata/.index/*.jsonl (+ jm-die-index-v2.json) ; H:/PRISM/Docustrata/manifest.json (66.2M rollup) | consolidated: H:/prism/mcp-server/data/jm-die-database/ (73,506 v3-enriched docs)
- **Domain-relevant for ai-training:** `resources/PART MODELS FOR LEARNING ENGINE` · `resources/MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION` · `JM DIE/lathe-ai-training-report.json`
<!-- END:critical-resource-roots -->

<!-- BEGIN:registered-db-intake (generated by scripts/wire-db-stores-to-consumers.mjs — do not hand-edit) -->
## 📥 Registered DB intake (juliett-owned stores the ai-training galaxy consumes — DB-EXPANSION-BRIDGE-MS0)
> Discoverable at runtime via `prism_data:database_list` / `globalSearch` (registered in `data/databases/DB_MANIFEST.json`). Re-wire after manifest consumer-list changes: `node scripts/wire-db-stores-to-consumers.mjs`.
- **AlgorithmDB** (Algorithm Database) — `data/algorithms/` · 52 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **DecisionTreeDB** (Decision Tree Reference Data) — `data/databases/DecisionTreeDB.json` · 7 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **FormulaDB** (Formula Database) — `data/` · 499 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **GenomeDB** (Manufacturing Genome Database) — `data/databases/GenomeDB.json` · 8 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **InferenceDB** (Inference Chain Templates) — `mcp-server/src/engines/InferenceChainEngine.ts` · 3 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **JMDieDocuStrataDB** (JM Die / DocuStrata Corpus Database) — `mcp-server/data/jm-die-database/` · 111,745 entries · manifest `mcp-server/data/jm-die-database/manifest.json` · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **KnowledgeDB** (Knowledge Base Database) — `data/knowledge/` · 58 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **SourceCatalogDB** (Unified Source File Catalog) — `data/databases/SourceCatalogDB.json` · 85 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
- **WorkflowDB** (Workflow Chains Database) — `data/databases/WorkflowDB.json` · 10 entries · query: `prism_data:database_search` or `node scripts/db-toolbelt.mjs --status`
<!-- END:registered-db-intake -->

<!-- BEGIN:knowledge-atlas (generated by scripts/enrich-galaxy-paths-knowledge-atlas.mjs -- do not hand-edit) -->
## 📚 Knowledge / Tribal / Memory atlas (uniform vault routing -- every galaxy learns its whole domain)
> Auto-plotted by `scripts/enrich-galaxy-paths-knowledge-atlas.mjs`. Every path below is existence-checked (R12). The RECALL routing is identical across all 34 galaxies so each domain learns to the max via the same Obsidian-vault + PSN path.

- **wiki (domain):** `knowledge/wiki/ai-training/` (6 entries) -- query before re-deriving
- **synthesis brain (Obsidian):** `knowledge/memories/patterns/ai-training_synthesis.md` -- compounded domain patterns; refresh via `galaxy-synthesis-refresh.mjs`
- **galaxy brain:** `CLAUDE.md` · `MEMORY.md` · `SOUL.md` · `AWARENESS.md` · `TOOLBELT.md` (this dir)

**Uniform recall routing (same for every domain):**
- memories (domain-tagged, flat corpus): `prism_memory:semantic_search query="ai-training" topK=20` -- auto-fed every Stop by `stop-obsidian-memory-feed.mjs`
- tribal tips (domain-tagged): `knowledge/tribal/` + `knowledge/wiki/code-tribal/` -- retrieved by `tribal-rerank.mjs` (PSN leg #5), domain-filtered by slot
- AI reasoning over ALL of the above (PSN leg #10): `node scripts/lib/galaxy-reasoning-bridge.mjs ai-training "<question>"` (hybrid CAG+RAG, local Ollama, $0)
- UP (pull from master): `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md`
- DOWN (push to master): write `<type>_<slot>_<topic>.md` -> master memory dir -> auto-fed to `knowledge/memories/<type>/`

**All resources -- easily pathed + usable (search the INDEX, never re-scan -- R8):**
- CAD/CAM/training/catalog/post/machine trove: `resources/RESOURCES-INDEX.md` (`H:/PRISM/resources/`) -- every CAM seat + catalogs + MIT courses + machine-sim + macro/post libs
- JM Die shop ground-truth (38,251 files): `mcp-server/data/jm-die-database/` (`manifest.json` + `.index/*.jsonl`) -- programs by controller, posts, Fusion CAD/CAM, tribal+wiki corpus
- Business/order/financial docs (257,992 files): `H:/PRISM/Docustrata/.index/jm-die-index-v2.json` + `manifest.json` -- quote-to-ship + ERP ground truth (ALREADY indexed; do NOT re-OCR)
- Vendor catalog corpus: `mcp-server/data/vendor-catalog-db/manifest.json` (425 vendors + catalog tables)
- The 3 critical roots + per-galaxy db-intake/vendor-corpus are plotted in their own marked blocks below (`critical-resource-roots`, etc.).
- USAGE (query every resource from this domain): `prism_data:database_search` / `database_list` / `globalSearch` · skills `/resource-census` `/prism-paths` · new PDFs -> `scripts/extract-jm-die-corpus-page-by-page.py` (lima pypdf) · skip-list `state/shared/specs/PRISM-NOISE-PATHS-2026-05-26.md`
<!-- END:knowledge-atlas -->
