# PHASE R2: SAFETY + ENGINE VALIDATION — v14.2
# Status: not-started | Sessions: 2-3 | MS: 7 (MS0-MS5, with MS1.5 new) | Role: Safety Systems Engineer
# v14.2: Added MS1.5 (Calc Regression Suite — locks golden dataset before building on calcs)
# Pattern: TEST → RECORD → FIX → RETEST → GATE
# v14.0: Unified Roadmap — absorbs Superpower Roadmap Phase 1 (29 safety engine action tests)
#         as new R2-MS1. Original milestones renumbered:
#           MS0 = 50-Calc Test Matrix (unchanged)
#           MS1 = Safety Engine Activation — 29 actions across 5 engines (NEW from Superpower)
#           MS2 = AI-Generated Edge Cases (was MS1.5)
#           MS3 = Manual Edge Cases + Fix Cycle (was MS1 + MS2 merged)
#           MS4 = Build Gate + Phase Completion (was MS3)
#
#         WHY MS1 IS NEW: The Superpower Roadmap tested 29 individual safety engine actions
#         with exact parameter sets. R2's original 50-calc matrix tests the INTEGRATED calc
#         chain but not the INDIVIDUAL safety engines. Both are needed:
#           - MS0 tests: "Does the integrated chain produce correct results?"
#           - MS1 tests: "Does each individual safety engine respond correctly to its inputs?"
#         Testing the chain without testing the components misses single-engine failures.
#         Testing components without testing the chain misses integration failures.
#
#         R1-MS7 (machine field population) means these tests now use REAL machine data
#         instead of hardcoded spindleSpec values. This is a major improvement — the safety
#         engines are validated against actual machine capabilities.
#
#         REFERENCE DOCUMENT: Load SUPERPOWER_ROADMAP.md during R2-MS1 ONLY for exact test
#         parameters. Contains the specific input values for all 29 safety actions.
#
# v13.9: Cross-Audit Governance Hardening (XA-1,13,7) — retained unchanged.
# v13.5-v13.8: All prior hardening retained unchanged.

---

## CONTEXT BRIDGE

WHAT CAME BEFORE: R1 loaded all registries >95% AND built data foundation:
  Materials: 3,392 loaded, 80%+ enriched with tribology/composition/designation
  Machines: 1,016 loaded, top 50 with spindle/power/envelope specs
  Tools: 5,238 loaded, normalized schema, ToolIndex with O(1) lookup, tool_facets action
  Alarms: 10,033 loaded (100%)
  Formulas: 509 (500 original + 9 calculator formulas)
  New actions: tool_facets, strategy_for_job, strategy_compare, category_browse,
    novel_strategies, strategy_detail, thread_recommend, tap_drill_calc,
    thread_mill_params, go_nogo_limits, unified_search, formula_calculate
  Build: clean. Omega >= 0.70. Fault injection passed.

WHAT THIS PHASE DOES: Validate that the wired engines + loaded data produce CORRECT,
SAFE cutting parameters. Two dimensions:
  1. Integrated chain validation: 50 calculations across 10 materials × 5 operations
  2. Individual engine validation: 29 safety engine actions tested with exact parameters
  3. Edge case discovery: AI-generated adversarial inputs that humans wouldn't think of
  Fix any calculation errors, parameter mapping bugs, or safety gate failures.

WHAT COMES AFTER: R3 (Intelligence + Data Campaigns) builds intelligence features
(job_plan, wear_prediction, process_cost, etc.) and runs full-library batch campaigns.
R3 assumes ALL safety calcs are validated and ALL safety engines respond correctly.

ARTIFACT MANIFEST (XA-1):
  REQUIRES: REGISTRY_AUDIT.md, PHASE_FINDINGS.md (R1 section)
  PRODUCES: R2_CALC_RESULTS.md, PHASE_FINDINGS.md (R2 section),
            src/__tests__/safetyMatrix.test.ts, src/__tests__/edgeCases.test.ts,
            src/__tests__/safetyEngines.test.ts

TEST LEVELS: L1-L5 required (unit + contract + integration + orchestration + safety invariants)

FAULT INJECTION TEST (XA-13):
  R2 FAULT TEST: Pass NaN as a cutting parameter → verify S(x)=0 (safety block).
  WHEN: After R2-MS0 matrix is working (need known-good baseline to inject fault against).
  HOW: prism_calc action=speed_feed material="4140" operation="turning"
       with Vc=NaN manually injected in the test harness.
  EXPECTED: Structured output schema REJECTS NaN (exclusiveMinimum:0 fails).
            Cross-field physics validation blocks the result.
            Safety score = 0.0 (physically impossible result is never safe).
  PASS: No NaN propagates to output. Safety block activates.
  FAIL: NaN appears in output, or safety score > 0 with NaN input.
  EFFORT: ~3 calls.

---

## CANONICAL TOLERANCE TABLE (R2_TOLERANCES)

```
WHAT THIS IS: Acceptable deviation between PRISM's calculated values and
reference values from Machining Data Handbook, Sandvik Coromant, Walter tools.

SEPARATE from S(x) safety score:
  S(x) = "is it safe to cut at these parameters?"
  R2_TOLERANCES = "is our math producing numbers in the right ballpark?"

Both must pass. A calc can be safe (S(x)=0.80) but wrong (Vc off by 50%).
A calc can be accurate (Vc within 5%) but unsafe (power exceeds machine).

  speed_feed:       ±15% on Vc, ±20% on fz (cutting data varies by source)
  cutting_force:    ±25% on Fc (Kienzle uncertainty is inherent — material kc1_1 varies)
  tool_life:        ±30% on T (Taylor is notoriously imprecise — n exponent sensitivity)
  spindle_speed:    ±2% on n_rpm (pure arithmetic — should be exact)
  safety:           ±0.05 on S(x) (composite score tolerance)
  alarm_decode:     Exact on structured fields (controller, code, severity).
                    similarity >= 0.90 on description (SK-4 — different wording same alarm).

SOURCE for reference values: src/schemas/referenceValues.ts (SK-3)
  Created during P0, validated in R2. Contains:
    Standard values from Machining Data Handbook
    Sandvik Coromant cutting data catalog
    Walter online cutting data calculator
    With source citations for audit traceability

COMPARISON PROTOCOL:
  For each calc: | PRISM_value - reference_value | / reference_value <= tolerance
  If within tolerance → PASS (with actual delta recorded)
  If outside tolerance → INVESTIGATE:
    1. Is the reference value correct? (old edition, different conditions?)
    2. Is the material data correct? (kc1_1, mc, Taylor C/n sourced properly?)
    3. Is the formula correct? (implementation matches equation?)
    4. Is it a FORMULA LIMITATION? (Kienzle doesn't model thin-chip effects at low ap)
  After investigation: FIX or DOCUMENT as known limitation with reasoning.

PARALLEL EQUIVALENCE TOLERANCE (CB-5 — for R6 regression testing):
  When comparing parallel vs sequential execution results:
    Floating-point results may differ by ≤1e-10 due to operation ordering.
    Compare using: Math.abs(parallel - sequential) < 1e-6 * Math.max(1, Math.abs(sequential))
    This is tolerance-based comparison, NOT exact equality.
```

---

## R2-MS0: 50-Calc Test Matrix

**Effort:** ~25 calls | **Tier:** DEEP
**Entry:** R1 COMPLETE. All registries loaded, enriched, indexed.

```
MATERIALS (10 — representative across ISO groups):
  P Steels:    4140 (alloy), 1045 (medium carbon), D2 (tool steel)
  M Stainless: 316SS (austenitic), 17-4PH (precipitation hardened)
  K Cast Iron: Gray iron FC250
  N Nonferrous: 6061-T6 (aluminum), C360 (brass)
  S Superalloys: Inconel 718 (nickel), Ti-6Al-4V (titanium)

OPERATIONS (5):
  Turning (roughing), Face milling (roughing), Drilling (through),
  Slotting (full width), Thread tapping (M10x1.5)

EXECUTION ORDER (parallel groups for Agent Teams):
  Group 1 (parallel — 5 concurrent): 4140 all ops → flush
  Group 2 (parallel — 5 concurrent): 316SS all ops → flush
  Group 3 (parallel — 5 concurrent): Inconel 718 all ops → flush
  Group 4 (parallel — 5 concurrent): 6061-T6 all ops → flush
  Remaining 6 materials: 2 groups of 3 (parallel within group) → flush each

FOR EACH CALCULATION:
  1. prism_data action=material_get material="[name]"  [effort=high]
     VERIFY: tribology and composition are NOT null (from R1-MS6 enrichment)
  2. prism_calc action=speed_feed material="[name]" operation="[op]"  [effort=max, structured output]
     VERIFY against R2_TOLERANCES ± tolerance
  3. If S(x) < 0.70 → record as SAFETY_BLOCK (expected for some material+op combos)
  4. If S(x) >= 0.70 → verify Vc, fz, ap against reference values
  5. Record in R2_CALC_RESULTS.md:
     "[material] [operation]: Vc=[value] fz=[value] S(x)=[value] [PASS/FAIL/BLOCK] delta=[%]"

  SORT RESULTS by material.localeCompare() then operation.localeCompare() before flush.
  WHY: Unsorted parallel results make diff-based regression testing unreliable.

FLUSH + CHECKPOINT PROTOCOL (per group):
→ FLUSH Group results: prism_doc action=append name=R2_CALC_RESULTS.md content="GROUP [A/B]: [sorted results]"
   VERIFY FLUSH: Calc results are NON-REGENERABLE (multi-step: material_get → calc → validate).
   If flush fails, retry once. If retry fails, DO NOT shed from context.
   CONTENT VERIFY (MANDATORY): Read back last 100 chars, confirm match.
→ MICRO-CHECKPOINT: prism_doc action=append name=ACTION_TRACKER.md
   content="R2-MS0 GROUP-[A/B] complete [date] — 25 calcs, [N pass] / [N fail]"

WHY CHECKPOINT PER GROUP: If session ends after Group A, recovery restarts at Group B only.
  Without checkpoints: re-run all 50 calcs. With: re-run 25. Saves ~12 calls.

AFTER ALL 50 CALCULATIONS:
  Summary statistics:
    Total: 50 | PASS: [N] | FAIL: [N] | SAFETY_BLOCK: [N]
    Worst delta: [material] [operation] at [%]
    Best delta: [material] [operation] at [%]
  Safety blocks are NOT failures — they mean the system correctly prevented a bad cut.
  Expected safety blocks: Ti-6Al-4V tapping (usually too risky), maybe D2 slotting.

CONTEXT MANAGEMENT:
  After each group flush → prism_context action=context_compress
  Clear completed group's tool results from context.
  Keep only: summary stats, FAIL/BLOCK entries, CURRENT_POSITION.

EXIT: R2_CALC_RESULTS.md has all 50 results. FAIL count documented for MS3 fix cycle.
```

---

## R2-MS1: Safety Engine Activation (29 Actions)

**Source:** SUPERPOWER_ROADMAP.md Phase 1, Steps 1.1-1.9
**Effort:** ~30 calls | **Tier:** DEEP
**Entry:** R2-MS0 COMPLETE (50-calc matrix provides baseline).

**REFERENCE DOCUMENT:** Load SUPERPOWER_ROADMAP.md for this MS ONLY. It contains the EXACT
input parameter values for each of the 29 safety actions. DO NOT invent parameters — use
the specific values from the Superpower Roadmap to ensure reproducible test results.

**WHY REAL MACHINE DATA MATTERS (v14.0):**
  R1-MS7 populated the top 50 machines with spindle/power/envelope specs. This means:
  - Spindle protection tests use REAL Haas VF-2 specs (8100 RPM, 22.4 kW, 122 Nm)
  - Collision engine tests use REAL machine work envelopes (762×406×508 mm for VF-2)
  - Not hardcoded test values that might not match real machines
  When the Superpower Roadmap specifies a spindleSpec, PREFER using the actual VF-2 (or
  equivalent) machine data from the registry. Note any discrepancies in test results.

```
=== ENGINE 1: TOOL BREAKAGE (5 actions) ===

ACTION 1: predict_tool_breakage
  prism_validate action=predict_tool_breakage
    tool: { diameter: 10, shankDiameter: 10, fluteLength: 22, overallLength: 72,
            stickout: 40, numberOfFlutes: 4 }
    forces: { Fc: 445, Ff: 178, Fp: 134 }
    conditions: { feedPerTooth: 0.1, axialDepth: 3, radialDepth: 6,
                  cuttingSpeed: 150, spindleSpeed: 4775 }
    toolMaterial: "carbide"
  EXPECTED: breakage probability %, risk level, recommendations
  VERIFY: Probability is between 0-100. Risk level is LOW/MEDIUM/HIGH/CRITICAL.
  RECORD: action=predict_tool_breakage, status=PASS/FAIL, output summary

ACTION 2: calculate_tool_stress
  (Exact params from Superpower Roadmap Step 1.2)
  EXPECTED: Von Mises stress, safety factor, max stress location

ACTION 3: check_chip_load_limits
  (Exact params from Superpower Roadmap Step 1.3)
  EXPECTED: chip load value, within/exceeded limits, recommendation

ACTION 4: estimate_tool_fatigue
  (Exact params from Superpower Roadmap Step 1.4)
  EXPECTED: cycles to failure, fatigue life estimate, confidence level

ACTION 5: get_safe_cutting_limits
  (Exact params from Superpower Roadmap Step 1.5)
  EXPECTED: max safe Vc, max safe fz, max safe ap for given tool

=== ENGINE 2: WORKHOLDING (5 actions) ===

ACTION 6: calculate_clamp_force_required
  (Exact params from Superpower Roadmap Step 1.6a)
  EXPECTED: Required clamping force in N, safety factor

ACTION 7: validate_workholding_setup
  (Exact params from Superpower Roadmap Step 1.6b)
  EXPECTED: PASS/FAIL status, reasoning, risk assessment

ACTION 8: check_pullout_resistance
  (Exact params from Superpower Roadmap Step 1.6c)
  EXPECTED: Pullout force margin, PASS/FAIL

ACTION 9: analyze_liftoff_moment
  (Exact params from Superpower Roadmap Step 1.6d)
  EXPECTED: Liftoff moment value, safety margin

ACTION 10: calculate_part_deflection
  (Exact params from Superpower Roadmap Step 1.6e)
  EXPECTED: Deflection in mm, within tolerance PASS/FAIL

=== ENGINE 3: SPINDLE PROTECTION (5 actions) ===

ACTION 11: check_spindle_torque
  Use REAL machine data: prism_data action=machine_get machine="VF-2" → get spindle specs
  Pass spindleSpec from registry data (not hardcoded):
    { maxRpm: [from registry], power_kw: [from registry], maxTorque: [from registry] }
  (Remaining params from Superpower Roadmap Step 1.7a)
  EXPECTED: Torque %, within/exceeded spindle capacity

ACTION 12: check_spindle_power
  Same approach — real machine data for spindleSpec
  EXPECTED: Power %, within/exceeded

ACTION 13: validate_spindle_speed
  Real machine data for spindleSpec
  EXPECTED: Speed validity, thermal risk assessment

ACTION 14: monitor_spindle_thermal
  (Exact params from Superpower Roadmap Step 1.7d)
  EXPECTED: Thermal status, temperature estimate, warning level

ACTION 15: get_spindle_safe_envelope
  Real machine data for spindleSpec
  EXPECTED: Safe operating envelope { max_rpm, max_torque, max_power, safe_zone_plot_data }

=== ENGINE 4: COOLANT VALIDATION (5 actions) ===

ACTION 16: validate_coolant_flow
  (Exact params from Superpower Roadmap Step 1.8a)
  EXPECTED: Flow rate adequacy, cooling effectiveness

ACTION 17: check_through_spindle_coolant
  (Exact params from Superpower Roadmap Step 1.8b)
  EXPECTED: TSC pressure check, nozzle clearance

ACTION 18: calculate_chip_evacuation
  (Exact params from Superpower Roadmap Step 1.8c)
  EXPECTED: Chip volume rate, evacuation effectiveness, clogging risk

ACTION 19: validate_mql_parameters
  (Exact params from Superpower Roadmap Step 1.8d)
  EXPECTED: MQL flow rate adequacy, droplet size suitability

ACTION 20: get_coolant_recommendations
  (Exact params from Superpower Roadmap Step 1.8e)
  EXPECTED: Recommended coolant type, concentration, delivery method

=== ENGINE 5: COLLISION (8 actions) ===

ACTION 21: check_collision
  Use REAL machine data for work envelope:
    prism_data action=machine_get machine="VF-2" → get travels
  (Remaining params from Superpower Roadmap Step 1.9)
  EXPECTED: Collision risk PASS/FAIL, clearance distances

ACTION 22: check_tool_reach
  EXPECTED: Tool can/cannot reach target position, minimum stickout required

ACTION 23: validate_approach_path
  EXPECTED: Approach path clear/obstructed, alternative paths if obstructed

ACTION 24: check_fixture_clearance
  EXPECTED: Fixture clearance adequate/inadequate, minimum clearance distances

ACTION 25: validate_rapid_moves
  EXPECTED: Rapid move path clear/obstructed, collision risk zones

ACTION 26: check_tool_change_clearance
  EXPECTED: Tool change position safe/unsafe, ATC clearance

ACTION 27: validate_work_envelope
  Real machine data for envelope limits
  EXPECTED: Part fits/doesn't fit, clearance in each axis

ACTION 28: get_safe_zone
  EXPECTED: Safe zone boundaries for given setup

=== VALIDATION PROTOCOL (for EACH action) ===

For each of the 29 actions above:
  1. Call with exact params from Superpower Roadmap (substituting real machine data where noted)
  2. If PARAM MISMATCH ERROR:
     a. prism_dev action=code_search pattern="[action_name]" path="src/"  [effort=high]
     b. Identify: Is the action handler expecting different param names?
     c. Fix: Either update the call to match the handler, or fix the handler if it's wrong
     d. Rebuild + retest
  3. If RESPONSE MISSING EXPECTED FIELDS:
     a. Trace to engine method. Verify return type matches expectation.
     b. Fix engine method or update expectations.
  4. If PHYSICAL BOUNDS VIOLATED (e.g., negative force, infinite life):
     a. This is a REAL BUG. Do not suppress.
     b. Document in PHASE_FINDINGS.md as CRITICAL.
     c. Fix in MS3 (fix cycle).
  5. RECORD: { action, status: "PASS"|"PARAM_FIX"|"FAIL", output_summary, fix_applied? }

After all 29:
  Flush results to R2_SAFETY_ENGINE_RESULTS.md
  Summary: 29 actions | PASS: [N] | PARAM_FIX: [N] | FAIL: [N]
  PARAM_FIX count is not a failure — wiring mismatches are expected during first activation.
  FAIL count goes to MS3 fix cycle.

EXIT: All 29 safety actions verified operational with real/reference data inputs.
  Results in R2_SAFETY_ENGINE_RESULTS.md.
```

---

## R2-MS1.5: CALCULATION REGRESSION SUITE ← NEW in v14.2

**Source:** SYSTEMS_ARCHITECTURE_AUDIT.md Finding 7, Gap Analysis SA Audit
**Effort:** ~8 calls | **Tier:** DEEP
**Entry:** R2-MS0 + R2-MS1 COMPLETE. 50 benchmarks + 29 safety engines validated.

**WHY THIS IS CRITICAL:**
  R2-MS0 and MS1 validate that calculations are CURRENTLY correct. But any future
  code change could silently break them. This MS locks the correct answers as a
  REGRESSION SUITE that fails the build if any benchmark result changes. This is
  the "golden dataset" — if it passes, calculations are trustworthy.

```
Step 1: Create src/__tests__/calcRegression.test.ts

  CONTENT: Uses CALC_BENCHMARKS.json from R2-MS0 as golden dataset.
  For each of the 50 benchmark entries:
    { input, expected, tolerance_pct, source }
  Run the actual calculation engine with input.
  Compare output to expected within tolerance_pct.
  ASSERT: |actual - expected| / expected < tolerance_pct / 100

Step 2: Add critical safety formulas as unit tests:
  Kienzle force: known inputs → known Fc within ±3%
  Taylor tool life: known inputs → known T within ±5%
  Johnson-Cook flow stress: known inputs → known σ within ±3%
  Chip thinning: known inputs → known hex within ±2%
  Scallop height: known inputs → known h within ±1%
  Thread pitch diameter: known inputs → known d2 within ±0.5%
  Stability lobe: known inputs → known ap_crit within ±5%

Step 3: Wire into build pipeline
  npm run build now includes: tsc --noEmit + esbuild + test:critical + calcRegression
  BEHAVIOR: BUILD FAILS if any benchmark changes beyond tolerance.
  This means NO code change can accidentally break force calculation.

Step 4: Add regression hook
  calc_regression_gate — blocking, post-build, runs golden dataset.
  FAILS build if any result changes. Zero tolerance for calculation regression.

Step 5: Document
  Append ROADMAP_TRACKER: "R2-MS1.5 COMPLETE — Regression suite locked with [N] benchmarks"
  Update CURRENT_POSITION: "CURRENT: R2-MS2 | LAST_COMPLETE: R2-MS1.5"
```

**GOLDEN DATASET STORAGE:**
```
  File: src/data/goldenBenchmarks.json
  Format: {
    version: "R2-MS1.5",
    locked_date: "YYYY-MM-DD",
    benchmarks: [
      {
        id: "BM-001",
        material: "4140",
        operation: "turning",
        inputs: { Vc: 200, fz: 0.25, ap: 2.0, ... },
        expected: { Vc_out: 198, Fc: 1245, T: 42, safety_score: 0.82, ... },
        tolerance_category: "speed_feed",
        source: "R2-MS0 matrix result",
        source_citation: "Machinery's Handbook, 30th Ed, Table 1a"
      }
    ]
  }

  This file is:
    - Created once during R2-MS1.5
    - NEVER modified after creation (golden = immutable)
    - Referenced by calc_regression_gate hook (blocking, post-build)
    - Referenced by R6-MS1 SL-5 safety-score-under-load comparison
    - Versioned: if R7 coupled physics changes baselines, create goldenBenchmarks_v2.json
      and update the hook to reference the new version
  ⚡ CLAUDE CODE: Batch execution of 50-calc matrix is ideal for Claude Code.
```

**EXIT:** Golden dataset locked. Build fails on any calculation regression.
  Any future code change that breaks physics is caught immediately.

---

## R2-MS2: AI-Generated Edge Cases

**Effort:** ~10 calls | **Tier:** DEEP
**Entry:** R2-MS1 COMPLETE.

```
USE OPUS 4.6 NOVEL REASONING (effort=max) to generate adversarial edge cases.

=== GENERATE EDGE CASES (effort=max — novel reasoning task) ===
1. Collect inputs for the prompt:
   1a. prism_dev action=file_read path="src/formulas/" start_line=1 end_line=200  [effort=low]
       → Extract Taylor, Kienzle, specific cutting force definitions.
       SIZE TARGET: Extract ONLY function signatures and key constants (~50 lines, not full impl).
   1b. prism_dev action=file_read path="src/schemas/safetyCalcSchema.ts"  [effort=low]
       → Extract the structured output schema (physical bounds, required fields).
       SIZE TARGET: Paste the full schema (~30 lines — it IS the constraint set).
   1c. prism_doc action=read name=R2_CALC_RESULTS.md  [effort=low]
       → Extract the 6 manual edge cases from MS3 (inputs + results).
       SIZE TARGET: Paste only inputs and results (~20 lines, not full diagnostic text).
   TOTAL PROMPT TARGET: <100 lines combined. If larger → summarize formula defs further.

2. prism_orchestrate action=agent_execute agent=opus  [effort=max]
   task="Given these formula definitions: [paste from 1a]
   And this output schema with physical bounds: [paste from 1b]
   And these 6 existing edge cases: [paste from 1c]
   Identify 10-15 input combinations that are mathematically valid but would
   produce dangerous or deceptive results in real CNC machining. Focus on:
   - Taylor curve inflection points (small input change → large output swing)
   - Materials with identical kc1_1 but different mc (appears similar, cuts differently)
   - Calculated RPM at machine maximum (resonance risk)
   - Hardness unit mismatches (HRC vs HB lookup errors)
   - Duplex stainless/superalloy properties that confuse standard formulas
   - Feed rates valid per formula but causing built-up-edge at low speed
   - Depth of cut at exactly tool flute length (deflection risk)
   - Coolant-dependent materials run without coolant flag
   - Multi-pass operations where total depth exceeds material thickness
   - Thread operations approaching minimum wall thickness
   Format: JSON array of { material, operation, params: {Vc, fz, ap, ...}, danger_type, explanation }"

   WHY agent_execute with opus: This is a NOVEL REASONING task, not a structured calculation.
   TIMEOUT: Use apiCallWithTimeout with 120s (not default 30s — max-effort novel task).
   RESPONSE HANDLING: Look for [...] JSON array in response → parse with JSON.parse().
     If parse fails → extract entries manually from prose. If no parseable structure → re-prompt:
     "Respond ONLY with a JSON array. No explanations outside the array."

3. Classify each generated case  [effort=high — requires metallurgical judgment]:
   VALID-DANGEROUS: Input is real/plausible AND the danger is physically meaningful → TEST IT
   THEORETICAL: Danger is real but input requires impossible machine setup → DOCUMENT only
   ALREADY-COVERED: Similar to one of the 6 manual edge cases → SKIP

   MINIMUM: At least 5 VALID-DANGEROUS cases must be tested.
   If classification yields <5 VALID-DANGEROUS:
     Re-prompt the agent: "Focus specifically on [area with fewest edge cases from MS3]."
     OR: Promote 1-2 THEORETICAL cases to VALID-DANGEROUS if they can be simulated.

=== EXECUTE VALID-DANGEROUS CASES (effort=max, structured output) ===
4-8. Run each through calc chain. Document input, expected, actual, pass/fail.

=== ANALYZE ===
9. INCORRECT/DANGEROUS output → CRITICAL finding → propose fix for MS3.
10. Correctly identified danger → PASS. Document safety_score and warning.

=== DOCUMENT ===
11. Append R2_CALC_RESULTS.md. Add edge case definitions to regression test suite.
12. Append ROADMAP_TRACKER.
```

---

## R2-MS3: Manual Edge Cases + Fix Cycle

**Effort:** ~15 calls | **Tier:** DEEP
**Entry:** R2-MS2 COMPLETE.

```
=== MANUAL EDGE CASES (6 predefined) ===

EDGE 1: Micro-tool (0.5mm endmill in hardened steel)
  material="D2", operation="milling", tool_diameter=0.5, depth=0.1
  Expected: Very low Vc (~20 m/min), very low fz (~0.005), high RPM (~12,000+)
  Safety risk: Tool deflection at L/D > 4, runout sensitivity

EDGE 2: Heavy roughing (large DOC in mild steel)
  material="1045", operation="turning", ap=10, ae=full
  Expected: High forces (Fc > 5000N), power check critical, moderate Vc (~180 m/min)
  Safety risk: Machine power limit, chuck grip force

EDGE 3: Superalloy finishing (light DOC in Inconel)
  material="Inconel 718", operation="milling", ap=0.2, ae=0.5
  Expected: High Vc (~40 m/min), low forces, but very short tool life
  Safety risk: Work hardening layer, notch wear at DOC line

EDGE 4: Aluminum HSM (very high speed machining)
  material="6061-T6", operation="milling", Vc=800, fz=0.15
  Expected: Very high RPM (~25,000+), low forces, excellent tool life
  Safety risk: Chip evacuation at high MRR, spindle thermal limits

EDGE 5: Interrupted cut (4140 with keyway, face milling)
  material="4140", operation="face_milling", interrupted=true
  Expected: Impact loading, reduced tool life, potential chipping
  Safety risk: Insert grade must handle interruptions (tough grade, not cermet)

EDGE 6: Thread milling in titanium (blind hole M8x1.25)
  material="Ti-6Al-4V", operation="thread_milling", thread="M8x1.25", depth=15
  Expected: Low Vc (~25 m/min), single-pass preferred, HSC coolant required
  Safety risk: Galling, tap breakage if tapping instead

=== FIX CYCLE (for all failures from MS0 + MS1 + MS2 + manual edges) ===

Categorize each failure into EXACTLY ONE of five categories (OB-1):
  1. FORMULA: The math equation is wrong (Vc off by >tolerance, Fc negative).
     Root cause: implementation doesn't match Kienzle/Taylor/etc.
     Example: h^(1-mc) coded as h^(mc-1) — inverts the entire force curve.
  2. VALIDATION: Calc produces right numbers but structured output/safety gate rejects.
     Root cause: schema too strict or threshold miscalibrated.
     Example: exclusiveMinimum:0 rejects Vc=0.001 which is physically valid for micro-tools.
  3. DATA: Calc uses wrong input data (material kc1_1, Taylor C/n incorrect).
     Root cause: registry data value is wrong.
     Example: kc1_1 for Inconel 718 is 2800, but data file has 1800 (missing a digit).
  4. PARAM: Input parameters are valid but produce unsafe result.
     Root cause: parameter selection logic, not math.
     Example: Recommended ap=5mm for 0.5mm endmill — valid per formula but physically absurd.
  5. LIMITATION: Formula is mathematically correct but physically inadequate for these conditions.
     NOT a bug — the mathematical model has a boundary. Cannot be fixed with code changes.
     Example: Taylor breaks down at very low speeds (diffusion wear dominates, not flank wear).
     Example: Kienzle doesn't model built-up edge formation at low speed+high feed in aluminum.
     Tag as CRITICAL in PHASE_FINDINGS.md: "MODEL-BOUNDARY: [formula] does not account
     for [phenomenon] at [conditions]." These become future formula improvement requirements.

Priority order: FORMULA first (wrong math is most dangerous), then VALIDATION, DATA, PARAM.
LIMITATION: document but do NOT attempt to fix — these are architectural, not bugs.

For each FORMULA and VALIDATION fix:
  a. Locate the function:
     prism_dev action=code_search pattern="[formula_name]\|[function_name]" path="src/"  [effort=high]
  b. Read BOUNDED section:
     prism_dev action=file_read path="[file]" start_line=[match-10] end_line=[match+50]  [effort=low]

  FORMULA FIX DIAGNOSTIC — hand-calculate to distinguish formula bug from data bug:
     i.   Record: input params, expected output, actual output, delta%.
     ii.  HAND-CALCULATE the formula with the same inputs (calculator / mental math):
          Taylor: T = C / (Vc^n) → plug in material's C and n constants from material_get.
          Kienzle: Fc = kc1_1 * b * h^(1-mc) → plug in material's kc1_1 and mc.
     iii. If your hand-calc matches ACTUAL → formula is RIGHT, reference data is WRONG → reclassify as DATA FIX.
          If your hand-calc matches EXPECTED → formula implementation has a BUG → find it in code.
          If your hand-calc matches NEITHER → constants (kc1_1, n, mc) may be wrong for this material.
     iv.  Common formula bugs:
          - Exponent sign (h^(1-mc) vs h^(mc-1) → inverts the curve)
          - Unit mismatch (mm vs m in Vc calculation → 1000x error)
          - Missing conversion factor (Vc in m/min, formula expects m/s → divide by 60)

  c. Apply fix: str_replace on the specific calculation logic. ONE fix per str_replace.
  d. Build: prism_dev action=build target=mcp-server  [effort=medium]
  e. Re-run the failing test at effort=max with structured output.
  f. Verify fix: result now within R2_TOLERANCES[category] AND S(x) >= 0.70.
  g. REGRESSION CHECK — re-run 3 SPECIFIC passing tests (not random):
     - 1 from Group A common metals (e.g., 4140 turning — baseline common case)
     - 1 from Group B exotic metals (e.g., Ti-6Al-4V milling — different formula path)
     - 1 from the manual edge case set (e.g., near-zero feed rate — boundary behavior)
     This ensures the fix didn't break common, exotic, OR boundary behavior.
     If ANY regressed → REVERT the fix (git checkout HEAD~1 -- [file]) → try a different approach.

=== AI VALIDATION ADDITIONS ===
New validation rules from MS2 AI-generated edge cases (RPM machine-max, coolant-required,
depth vs flute length):
  For each new rule:
  a. prism_dev action=code_search pattern="validateInput\|inputValidation" path="src/"  [effort=high]
  b. Read the input validation module (BOUNDED).
  c. Add new validation check via str_replace — fires BEFORE calc, not after.
     Example: if (ap > tool.flute_length) throw new SafetyBlockError("Depth exceeds flute length", 0.0);
  d. Build → verify new validation catches the AI-generated edge case → verify existing tests still pass.

After fix cycle: RE-RUN all 50 calculations from MS0 + all 29 safety actions from MS1.
  Verify no regressions. All previously-passing tests must still pass.

EXIT: All fixable failures resolved. Known limitations documented. No regressions.
```

---

## R2-MS4: Build Gate + Phase Completion

**Effort:** ~10 calls | **Tier:** RELEASE
**Entry:** R2-MS3 COMPLETE.

```
=== GATE CRITERIA (ALL must pass) ===

□ 50-calc matrix: All non-LIMITATION calculations within R2_TOLERANCES
□ 50-calc matrix: All safe combinations have S(x) >= 0.70
□ 29 safety actions: All respond correctly (no FAIL, PARAM_FIX all resolved)
□ AI edge cases: All critical findings resolved or documented as limitations
□ Manual edge cases: All 6 tested, failures fixed or documented
□ No regressions: Full test suite passes
□ Fault injection: NaN test passed (from §FAULT INJECTION above)
□ Build: clean, no warnings
□ Test files created: safetyMatrix.test.ts, edgeCases.test.ts, safetyEngines.test.ts

=== AUTOMATE TEST MATRIX (create vitest tests) ===

Convert the 50-calc matrix + 6 manual edge cases + AI edge cases into vitest tests:
  Create src/__tests__/safetyMatrix.test.ts:
    import { R2_TOLERANCES } from '../schemas/tolerances';
    for each material × operation: test that S(x) >= 0.70 AND delta <= tolerance.
  Create src/__tests__/edgeCases.test.ts:
    Test each edge case produces expected result or correct rejection.
  Create src/__tests__/safetyEngines.test.ts:
    Test each of the 29 safety engine actions responds correctly.
  npm test → ALL tests pass.
  WHY: "npm test" is the R6 regression gate. By R6, every calc must run automatically in CI.
  Building the test suite here (where the calcs are fresh) is 10x cheaper than retrofitting in R6.

=== QUALITY GATE ===

□ Ralph sanity check: prism_ralph action=assess target="health endpoint" → A or A+
□ Ralph assessment: prism_ralph action=assess target="R2 Safety Validation" → A- or better
□ Omega: prism_omega action=compute target="R2 complete" → >= 0.70

=== DOCUMENTATION ===

□ R2_CALC_RESULTS.md: All 50 matrix results
□ R2_SAFETY_ENGINE_RESULTS.md: All 29 safety action results
□ R2_EDGE_CASES.md: All AI + manual edge cases
□ PHASE_FINDINGS.md (R2 section): Failures found, fixes applied, limitations documented
    CRITICAL: AI edge cases revealing unknown dangerous inputs. Formula fixes changing S(x) >0.05.
    IMPORTANT: New validation rules. Edge case patterns for R3 batch testing.
    NOTE: Parallel execution timing. Sensitivity observations.
□ ROADMAP_TRACKER.md: "R2-MS4 COMPLETE [date] — PHASE R2 COMPLETE"
□ CURRENT_POSITION.md: "CURRENT: R3-MS0 | LAST_COMPLETE: R2-MS4 | PHASE: R3 not-started"
□ PRISM_MASTER_INDEX.md: R2 status → "complete"

EXIT: PHASE R2 COMPLETE. All safety calculations validated. All safety engines operational.
  Edge cases tested. Fix cycle complete. No regressions. Ralph >= A-. Omega >= 0.70.
```

---

## R2-MS5: Uncertainty Quantification (Optional)

**Effort:** ~8 calls | **Entry:** R2-MS4 COMPLETE. Only if session budget >15K tokens.

```
1. Run 5 critical calcs with ±5% input perturbation on Vc and fz.
2. safety_score varies >0.10 → HIGH SENSITIVITY → flag for R3 what_if feature calibration.
3. safety_score varies <0.02 → ROBUST.
4. Document sensitivity map in R2_CALC_RESULTS.md.
5. This data feeds R3-MS1 uncertainty_chain action — having sensitivity baselines
   makes uncertainty propagation calibration more accurate.
```

**Exit:** Sensitivity mapped. Optional MS — no gate required.

---

## R2 COMPANION ASSETS (v14.2 — build AFTER R2-MS4 gate passes)

```
HOOKS (1 new — plus calc_regression_gate from MS1.5):
  calc_benchmark_drift — warning, runs monthly, checks if any benchmark tolerance
                         has been widened since original lock. Prevents tolerance creep.

SCRIPTS (1 new):
  calc_benchmark_runner — Runs all 50 benchmarks with detailed comparison output.
                          Shows: input, expected, actual, delta, source citation.
                          Suitable for human review and audit trail.
```
