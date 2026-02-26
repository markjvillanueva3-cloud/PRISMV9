# Fix course counts in DA file (171 → 206) and add CNC/CAM
$file = "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_DA_DEV_ACCELERATION.md"
$text = [System.IO.File]::ReadAllText($file)

# Header update
$text = $text.Replace("171 MIT OCW courses (191 zips, 12.3GB)", "206 MIT OCW courses (234 zips, 12.3GB) + ~25 CNC/CAM training resources")

# MS9 body updates  
$text = $text.Replace("skills from 171 MIT courses on disk", "skills from 206 MIT courses + ~25 CNC/CAM guides on disk")
$text = $text.Replace("171 MIT OCW courses (12.3GB) sit on disk as raw PDFs", "206 MIT OCW courses (12.3GB) + ~25 CNC/CAM training guides sit on disk as raw PDFs")
$text = $text.Replace("171 unique courses (191 zips)", "206 unique courses (234 zips)")

# Update course tier counts in MS9 inventory
$text = $text.Replace("T1 Manufacturing: 2.830j, 2.008, 2.670, 2.854, 16.660j, 2.75, 2.004, 2.003j (~20)", "T1 Manufacturing: 2.830j, 2.008, 2.670, 2.854, 16.660j, 2.75, 2.004, 2.003j + 17 more (~25)")
$text = $text.Replace("T2 Materials/Physics: 3.012, 3.016, 16.225, 12.864, res-6-013 (~10)", "T2 Materials/Physics: 3.012, 3.016, 3.021j, 3.042, 3.11, 3.15, 3.21, 3.225, 3.22, 3.60, 3.a27 (~11)")
$text = $text.Replace("T4 Algorithms/CS: 6.006, 6.046j, 6.438, 6.854j, 6.005, 6.042j (~52)", "T4 Algorithms/CS: 6.006, 6.046j, 6.438, 6.854j, 6.005, 6.042j + 46 more (~52)")
$text = $text.Replace("T5 Operations/Systems: 15.773, 15.769, 15.060, 15.057, 15.097, esd.342 (~28)", "T5 Operations/Mgmt: 15.773, 15.769, 15.060, 15.057, 15.097 + 15 more (~20)")
$text = $text.Replace("T6 Physics/Other: 8.xxx, 9.xxx, 11.xxx, 4.xxx (~34)", "T6 Physics/Other: 8.xxx(9), 9.xxx(4), 16.xxx(14), + misc (~47)")

[System.IO.File]::WriteAllText($file, $text)
Write-Output "DA updated: $((Get-Content $file).Count) lines"

# Verify the changes
Select-String -Path $file -Pattern "206|CNC/CAM" | ForEach-Object {
    Write-Output "  L$($_.LineNumber): $($_.Line.Trim().Substring(0, [Math]::Min(100, $_.Line.Trim().Length)))"
}
