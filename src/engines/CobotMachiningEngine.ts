/**
 * CobotMachiningEngine — Collaborative Robot Machining Safety & Planning
 *
 * ISO 10218-2 / ISO/TS 15066 compliant safety assessment for cobot machining.
 * Embedded database of popular cobots (UR, FANUC, ABB, KUKA).
 * Task planning with payload/reach validation and force limit calculations.
 *
 * @engine CobotMachiningEngine
 * @dispatcher machineSetupDispatcher
 * @actions cobot_assess_safety, cobot_plan_task, cobot_select
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface CobotSpec {
  id: string;
  name: string;
  manufacturer: string;
  payload_kg: number;
  reach_mm: number;
  max_speed_mm_s: number;
  repeatability_mm: number;
  weight_kg: number;
  ip_rating: string;
  force_limit_N: number;         // ISO/TS 15066 max transient contact force
  pressure_limit_N_cm2: number;  // ISO/TS 15066 max quasi-static pressure
  power_limit_W: number;         // Power and force limiting (PFL) threshold
  joints: number;
  price_range_usd: string;
  price_min_usd: number;
  machining_notes: string;
}

export interface SafetyAssessment {
  safe: boolean;
  force_limit_N: number;
  speed_limit_mm_s: number;
  required_safety_zone_m: number;
  risk_level: 'low' | 'medium' | 'high';
  ppe_required: string[];
  iso_references: string[];
  warnings: string[];
  mitigations: string[];
}

export interface TaskPlan {
  feasible: boolean;
  max_cutting_force_N: number;
  recommended_speed_pct: number;
  cycle_time_multiplier: number;
  limitations: string[];
  recommendations: string[];
  payload_margin_kg: number;
  reach_margin_mm: number;
}

export interface CobotRecommendation {
  cobot: CobotSpec;
  score: number;
  reasons: string[];
  limitations: string[];
}

// ── Embedded Cobot Database ────────────────────────────────────────────

const COBOTS: CobotSpec[] = [
  {
    id: 'ur5e', name: 'UR5e', manufacturer: 'Universal Robots',
    payload_kg: 5, reach_mm: 850, max_speed_mm_s: 1000,
    repeatability_mm: 0.03, weight_kg: 20.6, ip_rating: 'IP54',
    force_limit_N: 150, pressure_limit_N_cm2: 28,
    power_limit_W: 80, joints: 6,
    price_range_usd: '$25000-35000', price_min_usd: 25000,
    machining_notes: 'Light deburring, polishing, drilling soft materials'
  },
  {
    id: 'ur10e', name: 'UR10e', manufacturer: 'Universal Robots',
    payload_kg: 12.5, reach_mm: 1300, max_speed_mm_s: 1000,
    repeatability_mm: 0.05, weight_kg: 33.5, ip_rating: 'IP54',
    force_limit_N: 150, pressure_limit_N_cm2: 28,
    power_limit_W: 80, joints: 6,
    price_range_usd: '$35000-50000', price_min_usd: 35000,
    machining_notes: 'Medium deburring, light milling aluminum, polishing'
  },
  {
    id: 'ur16e', name: 'UR16e', manufacturer: 'Universal Robots',
    payload_kg: 16, reach_mm: 900, max_speed_mm_s: 1000,
    repeatability_mm: 0.05, weight_kg: 33.1, ip_rating: 'IP54',
    force_limit_N: 150, pressure_limit_N_cm2: 28,
    power_limit_W: 80, joints: 6,
    price_range_usd: '$40000-55000', price_min_usd: 40000,
    machining_notes: 'Heavy deburring, machine tending, heavier spindles'
  },
  {
    id: 'ur20', name: 'UR20', manufacturer: 'Universal Robots',
    payload_kg: 20, reach_mm: 1750, max_speed_mm_s: 1000,
    repeatability_mm: 0.05, weight_kg: 64, ip_rating: 'IP54',
    force_limit_N: 150, pressure_limit_N_cm2: 28,
    power_limit_W: 80, joints: 6,
    price_range_usd: '$50000-65000', price_min_usd: 50000,
    machining_notes: 'Large reach applications, heavy spindle mounting'
  },
  {
    id: 'fanuc-crx-10ia', name: 'CRX-10iA', manufacturer: 'FANUC',
    payload_kg: 10, reach_mm: 1249, max_speed_mm_s: 1000,
    repeatability_mm: 0.04, weight_kg: 40, ip_rating: 'IP67',
    force_limit_N: 120, pressure_limit_N_cm2: 25,
    power_limit_W: 70, joints: 6,
    price_range_usd: '$30000-45000', price_min_usd: 30000,
    machining_notes: 'IP67 suited for coolant environments, robust'
  },
  {
    id: 'fanuc-crx-25ia', name: 'CRX-25iA', manufacturer: 'FANUC',
    payload_kg: 25, reach_mm: 1889, max_speed_mm_s: 750,
    repeatability_mm: 0.04, weight_kg: 66, ip_rating: 'IP67',
    force_limit_N: 150, pressure_limit_N_cm2: 28,
    power_limit_W: 80, joints: 6,
    price_range_usd: '$55000-75000', price_min_usd: 55000,
    machining_notes: 'Heavy payload, large reach, IP67 for wet machining'
  },
  {
    id: 'abb-gofa-5', name: 'GoFa CRB 15005', manufacturer: 'ABB',
    payload_kg: 5, reach_mm: 950, max_speed_mm_s: 2200,
    repeatability_mm: 0.02, weight_kg: 27, ip_rating: 'IP54',
    force_limit_N: 110, pressure_limit_N_cm2: 22,
    power_limit_W: 60, joints: 6,
    price_range_usd: '$25000-40000', price_min_usd: 25000,
    machining_notes: 'High speed, good repeatability, light finishing'
  },
  {
    id: 'abb-gofa-10', name: 'GoFa CRB 15010', manufacturer: 'ABB',
    payload_kg: 10, reach_mm: 1200, max_speed_mm_s: 2000,
    repeatability_mm: 0.02, weight_kg: 35, ip_rating: 'IP54',
    force_limit_N: 130, pressure_limit_N_cm2: 25,
    power_limit_W: 70, joints: 6,
    price_range_usd: '$35000-50000', price_min_usd: 35000,
    machining_notes: 'Fast, precise, medium-duty deburring/polishing'
  },
  {
    id: 'kuka-lbr-iiwa-7', name: 'LBR iiwa 7 R800',
    manufacturer: 'KUKA',
    payload_kg: 7, reach_mm: 800, max_speed_mm_s: 1000,
    repeatability_mm: 0.1, weight_kg: 23.9, ip_rating: 'IP54',
    force_limit_N: 100, pressure_limit_N_cm2: 20,
    power_limit_W: 50, joints: 7,
    price_range_usd: '$40000-60000', price_min_usd: 40000,
    machining_notes: '7-axis, excellent force sensing, research/precision'
  },
  {
    id: 'kuka-lbr-iiwa-14', name: 'LBR iiwa 14 R820',
    manufacturer: 'KUKA',
    payload_kg: 14, reach_mm: 820, max_speed_mm_s: 1000,
    repeatability_mm: 0.15, weight_kg: 29.9, ip_rating: 'IP54',
    force_limit_N: 140, pressure_limit_N_cm2: 26,
    power_limit_W: 75, joints: 7,
    price_range_usd: '$55000-75000', price_min_usd: 55000,
    machining_notes: '7-axis, heavy payload, torque sensors per joint'
  },
  {
    id: 'doosan-m1013', name: 'M1013', manufacturer: 'Doosan Robotics',
    payload_kg: 10, reach_mm: 1300, max_speed_mm_s: 1000,
    repeatability_mm: 0.05, weight_kg: 33, ip_rating: 'IP54',
    force_limit_N: 130, pressure_limit_N_cm2: 25,
    power_limit_W: 70, joints: 6,
    price_range_usd: '$30000-45000', price_min_usd: 30000,
    machining_notes: '6 torque sensors, collision detection, affordable'
  },
  {
    id: 'techman-tm12', name: 'TM12', manufacturer: 'Techman Robot',
    payload_kg: 12, reach_mm: 1300, max_speed_mm_s: 1100,
    repeatability_mm: 0.05, weight_kg: 33.3, ip_rating: 'IP54',
    force_limit_N: 130, pressure_limit_N_cm2: 24,
    power_limit_W: 70, joints: 6,
    price_range_usd: '$28000-40000', price_min_usd: 28000,
    machining_notes: 'Built-in vision, good value, deburring/polishing'
  },
];

// ISO/TS 15066 body region force/pressure limits (quasi-static)
const ISO_15066_BODY_LIMITS: Record<string, {
  force_N: number;
  pressure_N_cm2: number;
}> = {
  'skull_forehead':  { force_N: 130, pressure_N_cm2: 28 },
  'face':            { force_N: 65,  pressure_N_cm2: 11 },
  'neck_side':       { force_N: 150, pressure_N_cm2: 28 },
  'back_shoulders':  { force_N: 210, pressure_N_cm2: 36 },
  'chest':           { force_N: 140, pressure_N_cm2: 24 },
  'abdomen':         { force_N: 110, pressure_N_cm2: 18 },
  'upper_arm':       { force_N: 150, pressure_N_cm2: 28 },
  'forearm':         { force_N: 160, pressure_N_cm2: 30 },
  'hand_fingers':    { force_N: 140, pressure_N_cm2: 30 },
  'thigh_knee':      { force_N: 220, pressure_N_cm2: 36 },
  'lower_leg':       { force_N: 130, pressure_N_cm2: 28 },
};

// Operation-specific risk parameters
const OPERATION_RISKS: Record<string, {
  base_risk: 'low' | 'medium' | 'high';
  chip_hazard: boolean;
  noise_hazard: boolean;
  coolant_hazard: boolean;
  force_factor: number; // multiplier on cutting force for safety margin
}> = {
  'deburring':       { base_risk: 'low',    chip_hazard: true,  noise_hazard: false, coolant_hazard: false, force_factor: 1.2 },
  'polishing':       { base_risk: 'low',    chip_hazard: false, noise_hazard: false, coolant_hazard: false, force_factor: 1.1 },
  'grinding':        { base_risk: 'medium', chip_hazard: true,  noise_hazard: true,  coolant_hazard: true,  force_factor: 1.5 },
  'drilling':        { base_risk: 'medium', chip_hazard: true,  noise_hazard: true,  coolant_hazard: true,  force_factor: 1.8 },
  'milling':         { base_risk: 'high',   chip_hazard: true,  noise_hazard: true,  coolant_hazard: true,  force_factor: 2.0 },
  'tapping':         { base_risk: 'medium', chip_hazard: true,  noise_hazard: false, coolant_hazard: true,  force_factor: 1.5 },
  'chamfering':      { base_risk: 'low',    chip_hazard: true,  noise_hazard: false, coolant_hazard: false, force_factor: 1.2 },
  'sanding':         { base_risk: 'low',    chip_hazard: false, noise_hazard: true,  coolant_hazard: false, force_factor: 1.1 },
  'machine_tending': { base_risk: 'low',    chip_hazard: false, noise_hazard: false, coolant_hazard: false, force_factor: 1.0 },
  'inspection':      { base_risk: 'low',    chip_hazard: false, noise_hazard: false, coolant_hazard: false, force_factor: 1.0 },
};

// Material cutting force baseline (N) for 1mm depth, 0.1mm/rev feed
const MATERIAL_FORCE_BASELINE: Record<string, number> = {
  'aluminum': 25,
  'brass': 30,
  'plastic': 10,
  'wood': 8,
  'steel': 60,
  'stainless_steel': 70,
  'cast_iron': 50,
  'titanium': 80,
  'copper': 28,
  'composite': 15,
};

// ── Engine Class ───────────────────────────────────────────────────────

class CobotMachiningEngine {
  /**
   * ISO 10218-2 / ISO/TS 15066 safety assessment.
   */
  assessSafety(input: {
    cobot_model: string;
    operation: string;
    tool_rpm: number;
    cutting_force_N: number;
    operator_distance_m: number;
  }): SafetyAssessment {
    const cobot = COBOTS.find(
      c => c.id === input.cobot_model
        || c.name.toLowerCase() === input.cobot_model.toLowerCase()
    );

    const warnings: string[] = [];
    const mitigations: string[] = [];
    const iso_refs = ['ISO 10218-1:2011', 'ISO 10218-2:2011', 'ISO/TS 15066:2016'];

    // Default cobot limits if model not found
    const forceLimit = cobot?.force_limit_N ?? 150;
    const powerLimit = cobot?.power_limit_W ?? 80;
    const maxSpeed = cobot?.max_speed_mm_s ?? 1000;

    if (!cobot) {
      warnings.push(
        `Cobot '${input.cobot_model}' not in database. `
        + `Using conservative defaults. Available: ${COBOTS.map(c => c.id).join(', ')}`
      );
    }

    const opRisk = OPERATION_RISKS[input.operation.toLowerCase()]
      ?? OPERATION_RISKS['milling']; // default to highest risk

    if (!OPERATION_RISKS[input.operation.toLowerCase()]) {
      warnings.push(
        `Operation '${input.operation}' not recognized. `
        + `Defaulting to highest risk profile (milling).`
      );
    }

    // Force check: cutting_force * safety_factor vs ISO limit
    const effectiveForce = input.cutting_force_N * opRisk.force_factor;
    const forceOk = effectiveForce <= forceLimit;

    // Speed limit based on distance (ISO/TS 15066 — speed/separation)
    // At <0.5m: max 250 mm/s; 0.5-1.0m: max 500 mm/s; >1.0m: full speed
    let speedLimit: number;
    if (input.operator_distance_m < 0.3) {
      speedLimit = Math.min(150, maxSpeed);
    } else if (input.operator_distance_m < 0.5) {
      speedLimit = Math.min(250, maxSpeed);
    } else if (input.operator_distance_m < 1.0) {
      speedLimit = Math.min(500, maxSpeed);
    } else {
      speedLimit = maxSpeed;
    }

    // Safety zone calculation (minimum separation distance per ISO/TS 15066)
    // S = Sh + Sr + Ss + C + Zd + Zr
    // Simplified: base 0.3m + speed-dependent + reaction time
    const reactionTime_s = 0.5; // typical safety-rated monitored stop
    const maxToolSpeed_mm_s = (input.tool_rpm * Math.PI * 12) / 60; // assume 12mm tool
    const stoppingDistance_m = (speedLimit * reactionTime_s) / 1000;
    const requiredZone = Math.max(0.3, stoppingDistance_m + 0.2);

    // Risk level
    let riskLevel: 'low' | 'medium' | 'high' = opRisk.base_risk;
    if (!forceOk) riskLevel = 'high';
    if (input.operator_distance_m < 0.3) riskLevel = 'high';
    if (input.tool_rpm > 10000 && input.operator_distance_m < 1.0) {
      riskLevel = 'high';
    }

    // PPE requirements
    const ppe: string[] = [];
    ppe.push('safety_glasses');
    if (opRisk.chip_hazard) ppe.push('face_shield');
    if (opRisk.noise_hazard) ppe.push('hearing_protection');
    if (opRisk.coolant_hazard) ppe.push('chemical_resistant_gloves');
    if (riskLevel === 'high') ppe.push('cut_resistant_gloves');
    if (input.tool_rpm > 5000) ppe.push('safety_shoes');

    // Safety checks
    const safe = forceOk
      && input.operator_distance_m >= requiredZone
      && riskLevel !== 'high';

    if (!forceOk) {
      warnings.push(
        `Effective force (${effectiveForce.toFixed(0)}N) exceeds `
        + `ISO/TS 15066 limit (${forceLimit}N).`
      );
      mitigations.push('Reduce depth of cut or feed rate to lower forces');
      mitigations.push('Use power and force limiting (PFL) mode');
    }

    if (input.operator_distance_m < requiredZone) {
      warnings.push(
        `Operator distance (${input.operator_distance_m}m) below `
        + `required safety zone (${requiredZone.toFixed(2)}m).`
      );
      mitigations.push('Increase operator standoff distance');
      mitigations.push('Install safety-rated laser scanner for zone monitoring');
    }

    if (input.tool_rpm > 15000) {
      warnings.push('High spindle RPM increases chip ejection hazard');
      mitigations.push('Install chip guard / enclosure around cutting zone');
    }

    // Power check
    const estimatedPower = (effectiveForce * speedLimit) / 1000;
    if (estimatedPower > powerLimit) {
      warnings.push(
        `Estimated contact power (${estimatedPower.toFixed(0)}W) exceeds `
        + `PFL threshold (${powerLimit}W).`
      );
      mitigations.push('Reduce feed rate or cutting speed');
    }

    return {
      safe,
      force_limit_N: forceLimit,
      speed_limit_mm_s: speedLimit,
      required_safety_zone_m: Math.round(requiredZone * 100) / 100,
      risk_level: riskLevel,
      ppe_required: ppe,
      iso_references: iso_refs,
      warnings,
      mitigations,
    };
  }

  /**
   * Plan a machining task with payload/reach/force validation.
   */
  planMachiningTask(input: {
    cobot_payload_kg: number;
    spindle_weight_kg: number;
    part_material: string;
    operation: string;
    reach_mm: number;
  }): TaskPlan {
    const limitations: string[] = [];
    const recommendations: string[] = [];

    // Find a matching cobot by payload (closest)
    const matchingCobots = COBOTS.filter(
      c => c.payload_kg >= input.cobot_payload_kg * 0.8
    );

    // Payload check
    const payloadMargin = input.cobot_payload_kg - input.spindle_weight_kg;
    const feasiblePayload = payloadMargin > 0;

    if (!feasiblePayload) {
      limitations.push(
        `Spindle (${input.spindle_weight_kg}kg) exceeds `
        + `payload capacity (${input.cobot_payload_kg}kg)`
      );
    } else if (payloadMargin < input.spindle_weight_kg * 0.2) {
      limitations.push(
        `Payload margin only ${payloadMargin.toFixed(1)}kg — `
        + `workpiece weight will further reduce margin`
      );
    }

    // Reach check
    const bestCobot = matchingCobots.find(
      c => c.payload_kg >= input.cobot_payload_kg
    ) ?? matchingCobots[0];
    const cobotReach = bestCobot?.reach_mm ?? 1000;
    const reachMargin = cobotReach - input.reach_mm;
    const feasibleReach = reachMargin >= 0;

    if (!feasibleReach) {
      limitations.push(
        `Required reach (${input.reach_mm}mm) exceeds `
        + `cobot reach (${cobotReach}mm)`
      );
    }

    // Material force estimation
    const mat = input.part_material.toLowerCase().replace(/\s+/g, '_');
    const baseForce = MATERIAL_FORCE_BASELINE[mat] ?? 40;
    const opRisk = OPERATION_RISKS[input.operation.toLowerCase()]
      ?? OPERATION_RISKS['milling'];
    const maxCuttingForce = baseForce * opRisk.force_factor * 5; // 5mm depth

    // Speed recommendation (reduce speed for harder materials)
    let speedPct = 100;
    if (baseForce > 50) {
      speedPct = 60; // hard materials
      recommendations.push('Use reduced speed for hard material');
    } else if (baseForce > 30) {
      speedPct = 80;
      recommendations.push('Moderate speed suitable for this material');
    }

    // Force limit check against typical cobot limits
    const typicalForceLimit = bestCobot?.force_limit_N ?? 150;
    if (maxCuttingForce > typicalForceLimit) {
      limitations.push(
        `Estimated max cutting force (${maxCuttingForce.toFixed(0)}N) `
        + `may exceed cobot force limit (${typicalForceLimit}N). `
        + `Reduce depth of cut.`
      );
      speedPct = Math.min(speedPct, 50);
    }

    // Cycle time multiplier (cobot machining is slower than dedicated CNC)
    let cycleMultiplier = 2.0; // base: cobot is ~2x slower
    if (opRisk.base_risk === 'high') cycleMultiplier = 3.0;
    if (opRisk.base_risk === 'low') cycleMultiplier = 1.5;
    if (speedPct < 80) cycleMultiplier *= (100 / speedPct);

    // General recommendations
    if (opRisk.coolant_hazard && bestCobot?.ip_rating === 'IP54') {
      recommendations.push(
        'IP54 cobot — use MQL instead of flood coolant, '
        + 'or add protective sleeve'
      );
    }
    recommendations.push('Use force-torque sensor for adaptive feed control');
    recommendations.push('Program teach-by-demonstration for complex paths');

    const feasible = feasiblePayload && feasibleReach;

    return {
      feasible,
      max_cutting_force_N: Math.round(maxCuttingForce),
      recommended_speed_pct: speedPct,
      cycle_time_multiplier: Math.round(cycleMultiplier * 10) / 10,
      limitations,
      recommendations,
      payload_margin_kg: Math.round(payloadMargin * 10) / 10,
      reach_margin_mm: Math.round(reachMargin),
    };
  }

  /**
   * Select best cobot for an application.
   */
  selectCobot(input: {
    application: string;
    payload_needed_kg: number;
    reach_needed_mm: number;
    budget?: number;
  }): { recommendations: CobotRecommendation[] } {
    const scored: CobotRecommendation[] = [];

    for (const cobot of COBOTS) {
      let score = 50;
      const reasons: string[] = [];
      const limitations: string[] = [];

      // Payload check
      if (cobot.payload_kg >= input.payload_needed_kg) {
        const margin = cobot.payload_kg - input.payload_needed_kg;
        score += 20;
        reasons.push(
          `Payload ${cobot.payload_kg}kg `
          + `(${margin.toFixed(1)}kg margin)`
        );
      } else {
        score -= 30;
        limitations.push(
          `Payload ${cobot.payload_kg}kg < `
          + `needed ${input.payload_needed_kg}kg`
        );
      }

      // Reach check
      if (cobot.reach_mm >= input.reach_needed_mm) {
        score += 15;
        reasons.push(`Reach ${cobot.reach_mm}mm sufficient`);
      } else {
        score -= 25;
        limitations.push(
          `Reach ${cobot.reach_mm}mm < `
          + `needed ${input.reach_needed_mm}mm`
        );
      }

      // Budget
      if (input.budget != null) {
        if (cobot.price_min_usd <= input.budget) {
          score += 10;
          reasons.push(`Within budget at ${cobot.price_range_usd}`);
        } else {
          score -= 20;
          limitations.push(
            `Price ${cobot.price_range_usd} exceeds budget`
          );
        }
      }

      // Application-specific scoring
      const app = input.application.toLowerCase();
      if (app.includes('deburr') || app.includes('polish')) {
        if (cobot.repeatability_mm <= 0.05) {
          score += 10;
          reasons.push('Good repeatability for finishing');
        }
      }
      if (app.includes('mill') || app.includes('drill')) {
        if (cobot.payload_kg >= 10) {
          score += 5;
          reasons.push('Adequate payload for spindle mounting');
        }
        if (cobot.force_limit_N >= 140) {
          score += 5;
          reasons.push('Higher force limit for cutting ops');
        }
      }
      if (app.includes('wet') || app.includes('coolant')) {
        if (cobot.ip_rating === 'IP67') {
          score += 15;
          reasons.push(`${cobot.ip_rating} — coolant resistant`);
        } else {
          limitations.push(
            `${cobot.ip_rating} may not withstand coolant exposure`
          );
        }
      }
      if (app.includes('precision') || app.includes('inspection')) {
        if (cobot.repeatability_mm <= 0.03) {
          score += 10;
          reasons.push(
            `Excellent repeatability: ${cobot.repeatability_mm}mm`
          );
        }
      }

      // 7-axis bonus for complex paths
      if (cobot.joints === 7) {
        score += 5;
        reasons.push('7-axis — improved reachability & singularity avoidance');
      }

      scored.push({
        cobot,
        score: Math.max(0, Math.min(100, score)),
        reasons,
        limitations,
      });
    }

    scored.sort((a, b) => b.score - a.score);
    return { recommendations: scored.slice(0, 6) };
  }

  /**
   * List all cobots in the database.
   */
  listCobots(): {
    cobots: Array<{
      id: string; name: string; manufacturer: string;
      payload_kg: number; reach_mm: number; price_range_usd: string;
    }>;
    count: number;
  } {
    return {
      cobots: COBOTS.map(c => ({
        id: c.id, name: c.name, manufacturer: c.manufacturer,
        payload_kg: c.payload_kg, reach_mm: c.reach_mm,
        price_range_usd: c.price_range_usd,
      })),
      count: COBOTS.length,
    };
  }

  /**
   * Generic calculate() entry point for dispatcher.
   */
  calculate(params: Record<string, any>): any {
    const method = params.method as string;
    switch (method) {
      case 'assess_safety': return this.assessSafety(params as any);
      case 'plan_task': return this.planMachiningTask(params as any);
      case 'select': return this.selectCobot(params as any);
      case 'list': return this.listCobots();
      default:
        return {
          error: `Unknown method '${method}'. `
            + `Available: assess_safety, plan_task, select, list`,
        };
    }
  }
}

export const cobotMachiningEngine = new CobotMachiningEngine();
export { CobotMachiningEngine };
