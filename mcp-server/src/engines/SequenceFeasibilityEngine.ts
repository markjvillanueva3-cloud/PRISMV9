/**
 * SequenceFeasibilityEngine — Forward simulation + dead-end detection
 *
 * Executes the operation sequence virtually, checking all physical feasibility
 * constraints at each step. Detects dead-ends where completing one operation
 * makes a future operation impossible. Implements backtracking search with
 * constraint propagation to find valid orderings or prove none exist.
 *
 * Physics:
 *   - Tool reach: tool_length >= feature_depth + clearance
 *   - Grip force: μ × P × A_remaining > F_cut × SF
 *   - Wall stiffness: k = 3EI/H³, δ = F/k, I = Lt³/12
 *   - Natural frequency: fn = (1/2π)√(k/m)
 *
 * @module SequenceFeasibilityEngine
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface FeasibilityOperation {
  id: string;
  name?: string;
  type: string; // pocket, hole, face, profile, slot, contour, drill, bore, thread
  tool_diameter_mm: number;
  tool_length_mm?: number;
  holder_diameter_mm?: number;
  depth_mm: number;
  width_mm?: number;
  length_mm?: number;
  position?: { x: number; y: number; z: number };
  cutting_force_N?: number;
  approach_direction?: "top" | "bottom" | "left" | "right" | "front" | "back";
  tolerance_mm?: number;
  prerequisites?: string[]; // operation IDs that must come before this one
  removes_surface?: string; // surface ID this operation removes (for clamping tracking)
  creates_thin_wall?: { thickness_mm: number; height_mm: number; length_mm: number };
}

export interface DeadEnd {
  after_operation_id: string;
  blocked_operation_id: string;
  reason: string;
  category: "accessibility" | "workholding" | "rigidity" | "force" | "prerequisite";
  severity: "critical" | "warning";
  suggestion?: string;
}

export interface FeasibilityCheckResult {
  operation_id: string;
  accessible: boolean;
  holdable: boolean;
  rigid_enough: boolean;
  force_ok: boolean;
  issues: string[];
}

export interface SequenceSimulationResult {
  feasible: boolean;
  dead_ends: DeadEnd[];
  per_operation: FeasibilityCheckResult[];
  risk_scores: Array<{ operation_id: string; risk_pct: number; reasons: string[] }>;
  suggested_reorder?: string[];
  total_checks: number;
  simulation_time_ms: number;
}

export interface ReorderResult {
  found: boolean;
  sequence: string[];
  permutations_explored: number;
  reason: string;
}

// ─── Constants ───────────────────────────────────────────────────────

const DEFAULT_CLEARANCE_MM = 5;
const DEFAULT_SAFETY_FACTOR = 2.0;
const DEFAULT_FRICTION_COEFF = 0.15;
const DEFAULT_CLAMP_PRESSURE_MPA = 2.0;
const DEFAULT_E_STEEL_GPA = 200;
const DEFAULT_TOLERANCE_MM = 0.05;
const MAX_BACKTRACK_PERMUTATIONS = 1000;
const DENSITY_STEEL_KG_M3 = 7850;

// ─── Engine Implementation ───────────────────────────────────────────

class SequenceFeasibilityEngineImpl {

  /**
   * Forward simulate the operation sequence, checking all constraints at each step.
   * Returns dead-ends, risk scores, and optional reordering suggestion.
   */
  simulate(
    operations: FeasibilityOperation[],
    stock: { length_mm: number; width_mm: number; height_mm: number },
    options?: {
      material_E_GPa?: number;
      friction_coeff?: number;
      safety_factor?: number;
      clamp_area_mm2?: number;
      auto_reorder?: boolean;
    }
  ): SequenceSimulationResult {
    const startTime = Date.now();
    const E = (options?.material_E_GPa ?? DEFAULT_E_STEEL_GPA) * 1000; // GPa → MPa
    const mu = options?.friction_coeff ?? DEFAULT_FRICTION_COEFF;
    const sf = options?.safety_factor ?? DEFAULT_SAFETY_FACTOR;
    let remainingClampArea = options?.clamp_area_mm2 ?? stock.length_mm * stock.width_mm;

    const deadEnds: DeadEnd[] = [];
    const perOp: FeasibilityCheckResult[] = [];
    const riskScores: SequenceSimulationResult["risk_scores"] = [];
    let totalChecks = 0;

    // Track wall sections created by operations
    const wallSections: Array<{
      created_by: string;
      thickness_mm: number;
      height_mm: number;
      length_mm: number;
    }> = [];

    // Track which operations have been applied
    const applied = new Set<string>();

    // Forward simulation
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      const issues: string[] = [];
      let accessible = true;
      let holdable = true;
      let rigid = true;
      let forceOk = true;
      const risks: string[] = [];

      // ── Prerequisite check ──
      if (op.prerequisites) {
        for (const prereq of op.prerequisites) {
          if (!applied.has(prereq)) {
            deadEnds.push({
              after_operation_id: operations[i - 1]?.id ?? "start",
              blocked_operation_id: op.id,
              reason: `Prerequisite '${prereq}' not yet completed`,
              category: "prerequisite",
              severity: "critical",
            });
            issues.push(`Missing prerequisite: ${prereq}`);
          }
        }
      }

      // ── Accessibility check ──
      const toolLength = op.tool_length_mm ?? op.tool_diameter_mm * 4;
      const requiredReach = op.depth_mm + DEFAULT_CLEARANCE_MM;
      if (toolLength < requiredReach) {
        accessible = false;
        issues.push(`Tool length ${toolLength}mm < required ${requiredReach}mm (depth ${op.depth_mm}mm + ${DEFAULT_CLEARANCE_MM}mm clearance)`);
        risks.push("tool_reach");
        totalChecks++;
      }

      // Corner radius check (tool must fit)
      if (op.width_mm && op.tool_diameter_mm > op.width_mm) {
        accessible = false;
        issues.push(`Tool diameter ${op.tool_diameter_mm}mm > feature width ${op.width_mm}mm`);
        risks.push("tool_too_large");
        totalChecks++;
      }

      // Holder clearance check
      if (op.holder_diameter_mm && op.depth_mm > 0) {
        const holderMargin = (op.width_mm ?? op.tool_diameter_mm * 3) / 2 - op.holder_diameter_mm / 2;
        if (holderMargin < 2) {
          issues.push(`Holder clearance ${holderMargin.toFixed(1)}mm < 2mm minimum`);
          risks.push("holder_collision");
          if (holderMargin < 0) accessible = false;
        }
        totalChecks++;
      }

      // Check against ALL remaining operations for dead-ends
      for (let j = i + 1; j < operations.length; j++) {
        const futureOp = operations[j];
        totalChecks++;

        // Will this operation create a thin wall that blocks future operations?
        if (op.creates_thin_wall) {
          const tw = op.creates_thin_wall;
          const I = tw.length_mm * Math.pow(tw.thickness_mm, 3) / 12;
          const k = 3 * E * I / Math.pow(tw.height_mm, 3);
          const futureForce = futureOp.cutting_force_N ?? 500;
          const deflection = futureForce / k;
          const tol = futureOp.tolerance_mm ?? DEFAULT_TOLERANCE_MM;

          if (deflection > tol) {
            deadEnds.push({
              after_operation_id: op.id,
              blocked_operation_id: futureOp.id,
              reason: `Thin wall (${tw.thickness_mm}mm) created by '${op.name ?? op.id}' deflects ${deflection.toFixed(3)}mm under ${futureForce}N force — exceeds ${tol}mm tolerance for '${futureOp.name ?? futureOp.id}'`,
              category: "rigidity",
              severity: deflection > tol * 3 ? "critical" : "warning",
              suggestion: `Move '${futureOp.name ?? futureOp.id}' before '${op.name ?? op.id}', or add support/spring passes`,
            });
          }
        }
      }

      // ── Workholding check ──
      if (op.removes_surface) {
        // Estimate area removed (simplified)
        const removedArea = (op.width_mm ?? op.tool_diameter_mm) * (op.length_mm ?? op.tool_diameter_mm);
        remainingClampArea = Math.max(0, remainingClampArea - removedArea);
      }

      const gripForce = mu * DEFAULT_CLAMP_PRESSURE_MPA * remainingClampArea;
      const cuttingForce = op.cutting_force_N ?? 500;
      const gripMargin = gripForce / (cuttingForce * sf);

      if (gripMargin < 1.0) {
        holdable = false;
        issues.push(`Grip force ${gripForce.toFixed(0)}N < required ${(cuttingForce * sf).toFixed(0)}N (margin ${gripMargin.toFixed(2)})`);
        risks.push("insufficient_grip");

        // Check if any FUTURE operation is also affected
        for (let j = i + 1; j < operations.length; j++) {
          const futureForce = operations[j].cutting_force_N ?? 500;
          if (gripForce < futureForce * sf) {
            deadEnds.push({
              after_operation_id: op.id,
              blocked_operation_id: operations[j].id,
              reason: `Remaining clamping area ${remainingClampArea.toFixed(0)}mm² provides only ${gripForce.toFixed(0)}N grip — insufficient for ${futureForce}N cutting force on '${operations[j].name ?? operations[j].id}'`,
              category: "workholding",
              severity: "critical",
              suggestion: "Re-fixture between these operations or reduce cutting force",
            });
          }
        }
      }
      totalChecks++;

      // ── Rigidity check for existing thin walls ──
      for (const wall of wallSections) {
        const I = wall.length_mm * Math.pow(wall.thickness_mm, 3) / 12;
        const k = 3 * E * I / Math.pow(wall.height_mm, 3);
        const deflection = cuttingForce / k;
        const tol = op.tolerance_mm ?? DEFAULT_TOLERANCE_MM;

        if (deflection > tol) {
          rigid = false;
          issues.push(`Thin wall from op '${wall.created_by}' (${wall.thickness_mm}mm) deflects ${deflection.toFixed(3)}mm > tolerance ${tol}mm`);
          risks.push("wall_deflection");
        }
        totalChecks++;
      }

      // ── Force capability check ──
      // Simplified: check if cutting force is reasonable for tool size
      const maxForceForTool = 500 * Math.pow(op.tool_diameter_mm / 10, 2); // rough scaling
      if (cuttingForce > maxForceForTool) {
        issues.push(`Cutting force ${cuttingForce}N may exceed tool capacity for D${op.tool_diameter_mm}mm`);
        risks.push("force_excessive");
        forceOk = false;
        totalChecks++;
      }

      // Record results
      perOp.push({
        operation_id: op.id,
        accessible,
        holdable,
        rigid_enough: rigid,
        force_ok: forceOk,
        issues,
      });

      // Risk score: 0-100
      const riskPct = Math.min(100,
        (!accessible ? 40 : 0) +
        (!holdable ? 30 : 0) +
        (!rigid ? 20 : 0) +
        (!forceOk ? 10 : 0) +
        (risks.length * 5)
      );
      riskScores.push({ operation_id: op.id, risk_pct: riskPct, reasons: risks });

      // Track this operation
      applied.add(op.id);
      if (op.creates_thin_wall) {
        wallSections.push({ created_by: op.id, ...op.creates_thin_wall });
      }
    }

    // Auto-reorder if requested and dead-ends found
    let suggestedReorder: string[] | undefined;
    if (options?.auto_reorder && deadEnds.length > 0) {
      const reorder = this.findValidOrdering(operations);
      if (reorder.found) {
        suggestedReorder = reorder.sequence;
      }
    }

    return {
      feasible: deadEnds.filter(d => d.severity === "critical").length === 0,
      dead_ends: deadEnds,
      per_operation: perOp,
      risk_scores: riskScores,
      suggested_reorder: suggestedReorder,
      total_checks: totalChecks,
      simulation_time_ms: Date.now() - startTime,
    };
  }

  /**
   * Find a valid ordering of operations that avoids all dead-ends.
   * Uses backtracking with heuristic ordering.
   */
  findValidOrdering(operations: FeasibilityOperation[]): ReorderResult {
    const n = operations.length;
    if (n > 15) {
      return {
        found: false, sequence: [],
        permutations_explored: 0,
        reason: `Too many operations (${n}) for exhaustive search — max 15`,
      };
    }

    // Heuristic strategies to try first
    const strategies = [
      this._orderByRoughFirst(operations),
      this._orderByThickFirst(operations),
      this._orderByOutsideIn(operations),
      this._orderByPrerequisites(operations),
    ];

    // Try heuristic strategies first
    for (const seq of strategies) {
      const result = this.simulate(seq, { length_mm: 100, width_mm: 100, height_mm: 50 });
      if (result.feasible) {
        return {
          found: true,
          sequence: seq.map(o => o.id),
          permutations_explored: strategies.indexOf(seq) + 1,
          reason: "Heuristic ordering found feasible sequence",
        };
      }
    }

    // Backtracking search
    let explored = strategies.length;
    const remaining = [...operations];
    const sequence: FeasibilityOperation[] = [];
    const used = new Set<number>();

    const backtrack = (): boolean => {
      if (explored >= MAX_BACKTRACK_PERMUTATIONS) return false;
      if (sequence.length === n) {
        explored++;
        const result = this.simulate(sequence, { length_mm: 100, width_mm: 100, height_mm: 50 });
        return result.feasible;
      }

      for (let i = 0; i < n; i++) {
        if (used.has(i)) continue;
        explored++;

        // Check prerequisites
        const op = remaining[i];
        if (op.prerequisites?.some(p => !sequence.find(s => s.id === p))) continue;

        used.add(i);
        sequence.push(op);

        if (backtrack()) return true;

        sequence.pop();
        used.delete(i);
      }
      return false;
    };

    const found = backtrack();
    return {
      found,
      sequence: found ? sequence.map(o => o.id) : [],
      permutations_explored: explored,
      reason: found
        ? "Backtracking search found feasible sequence"
        : `No feasible ordering found after ${explored} permutations`,
    };
  }

  /**
   * What-if analysis: test the impact of moving one operation.
   */
  whatIf(
    operations: FeasibilityOperation[],
    stock: { length_mm: number; width_mm: number; height_mm: number },
    moveOpId: string,
    toPosition: number
  ): { before: SequenceSimulationResult; after: SequenceSimulationResult; improvement: boolean } {
    const before = this.simulate(operations, stock);

    // Create reordered sequence
    const reordered = operations.filter(o => o.id !== moveOpId);
    const movedOp = operations.find(o => o.id === moveOpId);
    if (!movedOp) return { before, after: before, improvement: false };

    reordered.splice(Math.min(toPosition, reordered.length), 0, movedOp);
    const after = this.simulate(reordered, stock);

    return {
      before,
      after,
      improvement: after.dead_ends.length < before.dead_ends.length ||
        after.risk_scores.reduce((s, r) => s + r.risk_pct, 0) <
        before.risk_scores.reduce((s, r) => s + r.risk_pct, 0),
    };
  }

  // ─── Heuristic Ordering Strategies ─────────────────────────────────

  private _orderByRoughFirst(ops: FeasibilityOperation[]): FeasibilityOperation[] {
    return [...ops].sort((a, b) => {
      const aRough = /rough|face|hog/i.test(a.type) ? 0 : /semi/i.test(a.type) ? 1 : 2;
      const bRough = /rough|face|hog/i.test(b.type) ? 0 : /semi/i.test(b.type) ? 1 : 2;
      return aRough - bRough;
    });
  }

  private _orderByThickFirst(ops: FeasibilityOperation[]): FeasibilityOperation[] {
    return [...ops].sort((a, b) => {
      const aThick = a.creates_thin_wall?.thickness_mm ?? 999;
      const bThick = b.creates_thin_wall?.thickness_mm ?? 999;
      return bThick - aThick; // thickest walls first (thin walls last)
    });
  }

  private _orderByOutsideIn(ops: FeasibilityOperation[]): FeasibilityOperation[] {
    return [...ops].sort((a, b) => {
      const aBoundary = a.type === "face" || a.type === "profile" ? 0 : 1;
      const bBoundary = b.type === "face" || b.type === "profile" ? 0 : 1;
      return aBoundary - bBoundary;
    });
  }

  private _orderByPrerequisites(ops: FeasibilityOperation[]): FeasibilityOperation[] {
    // Topological sort respecting prerequisites
    const sorted: FeasibilityOperation[] = [];
    const visited = new Set<string>();
    const opMap = new Map(ops.map(o => [o.id, o]));

    const visit = (op: FeasibilityOperation) => {
      if (visited.has(op.id)) return;
      visited.add(op.id);
      if (op.prerequisites) {
        for (const prereqId of op.prerequisites) {
          const prereq = opMap.get(prereqId);
          if (prereq) visit(prereq);
        }
      }
      sorted.push(op);
    };

    for (const op of ops) visit(op);
    return sorted;
  }
}

export const sequenceFeasibilityEngine = new SequenceFeasibilityEngineImpl();
export { SequenceFeasibilityEngineImpl };
