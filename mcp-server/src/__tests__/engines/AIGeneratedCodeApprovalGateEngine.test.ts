/**
 * Tests for AIGeneratedCodeApprovalGateEngine — P0-CRITICAL Safety Gate
 *
 * Covers:
 * - Submission lifecycle (submit → pending → approved/rejected/modification_required)
 * - Risk assessment (collision, overload, chatter, thermal)
 * - Confidence score validation
 * - Parameter explanations
 * - Diff generation against baseline programs
 * - Escalation path for high-risk decisions
 * - Role-based review authorization
 * - Self-review prevention for critical risk
 * - Audit trail for AS9100/ISO 13485 compliance
 * - Configuration management
 * - Stats and history queries
 *
 * SAFETY CRITICAL: This gate ensures NO AI-generated G-code reaches
 * the machine without human oversight.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  AIGeneratedCodeApprovalGateEngine,
  type RiskAssessment,
  type ParameterExplanation,
  type GateInstance,
} from "../../engines/AIGeneratedCodeApprovalGateEngine.js";

describe("AIGeneratedCodeApprovalGateEngine", () => {
  let engine: AIGeneratedCodeApprovalGateEngine;

  // Sample G-code for testing
  const sampleGcode = `
O0001 (TEST PROGRAM)
N10 G90 G80 G40 G21
N20 T01 M06
N30 G43 H01 Z100.0
N40 S5000 M03
N50 G00 X0 Y0
N60 G00 Z5.0
N70 G01 Z-5.0 F200
N80 G01 X50.0 F500
N90 G01 Y50.0
N100 G00 Z100.0
N110 M30
`.trim();

  const baselineGcode = `
O0001 (TEST PROGRAM)
N10 G90 G80 G40 G21
N20 T01 M06
N30 G43 H01 Z100.0
N40 S4000 M03
N50 G00 X0 Y0
N60 G00 Z5.0
N70 G01 Z-5.0 F150
N80 G01 X50.0 F400
N90 G01 Y50.0
N100 G00 Z100.0
N110 M30
`.trim();

  const lowRiskAssessment: RiskAssessment = {
    overall_risk: "low",
    risk_score: 10,
    factors: [],
    requires_escalation: false,
    collision_check: { performed: true, result: "pass" },
    overload_check: { performed: true, max_force_percent: 50, result: "pass" },
    chatter_check: { performed: true, stability_margin: 1.5, result: "pass" },
    thermal_check: { performed: true, max_temp_c: 300, result: "pass" },
  };

  const highRiskAssessment: RiskAssessment = {
    overall_risk: "high",
    risk_score: 65,
    factors: [
      {
        category: "overload",
        severity: "high",
        probability: 0.5,
        description: "Cutting force near limit (85% of capacity)",
        mitigation: "Consider reducing parameters",
      },
      {
        category: "chatter",
        severity: "medium",
        probability: 0.3,
        description: "Stability margin 90% — potential chatter",
      },
    ],
    requires_escalation: true,
    escalation_reason: "Risk level 'high' exceeds threshold 'high'",
    collision_check: { performed: true, result: "pass" },
    overload_check: { performed: true, max_force_percent: 85, result: "warning" },
    chatter_check: { performed: true, stability_margin: 0.9, result: "warning" },
    thermal_check: { performed: true, max_temp_c: 450, result: "pass" },
  };

  const criticalRiskAssessment: RiskAssessment = {
    overall_risk: "critical",
    risk_score: 90,
    factors: [
      {
        category: "collision",
        severity: "critical",
        probability: 0.9,
        description: "Collision detected in toolpath simulation",
        detected_at: "Line 70-80",
      },
    ],
    requires_escalation: true,
    escalation_reason: "Critical risk detected — collision imminent",
    collision_check: { performed: true, result: "fail", details: "Tool holder contacts fixture at X25 Y30" },
    overload_check: { performed: false, max_force_percent: 0, result: "not_checked" },
    chatter_check: { performed: false, stability_margin: 0, result: "not_checked" },
    thermal_check: { performed: false, max_temp_c: 0, result: "not_checked" },
  };

  const sampleExplanations: ParameterExplanation[] = [
    {
      parameter: "spindle_speed",
      value: 5000,
      unit: "RPM",
      reasoning: "Calculated for HSS end mill in 6061-T6 aluminum at 100 m/min SFM",
      source: "speed_feed_engine",
      confidence: 92,
    },
    {
      parameter: "feed_rate",
      value: 500,
      unit: "mm/min",
      reasoning: "Based on 0.05mm chip load per tooth, 2-flute cutter",
      source: "speed_feed_engine",
      confidence: 88,
    },
    {
      parameter: "depth_of_cut",
      value: 5.0,
      unit: "mm",
      reasoning: "Roughing pass at 1xD for stability",
      source: "tribal_knowledge",
      confidence: 85,
      warning: "Verify tool stickout does not exceed 4xD",
    },
  ];

  const baseMetadata = {
    machine_id: "HAAS-VF2",
    material: "6061-T6",
    part_number: "PN-12345",
    operation_type: "roughing",
    cam_system: "Mastercam",
    generated_by: "PRISM-AI-v2.1",
    generation_timestamp: new Date().toISOString(),
  };

  beforeEach(() => {
    engine = new AIGeneratedCodeApprovalGateEngine();
  });

  describe("submit", () => {
    it("creates a pending approval request for low-risk code", async () => {
      const instance = await engine.submit({
        programContent: sampleGcode,
        programName: "TEST-001.NC",
        aiConfidence: 95,
        explanations: sampleExplanations,
        riskAssessment: lowRiskAssessment,
        submittedBy: "ai_system",
        metadata: baseMetadata,
      });

      expect(instance.id).toMatch(/^agc-\d+-[a-z0-9]+$/);
      expect(instance.status).toBe("pending");
      expect(instance.request.aiConfidence).toBe(95);
      expect(instance.request.explanations).toHaveLength(3);
      expect(instance.submitted_by).toBe("ai_system");
      expect(instance.audit_trail).toHaveLength(1);
      expect(instance.audit_trail[0].action).toBe("submitted");
    });

    it("auto-escalates high-risk submissions", async () => {
      const instance = await engine.submit({
        programContent: sampleGcode,
        programName: "TEST-002.NC",
        aiConfidence: 75,
        explanations: sampleExplanations,
        riskAssessment: highRiskAssessment,
        submittedBy: "ai_system",
        metadata: baseMetadata,
      });

      expect(instance.status).toBe("escalated");
      expect(instance.escalation_chain).toHaveLength(1);
      expect(instance.escalation_chain[0].reason).toContain("high");
    });

    it("auto-escalates critical-risk submissions", async () => {
      const instance = await engine.submit({
        programContent: sampleGcode,
        programName: "TEST-003.NC",
        aiConfidence: 60,
        explanations: sampleExplanations,
        riskAssessment: criticalRiskAssessment,
        submittedBy: "ai_system",
        metadata: baseMetadata,
      });

      expect(instance.status).toBe("escalated");
      expect(instance.request.riskAssessment.overall_risk).toBe("critical");
    });

    it("generates diff when baseline is provided", async () => {
      const instance = await engine.submit({
        programContent: sampleGcode,
        programName: "TEST-004.NC",
        aiConfidence: 90,
        explanations: sampleExplanations,
        riskAssessment: lowRiskAssessment,
        submittedBy: "ai_system",
        metadata: baseMetadata,
        baseline: {
          program_id: "baseline-001",
          program_name: "TEST-004-baseline.NC",
          content: baselineGcode,
        },
      });

      expect(instance.diff).toBeDefined();
      expect(instance.diff!.has_baseline).toBe(true);
      expect(instance.diff!.baseline_id).toBe("baseline-001");
      expect(instance.diff!.changes.length).toBeGreaterThan(0);
      // S4000->S5000, F150->F200, F400->F500 are changes
      expect(instance.diff!.additions).toBeGreaterThanOrEqual(0);
      expect(instance.diff!.similarity_percent).toBeLessThan(100);
    });

    it("rejects empty program content", async () => {
      await expect(
        engine.submit({
          programContent: "",
          programName: "EMPTY.NC",
          aiConfidence: 90,
          explanations: [],
          riskAssessment: lowRiskAssessment,
          submittedBy: "ai_system",
          metadata: baseMetadata,
        })
      ).rejects.toThrow("Program content cannot be empty");
    });

    it("rejects invalid confidence scores", async () => {
      await expect(
        engine.submit({
          programContent: sampleGcode,
          programName: "TEST.NC",
          aiConfidence: 150,
          explanations: [],
          riskAssessment: lowRiskAssessment,
          submittedBy: "ai_system",
          metadata: baseMetadata,
        })
      ).rejects.toThrow("AI confidence must be between 0 and 100");

      await expect(
        engine.submit({
          programContent: sampleGcode,
          programName: "TEST.NC",
          aiConfidence: -10,
          explanations: [],
          riskAssessment: lowRiskAssessment,
          submittedBy: "ai_system",
          metadata: baseMetadata,
        })
      ).rejects.toThrow("AI confidence must be between 0 and 100");
    });

    it("rejects missing generated_by in metadata", async () => {
      await expect(
        engine.submit({
          programContent: sampleGcode,
          programName: "TEST.NC",
          aiConfidence: 90,
          explanations: [],
          riskAssessment: lowRiskAssessment,
          submittedBy: "ai_system",
          metadata: {
            machine_id: "TEST",
            generation_timestamp: new Date().toISOString(),
          } as any,
        })
      ).rejects.toThrow("metadata.generated_by is required");
    });

    it("sets expiration time based on config", async () => {
      const instance = await engine.submit({
        programContent: sampleGcode,
        programName: "TEST-EXPIRE.NC",
        aiConfidence: 90,
        explanations: sampleExplanations,
        riskAssessment: lowRiskAssessment,
        submittedBy: "ai_system",
        metadata: baseMetadata,
      });

      expect(instance.expires_at).toBeDefined();
      const expiresMs = new Date(instance.expires_at!).getTime();
      const submittedMs = new Date(instance.submitted_at).getTime();
      const hoursUntilExpiry = (expiresMs - submittedMs) / 3600000;
      expect(hoursUntilExpiry).toBeCloseTo(72, 0); // Default 72 hours
    });
  });

  describe("decide", () => {
    let pendingInstance: GateInstance;

    beforeEach(async () => {
      pendingInstance = await engine.submit({
        programContent: sampleGcode,
        programName: "DECIDE-TEST.NC",
        aiConfidence: 90,
        explanations: sampleExplanations,
        riskAssessment: lowRiskAssessment,
        submittedBy: "ai_system",
        metadata: baseMetadata,
      });
    });

    it("approves a pending request", async () => {
      const decided = await engine.decide({
        requestId: pendingInstance.id,
        decision: "approved",
        reviewer: "john_programmer",
        reviewerRoles: ["programmer"],
        comments: "Looks good, speeds are appropriate for this material",
      });

      expect(decided.status).toBe("approved");
      expect(decided.decision).toBe("approved");
      expect(decided.reviewer).toBe("john_programmer");
      expect(decided.reviewed_at).toBeDefined();
      expect(decided.comments).toBe("Looks good, speeds are appropriate for this material");
      expect(decided.audit_trail.length).toBeGreaterThan(1);
    });

    it("rejects a pending request", async () => {
      const decided = await engine.decide({
        requestId: pendingInstance.id,
        decision: "rejected",
        reviewer: "jane_programmer",
        reviewerRoles: ["programmer"],
        comments: "Feed rate too aggressive for this tool diameter",
      });

      expect(decided.status).toBe("rejected");
      expect(decided.decision).toBe("rejected");
    });

    it("requests modifications with specific changes", async () => {
      const decided = await engine.decide({
        requestId: pendingInstance.id,
        decision: "modification_required",
        reviewer: "bob_lead",
        reviewerRoles: ["programmer", "lead_programmer"],
        comments: "Needs adjustments before approval",
        modifications: [
          {
            parameter: "feed_rate",
            current_value: 500,
            requested_value: 400,
            reason: "Reduce to improve surface finish",
            priority: "required",
          },
          {
            parameter: "depth_of_cut",
            current_value: 5.0,
            requested_value: 4.0,
            reason: "Reduce for tool life",
            priority: "recommended",
          },
        ],
      });

      expect(decided.status).toBe("modification_required");
      expect(decided.modifications).toHaveLength(2);
      expect(decided.modifications![0].id).toMatch(/^mod-/);
      expect(decided.modifications![0].priority).toBe("required");
    });

    it("allows risk override with explicit acknowledgment", async () => {
      const instance = await engine.submit({
        programContent: sampleGcode,
        programName: "OVERRIDE-TEST.NC",
        aiConfidence: 85,
        explanations: sampleExplanations,
        riskAssessment: {
          ...lowRiskAssessment,
          overall_risk: "medium",
          risk_score: 35,
          factors: [{
            category: "chatter",
            severity: "medium",
            probability: 0.3,
            description: "Potential chatter at these parameters",
            mitigation: "Monitor during first article",
          }],
        },
        submittedBy: "ai_system",
        metadata: baseMetadata,
      });

      const decided = await engine.decide({
        requestId: instance.id,
        decision: "approved",
        reviewer: "senior_prog",
        reviewerRoles: ["programmer"],
        overrideRisks: ["chatter"],
        comments: "Accepted chatter risk — will monitor first article",
      });

      expect(decided.status).toBe("approved");
      expect(decided.audit_trail.some(a => a.details.overridden_risks)).toBe(true);
    });

    it("rejects decision on already-completed request", async () => {
      await engine.decide({
        requestId: pendingInstance.id,
        decision: "approved",
        reviewer: "first_reviewer",
        reviewerRoles: ["programmer"],
      });

      await expect(
        engine.decide({
          requestId: pendingInstance.id,
          decision: "rejected",
          reviewer: "second_reviewer",
          reviewerRoles: ["programmer"],
        })
      ).rejects.toThrow("Cannot decide on request in status");
    });

    it("rejects decision without required role", async () => {
      await expect(
        engine.decide({
          requestId: pendingInstance.id,
          decision: "approved",
          reviewer: "intern",
          reviewerRoles: ["trainee"],
        })
      ).rejects.toThrow("lacks required role");
    });

    it("blocks self-review for critical-risk programs", async () => {
      const criticalInstance = await engine.submit({
        programContent: sampleGcode,
        programName: "CRITICAL-TEST.NC",
        aiConfidence: 60,
        explanations: sampleExplanations,
        riskAssessment: criticalRiskAssessment,
        submittedBy: "ai_system",
        metadata: baseMetadata,
      });

      await expect(
        engine.decide({
          requestId: criticalInstance.id,
          decision: "approved",
          reviewer: "ai_system",
          reviewerRoles: ["lead_programmer"],
        })
      ).rejects.toThrow("Self-review not allowed");
    });

    it("rejects decision on non-existent request", async () => {
      await expect(
        engine.decide({
          requestId: "non-existent-id",
          decision: "approved",
          reviewer: "reviewer",
          reviewerRoles: ["programmer"],
        })
      ).rejects.toThrow("not found");
    });
  });

  describe("escalate", () => {
    it("escalates pending request to next level", async () => {
      const instance = await engine.submit({
        programContent: sampleGcode,
        programName: "ESCALATE-TEST.NC",
        aiConfidence: 80,
        explanations: sampleExplanations,
        riskAssessment: lowRiskAssessment,
        submittedBy: "ai_system",
        metadata: baseMetadata,
      });

      const escalated = await engine.escalate(
        instance.id,
        "junior_programmer",
        "Need senior review for complex fixture setup"
      );

      expect(escalated.status).toBe("escalated");
      expect(escalated.escalation_chain).toHaveLength(1);
      expect(escalated.escalation_chain[0].from_reviewer).toBe("junior_programmer");
      expect(escalated.escalation_chain[0].reason).toContain("complex fixture");
    });

    it("supports multiple escalation levels", async () => {
      const instance = await engine.submit({
        programContent: sampleGcode,
        programName: "MULTI-ESCALATE.NC",
        aiConfidence: 80,
        explanations: sampleExplanations,
        riskAssessment: lowRiskAssessment,
        submittedBy: "ai_system",
        metadata: baseMetadata,
      });

      await engine.escalate(instance.id, "prog1", "Level 1 escalation");
      const escalated2 = await engine.escalate(instance.id, "prog2", "Level 2 escalation");

      expect(escalated2.escalation_chain).toHaveLength(2);
      expect(escalated2.escalation_chain[1].escalation_level).toBe(2);
    });

    it("rejects escalation beyond max level", async () => {
      const instance = await engine.submit({
        programContent: sampleGcode,
        programName: "MAX-ESCALATE.NC",
        aiConfidence: 80,
        explanations: sampleExplanations,
        riskAssessment: lowRiskAssessment,
        submittedBy: "ai_system",
        metadata: baseMetadata,
      });

      // Escalate through all levels
      await engine.escalate(instance.id, "p1", "E1");
      await engine.escalate(instance.id, "p2", "E2");
      await engine.escalate(instance.id, "p3", "E3");

      await expect(
        engine.escalate(instance.id, "p4", "E4")
      ).rejects.toThrow("Maximum escalation level reached");
    });

    it("rejects escalation of completed request", async () => {
      const instance = await engine.submit({
        programContent: sampleGcode,
        programName: "COMPLETED-ESCALATE.NC",
        aiConfidence: 90,
        explanations: sampleExplanations,
        riskAssessment: lowRiskAssessment,
        submittedBy: "ai_system",
        metadata: baseMetadata,
      });

      await engine.decide({
        requestId: instance.id,
        decision: "approved",
        reviewer: "reviewer",
        reviewerRoles: ["programmer"],
      });

      await expect(
        engine.escalate(instance.id, "escalator", "Too late")
      ).rejects.toThrow("Cannot escalate request in status");
    });
  });

  describe("getPending", () => {
    beforeEach(async () => {
      // Create mix of pending requests
      await engine.submit({
        programContent: sampleGcode,
        programName: "LOW-URGENT.NC",
        aiConfidence: 95,
        explanations: sampleExplanations,
        riskAssessment: lowRiskAssessment,
        submittedBy: "ai_system",
        urgency: "low",
        metadata: baseMetadata,
      });

      await engine.submit({
        programContent: sampleGcode,
        programName: "CRITICAL-URGENT.NC",
        aiConfidence: 70,
        explanations: sampleExplanations,
        riskAssessment: criticalRiskAssessment,
        submittedBy: "ai_system",
        urgency: "critical",
        metadata: baseMetadata,
      });

      await engine.submit({
        programContent: sampleGcode,
        programName: "NORMAL-URGENT.NC",
        aiConfidence: 85,
        explanations: sampleExplanations,
        riskAssessment: lowRiskAssessment,
        submittedBy: "ai_system",
        urgency: "normal",
        metadata: baseMetadata,
      });
    });

    it("returns all pending requests sorted by urgency", () => {
      const pending = engine.getPending({ includeEscalated: true });
      expect(pending.length).toBeGreaterThanOrEqual(3);
      // Critical urgency should be first
      expect(pending[0].request.urgency).toBe("critical");
    });

    it("filters by urgency", () => {
      const low = engine.getPending({ urgency: "low" });
      expect(low.every(p => p.request.urgency === "low")).toBe(true);
    });

    it("filters by minimum risk score", () => {
      const highRisk = engine.getPending({ minRiskScore: 50, includeEscalated: true });
      expect(highRisk.every(p => p.request.riskAssessment.risk_score >= 50)).toBe(true);
    });

    it("excludes escalated by default", () => {
      const pending = engine.getPending();
      const escalated = pending.filter(p => p.status === "escalated");
      expect(escalated).toHaveLength(0);
    });

    it("includes escalated when requested", () => {
      const pending = engine.getPending({ includeEscalated: true });
      const hasEscalated = pending.some(p => p.status === "escalated");
      expect(hasEscalated).toBe(true);
    });
  });

  describe("getHistory", () => {
    beforeEach(async () => {
      const inst1 = await engine.submit({
        programContent: sampleGcode,
        programName: "HISTORY-001.NC",
        aiConfidence: 90,
        explanations: sampleExplanations,
        riskAssessment: lowRiskAssessment,
        submittedBy: "ai_system",
        metadata: { ...baseMetadata, part_number: "PART-A" },
      });
      await engine.decide({
        requestId: inst1.id,
        decision: "approved",
        reviewer: "reviewer",
        reviewerRoles: ["programmer"],
      });

      await engine.submit({
        programContent: sampleGcode,
        programName: "HISTORY-002.NC",
        aiConfidence: 85,
        explanations: sampleExplanations,
        riskAssessment: lowRiskAssessment,
        submittedBy: "ai_system",
        metadata: { ...baseMetadata, part_number: "PART-B" },
      });
    });

    it("returns history filtered by program name", () => {
      const history = engine.getHistory({ programName: "HISTORY-001.NC" });
      expect(history).toHaveLength(1);
      expect(history[0].request.programName).toBe("HISTORY-001.NC");
    });

    it("returns history filtered by part number", () => {
      const history = engine.getHistory({ partNumber: "PART-A" });
      expect(history).toHaveLength(1);
    });

    it("returns history filtered by status", () => {
      const approved = engine.getHistory({ status: "approved" });
      expect(approved.every(h => h.status === "approved")).toBe(true);
    });

    it("respects limit parameter", () => {
      const limited = engine.getHistory({ limit: 1 });
      expect(limited).toHaveLength(1);
    });
  });

  describe("assessRisk", () => {
    it("calculates low risk when all checks pass", () => {
      const risk = engine.assessRisk({
        programContent: sampleGcode,
        collisionCheckResult: { performed: true, result: "pass" },
        forceAnalysisResult: { max_force_percent: 50 },
        chatterAnalysisResult: { stability_margin: 1.5 },
        thermalAnalysisResult: { max_temp_c: 300 },
      });

      expect(risk.overall_risk).toBe("low");
      expect(risk.risk_score).toBeLessThan(30);
      expect(risk.requires_escalation).toBe(false);
    });

    it("calculates critical risk on collision failure", () => {
      const risk = engine.assessRisk({
        programContent: sampleGcode,
        collisionCheckResult: {
          performed: true,
          result: "fail",
          details: "Tool holder contacts fixture",
        },
      });

      expect(risk.overall_risk).toBe("critical");
      expect(risk.requires_escalation).toBe(true);
      expect(risk.factors.some(f => f.category === "collision")).toBe(true);
    });

    it("calculates high risk on overload warning", () => {
      const risk = engine.assessRisk({
        programContent: sampleGcode,
        forceAnalysisResult: { max_force_percent: 95 },
      });

      expect(risk.factors.some(f => f.category === "overload" && f.severity === "high")).toBe(true);
      expect(risk.overload_check.result).toBe("warning");
    });

    it("flags medium risk when collision check not performed", () => {
      const risk = engine.assessRisk({
        programContent: sampleGcode,
      });

      expect(risk.collision_check.result).toBe("not_checked");
      expect(risk.factors.some(f => f.category === "collision" && f.severity === "medium")).toBe(true);
    });

    it("calculates thermal risk on high temperature", () => {
      const risk = engine.assessRisk({
        programContent: sampleGcode,
        thermalAnalysisResult: { max_temp_c: 850 },
      });

      expect(risk.factors.some(f => f.category === "thermal" && f.severity === "critical")).toBe(true);
    });

    it("combines multiple risk factors correctly", () => {
      const risk = engine.assessRisk({
        programContent: sampleGcode,
        forceAnalysisResult: { max_force_percent: 85 },
        chatterAnalysisResult: { stability_margin: 0.7 },
      });

      // Both overload and chatter warnings
      expect(risk.factors.length).toBeGreaterThanOrEqual(2);
      expect(risk.overall_risk).toBe("critical"); // Multiple high = critical
    });
  });

  describe("explainParameters", () => {
    it("generates parameter explanations with defaults", () => {
      const explanations = engine.explainParameters([
        {
          parameter: "spindle_speed",
          value: 5000,
          unit: "RPM",
          reasoning: "Calculated for material",
        },
      ]);

      expect(explanations).toHaveLength(1);
      expect(explanations[0].source).toBe("ai_calculation");
      expect(explanations[0].confidence).toBe(85);
    });

    it("preserves custom values", () => {
      const explanations = engine.explainParameters([
        {
          parameter: "feed_rate",
          value: 500,
          unit: "mm/min",
          reasoning: "Based on chip load",
          source: "tribal_knowledge",
          confidence: 95,
          warning: "Verify with first article",
        },
      ]);

      expect(explanations[0].source).toBe("tribal_knowledge");
      expect(explanations[0].confidence).toBe(95);
      expect(explanations[0].warning).toBe("Verify with first article");
    });
  });

  describe("configure", () => {
    it("updates configuration values", () => {
      const config = engine.configure({
        max_pending_hours: 48,
        require_dual_approval_for_critical: false,
      });

      expect(config.max_pending_hours).toBe(48);
      expect(config.require_dual_approval_for_critical).toBe(false);
    });

    it("rejects auto_approve_threshold below 95", () => {
      expect(() => engine.configure({ auto_approve_threshold: 90 }))
        .toThrow("cannot be below 95");
    });

    it("rejects max_pending_hours below 1", () => {
      expect(() => engine.configure({ max_pending_hours: 0 }))
        .toThrow("must be at least 1");
    });

    it("rejects escalation_path with less than 2 levels", () => {
      expect(() => engine.configure({ escalation_path: ["single"] }))
        .toThrow("at least 2 levels");
    });

    it("returns current configuration", () => {
      const config = engine.getConfiguration();
      expect(config.auto_approve_threshold).toBe(99);
      expect(config.compliance_standards).toContain("AS9100");
    });
  });

  describe("getStats", () => {
    beforeEach(async () => {
      // Create mix of statuses
      const inst1 = await engine.submit({
        programContent: sampleGcode,
        programName: "STATS-1.NC",
        aiConfidence: 90,
        explanations: sampleExplanations,
        riskAssessment: lowRiskAssessment,
        submittedBy: "ai_system",
        metadata: baseMetadata,
      });
      await engine.decide({
        requestId: inst1.id,
        decision: "approved",
        reviewer: "r1",
        reviewerRoles: ["programmer"],
      });

      const inst2 = await engine.submit({
        programContent: sampleGcode,
        programName: "STATS-2.NC",
        aiConfidence: 85,
        explanations: sampleExplanations,
        riskAssessment: lowRiskAssessment,
        submittedBy: "ai_system",
        metadata: baseMetadata,
      });
      await engine.decide({
        requestId: inst2.id,
        decision: "rejected",
        reviewer: "r2",
        reviewerRoles: ["programmer"],
      });

      await engine.submit({
        programContent: sampleGcode,
        programName: "STATS-3.NC",
        aiConfidence: 80,
        explanations: sampleExplanations,
        riskAssessment: lowRiskAssessment,
        submittedBy: "ai_system",
        metadata: baseMetadata,
      });
    });

    it("returns accurate counts", () => {
      const stats = engine.getStats();
      expect(stats.total_requests).toBeGreaterThanOrEqual(3);
      expect(stats.approved).toBeGreaterThanOrEqual(1);
      expect(stats.rejected).toBeGreaterThanOrEqual(1);
      expect(stats.pending).toBeGreaterThanOrEqual(1);
    });

    it("calculates approval rate", () => {
      const stats = engine.getStats();
      expect(stats.approval_rate_percent).toBeGreaterThanOrEqual(0);
      expect(stats.approval_rate_percent).toBeLessThanOrEqual(100);
    });

    it("tracks risk distribution", () => {
      const stats = engine.getStats();
      expect(stats.risk_distribution.low).toBeGreaterThanOrEqual(0);
      expect(stats.risk_distribution.critical).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getRequest", () => {
    it("returns existing request by ID", async () => {
      const instance = await engine.submit({
        programContent: sampleGcode,
        programName: "GET-TEST.NC",
        aiConfidence: 90,
        explanations: sampleExplanations,
        riskAssessment: lowRiskAssessment,
        submittedBy: "ai_system",
        metadata: baseMetadata,
      });

      const found = engine.getRequest(instance.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(instance.id);
    });

    it("returns null for non-existent ID", () => {
      const found = engine.getRequest("does-not-exist");
      expect(found).toBeNull();
    });
  });

  describe("audit trail compliance", () => {
    it("records all actions in audit trail", async () => {
      const instance = await engine.submit({
        programContent: sampleGcode,
        programName: "AUDIT-TEST.NC",
        aiConfidence: 90,
        explanations: sampleExplanations,
        riskAssessment: lowRiskAssessment,
        submittedBy: "ai_system",
        metadata: baseMetadata,
      });

      await engine.escalate(instance.id, "reviewer", "Need second opinion");

      const updated = engine.getRequest(instance.id)!;
      expect(updated.audit_trail.length).toBeGreaterThanOrEqual(2);

      const actions = updated.audit_trail.map(a => a.action);
      expect(actions).toContain("submitted");
      expect(actions).toContain("escalated");
    });

    it("includes compliance signoff in audit", async () => {
      const instance = await engine.submit({
        programContent: sampleGcode,
        programName: "SIGNOFF-TEST.NC",
        aiConfidence: 90,
        explanations: sampleExplanations,
        riskAssessment: lowRiskAssessment,
        submittedBy: "ai_system",
        metadata: baseMetadata,
      });

      await engine.decide({
        requestId: instance.id,
        decision: "approved",
        reviewer: "certified_reviewer",
        reviewerRoles: ["programmer"],
        signoff: {
          certification: "AS9100",
          signature_hash: "abc123",
        },
      });

      const updated = engine.getRequest(instance.id)!;
      const approvalAudit = updated.audit_trail.find(a => a.action === "decision_approved");
      expect(approvalAudit?.details.signoff).toBeDefined();
    });
  });
});
