/**
 * ThinFloorVibrationEngine — L2-P4-MS1 PASS2 Specialty
 *
 * Predicts vibration and deflection of thin floor/wall features during
 * machining. Critical for aerospace structural components where floor
 * thickness < 2mm and wall thickness < 1.5mm.
 *
 * Models: plate/beam natural frequency, forced response, deflection
 * under cutting force, and minimum safe thickness for given parameters.
 *
 * Actions: thin_floor_analyze, thin_floor_min_thickness, thin_floor_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type FeatureGeometry = "floor" | "wall" | "web" | "rib";

export interface ThinFeatureInput {
  geometry: FeatureGeometry;
  thickness_mm: number;
  unsupported_length_mm: number;     // span between supports
  unsupported_width_mm?: number;     // for floors (2D span)
  material_E_GPa: number;            // Young's modulus
  material_density_kgm3: number;
  material_poisson: number;
  cutting_force_N: number;           // tangential cutting force
  spindle_rpm: number;
  num_flutes: number;
  tool_diameter_mm: number;
}

export interface ThinFeatureResult {
  natural_freq_Hz: number;            // 1st mode
  tooth_passing_freq_Hz: number;
  frequency_ratio: number;            // TPF / natural freq
  resonance_risk: boolean;
  max_deflection_um: number;
  deflection_limit_um: number;        // typically thickness * 0.01
  deflection_acceptable: boolean;
  static_stiffness_N_per_mm: number;
  min_safe_thickness_mm: number;
  recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Boundary condition factors for natural frequency (clamped edges)
const BC_FACTOR: Record<FeatureGeometry, number> = {
  floor: 1.0,   // plate model (clamped edges)
  wall: 0.56,   // cantilever beam
  web: 0.8,     // semi-supported plate
  rib: 0.56,    // cantilever
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class ThinFloorVibrationEngine {
  analyze(input: ThinFeatureInput): ThinFeatureResult {
    const t = input.thickness_mm / 1000;  // to meters
    const L = input.unsupported_length_mm / 1000;
    const E = input.material_E_GPa * 1e9; // to Pa
    const rho = input.material_density_kgm3;
    const nu = input.material_poisson;

    // Flexural rigidity
    const D = (E * t ** 3) / (12 * (1 - nu ** 2));

    // Natural frequency calculation
    let fn: number;
    const bc = BC_FACTOR[input.geometry];

    if (input.geometry === "floor" && input.unsupported_width_mm) {
      // Plate model: fn = (lambda^2 / (2*pi*a^2)) * sqrt(D / (rho*t))
      // lambda for clamped plate ≈ 35.99 (first mode)
      const a = L;
      const lambda2 = 35.99 * bc;
      fn = (lambda2 / (2 * Math.PI * a ** 2)) * Math.sqrt(D / (rho * t));
    } else {
      // Beam model: fn = (lambda^2 / (2*pi*L^2)) * sqrt(EI / (rho*A))
      // Cantilever lambda1 = 3.516, clamped-clamped = 22.37
      const lambda2 = input.geometry === "wall" || input.geometry === "rib" ? 3.516 : 22.37;
      const width = (input.unsupported_width_mm || input.thickness_mm * 10) / 1000;
      const I = (width * t ** 3) / 12;
      const A = width * t;
      fn = (lambda2 / (2 * Math.PI * L ** 2)) * Math.sqrt((E * I) / (rho * A));
    }

    fn = Math.max(1, fn); // prevent degenerate

    // Tooth passing frequency
    const tpf = (input.spindle_rpm / 60) * input.num_flutes;

    // Frequency ratio
    const freqRatio = tpf / fn;
    const resonanceRisk = Math.abs(freqRatio - 1.0) < 0.15 ||
      Math.abs(freqRatio - 2.0) < 0.15 ||
      Math.abs(freqRatio - 3.0) < 0.15;

    // Static deflection under cutting force
    // For clamped beam: delta = F*L^3 / (192*E*I)
    // For cantilever: delta = F*L^3 / (3*E*I)
    const width_m = (input.unsupported_width_mm || input.thickness_mm * 10) / 1000;
    const I = (width_m * t ** 3) / 12;
    const coeff = (input.geometry === "wall" || input.geometry === "rib") ? 3 : 192;
    const staticDeflection_m = (input.cutting_force_N * L ** 3) / (coeff * E * I);
    const deflection_um = staticDeflection_m * 1e6;

    // Dynamic amplification near resonance
    const dampingRatio = 0.02; // typical for thin features
    let dynamicAmplification = 1.0;
    if (freqRatio > 0.01) {
      dynamicAmplification = 1 / Math.sqrt((1 - freqRatio ** 2) ** 2 + (2 * dampingRatio * freqRatio) ** 2);
      dynamicAmplification = Math.min(25, dynamicAmplification); // cap at Q=25
    }
    const totalDeflection_um = deflection_um * dynamicAmplification;

    // Deflection limit: 1% of thickness
    const deflLimit = input.thickness_mm * 10; // um (1% of mm = 10um per mm)

    // Static stiffness
    const stiffness = input.cutting_force_N / (staticDeflection_m * 1000); // N/mm

    // Minimum safe thickness (to keep deflection under limit)
    // delta ∝ 1/t^3, so t_min = t * (delta/limit)^(1/3)
    const minThickness = totalDeflection_um > deflLimit
      ? input.thickness_mm * Math.pow(totalDeflection_um / deflLimit, 1 / 3)
      : input.thickness_mm;

    // Recommendations
    const recs: string[] = [];
    if (resonanceRisk) {
      const safeRpm = Math.round(fn * 60 / input.num_flutes * 0.7);
      recs.push(`Resonance risk at ${input.spindle_rpm} RPM — reduce to ${safeRpm} RPM or increase to ${Math.round(safeRpm * 2)} RPM`);
    }
    if (totalDeflection_um > deflLimit) {
      recs.push(`Deflection ${totalDeflection_um.toFixed(0)}µm exceeds limit ${deflLimit.toFixed(0)}µm — reduce cutting force or add support`);
    }
    if (input.thickness_mm < minThickness) {
      recs.push(`Minimum safe thickness: ${minThickness.toFixed(2)}mm for current parameters`);
    }
    if (input.thickness_mm < 1.0 && input.geometry === "floor") {
      recs.push("Very thin floor (<1mm) — use vacuum fixture or wax support from below");
    }
    if (dynamicAmplification > 5) {
      recs.push("High dynamic amplification — consider damping (wax fill, constrained layer)");
    }
    if (recs.length === 0) {
      recs.push("Thin feature parameters acceptable — proceed with monitoring");
    }

    return {
      natural_freq_Hz: Math.round(fn * 10) / 10,
      tooth_passing_freq_Hz: Math.round(tpf * 10) / 10,
      frequency_ratio: Math.round(freqRatio * 1000) / 1000,
      resonance_risk: resonanceRisk,
      max_deflection_um: Math.round(totalDeflection_um * 10) / 10,
      deflection_limit_um: Math.round(deflLimit * 10) / 10,
      deflection_acceptable: totalDeflection_um <= deflLimit,
      static_stiffness_N_per_mm: Math.round(stiffness * 10) / 10,
      min_safe_thickness_mm: Math.round(minThickness * 100) / 100,
      recommendations: recs,
    };
  }

  minThickness(input: Omit<ThinFeatureInput, "thickness_mm">, target_deflection_um: number): number {
    // Binary search for minimum thickness
    let lo = 0.1, hi = 20.0;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      const result = this.analyze({ ...input, thickness_mm: mid } as ThinFeatureInput);
      if (result.max_deflection_um > target_deflection_um) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return Math.round(hi * 100) / 100;
  }
}

export const thinFloorVibrationEngine = new ThinFloorVibrationEngine();
