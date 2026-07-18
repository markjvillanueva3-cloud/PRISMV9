$path = 'C:\PRISM\mcp-server\data\docs\roadmap\PRISM_RECOVERY_CARD.md'
$lines = [System.IO.File]::ReadAllLines($path)
for ($i = 0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match 'MINIMAL MODE.*skip MASTER_INDEX.*PROTOCOLS_CORE') {
        $lines[$i] = '    -> MINIMAL MODE. Load Recovery Card ONLY (skip MASTER_INDEX, PROTOCOLS_BOOT/SAFETY/CODING).'
        Write-Host "Fixed line $($i+1)"
    }
}
[System.IO.File]::WriteAllLines($path, $lines)
Write-Host 'Recovery Card updated'
