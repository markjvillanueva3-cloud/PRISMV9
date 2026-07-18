# UNIT-0022 Gap Analysis — Operator Decision Fatigue and Bias Modeling

Analyst: hotel-business (business domain expert). Date: 2026-07-02.
Unit spec: `H:/prism/knowledge/hermes-outputs/units/UNIT-0022-DOMAIN5-OPERATOR-DECISION-FATIGUE-AND-BIAS.md`

## Existing coverage

All "fatigue" engines in the repo are METAL fatigue, not human fatigue (`mcp-server/data/docs/ENGINE_DIGEST.md:632` CoffinMansonFatigueEngine, `:1130` FatigueLifeEngine, `:3436` ThermalFatigueEngine, `:3459` ThreadStrengthFatigueEngine). Human-factors-adjacent assets that exist:

- **AI-self bias detection (pattern reusable, wrong subject):** `mcp-server/src/engines/MetaAIOrchestrationEngine.ts:427-445` `detectBiases()` flags anchoring_bias + sample_size_bias on the AI's own intermediate reasoning results; `:473-495` emits mitigation suggestions. This detects biases in the MODEL's reasoning, not the operator's decisions.
- **Same pattern, second instance:** `mcp-server/src/engines/PostProcessorDeepCognitionEngine.ts:639-642` pushes "Confirmation bias" / "Anchoring bias" strings against its own reasoning trace.
- **Operator-fatigue knowledge (content, not a model):** `mcp-server/src/data/academy/course-22-alarm-troubleshooting-deep.ts:442` — "End of shift → operator fatigue / setup degradation" (tribal/academy content acknowledging the phenomenon).
- **Human-error taxonomy (adjacent):** `mcp-server/src/engines/FailureModeAnticipationEngine.ts:409-423` — root causes include "Manual jog error", detection methods include "Operator vigilance". A failure-mode library, not a fatigue/bias model.
- **Operator-skill as a model input (convention exists):** `mcp-server/src/schemas/fiveAxisActionSchemas.ts:171` (`operator_skill` 1-5), `mcp-server/src/schemas/outcomeActionSchemas.ts:144` (`operator_skill_level`), `mcp-server/src/engines/AdditiveManufacturingTribalCorpusEngine.ts:45` (`OperatorSkill` type). Skill is modeled; fatigue/bias is not.
- **Skill-match mitigation hook:** `mcp-server/src/hooks/SpecialtyCadences.ts:110-146` `autoOperatorSkillMatch` warns when job difficulty exceeds operator level — the closest existing "mitigation recommendation" mechanism.
- **Shift/overtime signals a fatigue model could consume:** `mcp-server/src/tools/dispatchers/schedulingDispatcher.ts:97-98` (overtime_needed_hours, `authorize_overtime` / `add_shift_or_outsource` recommendations); `mcp-server/src/__tests__/AutomatedJobSchedulerEngine.test.ts:178-206` (per-entry `overtime_minutes` accounting is real and tested).
- **Cognitive-load naming collision (NOT coverage):** `mcp-server/src/engines/MillingNeuralCognitiveEngine.ts:65,442` — `cognitive_load` there is the ENGINE's own processing level ("reflexive|deliberative|metacognitive|strategic"), not operator load. Do not mistake this for coverage.

## Real gaps

1. **No operator decision-fatigue model exists** — nothing computes a fatigue/decision-quality estimate from shift time, overtime, alarm frequency, decision density, or time-of-shift. (Searched `fatigue`, `decision fatigue`, `cognitive load`, `vigilance`, `human factors` across `mcp-server/src` — only the hits cited above.)
2. **No operator cognitive-bias detection** — the two existing `detectBiases` implementations audit the AI's reasoning trace, not operator override/parameter-edit patterns.
3. **No physics-grounded mitigation engine** — e.g., end-of-shift → tighten S(x) gates / lower override authority / force simulation verification. `autoOperatorSkillMatch` is the only mitigation-shaped asset and it keys on skill, not state.
4. **No validation dataset** — the unit requires "Validation on JM Die operator logs (anonymized)". Bounded search found no operator-log dataset: `grep operator_log|shift_log` across `mcp-server` matched only a comment (`mcp-server/src/engines/GCodeRuntimePredictorEngine.ts:18` "vs operator-logged"). A full-tree glob for `data/**/*operator*` timed out at 20s, so this absence claim is bounded, not exhaustive — but no engine consumes such a dataset, which is strong secondary evidence it is not wired anywhere. **Data acquisition + anonymization is itself a gap and a PII gate** (business-domain rule: defer-pii-to-security; never drop redaction on export).
5. **No prism_ai / prism_safety wiring** for any of the above (nothing to wire yet).

## Verdict

**build**

## Recommended next action

Build a single `OperatorDecisionFatigueEngine` (fatigue-state estimate from shift/overtime/alarm-density inputs already emitted by `schedulingDispatcher` + `AutomatedJobSchedulerEngine`, plus a bias-flag layer that generalizes the `MetaAIOrchestrationEngine.ts:427` detectBiases pattern to operator override/edit sequences) with a mitigation table that maps fatigue band → concrete PRISM-native mitigations (force simulation verify, reduce rapid override, `autoOperatorSkillMatch`-style reassignment). Wire to `prism_ai` and `prism_safety` in the same commit. HOWEVER: before any build, resolve the validation-data blocker — there is no anonymized JM Die operator-log dataset in the repo, so acceptance criterion 4 cannot be met honestly today. Either (a) scope the unit to synthetic + literature-referenced validation with the dataset acquisition queued as an explicit `[SCOPED]` follow-up, or (b) sequence a data-ingestion unit (with PII anonymization gate routed through security) FIRST per R13 logical order. PII handling makes this a joint business+security unit, not a solo build.

## ROI

**4/10** — real safety value (end-of-shift error clustering is documented in the repo's own tribal content), but the mandatory validation dataset does not exist, the model is behavioral (weak physics grounding), and effort will exceed the 5h estimate once PII-safe data ingestion is included; value/effort is below the portfolio median.
