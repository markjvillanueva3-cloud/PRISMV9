/**
 * DataValidationEngine — DQ-MS1 Data Quality Pipeline
 *
 * Validates manufacturing data integrity before it enters engines:
 * - Material property range checks
 * - Cutting parameter physics validation
 * - Cross-field consistency checks
 * - Data completeness scoring
 *
 * Actions: validate_material, validate_cutting_params,
 *          validate_job, data_quality_score
 */

// ── Types ──────────────────────────────────────────────────────────

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationIssue {
  field: string;
  severity: ValidationSeverity;
  message: string;
  expected?: string;
  actual?: string;
}

export interface ValidationResult {
  valid: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  checked_at: string;
}

interface RangeCheck {
  field: string;
  min: number;
  max: number;
  unit: string;
}

// ── Engine ─────────────────────────────────────────────────────────

export class DataValidationEngine {
  private validationCount = 0;

  /**
   * Validate material properties.
   */
  validateMaterial(data: {
    name?: string;
    hardness_hrc?: number;
    tensile_strength_mpa?: number;
    density_kg_m3?: number;
    thermal_conductivity?: number;
    iso_group?: string;
  }): ValidationResult {
    this.validationCount++;
    const issues: ValidationIssue[] = [];

    // Required fields
    if (!data.name) {
      issues.push({
        field: "name",
        severity: "error",
        message: "Material name is required",
      });
    }

    // Range checks
    const ranges: RangeCheck[] = [
      { field: "hardness_hrc", min: 0, max: 70, unit: "HRC" },
      { field: "tensile_strength_mpa", min: 50, max: 3000, unit: "MPa" },
      { field: "density_kg_m3", min: 1000, max: 22600, unit: "kg/m³" },
      { field: "thermal_conductivity", min: 5, max: 430, unit: "W/m·K" },
    ];

    for (const r of ranges) {
      const val = data[r.field as keyof typeof data] as number | undefined;
      if (val !== undefined) {
        if (val < r.min || val > r.max) {
          issues.push({
            field: r.field,
            severity: "error",
            message: `${r.field} out of range`,
            expected: `${r.min}–${r.max} ${r.unit}`,
            actual: `${val} ${r.unit}`,
          });
        }
      }
    }

    // ISO group validation
    const validGroups = ["P", "M", "K", "N", "S", "H", "O"];
    if (data.iso_group && !validGroups.includes(data.iso_group)) {
      issues.push({
        field: "iso_group",
        severity: "error",
        message: "Invalid ISO material group",
        expected: validGroups.join(", "),
        actual: data.iso_group,
      });
    }

    // Cross-field: high hardness should imply high tensile
    if (
      data.hardness_hrc !== undefined &&
      data.tensile_strength_mpa !== undefined
    ) {
      const expectedTensile = data.hardness_hrc * 34.5;
      const ratio = data.tensile_strength_mpa / expectedTensile;
      if (ratio < 0.5 || ratio > 2.0) {
        issues.push({
          field: "tensile_strength_mpa",
          severity: "warning",
          message: "Tensile/hardness ratio is unusual",
          expected: `~${Math.round(expectedTensile)} MPa for ${data.hardness_hrc} HRC`,
          actual: `${data.tensile_strength_mpa} MPa`,
        });
      }
    }

    return this._buildResult(issues, 5);
  }

  /**
   * Validate cutting parameters against physics limits.
   */
  validateCuttingParams(data: {
    speed_mpm?: number;
    feed_mmpt?: number;
    depth_mm?: number;
    width_mm?: number;
    tool_diameter_mm?: number;
    spindle_rpm?: number;
    material_group?: string;
  }): ValidationResult {
    this.validationCount++;
    const issues: ValidationIssue[] = [];

    // Positive value checks
    const positiveFields = [
      "speed_mpm", "feed_mmpt", "depth_mm",
      "width_mm", "tool_diameter_mm", "spindle_rpm",
    ] as const;
    for (const f of positiveFields) {
      const val = data[f];
      if (val !== undefined && val <= 0) {
        issues.push({
          field: f,
          severity: "error",
          message: `${f} must be positive`,
          actual: String(val),
        });
      }
    }

    // Speed/RPM consistency with tool diameter
    if (
      data.speed_mpm !== undefined &&
      data.spindle_rpm !== undefined &&
      data.tool_diameter_mm !== undefined
    ) {
      const calculatedSpeed =
        (Math.PI * data.tool_diameter_mm * data.spindle_rpm) / 1000;
      const ratio = calculatedSpeed / data.speed_mpm;
      if (ratio < 0.8 || ratio > 1.2) {
        issues.push({
          field: "speed_mpm",
          severity: "warning",
          message: "Speed/RPM/diameter inconsistency (>20% deviation)",
          expected: `${calculatedSpeed.toFixed(1)} m/min from RPM×D`,
          actual: `${data.speed_mpm} m/min specified`,
        });
      }
    }

    // Depth vs tool diameter
    if (
      data.depth_mm !== undefined &&
      data.tool_diameter_mm !== undefined
    ) {
      if (data.depth_mm > data.tool_diameter_mm * 3) {
        issues.push({
          field: "depth_mm",
          severity: "warning",
          message: "Depth exceeds 3× tool diameter — high deflection risk",
          expected: `≤${(data.tool_diameter_mm * 3).toFixed(1)} mm`,
          actual: `${data.depth_mm} mm`,
        });
      }
    }

    // Width vs tool diameter
    if (
      data.width_mm !== undefined &&
      data.tool_diameter_mm !== undefined
    ) {
      if (data.width_mm > data.tool_diameter_mm) {
        issues.push({
          field: "width_mm",
          severity: "error",
          message: "Radial width exceeds tool diameter",
          expected: `≤${data.tool_diameter_mm} mm`,
          actual: `${data.width_mm} mm`,
        });
      }
    }

    // Speed range by material group
    if (data.speed_mpm !== undefined && data.material_group) {
      const speedLimits: Record<string, number> = {
        P: 500, M: 300, K: 400, N: 1500, S: 120, H: 200,
      };
      const maxSpeed = speedLimits[data.material_group];
      if (maxSpeed && data.speed_mpm > maxSpeed) {
        issues.push({
          field: "speed_mpm",
          severity: "warning",
          message: `Speed exceeds typical max for ISO ${data.material_group}`,
          expected: `≤${maxSpeed} m/min`,
          actual: `${data.speed_mpm} m/min`,
        });
      }
    }

    return this._buildResult(issues, 7);
  }

  /**
   * Validate a job definition for completeness.
   */
  validateJob(data: {
    part_name?: string;
    material?: string;
    quantity?: number;
    operations?: Array<{ type: string; tool?: string }>;
    machine?: string;
    due_date?: string;
  }): ValidationResult {
    this.validationCount++;
    const issues: ValidationIssue[] = [];

    const requiredFields = [
      "part_name", "material", "quantity", "machine",
    ] as const;
    for (const f of requiredFields) {
      if (!data[f]) {
        issues.push({
          field: f,
          severity: "error",
          message: `${f} is required`,
        });
      }
    }

    if (data.quantity !== undefined && data.quantity <= 0) {
      issues.push({
        field: "quantity",
        severity: "error",
        message: "Quantity must be positive",
        actual: String(data.quantity),
      });
    }

    if (!data.operations || data.operations.length === 0) {
      issues.push({
        field: "operations",
        severity: "warning",
        message: "No operations defined — job may be incomplete",
      });
    }

    if (data.due_date) {
      const due = new Date(data.due_date);
      if (isNaN(due.getTime())) {
        issues.push({
          field: "due_date",
          severity: "error",
          message: "Invalid date format",
          actual: data.due_date,
        });
      } else if (due.getTime() < Date.now()) {
        issues.push({
          field: "due_date",
          severity: "warning",
          message: "Due date is in the past",
          actual: data.due_date,
        });
      }
    }

    return this._buildResult(issues, 6);
  }

  /**
   * Get validation statistics.
   */
  stats(): { validation_count: number } {
    return { validation_count: this.validationCount };
  }

  // ── Private ────────────────────────────────────────────────────

  private _buildResult(
    issues: ValidationIssue[],
    totalChecks: number
  ): ValidationResult {
    const errors = issues.filter(i => i.severity === "error").length;
    const warnings = issues.filter(i => i.severity === "warning").length;
    const score = Math.max(
      0,
      Math.round(100 - (errors * 100 / totalChecks) - (warnings * 30 / totalChecks))
    );

    return {
      valid: errors === 0,
      score,
      issues,
      checked_at: new Date().toISOString(),
    };
  }
}

export const dataValidationEngine = new DataValidationEngine();
