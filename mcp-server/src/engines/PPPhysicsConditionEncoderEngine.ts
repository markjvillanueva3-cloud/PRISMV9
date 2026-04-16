/**
 * PPPhysicsConditionEncoderEngine — PP-AGI-MS4
 *
 * Encodes cutting physics conditions (force, temperature, power, wear state)
 * into dense 24-dimensional vectors for scenario comparison and anomaly detection.
 *
 * NOT a physics engine — does not compute Kienzle forces, Taylor tool life, or
 * thermal models. Those are handled by CuttingForceEngine, ToolLifeEngine, etc.
 * This engine CONSUMES physics outputs and encodes them as vectors.
 *
 * Embedding dimensions (24 total):
 *   [0..3]   force regime (light/medium/heavy/extreme normalized)
 *   [4..7]   temperature regime (cold/warm/hot/critical)
 *   [8]      specific cutting force kc normalized (/3500 N/mm²)
 *   [9]      feed force ratio (Ff/Fc normalized)
 *   [10]     power consumption normalized (/50 kW)
 *   [11]     torque normalized (/500 Nm)
 *   [12]     MRR normalized (cm³/min / 100)
 *   [13]     chip thickness normalized (mm / 0.5)
 *   [14]     cutting speed normalized (m/min / 500)
 *   [15]     tool wear state (VB/VBmax normalized)
 *   [16]     vibration level normalized (0-1)
 *   [17]     deflection risk normalized (0-1)
 *   [18]     surface_finish_risk (0=safe, 1=at_limit)
 *   [19]     thermal_risk (0=safe, 1=white_layer)
 *   [20]     chatter_risk (0=stable, 1=unstable)
 *   [21]     tool_breakage_risk (0=safe, 1=imminent)
 *   [22]     power_limit_risk (0=ok, 1=at_limit)
 *   [23]     coolant_adequacy (0=inadequate, 1=optimal)
 *
 * @module PPPhysicsConditionEncoderEngine
 */

export const PHYSICS_EMBEDDING_DIM = 24;

const DIM_NAMES: string[] = [
  "force_light", "force_medium", "force_heavy", "force_extreme",
  "temp_cold", "temp_warm", "temp_hot", "temp_critical",
  "kc_norm", "force_ratio", "power_norm", "torque_norm",
  "mrr_norm", "chip_thickness_norm", "cutting_speed_norm",
  "tool_wear_state", "vibration_level", "deflection_risk",
  "surface_finish_risk", "thermal_risk", "chatter_risk",
  "tool_breakage_risk", "power_limit_risk", "coolant_adequacy",
];

export interface PhysicsCondition {
  cutting_force_N?: number;
  feed_force_N?: number;
  specific_cutting_force?: number;  // kc N/mm²
  cutting_temperature_C?: number;
  power_kW?: number;
  torque_Nm?: number;
  mrr_cm3_per_min?: number;
  chip_thickness_mm?: number;
  cutting_speed_m_min?: number;
  tool_wear_VB_mm?: number;
  tool_wear_VBmax_mm?: number;
  vibration_amplitude_um?: number;
  deflection_mm?: number;
  deflection_limit_mm?: number;
  surface_Ra_um?: number;
  surface_Ra_target_um?: number;
  chatter_detected?: boolean;
  coolant_flow_adequate?: boolean;
  spindle_power_limit_kW?: number;
}

export interface PhysicsEmbedding {
  vector: number[];
  dimension: number;
  risk_summary: { overall_risk: number; top_risks: string[] };
}

export interface PhysicsCompareResult {
  cosine_similarity: number;
  condition_shift: string[];  // which conditions changed significantly
  risk_delta: number;         // positive = condition B is riskier
}

export class PPPhysicsConditionEncoderEngine {
  embed(condition: PhysicsCondition): PhysicsEmbedding {
    const v = this.conditionToVector(condition);
    const risks = this.assessRisks(v);
    return { vector: v, dimension: PHYSICS_EMBEDDING_DIM, risk_summary: risks };
  }

  compare(a: PhysicsCondition, b: PhysicsCondition): PhysicsCompareResult {
    const vecA = this.conditionToVector(a);
    const vecB = this.conditionToVector(b);
    const shifts: string[] = [];
    for (let i = 0; i < PHYSICS_EMBEDDING_DIM; i++) {
      if (Math.abs(vecA[i] - vecB[i]) > 0.2) shifts.push(DIM_NAMES[i]);
    }
    const riskA = this.assessRisks(vecA).overall_risk;
    const riskB = this.assessRisks(vecB).overall_risk;
    return {
      cosine_similarity: round4(cosineSim(vecA, vecB)),
      condition_shift: shifts,
      risk_delta: round2(riskB - riskA),
    };
  }

  dimensionName(index: number): string { return DIM_NAMES[index] ?? `dim_${index}`; }

  private conditionToVector(c: PhysicsCondition): number[] {
    const v = new Array<number>(PHYSICS_EMBEDDING_DIM).fill(0);

    // Force regime buckets
    const fc = c.cutting_force_N ?? 0;
    if (fc < 500) v[0] = 1;
    else if (fc < 2000) v[1] = 1;
    else if (fc < 5000) v[2] = 1;
    else v[3] = 1;

    // Temperature regime
    const temp = c.cutting_temperature_C ?? 20;
    if (temp < 200) v[4] = 1;
    else if (temp < 500) v[5] = 1;
    else if (temp < 800) v[6] = 1;
    else v[7] = 1;

    // Continuous values
    v[8] = clamp01((c.specific_cutting_force ?? 0) / 3500);
    v[9] = fc > 0 ? clamp01((c.feed_force_N ?? 0) / fc) : 0;
    v[10] = clamp01((c.power_kW ?? 0) / 50);
    v[11] = clamp01((c.torque_Nm ?? 0) / 500);
    v[12] = clamp01((c.mrr_cm3_per_min ?? 0) / 100);
    v[13] = clamp01((c.chip_thickness_mm ?? 0) / 0.5);
    v[14] = clamp01((c.cutting_speed_m_min ?? 0) / 500);

    // Tool wear state
    const vb = c.tool_wear_VB_mm ?? 0;
    const vbMax = c.tool_wear_VBmax_mm ?? 0.3;
    v[15] = vbMax > 0 ? clamp01(vb / vbMax) : 0;

    // Vibration level (0-100 µm typical, normalize to 50µm)
    v[16] = clamp01((c.vibration_amplitude_um ?? 0) / 50);

    // Deflection risk
    const defl = c.deflection_mm ?? 0;
    const deflLim = c.deflection_limit_mm ?? 0.05;
    v[17] = deflLim > 0 ? clamp01(defl / deflLim) : 0;

    // Surface finish risk
    const ra = c.surface_Ra_um ?? 0;
    const raTarget = c.surface_Ra_target_um ?? 3.2;
    v[18] = raTarget > 0 ? clamp01(ra / raTarget) : 0;

    // Thermal risk (800°C+ = white layer risk)
    v[19] = clamp01(temp / 1000);

    // Chatter risk
    v[20] = c.chatter_detected ? 1 : 0;

    // Tool breakage risk (composite)
    v[21] = clamp01(v[15] * 0.5 + v[16] * 0.3 + (fc > 5000 ? 0.2 : 0));

    // Power limit risk
    const powerLim = c.spindle_power_limit_kW ?? 50;
    v[22] = powerLim > 0 ? clamp01((c.power_kW ?? 0) / powerLim) : 0;

    // Coolant adequacy
    v[23] = c.coolant_flow_adequate === false ? 0 : c.coolant_flow_adequate === true ? 1 : 0.5;

    return v;
  }

  private assessRisks(v: number[]): { overall_risk: number; top_risks: string[] } {
    const riskDims = [
      { idx: 18, name: "surface_finish" },
      { idx: 19, name: "thermal" },
      { idx: 20, name: "chatter" },
      { idx: 21, name: "tool_breakage" },
      { idx: 22, name: "power_limit" },
      { idx: 17, name: "deflection" },
    ];
    const topRisks = riskDims
      .filter(r => v[r.idx] > 0.7)
      .sort((a, b) => v[b.idx] - v[a.idx])
      .map(r => r.name);

    const overall = riskDims.reduce((max, r) => Math.max(max, v[r.idx]), 0);
    return { overall_risk: round2(overall), top_risks: topRisks };
  }
}

function clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }
function round2(x: number): number { return Math.round(x * 100) / 100; }
function round4(x: number): number { return Math.round(x * 10000) / 10000; }
function cosineSim(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; magA += a[i] * a[i]; magB += b[i] * b[i]; }
  const d = Math.sqrt(magA) * Math.sqrt(magB);
  return d > 0 ? dot / d : 0;
}

export const ppPhysicsConditionEncoderEngine = new PPPhysicsConditionEncoderEngine();
