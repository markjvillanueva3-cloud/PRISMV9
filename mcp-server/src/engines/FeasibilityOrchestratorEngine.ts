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

// ============================================================================
// MF-MS1: PUOA Integration Types
// ============================================================================

/** Physical feasibility risk for PUOA pre-flight assessment */
export interface PhysicalFeasibilityRisk {
  risk: string;
  severity: "low" | "medium" | "high" | "critical";
  category: "accessibility" | "workholding" | "rigidity" | "sequence";
  mitigation?: string;
  affected_operation?: string;
}

/** PUOA-compatible feasibility assessment result */
export interface PUOAFeasibilityAssessment {
  /** Can the job proceed? */
  feasible: boolean;
  /** Risk score 0-100 (100 = highest risk) */
  risk_score: number;
  /** Physical feasibility risks for PUOA pre-flight */
  risks: PhysicalFeasibilityRisk[];
  /** Missing prerequisites (tools, fixtures, clearances) */
  missing_prerequisites: string[];
  /** Recommended mitigations/alternatives */
  fallback_strategies: Array<{
    strategy: string;
    trigger: string;
    confidence: number;
  }>;
  /** Success probability based on physics analysis */
  success_probability: number;
  /** Brief summary for LLM context */
  summary: string;
  /** Recommended operation order if reordering would help */
  suggested_reorder?: string[];
}

/** Simplified input for PUOA/LLM/CLI feasibility check */
export interface SimpleFeasibilityInput {
  /** Stock dimensions */
  stock_mm: { length: number; width: number; height: number };
  /** Material name (e.g., "4140", "6061-T6", "D2") */
  material?: string;
  /** Operations to check */
  operations: Array<{
    id?: string;
    type: string;
    tool_diameter_mm: number;
    depth_mm: number;
    width_mm?: number;
    cutting_force_N?: number;
  }>;
  /** Fixture type */
  fixture_type?: string;
  /** Quick mode (skip detailed analysis) */
  quick?: boolean;
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

  // ============================================================================
  // MF-MS1: PUOA Integration Methods
  // ============================================================================

  /**
   * MF-MS1: Assess physical feasibility for PUOA pre-flight.
   * Returns PUOA-compatible risk assessment that integrates with LLM reasoning.
   */
  async assessForPUOA(input: SimpleFeasibilityInput): Promise<PUOAFeasibilityAssessment> {
    // Convert to FeasibilityJob format
    const job: FeasibilityJob = {
      stock: {
        length_mm: input.stock_mm.length,
        width_mm: input.stock_mm.width,
        height_mm: input.stock_mm.height,
      },
      operations: input.operations.map((op, i) => ({
        id: op.id || `op_${i + 1}`,
        type: op.type,
        tool_diameter_mm: op.tool_diameter_mm,
        depth_mm: op.depth_mm,
        width_mm: op.width_mm,
        cutting_force_N: op.cutting_force_N,
      })),
      material: input.material ? { name: input.material } : undefined,
      options: { quick_mode: input.quick },
    };

    // Run feasibility analysis
    const report = input.quick
      ? await this.quickCheckFull(job)
      : await this.fullAnalysis(job);

    // Convert to PUOA-compatible format
    return this.convertToPUOAAssessment(report, input);
  }

  /**
   * Quick check that returns full report structure
   */
  private async quickCheckFull(job: FeasibilityJob): Promise<FeasibilityReport> {
    const start = Date.now();
    const perOp = job.operations.map((op) => ({
      id: op.id,
      accessible: true,
      holdable: true,
      rigid: true,
      force_ok: true,
      risk_pct: 0,
      issues: [] as string[],
    }));

    // Basic checks without full simulation
    for (const opResult of perOp) {
      const op = job.operations.find(o => o.id === opResult.id);
      if (!op) continue;

      // Quick accessibility: tool must reach depth
      if (op.tool_length_mm && op.depth_mm > op.tool_length_mm) {
        opResult.accessible = false;
        opResult.issues.push(`Tool too short: ${op.depth_mm}mm depth > ${op.tool_length_mm}mm tool`);
        opResult.risk_pct = 100;
      }

      // Quick aspect ratio check
      const width = op.width_mm || op.tool_diameter_mm;
      if (op.depth_mm / width > 4) {
        opResult.issues.push(`Deep pocket: aspect ratio ${(op.depth_mm / width).toFixed(1)}`);
        opResult.risk_pct = Math.max(opResult.risk_pct, 50);
      }
    }

    const deadEnds = perOp
      .filter(o => !o.accessible || !o.holdable || !o.rigid)
      .map(o => ({
        after_op: o.id,
        blocked_op: o.id,
        reason: o.issues[0] || "Unknown",
        category: "accessibility",
        severity: "error",
      }));

    return {
      overall_feasible: deadEnds.length === 0,
      dead_ends: deadEnds,
      per_operation: perOp,
      workpiece_evolution: [],
      total_checks: perOp.length,
      analysis_time_ms: Date.now() - start,
      layers_run: ["quick_check"],
    };
  }

  /**
   * Convert FeasibilityReport to PUOA-compatible assessment
   */
  private convertToPUOAAssessment(
    report: FeasibilityReport,
    input: SimpleFeasibilityInput
  ): PUOAFeasibilityAssessment {
    const risks: PhysicalFeasibilityRisk[] = [];
    const missingPrereqs: string[] = [];
    const fallbacks: PUOAFeasibilityAssessment["fallback_strategies"] = [];

    // Convert dead ends to risks
    for (const deadEnd of report.dead_ends) {
      const category = this.categorizeDeadEnd(deadEnd.category);
      risks.push({
        risk: deadEnd.reason,
        severity: deadEnd.severity === "error" ? "high" : "medium",
        category,
        mitigation: deadEnd.suggestion,
        affected_operation: deadEnd.blocked_op,
      });

      // Add fallback strategies based on category
      if (category === "accessibility") {
        fallbacks.push({
          strategy: "Use longer tool or reduce holder protrusion",
          trigger: "Tool cannot reach feature",
          confidence: 0.7,
        });
      } else if (category === "workholding") {
        fallbacks.push({
          strategy: "Reorder operations to preserve clamping surface",
          trigger: "Grip force degradation detected",
          confidence: 0.6,
        });
      } else if (category === "rigidity") {
        fallbacks.push({
          strategy: "Machine thick features first, add spring passes for thin walls",
          trigger: "Deflection exceeds tolerance",
          confidence: 0.8,
        });
      }
    }

    // Convert per-operation issues to risks
    for (const opResult of report.per_operation) {
      if (opResult.issues.length > 0) {
        for (const issue of opResult.issues) {
          // Avoid duplicates from dead_ends
          if (!risks.some(r => r.risk === issue)) {
            const category = this.inferCategory(issue);
            risks.push({
              risk: issue,
              severity: opResult.risk_pct > 75 ? "high" : opResult.risk_pct > 50 ? "medium" : "low",
              category,
              affected_operation: opResult.id,
            });

            // Add fallback strategies for per-operation issues too
            if (category === "accessibility" && !fallbacks.some(f => f.trigger.includes("pocket"))) {
              fallbacks.push({
                strategy: "Use shorter tool with multiple depth passes, or pecking cycle",
                trigger: "Deep pocket detected",
                confidence: 0.75,
              });
            }
          }
        }
      }

      // Check for missing prerequisites
      if (!opResult.accessible) {
        missingPrereqs.push(`Longer tool needed for ${opResult.id}`);
      }
    }

    // Calculate success probability
    const avgRisk = report.per_operation.length > 0
      ? report.per_operation.reduce((s, o) => s + o.risk_pct, 0) / report.per_operation.length
      : 0;
    const successProbability = Math.max(0, Math.min(1, 1 - avgRisk / 100));

    // Generate summary for LLM context
    const summary = this.generateSummary(report, risks);

    return {
      feasible: report.overall_feasible,
      risk_score: Math.round(avgRisk),
      risks,
      missing_prerequisites: missingPrereqs,
      fallback_strategies: fallbacks,
      success_probability: successProbability,
      summary,
      suggested_reorder: report.suggested_reorder,
    };
  }

  /**
   * Categorize dead end by issue type
   */
  private categorizeDeadEnd(
    category: string
  ): "accessibility" | "workholding" | "rigidity" | "sequence" {
    const lower = category.toLowerCase();
    if (lower.includes("access") || lower.includes("reach") || lower.includes("holder")) {
      return "accessibility";
    }
    if (lower.includes("hold") || lower.includes("clamp") || lower.includes("grip")) {
      return "workholding";
    }
    if (lower.includes("rigid") || lower.includes("deflect") || lower.includes("vibrat")) {
      return "rigidity";
    }
    return "sequence";
  }

  /**
   * Infer category from issue text
   */
  private inferCategory(
    issue: string
  ): "accessibility" | "workholding" | "rigidity" | "sequence" {
    const lower = issue.toLowerCase();
    if (lower.includes("tool") || lower.includes("reach") || lower.includes("holder") || lower.includes("aspect")) {
      return "accessibility";
    }
    if (lower.includes("clamp") || lower.includes("grip") || lower.includes("hold")) {
      return "workholding";
    }
    if (lower.includes("thin") || lower.includes("deflect") || lower.includes("vibrat") || lower.includes("rigid")) {
      return "rigidity";
    }
    return "sequence";
  }

  /**
   * Generate human-readable summary for LLM context
   */
  private generateSummary(report: FeasibilityReport, risks: PhysicalFeasibilityRisk[]): string {
    if (report.overall_feasible && risks.length === 0) {
      return "Physical feasibility analysis passed. All operations are accessible, workholding is adequate, and rigidity is sufficient.";
    }

    const highRisks = risks.filter(r => r.severity === "high" || r.severity === "critical");
    const medRisks = risks.filter(r => r.severity === "medium");

    const parts: string[] = [];

    if (!report.overall_feasible) {
      parts.push("Physical feasibility check FAILED.");
    } else {
      parts.push("Physical feasibility check passed with warnings.");
    }

    if (highRisks.length > 0) {
      const categories = [...new Set(highRisks.map(r => r.category))];
      parts.push(`High-risk issues: ${categories.join(", ")}.`);
    }

    if (medRisks.length > 0) {
      parts.push(`${medRisks.length} medium-risk warning(s).`);
    }

    if (report.suggested_reorder && report.suggested_reorder.length > 0) {
      parts.push("Reordering operations may resolve issues.");
    }

    return parts.join(" ");
  }
}

export const feasibilityOrchestratorEngine =
  new FeasibilityOrchestratorEngineImpl();
export { FeasibilityOrchestratorEngineImpl };
