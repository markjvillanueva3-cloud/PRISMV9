/**
 * MCAT-MS0 P3-U03: Machine Profile Propagation Engine
 *
 * Propagates machine-profile reuse into quoting, what-if analysis, scheduling,
 * and feasibility consumers. Ensures all downstream systems use consistent
 * machine data from the canonical package + overlay model.
 *
 * Consumers:
 * - Quoting: InstantQuoteEngine, MultiProcessQuoteEngine, QuoteToShipOrchestrator
 * - Scheduling: CapacityPlanningEngine, JobShopSchedulingEngine
 * - Feasibility: FeasibilityAnalysisEngine, EDMFeasibilityEngine
 * - What-If: Machine comparison, capability simulation
 *
 * @module engines/MachineProfilePropagationEngine
 * @milestone MCAT-MS0/P3-U03
 */

import { log } from "../utils/Logger.js";
import {
  machineConsumerBindingEngine,
  type BoundMachineContext,
  type QuoteMachineBinding,
} from "./MachineConsumerBindingEngine.js";
import { machinePackageAPIEngine, type CompatibilityCheckResult } from "./MachinePackageAPIEngine.js";
import { shopConfigurationEngine } from "./ShopConfigurationEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface QuoteContext {
  machine_id: string;
  machine_display_name: string;
  hourly_rate: number;
  setup_time_minutes: number;
  machine_type: string;
  capabilities: {
    max_rpm: number;
    max_power_kw: number;
    axis_count: number;
    coolant_strategies: string[];
  };
  efficiency_factor: number;
  availability_factor: number;
}

export interface SchedulingContext {
  machine_id: string;
  display_name: string;
  machine_type: string;
  shift_hours_per_day: number;
  planned_downtime_pct: number;
  average_setup_minutes: number;
  capacity_units_per_hour: number;
  compatible_operations: string[];
  current_load_pct?: number;
}

export interface FeasibilityContext {
  machine_id: string;
  display_name: string;
  capabilities: {
    max_rpm: number;
    max_power_kw: number;
    max_torque_nm: number;
    envelope_x_mm: number;
    envelope_y_mm: number;
    envelope_z_mm: number;
    table_load_kg?: number;
    axis_count: number;
  };
  controller: {
    id: string;
    family: string;
    capabilities: string[];
  };
  coolant: string[];
  constraints: string[];
}

export interface WhatIfScenario {
  scenario_id: string;
  name: string;
  description: string;
  machine_id: string;
  modifications: {
    field: string;
    original_value: unknown;
    modified_value: unknown;
  }[];
}

export interface WhatIfResult {
  scenario_id: string;
  machine_id: string;
  baseline: {
    quote_rate: number;
    cycle_estimate_min: number;
    feasibility_score: number;
  };
  modified: {
    quote_rate: number;
    cycle_estimate_min: number;
    feasibility_score: number;
  };
  delta: {
    rate_change_pct: number;
    cycle_change_pct: number;
    feasibility_change: number;
  };
  recommendations: string[];
}

export interface MachineComparisonResult {
  machines: {
    machine_id: string;
    display_name: string;
    quote_rate: number;
    cycle_estimate_min: number;
    feasibility_score: number;
    compatibility: CompatibilityCheckResult;
  }[];
  best_for_cost: string;
  best_for_speed: string;
  best_overall: string;
  recommendation: string;
}

export interface PropagationStats {
  total_quote_contexts: number;
  total_scheduling_contexts: number;
  total_feasibility_contexts: number;
  propagation_coverage_pct: number;
  last_propagation: string;
}

// ============================================================================
// ENGINE
// ============================================================================

class MachineProfilePropagationEngine {
  private quoteContextCache = new Map<string, QuoteContext>();
  private schedulingContextCache = new Map<string, SchedulingContext>();
  private feasibilityContextCache = new Map<string, FeasibilityContext>();
  private lastPropagation: string | null = null;

  // ==========================================================================
  // QUOTING PROPAGATION
  // ==========================================================================

  /**
   * Get quote context for a machine, propagated from canonical package.
   */
  getQuoteContext(machine_id: string): QuoteContext | null {
    // Check cache
    const cached = this.quoteContextCache.get(machine_id);
    if (cached) return cached;

    // Get binding
    const binding = machineConsumerBindingEngine.bind(machine_id);
    if (!binding.success || !binding.context) {
      log.warn(`[MachineProfilePropagation] No binding for ${machine_id}`);
      return null;
    }

    const ctx = binding.context;

    // Build quote context
    const quoteCtx: QuoteContext = {
      machine_id: ctx.shop_machine_id,
      machine_display_name: ctx.display_name,
      hourly_rate: ctx.machine_rate_per_hour,
      setup_time_minutes: this.estimateSetupTime(ctx),
      machine_type: ctx.machine_type,
      capabilities: {
        max_rpm: ctx.spindle.max_rpm,
        max_power_kw: ctx.spindle.max_power_kw,
        axis_count: ctx.kinematics.axis_count,
        coolant_strategies: ctx.coolant.enabled_strategies,
      },
      efficiency_factor: this.calculateEfficiencyFactor(ctx),
      availability_factor: 0.85, // Default 85% availability
    };

    this.quoteContextCache.set(machine_id, quoteCtx);
    return quoteCtx;
  }

  /**
   * Get quote contexts for multiple machines.
   */
  getQuoteContexts(machine_ids: string[]): Map<string, QuoteContext> {
    const result = new Map<string, QuoteContext>();
    for (const id of machine_ids) {
      const ctx = this.getQuoteContext(id);
      if (ctx) result.set(id, ctx);
    }
    return result;
  }

  /**
   * Calculate quote estimate using propagated machine context.
   */
  calculateQuoteEstimate(input: {
    machine_id: string;
    cycle_time_minutes: number;
    setup_count?: number;
    material_cost?: number;
    tooling_cost?: number;
  }): {
    machine_cost: number;
    setup_cost: number;
    total_cost: number;
    effective_rate: number;
    breakdown: { item: string; cost: number }[];
  } | null {
    const ctx = this.getQuoteContext(input.machine_id);
    if (!ctx) return null;

    const setupCount = input.setup_count || 1;
    const setupMinutes = ctx.setup_time_minutes * setupCount;
    const totalMinutes = input.cycle_time_minutes + setupMinutes;

    // Apply efficiency factor
    const effectiveMinutes = totalMinutes / ctx.efficiency_factor;
    const machineHours = effectiveMinutes / 60;

    const machineCost = machineHours * ctx.hourly_rate;
    const setupCost = (setupMinutes / 60) * ctx.hourly_rate * 0.5; // Setup at 50% rate

    const breakdown = [
      { item: "Machine time", cost: machineCost },
      { item: "Setup time", cost: setupCost },
    ];

    if (input.material_cost) {
      breakdown.push({ item: "Material", cost: input.material_cost });
    }
    if (input.tooling_cost) {
      breakdown.push({ item: "Tooling", cost: input.tooling_cost });
    }

    const totalCost = breakdown.reduce((sum, b) => sum + b.cost, 0);

    return {
      machine_cost: machineCost,
      setup_cost: setupCost,
      total_cost: totalCost,
      effective_rate: ctx.hourly_rate * ctx.efficiency_factor,
      breakdown,
    };
  }

  // ==========================================================================
  // SCHEDULING PROPAGATION
  // ==========================================================================

  /**
   * Get scheduling context for a machine.
   */
  getSchedulingContext(machine_id: string): SchedulingContext | null {
    const cached = this.schedulingContextCache.get(machine_id);
    if (cached) return cached;

    const binding = machineConsumerBindingEngine.bind(machine_id);
    if (!binding.success || !binding.context) return null;

    const ctx = binding.context;
    const capsResponse = machinePackageAPIEngine.getCapabilities(machine_id);

    const schedCtx: SchedulingContext = {
      machine_id: ctx.shop_machine_id,
      display_name: ctx.display_name,
      machine_type: ctx.machine_type,
      shift_hours_per_day: 8, // Single shift default
      planned_downtime_pct: 10,
      average_setup_minutes: this.estimateSetupTime(ctx),
      capacity_units_per_hour: this.calculateCapacityUnits(ctx),
      compatible_operations: capsResponse.data?.compatible_operations || [],
      current_load_pct: undefined, // Would come from live data
    };

    this.schedulingContextCache.set(machine_id, schedCtx);
    return schedCtx;
  }

  /**
   * Get scheduling contexts for all shop machines.
   */
  getAllSchedulingContexts(): SchedulingContext[] {
    const profile = shopConfigurationEngine.getActiveProfile();
    const contexts: SchedulingContext[] = [];

    for (const machine of profile.machines) {
      const ctx = this.getSchedulingContext(machine.id);
      if (ctx) contexts.push(ctx);
    }

    return contexts;
  }

  /**
   * Find best machine for scheduling based on operation requirements.
   */
  findBestMachineForScheduling(input: {
    operation_type: string;
    required_hours: number;
    deadline?: string;
    preferred_machines?: string[];
  }): {
    recommended_machine: string;
    alternatives: string[];
    reason: string;
  } | null {
    const contexts = this.getAllSchedulingContexts();

    // Filter by operation compatibility
    let compatible = contexts.filter(c =>
      c.compatible_operations.some(op =>
        op.toLowerCase().includes(input.operation_type.toLowerCase())
      )
    );

    // Prefer specified machines if any
    if (input.preferred_machines && input.preferred_machines.length > 0) {
      const preferred = compatible.filter(c =>
        input.preferred_machines!.includes(c.machine_id)
      );
      if (preferred.length > 0) compatible = preferred;
    }

    if (compatible.length === 0) {
      return null;
    }

    // Sort by capacity (highest first)
    compatible.sort((a, b) => b.capacity_units_per_hour - a.capacity_units_per_hour);

    return {
      recommended_machine: compatible[0].machine_id,
      alternatives: compatible.slice(1, 4).map(c => c.machine_id),
      reason: `${compatible[0].display_name} has highest capacity for ${input.operation_type}`,
    };
  }

  // ==========================================================================
  // FEASIBILITY PROPAGATION
  // ==========================================================================

  /**
   * Get feasibility context for a machine.
   */
  getFeasibilityContext(machine_id: string): FeasibilityContext | null {
    const cached = this.feasibilityContextCache.get(machine_id);
    if (cached) return cached;

    const binding = machineConsumerBindingEngine.bind(machine_id);
    if (!binding.success || !binding.context) return null;

    const ctx = binding.context;

    const feasCtx: FeasibilityContext = {
      machine_id: ctx.shop_machine_id,
      display_name: ctx.display_name,
      capabilities: {
        max_rpm: ctx.spindle.max_rpm,
        max_power_kw: ctx.spindle.max_power_kw,
        max_torque_nm: ctx.spindle.torque_nm,
        envelope_x_mm: ctx.envelope.x_mm,
        envelope_y_mm: ctx.envelope.y_mm,
        envelope_z_mm: ctx.envelope.z_mm,
        table_load_kg: ctx.envelope.table_load_kg,
        axis_count: ctx.kinematics.axis_count,
      },
      controller: ctx.controller,
      coolant: ctx.coolant.enabled_strategies,
      constraints: this.deriveConstraints(ctx),
    };

    this.feasibilityContextCache.set(machine_id, feasCtx);
    return feasCtx;
  }

  /**
   * Check feasibility of an operation on a machine.
   */
  checkFeasibility(input: {
    machine_id: string;
    operation_type: string;
    part_dims?: { x: number; y: number; z: number };
    part_weight_kg?: number;
    required_rpm?: number;
    required_power_kw?: number;
  }): {
    feasible: boolean;
    score: number;
    checks: { name: string; passed: boolean; detail: string }[];
    blockers: string[];
    warnings: string[];
  } {
    const feasCtx = this.getFeasibilityContext(input.machine_id);
    if (!feasCtx) {
      return {
        feasible: false,
        score: 0,
        checks: [],
        blockers: [`Machine ${input.machine_id} not found`],
        warnings: [],
      };
    }

    const checks: { name: string; passed: boolean; detail: string }[] = [];
    const blockers: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    // Envelope check
    if (input.part_dims) {
      const fitsX = input.part_dims.x <= feasCtx.capabilities.envelope_x_mm;
      const fitsY = input.part_dims.y <= feasCtx.capabilities.envelope_y_mm;
      const fitsZ = input.part_dims.z <= feasCtx.capabilities.envelope_z_mm;
      const fits = fitsX && fitsY && fitsZ;

      checks.push({
        name: "envelope",
        passed: fits,
        detail: fits
          ? `Part ${input.part_dims.x}×${input.part_dims.y}×${input.part_dims.z} fits envelope`
          : `Part exceeds envelope in ${!fitsX ? "X " : ""}${!fitsY ? "Y " : ""}${!fitsZ ? "Z" : ""}`,
      });

      if (!fits) {
        blockers.push("Part exceeds machine envelope");
        score -= 50;
      }
    }

    // Weight check
    if (input.part_weight_kg && feasCtx.capabilities.table_load_kg) {
      const weightOk = input.part_weight_kg <= feasCtx.capabilities.table_load_kg;
      checks.push({
        name: "weight",
        passed: weightOk,
        detail: weightOk
          ? `Part weight ${input.part_weight_kg} kg within ${feasCtx.capabilities.table_load_kg} kg limit`
          : `Part weight ${input.part_weight_kg} kg exceeds ${feasCtx.capabilities.table_load_kg} kg limit`,
      });

      if (!weightOk) {
        blockers.push("Part weight exceeds table load capacity");
        score -= 40;
      }
    }

    // RPM check
    if (input.required_rpm) {
      const rpmOk = input.required_rpm <= feasCtx.capabilities.max_rpm;
      checks.push({
        name: "spindle_rpm",
        passed: rpmOk,
        detail: rpmOk
          ? `Required ${input.required_rpm} RPM within ${feasCtx.capabilities.max_rpm} max`
          : `Required ${input.required_rpm} RPM exceeds ${feasCtx.capabilities.max_rpm} max`,
      });

      if (!rpmOk) {
        warnings.push("Required RPM exceeds machine capability");
        score -= 20;
      }
    }

    // Power check
    if (input.required_power_kw) {
      const powerOk = input.required_power_kw <= feasCtx.capabilities.max_power_kw;
      checks.push({
        name: "spindle_power",
        passed: powerOk,
        detail: powerOk
          ? `Required ${input.required_power_kw} kW within ${feasCtx.capabilities.max_power_kw} kW max`
          : `Required ${input.required_power_kw} kW exceeds ${feasCtx.capabilities.max_power_kw} kW max`,
      });

      if (!powerOk) {
        warnings.push("Required power exceeds machine capability");
        score -= 15;
      }
    }

    return {
      feasible: blockers.length === 0 && score >= 50,
      score: Math.max(0, score),
      checks,
      blockers,
      warnings,
    };
  }

  // ==========================================================================
  // WHAT-IF ANALYSIS
  // ==========================================================================

  /**
   * Run what-if analysis comparing machine scenarios.
   */
  runWhatIfAnalysis(input: {
    base_machine_id: string;
    scenario_name: string;
    modifications: { field: string; value: unknown }[];
    operation: {
      type: string;
      cycle_time_minutes: number;
      required_rpm?: number;
      required_power_kw?: number;
    };
  }): WhatIfResult | null {
    const baseCtx = this.getQuoteContext(input.base_machine_id);
    const baseFeas = this.getFeasibilityContext(input.base_machine_id);
    if (!baseCtx || !baseFeas) return null;

    // Calculate baseline
    const baseQuote = this.calculateQuoteEstimate({
      machine_id: input.base_machine_id,
      cycle_time_minutes: input.operation.cycle_time_minutes,
    });
    const baseFeasCheck = this.checkFeasibility({
      machine_id: input.base_machine_id,
      operation_type: input.operation.type,
      required_rpm: input.operation.required_rpm,
      required_power_kw: input.operation.required_power_kw,
    });

    // Apply modifications (simulated)
    let modifiedRate = baseCtx.hourly_rate;
    let modifiedCycle = input.operation.cycle_time_minutes;
    let modifiedFeasScore = baseFeasCheck.score;
    const mods: { field: string; original_value: unknown; modified_value: unknown }[] = [];

    for (const mod of input.modifications) {
      if (mod.field === "hourly_rate") {
        mods.push({ field: mod.field, original_value: modifiedRate, modified_value: mod.value });
        modifiedRate = mod.value as number;
      } else if (mod.field === "efficiency") {
        const oldEff = baseCtx.efficiency_factor;
        const newEff = mod.value as number;
        mods.push({ field: mod.field, original_value: oldEff, modified_value: newEff });
        modifiedCycle = modifiedCycle * (oldEff / newEff);
      } else if (mod.field === "max_rpm") {
        mods.push({ field: mod.field, original_value: baseFeas.capabilities.max_rpm, modified_value: mod.value });
        if (input.operation.required_rpm && (mod.value as number) >= input.operation.required_rpm) {
          modifiedFeasScore = Math.min(100, modifiedFeasScore + 10);
        }
      }
    }

    const modifiedQuote = (modifiedCycle / 60) * modifiedRate;

    return {
      scenario_id: `whatif-${Date.now()}`,
      machine_id: input.base_machine_id,
      baseline: {
        quote_rate: baseCtx.hourly_rate,
        cycle_estimate_min: input.operation.cycle_time_minutes,
        feasibility_score: baseFeasCheck.score,
      },
      modified: {
        quote_rate: modifiedRate,
        cycle_estimate_min: modifiedCycle,
        feasibility_score: modifiedFeasScore,
      },
      delta: {
        rate_change_pct: ((modifiedRate - baseCtx.hourly_rate) / baseCtx.hourly_rate) * 100,
        cycle_change_pct: ((modifiedCycle - input.operation.cycle_time_minutes) / input.operation.cycle_time_minutes) * 100,
        feasibility_change: modifiedFeasScore - baseFeasCheck.score,
      },
      recommendations: this.generateWhatIfRecommendations(mods, modifiedFeasScore),
    };
  }

  /**
   * Compare multiple machines for an operation.
   */
  compareMachines(input: {
    machine_ids: string[];
    operation: {
      type: string;
      cycle_time_minutes: number;
      required_rpm?: number;
      required_power_kw?: number;
      part_weight_kg?: number;
    };
  }): MachineComparisonResult | null {
    if (input.machine_ids.length === 0) return null;

    const machines: MachineComparisonResult["machines"] = [];

    for (const machineId of input.machine_ids) {
      const quote = this.calculateQuoteEstimate({
        machine_id: machineId,
        cycle_time_minutes: input.operation.cycle_time_minutes,
      });

      const compatResponse = machinePackageAPIEngine.checkCompatibility({
        machine_id: machineId,
        operation_type: input.operation.type,
        required_rpm: input.operation.required_rpm,
        required_power_kw: input.operation.required_power_kw,
        part_weight_kg: input.operation.part_weight_kg,
      });

      const binding = machineConsumerBindingEngine.bind(machineId);

      if (quote && compatResponse.success && compatResponse.data && binding.context) {
        machines.push({
          machine_id: machineId,
          display_name: binding.context.display_name,
          quote_rate: quote.effective_rate,
          cycle_estimate_min: input.operation.cycle_time_minutes / (this.calculateEfficiencyFactor(binding.context)),
          feasibility_score: compatResponse.data.score,
          compatibility: compatResponse.data,
        });
      }
    }

    if (machines.length === 0) return null;

    // Find best machines
    const sortedByCost = [...machines].sort((a, b) => a.quote_rate - b.quote_rate);
    const sortedBySpeed = [...machines].sort((a, b) => a.cycle_estimate_min - b.cycle_estimate_min);
    const sortedByFeasibility = [...machines].sort((a, b) => b.feasibility_score - a.feasibility_score);

    // Overall score = 40% feasibility + 30% cost + 30% speed
    const scored = machines.map(m => ({
      ...m,
      overall: m.feasibility_score * 0.4 +
        (1 - (sortedByCost.indexOf(m) / machines.length)) * 30 +
        (1 - (sortedBySpeed.indexOf(m) / machines.length)) * 30,
    }));
    scored.sort((a, b) => b.overall - a.overall);

    return {
      machines,
      best_for_cost: sortedByCost[0].machine_id,
      best_for_speed: sortedBySpeed[0].machine_id,
      best_overall: scored[0].machine_id,
      recommendation: `${scored[0].display_name} offers best balance of capability, cost, and efficiency for ${input.operation.type}`,
    };
  }

  // ==========================================================================
  // PROPAGATION CONTROL
  // ==========================================================================

  /**
   * Propagate all machine contexts (refresh caches).
   */
  propagateAll(): PropagationStats {
    const profile = shopConfigurationEngine.getActiveProfile();

    this.quoteContextCache.clear();
    this.schedulingContextCache.clear();
    this.feasibilityContextCache.clear();

    let quoteCount = 0;
    let schedCount = 0;
    let feasCount = 0;

    for (const machine of profile.machines) {
      if (this.getQuoteContext(machine.id)) quoteCount++;
      if (this.getSchedulingContext(machine.id)) schedCount++;
      if (this.getFeasibilityContext(machine.id)) feasCount++;
    }

    this.lastPropagation = new Date().toISOString();

    log.info(`[MachineProfilePropagation] Propagated ${quoteCount} quote, ${schedCount} scheduling, ${feasCount} feasibility contexts`);

    return {
      total_quote_contexts: quoteCount,
      total_scheduling_contexts: schedCount,
      total_feasibility_contexts: feasCount,
      propagation_coverage_pct: Math.round((feasCount / profile.machines.length) * 100),
      last_propagation: this.lastPropagation,
    };
  }

  /**
   * Invalidate propagated contexts for a machine.
   */
  invalidate(machine_id: string): void {
    this.quoteContextCache.delete(machine_id);
    this.schedulingContextCache.delete(machine_id);
    this.feasibilityContextCache.delete(machine_id);
    machineConsumerBindingEngine.invalidate(machine_id);
  }

  /**
   * Get propagation statistics.
   */
  getStats(): PropagationStats {
    const profile = shopConfigurationEngine.getActiveProfile();
    return {
      total_quote_contexts: this.quoteContextCache.size,
      total_scheduling_contexts: this.schedulingContextCache.size,
      total_feasibility_contexts: this.feasibilityContextCache.size,
      propagation_coverage_pct: Math.round((this.feasibilityContextCache.size / profile.machines.length) * 100),
      last_propagation: this.lastPropagation || "never",
    };
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private estimateSetupTime(ctx: BoundMachineContext): number {
    // Estimate setup time based on machine type and complexity
    const base = ctx.machine_type === "lathe" ? 25 : 40;
    const axisMultiplier = ctx.kinematics.axis_count > 3 ? 1.3 : 1.0;
    return Math.round(base * axisMultiplier);
  }

  private calculateEfficiencyFactor(ctx: BoundMachineContext): number {
    // Base efficiency 0.85, adjusted by spindle power and axis count
    let eff = 0.85;
    if (ctx.spindle.max_power_kw > 20) eff += 0.03;
    if (ctx.kinematics.axis_count >= 5) eff += 0.02;
    return Math.min(0.95, eff);
  }

  private calculateCapacityUnits(ctx: BoundMachineContext): number {
    // Simplified capacity calculation
    const baseUnits = ctx.machine_type === "lathe" ? 4 : 3;
    const powerBonus = ctx.spindle.max_power_kw > 15 ? 0.5 : 0;
    return baseUnits + powerBonus;
  }

  private deriveConstraints(ctx: BoundMachineContext): string[] {
    const constraints: string[] = [];
    if (ctx.kinematics.axis_count < 4) {
      constraints.push("No rotary axis - limited to 3-axis work");
    }
    if (!ctx.coolant.enabled_strategies.includes("through_spindle")) {
      constraints.push("No through-spindle coolant");
    }
    if (ctx.spindle.max_rpm < 10000) {
      constraints.push("Limited high-speed capability");
    }
    return constraints;
  }

  private generateWhatIfRecommendations(
    mods: { field: string; original_value: unknown; modified_value: unknown }[],
    feasScore: number
  ): string[] {
    const recs: string[] = [];

    for (const mod of mods) {
      if (mod.field === "hourly_rate" && (mod.modified_value as number) < (mod.original_value as number)) {
        recs.push("Rate reduction improves competitiveness but verify margin targets");
      }
      if (mod.field === "efficiency" && (mod.modified_value as number) > (mod.original_value as number)) {
        recs.push("Efficiency gains achievable through toolpath optimization or better tooling");
      }
      if (mod.field === "max_rpm") {
        recs.push("Spindle upgrade or high-speed attachment could enable this scenario");
      }
    }

    if (feasScore >= 90) {
      recs.push("High feasibility score - good candidate for production");
    } else if (feasScore < 70) {
      recs.push("Consider alternative machines for better capability match");
    }

    return recs;
  }

  /**
   * Self-awareness metadata.
   */
  getSelfAwareness() {
    return {
      engine: "MachineProfilePropagationEngine",
      milestone: "MCAT-MS0/P3-U03",
      purpose: "Propagates machine-profile into quoting, scheduling, feasibility, and what-if consumers",
      capabilities: [
        "getQuoteContext",
        "calculateQuoteEstimate",
        "getSchedulingContext",
        "findBestMachineForScheduling",
        "getFeasibilityContext",
        "checkFeasibility",
        "runWhatIfAnalysis",
        "compareMachines",
        "propagateAll",
      ],
      consumers: [
        "InstantQuoteEngine",
        "MultiProcessQuoteEngine",
        "CapacityPlanningEngine",
        "JobShopSchedulingEngine",
        "FeasibilityAnalysisEngine",
      ],
      integrations: [
        "MachineConsumerBindingEngine",
        "MachinePackageAPIEngine",
        "ShopConfigurationEngine",
      ],
    };
  }
}

export const machineProfilePropagationEngine = new MachineProfilePropagationEngine();
