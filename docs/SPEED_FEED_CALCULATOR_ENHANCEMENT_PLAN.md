# PRISM SPEED/FEED CALCULATOR ENHANCEMENT PLAN
## Comprehensive Skills, Agents, Scripts, and Hooks Registry
## Version 1.0 | Created: 2026-01-27 | Status: STORED FOR FUTURE PHASES
---

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1: EXECUTIVE SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

## 1.1 Purpose
This document stores ALL planned enhancements for the PRISM Speed/Feed Calculator
Engine and Post Processor integration. These enhancements are **DEFERRED** until
the prerequisite database phases are complete.

## 1.2 Dependencies (MUST COMPLETE FIRST)
```
PREREQUISITE PHASES (from Master Roadmap):
├── Phase 1: Materials Database (1,825 materials × 127 params)
├── Phase 2: Tools Database (9,500 tools × 52 params) ← CRITICAL PATH
├── Phase 3: Machines Database (300 machines × 85 params)
├── Phase 4: Compatibility Matrices
└── Phase 5: Calculation Engines Extraction

REASON: Calculator CONSUMES data from all these sources.
        Building calculator before data exists = building car without engine.
```

## 1.3 Integration Points
```
THIS PLAN INTEGRATES INTO:
├── Phase 5: Calculation Engines (Math/Science Foundation)
├── Phase 6: Speed/Feed Calculator (Core Engine + Integration)
└── Phase 7: Post Processor (PP Enhancement + Agent Coordination)
```

## 1.4 Totals Summary
| Category | Count | Status |
|----------|-------|--------|
| New Skills | 15 | STORED |
| Enhanced Skills | 3 | STORED |
| New Agents | 10 | STORED |
| New Hooks | 24 | STORED |
| New Scripts | 5 | STORED |
| Test Cases | 20+ | STORED |

---

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2: SKILLS REGISTRY
# ═══════════════════════════════════════════════════════════════════════════════

## 2.1 Skills by Tier (Priority Order)

### TIER 1: P0 - Core Calculator (Phase 6.1)
| # | Skill Name | Est. Size | Purpose | Dependencies |
|---|------------|-----------|---------|--------------|
| 1 | prism-speed-feed-engine | ~100KB | Unified calculator with Master Equations | Materials, Tools, Machines |
| 2 | prism-formula-harmony | ~30KB | Factor interaction rules, mutual exclusivity | None |
| 3 | prism-dimensional-analysis | ~20KB | Unit checking, metric/imperial conversion | None |
| 4 | prism-calculation-validator | ~25KB | Test cases, handbook validation | Speed-feed-engine |

### TIER 2: P1 - Integration (Phase 6.2)
| # | Skill Name | Est. Size | Purpose | Dependencies |
|---|------------|-----------|---------|--------------|
| 5 | prism-machine-integration | ~25KB | Wire 824+ machines to calculations | Machines DB |
| 6 | prism-tool-integration | ~25KB | Wire tools to calculations | Tools DB |
| 7 | prism-machining-strategies | ~35KB | HSM/HEM/Conventional/Trochoidal rules | Speed-feed-engine |
| 8 | prism-mrr-optimizer | ~30KB | MRR as primary metric, optimization | Speed-feed-engine |

### TIER 3: P2 - Post Processor (Phase 7.1)
| # | Skill Name | Est. Size | Purpose | Dependencies |
|---|------------|-----------|---------|--------------|
| 9 | prism-post-processor-mastery | ~60KB | PP development, CPS syntax, patterns | All Phase 6 |
| 10 | prism-dead-code-detector | ~15KB | Find unused properties/calculations | None |
| 11 | prism-physics-completeness | ~25KB | Audit physics coverage | Material-physics |
| 12 | prism-agent-swarm-protocol | ~25KB | Agent coordination protocol | None |

### TIER 4: P3 - Advanced (Phase 6.3 / 7.2)
| # | Skill Name | Est. Size | Purpose | Dependencies |
|---|------------|-----------|---------|--------------|
| 13 | prism-dynamic-stability | ~40KB | Chatter prediction, stability lobes | Material-physics |
| 14 | prism-economic-model | ~30KB | Cost per part, cycle time | Speed-feed-engine |
| 15 | prism-adaptive-learning | ~35KB | Feedback loop, coefficient updates | All engines |

### ENHANCED EXISTING SKILLS
| # | Skill Name | Enhancements | Phase |
|---|------------|--------------|-------|
| E1 | prism-uncertainty-propagation | +Monte Carlo, +sensitivity analysis, +covariance | 5 |
| E2 | prism-material-physics | +Oxley model, +thermal zones, +detailed wear | 5 |
| E3 | prism-tool-holder-integration | +collision envelope, +speed/feed derating | 6 |

---

## 2.2 Detailed Skill Specifications

### SKILL 1: prism-speed-feed-engine (~100KB)
```yaml
name: prism-speed-feed-engine
version: 1.0.0
level: L3-Domain
category: Calculator
priority: P0
phase: 6.1

description: |
  Core speed/feed calculation engine with unified Master Equations.
  Consumes materials, tools, machines, holders. Outputs optimal parameters
  with uncertainty bounds and safety limits.

sections:
  1_master_speed_equation:
    formula: "n = (1000 × Vc) / (π × D)"
    factors:
      - M_material: "[0.5-1.5] Material machinability"
      - M_coating: "[0.9-1.5] Tool coating factor"
      - M_coolant: "[0.7-1.3] Coolant type"
      - M_operation: "[0.6-1.3] Roughing vs finishing"
      - M_stability: "[0.7-1.1] Dynamic stability"
      - M_varRPM: "[0.7-1.2] Variable RPM by engagement"
    safety_limits:
      - S_power: "min(1.0, P_available / P_required)"
      - S_stability: "min(1.0, stability_margin)"
      - S_machine: "min(1.0, n_max_machine / n_calculated)"
    constraints:
      - "n ≤ n_max_machine"
      - "n ≤ n_max_tool"
      - "n ≥ n_min_rubbing"
    uncertainty: "σ_n/n ≈ ±8-15%"

  2_master_feed_equation:
    formula: "F = fz × z × n"
    factors:
      - M_chipThin: "[1.0-5.0] Chip thinning (SQRT or GEOMETRIC)"
      - M_corner: "[0.3-1.0] Corner slowdown"
      - M_ramp: "[0.2-0.8] Ramping/helical"
      - M_varFeed: "[0.5-1.5] Variable feed"
      - M_holder: "[0.8-1.1] Holder stiffness/TIR"
      - M_strategy: "[0.8-2.0] HSM/HEM mode"
    mutual_exclusions:
      - "IF M_strategy=HSM THEN M_chipThin=1.0"
      - "IF M_strategy=HEM THEN M_chipThin=1.0"
    safety_limits:
      - S_power: "min(1.0, P_available / P_required)"
      - S_deflection: "min(1.0, δ_max / δ_predicted)"
      - S_surface: "min(1.0, Ra_target / Ra_predicted)"
    constraints:
      - "F ≤ F_max_machine"
      - "F ≥ F_min_rubbing (0.02mm/tooth)"
    uncertainty: "σ_F/F ≈ ±10-20%"

  3_power_equation:
    formula: "P = (Fc × Vc) / (60000 × η)"
    where:
      - "Fc = kc × A_chip"
      - "kc = kc1.1 × h^(-mc) × K_corrections"
      - "η = spindle efficiency [0.85-0.95]"
    torque: "T = (P × 9549) / n [Nm]"
    safety: "IF P > 0.80 × P_machine THEN reduce"

  4_deflection_equation:
    formula: "δ = (√(Fc² + Fr²) × L³) / (3 × E × I_eff)"
    where:
      - "I_eff = π × D⁴ / 64 × K_holder × K_runout"
    limits:
      - "δ_max_roughing = 0.10 mm"
      - "δ_max_semifinish = 0.05 mm"
      - "δ_max_finishing = 0.01 mm"

  5_surface_finish:
    formula: "Ra = (f² / (32 × r)) × K_material × K_vibration × K_wear"
    theoretical: "Ra_theoretical = f² / (32 × r)"

  6_mrr:
    formula: "MRR = ap × ae × Vf [cm³/min]"
    note: "THIS is what shops optimize for"

  7_optimization_loop:
    algorithm: |
      WHILE (not_optimal):
        Calculate speed, feed, power, deflection
        Check all constraints
        IF any violated:
          Identify limiting constraint
          Adjust parameters
        ELSE:
          Check if can increase MRR
          IF yes: increase, continue
          ELSE: optimal found

consumers:
  - PRISM_POST_PROCESSOR
  - PRISM_QUOTING_ENGINE
  - PRISM_LEARNING_PIPELINE
  - PRISM_UI_CALCULATOR
  - PRISM_CAM_INTEGRATION

hooks:
  - speedFeed:preCalculate
  - speedFeed:postCalculate
  - speedFeed:constraintViolation
  - speedFeed:optimizationComplete
```

### SKILL 2: prism-formula-harmony (~30KB)
```yaml
name: prism-formula-harmony
version: 1.0.0
level: L3-Domain
category: Calculator
priority: P0
phase: 6.1

description: |
  Defines interaction rules between all adjustment factors.
  Prevents double-counting, defines mutual exclusions, establishes
  application order.

sections:
  1_factor_interaction_matrix:
    matrix: |
      ┌─────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
      │                 │ ChipThin │ VarFeed  │ VarRPM   │ HSM/HEM  │ Corner   │
      ├─────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
      │ ChipThin        │    -     │ ADDITIVE │ INDEPEND │ EXCLUDE  │ OVERRIDE │
      │ VarFeed         │ ADDITIVE │    -     │ INDEPEND │ COMBINE  │ COMBINE  │
      │ VarRPM          │ INDEPEND │ INDEPEND │    -     │ COMBINE  │ COMBINE  │
      │ HSM/HEM         │ EXCLUDE  │ COMBINE  │ COMBINE  │    -     │ COMBINE  │
      │ Corner          │ OVERRIDE │ COMBINE  │ COMBINE  │ COMBINE  │    -     │
      └─────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
    legend:
      ADDITIVE: "Multiply both factors"
      EXCLUDE: "Only one applies (HSM includes chip thinning)"
      OVERRIDE: "Corner overrides steady-state chip thinning"
      INDEPEND: "Apply to different outputs (speed vs feed)"
      COMBINE: "Both apply with specific formula"

  2_application_order:
    speed_factors:
      1: "Base cutting speed from material"
      2: "M_coating"
      3: "M_coolant"
      4: "M_operation"
      5: "M_varRPM (engagement-based)"
      6: "Safety limits (cap, not scale)"
    feed_factors:
      1: "Base chip load from material/tool"
      2: "Flutes × Speed"
      3: "M_chipThin OR M_strategy (exclusive)"
      4: "M_corner (if applicable)"
      5: "M_varFeed (dynamic)"
      6: "M_holder"
      7: "Safety limits (cap, not scale)"

  3_mutual_exclusion_rules:
    rule_1: "Chip thinning and HSM/HEM are MUTUALLY EXCLUSIVE"
    rule_2: "VarFeed replaces ChipThin during transients"
    rule_3: "Corner slowdown overrides steady-state factors"
    rule_4: "Safety limits apply LAST and CAP (don't multiply)"

  4_combination_formulas:
    chipThin_varFeed: "F = F_base × M_chipThin_steady × M_varFeed_transient"
    hsm_corner: "F = F_base × M_hsm × M_corner"
    varRPM_thermal: "n = n_base × M_varRPM × (1 - thermal_derating)"

hooks:
  - formula:checkHarmony
  - calc:preMultiply
```

### SKILL 3: prism-dimensional-analysis (~20KB)
```yaml
name: prism-dimensional-analysis
version: 1.0.0
level: L1-Cognitive
category: Math
priority: P0
phase: 5

description: |
  Unit checking, dimensional consistency verification, and
  metric/imperial conversion for all calculations.

sections:
  1_unit_systems:
    metric:
      speed: "m/min"
      feed: "mm/min"
      chip_load: "mm/tooth"
      power: "kW"
      force: "N"
      length: "mm"
    imperial:
      speed: "SFM (surface feet per minute)"
      feed: "IPM (inches per minute)"
      chip_load: "IPT (inches per tooth)"
      power: "HP"
      force: "lbf"
      length: "in"

  2_conversion_factors:
    speed: "1 m/min = 3.281 SFM"
    feed: "1 mm/min = 0.03937 IPM"
    chip_load: "1 mm = 0.03937 in"
    power: "1 kW = 1.341 HP"
    force: "1 N = 0.2248 lbf"
    length: "1 mm = 0.03937 in"

  3_dimensional_verification:
    speed_check: "[L/T] = [L]/[T]"
    feed_check: "[L/T] = [L/tooth] × [teeth] × [1/T]"
    power_check: "[ML²/T³] = [F] × [L/T]"
    force_check: "[MLT⁻²] from Kienzle"

  4_internal_representation:
    standard: "All calculations use SI internally"
    conversion: "Convert on input, convert on output"
    storage: "Store in SI with original unit noted"

hooks:
  - calc:dimensionalVerify
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3: AGENTS REGISTRY
# ═══════════════════════════════════════════════════════════════════════════════

## 3.1 New Agents (10 Total)

### OPUS Tier (5 agents)
| # | Agent Name | Purpose | Phase | Skills Used |
|---|------------|---------|-------|-------------|
| 1 | math_engine | Numerical methods, optimization, uncertainty | 5 | advanced-math, uncertainty-propagation |
| 2 | physics_engine | Force models, thermal, stability | 5 | material-physics, dynamic-stability |
| 3 | speed_feed_optimizer | Core S/F optimization with all factors | 6 | speed-feed-engine, formula-harmony |
| 4 | post_processor_architect | PP design, audit, wiring | 7 | post-processor-mastery |
| 5 | formula_harmonizer | Factor compatibility, combination rules | 6 | formula-harmony |

### SONNET Tier (5 agents)
| # | Agent Name | Purpose | Phase | Skills Used |
|---|------------|---------|-------|-------------|
| 6 | calculation_auditor | Validate calculations against handbooks | 6 | calculation-validator |
| 7 | wiring_validator | Trace property→calculation chains | 7 | dead-code-detector, physics-completeness |
| 8 | learning_integrator | Feedback loop, coefficient updates | 6 | adaptive-learning |
| 9 | strategy_selector | Choose HSM/HEM/Conventional | 6 | machining-strategies |
| 10 | mrr_optimizer | Maximize MRR within constraints | 6 | mrr-optimizer |

## 3.2 Agent Definitions

```typescript
// Agent: speed_feed_optimizer
{
  name: "speed_feed_optimizer",
  tier: "OPUS",
  purpose: "Core speed/feed calculation with multi-factor optimization",
  skills: ["prism-speed-feed-engine", "prism-formula-harmony", "prism-mrr-optimizer"],
  inputs: {
    material: "Material record with 127 params",
    tool: "Tool record with 52 params",
    machine: "Machine record with 85 params",
    holder: "Holder record with 65 params",
    operation: "Operation type and parameters"
  },
  outputs: {
    speed: { value: number, uncertainty: number, unit: string },
    feed: { value: number, uncertainty: number, unit: string },
    mrr: { value: number, uncertainty: number, unit: string },
    power: { value: number, uncertainty: number, unit: string },
    toolLife: { value: number, uncertainty: number, unit: string },
    limitingFactor: string,
    safetyScore: number,
    explanation: string[]
  },
  hooks: ["speedFeed:preCalculate", "speedFeed:postCalculate", "calc:xaiExplain"]
}

// Agent: formula_harmonizer
{
  name: "formula_harmonizer",
  tier: "OPUS",
  purpose: "Verify factor combinations, prevent double-counting",
  skills: ["prism-formula-harmony"],
  inputs: {
    factors: "List of active adjustment factors",
    context: "Operation context (HSM, corner, etc.)"
  },
  outputs: {
    validCombination: boolean,
    exclusions: string[],
    applicationOrder: string[],
    warnings: string[]
  },
  hooks: ["formula:checkHarmony", "calc:preMultiply"]
}

// Agent: calculation_auditor
{
  name: "calculation_auditor",
  tier: "SONNET",
  purpose: "Validate calculations against known handbook values",
  skills: ["prism-calculation-validator"],
  inputs: {
    calculatedValues: "Output from speed_feed_optimizer",
    material: "Material for lookup",
    tool: "Tool for lookup"
  },
  outputs: {
    valid: boolean,
    deviations: { metric: string, calculated: number, expected: { min: number, max: number }, source: string }[],
    confidence: number
  },
  hooks: ["verification:chainComplete"]
}
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4: HOOKS REGISTRY
# ═══════════════════════════════════════════════════════════════════════════════

## 4.1 New Hooks (24 Total)

### Math Hooks (4)
| Hook | Category | Purpose | Phase |
|------|----------|---------|-------|
| calc:uncertaintyPropagate | Calculation | Auto-propagate errors through formulas | 5 |
| calc:dimensionalVerify | Validation | Check unit consistency | 5 |
| calc:numericalStability | Validation | Check for numerical instability | 5 |
| calc:preMultiply | Calculation | Verify factor order before multiplication | 6 |

### Physics Hooks (4)
| Hook | Category | Purpose | Phase |
|------|----------|---------|-------|
| physics:forceValidate | Calculation | Verify force calculations in bounds | 5 |
| physics:thermalCheck | Calculation | Check temperatures vs limits | 5 |
| physics:stabilityCheck | Calculation | Chatter risk assessment | 5 |
| physics:wearEstimate | Calculation | Tool life tracking | 5 |

### Engine Hooks (6)
| Hook | Category | Purpose | Phase |
|------|----------|---------|-------|
| speedFeed:preCalculate | Calculation | Pre-validation of inputs | 6 |
| speedFeed:postCalculate | Calculation | Result validation | 6 |
| speedFeed:constraintViolation | Calculation | Handle limit violations | 6 |
| speedFeed:optimizationComplete | Calculation | Final verification | 6 |
| speedFeed:limitReached | Logging | Log which limit is binding | 6 |
| speedFeed:mrrOptimize | Calculation | MRR optimization trigger | 6 |

### Swarm/PP Hooks (6)
| Hook | Category | Purpose | Phase |
|------|----------|---------|-------|
| agent:shareFindings | Swarm | Broadcast discoveries | 7 |
| agent:requestAssist | Swarm | Request help from other agents | 7 |
| agent:resolveConflict | Swarm | Handle contradictions | 7 |
| formula:checkHarmony | Calculation | Verify factor combinations | 6 |
| property:verifyWiring | Validation | Check property→calculation chains | 7 |
| postProcessor:auditComplete | Quality | PP quality gate | 7 |

### Safety Hooks (4)
| Hook | Category | Purpose | Phase |
|------|----------|---------|-------|
| machine:limitExceeded | Safety | When params exceed machine capability | 6 |
| tool:geometryValidate | Validation | Verify tool geometry is valid | 6 |
| material:parameterMissing | Validation | When calc needs missing parameter | 6 |
| thermal:limitExceeded | Safety | When temperature exceeds tool limit | 6 |

## 4.2 Hook Integration Code Template
```typescript
// Example: speedFeed:preCalculate hook
hookManager.register('speedFeed:preCalculate', async (context) => {
  const { material, tool, machine, holder, operation } = context.data;
  
  // Validate all required inputs present
  const missing = [];
  if (!material?.kc1_1) missing.push('material.kc1_1');
  if (!tool?.diameter) missing.push('tool.diameter');
  if (!machine?.maxSpindleSpeed) missing.push('machine.maxSpindleSpeed');
  
  if (missing.length > 0) {
    await hookManager.emit('material:parameterMissing', { missing });
    return { continue: false, reason: `Missing parameters: ${missing.join(', ')}` };
  }
  
  return { continue: true };
});
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 5: SCRIPTS REGISTRY
# ═══════════════════════════════════════════════════════════════════════════════

## 5.1 New Scripts (5 Total)

| # | Script Name | Purpose | Phase | Est. Lines |
|---|-------------|---------|-------|------------|
| 1 | prism_calculator.py | Standalone S/F calculator | 6 | ~800 |
| 2 | prism_calculator_validator.py | Validate against handbook values | 6 | ~400 |
| 3 | prism_post_audit.py | Comprehensive PP audit | 7 | ~600 |
| 4 | prism_dead_code_finder.py | Find unused properties | 7 | ~300 |
| 5 | prism_factor_checker.py | Verify factor combinations | 6 | ~250 |

## 5.2 Script Specifications

### Script 1: prism_calculator.py
```python
"""
PRISM Speed/Feed Calculator - Standalone Python Implementation
Mirrors the TypeScript engine for validation and standalone use.

Usage:
  py -3 prism_calculator.py --material "1045 Steel" --tool "12mm 4-flute" --operation "slotting"
  py -3 prism_calculator.py --interactive
  py -3 prism_calculator.py --validate test_cases.json

Outputs:
  - Optimal speed (RPM) ± uncertainty
  - Optimal feed (mm/min) ± uncertainty
  - MRR (cm³/min) ± uncertainty
  - Limiting factor
  - Safety score
"""

# Key functions to implement:
# - calculate_speed(material, tool, machine, holder, operation) -> SpeedResult
# - calculate_feed(speed_result, material, tool, operation) -> FeedResult
# - check_power(speed, feed, material, tool, machine) -> PowerResult
# - check_deflection(feed, tool, holder) -> DeflectionResult
# - optimize_mrr(constraints) -> OptimalParams
# - validate_against_handbook(results, test_case) -> ValidationResult
```

### Script 2: prism_calculator_validator.py
```python
"""
Validates calculator output against known handbook values.

Test cases from:
- Machinery's Handbook 31st Ed
- Sandvik Coromant Technical Guide
- Kennametal Catalog
- FSWizard/HSMAdvisor comparison

Usage:
  py -3 prism_calculator_validator.py --run-all
  py -3 prism_calculator_validator.py --category "carbon_steel"
  py -3 prism_calculator_validator.py --generate-report
"""
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 6: TEST CASES
# ═══════════════════════════════════════════════════════════════════════════════

## 6.1 Validation Test Cases (20+)

### Carbon Steel Tests
```json
[
  {
    "id": "TC-CS-001",
    "name": "1045 Steel Slotting",
    "material": { "name": "1045 Steel", "hardness": "200 HB", "iso_group": "P" },
    "tool": { "diameter": 12, "flutes": 4, "coating": "TiAlN", "type": "endmill" },
    "operation": "slotting",
    "expected": {
      "speed": { "min": 150, "max": 200, "unit": "m/min" },
      "chipLoad": { "min": 0.08, "max": 0.12, "unit": "mm/tooth" }
    },
    "source": "Machinery's Handbook 31st Ed, Table 1a",
    "tolerance": 0.10
  },
  {
    "id": "TC-CS-002",
    "name": "4140 Steel Roughing",
    "material": { "name": "4140 Steel", "hardness": "28 HRC", "iso_group": "P" },
    "tool": { "diameter": 16, "flutes": 4, "coating": "AlTiN", "type": "endmill" },
    "operation": "roughing",
    "expected": {
      "speed": { "min": 120, "max": 180, "unit": "m/min" },
      "chipLoad": { "min": 0.10, "max": 0.15, "unit": "mm/tooth" }
    },
    "source": "Sandvik Coromant Technical Guide",
    "tolerance": 0.15
  }
]
```

### Aluminum Tests
```json
[
  {
    "id": "TC-AL-001",
    "name": "6061-T6 HSM Roughing",
    "material": { "name": "6061-T6 Aluminum", "iso_group": "N" },
    "tool": { "diameter": 10, "flutes": 3, "coating": "DLC", "type": "endmill" },
    "operation": "adaptive",
    "radialEngagement": 0.15,
    "expected": {
      "speed": { "min": 400, "max": 600, "unit": "m/min" },
      "chipLoad": { "min": 0.15, "max": 0.25, "unit": "mm/tooth" }
    },
    "source": "Sandvik Coromant Technical Guide",
    "tolerance": 0.15
  },
  {
    "id": "TC-AL-002",
    "name": "7075-T6 Finishing",
    "material": { "name": "7075-T6 Aluminum", "iso_group": "N" },
    "tool": { "diameter": 6, "flutes": 2, "coating": "Polished", "type": "ballnose" },
    "operation": "finishing",
    "expected": {
      "speed": { "min": 300, "max": 500, "unit": "m/min" },
      "chipLoad": { "min": 0.05, "max": 0.10, "unit": "mm/tooth" }
    },
    "source": "Kennametal Catalog",
    "tolerance": 0.15
  }
]
```

### Stainless Steel Tests
```json
[
  {
    "id": "TC-SS-001",
    "name": "316L Finishing",
    "material": { "name": "316L Stainless", "iso_group": "M" },
    "tool": { "diameter": 6, "flutes": 4, "coating": "AlTiN", "type": "endmill" },
    "operation": "finishing",
    "expected": {
      "speed": { "min": 80, "max": 120, "unit": "m/min" },
      "chipLoad": { "min": 0.04, "max": 0.08, "unit": "mm/tooth" }
    },
    "source": "Kennametal Catalog",
    "tolerance": 0.15
  },
  {
    "id": "TC-SS-002",
    "name": "304 Stainless Slotting",
    "material": { "name": "304 Stainless", "iso_group": "M" },
    "tool": { "diameter": 10, "flutes": 4, "coating": "TiAlN", "type": "endmill" },
    "operation": "slotting",
    "expected": {
      "speed": { "min": 60, "max": 100, "unit": "m/min" },
      "chipLoad": { "min": 0.06, "max": 0.10, "unit": "mm/tooth" }
    },
    "source": "Sandvik Coromant",
    "tolerance": 0.15
  }
]
```

### Titanium Tests
```json
[
  {
    "id": "TC-TI-001",
    "name": "Ti-6Al-4V HEM Roughing",
    "material": { "name": "Ti-6Al-4V", "iso_group": "S" },
    "tool": { "diameter": 12, "flutes": 5, "coating": "AlTiN", "type": "endmill" },
    "operation": "HEM",
    "axialDepth": 24,
    "radialEngagement": 0.10,
    "expected": {
      "speed": { "min": 40, "max": 70, "unit": "m/min" },
      "chipLoad": { "min": 0.08, "max": 0.12, "unit": "mm/tooth" }
    },
    "source": "Sandvik Coromant Technical Guide",
    "tolerance": 0.20
  }
]
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 7: MASTER EQUATIONS REFERENCE
# ═══════════════════════════════════════════════════════════════════════════════

## 7.1 F-SPEED-001: Master Speed Equation
```
n_optimal = n_base × M_mat × M_coat × M_cool × M_wear × M_holder × M_varRPM × M_safety

WHERE:
  n_base = (1000 × Vc) / (π × D)
  
  M_mat:     [0.6-1.4]  Material machinability
  M_coat:    [0.9-1.5]  Tool coating factor
  M_cool:    [0.9-1.3]  Coolant type
  M_wear:    [0.8-1.0]  Tool wear state
  M_holder:  [0.85-1.05] Holder type
  M_varRPM:  [0.7-1.2]  Engagement-based
  M_safety:  [0-1.0]    min(power, deflection, machine limits)

CONSTRAINTS:
  n_optimal ≤ n_max_machine
  n_optimal ≤ n_max_tool
  n_optimal ≥ n_min_cutting

UNCERTAINTY: σ_n/n ≈ ±8-15%
```

## 7.2 F-FEED-001: Master Feed Equation
```
F_optimal = F_base × M_mat × M_coat × M_holder × M_chipThin × M_varFeed × M_strategy × M_safety

WHERE:
  F_base = fz × z × n
  
  M_mat:      [0.5-1.5]  Machinability rating
  M_coat:     [0.95-1.15] Coating factor
  M_holder:   [0.8-1.1]  TIR-based
  M_chipThin: [1.0-5.0]  SQRT: 1/√(ae/D), GEOMETRIC: 1/sin(acos(1-2ae/D))
  M_varFeed:  [0.5-1.5]  Corners, direction changes
  M_strategy: [0.8-2.0]  Conventional=1.0, HSM=1.3-1.8, HEM=1.5-2.0
  M_safety:   [0-1.0]    min(power, force, deflection)

MUTUAL EXCLUSIVITY:
  IF M_strategy=HSM/HEM THEN M_chipThin=1.0

CONSTRAINTS:
  F_optimal ≤ F_max_machine
  F_optimal ≥ F_min (0.02mm/tooth)

UNCERTAINTY: σ_F/F ≈ ±10-20%
```

## 7.3 F-POWER-001: Power Equation
```
P_cutting = (Fc × Vc) / (60 × 1000) [kW]

WHERE:
  Fc = kc × ap × ae × sin(κ) / sin(φ)
  kc = kc1.1 × h^(-mc) × K_corrections
  h = fz × sin(κ) × √(ae/D × (1 - ae/D))

SAFETY:
  P_required = P_cutting / η_spindle (η≈0.85-0.95)
  IF P_required > 0.80×P_machine THEN reduce feed

TORQUE:
  T = (P × 9549) / n [Nm]
```

## 7.4 F-DEFLECT-001: Deflection Equation
```
δ = (F_resultant × L³) / (3 × E × I_eff)

WHERE:
  F_resultant = √(Fc² + Fr²)
  I_eff = π × D⁴ / 64 × K_holder × K_runout
  K_holder: [0.7-1.0] Holder stiffness
  K_runout: [0.8-1.0] TIR degradation

LIMITS:
  δ_max_roughing = 0.10 mm
  δ_max_semifinish = 0.05 mm
  δ_max_finishing = 0.01 mm
```

## 7.5 F-SURFACE-001: Surface Finish Equation
```
Ra = Ra_theoretical × K_material × K_vibration × K_wear

WHERE:
  Ra_theoretical = f² / (32 × r)
  K_material: [0.8-1.5] Material finish factor
  K_vibration: [1.0-2.0] Stability factor
  K_wear: [1.0-1.5] Tool wear factor
```

## 7.6 F-MRR-001: Material Removal Rate
```
MRR = ap × ae × Vf [cm³/min]

WHERE:
  ap = axial depth (mm)
  ae = radial depth (mm)
  Vf = feed rate (mm/min)

THIS IS THE PRIMARY OPTIMIZATION TARGET FOR SHOPS
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 8: ROADMAP INTEGRATION
# ═══════════════════════════════════════════════════════════════════════════════

## 8.1 Recommended Insertion Points

```
CURRENT ROADMAP STRUCTURE:
├── Phase 0: Foundation (COMPLETE)
├── Phase 1: Materials Database
├── Phase 2: Tools Database (CRITICAL PATH)
├── Phase 3: Machines Database
├── Phase 4: Compatibility Matrices
├── Phase 5: Calculation Engines ← INSERT: Math Foundation (Skills 1-4 enhanced)
├── Phase 6: Speed/Feed Calculator ← INSERT: Core Engine (Skills 1-8, Agents 1-6)
├── Phase 7: Post Processor ← INSERT: PP Enhancement (Skills 9-12, Agents 7-10)
├── Phase 8: Business/ERP
└── Phase 9: Final Verification

RECOMMENDED INSERTION:

Phase 5 ADDITIONS:
  5.8: prism-dimensional-analysis skill
  5.9: ENHANCE prism-uncertainty-propagation (+Monte Carlo)
  5.10: ENHANCE prism-material-physics (+Oxley, +thermal)
  5.11: prism-dynamic-stability skill
  5.12: math_engine agent
  5.13: physics_engine agent
  5.14: Physics hooks (4)

Phase 6 EXPANSION (from 3 sub-phases to 6):
  6.1: prism-speed-feed-engine skill (P0)
  6.2: prism-formula-harmony skill (P0)
  6.3: prism-calculation-validator skill + test cases (P0)
  6.4: prism_calculator.py script (P0)
  6.5: prism-machine-integration skill (P1)
  6.6: prism-tool-integration skill (P1)
  6.7: prism-machining-strategies skill (P1)
  6.8: prism-mrr-optimizer skill (P1)
  6.9: ENHANCE prism-tool-holder-integration (P1)
  6.10: speed_feed_optimizer agent
  6.11: formula_harmonizer agent
  6.12: calculation_auditor agent
  6.13: strategy_selector agent
  6.14: mrr_optimizer agent
  6.15: learning_integrator agent
  6.16: Engine hooks (6)
  6.17: Safety hooks (4)
  6.18: Validation against handbooks

Phase 7 EXPANSION (from 3 sub-phases to 5):
  7.1: prism-post-processor-mastery skill (P2)
  7.2: prism-dead-code-detector skill (P2)
  7.3: prism-physics-completeness skill (P2)
  7.4: prism-agent-swarm-protocol skill (P2)
  7.5: prism_post_audit.py script
  7.6: prism_dead_code_finder.py script
  7.7: post_processor_architect agent
  7.8: wiring_validator agent
  7.9: Swarm hooks (6)
  7.10: PP enhancement and integration
```

## 8.2 Effort Adjustments

```
REVISED PHASE ESTIMATES:

Phase 5 (was 480 ± 120, now includes math foundation):
  Original: 480 ± 120 tool calls
  Additions: +80 ± 20 (math/physics skills, agents, hooks)
  REVISED: 560 ± 140 tool calls (95% CI)

Phase 6 (was 520 ± 130, now comprehensive calculator):
  Original: 520 ± 130 tool calls
  Additions: +180 ± 45 (8 skills, 6 agents, 10 hooks, scripts)
  REVISED: 700 ± 175 tool calls (95% CI)

Phase 7 (was 450 ± 112, now includes PP enhancement):
  Original: 450 ± 112 tool calls
  Additions: +120 ± 30 (4 skills, 2 agents, 6 hooks, scripts)
  REVISED: 570 ± 142 tool calls (95% CI)

TOTAL ROADMAP IMPACT:
  Original Total: 3,660 ± 912 tool calls
  Additions: +380 ± 95 tool calls
  REVISED TOTAL: 4,040 ± 1,007 tool calls (95% CI)
  
  Microsessions: +26 ± 7
  Time: +13 ± 3 hours
```

## 8.3 Why This Order Makes Sense

```
DEPENDENCY CHAIN (Cannot be parallelized):

Materials DB → Has cutting parameters (kc, mc, Vc_base)
     ↓
Tools DB → Has geometry (D, z, helix, coating)
     ↓
Machines DB → Has limits (n_max, P_max, T_max)
     ↓
Compatibility Matrices → Knows what works with what
     ↓
Calculation Engines → Has physics formulas (Kienzle, Taylor)
     ↓
Speed/Feed Calculator → CONSUMES ALL OF THE ABOVE
     ↓
Post Processor → CONSUMES calculator output

CALCULATOR WITHOUT DATA = EMPTY SHELL
Building calculator before databases = waste of effort

CORRECT ORDER:
1. Finish Materials (Phase 1) - 1,825 materials with 127 params
2. Finish Tools (Phase 2) - 9,500 tools with 52 params ← CRITICAL PATH
3. Finish Machines (Phase 3) - 300 machines with 85 params
4. Build Matrices (Phase 4) - What works with what
5. Extract/Build Engines (Phase 5) - Physics calculations
6. Build Calculator (Phase 6) - Unified S/F engine
7. Enhance PP (Phase 7) - Integration with calculator
```

---

# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 9: QUICK REFERENCE
# ═══════════════════════════════════════════════════════════════════════════════

## 9.1 Skills Quick Lookup
```
P0 (Core - Phase 6.1):
  • prism-speed-feed-engine (100KB)
  • prism-formula-harmony (30KB)
  • prism-dimensional-analysis (20KB)
  • prism-calculation-validator (25KB)

P1 (Integration - Phase 6.2):
  • prism-machine-integration (25KB)
  • prism-tool-integration (25KB)
  • prism-machining-strategies (35KB)
  • prism-mrr-optimizer (30KB)

P2 (PP - Phase 7.1):
  • prism-post-processor-mastery (60KB)
  • prism-dead-code-detector (15KB)
  • prism-physics-completeness (25KB)
  • prism-agent-swarm-protocol (25KB)

P3 (Advanced - Phase 6.3/7.2):
  • prism-dynamic-stability (40KB)
  • prism-economic-model (30KB)
  • prism-adaptive-learning (35KB)
```

## 9.2 Agents Quick Lookup
```
OPUS:
  • math_engine (Phase 5)
  • physics_engine (Phase 5)
  • speed_feed_optimizer (Phase 6)
  • post_processor_architect (Phase 7)
  • formula_harmonizer (Phase 6)

SONNET:
  • calculation_auditor (Phase 6)
  • wiring_validator (Phase 7)
  • learning_integrator (Phase 6)
  • strategy_selector (Phase 6)
  • mrr_optimizer (Phase 6)
```

## 9.3 Hooks Quick Lookup
```
Math (4): uncertaintyPropagate, dimensionalVerify, numericalStability, preMultiply
Physics (4): forceValidate, thermalCheck, stabilityCheck, wearEstimate
Engine (6): preCalculate, postCalculate, constraintViolation, optimizationComplete, limitReached, mrrOptimize
Swarm (6): shareFindings, requestAssist, resolveConflict, checkHarmony, verifyWiring, auditComplete
Safety (4): machine:limitExceeded, tool:geometryValidate, material:parameterMissing, thermal:limitExceeded
```

---

**DOCUMENT STATUS:** STORED - Ready for integration when prerequisites complete
**VERSION:** 1.0
**CREATED:** 2026-01-27
**PHASE DEPENDENCY:** Requires Phases 1-5 complete before execution

---

# END OF SPEED/FEED CALCULATOR ENHANCEMENT PLAN
