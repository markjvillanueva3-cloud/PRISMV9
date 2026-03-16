/**
 * UltrasonicMachiningPhysicsEngine — Physics-Based USM Process Prediction
 *
 * Ultrasonic machining uses high-frequency vibration (20-40 kHz) to drive
 * abrasive particles into brittle workpieces. The tool oscillates at ultrasonic
 * frequency while abrasive slurry flows between tool and workpiece.
 *
 * Models:
 * - Shaw MRR model: MRR = K · f · A^(3/2) · d · √(σw/Hw)
 * - Surface roughness: Ra ∝ d^(2/3) · A^(1/3) · (σw/Hw)^(1/4)
 * - Tool wear ratio: TWR = f(hardness ratio, abrasive type)
 * - Penetration rate: PR = MRR / tool_area
 *
 * References:
 * - Shaw (1956): Ultrasonic grinding — analytical model
 * - Miller (1957): Mechanism of material removal in USM
 * - Thoe et al. (1998): Review of USM — comprehensive process model
 * - Komaraiah & Reddy (1993): Rotary USM parametric studies
 *
 * Actions: usm_mrr, usm_abrasive_select, usm_feasibility (calcDispatcher)
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface USMMRRInput {
  /** Workpiece material */
  material: string;
  /** Ultrasonic frequency (kHz), typically 20-40 */
  frequency_kHz: number;
  /** Tool vibration amplitude (µm), typically 10-50 */
  amplitude_um: number;
  /** Abrasive type */
  abrasive: 'boron_carbide' | 'silicon_carbide' | 'alumina' | 'diamond';
  /** Mean abrasive grain size (µm) */
  grain_size_um: number;
  /** Static load on tool (N) */
  static_load_N: number;
  /** Tool cross-section area (mm²) */
  tool_area_mm2: number;
}

export interface USMMRRResult {
  /** Material removal rate (mm³/min) */
  mrr_mm3_per_min: number;
  /** Predicted surface roughness (µm Ra) */
  surface_roughness_Ra_um: number;
  /** Tool wear ratio (tool vol / workpiece vol) */
  tool_wear_ratio: number;
  /** Penetration rate (mm/min) */
  penetration_rate_mm_per_min: number;
  /** Shaw model formula string */
  formula: string;
  /** Warnings */
  warnings: string[];
}

export interface USMAbrasiveInput {
  /** Workpiece material name */
  workpiece_material: string;
  /** Feature type */
  feature_type: 'hole' | 'cavity' | 'slot' | 'contour';
  /** Target surface roughness (µm Ra) */
  target_Ra_um: number;
  /** Feature depth (mm) */
  depth_mm: number;
}

export interface USMAbrasiveResult {
  /** Recommended abrasive type */
  recommended_abrasive: 'boron_carbide' | 'silicon_carbide' | 'alumina' | 'diamond';
  /** Recommended grain size (µm) */
  grain_size_um: number;
  /** Slurry concentration (% by weight) */
  concentration_pct: number;
  /** Slurry flow rate (L/min) */
  slurry_flow_rate: number;
  /** Selection reasoning */
  reasoning: string;
}

export interface USMFeasibilityInput {
  /** Workpiece material */
  material: string;
  /** Material Vickers hardness */
  hardness_HV: number;
  /** Smallest feature dimension (mm) */
  feature_size_mm: number;
  /** Depth-to-width aspect ratio */
  aspect_ratio: number;
  /** Required tolerance (mm) */
  tolerance_mm: number;
}

export interface USMFeasibilityResult {
  /** Whether USM is feasible for this application */
  feasible: boolean;
  /** Expected dimensional accuracy (mm) */
  expected_accuracy_mm: number;
  /** Estimated cycle time (min) */
  cycle_time_estimate_min: number;
  /** Process limitations */
  limitations: string[];
  /** Alternative processes if infeasible */
  alternative_processes: string[];
}

// ── Material Database ──────────────────────────────────────────────────

interface USMMaterial {
  /** Vickers hardness (HV) */
  Hv: number;
  /** Fracture toughness (MPa√m) */
  Kic: number;
  /** Density (kg/m³) */
  rho: number;
  /** Brittleness index Hv/Kic */
  brittleness: number;
  /** Static stress factor for Shaw model */
  sigma_factor: number;
}

const USM_MATERIALS: Record<string, USMMaterial> = {
  glass:              { Hv: 550,  Kic: 0.75, rho: 2500,  brittleness: 733,  sigma_factor: 1.0 },
  ceramic_alumina:    { Hv: 1800, Kic: 3.5,  rho: 3900,  brittleness: 514,  sigma_factor: 0.7 },
  ceramic_zirconia:   { Hv: 1200, Kic: 8.0,  rho: 6000,  brittleness: 150,  sigma_factor: 0.5 },
  silicon:            { Hv: 1100, Kic: 0.9,  rho: 2330,  brittleness: 1222, sigma_factor: 0.95 },
  quartz:             { Hv: 1100, Kic: 0.7,  rho: 2650,  brittleness: 1571, sigma_factor: 1.0 },
  tungsten_carbide:   { Hv: 1700, Kic: 12,   rho: 15630, brittleness: 142,  sigma_factor: 0.35 },
  pzt:                { Hv: 400,  Kic: 1.0,  rho: 7600,  brittleness: 400,  sigma_factor: 0.85 },
  ferrite:            { Hv: 600,  Kic: 1.2,  rho: 5000,  brittleness: 500,  sigma_factor: 0.80 },
  graphite:           { Hv: 250,  Kic: 1.5,  rho: 1800,  brittleness: 167,  sigma_factor: 0.60 },
  sapphire:           { Hv: 2000, Kic: 2.0,  rho: 3980,  brittleness: 1000, sigma_factor: 0.85 },
  borosilicate:       { Hv: 480,  Kic: 0.8,  rho: 2230,  brittleness: 600,  sigma_factor: 0.95 },
  silicon_carbide:    { Hv: 2500, Kic: 3.3,  rho: 3210,  brittleness: 758,  sigma_factor: 0.65 },
  titanium:           { Hv: 350,  Kic: 55,   rho: 4500,  brittleness: 6.4,  sigma_factor: 0.10 },
  steel:              { Hv: 250,  Kic: 50,   rho: 7850,  brittleness: 5.0,  sigma_factor: 0.08 },
};

/** Abrasive hardness (Knoop, kg/mm²) and relative efficiency */
interface AbrasiveProps {
  hardness_knoop: number;
  relative_efficiency: number;
  /** Cost factor relative to SiC */
  cost_factor: number;
}

const ABRASIVES: Record<string, AbrasiveProps> = {
  boron_carbide:    { hardness_knoop: 2800, relative_efficiency: 1.0,  cost_factor: 3.0 },
  silicon_carbide:  { hardness_knoop: 2500, relative_efficiency: 0.85, cost_factor: 1.0 },
  alumina:          { hardness_knoop: 2100, relative_efficiency: 0.65, cost_factor: 0.7 },
  diamond:          { hardness_knoop: 7000, relative_efficiency: 1.4,  cost_factor: 12.0 },
};

// ── Engine ─────────────────────────────────────────────────────────────

export class UltrasonicMachiningPhysicsEngine {

  private getMaterial(name: string): USMMaterial {
    const key = name.toLowerCase().replace(/[\s-]+/g, '_');
    return USM_MATERIALS[key] ?? USM_MATERIALS.glass;
  }

  private getAbrasive(name: string): AbrasiveProps {
    return ABRASIVES[name] ?? ABRASIVES.silicon_carbide;
  }

  /**
   * Shaw MRR model:
   * MRR = K · f · A^(3/2) · d · √(σw / Hw)
   *
   * Where:
   * - K = empirical constant incorporating abrasive efficiency
   * - f = ultrasonic frequency (Hz)
   * - A = vibration amplitude (mm)
   * - d = abrasive grain diameter (mm)
   * - σw = static stress = F/A_tool (MPa)
   * - Hw = workpiece hardness (MPa, converted from HV)
   */
  predictMRR(input: USMMRRInput): USMMRRResult {
    const mat = this.getMaterial(input.material);
    const abr = this.getAbrasive(input.abrasive);
    const warnings: string[] = [];

    // Validate inputs
    if (input.frequency_kHz < 15 || input.frequency_kHz > 50) {
      warnings.push(`Ultrasonic frequency ${input.frequency_kHz} kHz outside typical USM range (20-40 kHz)`);
    }
    if (input.amplitude_um < 5 || input.amplitude_um > 80) {
      warnings.push(`Amplitude ${input.amplitude_um} µm outside typical range (10-50 µm)`);
    }
    if (mat.brittleness < 20) {
      warnings.push(`Material ${input.material} is ductile (brittleness index=${mat.brittleness.toFixed(1)}), USM inefficient`);
    }

    // Convert units
    const f_Hz = input.frequency_kHz * 1000;
    const A_mm = input.amplitude_um / 1000;
    const d_mm = input.grain_size_um / 1000;
    const sigma_w_MPa = input.static_load_N / input.tool_area_mm2; // N/mm² = MPa
    const Hw_MPa = mat.Hv * 9.807; // HV → MPa (1 HV ≈ 9.807 MPa)

    // Shaw model constant scaled by abrasive efficiency
    // K ≈ 5.9e-5 (empirical, mm³·s^(1/2) / (Hz·mm^(5/2)·MPa^(1/2)))
    const K_base = 5.9e-5;
    const K = K_base * abr.relative_efficiency * mat.sigma_factor;

    // MRR = K · f · A^(3/2) · d · √(σw / Hw)
    const A_32 = Math.pow(A_mm, 1.5);
    const stress_ratio = Math.sqrt(Math.max(sigma_w_MPa / Hw_MPa, 0));
    const mrr_mm3_s = K * f_Hz * A_32 * d_mm * stress_ratio;
    const mrr_mm3_min = mrr_mm3_s * 60;

    // Surface roughness model: Ra ∝ d^(2/3) · A^(1/3) · (σw/Hw)^(1/4)
    // Empirical: Ra_um ≈ 0.32 · d_um^(2/3) · A_um^(1/3) · (σw/Hw)^(1/4)
    const Ra = 0.32
      * Math.pow(input.grain_size_um, 2 / 3)
      * Math.pow(input.amplitude_um, 1 / 3)
      * Math.pow(Math.max(sigma_w_MPa / Hw_MPa, 1e-6), 0.25);

    // Tool wear ratio: depends on hardness ratio (tool/abrasive vs workpiece/abrasive)
    // Higher workpiece brittleness → more removal → lower wear ratio
    const base_wear = 0.5; // baseline tool:workpiece vol ratio
    const brittleness_factor = Math.min(mat.brittleness / 500, 2);
    const tool_wear_ratio = base_wear / Math.max(brittleness_factor, 0.1);

    // Penetration rate
    const penetration_rate = input.tool_area_mm2 > 0
      ? mrr_mm3_min / input.tool_area_mm2
      : 0;

    if (mrr_mm3_min < 0.01) {
      warnings.push('Predicted MRR extremely low — consider alternative processes');
    }
    if (tool_wear_ratio > 1.0) {
      warnings.push(`High tool wear ratio (${tool_wear_ratio.toFixed(2)}) — tool wears faster than workpiece`);
    }

    return {
      mrr_mm3_per_min: Math.max(mrr_mm3_min, 0),
      surface_roughness_Ra_um: Ra,
      tool_wear_ratio,
      penetration_rate_mm_per_min: penetration_rate,
      formula: `MRR = K·f·A^(3/2)·d·√(σw/Hw) = ${K.toExponential(3)}·${f_Hz}·${A_32.toExponential(3)}·${d_mm.toFixed(4)}·${stress_ratio.toFixed(4)} = ${mrr_mm3_min.toFixed(4)} mm³/min`,
      warnings,
    };
  }

  /**
   * Select optimal abrasive for given application.
   * Considers workpiece hardness, feature geometry, and target finish.
   */
  selectAbrasive(input: USMAbrasiveInput): USMAbrasiveResult {
    const mat = this.getMaterial(input.workpiece_material);

    // Decision logic:
    // 1. Very hard materials (Hv > 2000) → diamond
    // 2. Hard ceramics (Hv > 1500) → boron carbide
    // 3. Medium (Hv 500-1500) → silicon carbide
    // 4. Softer materials → alumina (gentler)
    let recommended: 'boron_carbide' | 'silicon_carbide' | 'alumina' | 'diamond';
    let reasoning = '';

    if (mat.Hv >= 2000) {
      recommended = 'diamond';
      reasoning = `Workpiece hardness ${mat.Hv} HV exceeds 2000 — diamond abrasive required for effective material removal`;
    } else if (mat.Hv > 1500) {
      recommended = 'boron_carbide';
      reasoning = `Hard material (${mat.Hv} HV) — boron carbide provides optimal cutting with acceptable cost`;
    } else if (mat.Hv > 400) {
      recommended = 'silicon_carbide';
      reasoning = `Medium hardness (${mat.Hv} HV) — silicon carbide offers good balance of removal rate and cost`;
    } else {
      recommended = 'alumina';
      reasoning = `Lower hardness (${mat.Hv} HV) — alumina is cost-effective and provides adequate removal`;
    }

    // Grain size selection based on target Ra
    // Empirical: d_um ≈ (target_Ra / 0.2)^(3/2) for fine control
    // Bounded to practical range 5-200 µm
    let grain_size_um: number;
    if (input.target_Ra_um <= 0.5) {
      grain_size_um = 15; // Fine finishing
    } else if (input.target_Ra_um <= 1.0) {
      grain_size_um = 30;
    } else if (input.target_Ra_um <= 2.0) {
      grain_size_um = 60;
    } else if (input.target_Ra_um <= 5.0) {
      grain_size_um = 100;
    } else {
      grain_size_um = 150; // Rough machining
    }

    // Adjust for feature type
    if (input.feature_type === 'contour') {
      grain_size_um = Math.max(grain_size_um * 0.7, 10); // Finer for contour accuracy
      reasoning += '. Grain size reduced for contour accuracy';
    }
    if (input.feature_type === 'cavity' && input.depth_mm > 5) {
      grain_size_um = Math.min(grain_size_um * 1.2, 200); // Coarser for deep cavities (chip evacuation)
      reasoning += '. Grain size increased for deep cavity chip evacuation';
    }

    grain_size_um = Math.round(grain_size_um);

    // Concentration: 30-50% by weight typical
    // Higher for finishing (more uniform coverage), lower for roughing (faster flow)
    const concentration_pct = input.target_Ra_um <= 1.0 ? 45 : input.target_Ra_um <= 3.0 ? 35 : 30;

    // Flow rate: 0.5-2 L/min, higher for deep features
    const slurry_flow_rate = 0.5 + Math.min(input.depth_mm / 10, 1.5);

    return {
      recommended_abrasive: recommended,
      grain_size_um,
      concentration_pct,
      slurry_flow_rate: Math.round(slurry_flow_rate * 100) / 100,
      reasoning,
    };
  }

  /**
   * Assess USM feasibility for a given application.
   * Checks material suitability, geometric constraints, and achievable tolerance.
   */
  assessFeasibility(input: USMFeasibilityInput): USMFeasibilityResult {
    const mat = this.getMaterial(input.material);
    const limitations: string[] = [];
    const alternative_processes: string[] = [];
    let feasible = true;

    // 1. Material suitability — USM works best on brittle materials
    if (mat.brittleness < 20) {
      feasible = false;
      limitations.push(`Material is ductile (brittleness index ${mat.brittleness.toFixed(1)} < 20), USM is inefficient`);
      alternative_processes.push('EDM', 'ECM', 'laser machining');
    } else if (mat.brittleness < 100) {
      limitations.push(`Material has moderate brittleness (${mat.brittleness.toFixed(1)}), reduced MRR expected`);
    }

    // 2. Feature size — minimum ~0.1 mm for USM
    if (input.feature_size_mm < 0.1) {
      feasible = false;
      limitations.push(`Feature size ${input.feature_size_mm} mm below USM minimum (~0.1 mm)`);
      alternative_processes.push('laser ablation', 'micro-EDM', 'FIB');
    } else if (input.feature_size_mm < 0.5) {
      limitations.push('Small feature — micro-USM setup required');
    }

    // 3. Aspect ratio — practical limit ~3:1 for standard, ~10:1 for rotary USM
    if (input.aspect_ratio > 10) {
      feasible = false;
      limitations.push(`Aspect ratio ${input.aspect_ratio}:1 exceeds USM limit (~10:1 even with rotary)`);
      alternative_processes.push('deep-hole EDM', 'ECM');
    } else if (input.aspect_ratio > 3) {
      limitations.push(`High aspect ratio (${input.aspect_ratio}:1) — rotary USM recommended for chip evacuation`);
    }

    // 4. Tolerance check
    // USM typical accuracy: ±0.01 to ±0.05 mm depending on conditions
    const base_accuracy = 0.015; // mm, best case
    const size_factor = 1 + input.feature_size_mm / 50; // larger features → larger absolute error
    const aspect_factor = 1 + input.aspect_ratio / 5;
    const hardness_factor = mat.Hv > 1500 ? 1.2 : 1.0;
    const expected_accuracy = base_accuracy * size_factor * aspect_factor * hardness_factor;

    if (input.tolerance_mm < expected_accuracy) {
      limitations.push(`Required tolerance ±${input.tolerance_mm} mm tighter than achievable ±${expected_accuracy.toFixed(3)} mm`);
      if (input.tolerance_mm < 0.005) {
        feasible = false;
        alternative_processes.push('precision grinding', 'lapping');
      }
    }

    // 5. Hardness range — USM typically for Hv > 300
    if (input.hardness_HV < 300 && mat.brittleness < 50) {
      limitations.push(`Low hardness (${input.hardness_HV} HV) — conventional machining likely more efficient`);
      alternative_processes.push('CNC milling', 'CNC turning');
    }

    // Cycle time estimate
    // Approximate: feature volume / estimated MRR
    // Assume circular feature for volume estimate, MRR ~1-10 mm³/min typical
    const feature_volume = input.feature_size_mm * input.feature_size_mm * (input.aspect_ratio * input.feature_size_mm);
    const est_mrr = mat.brittleness > 200 ? 5.0 : mat.brittleness > 50 ? 2.0 : 0.5; // mm³/min
    const cycle_time = feature_volume / est_mrr;

    // Deduplicate alternatives
    const unique_alternatives = Array.from(new Set(alternative_processes));

    return {
      feasible,
      expected_accuracy_mm: Math.round(expected_accuracy * 1000) / 1000,
      cycle_time_estimate_min: Math.round(cycle_time * 10) / 10,
      limitations,
      alternative_processes: unique_alternatives,
    };
  }
}

/** Singleton instance */
export const ultrasonicMachiningPhysicsEngine = new UltrasonicMachiningPhysicsEngine();
