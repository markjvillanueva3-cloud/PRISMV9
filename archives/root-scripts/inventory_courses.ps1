# Full MIT course inventory
$mitBase = "C:\PRISM_ARCHIVE_2026-02-01\RESOURCES\MIT COURSES"
$pdfBase = "C:\PRISM_ARCHIVE_2026-02-01\RESOURCES\RESOURCE PDFS"
$resBase = "C:\PRISM_ARCHIVE_2026-02-01\RESOURCES"

Write-Output "=== MIT COURSES DIRECTORY ==="
if (Test-Path $mitBase) {
    $mitDirs = Get-ChildItem $mitBase -Directory -Recurse -Depth 1
    foreach ($d in $mitDirs) {
        $files = Get-ChildItem $d.FullName -File -ErrorAction SilentlyContinue
        $pdfCount = ($files | Where-Object { $_.Extension -eq ".pdf" }).Count
        $htmlCount = ($files | Where-Object { $_.Extension -eq ".html" -or $_.Extension -eq ".htm" }).Count
        $jsonCount = ($files | Where-Object { $_.Extension -eq ".json" }).Count
        $totalSize = ($files | Measure-Object Length -Sum).Sum
        $sizeMB = if ($totalSize) { [math]::Round($totalSize/1MB, 1) } else { 0 }
        Write-Output "  $($d.Name): $($files.Count) files ($pdfCount pdf, $htmlCount html, $jsonCount json) ${sizeMB}MB"
    }
}

Write-Output "`n=== RESOURCE PDFS DIRECTORY ==="
if (Test-Path $pdfBase) {
    $pdfDirs = Get-ChildItem $pdfBase -Directory -Depth 0
    foreach ($d in $pdfDirs) {
        $files = Get-ChildItem $d.FullName -File -Recurse -ErrorAction SilentlyContinue
        $pdfCount = ($files | Where-Object { $_.Extension -eq ".pdf" }).Count
        $htmlCount = ($files | Where-Object { $_.Extension -eq ".html" -or $_.Extension -eq ".htm" }).Count
        $jsonCount = ($files | Where-Object { $_.Extension -eq ".json" }).Count
        $totalSize = ($files | Measure-Object Length -Sum).Sum
        $sizeMB = if ($totalSize) { [math]::Round($totalSize/1MB, 1) } else { 0 }
        Write-Output "  $($d.Name): $($files.Count) files ($pdfCount pdf, $htmlCount html, $jsonCount json) ${sizeMB}MB"
    }
}

Write-Output "`n=== ROOT RESOURCES (non-catalog) ==="
$rootFiles = Get-ChildItem $resBase -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notmatch "catalog" }
foreach ($f in $rootFiles) {
    $sizeKB = [math]::Round($f.Length/1024)
    Write-Output "  $($f.Name) (${sizeKB}KB)"
}

# Sample one course to see what content looks like
Write-Output "`n=== SAMPLE COURSE CONTENT (first MIT course) ==="
$sampleDir = Get-ChildItem $mitBase -Directory -Depth 0 | Select-Object -First 1
if ($sampleDir) {
    $sampleFiles = Get-ChildItem $sampleDir.FullName -File -Recurse
    foreach ($f in ($sampleFiles | Select-Object -First 15)) {
        $sizeKB = [math]::Round($f.Length/1024)
        Write-Output "  $($f.FullName.Replace($mitBase, '')) (${sizeKB}KB)"
    }
}
