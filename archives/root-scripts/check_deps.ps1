$dir = "C:\PRISM\mcp-server\data\docs\roadmap"
$files = @('PHASE_R7_INTELLIGENCE.md','PHASE_R8_EXPERIENCE.md','PHASE_R9_INTEGRATION.md')
foreach ($f in $files) {
    $path = Join-Path $dir $f
    $count = (Select-String -Path $path -Pattern "DEPENDS ON" -SimpleMatch | Measure-Object).Count
    $hdr = (Get-Content $path | Select-Object -First 5) -join " | "
    Write-Output "$f : DEPENDS_ON=$count | Header: $hdr"
}
