# PowerShell script to apply all 13 audit fixes to roadmap files
# Source: BULLETPROOF_ASSESSMENT_v14.5.md
# Date: 2026-02-17

$roadmap = "C:\PRISM\mcp-server\data\docs\roadmap"


# ============================================================
# FIX S-1: Wall-clock timeout for coupled physics (R7)
# ============================================================
$r7 = Get-Content "$roadmap\PHASE_R7_INTELLIGENCE.md" -Raw
$r7 = $r7 -replace 'Log: convergence_iterations, residual, which coupling was slowest', @"
WALL-CLOCK TIMEOUT (v14.5 Safety Fix S-1):
    30-second hard timeout on ALL coupled physics iterations.
    If not converged in 30s: return SAFETY_BLOCK with message:
      "Physics model did not converge within 30s. Use conservative handbook values."
    WHY: Without timeout, numerical instability could hang indefinitely.
    Implementation: wrap iterative solver in Promise.race([solver, timeout(30000)])
  Log: convergence_iterations, residual, which coupling was slowest, wall_clock_ms
"@


# FIX MFG-1: Document interrupted-cut limitation
$insertAfterValidation = @"

**KNOWN LIMITATION (v14.5 MFG-1): Interrupted Cuts**
  R7 coupled physics assumes CONTINUOUS cutting. Interrupted cuts (face milling
  with entry/exit, shoulder milling, turning of hex stock) cause thermal shock
  and impact loading that continuous-cut models do not predict. A tool that is
  safe in continuous cutting can shatter on first interrupt.
  MITIGATION: For interrupted cuts, apply 1.5x safety factor on force predictions
  until interrupted-cut modeling is implemented in a future phase.

"@
$r7 = $r7 -replace '(\*\*Failure handling\*\*: If Johnson-Cook data missing)', ($insertAfterValidation + '$1')

# FIX MFG-2: Thermal model warm-up context
$r7 = $r7 -replace '(runtime_minutes: number;\s+// How long the spindle has been running)', @"
runtime_minutes: number;             // How long the spindle has been running
  prior_runtime_hours?: number;        // v14.5 MFG-2: Prior thermal history
"@

Set-Content "$roadmap\PHASE_R7_INTELLIGENCE.md" $r7 -NoNewline
Write-Host "[OK] S-1, MFG-1, MFG-2 applied to R7"


# ============================================================
# FIX QA-2, SEQ-3, S-3, QA-1 on R2
# ============================================================
$r2 = Get-Content "$roadmap\PHASE_R2_SAFETY.md" -Raw

# SEQ-3: Fix DEPENDS ON header
$r2 = $r2 -replace '# DEPENDS ON: R1-MS9 complete \(registries loaded, data validated, formulas wired\)', '# DEPENDS ON: R1-MS9 complete (registries loaded, data validated, formulas wired). R1-MS10 is optional and NOT required for R2 entry.'

# QA-2: Add regression suite self-test
$r2 = $r2 -replace 'Step 5: Document', @"
Step 5: REGRESSION SUITE SELF-TEST (v14.5 QA-2)
  Verify the regression suite ACTUALLY FAILS when a benchmark is broken:
    a. Intentionally modify one golden benchmark value by 50%
    b. Run npm run build
    c. VERIFY build fails with specific error identifying the broken benchmark
    d. Restore original value
    e. VERIFY build passes cleanly
  This proves the regression suite is not a paper tiger.
  DO NOT proceed to MS2 until this self-test passes.

Step 6: Document
"@

Set-Content "$roadmap\PHASE_R2_SAFETY.md" $r2 -NoNewline
Write-Host "[OK] QA-2, SEQ-3 applied to R2"


# ============================================================
# S-3 and QA-1 as separate R2 read-modify-write cycle
# ============================================================
$r2 = Get-Content "$roadmap\PHASE_R2_SAFETY.md" -Raw

# S-3: Add worst-case force note near cutting_force tolerance
$r2 = $r2 -replace '(cutting_force:.*?25%.*?Kienzle uncertainty is inherent)', @"
cutting_force:    +/-25% on Fc (Kienzle uncertainty is inherent
  v14.5 S-3: S(x) MUST use WORST-CASE force (predicted + uncertainty), not nominal.
  If S(x) = 0.72 and force has 25% uncertainty, true safety could be below 0.70.
  R2-MS0 must verify safety score uses upper-bound force estimate.
"@

# QA-1: Add boundary materials to R2-MS2
$qa1text = @"

  BOUNDARY MATERIALS (v14.5 QA-1):
  Add 5 boundary materials where models extrapolate, not interpolate:
    - Pure copper (thermal conductivity 401 W/mK)
    - Tungsten (3695C melting point)
    - Lead-free brass (soft, gummy)
    - Hardened A2 at 60 HRC (edge of machinability)
    - Hastelloy X (less documented than Inconel)
  Also test: speed_feed for material NOT in registry (e.g., Waspaloy).
  Verify S(x) blocks or returns with high uncertainty flag.

"@
$r2 = $r2 -replace '(MINIMUM: At least 5 VALID-DANGEROUS cases must be tested\.)', ($qa1text + '$1')

Set-Content "$roadmap\PHASE_R2_SAFETY.md" $r2 -NoNewline
Write-Host "[OK] S-3, QA-1 applied to R2"


# ============================================================
# FIX REL-1 + S-2: R1-MS6 enrichment safety
# ============================================================
$r1 = Get-Content "$roadmap\PHASE_R1_REGISTRY.md" -Raw

$insertBeforeStep4 = @"
=== STEP 3b: ENRICHMENT SPOT-CHECK (v14.5 REL-1) ===
Effort: ~2 calls

After enrichment, spot-check 10 random materials against Machinery's Handbook:
  Compare hardness, density, tensile_strength for each.
  If ANY deviation > 20% from handbook: STOP. Enrichment source has systematic error.
  Materials: 4140, 1045, 316SS, 17-4PH, FC250, 6061-T6, C360, Inconel 718, Ti-6Al-4V, D2
  Catches systematically wrong but bounds-valid data (e.g., Ti hardness = 50 HB instead of 350 HB).

=== STEP 3c: RUNTIME BOUNDS CHECK (v14.5 S-2) ===
Effort: ~1 call

Add runtime bounds checking to material_get in MaterialRegistry.ts:
  hardness_hb: warn if < 10 or > 800 (outside any machinable material)
  density_gcc: warn if < 1.0 or > 23.0 (outside known material range)
  tensile_mpa: warn if < 50 or > 3500 (outside expected range)
Cost: 3 comparisons per lookup. Negligible performance.
Catches catastrophic data corruption at QUERY TIME, not just build time.

"@
$r1 = $r1 -replace '(=== STEP 4: VERIFY ENRICHMENT ===)', ($insertBeforeStep4 + '$1')

Set-Content "$roadmap\PHASE_R1_REGISTRY.md" $r1 -NoNewline
Write-Host "[OK] REL-1, S-2 applied to R1"

# ============================================================
# FIX CP-1: Safety classification in SYSTEM_CONTRACT
# ============================================================
$sc = Get-Content "$roadmap\SYSTEM_CONTRACT.md" -Raw

$cp1text = @"

### INV-S1b: SAFETY CLASSIFICATION OUTPUT (v14.5 CP-1)
All structured output that includes a safety score MUST also include:
  safety_classification: "SAFE" (>0.85) | "CAUTION" (0.70-0.85) | "BLOCKED" (<0.70)
  safety_message: human-readable explanation
WHY: Novice sees S(x)=0.71 and thinks safe. But 0.71 is MARGINAL.
Traffic-light system gives operators immediate unambiguous feedback.
CAUTION means: parameters acceptable but limited safety margin. Any variation
in material, tool wear, or machine condition could push into unsafe territory.

"@
# Insert after INV-S1 line
$sc = $sc -replace '(### INV-S2)', ($cp1text + '$1')

Set-Content "$roadmap\SYSTEM_CONTRACT.md" $sc -NoNewline
Write-Host "[OK] CP-1 applied to SYSTEM_CONTRACT"


# ============================================================
# FIX QA-3: Mixed workload stress test (R6)
# ============================================================
$r6 = Get-Content "$roadmap\PHASE_R6_PRODUCTION.md" -Raw

$r6 = $r6 -replace '(Stress test: 1000\+ concurrent calc requests via batch API)', @"
Stress test: 1000+ concurrent requests with MIXED query patterns (v14.5 QA-3):
   40% speed_feed, 20% job_plan, 15% alarm_decode, 10% tool_search,
   10% material_get, 5% cross_query. NOT uniform — matches real production usage.
   Mixed workloads expose resource contention between heavy and light operations.
"@

Set-Content "$roadmap\PHASE_R6_PRODUCTION.md" $r6 -NoNewline
Write-Host "[OK] QA-3 applied to R6"

# ============================================================
# FIX SEQ-1 + OPT-1: DA phase
# ============================================================
$da = Get-Content "$roadmap\PHASE_DA_DEV_ACCELERATION.md" -Raw

# SEQ-1: Track time savings
$da = $da -replace '(Estimated time saved: 15-30 minutes per session)', @"
Estimated time saved: 15-30 minutes per session
#   v14.5 SEQ-1: After each DA milestone, add to ACTION_TRACKER:
#     "DA-MS[N] TIME_SAVED_PER_SESSION: [X] minutes (measured)"
#   Track ACTUAL savings to make ROI tangible and motivating.
"@

# OPT-1: Defer index branches 3-8
$da = $da -replace '(THIS MILESTONE BUILDS: Branches 1, 5, 6, 7, 8 scaffolding\.)', @"
THIS MILESTONE BUILDS: Branches 1 and 2 FULLY, plus EMPTY SCAFFOLDS for 3-8.
  v14.5 OPT-1: Defer unpopulated branches. Build only 1+2 during DA (useful now).
  Build remaining branches during the phase that populates them:
    Branch 3 during R2, Branch 4 during DA-MS7, Branch 8 during R2.
  Branches 5-7 keep current DA schedule (useful immediately for ops).
  SAVINGS: ~1-2 sessions saved.
"@

Set-Content "$roadmap\PHASE_DA_DEV_ACCELERATION.md" $da -NoNewline
Write-Host "[OK] SEQ-1, OPT-1 applied to DA"

Write-Host ""
Write-Host "=== ALL 13 FIXES APPLIED ==="
Write-Host "Files modified:"
Write-Host "  1. PHASE_R7_INTELLIGENCE.md  (S-1, MFG-1, MFG-2)"
Write-Host "  2. PHASE_R2_SAFETY.md        (QA-2, SEQ-3, S-3, QA-1)"
Write-Host "  3. PHASE_R1_REGISTRY.md      (REL-1, S-2)"
Write-Host "  4. SYSTEM_CONTRACT.md        (CP-1)"
Write-Host "  5. PHASE_R6_PRODUCTION.md    (QA-3)"
Write-Host "  6. PHASE_DA_DEV_ACCELERATION.md (SEQ-1, OPT-1)"
