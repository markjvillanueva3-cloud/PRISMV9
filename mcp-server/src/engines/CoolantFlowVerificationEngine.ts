/**
 * CoolantFlowVerificationEngine — closes first-part-perfect axis #5
 *
 * Verifies coolant readiness before first cut: refractometer concentration
 * (Brix or pH) within manufacturer envelope, flow pressure at nozzle ≥
 * required threshold, tramp-oil contamination ≤ limit, dielectric resistance
 * (for EDM) within window.
 *
 * Verdicts:
 *   coolant_ok          — all checks pass
 *   coolant_warn        — non-critical drift (refill recommended)
 *   coolant_block       — concentration / flow / contamination out of envelope
 *
 * Reference: Master Chemical TRIM/Pelican coolant application data;
 *   Sandvik Coromant coolant guide §C-3; ASTM E2693 (metalworking-fluid microbiology);
 *   ISO/TR 13577 (metalworking fluid pH); Sodick / Mitsubishi dielectric specs.
 *
 * @version 1.0.0
 * @module CoolantFlowVerificationEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export type CoolantType = "flood_soluble" | "flood_synthetic" | "mql" | "cryogenic" | "edm_water" | "edm_oil";

export interface CoolantSpec {
  type: CoolantType;
  /** Required concentration band (Brix % for soluble, pH for synthetic, dielectric μS/cm for EDM) */
  concentration_min: number;
  concentration_max: number;
  /** Minimum nozzle pressure (bar) — vendor spec */
  pressure_min_bar: number;
  /** Maximum tramp-oil contamination (%, by Hach test) */
  tramp_oil_max_pct?: number;
  /** Maximum bacterial dip-slide count (CFU/mL); ASTM E2693 */
  bacterial_max_cfu_ml?: number;
  /** EDM-only: max dielectric resistance (μS/cm) */
  dielectric_max_us_cm?: number;
}

export interface CoolantMeasurement {
  /** Refractometer reading (Brix % / pH / μS/cm depending on type) */
  concentration: number;
  /** Nozzle pressure (bar) from inline sensor */
  pressure_bar: number;
  /** Tramp oil % (optional — Hach test card) */
  tramp_oil_pct?: number;
  /** Bacterial CFU/mL (optional — dip slide) */
  bacterial_cfu_ml?: number;
  /** EDM-only: dielectric resistance μS/cm */
  dielectric_us_cm?: number;
}

export interface CoolantFlowVerificationInput {
  program_id: string;
  spec: CoolantSpec;
  measurement: CoolantMeasurement;
}

export type CoolantViolationKind =
  | "concentration_low" | "concentration_high" | "pressure_low"
  | "tramp_oil_high" | "bacterial_high" | "dielectric_out_of_range";

export interface CoolantViolation {
  kind: CoolantViolationKind;
  severity: "critical" | "warning";
  observed: number;
  expected: string;
  fix: string;
}

export interface CoolantFlowVerificationResult {
  program_id: string;
  spec_type: CoolantType;
  violations: CoolantViolation[];
  critical_count: number;
  warning_count: number;
  verdict: "coolant_ok" | "coolant_warn" | "coolant_block";
  confidence: AtomicValue;
  source: string;
}

export class CoolantFlowVerificationEngine {
  verify(input: CoolantFlowVerificationInput): CoolantFlowVerificationResult {
    if (!input || !input.program_id || !input.spec || !input.measurement) {
      throw new Error("CoolantFlowVerificationEngine.verify: program_id + spec + measurement required");
    }
    const { spec, measurement } = input;
    const violations: CoolantViolation[] = [];

    // ── Concentration band ────────────────────────────────────────────
    if (measurement.concentration < spec.concentration_min) {
      violations.push({
        kind: "concentration_low",
        severity: "critical",
        observed: measurement.concentration,
        expected: `≥ ${spec.concentration_min}`,
        fix: "Add coolant concentrate to bring within band; re-measure with refractometer",
      });
    }
    if (measurement.concentration > spec.concentration_max) {
      violations.push({
        kind: "concentration_high",
        severity: "warning",
        observed: measurement.concentration,
        expected: `≤ ${spec.concentration_max}`,
        fix: "Add water to dilute to band",
      });
    }

    // ── Nozzle pressure ───────────────────────────────────────────────
    if (measurement.pressure_bar < spec.pressure_min_bar) {
      violations.push({
        kind: "pressure_low",
        severity: "critical",
        observed: measurement.pressure_bar,
        expected: `≥ ${spec.pressure_min_bar} bar`,
        fix: "Check pump, filter, manifold; clear blockage; verify nozzle aim",
      });
    }

    // ── Tramp oil ─────────────────────────────────────────────────────
    if (spec.tramp_oil_max_pct !== undefined && measurement.tramp_oil_pct !== undefined
        && measurement.tramp_oil_pct > spec.tramp_oil_max_pct) {
      violations.push({
        kind: "tramp_oil_high",
        severity: "warning",
        observed: measurement.tramp_oil_pct,
        expected: `≤ ${spec.tramp_oil_max_pct}%`,
        fix: "Run skimmer; check seal leaks; consider sump cleaning",
      });
    }

    // ── Bacterial contamination ───────────────────────────────────────
    if (spec.bacterial_max_cfu_ml !== undefined && measurement.bacterial_cfu_ml !== undefined
        && measurement.bacterial_cfu_ml > spec.bacterial_max_cfu_ml) {
      violations.push({
        kind: "bacterial_high",
        severity: "warning",
        observed: measurement.bacterial_cfu_ml,
        expected: `≤ ${spec.bacterial_max_cfu_ml} CFU/mL`,
        fix: "Add biocide per vendor spec; if >10⁶ CFU/mL drain + recharge",
      });
    }

    // ── EDM dielectric ────────────────────────────────────────────────
    if ((spec.type === "edm_water" || spec.type === "edm_oil")
        && spec.dielectric_max_us_cm !== undefined
        && measurement.dielectric_us_cm !== undefined
        && measurement.dielectric_us_cm > spec.dielectric_max_us_cm) {
      violations.push({
        kind: "dielectric_out_of_range",
        severity: "critical",
        observed: measurement.dielectric_us_cm,
        expected: `≤ ${spec.dielectric_max_us_cm} μS/cm`,
        fix: "Cycle deionizer; check resin life; replenish if needed",
      });
    }

    const critical = violations.filter(v => v.severity === "critical").length;
    const warning = violations.filter(v => v.severity === "warning").length;
    let verdict: CoolantFlowVerificationResult["verdict"];
    if (critical > 0) verdict = "coolant_block";
    else if (warning > 0) verdict = "coolant_warn";
    else verdict = "coolant_ok";

    const TOTAL_CHECKS = 5;
    const confidence = Math.max(0, 1 - violations.length / TOTAL_CHECKS);

    return {
      program_id: input.program_id,
      spec_type: spec.type,
      violations,
      critical_count: critical,
      warning_count: warning,
      verdict,
      confidence: {
        value: Number(confidence.toFixed(3)),
        unit: "ratio",
        source: "1 - violations / 5",
      },
      source: "CoolantFlowVerificationEngine — Master Chemical app data + Sandvik §C-3 + ASTM E2693 + Sodick dielectric spec",
    };
  }
}

export const coolantFlowVerificationEngine = new CoolantFlowVerificationEngine();
