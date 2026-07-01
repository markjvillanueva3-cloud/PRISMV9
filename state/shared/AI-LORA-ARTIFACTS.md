# PRISM LoRA Artifacts Inventory — §0.5

**Generated:** 2026-05-02
**Method:** Filesystem scan of H:/prism/{models,weights,lora,mcp-server/data/{models,lora}} for `.safetensors|.pt|.bin|.gguf` plus checkpoint JSON inspection.

---

## Summary

| Metric | Count |
|--------|-------|
| Model directories on disk | 4 (`pp-transformer`, `surface-cnn`, `tool-life-mlp`, `cad_param_predictor.json`) |
| Versioned checkpoints | 8 (`pp-transformer` 2.2.0, 2.3.0, 2.3.1, 2.4.0-beta.1, 2.4.0, 2.9.0, 2.10.0; surface-cnn 1.0.0; tool-life-mlp 1.0.0) |
| Binary weight files (.bin) | 4 (all in `pp-transformer/2.3.1/`) |
| `.safetensors` files | **0** — none found |
| `.gguf` files | **0** — none found |
| `.pt` files | **0** — none found |
| LoRA adapter files | **0** — no LoRA adapter weights found anywhere on disk |
| Whisper / external models | 2 in `mcp-server/data/models/` (`ggml-base.bin`, `ggml-large-v3.bin` — Whisper STT, NOT PRISM AI nodes) |
| `H:/prism/{models,weights,lora}/` top-level | **DO NOT EXIST** |
| `H:/prism/.cache/temp/*.bin` | thousands of generic .bin cache (NOT model weights — RGS/cache scratch files) |

---

## Model Catalogue (the only real artifacts)

### 1. pp-transformer — Post AI transformer
- **Path:** `H:/prism/mcp-server/data/models/pp-transformer/`
- **Versions:** 2.2.0, 2.3.0, 2.3.1, 2.4.0-beta.1, 2.4.0, 2.9.0, 2.10.0
- **Latest checkpoint:** `2.10.0/checkpoint.json` (also 2.4.0 trainedAt 2026-04-15T10:00:00Z)
- **Binary weights:** ONLY `2.3.1/` has 4 `.bin` files (`layer_encoder.layer0.attention.q.bin`, `layer_cached_layer.bin`, `layer_layer.bin`, `layer_test_layer.bin`) — looks like development/test scaffolding (file names "test_layer", "cached_layer" suggest fixture data)
- **2.4.0+ versions:** checkpoint.json only, NO actual weight files
- **Consumer AI:** `post_ai` (PostProcessorDeepLearningEngine, MasterPostProcessorAGIOrchestrationEngine)
- **Status:** **PARTIAL** — checkpoint manifests exist but no production weights since 2.3.1. 2.10.0 is metadata-only.

### 2. surface-cnn
- **Path:** `H:/prism/mcp-server/data/models/surface-cnn/1.0.0/checkpoint.json`
- **Binary weights:** **MISSING** — checkpoint only
- **Consumer AI:** `sfc_ai` (SurfaceFinishPredictor / SFCFewShotNewMaterialEngine candidates)
- **Status:** MANIFEST-ONLY — no actual model

### 3. tool-life-mlp
- **Path:** `H:/prism/mcp-server/data/models/tool-life-mlp/1.0.0/checkpoint.json`
- **Binary weights:** **MISSING** — checkpoint only
- **Consumer AI:** unclear — likely Tool Life prediction (ToolDatabaseDeepLearningEngine?)
- **Status:** MANIFEST-ONLY — no actual model

### 4. cad_param_predictor.json
- **Path:** `H:/prism/mcp-server/data/models/cad_param_predictor.json`
- **Format:** Single JSON file, no versioning
- **Consumer AI:** `cad_ai` (NeuralCADGenerationEngine candidate)
- **Status:** Lightweight rules/coefficients dictionary — not a true neural network artifact

### 5. ggml-base.bin / ggml-large-v3.bin
- **Path:** `H:/prism/mcp-server/data/models/`
- **Purpose:** Whisper speech-to-text (used by `/video-learn` for transcript ingestion)
- **NOT a PRISM AI node** — out of scope for this inventory

---

## ORPHANS (file exists, no clear consumer)

1. **`pp-transformer/2.3.1/layer_test_layer.bin`** — filename indicates test fixture, but file is shipped in versioned production tree. Consumer should be PostProcessorDeepLearningEngine but no engine references this specific layer name.
2. **`pp-transformer/2.3.1/layer_cached_layer.bin`** — same issue; "cached" suggests transient.
3. **All 2.3.1 .bin files** — never referenced by version-pinned import in any engine grepped. Likely orphaned dev artifacts.

---

## MISSING (AI node claims `lora_tuned` / `production` but no on-disk weights)

> This is the hard finding: **PRISM has 80 LoRA support engines and ZERO LoRA weight files on disk.**

| AI node | training_status claim | Engines that imply on-disk weights | Actual file? |
|---------|----------------------|-----------------------------------|--------------|
| sfc_ai | lora_tuned | SFCFewShotNewMaterialEngine, PPGSFCClosedLoopOrchestratorEngine | **MISSING** — no .safetensors / .pt |
| post_ai | lora_tuned | pp-transformer 2.10.0, PostProcessorDeepLearningEngine | **PARTIAL** — only 2.3.1 has .bin, 2.10.0 is JSON-only |
| mill_ai | baseline | MillingLoRACadenceEngine, MillingLoRADatasetBuilderEngine | **MISSING** — only cadence/dataset scaffolding |
| lathe_ai | lora_tuned | 38+ LatheLoRA* engines incl. ModelRegistry, Deployment, OllamaDeployer, ModelOptimizer | **MISSING** — full pipeline, no weights |
| wedm_ai | lora_tuned | WEDMNeuralTrainingEngine, WireEDMNeuralOrchestrationEngine | **MISSING** — JSON state files only (data/state/WEDM_*.json) |
| cad_ai | baseline | NeuralCADGenerationEngine | **PARTIAL** — only `cad_param_predictor.json`, no neural weights |
| cam_ai | lora_tuned | CAMLoRAEngine, CAMLoRAAdapterTrainerEngine, ContinualLoRAEngine, FederatedLoRAEngine | **MISSING** — adapter trainer, no adapters |
| five_axis_ai | baseline | FiveAxisLoRACadenceEngine, FiveAxisLoRADatasetBuilderEngine | **MISSING** |
| grinding_ai | untrained | GrindingLoRACadenceEngine, GrindingLoRADatasetBuilderEngine | **MISSING** (consistent with untrained claim) |
| laser_ai | untrained | LaserLoRACadenceEngine, LaserLoRADatasetBuilderEngine | **MISSING** (consistent with untrained claim) |
| mill_turn_ai | untrained | MillTurnLoRACadenceEngine, MillTurnLoRADatasetBuilderEngine | **MISSING** (consistent with untrained claim) |

---

## Adjacent meta-engines (LoRA infrastructure with no targets)

These engines reference LoRA workflows but have no consumable weights:

- AdaLoRARankAllocatorEngine
- ContinualLoRAEngine
- DetachedLoRARunnerEngine
- FederatedLoRAEngine
- InferenceLoRAGateEngine
- LatheLoRAOllamaDeployerEngine — would deploy adapters to Ollama; no adapters exist
- LatheLoRAModelRegistryEngine — registry of zero models
- LatheLoRAExperimentTrackerEngine — tracker of zero experiments

---

## ROOT-CAUSE ASSESSMENT

The LoRA story in PRISM is **architectural vapor**. 80 engines describe a complete LoRA training/deployment/drift-monitoring/ensemble pipeline (especially for Lathe). Zero adapter files exist on disk. The closest thing to a real neural artifact is:
- `pp-transformer/2.3.1/` (4 .bin files, names suggest test fixtures)
- `cad_param_predictor.json` (rules/coefficients, not weights)

**Implication for the work order §0.5:** Any AI node claiming `lora_tuned` should be downgraded to `baseline` or `untrained` UNLESS it can point to a `.safetensors`/`.pt`/`.gguf` file. Under that strict rule:

| AI node | Claimed | Actual (post-audit) |
|---------|---------|---------------------|
| sfc_ai | lora_tuned | **baseline** (no weights file) |
| post_ai | lora_tuned | **baseline** (only test-fixture .bin in 2.3.1) |
| lathe_ai | lora_tuned | **untrained** (massive scaffold, zero weights) |
| wedm_ai | lora_tuned | **baseline** (JSON state, no model weights) |
| cam_ai | lora_tuned | **untrained** (trainer engine exists, no trained adapters) |

The only AI components with any operational closed-loop signal are:
1. **sfc_ai** — PPGSFCClosedLoopOrchestratorEngine + SFCOutcomeCaptureWireEngine (in-code feedback subscription)
2. **wedm_ai** — WEDM_*.jsonl logs (state-file feedback, partial loop)
3. **ai_system_router** — ollama-offload-stats.json telemetry (routing-decision feedback)

Everything else is **scaffolding without artifacts**.
