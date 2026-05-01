$dirs = Get-ChildItem 'C:\PRISM\data\materials' -Directory
$allIds = @{}
$dupesPerGroup = @{}
$uniquePerGroup = @{}

foreach($d in $dirs) {
    $groupDupes = 0
    $groupUnique = 0
    $files = Get-ChildItem $d.FullName -Filter '*.json' | Where-Object { $_.Name -ne 'index.json' }
    foreach($f in $files) {
        try {
            $j = Get-Content $f.FullName -Raw | ConvertFrom-Json
            if($j.materials) {
                $fileName = $f.BaseName
                for($i=0; $i -lt $j.materials.Count; $i++) {
                    $m = $j.materials[$i]
                    $id = if($m.material_id) { $m.material_id } elseif($m.id) { $m.id } else { "$($d.Name)-$fileName-$($i.ToString('D4'))" }
                    if($allIds.ContainsKey($id)) {
                        $groupDupes++
                    } else {
                        $allIds[$id] = $true
                        $groupUnique++
                    }
                }
            }
        } catch {}
    }
    $dupesPerGroup[$d.Name] = $groupDupes
    $uniquePerGroup[$d.Name] = $groupUnique
}

Write-Output "GROUP           | ON DISK | UNIQUE | DUPES"
Write-Output "----------------|---------|--------|------"
$groups = @('H_HARDENED','K_CAST_IRON','M_STAINLESS','N_NONFERROUS','P_STEELS','S_SUPERALLOYS','X_SPECIALTY')
$totalDisk = 0; $totalUnique = 0; $totalDupes = 0
foreach($g in $groups) {
    $disk = $uniquePerGroup[$g] + $dupesPerGroup[$g]
    $totalDisk += $disk; $totalUnique += $uniquePerGroup[$g]; $totalDupes += $dupesPerGroup[$g]
    Write-Output ("{0,-16}| {1,7} | {2,6} | {3,5}" -f $g, $disk, $uniquePerGroup[$g], $dupesPerGroup[$g])
}
Write-Output "----------------|---------|--------|------"
Write-Output ("{0,-16}| {1,7} | {2,6} | {3,5}" -f "TOTAL", $totalDisk, $totalUnique, $totalDupes)
