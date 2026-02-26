$srcDir = "C:\PRISM\mcp-server\data\docs\roadmap"
$zipPath = "C:\PRISM\roadmap-v14.4.zip"
$staging = "C:\PRISM\roadmap-v14.4"

if (Test-Path $zipPath) { Remove-Item $zipPath }
if (Test-Path $staging) { Remove-Item $staging -Recurse }

New-Item -ItemType Directory -Path $staging | Out-Null
New-Item -ItemType Directory -Path (Join-Path $staging "reference") | Out-Null

Get-ChildItem -Path $srcDir -Filter "*.md" -File | Copy-Item -Destination $staging
$refDir = Join-Path $srcDir "reference"
if (Test-Path $refDir) {
    Get-ChildItem -Path $refDir -Filter "*.md" -File | Copy-Item -Destination (Join-Path $staging "reference")
}

Compress-Archive -Path $staging -DestinationPath $zipPath
$info = Get-Item $zipPath
$count = (Get-ChildItem $staging -Recurse -File).Count
Write-Output "Packaged $count files into $zipPath ($([math]::Round($info.Length/1024))KB)"

# Line count summary
Write-Output "`n=== KEY FILE SIZES ==="
foreach ($f in @("PRISM_RECOVERY_CARD.md","PRISM_PROTOCOLS_CORE.md","PRISM_MASTER_INDEX.md",
    "PHASE_DA_DEV_ACCELERATION.md","PHASE_R1_REGISTRY.md","HIERARCHICAL_INDEX_SPEC.md",
    "SYSTEM_CONTRACT.md","SKILLS_SCRIPTS_HOOKS_PLAN.md")) {
    $lines = (Get-Content (Join-Path $staging $f)).Count
    Write-Output "  $f : $lines lines"
}

Remove-Item $staging -Recurse
