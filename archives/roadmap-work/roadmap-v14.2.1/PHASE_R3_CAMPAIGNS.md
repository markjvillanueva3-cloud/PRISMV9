# PHASE R3: INTELLIGENCE + DATA CAMPAIGNS — v14.3
# Status: not-started | Sessions: 4-6 | MS: 7 (MS0-MS5, with MS0.5 new) | Role: Principal Architect
# v14.2: Expanded MS0 (unit/tolerance intelligence — Gap 4), added MS0.5 (formula registry
#   integration — Gap 5), expanded MS3 (controller intelligence — Gap 9), added companion assets.
# Pattern: BUILD FEATURE → TEST → CHAIN → VALIDATE → CAMPAIGN → GATE
# v14.0: Unified Roadmap — expanded from stub to full phase doc.
#         Absorbs Superpower Roadmap Phases 2-5:
#           MS0 = Job Planner + Setup Sheet (Superpower Phase 2)
#           MS1 = Advanced Calculations (Superpower Phase 3)
#           MS2 = Toolpath Intelligence (Superpower Phase 4)
#           MS3 = Cross-System Intelligence (Superpower Phase 5)
#           MS4 = Data Enrichment Campaigns (original R3, batch validation + workholding + alarms)
#           MS5 = Phase Gate
#
#         THIS IS WHERE PRISM BECOMES A PRODUCT, NOT JUST AN ENGINE.
#         R1 built the data foundation. R2 validated the engines.
#         R3 composes those validated engines into intelligence features that
#         answer the questions machinists actually ask:
#           "I need to machine Inconel 718 on my DMU 50 — what do I do?"
#           "What happens if I increase my cutting speed by 20%?"
#           "I can't get Inconel 718 — what can I substitute?"
#           "Which machine can handle this 300mm part in Ti-6Al-4V?"
#
#         14 NEW ACTIONS defined across MS0-MS3: job_plan, setup_sheet, wear_prediction,
#           process_cost, uncertainty_chain, strategy_for_job (wired in R1-MS8),
#           strategy_compare (wired in R1-MS8), material_substitute, machine_recommend,
#           controller_optimize, what_if, unified_search (wired in R1-MS8)
#
# v13.9: Cross-Audit Governance retained. Batch size corrected (SL-1: 10 not 50).
#         ATCS tracking, CAMPAIGN_STATE.json, fault injection — all retained from stub.
# v13.5-v13.8: All prior hardening retained unchanged.

---

## CONTEXT BRIDGE

WHAT CAME BEFORE: R2 validated 50-calc matrix + 29 safety engine actions + AI edge cases.
  All safety baselines established. All registries >95% with data foundation from R1.
  Fix cycle complete. No regressions. R2_CALC_RESULTS.md exists with baselines.

WHAT THIS PHASE DOES: Build intelligence features that COMPOSE validated engines into
  user-facing capabilities. Then run data campaigns to validate the full material library.
  After R3, PRISM answers complex machining questions, not just individual calculations.

WHAT COMES AFTER: R4 (Enterprise) wraps intelligence features in multi-tenant isolation,
  compliance templates, structured logging, and API gateway hardening.
  R5 (Visual) builds UI for each intelligence feature (job planner page, calculator, etc.).
  R6 (Production) stress-tests everything under load.

ARTIFACT MANIFEST (XA-1):
  REQUIRES: R2_CALC_RESULTS.md, PHASE_FINDINGS.md (R2 section)
  PRODUCES: PHASE_FINDINGS.md (R3 section), src/__tests__/intelligenceFeatures.test.ts,
            src/__tests__/batchCalcs.test.ts, src/__tests__/pfpCalibration.test.ts,
            WORKHOLDING.json, R3_CAMPAIGN_STATE.json

TEST LEVELS: L1-L5 required (unit + contract + integration + orchestration + safety invariants)

FAULT INJECTION TEST (XA-13):
  R3 FAULT TEST: Timeout one batch task → verify batch continues without it.
  WHEN: During second or later batch (need at least one successful batch first).
  HOW: Set artificially low timeout on one task in parallel_batch → let it fail.
  EXPECTED: Batch completes with partial results. Failed task logged. No data corruption.
  PASS: Batch continues. Partial results saved. Failed material added to quarantine.
  FAIL: Entire batch aborts, or failed task causes data corruption.
  EFFORT: ~5 calls.

---

### EXECUTION MODEL
Environment: Hybrid — Claude Code (batch campaigns) + Claude.ai MCP (action design)
Model: Sonnet (implementation) → Opus (coupled action chain design, cross-system integration)

MILESTONE ENVIRONMENT MAP:
- MS0 (unit/tolerance intelligence): MCP — design session with Opus
- MS0.5 (formula registry integration): MCP — design session with Opus
- MS1 (action implementation): Claude Code — Sonnet, write/test/fix loops
- MS2 (action implementation continued): Claude Code — Sonnet
- MS3 (controller intelligence): Hybrid — Opus design in MCP, Sonnet implement in Code
- MS4 (batch data campaigns): Claude Code — background agents, parallel across material families

11 new action designs (job_plan, setup_sheet, wear_prediction, process_cost,
uncertainty_chain, strategy_for_job, strategy_compare, material_substitute,
machine_recommend, controller_optimize, what_if) use the MCP workflow:
brainstorm → plan → execute → validate via prism_sp dispatcher.

---

## MANDATORY REQUIREMENTS (brainstorm MUST include ALL of these — from v13.9)

```
1. Error budget enforcement per batch (not just aggregate)
2. Quarantine protocol for materials that fail >2 categories
3. Human review gate before campaign completion (no fully-automated sign-off)
4. PFP calibration against R2 baselines
5. MAINTENANCE_MODE during any batch that modifies registry data
6. Schema version bump if ANY new fields added to material JSON (Code Standards)
7. Threshold monitoring active (from R1-MS9) throughout all campaigns
8. Swarm pattern selection documented (which pattern for parallel batch)
9. ATCS tracks batch progress: task_init per campaign, batch = subtask.
   Session resume: task_list → find incomplete campaign → continue.
10. CAMPAIGN_STATE.json written after each batch (not just at MS completion):
    { campaign_id, total_batches, completed_batch_ids: ["batch_1","batch_2",...],
      current_batch, error_count, quarantined_materials, last_update }
    NOTE (DC-3): Use completed_batch_ids ARRAY, not completed_batches COUNT.
    If two parallel batches complete simultaneously and both read-modify-write a count,
    one increment is lost. With an ID array, the union of concurrent writes is correct.
11. BATCH SIZE: 10 materials per batch, not 50 (SL-1 CORRECTED from v13.5).
    250 concurrent effort=max Opus calls is impossible on any API tier.
    Realistic: 10 materials × 5 ops = 50 calls/batch, concurrency=3, ~10min/batch.
12. PFP FEEDBACK ARCHITECTURE (SK-7): Design ingestion path for real shop floor failure data.
    Initial release uses calc-based calibration. Architecture must support future failure event feeds.
```

---

## R3-MS0: Job Planner + Setup Sheet

**Source:** Superpower Roadmap Phase 2, Steps 2.1-2.2
**Effort:** ~14 calls | **Tier:** DEEP
**Entry:** R2 COMPLETE.

**WHY THIS IS THE KILLER FEATURE:**
  Every machinist's daily question: "I need to make this part from this material on my machine.
  What cutting parameters should I use? What tools? How many passes? What coolant? What G-code?"
  Currently they consult multiple references, do mental math, and hope.
  job_plan answers ALL of it in one action call. This is the entire value proposition of PRISM.

```
=== STEP 1: BUILD JOB_PLAN ACTION ===
Effort: ~5 calls

1a. Design the job_plan action handler (add to dataDispatcher or new intelligenceDispatcher):

    ACTION: job_plan
    INPUT: {
      material: string,           // "Inconel 718" or "4140" or any designation
      operation: string,          // "milling" | "turning" | "drilling" | "threading"
      tool_diameter?: number,     // mm — if not specified, recommend one
      total_stock?: number,       // mm — total material to remove (for multi-pass)
      machine?: string,           // "DMU 50" — if not specified, generic params
      target_Ra?: number,         // µm — surface finish target (triggers finishing pass)
      workpiece?: {               // Optional workpiece geometry
        length?: number,          // mm
        width?: number,           // mm
        height?: number           // mm
      }
    }

    INTERNAL CHAIN (ALL existing validated functions, newly composed):
    ```
    1. MATERIAL: prism_data action=material_get material="[input.material]"
       → Get: kc1_1, mc, Taylor C/n, cutting_recommendations, machinability, iso_group
       → If material has tribology: include friction data for coolant recommendation

    2. SPEED/FEED: prism_calc action=speed_feed material="[material]" operation="[op]"
       → Get: Vc_roughing, Vc_finishing, fz, ap_max
       → If target_Ra specified: calculate finishing parameters separately

    3. MULTI-PASS: If total_stock > ap_max:
       Calculate pass strategy:
         roughing_passes = floor((total_stock - finishing_allowance) / ap_roughing)
         finishing_pass = 1 (if target_Ra specified)
         ap_roughing = (total_stock - finishing_allowance) / roughing_passes
         ap_finishing = finishing_allowance (typically 0.2-0.5mm)

    4. MACHINE CONSTRAINTS: If machine specified:
       prism_data action=machine_get machine="[input.machine]"
       → Get: spindle_max_rpm, power_kw, max_torque, work_envelope, controller
       → Check: RPM from Step 2 <= spindle_max_rpm
       → Check: Power from force calc <= power_kw * efficiency
       → If exceeded: Reduce Vc until within machine limits (recalculate)

    5. TOOL RECOMMENDATION: If tool_diameter not specified:
       prism_data action=tool_search query="[operation] [iso_group]" limit=5
       → Filter by: category matching operation, diameter appropriate for material
       → Select: Best match based on vendor cutting data, coating suitability, geometry

    6. COOLANT STRATEGY:
       Based on material class:
         Superalloys (Inconel, Ti): HSC (high-pressure through-spindle coolant)
         Cast iron: Dry or MQL (cast iron + flood = mud)
         Aluminum: Flood with high flow rate (chip flushing)
         Steel: Flood standard
         Stainless: Flood with EP additive (anti-welding)
       If material.tribology available: Use adhesion/galling data to refine recommendation

    7. G-CODE SNIPPET: If machine specified and controller known:
       Generate controller-specific G-code header:
         Fanuc: G90 G54 G43 H1 M3 S[rpm] F[feed] M8
         Siemens: CYCLE832([tolerance]) for HSM
         Haas: G187 P3 for smooth mode
         Mazak: MAZATROL conversational or EIA
       Include: tool call, work offset, spindle start, coolant on, first approach

    8. SAFETY VERIFICATION:
       Run safety check on final parameters:
         power_pct = (calculated_power / machine_power) * 100
         breakage_risk = (from tool breakage engine, if tool geometry known)
         tool_life_min = (from Taylor with chosen Vc)
       If S(x) < 0.70: BLOCK — do not return params. Return safety warning instead.
       If power_pct > 85%: WARNING — "operating near machine limits"
       If tool_life_min < 5: WARNING — "very short tool life, consider reducing Vc"
    ```

    OUTPUT FORMAT:
    ```json
    {
      "job_plan": {
        "summary": "Milling Inconel 718 on DMU 50 — 3 roughing passes + 1 finishing pass",
        "material": { "name": "Inconel 718", "iso_group": "S", "machinability": 12 },
        "parameters": {
          "roughing": { "Vc": 25, "fz": 0.08, "ap": 1.5, "ae": 6, "rpm": 796, "feed_mm_min": 255 },
          "finishing": { "Vc": 35, "fz": 0.05, "ap": 0.3, "ae": 6, "rpm": 1114, "feed_mm_min": 223 }
        },
        "pass_strategy": {
          "total_stock_mm": 5,
          "roughing_passes": 3, "roughing_ap": 1.57,
          "finishing_passes": 1, "finishing_ap": 0.3,
          "finishing_allowance": 0.3
        },
        "tool": { "recommended": "Carbide endmill, 4-flute, AlTiN coated", "diameter": 10 },
        "coolant": { "type": "HSC", "pressure_bar": 70, "reasoning": "Superalloy — high-pressure required" },
        "machine_check": { "power_pct": 62, "rpm_pct": 10, "within_envelope": true },
        "safety": { "score": 0.78, "warnings": ["Short tool life: ~12 min at roughing Vc"] },
        "gcode_header": "G90 G54\nT1 M6\nG43 H1\nM3 S796\nM8\nG0 X0 Y0\nG0 Z5.0\n...",
        "estimated_cycle_time_min": 18.5,
        "estimated_tool_changes": 2
      }
    }
    ```

1b. Implement the handler:
    Create the function that chains the 8 steps above.
    Each step calls existing validated functions — NO new physics, only composition.

1c. Build + verify:
    prism_dev action=build target=mcp-server  [effort=medium]
    Restart Claude Desktop.

=== STEP 2: BUILD SETUP_SHEET ACTION ===
Effort: ~3 calls

2a. Add setup_sheet action (simpler output format for shop floor printing):

    ACTION: setup_sheet
    INPUT: { material, operation, tool_diameter, machine, part_number?, operator_notes? }
    LOGIC: Call job_plan internally, then format for print-friendly output
    OUTPUT: Formatted setup sheet with:
      - Header: Part number, date, operator, machine
      - Tool list: T1=endmill 10mm, T2=drill 8.5mm, etc.
      - Parameters table: Op | Vc | fz | ap | RPM | Feed | Coolant
      - Safety notes: Power %, breakage risk, tool life
      - G-code header: Controller-specific startup code
      - Revision: v1, generated by PRISM

2b. Build + verify.

=== STEP 3: VALIDATION TESTS ===
Effort: ~6 calls

3a. Test job_plan for representative material/machine combinations:

    TEST 1: job_plan { material: "Inconel 718", operation: "milling", machine: "DMU 50",
                       tool_diameter: 10, total_stock: 5, target_Ra: 0.8 }
    EXPECTED: Vc 21-33 m/min, HSC coolant, 3+ passes, short tool life warning,
              Siemens G-code (DMU 50 uses Siemens 840D)

    TEST 2: job_plan { material: "4140", operation: "turning", machine: "QT-250",
                       total_stock: 3 }
    EXPECTED: Vc 180-250 m/min, flood coolant, 2-pass strategy,
              Mazatrol G-code (Mazak QT-250)

    TEST 3: job_plan { material: "6061-T6", operation: "milling", machine: "VF-2",
                       tool_diameter: 12, total_stock: 10, target_Ra: 1.6 }
    EXPECTED: Vc 300-600 m/min, flood coolant, high RPM (~8000+),
              Haas G-code

    TEST 4: job_plan { material: "316SS", operation: "drilling", tool_diameter: 8.5 }
    EXPECTED: Moderate Vc (60-80 m/min), flood with EP, pecking cycle recommended

    TEST 5: job_plan { material: "Ti-6Al-4V", operation: "turning", machine: "LB3000" }
    EXPECTED: Very low Vc (40-60 m/min), HSC coolant, strong tool life warnings

3b. For each test: verify output has all sections, safety score >= 0.70 for safe combos,
    G-code matches controller brand, coolant matches material class.

3c. Create src/__tests__/intelligenceFeatures.test.ts with these 5 tests.

EXIT: job_plan and setup_sheet produce complete, accurate machining plans.
  Unit handling works for mm and inch across all dimensional actions.
  Tolerance budgeting allocates tolerance across operation sequences.
```

=== STEP 4: UNIT + TOLERANCE INTELLIGENCE (v14.2 — Gap 4) ===
Effort: ~6 calls
Source: SYSTEMS_ARCHITECTURE_AUDIT.md Finding 11

4a. Add unit handling to ALL dimensional actions:
    Every action accepting dimensional inputs gets: unit: 'mm' | 'inch'
    Every output includes the unit used
    Automatic conversion using extracted/units/ (3 files on disk)
    Default detection: from machine controller type or user locale

4b. New action: tolerance_budget(part_tolerance, operations[])
    Input: final part tolerance (e.g., ±0.05mm) + sequence of operations
    Output: per-operation stock-to-leave with tolerance consumed
    Algorithm:
      - Roughing gets 60% of total stock, consumes 20% of tolerance
      - Semi-finish gets 25% of stock, consumes 30% of tolerance
      - Finish gets 15% of stock, consumes 50% of tolerance
    Accounts for: thermal growth (from R7 thermal model),
                  tool wear (from wear_prediction), machine accuracy class

4c. New action: unit_convert(value, from_unit, to_unit, dimension_type)
    Handles: length (mm↔inch), speed (m/min↔SFM), feed (mm/rev↔IPR),
             force (N↔lbf), pressure (MPa↔PSI), temperature (°C↔°F)
    Precision: maintains significant figures through conversion

4d. Wire into job_plan: plan output includes unit for every dimensional value.
    Test: same job plan in mm and inch produces equivalent results.

---

## R3-MS0.5: FORMULA REGISTRY INTEGRATION ← NEW in v14.2

**Source:** SYSTEMS_ARCHITECTURE_AUDIT.md Finding 1, Gap Analysis Gap 5
**Effort:** ~10 calls | **Tier:** DEEP
**Entry:** R3-MS0 COMPLETE.

**WHY THIS IS CRITICAL:**
  490 formulas cataloged but only hardcoded calcs used. FormulaRegistry.ts (28KB)
  exists but nothing queries it. The registry enables discovery ("what formulas
  apply to this problem?"), comparison ("Taylor vs extended Taylor?"), and chaining
  ("force → temperature → surface finish"). Without it, 105 INVENTION/NOVEL formulas
  and 162 zero-coverage formulas are dead assets.

```
Step 1: Wire FormulaRegistry.ts to calcDispatcher
  Add actions to calcDispatcher:
    formula_discover(problem_type, material, operation)
      → Ranked list of applicable formulas with confidence scores
      Example: "tool life prediction, Inconel 718"
      → [Extended Taylor (0.92), ML-predicted (0.75), basic Taylor (0.60)]

    formula_compare(formula_ids[], inputs)
      → Same inputs through multiple formulas, side-by-side results
      → Shows range, uncertainty, and which formula is most conservative

Step 2: Modify speed_feed_calc to query FormulaRegistry BEFORE computing:
  1. Discover applicable formulas for this material/operation
  2. Select highest-confidence formula
  3. If multiple high-confidence → run all, return range with uncertainty bounds

Step 3: Index the 105 INVENTION/NOVEL formulas
  For each: flag as implemented (engine exists) vs stub (formula only, no engine)
  Create FORMULA_IMPLEMENTATION_STATUS.json

Step 4: Wire the 162 formulas with zero roadmap coverage
  Categories: TRIBOLOGY(14), METROLOGY(15), COOLANT(15), TOOL_GEOMETRY(20),
    GEOMETRIC(15), SCHEDULING(17), DIGITAL_TWIN(15), SUSTAINABILITY(13),
    HYBRID(20), SIGNAL(18)
  For each: determine if an engine exists or needs creation in R7.

Step 5: Add formula_version_check hook
  Ensures formula registry stays consistent with engine implementations.

Step 6: Test
  formula_discover("tool_life", "4140", "milling") → returns ranked results
  formula_compare(["taylor_basic", "taylor_extended"], same_inputs) → side-by-side
  speed_feed_calc with registry lookup → produces range not single value

Step 7: SAFETY BASELINE VALIDATION (mandatory before R3-MS1):
  After formula_discover and formula_compare are operational:
  1. Run R2 50-calc matrix through formula_discover → verify it returns the SAME formulas
     that R2 used (no silent formula substitution)
  2. Run 5 representative calcs through formula_compare with Taylor vs Extended Taylor →
     verify results within R2 golden dataset tolerances
  3. If any calc CHANGES result vs R2 baseline → STOP. The formula registry is introducing
     different calculation paths. Debug before proceeding.
  This prevents the formula registry from silently changing which formula feeds safety calcs.
```

**EXIT:** Formula registry is live. Discovery returns relevant results for 10 test
  queries. Comparison produces valid side-by-side. speed_feed_calc uses registry.

---

## R3-MS1: Advanced Calculations

**Source:** Superpower Roadmap Phase 3, Steps 3.1-3.3
**Effort:** ~12 calls | **Tier:** DEEP
**Entry:** R3-MS0 COMPLETE.

```
=== WEAR PREDICTION ===
Effort: ~4 calls

Add action: wear_prediction to calcDispatcher

INPUT: { material: string, cutting_speed: number, feed_per_tooth: number,
         depth_of_cut: number, cutting_time_min: number }

CALCULATION:
  1. Get Taylor C, n from material registry (enriched in R1-MS6)
  2. Three-zone wear model:
     Zone I (break-in):   VB(t) = VB0 + k_breakin × sqrt(t)    for t < t_breakin
     Zone II (steady):    VB(t) = VB_breakin + k_steady × t      for t_breakin < t < t_accel
     Zone III (accelerated): VB(t) = VB_steady + k_accel × exp(t) for t > t_accel
     Constants derived from Taylor parameters and material class
  3. Calculate: current wear VB at input cutting_time_min
  4. Calculate: remaining useful life until VB = 0.3mm (ISO threshold)
  5. Generate warning if VB > 0.2mm (approaching threshold)

OUTPUT: { flank_wear_VB_mm: number, wear_zone: "break-in"|"steady"|"accelerated",
          remaining_life_min: number, threshold_mm: 0.3,
          recommendation: string, confidence: "high"|"medium"|"low" }

Test: wear_prediction { material: "4140", cutting_speed: 200, feed_per_tooth: 0.15,
                        depth_of_cut: 2, cutting_time_min: 30 }
EXPECTED: Steady-state wear zone, VB < 0.15mm, remaining life > 20 min

=== PROCESS COST ===
Effort: ~4 calls

Add action: process_cost to calcDispatcher

INPUT: { material: string, tool_diameter: number, total_stock: number,
         part_volume_cm3?: number, machine_rate_per_hr: number,
         tool_cost: number, setup_time_min: number, batch_size: number }

CHAIN:
  1. speed_feed_calc → get Vc, fz, rpm
  2. multi_pass → get pass strategy, per-pass time
  3. Cycle time = sum of all pass times + rapid moves + tool changes
  4. tool_life → how many parts per tool edge
  5. Cost rollup:
     machining_cost = cycle_time × machine_rate / 60
     tooling_cost = tool_cost / parts_per_edge
     setup_cost = setup_time_min × machine_rate / 60 / batch_size
     idle_cost = (tool_change_time × tool_changes) × machine_rate / 60
     total = machining + tooling + setup + idle

OUTPUT: { cost_per_part: number,
          breakdown: { machining: number, tooling: number, setup: number, idle: number },
          cycle_time_min: number, parts_per_tool_edge: number,
          batch_cost_total: number }

Test: process_cost { material: "4140", tool_diameter: 10, total_stock: 5,
                     machine_rate_per_hr: 85, tool_cost: 15, setup_time_min: 30, batch_size: 100 }
EXPECTED: Cost breakdown with machining as largest component

=== UNCERTAINTY CHAIN ===
Effort: ~4 calls

Add action: uncertainty_chain to calcDispatcher
REQUIRES: Material enrichment (R1-MS6) — statistics.standardDeviation field

INPUT: { material: string, tool_diameter: number, operation: string }

CALCULATION: Propagate uncertainty through the entire calculation chain:
  1. Material uncertainty:
     kc1_1 ± σ_kc (from material.statistics.standardDeviation if available, else ±10%)
     Taylor C ± σ_C, n ± σ_n (from material statistics)
  2. Tool uncertainty:
     diameter ± manufacturing tolerance (ISO h6 = ±0.006mm for 10mm)
     runout contribution (typically ±0.005mm)
  3. Force uncertainty:
     Fc = kc1_1 × b × h^(1-mc) → propagate kc1_1 and h uncertainties
     σ_Fc = Fc × sqrt((σ_kc/kc1_1)² + ((1-mc)×σ_h/h)²)
  4. Power uncertainty:
     Pc = Fc × Vc / (60000 × η)
     σ_Pc = Pc × sqrt((σ_Fc/Fc)² + (σ_Vc/Vc)²)
  5. Tool life uncertainty:
     T = C × Vc^(-1/n) → logarithmic propagation
     σ_T = T × sqrt((σ_C/C)² + (ln(Vc)/n² × σ_n)²)
  6. Cost uncertainty:
     Propagate tool life uncertainty into cost per part

OUTPUT: { parameters: { Vc, fz, ap, Fc, Pc, T, cost },
          confidence_intervals: {
            ci_90: { Vc: [low, high], Fc: [low, high], T: [low, high], cost: [low, high] },
            ci_95: { Vc: [low, high], Fc: [low, high], T: [low, high], cost: [low, high] }
          },
          dominant_uncertainty_source: string,
          data_quality: { has_statistics: boolean, assumed_uncertainties: string[] } }

Test: uncertainty_chain { material: "4140", tool_diameter: 10, operation: "milling" }
EXPECTED: Confidence intervals with tool life having widest range (Taylor is notoriously imprecise)

EXIT: Three new high-level calculation actions operational.
```

---

## R3-MS2: Toolpath Intelligence

**Source:** Superpower Roadmap Phase 4 + Database Audit GAP 6
**Effort:** ~8 calls | **Tier:** DEEP
**Entry:** R3-MS1 COMPLETE (or can run PARALLEL with MS1 — independent feature).

```
=== VALIDATE STRATEGY RECOMMENDATIONS ===
Effort: ~4 calls

The strategy_for_job and strategy_compare actions were WIRED in R1-MS8.
This MS VALIDATES they return correct recommendations for real-world scenarios.

TEST 1: strategy_for_job { feature: "pocket", material: "Inconel 718", machine_axes: 3 }
VERIFY: Trochoidal or HEM recommended (NOT conventional — wrong for superalloys)
VERIFY: Cutting param presets match R2-validated values for Inconel 718
VERIFY: Reasoning explains WHY (heat management, tool engagement angle)

TEST 2: strategy_for_job { feature: "slot", material: "6061-T6", tool_diameter: 12 }
VERIFY: Helical ramp entry recommended (NOT plunge — endmill not designed for plunge)
VERIFY: High Vc preset for aluminum, appropriate ae/ap for slotting

TEST 3: strategy_for_job { feature: "contour_5axis", material: "Ti-6Al-4V" }
VERIFY: Ball-nose recommended for 5-axis. Low Vc. Swarf/flank milling options.
VERIFY: Strategy accounts for tool tilt angle and effective cutting diameter

TEST 4: strategy_compare { strategy_a: "trochoidal", strategy_b: "conventional",
                           feature: "slot", material: "Inconel 718" }
VERIFY: Trochoidal clearly wins on tool life. Conventional wins on simplicity.
VERIFY: MRR comparison is realistic. Surface finish comparison is realistic.

=== NOVEL STRATEGIES ===
Effort: ~2 calls

Test: novel_strategies {}
VERIFY: Returns PRISM-original strategies not in standard CAM software
VERIFY: Each strategy has use_case, advantages, and specific parameter recommendations
These are competitive differentiators — the kind of knowledge master machinists have

=== STRATEGY INTEGRATION WITH JOB_PLAN ===
Effort: ~2 calls

Verify that job_plan incorporates toolpath strategy recommendations:
  job_plan { material: "Inconel 718", operation: "milling", total_stock: 5 }
  VERIFY: Job plan includes toolpath recommendation section
  VERIFY: If pocket feature detected from geometry → strategy recommendation included

EXIT: 697 strategies fully validated, queryable by feature/material/machine.
  strategy_for_job returns correct recommendations for representative scenarios.
```

---

## R3-MS3: Cross-System Intelligence

**Source:** Superpower Roadmap Phase 5 + Database Audit GAP 10
**Effort:** ~12 calls | **Tier:** DEEP
**Entry:** R3-MS0 COMPLETE (job_plan exists as foundation for cross-system queries).

```
=== MATERIAL SUBSTITUTE ===
Effort: ~3 calls

Add action: material_substitute to dataDispatcher

INPUT: { material: string, reason: "cost" | "availability" | "machinability" | "performance" }

LOGIC:
  1. Get source material: iso_group, hardness, tensile, machinability_rating, composition
  2. Find candidates in same ISO group (or adjacent group):
     If reason="machinability": sort by machinability_rating DESC, filter hardness ± 20%
     If reason="cost": sort by material_cost_index (if available), filter mechanical ± 15%
     If reason="availability": prefer common alloys (4140, 1045, 6061), filter mechanical ± 15%
     If reason="performance": filter by higher tensile/hardness, sort by machinability
  3. For each candidate: calculate machinability improvement %
  4. Return top 3 with property comparison table
REQUIRES: Material enrichment (R1-MS6) for composition and mechanical property comparison

OUTPUT: { source_material, reason, substitutes: [{
            name, iso_group, machinability_improvement_pct,
            properties: { hardness, tensile, density, composition_similarity_pct },
            trade_offs: string[], recommended_param_adjustments: string
          }] }

Test: material_substitute { material: "Inconel 718", reason: "machinability" }
EXPECTED: Inconel 625 or Waspaloy as options with machinability comparison

Test: material_substitute { material: "Ti-6Al-4V", reason: "cost" }
EXPECTED: Ti-6Al-2Sn-4Zr-2Mo or grade 5 variants, with cost reasoning

=== MACHINE RECOMMEND ===
Effort: ~3 calls

Add action: machine_recommend to dataDispatcher

INPUT: { material: string, operation: string,
         part_envelope?: { x: number, y: number, z: number },
         required_axes?: number }

LOGIC:
  1. Estimate cutting force for material+operation (quick Kienzle estimate)
  2. Calculate required spindle power (Pc = Fc × Vc / 60000 / η)
  3. Filter machines from registry:
     - work_envelope >= part_envelope (all three axes)
     - spindle.power_kw >= required_power × 1.2 (20% margin)
     - spindle.max_rpm >= required_rpm
     - axes >= required_axes
     - type matches operation (VMC for milling, lathe for turning, 5-axis if required)
  4. Rank by suitability:
     Score = (power_margin × 0.3) + (rigidity_estimate × 0.3) + (spindle_speed_margin × 0.2) + (availability_score × 0.2)
  5. Return top 5 with reasoning
REQUIRES: Machine population (R1-MS7) for power/envelope data to filter on

OUTPUT: { material, operation, requirements: { power_kw, rpm, envelope },
          recommendations: [{ machine_name, manufacturer, score,
            power_margin_pct, speed_margin_pct, envelope_fit,
            reasoning: string }] }

Test: machine_recommend { material: "Ti-6Al-4V", operation: "5axis_milling",
                          part_envelope: { x: 300, y: 200, z: 150 } }
EXPECTED: DMU 50, Hermle C 42 U, or similar 5-axis machines with sufficient power for Ti

=== CONTROLLER OPTIMIZE ===
Effort: ~3 calls

Add action: controller_optimize to calcDispatcher

INPUT: { controller: string, operation: string, params: { Vc, fz, ap, ae } }

LOGIC:
  1. Identify controller family from name (Fanuc 0i → "fanuc", Siemens 840D → "siemens", etc.)
  2. Look up controller-specific optimization features:
     Fanuc: AICC (AI contour control), G05.1 (high-speed smoothing), nano smoothing
     Siemens: CYCLE832 (HSC settings), COMPCAD, FFWON (feed forward)
     Haas: G187 P1/P2/P3 (smoothness levels), G154 work offsets
     Mazak: High-speed machining mode, SFC (super feed control)
     Okuma: NURBS interpolation, Super-NURBS, Machining Navi
  3. Generate optimized G-code with controller-specific features enabled
  4. Include tolerance vs speed tradeoffs:
     Roughing: looser tolerance, higher feed, less smoothing
     Finishing: tighter tolerance, more smoothing, potentially NURBS
  5. Controller-specific M-codes: spindle orientation, coolant modes, probing

OUTPUT: { controller, optimizations_applied: string[], gcode_additions: string,
          performance_impact: { speed_improvement_pct, finish_improvement_pct },
          notes: string[] }

Test: controller_optimize { controller: "fanuc", operation: "milling",
                            params: { Vc: 150, fz: 0.1, ap: 2, ae: 8 } }
EXPECTED: G05.1 Q1 recommended for finishing, AICC for contouring

=== WHAT-IF ANALYSIS ===
Effort: ~3 calls

Add action: what_if to dataDispatcher

INPUT: { base_job: { material: string, operation: string, tool_diameter?: number, machine?: string },
         change: { parameter: string, from: number, to: number } }

LOGIC:
  1. Run job_plan with original parameters → baseline results
  2. Run job_plan with changed parameter → modified results
  3. Diff: tool_life change, power change, cost change, safety change, MRR change
  4. Generate natural-language impact summary

OUTPUT: { baseline: { Vc, fz, tool_life, power_pct, cost_per_part, safety_score },
          modified: { Vc, fz, tool_life, power_pct, cost_per_part, safety_score },
          impact: {
            tool_life_change_pct: number,
            power_change_pct: number,
            cost_change_pct: number,
            safety_change: number,
            mrr_change_pct: number
          },
          summary: string,   // "Increasing Vc from 150 to 200: tool life drops 40%, MRR up 33%..."
          recommendation: string  // "The trade-off favors..." or "Not recommended because..."
        }

Test: what_if { base_job: { material: "4140", operation: "milling" },
                change: { parameter: "cutting_speed", from: 200, to: 250 } }
EXPECTED: Tool life drops significantly (Taylor exponential sensitivity), MRR increases,
  power increases, safety score may decrease, cost impact depends on tool life vs productivity

EXIT: Cross-registry intelligence queries operational. PRISM answers questions
  that span materials, machines, tools, strategies, and controllers in a single action call.
```

=== CONTROLLER INTELLIGENCE EXPANSION (v14.2 — Gap 9) ===
Effort: ~8 calls
Source: SYSTEMS_ARCHITECTURE_AUDIT.md Finding 9

Existing: alarm_decode, alarm_diagnose, alarm_fix (10,033 codes, 100% loaded).
Missing: Pattern analysis, G-code validation, capability queries.

NEW ACTIONS:

1. alarm_pattern(machine, alarm_history[])
   Input: machine identifier + array of recent alarms with timestamps
   Output: Root cause analysis from alarm sequences
   Logic: Known patterns database:
     - [5073, 5074, 5075] in sequence → probable failing encoder
     - Chatter alarms only at >12,000 RPM with specific tools → spindle overload
     - Thermal alarms after 2hr cycles → insufficient warm-up
     - Repeated Z-axis alarms → ballscrew compensation drift
   Correlation: alarm sequence → probable root cause → recommended fix → prevention

2. controller_validate(controller_type, gcode_block)
   Input: controller family (FANUC, Siemens, Haas, Okuma, etc.) + G-code lines
   Output: Validation report (valid/warnings/errors per line)
   Checks: Modal group conflicts, unsupported G/M codes, syntax errors,
           parameter range violations, FANUC ≠ Siemens ≠ Haas dialect differences
   Wire: CONTROLLER_DATABASE.json for per-family syntax rules

3. controller_capabilities(machine)
   Input: machine identifier or controller type
   Output: Capability flags from CONTROLLER_DATABASE.json
   Answers: "Can my Haas VF-2 do rigid tapping?" → yes, G84 supported
            "Does my FANUC support NURBS?" → check specific model
            "What's the max ATC capacity?" → from machine specs

4. Knowledge query expansion:
   Expand cross_query to also search:
     - Skill content (SKILL.md files → index on boot)
     - Formula registry (match by category + inputs)
     - Engine registry (match by physics domain)
     - Job history (once R7-MS3 builds it)
   Results ranked by relevance with source attribution.

---

## R3-MS4: Data Enrichment Campaigns + Workholding + Alarms
⚡ CLAUDE CODE: Batch validation campaigns (350 batches × 50 calcs) are inherently parallelizable.
  Run multiple Claude Code agents processing different material groups simultaneously.
  Each agent: independent batch → write CAMPAIGN_STATE.json → merge results.

**Source:** Original R3 data campaigns (v13.9) + Database Audit GAPs 5, 8
**Effort:** ~20 calls | **Tier:** DEEP
**Entry:** R3-MS3 COMPLETE.

```
=== BATCH VALIDATION CAMPAIGNS ===
Effort: ~10 calls

Run speed_feed_calc across the full material library in batches of 10.
  10 materials × 5 operations = 50 calcs per batch.
  ~350 batches for full 3,500 material coverage.
  Target: >90% produce valid S(x) >= 0.70 results.

BATCH EXECUTION:
  prism_orchestrate action=swarm_execute pattern="parallel_batch"
    tasks=["speed_feed [material_1] turning", "speed_feed [material_1] milling", ...]
  → Sort results by material+operation before flush (ORDERING RULE).
  → Flush: prism_doc action=append name=R3_BATCH_[N]_RESULTS.md
  → MANDATORY CONTENT VERIFY: prism_doc action=read name=R3_BATCH_[N]_RESULTS.md → verify tail.
  RATE LIMIT: Use p-queue with intervalCap matching API tier limits.

CAMPAIGN STATE (write after EACH batch — DC-3):
  prism_doc action=write name=R3_CAMPAIGN_STATE.json
  content='{ "campaign_id": "[id]", "total_batches": N,
             "completed_batch_ids": ["batch_1","batch_2",...],
             "current_batch": N, "error_count": N,
             "quarantined_materials": [...], "last_update": "[ISO]" }'
  NOTE: Use completed_batch_ids ARRAY, not count (prevents write-race data loss).

QUARANTINE: Materials that fail >2 operations → quarantine. Investigate:
  Bad kc1_1 data? Missing Taylor constants? Unreasonable physical properties?
  Fix data → re-run quarantined materials → verify.

=== PFP CALIBRATION ===
Effort: ~3 calls

Calibrate Predictive Failure Prevention against R2 baselines:
  prism_pfp action=analyze target="4140 turning 1000hr" [effort=max]
  Compare PFP prediction against R2 safety baseline for 4140 turning.
  Record delta: prism_doc action=append name=R3_PFP_CALIBRATION.md

Run for 5 representative materials (4140, 316SS, Inconel 718, 6061-T6, Ti-6Al-4V).
Each at 3 machine-hour milestones (100hr, 500hr, 1000hr).
Compare PFP predictions against R2 validated baselines.

=== WORKHOLDING DATA (Database Audit GAP 8) ===
Effort: ~3 calls

Create data/workholding/WORKHOLDING.json:
  The WorkholdingEngine has 1,409 lines of physics (clamp force, pullout, liftoff, deflection)
  but ZERO data files. The safety engines tested in R2-MS1 used hardcoded test values.
  This MS creates the REAL fixture database so workholding validation uses actual specs.

  VISES:
    Kurt DL640: max_force=40000N, jaw_width=152mm, opening=165mm, weight=38.5kg, repeatability=0.013mm
    Kurt DL430: max_force=26700N, jaw_width=102mm, opening=114mm
    5th Axis RWP: max_force=35600N, jaw_width=152mm, dovetail=true
    Toolex C6: max_force=44500N, jaw_width=152mm
    Lang Makro-Grip: max_force=25000N, jaw_width=77mm, 5-axis_access=true

  CHUCKS (3-jaw):
    Kitagawa B-200: max_force=54000N, diameter=200mm, speed_max=5000rpm
    Kitagawa B-210: max_force=89000N, diameter=210mm, speed_max=4500rpm
    Samchully SHC: max_force=78000N, diameter=254mm, speed_max=3500rpm

  COLLET SYSTEMS:
    ER32: max_force=3500N, range=2-20mm, concentricity=0.005mm
    ER40: max_force=5000N, range=3-26mm, concentricity=0.005mm
    5C: max_force=6700N, range=1/16"-1-1/16", concentricity=0.0005"

  CRITICAL: USE REAL MANUFACTURER SPECS. These are SAFETY-CRITICAL values.
  Wrong clamp force → part ejection during cutting → operator injury.

=== ALARM PROCEDURE ENRICHMENT (Database Audit GAP 5) ===
Effort: ~4 calls

Enrich fix procedures for the top 50 most common alarms:
  1. Read current ALARM_FIX_PROCEDURES.json → identify thin single-line descriptions
  2. For each of the top 50 alarms (by frequency of machinist queries):
     Expand fix procedure from 1 line to structured multi-step:
     {
       "steps": ["1. Power cycle machine", "2. Check [specific component]", "3. ..."],
       "safety_notes": ["Ensure spindle is stopped before...", "Lock out power before..."],
       "severity": "WARNING" | "ERROR" | "CRITICAL",
       "typical_cause": "string",
       "estimated_downtime_min": number,
       "requires_service_tech": boolean
     }
  3. Standardize severity across controller families:
     Map all controller-specific severity labels to 4-level standard: INFO/WARNING/ERROR/CRITICAL

EXIT: Full material library validated. Workholding data created. Alarm procedures enriched.
```

---

## R3-MS5: Phase Gate

**Effort:** ~10 calls | **Tier:** RELEASE
**Entry:** R3-MS4 COMPLETE.

```
=== GATE CRITERIA (ALL must pass) ===

INTELLIGENCE FEATURES:
□ job_plan produces accurate plans for 5 representative material/machine combos
□ setup_sheet formats correctly from job_plan output
□ wear_prediction returns plausible wear curves for 3 materials
□ process_cost returns cost breakdown with all components
□ uncertainty_chain returns confidence intervals for 3 materials
□ strategy_for_job recommends appropriate strategies for 3 feature/material combos
□ strategy_compare produces meaningful side-by-side comparison
□ material_substitute finds appropriate alternatives for 3 materials
□ machine_recommend filters and ranks machines for 2 material/operation combos
□ controller_optimize generates controller-specific optimizations for 3 controllers
□ what_if produces accurate delta analysis for 2 parameter changes

DATA CAMPAIGNS:
□ >90% of material library has validated speed_feed results
□ PFP calibrated against R2 baselines for 5 materials
□ Quarantined materials investigated and documented

DATA ENRICHMENT:
□ Workholding data file exists with real fixture specs
□ Top 50 alarm fix procedures enriched to multi-step
□ Alarm severity standardized across controller families

REGRESSION:
□ All R2 safety tests still pass (safetyMatrix.test.ts, edgeCases.test.ts, safetyEngines.test.ts)
□ No R2 regressions — run full R2 test suite

QUALITY:
□ Ralph >= A- for R3
□ Omega >= 0.70
□ Build clean, no warnings
□ Test suite: intelligenceFeatures.test.ts + batchCalcs.test.ts added

=== DOCUMENTATION ===

□ PHASE_FINDINGS.md (R3 section): Intelligence feature results, campaign stats, limitations
□ ROADMAP_TRACKER.md: "R3-MS5 COMPLETE [date] — PHASE R3 COMPLETE"
□ CURRENT_POSITION.md: "CURRENT: R4-MS0 | LAST_COMPLETE: R3-MS5 | PHASE: R4 not-started"
□ PRISM_MASTER_INDEX.md: R3 status → "complete"

EXIT: PHASE R3 COMPLETE. PRISM has validated engines AND intelligence features.
  Data utilization exceeds 90% of on-disk assets. R4-R6 can proceed.
```

---

## OPUS 4.6 PATTERNS FOR R3

```
PARALLEL BATCHES: 10 materials/batch via prism_orchestrate action=swarm_execute pattern="parallel_batch"
  Each material runs 5 operations concurrently. Results flushed per batch.
  SORT results by material+operation before flush (ORDERING RULE from §Parallel Execution).
  RATE LIMIT: Use p-queue with intervalCap matching API tier limits (see §Code Standards §Rate Limiting).
  50+ calcs at effort=max WILL hit Anthropic rate limits without throttling.

AGENT TEAMS FOR INTELLIGENCE: MS0-MS3 build independent features that can use agent_execute
  for complex composition logic (job_plan chains 8 engine calls internally).

PFP AT MAX EFFORT: prism_pfp action=analyze (effort=max)
  Opus 4.6 OpenRCA: 34.9% (vs 26.9% Opus 4.5) — 30% better failure diagnosis.
  Feed richer context: machine hours, vibration patterns, historical failures.
  Cross-reference PFP predictions against R2 safety baselines for confidence calibration.

FAST MODE FOR DIAGNOSTICS: Batch status checks, progress reporting, health monitoring
  Use speed: "fast" for LOW effort operations during campaign execution.
  Reduces wall-clock time ~30% on admin overhead.

1M CONTEXT OPTION: For batch sessions processing >100 materials per session.
  Eliminates session splitting. Full batch results in working memory for cross-validation.
  Use when: batch size × avg result size > 100K tokens.

CONTEXT EDITING: Clear tool results from completed batches before starting next batch.
  Supplements flush-to-file. Keeps working memory clean across batch boundaries.
```

---

## ATCS TRACKING (task management across R3 sessions)

```
R3 spans 4-5 sessions. ATCS provides cross-session continuity.

CAMPAIGN START (first R3 session):
  prism_atcs action=task_list  [effort=low]  → check no duplicate campaign task exists
  prism_atcs action=task_init title="R3 Intelligence + Campaigns" priority="high"  [effort=medium]
  → Returns task_id. Record it in CURRENT_POSITION.md.

MS COMPLETE (after each MS):
  prism_atcs action=task_update task_id="[id]" status="MS[N]_complete"  [effort=low]

SESSION RESUME (subsequent R3 sessions):
  prism_atcs action=task_list  [effort=low]  → find task → read status → determine position.

  ORPHANED TASK HANDLING (if session crashed between task_init and task_complete):
    If task_list returns >1 task with title containing "R3":
      Compare created_at timestamps. Keep the NEWEST. Note others for cleanup.
    If task status is stale (last update >24h ago):
      Read R3_CAMPAIGN_STATE.json for ground truth on actual batch progress.
    If CAMPAIGN_STATE.json and ATCS task disagree on batch number:
      Trust CAMPAIGN_STATE.json (written after each batch, more granular than ATCS).

CAMPAIGN END:
  prism_atcs action=task_complete task_id="[id]"  [effort=low]
```

---

## R3 COMPANION ASSETS (v14.2 — build AFTER R3-MS5 gate passes)

```
HOOKS (3 new):
  unit_consistency_check     — blocking, pre-calc, detects mixed units in same request.
                               E.g., speed in m/min but feed in IPR → BLOCK + suggest conversion.
  formula_registry_consistency — warning, post-load, verifies all formulas have engine
                                 implementations. Flags stubs for R7 implementation.
  wiring_registry_check      — warning, pre-implementation, reminds to check D2F/F2E/E2S
                               before writing new action code. References wiring protocol.

SCRIPTS (2 new):
  job_plan_demo              — Runs 5 sample job plans end-to-end with formatted output.
                               Materials: 4140, 6061, 304SS, Ti-6Al-4V, Inconel 718.
                               Shows complete plan including units and tolerance budget.
  formula_coverage_audit     — Counts formulas with implementations vs stubs per category.
                               Shows: implemented, stub, dead per FORMULA_REGISTRY category.

SKILLS (3 new):
  prism-tolerance-advisor    — Teaches Claude tolerance analysis, stack-up calculation,
                               and how to recommend pass sequences for tight tolerances.
  prism-controller-expert    — Teaches Claude alarm diagnosis per controller family,
                               G-code validation rules, and controller capability queries.
  prism-formula-navigator    — Teaches Claude to discover, compare, and explain all 490+
                               registered formulas. Maps formula to use case.
```
