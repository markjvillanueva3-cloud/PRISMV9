$base = 'C:\PRISM\skills-consolidated'
$targets = @(
    'prism-category-defaults',
    'prism-derivation-helpers',
    'prism-formal-definitions',
    'prism-cognitive-enhancement',
    'prism-development',
    'prism-dev-tools'
)

foreach ($t in $targets) {
    $path = Join-Path $base $t
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path
        Write-Host "DELETED: $t"
    } else {
        Write-Host "NOT FOUND: $t"
    }
}

# Count remaining
$remaining = (Get-ChildItem $base -Directory).Count
$mdCount = (Get-ChildItem $base -Filter '*.md' -File).Count
Write-Host "`nRemaining: $remaining directories, $mdCount standalone .md files"