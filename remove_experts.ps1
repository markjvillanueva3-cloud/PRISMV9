$experts = @(
    'prism-expert-cad-expert',
    'prism-expert-cam-programmer',
    'prism-expert-master-machinist',
    'prism-expert-materials-scientist',
    'prism-expert-mathematics',
    'prism-expert-mechanical-engineer',
    'prism-expert-post-processor',
    'prism-expert-quality-control',
    'prism-expert-quality-manager',
    'prism-expert-thermodynamics'
)
foreach ($e in $experts) {
    $path = "C:\PRISM\skills-consolidated\$e"
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path
        Write-Host "Removed: $e"
    }
}
Write-Host "Done - removed $($experts.Count) expert skills"