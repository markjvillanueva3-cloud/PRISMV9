# Count ALL unique course zips across all locations
$allZips = @()

# MIT COURSES root
$paths = @(
    "C:\PRISM_ARCHIVE_2026-02-01\RESOURCES\MIT COURSES",
    "C:\PRISM_ARCHIVE_2026-02-01\RESOURCES\RESOURCE PDFS"
)

foreach ($base in $paths) {
    if (Test-Path $base) {
        $zips = Get-ChildItem $base -Recurse -File -ErrorAction SilentlyContinue |
            Where-Object { $_.Extension -eq ".zip" -and $_.Name -match "^\d+\." }
        foreach ($z in $zips) { $allZips += $z.Name }
    }
}

# Also check PRISM main
$prismZips = Get-ChildItem "C:\PRISM" -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -eq ".zip" -and $_.Name -match "^\d+\.\d+.*\d{4}" -and $_.Length -gt 1MB }
foreach ($z in $prismZips) { $allZips += $z.Name }

$unique = $allZips | Sort-Object -Unique
Write-Output "TOTAL UNIQUE COURSE ZIPS: $($unique.Count)"

# Extract course numbers
$courseNumbers = @{}
foreach ($z in $unique) {
    if ($z -match "^([\d\.]+[a-z]?j?)-") {
        $num = $Matches[1]
        if (-not $courseNumbers.ContainsKey($num)) { $courseNumbers[$num] = @() }
        $courseNumbers[$num] += $z
    }
}

Write-Output "`nUNIQUE COURSE NUMBERS: $($courseNumbers.Count)"
Write-Output "`n=== ALL COURSES BY NUMBER ==="
foreach ($kv in ($courseNumbers.GetEnumerator() | Sort-Object Key)) {
    Write-Output "  $($kv.Key): $($kv.Value -join ', ')"
}

# Also count extracted (non-zip) courses
Write-Output "`n=== EXTRACTED COURSES (with content dirs) ==="
$extracted = Get-ChildItem "C:\PRISM_ARCHIVE_2026-02-01\RESOURCES" -Recurse -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match "^[\d\.]+[a-z]?j?-(spring|fall|january)" -and (Test-Path (Join-Path $_.FullName "pages")) }
foreach ($e in $extracted) {
    $files = (Get-ChildItem $e.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
    Write-Output "  $($e.Name): $files files (extracted)"
}
