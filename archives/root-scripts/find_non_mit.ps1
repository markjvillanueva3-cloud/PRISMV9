# Find non-MIT content and non-course-numbered content
$base = "C:\PRISM_ARCHIVE_2026-02-01\RESOURCES"

Write-Output "=== NON-COURSE ZIPS (may be other universities) ==="
Get-ChildItem $base -Recurse -Filter "*.zip" -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notmatch "^\d+[\.\-]" -and $_.Name -notmatch "^[a-z]{2,4}[\.\-]\d+" -and $_.Name -notmatch "^res[\.\-]" -and $_.Name -notmatch "^MIT COURSES" -and $_.Length -gt 1MB } |
    Sort-Object Length -Descending |
    ForEach-Object {
        $sizeMB = [math]::Round($_.Length/1MB, 1)
        Write-Output "  $($_.Name) (${sizeMB}MB) @ $($_.Directory.Name)"
    }

Write-Output "`n=== RESOURCE PDFS - NON-COURSE ITEMS ==="
Get-ChildItem "$base\RESOURCE PDFS" -Directory -Depth 0 -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notmatch "^\d+[\.\-]" -and $_.Name -notmatch "^res[\.\-]" } |
    ForEach-Object {
        $files = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
        Write-Output "  $($_.Name): $files files"
    }

Write-Output "`n=== MANUFACTURER CATALOGS ==="
$catDir = "$base\MANUFACTURER_CATALOGS\uploaded"
if (Test-Path $catDir) {
    $cats = Get-ChildItem $catDir -File -ErrorAction SilentlyContinue
    Write-Output "Catalogs: $($cats.Count) files"
    $totalGB = ($cats | Measure-Object Length -Sum).Sum / 1GB
    Write-Output "Total size: $([math]::Round($totalGB, 1))GB"
}

Write-Output "`n=== OTHER RESOURCE FOLDERS ==="
Get-ChildItem $base -Directory -Depth 0 -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notmatch "MIT|RESOURCE PDF|MANUFACTURER" } |
    ForEach-Object {
        $files = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
        Write-Output "  $($_.Name): $files files"
    }

# Check PRISM main for any course content
Write-Output "`n=== C:\PRISM\resources ==="
if (Test-Path "C:\PRISM\resources") {
    Get-ChildItem "C:\PRISM\resources" -File -ErrorAction SilentlyContinue |
        ForEach-Object {
            $sizeMB = [math]::Round($_.Length/1MB, 1)
            Write-Output "  $($_.Name) (${sizeMB}MB)"
        }
}
