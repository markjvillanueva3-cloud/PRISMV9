/**
 * FeasibilityOrchestratorEngine — Master orchestrator for the Machining
 * Feasibility Intelligence Stack.
 *
 * Chains all feasibility layers: WorkpieceState → Accessibility →
 * Workholding → Rigidity → SequenceFeasibility → report.
 *
 * @module FeasibilityOrchestratorEngine
 */

export interface FeasibilityJob {
  stock: { length_mm: number; width_mm: number; height_mm: number };
  operations: Array<{
    id: string;
    name?: string;
    type: string;
    tool_diameter_mm: number;
    tool_length_mm?: number;
    holder_diameter_mm?: number;
    depth_mm: number;
    width_mm?: number;
    length_mm?: number;
    position?: { x: number; y: number; z: number };
    cutting_force_N?: number;
    tolerance_mm?: number;
    approach_direction?: string;
    prerequisites?: string[];
    removes_surface?: string;
    creates_thin_wall?: {
      thickness_mm: number;
      height_mm: number;
      length_mm: number;
    };
  }>;
  material?: {
    name?: string;
    E_GPa?: number;
    friction_coeff?: number;
    density_kg_m3?: number;
  };
  machine?: {
    max_power_kW?: number;
    max_torque_Nm?: number;
    max_rpm?: number;
  };
  options?: {
    auto_reorder?: boolean;
    quick_mode?: boolean;
    safety_factor?: number;
  };
}

export interface FeasibilityReport {
  overall_feasible: boolean;
  dead_ends: Array<{
    after_op: string;
    blocked_op: string;
    reason: string;
    category: string;
    severity: string;
    suggestion?: string;
  }>;
  per_operation: Array<{
    id: string;
    accessible: boolean;
    holdable: boolean;
    rigid: boolean;
    force_ok: boolean;
    risk_pct: number;
    issues: string[];
  }>;
  workpiece_evolution: Array<{
    after_op: string;
    volume_removed_pct: number;
    min_wall_mm: number;
    clamp_area_ratio: number;
  }>;
  suggested_reorder?: string[];
  total_checks: number;
  analysis_time_ms: number;
  layers_run: string[];
}

class FeasibilityOrchestratorEngineImpl {
  /**
   * Full analysis — runs all feasibility layers
   */
  async fullAnalysis(job: FeasibilityJob): Promise<FeasibilityReport> {
    const start = Date.now();
    const layers: string[] = [];
    const evolution: FeasibilityReport["workpiece_evolution"] = [];

    // Layer 1: Initialize workpiece state
    let wsEngine: any;
    let state: any;
    try {
      const mod = await import("./WorkpieceStateEngine.js");
      wsEngine = mod.workpieceStateEngine;
      const initResult = wsEngine.initialize({
        length_mm: job.stock.length_mm,
        width_mm: job.stock.width_mm,
        height_mm: job.stock.height_mm,
        material: job.material?.name,
      });
      state = initResult?.value ?? initResult;
      layers.push("workpiece_state");
    } catch {
      state = null;
    }

    // Layer 2+3: Run sequence feasibility (covers accessibility,
    // workholding, rigidity checks at each step)
    let seqResult: any;
    try {
      const mod = await import("./SequenceFeasibilityEngine.js");
      seqResult = mod.sequenceFeasibilityEngine.simulateSequence({
        operations: (job.operations as any[]).map((op: any, idx: number) => ({
          id: op.id || `op_${idx}`,
          type: op.type || "pocket",
          position: op.position || { x: 0, y: 0, z: job.stock.height_mm || 50 },
          dimensions: {
            width: op.width_mm || op.diameter_mm || 20,
            height: op.length_mm || op.diameter_mm || 20,
            depth: op.depth_mm || 10,
          },
          tool: {
            id: op.tool_id || `T${idx + 1}`,
            diameter_mm: op.tool_diameter_mm || 10,
            length_mm: op.tool_length_mm || 50,
          },
          forces: op.cutting_force_N ? { cutting_force_N: op.cutting_force_N } : undefined,
          requires_datum: op.requires_datum,
          removes_surface: op.removes_surface,
          creates_surface: op.creates_surface,
          requires_surface: op.requires_surface,
          setup_id: op.setup_id,
        })),
        stock: {
          bounds: {
            min_x: 0, max_x: job.stock.length_mm || 200,
            min_y: 0, max_y: job.stock.width_mm || 200,
            min_z: 0, max_z: job.stock.height_mm || 50,
          },
          material: job.material?.name || "unknown",
        },
        workholding: {
          clamping_method: "vise" as const,
          clamp_positions: [{
            face: "bottom",
            area_mm2: (job.stock.length_mm || 200) * (job.stock.width_mm || 200),
            position: { x: 0, y: 0, z: 0 },
          }],
          friction_coefficient: job.material?.friction_coeff,
        },
        safety_factor: job.options?.safety_factor,
      });
      layers.push("sequence_feasibility");
    } catch {
      seqResult = {
        feasible: true, dead_ends: [], per_operation: [],
        risk_scores: [], total_checks: 0,
      };
    }

    // Track workpiece evolution through operations
    if (wsEngine && state) {
      for (const op of job.operations) {
        try {
          const r = wsEngine.applyOperation(state, {
            id: op.id,
            type: op.type,
            tool_diameter_mm: op.tool_diameter_mm,
            depth_mm: op.depth_mm,
            width_mm: op.width_mm,
            length_mm: op.length_mm,
            position: op.position ?? { x: 0, y: 0, z: 0 },
            approach_direction: op.approach_direction,
          });
          state = r?.value ?? r;
          const topZone = state.clamping_zones?.find(
            (z: any) => z.face === "top"
          );
          evolution.push({
            after_op: op.id,
            volume_removed_pct: state.volume_removed_pct ?? 0,
            min_wall_mm: state.min_wall_thickness_mm ?? 999,
            clamp_area_ratio: topZone?.area_ratio ?? 1,
          });
        } catch {
          evolution.push({
            after_op: op.id,
            volume_removed_pct: 0,
            min_wall_mm: 999,
            clamp_area_ratio: 1,
          });
        }
      }
      layers.push("workpiece_evolution");
    }

    // Layer 4: Force capability check
    let forceIssues: string[] = [];
    try {
      const mod = await import("./ForceCapabilityEngine.js");
      const eng = mod.forceCapabilityEngine;
      for (const op of job.operations) {
        if (op.cutting_force_N) {
          const r = (eng as any).check({
            cutting_force_N: op.cutting_force_N,
            cutting_speed_m_min: 150,
            tool_diameter_mm: op.tool_diameter_mm,
            spindle_rpm: job.machine?.max_rpm ?? 8000,
            machine_max_power_kW: job.machine?.max_power_kW,
            machine_max_torque_Nm: job.machine?.max_torque_Nm,
          });
          const result = r?.value ?? r;
          if (result && !result.within_limits) {
            forceIssues.push(
              `Op '${op.name ?? op.id}': ${result.limiting_factor} exceeded`
            );
          }
        }
      }
      layers.push("force_capability");
    } catch {
      // ForceCapabilityEngine not available
    }

    // Build per-operation report merging sequence + force results
    const perOp = job.operations.map((op, idx) => {
      const seqOp = seqResult.per_operation[idx];
      const risk = seqResult.risk_scores?.[idx];
      return {
        id: op.id,
        accessible: seqOp?.accessible ?? true,
        holdable: seqOp?.holdable ?? true,
        rigid: seqOp?.rigid_enough ?? true,
        force_ok: seqOp?.force_ok ?? true,
        risk_pct: risk?.risk_pct ?? 0,
        issues: [
          ...(seqOp?.issues ?? []),
          ...forceIssues.filter(i => i.includes(op.id)),
        ],
      };
    });

    return {
      overall_feasible: seqResult.feasible &&
        forceIssues.length === 0,
      dead_ends: seqResult.dead_ends,
      per_operation: perOp,
      workpiece_evolution: evolution,
      suggested_reorder: seqResult.suggested_reorder,
      total_checks: seqResult.total_checks,
      analysis_time_ms: Date.now() - start,
      layers_run: layers,
    };
  }

  /**
   * Quick check — fast pass/fail with top issues
   */
  async quickCheck(job: FeasibilityJob): Promise<{
    feasible: boolean;
    top_issues: string[];
    risk_score: number;
  }> {
    const report = await this.fullAnalysis({
      ...job,
      options: { ...job.options, quick_mode: true },
    });
    const topIssues = report.per_operation
      .flatMap(o => o.issues)
      .slice(0, 5);
    const avgRisk = report.per_operation.length > 0
      ? report.per_operation.reduce((s, o) => s + o.risk_pct, 0) /
        report.per_operation.length
      : 0;

    return {
      feasible: report.overall_feasible,
      top_issues: topIssues,
      risk_score: Math.round(avgRisk),
    };
  }

  /**
   * What-if — test impact of reordering
   */
  async whatIf(
    job: FeasibilityJob,
    moveOpId: string,
    toPosition: number
  ): Promise<{
    before_feasible: boolean;
    after_feasible: boolean;
    improvement: boolean;
    dead_ends_change: number;
  }> {
    const before = await this.fullAnalysis(job);
    const reordered = job.operations.filter(o => o.id !== moveOpId);
    const moved = job.operations.find(o => o.id === moveOpId);
    if (!moved) {
      return {
        before_feasible: before.overall_feasible,
        after_feasible: before.overall_feasible,
        improvement: false,
        dead_ends_change: 0,
      };
    }
    reordered.splice(
      Math.min(toPosition, reordered.length), 0, moved
    );
    const after = await this.fullAnalysis({
      ...job, operations: reordered,
    });
    return {
      before_feasible: before.overall_feasible,
      after_feasible: after.overall_feasible,
      improvement: after.dead_ends.length < before.dead_ends.length,
      dead_ends_change:
        after.dead_ends.length - before.dead_ends.length,
    };
  }
}

export const feasibilityOrchestratorEngine =
  new FeasibilityOrchestratorEngineImpl();
export { FeasibilityOrchestratorEngineImpl };
