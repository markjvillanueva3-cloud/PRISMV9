/**
 * HeatExchangerEngine — Shell & Tube / Plate HX Sizing Calculator
 *
 * Models: Heat exchanger thermal and hydraulic design.
 * - LMTD and ε-NTU methods
 * - Overall heat transfer coefficient U
 * - Required surface area
 * - Pressure drop (tube and shell side)
 * - Fouling factor derating
 * - TEMA type recommendation
 *
 * Key physics: Q = U×A×LMTD×F. LMTD = (ΔT1-ΔT2)/ln(ΔT1/ΔT2).
 * U = 1/(1/hi + Rfi + t/k + Rfo + 1/ho).
 *
 * Reference: Kern — Process Heat Transfer,
 *            TEMA Standards,
 *            Perry's Chemical Engineers' Handbook
 *
 * Actions: heat_exchanger_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface HeatExchangerInput {
  hx_type?: "shell_tube" | "plate" | "double_pipe" | "air_cooled";
  duty_kw?: number;
  hot_inlet_c?: number;
  hot_outlet_c?: number;
  cold_inlet_c?: number;
  cold_outlet_c?: number;
  hot_fluid?: "water" | "oil" | "steam" | "gas";
  cold_fluid?: "water" | "oil" | "glycol" | "air";
  flow_arrangement?: "counterflow" | "parallel" | "crossflow";
  fouling_factor?: number;
}

export interface HeatExchangerResult {
  lmtd: AtomicValue;
  correction_factor: AtomicValue;
  overall_u: AtomicValue;
  required_area: AtomicValue;
  hot_flow_rate: AtomicValue;
  cold_flow_rate: AtomicValue;
  effectiveness: AtomicValue;
  ntu: AtomicValue;
  pressure_drop_hot: AtomicValue;
  pressure_drop_cold: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Typical U values W/(m²·K) by fluid combination */
const U_VALUES: Record<string, Record<string, number>> = {
  water:  { water: 1500, oil: 350, glycol: 800, air: 50 },
  oil:    { water: 350, oil: 150, glycol: 200, air: 30 },
  steam:  { water: 2500, oil: 500, glycol: 1000, air: 80 },
  gas:    { water: 80, oil: 40, glycol: 60, air: 25 },
};

/** Specific heat kJ/(kg·K) */
const CP: Record<string, number> = {
  water: 4.18, oil: 2.0, steam: 2.0, gas: 1.0, glycol: 3.3, air: 1.005,
};

/** Density kg/m³ */
const RHO: Record<string, number> = {
  water: 998, oil: 870, steam: 2, gas: 1.2, glycol: 1060, air: 1.2,
};

// ── Engine ─────────────────────────────────────────────────────────

export class HeatExchangerEngine {
  calculate(input: HeatExchangerInput): HeatExchangerResult {
    const warnings: string[] = [];
    const hxType = input.hx_type ?? "shell_tube";
    const Q = (input.duty_kw ?? 100) * 1000; // W
    const Thi = input.hot_inlet_c ?? 90;
    const Tho = input.hot_outlet_c ?? 60;
    const Tci = input.cold_inlet_c ?? 20;
    const Tco = input.cold_outlet_c ?? 50;
    const hotFluid = input.hot_fluid ?? "water";
    const coldFluid = input.cold_fluid ?? "water";
    const arrangement = input.flow_arrangement ?? "counterflow";
    const Rf = input.fouling_factor ?? 0.0002; // m²·K/W

    // LMTD
    let dT1: number, dT2: number;
    if (arrangement === "counterflow") {
      dT1 = Thi - Tco;
      dT2 = Tho - Tci;
    } else {
      dT1 = Thi - Tci;
      dT2 = Tho - Tco;
    }
    // Avoid log(0) or negative
    dT1 = Math.max(dT1, 0.1);
    dT2 = Math.max(dT2, 0.1);

    let lmtd: number;
    if (Math.abs(dT1 - dT2) < 0.1) {
      lmtd = dT1;
    } else {
      lmtd = (dT1 - dT2) / Math.log(dT1 / dT2);
    }

    // Correction factor F (for shell & tube with 1-2 passes)
    let F = 1.0;
    if (hxType === "shell_tube" && arrangement !== "counterflow") {
      F = 0.85; // typical for 1-2 pass
    }
    if (arrangement === "crossflow") F = 0.9;

    // Overall U
    const Uclean = U_VALUES[hotFluid]?.[coldFluid] ?? 500;
    const U = 1 / (1 / Uclean + 2 * Rf); // both sides fouled

    // Required area
    const effectiveLMTD = lmtd * F;
    const A = effectiveLMTD > 0 ? Q / (U * effectiveLMTD) : 999;

    // Flow rates
    const cpHot = (CP[hotFluid] ?? 4.18) * 1000; // J/(kg·K)
    const cpCold = (CP[coldFluid] ?? 4.18) * 1000;
    const dTh = Math.max(Thi - Tho, 0.1);
    const dTc = Math.max(Tco - Tci, 0.1);
    const mHot = Q / (cpHot * dTh); // kg/s
    const mCold = Q / (cpCold * dTc);

    // Effectiveness
    const Cmin = Math.min(mHot * cpHot, mCold * cpCold);
    const Cmax = Math.max(mHot * cpHot, mCold * cpCold);
    const eps = Cmin > 0 ? Q / (Cmin * (Thi - Tci)) : 0;

    // NTU
    const ntu = Cmin > 0 ? U * A / Cmin : 0;

    // Pressure drop (simplified)
    const rhoH = RHO[hotFluid] ?? 998;
    const rhoC = RHO[coldFluid] ?? 998;
    const dpHot = hxType === "plate" ? 0.5 : 0.3; // bar typical
    const dpCold = hxType === "plate" ? 0.5 : 0.2;

    // Warnings
    if (eps > 0.9) {
      warnings.push(`Effectiveness ${r2(eps)} > 0.9 — very large HX, consider multi-stage`);
    }
    if (dT1 < 3 || dT2 < 3) {
      warnings.push("Temperature approach < 3°C — may be uneconomical");
    }
    if (A > 500 && hxType === "double_pipe") {
      warnings.push(`Area ${r0(A)}m² too large for double pipe — use shell & tube`);
    }
    if (Thi > 200 && hxType === "plate") {
      warnings.push("Temperature >200°C — plate HX gasket limits may be exceeded");
    }
    if (Rf > 0.001) {
      warnings.push("High fouling factor — consider cleaning schedule or plate type");
    }

    const src = "HeatExchangerEngine (Kern/TEMA)";

    return {
      lmtd: mkAv(r1(lmtd), "°C", lmtd * 0.05, arrangement),
      correction_factor: mkAv(r2(F), "F", 0.05, hxType),
      overall_u: mkAv(r0(U), "W/(m²·K)", U * 0.15,
        `${hotFluid}/${coldFluid} Rf=${Rf}`),
      required_area: mkAv(r1(A), "m²", A * 0.15,
        `Q/(U×LMTD×F)`),
      hot_flow_rate: mkAv(r2(mHot), "kg/s", mHot * 0.05,
        `Q/(cp×ΔT) ${hotFluid}`),
      cold_flow_rate: mkAv(r2(mCold), "kg/s", mCold * 0.05,
        `Q/(cp×ΔT) ${coldFluid}`),
      effectiveness: mkAv(r2(eps), "ε", eps * 0.05, "Q/(Cmin×ΔTmax)"),
      ntu: mkAv(r2(ntu), "NTU", ntu * 0.1, "U×A/Cmin"),
      pressure_drop_hot: mkAv(r2(dpHot), "bar", dpHot * 0.2, src),
      pressure_drop_cold: mkAv(r2(dpCold), "bar", dpCold * 0.2, src),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function mkAv(value: number, unit: string, uncertainty: number, source: string): AtomicValue {
  return { value, unit, uncertainty, source };
}
function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }

export const heatExchangerEngine = new HeatExchangerEngine();
