# ROADMAP SCRUTINY AGENT 12/20: Safety Coverage Review

## Document Reviewed
**File:** H:\prism\mcp-server\data\milestones\PIPELINE-VAR-MS0.json
**Title:** Per-Block Variability Maximization Across All 9 Pipelines
**Units:** 13 total (4 phases)
**Focus:** Safety validation across all 9 CNC pipelines

---

## COMPREHENSIVE SAFETY COVERAGE ANALYSIS

### 1. PIPELINE COVERAGE ASSESSMENT

#### Chip-Cutting Pipelines (Milling, Turning, 5-axis, Mill-Turn)
**Score: 45/100**

**Strengths:**
- PrintToProgramPipelineEngine has force/power limiting (line 782-790)
- PostProcessorPipelineEngine (38 stages) includes:
  - Power limiting (machine max × 0.85)
  - Torque limiting (spindle check at line 790-795)
  - Deflection limiting via L/D ratio (line 1060-1096)
  - Taylor tool life warning (line 838-843)
  - Chatter probability assessment (line 970)

**Critical Gaps:**
1. **No deflection stress validation** — limits to tolerance/3 but doesn't check against tool tensile strength × safety factor
2. **No workholding grip force check** — cutting forces not validated against jaw friction/Coulomb friction model
3. **Spindle thermal not integrated** — CuttingTemperatureEngine exists but bypassed in PostProcessor
4. **Boring bar L/D check only warns** — U-PV02 requires implementation, currently missing
5. **5-axis singularity feed reduction** — specified in U-PV03, not yet wired
6. **MillTurn Taylor tool life** — explicit gap noted in U-PV03

#### EDM Pipeline
**Score: 0/100**
- MISSING: Max discharge energy per material
- MISSING: Wire tension limits (80-250 N range)
- MISSING: Gap voltage threshold (20-90 V depending on pass)
- MISSING: Flushing pressure requirements
- MISSING: Machine-specific power limits from MachineRegistry
- Current: EDMProgramAssemblerEngine has Sato MRR + DiBitonto recast layer, but ZERO safety validation
- Code contains "SAFE RETRACT" as comment only

#### Grinding Pipeline
**Score: 40/100**
- PRESENT: Burn threshold check (Malkin specific energy model) at line 1504-1529
- PRESENT: a_e auto-reduction when burn risk detected
- MISSING: Wheel peripheral speed limit enforcement (typical: 25-45 m/s, max 45 m/s = explosion threshold)
- MISSING: Speed limits NOT queried from MachineRegistry
- MISSING: Dresser compensation tracking across passes
- MISSING: Safety validation section in G-code output
- WEAKNESS: Only warns on burn, doesn't block (should BLOCK at u > 25 J/mm³)

#### Laser Pipeline
**Score: 5/100**
- MISSING: Max power per material (prevents vaporization/fire)
- MISSING: Beam delivery pressure check (cooling optics)
- MISSING: Assist gas type/pressure validation
- MISSING: Rapid clearance detailed validation
- Current: LaserProgramAssemblerEngine has Beer-Lambert + Schulz models, NO safety layer
- PARTIAL: Machine envelope check mentioned but incomplete

#### Waterjet Pipeline
**Score: 0/100**
- MISSING: Max pressure rating (typically 4000-6000 bar, operate at ≤80%)
- MISSING: Nozzle wear warning/tracking (100-500 hour lifespan)
- MISSING: Abrasive flow rate limits (typically 150-300 g/min)
- MISSING: Table envelope XY validation
- MISSING: Z clearance for abrasive delivery system
- Current: WaterjetProgramAssemblerEngine has Hashish/Zeng-Kim models, NO safety checks

**Pipeline Coverage Summary:**
- Chip-cutting: 50% (partial PostProcessor coverage)
- EDM: 0%
- Grinding: 40% (burn check only)
- Laser: 5%
- Waterjet: 0%
- **AVERAGE: 32% → CRITICAL GAP**

---

### 2. DOMAIN-SPECIFIC SAFETY CONCERNS

#### EDM Safety Gaps (U-PV08 Requirements)

1. **Discharge Energy Limits**
   - Problem: High energy melts/cracks workpiece
   - Typical: 100-500 µJ per pulse
   - Formula: E_pulse = I_peak × U_gap × t_on [J]
   - Material-specific max: function of hardness, thermal conductivity
   - **Status: NOT IMPLEMENTED**

2. **Wire Tension Validation**
   - Problem: Out-of-range tension → breakage or poor surface finish
   - Brass wire: 80-150 N
   - Molybdenum: 120-250 N
   - Must query: MachineRegistry.edm_capability.wire_tension_range
   - **Status: NO REGISTRY FIELD EXISTS**

3. **Gap Voltage Threshold**
   - Problem: Too low = short circuit, too high = no cut
   - Roughing: 20-50 V
   - Finishing: 40-90 V
   - Must vary per pass type
   - **Status: NOT IN CODE**

4. **Flushing Pressure**
   - Problem: Inadequate flushing → chip reignition, poor finish
   - Wire EDM: 0.5-2.0 bar
   - Sinker: 1.5-3.5 bar
   - **Status: NOT CHECKED**

#### Grinding Safety Gaps (U-PV09 Requirements)

1. **Wheel Peripheral Speed Limit** (CRITICAL)
   - Formula: v_wheel = π × d_wheel × RPM / 60000 [m/min]
   - Typical limit: 25-35 m/s (bond dependent)
   - HARD VETO at: v_wheel > 45 m/s (wheel explosion)
   - **Status: NO CHECK IN CODE**

2. **Burn Threshold** (PARTIAL)
   - Malkin model implemented: u [J/mm³]
   - Threshold: u > 15-20 J/mm³ = burn risk
   - Current: Only warns
   - **Recommendation: HARD VETO at u > 25 J/mm³**

3. **Dresser Compensation**
   - Wheel grit contact area drops ~1% per pass
   - Must adjust feed (f_d) or wheel speed
   - Code computes but doesn't track across sequence
   - **Status: INCOMPLETE**

4. **Wheel Grade Validation**
   - Tangential force F_t limit per grade
   - Code warns at line 1523 but doesn't reduce params
   - **Status: WEAK (warning only)**

#### Laser Safety Gaps (U-PV10 Requirements)

1. **Max Power per Material**
   - Steel: <3-5 kW (fiber), <2 kW (CO2)
   - Aluminum: <2 kW (good heat dissipation)
   - Stainless: <3 kW (low thermal conductivity)
   - **Status: NO MAPPING IMPLEMENTED**

2. **Beam Delivery Pressure**
   - Range: 1.5-3.0 bar (chiller pressure for optics cooling)
   - Too low → optics overheat
   - Too high → seal failure
   - **Status: NOT VALIDATED**

3. **Assist Gas Validation**
   - O2: high exothermic heat (steel), faster cut
   - N2: inert (stainless, aluminum, no oxidation)
   - Ar: high-temperature applications
   - Pressure: 2-8 bar depending on gas type and thickness
   - **Status: NOT IN CODE**

4. **Rapid Clearance Validation**
   - Pierce height: 3-5 mm above part
   - Fixture clearance: must not collide
   - Comment mentions "machine envelope check" but incomplete
   - **Status: SKELETON ONLY**

#### Waterjet Safety Gaps (U-PV10 Requirements)

1. **Max Pressure Rating** (CRITICAL)
   - Typical: 4000-6000 bar
   - High-pressure: 6000-8000 bar
   - Safety margin: operate at ≤80% of rated
   - **Status: NO CLAMPING LOGIC**

2. **Nozzle Wear Warning**
   - Lifespan: 100-500 hours depending on abrasive usage
   - Trigger tool change when: depth drops >20% or time > threshold
   - **Status: NO TRACKING IMPLEMENTED**

3. **Abrasive Flow Rate Limits**
   - Typical: 150-300 g/min for AWJ
   - Too high: waste and environmental
   - Too low: cut quality degrades
   - **Status: NOT CONSTRAINED**

4. **Machine Envelope Validation**
   - XY table limits for entry pierce points
   - Z clearance for abrasive delivery
   - **Status: CODE SAYS "INCOMPLETE"**

---

### 3. UNIVERSAL SAFETY GATE (U-PV11) ASSESSMENT

#### Current Specification
```
"Create a PostToolUse hook that fires after any pipeline G-code generation action.
Validates: machine axis limits (from MachineRegistry), spindle RPM max, feed rate max per axis,
rapid clearance Z height, coolant/gas/pressure within range. Applies to ALL 9 pipelines uniformly.
Mode: warn (not block) for now."
```

**Score: 35/100**

#### Scope Definition Issues

| Check | Coverage | Status |
|-------|----------|--------|
| Axis limits | ✓ | Good |
| Spindle RPM max | ✓ | Good |
| Feed rate max per axis | ⚠ | Incomplete (missing acceleration factor) |
| Rapid clearance Z | ⚠ | Vague (only catches obvious overshoot) |
| Coolant/gas/pressure | ✗ | Undefined ranges |
| Thermal damage (T > T_melt) | ✗ | CuttingTemperatureEngine exists but not integrated |
| Deflection stress risk | ✗ | Engine exists, not wired to gate |
| Chatter probability | ✗ | Engine exists, not wired to gate |
| Workholding grip force | ✗ | No engine exists |
| Collision risk | ✗ | PipelineSafetyOrchestratorEngine (E1093) has logic but not used |

#### Integration Gaps

1. **Missing Action List**
   - Hook specification says "after any pipeline action"
   - **But which actions?** Need explicit dispatcher list:
     - prism_cam:print_to_program
     - prism_turning:turning_program
     - prism_edm:edm_assemble
     - prism_laser:laser_assemble
     - prism_waterjet:waterjet_assemble
     - etc.
   - **Currently: UNDEFINED**

2. **MachineRegistry Field Mapping Undefined**
   - Hook says "validates from MachineRegistry"
   - Assumes fields exist:
     - spindle_specs.max_rpm ✓
     - axis_specs[].max_feed_rate ✓
     - **But: NO edm_capability, laser_capability, waterjet_capability schema**
   - **Currently: SCHEMA INCOMPLETE**

3. **Physics Integration Missing**
   - CuttingTemperatureEngine: computes T_predicted
   - ToolDeflectionEngine: computes stress
   - ChatterStabilityLobeEngine: computes P(chatter)
   - PipelineSafetyOrchestratorEngine: 6 risk dimensions
   - **All exist but not wired into U-PV11**
   - **Currently: DISCONNECTED**

#### Safety Mode Strategy Issues

**Current: Uniform "warn" mode**

**Problem: This is INSUFFICIENT for critical checks**

| Check | Current Mode | Required Mode | Risk if "warn" only |
|-------|--------------|----------------|-------------------|
| Axis limit overshoot | warn | BLOCK | Hardware crash |
| Spindle torque > max | warn | BLOCK | Bearing seizure |
| Power > 85% of machine | warn | BLOCK | Servo stall, collision |
| Workholding grip < 1.5× force | warn | BLOCK | Part ejection → SAFETY HAZARD |
| Thermal damage (T > T_melt) | warn | BLOCK | Workpiece damage, tool annealing |
| Chatter P > 0.15 | warn | WARN | Tool breakage (reasonable) |
| Coolant pressure ±20% | warn | WARN | Performance loss (acceptable) |
| Wire tension ±10% | warn | WARN | Minor quality issue (acceptable) |

**Recommendation: Implement tiered strategy**
```
HARD_BLOCK (risk_level = "critical"):
  - Axis overshoot
  - Spindle torque > limit
  - Power > machine capacity
  - Workholding safety factor < 1.5
  - Thermal damage (T_predicted > T_melt)
  - Collision probability > 0

SOFT_WARN (risk_level = "caution" or "warning"):
  - Chatter probability 0.05-0.15
  - Wire/nozzle wear > 80% of lifespan
  - Coolant pressure ±15%
  - Feed margin < 10% of machine max
```

**Currently: NO TIERING STRATEGY DEFINED**

---

### 4. MACHINE REGISTRY READINESS

#### Current Schema Coverage

```
PRESENT (chip-cutting):
✓ spindle_specs.max_rpm
✓ spindle_specs.power_continuous / power_30min / power_peak
✓ spindle_specs.torque_max
✓ spindle_specs.torque_continuous
✓ spindle_specs.coolant_pressure
✓ axis_specs[].max_feed_rate
✓ axis_specs[].travel
✓ axis_specs[].acceleration

MISSING (non-cutting):
✗ edm_capability (required for U-PV08)
✗ grinding_capability (required for U-PV09)
✗ laser_capability (required for U-PV10)
✗ waterjet_capability (required for U-PV10)
```

#### New Schema Fields Required

**EDM Capability Block:**
```typescript
edm_capability?: {
  max_discharge_energy_µJ: number;
  wire_tension_min_N: number;
  wire_tension_max_N: number;
  min_gap_voltage_V: number;
  max_gap_voltage_V: number;
  flushing_pressure_bar: number;
  flushing_pressure_max_bar: number;
  max_power_kW: number;
}
```

**Grinding Capability Block:**
```typescript
grinding_capability?: {
  max_wheel_peripheral_speed_mpm: number;  // meters/minute
  burn_threshold_specific_energy_JmmCube: number;
  max_tangential_force_N: number;
  dresser_profile_type: string;
  wheel_speed_options_rpm?: number[];
}
```

**Laser Capability Block:**
```typescript
laser_capability?: {
  max_power_kW: number;
  beam_delivery_pressure_min_bar: number;
  beam_delivery_pressure_max_bar: number;
  assist_gas_types: string[];  // ["O2", "N2", "Ar"]
  assist_gas_pressure_range_bar: [number, number];
  max_pierce_dwell_ms: number;
}
```

**Waterjet Capability Block:**
```typescript
waterjet_capability?: {
  max_pressure_bar: number;
  min_pressure_bar?: number;
  nozzle_lifespan_hours: number;
  max_abrasive_flow_gmin: number;
  table_envelope_XY_mm: [number, number];
  z_clearance_for_abrasive_delivery_mm: number;
}
```

**Status: ZERO FIELDS DEFINED**

---

### 5. COMPREHENSIVE SCORING SUMMARY

| Dimension | Score | Justification |
|-----------|-------|-----------------|
| **Pipeline Coverage** | 45/100 | Chip-cutting partial; EDM/Laser/Waterjet missing |
| **Domain Specificity** | 28/100 | Only Grinding has burn check; others empty |
| **Universal Gate Specification** | 35/100 | Scope vague; no action list; registry fields undefined |
| **Registry Schema Readiness** | 25/100 | Chip-cutting only; domain-specific blocks missing |
| **Safety Mode Strategy** | 30/100 | Uniform "warn" is dangerous; no tiering |
| **Physics Engine Integration** | 20/100 | Engines exist but disconnected from gate |
| **OVERALL SAFETY COVERAGE** | **31/100** | **CRITICAL GAPS IN DESIGN** |

---

## KEY FINDINGS

### Critical Issues

1. **EDM Safety: COMPLETELY MISSING** (U-PV08)
   - No discharge energy validation
   - No wire tension checking
   - No gap voltage limits
   - No flushing pressure requirements
   - Recommend: Create EDMSafetyValidatorEngine before implementation

2. **Waterjet Safety: COMPLETELY MISSING** (U-PV10)
   - No pressure clamping logic
   - No nozzle wear tracking
   - No abrasive flow limits
   - Recommend: Create WaterjetSafetyValidatorEngine before implementation

3. **Laser Safety: NEARLY MISSING** (U-PV10)
   - Only machine envelope check (incomplete)
   - No power limits per material
   - No assist gas validation
   - Recommend: Create LaserSafetyValidatorEngine before implementation

4. **Grinding Safety: PARTIAL** (U-PV09)
   - Burn check exists but only warns
   - No wheel speed validation (EXPLOSION RISK)
   - Recommend: Add wheel speed hard veto, upgrade burn check to block at u > 25 J/mm³

5. **Universal Gate Underspecified** (U-PV11)
   - No dispatcher action list
   - Registry fields undefined
   - Mode strategy dangerous (uniform "warn")
   - Physics engines not integrated
   - Recommend: Rewrite spec with tiered modes and explicit wiring

### Registry Impact

**PROBLEM:** MachineRegistry lacks domain-specific capability blocks
- PostProcessor can't query EDM discharge energy limits
- LaserAssembler can't validate beam pressure
- WaterjetAssembler can't clamp pressure
- GrindingAssembler can't validate wheel speed

**SOLUTION:** Add 4 new optional capability blocks to MachineRegistry.ts
- Backward compatible (optional fields)
- Can populate incrementally for key 50 machines
- Enables U-PV08/U-PV09/U-PV10 safety checks

---

## RECOMMENDATIONS FOR SPECIFICATION REVISION

### Before Implementation Starts

1. **Extend MachineRegistry** with edm_capability, grinding_capability, laser_capability, waterjet_capability
2. **Create domain safety engines:**
   - EDMSafetyValidatorEngine (discharge energy, wire tension, gap voltage, flushing)
   - GrindingWheelSpeedValidatorEngine (peripheral speed hard veto)
   - LaserSafetyValidatorEngine (power, beam pressure, assist gas)
   - WaterjetSafetyValidatorEngine (pressure clamping, nozzle tracking, abrasive flow)
3. **Rewrite U-PV11 specification with:**
   - Explicit dispatcher action list
   - Tiered mode strategy (HARD_BLOCK vs SOFT_WARN)
   - Physics engine integration (thermal, deflection, chatter, workholding)
   - MachineRegistry field mapping

### During Implementation

4. **U-PV08:** Require safety validator pass before G-code output
5. **U-PV09:** Add wheel speed HARD_BLOCK, upgrade burn check to block at u > 25
6. **U-PV10:** Require domain safety validators before output
7. **U-PV11:** Wire physics engines into hook, implement tiered modes

### Post-Implementation Validation

8. **Run integration tests on 9 pipelines with unsafe parameters**
   - Verify U-PV08/U-PV09/U-PV10 checks reject unsafe G-code
   - Verify U-PV11 hook fires and blocks appropriately

---

## FINAL VERDICT

**Safety coverage in PIPELINE-VAR-MS0 is INCOMPLETE and FRAGMENTED.**

- Specification recognizes need for safety across 9 pipelines (good intent)
- But execution lacks:
  - Domain-specific validation logic (EDM, Laser, Waterjet missing entirely)
  - Registry support (new capability fields undefined)
  - Physics integration (existing engines disconnected)
  - Risk-aware mode strategy (dangerous uniform "warn")

**Score: 31/100**

**Recommendation: Refine specification before full implementation. Address critical gaps in EDM, Laser, Waterjet validation and rewrite U-PV11 with explicit wiring and tiered safety modes.**

