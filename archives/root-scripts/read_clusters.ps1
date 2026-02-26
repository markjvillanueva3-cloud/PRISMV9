# Read first 30 lines + last 5 lines of each skill in merge clusters
$base = 'C:\PRISM\skills-consolidated'

$clusters = @{
    'ORCHESTRATION' = @('prism-agent-selector','prism-batch-orchestrator','prism-swarm-coordinator','prism-autonomous-execution','prism-api-acceleration')
    'CODE_QUALITY' = @('prism-code-perfection','prism-coding-patterns','prism-code-complete-integration','prism-typescript-safety','prism-security-coding')
    'AIML' = @('prism-ai-bayesian','prism-ai-deep-learning','prism-ai-optimization','prism-ai-reinforcement','prism-aiml-engine-patterns','prism-learning-engines')
    'COGNITIVE' = @('prism-cognitive-core','prism-reasoning-engine','prism-predictive-thinking','prism-branch-predictor','prism-anomaly-detector','prism-causal-reasoning')
    'MATERIALS' = @('prism-material-schema','prism-material-templates','prism-material-lookup','prism-material-validator','prism-material-enhancer')
    'PHYSICS' = @('prism-physics-formulas','prism-physics-reference','prism-universal-formulas')
    'VALIDATION' = @('prism-quality-gates','prism-ralph-validation','prism-validator','prism-tdd-enhanced')
    'DEV_WORKFLOW' = @('prism-dev-utilities','prism-dispatcher-dev','prism-document-management','prism-module-builder','prism-skill-deployer')
}

foreach ($cluster in $clusters.Keys) {
    Write-Host "===== $cluster ====="
    foreach ($skill in $clusters[$cluster]) {
        $md = Join-Path $base "$skill\SKILL.md"
        if (Test-Path $md) {
            $lines = Get-Content $md
            $size = [math]::Round((Get-Item $md).Length/1024, 1)
            $desc = ($lines | Select-Object -First 12) -join "`n"
            Write-Host "--- $skill (${size}KB, $($lines.Count)L) ---"
            Write-Host $desc
            Write-Host ""
        }
    }
    Write-Host ""
}