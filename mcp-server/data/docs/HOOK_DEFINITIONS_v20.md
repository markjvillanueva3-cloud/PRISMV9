# Hook Definitions for PRISM v20
# Updated: 2026-02-10

## EXISTING HOOKS (112 registered, working)

### Pre/Post Calculation (18 hooks)
Safety validation on all physics calculations. S(x) ≥ 0.70 enforced.

### File Write (9 hooks)
Anti-regression, content validation, sync.

### Error Chain (5 base + D3 additions)
error_extract → pattern_detect → learning_store

### Outcome (9 base + D3 additions)
lkg_update on success, failure_pattern_resolve

### Output (2 BLOCKING gates)
Pre-output validation. These BLOCK responses that fail safety.

## NEW HOOKS (added 2026-02-10)

### SURVIVAL-PERIODIC-001
- **Event**: cadence:every-15-calls
- **Phase**: during
- **Priority**: high
- **Purpose**: Periodic COMPACTION_SURVIVAL.json save
- **Action**: autoCompactionSurvival fires every 15 calls regardless of pressure
- **Status**: LIVE in autoHookWrapper.ts (not hook system — embedded in cadence)

### SURVIVAL-HIGH-CALLS-001
- **Event**: cadence:41-plus-calls
- **Phase**: during
- **Priority**: critical
- **Purpose**: Survival save + state save at high call counts
- **Action**: Both COMPACTION_SURVIVAL.json and CURRENT_STATE.json saved
- **Status**: LIVE in autoHookWrapper.ts

### ENGINE-INIT-DEFENSIVE-001
- **Event**: server:startup
- **Phase**: on_start
- **Priority**: critical
- **Purpose**: Defensive engine initialization
- **Action**: All engine .init() calls wrapped in try/catch
- **Status**: LIVE in index.ts

## HOOKS TO REGISTER (D5)

### SESSION-HANDOFF-001
- **Event**: session:end
- **Phase**: before
- **Priority**: high
- **Purpose**: Build handoff package for next session
- **Action**: Calls next_session_prep.py to create handoff
- **Status**: PLANNED for D5

### RESUME-VALIDATE-001
- **Event**: session:boot
- **Phase**: after
- **Priority**: high
- **Purpose**: Validate resume completeness
- **Action**: Calls resume_validator.py, logs score
- **Status**: PLANNED for D5

## KNOWLEDGE-AUGMENTED REASONING HOOKS (added 2026-04-12)

### KAR-DOMAIN-INJECT-001
- **Event**: UserPromptSubmit
- **Phase**: before
- **Priority**: high
- **Purpose**: Inject domain-specific knowledge for enhanced reasoning
- **File**: `.claude/helpers/knowledge-augmented-reasoning.mjs`
- **Action**: Detects domains in user prompt, injects relevant algorithms and formulas
- **Domains Supported**:
  - `optimization`: GradientDescent, AdamOptimizer, LBFGS, SimulatedAnnealing, GeneticAlgorithm
  - `neural_network`: NeuralInference, Backpropagation, CNN, RNN, Transformer
  - `transformer`: TransformerEngine, MultiHeadAttention, PositionalEncoding
  - `cutting_force`: KienzleForceModel, MerchantCircle, PowerTorqueCalc
  - `tool_life`: ExtendedTaylorModel, UsuiWearModel, BayesianWearModel
  - `thermal`: ThermalPartitionModel, JaegerTempField, ShawModel
  - `chatter`: StabilityLobeDiagram, RCSA, FFTAnalyzer, RegenerativeChatter
  - `deflection`: ToolDeflectionModel, BoringBarDeflection, RCSA
  - `surface_finish`: SurfaceFinishPredictor, BUEModel, ChatterMarksModel
  - `bayesian`: BayesianOptimizer, BayesianInferenceEngine, BayesianWearModel
  - `statistics`: AdvancedRegressionEngine, SPCProcessCapability, MonteCarloEngine
- **Output**: JSON with `additionalContext` containing algorithms, formulas, tribal tips
- **Status**: LIVE in settings.json UserPromptSubmit hooks

### KAR-TRIBAL-INJECT-001
- **Event**: UserPromptSubmit (via KAR-DOMAIN-INJECT-001)
- **Phase**: before
- **Priority**: medium
- **Purpose**: Inject relevant tribal knowledge tips for detected domains
- **Action**: Loads from tribal-knowledge.json, filters by domain tags, injects top 3 tips
- **Status**: LIVE (embedded in knowledge-augmented-reasoning.mjs)
