/**
 * MachineEnvelopeGuardEngine — Machine limit enforcement middleware
 *
 * Validates and clamps G-code parameters against machine capabilities:
 *   1. RPM ≤ max_spindle_rpm (all machining pipelines)
 *   2. Feed ≤ rapid_traverse_rate (per axis or composite)
 *   3. XYZ within work_volume (travel limits)
 *   4. Power ≤ max_power_kW (from cutting force estimate)
 *
 * Designed to be called by ANY pipeline before G-code output.
 * Returns clamped values + warnings, never silently passes violations.
 *
 * @module engines/MachineEnvelopeGuardEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MachineEnvelope {
  max_rpm?: number;
  min_rpm?: number;
  max_power_kW?: number;
  max_feed_mm_min?: number;         // max cutting feed rate
  rapid_rate_mm_min?: number;       // rapid traverse rate
  work_volume?: {
    x_mm: number;
    y_mm: number;
    z_mm: number;
  };
  max_bar_diameter_mm?: number;     // for lathes/swiss
  max_turning_diameter_mm?: number;
  max_turning_length_mm?: number;
}

export interface GCodeParam {
  spindle_rpm?: number;
  feed_mm_min?: number;
  x?: number;
  y?: number;
  z?: number;
  power_kW?: number;
  is_rapid?: boolean;
}

export interface EnvelopeViolation {
  parameter: string;
  value: number;
  limit: number;
  action: "clamped" | "blocked" | "warned";
  message: string;
}

export interface EnvelopeCheckResult {
  passed: boolean;
  clamped: GCodeParam;
  violations: EnvelopeViolation[];
  blocked: boolean;
}

export interface BatchCheckResult {
  total_blocks: number;
  violations_found: number;
  blocks_clamped: number;
  blocks_blocked: number;
  all_violations: EnvelopeViolation[];
  summary: string;
}

// ============================================================================
// ENGINE
// ============================================================================

export class MachineEnvelopeGuardEngine {

  /**
   * Check a single set of G-code parameters against machine envelope.
   */
  check(params: GCodeParam, envelope: MachineEnvelope): EnvelopeCheckResult {
    const violations: EnvelopeViolation[] = [];
    const clamped = { ...params };
    let blocked = false;

    // RPM check
    if (params.spindle_rpm !== undefined && envelope.max_rpm) {
      if (params.spindle_rpm > envelope.max_rpm) {
        violations.push({
          parameter: "spindle_rpm",
          value: params.spindle_rpm,
          limit: envelope.max_rpm,
          action: "clamped",
          message: `RPM ${params.spindle_rpm} exceeds max ${envelope.max_rpm} — clamped`,
        });
        clamped.spindle_rpm = envelope.max_rpm;
      }
      if (envelope.min_rpm && params.spindle_rpm < envelope.min_rpm && params.spindle_rpm > 0) {
        violations.push({
          parameter: "spindle_rpm",
          value: params.spindle_rpm,
          limit: envelope.min_rpm,
          action: "clamped",
          message: `RPM ${params.spindle_rpm} below min ${envelope.min_rpm} — clamped up`,
        });
        clamped.spindle_rpm = envelope.min_rpm;
      }
    }

    // Feed rate check
    if (params.feed_mm_min !== undefined) {
      const limit = params.is_rapid
        ? (envelope.rapid_rate_mm_min ?? 30000)
        : (envelope.max_feed_mm_min ?? envelope.rapid_rate_mm_min ?? 15000);
      if (params.feed_mm_min > limit) {
        violations.push({
          parameter: "feed_mm_min",
          value: params.feed_mm_min,
          limit,
          action: "clamped",
          message: `Feed ${params.feed_mm_min} mm/min exceeds ${params.is_rapid ? "rapid" : "cutting"} limit ${limit} — clamped`,
        });
        clamped.feed_mm_min = limit;
      }
    }

    // Work volume check (X, Y, Z)
    if (envelope.work_volume) {
      const vol = envelope.work_volume;
      if (params.x !== undefined && Math.abs(params.x) > vol.x_mm) {
        violations.push({
          parameter: "x_position",
          value: params.x,
          limit: vol.x_mm,
          action: "blocked",
          message: `X=${params.x}mm exceeds travel ±${vol.x_mm}mm — BLOCKED`,
        });
        blocked = true;
      }
      if (params.y !== undefined && Math.abs(params.y) > vol.y_mm) {
        violations.push({
          parameter: "y_position",
          value: params.y,
          limit: vol.y_mm,
          action: "blocked",
          message: `Y=${params.y}mm exceeds travel ±${vol.y_mm}mm — BLOCKED`,
        });
        blocked = true;
      }
      if (params.z !== undefined && Math.abs(params.z) > vol.z_mm) {
        violations.push({
          parameter: "z_position",
          value: params.z,
          limit: vol.z_mm,
          action: "blocked",
          message: `Z=${params.z}mm exceeds travel ±${vol.z_mm}mm — BLOCKED`,
        });
        blocked = true;
      }
    }

    // Power check
    if (params.power_kW !== undefined && envelope.max_power_kW) {
      if (params.power_kW > envelope.max_power_kW) {
        violations.push({
          parameter: "power_kW",
          value: params.power_kW,
          limit: envelope.max_power_kW,
          action: "warned",
          message: `Cutting power ${params.power_kW.toFixed(1)} kW exceeds machine ${envelope.max_power_kW} kW`,
        });
      }
    }

    return {
      passed: violations.length === 0,
      clamped,
      violations,
      blocked,
    };
  }

  /**
   * Check a batch of G-code blocks against machine envelope.
   * Returns summary + per-block clamped values.
   */
  checkBatch(
    blocks: GCodeParam[],
    envelope: MachineEnvelope,
  ): BatchCheckResult {
    const allViolations: EnvelopeViolation[] = [];
    let blocksClamped = 0;
    let blocksBlocked = 0;

    for (const block of blocks) {
      const result = this.check(block, envelope);
      if (result.violations.length > 0) {
        blocksClamped++;
        allViolations.push(...result.violations);
      }
      if (result.blocked) blocksBlocked++;
      // Mutate block in-place with clamped values
      Object.assign(block, result.clamped);
    }

    const summary = allViolations.length === 0
      ? `All ${blocks.length} blocks within machine envelope`
      : `${allViolations.length} violations in ${blocksClamped} blocks (${blocksBlocked} blocked)`;

    return {
      total_blocks: blocks.length,
      violations_found: allViolations.length,
      blocks_clamped: blocksClamped,
      blocks_blocked: blocksBlocked,
      all_violations: allViolations,
      summary,
    };
  }

  /**
   * Build envelope from machine registry data.
   * Normalizes different field naming conventions.
   */
  fromMachineData(machine: Record<string, any>): MachineEnvelope {
    return {
      max_rpm: machine.max_rpm ?? machine.max_spindle_rpm ?? machine.spindle?.max_rpm,
      min_rpm: machine.min_rpm ?? machine.spindle?.min_rpm ?? 50,
      max_power_kW: machine.max_power_kW ?? machine.power_kW ?? machine.spindle?.power_continuous,
      max_feed_mm_min: machine.max_feed_mm_min ?? machine.max_cutting_feed ?? 15000,
      rapid_rate_mm_min: machine.rapid_rate_mm_min ?? machine.rapid_rate?.x ?? 30000,
      work_volume: machine.work_volume ?? (machine.envelope ? {
        x_mm: machine.envelope.x_travel ?? 500,
        y_mm: machine.envelope.y_travel ?? 400,
        z_mm: machine.envelope.z_travel ?? 400,
      } : undefined),
      max_bar_diameter_mm: machine.max_bar_diameter_mm ?? machine.bar_capacity_mm,
      max_turning_diameter_mm: machine.max_turning_diameter_mm ?? machine.swing_mm,
      max_turning_length_mm: machine.max_turning_length_mm ?? machine.between_centers_mm,
    };
  }
}

export const machineEnvelopeGuardEngine = new MachineEnvelopeGuardEngine();
