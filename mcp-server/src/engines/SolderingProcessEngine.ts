/**
 * SolderingProcessEngine — Soldering process analysis
 *
 * Models: Wetting kinetics (Young-Dupré), thermal profile,
 *         intermetallic growth, joint reliability, voiding
 * References: IPC-A-610, J-STD-001, Vianco "Soldering Handbook"
 */

export type SolderAlloy = "Sn63Pb37" | "SAC305" | "SAC405" | "SnBi58" | "SnCu07" | "SnAgBi";
export type SolderMethod = "reflow" | "wave" | "selective" | "hand" | "vapor_phase" | "laser";

export interface SolderingProcessInput {
  alloy?: SolderAlloy;
  method?: SolderMethod;
  board_thickness_mm?: number;       // default 1.6
  component_pitch_mm?: number;       // default 0.5
  peak_temp_C?: number;              // default auto from alloy
  preheat_rate_C_s?: number;         // default 2
  time_above_liquidus_s?: number;    // default auto
  flux_type?: "no_clean" | "water_soluble" | "rosin";
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface SolderingProcessResult {
  peak_temperature_C: AtomicValue;
  time_above_liquidus_s: AtomicValue;
  wetting_angle_deg: AtomicValue;
  intermetallic_thickness_um: AtomicValue;
  joint_strength_MPa: AtomicValue;
  voiding_pct: AtomicValue;
  thermal_fatigue_cycles: AtomicValue;
  process_window_C: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Alloy: [liquidus_C, solidus_C, wetting_angle_Cu_deg, UTS_MPa, CTE_ppm, density_g/cm3]
const SOLDER_DATA: Record<SolderAlloy, [number, number, number, number, number, number]> = {
  Sn63Pb37: [183, 183, 15, 40, 25,  8.4],
  SAC305:   [217, 217, 25, 50, 22,  7.4],
  SAC405:   [217, 217, 22, 55, 22,  7.4],
  SnBi58:   [138, 138, 30, 45, 15,  8.6],
  SnCu07:   [227, 227, 35, 35, 23,  7.3],
  SnAgBi:   [210, 200, 20, 48, 20,  7.5],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class SolderingProcessEngine {
  calculate(input: SolderingProcessInput): SolderingProcessResult {
    const {
      alloy = "SAC305",
      method = "reflow",
      board_thickness_mm: boardT = 1.6,
      component_pitch_mm: pitch = 0.5,
      preheat_rate_C_s: preheatRate = 2,
      flux_type = "no_clean",
    } = input;

    const recs: string[] = [];
    const [liquidus, solidus, wettingBase, UTS, CTE, rhoSolder] = SOLDER_DATA[alloy];

    // Peak temperature (auto: liquidus + 20-40°C)
    const peakTemp = input.peak_temp_C ?? liquidus + 25;

    // Time above liquidus
    const TAL = input.time_above_liquidus_s ?? (method === "reflow" ? 60 :
      method === "wave" ? 3 : method === "hand" ? 5 : method === "vapor_phase" ? 45 : 30);

    // Wetting angle (improves with flux activity and temperature)
    const fluxMod = flux_type === "water_soluble" ? 0.7 : flux_type === "rosin" ? 0.85 : 1.0;
    const tempMod = Math.max(0.5, 1 - (peakTemp - liquidus) / 100);
    const wettingAngle = wettingBase * fluxMod * tempMod;

    // Intermetallic layer thickness (Arrhenius growth during TAL)
    const IMC = 0.5 + 0.01 * TAL * Math.exp((peakTemp - liquidus) / 50);

    // Joint strength
    const strengthMod = IMC > 3 ? 0.7 : IMC > 2 ? 0.85 : 1.0; // thick IMC weakens joint
    const jointStrength = UTS * strengthMod;

    // Voiding (BGA-relevant)
    const voidBase = method === "reflow" ? 15 : method === "vapor_phase" ? 5 :
      method === "wave" ? 3 : method === "hand" ? 20 : 10;
    const voiding = voidBase * (1 + (peakTemp - liquidus - 25) / 100);

    // Thermal fatigue (Coffin-Manson simplified)
    const deltaT = 100; // typical thermal cycling range °C
    const strain = CTE * 1e-6 * deltaT * 10 / (pitch + 0.001); // normalized
    const fatigueCycles = Math.round(1000 / Math.pow(strain + 0.001, 2));

    // Process window (between minimum wetting and component damage)
    const processWindow = Math.min(peakTemp - liquidus, 260 - peakTemp);

    const isSafe = peakTemp > liquidus && peakTemp < 270 && wettingAngle < 45 && processWindow > 10;

    if (peakTemp > 260) recs.push(`Peak ${peakTemp}°C — component damage risk, max 260°C for most parts`);
    if (peakTemp < liquidus + 10) recs.push(`Peak ${peakTemp}°C only ${peakTemp - liquidus}°C above liquidus — marginal wetting`);
    if (alloy === "Sn63Pb37") recs.push(`SnPb solder — RoHS restricted, verify exemption`);
    if (IMC > 3) recs.push(`Thick IMC layer ${IMC.toFixed(1)}μm — brittle interface, reduce TAL`);
    if (pitch < 0.3 && method !== "reflow") recs.push(`Fine pitch ${pitch}mm — reflow or selective only`);
    if (recs.length === 0) recs.push(`Solder nominal — peak ${peakTemp}°C, TAL ${TAL}s, wet ${wettingAngle.toFixed(0)}°, IMC ${IMC.toFixed(1)}μm`);

    return {
      peak_temperature_C: mkAv(peakTemp, "°C", peakTemp * 0.02, "liquidus_offset"),
      time_above_liquidus_s: mkAv(TAL, "s", TAL * 0.15, "method"),
      wetting_angle_deg: mkAv(Math.round(wettingAngle * 10) / 10, "°", wettingAngle * 0.15, "Young_Dupre"),
      intermetallic_thickness_um: mkAv(Math.round(IMC * 100) / 100, "μm", IMC * 0.20, "Arrhenius"),
      joint_strength_MPa: mkAv(Math.round(jointStrength * 10) / 10, "MPa", jointStrength * 0.10, "UTS_IMC"),
      voiding_pct: mkAv(Math.round(voiding * 10) / 10, "%", voiding * 0.25, "method_temp"),
      thermal_fatigue_cycles: mkAv(fatigueCycles, "cycles", fatigueCycles * 0.30, "Coffin_Manson"),
      process_window_C: mkAv(Math.round(processWindow * 10) / 10, "°C", processWindow * 0.10, "Tpeak_limits"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const solderingProcessEngine = new SolderingProcessEngine();
