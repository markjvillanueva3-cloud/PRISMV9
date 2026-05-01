---
name: prism-manufacturing-safety
description: |
  Manufacturing-specific safety coding: G-code security, physical bounds checking,
  safety-critical path classification, and PRISM quality thresholds.
  Extracted from: code-perfection, code-safety.
  Generic SE security content removed (covered by Claude Code + OWASP awareness).
version: 2.0.0
triggers:
  - "safety critical"
  - "g-code security"
  - "bounds check"
  - "physical limits"
  - "safety threshold"
  - "machine control"
  - "SAFETY_LIMITS"
---

# PRISM Manufacturing Safety
## G-Code Security, Bounds Checking & Safety-Critical Paths

---

## 1. G-Code Security Rules (Manufacturing-Specific)

```
MANDATORY BEFORE ANY G-CODE EXECUTION:
1. NEVER execute unvalidated G-code — could cause machine crash, injury
2. VALIDATE coordinate bounds before sending to controller
3. CHECK tool numbers against magazine inventory
4. RATE-LIMIT rapid moves — validate clearance planes
5. AUDIT TRAIL for all machine commands — no silent operations
6. VALIDATE spindle speed against tool diameter → surface speed limit
7. CHECK feedrate against material/tool capabilities
```

### G-Code Validation Checklist
```
□ All coordinates within machine work envelope?
□ Tool number exists in magazine?
□ Spindle RPM ≤ tool max RPM?
□ Surface speed ≤ material max Vc?
□ Feed rate within tool manufacturer limits?
□ Rapid moves have safe clearance plane?
□ No collision with fixtures/clamps?
□ Coolant type compatible with material?
□ Emergency stop path verified?
```

---

## 2. Physical Bounds Checking (SAFETY_LIMITS)

### Mandatory Range Validation
```typescript
const SAFETY_LIMITS = {
  // Speed
  spindle_rpm: { min: 0, max: 60000 },     // RPM
  surface_speed: { min: 0, max: 2000 },     // m/min

  // Feed
  feed_per_tooth: { min: 0.001, max: 2.0 }, // mm/tooth
  feed_rate: { min: 0, max: 50000 },         // mm/min

  // Depth
  axial_depth: { min: 0, max: 100 },         // mm
  radial_depth: { min: 0, max: 200 },        // mm

  // Force
  cutting_force: { min: 0, max: 50000 },     // N
  torque: { min: 0, max: 5000 },             // N·m
  power: { min: 0, max: 200 },               // kW

  // Temperature
  cutting_temp: { min: 0, max: 1500 },       // °C

  // Material properties
  hardness: { min: 0, max: 70 },             // HRC
  kc1_1: { min: 100, max: 10000 },           // N/mm²
  mc: { min: 0.05, max: 0.50 },              // dimensionless
  taylor_n: { min: 0.05, max: 0.80 },        // dimensionless
  taylor_C: { min: 10, max: 3000 },          // m/min
};

// EVERY calculation input MUST pass through this
function validatePhysicalBounds(param: string, value: number): void {
  const limits = SAFETY_LIMITS[param];
  if (!limits) return; // Unknown param — log warning
  if (value < limits.min || value > limits.max) {
    throw new SafetyLimitError(
      `${param}=${value} outside safe range [${limits.min}, ${limits.max}]`
    );
  }
}
```

---

## 3. Safety-Critical Path Classification

### PRISM Safety-Critical Code Paths
```typescript
const SAFETY_CRITICAL_PATHS = [
  'src/engines/*',              // All physics engines
  'src/tools/dispatchers/calcDispatcher.ts',   // Calculation dispatch
  'src/tools/dispatchers/safetyDispatcher.ts', // Safety validation
  'src/engines/IntelligenceEngine.ts',         // Composed actions (R3)
];

// Safety-critical actions (from safetyDispatcher — 29 actions)
const SAFETY_ACTIONS = [
  'check_toolpath_collision',
  'validate_rapid_moves',
  'check_fixture_clearance',
  'detect_near_miss',
  'check_spindle_torque',
  'check_spindle_power',
  'validate_spindle_speed',
  'predict_tool_breakage',
  'calculate_tool_stress',
  'check_chip_load_limits',
  'calculate_clamp_force_required',
  'validate_workholding_setup',
  'check_pullout_resistance',
  'analyze_liftoff_moment',
];
```

### Quality Thresholds by Code Type

| Code Type | C_min | Correctness | Coverage | Security |
|-----------|-------|-------------|----------|----------|
| **Safety-critical** | 0.90 | 0.99 | 100% branch | 0.95 |
| **Standard** | 0.70 | 0.80 | ≥80% line | 0.80 |
| **Prototype** | 0.50 | 0.60 | ≥50% line | 0.70 |

**Rule: Safety-critical code NEVER ships with C(x) < 0.90.**

---

## 4. Material Data Validation

### Before Any Calculation
```typescript
function validateMaterialForCalculation(material: unknown): Result<Material> {
  // 1. Type check — is it a valid material object?
  if (!isMaterial(material)) {
    return { success: false, error: new TypeError('Not a valid material') };
  }

  // 2. Required fields for cutting calculations
  const required = ['kc1_1', 'mc', 'hardness'];
  const missing = required.filter(f => material[f] === undefined);
  if (missing.length > 0) {
    return { success: false, error: new DataQualityError(`Missing: ${missing}`) };
  }

  // 3. Physical bounds check
  for (const [param, value] of Object.entries(material)) {
    if (SAFETY_LIMITS[param]) {
      validatePhysicalBounds(param, value as number);
    }
  }

  // 4. Cross-validation — kc1_1 and hardness should be correlated
  if (material.hardness > 50 && material.kc1_1 < 2000) {
    console.warn('Suspect data: high hardness but low kc1.1 — verify material');
  }

  return { success: true, value: material as Material };
}
```

---

## 5. Type Safety for Physical Units

### Branded Types (Prevent Unit Confusion)
```typescript
type Millimeters = number & { readonly __brand: 'mm' };
type MetersPerMin = number & { readonly __brand: 'm/min' };
type RPM = number & { readonly __brand: 'rpm' };
type Newtons = number & { readonly __brand: 'N' };
type NewtonsPerMmSq = number & { readonly __brand: 'N/mm²' };

// Compiler prevents mixing units:
// addLength(mm_value, inch_value) → TYPE ERROR
function createMM(value: number): Millimeters { return value as Millimeters; }
```

### Result Types for Fallible Operations
```typescript
type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

// Forces callers to check success before accessing value
// Never use thrown exceptions for expected failures
```

---

## 6. Machine Command Audit Trail

```typescript
interface MachineCommandAudit {
  timestamp: string;
  command: string;           // G-code line or API call
  source: string;            // Which engine/dispatcher generated it
  parameters: Record<string, number>;  // Input params used
  validation: {
    boundsChecked: boolean;
    collisionChecked: boolean;
    safetyScore: number;     // S(x) at time of generation
  };
  user: string;              // Who initiated the request
}

// EVERY machine command must be logged before execution
function auditMachineCommand(cmd: MachineCommandAudit): void {
  if (!cmd.validation.boundsChecked) {
    throw new SafetyLimitError('Cannot execute unvalidated machine command');
  }
  appendAuditLog(cmd); // Append-only — never modify audit trail
}
```

---

## Source Skills Consolidated

| Original Skill | Lines | Retained Content |
|----------------|-------|-----------------|
| prism-code-perfection | 905 | Safety thresholds, safety-critical paths, quality gates |
| prism-code-safety | 155 | G-code security, branded types, result types |
| **Total source** | **~1060** | |
| **This skill** | **~240** | **77% reduction** |

---

*Consolidated: 2026-02-21 | Per SKILL_AUDIT.md R2-MS5 recommendations*
