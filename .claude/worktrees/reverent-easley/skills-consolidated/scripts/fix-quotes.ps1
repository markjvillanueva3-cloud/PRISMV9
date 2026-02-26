$path = "C:\PRISM\skills-consolidated\scripts\update-skill-index.ps1"
$raw = [System.IO.File]::ReadAllText($path)
$raw = $raw.Replace([char]0x201C, [char]0x22)
$raw = $raw.Replace([char]0x201D, [char]0x22)
$raw = $raw.Replace([char]0x2018, [char]0x27)
$raw = $raw.Replace([char]0x2019, [char]0x27)
$raw = $raw.Replace([char]0x2013, [char]0x2D)
$raw = $raw.Replace([char]0x2014, [char]0x2D)
[System.IO.File]::WriteAllText($path, $raw, [System.Text.Encoding]::UTF8)
Write-Host "Fixed smart quotes in update-skill-index.ps1"

$path2 = "C:\PRISM\skills-consolidated\scripts\split-skill.ps1"
$raw2 = [System.IO.File]::ReadAllText($path2)
$raw2 = $raw2.Replace([char]0x201C, [char]0x22)
$raw2 = $raw2.Replace([char]0x201D, [char]0x22)
$raw2 = $raw2.Replace([char]0x2018, [char]0x27)
$raw2 = $raw2.Replace([char]0x2019, [char]0x27)
[System.IO.File]::WriteAllText($path2, $raw2, [System.Text.Encoding]::UTF8)
Write-Host "Fixed smart quotes in split-skill.ps1"

$path3 = "C:\PRISM\skills-consolidated\scripts\extract-course-skills.ps1"
$raw3 = [System.IO.File]::ReadAllText($path3)
$raw3 = $raw3.Replace([char]0x201C, [char]0x22)
$raw3 = $raw3.Replace([char]0x201D, [char]0x22)
$raw3 = $raw3.Replace([char]0x2018, [char]0x27)
$raw3 = $raw3.Replace([char]0x2019, [char]0x27)
[System.IO.File]::WriteAllText($path3, $raw3, [System.Text.Encoding]::UTF8)
Write-Host "Fixed smart quotes in extract-course-skills.ps1"
