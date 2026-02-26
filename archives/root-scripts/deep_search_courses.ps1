# Search everywhere for course content
Write-Output "=== ALL C:\ ROOT DIRECTORIES ==="
Get-ChildItem "C:\" -Directory -Depth 0 -ErrorAction SilentlyContinue | 
    Where-Object { $_.Name -notmatch "^\$|Windows|Program|PerfLogs|Recovery|Intel" } |
    ForEach-Object { Write-Output "  $($_.Name)" }

Write-Output "`n=== D:\ EXISTS? ==="
if (Test-Path "D:\") {
    Get-ChildItem "D:\" -Directory -Depth 0 -ErrorAction SilentlyContinue |
        ForEach-Object { Write-Output "  $($_.Name)" }
} else { Write-Output "  No D: drive" }

Write-Output "`n=== DEEP SEARCH: MIT course folders (any depth) ==="
# Look for MIT OCW course number patterns like "2.830j" "6.006" "18.03" etc
$allPrismDirs = Get-ChildItem "C:\PRISM_ARCHIVE_2026-02-01\RESOURCES" -Directory -Recurse -Depth 3 -ErrorAction SilentlyContinue
$courseDirs = $allPrismDirs | Where-Object { $_.Name -match "^\d+\.\d+" }
Write-Output "Course-numbered directories found: $($courseDirs.Count)"
foreach ($d in ($courseDirs | Sort-Object Name)) {
    Write-Output "  $($d.FullName.Replace('C:\PRISM_ARCHIVE_2026-02-01\RESOURCES\', ''))"
}

Write-Output "`n=== ARCHIVE RESOURCES FULL STRUCTURE ==="
Get-ChildItem "C:\PRISM_ARCHIVE_2026-02-01\RESOURCES" -Directory -Depth 0 | ForEach-Object {
    $fcount = (Get-ChildItem $_.FullName -File -ErrorAction SilentlyContinue).Count
    $subdirs = (Get-ChildItem $_.FullName -Directory -ErrorAction SilentlyContinue).Count
    $size = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
    $sizeGB = if ($size) { [math]::Round($size/1GB, 2) } else { 0 }
    Write-Output "  $($_.Name): $fcount files, $subdirs subdirs, ${sizeGB}GB"
}

Write-Output "`n=== SEARCHING FOR 'UPLOADED' ZIP/TAR FILES (may contain courses) ==="
Get-ChildItem "C:\PRISM_ARCHIVE_2026-02-01\RESOURCES" -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -match "\.zip|\.tar|\.gz|\.7z" -and $_.Length -gt 1MB } |
    Sort-Object Length -Descending | Select-Object -First 20 |
    ForEach-Object {
        $sizeMB = [math]::Round($_.Length/1MB)
        Write-Output "  $($_.FullName.Replace('C:\PRISM_ARCHIVE_2026-02-01\RESOURCES\', '')) (${sizeMB}MB)"
    }

Write-Output "`n=== UPLOADED FOLDERS CONTENT ==="
Get-ChildItem "C:\PRISM_ARCHIVE_2026-02-01\RESOURCES" -Recurse -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -eq "UPLOADED" -or $_.Name -eq "uploaded" -or $_.Name -eq "FULL FILES" } |
    ForEach-Object {
        $files = Get-ChildItem $_.FullName -File -ErrorAction SilentlyContinue
        Write-Output "`n  $($_.FullName.Replace('C:\PRISM_ARCHIVE_2026-02-01\RESOURCES\', '')):"
        foreach ($f in ($files | Sort-Object Name | Select-Object -First 20)) {
            $sizeMB = [math]::Round($f.Length/1MB, 1)
            Write-Output "    $($f.Name) (${sizeMB}MB)"
        }
        if ($files.Count -gt 20) { Write-Output "    ... and $($files.Count - 20) more" }
    }
