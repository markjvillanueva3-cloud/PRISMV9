/**
 * HydraulicPressEngine — Hydraulic press force, tonnage, and cycle analysis
 *
 * Models: Pascal's law (F = P×A), cylinder sizing, energy per stroke,
 *         approach/press/return cycle timing, pump flow requirements
 * References: SME Fundamentals of Tool Design, ASME B30.1
 * Safety: Overload protection, daylight/stroke limits
 */

// ─── Types ─────────────────────────────────────────────────────────

export type PressOperation = "blanking" | "drawing" | "bending" | "coining" | "forging" | "compaction";

export interface HydraulicPressInput {
  required_force_kN: number;
  operation?: PressOperation;                // default blanking
  stroke_mm?: number;                        // default 200
  work_stroke_mm?: number;                   // default 30 (portion doing actual work)
  cylinder_bore_mm?: number;                 // calculated if not provided
  system_pressure_MPa?: number;              // default 25 MPa
  pump_flow_lpm?: number;                    // default 40 L/min
  mechanical_efficiency?: number;            // default 0.92
  material_thickness_mm?: number;            // for blanking tonnage
  material_uts_MPa?: number;                 // for blanking tonnage
  blank_perimeter_mm?: number;               // for blanking tonnage
}

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

export interface HydraulicPressResult {
  press_capacity_kN: AtomicValue;
  cylinder_bore_mm: AtomicValue;
  system_pressure_MPa: AtomicValue;
  energy_per_stroke_kJ: AtomicValue;
  approach_time_s: AtomicValue;
  press_time_s: AtomicValue;
  return_time_s: AtomicValue;
  cycle_time_s: AtomicValue;
  strokes_per_min: AtomicValue;
  pump_power_kW: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// ─── Reference Data ────────────────────────────────────────────────

const OPERATION_FACTOR: Record<PressOperation, number> = {
  blanking: 1.0,
  drawing: 1.3,
  bending: 0.6,
  coining: 2.5,
  forging: 2.0,
  compaction: 1.8,
};

// ─── Engine ────────────────────────────────────────────────────────

function mkAv(value: number, unit: string, unc: number, source: string, warning?: string): AtomicValue {
  return { value, unit, uncertainty: unc, source, warning };
}

export class HydraulicPressEngine {
  calculate(input: HydraulicPressInput): HydraulicPressResult {
    const {
      required_force_kN: reqForce,
      operation = "blanking",
      stroke_mm: stroke = 200,
      work_stroke_mm: workStroke = 30,
      system_pressure_MPa: pressure = 25,
      pump_flow_lpm: pumpFlow = 40,
      mechanical_efficiency: eta = 0.92,
      material_thickness_mm: matThick,
      material_uts_MPa: uts,
      blank_perimeter_mm: perim,
    } = input;

    const recs: string[] = [];
    const opFactor = OPERATION_FACTOR[operation];

    // If blanking parameters given, calculate blanking force
    let effectiveForce = reqForce;
    if (matThick && uts && perim) {
      const blankForce = perim * matThick * uts / 1000; // kN
      effectiveForce = Math.max(effectiveForce, blankForce);
    }

    // Apply operation factor for capacity sizing
    const capacityNeeded = effectiveForce * opFactor;

    // Cylinder bore: F = P × A → A = F/P → d = √(4A/π)
    let bore = input.cylinder_bore_mm;
    if (!bore) {
      const areaNeeded_mm2 = (capacityNeeded * 1000) / (pressure * eta); // mm²
      bore = Math.sqrt(4 * areaNeeded_mm2 / Math.PI);
    }

    // Actual capacity with this bore
    const cylinderArea = Math.PI * bore * bore / 4; // mm²
    const actualCapacity = cylinderArea * pressure * eta / 1000; // kN

    // Energy per stroke: E = F × work_stroke
    const energyPerStroke = effectiveForce * workStroke / 1e6; // kJ (F in kN, d in mm → kN·mm = J → /1000 = kJ)
    const energyKJ = effectiveForce * workStroke / 1000;

    // Cycle timing
    const flowRate_mm3_s = pumpFlow * 1e6 / 60; // L/min → mm³/s
    const cylinderVol_approach = cylinderArea * (stroke - workStroke); // mm³
    const cylinderVol_work = cylinderArea * workStroke;
    const cylinderVol_total = cylinderArea * stroke;

    const approachTime = cylinderVol_approach / flowRate_mm3_s;
    const pressTime = cylinderVol_work / (flowRate_mm3_s * 0.3); // slow speed during work
    const returnTime = cylinderVol_total / (flowRate_mm3_s * 1.5); // faster return (smaller rod-side area approx)
    const cycleTime = approachTime + pressTime + returnTime + 0.5; // 0.5s dwell
    const spm = 60 / cycleTime;

    // Pump power: P = p × Q / (η × 60000) [kW]
    const pumpPower = pressure * pumpFlow / (eta * 60) * 1000 / 1000;
    // Simplified: P(kW) = P(MPa) × Q(L/min) / (60 × η) × 1 = p*Q/(60*eta)
    const pumpKW = pressure * pumpFlow / (60 * eta);

    // Safety
    const capacityMargin = actualCapacity / effectiveForce;
    const isSafe = capacityMargin >= 1.1;

    if (capacityMargin < 1.2) {
      recs.push(`Low capacity margin ${(capacityMargin * 100).toFixed(0)}% — minimum 120% recommended for safety`);
    }
    if (operation === "coining" || operation === "forging") {
      recs.push(`${operation} operation — ensure bottoming die protection and overload relief valve`);
    }
    if (spm > 30) {
      recs.push(`High cycle rate ${spm.toFixed(1)} SPM — verify thermal management and accumulator sizing`);
    }
    if (pumpKW > 50) {
      recs.push(`High pump power ${pumpKW.toFixed(1)}kW — consider accumulator-assisted circuit`);
    }
    if (recs.length === 0) {
      recs.push(`Press sizing nominal — ${actualCapacity.toFixed(0)}kN capacity for ${effectiveForce.toFixed(0)}kN requirement`);
    }

    return {
      press_capacity_kN: mkAv(Math.round(actualCapacity), "kN", actualCapacity * 0.05, "pascals_law"),
      cylinder_bore_mm: mkAv(Math.round(bore * 10) / 10, "mm", bore * 0.02, "area_force_relation"),
      system_pressure_MPa: mkAv(pressure, "MPa", pressure * 0.03, "input"),
      energy_per_stroke_kJ: mkAv(Math.round(energyKJ * 100) / 100, "kJ", energyKJ * 0.10, "force_distance"),
      approach_time_s: mkAv(Math.round(approachTime * 100) / 100, "s", approachTime * 0.10, "flow_volume"),
      press_time_s: mkAv(Math.round(pressTime * 100) / 100, "s", pressTime * 0.15, "flow_volume"),
      return_time_s: mkAv(Math.round(returnTime * 100) / 100, "s", returnTime * 0.10, "flow_volume"),
      cycle_time_s: mkAv(Math.round(cycleTime * 100) / 100, "s", cycleTime * 0.10, "sum_phases"),
      strokes_per_min: mkAv(Math.round(spm * 10) / 10, "SPM", spm * 0.10, "cycle_inverse"),
      pump_power_kW: mkAv(Math.round(pumpKW * 10) / 10, "kW", pumpKW * 0.08, "hydraulic_power"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const hydraulicPressEngine = new HydraulicPressEngine();
