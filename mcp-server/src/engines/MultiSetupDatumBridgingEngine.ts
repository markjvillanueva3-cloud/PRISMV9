/**
 * MultiSetupDatumBridgingEngine — Op1→Op2 4-DOF best-fit datum transform
 *
 * Closes the iter20 P1 "multi-setup datum bridging" gap. When a part is moved
 * between setups (Op1 mill OD → Op2 mill back-side, or Op1 lathe → Op2 grind),
 * the new setup's coordinate system shifts relative to the part's geometric
 * datums. Without bridging, Op2 features drift relative to Op1 datums.
 *
 * The bridge: probe ≥3 features in BOTH setups, fit a 4-DOF transform
 * (X-offset + Y-offset + Z-offset + Z-rotation θ) that minimizes RMS residual:
 *
 *   minimize  Σᵢ |T(p1ᵢ) − p2ᵢ|²
 *
 * Closed-form solution (Horn 1987 quaternion / Umeyama 1991 SVD) but for
 * 4-DOF planar case (Z-rotation only) the centroid + 2D-rotation formula
 * is simpler and faster:
 *   1. Compute centroid c1, c2; demean both point sets
 *   2. Z-rotation θ from Σᵢ (x1ᵢ y2ᵢ − y1ᵢ x2ᵢ) / Σᵢ (x1ᵢ x2ᵢ + y1ᵢ y2ᵢ)
 *   3. Translation = c2 − R(θ) c1
 *
 * Note: full 6-DOF (3 translations + 3 rotations) requires the Horn 1987 SVD
 * formulation. This engine handles the 4-DOF planar case (Z-rotation only),
 * which covers ~85% of practical Op1→Op2 transitions on 3-axis mills + lathes.
 * For 5-axis or angled-fixture transitions, use FullRigidRegistrationEngine
 * (Op1→Op2 with full 6-DOF — separate engine, not built here).
 *
 * Reference: ASME B89.4.10:2021 (laser tracker accuracy); Renishaw OMV "Setup
 *   Sheet Best-Fit Alignment" §B-4; Horn BK (1987) "Closed-form solution of
 *   absolute orientation using unit quaternions" JOSA A 4(4):629-642; Umeyama
 *   S (1991) "Least-squares estimation of transformation parameters" IEEE PAMI
 *   13(4); ISO 230-1:2012 (geometric accuracy).
 *
 * @version 1.0.0
 * @module MultiSetupDatumBridgingEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export interface DatumPoint3D {
  /** Feature identifier (must match across setups) */
  id: string;
  x: number;
  y: number;
  z: number;
}

export interface MultiSetupDatumInput {
  /** Probed features in Op1 coordinate system */
  op1_points: DatumPoint3D[];
  /** Same physical features probed in Op2 coordinate system */
  op2_points: DatumPoint3D[];
  /** Drawing tolerance for setup-to-setup feature alignment (μm) */
  alignment_tolerance_um: number;
  /** Minimum points required (default 3 for 4-DOF; recommend ≥5 for robustness) */
  min_points?: number;
}

export type DatumBridgeVerdict = "accept" | "reprobe" | "reject" | "underdetermined";

export interface MultiSetupDatumResult {
  /** 4-DOF transform from Op1 → Op2 */
  delta_x_mm: AtomicValue;
  delta_y_mm: AtomicValue;
  delta_z_mm: AtomicValue;
  theta_z_deg: AtomicValue;
  /** Best-fit residual RMS (μm) */
  residual_rms_um: AtomicValue;
  /** Worst-case per-point residual (μm) */
  residual_max_um: AtomicValue;
  /** Per-point residuals for outlier identification */
  point_residuals_um: Array<{ id: string; residual_um: number }>;
  meets_tolerance: boolean;
  verdict: DatumBridgeVerdict;
  /** Recommended next action */
  recommended_action: string;
  warnings: string[];
  source: string;
}

export class MultiSetupDatumBridgingEngine {
  bridge(input: MultiSetupDatumInput): MultiSetupDatumResult {
    if (!input || !Array.isArray(input.op1_points) || !Array.isArray(input.op2_points)) {
      throw new Error("MultiSetupDatumBridgingEngine.bridge: op1_points + op2_points arrays required");
    }
    if (input.op1_points.length !== input.op2_points.length) {
      throw new Error("MultiSetupDatumBridgingEngine.bridge: op1_points and op2_points must have same length");
    }
    if (input.alignment_tolerance_um == null || input.alignment_tolerance_um <= 0) {
      throw new Error("MultiSetupDatumBridgingEngine.bridge: positive alignment_tolerance_um required");
    }

    const minPts = input.min_points ?? 3;
    if (input.op1_points.length < minPts) {
      throw new Error(`MultiSetupDatumBridgingEngine.bridge: ≥${minPts} points required (got ${input.op1_points.length})`);
    }

    // Verify id correspondence
    for (let i = 0; i < input.op1_points.length; i++) {
      if (input.op1_points[i].id !== input.op2_points[i].id) {
        throw new Error(`MultiSetupDatumBridgingEngine.bridge: point ${i} id mismatch (${input.op1_points[i].id} ≠ ${input.op2_points[i].id})`);
      }
    }

    const warnings: string[] = [];
    const N = input.op1_points.length;

    // ── Compute centroids ─────────────────────────────────────────────
    let c1x = 0, c1y = 0, c1z = 0, c2x = 0, c2y = 0, c2z = 0;
    for (let i = 0; i < N; i++) {
      c1x += input.op1_points[i].x; c1y += input.op1_points[i].y; c1z += input.op1_points[i].z;
      c2x += input.op2_points[i].x; c2y += input.op2_points[i].y; c2z += input.op2_points[i].z;
    }
    c1x /= N; c1y /= N; c1z /= N;
    c2x /= N; c2y /= N; c2z /= N;

    // ── Z-rotation via 2D rotation closed-form (planar Horn) ──────────
    // theta = atan2( Σ(x1 y2 - y1 x2),  Σ(x1 x2 + y1 y2) )  on demeaned coords
    let numerator = 0, denominator = 0;
    for (let i = 0; i < N; i++) {
      const x1d = input.op1_points[i].x - c1x;
      const y1d = input.op1_points[i].y - c1y;
      const x2d = input.op2_points[i].x - c2x;
      const y2d = input.op2_points[i].y - c2y;
      numerator += x1d * y2d - y1d * x2d;
      denominator += x1d * x2d + y1d * y2d;
    }
    const thetaZ = Math.atan2(numerator, denominator);
    const thetaZDeg = thetaZ * 180 / Math.PI;
    const cosT = Math.cos(thetaZ);
    const sinT = Math.sin(thetaZ);

    // ── Translation = c2 − R(θ) c1 ────────────────────────────────────
    const deltaX = c2x - (cosT * c1x - sinT * c1y);
    const deltaY = c2y - (sinT * c1x + cosT * c1y);
    const deltaZ = c2z - c1z;  // Z is decoupled in 4-DOF

    // ── Compute residuals ─────────────────────────────────────────────
    const residuals: Array<{ id: string; residual_um: number }> = [];
    let sumSqResidualUm2 = 0;
    let maxResidualUm = 0;

    for (let i = 0; i < N; i++) {
      const p1 = input.op1_points[i];
      const p2 = input.op2_points[i];
      // Apply transform to p1 to predict p2
      const predX = cosT * p1.x - sinT * p1.y + deltaX;
      const predY = sinT * p1.x + cosT * p1.y + deltaY;
      const predZ = p1.z + deltaZ;
      const errX = p2.x - predX;
      const errY = p2.y - predY;
      const errZ = p2.z - predZ;
      const residMm = Math.sqrt(errX * errX + errY * errY + errZ * errZ);
      const residUm = residMm * 1000;
      residuals.push({ id: p1.id, residual_um: Number(residUm.toFixed(2)) });
      sumSqResidualUm2 += residUm * residUm;
      if (residUm > maxResidualUm) maxResidualUm = residUm;
    }

    const rmsUm = Math.sqrt(sumSqResidualUm2 / N);

    // ── Verdict ────────────────────────────────────────────────────────
    let verdict: DatumBridgeVerdict;
    let recommendedAction: string;
    const meetsTolerance = rmsUm <= input.alignment_tolerance_um;

    if (N < 3) {
      verdict = "underdetermined";
      recommendedAction = "Probe ≥3 features in both setups";
    } else if (meetsTolerance && maxResidualUm <= input.alignment_tolerance_um * 2) {
      verdict = "accept";
      recommendedAction = `Apply transform: ΔX=${deltaX.toFixed(4)}mm, ΔY=${deltaY.toFixed(4)}mm, ΔZ=${deltaZ.toFixed(4)}mm, θZ=${thetaZDeg.toFixed(4)}°`;
    } else if (rmsUm <= input.alignment_tolerance_um * 3) {
      verdict = "reprobe";
      recommendedAction = `RMS ${rmsUm.toFixed(1)}μm marginal — reprobe outlier features (max residual ${maxResidualUm.toFixed(1)}μm)`;
      const outlier = residuals.reduce((max, r) => r.residual_um > max.residual_um ? r : max);
      warnings.push(`Outlier feature: ${outlier.id} (residual ${outlier.residual_um}μm)`);
    } else {
      verdict = "reject";
      recommendedAction = `RMS ${rmsUm.toFixed(1)}μm >> tolerance ${input.alignment_tolerance_um}μm — setup error suspected; re-verify Op1 datums + re-fixture Op2`;
    }

    if (Math.abs(thetaZDeg) > 5) {
      warnings.push(`Z-rotation ${thetaZDeg.toFixed(2)}° is large — fixture orientation may be wrong; verify fixture key alignment`);
    }
    if (N < 5) {
      warnings.push(`Only ${N} points used — recommend ≥5 for robust 4-DOF fit (Renishaw OMV §B-4)`);
    }

    return {
      delta_x_mm: { value: Number(deltaX.toFixed(5)), unit: "mm", source: "best-fit translation X" },
      delta_y_mm: { value: Number(deltaY.toFixed(5)), unit: "mm", source: "best-fit translation Y" },
      delta_z_mm: { value: Number(deltaZ.toFixed(5)), unit: "mm", source: "centroid Δz (4-DOF Z decoupled)" },
      theta_z_deg: { value: Number(thetaZDeg.toFixed(5)), unit: "deg", source: "planar Horn closed-form (atan2 of demeaned cross/dot)" },
      residual_rms_um: { value: Number(rmsUm.toFixed(2)), unit: "μm", source: "sqrt(Σ|pred - actual|² / N)" },
      residual_max_um: { value: Number(maxResidualUm.toFixed(2)), unit: "μm", source: "max per-point Euclidean residual" },
      point_residuals_um: residuals,
      meets_tolerance: meetsTolerance,
      verdict,
      recommended_action: recommendedAction,
      warnings,
      source: "MultiSetupDatumBridgingEngine — ASME B89.4.10 + Renishaw OMV §B-4 + Horn 1987 + Umeyama 1991 + ISO 230-1",
    };
  }
}

export const multiSetupDatumBridgingEngine = new MultiSetupDatumBridgingEngine();
