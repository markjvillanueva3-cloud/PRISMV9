/**
 * PRISM MCP Server - Validation Framework
 * Session 6.1: Input/Output Validators, Type Guards, Safety Checks
 * 
 * Core validation infrastructure for:
 * - Input validation (schemas, ranges, types)
 * - Output validation (completeness, format)
 * - Safety validation (S(x) calculation, limits)
 * - Type guards (runtime type checking)
 * - Anti-regression checks (count verification)
 * 
 * @version 1.0.0
 * @author PRISM Development Team
 */

import { log } from "./Logger.js";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type ValidationSeverity = "error" | "warning" | "info";
export type ValidationStatus = "valid" | "invalid" | "warning";

export interface ValidationIssue {
  field: string;
  message: string;
  severity: ValidationSeverity;
  expected?: unknown;
  actual?: unknown;
  code?: string;
}

export interface ValidationResult {
  valid: boolean;
  status: ValidationStatus;
  issues: ValidationIssue[];
  score?: number;  // 0-1 validity score
  metadata?: Record<string, unknown>;
}

export interface RangeSpec {
  min?: number;
  max?: number;
  inclusive?: boolean;
}

export interface FieldSpec {
  type: "string" | "number" | "boolean" | "array" | "object";
  required?: boolean;
  range?: RangeSpec;
  pattern?: RegExp;
  enum?: unknown[];
  minLength?: number;
  maxLength?: number;
  validator?: (value: unknown) => boolean;
}

export interface SchemaSpec {
  fields: Record<string, FieldSpec>;
  strict?: boolean;  // Reject unknown fields
}

// Safety score components
export interface SafetyComponents {
  physical_limits: { score: number; weight: number; pass: boolean; notes: string };
  force_safety: { score: number; weight: number; pass: boolean; notes: string };
  thermal_safety: { score: number; weight: number; pass: boolean; notes: string };
  tool_life: { score: number; weight: number; pass: boolean; notes: string };
  machine_capability: { score: number; weight: number; pass: boolean; notes: string };
  edge_cases: { score: number; weight: number; pass: boolean; notes: string };
}

export interface SafetyResult {
  score: number;
  status: "APPROVED" | "BLOCKED" | "WARNING";
  components: SafetyComponents;
  issues: string[];
  threshold: number;
}

// Anti-regression types
export interface CountResult {
  count: number;
  type: "array" | "object" | "lines" | "sections" | "exports";
  details?: string;
}

export interface RegressionCheckResult {
  safe: boolean;
  oldCount: number;
  newCount: number;
  difference: number;
  percentChange: number;
  type: string;
  message: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// ISO group ranges for Kienzle coefficients
export const KIENZLE_RANGES: Record<string, { kc1_1: [number, number]; mc: [number, number] }> = {
  P: { kc1_1: [1400, 2500], mc: [0.18, 0.30] },
  M: { kc1_1: [2000, 3200], mc: [0.22, 0.32] },
  K: { kc1_1: [800, 1400], mc: [0.20, 0.30] },
  N: { kc1_1: [400, 900], mc: [0.20, 0.35] },
  S: { kc1_1: [2400, 4000], mc: [0.22, 0.30] },
  H: { kc1_1: [2800, 4500], mc: [0.20, 0.28] }
};

// Taylor coefficient ranges
export const TAYLOR_RANGES: Record<string, { C: [number, number]; n: [number, number] }> = {
  P: { C: [150, 400], n: [0.15, 0.35] },
  M: { C: [80, 250], n: [0.12, 0.28] },
  K: { C: [200, 500], n: [0.20, 0.40] },
  N: { C: [400, 1200], n: [0.25, 0.50] },
  S: { C: [30, 120], n: [0.10, 0.25] },
  H: { C: [50, 200], n: [0.12, 0.25] }
};

// Physical property ranges
export const PHYSICAL_RANGES = {
  density: { min: 1.0, max: 25.0 },  // g/cm³
  melting_point: { min: 100, max: 4000 },  // °C
  thermal_conductivity: { min: 1, max: 500 },  // W/m·K
  specific_heat: { min: 100, max: 2000 },  // J/kg·K
  tensile_strength: { min: 50, max: 3000 },  // MPa
  yield_strength: { min: 30, max: 2500 },  // MPa
  hardness_hb: { min: 50, max: 800 },
  hardness_hrc: { min: 10, max: 70 },
  elongation: { min: 0, max: 80 }  // %
};

// Safety thresholds
export const SAFETY_THRESHOLD = 0.70;
export const COMPLETENESS_THRESHOLD = 0.80;
export const REGRESSION_THRESHOLD = 0.20;  // Max 20% reduction allowed

// ============================================================================
// INPUT VALIDATORS
// ============================================================================

/**
 * Validate a value against a field specification
 */
export function validateField(
  value: unknown,
  spec: FieldSpec,
  fieldName: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check required
  if (spec.required && (value === undefined || value === null || value === "")) {
    issues.push({
      field: fieldName,
      message: `Required field is missing`,
      severity: "error",
      code: "REQUIRED"
    });
    return issues;
  }

  // Skip further validation if not provided and not required
  if (value === undefined || value === null) {
    return issues;
  }

  // Type check
  const actualType = Array.isArray(value) ? "array" : typeof value;
  if (actualType !== spec.type) {
    issues.push({
      field: fieldName,
      message: `Expected ${spec.type}, got ${actualType}`,
      severity: "error",
      expected: spec.type,
      actual: actualType,
      code: "TYPE_MISMATCH"
    });
    return issues;
  }

  // Number range check
  if (spec.type === "number" && spec.range) {
    const num = value as number;
    const inclusive = spec.range.inclusive !== false;
    
    if (spec.range.min !== undefined) {
      const minOk = inclusive ? num >= spec.range.min : num > spec.range.min;
      if (!minOk) {
        issues.push({
          field: fieldName,
          message: `Value ${num} is below minimum ${spec.range.min}`,
          severity: "error",
          expected: `>= ${spec.range.min}`,
          actual: num,
          code: "RANGE_MIN"
        });
      }
    }
    
    if (spec.range.max !== undefined) {
      const maxOk = inclusive ? num <= spec.range.max : num < spec.range.max;
      if (!maxOk) {
        issues.push({
          field: fieldName,
          message: `Value ${num} exceeds maximum ${spec.range.max}`,
          severity: "error",
          expected: `<= ${spec.range.max}`,
          actual: num,
          code: "RANGE_MAX"
        });
      }
    }
  }

  // String pattern check
  if (spec.type === "string" && spec.pattern) {
    const str = value as string;
    if (!spec.pattern.test(str)) {
      issues.push({
        field: fieldName,
        message: `Value does not match required pattern`,
        severity: "error",
        expected: spec.pattern.toString(),
        actual: str,
        code: "PATTERN_MISMATCH"
      });
    }
  }

  // String length check
  if (spec.type === "string") {
    const str = value as string;
    if (spec.minLength !== undefined && str.length < spec.minLength) {
      issues.push({
        field: fieldName,
        message: `String length ${str.length} is below minimum ${spec.minLength}`,
        severity: "error",
        code: "MIN_LENGTH"
      });
    }
    if (spec.maxLength !== undefined && str.length > spec.maxLength) {
      issues.push({
        field: fieldName,
        message: `String length ${str.length} exceeds maximum ${spec.maxLength}`,
        severity: "error",
        code: "MAX_LENGTH"
      });
    }
  }

  // Array length check
  if (spec.type === "array") {
    const arr = value as unknown[];
    if (spec.minLength !== undefined && arr.length < spec.minLength) {
      issues.push({
        field: fieldName,
        message: `Array length ${arr.length} is below minimum ${spec.minLength}`,
        severity: "error",
        code: "MIN_LENGTH"
      });
    }
    if (spec.maxLength !== undefined && arr.length > spec.maxLength) {
      issues.push({
        field: fieldName,
        message: `Array length ${arr.length} exceeds maximum ${spec.maxLength}`,
        severity: "error",
        code: "MAX_LENGTH"
      });
    }
  }

  // Enum check
  if (spec.enum && !spec.enum.includes(value)) {
    issues.push({
      field: fieldName,
      message: `Value not in allowed set: ${spec.enum.join(", ")}`,
      severity: "error",
      expected: spec.enum,
      actual: value,
      code: "ENUM_MISMATCH"
    });
  }

  // Custom validator
  if (spec.validator && !spec.validator(value)) {
    issues.push({
      field: fieldName,
      message: `Custom validation failed`,
      severity: "error",
      code: "CUSTOM_VALIDATION"
    });
  }

  return issues;
}

/**
 * Validate an object against a schema
 */
export function validateSchema(
  data: Record<string, unknown>,
  schema: SchemaSpec
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Check each field in schema
  for (const [fieldName, spec] of Object.entries(schema.fields)) {
    const fieldIssues = validateField(data[fieldName], spec, fieldName);
    issues.push(...fieldIssues);
  }

  // Check for unknown fields if strict
  if (schema.strict) {
    for (const key of Object.keys(data)) {
      if (!(key in schema.fields)) {
        issues.push({
          field: key,
          message: `Unknown field in strict schema`,
          severity: "warning",
          code: "UNKNOWN_FIELD"
        });
      }
    }
  }

  const errorCount = issues.filter(i => i.severity === "error").length;
  const valid = errorCount === 0;

  return {
    valid,
    status: valid ? "valid" : "invalid",
    issues,
    score: 1 - (errorCount / Math.max(Object.keys(schema.fields).length, 1))
  };
}

// ============================================================================
// MANUFACTURING VALIDATORS
// ============================================================================

/**
 * Validate Kienzle coefficients against known ranges
 */
export function validateKienzle(
  kc1_1: number,
  mc: number,
  isoGroup: string
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const ranges = KIENZLE_RANGES[isoGroup] || KIENZLE_RANGES.P;

  // Validate kc1.1
  if (kc1_1 < ranges.kc1_1[0] || kc1_1 > ranges.kc1_1[1]) {
    const severity = kc1_1 < ranges.kc1_1[0] * 0.8 || kc1_1 > ranges.kc1_1[1] * 1.2 
      ? "error" : "warning";
    issues.push({
      field: "kc1_1",
      message: `kc1.1=${kc1_1} outside expected range [${ranges.kc1_1[0]}-${ranges.kc1_1[1]}] for ISO ${isoGroup}`,
      severity,
      expected: ranges.kc1_1,
      actual: kc1_1,
      code: "KIENZLE_KC_RANGE"
    });
  }

  // Validate mc
  if (mc < ranges.mc[0] || mc > ranges.mc[1]) {
    const severity = mc < ranges.mc[0] * 0.8 || mc > ranges.mc[1] * 1.2 
      ? "error" : "warning";
    issues.push({
      field: "mc",
      message: `mc=${mc} outside expected range [${ranges.mc[0]}-${ranges.mc[1]}] for ISO ${isoGroup}`,
      severity,
      expected: ranges.mc,
      actual: mc,
      code: "KIENZLE_MC_RANGE"
    });
  }

  const errorCount = issues.filter(i => i.severity === "error").length;

  return {
    valid: errorCount === 0,
    status: errorCount === 0 ? (issues.length === 0 ? "valid" : "warning") : "invalid",
    issues,
    score: issues.length === 0 ? 1.0 : (issues.length === 1 ? 0.7 : 0.4),
    metadata: { isoGroup, ranges }
  };
}

/**
 * Validate Taylor tool life coefficients
 */
export function validateTaylor(
  C: number,
  n: number,
  isoGroup: string
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const ranges = TAYLOR_RANGES[isoGroup] || TAYLOR_RANGES.P;

  // Validate C
  if (C < ranges.C[0] || C > ranges.C[1]) {
    issues.push({
      field: "C",
      message: `Taylor C=${C} outside expected range [${ranges.C[0]}-${ranges.C[1]}] for ISO ${isoGroup}`,
      severity: C < ranges.C[0] * 0.5 || C > ranges.C[1] * 2 ? "error" : "warning",
      expected: ranges.C,
      actual: C,
      code: "TAYLOR_C_RANGE"
    });
  }

  // Validate n
  if (n < ranges.n[0] || n > ranges.n[1]) {
    issues.push({
      field: "n",
      message: `Taylor n=${n} outside expected range [${ranges.n[0]}-${ranges.n[1]}] for ISO ${isoGroup}`,
      severity: n < 0.05 || n > 0.6 ? "error" : "warning",
      expected: ranges.n,
      actual: n,
      code: "TAYLOR_N_RANGE"
    });
  }

  const errorCount = issues.filter(i => i.severity === "error").length;

  return {
    valid: errorCount === 0,
    status: errorCount === 0 ? (issues.length === 0 ? "valid" : "warning") : "invalid",
    issues,
    score: issues.length === 0 ? 1.0 : (issues.length === 1 ? 0.7 : 0.4),
    metadata: { isoGroup, ranges }
  };
}

/**
 * Validate Johnson-Cook parameters for physical consistency
 */
export function validateJohnsonCook(
  A: number,
  B: number,
  n: number,
  C: number,
  m: number,
  yieldStrength?: number,
  tensileStrength?: number
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // A should approximate yield strength
  if (yieldStrength && Math.abs(A - yieldStrength) / yieldStrength > 0.3) {
    issues.push({
      field: "A",
      message: `J-C A=${A} MPa differs >30% from yield strength ${yieldStrength} MPa`,
      severity: "warning",
      expected: yieldStrength,
      actual: A,
      code: "JC_A_YIELD"
    });
  }

  // A + B should approximate tensile strength
  if (tensileStrength) {
    const sum = A + B;
    if (Math.abs(sum - tensileStrength) / tensileStrength > 0.3) {
      issues.push({
        field: "B",
        message: `J-C A+B=${sum} MPa differs >30% from tensile strength ${tensileStrength} MPa`,
        severity: "warning",
        expected: tensileStrength,
        actual: sum,
        code: "JC_AB_TENSILE"
      });
    }
  }

  // n should be 0 < n < 1
  if (n <= 0 || n >= 1) {
    issues.push({
      field: "n",
      message: `J-C strain hardening exponent n=${n} must be 0 < n < 1`,
      severity: "error",
      expected: "0 < n < 1",
      actual: n,
      code: "JC_N_RANGE"
    });
  }

  // C should be small positive (typically 0.001-0.1)
  if (C < 0 || C > 0.2) {
    issues.push({
      field: "C",
      message: `J-C strain rate coefficient C=${C} outside typical range [0, 0.2]`,
      severity: "warning",
      expected: "[0, 0.2]",
      actual: C,
      code: "JC_C_RANGE"
    });
  }

  // m should be positive (typically 0.5-1.5)
  if (m < 0.3 || m > 2.0) {
    issues.push({
      field: "m",
      message: `J-C thermal softening exponent m=${m} outside typical range [0.3, 2.0]`,
      severity: "warning",
      expected: "[0.3, 2.0]",
      actual: m,
      code: "JC_M_RANGE"
    });
  }

  const errorCount = issues.filter(i => i.severity === "error").length;

  return {
    valid: errorCount === 0,
    status: errorCount === 0 ? (issues.length === 0 ? "valid" : "warning") : "invalid",
    issues,
    score: 1 - (issues.length * 0.15)
  };
}

// ============================================================================
// SAFETY VALIDATION (S(x) CALCULATION)
// ============================================================================

/**
 * Compute safety score S(x) for a material
 * Returns score 0-1, BLOCKED if < 0.70
 */
export function computeSafetyScore(material: Record<string, unknown>): SafetyResult {
  const components: SafetyComponents = {
    physical_limits: { score: 0, weight: 0.20, pass: false, notes: "" },
    force_safety: { score: 0, weight: 0.20, pass: false, notes: "" },
    thermal_safety: { score: 0, weight: 0.15, pass: false, notes: "" },
    tool_life: { score: 0, weight: 0.15, pass: false, notes: "" },
    machine_capability: { score: 0, weight: 0.15, pass: false, notes: "" },
    edge_cases: { score: 0, weight: 0.15, pass: false, notes: "" }
  };

  const issues: string[] = [];

  // 1. Physical limits check (density, melting point, etc.)
  const density = material.density as number | undefined;
  const meltingPoint = material.melting_point as number | undefined;
  
  // Accept density in kg/m³ (>100) or g/cm³ (<100), normalize to g/cm³
  const densityGcm3 = density !== undefined ? (density > 100 ? density / 1000 : density) : undefined;
  if (densityGcm3 !== undefined && densityGcm3 > 0 && densityGcm3 < 25) {
    components.physical_limits.score += 0.5;
  } else if (densityGcm3 !== undefined) {
    issues.push(`Density ${densityGcm3} g/cm³ outside valid range (0-25)`);
  } else {
    issues.push("Missing density");
  }

  if (meltingPoint !== undefined && meltingPoint > 100 && meltingPoint < 4000) {
    components.physical_limits.score += 0.5;
  } else if (meltingPoint !== undefined) {
    issues.push(`Melting point ${meltingPoint}°C outside valid range`);
  }

  components.physical_limits.pass = components.physical_limits.score >= 0.7;

  // 2. Force safety (Kienzle coefficients)
  const kc1_1 = material.kc1_1 as number | undefined;
  const mc = material.mc as number | undefined;
  const isoGroup = (material.iso_group as string) || "P";

  if (kc1_1 !== undefined && mc !== undefined) {
    const kienzleResult = validateKienzle(kc1_1, mc, isoGroup);
    components.force_safety.score = kienzleResult.score ?? 0;
    components.force_safety.pass = kienzleResult.valid;
    if (!kienzleResult.valid) {
      issues.push(...kienzleResult.issues.map(i => i.message));
    }
  } else {
    issues.push("Missing Kienzle coefficients (kc1.1, mc)");
  }

  // 3. Thermal safety
  const thermalConductivity = material.thermal_conductivity as number | undefined;
  const specificHeat = material.specific_heat as number | undefined;

  if (thermalConductivity !== undefined && specificHeat !== undefined) {
    components.thermal_safety.score = 1.0;
    components.thermal_safety.pass = true;
  } else {
    components.thermal_safety.score = 0.5;  // Partial credit
    issues.push("Missing thermal properties (conductivity, specific heat)");
  }

  // 4. Tool life (Taylor coefficients)
  const taylorC = material.taylor_C as number | undefined;
  const taylorN = material.taylor_n as number | undefined;

  if (taylorC !== undefined && taylorN !== undefined) {
    const taylorResult = validateTaylor(taylorC, taylorN, isoGroup);
    components.tool_life.score = taylorResult.score ?? 0;
    components.tool_life.pass = taylorResult.valid;
    if (!taylorResult.valid) {
      issues.push(...taylorResult.issues.map(i => i.message));
    }
  } else {
    issues.push("Missing Taylor coefficients (C, n)");
  }

  // 5. Machine capability (basic check - has required speed/feed recommendations)
  const v30 = material.V30 as number | undefined;
  const recommendedSpeed = material.recommended_cutting_speed as number | undefined;

  if (v30 !== undefined || recommendedSpeed !== undefined) {
    components.machine_capability.score = 1.0;
    components.machine_capability.pass = true;
  } else {
    components.machine_capability.score = 0.5;
    issues.push("Missing speed recommendations (V30 or recommended_cutting_speed)");
  }

  // 6. Edge cases (hardness range, multiple conditions)
  const hardnessMin = material.hardness_min as number | undefined;
  const hardnessMax = material.hardness_max as number | undefined;

  if (hardnessMin !== undefined && hardnessMax !== undefined) {
    if (hardnessMax >= hardnessMin) {
      components.edge_cases.score = 1.0;
      components.edge_cases.pass = true;
    } else {
      issues.push(`Hardness range invalid: max ${hardnessMax} < min ${hardnessMin}`);
    }
  } else {
    components.edge_cases.score = 0.5;
    issues.push("Missing hardness range");
  }

  // Calculate total weighted score
  let totalScore = 0;
  for (const comp of Object.values(components)) {
    totalScore += comp.score * comp.weight;
  }

  // Determine status
  let status: SafetyResult["status"];
  if (totalScore >= SAFETY_THRESHOLD) {
    status = "APPROVED";
  } else if (totalScore >= SAFETY_THRESHOLD * 0.85) {
    status = "WARNING";
  } else {
    status = "BLOCKED";
  }

  return {
    score: Math.round(totalScore * 1000) / 1000,
    status,
    components,
    issues,
    threshold: SAFETY_THRESHOLD
  };
}

// ============================================================================
// COMPLETENESS VALIDATION
// ============================================================================

/**
 * Material parameter requirements (127 parameters)
 */
export const MATERIAL_REQUIRED_PARAMS = {
  critical: [
    "material_id", "name", "iso_group", "category",
    "density", "tensile_strength", "yield_strength",
    "hardness_min", "hardness_max",
    "kc1_1", "mc"
  ],
  important: [
    "standard", "uns_number", "description",
    "melting_point", "thermal_conductivity", "specific_heat",
    "elongation", "elastic_modulus",
    "taylor_C", "taylor_n", "V30",
    "kc1_1_finishing", "mc_finishing"
  ],
  optional: [
    "johnson_cook_A", "johnson_cook_B", "johnson_cook_n", 
    "johnson_cook_C", "johnson_cook_m",
    "chip_breakability", "machinability_rating",
    "recommended_cutting_speed", "recommended_feed_per_tooth"
  ]
};

/**
 * Check material parameter completeness
 */
export function checkMaterialCompleteness(
  material: Record<string, unknown>
): { percentage: number; filled: number; total: number; missing: string[]; level: string } {
  const allParams = [
    ...MATERIAL_REQUIRED_PARAMS.critical,
    ...MATERIAL_REQUIRED_PARAMS.important,
    ...MATERIAL_REQUIRED_PARAMS.optional
  ];

  const missing: string[] = [];
  let filled = 0;

  for (const param of allParams) {
    const value = material[param];
    if (value !== undefined && value !== null && value !== "") {
      filled++;
    } else {
      missing.push(param);
    }
  }

  const percentage = filled / allParams.length;

  // Check critical completeness
  const criticalMissing = MATERIAL_REQUIRED_PARAMS.critical.filter(
    p => material[p] === undefined || material[p] === null || material[p] === ""
  );

  let level: string;
  if (criticalMissing.length > 0) {
    level = "INCOMPLETE_CRITICAL";
  } else if (percentage >= 0.95) {
    level = "COMPLETE";
  } else if (percentage >= COMPLETENESS_THRESHOLD) {
    level = "ACCEPTABLE";
  } else {
    level = "INCOMPLETE";
  }

  return {
    percentage: Math.round(percentage * 1000) / 1000,
    filled,
    total: allParams.length,
    missing,
    level
  };
}

// ============================================================================
// ANTI-REGRESSION VALIDATION
// ============================================================================

/**
 * Count items in content based on type
 */
export function countItems(content: string, fileType: string): CountResult {
  // JSON files
  if (fileType === "json" || fileType.endsWith(".json")) {
    try {
      const data = JSON.parse(content);
      
      if (Array.isArray(data)) {
        return { count: data.length, type: "array", details: "Root array" };
      }
      
      // Check for common PRISM structures
      if (data.materials) return { count: data.materials.length, type: "array", details: "materials" };
      if (data.machines) return { count: data.machines.length, type: "array", details: "machines" };
      if (data.alarms) return { count: data.alarms.length, type: "array", details: "alarms" };
      if (data.tools) return { count: data.tools.length, type: "array", details: "tools" };
      if (data.formulas) return { count: data.formulas.length, type: "array", details: "formulas" };
      if (data.skills) return { count: data.skills.length, type: "array", details: "skills" };
      if (data.scripts) return { count: data.scripts.length, type: "array", details: "scripts" };
      if (data.agents) return { count: data.agents.length, type: "array", details: "agents" };
      if (data.hooks) return { count: data.hooks.length, type: "array", details: "hooks" };
      
      return { count: Object.keys(data).length, type: "object", details: "Object keys" };
    } catch {
      return { count: content.split("\n").length, type: "lines", details: "Failed JSON parse" };
    }
  }

  // Markdown files
  if (fileType === "md" || fileType.endsWith(".md")) {
    const sections = content.match(/^#{1,3}\s/gm);
    return { 
      count: sections ? sections.length : content.split("\n").length,
      type: sections ? "sections" : "lines",
      details: sections ? "Markdown sections" : "Lines"
    };
  }

  // TypeScript/JavaScript
  if (fileType.match(/\.(ts|js|tsx|jsx)$/)) {
    const exports = content.match(/export\s+(const|function|class|interface|type|enum)/g);
    return {
      count: exports ? exports.length : content.split("\n").length,
      type: exports ? "exports" : "lines",
      details: exports ? "Exports" : "Lines"
    };
  }

  // Default: line count
  return { count: content.split("\n").length, type: "lines", details: "Lines" };
}

/**
 * Check for anti-regression before file replacement
 */
export function checkAntiRegression(
  oldContent: string,
  newContent: string,
  fileType: string
): RegressionCheckResult {
  const oldResult = countItems(oldContent, fileType);
  const newResult = countItems(newContent, fileType);

  const difference = newResult.count - oldResult.count;
  const percentChange = oldResult.count > 0 
    ? (difference / oldResult.count) * 100 
    : (newResult.count > 0 ? 100 : 0);

  // Safe if new >= old, or reduction is within threshold
  const safe = newResult.count >= oldResult.count || 
    Math.abs(percentChange) <= REGRESSION_THRESHOLD * 100;

  let message: string;
  if (safe) {
    if (difference > 0) {
      message = `✓ Anti-regression PASS: ${oldResult.count} → ${newResult.count} (+${difference} ${oldResult.type})`;
    } else if (difference === 0) {
      message = `✓ Anti-regression PASS: ${oldResult.count} ${oldResult.type} (no change)`;
    } else {
      message = `⚠ Anti-regression WARNING: ${oldResult.count} → ${newResult.count} (${difference} ${oldResult.type}, within threshold)`;
    }
  } else {
    message = `🚫 Anti-regression BLOCK: ${oldResult.count} → ${newResult.count} (${difference} ${oldResult.type} LOST, ${percentChange.toFixed(1)}% reduction)`;
  }

  return {
    safe,
    oldCount: oldResult.count,
    newCount: newResult.count,
    difference,
    percentChange: Math.round(percentChange * 10) / 10,
    type: oldResult.type,
    message
  };
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

export function isPositiveNumber(value: unknown): value is number {
  return isNumber(value) && value > 0;
}

export function isInRange(value: unknown, min: number, max: number): value is number {
  return isNumber(value) && value >= min && value <= max;
}

export function isValidISOGroup(value: unknown): value is string {
  return isString(value) && ["P", "M", "K", "N", "S", "H"].includes(value);
}

export function isValidSeverity(value: unknown): value is string {
  return isString(value) && ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].includes(value);
}

// ============================================================================
// COMPOSITE VALIDATORS
// ============================================================================

/**
 * Full material validation combining all checks
 */
export function validateMaterial(material: Record<string, unknown>): {
  valid: boolean;
  safety: SafetyResult;
  completeness: ReturnType<typeof checkMaterialCompleteness>;
  issues: ValidationIssue[];
} {
  const issues: ValidationIssue[] = [];

  // Safety check
  const safety = computeSafetyScore(material);
  if (safety.status === "BLOCKED") {
    issues.push({
      field: "safety",
      message: `Safety score ${safety.score} below threshold ${safety.threshold}`,
      severity: "error",
      code: "SAFETY_BLOCKED"
    });
  }

  // Completeness check
  const completeness = checkMaterialCompleteness(material);
  if (completeness.percentage < COMPLETENESS_THRESHOLD) {
    issues.push({
      field: "completeness",
      message: `Completeness ${(completeness.percentage * 100).toFixed(1)}% below threshold ${COMPLETENESS_THRESHOLD * 100}%`,
      severity: "error",
      code: "INCOMPLETE"
    });
  }

  // Add safety issues
  for (const issue of safety.issues) {
    issues.push({
      field: "safety",
      message: issue,
      severity: "warning",
      code: "SAFETY_ISSUE"
    });
  }

  const valid = safety.status !== "BLOCKED" && completeness.percentage >= COMPLETENESS_THRESHOLD;

  return { valid, safety, completeness, issues };
}

// ============================================================================
// LOGGING INTEGRATION
// ============================================================================

/**
 * Log validation result
 */
export function logValidation(
  context: string,
  result: ValidationResult | SafetyResult | RegressionCheckResult
): void {
  if ("valid" in result) {
    if (result.valid) {
      log.info(`[Validation] ${context}: PASS`, { issues: result.issues.length });
    } else {
      log.warn(`[Validation] ${context}: FAIL`, { 
        issues: result.issues.map(i => `${i.field}: ${i.message}`)
      });
    }
  } else if ("safe" in result) {
    if (result.safe) {
      log.info(`[AntiRegression] ${context}: ${result.message}`);
    } else {
      log.error(`[AntiRegression] ${context}: ${result.message}`);
    }
  } else if ("status" in result) {
    const r = result as SafetyResult;
    if (r.status === "APPROVED") {
      log.info(`[Safety] ${context}: S(x)=${r.score.toFixed(3)} APPROVED`);
    } else if (r.status === "WARNING") {
      log.warn(`[Safety] ${context}: S(x)=${r.score.toFixed(3)} WARNING`);
    } else {
      log.error(`[Safety] ${context}: S(x)=${r.score.toFixed(3)} BLOCKED`);
    }
  }
}
