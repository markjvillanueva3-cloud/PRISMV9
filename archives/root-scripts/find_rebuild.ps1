# Comprehensive search for ALL course content
Write-Output "=== C:\PRISM Rebuild ==="
$rebuildPath = "C:\PRISM Rebuild"
if (Test-Path $rebuildPath) {
    Write-Output "FOUND: $rebuildPath"
    $topDirs = Get-ChildItem $rebuildPath -Directory -Depth 0
    foreach ($d in $topDirs) {
        $fcount = (Get-ChildItem $d.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
        $size = (Get-ChildItem $d.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
        $sizeMB = if ($size) { [math]::Round($size/1MB) } else { 0 }
        Write-Output "  $($d.Name): $fcount files, ${sizeMB}MB"
    }
    $rootFiles = Get-ChildItem $rebuildPath -File -Depth 0
    if ($rootFiles.Count -gt 0) {
        Write-Output "  Root files: $($rootFiles.Count)"
        foreach ($f in ($rootFiles | Select-Object -First 10)) {
            Write-Output "    $($f.Name) ($([math]::Round($f.Length/1KB))KB)"
        }
    }
} else {
    # Try variations
    $variations = @("C:\PRISM Rebuild", "C:\PRISM-Rebuild", "C:\PRISMRebuild", "C:\Prism Rebuild")
    foreach ($v in $variations) {
        if (Test-Path $v) { Write-Output "FOUND AT: $v" }
    }
    # Broader search
    Write-Output "Searching C:\ root for rebuild/resource dirs..."
    Get-ChildItem "C:\" -Directory -Depth 0 | Where-Object { 
        $_.Name -match "PRISM|rebuild|resource|course|MIT" 
    } | ForEach-Object {
        $fcount = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
        Write-Output "  $($_.FullName): $fcount files"
    }
}
