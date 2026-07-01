/**
 * ErgonomicWorkstationEngine — CNC workstation ergonomic analysis
 *
 * Models: RULA (Rapid Upper Limb Assessment), REBA (Rapid Entire Body Assessment),
 *         NIOSH lifting equation, fatigue accumulation, workstation layout optimization.
 * References: McAtamney & Corlett (RULA), Hignett & McAtamney (REBA),
 *             Waters et al. (NIOSH 1991), ISO 11226 (static postures)
 */

export type TaskType = "machine_loading" | "part_inspection" | "tool_change" | "deburring" | "assembly" | "cnc_operation" | "material_handling";
export type PostureRisk = "negligible" | "low" | "medium" | "high" | "very_high";

export interface ErgonomicInput {
  task?: TaskType;
  worker_height_cm?: number;
  load_weight_kg?: number;
  lift_origin_cm?: number;
  lift_dest_cm?: number;
  horizontal_reach_cm?: number;
  repetitions_per_hour?: number;
  shift_duration_h?: number;
  standing_pct?: number;
  workstation_height_cm?: number;
  viewing_distance_cm?: number;
  ambient_temp_C?: number;
  vibration_exposure_m_s2?: number;
}

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty?: number;
  source: string;
  warning?: string;
}

export interface ErgonomicResult {
  rula_score: AtomicValue;
  reba_score: AtomicValue;
  niosh_rwl_kg: AtomicValue;
  lifting_index: AtomicValue;
  fatigue_pct_end_shift: AtomicValue;
  posture_risk: PostureRisk;
  optimal_workstation_height_cm: AtomicValue;
  rest_breaks_recommended: AtomicValue;
  recommendations: string[];
}

// Task: [base_rula, base_reba, typical_load_kg, rep_rate, posture_factor]
const TASK_DATA: Record<TaskType, [number, number, number, number, number]> = {
  machine_loading:   [4, 5, 15, 20,  1.2],
  part_inspection:   [3, 3, 2,  60,  0.8],
  tool_change:       [4, 4, 5,  10,  1.0],
  deburring:         [5, 5, 1,  120, 1.3],
  assembly:          [4, 4, 3,  40,  1.1],
  cnc_operation:     [2, 2, 0,  5,   0.6],
  material_handling: [5, 6, 25, 15,  1.4],
};

export class ErgonomicWorkstationEngine {
  calculate(input: ErgonomicInput = {}): ErgonomicResult {
    const task = input.task ?? "machine_loading";
    const [baseRula, baseReba, typLoad, typRep, postureFactor] = TASK_DATA[task];
    const height = input.worker_height_cm ?? 175;
    const load = input.load_weight_kg ?? typLoad;
    const liftOrigin = input.lift_origin_cm ?? 50;
    const liftDest = input.lift_dest_cm ?? 100;
    const hReach = input.horizontal_reach_cm ?? 40;
    const reps = input.repetitions_per_hour ?? typRep;
    const shiftH = input.shift_duration_h ?? 8;
    const standPct = input.standing_pct ?? 70;
    const wsHeight = input.workstation_height_cm ?? (height * 0.6);
    const viewDist = input.viewing_distance_cm ?? 50;
    const temp = input.ambient_temp_C ?? 22;
    const vibration = input.vibration_exposure_m_s2 ?? 0;

    const recs: string[] = [];

    // Optimal workstation height: elbow height - adjustment
    const elbowHeight = height * 0.63;
    const optimalWsHeight = task === "deburring" || task === "assembly"
      ? elbowHeight - 5   // precision work: slightly below elbow
      : elbowHeight - 15; // heavy work: lower

    // RULA score (1-7 scale)
    // Adjust base by posture mismatch and load
    const heightMismatch = Math.abs(wsHeight - optimalWsHeight) / 20;
    const loadPenalty = load > 10 ? (load > 20 ? 2 : 1) : 0;
    const repPenalty = reps > 60 ? 1 : (reps > 30 ? 0.5 : 0);
    let rula = Math.min(Math.round(baseRula + heightMismatch + loadPenalty * 0.5 + repPenalty), 7);
    rula = Math.max(rula, 1);

    // REBA score (1-15 scale)
    const reachPenalty = hReach > 60 ? 2 : (hReach > 40 ? 1 : 0);
    let reba = Math.min(Math.round(baseReba + heightMismatch * 1.5 + loadPenalty + reachPenalty + repPenalty), 15);
    reba = Math.max(reba, 1);

    // NIOSH Revised Lifting Equation: RWL = LC * HM * VM * DM * AM * FM * CM
    const LC = 23; // load constant kg
    const H = Math.max(hReach, 25); // horizontal distance cm
    const HM = 25 / H;
    const V = liftOrigin; // vertical location cm
    const VM = 1 - 0.003 * Math.abs(V - 75);
    const D = Math.abs(liftDest - liftOrigin);
    const DM = D > 0 ? 0.82 + 4.5 / D : 1.0;
    const AM = 1.0; // asymmetry = 0 default
    // Frequency multiplier (simplified)
    const freqPerMin = reps / 60;
    const FM = freqPerMin <= 0.2 ? 1.0 :
               freqPerMin <= 1 ? 0.94 :
               freqPerMin <= 4 ? 0.84 :
               freqPerMin <= 8 ? 0.72 : 0.60;
    const CM = 1.0; // good coupling
    const rwl = LC * HM * Math.max(VM, 0) * Math.max(DM, 0) * AM * FM * CM;
    const liftingIndex = rwl > 0 ? load / rwl : 0;

    // Fatigue accumulation (Rohmert model simplified)
    // Endurance = f(force_ratio, duration, rest)
    const forceRatio = load / Math.max(rwl * 2, 1); // normalized effort
    const baseFatigue = forceRatio * postureFactor * 10; // % per hour
    const standingFatigue = standPct / 100 * 3; // additional % per hour from standing
    const tempFatigue = temp > 28 ? (temp - 28) * 1.5 : (temp < 15 ? (15 - temp) * 1.0 : 0);
    const vibFatigue = vibration > 2.5 ? (vibration - 2.5) * 4 : 0;
    const totalFatigueRate = baseFatigue + standingFatigue + tempFatigue + vibFatigue;
    const endShiftFatigue = Math.min(totalFatigueRate * shiftH, 100);

    // Posture risk classification
    const posRisk: PostureRisk =
      reba <= 3 ? "negligible" :
      reba <= 5 ? "low" :
      reba <= 8 ? "medium" :
      reba <= 11 ? "high" : "very_high";

    // Rest breaks: based on fatigue rate
    const breaksPerShift = totalFatigueRate > 15 ? Math.ceil(shiftH * 2) :
                           totalFatigueRate > 10 ? Math.ceil(shiftH * 1.5) :
                           totalFatigueRate > 5 ? Math.ceil(shiftH) :
                           Math.ceil(shiftH * 0.5);

    // Recommendations
    if (Math.abs(wsHeight - optimalWsHeight) > 10) {
      recs.push(`Adjust workstation height to ${Math.round(optimalWsHeight)} cm (currently ${Math.round(wsHeight)} cm)`);
    }
    if (liftingIndex > 1.0) {
      recs.push(`Lifting index ${liftingIndex.toFixed(1)} exceeds 1.0 — reduce load to ${Math.round(rwl)} kg or use mechanical assist`);
    }
    if (hReach > 50) {
      recs.push("Horizontal reach >50 cm — move work closer or use articulating arm");
    }
    if (reps > 60) {
      recs.push("High repetition rate — implement job rotation or micro-breaks every 30 min");
    }
    if (standPct > 80) {
      recs.push("Excessive standing >80% — provide anti-fatigue mats and sit/stand option");
    }
    if (viewDist < 35 || viewDist > 70) {
      recs.push(`Viewing distance ${viewDist} cm outside optimal 35-70 cm range`);
    }
    if (temp > 28) {
      recs.push("Ambient temperature >28C increases fatigue — improve ventilation or cooling");
    }
    if (vibration > 2.5) {
      recs.push(`Vibration ${vibration} m/s^2 exceeds EU Directive 2002/44/EC action value (2.5 m/s^2)`);
    }
    if (endShiftFatigue > 70) {
      recs.push("Predicted end-shift fatigue >70% — redesign task or add rotation schedule");
    }
    if (rula >= 5) {
      recs.push("RULA score >= 5 — investigate and change posture immediately (action level 3)");
    }

    return {
      rula_score: {
        value: rula,
        unit: "1-7",
        source: "McAtamney-Corlett RULA with load/posture adjustments",
        warning: rula >= 5 ? "Action level 3: investigate and change immediately" : undefined,
      },
      reba_score: {
        value: reba,
        unit: "1-15",
        source: "Hignett-McAtamney REBA with reach/load penalties",
        warning: reba >= 8 ? "High risk: implement changes soon" : undefined,
      },
      niosh_rwl_kg: {
        value: Math.round(rwl * 10) / 10,
        unit: "kg",
        source: "NIOSH Revised Lifting Equation (Waters 1993)",
      },
      lifting_index: {
        value: Math.round(liftingIndex * 100) / 100,
        unit: "ratio",
        source: "actual_load / RWL",
        warning: liftingIndex > 1.0 ? "Exceeds recommended limit — injury risk elevated" : undefined,
      },
      fatigue_pct_end_shift: {
        value: Math.round(endShiftFatigue * 10) / 10,
        unit: "%",
        source: "Rohmert fatigue model + environmental factors",
      },
      posture_risk: posRisk,
      optimal_workstation_height_cm: {
        value: Math.round(optimalWsHeight),
        unit: "cm",
        source: "0.63 * worker_height - task_adjustment",
      },
      rest_breaks_recommended: {
        value: breaksPerShift,
        unit: "breaks/shift",
        source: "Fatigue rate threshold model",
      },
      recommendations: recs,
    };
  }
}

export const ergonomicWorkstationEngine = new ErgonomicWorkstationEngine();
