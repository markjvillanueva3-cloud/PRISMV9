/**
 * GrindingWheelDressingOptimizationEngine — Wheel life, dressing optimization, tool selection, creep-feed
 *
 * Models: G-ratio (Vol_removed/Vol_worn), linear Ra degradation with passes,
 *         dressing tool selection logic, creep-feed specific energy & burn risk
 * References: Malkin & Guo (2008), Marinescu et al. (2007), ANSI B74.13
 * Safety: Critical for surface integrity — burn risk detection in creep-feed
 */

// ─── Types ─────────────────────────────────────────────────────────

export type WheelBondType = 'vitrified' | 'resinoid' | 'CBN' | 'diamond';
export type DressingApplication = 'roughing' | 'finishing' | 'form';

export interface WheelLifeInput {
  wheel_spec: string;           // e.g. 'WA60K5V'
  workpiece_material: string;
  depth_of_cut_mm: number;
  table_speed_mpm: number;
  wheel_speed_mps: number;
  wheel_diameter_mm: number;
  wheel_width_mm: number;
}

export interface WheelLifeResult {
  g_ratio: number;
  wheel_wear_rate_mm3_per_mm3: number;
  estimated_life_parts: number;
  estimated_life_min: number;
}

export interface DressingIntervalInput extends WheelLifeInput {
  target_Ra_um: number;
  current_wheel_wear_mm: number;
  part_cycle_time_min?: number;
}

export interface DressingIntervalResult {
  optimal_interval_parts: number;
  dressing_depth_mm: number;
  wheel_loss_per_dress_mm: number;
  total_wheel_cost_per_part: number;
}

export interface DressingToolInput {
  wheel_type: WheelBondType;
  application: DressingApplication;
}

export interface DressingToolResult {
  recommended_tool: string;
  traverse_rate_mm_per_rev: number;
  overlap_ratio: number;
  reasoning: string;
}

export interface CreepFeedInput {
  material: string;
  slot_depth_mm: number;
  slot_width_mm: number;
  wheel_diameter_mm: number;
}

export interface CreepFeedResult {
  table_speed_mm_min: number;
  wheel_speed_mps: number;
  coolant_flow_lpm: number;
  expected_specific_energy: number;
  burn_risk: 'low' | 'medium' | 'high';
}

// ─── Constants ─────────────────────────────────────────────────────

/** Base G-ratio by wheel bond type (empirical ranges) */
const BASE_G_RATIO: Record<WheelBondType, number> = {
  vitrified: 40,
  resinoid: 20,
  CBN: 3000,
  diamond: 5000,
};

/** Material difficulty factor for G-ratio — harder = more wheel wear */
const MATERIAL_G_FACTOR: Record<string, number> = {
  'aluminum': 2.5,
  'brass': 2.0,
  'cast_iron': 1.2,
  'carbon_steel': 1.0,
  'alloy_steel': 0.8,
  'stainless_steel': 0.6,
  'tool_steel': 0.5,
  'titanium': 0.35,
  'inconel': 0.25,
  'hardened_steel': 0.4,
  'ceramic': 0.15,
  'tungsten_carbide': 0.1,
};

/** Specific energy by material (J/mm³) for creep-feed */
const SPECIFIC_ENERGY: Record<string, number> = {
  'aluminum': 8,
  'brass': 12,
  'cast_iron': 25,
  'carbon_steel': 35,
  'alloy_steel': 40,
  'stainless_steel': 50,
  'tool_steel': 55,
  'titanium': 60,
  'inconel': 70,
  'hardened_steel': 45,
  'ceramic': 80,
  'tungsten_carbide': 90,
};

/** Ra degradation rate per pass (µm/pass) by wheel grade */
const RA_DEGRADATION_RATE: Record<string, number> = {
  'soft': 0.08,    // grades E-H
  'medium': 0.05,  // grades I-L
  'hard': 0.03,    // grades M-P
  'very_hard': 0.02, // grades Q-Z
};

/** Wheel spec parser: e.g. 'WA60K5V' → { abrasive, grit, grade, structure, bond } */
function parseWheelSpec(spec: string): {
  abrasive: string; grit: number; grade: string;
  structure: number; bond: WheelBondType;
} {
  const s = spec.toUpperCase();
  // Standard wheel marking: [Abrasive][Grit][Grade][Structure][Bond]
  const abrasiveMatch = s.match(/^([A-Z]{1,3})/);
  const gritMatch = s.match(/(\d{2,4})/);
  const remaining = gritMatch ? s.slice((gritMatch.index ?? 0) + gritMatch[0].length) : '';
  const grade = remaining.charAt(0) || 'K';
  const structNum = parseInt(remaining.charAt(1)) || 5;
  const bondChar = remaining.charAt(2) || 'V';

  const bondMap: Record<string, WheelBondType> = {
    'V': 'vitrified', 'B': 'resinoid', 'R': 'resinoid',
    'D': 'diamond', 'M': 'diamond',
  };

  return {
    abrasive: abrasiveMatch?.[1] ?? 'WA',
    grit: gritMatch ? parseInt(gritMatch[0]) : 60,
    grade,
    structure: structNum,
    bond: bondMap[bondChar] ?? 'vitrified',
  };
}

function getGradeCategory(grade: string): string {
  const g = grade.toUpperCase().charCodeAt(0);
  if (g <= 72) return 'soft';       // E-H
  if (g <= 76) return 'medium';     // I-L
  if (g <= 80) return 'hard';       // M-P
  return 'very_hard';               // Q-Z
}

function getMaterialKey(material: string): string {
  const m = material.toLowerCase().replace(/[\s-]+/g, '_');
  for (const key of Object.keys(MATERIAL_G_FACTOR)) {
    if (m.includes(key)) return key;
  }
  return 'carbon_steel';
}

// ─── Engine ────────────────────────────────────────────────────────

export class GrindingWheelDressingOptimizationEngine {
  /**
   * Predict wheel life using G-ratio model.
   * G = Volume_removed / Volume_wheel_worn
   */
  predictWheelLife(input: WheelLifeInput): WheelLifeResult {
    const spec = parseWheelSpec(input.wheel_spec);
    const matKey = getMaterialKey(input.workpiece_material);
    const matFactor = MATERIAL_G_FACTOR[matKey] ?? 1.0;

    // Base G-ratio adjusted by bond type and material
    const baseG = BASE_G_RATIO[spec.bond] ?? 40;
    const g_ratio = baseG * matFactor;

    // Volume removal rate: MRR = ae × b × vw (mm³/min)
    const mrr_mm3_per_min = input.depth_of_cut_mm * input.wheel_width_mm * (input.table_speed_mpm * 1000);

    // Wheel wear volume rate
    const wheel_wear_rate = 1 / g_ratio; // mm³ worn per mm³ removed
    const wheel_wear_vol_per_min = mrr_mm3_per_min * wheel_wear_rate;

    // Wheel volume available (annular ring, assume usable radial depth = 30% of radius)
    const r = input.wheel_diameter_mm / 2;
    const usable_depth = r * 0.3;
    const wheel_volume = Math.PI * ((r ** 2) - ((r - usable_depth) ** 2)) * input.wheel_width_mm;

    const estimated_life_min = wheel_volume / Math.max(wheel_wear_vol_per_min, 1e-12);

    // Assume 1 part per minute as baseline if not given
    const estimated_life_parts = Math.floor(estimated_life_min);

    return {
      g_ratio: Math.round(g_ratio * 100) / 100,
      wheel_wear_rate_mm3_per_mm3: Math.round(wheel_wear_rate * 1e6) / 1e6,
      estimated_life_parts: Math.max(1, estimated_life_parts),
      estimated_life_min: Math.round(estimated_life_min * 100) / 100,
    };
  }

  /**
   * Optimize dressing interval balancing surface quality vs wheel consumption.
   * Ra degrades linearly with passes since last dress.
   */
  optimizeDressingInterval(input: DressingIntervalInput): DressingIntervalResult {
    const spec = parseWheelSpec(input.wheel_spec);
    const gradeCategory = getGradeCategory(spec.grade);
    const degradationRate = RA_DEGRADATION_RATE[gradeCategory] ?? 0.05;

    // Starting Ra after dressing (based on grit size)
    const freshRa = spec.grit >= 400 ? 0.2 : spec.grit >= 200 ? 0.4 : spec.grit >= 100 ? 0.8 : 1.6;

    // Ra after N passes: Ra(N) = freshRa + degradationRate * N
    // Find N where Ra(N) = target_Ra_um
    const allowableRaDelta = Math.max(input.target_Ra_um - freshRa, degradationRate);
    const optimal_interval_parts = Math.max(1, Math.floor(allowableRaDelta / degradationRate));

    // Dressing depth: standard 0.01-0.05mm per dress
    const dressing_depth = spec.bond === 'CBN' || spec.bond === 'diamond' ? 0.005 : 0.02;
    const wheel_loss_per_dress = dressing_depth;

    // Wheel cost model: typical wheel cost spread over total dresses
    const wheelLife = this.predictWheelLife(input);
    const totalDresses = Math.max(1, wheelLife.estimated_life_parts / optimal_interval_parts);
    // Assume wheel cost ~ $200 for vitrified, $2000 for CBN/diamond
    const wheelCost = spec.bond === 'CBN' || spec.bond === 'diamond' ? 2000 : 200;
    const costPerDress = wheelCost / totalDresses;
    const costPerPart = costPerDress / optimal_interval_parts;

    return {
      optimal_interval_parts,
      dressing_depth_mm: Math.round(dressing_depth * 1000) / 1000,
      wheel_loss_per_dress_mm: Math.round(wheel_loss_per_dress * 1000) / 1000,
      total_wheel_cost_per_part: Math.round(costPerPart * 100) / 100,
    };
  }

  /**
   * Select dressing tool based on wheel type and application.
   */
  selectDressingTool(input: DressingToolInput): DressingToolResult {
    const { wheel_type, application } = input;

    // Decision matrix
    if (wheel_type === 'CBN' || wheel_type === 'diamond') {
      // Superabrasive wheels: rotary or crush dressing
      if (application === 'form') {
        return {
          recommended_tool: 'crush_roll_dresser',
          traverse_rate_mm_per_rev: 0.0,  // plunge dress
          overlap_ratio: 1.0,
          reasoning: 'Crush roll dresser replicates form profile on superabrasive wheels with minimal wheel loss.',
        };
      }
      return {
        recommended_tool: 'rotary_diamond_dresser',
        traverse_rate_mm_per_rev: 0.05,
        overlap_ratio: 4.0,
        reasoning: 'Rotary diamond dresser provides controlled dressing of CBN/diamond wheels. Low traverse rate preserves wheel life.',
      };
    }

    if (application === 'form') {
      return {
        recommended_tool: 'form_roll_dresser',
        traverse_rate_mm_per_rev: 0.0,  // plunge
        overlap_ratio: 1.0,
        reasoning: 'Form roll dresser (CNC or profiled) reproduces complex forms on vitrified/resinoid wheels accurately.',
      };
    }

    if (application === 'finishing') {
      return {
        recommended_tool: 'single_point_diamond',
        traverse_rate_mm_per_rev: 0.05,
        overlap_ratio: 5.0,
        reasoning: 'Single-point diamond provides finest surface on wheel face. High overlap ratio for finish quality.',
      };
    }

    // Roughing on vitrified/resinoid
    if (wheel_type === 'resinoid') {
      return {
        recommended_tool: 'blade_dresser',
        traverse_rate_mm_per_rev: 0.15,
        overlap_ratio: 2.0,
        reasoning: 'Blade dresser is economical for resinoid wheels in roughing. Higher traverse rate for aggressive dressing.',
      };
    }

    return {
      recommended_tool: 'multi_point_diamond',
      traverse_rate_mm_per_rev: 0.10,
      overlap_ratio: 3.0,
      reasoning: 'Multi-point diamond (cluster/Fliesen) is versatile for vitrified wheels in roughing. Good balance of cost and wheel life.',
    };
  }

  /**
   * Creep-feed grinding parameter setup.
   * Low table speed, full-depth cut, high coolant flow.
   */
  creepFeedSetup(input: CreepFeedInput): CreepFeedResult {
    const matKey = getMaterialKey(input.material);
    const specificEnergy = SPECIFIC_ENERGY[matKey] ?? 40; // J/mm³

    // Creep-feed: very low table speed (50-500 mm/min typically)
    // Base speed inversely proportional to depth and specific energy
    const depthFactor = Math.max(0.1, 1 - (input.slot_depth_mm / 20)); // deeper = slower
    const energyFactor = 40 / specificEnergy; // harder material = slower
    const baseSpeed = 300; // mm/min reference
    const table_speed = Math.max(20, Math.min(500, baseSpeed * depthFactor * energyFactor));

    // Wheel speed: 25-35 m/s for creep-feed (lower than conventional to manage heat)
    const wheel_speed = Math.min(35, Math.max(25, 30 * energyFactor));

    // MRR for specific energy calculation
    const mrr = input.slot_depth_mm * input.slot_width_mm * table_speed; // mm³/min
    const power_w = specificEnergy * mrr / 60; // W

    // Coolant flow: ~2 L/min per kW of grinding power (Malkin recommendation)
    const power_kw = power_w / 1000;
    const coolant_flow = Math.max(5, Math.round(power_kw * 2 * 10) / 10);

    // Burn risk: heat flux proxy q'' = u · ae · vw / (60 · lc)  [W/mm² = J/(mm²·s)]
    // Contact length lc = √(ae · ds) per Malkin & Guo "Grinding Technology" (2008) §6.3
    // Thresholds calibrated against Malkin §6.3 Table 6.2:
    //   q'' > 50 W/mm² → high risk (phase transformation / rehardening burn)
    //   q'' > 25 W/mm² → medium risk (temper softening likely)
    //   q'' ≤ 25 W/mm² → low risk
    const contactLength = Math.sqrt(input.slot_depth_mm * input.wheel_diameter_mm); // mm
    const heatFluxProxy = specificEnergy * input.slot_depth_mm * table_speed / (60 * contactLength); // W/mm²

    let burn_risk: 'low' | 'medium' | 'high';
    if (heatFluxProxy > 50) burn_risk = 'high';
    else if (heatFluxProxy > 25) burn_risk = 'medium';
    else burn_risk = 'low';

    return {
      table_speed_mm_min: Math.round(table_speed * 10) / 10,
      wheel_speed_mps: Math.round(wheel_speed * 10) / 10,
      coolant_flow_lpm: Math.round(coolant_flow * 10) / 10,
      expected_specific_energy: Math.round(specificEnergy * 100) / 100,
      burn_risk,
    };
  }
}

export const grindingWheelDressingOptimizationEngine = new GrindingWheelDressingOptimizationEngine();
