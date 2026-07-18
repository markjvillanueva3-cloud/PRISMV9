/**
 * RegenerativeChatterPredictor — L2-P4-MS1 PASS2 Specialty
 * *** SAFETY CRITICAL ***
 *
 * Predicts regenerative chatter onset using stability lobe theory.
 * Chatter causes tool breakage, workpiece scrap, spindle damage,
 * and can eject workpieces — serious safety hazard.
 *
 * Implements Altintas-Budak analytical stability model for
 * turning and milling stability lobes.
 *
 * Actions: chatter_predict, chatter_stability_lobes, chatter_recommend
 *
 * References:
 *   [1] Tlusty, J. & Polacek, M. (1963). "The Stability of Machine Tools
 *       Against Self-Excited Vibrations in Machining". Proc. ASME Int.
 *       Research in Production Eng., Pittsburgh, 465-474.
 *       (Foundational regenerative chatter theory and stability lobes)
 *   [2] Altintas, Y. & Budak, E. (1995). "Analytical Prediction of Stability
 *       Lobes in Milling". CIRP Annals, 44(1), 357-362.
 *       doi:10.1016/S0007-8506(07)62342-7
 *       (Analytical zero-order solution: b_lim = -1/(2*Kc*mu*Re[G(jw_c)]))
 *   [3] Altintas, Y. (2012). "Manufacturing Automation: Metal Cutting Mechanics,
 *       Machine Tool Vibrations, and CNC Design", 2nd ed. Cambridge University
 *       Press, Ch. 3: Dynamic Cutting Force and Chatter Stability.
 *       (Comprehensive treatment of stability lobe computation)
 */

// ============================================================================
// TYPES
// ============================================================================

export type CutType = "slotting" | "half_immersion_up" | "half_immersion_down" | "quarter_immersion" | "full_immersion" | "turning";

/** Chatter Input configuration/data structure.
 */
export interface ChatterInput {
  cut_type: CutType;
  spindle_rpm: number;
  depth_of_cut_mm: number;
  num_flutes: number;
  tool_diameter_mm: number;
  natural_freq_Hz: number;            // dominant tool-point FRF
  stiffness_N_per_m: number;          // static stiffness at tool tip
  damping_ratio: number;              // modal damping ratio (0.01-0.10 typical)
  specific_cutting_force_N_mm2: number; // Kc (material-dependent)
  radial_depth_mm?: number;           // for milling (default = tool_diameter)
}

/** Stability Lobe configuration/data structure.
 */
export interface StabilityLobe {
  lobe_number: number;
  rpm: number;
  critical_depth_mm: number;
}

/** Chatter Result configuration/data structure.
 */
export interface ChatterResult {
  is_stable: boolean;
  stability_margin_pct: number;       // positive = stable, negative = chatter
  critical_depth_mm: number;          // max stable depth at current RPM
  current_depth_mm: number;
  chatter_frequency_Hz: number;
  optimal_rpm: number;                // nearest lobe peak (max stable depth)
  optimal_depth_mm: number;           // max depth at optimal RPM
  stability_lobes: StabilityLobe[];
  severity: "stable" | "marginal" | "chatter" | "severe_chatter";
  recommendations: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

/** Regenerative Chatter Predictor engine/manager.
 */
export class RegenerativeChatterPredictor {
  predict(input: ChatterInput): ChatterResult {
    const fn = input.natural_freq_Hz;
    const zeta = input.damping_ratio;
    const k = input.stiffness_N_per_m;
    const Kc = input.specific_cutting_force_N_mm2;
    const Z = input.num_flutes;

    // Directional factor based on cut type
    const mu = this._directionalFactor(input);

    // Critical depth at arbitrary RPM (Altintas-Budak)
    // b_lim = -1 / (2 * Kc * mu * Re[G(jωc)])
    // For simplified single-mode: b_lim = k * (1 + kappa^2) / (Kc * Z * mu)
    // where kappa = Im/Re of oriented FRF

    // Chatter frequency search: ωc near natural frequency
    const omegaN = 2 * Math.PI * fn;

    // For each lobe, find the critical depth
    const lobes: StabilityLobe[] = [];
    let bestLobe: StabilityLobe | null = null;

    /** For.
     * @param let - let
     * @returns void
     */
    for (let N = 0; N <= 20; N++) {
      // RPM at the lobe CENTER (the best-speed stability pocket): n = 60*fc/(Z*(N + eps/(2pi)))
      // with eps = 2*pi -- full-period regeneration phase, i.e. tooth-passing frequency an
      // integer fraction of the chatter frequency: n = 60*fn/(Z*(N+1)) (Altintas 2012 Ch.4,
      // the textbook best-speed pockets: fn=600Hz, Z=2 -> 18000, 9000, 6000... rpm).
      // Row 13 fix (verified SFC fix-plan + live-code physics pass): the previous eps = pi
      // put every "lobe" at the HALF-integer ratio N+0.5 -- the least-stable VALLEY between
      // pockets -- so optimal_rpm steered the operator to the worst chatter speed while
      // labeling it the peak. (The originally FILED register fix was also wrong -- it kept a
      // sub-2pi phase; adjudicated to eps=2pi, see SFC-ROWS-VERIFY-BATCH2-2026-07-01.md.)
      const epsilon = 2 * Math.PI; // lobe center: full-period phase
      const lobeRpm = Math.round(60 * fn / (Z * (N + epsilon / (2 * Math.PI))));

      if (lobeRpm < 100 || lobeRpm > 60000) continue;

      // Critical depth at lobe peak (most stable point)
      // b_lim_peak = (2*k*(1+kappa_min^2)) / (Z*Kc*mu)
      // At lobe peak, kappa_min → 0, so:
      // b_lim_peak = 2*k / (Z*Kc*mu) at high damping
      // But with real damping: b_lim ≈ k * 2 * zeta * (1 + 1/(4*zeta^2)) / (Z * Kc * mu)
      const bLimPeak = (k * 2 * zeta * (1 + 1 / (4 * zeta ** 2))) / (Z * Kc * mu * 1e6);

      const bLimPeak_mm = bLimPeak * 1000; // m → mm
      lobes.push({
        lobe_number: N,
        rpm: lobeRpm,
        critical_depth_mm: Math.round(bLimPeak_mm * 1000) / 1000,
      });

      /** If.
       * @param !bestLobe - !best lobe
       * @returns void
       */
      if (!bestLobe || bLimPeak_mm > bestLobe.critical_depth_mm) {
        bestLobe = lobes[lobes.length - 1];
      }
    }

    // Critical depth at current RPM (between lobes = minimum stability)
    // Minimum b_lim between lobes: b_lim_min = k / (Z * Kc * mu) * 2 * zeta
    // Same dimensional form as bLimPeak above -- k[N/m]/(Kc[Pa]) = METERS -- so it needs
    // the same m -> mm conversion. Pre-fix it was emitted raw as critical_depth_mm, making
    // every between-lobe prediction 1000x too small (0.017 mm read as 0.000017 -> rounds
    // to 0), and the near-lobe interpolation below mixed meters with mm in one expression.
    // Sibling of whiskey's 2026-06-28 finding on this engine (same m-vs-mm class).
    const bLimMin = (k * 2 * zeta) / (Z * Kc * mu * 1e6);
    const bLimMin_mm = bLimMin * 1000; // m -> mm (matches bLimPeak_mm above)

    // Find nearest lobe to current RPM for more accurate estimate
    const currentRpm = input.spindle_rpm;
    let criticalDepth = bLimMin_mm; // conservative: between-lobe minimum

    /** For.
     * @param const - const
     * @returns void
     */
    for (const lobe of lobes) {
      const rpmDist = Math.abs(currentRpm - lobe.rpm) / lobe.rpm;
      /** If.
       * @param rpmDist - rpm dist
       * @returns void
       */
      if (rpmDist < 0.1) {
        // Near a lobe peak -- interpolate (both endpoints in mm; pre-fix this mixed
        // bLimMin in METERS with lobe.critical_depth_mm in mm)
        criticalDepth = bLimMin_mm + (lobe.critical_depth_mm - bLimMin_mm) * (1 - rpmDist / 0.1);
        break;
      }
    }

    // Stability check
    const margin = (criticalDepth - input.depth_of_cut_mm) / criticalDepth * 100;
    const isStable = input.depth_of_cut_mm <= criticalDepth;

    // Chatter frequency (slightly above natural frequency)
    const chatterFreq = fn * (1 + zeta * 0.5);

    // Severity
    const severity: ChatterResult["severity"] =
      margin > 20 ? "stable"
      : margin > 0 ? "marginal"
      : margin > -30 ? "chatter"
      : "severe_chatter";

    // Recommendations
    const recs: string[] = [];
    /** If.
     * @param severity - severity
     * @returns void
     */
    if (severity === "severe_chatter") {
      recs.push("SAFETY: Severe chatter predicted — STOP. Risk of tool breakage and workpiece ejection");
      recs.push(`Reduce depth of cut to ${criticalDepth.toFixed(2)}mm or less`);
    }
    /** If.
     * @param severity - severity
     * @returns void
     */
    if (severity === "chatter") {
      recs.push(`Chatter predicted at ${currentRpm} RPM with ${input.depth_of_cut_mm}mm depth`);
      recs.push(`Maximum stable depth: ${criticalDepth.toFixed(2)}mm`);
    }
    if (bestLobe && Math.abs(currentRpm - bestLobe.rpm) / bestLobe.rpm > 0.05) {
      recs.push(`Optimal RPM for max depth: ${bestLobe.rpm} RPM (allows ${bestLobe.critical_depth_mm.toFixed(2)}mm depth)`);
    }
    /** If.
     * @param severity - severity
     * @returns void
     */
    if (severity === "marginal") {
      recs.push("Operating near stability boundary — monitor vibration closely");
    }
    /** If.
     * @param zeta - zeta
     * @returns void
     */
    if (zeta < 0.02) {
      recs.push("Very low damping — consider damped toolholder or vibration absorber");
    }
    /** If.
     * @param recs.length - recs.length
     * @returns void
     */
    if (recs.length === 0) {
      recs.push("Cutting parameters within stable envelope — proceed");
    }

    return {
      is_stable: isStable,
      stability_margin_pct: Math.round(margin * 10) / 10,
      critical_depth_mm: Math.round(criticalDepth * 1000) / 1000,
      current_depth_mm: input.depth_of_cut_mm,
      chatter_frequency_Hz: Math.round(chatterFreq * 10) / 10,
      optimal_rpm: bestLobe ? bestLobe.rpm : currentRpm,
      optimal_depth_mm: bestLobe ? bestLobe.critical_depth_mm : criticalDepth,
      stability_lobes: lobes.slice(0, 10), // first 10 lobes
      severity,
      recommendations: recs,
    };
  }

  private _directionalFactor(input: ChatterInput): number {
    if (input.cut_type === "turning") return 1.0;

    // Milling directional factor depends on radial immersion
    const ae = input.radial_depth_mm || input.tool_diameter_mm;
    const D = input.tool_diameter_mm;
    const ratio = ae / D;

    if (input.cut_type === "slotting" || input.cut_type === "full_immersion") return 1.0;
    if (input.cut_type === "half_immersion_down") return 0.75;
    if (input.cut_type === "half_immersion_up") return 0.75;
    if (input.cut_type === "quarter_immersion") return 0.5;

    // General: approximate as sin(phi_s) integration
    return Math.max(0.3, ratio);
  }

  /** Stability Lobes.
   * @param input - input data
   * @param "spindle_rpm" - "spindle_rpm"
   * @param rpmRange - rpm range
   * @param number] - number]
   * @returns stability lobe[]
   */
  stabilityLobes(input: Omit<ChatterInput, "spindle_rpm" | "depth_of_cut_mm">, rpmRange: [number, number]): StabilityLobe[] {
    const fullInput: ChatterInput = { ...input, spindle_rpm: rpmRange[0], depth_of_cut_mm: 0 } as ChatterInput;
    const result = this.predict(fullInput);
    return result.stability_lobes.filter(l => l.rpm >= rpmRange[0] && l.rpm <= rpmRange[1]);
  }
}

/** Regenerative Chatter Predictor constant.
 */
export const regenerativeChatterPredictor = new RegenerativeChatterPredictor();
