# Apply role/model/effort to DA phase - targeted edits
$file = "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_DA_DEV_ACCELERATION.md"
$content = Get-Content $file

# DA-MS0: Add role/model/effort after the ## header line
$ms0Line = ($content | Select-String "^## DA-MS0:").LineNumber - 1
if ($content[$ms0Line + 1] -notmatch "^### Role:") {
    $insert = "### Role: Context Engineer | Model: Sonnet (audit) → Haiku (bulk anchors) | Effort: M (10-15 calls) | Sessions: 1-2"
    $content = $content[0..$ms0Line] + $insert + $content[($ms0Line+1)..($content.Count-1)]
    Write-Output "Added DA-MS0 assignment"
}

# Save and re-read for next edit
Set-Content $file $content
$content = Get-Content $file

# DA-MS1
$ms1Line = ($content | Select-String "^## DA-MS1:").LineNumber - 1
if ($content[$ms1Line + 1] -notmatch "^### Role:") {
    $insert = "### Role: Systems Architect | Model: Opus (subagent architecture) → Sonnet (implementation) | Effort: L (15-20 calls) | Sessions: 2"
    $content = $content[0..$ms1Line] + $insert + $content[($ms1Line+1)..($content.Count-1)]
    Write-Output "Added DA-MS1 assignment"
}
Set-Content $file $content
$content = Get-Content $file

# DA-MS2
$ms2Line = ($content | Select-String "^## DA-MS2:").LineNumber - 1
if ($content[$ms2Line + 1] -notmatch "^### Role:") {
    $insert = "### Role: Context Engineer | Model: Sonnet (skill conversion + commands) | Effort: L (15-20 calls) | Sessions: 2"
    $content = $content[0..$ms2Line] + $insert + $content[($ms2Line+1)..($content.Count-1)]
    Write-Output "Added DA-MS2 assignment"
}
Set-Content $file $content
$content = Get-Content $file

# DA-MS3
$ms3Line = ($content | Select-String "^## DA-MS3:").LineNumber - 1
if ($content[$ms3Line + 1] -notmatch "^### Role:") {
    $insert = "### Role: Systems Architect | Model: Opus (strategy) → Sonnet (implementation) | Effort: M (10-15 calls) | Sessions: 1"
    $content = $content[0..$ms3Line] + $insert + $content[($ms3Line+1)..($content.Count-1)]
    Write-Output "Added DA-MS3 assignment"
}
Set-Content $file $content
$content = Get-Content $file

# DA-MS4
$ms4Line = ($content | Select-String "^## DA-MS4:").LineNumber - 1
if ($content[$ms4Line + 1] -notmatch "^### Role:") {
    $insert = "### Role: Systems Architect | Model: Sonnet (hook config + testing) | Effort: S (5-8 calls) | Sessions: 0.5"
    $content = $content[0..$ms4Line] + $insert + $content[($ms4Line+1)..($content.Count-1)]
    Write-Output "Added DA-MS4 assignment"
}
Set-Content $file $content
Write-Output "DA MS0-MS4 done"
