# BULK DELETE - All source skills that have been merged into consolidated skills
$base = 'C:\PRISM\skills-consolidated'
$toDelete = @(
    # Orchestration merge -> prism-orchestration
    'prism-agent-selector',
    'prism-batch-orchestrator',
    'prism-swarm-coordinator',
    'prism-autonomous-execution',
    'prism-api-acceleration',
    # Code Quality merge -> prism-code-quality
    'prism-code-perfection',
    'prism-coding-patterns',
    'prism-code-complete-integration',
    # Code Safety merge -> prism-code-safety
    'prism-typescript-safety',
    'prism-security-coding',
    # AI/ML merge -> prism-aiml-unified
    'prism-ai-bayesian',
    'prism-ai-deep-learning',
    'prism-ai-optimization',
    'prism-ai-reinforcement',
    'prism-aiml-engine-patterns',
    'prism-learning-engines',
    # Cognitive merge -> prism-cognitive-core (overwritten)
    'prism-reasoning-engine',
    'prism-predictive-thinking',
    'prism-branch-predictor',
    # Safety Cognition merge -> prism-safety-cognition
    'prism-anomaly-detector',
    'prism-causal-reasoning',
    # Materials merge -> prism-materials-core
    'prism-material-schema',
    'prism-material-templates',
    'prism-material-lookup',
    'prism-material-validator',
    'prism-material-enhancer',
    # Physics merge -> prism-physics-unified
    'prism-physics-formulas',
    'prism-physics-reference',
    'prism-universal-formulas',
    # Validation merge -> prism-validation-unified
    'prism-quality-gates',
    'prism-ralph-validation',
    'prism-validator',
    'prism-tdd-enhanced',
    # Dev Workflow merge -> prism-dev-guide
    'prism-dev-utilities',
    'prism-dispatcher-dev',
    'prism-document-management',
    'prism-module-builder',
    'prism-skill-deployer'
)

$deleted = 0
$failed = 0
$savedKB = 0
foreach ($name in $toDelete) {
    $path = Join-Path $base $name
    if (Test-Path $path) {
        $md = Join-Path $path 'SKILL.md'
        if (Test-Path $md) { $savedKB += [math]::Round((Get-Item $md).Length/1024, 1) }
        Remove-Item $path -Recurse -Force
        Write-Host "DELETED: $name"
        $deleted++
    } else {
        Write-Host "SKIP (already gone): $name"
        $failed++
    }
}
Write-Host ""
Write-Host "Deleted: $deleted | Skipped: $failed | Space freed: ${savedKB}KB"