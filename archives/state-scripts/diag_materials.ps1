# Find materials that exist on disk but might fail to load
# Check for materials without material_id OR id fields (would get fallback IDs)
$dirs = Get-ChildItem 'C:\PRISM\data\materials' -Directory
$noId = @()
$emptyMaterials = @()
$parseErrors = @()
$uniqueIds = @{}
$totalParsed = 0

foreach($d in $dirs) {
    $files = Get-ChildItem $d.FullName -Filter '*.json' | Where-Object { $_.Name -ne 'index.json' }
    foreach($f in $files) {
        try {
            $j = Get-Content $f.FullName -Raw | ConvertFrom-Json
            if($j.materials) {
                if($j.materials.Count -eq 0) {
                    $emptyMaterials += "$($d.Name)/$($f.Name)"
                }
                $fileName = $f.BaseName
                for($i=0; $i -lt $j.materials.Count; $i++) {
                    $m = $j.materials[$i]
                    $id = $null
                    if($m.material_id) { $id = $m.material_id }
                    elseif($m.id) { $id = $m.id }
                    
                    if(-not $id) {
                        $noId += "$($d.Name)/$($f.Name) index=$i name=$($m.name)"
                        $id = "$($d.Name)-$fileName-$($i.ToString('D4'))"
                    }
                    
                    if(-not $uniqueIds.ContainsKey($id)) {
                        $uniqueIds[$id] = "$($d.Name)/$($f.Name)"
                        $totalParsed++
                    }
                }
            } else {
                $emptyMaterials += "$($d.Name)/$($f.Name) (no .materials array)"
            }
        } catch {
            $parseErrors += "$($d.Name)/$($f.Name): $($_.Exception.Message)"
        }
    }
}

Write-Output "Total unique materials parsed: $totalParsed"
Write-Output "Materials without material_id or id: $($noId.Count)"
Write-Output "Files with empty/no materials array: $($emptyMaterials.Count)"
Write-Output "Parse errors: $($parseErrors.Count)"

if($noId.Count -gt 0) {
    Write-Output ""
    Write-Output "=== NO ID (first 20) ==="
    $noId | Select-Object -First 20 | ForEach-Object { Write-Output $_ }
}
if($emptyMaterials.Count -gt 0) {
    Write-Output ""
    Write-Output "=== EMPTY FILES ==="
    $emptyMaterials | ForEach-Object { Write-Output $_ }
}
if($parseErrors.Count -gt 0) {
    Write-Output ""
    Write-Output "=== PARSE ERRORS ==="
    $parseErrors | ForEach-Object { Write-Output $_ }
}
