/**
 * WEDMCalibrationReportEngine — Compares shop program parameters to published benchmarks.
 *
 *
 * References:
 *   - WEDM_PUBLISHED_BENCHMARKS.json — compiled industry data
 *   - SHOP_NC_PROGRAM_CATALOG.json — real shop program parameters
 *   - Makino DUO64 specifications (320 mm²/min benchmark)
 *   - Modern Machine Shop — wire EDM speed/accuracy/finish data
 *
 * @module engines/WEDMCalibrationReportEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface CalibrationInput {
  /** Parsed program parameters (from WireEDMProgramParserEngine) */
  shop_program: {
    filename: string;
    material_iso_group: "P" | "M" | "K" | "N" | "S" | "H";
    thickness_mm: number;
    wire_diameter_mm: number;
    num_passes: number;
    /** Per-pass offset values in mm (from H-register declarations) */
    offsets_mm: number[];
    /** Per-pass feed rates in mm/min */
    feeds_mmmin: (number | null)[];
    /** E-code condition codes */
    e_codes: string[];
    has_taper: boolean;
    has_adaptive_control: boolean;
    /** True if cutting involves brazed carbide inserts or bi-material interface */
    is_bimaterial?: boolean;
    /** Hardness if known (HRC) */
    hardness_hrc?: number;
  };
}

export interface ParameterDeviation {
  parameter: string;
  shop_value: number;
  published_value: number;
  unit: string;
  deviation_pct: number;
  /** "improvement" = shop could be better, "acceptable" = within range, "custom" = intentional */
  assessment: "improvement" | "acceptable" | "custom";
  recommendation: string;
}

export interface CalibrationReport {
  program: string;
  material: string;
  thickness_mm: number;
  overall_efficiency_pct: number;
  deviations: ParameterDeviation[];
  pass_analysis: PassAnalysis[];
  improvement_summary: string[];
  estimated_time_savings_pct: number;
}

export interface PassAnalysis {
  pass: number;
  e_code: string | null;
  shop_feed_mmmin: number | null;
  published_feed_mmmin: number;
  shop_offset_mm: number | null;
  published_offset_mm: number;
  efficiency_pct: number;
}

// ============================================================================
// PUBLISHED REFERENCE DATA
// ============================================================================

/**
 * Published area cutting rates by ISO group (mm²/min) — rough cut, 0.25mm brass wire.
 * Sources: Makino specs, Practical Machinist, Modern Machine Shop
 */
const PUBLISHED_AREA_RATES: Record<string, { min: number; typical: number; max: number }> = {
  P: { min: 150, typical: 200, max: 250 },
  M: { min: 100, typical: 150, max: 200 },
  K: { min: 200, typical: 250, max: 320 },
  N: { min: 250, typical: 300, max: 400 },
  S: { min: 60, typical: 100, max: 150 },
  H: { min: 140, typical: 180, max: 250 },
};

/**
 * Published offset reduction pattern (fraction of rough offset remaining per pass).
 * Source: Industry standard, Mitsubishi/Sodick manuals
 */
const OFFSET_REDUCTION_PATTERN = [1.0, 0.75, 0.68, 0.62, 0.58];

// ============================================================================
// ENGINE
// ============================================================================

export class WEDMCalibrationReportEngine {
  /**
   * Generate a calibration report comparing shop program to published benchmarks.
   * @param input - Parsed shop program parameters
   * @returns Calibration report with deviations and improvement recommendations
   */
  generate(input: CalibrationInput): CalibrationReport {
    const { shop_program: sp } = input;
    const deviations: ParameterDeviation[] = [];
    const passAnalysis: PassAnalysis[] = [];
    const improvements: string[] = [];

    const pubRates = PUBLISHED_AREA_RATES[sp.material_iso_group] ?? PUBLISHED_AREA_RATES.P;
    let pubRoughSpeed = pubRates.typical / sp.thickness_mm; // mm/min linear

    // Bi-material cutting (brazed carbide in hardened steel): reduce published speed 40-60%
    // Wire path at braze interface has different electrical/thermal properties → slower, riskier
    if (sp.is_bimaterial) {
      pubRoughSpeed *= 0.5; // 50% reduction for bi-material interface
    }
    // Very hard material (HRC >60): additional 10-20% reduction
    if (sp.hardness_hrc && sp.hardness_hrc > 60) {
      pubRoughSpeed *= 0.85;
    }

    // --- Rough speed analysis ---
    const shopRoughFeed = sp.feeds_mmmin[0];
    if (shopRoughFeed !== null && shopRoughFeed > 0) {
      const speedDev = (shopRoughFeed - pubRoughSpeed) / pubRoughSpeed * 100;
      const efficiency = Math.min(100, (shopRoughFeed / pubRoughSpeed) * 100);

      deviations.push({
        parameter: "Rough cutting speed",
        shop_value: shopRoughFeed,
        published_value: pubRoughSpeed,
        unit: "mm/min",
        deviation_pct: speedDev,
        assessment: Math.abs(speedDev) < 20 ? "acceptable"
          : speedDev < -20 ? "improvement" : "custom",
        recommendation: speedDev < -20
          ? `Shop runs ${Math.abs(speedDev).toFixed(0)}% below published. Check: wire tension, flushing pressure, power settings. Potential ${Math.abs(speedDev).toFixed(0)}% speed increase.`
          : speedDev > 30
            ? "Shop runs above published — verify surface quality is acceptable"
            : "Speed within published range",
      });

      if (speedDev < -30) {
        improvements.push(
          `Rough speed: ${shopRoughFeed.toFixed(1)} mm/min vs published ${pubRoughSpeed.toFixed(1)} mm/min. ` +
          `${Math.abs(speedDev).toFixed(0)}% improvement potential.`
        );
      }
    }

    // --- Per-pass analysis ---
    for (let i = 0; i < sp.num_passes; i++) {
      const shopFeed = sp.feeds_mmmin[i] ?? null;
      const shopOffset = sp.offsets_mm[i] ?? null;

      // Published per-pass speed: rough for pass 1, skim passes are faster
      const pubFeed = i === 0 ? pubRoughSpeed : pubRoughSpeed * (1.5 + i * 0.3);

      // Published offset: based on wire diameter and pass number
      const wireRadius = sp.wire_diameter_mm / 2;
      const sparkGapRough = 0.015 + sp.wire_diameter_mm * 0.05;
      const stockAllowance = i === 0 ? 0.08 : 0.08 * Math.pow(0.5, i);
      const pubOffset = wireRadius + sparkGapRough * (OFFSET_REDUCTION_PATTERN[i] ?? 0.55) + stockAllowance;

      const efficiency = shopFeed !== null && pubFeed > 0
        ? Math.min(100, (shopFeed / pubFeed) * 100) : 0;

      passAnalysis.push({
        pass: i + 1,
        e_code: sp.e_codes[i] ?? null,
        shop_feed_mmmin: shopFeed,
        published_feed_mmmin: Math.round(pubFeed * 100) / 100,
        shop_offset_mm: shopOffset,
        published_offset_mm: Math.round(pubOffset * 1000) / 1000,
        efficiency_pct: Math.round(efficiency),
      });
    }

    // --- Offset cascade analysis ---
    if (sp.offsets_mm.length >= 2 && sp.offsets_mm[0] > 0) {
      const totalReduction = sp.offsets_mm[0] - sp.offsets_mm[sp.offsets_mm.length - 1];
      const publishedReduction = sp.wire_diameter_mm * 0.35; // typical offset cascade range

      deviations.push({
        parameter: "Offset cascade range",
        shop_value: totalReduction,
        published_value: publishedReduction,
        unit: "mm",
        deviation_pct: (totalReduction - publishedReduction) / publishedReduction * 100,
        assessment: Math.abs(totalReduction - publishedReduction) / publishedReduction < 0.3
          ? "acceptable" : "improvement",
        recommendation: totalReduction < publishedReduction * 0.5
          ? "Offset cascade too tight — consider wider rough offset for better part accuracy"
          : "Offset cascade within expected range",
      });
    }

    // --- Pass count analysis ---
    const targetRa = sp.num_passes >= 4 ? 0.5 : sp.num_passes >= 2 ? 1.5 : 3.2;
    deviations.push({
      parameter: "Pass count",
      shop_value: sp.num_passes,
      published_value: sp.num_passes, // pass count is a design choice
      unit: "passes",
      deviation_pct: 0,
      assessment: "acceptable",
      recommendation: sp.num_passes === 1
        ? "Single pass = rough only (~3.2µm Ra). Add skims for better finish."
        : `${sp.num_passes} passes targets ~${targetRa}µm Ra`,
    });

    // --- Adaptive control check ---
    if (!sp.has_adaptive_control) {
      improvements.push(
        "Adaptive control (M90) not detected. Enable for automatic power adjustment — reduces wire break risk and improves cutting stability."
      );
    }

    // --- Overall efficiency ---
    const feedEfficiencies = passAnalysis
      .filter(p => p.efficiency_pct > 0)
      .map(p => p.efficiency_pct);
    const overallEfficiency = feedEfficiencies.length > 0
      ? Math.round(feedEfficiencies.reduce((a, b) => a + b) / feedEfficiencies.length)
      : 0;

    // --- Time savings estimate ---
    const timeSavings = overallEfficiency > 0 && overallEfficiency < 100
      ? Math.round((100 - overallEfficiency) * 0.7) // 70% of theoretical gap is achievable
      : 0;
    if (timeSavings > 10) {
      improvements.push(
        `Estimated ${timeSavings}% cycle time reduction achievable with optimized parameters`
      );
    }

    log.debug(
      `[WEDMCalibrationReport] ${sp.filename}: ${overallEfficiency}% efficiency, ` +
      `${deviations.length} deviations, ${improvements.length} improvements`
    );

    return {
      program: sp.filename,
      material: sp.material_iso_group,
      thickness_mm: sp.thickness_mm,
      overall_efficiency_pct: overallEfficiency,
      deviations,
      pass_analysis: passAnalysis,
      improvement_summary: improvements,
      estimated_time_savings_pct: timeSavings,
    };
  }
}

// Singleton export
export const wedmCalibrationReportEngine = new WEDMCalibrationReportEngine();
