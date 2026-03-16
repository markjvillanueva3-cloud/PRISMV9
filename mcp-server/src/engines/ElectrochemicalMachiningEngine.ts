/**
 * ElectrochemicalMachiningEngine — Physics-Based ECM Process Prediction
 *
 * Electrochemical machining dissolves metal anodically using Faraday's law.
 * No tool wear, no thermal damage, excellent surface finish on conductive materials.
 *
 * Models:
 * - Faraday's law MRR: MRR = (M · I) / (z · F · ρ)
 * - Current density: J = κ · V / gap  (Ohm's law in electrolyte)
 * - Surface roughness: Ra = f(J, gap, electrolyte, pulse params)
 * - Stray machining: lateral dissolution from current spreading
 *
 * References:
 * - McGeough (1974): Principles of Electrochemical Machining
 * - Rajurkar et al. (1999): Review of ECM and ECM-based hybrid processes
 * - Kozak et al. (2004): Shape prediction in ECM
 * - De Silva et al. (2003): Pulse ECM for precision
 *
 * Actions: ecm_mrr, ecm_electrode_design, ecm_surface_quality (calcDispatcher)
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface ECMMRRInput {
  /** Workpiece material */
  material: string;
  /** Applied current (A) */
  current_A: number;
  /** Applied voltage (V) */
  voltage_V: number;
  /** Inter-electrode gap (mm) */
  gap_mm: number;
  /** Electrolyte type */
  electrolyte: 'NaCl' | 'NaNO3' | 'KCl' | 'H2SO4';
}

export interface ECMMRRResult {
  /** Volumetric MRR (mm³/min) */
  mrr_mm3_per_min: number;
  /** Current density (A/cm²) */
  current_density_A_per_cm2: number;
  /** Predicted surface roughness (µm Ra) */
  surface_roughness_Ra_um: number;
  /** Required electrolyte flow (L/min) */
  electrolyte_flow_requirement_lpm: number;
  /** Faraday formula string */
  formula: string;
  /** Process warnings */
  warnings: string[];
}

export interface ECMElectrodeInput {
  /** Target shape description */
  target_shape: string;
  /** Feature depth (mm) */
  depth_mm: number;
  /** Feature width (mm) */
  width_mm: number;
  /** Required tolerance (mm) */
  tolerance_mm: number;
}

export interface ECMElectrodeResult {
  /** Recommended electrode material */
  electrode_material: string;
  /** Recommended inter-electrode gap (mm) */
  gap_recommendation_mm: number;
  /** Recommended feed rate (mm/min) */
  feed_rate_mm_per_min: number;
  /** Electrode design notes */
  electrode_shape_notes: string;
}

export interface ECMSurfaceInput {
  /** Current density (A/cm²) */
  current_density: number;
  /** Inter-electrode gap (mm) */
  gap_mm: number;
  /** Electrolyte type */
  electrolyte_type: 'NaCl' | 'NaNO3' | 'KCl' | 'H2SO4';
  /** Pulse on-time (µs) — for PECM */
  pulse_on_us?: number;
  /** Pulse off-time (µs) — for PECM */
  pulse_off_us?: number;
}

export interface ECMSurfaceResult {
  /** Predicted surface roughness (µm Ra) */
  predicted_Ra_um: number;
  /** Hydrogen evolution risk level */
  hydrogen_evolution_risk: string;
  /** Passivation film risk */
  passivation_risk: string;
  /** Stray machining extent (mm) */
  stray_machining_mm: number;
}

// ── Material Database ──────────────────────────────────────────────────

interface ECMMaterial {
  /** Atomic weight (g/mol) */
  M: number;
  /** Valence (electrons per atom dissolved) */
  z: number;
  /** Density (g/cm³) */
  rho: number;
  /** Passivation tendency (0-1, higher = more prone) */
  passivation: number;
}

const ECM_MATERIALS: Record<string, ECMMaterial> = {
  steel:          { M: 55.85, z: 2, rho: 7.85, passivation: 0.3 },
  stainless_steel:{ M: 55.85, z: 2, rho: 8.00, passivation: 0.7 },
  nickel:         { M: 58.69, z: 2, rho: 8.90, passivation: 0.4 },
  inconel:        { M: 58.69, z: 2, rho: 8.20, passivation: 0.5 },
  titanium:       { M: 47.87, z: 4, rho: 4.50, passivation: 0.8 },
  aluminum:       { M: 26.98, z: 3, rho: 2.70, passivation: 0.6 },
  copper:         { M: 63.55, z: 2, rho: 8.96, passivation: 0.1 },
  cobalt:         { M: 58.93, z: 2, rho: 8.90, passivation: 0.4 },
  tungsten:       { M: 183.84, z: 6, rho: 19.3, passivation: 0.3 },
  molybdenum:     { M: 95.94, z: 6, rho: 10.2, passivation: 0.3 },
};

/** Electrolyte conductivity (S/m) at ~25°C typical concentration */
interface ElectrolyteProps {
  conductivity_S_per_m: number;
  /** Surface finish factor (lower = smoother) */
  finish_factor: number;
  /** Passivation breaking capability (0-1) */
  depassivation: number;
}

const ELECTROLYTES: Record<string, ElectrolyteProps> = {
  NaCl:   { conductivity_S_per_m: 20, finish_factor: 1.2, depassivation: 0.9 },
  NaNO3:  { conductivity_S_per_m: 12, finish_factor: 0.7, depassivation: 0.4 },
  KCl:    { conductivity_S_per_m: 18, finish_factor: 1.1, depassivation: 0.85 },
  H2SO4:  { conductivity_S_per_m: 25, finish_factor: 0.9, depassivation: 0.7 },
};

/** Faraday constant (C/mol) */
const FARADAY = 96485;

// ── Engine ─────────────────────────────────────────────────────────────

export class ElectrochemicalMachiningEngine {

  private getMaterial(name: string): ECMMaterial {
    const key = name.toLowerCase().replace(/[\s-]+/g, '_');
    return ECM_MATERIALS[key] ?? ECM_MATERIALS.steel;
  }

  private getElectrolyte(name: string): ElectrolyteProps {
    return ELECTROLYTES[name] ?? ELECTROLYTES.NaCl;
  }

  /**
   * Faraday's law MRR:
   *   MRR = (M · I) / (z · F · ρ)
   *
   * Current density from Ohm's law in electrolyte gap:
   *   J = κ · V / d  (A/m² → A/cm²)
   */
  predictMRR(input: ECMMRRInput): ECMMRRResult {
    const mat = this.getMaterial(input.material);
    const elec = this.getElectrolyte(input.electrolyte);
    const warnings: string[] = [];

    // Validate
    if (input.gap_mm < 0.05) {
      warnings.push('Gap < 0.05 mm risks short circuit');
    }
    if (input.gap_mm > 2.0) {
      warnings.push('Gap > 2 mm reduces current density significantly');
    }
    if (input.voltage_V < 5) {
      warnings.push('Voltage below 5V may be insufficient for dissolution');
    }
    if (input.voltage_V > 30) {
      warnings.push('Voltage above 30V increases hydrogen evolution risk');
    }

    // Faraday's law: volumetric MRR
    // MRR (cm³/s) = (M · I) / (z · F · ρ)
    const mrr_cm3_s = (mat.M * input.current_A) / (mat.z * FARADAY * mat.rho);
    const mrr_mm3_min = mrr_cm3_s * 1000 * 60; // cm³/s → mm³/min

    // Current density: J = κ · V / gap
    // gap in m, conductivity in S/m → J in A/m²
    const gap_m = input.gap_mm / 1000;
    const J_A_m2 = elec.conductivity_S_per_m * input.voltage_V / gap_m;
    const J_A_cm2 = J_A_m2 / 10000;

    // Surface roughness: empirical model
    // Ra ∝ finish_factor / J^0.3 · gap^0.2
    // Typical ECM: 0.1-6 µm Ra
    const Ra = elec.finish_factor
      * 2.5
      * Math.pow(Math.max(J_A_cm2, 1), -0.3)
      * Math.pow(input.gap_mm, 0.2);

    // Electrolyte flow: must remove products + heat
    // Rule of thumb: ~1 L/min per 100A, minimum 0.5 L/min
    const flow_lpm = Math.max(0.5, input.current_A / 100);

    // Warnings for specific conditions
    if (J_A_cm2 > 200) {
      warnings.push(
        `Current density ${J_A_cm2.toFixed(0)} A/cm² very high — risk of sparking`
      );
    }
    if (J_A_cm2 < 5) {
      warnings.push(
        `Current density ${J_A_cm2.toFixed(1)} A/cm² too low for effective dissolution`
      );
    }
    if (mat.passivation > 0.5 && elec.depassivation < 0.5) {
      warnings.push(
        `${input.material} prone to passivation with ${input.electrolyte} — ` +
        `consider NaCl or pulse ECM`
      );
    }

    return {
      mrr_mm3_per_min: mrr_mm3_min,
      current_density_A_per_cm2: J_A_cm2,
      surface_roughness_Ra_um: Math.round(Ra * 100) / 100,
      electrolyte_flow_requirement_lpm: Math.round(flow_lpm * 10) / 10,
      formula: `Faraday MRR = (M·I)/(z·F·ρ) = (${mat.M}·${input.current_A})/` +
        `(${mat.z}·${FARADAY}·${mat.rho}) = ${mrr_mm3_min.toFixed(3)} mm³/min`,
      warnings,
    };
  }

  /**
   * Design tool electrode for ECM operation.
   * Electrode shape = negative of desired shape, with gap compensation.
   */
  designToolElectrode(input: ECMElectrodeInput): ECMElectrodeResult {
    // Electrode material selection based on requirements
    let electrode_material: string;
    if (input.tolerance_mm < 0.02) {
      electrode_material = 'Titanium (corrosion-resistant, dimensionally stable)';
    } else if (input.depth_mm > 20) {
      electrode_material = 'Stainless steel 316L (corrosion-resistant for deep cavities)';
    } else {
      electrode_material = 'Copper (high conductivity, easy to machine)';
    }

    // Gap recommendation: smaller gap = better accuracy but harder to control
    let gap_mm: number;
    if (input.tolerance_mm < 0.01) {
      gap_mm = 0.05; // Pulse ECM range
    } else if (input.tolerance_mm < 0.05) {
      gap_mm = 0.1;
    } else if (input.tolerance_mm < 0.2) {
      gap_mm = 0.3;
    } else {
      gap_mm = 0.5;
    }

    // Feed rate: typically 0.1 - 5 mm/min
    // Higher for larger gaps (less risk of short circuit)
    // MRR limited by current capacity and gap maintenance
    const feed_rate = 0.2 + gap_mm * 3;

    // Shape notes
    const notes: string[] = [];
    notes.push(
      `Electrode shape: negative of target with ${gap_mm} mm oversize on all surfaces`
    );
    notes.push(
      `Insulate non-cutting surfaces to prevent stray machining`
    );

    if (input.depth_mm > 10) {
      notes.push(
        `Deep cavity (${input.depth_mm} mm): add internal electrolyte channels ` +
        `for flushing, consider segmented electrode`
      );
    }
    if (input.width_mm < 2) {
      notes.push(
        `Narrow feature (${input.width_mm} mm): electrode rigidity critical, ` +
        `consider guided electrode or pulse ECM`
      );
    }
    if (input.tolerance_mm < 0.02) {
      notes.push(
        'Tight tolerance: use pulse ECM (PECM) with small gap for precision control'
      );
    }

    // Complex shape detection
    const shape_lower = input.target_shape.toLowerCase();
    if (shape_lower.includes('gear') || shape_lower.includes('blade') ||
        shape_lower.includes('turbine')) {
      notes.push(
        'Complex 3D shape: consider multi-axis CNC-ECM or shaped electrode ' +
        'with simulation-based gap compensation'
      );
    }

    return {
      electrode_material,
      gap_recommendation_mm: gap_mm,
      feed_rate_mm_per_min: Math.round(feed_rate * 100) / 100,
      electrode_shape_notes: notes.join('. '),
    };
  }

  /**
   * Predict surface quality and process risks.
   * Accounts for DC vs pulse ECM, electrolyte chemistry, and gap effects.
   */
  predictSurfaceQuality(input: ECMSurfaceInput): ECMSurfaceResult {
    const elec = this.getElectrolyte(input.electrolyte_type);
    const isPulse = input.pulse_on_us !== undefined && input.pulse_off_us !== undefined;

    // Base Ra from current density and gap
    // Higher J → smoother (more uniform dissolution)
    // Smaller gap → smoother (better current distribution)
    let Ra = elec.finish_factor
      * 2.5
      * Math.pow(Math.max(input.current_density, 1), -0.3)
      * Math.pow(input.gap_mm, 0.2);

    // Pulse ECM improvement: 30-60% better finish
    if (isPulse) {
      const duty = input.pulse_on_us! / (input.pulse_on_us! + input.pulse_off_us!);
      // Lower duty cycle → better finish (more flushing time)
      const pulse_improvement = 0.4 + 0.3 * duty; // 0.4-0.7 multiplier
      Ra *= pulse_improvement;
    }

    Ra = Math.max(Ra, 0.05); // Physical minimum

    // Hydrogen evolution risk
    // H₂ evolution at cathode is inherent in ECM. Risk increases with voltage/J
    let h2_risk: string;
    if (input.current_density > 150) {
      h2_risk = 'high — significant gas bubble generation, ensure adequate ventilation';
    } else if (input.current_density > 50) {
      h2_risk = 'moderate — normal for ECM, standard extraction sufficient';
    } else {
      h2_risk = 'low';
    }

    // Passivation risk: depends on electrolyte and current density
    let passivation_risk: string;
    if (elec.depassivation < 0.5 && input.current_density < 30) {
      passivation_risk = 'high — low J with poor depassivation electrolyte, ' +
        'consider switching to NaCl or increasing current density';
    } else if (elec.depassivation < 0.5 || input.current_density < 15) {
      passivation_risk = 'moderate — monitor for uneven dissolution';
    } else {
      passivation_risk = 'low';
    }

    // Stray machining: lateral dissolution beyond intended boundary
    // Stray ≈ gap × (1 + 1/cos(θ) - 1) simplified to empirical:
    // stray ≈ 0.5 × gap for DC, 0.2 × gap for pulse ECM
    let stray_mm: number;
    if (isPulse) {
      const duty = input.pulse_on_us! / (input.pulse_on_us! + input.pulse_off_us!);
      stray_mm = input.gap_mm * (0.1 + 0.3 * duty);
    } else {
      stray_mm = input.gap_mm * 0.5;
    }

    return {
      predicted_Ra_um: Math.round(Ra * 100) / 100,
      hydrogen_evolution_risk: h2_risk,
      passivation_risk,
      stray_machining_mm: Math.round(stray_mm * 1000) / 1000,
    };
  }
}

/** Singleton instance */
export const electrochemicalMachiningEngine = new ElectrochemicalMachiningEngine();
