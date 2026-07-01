// WIRE-EXEMPT: U-EFF36 only added 6 optional axis-position fields (X_mm/Y_mm/U_mm/V_mm/Z_upper_mm/Z_lower_mm) to EnvelopeReading. Engine is consumed via the wedm-erp route + WEDMFailsafeEngine, not dispatched directly.
/**
 * WEDMSafetyEnvelopeEngine - operating envelope checks for WEDM routes.
 *
 * Validates live/program-derived readings against conservative shop limits so
 * ERP/job creation can block only critical safety conditions while still
 * surfacing near-limit warnings.
 */

export interface EnvelopeReading {
  wire_tension_gf?: number;
  gap_V?: number;
  resistivity_Mohm_cm?: number;
  tank_level_pct?: number;
  wire_breaks_in_window?: number;
  // Axis positions for envelope violation checks (WEDMFailsafeEngine).
  // Upper/lower Z distinguished because the WEDM head has independent
  // upper-guide height from the work surface; U/V are the taper axes.
  X_mm?: number;
  Y_mm?: number;
  Z_upper_mm?: number;
  Z_lower_mm?: number;
  U_mm?: number;
  V_mm?: number;
}

export interface EnvelopeLimit {
  min?: number;
  max?: number;
  soft_band?: number;
}

export type EnvelopeParam = keyof EnvelopeReading;
export type EnvelopeSeverity = "info" | "warning" | "critical";
export type EnvelopeEdge = "low" | "high";

export interface EnvelopeViolation {
  param: EnvelopeParam;
  severity: EnvelopeSeverity;
  value: number;
  limit: EnvelopeLimit;
  edge: EnvelopeEdge;
  reason: string;
}

export interface EnvelopeReport {
  envelopeId: string;
  reading: EnvelopeReading;
  pass: boolean;
  violations: EnvelopeViolation[];
}

export interface SafetyEnvelope {
  id: string;
  description: string;
  /**
   * Limits keyed by reading param. PARTIAL: an envelope bounds only the params
   * it has a conservative shop-wide limit for. U-EFF36 added 6 optional
   * axis-position fields (X/Y/Z_upper/Z_lower/U/V_mm) to EnvelopeReading for
   * WEDMFailsafeEngine's machine-specific travel checks -- those positions have
   * NO universal shop-wide band, so DEFAULT_ENVELOPE intentionally omits them.
   * `check()` already iterates only the present limit entries.
   */
  limits: Partial<Record<EnvelopeParam, EnvelopeLimit>>;
}

const DEFAULT_ENVELOPE: SafetyEnvelope = {
  id: "default",
  description: "Conservative WEDM live-process safety envelope for tension, spark gap, dielectric quality, tank level, and wire-break rate.",
  limits: {
    wire_tension_gf: { min: 500, max: 2000, soft_band: 50 },
    gap_V: { min: 20, max: 80, soft_band: 5 },
    resistivity_Mohm_cm: { min: 3, max: 20, soft_band: 1 },
    tank_level_pct: { min: 80, soft_band: 5 },
    wire_breaks_in_window: { max: 2, soft_band: 1 },
  },
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function violationReason(param: EnvelopeParam, edge: EnvelopeEdge, severity: EnvelopeSeverity, limit: EnvelopeLimit): string {
  const direction = edge === "low" ? "below" : "above";
  const bound = edge === "low" ? limit.min : limit.max;
  const label = severity === "critical" ? "outside critical limit" : "near operating limit";
  return `${param} is ${direction} ${bound} (${label})`;
}

export class WEDMSafetyEnvelopeEngine {
  constructor(private readonly envelope: SafetyEnvelope = DEFAULT_ENVELOPE) {}

  getEnvelope(): SafetyEnvelope {
    return {
      ...this.envelope,
      limits: Object.fromEntries(
        Object.entries(this.envelope.limits).map(([key, value]) => [key, { ...value }]),
      ) as SafetyEnvelope["limits"],
    };
  }

  check(reading: EnvelopeReading): EnvelopeReport {
    const violations: EnvelopeViolation[] = [];

    for (const [param, limit] of Object.entries(this.envelope.limits) as Array<[EnvelopeParam, EnvelopeLimit]>) {
      const value = reading[param];
      if (!isFiniteNumber(value)) continue;

      if (limit.min !== undefined && value < limit.min) {
        violations.push({
          param,
          severity: "critical",
          value,
          limit,
          edge: "low",
          reason: violationReason(param, "low", "critical", limit),
        });
        continue;
      }

      if (limit.max !== undefined && value > limit.max) {
        violations.push({
          param,
          severity: "critical",
          value,
          limit,
          edge: "high",
          reason: violationReason(param, "high", "critical", limit),
        });
        continue;
      }

      const soft = limit.soft_band ?? 0;
      if (soft > 0 && limit.min !== undefined && value <= limit.min + soft) {
        violations.push({
          param,
          severity: "warning",
          value,
          limit,
          edge: "low",
          reason: violationReason(param, "low", "warning", limit),
        });
      } else if (soft > 0 && limit.max !== undefined && value >= limit.max - soft) {
        violations.push({
          param,
          severity: "warning",
          value,
          limit,
          edge: "high",
          reason: violationReason(param, "high", "warning", limit),
        });
      }
    }

    return {
      envelopeId: this.envelope.id,
      reading,
      pass: !violations.some((violation) => violation.severity === "critical"),
      violations,
    };
  }

  isClean(reading: EnvelopeReading): boolean {
    return this.check(reading).violations.length === 0;
  }

  static mapViolationToException(violation: EnvelopeViolation): string {
    if (violation.param === "wire_tension_gf") return "wire_tension_out";
    if (violation.param === "gap_V" && violation.edge === "low") return "short_circuit";
    if (violation.param === "gap_V" && violation.edge === "high") return "open_circuit";
    if (violation.param === "tank_level_pct") return "tank_level_low";
    if (violation.param === "resistivity_Mohm_cm") return "dielectric_out";
    if (violation.param === "wire_breaks_in_window") return "wire_break_rate_high";
    return "wedm_envelope_violation";
  }
}

export const wedmSafetyEnvelopeEngine = new WEDMSafetyEnvelopeEngine();
