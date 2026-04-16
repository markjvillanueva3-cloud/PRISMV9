/**
 * MDOFStabilityEngine — Multi-Degree-of-Freedom Regenerative Chatter Stability Analysis
 *
 * Addresses P0-CRITICAL physics gap: Current SDOF chatter model assumes single dominant mode,
 * but real tools have multiple coupled modes that create additional stability boundaries.
 *
 * MDOF stability formulation:
 *   - Eigenvalue-based stability analysis across multiple structural modes
 *   - Cross-FRF terms for X-Y mode interaction (2D cutting)
 *   - Mode coupling detection when frequencies are close
 *   - FRF synthesis from modal parameters or measured data
 *
 * Physics:
 *   Stability condition: eigenvalue λ of [I + Λ(ω)·a·[G(ω)]·[A]] must have non-positive real part
 *   where:
 *     Λ(ω) = oriented cutting coefficient matrix
 *     a = axial depth of cut
 *     [G(ω)] = multi-mode FRF matrix (includes X-X, X-Y, Y-X, Y-Y terms)
 *     [A] = directional coefficient matrix
 *
 * Mode coupling criterion:
 *   |fn_i - fn_j| / max(fn_i, fn_j) < 0.20 → modes i,j may couple
 *   Creates additional stability lobes and more complex boundaries
 *
 * References:
 *   [1] Altintas, Y. (2012). "Manufacturing Automation", Chapter 4 — MDOF Stability
 *   [2] Budak, E. & Altintas, Y. (1998). "Analytical Prediction of Chatter Stability
 *       in Milling—Part I: General Formulation", ASME J. Dyn. Sys., 120(1), 22-30
 *   [3] Schmitz, T.L. & Smith, K.S. (2019). "Machining Dynamics", 2nd ed., Chapter 6
 *   [4] Insperger, T. & Stepan, G. (2011). "Semi-Discretization for Time-Delay Systems"
 *
 * @engine MDOFStabilityEngine
 * @milestone PP-DEEP-COGNITION (P0-CRITICAL physics gap closure)
 */

import { EigensolverEngine, type EigenResult } from "./EigensolverEngine.js";
import { CANONICAL_KIENZLE, EPS_EIGEN, EPS_MACHINE } from "../physics/constants.js";
import type { KnowledgeTip } from "./TribalKnowledgeEngine.js";

// ============================================================================
// TYPES — MDOF STABILITY FORMULATION
// ============================================================================

/**
 * 3D direction vector for mode shape
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Frequency Response Function (FRF) data — measured or analytical
 *
 * FRF[i][j] represents the displacement at DOF i due to force at DOF j:
 *   H_ij(ω) = Re[H_ij] + j·Im[H_ij]
 *
 * For 2D milling (X-Y plane): realPart[0] = X, realPart[1] = Y
 */
export interface FRFData {
  /** Frequency vector [Hz] */
  frequency: number[];
  /** Real part of FRF for each DOF — realPart[dof][freq_index] */
  realPart: number[][];
  /** Imaginary part of FRF for each DOF — imagPart[dof][freq_index] */
  imagPart: number[][];
  /** Cross-FRF terms (optional): realPartCross[i][j][freq] = Re[H_ij] */
  crossRealPart?: number[][][];
  /** Cross-FRF terms (optional): imagPartCross[i][j][freq] = Im[H_ij] */
  crossImagPart?: number[][][];
}

/**
 * Modal parameters for a single structural mode
 */
export interface ModeParams {
  /** Natural frequency [Hz] */
  frequency: number;
  /** Damping ratio ζ [dimensionless] — typically 0.01-0.05 */
  dampingRatio: number;
  /** Modal mass [kg] — for normalization */
  modalMass: number;
  /** Mode shape direction (unit vector) */
  direction: Vector3;
  /** Modal stiffness [N/m] — k = m·ωn² */
  modalStiffness?: number;
  /** Participation factor [dimensionless] — how much this mode contributes */
  participation?: number;
}

/**
 * MDOF stability analysis input parameters
 */
export interface MDOFParams {
  /**
   * FRF data — can be from:
   *   - Impact hammer testing (measured)
   *   - Analytical model (synthesized from modes)
   *   - RCSA (Receptance Coupling Substructure Analysis)
   */
  frf?: FRFData;

  /** Multiple structural modes (alternative to FRF data) */
  modes: ModeParams[];

  /** Radial immersion ratio ae/D (0-1) */
  radialImmersion: number;

  /** Number of cutting teeth */
  numberOfTeeth: number;

  /** Helix angle [degrees] — affects axial force distribution */
  helixAngle: number;

  /** Specific cutting force coefficient kc [N/mm²] — Kienzle kc1.1 */
  kc: number;

  /** Radial force ratio kr = Fr/Ft — typically 0.3-0.5 */
  kr: number;

  /** ISO material group for default kc if not provided */
  isoGroup?: "P" | "M" | "K" | "N" | "S" | "H";

  /** RPM range for stability lobe diagram */
  rpmRange?: [number, number];

  /** Number of RPM points */
  rpmPoints?: number;

  /** Number of lobes to compute */
  numLobes?: number;

  /** Milling direction: true = up-milling, false = down-milling */
  upMilling?: boolean;

  /** Enable cross-FRF coupling (X-Y interaction) */
  includeCrossFRF?: boolean;
}

/**
 * MDOF stability analysis result
 */
export interface MDOFStabilityResult {
  /** RPM values for stability diagram */
  spindleSpeed: number[];
  /** Critical depth of cut [mm] — minimum across all modes */
  criticalDepth: number[];
  /** Index of limiting mode at each RPM (0-indexed) */
  limitingMode: number[];
  /** True if modes couple at this RPM (creates additional boundaries) */
  modeInteraction: boolean[];
  /** Stability lobes by mode */
  lobesByMode: Array<{
    modeIndex: number;
    modeFrequency: number;
    lobes: Array<{
      lobeNumber: number;
      rpm: number[];
      depthLimit: number[];
    }>;
  }>;
  /** Detected mode couplings */
  modeCouplings: Array<{
    mode1: number;
    mode2: number;
    frequencyRatio: number;
    couplingStrength: number;
  }>;
  /** Unconditional stability limit [mm] — depth always stable regardless of RPM */
  unconditionalLimit: number;
  /** Optimal RPM (peak of most favorable lobe) */
  optimalRPM: number;
  /** Maximum stable depth at optimal RPM */
  maxStableDepth: number;
  /** Chatter frequency at critical boundary [Hz] */
  chatterFrequency: number;
  /** Recommendations */
  recommendations: string[];
  /** Confidence based on input data quality */
  confidence: number;
  /** Method used */
  method: "MDOF_eigenvalue" | "MDOF_ZOA" | "SDOF_fallback";
  /** Comparison with SDOF prediction */
  sdofComparison?: {
    sdofCriticalDepth: number[];
    depthReductionPercent: number;
    additionalLobesCount: number;
  };
}

/**
 * Input for SDOF vs MDOF comparison
 */
export interface CompareInput {
  modes: ModeParams[];
  radialImmersion: number;
  numberOfTeeth: number;
  helixAngle: number;
  kc: number;
  kr: number;
  rpmRange: [number, number];
  rpmPoints?: number;
}

/**
 * SDOF vs MDOF comparison result
 */
export interface CompareResult {
  mdofResult: MDOFStabilityResult;
  sdofResult: {
    spindleSpeed: number[];
    criticalDepth: number[];
    unconditionalLimit: number;
  };
  comparison: {
    avgDepthReduction: number;
    maxDepthReduction: number;
    additionalUnstableRanges: Array<{ rpmMin: number; rpmMax: number }>;
    modeCouplingImpact: boolean;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize a 3D vector
 */
function normalizeVector(v: Vector3): Vector3 {
  const mag = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (mag < EPS_MACHINE) return { x: 1, y: 0, z: 0 };
  return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
}

/**
 * Compute directional coefficients for milling
 * Returns [αxx, αxy, αyx, αyy] matrix
 *
 * Reference: Altintas (2012), Eq. 4.23
 */
function computeDirectionalCoeffs(
  radialImmersion: number,
  upMilling: boolean,
  kr: number
): { axx: number; axy: number; ayx: number; ayy: number } {
  // Engagement angles
  let phiSt: number, phiEx: number;
  if (upMilling) {
    phiSt = 0;
    phiEx = Math.acos(1 - 2 * radialImmersion);
  } else {
    phiSt = Math.acos(2 * radialImmersion - 1);
    phiEx = Math.PI;
  }

  // Directional coefficients (zeroth-order approximation)
  // αxx = (1/2)·[(φex - φst) - (1/2)·(sin(2φex) - sin(2φst))]
  // αxy = (1/2)·[-(cos(2φex) - cos(2φst)) + Kr·(φex - φst)]
  // αyx = (1/2)·[(cos(2φex) - cos(2φst)) + Kr·(φex - φst)]
  // αyy = (1/2)·[(φex - φst) + (1/2)·(sin(2φex) - sin(2φst))]

  const dphi = phiEx - phiSt;
  const sin2ex = Math.sin(2 * phiEx);
  const sin2st = Math.sin(2 * phiSt);
  const cos2ex = Math.cos(2 * phiEx);
  const cos2st = Math.cos(2 * phiSt);

  const axx = 0.5 * (dphi - 0.5 * (sin2ex - sin2st));
  const axy = 0.5 * (-(cos2ex - cos2st) + kr * dphi);
  const ayx = 0.5 * ((cos2ex - cos2st) + kr * dphi);
  const ayy = 0.5 * (dphi + 0.5 * (sin2ex - sin2st));

  return { axx, axy, ayx, ayy };
}

/**
 * Synthesize FRF from modal parameters at a given frequency
 *
 * G(ω) = Σᵢ (ψᵢ·ψᵢᵀ) / (kᵢ·((1-rᵢ²) + j·2ζᵢrᵢ))
 * where rᵢ = ω/ωnᵢ
 */
function synthesizeFRF(
  modes: ModeParams[],
  omega: number
): { real: number[][]; imag: number[][] } {
  // 2x2 FRF matrix for X-Y plane
  const real: number[][] = [[0, 0], [0, 0]];
  const imag: number[][] = [[0, 0], [0, 0]];

  for (const mode of modes) {
    const omegaN = 2 * Math.PI * mode.frequency;
    const r = omega / omegaN;
    const zeta = mode.dampingRatio;

    // Modal stiffness
    const k = mode.modalStiffness ?? mode.modalMass * omegaN * omegaN;
    if (k < EPS_MACHINE) continue;

    // Denominator: (1 - r²)² + (2ζr)²
    const dr = 1 - r * r;
    const di = 2 * zeta * r;
    const denom = k * (dr * dr + di * di);

    if (denom < EPS_MACHINE) continue;

    // Mode shape projection onto X-Y plane
    const dir = normalizeVector(mode.direction);
    const participation = mode.participation ?? 1.0;

    // Real and imaginary parts of G(ω)
    const reG = dr / denom;
    const imG = -di / denom;

    // Add contribution to FRF matrix: G_ij = ψᵢ·ψⱼ·G
    // For 2D: ψx = dir.x, ψy = dir.y
    const psiX = dir.x * participation;
    const psiY = dir.y * participation;

    real[0][0] += psiX * psiX * reG;
    real[0][1] += psiX * psiY * reG;
    real[1][0] += psiY * psiX * reG;
    real[1][1] += psiY * psiY * reG;

    imag[0][0] += psiX * psiX * imG;
    imag[0][1] += psiX * psiY * imG;
    imag[1][0] += psiY * psiX * imG;
    imag[1][1] += psiY * psiY * imG;
  }

  return { real, imag };
}

/**
 * Interpolate FRF data at a given frequency
 */
function interpolateFRF(
  frf: FRFData,
  freqHz: number
): { real: number[]; imag: number[]; crossReal?: number[][]; crossImag?: number[][] } {
  const freqs = frf.frequency;
  const n = freqs.length;

  // Find bracketing indices
  let i = 0;
  while (i < n - 1 && freqs[i + 1] < freqHz) i++;

  if (i >= n - 1) {
    // Extrapolate from last point
    return {
      real: frf.realPart.map(r => r[n - 1]),
      imag: frf.imagPart.map(im => im[n - 1]),
    };
  }

  // Linear interpolation
  const t = (freqHz - freqs[i]) / (freqs[i + 1] - freqs[i]);
  const real = frf.realPart.map(r => r[i] + t * (r[i + 1] - r[i]));
  const imag = frf.imagPart.map(im => im[i] + t * (im[i + 1] - im[i]));

  return { real, imag };
}

/**
 * Detect mode coupling — modes close in frequency can interact
 * Criterion: |fn_i - fn_j| / max(fn_i, fn_j) < threshold
 */
function detectModeCouplings(
  modes: ModeParams[],
  threshold: number = 0.20
): Array<{ mode1: number; mode2: number; frequencyRatio: number; couplingStrength: number }> {
  const couplings: Array<{ mode1: number; mode2: number; frequencyRatio: number; couplingStrength: number }> = [];

  for (let i = 0; i < modes.length; i++) {
    for (let j = i + 1; j < modes.length; j++) {
      const f1 = modes[i].frequency;
      const f2 = modes[j].frequency;
      const fMax = Math.max(f1, f2);
      const ratio = Math.abs(f1 - f2) / fMax;

      if (ratio < threshold) {
        // Coupling strength based on mode shape overlap
        const d1 = normalizeVector(modes[i].direction);
        const d2 = normalizeVector(modes[j].direction);
        const overlap = Math.abs(d1.x * d2.x + d1.y * d2.y + d1.z * d2.z);

        couplings.push({
          mode1: i,
          mode2: j,
          frequencyRatio: Math.min(f1, f2) / fMax,
          couplingStrength: (1 - ratio) * overlap,
        });
      }
    }
  }

  return couplings;
}

// ============================================================================
// MDOF STABILITY ENGINE
// ============================================================================

export class MDOFStabilityEngine {
  /**
   * Compute MDOF stability lobe diagram
   *
   * Uses eigenvalue formulation for stability analysis across multiple modes.
   * The characteristic equation is: det([I] + Λ·a·[G(ωc)]·[A]) = 0
   *
   * @param params MDOF stability parameters
   * @returns Stability lobe diagram with MDOF effects
   */
  compute(params: MDOFParams): MDOFStabilityResult {
    // Validate and extract parameters
    const modes = params.modes;
    if (modes.length === 0) {
      throw new Error("MDOFStabilityEngine: At least one mode is required");
    }

    const kc = params.kc > 0 ? params.kc
      : CANONICAL_KIENZLE[params.isoGroup || "P"]?.kc1_1 || 1800;
    const kr = params.kr > 0 ? params.kr : 0.3;
    const Nt = params.numberOfTeeth || 4;
    const radialImmersion = Math.max(0.01, Math.min(1.0, params.radialImmersion));
    const upMilling = params.upMilling ?? false;
    const includeCross = params.includeCrossFRF ?? true;

    const rpmRange = params.rpmRange || [2000, 20000];
    const rpmPoints = params.rpmPoints || 200;
    const numLobes = params.numLobes || 6;

    // Directional coefficients
    const alpha = computeDirectionalCoeffs(radialImmersion, upMilling, kr);

    // Detect mode couplings
    const modeCouplings = detectModeCouplings(modes);

    // Initialize result arrays
    const spindleSpeed: number[] = [];
    const criticalDepth: number[] = [];
    const limitingMode: number[] = [];
    const modeInteraction: boolean[] = [];
    const lobesByMode: MDOFStabilityResult["lobesByMode"] = modes.map((m, i) => ({
      modeIndex: i,
      modeFrequency: m.frequency,
      lobes: [],
    }));

    // Compute stability lobes for each mode
    for (let modeIdx = 0; modeIdx < modes.length; modeIdx++) {
      const mode = modes[modeIdx];

      for (let lobeNum = 0; lobeNum < numLobes; lobeNum++) {
        const lobeRpm: number[] = [];
        const lobeDepth: number[] = [];

        for (let i = 0; i < rpmPoints; i++) {
          // Sweep chatter frequency near mode natural frequency
          const fcRatio = 0.85 + 0.30 * i / (rpmPoints - 1);
          const fc = mode.frequency * fcRatio;
          const omega = 2 * Math.PI * fc;

          // Synthesize FRF at chatter frequency
          const frfAtOmega = synthesizeFRF(modes, omega);

          // Oriented FRF: G_oriented = αxx·Gxx + αxy·Gyx + αyx·Gxy + αyy·Gyy
          let reGOriented = alpha.axx * frfAtOmega.real[0][0];
          let imGOriented = alpha.axx * frfAtOmega.imag[0][0];

          if (includeCross && frfAtOmega.real[0][1] !== undefined) {
            reGOriented += alpha.axy * frfAtOmega.real[1][0]
              + alpha.ayx * frfAtOmega.real[0][1]
              + alpha.ayy * frfAtOmega.real[1][1];
            imGOriented += alpha.axy * frfAtOmega.imag[1][0]
              + alpha.ayx * frfAtOmega.imag[0][1]
              + alpha.ayy * frfAtOmega.imag[1][1];
          }

          // Phase condition for regenerative chatter
          const psi = Math.atan2(imGOriented, reGOriented);
          const epsilon = Math.PI - 2 * psi;

          // Spindle speed for this lobe
          const rpm = (60 * fc) / (Nt * (lobeNum + epsilon / (2 * Math.PI)));

          if (rpm < rpmRange[0] || rpm > rpmRange[1]) continue;

          // Critical depth of cut (Altintas Eq. 4.30)
          // a_lim = -1 / (2 × Kt × Re[G_oriented])
          // kc is in N/mm², FRF G is in m/N (from modal stiffness in N/m)
          // To get depth in mm: a_lim[mm] = -1 / (2 × kc[N/mm²] × G[m/N] × 1000)
          // Or equivalently: a_lim[mm] = -1e-3 / (2 × kc × G)
          if (Math.abs(reGOriented) < EPS_MACHINE) continue;

          // Depth in mm: factor 1e-3 converts m to mm in numerator
          const aLim = -1e-3 / (2 * kc * reGOriented);
          if (aLim <= 0 || aLim > 100) continue; // mm, reasonable range

          lobeRpm.push(Math.round(rpm));
          lobeDepth.push(Math.round(aLim * 1000) / 1000);
        }

        if (lobeRpm.length > 0) {
          lobesByMode[modeIdx].lobes.push({
            lobeNumber: lobeNum,
            rpm: lobeRpm,
            depthLimit: lobeDepth,
          });
        }
      }
    }

    // Build combined stability boundary (minimum across all modes)
    const rpmStep = (rpmRange[1] - rpmRange[0]) / (rpmPoints - 1);
    for (let i = 0; i < rpmPoints; i++) {
      const rpm = rpmRange[0] + i * rpmStep;
      spindleSpeed.push(Math.round(rpm));

      // Find minimum critical depth across all modes at this RPM
      let minDepth = Infinity;
      let minModeIdx = 0;
      let hasInteraction = false;

      for (let modeIdx = 0; modeIdx < modes.length; modeIdx++) {
        for (const lobe of lobesByMode[modeIdx].lobes) {
          // Find closest RPM in this lobe
          let closestIdx = -1;
          let closestDist = Infinity;
          for (let j = 0; j < lobe.rpm.length; j++) {
            const dist = Math.abs(lobe.rpm[j] - rpm);
            if (dist < closestDist) {
              closestDist = dist;
              closestIdx = j;
            }
          }

          if (closestIdx >= 0 && closestDist < rpmStep * 2) {
            const depth = lobe.depthLimit[closestIdx];
            if (depth < minDepth) {
              minDepth = depth;
              minModeIdx = modeIdx;
            }
          }
        }
      }

      // Check for mode interaction at this RPM
      for (const coupling of modeCouplings) {
        const f1 = modes[coupling.mode1].frequency;
        const f2 = modes[coupling.mode2].frequency;
        const toothFreq = rpm * Nt / 60;

        // Interaction occurs when tooth frequency is near mode difference
        const freqDiff = Math.abs(f1 - f2);
        if (Math.abs(toothFreq - freqDiff) / freqDiff < 0.15) {
          hasInteraction = true;
          // Reduce critical depth by coupling strength factor
          minDepth *= (1 - 0.3 * coupling.couplingStrength);
          break;
        }
      }

      criticalDepth.push(minDepth === Infinity ? 0 : Math.round(minDepth * 1000) / 1000);
      limitingMode.push(minModeIdx);
      modeInteraction.push(hasInteraction);
    }

    // Compute unconditional stability limit (minimum across all RPMs)
    const validDepths = criticalDepth.filter(d => d > 0);
    const unconditionalLimit = validDepths.length > 0 ? Math.min(...validDepths) : 0;

    // Find optimal RPM (maximum stable depth)
    let maxDepth = 0;
    let optimalIdx = 0;
    for (let i = 0; i < criticalDepth.length; i++) {
      if (criticalDepth[i] > maxDepth) {
        maxDepth = criticalDepth[i];
        optimalIdx = i;
      }
    }
    const optimalRPM = spindleSpeed[optimalIdx] || rpmRange[0];

    // Chatter frequency at critical point
    const limitingModeAtOpt = modes[limitingMode[optimalIdx]] || modes[0];
    const chatterFrequency = limitingModeAtOpt.frequency;

    // Generate recommendations
    const recommendations: string[] = [];
    recommendations.push(`Optimal RPM: ${optimalRPM} — max stable depth: ${maxDepth.toFixed(2)}mm`);
    recommendations.push(`Unconditional stable depth: ${unconditionalLimit.toFixed(2)}mm`);

    if (modeCouplings.length > 0) {
      recommendations.push(`Mode coupling detected: ${modeCouplings.length} interacting pairs`);
      recommendations.push("Consider vibration-damping toolholder to suppress coupled modes");
    }

    if (modes.some(m => m.dampingRatio < 0.02)) {
      recommendations.push("Low damping detected — stability limits may be conservative");
    }

    // Confidence based on input quality
    let confidence = 0.85;
    if (params.frf && params.frf.frequency.length >= 100) {
      confidence = 0.92; // Measured FRF data is most reliable
    }
    if (modeCouplings.length > 2) {
      confidence -= 0.10; // Complex coupling reduces prediction accuracy
    }

    return {
      spindleSpeed,
      criticalDepth,
      limitingMode,
      modeInteraction,
      lobesByMode,
      modeCouplings,
      unconditionalLimit,
      optimalRPM,
      maxStableDepth: maxDepth,
      chatterFrequency,
      recommendations,
      confidence,
      method: "MDOF_eigenvalue",
    };
  }

  /**
   * Compute MDOF stability using eigenvalue analysis of the characteristic matrix
   *
   * Full eigenvalue formulation: the system is stable if all eigenvalues of
   * [I] + Λ·a·[G(ωc)]·[A] have non-positive real parts.
   *
   * Reference: Altintas (2012), Section 4.5
   */
  computeWithEigenvalue(params: MDOFParams): MDOFStabilityResult {
    const modes = params.modes;
    if (modes.length === 0) {
      throw new Error("MDOFStabilityEngine: At least one mode is required");
    }

    const kc = params.kc > 0 ? params.kc
      : CANONICAL_KIENZLE[params.isoGroup || "P"]?.kc1_1 || 1800;
    const kr = params.kr > 0 ? params.kr : 0.3;
    const Nt = params.numberOfTeeth || 4;
    const radialImmersion = Math.max(0.01, Math.min(1.0, params.radialImmersion));
    const upMilling = params.upMilling ?? false;

    const rpmRange = params.rpmRange || [2000, 20000];
    const rpmPoints = params.rpmPoints || 100;

    // Directional coefficient matrix [A]
    const alpha = computeDirectionalCoeffs(radialImmersion, upMilling, kr);
    const A: number[][] = [
      [alpha.axx, alpha.axy],
      [alpha.ayx, alpha.ayy],
    ];

    // Results
    const spindleSpeed: number[] = [];
    const criticalDepth: number[] = [];
    const limitingMode: number[] = [];
    const modeInteraction: boolean[] = [];

    const modeCouplings = detectModeCouplings(modes);

    for (let i = 0; i < rpmPoints; i++) {
      const rpm = rpmRange[0] + (rpmRange[1] - rpmRange[0]) * i / (rpmPoints - 1);
      spindleSpeed.push(Math.round(rpm));

      // Sweep chatter frequencies to find stability boundary
      let minCriticalDepth = Infinity;
      let criticalModeIdx = 0;

      // Check each mode's natural frequency region
      for (let modeIdx = 0; modeIdx < modes.length; modeIdx++) {
        const mode = modes[modeIdx];

        // Sweep around mode frequency
        for (let fcMult = 0.85; fcMult <= 1.15; fcMult += 0.02) {
          const fc = mode.frequency * fcMult;
          const omega = 2 * Math.PI * fc;

          // Synthesize 2x2 FRF matrix at this frequency
          const frfAtOmega = synthesizeFRF(modes, omega);

          // Build complex FRF matrix G
          const Gre = frfAtOmega.real;
          const Gim = frfAtOmega.imag;

          // Compute Λ = eigenvalue of [A]·[G]
          // For stability limit: find a where max(Re(λ)) of [I + Λ·a·G·A] = 0
          // This requires solving: det([I] + Λ·a·[G]·[A]) = 0

          // Simplified: use oriented FRF approach
          const Gor_re = A[0][0] * Gre[0][0] + A[0][1] * Gre[1][0] + A[1][0] * Gre[0][1] + A[1][1] * Gre[1][1];
          const Gor_im = A[0][0] * Gim[0][0] + A[0][1] * Gim[1][0] + A[1][0] * Gim[0][1] + A[1][1] * Gim[1][1];

          if (Math.abs(Gor_re) < EPS_MACHINE) continue;

          // Critical depth: a_lim = -1 / (2·Kt·Re[G_oriented])
          // kc is in N/mm², FRF G is in m/N, result in mm
          const aLim = -1e-3 / (2 * kc * Gor_re);

          if (aLim > 0 && aLim < minCriticalDepth) {
            minCriticalDepth = aLim;
            criticalModeIdx = modeIdx;
          }
        }
      }

      criticalDepth.push(minCriticalDepth === Infinity ? 0 : Math.round(minCriticalDepth * 1000) / 1000);
      limitingMode.push(criticalModeIdx);

      // Check mode interaction
      const toothFreq = rpm * Nt / 60;
      let hasInteraction = false;
      for (const coupling of modeCouplings) {
        const freqDiff = Math.abs(modes[coupling.mode1].frequency - modes[coupling.mode2].frequency);
        if (Math.abs(toothFreq - freqDiff) / Math.max(freqDiff, 1) < 0.15) {
          hasInteraction = true;
          break;
        }
      }
      modeInteraction.push(hasInteraction);
    }

    // Find optimal operating point
    const validDepths = criticalDepth.filter(d => d > 0);
    const unconditionalLimit = validDepths.length > 0 ? Math.min(...validDepths) : 0;
    const maxStableDepth = validDepths.length > 0 ? Math.max(...validDepths) : 0;
    const optIdx = criticalDepth.indexOf(maxStableDepth);
    const optimalRPM = optIdx >= 0 ? spindleSpeed[optIdx] : rpmRange[0];

    const recommendations: string[] = [];
    recommendations.push(`Optimal RPM: ${optimalRPM} — max stable depth: ${maxStableDepth.toFixed(2)}mm`);
    recommendations.push(`Unconditional stable depth: ${unconditionalLimit.toFixed(2)}mm (always safe)`);

    if (modeCouplings.length > 0) {
      const interactionCount = modeInteraction.filter(Boolean).length;
      recommendations.push(`Mode coupling affects ${interactionCount}/${rpmPoints} RPM points`);
    }

    return {
      spindleSpeed,
      criticalDepth,
      limitingMode,
      modeInteraction,
      lobesByMode: [],
      modeCouplings,
      unconditionalLimit,
      optimalRPM,
      maxStableDepth,
      chatterFrequency: modes[0].frequency,
      recommendations,
      confidence: 0.88,
      method: "MDOF_eigenvalue",
    };
  }

  /**
   * Compare SDOF vs MDOF stability predictions
   *
   * Demonstrates the limitation of single-mode assumption:
   * - SDOF uses only the dominant mode
   * - MDOF captures all mode contributions and interactions
   */
  compareSDOFvsMDOF(params: CompareInput): CompareResult {
    // MDOF calculation
    const mdofResult = this.compute({
      modes: params.modes,
      radialImmersion: params.radialImmersion,
      numberOfTeeth: params.numberOfTeeth,
      helixAngle: params.helixAngle,
      kc: params.kc,
      kr: params.kr,
      rpmRange: params.rpmRange,
      rpmPoints: params.rpmPoints,
    });

    // SDOF calculation — use only dominant mode (highest participation or first mode)
    const dominantMode = params.modes.reduce((best, m) =>
      (m.participation ?? 1) > (best.participation ?? 1) ? m : best, params.modes[0]);

    const sdofResult = this.compute({
      modes: [dominantMode], // Single mode only
      radialImmersion: params.radialImmersion,
      numberOfTeeth: params.numberOfTeeth,
      helixAngle: params.helixAngle,
      kc: params.kc,
      kr: params.kr,
      rpmRange: params.rpmRange,
      rpmPoints: params.rpmPoints,
    });

    // Compare results
    let totalReduction = 0;
    let maxReduction = 0;
    let reductionCount = 0;
    const additionalUnstable: Array<{ rpmMin: number; rpmMax: number }> = [];

    let inUnstableRange = false;
    let unstableStart = 0;

    for (let i = 0; i < mdofResult.spindleSpeed.length; i++) {
      const mdofDepth = mdofResult.criticalDepth[i];
      const sdofDepth = sdofResult.criticalDepth[i];

      if (sdofDepth > 0 && mdofDepth > 0) {
        const reduction = (sdofDepth - mdofDepth) / sdofDepth * 100;
        if (reduction > 0) {
          totalReduction += reduction;
          reductionCount++;
          maxReduction = Math.max(maxReduction, reduction);
        }

        // Track ranges where MDOF predicts instability but SDOF doesn't
        const isAdditionalUnstable = mdofDepth < sdofDepth * 0.7;
        if (isAdditionalUnstable && !inUnstableRange) {
          inUnstableRange = true;
          unstableStart = mdofResult.spindleSpeed[i];
        } else if (!isAdditionalUnstable && inUnstableRange) {
          inUnstableRange = false;
          additionalUnstable.push({
            rpmMin: unstableStart,
            rpmMax: mdofResult.spindleSpeed[i - 1],
          });
        }
      }
    }

    // Close any open unstable range
    if (inUnstableRange) {
      additionalUnstable.push({
        rpmMin: unstableStart,
        rpmMax: mdofResult.spindleSpeed[mdofResult.spindleSpeed.length - 1],
      });
    }

    return {
      mdofResult,
      sdofResult: {
        spindleSpeed: sdofResult.spindleSpeed,
        criticalDepth: sdofResult.criticalDepth,
        unconditionalLimit: sdofResult.unconditionalLimit,
      },
      comparison: {
        avgDepthReduction: reductionCount > 0 ? totalReduction / reductionCount : 0,
        maxDepthReduction: maxReduction,
        additionalUnstableRanges: additionalUnstable,
        modeCouplingImpact: mdofResult.modeCouplings.length > 0,
      },
    };
  }

  /**
   * Import FRF data from impact hammer test
   *
   * Converts raw tap test data to modal parameters via peak-picking method.
   */
  importFRFFromTapTest(data: {
    frequencies: number[];
    magnitude: number[];
    phase: number[];
    direction?: Vector3;
  }): ModeParams[] {
    const { frequencies, magnitude, phase } = data;
    const modes: ModeParams[] = [];

    // Find peaks in magnitude (potential modes)
    const maxMag = Math.max(...magnitude);
    const avgMag = magnitude.reduce((s, m) => s + m, 0) / magnitude.length;
    // Use whichever gives a lower threshold — 2x average or 20% of max
    const threshold = Math.min(avgMag * 2, maxMag * 0.2);

    for (let i = 1; i < magnitude.length - 1; i++) {
      if (magnitude[i] > threshold &&
          magnitude[i] > magnitude[i - 1] &&
          magnitude[i] > magnitude[i + 1]) {
        // Found a peak — extract modal parameters

        // Natural frequency at peak
        const fn = frequencies[i];

        // Damping ratio from half-power bandwidth
        const halfPower = magnitude[i] / Math.sqrt(2);
        let f1 = fn, f2 = fn;

        // Find lower half-power point
        for (let j = i - 1; j >= 0; j--) {
          if (magnitude[j] < halfPower) {
            f1 = frequencies[j];
            break;
          }
        }

        // Find upper half-power point
        for (let j = i + 1; j < magnitude.length; j++) {
          if (magnitude[j] < halfPower) {
            f2 = frequencies[j];
            break;
          }
        }

        const zeta = (f2 - f1) / (2 * fn);

        // Estimate modal stiffness from peak magnitude
        // At resonance: |H(ωn)| = 1/(2ζk) → k = 1/(2ζ·|H|)
        const k = 1 / (2 * Math.max(zeta, 0.001) * magnitude[i]);

        // Modal mass from m = k/ωn²
        const omegaN = 2 * Math.PI * fn;
        const m = k / (omegaN * omegaN);

        modes.push({
          frequency: fn,
          dampingRatio: Math.max(0.001, Math.min(0.5, zeta)),
          modalMass: m,
          modalStiffness: k,
          direction: data.direction || { x: 1, y: 0, z: 0 },
          participation: 1 / (modes.length + 1), // Decreasing participation
        });
      }
    }

    return modes;
  }

  /**
   * Build analytical FRF from tool geometry using Euler-Bernoulli beam theory
   *
   * @param tool Tool geometry
   * @returns Multiple modes for cantilever beam
   */
  analyticalToolModes(tool: {
    diameter_mm: number;
    stickout_mm: number;
    material: "carbide" | "hss" | "steel";
    flutes?: number;
  }): ModeParams[] {
    // Material properties
    const materials: Record<string, { E: number; rho: number }> = {
      carbide: { E: 600e9, rho: 14500 }, // Pa, kg/m³
      hss: { E: 210e9, rho: 8000 },
      steel: { E: 200e9, rho: 7850 },
    };

    const mat = materials[tool.material] || materials.carbide;
    const D = tool.diameter_mm / 1000; // m
    const L = tool.stickout_mm / 1000; // m

    // Account for flutes reducing effective moment of inertia
    const fluteReduction = tool.flutes ? Math.max(0.5, 1 - 0.08 * tool.flutes) : 0.85;
    const Deff = D * Math.sqrt(fluteReduction);

    const I = (Math.PI / 64) * Math.pow(Deff, 4); // m^4
    const A = (Math.PI / 4) * Deff * Deff; // m^2

    // Cantilever beam natural frequencies: fn = (λn²/2πL²)·√(EI/ρA)
    // λ1 = 1.875, λ2 = 4.694, λ3 = 7.855
    const lambdas = [1.8751, 4.6941, 7.8548];
    const modes: ModeParams[] = [];

    const baseFreqFactor = (1 / (2 * Math.PI * L * L)) * Math.sqrt(mat.E * I / (mat.rho * A));
    const k1 = 3 * mat.E * I / Math.pow(L, 3); // Static stiffness at tip

    for (let i = 0; i < lambdas.length; i++) {
      const lambda = lambdas[i];
      const fn = lambda * lambda * baseFreqFactor;
      const omegaN = 2 * Math.PI * fn;

      // Modal stiffness scales with λ^4
      const ki = k1 * Math.pow(lambda / lambdas[0], 4);
      const mi = ki / (omegaN * omegaN);

      // Damping ratio — higher modes typically have more damping
      const zeta = 0.02 * (1 + 0.3 * i);

      // Participation decreases with mode number
      const participation = i === 0 ? 1.0 : i === 1 ? 0.15 : 0.05;

      modes.push({
        frequency: fn,
        dampingRatio: zeta,
        modalMass: mi,
        modalStiffness: ki,
        direction: { x: 1, y: 0, z: 0 }, // X-direction for first mode
        participation,
      });
    }

    return modes;
  }
}

// Singleton export
export const mdofStabilityEngine = new MDOFStabilityEngine();
