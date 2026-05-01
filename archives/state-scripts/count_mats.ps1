$dirs = Get-ChildItem 'C:\PRISM\data\materials' -Directory
foreach($d in $dirs) {
    $files = Get-ChildItem $d.FullName -Filter '*.json' | Where-Object { $_.Name -ne 'index.json' }
    $count = 0
    foreach($f in $files) {
        $j = Get-Content $f.FullName -Raw | ConvertFrom-Json
        if($j.materials) { $count += $j.materials.Count }
    }
    Write-Output "$($d.Name): $($files.Count) files, $count materials"
}
