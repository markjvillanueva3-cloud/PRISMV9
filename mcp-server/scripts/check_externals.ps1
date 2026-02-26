$lines = Get-Content 'C:\PRISM\mcp-server\src\tools\autoHookWrapper.recovered.js'
$externals = @{}
$patterns = @(
    'autoTodoRefresh', 'autoCheckpoint', 'autoContextPressure',
    'autoContextCompress', 'autoCompactionDetect', 'autoCompactionSurvival',
    'rehydrateFromSurvival', 'autoAttentionScore', 'autoContextPullBack',
    'autoRecoveryManifest', 'autoHandoffPackage', 'markHandoffResumed',
    'autoPreCompactionDump', 'autoSkillHint', 'autoKnowledgeCrossQuery',
    'autoDocAntiRegression', 'autoAgentRecommend', 'autoPhaseSkillLoader',
    'autoSkillContextMatch', 'autoNLHookEvaluator', 'autoHookActivationPhaseCheck',
    'autoD4PerfSummary', 'autoResponseTemplate', 'getResponseTemplateStats',
    'autoPreTaskRecon', 'autoWarmStartData', 'autoContextRehydrate',
    'autoInputValidation', 'autoErrorLearn', 'autoD3ErrorChain',
    'autoD3LkgUpdate', 'autoAntiRegression', 'autoDecisionCapture',
    'autoQualityGate', 'autoVariationCheck', 'autoD4CacheCheck',
    'autoD4DiffCheck', 'autoD4BatchTick', 'autoTelemetrySnapshot',
    'autoPythonCompactionPredict', 'autoPythonCompress', 'autoPythonExpand',
    'autoScriptRecommend', 'autoManusATCSPoll', 'getBridgeStatus',
    'hookExecutor', 'hookEngine', 'computationCache',
    'slimJsonResponse', 'slimCadence', 'getSlimLevel', 'getCurrentPressurePct',
    'recordSessionToolCall', 'recordSessionHook', 'recordSessionError',
    'writeSessionIncrementalPrep', 'getSessionQualityScore', 'getSessionMetrics',
    'recordSessionSkillInjection', 'recordSessionTemplateMatch',
    'recordSessionPressure', 'recordSessionCheckpoint',
    'recordSessionCompactionRecovery'
)
foreach ($p in $patterns) {
    $count = ($lines | Select-String -Pattern $p -SimpleMatch).Count
    if ($count -gt 0) { Write-Host "$p : $count occurrences" }
}
