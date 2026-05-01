# Deep search for course/educational content
Write-Output "=== SEARCHING ALL DRIVES FOR COURSE CONTENT ==="

# Search for common course file types in likely locations
$searchRoots = @("C:\PRISM", "C:\PRISM-MCP-SERVER", "C:\PRISM_ARCHIVE_2026-02-01", "C:\Users", "D:\")

foreach ($root in $searchRoots) {
    if (Test-Path $root) {
        Write-Output "`n--- Searching $root ---"
        
        # Find PDFs
        $pdfs = Get-ChildItem $root -Recurse -Filter "*.pdf" -ErrorAction SilentlyContinue | 
            Where-Object { $_.Length -gt 100KB } | Select-Object -First 30
        if ($pdfs.Count -gt 0) {
            Write-Output "PDFs found: $($pdfs.Count)"
            foreach ($p in ($pdfs | Select-Object -First 15)) {
                $sizeKB = [math]::Round($p.Length/1024)
                Write-Output "  $($p.FullName) (${sizeKB}KB)"
            }
            if ($pdfs.Count -gt 15) { Write-Output "  ... and $($pdfs.Count - 15) more" }
        }
        
        # Find course-like directories
        $dirs = Get-ChildItem $root -Directory -Recurse -Depth 3 -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -match "MIT|OCW|course|lecture|textbook|curriculum|education|class|study|learn|reference|resource" }
        if ($dirs.Count -gt 0) {
            Write-Output "Course-like directories:"
            foreach ($d in $dirs) {
                $fcount = (Get-ChildItem $d -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
                Write-Output "  $($d.FullName) ($fcount files)"
            }
        }
    }
}

# Also check for any large educational content files
Write-Output "`n=== LARGE CONTENT FILES (>1MB, likely textbooks/courses) ==="
$bigFiles = Get-ChildItem "C:\PRISM" -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Length -gt 1MB -and $_.Extension -match "\.pdf|\.epub|\.txt|\.md|\.html|\.json" } |
    Sort-Object Length -Descending | Select-Object -First 20
foreach ($f in $bigFiles) {
    $sizeMB = [math]::Round($f.Length/1MB, 1)
    Write-Output "  $($f.FullName) (${sizeMB}MB)"
}
