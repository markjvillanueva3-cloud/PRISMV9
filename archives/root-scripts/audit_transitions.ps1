# Check companion assets and transition points across all phases
$dir = "C:\PRISM\mcp-server\data\docs\roadmap"
$phases = @("DA_DEV_ACCELERATION","R1_REGISTRY","R2_SAFETY","R3_CAMPAIGNS","R4_ENTERPRISE","R5_VISUAL","R6_PRODUCTION","R7_INTELLIGENCE","R8_EXPERIENCE","R9_INTEGRATION","R10_REVOLUTION","R11_PRODUCT")

foreach ($p in $phases) {
    $file = "$dir\PHASE_${p}.md"
    $content = Get-Content $file
    $lines = $content.Count
    
    # Count companion asset types
    $hooks = (Select-String -Path $file -Pattern "HOOK|hook" -CaseSensitive:$false).Count
    $scripts = (Select-String -Path $file -Pattern "SCRIPT:|script_" -CaseSensitive:$false).Count
    $skills = (Select-String -Path $file -Pattern "SKILL:|skill:" -CaseSensitive:$false).Count
    $hasCompanion = (Select-String -Path $file -Pattern "COMPANION ASSET").Count
    $hasContextBridge = (Select-String -Path $file -Pattern "CONTEXT BRIDGE").Count
    $hasQuickRef = (Select-String -Path $file -Pattern "QUICK REFERENCE").Count
    $hasKnowledge = (Select-String -Path $file -Pattern "KNOWLEDGE CONTRIBUTION").Count
    $hasGate = (Select-String -Path $file -Pattern "Phase Gate|GATE|gate passes").Count
    $hasProduces = (Select-String -Path $file -Pattern "PRODUCES|produces").Count
    $hasDepends = (Select-String -Path $file -Pattern "DEPENDS|depends|Prerequisites|prerequisites").Count
    
    Write-Output "=== PHASE_${p} ($lines lines) ==="
    Write-Output "  Companion section: $(if($hasCompanion -gt 0){'YES'}else{'MISSING'})"
    Write-Output "  Context bridge: $(if($hasContextBridge -gt 0){'YES'}else{'MISSING'})"
    Write-Output "  Quick reference: $(if($hasQuickRef -gt 0){'YES'}else{'MISSING'})"
    Write-Output "  Knowledge contrib: $(if($hasKnowledge -gt 0){'YES'}else{'MISSING'})"
    Write-Output "  Gate check: $(if($hasGate -gt 0){'YES'}else{'MISSING'})"
    Write-Output "  Dependencies: $(if($hasDepends -gt 0){'YES'}else{'MISSING'})"
    Write-Output "  Hooks mentions: $hooks | Script mentions: $scripts | Skill mentions: $skills"
    Write-Output ""
}
