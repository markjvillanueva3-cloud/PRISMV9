$bytes = [System.IO.File]::ReadAllBytes("C:\PRISM\roadmap-v14.3.zip")
$b64 = [Convert]::ToBase64String($bytes)
[System.IO.File]::WriteAllText("C:\PRISM\roadmap-v14.3.b64", $b64)
Write-Output "Encoded: $($b64.Length) chars"
