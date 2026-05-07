/**
 * SafetyExplanationEngine Tests (U-MIO40A)
 * =========================================
 * Tests XAI explainability for safety decisions: veto report explanations,
 * gate explanations, counterfactuals, margin analysis, feature attribution.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  safetyExplanationEngine,
  SafetyExplanationEngine,
  type SafetyExplanation,
  type Counterfactual,
} from "../engines/SafetyExplanationEngine.js";
import type { VetoReport, VetoCheckResult, VetoParams, MachineConstraints, WorkholdingProps } from "../engines/SafetyVetoEngine.js";
import type { Gate, GateVerdict } from "../engines/SafetyVetoSimulationGateEngine.js";

describe("SafetyExplanationEngine", () => {
  // ══════════════════════════════════════════════════════════════════════════
  // Test fixtures
  // ══════════════════════════════════════════════════════════════════════════

  const safeParams: VetoParams = {
    Fc_N: 500,
    Vc_mpm: 100,
    ap_mm: 2,
    fz_mm: 0.1,
    D_mm: 10,
    L_mm: 50,
    RPM: 3183,
    chatter_probability: 0.05,
    collision_detected: false,
    tolerance_mm: 0.05,
  };

  const unsafeParams: VetoParams = {
    Fc_N: 5000,
    Vc_mpm: 300,
    ap_mm: 8,
    fz_mm: 0.3,
    D_mm: 10,
    L_mm: 100,
    RPM: 12000,
    chatter_probability: 0.25,
    collision_detected: false,
    tolerance_mm: 0.05,
  };

  const machine: MachineConstraints = {
    max_power_kW: 15,
    max_rpm: 8000,
    max_torque_Nm: 100,
  };

  const workholding: WorkholdingProps = {
    grip_force_N: 5000,
    friction_coefficient: 0.3,
    n_points: 3,
  };

  function createSafeReport(): VetoReport {
    const checks: VetoCheckResult[] = [
      { vetoed: false, rule: "power_veto", original_value: 0.83, limit: 12.75, detail: "Power OK" },
      { vetoed: false, rule: "deflection_veto", original_value: 0.005, limit: 0.0167, detail: "Deflection OK" },
      { vetoed: false, rule: "chatter_veto", original_value: 0.05, limit: 0.15, detail: "Chatter OK" },
      { vetoed: false, rule: "collision_veto", original_value: 0, limit: 0, detail: "No collision" },
      { vetoed: false, rule: "workholding_veto", original_value: 0.11, limit: 0.667, detail: "Workholding OK" },
      { vetoed: false, rule: "coolant_veto", original_value: 50, limit: 40, detail: "Coolant OK" },
      { vetoed: false, rule: "rpm_veto", original_value: 3183, limit: 8400, detail: "RPM OK" },
      { vetoed: false, rule: "torque_veto", original_value: 25, limit: 100, detail: "Torque OK" },
    ];
    return {
      vetoed: false,
      checks,
      active_vetos: [],
      original_params: safeParams,
      machine,
      workholding,
    };
  }

  function createUnsafeReport(): VetoReport {
    const checks: VetoCheckResult[] = [
      {
        vetoed: true,
        rule: "power_veto",
        original_value: 25,
        limit: 12.75,
        detail: "Power 25 kW exceeds limit 12.75 kW",
        escalation_action: "Reduce ap by 20%",
        adjusted_params: { ap_mm: 6.4 },
      },
      {
        vetoed: true,
        rule: "chatter_veto",
        original_value: 0.25,
        limit: 0.15,
        detail: "P(chatter) 25% exceeds 15% limit",
        escalation_action: "Shift RPM to stable pocket",
        adjusted_params: { RPM: 11160 },
      },
      {
        vetoed: true,
        rule: "rpm_veto",
        original_value: 12000,
        limit: 8400,
        detail: "RPM 12000 exceeds 8400 limit",
        escalation_action: "Reduce Vc by 20%",
        adjusted_params: { Vc_mpm: 240, RPM: 7640 },
      },
      { vetoed: false, rule: "collision_veto", original_value: 0, limit: 0, detail: "No collision" },
      { vetoed: false, rule: "deflection_veto", original_value: 0.01, limit: 0.0167, detail: "Deflection OK" },
      { vetoed: false, rule: "workholding_veto", original_value: 0.5, limit: 0.667, detail: "Workholding OK" },
      { vetoed: false, rule: "coolant_veto", original_value: 50, limit: 40, detail: "Coolant OK" },
      { vetoed: false, rule: "torque_veto", original_value: 50, limit: 100, detail: "Torque OK" },
    ];
    return {
      vetoed: true,
      checks,
      active_vetos: checks.filter(c => c.vetoed),
      original_params: unsafeParams,
      machine,
      workholding,
    };
  }

  function createCertifiedGate(): Gate {
    return {
      gate_id: "SVG-00001",
      part_number: "TEST-001",
      revision: "A",
      job_id: "JOB-123",
      setup_id: "SETUP-1",
      approval_gate_id: "APG-001",
      program_id: "O1234",
      machine_id: "LATHE-01",
      created: "2026-04-18T10:00:00Z",
      updated: "2026-04-18T10:05:00Z",
      verdict: "CERTIFIED",
      production_released: true,
      veto_report: createSafeReport(),
      simulation: { source: "Vericut", verdict: "PASS", cycle_time_s: 120 },
      collision: { verdict: "PASS", collision_count: 0 },
      envelope: { verdict: "PASS" },
      blockers: [],
      certification: {
        certifier_id: "OP-001",
        certification_hash: "abc123",
        certified_at: "2026-04-18T10:05:00Z",
      },
      summary: {
        has_veto_report: true,
        veto_active_count: 0,
        has_simulation: true,
        simulation_pass: true,
        has_collision: true,
        collision_count: 0,
        has_envelope: true,
        envelope_pass: true,
        all_four_attached: true,
      },
    };
  }

  function createBlockedGate(): Gate {
    return {
      gate_id: "SVG-00002",
      part_number: "TEST-002",
      revision: "B",
      job_id: "JOB-456",
      setup_id: "SETUP-2",
      approval_gate_id: "APG-002",
      program_id: "O5678",
      machine_id: "MILL-02",
      created: "2026-04-18T11:00:00Z",
      updated: "2026-04-18T11:05:00Z",
      verdict: "BLOCKED",
      production_released: false,
      veto_report: createUnsafeReport(),
      simulation: { source: "Vericut", verdict: "FAIL", warnings: ["Collision at Z-50"] },
      collision: { verdict: "FAIL", collision_count: 2, collisions: [
        { location: "Z-50", severity: "major", description: "Tool holder collision" },
        { location: "X100", severity: "minor", description: "Near miss" },
      ]},
      envelope: { verdict: "PASS" },
      blockers: [
        { source: "veto", severity: "critical", reason: "3 safety veto(s) active" },
        { source: "simulation", severity: "critical", reason: "Simulation FAIL" },
        { source: "collision", severity: "critical", reason: "2 collisions detected" },
      ],
      summary: {
        has_veto_report: true,
        veto_active_count: 3,
        has_simulation: true,
        simulation_pass: false,
        has_collision: true,
        collision_count: 2,
        has_envelope: true,
        envelope_pass: true,
        all_four_attached: true,
      },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // explainVetoReport — safe parameters
  // ══════════════════════════════════════════════════════════════════════════
  describe("explainVetoReport() — safe params", () => {
    it("returns PASS verdict for safe parameters", () => {
      const report = createSafeReport();
      const exp = safetyExplanationEngine.explainVetoReport({ report });

      expect(exp.verdict).toBe("PASS");
      expect(exp.summary.rules_failed).toBe(0);
      expect(exp.summary.rules_passed).toBe(8);
    });

    it("generates unique explanation IDs", () => {
      const report = createSafeReport();
      const exp1 = safetyExplanationEngine.explainVetoReport({ report });
      const exp2 = safetyExplanationEngine.explainVetoReport({ report });

      expect(exp1.explanation_id).not.toBe(exp2.explanation_id);
    });

    it("includes all passed rules in passed list", () => {
      const report = createSafeReport();
      const exp = safetyExplanationEngine.explainVetoReport({ report });

      expect(exp.passed.length).toBe(8);
      expect(exp.passed.map(p => p.rule)).toContain("power_veto");
      expect(exp.passed.map(p => p.rule)).toContain("rpm_veto");
    });

    it("computes positive margins for passing rules", () => {
      const report = createSafeReport();
      const exp = safetyExplanationEngine.explainVetoReport({ report });

      for (const p of exp.passed) {
        if (p.threshold > 0 && p.rule !== "collision_veto") {
          expect(p.margin_pct).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it("sets high confidence for all-pass", () => {
      const report = createSafeReport();
      const exp = safetyExplanationEngine.explainVetoReport({ report });

      expect(exp.summary.confidence).toBeGreaterThanOrEqual(0.95);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // explainVetoReport — unsafe parameters
  // ══════════════════════════════════════════════════════════════════════════
  describe("explainVetoReport() — unsafe params", () => {
    it("returns BLOCK verdict for unsafe parameters", () => {
      const report = createUnsafeReport();
      const exp = safetyExplanationEngine.explainVetoReport({ report });

      expect(exp.verdict).toBe("BLOCK");
      expect(exp.summary.rules_failed).toBe(3);
    });

    it("includes failed rules with severity", () => {
      const report = createUnsafeReport();
      const exp = safetyExplanationEngine.explainVetoReport({ report });

      expect(exp.failed.length).toBe(3);
      const powerFail = exp.failed.find(f => f.rule === "power_veto");
      expect(powerFail).toBeDefined();
      expect(powerFail!.severity).toBe("critical");
    });

    it("provides suggested fixes for failed rules", () => {
      const report = createUnsafeReport();
      const exp = safetyExplanationEngine.explainVetoReport({ report });

      for (const f of exp.failed) {
        expect(f.suggested_fix).toBeDefined();
        expect(f.suggested_fix.length).toBeGreaterThan(0);
      }
    });

    it("generates counterfactuals for fixable vetos", () => {
      const report = createUnsafeReport();
      const exp = safetyExplanationEngine.explainVetoReport({ report });

      expect(exp.counterfactuals.length).toBeGreaterThan(0);
      const cfPass = exp.counterfactuals.find(cf => cf.outcome === "PASS");
      expect(cfPass).toBeDefined();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // explainGate — certified
  // ══════════════════════════════════════════════════════════════════════════
  describe("explainGate() — certified", () => {
    it("returns CERTIFIED verdict for certified gate", () => {
      const gate = createCertifiedGate();
      const exp = safetyExplanationEngine.explainGate({ gate });

      expect(exp.verdict).toBe("CERTIFIED");
    });

    it("includes all four artifacts in evidence chain", () => {
      const gate = createCertifiedGate();
      const exp = safetyExplanationEngine.explainGate({ gate });

      const rules = exp.evidence_chain.map(e => e.rule);
      expect(rules).toContain("SafetyVetoEngine");
      expect(rules).toContain("Simulation");
      expect(rules).toContain("CollisionDetection");
      expect(rules).toContain("EnvelopeValidation");
    });

    it("all evidence chain steps pass", () => {
      const gate = createCertifiedGate();
      const exp = safetyExplanationEngine.explainGate({ gate });

      for (const step of exp.evidence_chain) {
        expect(step.verdict).toBe("PASS");
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // explainGate — blocked
  // ══════════════════════════════════════════════════════════════════════════
  describe("explainGate() — blocked", () => {
    it("returns BLOCKED verdict for blocked gate", () => {
      const gate = createBlockedGate();
      const exp = safetyExplanationEngine.explainGate({ gate });

      expect(exp.verdict).toBe("BLOCKED");
    });

    it("lists blockers in failed section", () => {
      const gate = createBlockedGate();
      const exp = safetyExplanationEngine.explainGate({ gate });

      expect(exp.failed.length).toBeGreaterThan(0);
    });

    it("generates counterfactuals for resolution", () => {
      const gate = createBlockedGate();
      const exp = safetyExplanationEngine.explainGate({ gate });

      expect(exp.counterfactuals.length).toBeGreaterThan(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // explainBrief
  // ══════════════════════════════════════════════════════════════════════════
  describe("explainBrief()", () => {
    it("returns concise SAFE message for passing report", () => {
      const report = createSafeReport();
      const brief = safetyExplanationEngine.explainBrief(report);

      expect(brief).toContain("SAFE");
      expect(brief).toContain("8");
    });

    it("returns concise BLOCKED message for failing report", () => {
      const report = createUnsafeReport();
      const brief = safetyExplanationEngine.explainBrief(report);

      expect(brief).toContain("BLOCKED");
      expect(brief).toContain("3");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // findMinimalFlip
  // ══════════════════════════════════════════════════════════════════════════
  describe("findMinimalFlip()", () => {
    it("returns flip counterfactual for passing report", () => {
      const report = createSafeReport();
      const flip = safetyExplanationEngine.findMinimalFlip(report);

      expect(flip).not.toBeNull();
      expect(flip!.outcome).toBe("BLOCK");
    });

    it("returns flip counterfactual for failing report", () => {
      const report = createUnsafeReport();
      const flip = safetyExplanationEngine.findMinimalFlip(report);

      expect(flip).not.toBeNull();
      expect(flip!.outcome).toBe("PASS");
      expect(flip!.changes.length).toBeGreaterThan(0);
    });

    it("marks impossible when only hard-block vetos", () => {
      const report: VetoReport = {
        vetoed: true,
        checks: [
          { vetoed: true, rule: "collision_veto", original_value: 1, limit: 0, detail: "Collision" },
        ],
        active_vetos: [
          { vetoed: true, rule: "collision_veto", original_value: 1, limit: 0, detail: "Collision" },
        ],
        original_params: unsafeParams,
        machine,
        workholding,
      };

      const flip = safetyExplanationEngine.findMinimalFlip(report);

      expect(flip).not.toBeNull();
      expect(flip!.feasibility).toBe("impossible");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Margin analysis
  // ══════════════════════════════════════════════════════════════════════════
  describe("margin analysis", () => {
    it("identifies closest rule to threshold", () => {
      const report = createSafeReport();
      const exp = safetyExplanationEngine.explainVetoReport({ report });

      expect(exp.margins.length).toBeGreaterThan(0);
      // Margins sorted by margin_pct ascending
      expect(exp.margins[0].margin_pct).toBeLessThanOrEqual(exp.margins[1]?.margin_pct ?? Infinity);
    });

    it("classifies risk levels correctly", () => {
      const report = createSafeReport();
      const exp = safetyExplanationEngine.explainVetoReport({ report });

      for (const m of exp.margins) {
        expect(["safe", "marginal", "borderline", "exceeded"]).toContain(m.risk_level);
      }
    });

    it("marks exceeded for vetoed rules", () => {
      const report = createUnsafeReport();
      const exp = safetyExplanationEngine.explainVetoReport({ report });

      const exceededMargins = exp.margins.filter(m => m.risk_level === "exceeded");
      expect(exceededMargins.length).toBeGreaterThan(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Feature attribution
  // ══════════════════════════════════════════════════════════════════════════
  describe("feature attribution", () => {
    it("computes attributions for key parameters", () => {
      const report = createSafeReport();
      const exp = safetyExplanationEngine.explainVetoReport({ report });

      expect(exp.attributions.length).toBeGreaterThan(0);
      const features = exp.attributions.map(a => a.feature);
      expect(features).toContain("Fc_N");
      expect(features).toContain("RPM");
    });

    it("importance percentages sum to ~100%", () => {
      const report = createSafeReport();
      const exp = safetyExplanationEngine.explainVetoReport({ report });

      const totalImportance = exp.attributions.reduce((sum, a) => sum + a.importance_pct, 0);
      expect(totalImportance).toBeCloseTo(100, 0);
    });

    it("ranks higher contributors first", () => {
      const report = createUnsafeReport();
      const exp = safetyExplanationEngine.explainVetoReport({ report });

      for (let i = 1; i < exp.attributions.length; i++) {
        expect(exp.attributions[i - 1].importance_pct).toBeGreaterThanOrEqual(exp.attributions[i].importance_pct);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Evidence chain
  // ══════════════════════════════════════════════════════════════════════════
  describe("evidence chain", () => {
    it("includes all checked rules", () => {
      const report = createSafeReport();
      const exp = safetyExplanationEngine.explainVetoReport({ report });

      expect(exp.evidence_chain.length).toBe(8);
    });

    it("each step has formula reference", () => {
      const report = createSafeReport();
      const exp = safetyExplanationEngine.explainVetoReport({ report });

      for (const step of exp.evidence_chain) {
        expect(step.formula).toBeDefined();
        expect(step.formula.length).toBeGreaterThan(0);
      }
    });

    it("steps are numbered sequentially", () => {
      const report = createSafeReport();
      const exp = safetyExplanationEngine.explainVetoReport({ report });

      for (let i = 0; i < exp.evidence_chain.length; i++) {
        expect(exp.evidence_chain[i].step).toBe(i + 1);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Audit metadata
  // ══════════════════════════════════════════════════════════════════════════
  describe("audit metadata", () => {
    it("includes input hash", () => {
      const report = createSafeReport();
      const exp = safetyExplanationEngine.explainVetoReport({ report });

      expect(exp.audit.input_hash).toBeDefined();
      expect(exp.audit.input_hash.length).toBe(8);
    });

    it("includes engine versions", () => {
      const report = createSafeReport();
      const exp = safetyExplanationEngine.explainVetoReport({ report });

      expect(exp.audit.engine_versions.SafetyVetoEngine).toBeDefined();
      expect(exp.audit.engine_versions.SafetyExplanationEngine).toBeDefined();
    });

    it("same inputs produce same hash", () => {
      const report1 = createSafeReport();
      const report2 = createSafeReport();
      const exp1 = safetyExplanationEngine.explainVetoReport({ report: report1 });
      const exp2 = safetyExplanationEngine.explainVetoReport({ report: report2 });

      expect(exp1.audit.input_hash).toBe(exp2.audit.input_hash);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // renderMarkdown
  // ══════════════════════════════════════════════════════════════════════════
  describe("renderMarkdown()", () => {
    it("renders valid markdown for safe report", () => {
      const report = createSafeReport();
      const exp = safetyExplanationEngine.explainVetoReport({ report });
      const md = safetyExplanationEngine.renderMarkdown(exp);

      expect(md).toContain("# Safety Explanation");
      expect(md).toContain("PASS");
      expect(md).toContain("## Summary");
    });

    it("renders failures section for blocked report", () => {
      const report = createUnsafeReport();
      const exp = safetyExplanationEngine.explainVetoReport({ report });
      const md = safetyExplanationEngine.renderMarkdown(exp);

      expect(md).toContain("## Failures");
      expect(md).toContain("critical");
    });

    it("includes audit trail for technical level", () => {
      const report = createSafeReport();
      const exp = safetyExplanationEngine.explainVetoReport({ report, level: "technical" });
      const md = safetyExplanationEngine.renderMarkdown(exp);

      expect(md).toContain("## Audit Trail");
      expect(md).toContain("Input hash");
    });

    it("includes counterfactuals section when present", () => {
      const report = createUnsafeReport();
      const exp = safetyExplanationEngine.explainVetoReport({ report });
      const md = safetyExplanationEngine.renderMarkdown(exp);

      expect(md).toContain("## Counterfactuals");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Explanation levels
  // ══════════════════════════════════════════════════════════════════════════
  describe("explanation levels", () => {
    it("summary level has minimal detail", () => {
      const report = createSafeReport();
      const exp = safetyExplanationEngine.explainVetoReport({ report, level: "summary" });

      expect(exp.level).toBe("summary");
    });

    it("detailed level is default", () => {
      const report = createSafeReport();
      const exp = safetyExplanationEngine.explainVetoReport({ report });

      expect(exp.level).toBe("detailed");
    });

    it("audit level includes full metadata", () => {
      const report = createSafeReport();
      const exp = safetyExplanationEngine.explainVetoReport({ report, level: "audit" });

      expect(exp.level).toBe("audit");
      expect(exp.audit.explainer_version).toBeDefined();
    });
  });
});
