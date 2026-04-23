import { describe, it, expect, beforeEach } from "vitest";
import { nistAIRMFComplianceEngine } from "../../engines/NISTAIRMFComplianceEngine.js";

describe("NISTAIRMFComplianceEngine", () => {
  beforeEach(() => {
    nistAIRMFComplianceEngine.clearAll();
  });

  describe("default controls", () => {
    it("seeds NIST AI RMF, ISO 42001, and STRIDE default controls", () => {
      const all = nistAIRMFComplianceEngine.listControls();
      expect(all.length).toBeGreaterThanOrEqual(9 + 7 + 6);
      const rmf = nistAIRMFComplianceEngine.listControls("NIST_AI_RMF");
      const iso = nistAIRMFComplianceEngine.listControls("ISO_42001");
      const stride = nistAIRMFComplianceEngine.listControls("STRIDE");
      expect(rmf.length).toBeGreaterThanOrEqual(9);
      expect(iso.length).toBeGreaterThanOrEqual(7);
      expect(stride.length).toBe(6);
      expect(rmf.find(c => c.id === "GOVERN-1.1")).toBeDefined();
      expect(iso.find(c => c.id === "ISO42001-5.2")).toBeDefined();
    });

    it("filters controls by category within a framework", () => {
      const govern = nistAIRMFComplianceEngine.listControls("NIST_AI_RMF", "GOVERN");
      for (const c of govern) expect(c.category).toBe("GOVERN");
      expect(govern.length).toBeGreaterThan(0);
    });
  });

  describe("control maturity", () => {
    it("updates maturity and rejects exceeding target", () => {
      const c = nistAIRMFComplianceEngine.updateControlMaturity("GOVERN-1.1", 3);
      expect(c.maturity_current).toBe(3);
      expect(() => nistAIRMFComplianceEngine.updateControlMaturity("GOVERN-1.1", 4 as never)).not.toThrow();
      // target is 4, so 4 should succeed. Now attempt a control with target 4 not to exceed:
      // registerControl with lower target:
      nistAIRMFComplianceEngine.registerControl({
        id: "TEST-LOW", framework: "NIST_AI_RMF", category: "MAP",
        name: "low target", description: "x", maturity_target: 2, maturity_current: 0,
        references: [],
      });
      expect(() => nistAIRMFComplianceEngine.updateControlMaturity("TEST-LOW", 3 as never))
        .toThrow(/cannot exceed target/);
    });

    it("rejects registering control with current > target", () => {
      expect(() => nistAIRMFComplianceEngine.registerControl({
        id: "BAD", framework: "STRIDE", category: "spoofing",
        name: "bad", description: "x", maturity_target: 2, maturity_current: 3 as never,
        references: [],
      })).toThrow(/cannot exceed maturity_target/);
    });
  });

  describe("STRIDE threats and mitigations", () => {
    it("registers a threat and lists by unit and category", () => {
      const t = nistAIRMFComplianceEngine.registerThreat({
        unit_id: "tenant-auth-flow",
        category: "spoofing",
        description: "Attacker spoofs tenant JWT claims",
        attack_vector: "Forged JWT without signature verification",
        assets_at_risk: ["tenant-session", "api-key-store"],
        mitigation_ids: [],
      });
      expect(t.id).toMatch(/^T-\d{4}$/);
      expect(nistAIRMFComplianceEngine.listThreats("tenant-auth-flow")).toHaveLength(1);
      expect(nistAIRMFComplianceEngine.listThreats(undefined, "spoofing")).toHaveLength(1);
    });

    it("registers a mitigation cross-referencing a real control", () => {
      const m = nistAIRMFComplianceEngine.registerMitigation({
        control_ids: ["GOVERN-2.1"],
        description: "JWT signature verification + audience claim check",
        implementation_status: "validated",
        effectiveness: 0.8,
        evidence_ref: "JIRA-SEC-142",
        owner: "platform-sec",
      });
      expect(m.id).toMatch(/^M-\d{4}$/);
      expect(m.control_ids).toContain("GOVERN-2.1");
    });

    it("rejects mitigation referencing unknown control", () => {
      expect(() => nistAIRMFComplianceEngine.registerMitigation({
        control_ids: ["DOES-NOT-EXIST"],
        description: "x", implementation_status: "partial",
        effectiveness: 0.5, evidence_ref: "", owner: "",
      })).toThrow(/Unknown control reference/);
    });

    it("rejects effectiveness outside [0, 1]", () => {
      expect(() => nistAIRMFComplianceEngine.registerMitigation({
        control_ids: ["GOVERN-1.1"], description: "x",
        implementation_status: "partial", effectiveness: 1.5,
        evidence_ref: "", owner: "",
      })).toThrow(/effectiveness must be in/);
    });
  });

  describe("residual risk math", () => {
    it("computes inherent and residual scores and bands with no mitigation", () => {
      const t = nistAIRMFComplianceEngine.registerThreat({
        unit_id: "u1", category: "tampering", description: "data tampering",
        attack_vector: "x", assets_at_risk: [], mitigation_ids: [],
      });
      // likelihood 4 × impact 5 = inherent 20, no mitigations → residual 20 → critical
      const r = nistAIRMFComplianceEngine.registerRisk({
        threat_id: t.id, likelihood: 4, impact: 5,
        acceptance_rationale: "no mitigation yet", accepted_by: "ciso",
      });
      expect(r.inherent_score).toBe(20);
      expect(r.residual_score).toBe(20);
      expect(r.residual_band).toBe("critical");
      expect(r.mitigation_effectiveness).toBe(0);
    });

    it("combines two mitigations via 1 - Π(1 - e_i)", () => {
      const m1 = nistAIRMFComplianceEngine.registerMitigation({
        control_ids: ["STRIDE-T"], description: "m1",
        implementation_status: "validated", effectiveness: 0.5,
        evidence_ref: "ev1", owner: "sec",
      });
      const m2 = nistAIRMFComplianceEngine.registerMitigation({
        control_ids: ["STRIDE-T"], description: "m2",
        implementation_status: "implemented", effectiveness: 0.5,
        evidence_ref: "ev2", owner: "sec",
      });
      const t = nistAIRMFComplianceEngine.registerThreat({
        unit_id: "u2", category: "tampering", description: "data tampering",
        attack_vector: "x", assets_at_risk: [], mitigation_ids: [m1.id, m2.id],
      });
      // 1 - (1 - 0.5)(1 - 0.5) = 1 - 0.25 = 0.75
      const r = nistAIRMFComplianceEngine.registerRisk({
        threat_id: t.id, likelihood: 4, impact: 5,
        acceptance_rationale: "partial coverage", accepted_by: "ciso",
      });
      expect(r.mitigation_effectiveness).toBeCloseTo(0.75, 5);
      expect(r.residual_score).toBeCloseTo(20 * 0.25, 5); // = 5
      expect(r.residual_band).toBe("medium"); // 5 ≤ 10
    });

    it("excludes unimplemented mitigations from effective coverage", () => {
      const m = nistAIRMFComplianceEngine.registerMitigation({
        control_ids: ["STRIDE-I"], description: "not yet deployed",
        implementation_status: "partial", effectiveness: 1.0,
        evidence_ref: "plan", owner: "sec",
      });
      const t = nistAIRMFComplianceEngine.registerThreat({
        unit_id: "u3", category: "information_disclosure", description: "data leak",
        attack_vector: "x", assets_at_risk: [], mitigation_ids: [m.id],
      });
      const r = nistAIRMFComplianceEngine.registerRisk({
        threat_id: t.id, likelihood: 3, impact: 3,
        acceptance_rationale: "partial mitigation not effective yet", accepted_by: "ciso",
      });
      expect(r.mitigation_effectiveness).toBe(0);
      expect(r.residual_score).toBe(9); // inherent = 9
      expect(r.residual_band).toBe("medium"); // 5..10
    });

    it("band boundaries: low/medium/high/critical", () => {
      const t = nistAIRMFComplianceEngine.registerThreat({
        unit_id: "u4", category: "denial_of_service", description: "dos",
        attack_vector: "x", assets_at_risk: [], mitigation_ids: [],
      });
      const rLow = nistAIRMFComplianceEngine.registerRisk({
        threat_id: t.id, likelihood: 2, impact: 2,
        acceptance_rationale: "low exposure", accepted_by: "ciso",
      });
      expect(rLow.residual_score).toBe(4);
      expect(rLow.residual_band).toBe("low");

      const rMed = nistAIRMFComplianceEngine.registerRisk({
        threat_id: t.id, likelihood: 2, impact: 5,
        acceptance_rationale: "medium", accepted_by: "ciso",
      });
      expect(rMed.residual_score).toBe(10);
      expect(rMed.residual_band).toBe("medium");

      const rHigh = nistAIRMFComplianceEngine.registerRisk({
        threat_id: t.id, likelihood: 3, impact: 4,
        acceptance_rationale: "high", accepted_by: "ciso",
      });
      expect(rHigh.residual_score).toBe(12);
      expect(rHigh.residual_band).toBe("high");

      const rCrit = nistAIRMFComplianceEngine.registerRisk({
        threat_id: t.id, likelihood: 5, impact: 5,
        acceptance_rationale: "crit", accepted_by: "ciso",
      });
      expect(rCrit.residual_score).toBe(25);
      expect(rCrit.residual_band).toBe("critical");
    });
  });

  describe("risk register", () => {
    it("aggregates by band and flags critical + overdue", () => {
      const t = nistAIRMFComplianceEngine.registerThreat({
        unit_id: "u5", category: "elevation_of_privilege", description: "escalation",
        attack_vector: "x", assets_at_risk: [], mitigation_ids: [],
      });
      nistAIRMFComplianceEngine.registerRisk({
        threat_id: t.id, likelihood: 5, impact: 5,
        acceptance_rationale: "crit", accepted_by: "ciso",
      });
      nistAIRMFComplianceEngine.registerRisk({
        threat_id: t.id, likelihood: 1, impact: 1,
        acceptance_rationale: "low", accepted_by: "ciso",
      });
      const reg = nistAIRMFComplianceEngine.getRiskRegister();
      expect(reg.total_risks).toBe(2);
      expect(reg.by_band.critical).toBe(1);
      expect(reg.by_band.low).toBe(1);
      expect(reg.critical_risks.length).toBe(1);
      expect(reg.top_residual_risks.length).toBe(2);
      expect(reg.top_residual_risks[0].residual_score).toBeGreaterThanOrEqual(
        reg.top_residual_risks[1].residual_score,
      );
    });

    it("flags overdue reviews past review_due", () => {
      const t = nistAIRMFComplianceEngine.registerThreat({
        unit_id: "u6", category: "repudiation", description: "no audit",
        attack_vector: "x", assets_at_risk: [], mitigation_ids: [],
      });
      const r = nistAIRMFComplianceEngine.registerRisk({
        threat_id: t.id, likelihood: 2, impact: 2,
        acceptance_rationale: "minor", accepted_by: "ciso", review_due_days: 30,
      });
      // Advance "now" to 60 days after accepted
      const futureNow = r.accepted_at + 60 * 24 * 3600 * 1000;
      const reg = nistAIRMFComplianceEngine.getRiskRegister(futureNow);
      expect(reg.overdue_reviews.map(x => x.id)).toContain(r.id);
    });
  });

  describe("control-to-unit mapping", () => {
    it("maps a control to a unit with evidence, then appends without duplicating", () => {
      const m1 = nistAIRMFComplianceEngine.mapControlToUnit("GOVERN-1.1", "tenant-admin", "JIRA-1");
      expect(m1.mapped_unit_ids).toEqual(["tenant-admin"]);
      expect(m1.mapped_evidence_refs).toEqual(["JIRA-1"]);

      const m2 = nistAIRMFComplianceEngine.mapControlToUnit("GOVERN-1.1", "tenant-admin", "JIRA-1");
      expect(m2.mapped_unit_ids).toEqual(["tenant-admin"]); // no dup
      expect(m2.mapped_evidence_refs).toEqual(["JIRA-1"]); // no dup

      const m3 = nistAIRMFComplianceEngine.mapControlToUnit("GOVERN-1.1", "rbac-engine", "JIRA-2");
      expect(m3.mapped_unit_ids).toEqual(["tenant-admin", "rbac-engine"]);
      expect(m3.mapped_evidence_refs).toEqual(["JIRA-1", "JIRA-2"]);
    });

    it("rejects mapping to unknown control", () => {
      expect(() => nistAIRMFComplianceEngine.mapControlToUnit("DOES-NOT-EXIST", "u1", "ev"))
        .toThrow(/Unknown control/);
    });
  });

  describe("compliance reports", () => {
    it("flags low maturity and unmapped controls", () => {
      const rpt = nistAIRMFComplianceEngine.generateComplianceReport("NIST_AI_RMF");
      // Defaults all start at 0 maturity and 0 mappings — should flag hard
      expect(rpt.maturity_average).toBe(0);
      expect(rpt.controls_implemented).toBe(0);
      expect(rpt.unmapped_control_ids.length).toBe(rpt.controls_total);
      expect(rpt.recommendations.some(r => /CRITICAL/.test(r))).toBe(true);
    });

    it("reports healthy posture after maturity bump + full mapping", () => {
      for (const c of nistAIRMFComplianceEngine.listControls("ISO_42001")) {
        nistAIRMFComplianceEngine.updateControlMaturity(c.id, 4);
        nistAIRMFComplianceEngine.mapControlToUnit(c.id, "u-" + c.id, "ev-" + c.id);
      }
      const rpt = nistAIRMFComplianceEngine.generateComplianceReport("ISO_42001");
      expect(rpt.maturity_average).toBe(4);
      expect(rpt.controls_validated).toBe(rpt.controls_total);
      expect(rpt.unmapped_control_ids.length).toBe(0);
      expect(rpt.recommendations.some(r => /posture acceptable/.test(r))).toBe(true);
    });
  });

  describe("stats", () => {
    it("rolls up controls by framework and risk counts", () => {
      const t = nistAIRMFComplianceEngine.registerThreat({
        unit_id: "u7", category: "spoofing", description: "x",
        attack_vector: "x", assets_at_risk: [], mitigation_ids: [],
      });
      nistAIRMFComplianceEngine.registerRisk({
        threat_id: t.id, likelihood: 5, impact: 5,
        acceptance_rationale: "crit", accepted_by: "ciso",
      });
      const stats = nistAIRMFComplianceEngine.getStats();
      expect(stats.controls_registered).toBeGreaterThan(0);
      expect(stats.controls_by_framework.STRIDE).toBe(6);
      expect(stats.threats_registered).toBe(1);
      expect(stats.risks_critical).toBe(1);
    });
  });
});
