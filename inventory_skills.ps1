# Inventory current skills
$skillsDir = "C:\PRISM\skills-consolidated"

Write-Output "=== SKILLS DIRECTORY STRUCTURE ==="
if (Test-Path $skillsDir) {
    $dirs = Get-ChildItem $skillsDir -Directory -Recurse | Select-Object FullName
    Write-Output "Subdirectories: $($dirs.Count)"
    foreach ($d in $dirs) { Write-Output "  $($d.FullName.Replace($skillsDir, ''))" }
    
    Write-Output "`n=== SKILL FILES ==="
    $files = Get-ChildItem $skillsDir -File -Recurse
    Write-Output "Total files: $($files.Count)"
    
    $mdFiles = $files | Where-Object { $_.Extension -eq ".md" }
    Write-Output "Markdown files: $($mdFiles.Count)"
    
    $jsonFiles = $files | Where-Object { $_.Extension -eq ".json" }
    Write-Output "JSON files: $($jsonFiles.Count)"
    
    Write-Output "`n=== SAMPLE SKILL FILES (first 30) ==="
    foreach ($f in ($files | Select-Object -First 30)) {
        $size = [math]::Round($f.Length/1024, 1)
        Write-Output "  $($f.FullName.Replace($skillsDir, '')) (${size}KB)"
    }
} else {
    Write-Output "Skills dir not found at $skillsDir"
    # Check alternate locations
    $alt = @("C:\PRISM\mcp-server\data\skills", "C:\PRISM\mcp-server\skills", "C:\PRISM\skills")
    foreach ($a in $alt) {
        if (Test-Path $a) { Write-Output "FOUND at: $a" }
    }
}

Write-Output "`n=== MIT/COLLEGE COURSES ==="
$courseDirs = @("C:\PRISM\courses", "C:\PRISM\mcp-server\data\courses", "C:\PRISM\MIT", "C:\PRISM\mcp-server\data\docs\courses", "C:\Users")
foreach ($c in $courseDirs) {
    if (Test-Path $c) {
        $count = (Get-ChildItem $c -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
        Write-Output "FOUND: $c ($count files)"
    }
}

# Also check for course-like content elsewhere
Write-Output "`n=== SEARCHING FOR COURSE CONTENT ==="
$hits = Get-ChildItem "C:\PRISM" -Directory | Where-Object { $_.Name -match "course|MIT|lecture|textbook|edu" }
foreach ($h in $hits) { Write-Output "  $($h.FullName)" }
