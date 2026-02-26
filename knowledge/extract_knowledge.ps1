# extract_knowledge.ps1 — Extract session knowledge entries
# Usage: powershell -File extract_knowledge.ps1 -EntriesFile <path_to_entries.json>
# Input: JSON array of knowledge entries matching KNOWLEDGE_EXTRACTION_PROTOCOL.md schema
param(
    [string]$EntriesFile
)

$ErrorActionPreference = "Stop"
$KNOWLEDGE_ROOT = "C:\PRISM\knowledge"
$INDEX_FILE = "$KNOWLEDGE_ROOT\sessions\SESSION_KNOWLEDGE_INDEX.json"

# Load entries
if (-not (Test-Path $EntriesFile)) { Write-Error "Entries file not found: $EntriesFile"; exit 1 }
$entries = Get-Content $EntriesFile -Raw | ConvertFrom-Json

# Load existing index
$index = if (Test-Path $INDEX_FILE) {
    Get-Content $INDEX_FILE -Raw | ConvertFrom-Json
} else {
    @{ version = 1; entry_count = 0; last_updated = ""; entries = @(); by_phase = @{}; by_type = @{} }
}

$added = 0
foreach ($entry in $entries) {
    # Write individual knowledge file
    $typeDir = "$KNOWLEDGE_ROOT\$($entry.type -replace '_','')"
    if ($entry.type -eq "error_fix") { $typeDir = "$KNOWLEDGE_ROOT\errors" }
    elseif ($entry.type -eq "decision") { $typeDir = "$KNOWLEDGE_ROOT\decisions" }
    elseif ($entry.type -eq "assumption") { $typeDir = "$KNOWLEDGE_ROOT\observations" }
    elseif ($entry.type -eq "performance") { $typeDir = "$KNOWLEDGE_ROOT\observations" }
    elseif ($entry.type -eq "blocker") { $typeDir = "$KNOWLEDGE_ROOT\sessions" }
    elseif ($entry.type -eq "relationship") { $typeDir = "$KNOWLEDGE_ROOT\relationships" }
    
    New-Item -ItemType Directory -Path $typeDir -Force | Out-Null
    
    $slug = $entry.id
    $mdContent = @"
# $($entry.summary)
Type: $($entry.type) | Phase: $($entry.phase) | MS: $($entry.milestone)
Date: $($entry.date) | Confidence: $($entry.confidence)
Tags: $($entry.tags -join ", ")

$($entry.detail)
"@
    $mdFile = "$typeDir\$slug.md"
    Set-Content $mdFile -Value $mdContent -Encoding UTF8
    
    # Update file path in entry
    $entry | Add-Member -NotePropertyName "file" -NotePropertyValue ($mdFile -replace [regex]::Escape($KNOWLEDGE_ROOT), "") -Force
    
    # Add to index
    $entryIdx = $index.entry_count
    $index.entries += $entry
    $index.entry_count++
    
    # Update by_phase index
    $phase = $entry.phase
    if (-not $index.by_phase.$phase) { $index.by_phase | Add-Member -NotePropertyName $phase -NotePropertyValue @() -Force }
    $index.by_phase.$phase += $entryIdx
    
    # Update by_type index
    $type = $entry.type
    if (-not $index.by_type.$type) { $index.by_type | Add-Member -NotePropertyName $type -NotePropertyValue @() -Force }
    $index.by_type.$type += $entryIdx
    
    $added++
}

$index.last_updated = (Get-Date -Format "yyyy-MM-dd")
$index | ConvertTo-Json -Depth 5 | Set-Content $INDEX_FILE -Encoding UTF8
Write-Host "SUCCESS: Extracted $added knowledge entries. Total in index: $($index.entry_count)"
