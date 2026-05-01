/**
 * AbrasiveJetMachiningEngine — Physics-Based Abrasive Waterjet Prediction
 *
 * Abrasive jet machining (AJM/AWJ) accelerates abrasive particles in a
 * high-pressure water stream through a focusing nozzle. Material removal
 * occurs via erosion at the workpiece surface.
 *
 * Models:
 * - Finnie erosion: E = K · m · v^n · f(α) where α = impact angle
 * - Kerf geometry: width, taper from standoff and traverse speed
 * - MRR from kerf width × depth × traverse speed
 * - Nozzle wear: bore growth from abrasive impact
 *
 * References:
 * - Finnie (1960): Erosion of surfaces by solid particles
 * - Hashish (1989): AWJ machining model
 * - Momber & Kovacevic (1998): Principles of AWJ Machining
 * - Axinte et al. (2010): AWJ kerf geometry prediction
 *
 * Actions: ajm_cutting, ajm_optimize, ajm_nozzle_wear (calcDispatcher)
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface AJMCuttingInput {
  /** Workpiece material */
  material: string;
  /** Abrasive type */
  abrasive: 'garnet' | 'alumina' | 'silicon_carbide';
  /** Water pressure (MPa) */
  pressure_MPa: number;
  /** Focusing nozzle inner diameter (mm) */
  nozzle_diameter_mm: number;
  /** Nozzle-to-workpiece distance (mm) */
  standoff_distance_mm: number;
  /** Table traverse speed (mm/min) */
  traverse_speed_mm_per_min: number;
  /** Workpiece thickness (mm) */
  material_thickness_mm: number;
}

export interface AJMCuttingResult {
  /** Kerf width at entry (mm) */
  kerf_width_mm: number;
  /** Kerf taper angle (degrees, half-angle) */
  taper_angle_deg: number;
  /** Volumetric MRR (mm³/min) */
  mrr_mm3_per_min: number;
  /** Surface roughness (µm Ra) */
  surface_Ra_um: number;
  /** Predicted cut depth (mm), compare to thickness */
  predicted_depth_mm: number;
  /** Finnie formula string */
  formula: string;
  /** Process warnings */
  warnings: string[];
}

export interface AJMOptimizeInput {
  /** Workpiece material */
  material: string;
  /** Workpiece thickness (mm) */
  thickness_mm: number;
  /** Target cut quality */
  target_quality: 'rough' | 'medium' | 'fine';
  /** Cut geometry type */
  geometry: 'straight' | 'curve' | 'corner';
}

export interface AJMOptimizeResult {
  /** Recommended water pressure (MPa) */
  pressure_MPa: number;
  /** Recommended traverse speed (mm/min) */
  traverse_speed: number;
  /** Recommended standoff distance (mm) */
  standoff_mm: number;
  /** Abrasive mass flow rate (g/min) */
  abrasive_flow_rate_g_per_min: number;
  /** Expected surface roughness (µm Ra) */
  expected_Ra: number;
  /** Expected taper angle (degrees) */
  expected_taper: number;
  /** Speed reduction for corners (%) */
  corner_speed_reduction_pct: number;
}

export interface AJMNozzleInput {
  /** Nozzle material */
  nozzle_material: 'tungsten_carbide' | 'sapphire' | 'diamond_composite';
  /** Abrasive type */
  abrasive: 'garnet' | 'alumina' | 'silicon_carbide';
  /** Water pressure (MPa) */
  pressure_MPa: number;
  /** Cumulative operating hours */
  operating_hours: number;
}

export interface AJMNozzleResult {
  /** Bore wear rate (mm/hour) */
  wear_rate_mm_per_hour: number;
  /** Remaining useful life (hours) */
  remaining_life_hours: number;
  /** Estimated replacement cost (USD) */
  replacement_cost_estimate: number;
  /** Bore diameter growth since new (%) */
  bore_growth_pct: number;
}

// ── Material Database ──────────────────────────────────────────────────

interface AJMMaterial {
  /** Density (g/cm³) */
  rho: number;
  /** Erosion resistance factor (higher = harder to cut) */
  erosion_resistance: number;
  /** Ductile (true) vs brittle (false) erosion mode */
  ductile: boolean;
  /** Typical max thickness for through-cut at 300 MPa (mm) */
  max_thickness_300MPa: number;
}

const AJM_MATERIALS: Record<string, AJMMaterial> = {
  aluminum:       { rho: 2.70, erosion_resistance: 0.5,  ductile: true,  max_thickness_300MPa: 200 },
  mild_steel:     { rho: 7.85, erosion_resistance: 1.0,  ductile: true,  max_thickness_300MPa: 150 },
  stainless_steel:{ rho: 8.00, erosion_resistance: 1.3,  ductile: true,  max_thickness_300MPa: 120 },
  titanium:       { rho: 4.50, erosion_resistance: 1.5,  ductile: true,  max_thickness_300MPa: 100 },
  inconel:        { rho: 8.20, erosion_resistance: 1.8,  ductile: true,  max_thickness_300MPa: 80 },
  copper:         { rho: 8.96, erosion_resistance: 0.6,  ductile: true,  max_thickness_300MPa: 180 },
  glass:          { rho: 2.50, erosion_resistance: 0.3,  ductile: false, max_thickness_300MPa: 300 },
  ceramic:        { rho: 3.90, erosion_resistance: 0.4,  ductile: false, max_thickness_300MPa: 250 },
  granite:        { rho: 2.70, erosion_resistance: 0.7,  ductile: false, max_thickness_300MPa: 200 },
  carbon_fiber:   { rho: 1.60, erosion_resistance: 0.8,  ductile: false, max_thickness_300MPa: 60 },
  rubber:         { rho: 1.10, erosion_resistance: 2.0,  ductile: true,  max_thickness_300MPa: 40 },
  hardened_steel: { rho: 7.85, erosion_resistance: 1.6,  ductile: true,  max_thickness_300MPa: 100 },
};

/** Abrasive properties */
interface AbrasiveProps {
  /** Hardness (Mohs scale) */
  hardness: number;
  /** Cutting efficiency relative to garnet 80-mesh */
  efficiency: number;
  /** Nozzle wear aggressiveness (1 = garnet baseline) */
  wear_factor: number;
}

const AJM_ABRASIVES: Record<string, AbrasiveProps> = {
  garnet:          { hardness: 7.5, efficiency: 1.0, wear_factor: 1.0 },
  alumina:         { hardness: 9.0, efficiency: 1.3, wear_factor: 1.8 },
  silicon_carbide: { hardness: 9.5, efficiency: 1.5, wear_factor: 2.2 },
};

/** Nozzle material properties */
interface NozzleProps {
  /** Base wear rate at 300 MPa garnet (mm/hour) */
  base_wear_rate: number;
  /** Replacement cost (USD) */
  cost_usd: number;
  /** Maximum acceptable bore growth before replacement (%) */
  max_bore_growth_pct: number;
}

const NOZZLE_MATERIALS: Record<string, NozzleProps> = {
  tungsten_carbide:  { base_wear_rate: 0.008, cost_usd: 25,  max_bore_growth_pct: 25 },
  sapphire:          { base_wear_rate: 0.003, cost_usd: 80,  max_bore_growth_pct: 15 },
  diamond_composite: { base_wear_rate: 0.001, cost_usd: 250, max_bore_growth_pct: 10 },
};

// ── Engine ─────────────────────────────────────────────────────────────

export class AbrasiveJetMachiningEngine {

  private getMaterial(name: string): AJMMaterial {
    const key = name.toLowerCase().replace(/[\s-]+/g, '_');
    return AJM_MATERIALS[key] ?? AJM_MATERIALS.mild_steel;
  }

  private getAbrasive(name: string): AbrasiveProps {
    return AJM_ABRASIVES[name] ?? AJM_ABRASIVES.garnet;
  }

  /**
   * Finnie erosion model for AWJ cutting:
   *   E = K · m_dot · v^n · f(α)
   *
   * Jet velocity from Bernoulli:
   *   v = Cv · √(2·P/ρ_water)  where Cv ≈ 0.85-0.95
   *
   * Impact angle function:
   *   Ductile: f(α) = cos²α · sin(α)   (peak at ~20-30°)
   *   Brittle: f(α) = sin²(α)           (peak at 90°)
   *
   * For through-cutting the effective α ≈ 70-90° at kerf bottom.
   */
  predictCutting(input: AJMCuttingInput): AJMCuttingResult {
    const mat = this.getMaterial(input.material);
    const abr = this.getAbrasive(input.abrasive);
    const warnings: string[] = [];

    // Validate
    if (input.pressure_MPa < 100) {
      warnings.push('Pressure below 100 MPa — insufficient for most AWJ cutting');
    }
    if (input.pressure_MPa > 600) {
      warnings.push('Pressure above 600 MPa — hyperpressure range, special equipment needed');
    }
    if (input.standoff_distance_mm > 10) {
      warnings.push('Standoff > 10 mm increases kerf width and taper significantly');
    }
    if (input.standoff_distance_mm < 0.5) {
      warnings.push('Standoff < 0.5 mm risks nozzle-workpiece collision');
    }

    // Jet velocity: v = Cv · √(2P/ρ_w)
    const Cv = 0.90; // velocity coefficient
    const rho_water = 1000; // kg/m³
    const P_Pa = input.pressure_MPa * 1e6;
    const v_jet = Cv * Math.sqrt(2 * P_Pa / rho_water); // m/s

    // Abrasive mass flow — empirical: ~100-500 g/min typical
    // Scale with nozzle diameter squared
    const m_dot = 300 * Math.pow(input.nozzle_diameter_mm / 0.75, 2); // g/min
    const m_dot_kg_s = m_dot / (1000 * 60);

    // Abrasive velocity (momentum transfer, typically 0.5-0.8 of jet velocity)
    const v_abr = 0.65 * v_jet;

    // Finnie erosion coefficient
    // n ≈ 2.0-2.5 for ductile, 2.5-3.0 for brittle
    const n = mat.ductile ? 2.2 : 2.7;

    // Impact angle factor (cutting through thick material, ~75° effective)
    const alpha_rad = (75 * Math.PI) / 180;
    const f_alpha = mat.ductile
      ? Math.cos(alpha_rad) * Math.cos(alpha_rad) * Math.sin(alpha_rad)
      : Math.sin(alpha_rad) * Math.sin(alpha_rad);

    // Erosion rate: volume per unit time
    // K is material-dependent erosion constant
    const K_base = 1e-8 / mat.erosion_resistance; // empirical scaling
    const K = K_base * abr.efficiency;
    const erosion_rate_m3_s = K * m_dot_kg_s * Math.pow(v_abr, n) * f_alpha;
    const erosion_rate_mm3_min = erosion_rate_m3_s * 1e9 * 60;

    // Kerf width: ~1.1-1.3× nozzle diameter at entry,
    // increases with standoff
    const kerf_entry = input.nozzle_diameter_mm * (1.1 + 0.03 * input.standoff_distance_mm);

    // Taper: increases with thickness, decreases with pressure
    // Half-angle typically 0.5-3°
    const taper_base = 0.5; // degrees at thin, high-pressure
    const thickness_factor = input.material_thickness_mm / 25; // normalized to 25mm
    const pressure_factor = 300 / input.pressure_MPa; // normalized to 300 MPa
    const speed_factor = input.traverse_speed_mm_per_min / 200; // normalized to 200 mm/min
    const taper_deg = taper_base
      * Math.pow(thickness_factor, 0.5)
      * Math.pow(pressure_factor, 0.3)
      * Math.pow(Math.max(speed_factor, 0.1), 0.4);
    const taper_clamped = Math.min(Math.max(taper_deg, 0.1), 5.0);

    // Predicted depth: how deep the jet can cut at given traverse speed
    // depth ∝ (MRR / (kerf_width × traverse_speed))
    const traverse_mm_s = input.traverse_speed_mm_per_min / 60;
    const predicted_depth = traverse_mm_s > 0
      ? (erosion_rate_mm3_min / 60) / (kerf_entry * traverse_mm_s)
      : input.material_thickness_mm;

    // Surface roughness: Ra ∝ traverse_speed^0.4 / pressure^0.3
    // Typical: 1-10 µm Ra
    const Ra = 3.0
      * Math.pow(input.traverse_speed_mm_per_min / 200, 0.4)
      * Math.pow(300 / input.pressure_MPa, 0.3)
      * mat.erosion_resistance;

    // MRR for actual cutting (kerf × thickness × traverse)
    const actual_depth = Math.min(predicted_depth, input.material_thickness_mm);
    const mrr_actual = kerf_entry * actual_depth * input.traverse_speed_mm_per_min;

    if (predicted_depth < input.material_thickness_mm) {
      warnings.push(
        `Predicted depth ${predicted_depth.toFixed(1)} mm < thickness ` +
        `${input.material_thickness_mm} mm — may not cut through. ` +
        `Reduce traverse speed or increase pressure`
      );
    }

    return {
      kerf_width_mm: Math.round(kerf_entry * 1000) / 1000,
      taper_angle_deg: Math.round(taper_clamped * 100) / 100,
      mrr_mm3_per_min: Math.round(mrr_actual * 100) / 100,
      surface_Ra_um: Math.round(Ra * 100) / 100,
      predicted_depth_mm: Math.round(predicted_depth * 10) / 10,
      formula: `Finnie erosion: E = K·m·v^n·f(α) = ${K.toExponential(3)}·${m_dot_kg_s.toExponential(3)}` +
        `·${v_abr.toFixed(0)}^${n}·${f_alpha.toFixed(3)} → ` +
        `${erosion_rate_mm3_min.toFixed(2)} mm³/min erosion rate`,
      warnings,
    };
  }

  /**
   * Optimize AWJ parameters for given material, thickness, and quality target.
   */
  optimizeParameters(input: AJMOptimizeInput): AJMOptimizeResult {
    const mat = this.getMaterial(input.material);

    // Pressure selection: higher for thicker/harder materials
    let pressure_MPa: number;
    const thickness_factor = input.thickness_mm / 25;
    const resistance_factor = mat.erosion_resistance;

    if (input.target_quality === 'fine') {
      // High pressure, slow speed for fine finish
      pressure_MPa = Math.min(450, 300 + 50 * thickness_factor * resistance_factor);
    } else if (input.target_quality === 'medium') {
      pressure_MPa = Math.min(400, 250 + 40 * thickness_factor * resistance_factor);
    } else {
      // Rough: moderate pressure, fast speed
      pressure_MPa = Math.min(350, 200 + 30 * thickness_factor * resistance_factor);
    }
    pressure_MPa = Math.max(150, Math.round(pressure_MPa / 10) * 10);

    // Traverse speed: inverse relationship with quality
    // Base speed for 25mm mild steel at 300 MPa
    const base_speed = 200; // mm/min
    const quality_mult = input.target_quality === 'fine' ? 0.3
      : input.target_quality === 'medium' ? 0.7 : 1.5;
    const speed_raw = base_speed * quality_mult / (thickness_factor * resistance_factor);
    const traverse_speed = Math.max(10, Math.round(Math.min(speed_raw, 2000)));

    // Standoff: smaller for finer quality
    const standoff = input.target_quality === 'fine' ? 1.5
      : input.target_quality === 'medium' ? 2.5 : 4.0;

    // Abrasive flow rate
    const flow_rate = input.target_quality === 'fine' ? 250
      : input.target_quality === 'medium' ? 350 : 450;

    // Expected Ra
    const expected_Ra = 3.0
      * Math.pow(traverse_speed / 200, 0.4)
      * Math.pow(300 / pressure_MPa, 0.3)
      * resistance_factor;

    // Expected taper
    const expected_taper = 0.5
      * Math.pow(thickness_factor, 0.5)
      * Math.pow(300 / pressure_MPa, 0.3)
      * Math.pow(traverse_speed / 200, 0.4);

    // Corner speed reduction: sharp corners need slower speed to prevent overcut
    let corner_reduction = 0;
    if (input.geometry === 'corner') {
      corner_reduction = input.target_quality === 'fine' ? 60
        : input.target_quality === 'medium' ? 45 : 30;
    } else if (input.geometry === 'curve') {
      corner_reduction = input.target_quality === 'fine' ? 30
        : input.target_quality === 'medium' ? 20 : 10;
    }

    return {
      pressure_MPa,
      traverse_speed,
      standoff_mm: standoff,
      abrasive_flow_rate_g_per_min: flow_rate,
      expected_Ra: Math.round(expected_Ra * 100) / 100,
      expected_taper: Math.round(Math.min(expected_taper, 5) * 100) / 100,
      corner_speed_reduction_pct: corner_reduction,
    };
  }

  /**
   * Predict nozzle wear and remaining life.
   * Wear rate depends on abrasive hardness, pressure, and nozzle material.
   */
  predictNozzleWear(input: AJMNozzleInput): AJMNozzleResult {
    const nozzle = NOZZLE_MATERIALS[input.nozzle_material]
      ?? NOZZLE_MATERIALS.tungsten_carbide;
    const abr = this.getAbrasive(input.abrasive);

    // Wear rate scales with pressure^0.5 and abrasive aggressiveness
    const pressure_factor = Math.sqrt(input.pressure_MPa / 300);
    const wear_rate = nozzle.base_wear_rate * abr.wear_factor * pressure_factor;

    // Bore growth after operating_hours
    // Typical starting bore: 0.76 mm (0.030")
    const start_bore = 0.76;
    const bore_growth_mm = wear_rate * input.operating_hours;
    const bore_growth_pct = (bore_growth_mm / start_bore) * 100;

    // Remaining life: until max_bore_growth_pct reached
    const max_growth_mm = start_bore * (nozzle.max_bore_growth_pct / 100);
    const remaining_growth = Math.max(0, max_growth_mm - bore_growth_mm);
    const remaining_life = wear_rate > 0 ? remaining_growth / wear_rate : Infinity;

    return {
      wear_rate_mm_per_hour: Math.round(wear_rate * 10000) / 10000,
      remaining_life_hours: Math.round(Math.max(remaining_life, 0) * 10) / 10,
      replacement_cost_estimate: nozzle.cost_usd,
      bore_growth_pct: Math.round(bore_growth_pct * 100) / 100,
    };
  }
}

/** Singleton instance */
export const abrasiveJetMachiningEngine = new AbrasiveJetMachiningEngine();
