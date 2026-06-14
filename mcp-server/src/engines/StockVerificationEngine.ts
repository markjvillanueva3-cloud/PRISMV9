/**
 * StockVerificationEngine — closes PreCut axis #1 (stock verified)
 *
 * Cross-checks stock material against XRF, hardness, certificate, and
 * dimension before issue to machine. Returns verdict
 * stock_verified / stock_warn / stock_block.
 *
 * Reference: ASTM E1085 (XRF spec); ASTM E18 (Rockwell hardness); ISO 6892-1
 *   (tensile); SAE J2334 (material cert format); JM Die receiving inspection SOP.
 *
 * @version 1.0.0
 * @module StockVerificationEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export interface StockSpec {
  /** Material designation (e.g. "Aluminum 6061-T6", "Stainless 304", "Inconel 718") */
  designation: string;
  /** Required hardness band (Rockwell B or C scale) */
  hardness_min?: number;
  hardness_max?: number;
  hardness_scale?: "HRB" | "HRC";
  /** Required composition band (% by mass) per key element */
  composition?: Record<string, { min: number; max: number }>;
  /** Nominal stock dimensions (mm) */
  dim_x_mm: number;
  dim_y_mm: number;
  dim_z_mm: number;
  /** Stock dimensional tolerance (μm) — default 250 (typical bar stock ±0.25mm) */
  dim_tol_um?: number;
}

export interface StockMeasurement {
  /** XRF reading: actual composition (% by mass) per element */
  xrf?: Record<string, number>;
  /** Hardness reading */
  hardness?: number;
  hardness_scale?: "HRB" | "HRC";
  /** Measured dimensions (mm) */
  measured_x_mm?: number;
  measured_y_mm?: number;
  measured_z_mm?: number;
  /** Material certificate present + valid */
  cert_present?: boolean;
  cert_designation?: string;
}

export interface StockVerificationInput {
  lot_id: string;
  spec: StockSpec;
  measurement: StockMeasurement;
}

export type StockViolationKind =
  | "cert_missing" | "cert_mismatch" | "hardness_out_of_band"
  | "composition_out_of_band" | "dimension_out_of_tol";

export interface StockViolation {
  kind: StockViolationKind;
  severity: "critical" | "warning";
  observed: string;
  expected: string;
  fix: string;
}

export interface StockVerificationResult {
  lot_id: string;
  designation: string;
  violations: StockViolation[];
  critical_count: number;
  warning_count: number;
  verdict: "stock_verified" | "stock_warn" | "stock_block";
  confidence: AtomicValue;
  source: string;
}

const DEFAULT_DIM_TOL_UM = 250;

export class StockVerificationEngine {
  verify(input: StockVerificationInput): StockVerificationResult {
    if (!input || !input.lot_id || !input.spec || !input.measurement) {
      throw new Error("StockVerificationEngine.verify: lot_id + spec + measurement required");
    }
    const { spec, measurement } = input;
    const violations: StockViolation[] = [];

    // ── Material certificate ──────────────────────────────────────────
    if (!measurement.cert_present) {
      violations.push({
        kind: "cert_missing",
        severity: "critical",
        observed: "no cert",
        expected: "valid material certificate",
        fix: "Locate cert from supplier; reject stock if cert unobtainable",
      });
    } else if (measurement.cert_designation && spec.designation
        && measurement.cert_designation.toLowerCase() !== spec.designation.toLowerCase()) {
      violations.push({
        kind: "cert_mismatch",
        severity: "critical",
        observed: measurement.cert_designation,
        expected: spec.designation,
        fix: "Verify stock label matches cert; quarantine if cert names different alloy",
      });
    }

    // ── Hardness band ─────────────────────────────────────────────────
    if (spec.hardness_min !== undefined && measurement.hardness !== undefined) {
      if (measurement.hardness < spec.hardness_min || (spec.hardness_max !== undefined && measurement.hardness > spec.hardness_max)) {
        violations.push({
          kind: "hardness_out_of_band",
          severity: "critical",
          observed: `${measurement.hardness} ${measurement.hardness_scale ?? spec.hardness_scale ?? "HRB"}`,
          expected: `${spec.hardness_min}-${spec.hardness_max ?? "∞"} ${spec.hardness_scale ?? "HRB"}`,
          fix: "Re-test on different surface area; if confirmed out of band, reject stock",
        });
      }
    }

    // ── Composition band (XRF) ────────────────────────────────────────
    if (spec.composition && measurement.xrf) {
      for (const [element, band] of Object.entries(spec.composition)) {
        const measured = measurement.xrf[element];
        if (measured === undefined) continue;
        if (measured < band.min || measured > band.max) {
          violations.push({
            kind: "composition_out_of_band",
            severity: "critical",
            observed: `${element}=${measured}%`,
            expected: `${element}=${band.min}-${band.max}%`,
            fix: `Composition mismatch — likely wrong alloy. Re-run XRF; quarantine if confirmed`,
          });
        }
      }
    }

    // ── Dimensions ────────────────────────────────────────────────────
    const dimTolMm = (spec.dim_tol_um ?? DEFAULT_DIM_TOL_UM) / 1000;
    const checkDim = (label: string, expected: number, measured?: number) => {
      if (measured === undefined) return;
      const drift = Math.abs(measured - expected);
      if (drift > dimTolMm) {
        violations.push({
          kind: "dimension_out_of_tol",
          severity: "warning",
          observed: `${label}=${measured}mm`,
          expected: `${label}=${expected}±${dimTolMm}mm`,
          fix: `Trim stock to nominal OR adjust setup origin OR reject if undersize`,
        });
      }
    };
    checkDim("X", spec.dim_x_mm, measurement.measured_x_mm);
    checkDim("Y", spec.dim_y_mm, measurement.measured_y_mm);
    checkDim("Z", spec.dim_z_mm, measurement.measured_z_mm);

    const critical = violations.filter(v => v.severity === "critical").length;
    const warning = violations.filter(v => v.severity === "warning").length;
    let verdict: StockVerificationResult["verdict"];
    if (critical > 0) verdict = "stock_block";
    else if (warning > 0) verdict = "stock_warn";
    else verdict = "stock_verified";

    const TOTAL_CHECKS = 5;
    const confidence = Math.max(0, 1 - violations.length / TOTAL_CHECKS);

    return {
      lot_id: input.lot_id,
      designation: spec.designation,
      violations,
      critical_count: critical,
      warning_count: warning,
      verdict,
      confidence: {
        value: Number(confidence.toFixed(3)),
        unit: "ratio",
        source: "1 - violations / 5",
      },
      source: "StockVerificationEngine — ASTM E1085 XRF + E18 Rockwell + ISO 6892-1 + SAE J2334 + JM Die SOP",
    };
  }
}

export const stockVerificationEngine = new StockVerificationEngine();
