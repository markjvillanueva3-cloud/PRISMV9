# PRISM Superpower Implementation Roadmap
# Comprehensive step-by-step with exact code paths, params, and test cases
# Generated: 2026-02-15

## PHASE 1: Safety Engine Activation (prism_safety — 29 actions)
## Status: Dispatcher wired, param normalization added, needs testing + fixes

### STEP 1.1: Fix predict_tool_breakage
**File:** C:\PRISM\mcp-server\src\tools\toolBreakageTools.ts
**Engine:** C:\PRISM\mcp-server\src\engines\ToolBreakageEngine.ts (1072 lines)
**Problem:** toolMaterial enum case sensitivity — FIXED in safetyDispatcher normalization
**Test Command:**
```
prism_safety → predict_tool_breakage
{
  "tool": {"diameter": 10, "shankDiameter": 10, "fluteLength": 22, "overallLength": 72, "stickout": 40, "numberOfFlutes": 4},
  "forces": {"Fc": 445, "Ff": 178, "Fp": 134},
  "conditions": {"feedPerTooth": 0.1, "axialDepth": 3, "radialDepth": 6, "cuttingSpeed": 150, "spindleSpeed": 4775},
  "toolMaterial": "carbide"
}
```
**Expected:** breakage probability %, risk level (LOW/MEDIUM/HIGH/CRITICAL), recommendations
**If Fails:** Check ToolBreakageEngine.predictBreakage() — it calls calculateStress, calculateDeflection, checkChipLoad, estimateFatigue internally. Each may have its own param requirements. Debug each sub-function.

### STEP 1.2: Fix calculate_tool_stress
**File:** C:\PRISM\mcp-server\src\tools\toolBreakageTools.ts line ~380
**Test:**
```
prism_safety → calculate_tool_stress
{
  "tool": {"diameter": 6, "shankDiameter": 6, "fluteLength": 15, "stickout": 30},
  "forces": {"Fc": 300, "Ff": 120, "Fp": 90},
  "toolMaterial": "carbide"
}
```
**Expected:** bending stress, torsional stress, von Mises stress, safety factor
**Handler defaults (line ~380):** fluteLength defaults to diameter*2, overallLength to stickout*1.5, numberOfFlutes to 4, coreRatio auto-set

### STEP 1.3: Fix check_chip_load_limits
**File:** C:\PRISM\mcp-server\src\tools\toolBreakageTools.ts
**Test:**
```
prism_safety → check_chip_load_limits
{
  "tool": {"diameter": 10, "numberOfFlutes": 4},
  "conditions": {"feedPerTooth": 0.15, "axialDepth": 5, "radialDepth": 5},
  "toolMaterial": "carbide",
  "workpieceMaterial": "STEEL"
}
```
**Expected:** actual chip load, max recommended, safety margin, pass/fail

### STEP 1.4: Fix estimate_tool_fatigue
**Test:**
```
prism_safety → estimate_tool_fatigue
{
  "tool": {"diameter": 10, "shankDiameter": 10, "fluteLength": 22, "overallLength": 72, "stickout": 40, "numberOfFlutes": 4},
  "forces": {"Fc": 445, "Ff": 178, "Fp": 134},
  "toolMaterial": "carbide",
  "cyclesAccumulated": 50000,
  "isInterrupted": true
}
```
**Expected:** fatigue damage ratio, remaining life cycles, Miner's rule accumulation

### STEP 1.5: Fix get_safe_cutting_limits
**Test:**
```
prism_safety → get_safe_cutting_limits
{
  "tool": {"diameter": 10, "shankDiameter": 10, "fluteLength": 22, "stickout": 40},
  "toolMaterial": "carbide",
  "workpieceMaterial": "STEEL",
  "operationType": "ROUGHING"
}
```
**Expected:** max ap, max ae, max fz, max Vc, max force before breakage

### STEP 1.6: Test Workholding Actions (5 actions)
**File:** C:\PRISM\mcp-server\src\tools\workholdingTools.ts
**Engine:** C:\PRISM\mcp-server\src\engines\WorkholdingEngine.ts (1410 lines)

#### 1.6a: calculate_clamp_force_required
```
prism_safety → calculate_clamp_force_required
{
  "cuttingForces": {"Fc": 1000, "Ff": 400, "Fp": 300},
  "workpiece": {"material": "steel", "weight": 5, "dimensions": {"length": 100, "width": 50, "height": 30}},
  "clampType": "vise",
  "frictionCoefficient": 0.3,
  "safetyFactor": 2.5
}
```
**Expected:** required clamp force N, actual safety margin, pass/fail
**If param mismatch:** Check handleCalculateClampForce() in workholdingTools.ts for exact param names

#### 1.6b: validate_workholding_setup
```
prism_safety → validate_workholding_setup
{
  "workholding": {"type": "vise", "jawWidth": 100, "maxForce": 20000},
  "workpiece": {"material": "aluminum", "dimensions": {"length": 150, "width": 80, "height": 40}},
  "operations": [{"type": "milling", "forces": {"Fc": 500, "Ff": 200, "Fp": 150}}]
}
```

#### 1.6c: check_pullout_resistance
```
prism_safety → check_pullout_resistance
{
  "cuttingForces": {"Fc": 800, "Fp": 240},
  "clampForce": 15000,
  "frictionCoefficient": 0.25,
  "direction": "axial"
}
```

#### 1.6d: analyze_liftoff_moment
```
prism_safety → analyze_liftoff_moment
{
  "cuttingForces": {"Fc": 1000, "Ff": 400, "Fp": 300},
  "workpiece": {"weight": 3, "cog": {"x": 50, "y": 25, "z": 15}},
  "clamps": [{"position": {"x": 10, "y": 25}, "force": 5000}, {"position": {"x": 90, "y": 25}, "force": 5000}],
  "cuttingPoint": {"x": 50, "y": 25, "z": 30}
}
```

#### 1.6e: calculate_part_deflection
```
prism_safety → calculate_part_deflection
{
  "workpiece": {"material": "aluminum", "dimensions": {"length": 200, "width": 30, "height": 10}, "elasticModulus": 70},
  "supports": [{"position": 0}, {"position": 200}],
  "cuttingForce": 500,
  "forcePosition": 100
}
```

### STEP 1.7: Test Spindle Protection Actions (5 actions)
**File:** C:\PRISM\mcp-server\src\tools\spindleProtectionTools.ts
**Engine:** C:\PRISM\mcp-server\src\engines\SpindleProtectionEngine.ts (902 lines)

#### 1.7a: check_spindle_torque
```
prism_safety → check_spindle_torque
{
  "spindleSpec": {"maxTorque": 120, "maxPower": 22, "maxRPM": 12000},
  "cuttingRequirements": {"torque": 85, "rpm": 3000}
}
```

#### 1.7b: check_spindle_power
```
prism_safety → check_spindle_power
{
  "spindleSpec": {"maxPower": 22, "powerCurve": "constant_torque_to_base_then_constant_power"},
  "cuttingRequirements": {"power": 15, "rpm": 5000}
}
```

#### 1.7c: validate_spindle_speed
```
prism_safety → validate_spindle_speed
{
  "spindleSpec": {"maxRPM": 12000, "minRPM": 50, "bearingType": "ceramic"},
  "requestedRPM": 15000
}
```

#### 1.7d: get_spindle_safe_envelope
```
prism_safety → get_spindle_safe_envelope
{
  "spindleSpec": {"maxTorque": 120, "maxPower": 22, "maxRPM": 12000, "bearingType": "angular_contact"},
  "toolWeight": 2.5,
  "overhang": 150
}
```

### STEP 1.8: Test Coolant Validation Actions (5 actions)
**File:** C:\PRISM\mcp-server\src\tools\coolantValidationTools.ts
**Engine:** C:\PRISM\mcp-server\src\engines\CoolantValidationEngine.ts (753 lines)

#### 1.8a: validate_coolant_flow
```
prism_safety → validate_coolant_flow
{
  "coolantSystem": {"type": "flood", "flowRate": 20, "pressure": 30, "concentration": 8},
  "operation": {"type": "drilling", "depth": 50, "diameter": 10},
  "material": "stainless"
}
```

#### 1.8b: check_through_spindle_coolant
```
prism_safety → check_through_spindle_coolant
{
  "coolantSystem": {"type": "through_spindle", "pressure": 70, "flowRate": 15},
  "tool": {"diameter": 8, "coolantHoles": 2, "holeDiameter": 1.5},
  "operation": {"type": "deep_drilling", "depth": 80}
}
```

### STEP 1.9: Test Collision Actions (8 actions)
**File:** C:\PRISM\mcp-server\src\tools\collisionTools.ts
**Engine:** C:\PRISM\mcp-server\src\engines\CollisionEngine.ts (1924 lines)
**Note:** These are the most complex. The collision engine uses 3D geometry (AABB, OBB, cylinders, capsules, swept volumes). Params will be very specific.

#### 1.9a: check_fixture_clearance
```
prism_safety → check_fixture_clearance
{
  "tool": {"diameter": 16, "holderDiameter": 40, "stickout": 60},
  "fixture": {"type": "vise", "jawHeight": 40, "jawWidth": 100},
  "workpiece": {"height": 30},
  "approach": {"x": 50, "y": 0, "z": 5}
}
```

---

## PHASE 2: Full Job Planner (new prism_data action)
## Single query → complete manufacturing process plan

### STEP 2.1: Add job_plan action to dataDispatcher
**File:** C:\PRISM\mcp-server\src\tools\dispatchers\dataDispatcher.ts
**Location:** After tool_compare case, before default

**Input params:**
```
{
  "material": "4140",           // material name or ID
  "operation": "milling",       // operation type
  "tool_diameter": 12,          // desired tool size
  "total_stock": 10,            // mm to remove
  "machine": "VF-2",           // machine name or ID (optional)
  "target_Ra": 1.6,            // target surface finish μm (optional)
  "workpiece": {               // optional
    "length": 100,
    "width": 50,
    "height": 30
  }
}
```

**Implementation chain (each step feeds the next):**
1. `registryManager.materials.getByIdOrName(material)` → get material data
2. `registryManager.tools.recommendTools({iso_group, operation, diameter})` → get top 3 tools
3. For best tool, calculate: Vc, fz, rpm, feed_rate from cutting_recommendations
4. `calculateChipThinning()` if ae < 50% diameter
5. `calculateMultiPassStrategy()` with total_stock
6. `recommendCoolantStrategy()` from iso_group
7. If machine provided: `registryManager.machines.getByIdOrModel()` → power/RPM limits
8. Safety checks: power utilization, tool life, breakage risk
9. `generateGCodeSnippet()` for the controller type

**Output structure:**
```typescript
result = {
  material: { name, iso_group, hardness, machinability },
  recommended_tool: { name, vendor, diameter, flutes, coating, cutting_params },
  cutting_parameters: {
    roughing: { Vc, rpm, fz, vf, ap, ae, mrr },
    finishing: { Vc, rpm, fz, vf, ap, ae, mrr }
  },
  multi_pass_strategy: { phases: [...], total_passes },
  chip_thinning: { compensation_factor, compensated_fz } | null,
  coolant: { strategy, pressure, reasoning },
  machine_check: { power_ok, rpm_ok, warnings } | null,
  safety: { breakage_risk, tool_life_min, power_pct, warnings },
  gcode_snippet: { controller, code, notes },
  estimated_cycle_time: { roughing_min, finishing_min, total_min }
};
```

**Test:**
```
prism_data → job_plan
{
  "material": "Inconel 718",
  "operation": "milling", 
  "tool_diameter": 10,
  "total_stock": 5,
  "machine": "DMU 50",
  "target_Ra": 0.8
}
```
**Expected:** Complete plan with 21-33 m/min Vc, HP coolant, 3-pass strategy, short tool life warning, Siemens G-code

### STEP 2.2: Add setup_sheet action to dataDispatcher
**Input:**
```
{
  "material": "4140",
  "operation": "milling",
  "tool_diameter": 12,
  "machine": "VF-2",
  "part_number": "P-001",
  "operator_notes": "Clamp on left side only"
}
```
**Output:** Formatted setup sheet text with all parameters, tool list, safety notes

---

## PHASE 3: Calc Engine Advanced Features (prism_calc new actions)

### STEP 3.1: Add wear_prediction action
**File:** C:\PRISM\mcp-server\src\tools\dispatchers\calcDispatcher.ts
**New action:** "wear_prediction"
**Uses:** Taylor coefficients + material wear pattern from registry

**Input:**
```
{
  "material": "316L",
  "cutting_speed": 120,
  "feed_per_tooth": 0.08,
  "depth_of_cut": 2,
  "cutting_time_min": 30
}
```
**Calculation:**
1. Get Taylor C, n from material
2. Calculate VB (flank wear) = f(Vc, t, material_wear_pattern)
3. VB model: VB(t) = VB0 + k1*t + k2*t^n_wear (three-zone wear model)
4. Predict remaining useful life
5. Warn at VB > 0.3mm (ISO threshold)

**Output:**
```
{
  flank_wear_VB_mm: 0.18,
  wear_zone: "steady_state", // initial/steady_state/accelerated
  remaining_life_min: 12,
  vb_limit_mm: 0.3,
  wear_rate_mm_per_min: 0.006,
  recommendation: "Tool has ~12 min remaining. Consider tool change after next part."
}
```

### STEP 3.2: Add process_cost action  
**Input:**
```
{
  "material": "4140",
  "tool_diameter": 12,
  "total_stock": 10,
  "part_volume_cm3": 50,
  "machine_rate_per_hr": 85,
  "tool_cost": 125,
  "setup_time_min": 15,
  "batch_size": 50
}
```
**Calculation:**
1. speed_feed_calc → get optimal params
2. multi_pass → get passes and MRR
3. cycle_time from volume/MRR + non-cutting time
4. tool_life → tools consumed per batch
5. Cost = (machine_time × rate) + (tools × cost) + (setup / batch_size)

**Output:**
```
{
  cost_per_part: 12.47,
  breakdown: {
    machining_cost: 8.50,
    tool_cost: 2.50,
    setup_cost: 0.25,
    idle_cost: 1.22
  },
  cycle_time_min: 6.0,
  tools_per_batch: 1.5,
  batch_cost_total: 623.50
}
```

### STEP 3.3: Add uncertainty_chain action
**Input:**
```
{
  "material": "Ti-6Al-4V",
  "tool_diameter": 10,
  "operation": "roughing"
}
```
**Calculation:** Propagate uncertainty through entire chain:
- Material: kc1_1 ± σ, Taylor C ± σ (from statistics.standardDeviation)
- Tool: diameter tolerance ±0.01mm
- Machine: spindle runout ±0.005mm
- → Force uncertainty: Fc ± ΔFc
- → Power uncertainty: P ± ΔP
- → Tool life uncertainty: T ± ΔT
- → Cost uncertainty: $ ± Δ$

**Output:** Confidence intervals at 90% and 95% for all calculated values

---

## PHASE 4: Toolpath Intelligence Enhancement

### STEP 4.1: Add strategy_recommend action to toolpathDispatcher
**File:** C:\PRISM\mcp-server\src\tools\dispatchers\toolpathDispatcher.ts
**Registry:** ToolpathStrategyRegistry has 697 strategies with getStrategiesForFeature(), getBestStrategy(), getStrategiesForMaterial()

**Input:**
```
{
  "feature": "pocket",
  "material": "Inconel 718",
  "machine_axes": 3,
  "tool_diameter": 10,
  "depth": 20,
  "width": 50,
  "length": 80,
  "wall_angle": 90,
  "target_Ra": 1.6
}
```
**Chain:**
1. getStrategiesForFeature("pocket") → filter by capability
2. getStrategiesForMaterial(iso_group) → filter compatible
3. getBestStrategy() with constraints → rank
4. getStrategyParams() → get cutting params for top strategies
5. Return top 3 with reasoning

### STEP 4.2: Wire existing methods that aren't exposed
**ToolpathStrategyRegistry methods NOT in toolpathDispatcher:**
- getStrategiesByCategory() — browse by category
- getPrismNovelStrategies() — PRISM-original strategies
- getStrategyById() — lookup specific strategy details

Add these as new actions: "category_browse", "novel_strategies", "strategy_detail"

---

## PHASE 5: Cross-System Intelligence

### STEP 5.1: Add material_substitute action to dataDispatcher
**Input:** { "material": "Inconel 718", "reason": "cost" | "availability" | "machinability" }
**Logic:** Find materials in same ISO group with similar mechanical properties but better machinability rating
**Output:** Top 3 substitutes with property comparison and machinability improvement %

### STEP 5.2: Add machine_recommend action to dataDispatcher  
**Input:** { "material": "Ti-6Al-4V", "operation": "5axis_milling", "part_envelope": {"x": 300, "y": 200, "z": 150} }
**Logic:** Filter machines by: work envelope ≥ part, has required axes, spindle power sufficient for material
**Output:** Top 5 machines ranked by suitability

### STEP 5.3: Add controller_optimize action to calcDispatcher
**Input:** { "controller": "fanuc", "operation": "milling", "params": {...} }
**Logic:** Use 55KB Fanuc skill + 62KB G-code reference to optimize:
- High-speed smoothing (G05.1, AICC)
- Look-ahead buffer settings
- Tolerance vs speed tradeoffs
- Controller-specific M-codes
**Output:** Optimized G-code with controller-specific features

---

## EXECUTION ORDER (priority + dependencies)

### Sprint 1: Safety (Steps 1.1-1.9)
- Test each of the 29 safety actions
- Fix param mismatches as found
- Build after EVERY restart needed
- Each test is independent — no dependencies

### Sprint 2: Job Planner (Steps 2.1-2.2)
- Depends on: working speed_feed_calc, multi_pass, coolant_strategy, gcode_snippet
- All dependencies already verified ✓
- Single file edit: dataDispatcher.ts

### Sprint 3: Advanced Calcs (Steps 3.1-3.3)
- Depends on: working material registry lookup
- wear_prediction needs Taylor + wear_pattern data (71% coverage)
- process_cost chains multiple existing calcs
- uncertainty_chain uses statistics.standardDeviation from material data

### Sprint 4: Toolpath Intelligence (Steps 4.1-4.2)
- Depends on: ToolpathStrategyRegistry (4450 lines, 697 strategies)
- toolpathDispatcher already has 8 actions, adding 3-4 more
- Read-only operations — low risk

### Sprint 5: Cross-System Intelligence (Steps 5.1-5.3)
- material_substitute: needs material search + compare (both exist)
- machine_recommend: needs machine search + capabilities (both exist)
- controller_optimize: leverages skill docs (read-only)

---

## BUILD/TEST PROTOCOL FOR EACH STEP

1. Make the code change (one action at a time)
2. npm run build — verify 3.9MB clean, no errors
3. Restart Claude Desktop (required for MCP changes)
4. Test with the EXACT params listed above
5. If error: read the error, trace to the engine, fix param mapping
6. If success: save state, move to next step
7. After every 5 successful tests: state_save with progress notes

## SAFETY INVARIANTS (never violate)

- S(x) ≥ 0.70 for all safety calculations
- Never return safety "PASS" without actual calculation
- All force/power values must be positive finite numbers
- Tool life < 1 min always generates a warning
- Power > 100% always generates a warning
- Breakage risk > 50% always generates CRITICAL alert
