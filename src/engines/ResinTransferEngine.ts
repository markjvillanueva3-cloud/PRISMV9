/**
 * ResinTransferEngine — Resin Transfer Molding (RTM) process analysis
 *
 * Models: Darcy's law flow front, fill time, cure kinetics,
 *         fiber preform compaction, void prediction
 * References: Advani & Sozer, ASTM D6518, Kamal cure model
 */

export type RTMVariant = "standard_RTM" | "VARTM" | "LRTM" | "HP_RTM";
export type PreformType = "woven" | "unidirectional" | "random_mat" | "braided" | "stitched";

export interface ResinTransferInput {
  variant?: RTMVariant;
  preform?: PreformType;
  part_length_mm: number;
  part_width_mm: number;
  part_thickness_mm: number;
  fiber_volume_fraction?: number;     // default 0.50
  resin_viscosity_Pa_s?: number;      // default 0.3
  injection_pressure_bar?: number;    // default 3
  cure_temperature_C?: number;        // default 120
  num_injection_ports?: number;       // default 1
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface ResinTransferResult {
  fill_time_min: AtomicValue;
  resin_volume_L: AtomicValue;
  max_flow_front_velocity_mm_s: AtomicValue;
  permeability_m2: AtomicValue;
  cure_time_min: AtomicValue;
  total_cycle_time_min: AtomicValue;
  void_content_pct: AtomicValue;
  clamping_force_kN: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Preform data: [permeability_base_m2, compressibility_factor]
const PREFORM_DATA: Record<PreformType, [number, number]> = {
  woven:          [1e-10, 1.0],
  unidirectional: [5e-11, 0.8],
  random_mat:     [5e-9,  1.5],
  braided:        [2e-10, 1.1],
  stitched:       [3e-10, 1.2],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class ResinTransferEngine {
  calculate(input: ResinTransferInput): ResinTransferResult {
    const {
      variant = "standard_RTM",
      preform = "woven",
      part_length_mm: L,
      part_width_mm: W,
      part_thickness_mm: t,
      fiber_volume_fraction: Vf = 0.50,
      resin_viscosity_Pa_s: eta = 0.3,
      injection_pressure_bar: Pinj = 3,
      cure_temperature_C: Tcure = 120,
      num_injection_ports: nPorts = 1,
    } = input;

    const recs: string[] = [];
    const [K_base, compFactor] = PREFORM_DATA[preform];

    // Permeability (Kozeny-Carman adjustment for Vf)
    const K = K_base * Math.pow(1 - Vf, 3) / Math.pow(Vf, 2) * compFactor;

    // VARTM uses vacuum (~1 bar), HP-RTM uses high pressure
    const pressure = variant === "VARTM" ? 1e5 :
      variant === "HP_RTM" ? Pinj * 1e5 * 3 : Pinj * 1e5;

    // Darcy's law fill time: t_fill = η × L² × ε / (2 × K × ΔP)
    const porosity = 1 - Vf;
    const flowLength = L / 1000 / nPorts; // m per port
    const fillTime = eta * flowLength * flowLength * porosity / (2 * K * pressure) / 60; // min

    // Max flow front velocity
    const maxVelocity = K * pressure / (eta * porosity) * 1000; // mm/s

    // Resin volume
    const partVol = L * W * t / 1e9; // m³
    const resinVol = partVol * porosity * 1000 * 1.05; // L (5% excess)

    // Cure time (Kamal model simplified)
    const cureRate = 0.01 * Math.exp(0.05 * (Tcure - 100));
    const cureTime = 1 / (cureRate + 0.001); // min

    // Total cycle
    const totalCycle = fillTime + cureTime + 5; // +5 min demolding

    // Void content estimate
    const capillaryNumber = eta * maxVelocity / 1000 / 0.03; // Ca = ηV/γ
    const voidContent = capillaryNumber > 1 ? 3 + capillaryNumber : 0.5 + capillaryNumber * 0.5;

    // Clamping force
    const clampForce = pressure * L / 1000 * W / 1000 / 1000; // kN

    const isSafe = fillTime < 60 && voidContent < 5 && Vf < 0.65;

    if (fillTime > 30) recs.push(`Long fill ${fillTime.toFixed(0)}min — add injection ports or increase pressure`);
    if (voidContent > 2) recs.push(`Void content ${voidContent.toFixed(1)}% — optimize fill rate/vacuum`);
    if (maxVelocity > 10) recs.push(`High flow velocity ${maxVelocity.toFixed(1)}mm/s — fiber wash risk`);
    if (Vf > 0.60) recs.push(`High Vf ${(Vf * 100).toFixed(0)}% — difficult to fill, increase pressure`);
    if (variant === "VARTM" && t > 10) recs.push(`Thick VARTM part ${t}mm — through-thickness flow needed`);
    if (recs.length === 0) recs.push(`RTM nominal — fill=${fillTime.toFixed(1)}min, cure=${cureTime.toFixed(0)}min, voids=${voidContent.toFixed(1)}%`);

    return {
      fill_time_min: mkAv(Math.round(fillTime * 10) / 10, "min", fillTime * 0.20, "darcy"),
      resin_volume_L: mkAv(Math.round(resinVol * 1000) / 1000, "L", resinVol * 0.05, "porosity_vol"),
      max_flow_front_velocity_mm_s: mkAv(Math.round(maxVelocity * 100) / 100, "mm/s", maxVelocity * 0.20, "darcy"),
      permeability_m2: mkAv(K, "m²", K * 0.30, "kozeny_carman"),
      cure_time_min: mkAv(Math.round(cureTime), "min", cureTime * 0.15, "kamal"),
      total_cycle_time_min: mkAv(Math.round(totalCycle), "min", totalCycle * 0.15, "fill_cure_demold"),
      void_content_pct: mkAv(Math.round(voidContent * 10) / 10, "%", voidContent * 0.30, "capillary"),
      clamping_force_kN: mkAv(Math.round(clampForce * 10) / 10, "kN", clampForce * 0.10, "PA"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const resinTransferEngine = new ResinTransferEngine();
