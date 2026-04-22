$ErrorActionPreference = 'Continue'
$outfile = 'h:\PRISM\state\OUTPUT.txt'

$content = @()

$content += "=== TASK_QUEUE.json ==="
$path1 = 'h:\PRISM\state\shared\TASK_QUEUE.json'
if (Test-Path $path1) {
    $content += Get-Content $path1 -Raw
} else {
    $content += "Not found"
}

$content += "`n=== CLAUDE.md ==="
$path2 = 'h:\PRISM\CLAUDE.md'
if (Test-Path $path2) {
    $content += Get-Content $path2 -Raw
} else {
    $content += "Not found"
}

$content += "`n=== SVI-compact.md ==="
$path3 = 'h:\PRISM\state\shared\SVI-compact.md'
if (Test-Path $path3) {
    $content += Get-Content $path3 -Raw
} else {
    $content += "Not found"
}

$content | Out-File -FilePath $outfile -Encoding UTF8
Write-Host "Output written to $outfile"
