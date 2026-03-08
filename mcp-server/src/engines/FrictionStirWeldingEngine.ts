/**
 * FrictionStirWeldingEngine — Friction stir welding (FSW) process analysis
 *
 * Models: Heat generation (Coulomb friction), material flow,
 *         tool forces, temperature field, defect prediction
 * References: Mishra & Ma, TWI, AWS D17.3
 */

export type FSWMaterial = "AA6061" | "AA7075" | "AA2024" | "AA5083" | "steel_mild" | "titanium" | "copper";
export type ToolMaterial = "H13" | "PCBN" | "tungsten_rhenium" | "MP159";

export interface FrictionStirWeldingInput {
  material?: FSWMaterial;
  tool_material?: ToolMaterial;
  plate_thickness_mm: number;
  tool_shoulder_diameter_mm?: number; // default 3× thickness
  tool_pin_diameter_mm?: number;      // default thickness
  rotation_speed_rpm?: number;        // default 1000
  traverse_speed_mm_min?: number;     // default 100
  tilt_angle_deg?: number;            // default 2
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface FrictionStirWeldingResult {
  peak_temperature_C: AtomicValue;
  axial_force_kN: AtomicValue;
  traverse_force_kN: AtomicValue;
  torque_Nm: AtomicValue;
  heat_input_kJ_mm: AtomicValue;
  weld_nugget_width_mm: AtomicValue;
  HAZ_width_mm: AtomicValue;
  specific_energy_J_mm3: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Material: [yield_MPa_at_0.8Tm, Tm_C, density_g/cm3, thermal_cond_W/mK, friction_coeff]
const FSW_MAT: Record<FSWMaterial, [number, number, number, number, number]> = {
  AA6061:     [20,  652, 2.70, 167, 0.4],
  AA7075:     [25,  635, 2.81, 130, 0.4],
  AA2024:     [22,  638, 2.78, 121, 0.4],
  AA5083:     [18,  638, 2.66, 117, 0.4],
  steel_mild: [80,  1500, 7.85, 50, 0.3],
  titanium:   [100, 1670, 4.50, 20, 0.35],
  copper:     [15,  1085, 8.96, 390, 0.3],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class FrictionStirWeldingEngine {
  calculate(input: FrictionStirWeldingInput): FrictionStirWeldingResult {
    const {
      material = "AA6061",
      tool_material = "H13",
      plate_thickness_mm: t,
      rotation_speed_rpm: N = 1000,
      traverse_speed_mm_min: v = 100,
      tilt_angle_deg: tilt = 2,
    } = input;

    const recs: string[] = [];
    const [sigmaHot, Tm, rho, kMat, mu] = FSW_MAT[material];
    const Dshoulder = input.tool_shoulder_diameter_mm ?? t * 3;
    const Dpin = input.tool_pin_diameter_mm ?? t;

    const Rs = Dshoulder / 2000; // m
    const Rp = Dpin / 2000; // m
    const omega = 2 * Math.PI * N / 60; // rad/s

    // Heat generation (Coulomb friction model)
    // Q = 2/3 × π × μ × P × ω × (Rs³ - Rp³) + pin contribution
    const contactPressure = sigmaHot * 1e6 * 3; // Pa (forging pressure ≈ 3× hot yield)
    const Qshoulder = 2 / 3 * Math.PI * mu * contactPressure * omega * (Math.pow(Rs, 3) - Math.pow(Rp, 3));
    const Qpin = Math.PI * mu * contactPressure * omega * Rp * Rp * (t / 1000);
    const Qtotal = Qshoulder + Qpin; // W

    // Peak temperature (typically 0.6-0.9 Tm)
    const peakTemp = Tm * (0.6 + 0.3 * Math.min(N / 1500, 1)) *
      Math.pow(100 / (v + 1), 0.1);

    // Axial force
    const axialForce = contactPressure * Math.PI * Rs * Rs / 1000; // kN

    // Traverse force (typically 10-20% of axial)
    const traverseForce = axialForce * 0.15 * (v / 100);

    // Torque
    const torque = Qtotal / omega;

    // Heat input per unit length
    const vMs = v / 60000; // m/s
    const heatInput = Qtotal / (vMs + 0.001) / 1e6; // kJ/mm

    // Weld nugget width ≈ pin diameter
    const nuggetWidth = Dpin * 1.1;

    // HAZ width
    const HAZ = Math.sqrt(kMat / (rho * 1000 * 900) * heatInput * 1000 / 1) * 20;

    // Specific energy
    const specEnergy = Qtotal / (vMs * t / 1000 * nuggetWidth / 1000 * 1e9 + 0.001); // J/mm³

    // Weld pitch ratio (rev/mm advance)
    const pitchRatio = N / (v + 0.001);

    const isSafe = peakTemp < Tm * 0.95 && axialForce < 50 && peakTemp > Tm * 0.5;

    if (peakTemp > Tm * 0.9) recs.push(`Peak temp ${peakTemp.toFixed(0)}°C near melting — reduce RPM`);
    if (peakTemp < Tm * 0.5) recs.push(`Low temp ${peakTemp.toFixed(0)}°C — insufficient plasticization, increase RPM`);
    if (pitchRatio < 3) recs.push(`Low weld pitch — cold weld, tunnel defect risk`);
    if (pitchRatio > 20) recs.push(`High weld pitch — excessive heat, flash generation`);
    if (material !== "AA6061" && material !== "AA7075" && material !== "AA2024" && material !== "AA5083" && material !== "copper" && tool_material === "H13") {
      recs.push(`H13 tool not suitable for ${material} — use PCBN or W-Re`);
    }
    if (recs.length === 0) recs.push(`FSW nominal — Tpeak=${peakTemp.toFixed(0)}°C, Fz=${axialForce.toFixed(0)}kN, nugget=${nuggetWidth.toFixed(1)}mm`);

    return {
      peak_temperature_C: mkAv(Math.round(peakTemp), "°C", peakTemp * 0.10, "friction_model"),
      axial_force_kN: mkAv(Math.round(axialForce * 10) / 10, "kN", axialForce * 0.15, "pressure_area"),
      traverse_force_kN: mkAv(Math.round(traverseForce * 100) / 100, "kN", traverseForce * 0.20, "fraction_axial"),
      torque_Nm: mkAv(Math.round(torque * 10) / 10, "N·m", torque * 0.15, "Q_omega"),
      heat_input_kJ_mm: mkAv(Math.round(heatInput * 1000) / 1000, "kJ/mm", heatInput * 0.15, "Q_v"),
      weld_nugget_width_mm: mkAv(Math.round(nuggetWidth * 10) / 10, "mm", nuggetWidth * 0.10, "pin_diameter"),
      HAZ_width_mm: mkAv(Math.round(HAZ * 10) / 10, "mm", HAZ * 0.25, "thermal_diffusion"),
      specific_energy_J_mm3: mkAv(Math.round(specEnergy * 10) / 10, "J/mm³", specEnergy * 0.20, "Q_vol"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const frictionStirWeldingEngine = new FrictionStirWeldingEngine();
