/**
 * ContextualBoundaryEngine — Context-Dependent Limits
 *
 * Phase 0.25: Adaptive Variability Framework
 *
 * Boundaries depend on context, not absolutes. "Max feed" depends on
 * material, tool, machine, depth, coolant, operator, and more. No single
 * number — a function of all inputs.
 *
 * @module engines/ContextualBoundaryEngine
 */

export interface BoundaryContext {
  material?: { name: string; hardness?: number; machinability?: number };
  tool?: { type: string; diameter?: number; flutes?: number; coating?: string; condition?: number };
  machine?: { id: string; rigidity?: number; spindlePower?: number; maxRpm?: number };
  operation?: { type: string; depthOfCut?: number; engagement?: number };
  coolant?: { type: string; pressure?: number; flow?: number };
  operator?: { experience: "novice" | "intermediate" | "expert"; preference?: string };
  environment?: { temperature?: number; humidity?: number };
}

export interface ContextualBound {
  parameter: string;
  context: BoundaryContext;
  nominalValue: number;
  minSafe: number;
  maxRecommended: number;
  maxPossible: number;
  confidenceFactors: Record<string, number>;
  warnings: string[];
}

export interface BoundaryRule {
  id: string;
  parameter: string;
  condition: (ctx: BoundaryContext) => boolean;
  adjustment: (baseValue: number, ctx: BoundaryContext) => number;
  reason: string;
}

class ContextualBoundaryEngine {
  private rules: BoundaryRule[] = [];
  private baseValues: Map<string, { nominal: number; min: number; max: number }> = new Map();

  constructor() {
    this.initializeBaseValues();
    this.initializeRules();
  }

  /**
   * Initialize base parameter values
   */
  private initializeBaseValues(): void {
    this.baseValues.set("feed_rate", { nominal: 500, min: 50, max: 5000 });
    this.baseValues.set("spindle_rpm", { nominal: 8000, min: 100, max: 20000 });
    this.baseValues.set("depth_of_cut", { nominal: 2, min: 0.1, max: 20 });
    this.baseValues.set("cutting_speed", { nominal: 200, min: 10, max: 800 });
    this.baseValues.set("chip_load", { nominal: 0.1, min: 0.01, max: 0.5 });
    this.baseValues.set("stepover", { nominal: 50, min: 5, max: 100 });
  }

  /**
   * Initialize contextual boundary rules
   */
  private initializeRules(): void {
    this.rules = [
      {
        id: "hard_material_feed",
        parameter: "feed_rate",
        condition: (ctx) => (ctx.material?.hardness ?? 0) > 45,
        adjustment: (base, ctx) => base * (1 - ((ctx.material?.hardness ?? 0) - 45) * 0.02),
        reason: "Hard material requires reduced feed rate",
      },
      {
        id: "tool_wear_feed",
        parameter: "feed_rate",
        condition: (ctx) => (ctx.tool?.condition ?? 100) < 50,
        adjustment: (base, ctx) => base * (0.5 + (ctx.tool?.condition ?? 100) / 200),
        reason: "Worn tool requires reduced feed rate",
      },
      {
        id: "low_rigidity_depth",
        parameter: "depth_of_cut",
        condition: (ctx) => (ctx.machine?.rigidity ?? 100) < 70,
        adjustment: (base, ctx) => base * ((ctx.machine?.rigidity ?? 100) / 100),
        reason: "Low machine rigidity limits depth of cut",
      },
      {
        id: "novice_operator_safety",
        parameter: "feed_rate",
        condition: (ctx) => ctx.operator?.experience === "novice",
        adjustment: (base) => base * 0.7,
        reason: "Conservative parameters for novice operator",
      },
      {
        id: "expert_operator_boost",
        parameter: "feed_rate",
        condition: (ctx) => ctx.operator?.experience === "expert",
        adjustment: (base) => base * 1.15,
        reason: "Expert operator can handle aggressive parameters",
      },
      {
        id: "high_engagement_feed",
        parameter: "feed_rate",
        condition: (ctx) => (ctx.operation?.engagement ?? 50) > 70,
        adjustment: (base, ctx) => base * (1 - ((ctx.operation?.engagement ?? 50) - 70) * 0.01),
        reason: "High radial engagement requires reduced feed",
      },
      {
        id: "no_coolant_speed",
        parameter: "cutting_speed",
        condition: (ctx) => !ctx.coolant || ctx.coolant.type === "dry",
        adjustment: (base) => base * 0.7,
        reason: "Dry cutting requires reduced speed",
      },
      {
        id: "high_pressure_coolant_speed",
        parameter: "cutting_speed",
        condition: (ctx) => (ctx.coolant?.pressure ?? 0) > 70,
        adjustment: (base) => base * 1.2,
        reason: "High pressure coolant enables higher speeds",
      },
      {
        id: "small_tool_rpm",
        parameter: "spindle_rpm",
        condition: (ctx) => (ctx.tool?.diameter ?? 10) < 6,
        adjustment: (base, ctx) => Math.min(base * (10 / (ctx.tool?.diameter ?? 10)), ctx.machine?.maxRpm ?? 20000),
        reason: "Small diameter tools require higher RPM",
      },
      {
        id: "power_limited_mrr",
        parameter: "depth_of_cut",
        condition: (ctx) => (ctx.machine?.spindlePower ?? 15) < 10,
        adjustment: (base, ctx) => base * ((ctx.machine?.spindlePower ?? 15) / 15),
        reason: "Limited spindle power restricts MRR",
      },
    ];
  }

  /**
   * Calculate contextual boundary for a parameter
   */
  calculateBoundary(parameter: string, context: BoundaryContext): ContextualBound {
    const base = this.baseValues.get(parameter);
    if (!base) {
      return this.createDefaultBound(parameter, context);
    }

    let nominalValue = base.nominal;
    let maxRecommended = base.max;
    const confidenceFactors: Record<string, number> = {};
    const warnings: string[] = [];

    for (const rule of this.rules) {
      if (rule.parameter !== parameter) continue;
      if (!rule.condition(context)) continue;

      const adjustment = rule.adjustment(nominalValue, context);
      const factor = adjustment / nominalValue;

      confidenceFactors[rule.id] = factor;

      if (factor < 1) {
        nominalValue = adjustment;
        maxRecommended = Math.min(maxRecommended, nominalValue * 1.5);
        warnings.push(rule.reason);
      } else if (factor > 1) {
        nominalValue = adjustment;
      }
    }

    const confidence = Object.keys(context).length / 7;
    const uncertaintyFactor = 1 + (1 - confidence) * 0.2;

    return {
      parameter,
      context,
      nominalValue: Math.round(nominalValue * 100) / 100,
      minSafe: Math.round(base.min * 100) / 100,
      maxRecommended: Math.round(maxRecommended * 100) / 100,
      maxPossible: Math.round(base.max * uncertaintyFactor * 100) / 100,
      confidenceFactors,
      warnings,
    };
  }

  /**
   * Create default bound for unknown parameter
   */
  private createDefaultBound(parameter: string, context: BoundaryContext): ContextualBound {
    return {
      parameter,
      context,
      nominalValue: 100,
      minSafe: 10,
      maxRecommended: 200,
      maxPossible: 500,
      confidenceFactors: {},
      warnings: [`No base values defined for ${parameter}`],
    };
  }

  /**
   * Calculate all boundaries for a context
   */
  calculateAllBoundaries(context: BoundaryContext): Map<string, ContextualBound> {
    const results = new Map<string, ContextualBound>();
    for (const parameter of this.baseValues.keys()) {
      results.set(parameter, this.calculateBoundary(parameter, context));
    }
    return results;
  }

  /**
   * Check if value is within contextual bounds
   */
  checkValue(parameter: string, value: number, context: BoundaryContext): {
    valid: boolean;
    level: "safe" | "caution" | "extreme" | "beyond";
    bound: ContextualBound;
    message: string;
  } {
    const bound = this.calculateBoundary(parameter, context);

    let level: "safe" | "caution" | "extreme" | "beyond";
    let message: string;

    if (value < bound.minSafe) {
      level = "caution";
      message = `${parameter} (${value}) below minimum safe value (${bound.minSafe})`;
    } else if (value <= bound.nominalValue) {
      level = "safe";
      message = `${parameter} (${value}) within safe range`;
    } else if (value <= bound.maxRecommended) {
      level = "caution";
      message = `${parameter} (${value}) above nominal but within recommended`;
    } else if (value <= bound.maxPossible) {
      level = "extreme";
      message = `${parameter} (${value}) extreme - proceed with caution`;
    } else {
      level = "beyond";
      message = `${parameter} (${value}) beyond known limits`;
    }

    return {
      valid: level !== "beyond",
      level,
      bound,
      message,
    };
  }

  /**
   * Add custom rule
   */
  addRule(rule: BoundaryRule): void {
    this.rules.push(rule);
  }

  /**
   * Get all rules
   */
  getRules(): BoundaryRule[] {
    return [...this.rules];
  }

  /**
   * Get base values
   */
  getBaseValues(): Map<string, { nominal: number; min: number; max: number }> {
    return new Map(this.baseValues);
  }

  /**
   * Set base value for parameter
   */
  setBaseValue(parameter: string, values: { nominal: number; min: number; max: number }): void {
    this.baseValues.set(parameter, values);
  }
}

export const contextualBoundaryEngine = new ContextualBoundaryEngine();
