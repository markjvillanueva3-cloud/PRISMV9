/**
 * EBWeldingEngine — Electron beam welding process analysis
 *
 * Models: Beam power, keyhole penetration, vacuum requirements,
 *         aspect ratio, thermal distortion, joint efficiency
 * References: Schultz 1993, AWS C7.1, ISO 15609-3
 */

export type EBEnvironment = "high_vacuum" | "partial_vacuum" | "non_vacuum";
export type EBJointType = "butt" | "lap" | "fillet" | "T_joint" | "edge";

export interface EBWeldingInput {
  environment?: EBEnvironment;
  joint?: EBJointType;
  accelerating_voltage_kV?: number;   // default 60
  beam_current_mA: number;
  material_thickness_mm: number;
  material?: "steel" | "stainless" | "aluminum" | "titanium" | "nickel_alloy" | "copper";
  focal_spot_mm?: number;             // default 0.5
  welding_speed_mm_s?: number;        // default auto
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface EBWeldingResult {
  beam_power_kW: AtomicValue;
  penetration_depth_mm: AtomicValue;
  weld_width_mm: AtomicValue;
  aspect_ratio: AtomicValue;
  welding_speed_mm_s: AtomicValue;
  heat_input_J_mm: AtomicValue;
  vacuum_level_mbar: AtomicValue;
  distortion_index: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Material: [absorptivity, thermal_cond_W/mK, melt_temp_C, density_g/cm3]
const EB_MAT: Record<string, [number, number, number, number]> = {
  steel:        [0.85, 50,  1500, 7.85],
  stainless:    [0.80, 15,  1450, 8.00],
  aluminum:     [0.75, 200, 660,  2.70],
  titanium:     [0.90, 20,  1670, 4.50],
  nickel_alloy: [0.85, 11,  1350, 8.44],
  copper:       [0.70, 390, 1085, 8.96],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class EBWeldingEngine {
  calculate(input: EBWeldingInput): EBWeldingResult {
    const {
      environment = "high_vacuum",
      joint = "butt",
      accelerating_voltage_kV: V = 60,
      beam_current_mA: I,
      material_thickness_mm: t,
      material = "steel",
      focal_spot_mm: d0 = 0.5,
    } = input;

    const recs: string[] = [];
    const [absorp, kMat, Tmelt, rho] = EB_MAT[material];

    // Beam power
    const power = V * I / 1000; // kW

    // Power density
    const spotArea = Math.PI * Math.pow(d0 / 20, 2); // cm²
    const powerDensity = power * 1000 / spotArea; // W/cm²

    // Vacuum level
    const vacuumLevel = environment === "high_vacuum" ? 1e-4 :
      environment === "partial_vacuum" ? 1e-1 : 1013;

    // Environment efficiency
    const envEff = environment === "high_vacuum" ? 1.0 :
      environment === "partial_vacuum" ? 0.8 : 0.5;

    // Penetration (EB has very deep penetration in vacuum)
    const penetration = Math.pow(power * absorp * envEff, 0.8) /
      (kMat * Tmelt / 1e5 + 0.001) * 15;

    // Weld width (very narrow for EB)
    const weldWidth = d0 * (1 + penetration * 0.02);

    // Aspect ratio
    const aspectRatio = penetration / (weldWidth + 0.001);

    // Welding speed
    const speed = input.welding_speed_mm_s ??
      power * absorp * envEff * 1000 / (rho * 500 * Tmelt / 1500 * t * weldWidth / 1000 + 0.001) * 0.5;

    // Heat input
    const heatInput = power * 1000 * absorp * envEff / (speed + 0.001);

    // Distortion index (very low for EB due to narrow weld)
    const distortion = heatInput / 1000 * t / (kMat + 0.001);

    const isSafe = penetration >= t * 0.8 && power < 100 && distortion < 5;

    if (penetration < t) recs.push(`Partial penetration ${penetration.toFixed(1)}mm < ${t}mm — increase power or reduce speed`);
    if (environment === "non_vacuum" && t > 10) recs.push(`Non-vacuum EB limited to ~10mm — use vacuum for thick sections`);
    if (material === "aluminum" && V > 100) recs.push(`High voltage ${V}kV on aluminum — X-ray shielding critical`);
    if (aspectRatio > 30) recs.push(`Very high aspect ratio ${aspectRatio.toFixed(0)} — centerline cracking risk`);
    if (V > 150) recs.push(`${V}kV — enhanced X-ray shielding required`);
    if (recs.length === 0) recs.push(`EBW nominal — ${penetration.toFixed(1)}mm pen, AR=${aspectRatio.toFixed(0)}:1, ${speed.toFixed(0)}mm/s`);

    return {
      beam_power_kW: mkAv(Math.round(power * 100) / 100, "kW", power * 0.02, "VI"),
      penetration_depth_mm: mkAv(Math.round(penetration * 10) / 10, "mm", penetration * 0.10, "power_model"),
      weld_width_mm: mkAv(Math.round(weldWidth * 100) / 100, "mm", weldWidth * 0.15, "spot_model"),
      aspect_ratio: mkAv(Math.round(aspectRatio * 10) / 10, "ratio", aspectRatio * 0.10, "d_w"),
      welding_speed_mm_s: mkAv(Math.round(speed * 10) / 10, "mm/s", speed * 0.15, "energy_balance"),
      heat_input_J_mm: mkAv(Math.round(heatInput * 10) / 10, "J/mm", heatInput * 0.10, "P_v"),
      vacuum_level_mbar: mkAv(vacuumLevel, "mbar", vacuumLevel * 0.20, "environment"),
      distortion_index: mkAv(Math.round(distortion * 100) / 100, "index", distortion * 0.25, "HI_t_k"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const ebWeldingEngine = new EBWeldingEngine();
