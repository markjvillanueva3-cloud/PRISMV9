# Deduplicate material data files
# Strategy: For each gen_v5_promoted_verified.json, check which material_ids 
# already exist in other files in the same group. Remove those duplicates.
# ALSO check cross-file duplicates (gen_v5_*.json entries that also appear in promoted)

$dirs = Get-ChildItem 'C:\PRISM\data\materials' -Directory
$totalRemoved = 0
$totalKept = 0
$changedFiles = @()

foreach($d in $dirs) {
    $files = Get-ChildItem $d.FullName -Filter '*.json' | Where-Object { $_.Name -ne 'index.json' }
    
    # First pass: collect all IDs from non-promoted files
    $primaryIds = @{}  # id -> filename
    $promotedFiles = @()
    
    foreach($f in $files) {
        if($f.Name -match 'promoted') {
            $promotedFiles += $f
            continue
        }
        try {
            $j = Get-Content $f.FullName -Raw | ConvertFrom-Json
            if($j.materials) {
                foreach($m in $j.materials) {
                    $id = if($m.material_id) { $m.material_id } elseif($m.id) { $m.id } else { $null }
                    if($id -and -not $primaryIds.ContainsKey($id)) {
                        $primaryIds[$id] = $f.Name
                    }
                }
            }
        } catch {}
    }
    
    # Second pass: deduplicate promoted files
    foreach($pf in $promotedFiles) {
        try {
            $j = Get-Content $pf.FullName -Raw | ConvertFrom-Json
            if($j.materials) {
                $origCount = $j.materials.Count
                $kept = @()
                $removed = 0
                
                foreach($m in $j.materials) {
                    $id = if($m.material_id) { $m.material_id } elseif($m.id) { $m.id } else { $null }
                    if($id -and $primaryIds.ContainsKey($id)) {
                        $removed++
                    } else {
                        $kept += $m
                        if($id) { $primaryIds[$id] = $pf.Name }
                    }
                }
                
                if($removed -gt 0) {
                    $j.materials = $kept
                    $j | ConvertTo-Json -Depth 20 | Set-Content $pf.FullName -Encoding UTF8
                    $totalRemoved += $removed
                    $totalKept += $kept.Count
                    $changedFiles += "$($d.Name)/$($pf.Name): removed $removed dupes, kept $($kept.Count) of $origCount"
                    Write-Output "$($d.Name)/$($pf.Name): removed $removed duplicates (kept $($kept.Count) of $origCount)"
                } else {
                    Write-Output "$($d.Name)/$($pf.Name): no duplicates found ($origCount materials)"
                }
            }
        } catch {
            Write-Output "ERROR: $($d.Name)/$($pf.Name): $($_.Exception.Message)"
        }
    }
}

Write-Output ""
Write-Output "=== SUMMARY ==="
Write-Output "Total duplicates removed: $totalRemoved"
Write-Output "Total materials kept in promoted files: $totalKept"
Write-Output "Files modified: $($changedFiles.Count)"
