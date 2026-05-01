/**
 * DampingOptimizationEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Optimizes damping strategies to suppress machining vibration.
 * Evaluates passive (tuned mass dampers, viscoelastic), semi-active
 * (MR fluid), and process-based (variable speed, variable pitch) solutions.
 *
 * Recommends optimal damper parameters for given machining conditions.
 *
 * Actions: damping_optimize, damping_compare, damping_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type DampingStrategy =
  | "tuned_mass_damper" | "viscoelastic_damper" | "impact_damper"
  | "mr_fluid" | "constrained_layer" | "variable_speed"
  | "variable_pitch" | "process_damping" | "none";

/** Damping Input configuration/data structure.
 */
export interface DampingInput {
  target_freq_Hz: number;              // frequency to damp (chatter frequency)
  structure_mass_kg: number;           // effective modal mass
  structure_stiffness_N_per_m: number; // modal stiffness
  structure_damping_ratio: number;     // existing damping
  available_mass_ratio?: number;       // max TMD mass as fraction of modal mass (default 0.05)
  space_constraint_mm?: number;        // physical space for damper
  strategies?: DampingStrategy[];      // strategies to evaluate (default: all)
}

/** Damping Result configuration/data structure.
 */
export interface DampingResult {
  strategy: DampingStrategy;
  damping_improvement_ratio: number;   // new_zeta / old_zeta
  critical_depth_improvement_pct: number;
  parameters: Record<string, number>;  // strategy-specific parameters
  implementation_notes: string;
  cost_relative: number;               // 1 = cheap, 5 = expensive
}

/** Damping Comparison configuration/data structure.
 */
export interface DampingComparison {
  best_strategy: DampingStrategy;
  results: DampingResult[];
  recommendations: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

/** Damping Optimization Engine engine/manager.
 */
export class DampingOptimizationEngine {
  optimize(input: DampingInput): DampingComparison {
    const strategies = input.strategies || [
      "tuned_mass_damper", "viscoelastic_damper", "impact_damper",
      "constrained_layer", "variable_speed", "variable_pitch", "process_damping",
    ];

    const results: DampingResult[] = [];

    /** For.
     * @param const - const
     * @returns void
     */
    for (const strategy of strategies) {
      const result = this._evaluateStrategy(strategy, input);
      if (result) results.push(result);
    }

    // Sort by damping improvement
    results.sort((a, b) => b.damping_improvement_ratio - a.damping_improvement_ratio);

    const recs: string[] = [];
    /** If.
     * @param results.length - results.length
     * @returns void
     */
    if (results.length > 0) {
      const best = results[0];
      recs.push(`Best strategy: ${best.strategy} — ${best.damping_improvement_ratio.toFixed(1)}x damping improvement`);
      if (best.cost_relative <= 2) recs.push("Cost-effective solution available");
      /** If.
       * @param best.critical_depth_improvement_pct - best.critical_depth_improvement_pct
       * @returns void
       */
      if (best.critical_depth_improvement_pct > 50) {
        recs.push(`Expected ${best.critical_depth_improvement_pct}% increase in stable cutting depth`);
      }
    }
    /** If.
     * @param input.structure_damping_ratio - input.structure_damping_ratio
     * @returns void
     */
    if (input.structure_damping_ratio < 0.01) {
      recs.push("Very low baseline damping — any damping strategy will show significant improvement");
    }

    return {
      best_strategy: results.length > 0 ? results[0].strategy : "none",
      results,
      recommendations: recs,
    };
  }

  private _evaluateStrategy(strategy: DampingStrategy, input: DampingInput): DampingResult | null {
    const zeta0 = input.structure_damping_ratio;
    const fn = input.target_freq_Hz;
    const massRatio = input.available_mass_ratio || 0.05;

    /** Switch.
     * @param strategy - strategy
     * @returns void
     */
    switch (strategy) {
      case "tuned_mass_damper": {
        // Optimal TMD (Den Hartog): zeta_opt = sqrt(3*mu/(8*(1+mu)^3))
        const mu = massRatio;
        const zetaOpt = Math.sqrt((3 * mu) / (8 * (1 + mu) ** 3));
        const freqRatio = 1 / (1 + mu);
        const newZeta = zeta0 + zetaOpt;
        const dampMass = input.structure_mass_kg * mu;

        return {
          strategy,
          damping_improvement_ratio: Math.round(newZeta / zeta0 * 10) / 10,
          critical_depth_improvement_pct: Math.round((newZeta / zeta0 - 1) * 100),
          parameters: {
            damper_mass_kg: Math.round(dampMass * 1000) / 1000,
            tuning_freq_Hz: Math.round(fn * freqRatio * 10) / 10,
            optimal_damping_ratio: Math.round(zetaOpt * 10000) / 10000,
            spring_stiffness_N_per_m: Math.round(dampMass * (2 * Math.PI * fn * freqRatio) ** 2),
          },
          implementation_notes: `TMD with ${(dampMass * 1000).toFixed(0)}g mass tuned to ${(fn * freqRatio).toFixed(0)} Hz. Mount at maximum vibration amplitude point.`,
          cost_relative: 3,
        };
      }

      case "viscoelastic_damper": {
        // Viscoelastic: typically adds 2-5x damping
        const addedZeta = zeta0 * 2.5;
        const newZeta = zeta0 + addedZeta;
        return {
          strategy,
          damping_improvement_ratio: Math.round(newZeta / zeta0 * 10) / 10,
          critical_depth_improvement_pct: Math.round((newZeta / zeta0 - 1) * 100),
          parameters: {
            loss_factor: 0.3,
            operating_temp_range_C_min: 10,
            operating_temp_range_C_max: 60,
          },
          implementation_notes: "Viscoelastic material strips bonded to tool body or boring bar. Temperature-dependent — verify operating range.",
          cost_relative: 2,
        };
      }

      case "impact_damper": {
        // Impact/particle damper: adds ~1.5-3x damping, amplitude-dependent
        const addedZeta = zeta0 * 1.8;
        const newZeta = zeta0 + addedZeta;
        return {
          strategy,
          damping_improvement_ratio: Math.round(newZeta / zeta0 * 10) / 10,
          critical_depth_improvement_pct: Math.round((newZeta / zeta0 - 1) * 100),
          parameters: {
            cavity_fill_ratio_pct: 70,
            particle_size_mm: 1.5,
            particle_material: 1, // 1=steel, 2=tungsten
          },
          implementation_notes: "Fill 70% of internal cavity with 1.5mm steel shot. Works best at high vibration amplitudes.",
          cost_relative: 1,
        };
      }

      case "constrained_layer": {
        // CLD: adds 2-4x damping for thin features
        const addedZeta = zeta0 * 2.0;
        const newZeta = zeta0 + addedZeta;
        return {
          strategy,
          damping_improvement_ratio: Math.round(newZeta / zeta0 * 10) / 10,
          critical_depth_improvement_pct: Math.round((newZeta / zeta0 - 1) * 100),
          parameters: {
            constraining_layer_thickness_mm: 1.0,
            viscoelastic_layer_thickness_mm: 0.5,
            coverage_pct: 80,
          },
          implementation_notes: "Apply CLD patches to thin walls/floors before machining opposite side. Remove after machining.",
          cost_relative: 1,
        };
      }

      case "variable_speed": {
        // Continuous spindle speed variation: disrupts regeneration
        const addedZeta = zeta0 * 1.5;
        const newZeta = zeta0 + addedZeta;
        return {
          strategy,
          damping_improvement_ratio: Math.round(newZeta / zeta0 * 10) / 10,
          critical_depth_improvement_pct: Math.round((newZeta / zeta0 - 1) * 100),
          parameters: {
            speed_variation_pct: 10,
            variation_freq_Hz: 2,
          },
          implementation_notes: "Vary spindle speed ±10% at 2 Hz. Requires CNC with SSV (Spindle Speed Variation) capability.",
          cost_relative: 1,
        };
      }

      case "variable_pitch": {
        // Non-uniform tool pitch: disrupts tooth-passing regeneration
        const addedZeta = zeta0 * 1.3;
        const newZeta = zeta0 + addedZeta;
        const basePitch = 360 / 4; // assume 4 flute
        return {
          strategy,
          damping_improvement_ratio: Math.round(newZeta / zeta0 * 10) / 10,
          critical_depth_improvement_pct: Math.round((newZeta / zeta0 - 1) * 100),
          parameters: {
            pitch_angles_deg_1: basePitch - 5,
            pitch_angles_deg_2: basePitch + 5,
            pitch_angles_deg_3: basePitch - 5,
            pitch_angles_deg_4: basePitch + 5,
          },
          implementation_notes: "Use variable-pitch endmill with alternating ±5° pitch variation. Most effective for slotting.",
          cost_relative: 2,
        };
      }

      case "process_damping": {
        // Process damping: effective at low speeds where tool flank rubs
        const pdCoeff = 0.05; // process damping coefficient
        const effectiveSpeed = fn * Math.PI * 0.01; // tool diameter proxy
        const addedZeta = pdCoeff / effectiveSpeed;
        const newZeta = zeta0 + addedZeta;
        return {
          strategy,
          damping_improvement_ratio: Math.round(Math.max(1, newZeta / zeta0) * 10) / 10,
          critical_depth_improvement_pct: Math.round(Math.max(0, (newZeta / zeta0 - 1)) * 100),
          parameters: {
            relief_angle_deg: 6,
            hone_radius_um: 50,
            effective_at_speed_below_mmin: Math.round(fn * 0.01 * 60),
          },
          implementation_notes: "Process damping from tool flank contact. Use large hone radius (50µm) and small relief angle. Only effective at low cutting speeds.",
          cost_relative: 1,
        };
      }

      default:
        return null;
    }
  }

  // ─── Variable Helix/Pitch Chatter Suppression Design ─────────────────
  // Reference: Budak (2003) "An analytical design method for milling cutters with
  //   nonconstant pitch to increase stability" ASME JMSE 125(1), 29-34
  // Reference: Altintas (2012) "Manufacturing Automation", Ch. 4

  /**
   * Design variable helix/pitch end mill geometry for chatter suppression.
   * Variable pitch/helix disrupts the regeneration mechanism by creating non-uniform
   * time delays between successive tooth passes.
   *
   * Key criterion (Altintas 2012): If helix pitch variation > wavelength of chatter
   * vibration imprinted on surface, the regeneration is disrupted.
   *
   * Design rule: pitch_variation × π < critical_flip_depth → flip lobes vanish
   *
   * Reference: Budak (2003) ASME JMSE 125(1), 29-34
   */
  designVariableHelixTool(input: {
    tool_diameter_mm: number;
    flutes: number;
    natural_freq_Hz: number;
    damping_ratio: number;
    stiffness_N_per_m: number;
    target_rpm: number;
    Ktc: number;
    current_helix_deg?: number;
  }): {
    recommended_pitch_angles_deg: number[];
    recommended_helix_angles_deg: number[];
    pitch_variation_deg: number;
    helix_variation_deg: number;
    stability_improvement_pct: number;
    critical_depth_uniform_mm: number;
    critical_depth_variable_mm: number;
    design_rule_satisfied: boolean;
    recommendation: string;
  } {
    const z = input.flutes;
    const fn = input.natural_freq_Hz;
    const zeta = input.damping_ratio;
    const ks = input.stiffness_N_per_m;
    const rpm = input.target_rpm;
    const Ktc = input.Ktc;
    const baseHelix = input.current_helix_deg ?? 35;

    if (z < 2) throw new Error('Variable pitch requires at least 2 flutes');
    if (fn <= 0) throw new Error('Natural frequency must be positive');
    if (zeta <= 0 || zeta >= 1) throw new Error('Damping ratio must be in (0, 1)');
    if (ks <= 0) throw new Error('Stiffness must be positive');
    if (rpm <= 0) throw new Error('RPM must be positive');
    if (Ktc <= 0) throw new Error('Ktc must be positive');

    // Step 1: Critical depth for uniform tool (analytical stability limit)
    // a_lim = -1 / (z × Ktc × Re[G(jωc)])  where Re[G] at worst = -1/(2ks×ζ(1+ζ))
    // Simplified: a_lim_uniform = 2 × ks × ζ × (1 + ζ) / (z × Ktc)
    const a_lim_uniform = (2 * ks * zeta * (1 + zeta)) / (z * Ktc);
    // Convert to mm (ks in N/m, Ktc in N/m² → result in m, convert to mm)
    const a_lim_uniform_mm = a_lim_uniform * 1000;

    // Step 2: Optimal pitch variation (Budak 2003)
    // Δφ_opt = (2π × fn) / (z × RPM/60)  [radians]
    const tooth_passing_freq = z * rpm / 60;
    const delta_phi_opt_rad = (2 * Math.PI * fn) / (z * rpm / 60);
    // Clamp to practical range: 5-25 degrees
    const delta_phi_opt_deg = Math.min(25, Math.max(5, delta_phi_opt_rad * 180 / Math.PI));

    // Step 3: Construct pitch angle array — symmetric alternating pattern
    const nominal_pitch = 360 / z;
    const half_delta = delta_phi_opt_deg / 2;
    const pitch_angles: number[] = [];
    for (let i = 0; i < z; i++) {
      pitch_angles.push(
        Math.round((nominal_pitch + (i % 2 === 0 ? -half_delta : half_delta)) * 10) / 10
      );
    }
    // Normalize so sum = 360
    const pitchSum = pitch_angles.reduce((a, b) => a + b, 0);
    const correction = (360 - pitchSum) / z;
    for (let i = 0; i < z; i++) {
      pitch_angles[i] = Math.round((pitch_angles[i] + correction) * 10) / 10;
    }

    // Step 4: Variable helix angles — 2-5% delay difference
    // Helix variation scales with pitch variation: Δhelix ≈ (Δpitch / nominal_pitch) × base_helix × scale
    const helix_scale = 0.8; // empirical scale factor
    const delta_helix = Math.min(8, Math.max(2, (delta_phi_opt_deg / nominal_pitch) * baseHelix * helix_scale));
    const helix_angles: number[] = [];
    for (let i = 0; i < z; i++) {
      helix_angles.push(
        Math.round((baseHelix + (i % 2 === 0 ? 0 : delta_helix)) * 10) / 10
      );
    }

    // Step 5: Stability improvement estimate
    // Variable pitch disrupts regeneration — improvement depends on how close Δφ is to optimal
    // Budak (2003): well-designed variable pitch → 30-50% improvement in critical depth
    const optimality_ratio = Math.min(1, delta_phi_opt_deg / 15); // 15° is typical good range
    const improvement_factor = 1 + 0.3 + 0.2 * optimality_ratio; // 30-50% improvement
    const a_lim_variable_mm = a_lim_uniform_mm * improvement_factor;
    const stability_improvement_pct = Math.round((improvement_factor - 1) * 100);

    // Step 6: Design rule check — pitch_variation × π < flip_depth
    // Budak criterion: the pitch variation (in mm along the helix) must exceed the chatter wavelength
    // Estimate chatter wavelength from RPM-based cutting speed approximation
    const estimated_work_speed_mm_s = rpm * 0.1; // rough mm/s from RPM
    const chatter_wavelength_mm = estimated_work_speed_mm_s / fn;
    const pitch_var_arc_mm = (delta_phi_opt_deg * Math.PI / 180) * (input.tool_diameter_mm / 2);
    const design_rule_satisfied = pitch_var_arc_mm > chatter_wavelength_mm * 0.5 || delta_phi_opt_deg >= 5;

    // Build recommendation
    let recommendation: string;
    if (stability_improvement_pct >= 40) {
      recommendation = `Excellent: ${stability_improvement_pct}% improvement expected. Use pitch angles [${pitch_angles.join(', ')}]° with helix [${helix_angles.join(', ')}]°. Critical depth increases from ${a_lim_uniform_mm.toFixed(3)}mm to ${a_lim_variable_mm.toFixed(3)}mm.`;
    } else if (stability_improvement_pct >= 25) {
      recommendation = `Good: ${stability_improvement_pct}% improvement. Variable geometry effective at ${rpm} RPM / ${fn} Hz. Consider also tuned mass damper for additional suppression.`;
    } else {
      recommendation = `Moderate: ${stability_improvement_pct}% improvement. Variable pitch less effective at this speed ratio (tooth passing ${tooth_passing_freq.toFixed(0)} Hz vs natural ${fn} Hz). Consider speed adjustment or TMD.`;
    }

    return {
      recommended_pitch_angles_deg: pitch_angles,
      recommended_helix_angles_deg: helix_angles,
      pitch_variation_deg: Math.round(delta_phi_opt_deg * 10) / 10,
      helix_variation_deg: Math.round(delta_helix * 10) / 10,
      stability_improvement_pct,
      critical_depth_uniform_mm: Math.round(a_lim_uniform_mm * 1000) / 1000,
      critical_depth_variable_mm: Math.round(a_lim_variable_mm * 1000) / 1000,
      design_rule_satisfied,
      recommendation,
    };
  }
}

/** Damping Optimization Engine constant.
 */
export const dampingOptimizationEngine = new DampingOptimizationEngine();
