/**
 * ToolBreakagePredictionEngine — CAMX-MS14/U05 (E1149)
 *
 * Predict tool breakage probability using multiple damage accumulation models.
 * Combines Miner's cumulative damage rule with deflection stress analysis,
 * chip load peak detection, and engagement spike identification.
 *
 * Damage models:
 *   1. Miner's Rule (cumulative fatigue):
 *      D = sum(n_i / N_i) where n_i = cycles at stress_i, N_i = life at stress_i
 *      Failure predicted when D >= 1.0
 *
 *   2. Deflection stress:
 *      sigma_bend = (32 * F * L) / (pi * d^3)   [MPa]
 *      Failure risk increases as sigma_bend approaches sigma_yield
 *
 *   3. Chip load peaks:
 *      Monitor fz_actual vs fz_nominal. Peaks > 1.5x nominal indicate
 *      interrupted cuts, entry/exit shocks, or hard inclusions.
 *
 *   4. Engagement spikes:
 *      Sudden ae changes (corner entry, pocket corner) create force transients.
 *      Spike factor = max_engagement / nominal_engagement
 *
 * Combined breakage probability:
 *   P_break = 1 - (1-P_fatigue) * (1-P_deflection) * (1-P_chipload) * (1-P_engagement)
 *
 * References:
 *   - Miner (1945): "Cumulative Damage in Fatigue"
 *   - Schmitz & Smith (2019): "Machining Dynamics" Ch.6
 *   - ToolDeflectionEngine — deflection calculations
 *   - ToolWearModelEngine — progressive wear tracking
 *   - ISO 8688: Tool life testing for milling
 *
 * @module ToolBreakagePredictionEngine
 * @shortcode E1149
 * @dispatcher camDispatcher
 * @actions tool_breakage_predict, tool_cumulative_damage, tool_breakage_risk
 * @milestone CAMX-MS14/U05
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Miner's damage threshold for failure prediction */
const MINER_FAILURE_THRESHOLD = 1.0;

/** Warning threshold for Miner's damage (80% of life) */
const MINER_WARNING_THRESHOLD = 0.80;

/** Critical deflection stress ratio (sigma/sigma_yield) */
const CRITICAL_STRESS_RATIO = 0.85;

/** Warning deflection stress ratio */
const WARNING_STRESS_RATIO = 0.60;

/** Chip load peak threshold multiplier */
const CHIPLOAD_PEAK_THRESHOLD = 1.5;

/** Severe chip load peak multiplier */
const CHIPLOAD_SEVERE_THRESHOLD = 2.0;

/** Engagement spike warning threshold */
const ENGAGEMENT_SPIKE_WARNING = 1.8;

/** Engagement spike critical threshold */
const ENGAGEMENT_SPIKE_CRITICAL = 2.5;

/** Default carbide yield strength [MPa] */
const DEFAULT_CARBIDE_YIELD_MPA = 3500;

/** Default HSS yield strength [MPa] */
const DEFAULT_HSS_YIELD_MPA = 2000;

/** S-N curve exponent for carbide (Basquin's law) */
const SN_EXPONENT_CARBIDE = -0.08;

/** S-N curve reference cycles (10^6) */
const SN_REFERENCE_CYCLES = 1e6;

/** S-N curve reference stress fraction (endurance limit / yield) */
const ENDURANCE_LIMIT_FRACTION = 0.35;

/** Maximum cumulative damage records to retain */
const MAX_DAMAGE_RECORDS = 500;

// ============================================================================
// TYPES
// ============================================================================

/** Tool definition for breakage prediction */
export interface BreakageTool {
  /** Tool ID */
  tool_id: string;
  /** Tool diameter [mm] */
  diameter_mm: number;
  /** Flute count */
  flute_count: number;
  /** Cutting length / flute length [mm] */
  cutting_length_mm: number;
  /** Gauge length / stickout [mm] */
  gauge_length_mm: number;
  /** Tool material */
  tool_material: "carbide" | "hss" | "cermet" | "ceramic" | "cbn" | "pcd";
  /** Yield strength override [MPa] */
  yield_strength_MPa?: number;
  /** Helix angle [degrees] */
  helix_angle_deg?: number;
  /** Number of previous operations (for fatigue tracking) */
  operations_completed?: number;
}

/** Cutting forces for breakage evaluation */
export interface BreakageForces {
  /** Tangential cutting force Fc [N] */
  Fc_N: number;
  /** Radial force Fr [N] */
  Fr_N?: number;
  /** Axial force Fa [N] */
  Fa_N?: number;
  /** Peak force (transient max) [N] */
  peak_force_N?: number;
  /** Force standard deviation (variability indicator) [N] */
  force_std_N?: number;
}

/** Engagement history entry */
export interface EngagementEntry {
  /** Radial depth of cut ae [mm] */
  ae_mm: number;
  /** Axial depth of cut ap [mm] */
  ap_mm: number;
  /** Feed per tooth fz [mm/tooth] */
  fz_mm: number;
  /** Cutting speed Vc [m/min] */
  Vc_mpm: number;
  /** Duration [min] */
  duration_min: number;
  /** Cutting force during this segment [N] */
  force_N?: number;
  /** Is this an interrupted cut? */
  interrupted?: boolean;
  /** Segment description */
  label?: string;
}

/** Breakage prediction result */
export interface BreakagePrediction {
  /** Overall breakage probability [0-1] */
  breakage_probability: number;
  /** Risk level */
  risk_level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  /** Miner cumulative damage fraction [0-inf] */
  miner_damage: number;
  /** Remaining life estimate [min] */
  remaining_life_min: number;
  /** Deflection stress [MPa] */
  deflection_stress_MPa: number;
  /** Stress ratio (sigma / sigma_yield) */
  stress_ratio: number;
  /** Peak chip load ratio (actual / nominal) */
  peak_chipload_ratio: number;
  /** Max engagement spike factor */
  max_engagement_spike: number;
  /** Individual probability components */
  probabilities: {
    fatigue: number;
    deflection: number;
    chipload: number;
    engagement: number;
  };
  /** Recommendations */
  recommendations: string[];
}

/** Cumulative damage tracker state */
export interface CumulativeDamageState {
  /** Tool ID */
  tool_id: string;
  /** Cumulative Miner damage */
  damage: number;
  /** Total cutting time [min] */
  total_cutting_min: number;
  /** Number of operations */
  operations: number;
  /** Estimated remaining life [min] */
  remaining_life_min: number;
  /** History entries */
  history: Array<{ timestamp: string; damage_increment: number; cumulative: number; label: string }>;
}

// ============================================================================
// ENGINE
// ============================================================================

export class ToolBreakagePredictionEngine {
  /** Cumulative damage tracking per tool */
  private damageTrackers = new Map<string, CumulativeDamageState>();

  /**
   * Predict breakage probability for a tool under given forces and engagement.
   */
  predictBreakage(
    tool: BreakageTool,
    forces: BreakageForces,
    engagement_history?: EngagementEntry[],
  ): BreakagePrediction {
    log.info(`[ToolBreakagePrediction] Predicting breakage for tool ${tool.tool_id} (D=${tool.diameter_mm}mm)`);

    // 1. Deflection stress
    const yieldStrength = tool.yield_strength_MPa ?? this.getDefaultYield(tool.tool_material);
    const deflectionStress = this.computeDeflectionStress(tool, forces);
    const stressRatio = deflectionStress / yieldStrength;
    const pDeflection = this.stressToProb(stressRatio);

    // 2. Miner's cumulative damage
    const { minerDamage, remainingLife } = this.computeMinerDamage(tool, forces, engagement_history);
    const pFatigue = this.minerToProb(minerDamage);

    // 3. Chip load peaks
    const peakRatio = this.computeChiploadPeakRatio(forces, engagement_history);
    const pChipload = this.chiploadToProb(peakRatio);

    // 4. Engagement spikes
    const maxSpike = this.computeEngagementSpike(engagement_history, tool);
    const pEngagement = this.engagementToProb(maxSpike);

    // Combined probability (independent failure modes)
    const pSurvive = (1 - pFatigue) * (1 - pDeflection) * (1 - pChipload) * (1 - pEngagement);
    const pBreak = 1 - pSurvive;

    // Risk level
    let riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
    if (pBreak > 0.7 || stressRatio > CRITICAL_STRESS_RATIO) riskLevel = "CRITICAL";
    else if (pBreak > 0.4 || stressRatio > WARNING_STRESS_RATIO) riskLevel = "HIGH";
    else if (pBreak > 0.15) riskLevel = "MODERATE";
    else riskLevel = "LOW";

    const recommendations = this.generateRecommendations(
      riskLevel, minerDamage, stressRatio, peakRatio, maxSpike, tool,
    );

    return {
      breakage_probability: Math.round(pBreak * 10000) / 10000,
      risk_level: riskLevel,
      miner_damage: Math.round(minerDamage * 10000) / 10000,
      remaining_life_min: Math.round(remainingLife * 10) / 10,
      deflection_stress_MPa: Math.round(deflectionStress * 10) / 10,
      stress_ratio: Math.round(stressRatio * 10000) / 10000,
      peak_chipload_ratio: Math.round(peakRatio * 100) / 100,
      max_engagement_spike: Math.round(maxSpike * 100) / 100,
      probabilities: {
        fatigue: Math.round(pFatigue * 10000) / 10000,
        deflection: Math.round(pDeflection * 10000) / 10000,
        chipload: Math.round(pChipload * 10000) / 10000,
        engagement: Math.round(pEngagement * 10000) / 10000,
      },
      recommendations,
    };
  }

  /**
   * Get cumulative damage state for a tool across multiple operations.
   */
  getCumulativeDamage(tool: BreakageTool, operations: EngagementEntry[]): CumulativeDamageState {
    const key = tool.tool_id;

    if (!this.damageTrackers.has(key)) {
      this.damageTrackers.set(key, {
        tool_id: key,
        damage: 0,
        total_cutting_min: 0,
        operations: 0,
        remaining_life_min: 0,
        history: [],
      });
    }

    const state = this.damageTrackers.get(key)!;
    const yieldStrength = tool.yield_strength_MPa ?? this.getDefaultYield(tool.tool_material);

    for (const op of operations) {
      // Compute stress for this operation
      const force = op.force_N ?? this.estimateForce(op, tool);
      const stress = this.computeStressFromForce(tool, force);
      const stressRatio = stress / yieldStrength;

      // Cycles in this operation: duration * RPM * flute_count
      const rpm = (op.Vc_mpm * 1000) / (Math.PI * tool.diameter_mm);
      const cycles = op.duration_min * rpm * tool.flute_count;

      // Life at this stress level (S-N curve)
      const lifeAtStress = this.snCurveLife(stressRatio);

      // Damage increment
      const damageInc = lifeAtStress > 0 ? cycles / lifeAtStress : 1;

      state.damage += damageInc;
      state.total_cutting_min += op.duration_min;
      state.operations += 1;

      state.history.push({
        timestamp: new Date().toISOString(),
        damage_increment: Math.round(damageInc * 10000) / 10000,
        cumulative: Math.round(state.damage * 10000) / 10000,
        label: op.label ?? `op_${state.operations}`,
      });
    }

    // Trim history
    if (state.history.length > MAX_DAMAGE_RECORDS) {
      state.history = state.history.slice(-MAX_DAMAGE_RECORDS);
    }

    // Estimate remaining life
    if (state.damage > 0 && state.total_cutting_min > 0) {
      const damageRate = state.damage / state.total_cutting_min; // damage per minute
      const remaining = (MINER_FAILURE_THRESHOLD - state.damage) / damageRate;
      state.remaining_life_min = Math.max(0, Math.round(remaining * 10) / 10);
    }

    return { ...state, history: [...state.history] };
  }

  /**
   * Quick breakage risk assessment for a single operation.
   */
  getBreakageRisk(
    tool: BreakageTool,
    operation: EngagementEntry,
  ): { risk: "LOW" | "MODERATE" | "HIGH" | "CRITICAL"; probability: number; limiting_factor: string } {
    const force = operation.force_N ?? this.estimateForce(operation, tool);
    const forces: BreakageForces = { Fc_N: force };

    const prediction = this.predictBreakage(tool, forces, [operation]);

    // Identify limiting factor
    const probs = prediction.probabilities;
    const factors: Array<[string, number]> = [
      ["fatigue", probs.fatigue],
      ["deflection", probs.deflection],
      ["chipload", probs.chipload],
      ["engagement", probs.engagement],
    ];
    factors.sort((a, b) => b[1] - a[1]);

    return {
      risk: prediction.risk_level,
      probability: prediction.breakage_probability,
      limiting_factor: factors[0][0],
    };
  }

  // ── Private Methods ──────────────────────────────────────────────────────

  /** Get default yield strength by tool material */
  private getDefaultYield(material: string): number {
    const yields: Record<string, number> = {
      "carbide": DEFAULT_CARBIDE_YIELD_MPA,
      "hss": DEFAULT_HSS_YIELD_MPA,
      "cermet": 2800,
      "ceramic": 4000,
      "cbn": 4500,
      "pcd": 3800,
    };
    return yields[material] ?? DEFAULT_CARBIDE_YIELD_MPA;
  }

  /** Compute bending deflection stress from forces */
  private computeDeflectionStress(tool: BreakageTool, forces: BreakageForces): number {
    // Bending stress: sigma = (32 * F * L) / (pi * d^3)
    const F = Math.sqrt(forces.Fc_N * forces.Fc_N + (forces.Fr_N ?? 0) * (forces.Fr_N ?? 0));
    const L = tool.gauge_length_mm;
    const d = tool.diameter_mm;

    return (32 * F * L) / (Math.PI * d * d * d);
  }

  /** Compute stress from a single force value */
  private computeStressFromForce(tool: BreakageTool, force: number): number {
    return (32 * force * tool.gauge_length_mm) / (Math.PI * Math.pow(tool.diameter_mm, 3));
  }

  /** Estimate cutting force from engagement parameters (Kienzle-like) */
  private estimateForce(op: EngagementEntry, tool: BreakageTool): number {
    // Simplified: F ~ kc * ap * fz * ae/D
    // Use generic kc = 1500 N/mm2 (medium steel)
    const kc = 1500;
    const ae_ratio = op.ae_mm / tool.diameter_mm;
    return kc * op.ap_mm * op.fz_mm * ae_ratio;
  }

  /** Compute Miner's cumulative damage */
  private computeMinerDamage(
    tool: BreakageTool,
    forces: BreakageForces,
    history?: EngagementEntry[],
  ): { minerDamage: number; remainingLife: number } {
    // Check if we have tracked state
    const tracked = this.damageTrackers.get(tool.tool_id);
    let baseDamage = tracked?.damage ?? 0;

    if (history && history.length > 0) {
      const yieldStrength = tool.yield_strength_MPa ?? this.getDefaultYield(tool.tool_material);

      for (const entry of history) {
        const force = entry.force_N ?? this.estimateForce(entry, tool);
        const stress = this.computeStressFromForce(tool, force);
        const stressRatio = stress / yieldStrength;
        const rpm = (entry.Vc_mpm * 1000) / (Math.PI * tool.diameter_mm);
        const cycles = entry.duration_min * rpm * tool.flute_count;
        const life = this.snCurveLife(stressRatio);
        baseDamage += life > 0 ? cycles / life : 1;
      }
    }

    // Remaining life estimate
    const totalTime = history?.reduce((s, e) => s + e.duration_min, 0) ?? 1;
    const damageRate = baseDamage > 0 ? baseDamage / Math.max(totalTime, 0.01) : 0.001;
    const remaining = (MINER_FAILURE_THRESHOLD - baseDamage) / damageRate;

    return {
      minerDamage: baseDamage,
      remainingLife: Math.max(0, remaining),
    };
  }

  /** S-N curve: cycles to failure at given stress ratio (Basquin's law) */
  private snCurveLife(stressRatio: number): number {
    if (stressRatio <= 0) return Infinity;
    if (stressRatio >= 1) return 0;

    // Below endurance limit: infinite life
    if (stressRatio < ENDURANCE_LIMIT_FRACTION) return Infinity;

    // Basquin: N = N_ref * (sigma_ref / sigma)^(1/b)
    // where b is the S-N exponent
    const invB = 1 / Math.abs(SN_EXPONENT_CARBIDE);
    return SN_REFERENCE_CYCLES * Math.pow(ENDURANCE_LIMIT_FRACTION / stressRatio, invB);
  }

  /** Compute chip load peak ratio from force data */
  private computeChiploadPeakRatio(forces: BreakageForces, history?: EngagementEntry[]): number {
    let ratio = 1.0;

    // From peak force
    if (forces.peak_force_N && forces.Fc_N > 0) {
      ratio = Math.max(ratio, forces.peak_force_N / forces.Fc_N);
    }

    // From force variability
    if (forces.force_std_N && forces.Fc_N > 0) {
      // 3-sigma peak estimate
      const estimated_peak = forces.Fc_N + 3 * forces.force_std_N;
      ratio = Math.max(ratio, estimated_peak / forces.Fc_N);
    }

    // From interrupted cuts in history
    if (history) {
      const interrupted = history.filter(e => e.interrupted);
      if (interrupted.length > 0) {
        // Interrupted cuts typically have 1.5-2x peak loads
        ratio = Math.max(ratio, 1.6);
      }
    }

    return ratio;
  }

  /** Compute maximum engagement spike from history */
  private computeEngagementSpike(history: EngagementEntry[] | undefined, tool: BreakageTool): number {
    if (!history || history.length < 2) return 1.0;

    // Nominal engagement (median ae)
    const aeValues = history.map(e => e.ae_mm).sort((a, b) => a - b);
    const medianAe = aeValues[Math.floor(aeValues.length / 2)];

    if (medianAe <= 0) return 1.0;

    // Find max spike
    let maxSpike = 1.0;
    for (const entry of history) {
      const spike = entry.ae_mm / medianAe;
      maxSpike = Math.max(maxSpike, spike);
    }

    return maxSpike;
  }

  // ── Probability Mapping ──────────────────────────────────────────────────

  /** Map stress ratio to deflection failure probability (sigmoid) */
  private stressToProb(ratio: number): number {
    if (ratio <= 0.3) return 0;
    if (ratio >= 1.0) return 0.99;
    // Sigmoid centered at CRITICAL_STRESS_RATIO
    const x = (ratio - CRITICAL_STRESS_RATIO) * 15;
    return 1 / (1 + Math.exp(-x));
  }

  /** Map Miner damage to fatigue failure probability */
  private minerToProb(damage: number): number {
    if (damage <= 0.3) return damage * 0.05; // Low linear region
    if (damage >= 1.0) return 0.95;
    // Exponential ramp from 0.3 to 1.0
    return 0.015 + (damage - 0.3) / 0.7 * 0.935;
  }

  /** Map chipload peak ratio to probability */
  private chiploadToProb(ratio: number): number {
    if (ratio <= 1.2) return 0;
    if (ratio >= CHIPLOAD_SEVERE_THRESHOLD) return 0.8;
    return (ratio - 1.2) / (CHIPLOAD_SEVERE_THRESHOLD - 1.2) * 0.8;
  }

  /** Map engagement spike to probability */
  private engagementToProb(spike: number): number {
    if (spike <= 1.3) return 0;
    if (spike >= ENGAGEMENT_SPIKE_CRITICAL) return 0.7;
    return (spike - 1.3) / (ENGAGEMENT_SPIKE_CRITICAL - 1.3) * 0.7;
  }

  /** Generate recommendations */
  private generateRecommendations(
    risk: string,
    minerDamage: number,
    stressRatio: number,
    peakRatio: number,
    maxSpike: number,
    tool: BreakageTool,
  ): string[] {
    const recs: string[] = [];

    if (risk === "CRITICAL") {
      recs.push("CRITICAL: Tool breakage imminent. Replace tool immediately.");
    }

    if (minerDamage > MINER_WARNING_THRESHOLD) {
      const pctUsed = Math.round(minerDamage * 100);
      recs.push(`Fatigue life ${pctUsed}% consumed (Miner's rule). Schedule tool change within ${Math.max(1, Math.round((1 - minerDamage) / minerDamage * 100))}% of remaining program.`);
    }

    if (stressRatio > WARNING_STRESS_RATIO) {
      recs.push(`Deflection stress at ${Math.round(stressRatio * 100)}% of yield. Reduce stickout (currently ${tool.gauge_length_mm}mm) or use larger diameter.`);
    }

    if (peakRatio > CHIPLOAD_PEAK_THRESHOLD) {
      recs.push(`Chip load peaks ${peakRatio.toFixed(1)}x nominal. Smooth entry/exit with arc lead-in or reduce feed at interrupted cuts.`);
    }

    if (maxSpike > ENGAGEMENT_SPIKE_WARNING) {
      recs.push(`Engagement spikes ${maxSpike.toFixed(1)}x nominal. Use trochoidal or adaptive toolpath to limit ae variation.`);
    }

    if (recs.length === 0) {
      recs.push("Tool condition within safe operating parameters.");
    }

    return recs;
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────

export const toolBreakagePredictionEngine = new ToolBreakagePredictionEngine();
