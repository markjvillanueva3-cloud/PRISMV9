/**
 * CentrifugalCastingEngine — Centrifugal (spin) casting process analysis
 *
 * Models: G-force, rotational speed, solidification front,
 *         wall thickness uniformity, segregation, de Laval criterion
 * References: Beeley "Foundry Technology", ASTM A660, BS 3100
 */

export type CentrifugalAxis = "horizontal" | "vertical" | "inclined";
export type CentCastAlloy = "cast_iron" | "steel" | "bronze" | "aluminum" | "nickel" | "titanium";

export interface CentrifugalCastingInput {
  axis?: CentrifugalAxis;
  alloy?: CentCastAlloy;
  outer_diameter_mm: number;
  wall_thickness_mm?: number;       // default 15
  length_mm?: number;               // default 500
  rotation_speed_rpm?: number;      // default auto (from G-force target)
  target_G_force?: number;          // default 75
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface CentrifugalCastingResult {
  rotation_speed_rpm: AtomicValue;
  G_force: AtomicValue;
  pour_rate_kg_s: AtomicValue;
  solidification_time_s: AtomicValue;
  wall_uniformity_pct: AtomicValue;
  segregation_index: AtomicValue;
  hoop_stress_MPa: AtomicValue;
  yield_pct: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Alloy: [Tmelt_C, density_kg/m3, thermal_cond_W/mK, viscosity_mPa_s, shrinkage_pct]
const CC_ALLOY: Record<CentCastAlloy, [number, number, number, number, number]> = {
  cast_iron: [1200, 7200, 45,  6.0, 1.5],
  steel:     [1500, 7800, 50,  6.5, 3.0],
  bronze:    [1000, 8800, 60,  4.0, 1.8],
  aluminum:  [660,  2700, 200, 1.3, 6.5],
  nickel:    [1450, 8900, 90,  5.0, 2.0],
  titanium:  [1670, 4500, 20,  4.5, 3.5],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class CentrifugalCastingEngine {
  calculate(input: CentrifugalCastingInput): CentrifugalCastingResult {
    const {
      axis = "horizontal",
      alloy = "cast_iron",
      outer_diameter_mm: OD,
      wall_thickness_mm: tw = 15,
      length_mm: L = 500,
      target_G_force: Gtarget = 75,
    } = input;

    const recs: string[] = [];
    const [Tmelt, rho, kMat, mu, shrink] = CC_ALLOY[alloy];
    const R = OD / 2000; // outer radius in m

    // Rotation speed from G-force: G = ω²R/g → N = 30/π × √(G×g/R)
    const rpm = input.rotation_speed_rpm ??
      Math.round(30 / Math.PI * Math.sqrt(Gtarget * 9.81 / R));

    // Actual G-force
    const omega = 2 * Math.PI * rpm / 60;
    const Gforce = omega * omega * R / 9.81;

    // Pour rate (empirical: fill in ~10-30s depending on mass)
    const ID = OD - 2 * tw;
    const volume = Math.PI / 4 * (OD * OD - ID * ID) / 1e6 * L / 1000; // m³
    const mass = volume * rho;
    const pourTime = Math.max(5, mass * 8); // rough: 8s per kg
    const pourRate = mass / pourTime;

    // Solidification time (radial heat extraction)
    const charDim = tw / 1000; // m
    const solidTime = rho * 270000 / (kMat + 0.001) * charDim * charDim * 0.5;

    // Wall uniformity (better at higher G-force, worse for vertical axis)
    const axisMod = axis === "horizontal" ? 1.0 : axis === "vertical" ? 0.85 : 0.92;
    const uniformity = Math.min(99, 85 + Gforce / 10 * axisMod);

    // Segregation index (lighter elements pushed inward)
    const segregation = Math.log10(Gforce + 1) * 0.3;

    // Hoop stress in mold during casting
    const hoopStress = rho * omega * omega * R * tw / 1000 / 1e6; // MPa

    // Yield (centrifugal is very efficient — no risers)
    const yieldPct = (1 - shrink / 100) * 95;

    const isSafe = Gforce >= 50 && Gforce <= 200 && hoopStress < 200;

    if (Gforce < 50) recs.push(`Low G-force ${Gforce.toFixed(0)} — minimum 50G for sound castings`);
    if (Gforce > 150) recs.push(`High G-force ${Gforce.toFixed(0)} — segregation and mold stress concerns`);
    if (axis === "vertical" && L > OD) recs.push(`Vertical axis with L/D > 1 — parabolic inner bore expected`);
    if (alloy === "titanium") recs.push(`Titanium — use graphite/ceramic mold, inert atmosphere required`);
    if (tw / OD * 1000 > 0.25) recs.push(`Thick wall ratio ${(tw / OD * 1000).toFixed(2)} — slow solidification, coarse grain risk`);
    if (recs.length === 0) recs.push(`Centrifugal cast nominal — ${rpm}rpm, ${Gforce.toFixed(0)}G, uniformity ${uniformity.toFixed(0)}%`);

    return {
      rotation_speed_rpm: mkAv(rpm, "rpm", rpm * 0.05, "G_force_eq"),
      G_force: mkAv(Math.round(Gforce * 10) / 10, "G", Gforce * 0.05, "omega_R_g"),
      pour_rate_kg_s: mkAv(Math.round(pourRate * 100) / 100, "kg/s", pourRate * 0.15, "mass_time"),
      solidification_time_s: mkAv(Math.round(solidTime * 10) / 10, "s", solidTime * 0.20, "radial_heat"),
      wall_uniformity_pct: mkAv(Math.round(uniformity * 10) / 10, "%", uniformity * 0.05, "G_axis"),
      segregation_index: mkAv(Math.round(segregation * 100) / 100, "index", segregation * 0.20, "G_density"),
      hoop_stress_MPa: mkAv(Math.round(hoopStress * 10) / 10, "MPa", hoopStress * 0.15, "rho_omega_R"),
      yield_pct: mkAv(Math.round(yieldPct * 10) / 10, "%", yieldPct * 0.05, "no_riser"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const centrifugalCastingEngine = new CentrifugalCastingEngine();
