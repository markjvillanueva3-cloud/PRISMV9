/**
 * ThermoelectricEngine — Thermoelectric generator/cooler analysis
 *
 * Models: Seebeck/Peltier effects, figure of merit ZT,
 *         power generation, COP for cooling, cascade modules
 * References: Rowe, Goldsmid, IEC 62830
 */

export type TEMode = "generator" | "cooler";
export type TEMaterial = "BiTe" | "PbTe" | "SiGe" | "skutterudite" | "half_heusler" | "organic";

export interface ThermoelectricInput {
  mode?: TEMode;
  material?: TEMaterial;
  hot_side_C: number;
  cold_side_C: number;
  num_couples?: number;              // default 127
  element_area_mm2?: number;         // default 1
  element_length_mm?: number;        // default 1.5
  current_A?: number;                // default optimal
  num_stages?: number;               // default 1 (cascade)
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface ThermoelectricResult {
  power_output_W: AtomicValue;
  efficiency_pct: AtomicValue;
  voltage_V: AtomicValue;
  heat_absorbed_W: AtomicValue;
  heat_rejected_W: AtomicValue;
  COP: AtomicValue;
  ZT_average: AtomicValue;
  max_delta_T_C: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// Material: [Seebeck_uV/K, resistivity_uOhm_cm, thermal_cond_W/mK, max_temp_C]
const TE_MATERIAL: Record<TEMaterial, [number, number, number, number]> = {
  BiTe:          [200, 1000, 1.5, 250],
  PbTe:          [180, 2000, 2.0, 600],
  SiGe:          [150, 3000, 3.0, 1000],
  skutterudite:  [190, 1500, 2.5, 600],
  half_heusler:  [170, 2500, 4.0, 800],
  organic:       [100, 5000, 0.3, 150],
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class ThermoelectricEngine {
  calculate(input: ThermoelectricInput): ThermoelectricResult {
    const {
      mode = "generator",
      material = "BiTe",
      hot_side_C: Th_C,
      cold_side_C: Tc_C,
      num_couples: N = 127,
      element_area_mm2: Ae = 1,
      element_length_mm: Le = 1.5,
      num_stages: stages = 1,
    } = input;

    const recs: string[] = [];
    const [alpha_uV, rho_uOhm, kappa, maxTemp] = TE_MATERIAL[material];
    const Th = Th_C + 273.15;
    const Tc = Tc_C + 273.15;
    const deltaT = Th - Tc;
    const Tavg = (Th + Tc) / 2;

    // Material properties
    const alpha = alpha_uV * 1e-6 * 2; // V/K per couple (n+p)
    const rho = rho_uOhm * 1e-8; // Ohm·m
    const k = kappa; // W/mK

    // Module geometry
    const AeM2 = Ae / 1e6; // m²
    const LeM = Le / 1000; // m

    // Figure of merit
    const ZT = alpha * alpha * Tavg / (4 * rho * k); // per couple ZT

    // Electrical resistance per couple
    const Rcouple = 2 * rho * LeM / AeM2; // ohm
    const Rtotal = N * Rcouple;

    // Thermal conductance per couple
    const Kcouple = 2 * k * AeM2 / LeM; // W/K
    const Ktotal = N * Kcouple;

    // Open circuit voltage
    const Voc = N * alpha * deltaT;

    if (mode === "generator") {
      // Optimal current for max power: I = Voc / (2R)
      const Iopt = input.current_A ?? Voc / (2 * Rtotal);
      const I = Iopt;

      // Power output: P = I²R_load = (Voc - IR)×I
      const Pout = I * (Voc - I * Rtotal);
      const Vload = Voc - I * Rtotal;

      // Heat absorbed at hot side: Qh = alpha×Th×I - 0.5×I²R + K×ΔT
      const Qh = N * alpha * Th * I - 0.5 * I * I * Rtotal + Ktotal * deltaT;
      const Qc = Qh - Pout;

      // Efficiency
      const eff = Pout / (Qh + 0.001) * 100;

      // Max ΔT (for cooler mode reference)
      const maxDT = 0.5 * ZT * Tc * Tc / Tavg;

      const isSafe = Th_C < maxTemp && eff > 0 && Pout > 0;

      if (Th_C > maxTemp * 0.9) recs.push(`Hot side ${Th_C}°C near material limit ${maxTemp}°C`);
      if (eff < 3) recs.push(`Low efficiency ${eff.toFixed(1)}% — increase ΔT or use higher ZT material`);
      if (deltaT < 50) recs.push(`Small ΔT ${deltaT.toFixed(0)}K — limited power output`);
      if (stages > 1) recs.push(`${stages}-stage cascade — segmented elements for wide ΔT`);
      if (recs.length === 0) recs.push(`TEG nominal — ${Pout.toFixed(2)}W, η=${eff.toFixed(1)}%, ZT=${ZT.toFixed(2)}`);

      return {
        power_output_W: mkAv(Math.round(Pout * 1000) / 1000, "W", Pout * 0.10, "seebeck"),
        efficiency_pct: mkAv(Math.round(eff * 100) / 100, "%", eff * 0.10, "Pout_Qh"),
        voltage_V: mkAv(Math.round(Vload * 1000) / 1000, "V", Vload * 0.05, "Voc_IR"),
        heat_absorbed_W: mkAv(Math.round(Qh * 100) / 100, "W", Qh * 0.10, "seebeck_joule_fourier"),
        heat_rejected_W: mkAv(Math.round(Qc * 100) / 100, "W", Qc * 0.10, "Qh_P"),
        COP: mkAv(0, "ratio", 0, "generator_mode"),
        ZT_average: mkAv(Math.round(ZT * 1000) / 1000, "dimensionless", ZT * 0.15, "alpha2T_rho_k"),
        max_delta_T_C: mkAv(Math.round(maxDT), "°C", maxDT * 0.15, "0.5ZTc2_Tavg"),
        is_safe: isSafe,
        recommendations: recs,
      };
    } else {
      // Cooler mode (Peltier) — optimal current for max COP
      const Iopt = input.current_A ?? N * alpha * Tc / Rtotal * (Math.sqrt(1 + ZT) - 1) / (Math.sqrt(1 + ZT) + Tc / (Th + 0.001));
      const I = Iopt;

      // Cooling power: Qc = alpha×Tc×I - 0.5×I²R - K×ΔT
      const Qc = N * alpha * Tc * I - 0.5 * I * I * Rtotal - Ktotal * deltaT;
      const Pin = I * I * Rtotal + N * alpha * deltaT * I;
      const Qh = Qc + Pin;
      const COP = Math.max(Qc / (Pin + 0.001), 0);
      const maxDT = 0.5 * ZT * Tc * Tc / Tavg;
      const V = I * Rtotal + N * alpha * deltaT;

      const isSafe = Qc > 0 && deltaT < maxDT && Th_C < maxTemp;

      if (Qc <= 0) recs.push(`No net cooling — ΔT too large or current too high`);
      if (COP < 0.5) recs.push(`Low COP ${COP.toFixed(2)} — reduce ΔT or use cascade`);
      if (deltaT > maxDT * 0.8) recs.push(`Near max ΔT — cascade modules for larger temperature difference`);
      if (recs.length === 0) recs.push(`TEC nominal — Qc=${Qc.toFixed(1)}W, COP=${COP.toFixed(2)}, ZT=${ZT.toFixed(2)}`);

      return {
        power_output_W: mkAv(0, "W", 0, "cooler_mode"),
        efficiency_pct: mkAv(0, "%", 0, "cooler_mode"),
        voltage_V: mkAv(Math.round(V * 1000) / 1000, "V", V * 0.05, "IR_alpha_DT"),
        heat_absorbed_W: mkAv(Math.round(Math.max(Qc, 0) * 100) / 100, "W", Math.abs(Qc) * 0.10, "peltier"),
        heat_rejected_W: mkAv(Math.round(Qh * 100) / 100, "W", Qh * 0.10, "Qc_Pin"),
        COP: mkAv(Math.round(COP * 1000) / 1000, "ratio", COP * 0.10, "Qc_Pin"),
        ZT_average: mkAv(Math.round(ZT * 1000) / 1000, "dimensionless", ZT * 0.15, "alpha2T_rho_k"),
        max_delta_T_C: mkAv(Math.round(maxDT), "°C", maxDT * 0.15, "0.5ZTc2_Tavg"),
        is_safe: isSafe,
        recommendations: recs,
      };
    }
  }
}

export const thermoelectricEngine = new ThermoelectricEngine();
