# Retry with -Force flag and stream approach
$roadmap = "C:\PRISM\mcp-server\data\docs\roadmap"

# R7
$r7 = [System.IO.File]::ReadAllText("$roadmap\PHASE_R7_INTELLIGENCE.md")
$r7 = $r7 -replace 'Log: convergence_iterations, residual, which coupling was slowest', @"
WALL-CLOCK TIMEOUT (v14.5 Safety Fix S-1):
    30-second hard timeout on ALL coupled physics iterations.
    If not converged in 30s: return SAFETY_BLOCK with message:
      "Physics model did not converge within 30s. Use conservative handbook values."
    Implementation: wrap iterative solver in Promise.race([solver, timeout(30000)])
  Log: convergence_iterations, residual, which coupling was slowest, wall_clock_ms
"@
$mfg1 = @"

**KNOWN LIMITATION (v14.5 MFG-1): Interrupted Cuts**
  R7 coupled physics assumes CONTINUOUS cutting. For interrupted cuts, apply
  1.5x safety factor on force predictions until interrupted-cut modeling implemented.

"@
$r7 = $r7 -replace '(\*\*Failure handling\*\*: If Johnson-Cook data missing)', ($mfg1 + '$1')
$r7 = $r7 -replace '(runtime_minutes: number;\s+// How long the spindle has been running)', @"
runtime_minutes: number;             // How long the spindle has been running
  prior_runtime_hours?: number;        // v14.5 MFG-2: Prior thermal history (0=cold start)
"@
[System.IO.File]::WriteAllText("$roadmap\PHASE_R7_INTELLIGENCE.md", $r7)
Write-Host "[OK] R7 written"

# R2
$r2 = [System.IO.File]::ReadAllText("$roadmap\PHASE_R2_SAFETY.md")
$r2 = $r2 -replace '# DEPENDS ON: R1-MS9 complete \(registries loaded, data validated, formulas wired\)', '# DEPENDS ON: R1-MS9 complete (registries loaded, data validated, formulas wired). R1-MS10 is optional and NOT required for R2 entry.'
$r2 = $r2 -replace 'Step 5: Document', @"
Step 5: REGRESSION SUITE SELF-TEST (v14.5 QA-2)
  a. Intentionally modify one golden benchmark value by 50%
  b. Run npm run build — VERIFY build fails identifying broken benchmark
  c. Restore original value — VERIFY build passes cleanly
  Proves regression suite is not a paper tiger. DO NOT proceed to MS2 until passes.

Step 6: Document
"@
$qa1 = @"

  BOUNDARY MATERIALS (v14.5 QA-1 — test at model extrapolation edges):
    Pure copper, Tungsten, Lead-free brass, Hardened A2 60HRC, Hastelloy X.
    Also test: speed_feed for material NOT in registry (e.g. Waspaloy).
    Verify S(x) blocks or returns with high uncertainty flag.

"@
$r2 = $r2 -replace '(MINIMUM: At least 5 VALID-DANGEROUS cases must be tested\.)', ($qa1 + '$1')
[System.IO.File]::WriteAllText("$roadmap\PHASE_R2_SAFETY.md", $r2)
Write-Host "[OK] R2 written"

# R1
$r1 = [System.IO.File]::ReadAllText("$roadmap\PHASE_R1_REGISTRY.md")
$spot = @"
=== STEP 3b: ENRICHMENT SPOT-CHECK (v14.5 REL-1) ===
Spot-check 10 materials against Machinery's Handbook (hardness, density, tensile).
If ANY deviation > 20%: STOP. Enrichment source has systematic error.

=== STEP 3c: RUNTIME BOUNDS CHECK (v14.5 S-2) ===
Add runtime bounds to material_get: hardness 10-800 HB, density 1.0-23.0, tensile 50-3500 MPa.
3 comparisons per lookup. Catches catastrophic data corruption at query time.

"@
$r1 = $r1 -replace '(=== STEP 4: VERIFY ENRICHMENT ===)', ($spot + '$1')
[System.IO.File]::WriteAllText("$roadmap\PHASE_R1_REGISTRY.md", $r1)
Write-Host "[OK] R1 written"

# SYSTEM_CONTRACT
$sc = [System.IO.File]::ReadAllText("$roadmap\SYSTEM_CONTRACT.md")
$cp1 = @"

### INV-S1b: SAFETY CLASSIFICATION OUTPUT (v14.5 CP-1)
All structured output with safety score MUST include:
  safety_classification: "SAFE" (>0.85) | "CAUTION" (0.70-0.85) | "BLOCKED" (<0.70)
  safety_message: human-readable explanation
Traffic-light system for novice operators. CAUTION = marginal, any variation could push unsafe.

"@
$sc = $sc -replace '(### INV-S2)', ($cp1 + '$1')
[System.IO.File]::WriteAllText("$roadmap\SYSTEM_CONTRACT.md", $sc)
Write-Host "[OK] SYSTEM_CONTRACT written"

# R6
$r6 = [System.IO.File]::ReadAllText("$roadmap\PHASE_R6_PRODUCTION.md")
$r6 = $r6 -replace '(Stress test: 1000\+ concurrent calc requests via batch API)', @"
Stress test: 1000+ concurrent requests with MIXED query patterns (v14.5 QA-3):
   40% speed_feed, 20% job_plan, 15% alarm_decode, 10% tool_search,
   10% material_get, 5% cross_query. Matches real production usage distribution.
"@
[System.IO.File]::WriteAllText("$roadmap\PHASE_R6_PRODUCTION.md", $r6)
Write-Host "[OK] R6 written"

# DA
$da = [System.IO.File]::ReadAllText("$roadmap\PHASE_DA_DEV_ACCELERATION.md")
$da = $da -replace '(Estimated time saved: 15-30 minutes per session)', @"
Estimated time saved: 15-30 minutes per session
#   v14.5 SEQ-1: After each DA-MS, add to ACTION_TRACKER:
#     "DA-MS[N] TIME_SAVED_PER_SESSION: [X] minutes (measured)"
"@
$da = $da -replace '(THIS MILESTONE BUILDS: Branches 1, 5, 6, 7, 8 scaffolding\.)', @"
THIS MILESTONE BUILDS: Branches 1+2 FULLY, empty scaffolds for 3-8 (v14.5 OPT-1).
  Defer unpopulated branches to phase that populates them. Saves ~1-2 sessions.
"@
[System.IO.File]::WriteAllText("$roadmap\PHASE_DA_DEV_ACCELERATION.md", $da)
Write-Host "[OK] DA written"

Write-Host ""
Write-Host "=== ALL 13 FIXES APPLIED SUCCESSFULLY ==="
