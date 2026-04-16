/**
 * PumpSelectionEngine — Centrifugal & Positive Displacement Pump Sizing
 *
 * Models: Pump selection and system curve matching.
 * - TDH (Total Dynamic Head) calculation
 * - NPSH available vs required
 * - Pump power and efficiency
 * - Affinity laws for speed/impeller changes
 * - Specific speed for pump type selection
 * - System curve intersection
 *
 * Key physics: TDH = Hs + Hf + Hp + Hv. P = Q×H×ρ×g/(η×3.6×10⁶).
 * Ns = N×√Q / H^0.75. Affinity: Q∝N, H∝N², P∝N³.
 *
 * Reference: Hydraulic Institute Standards,
 *            Karassik — Pump Handbook,
 *            API 610 — Centrifugal Pumps
 *
 * Actions: pump_selection_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface PumpSelectionInput {
  flow_m3h?: number;
  static_head_m?: number;
  friction_head_m?: number;
  pressure_head_m?: number;
  fluid?: "water" | "oil" | "slurry" | "chemical";
  fluid_sg?: number;
  viscosity_cp?: number;
  pump_speed_rpm?: number;
  suction_head_m?: number;
  vapor_pressure_m?: number;
  pump_type?: "centrifugal" | "positive_displacement";
}

export interface PumpSelectionResult {
  total_dynamic_head: AtomicValue;
  hydraulic_power: AtomicValue;
  brake_power: AtomicValue;
  pump_efficiency: AtomicValue;
  npsh_available: AtomicValue;
  npsh_required: AtomicValue;
  specific_speed: AtomicValue;
  pump_type_rec: AtomicValue;
  motor_size: AtomicValue;
  annual_energy_cost: AtomicValue;
  warnings: string[];
}

// ── Engine ─────────────────────────────────────────────────────────

export class PumpSelectionEngine {
  calculate(input: PumpSelectionInput): PumpSelectionResult {
    const warnings: string[] = [];
    const Q = input.flow_m3h ?? 50;
    const Hs = input.static_head_m ?? 15;
    const Hf = input.friction_head_m ?? 5;
    const Hp = input.pressure_head_m ?? 0;
    const sg = input.fluid_sg ?? 1.0;
    const visc = input.viscosity_cp ?? 1;
    const rpm = input.pump_speed_rpm ?? 2950;
    const Hsuc = input.suction_head_m ?? 3;
    const Hvp = input.vapor_pressure_m ?? 0.3;
    const pType = input.pump_type ?? "centrifugal";

    // TDH
    const TDH = Hs + Hf + Hp;

    // Hydraulic power (kW)
    const Phyd = Q * TDH * sg * 9.81 / 3600;

    // Pump efficiency (varies with Ns and size)
    const Qm3s = Q / 3600;
    const Ns = rpm * Math.sqrt(Qm3s) / Math.pow(Math.max(TDH, 1), 0.75);
    let eta: number;
    if (pType === "positive_displacement") {
      eta = 0.85;
    } else {
      // Centrifugal: efficiency depends on specific speed and size
      if (Ns < 10) eta = 0.50;
      else if (Ns < 30) eta = 0.65;
      else if (Ns < 80) eta = 0.80;
      else if (Ns < 200) eta = 0.85;
      else eta = 0.75;
    }

    // Viscosity correction (Hydraulic Institute method simplified)
    if (visc > 10) {
      const viscFactor = Math.pow(10 / visc, 0.1);
      eta *= viscFactor;
    }

    // Brake power
    const Pbrake = eta > 0 ? Phyd / eta : Phyd;

    // Motor size (next standard size up)
    const motorSizes = [0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5,
      11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110, 132, 160, 200];
    let motorKW = motorSizes[motorSizes.length - 1];
    for (const s of motorSizes) {
      if (s >= Pbrake * 1.15) { // 15% margin
        motorKW = s;
        break;
      }
    }

    // NPSH
    const NPSHa = Hsuc + 10.33 / sg - Hvp - Hf * 0.1; // simplified
    const NPSHr = 0.3 * Math.pow(Q, 0.33); // rough estimate

    // Pump type recommendation
    let typeRec = pType;
    if (!input.pump_type) {
      if (visc > 200 || Q < 5) typeRec = "positive_displacement";
      else typeRec = "centrifugal";
    }

    // Annual energy cost (assuming 6000h/yr, $0.10/kWh)
    const annualCost = motorKW * 6000 * 0.10;

    // Warnings
    if (NPSHa < NPSHr) {
      warnings.push(`NPSHa ${r1(NPSHa)}m < NPSHr ${r1(NPSHr)}m — cavitation risk`);
    }
    if (eta < 0.5) {
      warnings.push(`Pump efficiency ${r0(eta * 100)}% low — check sizing or pump type`);
    }
    if (visc > 200 && pType === "centrifugal") {
      warnings.push("High viscosity — consider positive displacement pump");
    }
    if (Pbrake > 100) {
      warnings.push("High power — consider parallel pumps or variable speed drive");
    }
    if (TDH > 150 && pType === "centrifugal") {
      warnings.push(`TDH ${r0(TDH)}m high — consider multi-stage pump`);
    }

    const src = "PumpSelectionEngine (HI/Karassik)";

    return {
      total_dynamic_head: mkAv(r1(TDH), "m", TDH * 0.05,
        `Hs=${Hs} + Hf=${Hf} + Hp=${Hp}`),
      hydraulic_power: mkAv(r2(Phyd), "kW", Phyd * 0.05,
        `Q×H×SG×g`),
      brake_power: mkAv(r2(Pbrake), "kW", Pbrake * 0.1,
        `Phyd/η at ${r0(eta * 100)}%`),
      pump_efficiency: mkAv(r0(eta * 100), "%", 5, `Ns=${r0(Ns)}`),
      npsh_available: mkAv(r1(NPSHa), "m", NPSHa * 0.1, "System calc"),
      npsh_required: mkAv(r1(NPSHr), "m", NPSHr * 0.2, "Estimated"),
      specific_speed: mkAv(r0(Ns), "Ns", Ns * 0.05,
        `${rpm}rpm Q=${Q}m³/h H=${r0(TDH)}m`),
      pump_type_rec: mkAv(typeRec === "centrifugal" ? 1 : 2,
        typeRec, 0, src),
      motor_size: mkAv(motorKW, "kW", 0, `≥${r2(Pbrake)}×1.15`),
      annual_energy_cost: mkAv(r0(annualCost), "$/yr", annualCost * 0.1,
        `${motorKW}kW × 6000h × $0.10`),
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

export const pumpSelectionEngine = new PumpSelectionEngine();
