# Find ALL course content comprehensively
$base = "C:\PRISM_ARCHIVE_2026-02-01\RESOURCES"

# 1. List ALL zip files that look like courses (pattern: digits.digits-term-year)
Write-Output "=== ALL COURSE ZIPS (every folder) ==="
$allZips = Get-ChildItem $base -Recurse -Filter "*.zip" -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match "^\d+[\.\-]" -or $_.Name -match "^[a-z]{2,4}[\.\-]\d+" -or $_.Name -match "^res[\.\-]" }
Write-Output "Course zips found: $($allZips.Count)"
$courseNames = @{}
foreach ($z in ($allZips | Sort-Object Name)) {
    $courseName = $z.BaseName -replace '\(.*\)$','' | ForEach-Object { $_.Trim() }
    if (-not $courseNames.ContainsKey($courseName)) {
        $courseNames[$courseName] = $z.FullName.Replace($base, '')
        $sizeMB = [math]::Round($z.Length/1MB, 1)
        Write-Output "  $courseName (${sizeMB}MB) @ $($z.Directory.Name)"
    }
}
Write-Output "`nUnique course numbers: $($courseNames.Count)"

# 2. Check the split archive
Write-Output "`n=== SPLIT ARCHIVE (MIT COURSES 5) ==="
$splitFiles = Get-ChildItem "$base\MIT COURSES\MIT COURSES 5\UPLOADED" -Filter "*.zip.*" -ErrorAction SilentlyContinue |
    Sort-Object Name
Write-Output "Split parts: $($splitFiles.Count)"
$totalSplitMB = ($splitFiles | Measure-Object Length -Sum).Sum / 1MB
Write-Output "Total size: $([math]::Round($totalSplitMB))MB"
foreach ($s in $splitFiles) {
    Write-Output "  $($s.Name) ($([math]::Round($s.Length/1MB))MB)"
}
