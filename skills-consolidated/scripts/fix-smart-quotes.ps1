param([string]$Path)
$content = [System.IO.File]::ReadAllText($Path)
$content = $content.Replace([char]0x201C, '"').Replace([char]0x201D, '"')
$content = $content.Replace([char]0x2018, "'").Replace([char]0x2019, "'")
[System.IO.File]::WriteAllText($Path, $content, [System.Text.Encoding]::UTF8)
Write-Host "Fixed smart quotes in $Path"