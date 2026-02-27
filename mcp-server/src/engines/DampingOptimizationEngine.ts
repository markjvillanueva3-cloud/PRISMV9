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

export interface DampingInput {
  target_freq_Hz: number;              // frequency to damp (chatter frequency)
  structure_mass_kg: number;           // effective modal mass
  structure_stiffness_N_per_m: number; // modal stiffness
  structure_damping_ratio: number;     // existing damping
  available_mass_ratio?: number;       // max TMD mass as fraction of modal mass (default 0.05)
  space_constraint_mm?: number;        // physical space for damper
  strategies?: DampingStrategy[];      // strategies to evaluate (default: all)
}

export interface DampingResult {
  strategy: DampingStrategy;
  damping_improvement_ratio: number;   // new_zeta / old_zeta
  critical_depth_improvement_pct: number;
  parameters: Record<string, number>;  // strategy-specific parameters
  implementation_notes: string;
  cost_relative: number;               // 1 = cheap, 5 = expensive
}

export interface DampingComparison {
  best_strategy: DampingStrategy;
  results: DampingResult[];
  recommendations: string[];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class DampingOptimizationEngine {
  optimize(input: DampingInput): DampingComparison {
    const strategies = input.strategies || [
      "tuned_mass_damper", "viscoelastic_damper", "impact_damper",
      "constrained_layer", "variable_speed", "variable_pitch", "process_damping",
    ];

    const results: DampingResult[] = [];

    for (const strategy of strategies) {
      const result = this._evaluateStrategy(strategy, input);
      if (result) results.push(result);
    }

    // Sort by damping improvement
    results.sort((a, b) => b.damping_improvement_ratio - a.damping_improvement_ratio);

    const recs: string[] = [];
    if (results.length > 0) {
      const best = results[0];
      recs.push(`Best strategy: ${best.strategy} — ${best.damping_improvement_ratio.toFixed(1)}x damping improvement`);
      if (best.cost_relative <= 2) recs.push("Cost-effective solution available");
      if (best.critical_depth_improvement_pct > 50) {
        recs.push(`Expected ${best.critical_depth_improvement_pct}% increase in stable cutting depth`);
      }
    }
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
}

export const dampingOptimizationEngine = new DampingOptimizationEngine();
