/**
 * BarStockVibrationEngine — Vibration-Aware Bar Stock Machining
 *
 * Models natural frequency of unsupported bar stock for Swiss-type and
 * lathe machining. Prevents bar whipping by recommending tailstock/steady
 * rest support and feed/speed limits based on L/D ratio.
 *
 * Physics:
 *   - Cantilever beam: fn = (λ²/2πL²) × √(EI/ρA)
 *   - λ₁ = 1.875 (1st mode cantilever), λ₂ = 4.694 (2nd mode)
 *   - Simply supported: fn = (nπ/L²) × √(EI/ρA)
 *   - Guide bushing effect: reduces effective unsupported length
 *
 * References:
 *   - Rao (2007): Mechanical Vibrations, 4th ed.
 *   - Altintas (2012): Manufacturing Automation — bar whipping
 *
 * @module BarStockVibrationEngine
 */

export interface BarStockProps {
  diameter_mm: number;
  length_mm: number;
  material: string;
  /** Support type */
  support: "cantilever" | "simply_supported" | "guide_bushing" | "tailstock";
  /** Unsupported length from chuck/collet to free end or first support (mm) */
  unsupported_length_mm?: number;
  /** Guide bushing position from chuck (mm) — for Swiss machines */
  guide_bushing_position_mm?: number;
}

export interface VibrationAnalysis {
  /** Natural frequencies (Hz) for first 3 modes */
  natural_frequencies_Hz: number[];
  /** L/D ratio */
  l_d_ratio: number;
  /** Risk level */
  risk: "low" | "medium" | "high" | "critical";
  /** Maximum safe RPM (tooth-passing freq < 0.8 × fn) */
  max_safe_rpm: number;
  /** Maximum safe feed (to limit cutting force below stability threshold) */
  max_safe_feed_mm_rev: number;
  /** Static deflection at free end under 100N force (μm) */
  static_deflection_um: number;
  /** Recommendations */
  recommendations: string[];
  /** Support suggestions */
  support_suggestions: SupportSuggestion[];
}

export interface SupportSuggestion {
  type: "tailstock" | "steady_rest" | "guide_bushing" | "reduced_overhang" | "follower_rest";
  position_mm?: number;
  reason: string;
  expected_improvement: string;
}

export interface ChatterCheckResult {
  /** Is the RPM in a chatter zone? */
  chatter_risk: boolean;
  /** Tooth-passing frequency at this RPM */
  tooth_freq_Hz: number;
  /** Nearest natural frequency */
  nearest_fn_Hz: number;
  /** Frequency ratio (tooth/natural) */
  frequency_ratio: number;
  /** Recommended RPM shift to avoid chatter */
  recommended_rpm?: number;
  /** Safe RPM ranges (between natural frequencies) */
  safe_rpm_ranges: [number, number][];
}

// Material properties for bar stock
const BAR_MATERIALS: Record<string, { E_GPa: number; rho_kg_m3: number; yield_MPa: number }> = {
  "steel_1045": { E_GPa: 205, rho_kg_m3: 7870, yield_MPa: 530 },
  "steel_4140": { E_GPa: 210, rho_kg_m3: 7850, yield_MPa: 655 },
  "steel_12l14": { E_GPa: 200, rho_kg_m3: 7870, yield_MPa: 415 },
  "stainless_303": { E_GPa: 193, rho_kg_m3: 8000, yield_MPa: 240 },
  "stainless_304": { E_GPa: 193, rho_kg_m3: 8000, yield_MPa: 215 },
  "aluminum_6061": { E_GPa: 68.9, rho_kg_m3: 2700, yield_MPa: 276 },
  "aluminum_2011": { E_GPa: 70.3, rho_kg_m3: 2830, yield_MPa: 300 },
  "brass_360": { E_GPa: 97, rho_kg_m3: 8500, yield_MPa: 310 },
  "titanium_6al4v": { E_GPa: 114, rho_kg_m3: 4430, yield_MPa: 880 },
  "inconel_718": { E_GPa: 205, rho_kg_m3: 8190, yield_MPa: 1035 },
};

// Cantilever mode shape eigenvalues
const CANTILEVER_LAMBDA = [1.8751, 4.6941, 7.8548];
const SIMPLY_SUPPORTED_N = [1, 2, 3]; // n values for simply supported modes

export class BarStockVibrationEngine {

  /**
   * Compute natural frequencies for bar stock.
   *
   * Cantilever: fn = (λn² / (2πL²)) × √(EI / (ρA))
   * Simply supported: fn = (n²π / L²) × √(EI / (ρA))
   * Guide bushing: treat overhang from bushing as cantilever
   */
  computeNaturalFrequencies(bar: BarStockProps): number[] {
    const mat = BAR_MATERIALS[bar.material] ?? BAR_MATERIALS["steel_1045"];
    const d = bar.diameter_mm / 1000; // m
    const I = (Math.PI * d ** 4) / 64; // m⁴
    const A = (Math.PI * d ** 2) / 4; // m²
    const E = mat.E_GPa * 1e9; // Pa
    const rho = mat.rho_kg_m3; // kg/m³

    // Effective unsupported length
    let L: number;
    if (bar.support === "guide_bushing" && bar.guide_bushing_position_mm) {
      // Overhang from guide bushing to free end
      L = (bar.length_mm - bar.guide_bushing_position_mm) / 1000;
    } else if (bar.unsupported_length_mm) {
      L = bar.unsupported_length_mm / 1000;
    } else {
      L = bar.length_mm / 1000;
    }

    L = Math.max(L, 0.001); // prevent division by zero

    const factor = Math.sqrt((E * I) / (rho * A));
    const freqs: number[] = [];

    if (bar.support === "simply_supported" || bar.support === "tailstock") {
      // Simply supported: fn = n²π²/(L²) × √(EI/ρA) / (2π)
      for (const n of SIMPLY_SUPPORTED_N) {
        const fn = ((n * Math.PI) ** 2 / (L ** 2)) * factor / (2 * Math.PI);
        freqs.push(parseFloat(fn.toFixed(2)));
      }
    } else {
      // Cantilever (chuck/collet or guide bushing overhang)
      for (const lambda of CANTILEVER_LAMBDA) {
        const fn = (lambda ** 2 / (2 * Math.PI * L ** 2)) * factor;
        freqs.push(parseFloat(fn.toFixed(2)));
      }
    }

    return freqs;
  }

  /**
   * Full vibration analysis for bar stock.
   */
  analyze(bar: BarStockProps): VibrationAnalysis {
    const mat = BAR_MATERIALS[bar.material] ?? BAR_MATERIALS["steel_1045"];
    const freqs = this.computeNaturalFrequencies(bar);
    const fn1 = freqs[0] ?? 1000;

    const unsupported = bar.unsupported_length_mm ?? bar.length_mm;
    const ld = unsupported / bar.diameter_mm;

    // Static deflection: δ = FL³/(3EI) for cantilever, FL³/(48EI) for simply supported
    const d_m = bar.diameter_mm / 1000;
    const L_m = unsupported / 1000;
    const I = (Math.PI * d_m ** 4) / 64;
    const E = mat.E_GPa * 1e9;
    const F = 100; // 100N reference force

    let deflection_m: number;
    if (bar.support === "simply_supported" || bar.support === "tailstock") {
      deflection_m = (F * L_m ** 3) / (48 * E * I);
    } else {
      deflection_m = (F * L_m ** 3) / (3 * E * I);
    }
    const deflection_um = deflection_m * 1e6;

    // Max safe RPM: keep tooth-passing freq below 80% of first natural freq
    // For turning (1 tooth): ftp = RPM/60, so RPM_max = fn1 * 60 * 0.8
    const maxSafeRPM = Math.round(fn1 * 60 * 0.8);

    // Max safe feed: limit cutting force to keep deflection < 20μm
    // F = kc × ap × f, so f_max = F_max / (kc × ap)
    const kc = 2000; // approximate for steel
    const ap = 1; // 1mm depth
    const F_max = 20e-6 * 3 * E * I / (L_m ** 3); // force for 20μm deflection
    const maxSafeFeed = Math.min(F_max / (kc * ap), 0.5);

    // Risk assessment
    let risk: VibrationAnalysis["risk"];
    const recommendations: string[] = [];
    const suggestions: SupportSuggestion[] = [];

    if (ld <= 4) {
      risk = "low";
      recommendations.push(`L/D = ${ld.toFixed(1)} — standard machining conditions acceptable`);
    } else if (ld <= 6) {
      risk = "medium";
      recommendations.push(`L/D = ${ld.toFixed(1)} — reduce feed by 20%, monitor for chatter`);
      recommendations.push(`First natural frequency: ${fn1.toFixed(0)} Hz — avoid RPM near ${Math.round(fn1 * 60)} RPM`);
    } else if (ld <= 10) {
      risk = "high";
      recommendations.push(`L/D = ${ld.toFixed(1)} — tailstock or steady rest strongly recommended`);
      recommendations.push(`Reduce cutting speed by 30% and feed by 40%`);
      recommendations.push(`Consider climb milling to reduce deflection`);
      suggestions.push({
        type: "tailstock",
        position_mm: bar.length_mm,
        reason: `L/D = ${ld.toFixed(1)} exceeds safe cantilever limit`,
        expected_improvement: "Natural frequency increases 4-6×, deflection reduces 8-16×",
      });
      suggestions.push({
        type: "steady_rest",
        position_mm: bar.length_mm * 0.6,
        reason: "Support at 60% of length maximizes stiffness",
        expected_improvement: "Effective L/D halved, deflection reduced 8×",
      });
    } else {
      risk = "critical";
      recommendations.push(`L/D = ${ld.toFixed(1)} — CRITICAL: bar whipping likely without support`);
      recommendations.push(`Tailstock + steady rest required`);
      recommendations.push(`Consider Swiss-type machine with guide bushing`);
      suggestions.push({
        type: "guide_bushing",
        position_mm: bar.length_mm * 0.3,
        reason: "Swiss-type guide bushing provides continuous support near cutting zone",
        expected_improvement: "Eliminates whipping, enables L/D > 20",
      });
      suggestions.push({
        type: "tailstock",
        position_mm: bar.length_mm,
        reason: "Essential for L/D > 10",
        expected_improvement: "Changes mode from cantilever to simply-supported (4× stiffer)",
      });
      suggestions.push({
        type: "follower_rest",
        reason: "Follower rest moves with tool to maintain support near cutting zone",
        expected_improvement: "Constant effective L/D regardless of tool position",
      });
    }

    return {
      natural_frequencies_Hz: freqs,
      l_d_ratio: parseFloat(ld.toFixed(2)),
      risk,
      max_safe_rpm: maxSafeRPM,
      max_safe_feed_mm_rev: parseFloat(Math.max(maxSafeFeed, 0.01).toFixed(3)),
      static_deflection_um: parseFloat(deflection_um.toFixed(2)),
      recommendations,
      support_suggestions: suggestions,
    };
  }

  /**
   * Check if a specific RPM will cause chatter on this bar stock.
   */
  chatterCheck(bar: BarStockProps, rpm: number, fluteCount?: number): ChatterCheckResult {
    const freqs = this.computeNaturalFrequencies(bar);
    const z = fluteCount ?? 1; // turning = 1 tooth
    const toothFreq = rpm * z / 60;

    // Find nearest natural frequency
    let nearestFn = freqs[0];
    let minDist = Infinity;
    for (const fn of freqs) {
      const dist = Math.abs(toothFreq - fn);
      if (dist < minDist) {
        minDist = dist;
        nearestFn = fn;
      }
    }

    const ratio = toothFreq / nearestFn;
    // Chatter risk if tooth frequency is within 15% of any natural frequency
    const chatterRisk = freqs.some(fn => {
      const r = toothFreq / fn;
      return r > 0.85 && r < 1.15;
    });

    // Recommended RPM: shift to midpoint between harmonics
    let recommendedRPM: number | undefined;
    if (chatterRisk) {
      // Find safe zones between natural frequencies
      const sortedFreqs = [...freqs].sort((a, b) => a - b);
      let bestMidFreq = sortedFreqs[0] * 0.7; // below first mode
      for (let i = 0; i < sortedFreqs.length - 1; i++) {
        const mid = (sortedFreqs[i] + sortedFreqs[i + 1]) / 2;
        if (Math.abs(mid - toothFreq) < Math.abs(bestMidFreq - toothFreq)) {
          bestMidFreq = mid;
        }
      }
      recommendedRPM = Math.round(bestMidFreq * 60 / z);
    }

    // Build safe RPM ranges
    const safeRanges: [number, number][] = [];
    const sortedFreqs = [...freqs].sort((a, b) => a - b);
    // Below first mode
    safeRanges.push([0, Math.round(sortedFreqs[0] * 0.85 * 60 / z)]);
    // Between modes
    for (let i = 0; i < sortedFreqs.length - 1; i++) {
      const low = Math.round(sortedFreqs[i] * 1.15 * 60 / z);
      const high = Math.round(sortedFreqs[i + 1] * 0.85 * 60 / z);
      if (high > low) safeRanges.push([low, high]);
    }

    return {
      chatter_risk: chatterRisk,
      tooth_freq_Hz: parseFloat(toothFreq.toFixed(2)),
      nearest_fn_Hz: nearestFn,
      frequency_ratio: parseFloat(ratio.toFixed(3)),
      recommended_rpm: recommendedRPM,
      safe_rpm_ranges: safeRanges,
    };
  }

  /**
   * Compare cantilever vs with-tailstock to show improvement.
   */
  compareSupport(bar: BarStockProps): {
    cantilever: VibrationAnalysis;
    with_tailstock: VibrationAnalysis;
    frequency_improvement_factor: number;
    deflection_improvement_factor: number;
  } {
    const cantileverBar = { ...bar, support: "cantilever" as const };
    const tailstockBar = { ...bar, support: "tailstock" as const };
    const cant = this.analyze(cantileverBar);
    const tail = this.analyze(tailstockBar);

    return {
      cantilever: cant,
      with_tailstock: tail,
      frequency_improvement_factor: parseFloat(
        ((tail.natural_frequencies_Hz[0] ?? 1) / (cant.natural_frequencies_Hz[0] ?? 1)).toFixed(2)
      ),
      deflection_improvement_factor: parseFloat(
        (cant.static_deflection_um / Math.max(tail.static_deflection_um, 0.001)).toFixed(2)
      ),
    };
  }

  /**
   * Dispatcher-compatible calculate method.
   */
  calculate(input: {
    action: "analyze" | "natural_frequencies" | "chatter_check" | "compare_support";
    [key: string]: unknown;
  }): unknown {
    switch (input.action) {
      case "analyze":
        return this.analyze(input.bar as BarStockProps);

      case "natural_frequencies":
        return this.computeNaturalFrequencies(input.bar as BarStockProps);

      case "chatter_check":
        return this.chatterCheck(
          input.bar as BarStockProps,
          input.rpm as number,
          input.flute_count as number | undefined,
        );

      case "compare_support":
        return this.compareSupport(input.bar as BarStockProps);

      default:
        return { error: `Unknown action: ${input.action}` };
    }
  }
}
