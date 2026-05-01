$roadmap = "C:\PRISM\mcp-server\data\docs\roadmap"

Write-Host "=== VERIFICATION: All 13 audit fixes ==="
Write-Host ""

# S-1
$c = (Select-String -Path "$roadmap\PHASE_R7_INTELLIGENCE.md" -Pattern "WALL-CLOCK TIMEOUT").Count
Write-Host "S-1  (R7 wall-clock timeout):     $(if($c -gt 0){'PASS'}else{'FAIL'}) ($c matches)"

# MFG-1  
$c = (Select-String -Path "$roadmap\PHASE_R7_INTELLIGENCE.md" -Pattern "Interrupted Cuts").Count
Write-Host "MFG-1(R7 interrupted cuts):       $(if($c -gt 0){'PASS'}else{'FAIL'}) ($c matches)"

# MFG-2
$c = (Select-String -Path "$roadmap\PHASE_R7_INTELLIGENCE.md" -Pattern "prior_runtime_hours").Count
Write-Host "MFG-2(R7 thermal warm-up):        $(if($c -gt 0){'PASS'}else{'FAIL'}) ($c matches)"

# QA-2
$c = (Select-String -Path "$roadmap\PHASE_R2_SAFETY.md" -Pattern "SELF-TEST").Count
Write-Host "QA-2 (R2 regression self-test):   $(if($c -gt 0){'PASS'}else{'FAIL'}) ($c matches)"

# SEQ-3
$c = (Select-String -Path "$roadmap\PHASE_R2_SAFETY.md" -Pattern "R1-MS10 is optional").Count
Write-Host "SEQ-3(R2 DEPENDS ON clarity):     $(if($c -gt 0){'PASS'}else{'FAIL'}) ($c matches)"

# S-3
$c = (Select-String -Path "$roadmap\PHASE_R2_SAFETY.md" -Pattern "WORST-CASE force").Count
Write-Host "S-3  (R2 worst-case force):       $(if($c -gt 0){'PASS'}else{'FAIL'}) ($c matches)"

# QA-1
$c = (Select-String -Path "$roadmap\PHASE_R2_SAFETY.md" -Pattern "BOUNDARY MATERIALS").Count
Write-Host "QA-1 (R2 boundary materials):     $(if($c -gt 0){'PASS'}else{'FAIL'}) ($c matches)"

# REL-1
$c = (Select-String -Path "$roadmap\PHASE_R1_REGISTRY.md" -Pattern "ENRICHMENT SPOT-CHECK").Count
Write-Host "REL-1(R1 enrichment spot-check):  $(if($c -gt 0){'PASS'}else{'FAIL'}) ($c matches)"

# S-2
$c = (Select-String -Path "$roadmap\PHASE_R1_REGISTRY.md" -Pattern "RUNTIME BOUNDS CHECK").Count
Write-Host "S-2  (R1 runtime bounds):         $(if($c -gt 0){'PASS'}else{'FAIL'}) ($c matches)"

# CP-1
$c = (Select-String -Path "$roadmap\SYSTEM_CONTRACT.md" -Pattern "INV-S1b").Count
Write-Host "CP-1 (SC safety classification):  $(if($c -gt 0){'PASS'}else{'FAIL'}) ($c matches)"

# QA-3
$c = (Select-String -Path "$roadmap\PHASE_R6_PRODUCTION.md" -Pattern "MIXED query patterns").Count
Write-Host "QA-3 (R6 mixed stress test):      $(if($c -gt 0){'PASS'}else{'FAIL'}) ($c matches)"

# SEQ-1
$c = (Select-String -Path "$roadmap\PHASE_DA_DEV_ACCELERATION.md" -Pattern "SEQ-1").Count
Write-Host "SEQ-1(DA track time savings):     $(if($c -gt 0){'PASS'}else{'FAIL'}) ($c matches)"

# OPT-1
$c = (Select-String -Path "$roadmap\PHASE_DA_DEV_ACCELERATION.md" -Pattern "OPT-1").Count
Write-Host "OPT-1(DA defer branches):         $(if($c -gt 0){'PASS'}else{'FAIL'}) ($c matches)"

Write-Host ""
Write-Host "=== VERIFICATION COMPLETE ==="
