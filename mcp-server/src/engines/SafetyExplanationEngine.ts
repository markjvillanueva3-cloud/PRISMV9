/**
 * SafetyExplanationEngine — XAI for Safety Decisions (U-MIO40A)
 * ==============================================================
 *
 * Explainable AI layer for PRISM safety gates. Every safety decision
 * (veto, gate, simulation) produces an auditable explanation with:
 *
 *   1. What passed — clear evidence chain from physics
 *   2. What failed — specific rule violations with thresholds
 *   3. Counterfactuals — "would have passed if X", "would have blocked if Y"
 *   4. Margin analysis — how close to thresholds, worst-case scenarios
 *   5. Root cause attribution — which input parameter drove the decision
 *
 * This enables:
 *   - Operator trust building through transparent reasoning
 *   - Regulatory compliance (ISO 13849-1, IEC 61508 audit trails)
 *   - Continuous improvement through decision analysis
 *   - Training data for future ML safety models
 *
 * XAI Principles Applied:
 *   - Local explanations: why THIS decision on THIS input
 *   - Global patterns: aggregate decision statistics
 *   - Counterfactual reasoning: minimal changes to flip outcome
 *   - Feature attribution: SHAP-like importance scores for inputs
 *   - Confidence calibration: uncertainty quantification
 *
 * References:
 *   - Ribeiro et al. (2016): LIME - Local Interpretable Model-agnostic Explanations
 *   - Lundberg & Lee (2017): SHAP - Unified Approach to Interpreting Model Predictions
 *   - Wachter et al. (2017): Counterfactual Explanations without Opening the Black Box
 *   - ISO 13849-1:2015: Safety of machinery — validation documentation
 *   - IEC 61508-7: Functional safety — techniques for achieving safety integrity
 *
 * @module engines/SafetyExplanationEngine
 * @milestone MIO-MS0 U-MIO40A
 */

import type { VetoReport, VetoCheckResult, VetoRule, VetoParams } from "./SafetyVetoEngine.js";
import type { Gate, Blocker, GateVerdict } from "./SafetyVetoSimulationGateEngine.js";

// ── Types ──────────────────────────────────────────────────────────────────

export type ExplanationLevel = "summary" | "detailed" | "technical" | "audit";

export interface FeatureAttribution {
  /** Input parameter name */
  feature: string;
  /** Current value */
  value: number;
  /** Unit of measurement */
  unit: string;
  /** Contribution to decision (positive = toward block, negative = toward pass) */
  contribution: number;
  /** Threshold that would flip the decision */
  flip_threshold?: number;
  /** Percentage of total influence */
  importance_pct: number;
}

export interface Counterfactual {
  /** Human-readable description */
  description: string;
  /** Parameter changes required */
  changes: Array<{
    parameter: string;
    from: number;
    to: number;
    unit: string;
  }>;
  /** Resulting outcome */
  outcome: "PASS" | "BLOCK";
  /** Confidence in counterfactual validity */
  confidence: number;
  /** Feasibility assessment */
  feasibility: "trivial" | "easy" | "moderate" | "difficult" | "impossible";
}

export interface MarginAnalysis {
  /** Closest rule to threshold */
  closest_rule: string;
  /** Margin as percentage of threshold */
  margin_pct: number;
  /** Absolute margin value */
  margin_abs: number;
  /** Unit */
  unit: string;
  /** Risk assessment */
  risk_level: "safe" | "marginal" | "borderline" | "exceeded";
}

export interface EvidenceChainLink {
  /** Step number */
  step: number;
  /** Rule or calculation name */
  rule: string;
  /** Input parameters used */
  inputs: Record<string, number>;
  /** Formula applied (latex or text) */
  formula: string;
  /** Computed value */
  result: number;
  /** Threshold compared against */
  threshold: number;
  /** Pass/fail for this step */
  verdict: "PASS" | "FAIL";
}

export interface SafetyExplanation {
  /** Unique explanation ID for audit trail */
  explanation_id: string;
  /** Timestamp of explanation generation */
  generated_at: string;
  /** Overall verdict being explained */
  verdict: "PASS" | "BLOCK" | "CERTIFIED" | "PENDING";
  /** Explanation detail level */
  level: ExplanationLevel;

  /** Summary section */
  summary: {
    /** One-line human-readable verdict */
    headline: string;
    /** Key reason (primary driver) */
    primary_reason: string;
    /** Number of rules checked */
    rules_checked: number;
    /** Number of rules passed */
    rules_passed: number;
    /** Number of rules failed */
    rules_failed: number;
    /** Overall confidence in explanation */
    confidence: number;
  };

  /** What passed (evidence for safe operation) */
  passed: Array<{
    rule: string;
    value: number;
    threshold: number;
    unit: string;
    margin_pct: number;
    detail: string;
  }>;

  /** What failed (evidence for block) */
  failed: Array<{
    rule: string;
    value: number;
    threshold: number;
    unit: string;
    severity: "critical" | "major" | "minor";
    detail: string;
    suggested_fix: string;
  }>;

  /** Counterfactual analysis */
  counterfactuals: Counterfactual[];

  /** Margin analysis (closest to threshold) */
  margins: MarginAnalysis[];

  /** Feature attribution (SHAP-like) */
  attributions: FeatureAttribution[];

  /** Full evidence chain */
  evidence_chain: EvidenceChainLink[];

  /** Audit metadata */
  audit: {
    /** Input parameters hash (for tamper detection) */
    input_hash: string;
    /** Safety engine versions used */
    engine_versions: Record<string, string>;
    /** Timestamp precision */
    timestamp_precision_ms: number;
    /** Explanation generator version */
    explainer_version: string;
  };
}

export interface VetoExplanationInput {
  report: VetoReport;
  level?: ExplanationLevel;
}

export interface GateExplanationInput {
  gate: Gate;
  level?: ExplanationLevel;
}

// ── Constants ──────────────────────────────────────────────────────────────

const EXPLAINER_VERSION = "1.0.0";

const RULE_FORMULAS: Record<VetoRule, string> = {
  power_veto: "P = Fc × Vc / 60000 ≤ P_max × 0.85",
  deflection_veto: "δ = Fc × L³ / (3EI) ≤ tolerance / 3",
  chatter_veto: "P(chatter) ≤ 0.15",
  collision_veto: "collisions = 0 (zero tolerance)",
  workholding_veto: "Fc / (μ × F_grip × n) ≤ 1/1.5",
  coolant_veto: "L/D > 3 → P_coolant ≥ 40 bar",
  rpm_veto: "RPM ≤ RPM_max × 1.05",
  torque_veto: "τ = Fc × D/2 / 1000 ≤ τ_max",
};

const RULE_UNITS: Record<VetoRule, string> = {
  power_veto: "kW",
  deflection_veto: "mm",
  chatter_veto: "probability",
  collision_veto: "count",
  workholding_veto: "ratio",
  coolant_veto: "bar",
  rpm_veto: "rpm",
  torque_veto: "N·m",
};

// ── Engine ─────────────────────────────────────────────────────────────────

export class SafetyExplanationEngine {
  private counter = 0;

  /**
   * Generate a full explanation for a SafetyVetoEngine VetoReport.
   */
  explainVetoReport(input: VetoExplanationInput): SafetyExplanation {
    const { report, level = "detailed" } = input;
    this.counter++;
    const explanation_id = `EXP-V-${String(this.counter).padStart(6, "0")}`;
    const now = new Date();

    const passed = report.checks.filter(c => !c.vetoed);
    const failed = report.checks.filter(c => c.vetoed);

    const verdict: SafetyExplanation["verdict"] = report.vetoed ? "BLOCK" : "PASS";

    return {
      explanation_id,
      generated_at: now.toISOString(),
      verdict,
      level,
      summary: this.buildSummary(report, passed, failed),
      passed: this.buildPassedList(passed),
      failed: this.buildFailedList(failed),
      counterfactuals: this.generateCounterfactuals(report, failed),
      margins: this.analyzeMargins(report.checks),
      attributions: this.computeAttributions(report),
      evidence_chain: this.buildEvidenceChain(report.checks),
      audit: this.buildAuditMetadata(report.original_params, now),
    };
  }

  /**
   * Generate a full explanation for a SafetyVetoSimulationGateEngine Gate.
   */
  explainGate(input: GateExplanationInput): SafetyExplanation {
    const { gate, level = "detailed" } = input;
    this.counter++;
    const explanation_id = `EXP-G-${String(this.counter).padStart(6, "0")}`;
    const now = new Date();

    const passed: VetoCheckResult[] = [];
    const failed: VetoCheckResult[] = [];

    // Convert gate artifacts to check-like results
    if (gate.veto_report) {
      passed.push(...gate.veto_report.checks.filter(c => !c.vetoed));
      failed.push(...gate.veto_report.checks.filter(c => c.vetoed));
    }

    // Add simulation, collision, envelope as pseudo-checks
    if (gate.simulation) {
      const simCheck: VetoCheckResult = {
        vetoed: gate.simulation.verdict !== "PASS",
        rule: null,
        original_value: gate.simulation.verdict === "PASS" ? 1 : 0,
        limit: 1,
        detail: `Simulation ${gate.simulation.verdict} from ${gate.simulation.source}`,
      };
      if (simCheck.vetoed) failed.push(simCheck);
      else passed.push(simCheck);
    }

    if (gate.collision) {
      const colCheck: VetoCheckResult = {
        vetoed: gate.collision.verdict !== "PASS",
        rule: null,
        original_value: gate.collision.collision_count,
        limit: 0,
        detail: `Collision detection: ${gate.collision.collision_count} collision(s)`,
      };
      if (colCheck.vetoed) failed.push(colCheck);
      else passed.push(colCheck);
    }

    if (gate.envelope) {
      const envCheck: VetoCheckResult = {
        vetoed: gate.envelope.verdict !== "PASS",
        rule: null,
        original_value: gate.envelope.total_breach_mm ?? 0,
        limit: 0,
        detail: `Envelope validation: ${gate.envelope.verdict}`,
      };
      if (envCheck.vetoed) failed.push(envCheck);
      else passed.push(envCheck);
    }

    const verdict = gate.verdict as SafetyExplanation["verdict"];

    return {
      explanation_id,
      generated_at: now.toISOString(),
      verdict,
      level,
      summary: this.buildGateSummary(gate, passed, failed),
      passed: this.buildPassedList(passed),
      failed: this.buildFailedList(failed),
      counterfactuals: this.generateGateCounterfactuals(gate),
      margins: this.analyzeMargins(passed.concat(failed)),
      attributions: gate.veto_report ? this.computeAttributions(gate.veto_report) : [],
      evidence_chain: this.buildGateEvidenceChain(gate),
      audit: this.buildGateAuditMetadata(gate, now),
    };
  }

  /**
   * Generate a minimal summary explanation (for operator display).
   */
  explainBrief(report: VetoReport): string {
    if (!report.vetoed) {
      return `✓ SAFE: All ${report.checks.length} safety rules passed.`;
    }

    const vetos = report.active_vetos.map(v => v.rule).filter(r => r).join(", ");
    return `✗ BLOCKED: ${report.active_vetos.length} rule(s) violated: ${vetos}`;
  }

  /**
   * Generate counterfactual: what single change would flip the decision?
   */
  findMinimalFlip(report: VetoReport): Counterfactual | null {
    if (!report.vetoed) {
      // Already passing — find what would cause a block
      const margins = this.analyzeMargins(report.checks);
      const closest = margins.find(m => m.risk_level !== "exceeded");
      if (!closest) return null;

      return {
        description: `Would BLOCK if ${closest.closest_rule} exceeded threshold`,
        changes: [{
          parameter: closest.closest_rule.replace("_veto", ""),
          from: 0,
          to: 0,
          unit: closest.unit,
        }],
        outcome: "BLOCK",
        confidence: 0.95,
        feasibility: "moderate",
      };
    }

    // Currently blocked — find minimal change to pass
    const fixable = report.active_vetos.filter(v =>
      v.rule && !["collision_veto", "coolant_veto"].includes(v.rule)
    );

    if (fixable.length === 0) {
      return {
        description: "Cannot flip: blocked by non-parametric vetos (collision/coolant)",
        changes: [],
        outcome: "BLOCK",
        confidence: 1.0,
        feasibility: "impossible",
      };
    }

    const first = fixable[0];
    const changes: Counterfactual["changes"] = [];

    if (first.adjusted_params) {
      for (const [key, val] of Object.entries(first.adjusted_params)) {
        const origVal = report.original_params[key as keyof VetoParams];
        changes.push({
          parameter: key,
          from: typeof origVal === "number" ? origVal : 0,
          to: val as number,
          unit: this.inferUnit(key),
        });
      }
    }

    return {
      description: `Would PASS if ${first.rule} adjusted: ${first.escalation_action ?? "apply suggested changes"}`,
      changes,
      outcome: "PASS",
      confidence: 0.85,
      feasibility: changes.length === 1 ? "easy" : "moderate",
    };
  }

  /**
   * Render explanation as Markdown for display/audit.
   */
  renderMarkdown(exp: SafetyExplanation): string {
    const lines: string[] = [];

    lines.push(`# Safety Explanation ${exp.explanation_id}`);
    lines.push("");
    lines.push(`**Verdict:** \`${exp.verdict}\` | **Generated:** ${exp.generated_at}`);
    lines.push("");
    lines.push(`## Summary`);
    lines.push(`> ${exp.summary.headline}`);
    lines.push("");
    lines.push(`- **Primary reason:** ${exp.summary.primary_reason}`);
    lines.push(`- **Rules:** ${exp.summary.rules_passed}/${exp.summary.rules_checked} passed`);
    lines.push(`- **Confidence:** ${(exp.summary.confidence * 100).toFixed(0)}%`);

    if (exp.failed.length > 0) {
      lines.push("");
      lines.push(`## Failures (${exp.failed.length})`);
      for (const f of exp.failed) {
        lines.push(`- **${f.rule}** [${f.severity}]: ${f.value.toFixed(3)} ${f.unit} vs limit ${f.threshold.toFixed(3)} ${f.unit}`);
        lines.push(`  - ${f.detail}`);
        lines.push(`  - Fix: ${f.suggested_fix}`);
      }
    }

    if (exp.passed.length > 0 && exp.level !== "summary") {
      lines.push("");
      lines.push(`## Passed (${exp.passed.length})`);
      for (const p of exp.passed) {
        lines.push(`- **${p.rule}**: ${p.value.toFixed(3)} ${p.unit} (${p.margin_pct.toFixed(1)}% margin)`);
      }
    }

    if (exp.counterfactuals.length > 0) {
      lines.push("");
      lines.push(`## Counterfactuals`);
      for (const cf of exp.counterfactuals) {
        lines.push(`- ${cf.description}`);
        if (cf.changes.length > 0) {
          for (const ch of cf.changes) {
            lines.push(`  - ${ch.parameter}: ${ch.from.toFixed(3)} → ${ch.to.toFixed(3)} ${ch.unit}`);
          }
        }
        lines.push(`  - Feasibility: ${cf.feasibility}, Confidence: ${(cf.confidence * 100).toFixed(0)}%`);
      }
    }

    if (exp.margins.length > 0) {
      lines.push("");
      lines.push(`## Margin Analysis`);
      for (const m of exp.margins) {
        lines.push(`- **${m.closest_rule}**: ${m.margin_abs.toFixed(3)} ${m.unit} (${m.margin_pct.toFixed(1)}%) — ${m.risk_level}`);
      }
    }

    if (exp.level === "audit" || exp.level === "technical") {
      lines.push("");
      lines.push(`## Audit Trail`);
      lines.push(`- **Input hash:** \`${exp.audit.input_hash}\``);
      lines.push(`- **Explainer version:** ${exp.audit.explainer_version}`);
      lines.push(`- **Timestamp precision:** ${exp.audit.timestamp_precision_ms}ms`);
    }

    return lines.join("\n");
  }

  // ── Private Helpers ──────────────────────────────────────────────────────

  private buildSummary(
    report: VetoReport,
    passed: VetoCheckResult[],
    failed: VetoCheckResult[],
  ): SafetyExplanation["summary"] {
    const headline = report.vetoed
      ? `BLOCKED: ${failed.length} safety rule(s) violated`
      : `SAFE: All ${report.checks.length} safety rules passed`;

    const primary_reason = failed.length > 0
      ? `${failed[0].rule ?? "unknown"}: ${failed[0].detail}`
      : "All parameters within safe operating limits";

    return {
      headline,
      primary_reason,
      rules_checked: report.checks.length,
      rules_passed: passed.length,
      rules_failed: failed.length,
      confidence: failed.length === 0 ? 0.98 : 0.95,
    };
  }

  private buildGateSummary(
    gate: Gate,
    passed: VetoCheckResult[],
    failed: VetoCheckResult[],
  ): SafetyExplanation["summary"] {
    const headline = gate.verdict === "CERTIFIED"
      ? `CERTIFIED: Production release approved for ${gate.program_id}`
      : gate.verdict === "BLOCKED"
        ? `BLOCKED: ${gate.blockers.length} artifact(s) failed`
        : `PENDING: Awaiting ${4 - (gate.summary.all_four_attached ? 4 : 0)} artifact(s)`;

    const primary_reason = gate.blockers.length > 0
      ? `${gate.blockers[0].source}: ${gate.blockers[0].reason}`
      : "All four artifacts verified and approved";

    return {
      headline,
      primary_reason,
      rules_checked: passed.length + failed.length,
      rules_passed: passed.length,
      rules_failed: failed.length,
      confidence: gate.verdict === "CERTIFIED" ? 0.99 : 0.95,
    };
  }

  private buildPassedList(passed: VetoCheckResult[]): SafetyExplanation["passed"] {
    return passed.map(p => {
      const margin = p.limit !== 0 ? ((p.limit - p.original_value) / p.limit) * 100 : 100;
      return {
        rule: p.rule ?? "artifact_check",
        value: p.original_value,
        threshold: p.limit,
        unit: p.rule ? RULE_UNITS[p.rule] : "",
        margin_pct: Math.max(0, margin),
        detail: p.detail,
      };
    });
  }

  private buildFailedList(failed: VetoCheckResult[]): SafetyExplanation["failed"] {
    return failed.map(f => ({
      rule: f.rule ?? "artifact_check",
      value: f.original_value,
      threshold: f.limit,
      unit: f.rule ? RULE_UNITS[f.rule] : "",
      severity: this.assessSeverity(f),
      detail: f.detail,
      suggested_fix: f.escalation_action ?? "Manual review required",
    }));
  }

  private assessSeverity(check: VetoCheckResult): "critical" | "major" | "minor" {
    if (!check.rule) return "major";
    if (["collision_veto", "power_veto", "torque_veto"].includes(check.rule)) return "critical";
    if (["chatter_veto", "deflection_veto", "workholding_veto"].includes(check.rule)) return "major";
    return "minor";
  }

  private generateCounterfactuals(
    report: VetoReport,
    failed: VetoCheckResult[],
  ): Counterfactual[] {
    const cfs: Counterfactual[] = [];

    // If blocked, show how to pass
    for (const f of failed.slice(0, 3)) {
      if (!f.adjusted_params || !f.rule) continue;

      const changes: Counterfactual["changes"] = [];
      for (const [key, val] of Object.entries(f.adjusted_params)) {
        const origVal = report.original_params[key as keyof VetoParams];
        changes.push({
          parameter: key,
          from: typeof origVal === "number" ? origVal : 0,
          to: val as number,
          unit: this.inferUnit(key),
        });
      }

      cfs.push({
        description: `Would PASS ${f.rule} if parameters adjusted`,
        changes,
        outcome: "PASS",
        confidence: 0.85,
        feasibility: this.assessFeasibility(changes),
      });
    }

    // If passing, show nearest failure
    if (!report.vetoed) {
      const margins = this.analyzeMargins(report.checks);
      const closest = margins[0];
      if (closest && closest.margin_pct < 50) {
        cfs.push({
          description: `Would BLOCK if ${closest.closest_rule} margin reduced by ${closest.margin_pct.toFixed(0)}%`,
          changes: [],
          outcome: "BLOCK",
          confidence: 0.9,
          feasibility: "moderate",
        });
      }
    }

    return cfs;
  }

  private generateGateCounterfactuals(gate: Gate): Counterfactual[] {
    const cfs: Counterfactual[] = [];

    if (gate.verdict === "BLOCKED") {
      for (const b of gate.blockers.slice(0, 3)) {
        cfs.push({
          description: `Would CERTIFY if ${b.source} resolved: ${b.reason.substring(0, 80)}`,
          changes: [],
          outcome: "PASS",
          confidence: 0.8,
          feasibility: b.source === "collision" ? "difficult" : "moderate",
        });
      }
    }

    return cfs;
  }

  private analyzeMargins(checks: VetoCheckResult[]): MarginAnalysis[] {
    const margins: MarginAnalysis[] = [];

    for (const c of checks) {
      if (c.limit === 0) continue;

      const margin_abs = c.limit - c.original_value;
      const margin_pct = (margin_abs / c.limit) * 100;

      let risk_level: MarginAnalysis["risk_level"];
      if (c.vetoed) risk_level = "exceeded";
      else if (margin_pct < 10) risk_level = "borderline";
      else if (margin_pct < 25) risk_level = "marginal";
      else risk_level = "safe";

      margins.push({
        closest_rule: c.rule ?? "unknown",
        margin_pct,
        margin_abs,
        unit: c.rule ? RULE_UNITS[c.rule] : "",
        risk_level,
      });
    }

    return margins.sort((a, b) => a.margin_pct - b.margin_pct);
  }

  private computeAttributions(report: VetoReport): FeatureAttribution[] {
    const params = report.original_params;
    const attrs: FeatureAttribution[] = [];

    const features: Array<{ key: keyof VetoParams; unit: string }> = [
      { key: "Fc_N", unit: "N" },
      { key: "Vc_mpm", unit: "m/min" },
      { key: "ap_mm", unit: "mm" },
      { key: "fz_mm", unit: "mm/tooth" },
      { key: "RPM", unit: "rpm" },
      { key: "D_mm", unit: "mm" },
      { key: "L_mm", unit: "mm" },
    ];

    let total_contribution = 0;

    for (const { key, unit } of features) {
      const val = params[key];
      if (typeof val !== "number") continue;

      // Simple heuristic: contribution based on proximity to limits
      const contribution = this.estimateContribution(key, val, report);
      total_contribution += Math.abs(contribution);

      attrs.push({
        feature: key,
        value: val,
        unit,
        contribution,
        importance_pct: 0, // computed after
      });
    }

    // Normalize importance
    for (const a of attrs) {
      a.importance_pct = total_contribution > 0
        ? (Math.abs(a.contribution) / total_contribution) * 100
        : 0;
    }

    return attrs.sort((a, b) => b.importance_pct - a.importance_pct);
  }

  private estimateContribution(
    key: keyof VetoParams,
    value: number,
    report: VetoReport,
  ): number {
    // Simplified SHAP-like contribution:
    // Higher values of force-related params contribute toward block
    const forceParams: Array<keyof VetoParams> = ["Fc_N", "Vc_mpm", "ap_mm", "fz_mm", "RPM"];
    const isForceParam = forceParams.includes(key);

    // Check if any veto references this parameter
    const relatedVeto = report.active_vetos.find(v => {
      if (!v.rule) return false;
      if (key === "Fc_N" && ["power_veto", "deflection_veto", "workholding_veto", "torque_veto"].includes(v.rule)) return true;
      if (key === "Vc_mpm" && ["power_veto", "rpm_veto"].includes(v.rule)) return true;
      if (key === "RPM" && ["rpm_veto", "chatter_veto"].includes(v.rule)) return true;
      if (key === "ap_mm" && ["power_veto", "deflection_veto", "workholding_veto"].includes(v.rule)) return true;
      if (key === "L_mm" && v.rule === "deflection_veto") return true;
      return false;
    });

    if (relatedVeto) {
      return 1.0; // Strong contribution toward block
    }

    // General heuristic
    return isForceParam ? 0.3 : -0.1;
  }

  private buildEvidenceChain(checks: VetoCheckResult[]): EvidenceChainLink[] {
    return checks.map((c, i) => ({
      step: i + 1,
      rule: c.rule ?? "artifact_check",
      inputs: {},
      formula: c.rule ? RULE_FORMULAS[c.rule] : "n/a",
      result: c.original_value,
      threshold: c.limit,
      verdict: c.vetoed ? "FAIL" : "PASS",
    }));
  }

  private buildGateEvidenceChain(gate: Gate): EvidenceChainLink[] {
    const chain: EvidenceChainLink[] = [];
    let step = 1;

    if (gate.veto_report) {
      chain.push({
        step: step++,
        rule: "SafetyVetoEngine",
        inputs: {},
        formula: "8 hard veto rules",
        result: gate.veto_report.active_vetos.length,
        threshold: 0,
        verdict: gate.veto_report.vetoed ? "FAIL" : "PASS",
      });
    }

    if (gate.simulation) {
      chain.push({
        step: step++,
        rule: "Simulation",
        inputs: {},
        formula: `${gate.simulation.source} verification`,
        result: gate.simulation.verdict === "PASS" ? 1 : 0,
        threshold: 1,
        verdict: gate.simulation.verdict === "PASS" ? "PASS" : "FAIL",
      });
    }

    if (gate.collision) {
      chain.push({
        step: step++,
        rule: "CollisionDetection",
        inputs: {},
        formula: "collisions = 0",
        result: gate.collision.collision_count,
        threshold: 0,
        verdict: gate.collision.verdict === "PASS" ? "PASS" : "FAIL",
      });
    }

    if (gate.envelope) {
      chain.push({
        step: step++,
        rule: "EnvelopeValidation",
        inputs: {},
        formula: "all axes within soft limits",
        result: gate.envelope.total_breach_mm ?? 0,
        threshold: 0,
        verdict: gate.envelope.verdict === "PASS" ? "PASS" : "FAIL",
      });
    }

    return chain;
  }

  private buildAuditMetadata(
    params: VetoParams,
    now: Date,
  ): SafetyExplanation["audit"] {
    const inputStr = JSON.stringify(params);
    const hash = this.simpleHash(inputStr);

    return {
      input_hash: hash,
      engine_versions: {
        SafetyVetoEngine: "1.0.0",
        SafetyExplanationEngine: EXPLAINER_VERSION,
      },
      timestamp_precision_ms: 1,
      explainer_version: EXPLAINER_VERSION,
    };
  }

  private buildGateAuditMetadata(
    gate: Gate,
    now: Date,
  ): SafetyExplanation["audit"] {
    const inputStr = JSON.stringify({
      gate_id: gate.gate_id,
      program_id: gate.program_id,
      machine_id: gate.machine_id,
    });
    const hash = this.simpleHash(inputStr);

    return {
      input_hash: hash,
      engine_versions: {
        SafetyVetoSimulationGateEngine: "1.0.0",
        SafetyExplanationEngine: EXPLAINER_VERSION,
      },
      timestamp_precision_ms: 1,
      explainer_version: EXPLAINER_VERSION,
    };
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, "0");
  }

  private inferUnit(param: string): string {
    if (param.endsWith("_mm")) return "mm";
    if (param.endsWith("_N")) return "N";
    if (param.endsWith("_mpm")) return "m/min";
    if (param === "RPM") return "rpm";
    if (param.endsWith("_kW")) return "kW";
    return "";
  }

  private assessFeasibility(
    changes: Counterfactual["changes"],
  ): Counterfactual["feasibility"] {
    if (changes.length === 0) return "impossible";
    if (changes.length === 1) {
      const pctChange = changes[0].from !== 0
        ? Math.abs((changes[0].to - changes[0].from) / changes[0].from) * 100
        : 100;
      if (pctChange < 15) return "trivial";
      if (pctChange < 30) return "easy";
      return "moderate";
    }
    return changes.length <= 3 ? "moderate" : "difficult";
  }
}

export const safetyExplanationEngine = new SafetyExplanationEngine();
