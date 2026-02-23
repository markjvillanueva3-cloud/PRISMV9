# Verify Wave 8 insertion
Select-String -Path "C:\PRISM\mcp-server\data\docs\roadmap\MASTER_ACTION_PLAN_v2.md" -Pattern "WAVE 8|END OF MASTER|SKILL ATOMIZATION" | ForEach-Object {
    Write-Output "L$($_.LineNumber): $($_.Line.Trim())"
}
Write-Output "`n--- Check items 23/24 ---"
Select-String -Path "C:\PRISM\mcp-server\data\docs\roadmap\MASTER_ACTION_PLAN_v2.md" -Pattern "\| 23 |\| 24 " | ForEach-Object {
    Write-Output "L$($_.LineNumber): $($_.Line.Trim())"
}
