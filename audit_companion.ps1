# Audit: Check companion asset sections across ALL phases
$dir = "C:\PRISM\mcp-server\data\docs\roadmap"
$phases = @("DA_DEV_ACCELERATION","R1_REGISTRY","R2_SAFETY","R3_CAMPAIGNS","R4_ENTERPRISE","R5_VISUAL","R6_PRODUCTION","R7_INTELLIGENCE","R8_EXPERIENCE","R9_INTEGRATION","R10_REVOLUTION","R11_PRODUCT")

foreach ($p in $phases) {
    $file = "$dir\PHASE_${p}.md"
    Write-Output "=== $p ==="
    
    # Check for COMPANION ASSETS section
    $ca = Select-String -Path $file -Pattern "COMPANION ASSETS|COMPANION|PRODUCES|DA PRODUCES" -ErrorAction SilentlyContinue
    if ($ca) {
        Write-Output "  Companion section: YES (L$($ca[0].LineNumber))"
    } else {
        Write-Output "  Companion section: MISSING <<<<<"
    }
    
    # Check for CONTEXT BRIDGE
    $cb = Select-String -Path $file -Pattern "CONTEXT BRIDGE" -ErrorAction SilentlyContinue
    if ($cb) { Write-Output "  Context Bridge: YES" } else { Write-Output "  Context Bridge: MISSING <<<<<" }
    
    # Check for dependency declarations
    $dep = Select-String -Path $file -Pattern "DEPENDS ON:|Prerequisites:|Depends:" -ErrorAction SilentlyContinue
    if ($dep) { Write-Output "  Dependencies: YES ($($dep.Count) refs)" } else { Write-Output "  Dependencies: MISSING <<<<<" }
    
    # Check for gate criteria
    $gate = Select-String -Path $file -Pattern "Gate:|GATE:|Phase Gate|BUILD GATE" -ErrorAction SilentlyContinue
    if ($gate) { Write-Output "  Gate criteria: YES ($($gate.Count) refs)" } else { Write-Output "  Gate criteria: MISSING <<<<<" }
    
    # Check for WHAT COMES AFTER
    $after = Select-String -Path $file -Pattern "WHAT COMES AFTER|COMES AFTER" -ErrorAction SilentlyContinue
    if ($after) { Write-Output "  Transition: YES" } else { Write-Output "  Transition: MISSING <<<<<" }
    
    # Check for HOOKS/SKILLS/SCRIPTS in companion
    $hooks = Select-String -Path $file -Pattern "HOOK|hook" -ErrorAction SilentlyContinue
    $skills = Select-String -Path $file -Pattern "SKILL|skill" -ErrorAction SilentlyContinue
    $scripts = Select-String -Path $file -Pattern "SCRIPT|script" -ErrorAction SilentlyContinue
    Write-Output "  Hook refs: $($hooks.Count) | Skill refs: $($skills.Count) | Script refs: $($scripts.Count)"
    Write-Output ""
}
