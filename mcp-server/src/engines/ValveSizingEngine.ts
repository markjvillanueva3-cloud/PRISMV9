/**
 * ValveSizingEngine — Control Valve Cv/Kv Sizing Calculator
 *
 * Models: Control valve sizing per ISA/IEC standards.
 * - Cv from flow and ΔP (liquid, gas, steam)
 * - Valve type recommendation
 * - Rangeability and turndown
 * - Noise prediction (IEC 534-8)
 * - Cavitation and flashing check
 * - Choked flow detection
 *
 * Key physics: Cv = Q×√(G/ΔP). Kv = 0.865×Cv.
 * FL² check for choked flow. σ = (P1-Pv)/(P1-P2) cavitation index.
 *
 * Reference: ISA 75.01 — Control Valve Sizing,
 *            IEC 60534 — Industrial Process Control Valves,
 *            Fisher Control Valve Handbook
 *
 * Actions: valve_sizing_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ValveSizingInput {
  fluid?: "water" | "steam" | "air" | "natural_gas" | "oil";
  flow_rate?: number;
  flow_unit?: "m3h" | "gpm" | "kg_h";
  inlet_pressure_bar?: number;
  outlet_pressure_bar?: number;
  temperature_c?: number;
  valve_type?: "globe" | "ball" | "butterfly" | "gate";
  pipe_size_mm?: number;
}

export interface ValveSizingResult {
  cv_required: AtomicValue;
  kv_required: AtomicValue;
  pressure_drop: AtomicValue;
  velocity: AtomicValue;
  cavitation_index: AtomicValue;
  choked_flow: AtomicValue;
  noise_level: AtomicValue;
  recommended_size: AtomicValue;
  valve_opening_pct: AtomicValue;
  valve_type_rec: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** [specific_gravity, vapor_pressure_bar_at_ref, is_compressible] */
const FLUID_DATA: Record<string, [number, number, boolean]> = {
  water:       [1.0,  0.03, false],
  steam:       [0.001, 0,   true],
  air:         [0.0012, 0,  true],
  natural_gas: [0.0007, 0,  true],
  oil:         [0.85,  0.01, false],
};

/** Valve FL (liquid pressure recovery factor) */
const VALVE_FL: Record<string, number> = {
  globe: 0.9, ball: 0.6, butterfly: 0.55, gate: 0.85,
};

/** Valve Cv per inch² of port area (for sizing) */
const CV_PER_SIZE: Record<string, number[]> = {
  globe:     [1, 5, 12, 30, 70, 150, 300],
  ball:      [3, 15, 40, 100, 250, 500, 1000],
  butterfly: [5, 20, 60, 150, 400, 800, 1500],
  gate:      [4, 18, 50, 120, 300, 600, 1200],
};

const PIPE_SIZES = [15, 25, 40, 50, 80, 100, 150]; // mm DN

// ── Engine ─────────────────────────────────────────────────────────

export class ValveSizingEngine {
  calculate(input: ValveSizingInput): ValveSizingResult {
    const warnings: string[] = [];
    const fluid = input.fluid ?? "water";
    const Q = input.flow_rate ?? 50;
    const flowUnit = input.flow_unit ?? "m3h";
    const P1 = input.inlet_pressure_bar ?? 6;
    const P2 = input.outlet_pressure_bar ?? 4;
    const tempC = input.temperature_c ?? 25;
    const vType = input.valve_type ?? "globe";
    const pipeSize = input.pipe_size_mm ?? 50;

    const [sg, Pv, compressible] = FLUID_DATA[fluid] ?? FLUID_DATA.water;
    const FL = VALVE_FL[vType] ?? 0.9;
    const dP = P1 - P2;

    // Convert flow to m³/h for liquid Cv calc
    let Qm3h = Q;
    if (flowUnit === "gpm") Qm3h = Q * 0.2271;
    if (flowUnit === "kg_h" && !compressible) Qm3h = Q / (sg * 1000);

    // Cv calculation
    let Cv: number;
    if (compressible) {
      // Gas sizing: Cv = Q / (N8 × P1 × Y × √(x×M/T))
      // Simplified: Cv = Qm3h / (18.5 × √(dP × P1))
      const x = dP / Math.max(P1, 0.01);
      const xT = 0.7; // critical pressure ratio
      const xEff = Math.min(x, FL * FL * xT);
      Cv = Qm3h / (18.5 * Math.sqrt(Math.max(xEff * P1, 0.001)));
    } else {
      // Liquid: Cv = Q × √(SG / ΔP)
      // Check for choked flow
      const dPChoked = FL * FL * (P1 - Pv);
      const dPEff = Math.min(dP, dPChoked);
      Cv = Qm3h * Math.sqrt(sg / Math.max(dPEff, 0.001));
    }

    const Kv = Cv * 0.865;

    // Cavitation index (liquid only)
    let sigma = 0;
    if (!compressible && dP > 0) {
      sigma = (P1 - Pv) / dP;
    }

    // Choked flow check
    const dPChoked = FL * FL * (P1 - Math.max(Pv, 0));
    const isChoked = dP > dPChoked && !compressible;

    // Velocity at valve (m/s)
    const pipeAreaM2 = Math.PI * Math.pow(pipeSize / 2000, 2);
    const velocity = pipeAreaM2 > 0 ? (Qm3h / 3600) / pipeAreaM2 : 0;

    // Noise estimate (simplified IEC 534-8)
    // SPL ≈ 20×log10(v) + 10×log10(Cv) + 50
    const noise = velocity > 0 ?
      20 * Math.log10(velocity) + 10 * Math.log10(Math.max(Cv, 1)) + 50 : 0;

    // Recommended valve size
    const cvSizes = CV_PER_SIZE[vType] ?? CV_PER_SIZE.globe;
    let recSize = PIPE_SIZES[PIPE_SIZES.length - 1];
    let openingPct = 100;
    for (let i = 0; i < cvSizes.length && i < PIPE_SIZES.length; i++) {
      if (cvSizes[i] >= Cv) {
        recSize = PIPE_SIZES[i];
        openingPct = cvSizes[i] > 0 ? (Cv / cvSizes[i]) * 100 : 100;
        break;
      }
    }

    // Valve type recommendation
    let typeRec = vType;
    if (!input.valve_type) {
      if (Cv > 500) typeRec = "butterfly";
      else if (compressible && dP / P1 > 0.5) typeRec = "globe";
      else typeRec = "globe";
    }

    // Warnings
    if (isChoked) {
      warnings.push("Choked flow — increase valve size or reduce ΔP");
    }
    if (sigma < 2 && sigma > 0 && !compressible) {
      warnings.push(`Cavitation index σ=${r1(sigma)} < 2.0 — cavitation likely`);
    }
    if (openingPct < 20) {
      warnings.push(`Valve opening ${r0(openingPct)}% — oversized, select smaller valve`);
    }
    if (openingPct > 80) {
      warnings.push(`Valve opening ${r0(openingPct)}% — limited control range at max`);
    }
    if (velocity > 6 && !compressible) {
      warnings.push(`Velocity ${r1(velocity)}m/s > 6m/s — erosion risk in liquid`);
    }
    if (noise > 85) {
      warnings.push(`Predicted noise ${r0(noise)}dBA > 85 — add silencer or trim`);
    }

    const src = "ValveSizingEngine (ISA 75.01/IEC 60534)";

    return {
      cv_required: mkAv(r1(Cv), "Cv", Cv * 0.05, `${fluid} ${flowUnit}`),
      kv_required: mkAv(r1(Kv), "Kv", Kv * 0.05, "Cv × 0.865"),
      pressure_drop: mkAv(r2(dP), "bar", dP * 0.02,
        `${P1} - ${P2}`),
      velocity: mkAv(r1(velocity), "m/s", velocity * 0.05,
        `Q / A_pipe DN${pipeSize}`),
      cavitation_index: mkAv(r1(sigma), "σ", sigma * 0.1,
        compressible ? "N/A (gas)" : `(P1-Pv)/ΔP`),
      choked_flow: mkAv(isChoked ? 1 : 0,
        isChoked ? "CHOKED" : "NORMAL", 0, `FL=${FL}`),
      noise_level: mkAv(r0(noise), "dBA", 3, "IEC 534-8 simplified"),
      recommended_size: mkAv(recSize, "mm DN", 0, `Cv=${r1(Cv)} ${vType}`),
      valve_opening_pct: mkAv(r0(openingPct), "%", 5, src),
      valve_type_rec: mkAv(typeRec === vType ? 1 : 0, typeRec, 0, src),
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

export const valveSizingEngine = new ValveSizingEngine();
