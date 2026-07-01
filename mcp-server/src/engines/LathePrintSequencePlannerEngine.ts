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

import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { StrategyPlan, StrategyRecommendation, FeatureInput } from "./LathePrintFeatureStrategySelectorEngine.js";
import { TURNING_STRATEGY_CATALOG } from "./TurningStrategyCatalog.js";
import {
  makeDefaultConsensusVote,
  publishOutcomeToFeedbackBus,
  ORCHESTRATE_OUTCOME_TOPIC,
  ORCHESTRATE_STAGE,
  type ConsensusVoteQuery,
  type ConsensusVoteVerdict,
} from "./domainAGIAdapterKit.js";
import type { OutcomeEvent } from "../schemas/outcomeEventSchema.js";

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
// CONSENSUS-GATED SEQUENCE — LATHE-P2P-CONSENSUS-MS4/P0-U02
// ============================================================================

/**
 * Three-candidate sequence plan presented to consensus voters.
 *
 * Candidate A = manufacturing-precedence-first (default `planSequence` output).
 * Candidate B = tool-change-minimized (group same tool within precedence band).
 * Candidate C = setup-change-minimized (group same setup within precedence band).
 *
 * @see LATHE-P2P-CONSENSUS-MS4/P0-U02 envelope exit_conditions
 */
export const SequenceCandidateLabelSchema = z.enum(["A_precedence", "B_tool_minimized", "C_setup_minimized"]);
export type SequenceCandidateLabel = z.infer<typeof SequenceCandidateLabelSchema>;

export const ConsensusSequencePlanSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  selected_label: SequenceCandidateLabelSchema,
  selected_plan: SequencePlanSchema,
  candidate_plans: z.record(SequenceCandidateLabelSchema, SequencePlanSchema),
  consensus: z.object({
    answer: SequenceCandidateLabelSchema,
    confidence: z.number().min(0).max(1),
    voters: z.array(z.string()),
    auditId: z.string().optional(),
    agreement_met: z.boolean(),
    threshold: z.number().min(0).max(1),
  }),
  escalated_to_human: z.boolean(),
  lineage_id: z.string(),
  job_id: z.string(),
  timestamp: z.string(),
});
export type ConsensusSequencePlan = z.infer<typeof ConsensusSequencePlanSchema>;

export type SequenceConsensusFn = (q: ConsensusVoteQuery) => Promise<ConsensusVoteVerdict>;

export interface PlanSequenceWithConsensusOpts {
  /** Agreement floor (default 0.75 per envelope exit_conditions). */
  agreementThreshold?: number;
  /** Injected consensus seam — defaults to MultiModelConsensusEngine fanout. Required in tests (VITEST guard fail-loud). */
  consensusDecide?: SequenceConsensusFn;
  /** Optional outcome-bus seam (default = feedbackBusEngine.publish). */
  publish?: (event: OutcomeEvent) => void;
  /** Caller-supplied job id linking events across stages. */
  jobId?: string;
}

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
      const prevFeature = i > 0
        ? features.find(f => f.id === sortedRecs[i - 1].featureId)
        : undefined;

      // Check if setup change needed
      const needsSetupChange = this.requiresSetupChange(rec, feature, i, prevFeature);
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
   * Determine if setup change is required for this op.
   *
   * A setup change (OP20/OP30) is triggered when a feature cannot be reached
   * from the current chuck orientation. Canonical cues:
   *   1. access_end === "back": feature explicitly marked rear-access
   *   2. previous op accessed front AND this feature accesses back (or vice versa)
   *   3. groove_face on one end followed by groove_face on the other end
   *
   * Returns true when the op must start on a new setup (OP20+).
   */
  private requiresSetupChange(
    rec: StrategyRecommendation,
    feature: FeatureInput | undefined,
    index: number,
    prevFeature: FeatureInput | undefined
  ): boolean {
    if (index === 0) return false;
    if (!feature) return false;

    const thisEnd = feature.access_end ?? "front";
    const prevEnd = prevFeature?.access_end ?? "front";

    // Explicit end transition — always a setup change
    if (thisEnd !== prevEnd) return true;

    // Two groove_face features on default orientation imply opposing ends
    // (one on the front face, one on the rear face) unless both carry the
    // same explicit access_end. If access_end is unset on both, treat the
    // second groove_face as a back-side pickup.
    if (
      feature.type === "groove_face" &&
      prevFeature?.type === "groove_face" &&
      feature.access_end === undefined &&
      prevFeature.access_end === undefined
    ) {
      return true;
    }

    return false;
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
   * Tool-change-minimized variant of `sortByPrecedence`.
   *
   * Same precedence band as the canonical sort (feature priority + category
   * order), but within a band groups recommendations sharing the same
   * `strategy_id` so the same tool services consecutive ops. Reduces turret
   * indexing — primary cost driver on small Hurco/Okuma lots.
   */
  private sortToolMinimized(
    recs: StrategyRecommendation[],
    features: FeatureInput[],
  ): StrategyRecommendation[] {
    const ordered = this.sortByPrecedence(recs, features);
    // Within each (feature-priority, category-order) band, group by strategy_id.
    const getFeature = (id: string) => features.find(f => f.id === id);
    return [...ordered].sort((a, b) => {
      const fa = getFeature(a.featureId);
      const fb = getFeature(b.featureId);
      if (!fa || !fb) return 0;
      const priA = this.getFeaturePriority(fa.type);
      const priB = this.getFeaturePriority(fb.type);
      if (priA !== priB) return priA - priB;
      const catA = this.getCategoryOrder(a.strategy_id);
      const catB = this.getCategoryOrder(b.strategy_id);
      if (catA !== catB) return catA - catB;
      // Within band: same-strategy adjacency (alphabetic on strategy_id is deterministic)
      return a.strategy_id.localeCompare(b.strategy_id);
    });
  }

  /**
   * Setup-change-minimized variant of `sortByPrecedence`.
   *
   * Same precedence band, but within a band groups by `access_end` so all
   * front-access ops complete before any back-access ops. Reduces re-chuck
   * cycles — primary cost driver on multi-setup parts.
   */
  private sortSetupMinimized(
    recs: StrategyRecommendation[],
    features: FeatureInput[],
  ): StrategyRecommendation[] {
    const ordered = this.sortByPrecedence(recs, features);
    const getFeature = (id: string) => features.find(f => f.id === id);
    const endRank = (end: string | undefined): number => {
      if (end === "front" || end === undefined) return 0;
      if (end === "back") return 1;
      return 2;
    };
    return [...ordered].sort((a, b) => {
      const fa = getFeature(a.featureId);
      const fb = getFeature(b.featureId);
      if (!fa || !fb) return 0;
      // PRIMARY KEY: access_end (front first, then back) — overrides feature priority
      // because changing setup is the highest cost in this variant.
      const endA = endRank(fa.access_end);
      const endB = endRank(fb.access_end);
      if (endA !== endB) return endA - endB;
      // SECONDARY: keep manufacturing precedence within an access-end group.
      const priA = this.getFeaturePriority(fa.type);
      const priB = this.getFeaturePriority(fb.type);
      if (priA !== priB) return priA - priB;
      const catA = this.getCategoryOrder(a.strategy_id);
      const catB = this.getCategoryOrder(b.strategy_id);
      return catA - catB;
    });
  }

  /**
   * Build a SequencePlan from a specific candidate ordering.
   * Replays the `planSequence` walk (stock evolution, tool assignment,
   * setup tracking, precedence validation) on a caller-chosen sort.
   */
  private buildPlanFromSortedRecs(
    sortedRecs: StrategyRecommendation[],
    strategyPlan: StrategyPlan,
    initialStock: StockInput,
    features: FeatureInput[],
  ): SequencePlan {
    const stock = StockInputSchema.parse(initialStock);
    const initVolume = this.calcVolumeCm3(stock.od_mm, stock.id_mm ?? 0, stock.length_mm);
    const initialStockState: StockState = {
      od_mm: stock.od_mm,
      id_mm: stock.id_mm ?? 0,
      length_mm: stock.length_mm,
      remaining_volume_cm3: initVolume,
      setup_id: "OP10",
    };

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
      const prevFeature = i > 0
        ? features.find(f => f.id === sortedRecs[i - 1].featureId)
        : undefined;

      const needsSetupChange = this.requiresSetupChange(rec, feature, i, prevFeature);
      if (needsSetupChange && i > 0) {
        setupChangeCount++;
        currentSetup = `OP${(setupChangeCount + 1) * 10}`;
      }

      const toolKey = `${rec.strategy_id}-${feature?.type ?? "unknown"}`;
      if (!toolMap.has(toolKey)) {
        toolMap.set(toolKey, toolStation);
        toolStation = Math.min(toolStation + 1, 12);
        if (i > 0) toolChangeCount++;
      }
      const assignedStation = toolMap.get(toolKey)!;

      const stockBefore = { ...currentStock, setup_id: currentSetup };
      const stockAfter = this.evolveStock(stockBefore, rec, feature);
      currentStock = stockAfter;

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

    const violations = this.validatePrecedence(operations, features);
    const totalCycleTime = operations.reduce((s, op) => s + op.estimated_time_sec, 0);
    const totalToolChangeTime =
      toolChangeCount * TOOL_CHANGE_TIME_SEC + setupChangeCount * SETUP_CHANGE_TIME_SEC;

    return {
      plan_id: `seq_${randomUUID()}`,
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
   * Generate the 3 candidate plans for consensus voting.
   *
   * Public for test access — lets reviewers verify candidates before consensus.
   */
  generateCandidatePlans(
    strategyPlan: StrategyPlan,
    initialStock: StockInput,
    features: FeatureInput[],
  ): Record<SequenceCandidateLabel, SequencePlan> {
    if (!strategyPlan || !Array.isArray(strategyPlan.recommendations)) {
      throw new Error("Invalid strategy plan: missing recommendations");
    }
    const recs = strategyPlan.recommendations;
    return {
      A_precedence: this.buildPlanFromSortedRecs(
        this.sortByPrecedence(recs, features),
        strategyPlan,
        initialStock,
        features,
      ),
      B_tool_minimized: this.buildPlanFromSortedRecs(
        this.sortToolMinimized(recs, features),
        strategyPlan,
        initialStock,
        features,
      ),
      C_setup_minimized: this.buildPlanFromSortedRecs(
        this.sortSetupMinimized(recs, features),
        strategyPlan,
        initialStock,
        features,
      ),
    };
  }

  /**
   * Consensus-gated sequence planning (LATHE-P2P-CONSENSUS-MS4/P0-U02).
   *
   * Generates 3 candidate sequences (precedence / tool-min / setup-min),
   * presents them to the consensus seam, picks the winning candidate,
   * publishes an outcome event, and returns the full set with provenance.
   *
   * Fail-open: if consensus returns null/throws, falls back to the
   * precedence candidate (matches `planSequence` deterministic behavior).
   * Escalation: when winner confidence < `agreementThreshold` (default 0.75
   * per envelope), the `escalated_to_human` flag is set true but the plan
   * is still returned (operator-decision-required vs hard fail).
   *
   * In test runtimes (`VITEST` or `NODE_ENV=test`), the default consensus
   * seam THROWS via `vitestConsensusGuard` to prevent silent network calls.
   * Tests MUST inject `opts.consensusDecide`.
   *
   * @param strategyPlan upstream feature-strategy plan
   * @param initialStock raw stock dims
   * @param features original feature inputs for geometry context
   * @param opts seam injection + threshold + jobId
   * @returns consensus-gated plan with all 3 candidates + provenance
   */
  async planSequenceWithConsensus(
    strategyPlan: StrategyPlan,
    initialStock: StockInput,
    features: FeatureInput[],
    opts: PlanSequenceWithConsensusOpts = {},
  ): Promise<ConsensusSequencePlan> {
    const threshold = opts.agreementThreshold ?? 0.75;
    const candidates = this.generateCandidatePlans(strategyPlan, initialStock, features);
    const labels: SequenceCandidateLabel[] = ["A_precedence", "B_tool_minimized", "C_setup_minimized"];
    const lineageId = randomUUID();
    const jobId = opts.jobId ?? randomUUID();

    const consensusFn = opts.consensusDecide ?? makeDefaultConsensusVote({
      engineName: "LathePrintSequencePlannerEngine",
      callerEngine: "LathePrintSequencePlannerEngine.planSequenceWithConsensus",
    });

    let verdict: ConsensusVoteVerdict;
    try {
      verdict = await consensusFn({
        question: "Which lathe operation sequence minimizes total cost while preserving precedence?",
        options: labels,
        decisionKind: "sequence",
      });
    } catch {
      // Fail-open: degrade to deterministic precedence pick (matches `planSequence`).
      verdict = {
        answer: "A_precedence",
        confidence: 0,
        voters: [],
      };
    }

    const rawAnswer = labels.includes(verdict.answer as SequenceCandidateLabel)
      ? (verdict.answer as SequenceCandidateLabel)
      : "A_precedence";
    const agreementMet = verdict.confidence >= threshold;
    const selectedLabel: SequenceCandidateLabel = rawAnswer;
    const selectedPlan = candidates[selectedLabel];

    const result: ConsensusSequencePlan = {
      schemaVersion: "1.0.0",
      selected_label: selectedLabel,
      selected_plan: selectedPlan,
      candidate_plans: candidates,
      consensus: {
        answer: selectedLabel,
        confidence: verdict.confidence,
        voters: verdict.voters,
        auditId: verdict.auditId,
        agreement_met: agreementMet,
        threshold,
      },
      escalated_to_human: !agreementMet,
      lineage_id: lineageId,
      job_id: jobId,
      timestamp: new Date().toISOString(),
    };

    // Publish outcome event for the learning spine (schema v1.1.0).
    const event: OutcomeEvent = {
      schemaVersion: "1.1.0",
      event_id: randomUUID(),
      lineage_id: lineageId,
      domain: "lathe",
      kind: "cross_process_decision",
      severity: "info",
      source: "system",
      timestamp: result.timestamp,
      context: {
        job_id: jobId,
        pipeline_stage: ORCHESTRATE_STAGE,
        consensus_audit_id: verdict.auditId,
      },
      recommended: {
        decision_kind: "sequence",
        candidates: labels,
        cycle_time_per_candidate_sec: {
          A_precedence: candidates.A_precedence.total_cycle_time_sec,
          B_tool_minimized: candidates.B_tool_minimized.total_cycle_time_sec,
          C_setup_minimized: candidates.C_setup_minimized.total_cycle_time_sec,
        },
      },
      actual: {
        selected: selectedLabel,
        agreement_met: agreementMet,
        threshold,
        escalated_to_human: !agreementMet,
      },
      confidence: verdict.confidence,
    };
    try {
      (opts.publish ?? publishOutcomeToFeedbackBus)(event);
    } catch {
      // Fail-soft: outcome bus is observability-only; never block the pipeline.
    }
    void ORCHESTRATE_OUTCOME_TOPIC; // import-survival marker (constant used via publishOutcomeToFeedbackBus internally)

    return result;
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
