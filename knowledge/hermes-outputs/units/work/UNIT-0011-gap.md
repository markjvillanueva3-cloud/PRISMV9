# UNIT-0011 — Built-Up Edge Mitigation and Tool Breakage Recovery — GAP ANALYSIS
_Analyst: oscar (speed-feed domain expert), 2026-07-02. All citations verified by Read/Grep this session._

## Existing coverage

**BUE side (onset prediction is fully built):**
- `mcp-server/src/engines/BUEOnsetThresholdEngine.ts:1-140` — per-ISO-group BUE risk bands (Trent & Wright 2000 + Sandvik 2023, cited :15-31), tool-material + rake-angle modifiers (:35-42), risk level/score + **actionable `recommended_min_vc_m_per_min`** (:43-47, schema :97-108), pure/never-throws contract (:49-58). Band table at :129+. **Wired**: `mlDispatcher.ts:316-322` (`bue_onset_check`, lazy-load :34,88-89). Test on disk: `mcp-server/src/__tests__/BUEOnsetThresholdEngine.test.ts`.
- Additional BUE physics actions wired in prism_calc: `calcDispatcher.ts:7115-7131` (`cutting_phenomena_bue`, `cutting_phenomena_bue_effect` → `predictBUEFormation`/`predictBUEEffect`) and `:7134-7146` (`cutting_physics_ext_bue`, `cutting_physics_ext_bue_speed_map` → `predictBUE`/`bueSpeedMap`) — backing engine bodies PARTIAL-UNVERIFIED (wiring read, implementations not).
- BUE-aware chip analysis: `calcDispatcher.ts:101` (`bue_risk` in chip formation output). Coating-level BUE gating: `mcp-server/src/algorithms/CoatingVcModifier.ts:26-31` (nitride-on-aluminum clamped ≤1.0 because "adhesion / built-up-edge dominate").

**Breakage side (prediction is fully built, twice):**
- `mcp-server/src/engines/ToolBreakageEngine.ts:1-18` — bending/torsional/von-Mises stress, deflection, S-N fatigue, chip-load validation, breakage probability. **Wired** prism_calc `calcDispatcher.ts:2925-2943` (`tool_breakage_predict`, `tool_stress_analyze`, `tool_safe_limits`) AND prism_safety via `safetyDispatcher.ts:5,70-71,631-632` (`predict_tool_breakage`, `calculate_tool_stress`, `check_chip_load_limits` → `toolBreakageTools.ts`).
- `mcp-server/src/engines/ToolBreakagePredictionEngine.ts:1-40` (E1149) — Miner cumulative damage + deflection stress + chip-load peaks + engagement spikes, combined P_break (:26). **Wired** camDispatcher `camDispatcher.ts:415-416,810-811,2050-2051,12469-12492` (`tool_breakage_predict`, `tool_cumulative_damage`, `tool_breakage_risk`).
- Statistical breakage: `calcDispatcher.ts:7160-7171` (`ml_stats_tool_breakage`), `:7204-7215` (`stat_learning_logistic_breakage`).

**Breakage RECOVERY (procedural knowledge exists; physics root-cause does not):**
- `mcp-server/src/engines/CNCControllerDeepLearningEngine.ts:946` — `getRecoveryProcedure(controller, "tool_breakage")`, tested at `mcp-server/src/__tests__/CONTROLLER-AI.test.ts:217-227` (Okuma OSP tool-breakage recovery procedure).
- `mcp-server/src/engines/MillingDeepAIHardeningEngine.ts:454-461` — WinMax tool-break recovery steps (retract → replace → re-measure → update offset → restart from last safe block, NOT the break block).
- `mcp-server/src/engines/FailureModeAnticipationEngine.ts:141`, `mcp-server/src/engines/DiagnosticReasoningEngine.ts:407` (broken-tool fix steps), `mcp-server/src/engines/LatheOrchestrationEngine.ts:40` (stage 21 EMERGENCY_RECOVERY — tool breakage response), `mcp-server/src/engines/AdvancedPostProcessorEngine.ts:849` (emits BROKEN TOOL ALARM macro, tested `__tests__/advanced-post-processor.test.ts:342`).

## Real gaps

1. **Multi-lever BUE MITIGATION recommender.** BUEOnsetThresholdEngine outputs one lever (raise Vc). A mitigation composition — rank speed-raise vs positive-rake vs coating change vs coolant/MQL change per the engine's own modifier tables — is missing. Ingredients (CoatingSelectionEngine, CAMCoolantStrategyEngine, rake modifiers) all exist; the composition does not.
2. **Physics-based breakage ROOT-CAUSE analyzer (post-mortem).** Recovery today is per-controller procedural text; nothing back-drives the four damage models in ToolBreakagePredictionEngine (fatigue vs deflection-overload vs chip-load spike vs engagement spike) from an observed break to classify WHY and recommend the parameter fix. This is the "decision tree with physics justification" the spec asks for.
3. **JM Die breakage-case validation.** No breakage incident dataset found in-repo (qualified: targeted searches, not exhaustive archive read). Data-blocked criterion.

## Verdict

**extend**

## Recommended next action

Ship two thin additions rather than the two new engines the spec names (both would collide with existing assets): (a) a `bue_mitigation_recommend` action that composes BUEOnsetThresholdEngine's band/modifier tables with CoatingSelectionEngine + CAMCoolantStrategyEngine into a ranked multi-lever mitigation list; (b) a `breakage_root_cause` action on ToolBreakagePredictionEngine that inverts its four damage models against an observed break (force/chip-load/engagement history in, ranked root-cause + physics evidence + recovery pointer out), wiring the existing `getRecoveryProcedure` controller knowledge as the procedural tail. Wire both to prism_safety (breakage is already a safety surface at `safetyDispatcher.ts:70-71`). Validate on whatever JM incident anecdotes exist in tribal tips; report the absence of a structured breakage dataset loudly (R12).

## ROI

**5/10** — prediction is double-built and recovery procedures exist; the genuinely-new pieces (mitigation composition + root-cause inversion) are moderate value for operators but modest effort, with validation data again the weak link.
