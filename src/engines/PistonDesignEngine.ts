/**
 * PistonDesignEngine — IC engine piston stress, thermal, and mass analysis
 *
 * Models: Crown thickness (Grashof), skirt pressure, ring groove stress,
 *         thermal expansion, piston-to-bore clearance
 * References: Heywood "Internal Combustion Engine Fundamentals"
 * Safety: Crown stress, thermal limits, seizure prevention
 */

// ─── Types ─────────────────────────────────────────────────────────

export type PistonMaterial = "al_eutectic" | "al_hypereutectic"
  | "forged_al_2618" | "forged_al_4032" | "cast_iron" | "steel";

export interface PistonDesignInput {
  bore_mm: number;
  stroke_mm: number;
  max_pressure_MPa?: number;             // default 8
  max_rpm: number;
  piston_material?: PistonMaterial;      // default al_eutectic
  compression_ratio?: number;            // default 10
  num_compression_rings?: number;        // default 2
  oil_ring?: boolean;                    // default true
  crown_temp_C?: number;                 // default 300
  skirt_temp_C?: number;                 // default 150
}

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

export interface PistonDesignResult {
  crown_thickness_mm: AtomicValue;
  crown_stress_MPa: AtomicValue;
  piston_mass_g: AtomicValue;
  inertia_force_kN: AtomicValue;
  skirt_pressure_MPa: AtomicValue;
  thermal_expansion_mm: AtomicValue;
  cold_clearance_mm: AtomicValue;
  mean_piston_speed_m_s: AtomicValue;
  pin_diameter_mm: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// ─── Reference Data ────────────────────────────────────────────────

const PISTON_MAT: Record<PistonMaterial, {
  uts_MPa: number; ys_MPa: number; density: number;
  CTE: number; max_temp_C: number; E_GPa: number
}> = {
  al_eutectic:       { uts_MPa: 200, ys_MPa: 160, density: 2700, CTE: 21e-6, max_temp_C: 350, E_GPa: 73 },
  al_hypereutectic:  { uts_MPa: 230, ys_MPa: 190, density: 2650, CTE: 18e-6, max_temp_C: 370, E_GPa: 82 },
  forged_al_2618:    { uts_MPa: 380, ys_MPa: 280, density: 2760, CTE: 22e-6, max_temp_C: 320, E_GPa: 73 },
  forged_al_4032:    { uts_MPa: 350, ys_MPa: 310, density: 2680, CTE: 19e-6, max_temp_C: 350, E_GPa: 79 },
  cast_iron:         { uts_MPa: 300, ys_MPa: 200, density: 7200, CTE: 11e-6, max_temp_C: 500, E_GPa: 170 },
  steel:             { uts_MPa: 800, ys_MPa: 600, density: 7850, CTE: 12e-6, max_temp_C: 550, E_GPa: 207 },
};

// ─── Engine ────────────────────────────────────────────────────────

function mkAv(
  value: number, unit: string, unc: number,
  source: string, warning?: string
): AtomicValue {
  return { value, unit, uncertainty: unc, source, warning };
}

export class PistonDesignEngine {
  calculate(input: PistonDesignInput): PistonDesignResult {
    const {
      bore_mm: bore,
      stroke_mm: stroke,
      max_pressure_MPa: pMax = 8,
      max_rpm: rpm,
      piston_material = "al_eutectic",
      compression_ratio: CR = 10,
      num_compression_rings: nRings = 2,
      crown_temp_C: Tcrown = 300,
      skirt_temp_C: Tskirt = 150,
    } = input;

    const recs: string[] = [];
    const mp = PISTON_MAT[piston_material];

    // Crown thickness (Grashof flat plate):
    // t = D/2 × √(3p/(σ_allow))
    const sigmaAllow = mp.ys_MPa * 0.6; // with safety factor
    const crownThick = (bore / 2)
      * Math.sqrt(3 * pMax / sigmaAllow);

    // Crown bending stress (flat plate)
    const crownStress = 3 * pMax * bore * bore
      / (16 * crownThick * crownThick);

    // Piston mass estimation
    // Approx: cylinder volume × fill factor × density
    const pistonHeight = bore * 0.8; // typical H/D ≈ 0.8
    const volume = Math.PI * bore * bore / 4
      * pistonHeight / 1e3; // cm³
    const fillFactor = 0.35; // hollow piston
    const mass = volume * fillFactor * mp.density / 1000; // grams

    // Inertia force at TDC
    const omega = 2 * Math.PI * rpm / 60;
    const R = stroke / 2;
    const lambda = R / (stroke * 2); // R/L, L≈2×stroke default
    const Finertia = (mass / 1000) * omega * omega
      * (R / 1000) * (1 + lambda); // kN

    // Skirt bearing pressure
    const skirtArea = bore * bore * 0.5; // projected area mm²
    const sideForce = (mass / 1000) * omega * omega
      * (R / 1000) * Math.sin(Math.PI / 4) * lambda;
    const skirtPressure = Math.max(
      sideForce * 1000 / skirtArea, 0.1
    );

    // Thermal expansion
    const deltaT = Tcrown - 20; // from ambient
    const expansion = mp.CTE * bore * deltaT;

    // Cold clearance (to prevent seizure)
    const coldClearance = expansion + bore * 0.001; // +0.1% extra

    // Mean piston speed
    const mps = 2 * stroke * rpm / (60 * 1000); // m/s

    // Pin diameter (rule of thumb: 0.3 × bore)
    const pinDia = Math.round(bore * 0.3);

    const isSafe = crownStress < sigmaAllow
      && Tcrown < mp.max_temp_C
      && mps < 25;

    if (mps > 20) {
      recs.push(
        `High mean piston speed ${mps.toFixed(1)}m/s — `
        + `limit is ~25m/s for reliability`
      );
    }
    if (Tcrown > mp.max_temp_C * 0.85) {
      recs.push(
        `Crown temp ${Tcrown}°C near ${piston_material} limit `
        + `${mp.max_temp_C}°C — add oil cooling gallery`
      );
    }
    if (crownStress > sigmaAllow * 0.8) {
      recs.push(
        `Crown stress ${crownStress.toFixed(0)}MPa marginal `
        + `— increase thickness or upgrade material`
      );
    }
    if (CR > 12 && piston_material === "al_eutectic") {
      recs.push(
        `CR=${CR} high for eutectic Al — use hypereutectic `
        + `or forged piston`
      );
    }
    if (recs.length === 0) {
      recs.push(
        `Piston design nominal — ${mass.toFixed(0)}g, `
        + `crown ${crownThick.toFixed(1)}mm, `
        + `MPS=${mps.toFixed(1)}m/s`
      );
    }

    return {
      crown_thickness_mm: mkAv(
        Math.round(crownThick * 10) / 10, "mm",
        crownThick * 0.10, "grashof_plate"
      ),
      crown_stress_MPa: mkAv(
        Math.round(crownStress * 10) / 10, "MPa",
        crownStress * 0.12, "flat_plate_bending"
      ),
      piston_mass_g: mkAv(
        Math.round(mass), "g",
        mass * 0.15, "volume_estimate"
      ),
      inertia_force_kN: mkAv(
        Math.round(Finertia * 100) / 100, "kN",
        Finertia * 0.08, "kinematic_model"
      ),
      skirt_pressure_MPa: mkAv(
        Math.round(skirtPressure * 100) / 100, "MPa",
        skirtPressure * 0.20, "side_force_model"
      ),
      thermal_expansion_mm: mkAv(
        Math.round(expansion * 1000) / 1000, "mm",
        expansion * 0.10, "linear_CTE"
      ),
      cold_clearance_mm: mkAv(
        Math.round(coldClearance * 1000) / 1000, "mm",
        coldClearance * 0.10, "expansion_clearance"
      ),
      mean_piston_speed_m_s: mkAv(
        Math.round(mps * 10) / 10, "m/s",
        mps * 0.02, "kinematics"
      ),
      pin_diameter_mm: mkAv(pinDia, "mm", 0, "sizing_rule"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const pistonDesignEngine = new PistonDesignEngine();
