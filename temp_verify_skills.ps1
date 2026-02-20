$dirs = @(
    'prism-spc-process-capability',
    'prism-doe-manufacturing',
    'prism-surface-roughness',
    'prism-chip-formation',
    'prism-tool-wear-mechanisms',
    'prism-manufacturing-cost',
    'prism-gdt-manufacturing',
    'prism-thermal-effects',
    'prism-vibration-chatter'
)
foreach ($d in $dirs) {
    $p = "C:\PRISM\skills-consolidated\$d\SKILL.md"
    $exists = Test-Path $p
    if ($exists) {
        $item = Get-Item $p
        $size = [math]::Round($item.Length / 1KB, 1)
        $lines = (Get-Content $p).Count
        Write-Host "$d : ${size}KB, $lines lines"
    } else {
        Write-Host "$d : MISSING!" -ForegroundColor Red
    }
}
