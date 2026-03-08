/**
 * FilamentWindingEngine — Composite filament winding analysis
 *
 * Models: Netting analysis, winding angle optimization,
 *         hoop/helical/polar patterns, mandrel stress
 * References: Peters 1998, Shen 1995, ASTM D2290
 */

export type FiberType = "carbon_T700" | "carbon_T300" | "e_glass" | "s_glass" | "aramid" | "basalt";
export type ResinType = "epoxy" | "vinyl_ester" | "polyester" | "phenolic";
export type WindingPattern = "hoop" | "helical" | "polar" | "multi_angle";

export interface FilamentWindingInput {
  fiber?: FiberType;
  resin?: ResinType;
  pattern?: WindingPattern;
  mandrel_diameter_mm: number;
  part_length_mm: number;
  internal_pressure_MPa?: number;     // default 10
  winding_angle_deg?: number;         // default 55 (optimal for pressure vessels)
  target_wall_thickness_mm?: number;  // default auto-calc
  fiber_volume_fraction?: number;     // default 0.60
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface FilamentWindingResult {
  wall_thickness_mm: AtomicValue;
  num_layers: AtomicValue;
  hoop_stress_MPa: AtomicValue;
  axial_stress_MPa: AtomicValue;
  burst_pressure_MPa: AtomicValue;
  safety_factor: AtomicValue;
  fiber_usage_kg: AtomicValue;
  winding_time_min: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Fiber data: [tensile_MPa, modulus_GPa, density_g/cm3, cost_$/kg]
const FIBER_DATA: Record<FiberType, [number, number, number, number]> = {
  carbon_T700: [4900, 230, 1.80, 25],
  carbon_T300: [3530, 230, 1.76, 20],
  e_glass:     [3450, 72,  2.54, 3],
  s_glass:     [4890, 87,  2.49, 8],
  aramid:      [3000, 60,  1.44, 15],
  basalt:      [3000, 90,  2.67, 5],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class FilamentWindingEngine {
  calculate(input: FilamentWindingInput): FilamentWindingResult {
    const {
      fiber = "carbon_T700",
      resin = "epoxy",
      pattern = "helical",
      mandrel_diameter_mm: D,
      part_length_mm: L,
      internal_pressure_MPa: P = 10,
      winding_angle_deg: alpha_deg = 55,
      fiber_volume_fraction: Vf = 0.60,
    } = input;

    const recs: string[] = [];
    const [sigmaF, Ef, rhoF, costF] = FIBER_DATA[fiber];
    const alpha = alpha_deg * Math.PI / 180;

    // Composite properties (rule of mixtures)
    const rhoR = 1.2; // resin density
    const rhoC = Vf * rhoF + (1 - Vf) * rhoR;
    const sigmaC = Vf * sigmaF * 0.85; // knock-down for composite

    // Netting analysis for optimal angle
    // Hoop stress: σ_h = P×D/(2t), Axial: σ_a = P×D/(4t)
    // Optimal angle for 2:1 biaxial: tan²(α) = 2 → α ≈ 54.74°

    // Required thickness
    const R = D / 2;
    const sigmaHoop = sigmaC * Math.pow(Math.sin(alpha), 2);
    const sigmaAxial = sigmaC * Math.pow(Math.cos(alpha), 2);
    const t_hoop = P * R / sigmaHoop;
    const t_axial = P * R / (2 * sigmaAxial + 0.001);
    const t_req = Math.max(t_hoop, t_axial);
    const t = input.target_wall_thickness_mm ?? Math.ceil(t_req * 10) / 10;

    // Number of layers (typical layer ~0.25mm)
    const layerThickness = 0.25;
    const numLayers = Math.ceil(t / layerThickness);

    // Actual stresses at designed thickness
    const hoopStress = P * R / t;
    const axialStress = P * R / (2 * t);

    // Burst pressure
    const burstP = sigmaC * t / R;
    const SF = burstP / (P + 0.001);

    // Fiber usage
    const surfaceArea = Math.PI * D / 1000 * L / 1000; // m²
    const volume = surfaceArea * t / 1000; // m³
    const fiberMass = volume * rhoC * 1000 * Vf; // kg

    // Winding time (typical speed ~30m/min of fiber)
    const fiberLength = numLayers * surfaceArea * 1e6 / (3 + 1); // mm, rough
    const windTime = fiberLength / (30 * 1000) + numLayers * 2; // min

    const isSafe = SF > 2 && t > 0.5;

    if (SF < 3) recs.push(`Safety factor ${SF.toFixed(1)} — increase thickness or use stronger fiber`);
    if (Math.abs(alpha_deg - 54.74) > 10 && P > 0) recs.push(`Winding angle ${alpha_deg}° — optimal for biaxial: 54.74°`);
    if (pattern === "hoop" && L / D > 2) recs.push(`Hoop-only on long part L/D=${(L / D).toFixed(1)} — needs helical layers for axial strength`);
    if (Vf > 0.65) recs.push(`High fiber volume ${(Vf * 100).toFixed(0)}% — resin starvation risk`);
    if (recs.length === 0) recs.push(`Winding nominal — ${t.toFixed(1)}mm (${numLayers}L), SF=${SF.toFixed(1)}, Pb=${burstP.toFixed(0)}MPa`);

    return {
      wall_thickness_mm: mkAv(t, "mm", t * 0.10, "netting"),
      num_layers: mkAv(numLayers, "count", 0, "thickness_layer"),
      hoop_stress_MPa: mkAv(Math.round(hoopStress * 10) / 10, "MPa", hoopStress * 0.05, "PD_2t"),
      axial_stress_MPa: mkAv(Math.round(axialStress * 10) / 10, "MPa", axialStress * 0.05, "PD_4t"),
      burst_pressure_MPa: mkAv(Math.round(burstP * 10) / 10, "MPa", burstP * 0.15, "sigma_t_R"),
      safety_factor: mkAv(Math.round(SF * 100) / 100, "ratio", SF * 0.15, "burst_design"),
      fiber_usage_kg: mkAv(Math.round(fiberMass * 100) / 100, "kg", fiberMass * 0.10, "volume_Vf"),
      winding_time_min: mkAv(Math.round(windTime), "min", windTime * 0.20, "length_speed"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const filamentWindingEngine = new FilamentWindingEngine();
