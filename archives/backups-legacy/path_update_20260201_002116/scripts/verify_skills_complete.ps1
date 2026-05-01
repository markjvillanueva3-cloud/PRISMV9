# PRISM SKILLS COMPLETE COPY SCRIPT
# Run this in PowerShell to verify the complete folder

$destBase = "C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_SKILLS_UPLOAD_COMPLETE"

# Container skills (28) - will be copied from container
$containerSkills = @(
    "prism-all-skills",
    "prism-always-on-mindsets",
    "prism-anti-regression",
    "prism-code-complete-integration",
    "prism-codebase-packaging",
    "prism-life-safety-mindset",
    "prism-mandatory-microsession",
    "prism-material-enhancer",
    "prism-material-lookup",
    "prism-material-physics",
    "prism-material-schema",
    "prism-maximum-completeness",
    "prism-monolith-extractor",
    "prism-monolith-index",
    "prism-monolith-navigator",
    "prism-predictive-thinking",
    "prism-root-cause-tracing",
    "prism-session-master",
    "prism-skill-orchestrator",
    "prism-sp-brainstorm",
    "prism-sp-debugging",
    "prism-sp-execution",
    "prism-sp-handoff",
    "prism-sp-planning",
    "prism-sp-review-quality",
    "prism-sp-review-spec",
    "prism-sp-verification",
    "prism-tdd-enhanced"
)

# New skills from C: drive (11)
$newSkills = @(
    "prism-deep-learning",
    "prism-validator",
    "prism-quality-master",
    "prism-code-master",
    "prism-knowledge-master",
    "prism-expert-master",
    "prism-dev-utilities",
    "prism-controller-quick-ref",
    "prism-api-contracts",
    "prism-error-catalog",
    "prism-manufacturing-tables"
)

$allSkills = $containerSkills + $newSkills

Write-Host "PRISM SKILLS COMPLETE VERIFICATION"
Write-Host "=================================="
Write-Host "Expected: $($allSkills.Count) skills (28 container + 11 new)"
Write-Host ""

$found = 0
$missing = @()

foreach ($skill in $allSkills) {
    $path = Join-Path $destBase "$skill\SKILL.md"
    if (Test-Path $path) {
        $size = [math]::Round((Get-Item $path).Length / 1024, 1)
        Write-Host "[OK] $skill ($size KB)" -ForegroundColor Green
        $found++
    } else {
        Write-Host "[MISSING] $skill" -ForegroundColor Red
        $missing += $skill
    }
}

Write-Host ""
Write-Host "SUMMARY: $found / $($allSkills.Count) skills present"

if ($missing.Count -gt 0) {
    Write-Host "MISSING SKILLS:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "  - $_" }
}
