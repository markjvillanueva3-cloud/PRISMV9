/**
 * PlasmaArcEngine — Plasma Arc Cutting Parameter Calculator
 *
 * Models: Plasma cutting process parameters and cost.
 * - Cutting current from material/thickness
 * - Cut speed (IPM/mm/min)
 * - Kerf width estimation
 * - Gas selection (air, O2, N2, H2/Ar)
 * - Consumable life estimation
 * - Pierce time and height
 * - Cost per meter of cut
 *
 * Key physics: Power = V × I. Cut speed ∝ I/(thickness × density).
 * Kerf ≈ nozzle_diameter × 1.2-1.5. Heat input = P/v.
 *
 * Reference: Hypertherm Cutting Guide,
 *            AWS C5.2 (plasma arc cutting),
 *            Lincoln Electric Plasma Handbook
 *
 * Actions: plasma_arc_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface PlasmaArcInput {
  material?: "mild_steel" | "stainless" | "aluminum" | "copper" | "brass";
  thickness_mm?: number;
  cut_quality?: "production" | "fine" | "severance";
  power_source_amps?: number;
  gas_type?: "air" | "oxygen" | "nitrogen" | "h2_ar" | "f5";
  cut_length_m?: number;
  num_pierces?: number;
  electricity_cost_kwh?: number;
}

export interface PlasmaArcResult {
  cutting_current: AtomicValue;
  arc_voltage: AtomicValue;
  cut_speed: AtomicValue;
  kerf_width: AtomicValue;
  pierce_time: AtomicValue;
  standoff_height: AtomicValue;
  gas_recommendation: AtomicValue;
  consumable_life: AtomicValue;
  heat_input: AtomicValue;
  cost_per_meter: AtomicValue;
  cut_feasible: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Max thickness by amperage (mm, mild steel) */
const MAX_THICKNESS: [number, number][] = [
  [30, 6], [45, 10], [65, 16], [85, 20], [105, 25],
  [130, 30], [200, 38], [300, 50], [400, 75], [800, 150],
];

/** Material cut speed factor relative to mild steel */
const SPEED_FACTOR: Record<string, number> = {
  mild_steel: 1.0, stainless: 0.85, aluminum: 1.3,
  copper: 0.6, brass: 0.7,
};

/** Recommended gas by material */
const GAS_REC: Record<string, string> = {
  mild_steel: "oxygen",
  stainless: "h2_ar",
  aluminum: "h2_ar",
  copper: "nitrogen",
  brass: "nitrogen",
};

// ── Engine ─────────────────────────────────────────────────────────

export class PlasmaArcEngine {
  calculate(input: PlasmaArcInput): PlasmaArcResult {
    const warnings: string[] = [];
    const mat = input.material ?? "mild_steel";
    const t = input.thickness_mm ?? 12;
    const quality = input.cut_quality ?? "production";
    const maxAmps = input.power_source_amps ?? 105;
    const cutLen = input.cut_length_m ?? 10;
    const nPierces = input.num_pierces ?? 10;
    const elecCost = input.electricity_cost_kwh ?? 0.10;

    // Required current for thickness
    // Linear interpolation from MAX_THICKNESS table
    let reqAmps = 30;
    for (let i = 1; i < MAX_THICKNESS.length; i++) {
      if (t <= MAX_THICKNESS[i][1]) {
        const frac = (t - MAX_THICKNESS[i - 1][1]) /
          (MAX_THICKNESS[i][1] - MAX_THICKNESS[i - 1][1]);
        reqAmps = MAX_THICKNESS[i - 1][0] + frac * (MAX_THICKNESS[i][0] - MAX_THICKNESS[i - 1][0]);
        break;
      }
      reqAmps = MAX_THICKNESS[i][0];
    }

    // Quality adjustment
    if (quality === "fine") reqAmps *= 0.7;
    if (quality === "severance") reqAmps *= 1.2;

    const actualAmps = Math.min(reqAmps, maxAmps);

    // Arc voltage (higher for thicker material)
    const arcV = 100 + t * 1.5;

    // Cut speed (mm/min)
    // Base: ~2500/t for mild steel at rated current
    const speedFactor = SPEED_FACTOR[mat] ?? 1.0;
    const ampRatio = actualAmps / Math.max(reqAmps, 1);
    let cutSpeed = (2500 / Math.max(t, 1)) * speedFactor * ampRatio;
    if (quality === "fine") cutSpeed *= 0.7;
    if (quality === "severance") cutSpeed *= 1.5;

    // Kerf width (mm)
    const kerf = t < 6 ? 1.0 : t < 12 ? 1.5 : t < 25 ? 2.0 : t < 50 ? 2.5 : 3.5;

    // Pierce time (seconds)
    const pierceTime = t < 6 ? 0.2 : t < 12 ? 0.5 : t < 25 ? 1.5 : t < 50 ? 3.0 : 5.0;

    // Standoff (mm)
    const standoff = t < 6 ? 1.5 : t < 12 ? 2.0 : t < 25 ? 3.0 : 4.0;

    // Gas
    const gasRec = input.gas_type ?? GAS_REC[mat] ?? "air";

    // Consumable life (starts/hours)
    const consumableStarts = quality === "fine" ? 600 : quality === "production" ? 1200 : 400;
    const consumableHours = quality === "fine" ? 2 : quality === "production" ? 3 : 1.5;

    // Heat input (kJ/mm)
    const power = actualAmps * arcV / 1000; // kW
    const heatInput = power * 60 / Math.max(cutSpeed, 1); // kJ/mm

    // Cost per meter
    const cutTime = 1000 / Math.max(cutSpeed, 1); // min/m
    const energyCost = power * (cutTime / 60) * elecCost; // $/m
    const gasCostPerMin = gasRec === "air" ? 0.01 : gasRec === "oxygen" ? 0.05 : 0.08;
    const gasCost = gasCostPerMin * cutTime;
    const consumCostPerM = 0.15 * (cutTime / 60); // simplified
    const totalCostPerM = energyCost + gasCost + consumCostPerM;

    // Feasibility
    const feasible = actualAmps >= reqAmps * 0.8 && t > 0;

    // Warnings
    if (actualAmps < reqAmps * 0.8) {
      warnings.push(
        `Power source ${maxAmps}A insufficient for ${t}mm ${mat} — ` +
        `need ${r0(reqAmps)}A`
      );
    }
    if (t > 50 && quality === "fine") {
      warnings.push(`Fine quality on ${t}mm — very slow, consider laser or waterjet`);
    }
    if (mat === "copper" && gasRec === "air") {
      warnings.push("Copper with air plasma — poor cut quality, use N₂ or N₂/H₂");
    }
    if (heatInput > 3) {
      warnings.push(`Heat input ${r1(heatInput)} kJ/mm — HAZ and distortion risk`);
    }
    if (t < 1) {
      warnings.push("Thin material < 1mm — consider laser cutting for better edge quality");
    }

    const src = "PlasmaArcEngine (Hypertherm/AWS C5.2)";

    return {
      cutting_current: mkAv(r0(actualAmps), "A", actualAmps * 0.05, src),
      arc_voltage: mkAv(r0(arcV), "V", 5, src),
      cut_speed: mkAv(r0(cutSpeed), "mm/min", cutSpeed * 0.1, `${mat} ${t}mm`),
      kerf_width: mkAv(r1(kerf), "mm", 0.2, src),
      pierce_time: mkAv(r1(pierceTime), "s", 0.3, `${t}mm`),
      standoff_height: mkAv(r1(standoff), "mm", 0.5, src),
      gas_recommendation: mkAv(gasRec === "air" ? 1 : gasRec === "oxygen" ? 2 : 3,
        gasRec, 0, `Best for ${mat}`),
      consumable_life: mkAv(consumableStarts, "starts", 100,
        `${r1(consumableHours)}h arc-on at ${quality}`),
      heat_input: mkAv(r2(heatInput), "kJ/mm", heatInput * 0.1,
        `${r1(power)}kW / ${r0(cutSpeed)}mm/min`),
      cost_per_meter: mkAv(r2(totalCostPerM), "$/m", totalCostPerM * 0.2,
        "Energy + gas + consumables"),
      cut_feasible: mkAv(feasible ? 1 : 0, feasible ? "PASS" : "FAIL", 0, src),
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

export const plasmaArcEngine = new PlasmaArcEngine();
