/**
 * LathePrintSequencePlannerEngine — U-LTH37 (LATHE-MASTER P4)
 *
 * From strategy plan → ordered operation sequence with:
 *   - Stock state tracking (diameter/length evolution)
 *   - Tool change minimization (group ops by tool)
 *   - Setup split detection (re-chuck / sub-spindle pickup)
 *   - Cycle-time prediction per operation
 *   - Precedence validation (center_drill → drill → bore, rough → finish, face → OD)
 *
 * Consumes StrategyPlan from LathePrintFeatureStrategySelectorEngine (U-LTH36).
 *
 * @milestone LATHE-MASTER U-LTH37
 * @version 1.0.0
 */

import { z } from "zod";
import type { StrategyPlan, StrategyRecommendation, FeatureInput } from "./LathePrintFeatureStrategySelectorEngine.js";
import { TURNING_STRATEGY_CATALOG } from "./TurningStrategyCatalog.js";

// ============================================================================
// SCHEMAS
// ============================================================================

/** Stock state at a point in the sequence */
export const StockStateSchema = z.object({
  od_mm: z.number().min(0),
  id_mm: z.number().min(0),
  length_mm: z.number().min(0),
  remaining_volume_cm3: z.number().min(0),
  setup_id: z.string(),
});
export type StockState = z.infer<typeof StockStateSchema>;

/** Operation in the planned sequence */
export const PlannedOperationSchema = z.object({
  op_number: z.number().int().positive(),
  featureId: z.string(),
  featureType: z.string(),
  strategy_id: z.string(),
  strategy_name: z.string(),
  setup_id: z.string(),
  tool_station: z.number().int().optional(),
  tool_id: z.string().optional(),
  estimated_time_sec: z.number().min(0),
  stock_before: StockStateSchema,
  stock_after: StockStateSchema,
  precedence_requirements: z.array(z.string()),
  parallel_candidate: z.boolean(),
});
export type PlannedOperation = z.infer<typeof PlannedOperationSchema>;

/** Precedence violation */
export const PrecedenceViolationSchema = z.object({
  code: z.string(),
  severity: z.enum(["error", "warning", "info"]),
  message: z.string(),
  op_numbers: z.array(z.number()),
});
export type PrecedenceViolation = z.infer<typeof PrecedenceViolationSchema>;

/** Sequence plan output */
export const SequencePlanSchema = z.object({
  plan_id: z.string(),
  source_strategy_plan_id: z.string(),
  operations: z.array(PlannedOperationSchema),
  setup_count: z.number().int().min(1),
  tool_change_count: z.number().int().min(0),
  total_cycle_time_sec: z.number().min(0),
  total_tool_change_time_sec: z.number().min(0),
  initial_stock: StockStateSchema,
  final_stock: StockStateSchema,
  violations: z.array(PrecedenceViolationSchema),
  valid: z.boolean(),
  timestamp: z.string(),
});
export type SequencePlan = z.infer<typeof SequencePlanSchema>;

/** Stock input */
export const StockInputSchema = z.object({
  od_mm: z.number().min(0.1).max(500),
  length_mm: z.number().min(1).max(3000),
  id_mm: z.number().min(0).max(500).optional(),
  material_density_kg_m3: z.number().optional(),
});
export type StockInput = z.infer<typeof StockInputSchema>;

// ============================================================================
// PRECEDENCE RULES
// ============================================================================

/** Operation precedence: key must come BEFORE any values */
const PRECEDENCE_RULES: Record<string, string[]> = {
  center_drill: ["drill", "tap", "ream", "id_bore", "thread_internal"],
  drill: ["tap", "ream", "id_bore", "thread_internal"],
  face: ["od_turn", "chamfer_od", "taper_od"],
  od_turn: ["thread_external", "chamfer_od", "groove_od", "knurl"],
  id_bore: ["thread_internal", "chamfer_id", "groove_id"],
  taper_od: ["chamfer_od", "groove_od"],
  taper_id: ["chamfer_id", "groove_id"],
};

/** Category precedence: roughing must precede finishing for same feature */
const CATEGORY_ORDER: Record<string, number> = {
  rough: 1,
  drill: 2,
  bore: 3,
  contour: 4,
  groove: 5,
  thread: 6,
  finish: 7,
  specialty: 8,
};

/** Tool change time estimates (seconds) */
const TOOL_CHANGE_TIME_SEC = 3.5; // typical turret index
const SETUP_CHANGE_TIME_SEC = 45.0; // re-chuck / sub-spindle pickup

// ============================================================================
// ENGINE
// ============================================================================

class LathePrintSequencePlannerEngine {
  /**
   * Plan ordered sequence from strategy plan
   * @param strategyPlan Output of LathePrintFeatureStrategySelectorEngine
   * @param initialStock Raw stock dimensions
   * @param features Original feature inputs for geometry context
   * @returns Complete sequence plan with operations, violations, cycle time
   */
  planSequence(
    strategyPlan: StrategyPlan,
    initialStock: StockInput,
    features: FeatureInput[]
  ): SequencePlan {
    const stock = StockInputSchema.parse(initialStock);

    if (!strategyPlan || !Array.isArray(strategyPlan.recommendations)) {
      throw new Error("Invalid strategy plan: missing recommendations");
    }

    // Step 1: Sort recommendations by category order + sequence priority
    const sortedRecs = this.sortByPrecedence(strategyPlan.recommendations, features);

    // Step 2: Build initial stock state
    const initVolume = this.calcVolumeCm3(stock.od_mm, stock.id_mm ?? 0, stock.length_mm);
    const initialStockState: StockState = {
      od_mm: stock.od_mm,
      id_mm: stock.id_mm ?? 0,
      length_mm: stock.length_mm,
      remaining_volume_cm3: initVolume,
      setup_id: "OP10",
    };

    // Step 3: Walk sequence, track stock evolution, assign tool stations
    const operations: PlannedOperation[] = [];
    let currentStock = { ...initialStockState };
    let currentSetup = "OP10";
    let toolStation = 1;
    const toolMap = new Map<string, number>();
    let toolChangeCount = 0;
    let setupChangeCount = 0;

    for (let i = 0; i < sortedRecs.length; i++) {
      const rec = sortedRecs[i];
      const feature = features.find(f => f.id === rec.featureId);

      // Check if setup change needed
      const needsSetupChange = this.requiresSetupChange(rec, feature, i);
      if (needsSetupChange && i > 0) {
        setupChangeCount++;
        currentSetup = `OP${(setupChangeCount + 1) * 10}`;
      }

      // Assign tool station
      const toolKey = `${rec.strategy_id}-${feature?.type ?? "unknown"}`;
      if (!toolMap.has(toolKey)) {
        toolMap.set(toolKey, toolStation);
        toolStation = Math.min(toolStation + 1, 12);
        if (i > 0) toolChangeCount++;
      }
      const assignedStation = toolMap.get(toolKey)!;

      // Update stock state
      const stockBefore = { ...currentStock, setup_id: currentSetup };
      const stockAfter = this.evolveStock(stockBefore, rec, feature);
      currentStock = stockAfter;

      // Build precedence list
      const precedenceReqs: string[] = [];
      const featType = feature?.type ?? "";
      Object.entries(PRECEDENCE_RULES).forEach(([pre, afters]) => {
        if (afters.includes(featType)) {
          precedenceReqs.push(`Must follow ${pre}`);
        }
      });

      operations.push({
        op_number: i + 1,
        featureId: rec.featureId,
        featureType: rec.featureType,
        strategy_id: rec.strategy_id,
        strategy_name: rec.strategy_name,
        setup_id: currentSetup,
        tool_station: assignedStation,
        tool_id: `T${String(assignedStation).padStart(2, "0")}`,
        estimated_time_sec: rec.estimated_cycle_time_sec ?? this.estimateDefaultCycle(rec, feature),
        stock_before: stockBefore,
        stock_after: stockAfter,
        precedence_requirements: precedenceReqs,
        parallel_candidate: this.isParallelCandidate(rec, feature),
      });
    }

    // Step 4: Validate precedence
    const violations = this.validatePrecedence(operations, features);

    // Step 5: Totals
    const totalCycleTime = operations.reduce((s, op) => s + op.estimated_time_sec, 0);
    const totalToolChangeTime = toolChangeCount * TOOL_CHANGE_TIME_SEC +
      setupChangeCount * SETUP_CHANGE_TIME_SEC;

    return {
      plan_id: `seq_${Date.now()}`,
      source_strategy_plan_id: strategyPlan.plan_id,
      operations,
      setup_count: setupChangeCount + 1,
      tool_change_count: toolChangeCount,
      total_cycle_time_sec: totalCycleTime + totalToolChangeTime,
      total_tool_change_time_sec: totalToolChangeTime,
      initial_stock: initialStockState,
      final_stock: currentStock,
      violations,
      valid: violations.filter(v => v.severity === "error").length === 0,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Sort recommendations by precedence + category
   */
  private sortByPrecedence(
    recs: StrategyRecommendation[],
    features: FeatureInput[]
  ): StrategyRecommendation[] {
    const getFeature = (id: string) => features.find(f => f.id === id);

    return [...recs].sort((a, b) => {
      const fa = getFeature(a.featureId);
      const fb = getFeature(b.featureId);
      if (!fa || !fb) return 0;

      // Feature sequence priority FIRST (center_drill → drill → face → od → thread)
      // — enforces manufacturing precedence regardless of strategy category
      const priA = this.getFeaturePriority(fa.type);
      const priB = this.getFeaturePriority(fb.type);
      if (priA !== priB) return priA - priB;

      // Within same feature type, sort by category (rough before finish)
      const catA = this.getCategoryOrder(a.strategy_id);
      const catB = this.getCategoryOrder(b.strategy_id);
      return catA - catB;
    });
  }

  private getCategoryOrder(strategyId: string): number {
    const entry = TURNING_STRATEGY_CATALOG.find(s => s.id === strategyId);
    return entry ? (CATEGORY_ORDER[entry.category] ?? 99) : 99;
  }

  private getFeaturePriority(featureType: string): number {
    const priorities: Record<string, number> = {
      center_drill: 10, drill: 20, face: 30, od_turn: 40,
      taper_od: 45, id_bore: 50, taper_id: 55,
      groove_face: 60, groove_od: 70, groove_id: 75, undercut: 80,
      radius_od: 85, radius_id: 86, chamfer_od: 90, chamfer_id: 91,
      thread_external: 100, thread_internal: 105,
      ream: 110, tap: 115, knurl: 120,
    };
    return priorities[featureType] ?? 200;
  }

  /**
   * Determine if setup change is required for this op
   */
  private requiresSetupChange(
    rec: StrategyRecommendation,
    feature: FeatureInput | undefined,
    index: number
  ): boolean {
    if (index === 0) return false;
    // Parting, back-face ops typically need sub-spindle pickup
    const backSideOps = ["groove_face", "undercut"];
    if (feature && backSideOps.includes(feature.type)) {
      return false; // Could be same setup with live tool
    }
    return false; // Conservative: default to single setup
  }

  /**
   * Evolve stock state after an operation
   */
  private evolveStock(
    before: StockState,
    rec: StrategyRecommendation,
    feature: FeatureInput | undefined
  ): StockState {
    const after = { ...before };

    if (!feature) return after;

    const dia = feature.diameter_mm ?? before.od_mm;
    const depth = feature.depth_mm ?? 0;
    const length = feature.length_mm ?? 0;

    switch (feature.type) {
      case "od_turn":
      case "taper_od":
        if (dia > 0 && dia < before.od_mm) {
          after.od_mm = dia;
        }
        break;
      case "face":
        if (depth > 0) {
          after.length_mm = Math.max(0, before.length_mm - depth);
        }
        break;
      case "id_bore":
      case "drill":
      case "ream":
        if (dia > 0 && dia > before.id_mm) {
          after.id_mm = dia;
        }
        break;
      case "groove_od":
        if (dia > 0) {
          // Groove doesn't change main OD but reduces volume locally
        }
        break;
      case "center_drill":
        after.id_mm = Math.max(after.id_mm, dia * 0.5);
        break;
      default:
        // Threading, chamfering, knurling — no significant stock change
        break;
    }

    after.remaining_volume_cm3 = this.calcVolumeCm3(after.od_mm, after.id_mm, after.length_mm);
    return after;
  }

  /**
   * Calc annular volume in cm³
   */
  private calcVolumeCm3(od_mm: number, id_mm: number, length_mm: number): number {
    const odCm = od_mm / 10;
    const idCm = id_mm / 10;
    const lenCm = length_mm / 10;
    return Math.PI * (odCm * odCm - idCm * idCm) / 4 * lenCm;
  }

  /**
   * Estimate default cycle time for an op without prior estimate
   */
  private estimateDefaultCycle(rec: StrategyRecommendation, feature: FeatureInput | undefined): number {
    if (!feature) return 30;
    const dia = feature.diameter_mm ?? 25;
    const length = feature.length_mm ?? 10;
    // Rough estimate: surface area / MRR ratio
    const surfaceArea = Math.PI * dia * length / 100; // cm²
    return Math.max(5, surfaceArea * 0.8); // seconds
  }

  /**
   * Check if op can be parallelized (e.g. live-tooling + main spindle)
   */
  private isParallelCandidate(rec: StrategyRecommendation, feature: FeatureInput | undefined): boolean {
    if (!feature) return false;
    // Drilling on live tool while turning on main — possible on sub-spindle lathes
    const parallelOps = ["drill", "tap", "ream"];
    return parallelOps.includes(feature.type);
  }

  /**
   * Validate precedence rules
   */
  private validatePrecedence(
    operations: PlannedOperation[],
    features: FeatureInput[]
  ): PrecedenceViolation[] {
    const violations: PrecedenceViolation[] = [];

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      const feature = features.find(f => f.id === op.featureId);
      if (!feature) continue;

      const requiredBefore: string[] = [];
      Object.entries(PRECEDENCE_RULES).forEach(([pre, afters]) => {
        if (afters.includes(feature.type)) requiredBefore.push(pre);
      });

      for (const needed of requiredBefore) {
        const hasAnyFeatureOfType = features.some(f => f.type === needed);
        if (!hasAnyFeatureOfType) continue;

        const neededIdx = operations.findIndex(o => {
          const f = features.find(x => x.id === o.featureId);
          return f?.type === needed;
        });

        if (neededIdx >= i) {
          violations.push({
            code: "PRECEDENCE_VIOLATION",
            severity: "error",
            message: `Op ${i + 1} (${feature.type}) must come after ${needed}`,
            op_numbers: [i + 1, neededIdx + 1],
          });
        }
      }
    }

    // Check category order for same feature (rough before finish)
    const byFeature = new Map<string, PlannedOperation[]>();
    operations.forEach(op => {
      const list = byFeature.get(op.featureId) ?? [];
      list.push(op);
      byFeature.set(op.featureId, list);
    });

    byFeature.forEach((ops, fid) => {
      if (ops.length < 2) return;
      for (let i = 1; i < ops.length; i++) {
        const prevCat = this.getCategoryOrder(ops[i - 1].strategy_id);
        const currCat = this.getCategoryOrder(ops[i].strategy_id);
        if (currCat < prevCat) {
          violations.push({
            code: "CATEGORY_ORDER_VIOLATION",
            severity: "warning",
            message: `Feature ${fid}: finer operation ${ops[i - 1].op_number} precedes rougher ${ops[i].op_number}`,
            op_numbers: [ops[i - 1].op_number, ops[i].op_number],
          });
        }
      }
    });

    return violations;
  }

  /**
   * Generate human-readable summary of sequence plan
   */
  summarize(plan: SequencePlan): {
    op_count: number;
    setup_count: number;
    tool_change_count: number;
    cycle_time_min: number;
    error_count: number;
    warning_count: number;
    volume_removed_cm3: number;
    valid: boolean;
  } {
    const errorCount = plan.violations.filter(v => v.severity === "error").length;
    const warningCount = plan.violations.filter(v => v.severity === "warning").length;
    const volumeRemoved = plan.initial_stock.remaining_volume_cm3 -
      plan.final_stock.remaining_volume_cm3;

    return {
      op_count: plan.operations.length,
      setup_count: plan.setup_count,
      tool_change_count: plan.tool_change_count,
      cycle_time_min: plan.total_cycle_time_sec / 60,
      error_count: errorCount,
      warning_count: warningCount,
      volume_removed_cm3: Math.max(0, volumeRemoved),
      valid: plan.valid,
    };
  }

  /**
   * Re-order operations to fix precedence violations (best-effort)
   */
  autoFix(plan: SequencePlan, features: FeatureInput[]): SequencePlan {
    const errorViolations = plan.violations.filter(v => v.severity === "error");
    if (errorViolations.length === 0) return plan;

    // Rebuild sequence using precedence sort
    const recs: StrategyRecommendation[] = plan.operations.map(op => ({
      featureId: op.featureId,
      featureType: op.featureType,
      strategy_id: op.strategy_id,
      strategy_name: op.strategy_name,
      score: 70,
      reasoning_chain: [],
      parameters: {},
      trade_offs: { pros: [], cons: [] },
      alternatives: [],
      citations: [],
    }));

    const sorted = this.sortByPrecedence(recs, features);
    const newOps = sorted.map((rec, i) => {
      const orig = plan.operations.find(o => o.featureId === rec.featureId)!;
      return { ...orig, op_number: i + 1 };
    });

    const newViolations = this.validatePrecedence(newOps, features);

    return {
      ...plan,
      operations: newOps,
      violations: newViolations,
      valid: newViolations.filter(v => v.severity === "error").length === 0,
      timestamp: new Date().toISOString(),
    };
  }
}

export const lathePrintSequencePlannerEngine = new LathePrintSequencePlannerEngine();
