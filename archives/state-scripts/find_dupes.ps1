$dirs = Get-ChildItem 'C:\PRISM\data\materials' -Directory
$allIds = @{}
$dupes = @()
$totalMaterials = 0
$filesWithIssues = @()

foreach($d in $dirs) {
    $files = Get-ChildItem $d.FullName -Filter '*.json' | Where-Object { $_.Name -ne 'index.json' }
    foreach($f in $files) {
        try {
            $j = Get-Content $f.FullName -Raw | ConvertFrom-Json
            if($j.materials) {
                $fileName = $f.BaseName
                for($i=0; $i -lt $j.materials.Count; $i++) {
                    $m = $j.materials[$i]
                    $id = if($m.material_id) { $m.material_id } elseif($m.id) { $m.id } else { "$($d.Name)-$fileName-$($i.ToString('D4'))" }
                    $totalMaterials++
                    if($allIds.ContainsKey($id)) {
                        $dupes += "$id (in $($allIds[$id]) AND $($d.Name)/$($f.Name))"
                    } else {
                        $allIds[$id] = "$($d.Name)/$($f.Name)"
                    }
                }
            }
        } catch {
            $filesWithIssues += "$($d.Name)/$($f.Name): $($_.Exception.Message)"
        }
    }
}

Write-Output "Total materials in files: $totalMaterials"
Write-Output "Unique IDs: $($allIds.Count)"
Write-Output "Duplicate IDs: $($dupes.Count)"
Write-Output ""
if($dupes.Count -gt 0) {
    Write-Output "=== DUPLICATE IDS (first 50) ==="
    $dupes | Select-Object -First 50 | ForEach-Object { Write-Output $_ }
}
if($filesWithIssues.Count -gt 0) {
    Write-Output ""
    Write-Output "=== FILES WITH ISSUES ==="
    $filesWithIssues | ForEach-Object { Write-Output $_ }
}
