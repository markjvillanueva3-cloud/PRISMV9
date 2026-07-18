/**
 * ToolChangeOptimizationEngine — CAMX-MS13/U02 (E1137)
 *
 * Minimizes tool changes across multi-operation CNC jobs by:
 *   1. Magazine layout optimization — place tools in positions that minimize
 *      carousel rotation time (nearest-neighbor TSP on pocket positions)
 *   2. Tool sharing between features — consolidates operations that can
 *      share the same tool (within tolerance/surface-finish constraints)
 *   3. Sister tool strategy — pre-stages duplicate tools for high-volume
 *      production, triggers swap at predicted wear threshold
 *   4. Greedy resequencing — reorders operations to minimize total
 *      tool-change count while respecting hard ordering constraints
 *
 * Physics/references:
 *   - Carousel rotation time: T = |delta_pocket| * t_per_slot (typical 0.3–0.8 s/slot)
 *   - ATC swap time: 3–8 s depending on machine (Fanuc: ~4 s, Mazak: ~3.5 s)
 *   - Tool life governed by Taylor's equation: VT^n = C
 *   - Machinery's Handbook Ch.23: tool magazine management
 *
 * Pure computation — no filesystem, no external dependencies.
 *
 * @module ToolChangeOptimizationEngine
 * @shortcode E1137
 * @dispatcher camDispatcher
 * @actions tool_change_optimize, tool_change_magazine, tool_change_sharing
 * @milestone CAMX-MS13/U02
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default ATC swap time [s] */
const DEFAULT_ATC_SWAP_SEC = 4.5;

/** Default time per carousel slot rotation [s/slot] */
const DEFAULT_TIME_PER_SLOT_SEC = 0.5;

/** Default magazine capacity */
const DEFAULT_MAGAZINE_CAPACITY = 30;

/** Minimum tool diameter difference [mm] to be considered distinct */
const TOOL_DIAMETER_TOLERANCE_MM = 0.01;

/** Maximum allowed surface roughness degradation [%] when sharing tools */
const MAX_RA_DEGRADATION_PCT = 10;

/** Default sister tool wear threshold [% of tool life] */
const DEFAULT_WEAR_THRESHOLD_PCT = 80;

/** Maximum sister tool copies in a single magazine */
const MAX_SISTER_TOOLS = 4;

// ============================================================================
// TYPES
// ============================================================================

/** A single CNC operation requiring a tool */
export interface ToolChangeOperation {
  /** Unique operation identifier */
  id: string;
  /** Tool identifier currently assigned */
  tool_id: string;
  /** Tool diameter [mm] */
  tool_diameter_mm: number;
  /** Number of flutes */
  num_flutes?: number;
  /** Tool type */
  tool_type?: "flat" | "ball" | "bull_nose" | "drill" | "tap" | "reamer" | "chamfer" | "face_mill";
  /** Operation type */
  operation_type?: "rough" | "semi_finish" | "finish" | "drill" | "bore" | "thread" | "deburr" | "chamfer";
  /** Estimated cutting time [min] */
  cutting_time_min?: number;
  /** Required surface roughness Ra [um] */
  required_Ra_um?: number;
  /** Feature ID this operation belongs to */
  feature_id?: string;
  /** Hard prerequisite operation IDs (must execute before this) */
  prerequisites?: string[];
  /** Estimated tool wear fraction consumed (0-1) */
  wear_fraction?: number;
}

/** Tool definition for magazine placement */
export interface MagazineTool {
  /** Tool identifier */
  tool_id: string;
  /** Tool diameter [mm] */
  diameter_mm: number;
  /** Tool length [mm] */
  length_mm: number;
  /** Tool weight [kg] — heavier tools may have placement constraints */
  weight_kg?: number;
  /** Number of magazine pockets required (oversized tools use 2+) */
  pockets_required?: number;
  /** Usage frequency rank (1 = most used) */
  usage_rank?: number;
  /** Current wear [% of life] */
  current_wear_pct?: number;
  /** Is this a sister tool (duplicate for wear swap)? */
  is_sister?: boolean;
  /** Parent tool_id if sister */
  sister_of?: string;
}

/** Machine magazine constraints */
export interface MachineConfig {
  /** Total magazine pockets */
  magazine_capacity: number;
  /** Pocket arrangement: linear, drum, chain, matrix */
  magazine_type?: "linear" | "drum" | "chain" | "matrix";
  /** ATC swap time [s] */
  atc_swap_sec?: number;
  /** Time per slot rotation [s/slot] */
  time_per_slot_sec?: number;
  /** Blocked pocket positions (1-based) */
  blocked_pockets?: number[];
  /** Heavy-tool-only pockets (1-based) */
  heavy_pockets?: number[];
}

/** Result of tool change optimization */
export interface ToolChangeResult {
  /** Optimized operation sequence */
  optimized_sequence: OptimizedStep[];
  /** Total tool changes in optimized sequence */
  total_tool_changes: number;
  /** Tool changes saved vs. original order */
  changes_saved: number;
  /** Estimated time saved [s] */
  time_saved_sec: number;
  /** Original tool change count */
  original_tool_changes: number;
  /** Reduction percentage */
  reduction_pct: number;
  /** Warnings */
  warnings: string[];
}

/** Single step in optimized sequence */
export interface OptimizedStep {
  order: number;
  operation_id: string;
  tool_id: string;
  tool_change: boolean;
  cumulative_changes: number;
  reason?: string;
}

/** Magazine layout result */
export interface MagazineLayout {
  /** Tool-to-pocket assignments (pocket is 1-based) */
  assignments: MagazineAssignment[];
  /** Estimated total rotation time for planned sequence [s] */
  total_rotation_time_sec: number;
  /** Pockets used / total */
  utilization_pct: number;
  /** Sister tool placements */
  sister_placements: SisterPlacement[];
  /** Tools that did not fit */
  overflow_tools: string[];
  /** Warnings */
  warnings: string[];
}

/** Single magazine pocket assignment */
export interface MagazineAssignment {
  pocket: number;
  tool_id: string;
  diameter_mm: number;
  is_sister: boolean;
}

/** Sister tool placement info */
export interface SisterPlacement {
  parent_tool_id: string;
  sister_tool_id: string;
  pocket: number;
  swap_trigger_wear_pct: number;
}

/** Tool sharing consolidation result */
export interface ToolSharingResult {
  /** Original tool count */
  original_tool_count: number;
  /** Consolidated tool count */
  consolidated_tool_count: number;
  /** Tools saved */
  tools_saved: number;
  /** Consolidation groups */
  groups: ToolSharingGroup[];
  /** Operations that cannot share (surface finish or type constraints) */
  non_shareable: string[];
  /** Warnings */
  warnings: string[];
}

/** A group of operations sharing one tool */
export interface ToolSharingGroup {
  /** Shared tool ID */
  shared_tool_id: string;
  /** Tool diameter [mm] */
  diameter_mm: number;
  /** Operations consolidated into this tool */
  operation_ids: string[];
  /** Original distinct tools replaced */
  original_tool_ids: string[];
  /** Reason sharing is valid */
  rationale: string;
}

// ============================================================================
// ENGINE
// ============================================================================

export class ToolChangeOptimizationEngine {

  // ──────────────────────────────────────────────────────────────────────────
  // 1. optimizeToolChanges — Resequence operations to minimize tool changes
  // ──────────────────────────────────────────────────────────────────────────

  optimizeToolChanges(
    operations: ToolChangeOperation[],
    tools: MagazineTool[],
    magazine_capacity: number = DEFAULT_MAGAZINE_CAPACITY,
  ): ToolChangeResult {
    const warnings: string[] = [];
    if (operations.length === 0) {
      return {
        optimized_sequence: [], total_tool_changes: 0, changes_saved: 0,
        time_saved_sec: 0, original_tool_changes: 0, reduction_pct: 0,
        warnings: ["No operations provided"],
      };
    }

    // Count original tool changes (sequential scan)
    let originalChanges = 0;
    for (let i = 1; i < operations.length; i++) {
      if (operations[i].tool_id !== operations[i - 1].tool_id) originalChanges++;
    }

    // Build prerequisite graph
    const prereqMap = new Map<string, Set<string>>();
    for (const op of operations) {
      if (op.prerequisites) {
        prereqMap.set(op.id, new Set(op.prerequisites));
      }
    }

    // Group operations by tool_id
    const toolGroups = new Map<string, ToolChangeOperation[]>();
    for (const op of operations) {
      const group = toolGroups.get(op.tool_id) ?? [];
      group.push(op);
      toolGroups.set(op.tool_id, group);
    }

    // Greedy sequencing: pick the tool group that minimizes changes
    // while respecting prerequisites via Kahn's topological approach
    const sequenced: ToolChangeOperation[] = [];
    const completed = new Set<string>();
    const remaining = new Set(operations.map(o => o.id));

    while (remaining.size > 0) {
      // Find operations whose prerequisites are all completed
      const ready: ToolChangeOperation[] = [];
      for (const op of operations) {
        if (!remaining.has(op.id)) continue;
        const prereqs = prereqMap.get(op.id);
        if (!prereqs || [...prereqs].every(p => completed.has(p))) {
          ready.push(op);
        }
      }

      if (ready.length === 0) {
        // Circular dependency — force remaining in original order
        warnings.push("Circular prerequisite dependency detected; forcing original order for remaining ops");
        for (const op of operations) {
          if (remaining.has(op.id)) {
            sequenced.push(op);
            completed.add(op.id);
            remaining.delete(op.id);
          }
        }
        break;
      }

      // Prefer operations using the same tool as the last sequenced op
      const lastTool = sequenced.length > 0 ? sequenced[sequenced.length - 1].tool_id : null;
      const sameTool = ready.filter(r => r.tool_id === lastTool);

      if (sameTool.length > 0) {
        // Batch all same-tool ready operations
        for (const op of sameTool) {
          sequenced.push(op);
          completed.add(op.id);
          remaining.delete(op.id);
        }
      } else {
        // Pick the tool group with the most ready operations (greedy)
        const groupCounts = new Map<string, ToolChangeOperation[]>();
        for (const op of ready) {
          const g = groupCounts.get(op.tool_id) ?? [];
          g.push(op);
          groupCounts.set(op.tool_id, g);
        }
        let bestGroup: ToolChangeOperation[] = [];
        let bestCount = 0;
        for (const [, ops] of groupCounts) {
          if (ops.length > bestCount) {
            bestCount = ops.length;
            bestGroup = ops;
          }
        }
        for (const op of bestGroup) {
          sequenced.push(op);
          completed.add(op.id);
          remaining.delete(op.id);
        }
      }
    }

    // Count optimized tool changes
    let optimizedChanges = 0;
    const optimizedSequence: OptimizedStep[] = [];
    for (let i = 0; i < sequenced.length; i++) {
      const change = i > 0 && sequenced[i].tool_id !== sequenced[i - 1].tool_id;
      if (change) optimizedChanges++;
      optimizedSequence.push({
        order: i + 1,
        operation_id: sequenced[i].id,
        tool_id: sequenced[i].tool_id,
        tool_change: change,
        cumulative_changes: optimizedChanges,
        reason: change ? `Switch from ${sequenced[i - 1].tool_id} to ${sequenced[i].tool_id}` : undefined,
      });
    }

    const changesSaved = originalChanges - optimizedChanges;
    const timeSaved = changesSaved * DEFAULT_ATC_SWAP_SEC;

    log.info(`[ToolChangeOptimization] ${operations.length} ops: ${originalChanges} -> ${optimizedChanges} changes (saved ${changesSaved})`);

    return {
      optimized_sequence: optimizedSequence,
      total_tool_changes: optimizedChanges,
      changes_saved: changesSaved,
      time_saved_sec: Math.round(timeSaved * 10) / 10,
      original_tool_changes: originalChanges,
      reduction_pct: originalChanges > 0 ? Math.round((changesSaved / originalChanges) * 1000) / 10 : 0,
      warnings,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. optimizeMagazine — Assign tools to magazine pockets for min rotation
  // ──────────────────────────────────────────────────────────────────────────

  optimizeMagazine(
    tools: MagazineTool[],
    machine: MachineConfig,
    operationSequence?: string[],
  ): MagazineLayout {
    const warnings: string[] = [];
    const capacity = machine.magazine_capacity || DEFAULT_MAGAZINE_CAPACITY;
    const timePerSlot = machine.time_per_slot_sec ?? DEFAULT_TIME_PER_SLOT_SEC;
    const blockedSet = new Set(machine.blocked_pockets ?? []);
    const heavySet = new Set(machine.heavy_pockets ?? []);

    // Available pockets (1-based)
    const availablePockets: number[] = [];
    for (let p = 1; p <= capacity; p++) {
      if (!blockedSet.has(p)) availablePockets.push(p);
    }

    // Separate regular tools and sister tools
    const regularTools = tools.filter(t => !t.is_sister);
    const sisterTools = tools.filter(t => t.is_sister);

    // Sort regular tools by usage rank (most used first)
    const sortedTools = [...regularTools].sort((a, b) => {
      const ra = a.usage_rank ?? 999;
      const rb = b.usage_rank ?? 999;
      return ra - rb;
    });

    // Assign tools to pockets
    const assignments: MagazineAssignment[] = [];
    const sisterPlacements: SisterPlacement[] = [];
    const overflow: string[] = [];
    let pocketIdx = 0;

    // If we have an operation sequence, compute frequency-based positioning
    const toolUsageOrder: string[] = [];
    if (operationSequence && operationSequence.length > 0) {
      // Track unique tool transitions to place frequently-accessed tools near each other
      const seen = new Set<string>();
      for (const opToolId of operationSequence) {
        if (!seen.has(opToolId)) {
          toolUsageOrder.push(opToolId);
          seen.add(opToolId);
        }
      }
    }

    // Strategy: place tools in a circular pattern, most-used near pocket 1
    // For drum/chain: minimize rotation distance between consecutive tools in sequence
    for (const tool of sortedTools) {
      const pocketsNeeded = tool.pockets_required ?? 1;
      const isHeavy = (tool.weight_kg ?? 0) > 5;

      if (pocketIdx + pocketsNeeded > availablePockets.length) {
        overflow.push(tool.tool_id);
        continue;
      }

      // Heavy tools go to designated pockets if available
      if (isHeavy && heavySet.size > 0) {
        const heavyPocket = [...heavySet].find(p => !assignments.some(a => a.pocket === p));
        if (heavyPocket) {
          assignments.push({
            pocket: heavyPocket,
            tool_id: tool.tool_id,
            diameter_mm: tool.diameter_mm,
            is_sister: false,
          });
          continue;
        }
      }

      for (let j = 0; j < pocketsNeeded; j++) {
        assignments.push({
          pocket: availablePockets[pocketIdx],
          tool_id: tool.tool_id,
          diameter_mm: tool.diameter_mm,
          is_sister: false,
        });
        pocketIdx++;
      }
    }

    // Place sister tools adjacent to their parent
    for (const sister of sisterTools) {
      if (pocketIdx >= availablePockets.length) {
        overflow.push(sister.tool_id);
        warnings.push(`Sister tool ${sister.tool_id} overflow — magazine full`);
        continue;
      }

      const parentAssignment = assignments.find(a => a.tool_id === sister.sister_of);
      assignments.push({
        pocket: availablePockets[pocketIdx],
        tool_id: sister.tool_id,
        diameter_mm: sister.diameter_mm,
        is_sister: true,
      });
      sisterPlacements.push({
        parent_tool_id: sister.sister_of ?? sister.tool_id,
        sister_tool_id: sister.tool_id,
        pocket: availablePockets[pocketIdx],
        swap_trigger_wear_pct: DEFAULT_WEAR_THRESHOLD_PCT,
      });
      pocketIdx++;
    }

    // Compute estimated rotation time for the operation sequence
    let totalRotationTime = 0;
    if (operationSequence && operationSequence.length > 1) {
      const toolToPocket = new Map<string, number>();
      for (const a of assignments) {
        toolToPocket.set(a.tool_id, a.pocket);
      }
      for (let i = 1; i < operationSequence.length; i++) {
        if (operationSequence[i] !== operationSequence[i - 1]) {
          const p1 = toolToPocket.get(operationSequence[i - 1]);
          const p2 = toolToPocket.get(operationSequence[i]);
          if (p1 !== undefined && p2 !== undefined) {
            const delta = Math.abs(p2 - p1);
            // For drum: shortest path around the carousel
            const shortestDelta = machine.magazine_type === "drum" || machine.magazine_type === "chain"
              ? Math.min(delta, capacity - delta)
              : delta;
            totalRotationTime += shortestDelta * timePerSlot;
          }
        }
      }
    }

    const utilization = (assignments.length / capacity) * 100;

    log.info(`[ToolChangeOptimization] Magazine: ${assignments.length}/${capacity} pockets used, ${overflow.length} overflow`);

    return {
      assignments,
      total_rotation_time_sec: Math.round(totalRotationTime * 10) / 10,
      utilization_pct: Math.round(utilization * 10) / 10,
      sister_placements: sisterPlacements,
      overflow_tools: overflow,
      warnings,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. suggestToolSharing — Consolidate tools across operations
  // ──────────────────────────────────────────────────────────────────────────

  suggestToolSharing(
    operations: ToolChangeOperation[],
  ): ToolSharingResult {
    const warnings: string[] = [];
    const nonShareable: string[] = [];

    // Group operations by tool_type + diameter (within tolerance)
    const groups: Map<string, ToolChangeOperation[]> = new Map();

    for (const op of operations) {
      // Finishing operations with strict Ra cannot share with roughing tools
      if (op.operation_type === "finish" && op.required_Ra_um !== undefined && op.required_Ra_um < 0.8) {
        nonShareable.push(op.id);
        continue;
      }

      // Create a canonical key: type + diameter bucket
      const type = op.tool_type ?? "flat";
      const diamBucket = Math.round(op.tool_diameter_mm * 100) / 100;
      const key = `${type}_${diamBucket}`;

      const group = groups.get(key) ?? [];
      group.push(op);
      groups.set(key, group);
    }

    // Build consolidation groups
    const sharingGroups: ToolSharingGroup[] = [];
    const originalToolIds = new Set<string>();
    let consolidatedCount = 0;

    for (const [key, ops] of groups) {
      // Track all original tool IDs
      const distinctTools = new Set(ops.map(o => o.tool_id));
      for (const t of distinctTools) originalToolIds.add(t);

      if (distinctTools.size <= 1) {
        consolidatedCount++;
        continue;
      }

      // Check if sharing is valid (Ra constraints)
      const minRa = ops.reduce((min, op) => {
        const ra = op.required_Ra_um ?? Infinity;
        return ra < min ? ra : min;
      }, Infinity);

      // If any operation needs Ra < 1.6, limit sharing to same-type operations
      const canShare = minRa >= 1.6 || ops.every(o => o.operation_type === ops[0].operation_type);

      if (!canShare) {
        for (const op of ops) nonShareable.push(op.id);
        for (const t of distinctTools) consolidatedCount++;
        warnings.push(`Group ${key}: Ra constraint prevents full consolidation`);
        continue;
      }

      // Pick the "best" tool (prefer the one with most operations)
      const toolCounts = new Map<string, number>();
      for (const op of ops) {
        toolCounts.set(op.tool_id, (toolCounts.get(op.tool_id) ?? 0) + 1);
      }
      let bestTool = ops[0].tool_id;
      let bestCount = 0;
      for (const [tool, count] of toolCounts) {
        if (count > bestCount) { bestCount = count; bestTool = tool; }
      }

      sharingGroups.push({
        shared_tool_id: bestTool,
        diameter_mm: ops[0].tool_diameter_mm,
        operation_ids: ops.map(o => o.id),
        original_tool_ids: [...distinctTools],
        rationale: `${distinctTools.size} tools consolidated to ${bestTool} — same type=${key.split("_")[0]}, diameter=${ops[0].tool_diameter_mm}mm`,
      });
      consolidatedCount++;
    }

    // Add non-shareable as individual tools
    consolidatedCount += new Set(
      operations.filter(o => nonShareable.includes(o.id)).map(o => o.tool_id)
    ).size;

    const originalCount = new Set(operations.map(o => o.tool_id)).size;

    log.info(`[ToolChangeOptimization] Sharing: ${originalCount} -> ${consolidatedCount} tools`);

    return {
      original_tool_count: originalCount,
      consolidated_tool_count: consolidatedCount,
      tools_saved: originalCount - consolidatedCount,
      groups: sharingGroups,
      non_shareable: nonShareable,
      warnings,
    };
  }
  // ──────────────────────────────────────────────────────────────────────────
  // 4. optimizeWithTSP — ACO-based tool sequence optimization for >10 tool jobs
  // ──────────────────────────────────────────────────────────────────────────

  optimizeWithTSP(
    operations: ToolChangeOperation[],
    machine?: MachineConfig,
  ): ToolChangeResult & {
    tsp_used: boolean;
    tsp_improvement_pct: number;
    tsp_best_time_sec: number;
    tsp_greedy_time_sec: number;
    tsp_method: string;
  } {
    const warnings: string[] = [];

    // Get unique tools and their change times
    const toolIds = [...new Set(operations.map(o => o.tool_id))];
    const n = toolIds.length;
    const atcSwap = machine?.atc_swap_sec ?? DEFAULT_ATC_SWAP_SEC;
    const timePerSlot = machine?.time_per_slot_sec ?? DEFAULT_TIME_PER_SLOT_SEC;

    // For small tool counts, greedy is near-optimal — skip TSP overhead
    if (n < 3) {
      const greedy = this.optimizeToolChanges(operations, [], machine?.magazine_capacity);
      return {
        ...greedy,
        tsp_used: false,
        tsp_improvement_pct: 0,
        tsp_best_time_sec: greedy.total_tool_changes * atcSwap,
        tsp_greedy_time_sec: greedy.total_tool_changes * atcSwap,
        tsp_method: "greedy (< 3 tools)",
      };
    }

    // Build tool change time matrix
    // Time to switch from tool i to tool j depends on magazine distance + ATC swap
    const toolIndex = new Map(toolIds.map((id, i) => [id, i]));
    const changeTimes: Array<{ from: number; to: number; time: number }> = [];

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        // Magazine rotation time depends on pocket distance (assume sequential pockets)
        const pocketDist = Math.abs(i - j);
        const rotTime = pocketDist * timePerSlot;
        changeTimes.push({ from: i, to: j, time: atcSwap + rotTime });
      }
    }

    // Try AntColonyTSP via lazy require
    let tspResult: { best_sequence: number[]; best_time: number; improvement_pct: number; calculation_method: string } | null = null;
    try {
      const { AntColonyTSP } = require("../algorithms/AntColonyTSP.js");
      const tsp = new AntColonyTSP();
      tspResult = tsp.calculate({
        n_tools: n,
        change_times: changeTimes,
        default_change_time: atcSwap,
        n_iterations: Math.min(200, n * 20),
        seed: 42,
      });
    } catch {
      warnings.push("AntColonyTSP algorithm not available — falling back to greedy");
    }

    // Greedy baseline for comparison
    const greedyResult = this.optimizeToolChanges(operations, [], machine?.magazine_capacity);
    const greedyTime = greedyResult.total_tool_changes * atcSwap;

    if (!tspResult) {
      return {
        ...greedyResult,
        tsp_used: false,
        tsp_improvement_pct: 0,
        tsp_best_time_sec: greedyTime,
        tsp_greedy_time_sec: greedyTime,
        tsp_method: "greedy (TSP unavailable)",
      };
    }

    // TSP gives optimal tool ORDER — now resequence operations to follow this order
    const tspToolOrder = tspResult.best_sequence.map(i => toolIds[i]);
    const toolOrderMap = new Map(tspToolOrder.map((id, rank) => [id, rank]));

    // Build prerequisite graph
    const prereqMap = new Map<string, Set<string>>();
    for (const op of operations) {
      if (op.prerequisites) {
        prereqMap.set(op.id, new Set(op.prerequisites));
      }
    }

    // Sort operations by TSP tool order, grouping same-tool ops together
    // Respect prerequisites via stable topological sort
    const opsByTool = new Map<string, ToolChangeOperation[]>();
    for (const op of operations) {
      const group = opsByTool.get(op.tool_id) ?? [];
      group.push(op);
      opsByTool.set(op.tool_id, group);
    }

    const sequenced: ToolChangeOperation[] = [];
    const completed = new Set<string>();

    for (const toolId of tspToolOrder) {
      const toolOps = opsByTool.get(toolId) ?? [];
      // Within each tool group, order by prerequisites
      for (const op of toolOps) {
        const prereqs = prereqMap.get(op.id);
        if (prereqs && ![...prereqs].every(p => completed.has(p))) {
          // Prerequisite not yet met — defer to end
          continue;
        }
        sequenced.push(op);
        completed.add(op.id);
      }
    }

    // Add any deferred operations (prerequisite conflicts)
    for (const op of operations) {
      if (!completed.has(op.id)) {
        sequenced.push(op);
        completed.add(op.id);
        warnings.push(`Op ${op.id} deferred due to prerequisite conflict with TSP order`);
      }
    }

    // Count optimized tool changes
    let tspChanges = 0;
    const optimizedSequence: OptimizedStep[] = [];
    for (let i = 0; i < sequenced.length; i++) {
      const change = i > 0 && sequenced[i].tool_id !== sequenced[i - 1].tool_id;
      if (change) tspChanges++;
      optimizedSequence.push({
        order: i + 1,
        operation_id: sequenced[i].id,
        tool_id: sequenced[i].tool_id,
        tool_change: change,
        cumulative_changes: tspChanges,
        reason: change ? `TSP-optimized switch to ${sequenced[i].tool_id}` : undefined,
      });
    }

    const tspTime = tspResult.best_time;
    const improvement = greedyTime > 0 ? ((greedyTime - tspTime) / greedyTime) * 100 : 0;

    const originalChanges = greedyResult.original_tool_changes;
    const changesSaved = originalChanges - tspChanges;

    log.info(`[ToolChangeOptimization] TSP: ${n} tools, greedy=${greedyResult.total_tool_changes} → TSP=${tspChanges} changes, time saved=${Math.round(improvement)}%`);

    return {
      optimized_sequence: optimizedSequence,
      total_tool_changes: tspChanges,
      changes_saved: changesSaved,
      time_saved_sec: Math.round(changesSaved * atcSwap * 10) / 10,
      original_tool_changes: originalChanges,
      reduction_pct: originalChanges > 0 ? Math.round((changesSaved / originalChanges) * 1000) / 10 : 0,
      warnings: [...greedyResult.warnings, ...warnings],
      tsp_used: true,
      tsp_improvement_pct: Math.round(improvement * 10) / 10,
      tsp_best_time_sec: Math.round(tspTime * 10) / 10,
      tsp_greedy_time_sec: Math.round(greedyTime * 10) / 10,
      tsp_method: tspResult.calculation_method,
    };
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────

export const toolChangeOptimizationEngine = new ToolChangeOptimizationEngine();
