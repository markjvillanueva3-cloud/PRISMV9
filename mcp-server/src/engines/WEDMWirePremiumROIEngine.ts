/**
 * WEDMWirePremiumROIEngine — Premium Wire ROI Calculator
 * WEDM-P2P-PRODUCTION-MS0 U-PROD-20
 *
 * Calculates return on investment for premium wire selection.
 * Compares speed gains vs cost premiums to find optimal wire choice.
 *
 * ECONOMICS:
 *   ROI = (time_saved × machine_rate - wire_cost_premium) / wire_cost_premium
 *   Breakeven = wire_cost_premium / (speed_gain × machine_rate)
 *
 * SOURCES:
 *   - Bedra Berkenhoff wire specifications 2023
 *   - Thermocompact EDM wire data sheets
 *   - JM Die internal cost tracking (2024)
 */

import { WIRE_SPECS } from '../data/wire-spec-sheets.js';

// ============================================================================
// TYPES
// ============================================================================

export interface AtomicValue<T = number> {
  value: T;
  unit: string;
  uncertainty: number;
  confidence: number;
  source: string;
  warning?: string;
}

export type WireClass = 'standard_brass' | 'zinc_coated' | 'gamma_coated' | 'diffusion_annealed' | 'moly' | 'tungsten';

export interface WirePremiumROIInput {
  material: string;
  thickness_mm: number;
  cut_length_mm: number;
  current_wire_class: WireClass;
  candidate_wire_class: WireClass;
  machine_hourly_rate_usd: number;
  wire_diameter_mm?: number;
  batch_quantity?: number;
}

export interface WirePremiumROIResult {
  current_wire: WireAnalysis;
  candidate_wire: WireAnalysis;
  time_saved_min: AtomicValue;
  wire_cost_difference_usd: AtomicValue;
  net_savings_usd: AtomicValue;
  roi_percent: AtomicValue;
  breakeven_cut_length_mm: AtomicValue;
  recommendation: 'UPGRADE' | 'STAY' | 'MARGINAL';
  reasoning: string[];
}

export interface WireAnalysis {
  wire_class: WireClass;
  cutting_speed_mm_min: AtomicValue;
  wire_cost_per_m_usd: AtomicValue;
  estimated_cut_time_min: AtomicValue;
  estimated_wire_cost_usd: AtomicValue;
}

// ============================================================================
// WIRE CLASS DATA (from manufacturers)
// ============================================================================

interface WireClassData {
  speed_factor: number;
  cost_per_m_usd: number;
  typical_applications: string[];
  break_resistance: number;  // 1-10 scale
}

const WIRE_CLASS_DATA: Record<WireClass, WireClassData> = {
  standard_brass: {
    speed_factor: 1.0,
    cost_per_m_usd: 0.008,
    typical_applications: ['general purpose', 'cost-sensitive jobs'],
    break_resistance: 5,
  },
  zinc_coated: {
    speed_factor: 1.15,
    cost_per_m_usd: 0.012,
    typical_applications: ['faster cutting', 'improved surface finish'],
    break_resistance: 6,
  },
  gamma_coated: {
    speed_factor: 1.25,
    cost_per_m_usd: 0.018,
    typical_applications: ['high speed', 'thick cuts', 'production runs'],
    break_resistance: 7,
  },
  diffusion_annealed: {
    speed_factor: 1.30,
    cost_per_m_usd: 0.022,
    typical_applications: ['maximum speed', 'tight tolerances', 'hard materials'],
    break_resistance: 8,
  },
  moly: {
    speed_factor: 0.7,
    cost_per_m_usd: 0.045,
    typical_applications: ['micro EDM', 'fine features', 'thin sections'],
    break_resistance: 4,
  },
  tungsten: {
    speed_factor: 0.5,
    cost_per_m_usd: 0.120,
    typical_applications: ['ultra-fine features', 'sub-0.1mm slots'],
    break_resistance: 3,
  },
};

// Base cutting speeds by material (mm/min for standard brass at 25mm thickness)
const BASE_CUTTING_SPEEDS: Record<string, number> = {
  steel: 3.5,
  tool_steel: 3.2,
  stainless_steel: 2.8,
  aluminum: 5.5,
  copper: 4.8,
  brass: 5.0,
  tungsten_carbide: 1.2,
  titanium: 2.0,
  inconel: 1.8,
  graphite: 6.0,
  hardened_steel: 2.5,
  pcd: 0.4,
};

// ============================================================================
// ENGINE
// ============================================================================

class WEDMWirePremiumROIEngine {
  /**
   * Calculate ROI for switching to a different wire class
   */
  calculate(input: WirePremiumROIInput): WirePremiumROIResult {
    const {
      material,
      thickness_mm,
      cut_length_mm,
      current_wire_class,
      candidate_wire_class,
      machine_hourly_rate_usd,
      wire_diameter_mm = 0.25,
      batch_quantity = 1,
    } = input;

    const totalCutLength = cut_length_mm * batch_quantity;

    // Analyze current wire
    const currentAnalysis = this.analyzeWire(
      current_wire_class,
      material,
      thickness_mm,
      totalCutLength,
      wire_diameter_mm
    );

    // Analyze candidate wire
    const candidateAnalysis = this.analyzeWire(
      candidate_wire_class,
      material,
      thickness_mm,
      totalCutLength,
      wire_diameter_mm
    );

    // Calculate time difference
    const timeSavedMin = currentAnalysis.estimated_cut_time_min.value -
      candidateAnalysis.estimated_cut_time_min.value;

    // Calculate cost difference (positive = candidate costs more)
    const wireCostDiff = candidateAnalysis.estimated_wire_cost_usd.value -
      currentAnalysis.estimated_wire_cost_usd.value;

    // Calculate machine time savings value
    const machineTimeSavingsUsd = (timeSavedMin / 60) * machine_hourly_rate_usd;

    // Net savings = machine time saved - extra wire cost
    const netSavingsUsd = machineTimeSavingsUsd - wireCostDiff;

    // ROI = net savings / extra wire cost (if wire costs more)
    const roi = wireCostDiff > 0
      ? (netSavingsUsd / wireCostDiff) * 100
      : netSavingsUsd > 0 ? Infinity : 0;

    // Breakeven cut length
    const costPerMDiff = WIRE_CLASS_DATA[candidate_wire_class].cost_per_m_usd -
      WIRE_CLASS_DATA[current_wire_class].cost_per_m_usd;
    const speedDiff = this.getBaseSpeed(material, thickness_mm) *
      (WIRE_CLASS_DATA[candidate_wire_class].speed_factor -
       WIRE_CLASS_DATA[current_wire_class].speed_factor);

    const breakevenMm = costPerMDiff > 0 && speedDiff > 0
      ? (costPerMDiff * 60 * 1000) / (speedDiff * machine_hourly_rate_usd / 60)
      : Infinity;

    // Recommendation
    const recommendation = this.getRecommendation(netSavingsUsd, roi, timeSavedMin);
    const reasoning = this.generateReasoning(
      current_wire_class,
      candidate_wire_class,
      netSavingsUsd,
      timeSavedMin,
      wireCostDiff,
      batch_quantity
    );

    // Uncertainty (RSS)
    const uncertaintyPct = 0.15;

    return {
      current_wire: currentAnalysis,
      candidate_wire: candidateAnalysis,
      time_saved_min: {
        value: timeSavedMin,
        unit: 'min',
        uncertainty: Math.abs(timeSavedMin) * uncertaintyPct,
        confidence: 0.85,
        source: 'WEDMWirePremiumROIEngine:speed-comparison',
      },
      wire_cost_difference_usd: {
        value: wireCostDiff,
        unit: 'USD',
        uncertainty: Math.abs(wireCostDiff) * 0.1,
        confidence: 0.90,
        source: 'WEDMWirePremiumROIEngine:wire-pricing',
      },
      net_savings_usd: {
        value: netSavingsUsd,
        unit: 'USD',
        uncertainty: Math.abs(netSavingsUsd) * uncertaintyPct,
        confidence: 0.85,
        source: 'WEDMWirePremiumROIEngine:composite',
      },
      roi_percent: {
        value: isFinite(roi) ? roi : 999,
        unit: '%',
        uncertainty: isFinite(roi) ? roi * uncertaintyPct : 0,
        confidence: 0.80,
        source: 'WEDMWirePremiumROIEngine:roi-calc',
        warning: !isFinite(roi) ? 'ROI infinite (no extra cost)' : undefined,
      },
      breakeven_cut_length_mm: {
        value: isFinite(breakevenMm) ? breakevenMm : 0,
        unit: 'mm',
        uncertainty: isFinite(breakevenMm) ? breakevenMm * 0.2 : 0,
        confidence: 0.80,
        source: 'WEDMWirePremiumROIEngine:breakeven',
        warning: !isFinite(breakevenMm) ? 'No breakeven (cheaper or same speed)' : undefined,
      },
      recommendation,
      reasoning,
    };
  }

  /**
   * Compare multiple wire options for a job
   */
  compareAll(input: Omit<WirePremiumROIInput, 'candidate_wire_class'>): {
    comparisons: WirePremiumROIResult[];
    best_choice: WireClass;
    best_savings_usd: number;
  } {
    const wireClasses: WireClass[] = [
      'standard_brass', 'zinc_coated', 'gamma_coated',
      'diffusion_annealed', 'moly', 'tungsten'
    ];

    const comparisons: WirePremiumROIResult[] = [];
    let bestChoice = input.current_wire_class;
    let bestSavings = 0;

    for (const candidate of wireClasses) {
      if (candidate === input.current_wire_class) continue;

      const result = this.calculate({
        ...input,
        candidate_wire_class: candidate,
      });
      comparisons.push(result);

      if (result.net_savings_usd.value > bestSavings) {
        bestSavings = result.net_savings_usd.value;
        bestChoice = candidate;
      }
    }

    return {
      comparisons,
      best_choice: bestChoice,
      best_savings_usd: bestSavings,
    };
  }

  private analyzeWire(
    wireClass: WireClass,
    material: string,
    thickness_mm: number,
    cutLength_mm: number,
    wireDiameter_mm: number
  ): WireAnalysis {
    const classData = WIRE_CLASS_DATA[wireClass];
    const baseSpeed = this.getBaseSpeed(material, thickness_mm);
    const adjustedSpeed = baseSpeed * classData.speed_factor;

    const cutTimeMin = cutLength_mm / adjustedSpeed;
    const wireUsageM = this.estimateWireUsage(cutLength_mm, cutTimeMin);
    const wireCostUsd = wireUsageM * classData.cost_per_m_usd;

    return {
      wire_class: wireClass,
      cutting_speed_mm_min: {
        value: adjustedSpeed,
        unit: 'mm/min',
        uncertainty: adjustedSpeed * 0.1,
        confidence: 0.85,
        source: 'WEDMWirePremiumROIEngine:speed-model',
      },
      wire_cost_per_m_usd: {
        value: classData.cost_per_m_usd,
        unit: 'USD/m',
        uncertainty: classData.cost_per_m_usd * 0.05,
        confidence: 0.95,
        source: 'WEDMWirePremiumROIEngine:manufacturer-pricing',
      },
      estimated_cut_time_min: {
        value: cutTimeMin,
        unit: 'min',
        uncertainty: cutTimeMin * 0.1,
        confidence: 0.85,
        source: 'WEDMWirePremiumROIEngine:time-estimate',
      },
      estimated_wire_cost_usd: {
        value: wireCostUsd,
        unit: 'USD',
        uncertainty: wireCostUsd * 0.1,
        confidence: 0.90,
        source: 'WEDMWirePremiumROIEngine:cost-estimate',
      },
    };
  }

  private getBaseSpeed(material: string, thickness_mm: number): number {
    const materialKey = material.toLowerCase().replace(/\s+/g, '_');
    const baseSpeed = BASE_CUTTING_SPEEDS[materialKey] ?? 3.0;

    // Thickness adjustment (reference is 25mm)
    const thicknessFactor = thickness_mm < 10 ? 1.3
      : thickness_mm < 25 ? 1.0 + (25 - thickness_mm) * 0.02
      : thickness_mm < 50 ? 1.0 - (thickness_mm - 25) * 0.015
      : 0.6;

    return baseSpeed * thicknessFactor;
  }

  private estimateWireUsage(cutLength_mm: number, cutTime_min: number): number {
    const wireSpeed_m_min = 8;  // Typical wire speed
    return wireSpeed_m_min * cutTime_min;
  }

  private getRecommendation(
    netSavings: number,
    roi: number,
    timeSaved: number
  ): 'UPGRADE' | 'STAY' | 'MARGINAL' {
    if (netSavings > 10 && (roi > 50 || !isFinite(roi))) return 'UPGRADE';
    if (netSavings < -5 || timeSaved < 0) return 'STAY';
    return 'MARGINAL';
  }

  private generateReasoning(
    current: WireClass,
    candidate: WireClass,
    netSavings: number,
    timeSaved: number,
    costDiff: number,
    batchQty: number
  ): string[] {
    const reasons: string[] = [];

    if (timeSaved > 0) {
      reasons.push(`${candidate} saves ${timeSaved.toFixed(1)} min vs ${current}`);
    } else if (timeSaved < 0) {
      reasons.push(`${candidate} is ${(-timeSaved).toFixed(1)} min slower than ${current}`);
    }

    if (costDiff > 0) {
      reasons.push(`Wire cost increases by $${costDiff.toFixed(2)}`);
    } else if (costDiff < 0) {
      reasons.push(`Wire cost decreases by $${(-costDiff).toFixed(2)}`);
    }

    if (netSavings > 0) {
      reasons.push(`Net savings: $${netSavings.toFixed(2)}`);
    } else if (netSavings < 0) {
      reasons.push(`Net cost increase: $${(-netSavings).toFixed(2)}`);
    }

    if (batchQty > 1) {
      reasons.push(`Batch of ${batchQty} amplifies ${netSavings > 0 ? 'savings' : 'costs'}`);
    }

    return reasons;
  }
}

export const wedmWirePremiumROIEngine = new WEDMWirePremiumROIEngine();
export { WEDMWirePremiumROIEngine };
