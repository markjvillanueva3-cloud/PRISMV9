# PPG Deep Audit — Agent 8: ML / AI

## Reasoning Ledger Status
**FOUND**: No explicit `PPG_REASONING_TRACE_LEDGER.jsonl` file. However, PPG inference flows through:
- `PrintToProgramPipelineEngine.ts` (stages: drawing intake, feature extraction, process planning, program generation, validation)
- `MachineLearningFeedbackEngine.ts` (real measurement feedback loop per machine/material/op)
- `SessionTokenLedgerEngine.ts` for token/reasoning traces
- Distributed reasoning in `state/shared/COORDINATION_LEDGER.jsonl` (~152KB, agent activity log)

**Gap**: No dedicated PPG_REASONING_TRACE ledger yet. Recommended: wire output from PrintToProgramPipelineEngine stages → structured JSON trace file.

## Vision / LLM / RL Engines
**Vision (Claude API)**: 
- `BlueprintVisionOCREngine.ts` — Claude Vision for manufacturing blueprint parsing (GD&T, dimensions, tolerances, material specs, geometry profiles)
- Model: `claude-sonnet-4-20250514` (configurable)
- Extracts: feature dimensions, GD&T symbols (position, flatness, perpendicularity, etc.), title block, profiles

**LLM (Claude Tier-1 Orchestrator)**:
- `LLMEngine.ts` — general-purpose Claude API integration (queries, quote explanation, process advice, G-code annotation)
- Config: model selection, context injection, caching
- Temperature: 0.3 (conservative), max_tokens: 2048
- Grounded in PRISM knowledge base (material, machine, tool catalogs)

**RL (Reinforcement Learning)**:
- `RLPostProcessorEngine.ts` — ε-greedy Q-learning for adaptive G-code formatting per controller
  - Learns optimal code format (standard/optimized/compact/verbose) from execution feedback
  - Epsilon: 0.1, learning rate: 0.1, gamma: 0.95
  - Tracks execution time deltas, error rates, surface quality
  - ~75 lines of core Q-table management

## Operator Override Capture
**Strategy Overrides**:
- `ContextualStrategyOverrideEngine.ts` (10 hard rules for thin walls, deep bores, hard materials, micro features, interrupted cuts, deep pockets, tool overhang)
- Applied per-feature during process planning

**Feedback Loop**:
- `MachineLearningFeedbackEngine.ts` — captures real CMM/profilometer/tool-preset measurements
  - Records residuals (measured vs predicted) per machine/material/operation
  - Computes bias, RMSE, predicts when calibration needed
  - Updates physics model coefficients (kc1.1, Taylor C/n, Ra bias)
  - No explicit "operator override" capture — inferred from residual patterns

**Missing**: Direct operator feedback on machine selection / op sequencing. Recommend: add flag `operator_override_reason` to measurement input.

## Tier-1/2/3 AI Hierarchy Wiring
**No explicit tiering found in code**. Inferred structure:
- **Tier 0 (Physics Kernel)**: Canonical Kienzle/Taylor/deflection constants (src/physics/constants.ts)
- **Tier 1 (LLM Orchestrator)**: `LLMEngine.ts` + Claude Vision (`BlueprintVisionOCREngine.ts`) for print interpretation and feature recognition
- **Tier 2 (Domain Engines)**: PrintToProgramPipelineEngine, process planning, strategy selection, RL post-processor
- **Tier 3 (Adapters)**: FederatedLearningEngine (shop-local LoRA-cadence models, 68 correction factors per material/machine/tool/op), MachineLearningFeedbackEngine

**LoRA/Cadence Adapters**: 
- `FederatedLearningEngine.ts` — anonymized, federated correction factors (Vc, Fz, tool life, Ra, cycle time multipliers)
- Privacy-preserving network sync without exposing proprietary data
- 7 material classes × 5 machine classes = 35 slots; each multi-operation coverage

## Score (0-100)
**45/100**

### Strengths
- Vision + LLM tier working (Claude API wired)
- RL post-processor implemented (epsilon-greedy Q-learning)
- Feedback loop in place (measurement residuals → coefficient updates)
- Federated learning network scaffolding present

### Gaps
- **No reasoning trace ledger**: PrintToProgramPipelineEngine stages not logged to `.jsonl`
- **No operator override capture**: Missing explicit flag to log when users override machine/op selection
- **Tier hierarchy undocumented**: No TIER_1/2/3 wiring diagram in code comments
- **LoRA cadence sparse**: Only ~12 correction factors active; no shop-specific LoRA training loop yet
- **Closed-loop maturity low**: Feedback recorded but not actively driving retrain cycles

### Next Steps
1. Add `operator_override_reason` field to `RecordMeasurementInput`
2. Wire PrintToProgramPipelineEngine → `.jsonl` trace file (each stage emits event)
3. Document Tier-1/2/3 hierarchy in CLAUDE.md (engine layer)
4. Activate FederatedLearningEngine contribution aggregation (currently scaffolding)
