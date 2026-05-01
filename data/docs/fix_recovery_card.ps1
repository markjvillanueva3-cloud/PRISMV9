$file = "C:\PRISM\mcp-server\data\docs\roadmap\PRISM_RECOVERY_CARD.md"
$lines = [System.IO.File]::ReadAllLines($file)

$changes = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
    # Fix stale DA-MS4 references to DA-MS7
    if ($lines[$i] -match "built in DA-MS4") {
        $lines[$i] = $lines[$i] -replace "built in DA-MS4", "built in DA-MS7"
        $changes++
    }
    if ($lines[$i] -match "Knowledge system is built in DA-MS4") {
        $lines[$i] = $lines[$i] -replace "Knowledge system is built in DA-MS4", "Knowledge system is built in DA-MS7"
        $changes++
    }
    # Add script path hint after the knowledge extraction step
    if ($lines[$i] -match "See HIERARCHICAL_INDEX_SPEC") {
        $lines[$i] = "     TOOL: powershell -File C:\PRISM\knowledge\extract_knowledge.ps1 -EntriesFile <entries.json>"
        $changes++
    }
}

[System.IO.File]::WriteAllLines($file, $lines)
Write-Host "SUCCESS: $changes lines updated in Recovery Card"