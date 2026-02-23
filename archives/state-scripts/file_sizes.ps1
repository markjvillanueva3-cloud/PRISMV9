$dirs = Get-ChildItem 'C:\PRISM\data\materials' -Directory
foreach($d in $dirs) {
    $files = Get-ChildItem $d.FullName -Filter '*.json' | Where-Object { $_.Name -ne 'index.json' } | Sort-Object Length -Descending
    foreach($f in $files) {
        $sizeMB = [math]::Round($f.Length / 1MB, 2)
        $j = Get-Content $f.FullName -Raw | ConvertFrom-Json
        $matCount = if($j.materials) { $j.materials.Count } else { 0 }
        Write-Output "$($d.Name)/$($f.Name): $($f.Length) bytes ($sizeMB MB), $matCount materials"
    }
}
