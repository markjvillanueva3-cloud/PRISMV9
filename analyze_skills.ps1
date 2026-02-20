# Find course content and analyze multi-function skills
Write-Output "=== SEARCHING BROADER FOR COURSES ==="
$searchPaths = @("C:\", "D:\")
foreach ($sp in $searchPaths) {
    if (Test-Path $sp) {
        $hits = Get-ChildItem $sp -Directory -Depth 2 -ErrorAction SilentlyContinue | 
            Where-Object { $_.Name -match "course|MIT|lecture|textbook|OCW|curriculum|class" }
        foreach ($h in $hits) { 
            $fcount = (Get-ChildItem $h -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
            Write-Output "  $($h.FullName) ($fcount files)" 
        }
    }
}

Write-Output "`n=== LARGE SKILLS (>10KB, likely multi-function) ==="
$skillsDir = "C:\PRISM\skills-consolidated"
$largeSkills = Get-ChildItem $skillsDir -Recurse -File -Filter "SKILL.md" | 
    Where-Object { $_.Length -gt 10240 } | 
    Sort-Object Length -Descending
foreach ($s in $largeSkills) {
    $sizeKB = [math]::Round($s.Length/1024, 1)
    $name = $s.Directory.Name
    # Count function-like headers
    $content = Get-Content $s.FullName
    $funcCount = ($content | Select-String "^##\s|^###\s.*function|^###\s.*action|^###\s.*tool|^###\s.*capabilit|WHEN TO USE|USE CASE" | Measure-Object).Count
    Write-Output "  $name : ${sizeKB}KB, ~$funcCount sections"
}

Write-Output "`n=== SKILL SIZE DISTRIBUTION ==="
$allSkills = Get-ChildItem $skillsDir -Recurse -File -Filter "SKILL.md"
$under5 = ($allSkills | Where-Object { $_.Length -le 5120 }).Count
$under10 = ($allSkills | Where-Object { $_.Length -gt 5120 -and $_.Length -le 10240 }).Count
$under20 = ($allSkills | Where-Object { $_.Length -gt 10240 -and $_.Length -le 20480 }).Count
$over20 = ($allSkills | Where-Object { $_.Length -gt 20480 }).Count
Write-Output "  Under 5KB:  $under5 skills (likely single-function, good)"
Write-Output "  5-10KB:     $under10 skills (may need review)"
Write-Output "  10-20KB:    $under20 skills (likely multi-function, split candidates)"
Write-Output "  Over 20KB:  $over20 skills (definitely multi-function, priority splits)"
Write-Output "  Total:      $($allSkills.Count) skills"
