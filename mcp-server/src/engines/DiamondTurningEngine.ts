/**
 * DiamondTurningEngine — Single-point diamond turning (SPDT) physics
 *
 * Covers ultra-precision optics, IR lenses, mirrors, and mold inserts.
 * Models nanometer-scale surface finish (Ra_ideal + error budgets),
 * micro-cutting forces with size effect, diamond tool wear (chemical +
 * abrasive + diffusion), and machine configuration selection.
 *
 * Self-contained: no external dependencies.
 *
 * References:
 *   Nakasuji et al., Ann. CIRP 39/1 (1990) 89 (ductile-regime machining),
 *   Lucca et al., Ann. CIRP 40/1 (1991) 69 (size effect in cutting),
 *   Ikawa et al., Ann. CIRP 40/1 (1991) 587 (SPDT surface generation),
 *   Brinksmeier et al., Ann. CIRP 59/2 (2010) 652 (diamond machining review),
 *   Paul et al., Wear 259 (2005) 1472 (chemical wear of diamond on ferrous),
 *   Cheung & Lee, Proc. IMechE B 214 (2000) 1 (surface generation model),
 *   Namba & Abe, Ann. CIRP 42/1 (1993) 523 (ultra-precision finishing)
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface AtomicValue<T> {
  value: T;
  unit: string;
  formula?: string;
  confidence?: number;
}

// ─── Material Database ──────────────────────────────────────────────

type SPDTMaterial =
  | 'copper'
  | 'aluminum_6061'
  | 'nickel'
  | 'germanium'
  | 'silicon'
  | 'zinc_selenide'
  | 'calcium_fluoride'
  | 'pmma'
  | 'electroless_nickel';

interface MaterialProps {
  /** Specific cutting force reference [N/mm²] at h_ref */
  kc_ref: number;
  /** Reference uncut chip thickness [µm] */
  h_ref: number;
  /** Size-effect exponent (0.2–0.4 typical) */
  mc: number;
  /** Minimum chip thickness ratio (fraction of edge radius) */
  min_chip_ratio: number;
  /** Elastic recovery / spring-back [nm per µm DOC] */
  springback_nm_per_um: number;
  /** Ductile-to-brittle transition depth [µm] (Infinity for ductile metals) */
  dbt_depth_um: number;
  /** Graphitization risk with diamond tools */
  graphitization_risk: boolean;
  /** Abrasive wear coefficient (relative) */
  abrasive_k: number;
  /** Diffusion wear activation energy relative factor */
  diffusion_factor: number;
  /** Chemical wear rate [µm/km] in standard conditions */
  chem_wear_rate: number;
  /** Hardness [GPa] for reference */
  hardness_GPa: number;
}

const MATERIALS: Record<SPDTMaterial, MaterialProps> = {
  copper: {
    kc_ref: 800, h_ref: 10, mc: 0.25, min_chip_ratio: 0.25,
    springback_nm_per_um: 3, dbt_depth_um: Infinity,
    graphitization_risk: false, abrasive_k: 0.1, diffusion_factor: 0.05,
    chem_wear_rate: 0.002, hardness_GPa: 1.0
  },
  aluminum_6061: {
    kc_ref: 600, h_ref: 10, mc: 0.22, min_chip_ratio: 0.2,
    springback_nm_per_um: 2, dbt_depth_um: Infinity,
    graphitization_risk: false, abrasive_k: 0.15, diffusion_factor: 0.03,
    chem_wear_rate: 0.001, hardness_GPa: 1.1
  },
  nickel: {
    kc_ref: 1800, h_ref: 10, mc: 0.30, min_chip_ratio: 0.3,
    springback_nm_per_um: 8, dbt_depth_um: Infinity,
    graphitization_risk: true, abrasive_k: 0.4, diffusion_factor: 0.6,
    chem_wear_rate: 0.15, hardness_GPa: 6.0
  },
  germanium: {
    kc_ref: 1200, h_ref: 5, mc: 0.35, min_chip_ratio: 0.3,
    springback_nm_per_um: 5, dbt_depth_um: 0.5,
    graphitization_risk: false, abrasive_k: 0.6, diffusion_factor: 0.1,
    chem_wear_rate: 0.005, hardness_GPa: 8.5
  },
  silicon: {
    kc_ref: 1500, h_ref: 5, mc: 0.38, min_chip_ratio: 0.35,
    springback_nm_per_um: 4, dbt_depth_um: 0.3,
    graphitization_risk: false, abrasive_k: 0.8, diffusion_factor: 0.08,
    chem_wear_rate: 0.008, hardness_GPa: 11.0
  },
  zinc_selenide: {
    kc_ref: 400, h_ref: 5, mc: 0.28, min_chip_ratio: 0.25,
    springback_nm_per_um: 6, dbt_depth_um: 1.0,
    graphitization_risk: false, abrasive_k: 0.3, diffusion_factor: 0.04,
    chem_wear_rate: 0.003, hardness_GPa: 1.1
  },
  calcium_fluoride: {
    kc_ref: 500, h_ref: 5, mc: 0.30, min_chip_ratio: 0.3,
    springback_nm_per_um: 7, dbt_depth_um: 0.8,
    graphitization_risk: false, abrasive_k: 0.35, diffusion_factor: 0.05,
    chem_wear_rate: 0.004, hardness_GPa: 1.6
  },
  pmma: {
    kc_ref: 200, h_ref: 10, mc: 0.20, min_chip_ratio: 0.15,
    springback_nm_per_um: 15, dbt_depth_um: Infinity,
    graphitization_risk: false, abrasive_k: 0.02, diffusion_factor: 0.01,
    chem_wear_rate: 0.0005, hardness_GPa: 0.2
  },
  electroless_nickel: {
    kc_ref: 2200, h_ref: 10, mc: 0.32, min_chip_ratio: 0.28,
    springback_nm_per_um: 6, dbt_depth_um: Infinity,
    graphitization_risk: false, abrasive_k: 0.5, diffusion_factor: 0.15,
    chem_wear_rate: 0.01, hardness_GPa: 5.5
  }
};

function resolveMat(name: string): MaterialProps {
  const key = name.toLowerCase().replace(/[\s-]/g, '_') as SPDTMaterial;
  return MATERIALS[key] ?? MATERIALS.aluminum_6061;
}

// ─── Input / Output Interfaces ──────────────────────────────────────

export interface SurfaceFinishInput {
  material: string;
  tool_nose_radius_mm: number;
  feed_per_rev_um: number;
  depth_of_cut_um: number;
  spindle_rpm: number;
  spindle_error_motion_nm?: number;
  tool_waviness_nm?: number;
}

export interface SurfaceFinishOutput {
  Ra_nm: number;
  Rz_nm: number;
  pv_nm: number;
  dominant_contributor: string;
  achievable: boolean;
  recommendations: string[];
}

export interface CuttingForcesInput {
  material: string;
  depth_of_cut_um: number;
  feed_um: number;
  rake_angle_deg?: number;
  edge_radius_nm?: number;
}

export interface CuttingForcesOutput {
  Fc_mN: number;
  Ft_mN: number;
  specific_energy_J_per_mm3: number;
  ductile_regime: boolean;
  min_chip_thickness_um: number;
}

export interface ToolWearInput {
  workpiece_material: string;
  cutting_distance_km: number;
  depth_um: number;
  feed_um: number;
  coolant: 'oil_mist' | 'flood' | 'dry' | 'nitrogen';
}

export interface ToolWearOutput {
  wear_type: string;
  edge_recession_um: number;
  remaining_life_km: number;
  graphitization_risk: boolean;
  recommended_max_distance_km: number;
}

export interface MachineConfigInput {
  target_Ra_nm: number;
  workpiece_diameter_mm: number;
  material: string;
  form: 'flat' | 'spherical' | 'aspheric' | 'freeform';
}

export interface MachineConfigOutput {
  spindle_type: 'air_bearing' | 'hydrostatic' | 'aerostatic';
  spindle_error_spec_nm: number;
  slide_type: 'hydrostatic' | 'aerostatic' | 'friction';
  feedback: 'laser_interferometer' | 'glass_scale' | 'encoder';
  isolation: boolean;
  temperature_control_C: number;
  estimated_cost_range: string;
}

// ─── Engine ─────────────────────────────────────────────────────────

export class DiamondTurningEngine {
  // ── 1. Surface Finish Prediction ─────────────────────────────────

  /**
   * Ultra-precision Ra model for single-point diamond turning.
   *
   * At nanometer scale the classical Ra_ideal = f²/(32R) must be augmented
   * with spindle error motion, tool edge waviness, and material spring-back
   * contributions via RSS summation.
   *
   * @reference Cheung & Lee, Proc. IMechE B 214 (2000) 1
   * @reference Ikawa et al., Ann. CIRP 40/1 (1991) 587
   */
  predictSurfaceFinish(input: SurfaceFinishInput): AtomicValue<SurfaceFinishOutput> {
    const mat = resolveMat(input.material);
    const R_mm = input.tool_nose_radius_mm;
    const f_um = input.feed_per_rev_um;
    const f_mm = f_um / 1000;
    const doc_um = input.depth_of_cut_um;

    // Classical kinematic roughness: Ra_ideal = f² / (32 × R)
    // Result in mm, convert to nm
    const Ra_ideal_mm = (f_mm * f_mm) / (32 * R_mm);
    const Ra_ideal_nm = Ra_ideal_mm * 1e6;

    // Spindle error contribution (synchronous + asynchronous)
    const spindle_error_nm = input.spindle_error_motion_nm ?? 25; // typical air bearing
    const Ra_spindle_nm = spindle_error_nm * 0.5; // ~50% of error motion appears as roughness

    // Tool edge waviness contribution
    const tool_waviness_nm = input.tool_waviness_nm ?? 10;
    const Ra_tool_nm = tool_waviness_nm * 0.7;

    // Material spring-back (elastic recovery)
    const Ra_springback_nm = mat.springback_nm_per_um * doc_um * 0.3;

    // RSS combination of independent contributors
    const Ra_total_nm = Math.sqrt(
      Ra_ideal_nm ** 2 +
      Ra_spindle_nm ** 2 +
      Ra_tool_nm ** 2 +
      Ra_springback_nm ** 2
    );

    // Rz ≈ 4–5 × Ra for diamond turning
    const Rz_nm = Ra_total_nm * 4.5;

    // Peak-to-valley ≈ Rz × 1.3 for periodic tool marks
    const pv_nm = Rz_nm * 1.3;

    // Determine dominant contributor
    const contributions = [
      { name: 'kinematic (feed marks)', value: Ra_ideal_nm },
      { name: 'spindle error motion', value: Ra_spindle_nm },
      { name: 'tool edge waviness', value: Ra_tool_nm },
      { name: 'material spring-back', value: Ra_springback_nm }
    ];
    contributions.sort((a, b) => b.value - a.value);
    const dominant = contributions[0].name;

    // Achievability check: sub-10nm Ra requires everything aligned
    const achievable = Ra_total_nm < 500; // practical limit

    // Ductile-regime check for brittle materials
    const ductile = doc_um <= mat.dbt_depth_um;

    const recommendations: string[] = [];
    if (Ra_ideal_nm > Ra_spindle_nm * 2) {
      recommendations.push(`Reduce feed from ${f_um}µm/rev to ${(f_um * 0.7).toFixed(1)}µm/rev to lower kinematic roughness`);
    }
    if (Ra_spindle_nm > Ra_ideal_nm) {
      recommendations.push(`Spindle error dominates — consider air-bearing spindle upgrade or balancing`);
    }
    if (!ductile) {
      recommendations.push(`DOC ${doc_um}µm exceeds ductile-brittle transition (${mat.dbt_depth_um}µm) for ${input.material} — reduce depth`);
    }
    if (Ra_springback_nm > Ra_ideal_nm * 0.5) {
      recommendations.push(`Spring-back significant for ${input.material} — use negative rake angle or spring passes`);
    }
    if (Ra_total_nm < 5) {
      recommendations.push(`Sub-5nm Ra target — ensure vibration isolation, thermal stability ±0.01°C, and oil-free environment`);
    }
    if (input.spindle_rpm > 5000 && input.tool_nose_radius_mm < 0.5) {
      recommendations.push(`High RPM with small nose radius — verify centrifugal runout contribution`);
    }

    return {
      value: {
        Ra_nm: Math.round(Ra_total_nm * 100) / 100,
        Rz_nm: Math.round(Rz_nm * 100) / 100,
        pv_nm: Math.round(pv_nm * 100) / 100,
        dominant_contributor: dominant,
        achievable,
        recommendations
      },
      unit: 'nm',
      formula: `Ra = √(Ra_ideal² + Ra_spindle² + Ra_tool² + Ra_springback²); Ra_ideal = f²/(32R) = ${Ra_ideal_nm.toFixed(2)}nm`
    };
  }

  // ── 2. Micro-Cutting Forces ──────────────────────────────────────

  /**
   * Micro-cutting force model with size effect.
   *
   * At µm-scale DOC the specific cutting force increases sharply:
   *   kc = kc_ref × (h/h_ref)^(-mc)
   * where mc ≈ 0.2–0.4 for ductile-regime cutting.
   *
   * Thrust force includes ploughing contribution from edge radius.
   *
   * @reference Lucca et al., Ann. CIRP 40/1 (1991) 69
   * @reference Nakasuji et al., Ann. CIRP 39/1 (1990) 89
   */
  calculateCuttingForces(input: CuttingForcesInput): AtomicValue<CuttingForcesOutput> {
    const mat = resolveMat(input.material);
    const doc_um = input.depth_of_cut_um;
    const feed_um = input.feed_um;
    const rake_deg = input.rake_angle_deg ?? 0;
    const edge_r_nm = input.edge_radius_nm ?? 50; // typical fresh diamond

    // Minimum chip thickness
    const edge_r_um = edge_r_nm / 1000;
    const min_chip_um = mat.min_chip_ratio * edge_r_um;

    // Ductile regime check
    const ductile = doc_um <= mat.dbt_depth_um;

    // Uncut chip thickness ≈ feed for facing/turning
    const h_um = feed_um;

    // Size effect: specific cutting force scales with chip thickness
    const h_ratio = Math.max(h_um / mat.h_ref, 0.001);
    const kc = mat.kc_ref * Math.pow(h_ratio, -mat.mc); // N/mm²

    // Rake angle correction (Merchant): kc reduces ~1.5% per degree positive rake
    const rake_factor = 1 - 0.015 * rake_deg;
    const kc_corrected = kc * Math.max(rake_factor, 0.5);

    // Cross-section area [mm²]
    const area_mm2 = (doc_um / 1000) * (feed_um / 1000);

    // Main cutting force [N] → convert to mN
    const Fc_N = kc_corrected * area_mm2;
    const Fc_mN = Fc_N * 1000;

    // Thrust force: includes ploughing from edge radius
    // Ploughing force ∝ edge_r × width × hardness
    const plough_N = (edge_r_um / 1000) * (doc_um / 1000) * mat.hardness_GPa * 1000 * 0.3;
    const Ft_N = Fc_N * 0.4 + plough_N; // 40% of Fc + ploughing
    const Ft_mN = Ft_N * 1000;

    // Specific cutting energy [J/mm³] = kc [N/mm²] = [J/mm³]
    const specific_energy = kc_corrected;

    return {
      value: {
        Fc_mN: Math.round(Fc_mN * 1000) / 1000,
        Ft_mN: Math.round(Ft_mN * 1000) / 1000,
        specific_energy_J_per_mm3: Math.round(specific_energy * 100) / 100,
        ductile_regime: ductile,
        min_chip_thickness_um: Math.round(min_chip_um * 1000) / 1000
      },
      unit: 'mN',
      formula: `kc = ${mat.kc_ref} × (h/${mat.h_ref})^(-${mat.mc}) = ${kc_corrected.toFixed(1)} N/mm²; Fc = kc × A = ${Fc_mN.toFixed(3)} mN`
    };
  }

  // ── 3. Diamond Tool Wear Assessment ──────────────────────────────

  /**
   * Diamond tool wear prediction for SPDT.
   *
   * Three mechanisms:
   * 1. Chemical (graphitization on Fe/Ni/Co at >600°C) — dominant on ferrous
   * 2. Abrasive — from hard particles/inclusions
   * 3. Diffusion — temperature-dependent carbon migration
   *
   * @reference Paul et al., Wear 259 (2005) 1472
   * @reference Brinksmeier et al., Ann. CIRP 59/2 (2010) 652
   */
  assessToolWear(input: ToolWearInput): AtomicValue<ToolWearOutput> {
    const mat = resolveMat(input.workpiece_material);
    const dist_km = input.cutting_distance_km;
    const doc_um = input.depth_um;
    const feed_um = input.feed_um;

    // Coolant effectiveness on wear rate
    const coolant_factor: Record<string, number> = {
      oil_mist: 0.6,
      flood: 0.5,
      dry: 1.0,
      nitrogen: 0.4 // cryogenic suppresses diffusion
    };
    const cf = coolant_factor[input.coolant] ?? 1.0;

    // Severity factor from cutting parameters
    const severity = (doc_um / 5) * (feed_um / 5); // normalized to 5µm baseline

    // Chemical wear (graphitization)
    const chem_rate = mat.chem_wear_rate * cf * Math.sqrt(severity);
    const chem_wear_um = chem_rate * dist_km;

    // Abrasive wear
    const abrasive_rate = mat.abrasive_k * 0.005 * cf * severity; // µm/km
    const abrasive_wear_um = abrasive_rate * dist_km;

    // Diffusion wear (temperature dependent, approximated)
    const diff_rate = mat.diffusion_factor * 0.01 * cf * severity;
    const diff_wear_um = diff_rate * dist_km;

    // Total edge recession
    const total_wear_um = chem_wear_um + abrasive_wear_um + diff_wear_um;

    // Dominant mechanism
    const mechanisms = [
      { name: 'chemical (graphitization)', value: chem_wear_um },
      { name: 'abrasive', value: abrasive_wear_um },
      { name: 'diffusion', value: diff_wear_um }
    ];
    mechanisms.sort((a, b) => b.value - a.value);
    const dominant = mechanisms[0].name;

    // Maximum recommended distance: edge recession < 0.5µm for optics, < 2µm general
    const max_recession_um = 0.5;
    const total_rate = (chem_rate + abrasive_rate + diff_rate);
    const max_dist_km = total_rate > 0 ? max_recession_um / total_rate : 500;
    const remaining_km = Math.max(0, max_dist_km - dist_km);

    return {
      value: {
        wear_type: dominant,
        edge_recession_um: Math.round(total_wear_um * 10000) / 10000,
        remaining_life_km: Math.round(remaining_km * 100) / 100,
        graphitization_risk: mat.graphitization_risk,
        recommended_max_distance_km: Math.round(max_dist_km * 100) / 100
      },
      unit: 'µm',
      formula: `recession = Σ(chem + abrasive + diffusion) × dist; chem=${chem_wear_um.toFixed(4)}µm, abr=${abrasive_wear_um.toFixed(4)}µm, diff=${diff_wear_um.toFixed(4)}µm`
    };
  }

  // ── 4. Machine Configuration Selection ───────────────────────────

  /**
   * Select machine configuration for target surface quality.
   *
   * Maps target Ra to required spindle type, slide technology,
   * feedback system, and environmental controls.
   *
   * @reference Brinksmeier et al., Ann. CIRP 59/2 (2010) 652
   */
  selectMachineConfig(input: MachineConfigInput): AtomicValue<MachineConfigOutput> {
    const mat = resolveMat(input.material);
    const Ra_target = input.target_Ra_nm;
    const diam = input.workpiece_diameter_mm;
    const form = input.form;

    // Spindle type selection based on Ra target
    let spindle_type: 'air_bearing' | 'hydrostatic' | 'aerostatic';
    let spindle_error_nm: number;
    if (Ra_target < 5) {
      spindle_type = 'aerostatic';
      spindle_error_nm = 5;
    } else if (Ra_target < 20) {
      spindle_type = 'air_bearing';
      spindle_error_nm = 15;
    } else {
      spindle_type = 'hydrostatic';
      spindle_error_nm = 50;
    }

    // Large diameters need hydrostatic for stiffness
    if (diam > 300 && spindle_type === 'air_bearing') {
      spindle_type = 'hydrostatic';
      spindle_error_nm = Math.max(spindle_error_nm, 25);
    }

    // Slide type
    let slide_type: 'hydrostatic' | 'aerostatic' | 'friction';
    if (Ra_target < 10) {
      slide_type = 'hydrostatic';
    } else if (Ra_target < 50) {
      slide_type = 'aerostatic';
    } else {
      slide_type = 'friction';
    }

    // Feedback resolution
    let feedback: 'laser_interferometer' | 'glass_scale' | 'encoder';
    if (Ra_target < 10) {
      feedback = 'laser_interferometer';
    } else if (Ra_target < 50) {
      feedback = 'glass_scale';
    } else {
      feedback = 'encoder';
    }

    // Freeform and aspheric require slow-tool or fast-tool servo → higher specs
    if (form === 'freeform' || form === 'aspheric') {
      if (feedback !== 'laser_interferometer') feedback = 'laser_interferometer';
      if (slide_type === 'friction') slide_type = 'aerostatic';
    }

    // Vibration isolation: always for sub-50nm targets
    const isolation = Ra_target < 50;

    // Temperature control: tighter for tighter Ra
    let temp_control_C: number;
    if (Ra_target < 5) temp_control_C = 0.01;
    else if (Ra_target < 20) temp_control_C = 0.05;
    else if (Ra_target < 50) temp_control_C = 0.1;
    else temp_control_C = 0.5;

    // Cost estimate (rough)
    let cost_range: string;
    if (Ra_target < 5) {
      cost_range = '$800K–$2M (ultra-precision, e.g., Moore Nanotech / Precitech)';
    } else if (Ra_target < 20) {
      cost_range = '$400K–$800K (precision diamond turning machine)';
    } else if (Ra_target < 100) {
      cost_range = '$150K–$400K (precision lathe with diamond tooling)';
    } else {
      cost_range = '$50K–$150K (standard precision lathe)';
    }

    // Brittle material adjustments
    if (mat.dbt_depth_um < 2) {
      if (spindle_error_nm > 15) spindle_error_nm = 15;
      if (temp_control_C > 0.05) temp_control_C = 0.05;
    }

    return {
      value: {
        spindle_type,
        spindle_error_spec_nm: spindle_error_nm,
        slide_type,
        feedback,
        isolation,
        temperature_control_C: temp_control_C,
        estimated_cost_range: cost_range
      },
      unit: 'config',
      formula: `Target Ra=${Ra_target}nm, ${form} form, Ø${diam}mm ${input.material} → ${spindle_type} spindle (${spindle_error_nm}nm error)`
    };
  }
}

/** Singleton instance */
export const diamondTurningEngine = new DiamondTurningEngine();
