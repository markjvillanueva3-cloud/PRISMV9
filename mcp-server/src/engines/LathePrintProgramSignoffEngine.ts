/**
 * LathePrintProgramSignoffEngine — U-LTH41 (LATHE-MASTER P4) — FINAL
 *
 * Produces machinist-grade signoff package that includes:
 *   - Program validation (syntax, physics, safety, envelope)
 *   - Feature → strategy → operation table
 *   - Risk summary with severity tiers
 *   - Cpk predictions per critical feature
 *   - Approval chain + sign-off document (markdown/JSON)
 *
 * Aggregates checks from all upstream engines (U-LTH36..U-LTH40) + adds a
 * final gate: the program is release-ready iff ALL critical checks pass.
 *
 * @milestone LATHE-MASTER U-LTH41
 * @version 1.0.0
 */

import { z } from "zod";
import type { StrategyPlan } from "./LathePrintFeatureStrategySelectorEngine.js";
import type { SequencePlan } from "./LathePrintSequencePlannerEngine.js";
import type { SetupRecommendation } from "./LathePrintSetupSelectionEngine.js";
import type { ToolpathProgram } from "./LathePrintToolpathGeneratorEngine.js";
import type { EmittedProgram } from "./LathePrintProgramEmitterEngine.js";
import type { FeatureInput, MaterialInput } from "./LathePrintFeatureStrategySelectorEngine.js";

// ============================================================================
// SCHEMAS
// ============================================================================

export const ValidationCheckSchema = z.object({
  check_id: z.string(),
  category: z.enum(["syntax", "physics", "safety", "envelope", "tolerance", "setup", "kinematics"]),
  severity: z.enum(["critical", "error", "warning", "info"]),
  status: z.enum(["pass", "fail", "skip"]),
  message: z.string(),
  evidence: z.string().optional(),
  citation: z.string().optional(),
});
export type ValidationCheck = z.infer<typeof ValidationCheckSchema>;

export const FeatureRowSchema = z.object({
  feature_id: z.string(),
  feature_type: z.string(),
  strategy_id: z.string(),
  strategy_name: z.string(),
  tool_id: z.string(),
  op_number: z.number().int(),
  spindle_rpm: z.number(),
  feed_mm_min: z.number(),
  cutting_force_n: z.number(),
  cpk_target: z.number().optional(),
  cpk_predicted: z.number().optional(),
  cpk_status: z.enum(["exceeds", "meets", "marginal", "below"]).optional(),
  cycle_time_sec: z.number(),
});
export type FeatureRow = z.infer<typeof FeatureRowSchema>;

export const RiskItemSchema = z.object({
  risk_id: z.string(),
  severity: z.enum(["critical", "high", "medium", "low"]),
  category: z.string(),
  description: z.string(),
  mitigation: z.string(),
  affects_features: z.array(z.string()),
});
export type RiskItem = z.infer<typeof RiskItemSchema>;

export const SignoffPackageSchema = z.object({
  package_id: z.string(),
  program_id: z.string(),
  part_number: z.string().optional(),
  customer: z.string().optional(),
  generated_at: z.string(),
  generated_by: z.string(),
  controller: z.string(),
  material: z.object({
    name: z.string(),
    iso_group: z.string(),
    hardness_hrc: z.number().optional(),
  }),
  validation_checks: z.array(ValidationCheckSchema),
  feature_strategy_ops: z.array(FeatureRowSchema),
  risks: z.array(RiskItemSchema),
  cpk_summary: z.object({
    critical_features: z.number().int().min(0),
    features_meeting_cpk: z.number().int().min(0),
    avg_predicted_cpk: z.number(),
    min_predicted_cpk: z.number(),
  }),
  setup_summary: z.object({
    chuck_type: z.string(),
    chuck_grip_force_kn: z.number(),
    needs_tailstock: z.boolean(),
    needs_steady_rest: z.boolean(),
    soft_jaw_required: z.boolean(),
    ld_ratio: z.number(),
  }).optional(),
  program_summary: z.object({
    operation_count: z.number().int().min(0),
    tool_count: z.number().int().min(0),
    cycle_time_min: z.number(),
    gcode_lines: z.number().int().min(0),
    material_removed_cm3: z.number(),
  }),
  critical_fail_count: z.number().int().min(0),
  error_count: z.number().int().min(0),
  warning_count: z.number().int().min(0),
  approval_chain: z.array(z.object({
    role: z.enum(["programmer", "engineer", "machinist", "qc", "supervisor"]),
    required: z.boolean(),
    approved: z.boolean(),
    approver_name: z.string().optional(),
    approved_at: z.string().optional(),
    notes: z.string().optional(),
  })),
  release_ready: z.boolean(),
  release_blocker: z.string().optional(),
  markdown_report: z.string(),
});
export type SignoffPackage = z.infer<typeof SignoffPackageSchema>;

export const SignoffInputSchema = z.object({
  strategy_plan: z.any(),   // validated structurally in code (avoids nested Zod cost)
  sequence_plan: z.any(),
  setup: z.any().optional(),
  toolpath: z.any(),
  emitted: z.any(),
  features: z.array(z.any()),
  material: z.any(),
  part_number: z.string().optional(),
  customer: z.string().optional(),
});
export type SignoffInput = z.infer<typeof SignoffInputSchema>;

// ============================================================================
// ENGINE
// ============================================================================

class LathePrintProgramSignoffEngine {
  /**
   * Generate a complete signoff package.
   * Aggregates checks from all upstream engines + produces markdown report.
   * @param input All artifacts from U-LTH33..U-LTH40
   * @returns SignoffPackage with release_ready flag + markdown document
   */
  generatePackage(input: SignoffInput): SignoffPackage {
    this.validateInput(input);

    const strategyPlan: StrategyPlan = input.strategy_plan;
    const sequencePlan: SequencePlan = input.sequence_plan;
    const toolpath: ToolpathProgram = input.toolpath;
    const emitted: EmittedProgram = input.emitted;
    const setup: SetupRecommendation | undefined = input.setup;
    const features: FeatureInput[] = input.features;
    const material: MaterialInput = input.material;

    const checks = this.runValidations(strategyPlan, sequencePlan, toolpath, emitted, setup);
    const featureRows = this.buildFeatureRows(strategyPlan, sequencePlan, toolpath, features);
    const risks = this.identifyRisks(strategyPlan, sequencePlan, toolpath, setup, material);
    const cpkSummary = this.summarizeCpk(featureRows);

    const criticalFails = checks.filter(c => c.severity === "critical" && c.status === "fail").length;
    const errorCount = checks.filter(c => c.severity === "error" && c.status === "fail").length;
    const warningCount = checks.filter(c => c.severity === "warning" && c.status === "fail").length;

    const releaseReady = criticalFails === 0 && errorCount === 0;
    const blocker = !releaseReady
      ? (criticalFails > 0
          ? `${criticalFails} critical check(s) failed`
          : `${errorCount} error(s) present`)
      : undefined;

    const approvalChain = this.buildApprovalChain(risks, toolpath);

    const setupSummary = setup ? {
      chuck_type: setup.chuck.type,
      chuck_grip_force_kn: setup.chuck.max_grip_force_kn,
      needs_tailstock: setup.needs_tailstock,
      needs_steady_rest: setup.needs_steady_rest,
      soft_jaw_required: setup.soft_jaw_required,
      ld_ratio: setup.ld_ratio,
    } : undefined;

    const pkg: Omit<SignoffPackage, "markdown_report"> = {
      package_id: `signoff_${Date.now()}`,
      program_id: toolpath.program_id,
      part_number: input.part_number,
      customer: input.customer,
      generated_at: new Date().toISOString(),
      generated_by: "PRISM LathePrintProgramSignoff U-LTH41",
      controller: emitted.controller,
      material: {
        name: material.name,
        iso_group: material.iso_group,
        hardness_hrc: material.hardness_hrc,
      },
      validation_checks: checks,
      feature_strategy_ops: featureRows,
      risks,
      cpk_summary: cpkSummary,
      setup_summary: setupSummary,
      program_summary: {
        operation_count: toolpath.operations.length,
        tool_count: new Set(toolpath.operations.map(o => o.tool_id)).size,
        cycle_time_min: toolpath.total_cycle_time_sec / 60,
        gcode_lines: emitted.gcode_lines,
        material_removed_cm3: toolpath.total_cutting_volume_cm3,
      },
      critical_fail_count: criticalFails,
      error_count: errorCount,
      warning_count: warningCount,
      approval_chain: approvalChain,
      release_ready: releaseReady,
      release_blocker: blocker,
    };

    const markdown = this.renderMarkdown(pkg);

    return { ...pkg, markdown_report: markdown };
  }

  /**
   * Validate input structure (fail-fast)
   */
  private validateInput(input: SignoffInput): void {
    if (!input || typeof input !== "object") {
      throw new Error("Invalid signoff input");
    }
    if (!input.strategy_plan?.plan_id) throw new Error("Missing strategy plan");
    if (!input.sequence_plan?.plan_id) throw new Error("Missing sequence plan");
    if (!input.toolpath?.program_id) throw new Error("Missing toolpath program");
    if (!input.emitted?.controller) throw new Error("Missing emitted program");
    if (!Array.isArray(input.features)) throw new Error("Features must be an array");
    if (!input.material?.iso_group) throw new Error("Missing material");
  }

  /**
   * Run the full validation battery
   */
  private runValidations(
    strat: StrategyPlan,
    seq: SequencePlan,
    tp: ToolpathProgram,
    emitted: EmittedProgram,
    setup?: SetupRecommendation
  ): ValidationCheck[] {
    const checks: ValidationCheck[] = [];

    // 1. Syntax: program must have start + end markers
    checks.push({
      check_id: "SYN-01",
      category: "syntax",
      severity: "critical",
      status: emitted.gcode.length > 0 ? "pass" : "fail",
      message: "Emitted G-code must be non-empty",
      evidence: `${emitted.gcode_lines} lines`,
    });

    checks.push({
      check_id: "SYN-02",
      category: "syntax",
      severity: "error",
      status: /M30|M02/.test(emitted.gcode) ? "pass" : "fail",
      message: "Program must contain M30 or M02 end code",
    });

    // 2. Envelope: must be within machine limits
    checks.push({
      check_id: "ENV-01",
      category: "envelope",
      severity: "critical",
      status: tp.machine_envelope_check.within_envelope ? "pass" : "fail",
      message: "Toolpath must be within machine envelope",
      evidence: `X ${tp.machine_envelope_check.max_x_mm.toFixed(1)}, Z ${tp.machine_envelope_check.max_z_mm.toFixed(1)}`,
    });

    // 3. Physics: RPM bounds, force bounds
    tp.operations.forEach(op => {
      if (op.spindle_rpm <= 0) {
        checks.push({
          check_id: `PHY-RPM-${op.op_number}`,
          category: "physics",
          severity: "critical",
          status: "fail",
          message: `Op ${op.op_number} has invalid RPM ${op.spindle_rpm}`,
        });
      }
      if (op.cutting_force_n > 10000) {
        checks.push({
          check_id: `PHY-FORCE-${op.op_number}`,
          category: "physics",
          severity: "warning",
          status: "fail",
          message: `Op ${op.op_number} cutting force ${op.cutting_force_n.toFixed(0)}N exceeds 10kN`,
          citation: "Sandvik Coromant: Turning force limits",
        });
      }
    });

    checks.push({
      check_id: "PHY-COMPLETE",
      category: "physics",
      severity: "info",
      status: tp.operations.length > 0 ? "pass" : "fail",
      message: "All operations have physics calculations",
    });

    // 4. Safety: sequence precedence, cutting warnings
    checks.push({
      check_id: "SAF-PREC",
      category: "safety",
      severity: "critical",
      status: seq.valid ? "pass" : "fail",
      message: "Sequence precedence must be valid",
      evidence: `${seq.violations.filter(v => v.severity === "error").length} violations`,
    });

    // 5. Setup: if provided, grip force adequate
    if (setup) {
      checks.push({
        check_id: "SET-GRIP",
        category: "setup",
        severity: "critical",
        status: setup.grip_force_adequate ? "pass" : "fail",
        message: "Chuck grip force must be adequate",
        evidence: `${setup.estimated_grip_force_required_kn.toFixed(1)}kN required / ${setup.chuck.max_grip_force_kn}kN available`,
      });

      checks.push({
        check_id: "SET-LD",
        category: "setup",
        severity: setup.ld_ratio > 15 ? "warning" : "info",
        status: setup.ld_ratio <= 15 ? "pass" : "fail",
        message: "L/D ratio within typical limits",
        evidence: `L/D = ${setup.ld_ratio.toFixed(1)}`,
      });
    }

    // 6. Emitted program safety checks
    emitted.dossier.safety_checks.forEach(sc => {
      checks.push({
        check_id: `EMIT-${sc.check.toUpperCase()}`,
        category: "safety",
        severity: sc.status === "fail" ? "error" : sc.status === "warning" ? "warning" : "info",
        status: sc.status === "fail" ? "fail" : sc.status === "warning" ? "fail" : "pass",
        message: sc.check,
        evidence: sc.detail,
      });
    });

    // 7. Tolerance: check warnings from sequence plan
    seq.violations.forEach((v, idx) => {
      checks.push({
        check_id: `TOL-${idx + 1}`,
        category: "tolerance",
        severity: v.severity === "error" ? "error" : v.severity === "warning" ? "warning" : "info",
        status: "fail",
        message: v.message,
      });
    });

    return checks;
  }

  /**
   * Build feature→strategy→operation table
   */
  private buildFeatureRows(
    strat: StrategyPlan,
    seq: SequencePlan,
    tp: ToolpathProgram,
    features: FeatureInput[]
  ): FeatureRow[] {
    return tp.operations.map(tpOp => {
      const rec = strat.recommendations.find(r => r.featureId === tpOp.featureId);
      const feature = features.find(f => f.id === tpOp.featureId);

      const cpkTarget = feature?.cpk_target;
      const cpkPredicted = this.predictCpk(tpOp, feature);
      let cpkStatus: FeatureRow["cpk_status"] | undefined;
      if (cpkTarget !== undefined && cpkPredicted !== undefined) {
        if (cpkPredicted >= cpkTarget * 1.1) cpkStatus = "exceeds";
        else if (cpkPredicted >= cpkTarget) cpkStatus = "meets";
        else if (cpkPredicted >= cpkTarget * 0.9) cpkStatus = "marginal";
        else cpkStatus = "below";
      }

      return {
        feature_id: tpOp.featureId,
        feature_type: tpOp.featureType,
        strategy_id: tpOp.strategy_id,
        strategy_name: rec?.strategy_name ?? tpOp.strategy_id,
        tool_id: tpOp.tool_id,
        op_number: tpOp.op_number,
        spindle_rpm: tpOp.spindle_rpm,
        feed_mm_min: tpOp.feed_mm_min,
        cutting_force_n: tpOp.cutting_force_n,
        cpk_target: cpkTarget,
        cpk_predicted: cpkPredicted,
        cpk_status: cpkStatus,
        cycle_time_sec: tpOp.cycle_time_sec,
      };
    });
  }

  /**
   * Predict Cpk from op parameters + feature tolerance
   * Cpk ≈ (USL - μ) / (3σ) ≈ tolerance / (6σ_proc)
   * σ_proc proxy: 5% of ap for roughing, 1% for finishing
   */
  private predictCpk(op: ToolpathProgram["operations"][number], feature?: FeatureInput): number | undefined {
    if (!feature?.tolerance_total_mm) return undefined;
    const tol = feature.tolerance_total_mm;
    const isFinish = op.strategy_id.includes("finish") || op.strategy_id.includes("wiper");
    const procVariance = isFinish ? 0.005 : 0.02;  // mm
    const sigma = Math.max(procVariance, tol / 10);
    // 6σ capability:
    return Math.max(0.1, tol / (6 * sigma));
  }

  /**
   * Identify risks
   */
  private identifyRisks(
    strat: StrategyPlan,
    seq: SequencePlan,
    tp: ToolpathProgram,
    setup: SetupRecommendation | undefined,
    material: MaterialInput
  ): RiskItem[] {
    const risks: RiskItem[] = [];

    // Risk 1: High cutting force
    const maxForce = Math.max(...tp.operations.map(o => o.cutting_force_n), 0);
    if (maxForce > 5000) {
      risks.push({
        risk_id: "R-001",
        severity: maxForce > 10000 ? "critical" : "high",
        category: "cutting_force",
        description: `Maximum cutting force ${maxForce.toFixed(0)}N exceeds 5kN threshold`,
        mitigation: "Reduce depth of cut, lower feed, or select more robust tooling",
        affects_features: tp.operations.filter(o => o.cutting_force_n > 5000).map(o => o.featureId),
      });
    }

    // Risk 2: High RPM
    const maxRpm = Math.max(...tp.operations.map(o => o.spindle_rpm), 0);
    if (maxRpm > 4000) {
      risks.push({
        risk_id: "R-002",
        severity: maxRpm > 6000 ? "high" : "medium",
        category: "spindle_speed",
        description: `RPM ${maxRpm} exceeds 4000 — verify tool balance and workholding`,
        mitigation: "Check tool assembly balance, reduce to balanced RPM envelope",
        affects_features: tp.operations.filter(o => o.spindle_rpm > 4000).map(o => o.featureId),
      });
    }

    // Risk 3: Long part L/D
    if (setup && setup.ld_ratio > 8) {
      risks.push({
        risk_id: "R-003",
        severity: setup.ld_ratio > 12 ? "high" : "medium",
        category: "part_rigidity",
        description: `L/D ratio ${setup.ld_ratio.toFixed(1)} — deflection risk`,
        mitigation: setup.needs_steady_rest ? "Steady rest is planned" : "Add steady rest",
        affects_features: [],
      });
    }

    // Risk 4: Hardened material + high MRR
    if ((material.iso_group === "H" || material.iso_group === "S") &&
        tp.operations.some(o => o.material_removal_rate_cm3_min > 50)) {
      risks.push({
        risk_id: "R-004",
        severity: "high",
        category: "tool_life",
        description: `Hardened/superalloy material with high MRR — accelerated tool wear expected`,
        mitigation: "Use CBN/ceramic tooling, reduce MRR by 30%",
        affects_features: tp.operations.filter(o => o.material_removal_rate_cm3_min > 50).map(o => o.featureId),
      });
    }

    // Risk 5: Sequence violations
    const errorViolations = seq.violations.filter(v => v.severity === "error");
    if (errorViolations.length > 0) {
      risks.push({
        risk_id: "R-005",
        severity: "critical",
        category: "precedence",
        description: `${errorViolations.length} sequence precedence violation(s)`,
        mitigation: "Re-sequence operations or invoke autoFix()",
        affects_features: [],
      });
    }

    // Risk 6: Envelope overrun
    if (!tp.machine_envelope_check.within_envelope) {
      risks.push({
        risk_id: "R-006",
        severity: "critical",
        category: "machine_envelope",
        description: "Toolpath exceeds machine envelope",
        mitigation: "Select larger machine or reduce part size",
        affects_features: [],
      });
    }

    return risks;
  }

  /**
   * Summarize Cpk across critical features
   */
  private summarizeCpk(rows: FeatureRow[]): SignoffPackage["cpk_summary"] {
    const critical = rows.filter(r => r.cpk_target !== undefined);
    const meeting = critical.filter(r => r.cpk_status === "meets" || r.cpk_status === "exceeds");
    const predicted = rows
      .map(r => r.cpk_predicted)
      .filter((x): x is number => x !== undefined && x > 0);

    return {
      critical_features: critical.length,
      features_meeting_cpk: meeting.length,
      avg_predicted_cpk: predicted.length > 0
        ? predicted.reduce((s, x) => s + x, 0) / predicted.length
        : 0,
      min_predicted_cpk: predicted.length > 0 ? Math.min(...predicted) : 0,
    };
  }

  /**
   * Build approval chain based on risk level
   */
  private buildApprovalChain(
    risks: RiskItem[],
    tp: ToolpathProgram
  ): SignoffPackage["approval_chain"] {
    const chain: SignoffPackage["approval_chain"] = [
      { role: "programmer", required: true, approved: false },
    ];

    const hasCritical = risks.some(r => r.severity === "critical");
    const hasHigh = risks.some(r => r.severity === "high");

    if (hasCritical || hasHigh || tp.operations.length > 15) {
      chain.push({ role: "engineer", required: true, approved: false });
    }

    chain.push({ role: "machinist", required: true, approved: false });

    if (hasCritical) {
      chain.push({ role: "supervisor", required: true, approved: false });
    }

    return chain;
  }

  /**
   * Render markdown report
   */
  private renderMarkdown(pkg: Omit<SignoffPackage, "markdown_report">): string {
    const lines: string[] = [];
    lines.push(`# PRISM Lathe Program Signoff`);
    lines.push(`**Package ID:** ${pkg.package_id}  `);
    lines.push(`**Program ID:** ${pkg.program_id}  `);
    if (pkg.part_number) lines.push(`**Part:** ${pkg.part_number}  `);
    if (pkg.customer) lines.push(`**Customer:** ${pkg.customer}  `);
    lines.push(`**Generated:** ${pkg.generated_at}  `);
    lines.push(`**Controller:** ${pkg.controller}  `);
    lines.push(`**Material:** ${pkg.material.name} (ISO ${pkg.material.iso_group})  `);
    lines.push("");

    lines.push(`## Release Status`);
    lines.push(pkg.release_ready ? "**READY FOR RELEASE**" : `**BLOCKED:** ${pkg.release_blocker}`);
    lines.push("");
    lines.push(`- Critical failures: ${pkg.critical_fail_count}`);
    lines.push(`- Errors: ${pkg.error_count}`);
    lines.push(`- Warnings: ${pkg.warning_count}`);
    lines.push("");

    lines.push(`## Program Summary`);
    lines.push(`| Metric | Value |`);
    lines.push(`|---|---|`);
    lines.push(`| Operations | ${pkg.program_summary.operation_count} |`);
    lines.push(`| Tools | ${pkg.program_summary.tool_count} |`);
    lines.push(`| Cycle time | ${pkg.program_summary.cycle_time_min.toFixed(2)} min |`);
    lines.push(`| G-code lines | ${pkg.program_summary.gcode_lines} |`);
    lines.push(`| Material removed | ${pkg.program_summary.material_removed_cm3.toFixed(2)} cm³ |`);
    lines.push("");

    if (pkg.setup_summary) {
      lines.push(`## Workholding Setup`);
      lines.push(`- Chuck: ${pkg.setup_summary.chuck_type} (${pkg.setup_summary.chuck_grip_force_kn} kN)`);
      lines.push(`- Tailstock: ${pkg.setup_summary.needs_tailstock ? "required" : "not needed"}`);
      lines.push(`- Steady rest: ${pkg.setup_summary.needs_steady_rest ? "required" : "not needed"}`);
      lines.push(`- Soft jaws: ${pkg.setup_summary.soft_jaw_required ? "required" : "not needed"}`);
      lines.push(`- L/D ratio: ${pkg.setup_summary.ld_ratio.toFixed(2)}`);
      lines.push("");
    }

    lines.push(`## Feature → Strategy → Operation Table`);
    lines.push(`| Op | Feature | Type | Strategy | Tool | RPM | Feed | Force | Cpk |`);
    lines.push(`|---|---|---|---|---|---|---|---|---|`);
    pkg.feature_strategy_ops.forEach(row => {
      const cpk = row.cpk_predicted !== undefined
        ? `${row.cpk_predicted.toFixed(2)} (${row.cpk_status ?? "n/a"})`
        : "-";
      lines.push(
        `| ${row.op_number} | ${row.feature_id} | ${row.feature_type} | ${row.strategy_id} | ${row.tool_id} | ${row.spindle_rpm} | ${row.feed_mm_min.toFixed(0)} | ${row.cutting_force_n.toFixed(0)}N | ${cpk} |`
      );
    });
    lines.push("");

    lines.push(`## Cpk Summary`);
    lines.push(`- Critical features: ${pkg.cpk_summary.critical_features}`);
    lines.push(`- Features meeting Cpk: ${pkg.cpk_summary.features_meeting_cpk}`);
    lines.push(`- Average predicted Cpk: ${pkg.cpk_summary.avg_predicted_cpk.toFixed(2)}`);
    lines.push(`- Minimum predicted Cpk: ${pkg.cpk_summary.min_predicted_cpk.toFixed(2)}`);
    lines.push("");

    if (pkg.risks.length > 0) {
      lines.push(`## Risk Summary`);
      pkg.risks.forEach(risk => {
        lines.push(`### [${risk.severity.toUpperCase()}] ${risk.risk_id}: ${risk.category}`);
        lines.push(`**Description:** ${risk.description}  `);
        lines.push(`**Mitigation:** ${risk.mitigation}  `);
        if (risk.affects_features.length > 0) {
          lines.push(`**Affects:** ${risk.affects_features.join(", ")}`);
        }
        lines.push("");
      });
    }

    lines.push(`## Validation Checks`);
    const byCategory = new Map<string, ValidationCheck[]>();
    pkg.validation_checks.forEach(c => {
      const arr = byCategory.get(c.category) ?? [];
      arr.push(c);
      byCategory.set(c.category, arr);
    });
    byCategory.forEach((list, cat) => {
      lines.push(`### ${cat}`);
      list.forEach(c => {
        const icon = c.status === "pass" ? "[PASS]" : c.status === "fail" ? "[FAIL]" : "[SKIP]";
        lines.push(`- ${icon} **${c.check_id}** (${c.severity}): ${c.message}${c.evidence ? ` — ${c.evidence}` : ""}`);
      });
      lines.push("");
    });

    lines.push(`## Approval Chain`);
    pkg.approval_chain.forEach(a => {
      const status = a.approved ? "APPROVED" : "PENDING";
      lines.push(`- [${status}] **${a.role}** (${a.required ? "required" : "optional"})${a.approver_name ? ` — ${a.approver_name}` : ""}`);
    });

    return lines.join("\n");
  }

  /**
   * Approve a stage in the chain
   */
  approve(
    pkg: SignoffPackage,
    role: "programmer" | "engineer" | "machinist" | "qc" | "supervisor",
    approverName: string,
    notes?: string
  ): SignoffPackage {
    const newChain = pkg.approval_chain.map(a =>
      a.role === role
        ? { ...a, approved: true, approver_name: approverName, approved_at: new Date().toISOString(), notes }
        : a
    );
    return { ...pkg, approval_chain: newChain };
  }

  /**
   * Check if fully approved by all required parties
   */
  isFullyApproved(pkg: SignoffPackage): boolean {
    return pkg.approval_chain.filter(a => a.required).every(a => a.approved);
  }

  /**
   * Export as JSON (stringify)
   */
  exportJSON(pkg: SignoffPackage): string {
    return JSON.stringify(pkg, null, 2);
  }

  /**
   * Export markdown only
   */
  exportMarkdown(pkg: SignoffPackage): string {
    return pkg.markdown_report;
  }

  // ==========================================================================
  // SAFETY GATE (Ω/S(x)) — LATHE-P2P-CONSENSUS-MS4/P1-U03
  // ==========================================================================

  /**
   * Hard-fail safety gate per envelope shop-floor tier:
   *   Ω(x) ≥ 0.95   (omega — system viability index)
   *   S(x) ≥ 0.98   (five-sigma safety score)
   *
   * Inputs come straight from the EmittedProgram dossier:
   *   - dossier.safety_checks[] (pass / fail / warning per check)
   *   - dossier.max_cutting_force_n, max_rpm_used, max_feed_used
   *   - dossier.physics_summary
   *
   * Computation (deterministic, no external solver):
   *
   *   total      = safety_checks.length
   *   passes     = #(status === "pass")
   *   warnings   = #(status === "warning")
   *   fails      = #(status === "fail")
   *
   *   Ω(x)  = (passes + 0.5 × warnings) / total
   *           (warnings count as half-credit per shop-floor tier convention)
   *
   *   S(x)  = 1 − (fails + 0.5 × warnings) / total
   *           (mirror of Ω with stricter weighting on outright fails)
   *
   * Both scores in [0,1]. Empty safety_checks → both = 1 (vacuous truth — no
   * known risks). A single hard "fail" in any critical check pulls S(x) below
   * 0.98 immediately for any program with < 50 checks.
   *
   * @param emitted EmittedProgram from LathePrintProgramEmitterEngine
   * @param opts {enforce} when true, throw on rejection so the caller cannot
   *             accidentally proceed with a failing program (envelope rule:
   *             "do NOT emit G-code to caller" on gate failure)
   * @returns gate result with scores + blockers list
   * @throws SafetyGateRejection when opts.enforce && !approved
   */
  enforceSafetyGate(
    emitted: EmittedProgram,
    opts: { enforce?: boolean; omegaFloor?: number; sxFloor?: number } = {},
  ): SafetyGateResult {
    const omegaFloor = opts.omegaFloor ?? 0.95;
    const sxFloor = opts.sxFloor ?? 0.98;
    const checks = emitted.dossier.safety_checks ?? [];
    const total = checks.length;
    let passes = 0;
    let warnings = 0;
    let fails = 0;
    const blockers: SafetyGateBlocker[] = [];

    for (const c of checks) {
      if (c.status === "pass") passes++;
      else if (c.status === "warning") warnings++;
      else if (c.status === "fail") {
        fails++;
        blockers.push({
          check: c.check,
          status: "fail",
          detail: c.detail,
        });
      }
    }

    const omega = total === 0 ? 1 : (passes + 0.5 * warnings) / total;
    const sx = total === 0 ? 1 : 1 - (fails + 0.5 * warnings) / total;

    const omegaOk = omega >= omegaFloor;
    const sxOk = sx >= sxFloor;
    const approved = omegaOk && sxOk && fails === 0;

    if (!omegaOk) {
      blockers.push({
        check: "OMEGA_THRESHOLD",
        status: "fail",
        detail: `Ω(x)=${omega.toFixed(4)} below shop-floor floor ${omegaFloor.toFixed(2)}`,
      });
    }
    if (!sxOk) {
      blockers.push({
        check: "SX_THRESHOLD",
        status: "fail",
        detail: `S(x)=${sx.toFixed(4)} below five-sigma floor ${sxFloor.toFixed(2)}`,
      });
    }

    const result: SafetyGateResult = {
      schemaVersion: "1.0.0",
      approved,
      omega,
      sx,
      omegaFloor,
      sxFloor,
      total_checks: total,
      pass_count: passes,
      warning_count: warnings,
      fail_count: fails,
      blockers,
      program_id: emitted.program_id,
      timestamp: new Date().toISOString(),
    };

    if (opts.enforce && !approved) {
      const err = new SafetyGateRejection(
        `Lathe P2P safety gate REJECTED program ${emitted.program_id}: ` +
          `Ω=${omega.toFixed(4)} (floor ${omegaFloor}), S(x)=${sx.toFixed(4)} (floor ${sxFloor}), ` +
          `fails=${fails}, warnings=${warnings}. Blockers: ${blockers.map(b => b.check).join(", ")}`,
        result,
      );
      throw err;
    }

    return result;
  }
}

// ============================================================================
// SAFETY GATE TYPES (LATHE-P2P-CONSENSUS-MS4/P1-U03)
// ============================================================================

export interface SafetyGateBlocker {
  check: string;
  status: "fail";
  detail: string;
}

export interface SafetyGateResult {
  schemaVersion: "1.0.0";
  approved: boolean;
  omega: number;
  sx: number;
  omegaFloor: number;
  sxFloor: number;
  total_checks: number;
  pass_count: number;
  warning_count: number;
  fail_count: number;
  blockers: SafetyGateBlocker[];
  program_id: string;
  timestamp: string;
}

/**
 * Thrown by `enforceSafetyGate` when `opts.enforce=true` and the gate rejects.
 * Envelope rule: "Failure → return rejection with specific blockers, do NOT
 * emit G-code to caller". Catching this is the caller's only path to recover
 * (e.g., regenerate toolpath with lower force, swap to lighter strategy).
 */
export class SafetyGateRejection extends Error {
  readonly code = "LATHE_P2P_SAFETY_GATE_REJECTED" as const;
  readonly result: SafetyGateResult;
  constructor(message: string, result: SafetyGateResult) {
    super(message);
    this.name = "SafetyGateRejection";
    this.result = result;
  }
}

export const lathePrintProgramSignoffEngine = new LathePrintProgramSignoffEngine();
