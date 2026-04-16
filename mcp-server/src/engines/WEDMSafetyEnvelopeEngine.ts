/**
 * WEDMSafetyEnvelopeEngine — WEDM AGI Phase 4 / P4-MS2 / U-P4-05.
 *
 * Runtime envelope-violation detector for the 6 WEDM physical safety
 * constraints identified on the Phase 4 roadmap:
 *
 *   1. Wire tension         500 – 2 000 gf
 *   2. Spark-gap voltage    20 – 80 V
 *   3. Water resistivity    ≥ 3 MΩ·cm
 *   4. Tank level           ≥ min %
 *   5. Axis travel          inside ±limits on X / Y / U / V / Z_upper / Z_lower
 *   6. Wire break count     < 3 (per configured window)
 *
 * The envelope is not *the* safety net — the machine controller is, and
 * upstream physics engines (WireTensionModel, DielectricHealthEngine,
 * etc.) reason about *why* a constraint is about to trip. This engine
 * is the lightweight **telemetry guard**: given a snapshot, is ANY
 * configured envelope breached right now?
 *
 *   - `warning` severity  = approaching a limit (inside a soft band)
 *   - `critical` severity = out-of-spec / emergency degrade trigger
 *
 * A critical verdict is the hook for:
 *
 *   wedmAutonomyEngine.degrade({ floorToLevel: 0, reason: "envelope" })
 *   wedmExceptionHandlerEngine.handle({ type: <mapped>, ... })
 *   wedmHumanHandoffEngine.escalate({ ... })
 *
 * Limits are fully configurable per-shop / per-machine via
 * `WEDMSafetyEnvelope`. `JM_DIE_DEFAULT_ENVELOPE` captures the test-shop
 * envelope for the Mitsubishi MV2400S (JM Die wire EDM). Machines with
 * different travel / tank geometry should be created explicitly.
 *
 * Composes with:
 *   - WEDMHeadClearanceEngine — geometric collision (disjoint concern)
 *   - WEDMAutonomyEngine      — degrade target on critical
 *   - WEDMExceptionHandlerEngine — map `EnvelopeViolation` to a WEDM
 *     exception type for the recovery ladder
 *
 * @module engines/WEDMSafetyEnvelopeEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export type EnvelopeParam =
  | "wire_tension_gf"
  | "gap_V"
  | "resistivity_Mohm_cm"
  | "tank_level_pct"
  | "X_mm"
  | "Y_mm"
  | "U_mm"
  | "V_mm"
  | "Z_upper_mm"
  | "Z_lower_mm"
  | "wire_breaks_in_window";

export type EnvelopeSeverity = "warning" | "critical";

/**
 * Numeric range limit. A reading is:
 *   - "critical" if outside [min, max]
 *   - "warning" if inside [min, max] but within `softBand_*` of either edge
 *   - "ok" otherwise
 *
 * Supply `min` and/or `max`; either can be undefined for one-sided limits.
 */
export interface Limit {
  min?: number;
  max?: number;
  /** Warning band offset applied inside of `min` (upward). */
  softBand_low?: number;
  /** Warning band offset applied inside of `max` (downward). */
  softBand_high?: number;
}

export interface WEDMSafetyEnvelope {
  /** Human-readable label (e.g. "JM_DIE_MV2400S"). */
  id: string;
  description: string;
  limits: Partial<Record<EnvelopeParam, Limit>>;
}

/** Reading snapshot (each field optional — undefined = "don't check"). */
export interface EnvelopeReading {
  wire_tension_gf?: number;
  gap_V?: number;
  resistivity_Mohm_cm?: number;
  tank_level_pct?: number;
  X_mm?: number;
  Y_mm?: number;
  U_mm?: number;
  V_mm?: number;
  Z_upper_mm?: number;
  Z_lower_mm?: number;
  wire_breaks_in_window?: number;
}

export interface EnvelopeViolation {
  param: EnvelopeParam;
  severity: EnvelopeSeverity;
  value: number;
  limit: Limit;
  edge: "low" | "high";
  reason: string;
}

export interface EnvelopeReport {
  envelopeId: string;
  reading: EnvelopeReading;
  pass: boolean;
  violations: EnvelopeViolation[];
}

// ============================================================================
// ROADMAP DEFAULT ENVELOPE
// ============================================================================

/**
 * Defaults pulled from the Phase 4 roadmap spec. `softBand_*` values are
 * conservative starting points — shops should tighten via a custom
 * envelope once they characterise their own drift envelope.
 */
export const ROADMAP_DEFAULT_ENVELOPE: WEDMSafetyEnvelope = {
  id: "roadmap_default",
  description: "Roadmap Phase 4 default envelope (wire EDM).",
  limits: {
    wire_tension_gf: { min: 500, max: 2000, softBand_low: 50, softBand_high: 100 },
    gap_V: { min: 20, max: 80, softBand_low: 2, softBand_high: 5 },
    resistivity_Mohm_cm: { min: 3, softBand_low: 0.5 },
    tank_level_pct: { min: 80, softBand_low: 5 },
    wire_breaks_in_window: { max: 2, softBand_high: 0 }, // <3 = ≤2
  },
};

/**
 * JM Die Mitsubishi MV2400S envelope. Travel limits are documented in
 * the machine profile (src/data/jm-die-profile.ts); 80 % tank minimum
 * is shop standard operating practice.
 */
export const JM_DIE_DEFAULT_ENVELOPE: WEDMSafetyEnvelope = {
  id: "jm_die_mv2400s",
  description: "JM Die Mitsubishi MV2400S — shop-standard envelope.",
  limits: {
    ...ROADMAP_DEFAULT_ENVELOPE.limits,
    X_mm: { min: 0, max: 600, softBand_low: 5, softBand_high: 5 },
    Y_mm: { min: 0, max: 400, softBand_low: 5, softBand_high: 5 },
    U_mm: { min: -75, max: 75, softBand_low: 2, softBand_high: 2 },
    V_mm: { min: -75, max: 75, softBand_low: 2, softBand_high: 2 },
    Z_upper_mm: { min: 0, max: 350, softBand_low: 5, softBand_high: 5 },
    Z_lower_mm: { min: 0, max: 350, softBand_low: 5, softBand_high: 5 },
  },
};

// ============================================================================
// INTERNALS
// ============================================================================

function classify(value: number, limit: Limit): EnvelopeViolation | null {
  if (limit.min !== undefined && value < limit.min) {
    return {
      param: "__tmp" as EnvelopeParam, // filled by caller
      severity: "critical",
      value,
      limit,
      edge: "low",
      reason: `${value} below min ${limit.min}`,
    };
  }
  if (limit.max !== undefined && value > limit.max) {
    return {
      param: "__tmp" as EnvelopeParam,
      severity: "critical",
      value,
      limit,
      edge: "high",
      reason: `${value} above max ${limit.max}`,
    };
  }
  if (
    limit.min !== undefined &&
    limit.softBand_low !== undefined &&
    value < limit.min + limit.softBand_low
  ) {
    return {
      param: "__tmp" as EnvelopeParam,
      severity: "warning",
      value,
      limit,
      edge: "low",
      reason: `${value} within soft band of min ${limit.min}`,
    };
  }
  if (
    limit.max !== undefined &&
    limit.softBand_high !== undefined &&
    value > limit.max - limit.softBand_high
  ) {
    return {
      param: "__tmp" as EnvelopeParam,
      severity: "warning",
      value,
      limit,
      edge: "high",
      reason: `${value} within soft band of max ${limit.max}`,
    };
  }
  return null;
}

const PARAM_ORDER: EnvelopeParam[] = [
  "wire_tension_gf",
  "gap_V",
  "resistivity_Mohm_cm",
  "tank_level_pct",
  "X_mm",
  "Y_mm",
  "U_mm",
  "V_mm",
  "Z_upper_mm",
  "Z_lower_mm",
  "wire_breaks_in_window",
];

// ============================================================================
// ENGINE
// ============================================================================

export class WEDMSafetyEnvelopeEngine {
  private envelope: WEDMSafetyEnvelope;

  constructor(envelope: WEDMSafetyEnvelope = ROADMAP_DEFAULT_ENVELOPE) {
    this.envelope = envelope;
  }

  getEnvelope(): WEDMSafetyEnvelope {
    // Defensive copy so callers can't mutate our limits.
    return {
      id: this.envelope.id,
      description: this.envelope.description,
      limits: { ...this.envelope.limits },
    };
  }

  setEnvelope(envelope: WEDMSafetyEnvelope): void {
    if (!envelope.id) throw new Error("WEDMSafetyEnvelope: id is required");
    this.envelope = envelope;
  }

  /**
   * Check a single reading against the current envelope. Returns a full
   * report even on pass (so dashboards can render "ok" banner).
   */
  check(reading: EnvelopeReading): EnvelopeReport {
    const violations: EnvelopeViolation[] = [];

    for (const param of PARAM_ORDER) {
      const value = reading[param];
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      const limit = this.envelope.limits[param];
      if (!limit) continue;
      const v = classify(value, limit);
      if (v) {
        v.param = param;
        v.reason = `${param}: ${v.reason}`;
        violations.push(v);
      }
    }

    const pass = violations.every((v) => v.severity !== "critical");
    return {
      envelopeId: this.envelope.id,
      reading,
      pass,
      violations,
    };
  }

  /** Convenience: true if a reading is both pass AND has no warnings. */
  isClean(reading: EnvelopeReading): boolean {
    const r = this.check(reading);
    return r.pass && r.violations.length === 0;
  }

  /**
   * Map a critical envelope violation to the matching
   * WEDMExceptionHandlerEngine exception type. Returns null for params
   * that don't have a first-class exception family (e.g. axis travel
   * breaches surface as `axis_overrun` through the geometry layer).
   */
  static mapViolationToException(v: EnvelopeViolation): string | null {
    switch (v.param) {
      case "wire_tension_gf":
        return "wire_tension_out";
      case "gap_V":
        // Low V → short circuit. High V → open circuit.
        return v.edge === "low" ? "short_circuit" : "open_circuit";
      case "resistivity_Mohm_cm":
        return v.edge === "low" ? "resistivity_low" : "resistivity_high";
      case "tank_level_pct":
        return "tank_low";
      case "X_mm":
      case "Y_mm":
      case "U_mm":
      case "V_mm":
      case "Z_upper_mm":
      case "Z_lower_mm":
        return "axis_overrun";
      case "wire_breaks_in_window":
        return "wire_break";
      default:
        return null;
    }
  }
}

/** Shared singleton seeded with the roadmap-default envelope. */
export const wedmSafetyEnvelopeEngine = new WEDMSafetyEnvelopeEngine();
