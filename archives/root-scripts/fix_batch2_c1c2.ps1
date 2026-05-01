# BATCH 2: C1+C2 - Fix R1, R2, R3, R7, R8 companion timing + add R2 skills
$dir = "C:\PRISM\mcp-server\data\docs\roadmap"

# === R1: Redistribute companion assets ===
$r1 = [System.IO.File]::ReadAllText("$dir\PHASE_R1_REGISTRY.md")
$r1 = $r1.Replace(
    "## R1 COMPANION ASSETS (v14.2",
    "## R1 COMPANION ASSETS (v14.5 -- built per-MS, verified at R1-MS9 gate)`r`n`r`n### PER-MS COMPANION SCHEDULE:`r`n````r`nMS4.5 PRODUCES: data_validation_gate hook (build during MS4.5)`r`nMS5 PRODUCES: tool_schema_completeness hook + prism-data-diagnostics skill`r`nMS6 PRODUCES: material_enrichment_validate hook`r`nMS7 PRODUCES: (none -- data loading only)`r`nMS8 PRODUCES: formula_registry_consistency hook`r`nMS9 GATE VERIFIES: All hooks fire, skill loads, scripts run`r`n````r`n`r`n## R1 COMPANION ASSETS DETAIL (v14.2"
)
[System.IO.File]::WriteAllText("$dir\PHASE_R1_REGISTRY.md", $r1)
Write-Output "C1: R1 companion redistributed"

# === R2: Redistribute + ADD 3 SAFETY SKILLS (C2) ===
$r2 = [System.IO.File]::ReadAllText("$dir\PHASE_R2_SAFETY.md")
$r2 = $r2.Replace(
    "## R2 COMPANION ASSETS (v14.2",
    "## R2 COMPANION ASSETS (v14.5 -- built per-MS, verified at R2-MS4 gate)`r`n`r`n### PER-MS COMPANION SCHEDULE:`r`n````r`nMS0/MS1 PRODUCES:`r`n  SKILL: prism-safety-calculation-guide`r`n    How to invoke each safety calc, expected ranges, common failure modes`r`n    Built AS calcs are validated -- captures what works and what breaks`r`n`r`nMS1.5 PRODUCES:`r`n  SKILL: prism-golden-values-reference`r`n    The 50 benchmark golden values with sources for sanity-checking future results`r`n    Built AS regression suite locks values -- the skill IS the golden dataset`r`n  HOOK: calc_regression_gate (blocking, prevents tolerance widening)`r`n`r`nMS2/MS3 PRODUCES:`r`n  SKILL: prism-edge-case-catalog`r`n    Documented edge cases: what broke, why, how fixed, prevention rules`r`n    Built AS edge cases are discovered -- append each finding immediately`r`n`r`nMS4 GATE VERIFIES:`r`n  All 3 skills load and respond to queries`r`n  calc_regression_gate fires on tolerance widening attempt`r`n  calc_benchmark_drift hook fires on monthly schedule`r`n  calc_benchmark_runner script produces comparison output`r`n````r`n`r`n## R2 COMPANION ASSETS DETAIL (v14.2"
)
[System.IO.File]::WriteAllText("$dir\PHASE_R2_SAFETY.md", $r2)
Write-Output "C1+C2: R2 companion redistributed + 3 safety skills added"

# === R3: Redistribute ===
$r3 = [System.IO.File]::ReadAllText("$dir\PHASE_R3_CAMPAIGNS.md")
$r3 = $r3.Replace(
    "## R3 COMPANION ASSETS (v14.2",
    "## R3 COMPANION ASSETS (v14.5 -- built per-MS, verified at R3-MS5 gate)`r`n`r`n### PER-MS COMPANION SCHEDULE:`r`n````r`nMS0 PRODUCES:`r`n  HOOK: unit_consistency_check (blocking, pre-calc, detects mixed units)`r`n  Verify: Submit speed in m/min + feed in IPR -> hook blocks`r`n`r`nMS0.5 PRODUCES:`r`n  HOOK: formula_registry_consistency (warning, verifies formula implementations)`r`n  Verify: Check registry -> hook reports stub formulas`r`n`r`nMS1 PRODUCES: (advanced calcs -- covered by existing safety skills from R2)`r`n`r`nMS2 PRODUCES:`r`n  SKILL: prism-toolpath-advisor (strategy selection guidance for common features)`r`n  Verify: Ask about pocket strategy for Ti-6Al-4V -> skill loads with trochoidal rec`r`n`r`nMS3 PRODUCES:`r`n  HOOK: wiring_registry_check (warning, pre-impl, reminds to check D2F/F2E/E2S)`r`n  SKILL: prism-controller-expert (alarm diagnosis per controller family)`r`n  Verify: Ask about Fanuc alarm 0090 -> skill loads with diagnosis`r`n`r`nMS4 PRODUCES:`r`n  SKILL: prism-tolerance-advisor (tolerance analysis, stack-up, IT grades)`r`n  SKILL: prism-formula-navigator (discover and explain 490+ formulas)`r`n  Verify: Ask about Cpk calculation -> formula-navigator loads`r`n`r`nMS5 GATE VERIFIES:`r`n  All 3 hooks fire, all 4 skills load, both scripts run`r`n````r`n`r`n## R3 COMPANION ASSETS DETAIL (v14.2"
)
[System.IO.File]::WriteAllText("$dir\PHASE_R3_CAMPAIGNS.md", $r3)
Write-Output "C1: R3 companion redistributed"

# === R7: Redistribute ===
$r7 = [System.IO.File]::ReadAllText("$dir\PHASE_R7_INTELLIGENCE.md")
$r7 = $r7.Replace(
    "## R7 COMPANION ASSETS (v14.2",
    "## R7 COMPANION ASSETS (v14.5 -- built per-MS, verified at R7 gate)`r`n`r`n### PER-MS COMPANION SCHEDULE:`r`n````r`nMS0 PRODUCES:`r`n  SKILL: prism-coupled-physics (unified machining model, convergence troubleshooting)`r`n  HOOK: coupled_physics_convergence (blocking, post-calc, verifies solver converged)`r`n`r`nMS1 PRODUCES:`r`n  SKILL: prism-sustainability-advisor (ESG metrics, ISO 14955, eco-optimization)`r`n  HOOK: sustainability_bounds (warning, alerts if eco_efficiency < 0.3)`r`n`r`nMS2 PRODUCES:`r`n  SKILL: prism-workholding-guide (fixture selection, clamping force interpretation)`r`n`r`nMS3 PRODUCES:`r`n  HOOK: learning_data_quality (warning, validates recorded job data quality)`r`n`r`nMS4 PRODUCES: (algorithm integration -- knowledge captured in existing course-derived skills)`r`n`r`nMS5 PRODUCES:`r`n  SKILL: prism-scheduling-advisor (shop floor scheduling, machine assignment guidance)`r`n`r`nMS6 PRODUCES:`r`n  SCRIPT: catalog_extraction_report (progress + quality metrics for catalog parsing)`r`n`r`nGATE VERIFIES:`r`n  All hooks fire, all 4 skills load, scripts run, SKILL_INDEX count >= expected`r`n````r`n`r`n## R7 COMPANION ASSETS DETAIL (v14.2"
)
[System.IO.File]::WriteAllText("$dir\PHASE_R7_INTELLIGENCE.md", $r7)
Write-Output "C1: R7 companion redistributed"

# === R8: Already has good companion -- just add per-MS schedule header ===
$r8 = [System.IO.File]::ReadAllText("$dir\PHASE_R8_EXPERIENCE.md")
$r8 = $r8.Replace(
    "## R8 COMPANION ASSETS (v14.2)",
    "## R8 COMPANION ASSETS (v14.5 -- built per-MS, verified at R8 gate)`r`n`r`n### PER-MS COMPANION SCHEDULE:`r`n````r`nMS0 PRODUCES: (intent engine -- no separate skill, it IS the routing layer)`r`nMS1 PRODUCES: (persona formatting -- built into intent engine)`r`nMS2 PRODUCES: workflow_completion_rate hook (telemetry)`r`nMS3 PRODUCES: (onboarding -- no companion, self-contained)`r`nMS4 PRODUCES: (setup sheets -- uses R3 data, no new skill needed)`r`nMS5 PRODUCES: (memory integration -- extends existing memory graph)`r`nMS6 PRODUCES: 12 user workflow skills (ARE the companion assets)`r`nMS7 PRODUCES: 10 user assistance skills (ARE the companion assets)`r`n  HOOK: skill_routing_fallback (warning, logs intent engine mismatches)`r`nGATE VERIFIES: All 22 skills load, both hooks fire, intent engine routes correctly`r`n````r`n`r`n## R8 COMPANION ASSETS DETAIL (v14.2)"
)
[System.IO.File]::WriteAllText("$dir\PHASE_R8_EXPERIENCE.md", $r8)
Write-Output "C1: R8 companion schedule added"

Write-Output "`n--- C1+C2 complete ---"
