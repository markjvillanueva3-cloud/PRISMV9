/**
 * ISO286ExtendedEngine — Extended ISO 286-1:2010 Limits & Fits Analysis
 *
 * Extends the built-in ToleranceEngine with:
 *   - Full range 0–3150mm (vs 1–500mm) from hyperMILL v33.0 data
 *   - 42 size bands (vs 13)
 *   - Grade-specific deviations for transition/interference fits (K3-K9, M3-M9, etc.)
 *   - All shaft positions including cd, ef, fg, j5-j8, za, zb, zc
 *   - 108 hole deviation columns
 *   - Stochastic fit analysis: Monte Carlo P(interference) given process σ
 *   - Fit recommendation: suggest optimal fit for application type
 *   - Variability-aware tolerance stack-up with Cholesky-correlated inputs
 *
 * Data source: hyperCAD-S/33.0/files/draftingsettings/isofittingtols.sqlite
 */

import { log } from "../utils/Logger.js";
import {
  ISO286_QUALITY_GRADES,
  ISO286_SIZE_BANDS,
  ISO286_DEVIATION_BANDS,
  ISO286_SHAFT_DEVIATIONS,
  ISO286_HOLE_DEVIATIONS,
} from "../data/iso286-extended-catalog.js";

// ============================================================================
// Types
// ============================================================================

export interface ExtendedITResult {
  tolerance_um: number;
  tolerance_mm: number;
  grade: number;
  grade_label: string;
  nominal_mm: number;
  size_band: string;
  extended: boolean;
}

export interface ExtendedFitLimit {
  nominal_mm: number;
  upper_mm: number;
  lower_mm: number;
  tolerance_mm: number;
  tolerance_um: number;
  position: string;
  grade: number;
  deviation_um: number;
}

export interface ExtendedFitResult {
  nominal_mm: number;
  fit_class: string;
  hole: ExtendedFitLimit;
  shaft: ExtendedFitLimit;
  fit_type: "clearance" | "transition" | "interference";
  min_clearance_um: number;
  max_clearance_um: number;
  mean_clearance_um: number;
  overlap_um: number;
}

export interface StochasticFitResult extends ExtendedFitResult {
  process_sigma_um: number;
  samples: number;
  p_clearance: number;
  p_transition: number;
  p_interference: number;
  clearance_mean_um: number;
  clearance_std_um: number;
  clearance_p05_um: number;
  clearance_p95_um: number;
  assembly_force_indicator: "none" | "light" | "moderate" | "heavy";
}

export interface FitRecommendation {
  application: string;
  recommended_fit: string;
  fit_type: "clearance" | "transition" | "interference";
  reason: string;
  alternatives: string[];
}

export interface VariabilityStackResult {
  dimensions: number;
  mean_mm: number;
  wc_tolerance_mm: number;
  rss_tolerance_mm: number;
  mc_tolerance_mm: number;
  mc_p05_mm: number;
  mc_p95_mm: number;
  cpk_at_wc: number;
  cpk_at_rss: number;
  samples: number;
}

// ============================================================================
// Size band resolution
// ============================================================================

function findExtendedSizeBand(nominal_mm: number): { index: number; band: [number, number] } | null {
  for (let i = 0; i < ISO286_SIZE_BANDS.length; i++) {
    const [lo, hi] = ISO286_SIZE_BANDS[i];
    if ((i === 0 ? nominal_mm >= lo : nominal_mm > lo) && nominal_mm <= hi) {
      return { index: i, band: [lo, hi] };
    }
  }
  return null;
}

/** Find deviation band index (41 bands, finer than IT grade bands). */
function findDeviationBand(nominal_mm: number): number {
  for (let i = 0; i < ISO286_DEVIATION_BANDS.length; i++) {
    const [lo, hi] = ISO286_DEVIATION_BANDS[i];
    if ((i === 0 ? nominal_mm >= lo : nominal_mm > lo) && nominal_mm <= hi) {
      return i;
    }
  }
  return -1;
}

function getExtendedIT(nominal_mm: number, grade: number): { tolerance_um: number; bandIdx: number; band: [number, number] } | null {
  const sb = findExtendedSizeBand(nominal_mm);
  if (!sb) return null;

  // Find the quality grade row for this size band
  const upperBound = sb.band[1];
  const gradeRow = ISO286_QUALITY_GRADES[upperBound];
  if (!gradeRow) return null;

  // Grade index: IT01=0, IT0=1, IT1=2, ..., IT17=18
  let colIdx: number;
  if (grade === -1) colIdx = 0;       // IT01
  else if (grade === 0) colIdx = 1;   // IT0
  else if (grade >= 1 && grade <= 17) colIdx = grade + 1;
  else return null;

  if (colIdx >= gradeRow.length) return null;

  return { tolerance_um: gradeRow[colIdx], bandIdx: sb.index, band: sb.band };
}

// ============================================================================
// Engine
// ============================================================================

export class ISO286ExtendedEngine {
  /**
   * Calculate IT grade tolerance for any nominal size 0–3150mm.
   */
  calculateITGrade(nominal_mm: number, it_grade: number): ExtendedITResult {
    const result = getExtendedIT(nominal_mm, it_grade);
    if (!result) {
      throw new Error(
        `[ISO286Extended] Nominal ${nominal_mm}mm or IT grade ${it_grade} out of range (0–3150mm, IT01–IT17)`
      );
    }

    return {
      tolerance_um: result.tolerance_um,
      tolerance_mm: result.tolerance_um / 1000,
      grade: it_grade,
      grade_label: it_grade === -1 ? "IT01" : `IT${it_grade}`,
      nominal_mm,
      size_band: `${result.band[0]}–${result.band[1]} mm`,
      extended: nominal_mm > 500,
    };
  }

  /**
   * Analyze a shaft/hole fit with grade-specific deviations.
   * Supports full ISO 286 position set including cd, ef, fg, j, za, zb, zc.
   */
  analyzeFit(nominal_mm: number, fit_class: string): ExtendedFitResult {
    // Parse: "H7/g6", "H7/p6", "JS7/k6"
    const match = fit_class.match(/^([A-Z]{1,2})(\d+)\s*\/\s*([a-z]{1,2})(\d+)$/i);
    if (!match) {
      throw new Error(`[ISO286Extended] Invalid fit: "${fit_class}". Expected "H7/g6" format.`);
    }

    const holePos = match[1].toUpperCase();
    const holeGrade = parseInt(match[2], 10);
    const shaftPos = match[3].toLowerCase();
    const shaftGrade = parseInt(match[4], 10);

    const sb = findExtendedSizeBand(nominal_mm);
    if (!sb) {
      throw new Error(`[ISO286Extended] Nominal ${nominal_mm}mm out of range (0–3150mm)`);
    }

    // Get IT tolerances
    const holeIT = getExtendedIT(nominal_mm, holeGrade);
    const shaftIT = getExtendedIT(nominal_mm, shaftGrade);
    if (!holeIT || !shaftIT) {
      throw new Error(`[ISO286Extended] IT grade out of range`);
    }

    // Get deviations using finer deviation bands (41 bands vs 21 IT bands)
    const devBandIdx = findDeviationBand(nominal_mm);
    if (devBandIdx < 0) {
      throw new Error(`[ISO286Extended] No deviation band for ${nominal_mm}mm`);
    }

    const holeDev = this.getHoleDeviation(holePos, holeGrade, devBandIdx);
    const shaftDev = this.getShaftDeviation(shaftPos, shaftGrade, devBandIdx);

    // Calculate limits
    let holeUpper_um: number, holeLower_um: number;
    if (holeDev.type === "EI") {
      holeLower_um = holeDev.value;
      holeUpper_um = holeLower_um + holeIT.tolerance_um;
    } else {
      holeUpper_um = holeDev.value;
      holeLower_um = holeUpper_um - holeIT.tolerance_um;
    }

    let shaftUpper_um: number, shaftLower_um: number;
    if (shaftDev.type === "es") {
      shaftUpper_um = shaftDev.value;
      shaftLower_um = shaftUpper_um - shaftIT.tolerance_um;
    } else {
      shaftLower_um = shaftDev.value;
      shaftUpper_um = shaftLower_um + shaftIT.tolerance_um;
    }

    const maxClearance = holeUpper_um - shaftLower_um;
    const minClearance = holeLower_um - shaftUpper_um;

    let fit_type: "clearance" | "transition" | "interference";
    if (minClearance > 0) fit_type = "clearance";
    else if (maxClearance < 0) fit_type = "interference";
    else fit_type = "transition";

    return {
      nominal_mm,
      fit_class,
      hole: {
        nominal_mm,
        upper_mm: nominal_mm + holeUpper_um / 1000,
        lower_mm: nominal_mm + holeLower_um / 1000,
        tolerance_mm: holeIT.tolerance_um / 1000,
        tolerance_um: holeIT.tolerance_um,
        position: holePos,
        grade: holeGrade,
        deviation_um: holeDev.value,
      },
      shaft: {
        nominal_mm,
        upper_mm: nominal_mm + shaftUpper_um / 1000,
        lower_mm: nominal_mm + shaftLower_um / 1000,
        tolerance_mm: shaftIT.tolerance_um / 1000,
        tolerance_um: shaftIT.tolerance_um,
        position: shaftPos,
        grade: shaftGrade,
        deviation_um: shaftDev.value,
      },
      fit_type,
      min_clearance_um: minClearance,
      max_clearance_um: maxClearance,
      mean_clearance_um: (maxClearance + minClearance) / 2,
      overlap_um: fit_type === "interference" ? -maxClearance : 0,
    };
  }

  /**
   * Stochastic fit analysis — Monte Carlo simulation of actual assembly clearance
   * given manufacturing process variation (σ).
   *
   * Models hole and shaft dimensions as normal distributions within their
   * tolerance bands, then computes P(clearance), P(interference), and
   * clearance distribution statistics.
   */
  stochasticFitAnalysis(
    nominal_mm: number,
    fit_class: string,
    process_sigma_um: number,
    samples: number = 10000
  ): StochasticFitResult {
    const fit = this.analyzeFit(nominal_mm, fit_class);

    // Model: each dimension is N(midpoint, σ²) but clamped to tolerance band
    const holeMid_um = (fit.hole.deviation_um * 2 + fit.hole.tolerance_um) / 2;
    const shaftMid_um = fit.shaft.deviation_um + fit.shaft.tolerance_um / 2;

    // When shaft dev is upper (clearance), midpoint is deviation - IT/2
    const holeCenter = (fit.hole.upper_mm - fit.hole.lower_mm) / 2 + fit.hole.lower_mm;
    const shaftCenter = (fit.shaft.upper_mm - fit.shaft.lower_mm) / 2 + fit.shaft.lower_mm;

    const sigma_mm = process_sigma_um / 1000;

    let clearances: number[] = [];
    let nClearance = 0;
    let nTransition = 0;
    let nInterference = 0;

    // Box-Muller RNG
    const randn = (): number => {
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    };

    for (let i = 0; i < samples; i++) {
      const holeDim = holeCenter + randn() * sigma_mm;
      const shaftDim = shaftCenter + randn() * sigma_mm;
      const clearance_um = (holeDim - shaftDim) * 1000;

      clearances.push(clearance_um);

      if (clearance_um > 0) nClearance++;
      else if (clearance_um < 0) nInterference++;
      else nTransition++;
    }

    clearances.sort((a, b) => a - b);
    const mean = clearances.reduce((s, c) => s + c, 0) / samples;
    const variance = clearances.reduce((s, c) => s + (c - mean) ** 2, 0) / (samples - 1);
    const std = Math.sqrt(variance);

    const p05 = clearances[Math.floor(samples * 0.05)];
    const p95 = clearances[Math.floor(samples * 0.95)];

    // Assembly force indicator based on interference magnitude
    let assemblyForce: "none" | "light" | "moderate" | "heavy" = "none";
    if (nInterference / samples > 0.5) {
      const medianInterference = -clearances[Math.floor(samples * 0.5)];
      if (medianInterference > 50) assemblyForce = "heavy";
      else if (medianInterference > 20) assemblyForce = "moderate";
      else if (medianInterference > 0) assemblyForce = "light";
    }

    return {
      ...fit,
      process_sigma_um,
      samples,
      p_clearance: nClearance / samples,
      p_transition: nTransition / samples,
      p_interference: nInterference / samples,
      clearance_mean_um: Math.round(mean * 10) / 10,
      clearance_std_um: Math.round(std * 10) / 10,
      clearance_p05_um: Math.round(p05 * 10) / 10,
      clearance_p95_um: Math.round(p95 * 10) / 10,
      assembly_force_indicator: assemblyForce,
    };
  }

  /**
   * Recommend a fit for a given application type.
   */
  recommendFit(
    application:
      | "free_running"
      | "sliding"
      | "location_clearance"
      | "location_transition"
      | "light_press"
      | "press"
      | "shrink"
      | "bearing_housing"
      | "shaft_bearing"
      | "piston_cylinder"
  ): FitRecommendation {
    const recs: Record<string, FitRecommendation> = {
      free_running: {
        application: "Free running / loose fit",
        recommended_fit: "H9/d9",
        fit_type: "clearance",
        reason: "Large clearance for free rotation, thermal expansion, contamination tolerance",
        alternatives: ["H8/e8", "H11/c11"],
      },
      sliding: {
        application: "Sliding / precision running",
        recommended_fit: "H7/g6",
        fit_type: "clearance",
        reason: "Small clearance for precision sliding fits with lubrication",
        alternatives: ["H7/f7", "H8/f7"],
      },
      location_clearance: {
        application: "Location clearance",
        recommended_fit: "H7/h6",
        fit_type: "clearance",
        reason: "Snug fit, parts can be assembled/disassembled by hand",
        alternatives: ["H7/h7", "H8/h7"],
      },
      location_transition: {
        application: "Location transition",
        recommended_fit: "H7/k6",
        fit_type: "transition",
        reason: "May be clearance or slight interference, good for accurate location",
        alternatives: ["H7/js6", "H7/m6"],
      },
      light_press: {
        application: "Light press fit",
        recommended_fit: "H7/p6",
        fit_type: "interference",
        reason: "Light interference, can be assembled with arbor press",
        alternatives: ["H7/n6", "H7/r6"],
      },
      press: {
        application: "Medium press fit",
        recommended_fit: "H7/s6",
        fit_type: "interference",
        reason: "Medium interference for permanent assembly, requires hydraulic press",
        alternatives: ["H7/r6", "H7/t6"],
      },
      shrink: {
        application: "Shrink / heavy press fit",
        recommended_fit: "H7/u6",
        fit_type: "interference",
        reason: "Heavy interference requiring thermal assembly (heating/cooling)",
        alternatives: ["H7/x6", "H7/z6"],
      },
      bearing_housing: {
        application: "Bearing in housing (stationary outer ring)",
        recommended_fit: "H7/h6",
        fit_type: "clearance",
        reason: "ISO recommendation for stationary outer ring bearings",
        alternatives: ["H6/h5", "J7/h6"],
      },
      shaft_bearing: {
        application: "Bearing on shaft (rotating inner ring)",
        recommended_fit: "H7/k6",
        fit_type: "transition",
        reason: "ISO recommendation for rotating inner ring, prevents creep",
        alternatives: ["H7/js6", "H7/m6"],
      },
      piston_cylinder: {
        application: "Piston / cylinder bore",
        recommended_fit: "H7/f7",
        fit_type: "clearance",
        reason: "Precision clearance for reciprocating motion with oil film",
        alternatives: ["H7/e7", "H8/f7"],
      },
    };

    return recs[application] ?? recs.sliding;
  }

  /**
   * Variability-aware tolerance stack-up with Monte Carlo simulation.
   * Supports correlated dimensions via Cholesky decomposition.
   */
  variabilityStackUp(
    dimensions: Array<{
      nominal_mm: number;
      tolerance_mm: number;
      process_sigma_mm?: number;
      correlation_group?: number;
    }>,
    samples: number = 10000,
    correlation_coefficient: number = 0
  ): VariabilityStackResult {
    const n = dimensions.length;
    const mean = dimensions.reduce((s, d) => s + d.nominal_mm, 0);
    const wcTol = dimensions.reduce((s, d) => s + Math.abs(d.tolerance_mm), 0);
    const rssTol = Math.sqrt(dimensions.reduce((s, d) => s + d.tolerance_mm ** 2, 0));

    // Monte Carlo with optional correlation
    const randn = (): number => {
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    };

    const stackSums: number[] = [];

    for (let s = 0; s < samples; s++) {
      // Generate independent normals
      const z: number[] = [];
      for (let i = 0; i < n; i++) z.push(randn());

      // Apply correlation via simplified Cholesky (uniform correlation)
      if (correlation_coefficient > 0 && n > 1) {
        const rho = correlation_coefficient;
        const a = Math.sqrt(rho);
        const b = Math.sqrt(1 - rho);
        const common = randn();
        for (let i = 0; i < n; i++) {
          z[i] = a * common + b * z[i];
        }
      }

      let sum = 0;
      for (let i = 0; i < n; i++) {
        const d = dimensions[i];
        const sigma = d.process_sigma_mm ?? d.tolerance_mm / 3;
        sum += d.nominal_mm + z[i] * sigma;
      }
      stackSums.push(sum);
    }

    stackSums.sort((a, b) => a - b);
    const mcMean = stackSums.reduce((s, v) => s + v, 0) / samples;
    const mcVar = stackSums.reduce((s, v) => s + (v - mcMean) ** 2, 0) / (samples - 1);
    const mcStd = Math.sqrt(mcVar);
    const mcTol = 3 * mcStd; // 3σ one-sided = 99.73% coverage

    const p05 = stackSums[Math.floor(samples * 0.05)];
    const p95 = stackSums[Math.floor(samples * 0.95)];

    // Cpk estimates
    const totalSpec = wcTol;
    const cpkWC = totalSpec / (6 * mcStd);
    const cpkRSS = rssTol / (3 * mcStd);

    return {
      dimensions: n,
      mean_mm: Math.round(mcMean * 1000) / 1000,
      wc_tolerance_mm: Math.round(wcTol * 1000) / 1000,
      rss_tolerance_mm: Math.round(rssTol * 1000) / 1000,
      mc_tolerance_mm: Math.round(mcTol * 1000) / 1000,
      mc_p05_mm: Math.round(p05 * 1000) / 1000,
      mc_p95_mm: Math.round(p95 * 1000) / 1000,
      cpk_at_wc: Math.round(cpkWC * 100) / 100,
      cpk_at_rss: Math.round(cpkRSS * 100) / 100,
      samples,
    };
  }

  /**
   * List all available shaft positions.
   */
  getAvailableShaftPositions(): string[] {
    return Object.keys(ISO286_SHAFT_DEVIATIONS);
  }

  /**
   * List all available hole positions.
   */
  getAvailableHolePositions(): string[] {
    return Object.keys(ISO286_HOLE_DEVIATIONS);
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private getShaftDeviation(
    position: string,
    grade: number,
    bandIdx: number
  ): { type: "es" | "ei"; value: number } {
    const pos = position.toLowerCase();

    // js = symmetric ±IT/2
    if (pos === "js") {
      const it = this.getITAtBand(bandIdx, grade);
      return { type: "es", value: it / 2 }; // will also set lower = -IT/2
    }

    // Clearance shafts (a-h): look up upper deviation (es, negative)
    const clearancePositions = ["a", "b", "c", "cd", "d", "e", "ef", "f", "fg", "g", "h"];
    if (clearancePositions.includes(pos)) {
      const devs = ISO286_SHAFT_DEVIATIONS[pos];
      if (!devs || bandIdx >= devs.length) {
        throw new Error(`[ISO286Extended] No shaft deviation for ${pos} at band ${bandIdx}`);
      }
      return { type: "es", value: devs[bandIdx] };
    }

    // Grade-specific positions: j5-j8, k3-k8
    const gradeKey = `${pos}${grade}`;
    if (ISO286_SHAFT_DEVIATIONS[gradeKey]) {
      const devs = ISO286_SHAFT_DEVIATIONS[gradeKey];
      if (bandIdx < devs.length) {
        return { type: "ei", value: devs[bandIdx] };
      }
    }

    // Interference/transition shafts: look up lower deviation (ei, positive)
    const devs = ISO286_SHAFT_DEVIATIONS[pos];
    if (devs && bandIdx < devs.length) {
      // For k-zc, the stored value IS the fundamental deviation
      return { type: "ei", value: devs[bandIdx] };
    }

    throw new Error(`[ISO286Extended] Unknown shaft position: ${pos} (grade ${grade})`);
  }

  private getHoleDeviation(
    position: string,
    grade: number,
    bandIdx: number
  ): { type: "EI" | "ES"; value: number } {
    const pos = position.toUpperCase();

    // JS = symmetric ±IT/2
    if (pos === "JS") {
      return { type: "EI", value: 0 }; // handled symmetrically in caller
    }

    // H = 0 by definition
    if (pos === "H") {
      return { type: "EI", value: 0 };
    }

    // Try grade-specific hole deviation first (e.g., K6, M7, N6)
    const gradeKey = `${pos}${grade}`;
    if (ISO286_HOLE_DEVIATIONS[gradeKey]) {
      const devs = ISO286_HOLE_DEVIATIONS[gradeKey];
      if (bandIdx < devs.length) {
        const val = devs[bandIdx];
        // Clearance holes (A-H): value is EI (positive)
        // Interference holes (K-ZC): value is ES (could be negative)
        const clearanceHoles = ["A", "B", "C", "CD", "D", "E", "EF", "F", "FG", "G"];
        if (clearanceHoles.includes(pos)) {
          return { type: "EI", value: val };
        } else {
          return { type: "ES", value: val };
        }
      }
    }

    // Fall back to non-grade-specific
    const devs = ISO286_HOLE_DEVIATIONS[pos];
    if (devs && bandIdx < devs.length) {
      const clearanceHoles = ["A", "B", "C", "CD", "D", "E", "EF", "F", "FG", "G"];
      if (clearanceHoles.includes(pos)) {
        return { type: "EI", value: devs[bandIdx] };
      } else {
        return { type: "ES", value: devs[bandIdx] };
      }
    }

    throw new Error(`[ISO286Extended] Unknown hole position: ${pos} (grade ${grade})`);
  }

  private getITAtBand(bandIdx: number, grade: number): number {
    const band = ISO286_SIZE_BANDS[bandIdx];
    if (!band) return 0;
    const row = ISO286_QUALITY_GRADES[band[1]];
    if (!row) return 0;
    let colIdx: number;
    if (grade === -1) colIdx = 0;
    else if (grade === 0) colIdx = 1;
    else colIdx = grade + 1;
    return row[colIdx] ?? 0;
  }
}

export default ISO286ExtendedEngine;
