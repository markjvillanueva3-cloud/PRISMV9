# HOOK ACTIVATION MATRIX
# Maps phases to expected cadence hooks. Used by autoHookActivationPhaseCheck
# to verify correct hook activation per development phase.
# Format: | Phase | Expected Hooks (comma-separated) | Optional Hooks |

| Phase | Expected Hooks | Optional Hooks |
| --- | --- | --- |
| D1 | autoTodoRefresh, autoCheckpoint, autoContextPressure, autoCompactionDetect, autoAttentionScore | autoSkillHint |
| D2 | autoTodoRefresh, autoCheckpoint, autoContextPressure, autoCompactionDetect, autoAttentionScore, autoContextCompress, autoContextPullBack | autoSkillHint |
| D3 | autoTodoRefresh, autoCheckpoint, autoContextPressure, autoCompactionDetect, autoAttentionScore, autoContextCompress, autoRecoveryManifest | autoHandoffPackage, autoSkillHint |
| D4 | autoTodoRefresh, autoCheckpoint, autoContextPressure, autoCompactionDetect, autoAttentionScore, autoContextCompress, autoRecoveryManifest, autoD4PerfSummary | autoHandoffPackage, autoD4CacheCheck, autoD4BatchTick |
| DA | autoTodoRefresh, autoCheckpoint, autoContextPressure, autoCompactionDetect, autoAttentionScore, autoSkillHint, autoKnowledgeCrossQuery, autoDocAntiRegression, autoPhaseSkillLoader, autoNLHookEvaluator | autoScriptRecommend, autoAgentRecommend, autoHookActivationPhaseCheck, autoD4PerfSummary |
| W1 | autoTodoRefresh, autoCheckpoint, autoContextPressure, autoCompactionDetect, autoAttentionScore, autoSkillHint, autoRecoveryManifest | autoContextCompress |
| W2 | autoTodoRefresh, autoCheckpoint, autoContextPressure, autoCompactionDetect, autoAttentionScore, autoSkillHint, autoRecoveryManifest, autoPhaseSkillLoader | autoScriptRecommend |
| W5 | autoTodoRefresh, autoCheckpoint, autoContextPressure, autoCompactionDetect, autoAttentionScore, autoSkillHint, autoKnowledgeCrossQuery, autoPhaseSkillLoader | autoScriptRecommend, autoAgentRecommend |
| R1 | autoTodoRefresh, autoCheckpoint, autoContextPressure, autoCompactionDetect, autoAttentionScore, autoSkillHint, autoKnowledgeCrossQuery, autoPhaseSkillLoader, autoNLHookEvaluator | autoScriptRecommend, autoDocAntiRegression, autoHookActivationPhaseCheck |
| F1-F8 | autoTodoRefresh, autoCheckpoint, autoContextPressure, autoCompactionDetect, autoAttentionScore, autoSkillHint | autoKnowledgeCrossQuery, autoDocAntiRegression |

## NOTES
- Infrastructure hooks (autoTodoRefresh, autoCheckpoint, autoContextPressure, autoCompactionDetect, autoAttentionScore) are expected in ALL phases
- Phase-specific hooks activate as needed for the development stage
- Missing hooks are logged but not blocking — they produce advisory warnings
- This matrix is parsed by autoHookActivationPhaseCheck every 25 calls
