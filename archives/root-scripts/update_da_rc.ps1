# Fix DA header with correct course count
$file = "C:\PRISM\mcp-server\data\docs\roadmap\PHASE_DA_DEV_ACCELERATION.md"
$content = Get-Content $file -Raw
$content = $content.Replace("171 MIT OCW courses (191 zips, 12.3GB)", "206 MIT OCW courses (234 zips, 12.3GB)")
$content = $content.Replace("Extracts skills from 171 MIT", "Extracts skills from 206 MIT")
[System.IO.File]::WriteAllText($file, $content)
Write-Output "DA header updated"

# Now update Recovery Card
$rc = "C:\PRISM\mcp-server\data\docs\roadmap\PRISM_RECOVERY_CARD.md"
$rcContent = Get-Content $rc -Raw
if (-not $rcContent.Contains("ROLE_MODEL_EFFORT_MATRIX")) {
    # Find a good insertion point - after the file table or version line
    $rcLines = [System.Collections.ArrayList](Get-Content $rc)
    # Add v14.5 note near the top
    for ($i = 0; $i -lt $rcLines.Count; $i++) {
        if ($rcLines[$i] -match "v14\.4") {
            $rcLines.Insert($i + 1, "# v14.5: Skill Atomization (DA-MS9/MS10) + 95 role/model/effort assignments across all phases")
            $rcLines.Insert($i + 2, "#   New files: ROLE_MODEL_EFFORT_MATRIX.md, FULL_COURSE_INVENTORY.md, SKILL_ATOMIZATION_SPEC.md")
            $rcLines.Insert($i + 3, "#   206 MIT courses + 25 CNC/CAM resources = ~3,880 target atomic skills")
            Write-Output "Recovery Card: v14.5 note added at line $($i+2)"
            break
        }
    }
    [System.IO.File]::WriteAllLines($rc, $rcLines.ToArray())
    Write-Output "Recovery Card: $((Get-Content $rc).Count) lines"
} else {
    Write-Output "Recovery Card already has v14.5 reference"
}
