/**
 * Tests for TroubleshootingAssistantEngine
 * Interactive root-cause diagnosis for manufacturing problems.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  TroubleshootingAssistantEngine,
  type ProblemDomain,
} from "../engines/TroubleshootingAssistantEngine.js";

describe("TroubleshootingAssistantEngine", () => {
  let engine: TroubleshootingAssistantEngine;

  beforeEach(() => {
    engine = new TroubleshootingAssistantEngine();
  });

  // ── Structure tests ─────────────────────────────────────────────────
  describe("knowledge base structure", () => {
    it("has at least 50 diagnostic nodes across 8 domains", () => {
      // 52 nodes × 2-4 answers each = 100+ diagnostic paths across 8 domains
      expect(engine.getNodeCount()).toBeGreaterThanOrEqual(50);
    });

    it("covers all 8 problem domains", () => {
      const domains = engine.getDomains();
      expect(domains).toHaveLength(8);
      expect(domains).toContain("surface_finish");
      expect(domains).toContain("dimensional_accuracy");
      expect(domains).toContain("tool_breakage");
      expect(domains).toContain("chatter_vibration");
      expect(domains).toContain("chip_problems");
      expect(domains).toContain("thermal_issues");
      expect(domains).toContain("machine_alarms");
      expect(domains).toContain("workholding");
    });
  });

  // ── startDiagnosis in each domain ───────────────────────────────────
  describe("startDiagnosis", () => {
    const domains: ProblemDomain[] = [
      "surface_finish",
      "dimensional_accuracy",
      "tool_breakage",
      "chatter_vibration",
      "chip_problems",
      "thermal_issues",
      "machine_alarms",
      "workholding",
    ];

    for (const domain of domains) {
      it(`starts diagnosis in ${domain} domain`, () => {
        const result = engine.startDiagnosis({ domain });
        expect(result.session_id).toBeTruthy();
        expect(result.first_question).toBeTruthy();
        expect(result.first_question.domain).toBe(domain);
        expect(result.first_question.question).toBeTruthy();
        expect(result.first_question.answers.length).toBeGreaterThanOrEqual(2);
        expect(result.possible_causes.length).toBeGreaterThan(0);
      });
    }

    it("starts with symptom hints boosting probabilities", () => {
      const result = engine.startDiagnosis({
        domain: "surface_finish",
        symptoms: ["wavy", "chatter"],
      });
      expect(result.possible_causes.length).toBeGreaterThan(0);
      // Chatter-related cause should be boosted
      const chatterCause = result.possible_causes.find(
        (c) => c.cause.toLowerCase().includes("chatter")
      );
      expect(chatterCause).toBeDefined();
      expect(chatterCause!.probability).toBeGreaterThan(0);
    });

    it("throws on unknown domain", () => {
      expect(() =>
        engine.startDiagnosis({ domain: "unknown" as ProblemDomain })
      ).toThrow(/unknown/i);
    });
  });

  // ── answerQuestion ──────────────────────────────────────────────────
  describe("answerQuestion", () => {
    it("navigates to next question on non-terminal answer", () => {
      const start = engine.startDiagnosis({ domain: "surface_finish" });
      // Answer with first option (Wavy) which leads to sf-wavy
      const result = engine.answerQuestion({
        session_id: start.session_id,
        answer: "Wavy",
      });
      expect(result.next_question).toBeDefined();
      expect(result.diagnosis).toBeUndefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("reaches diagnosis on terminal answer", () => {
      const start = engine.startDiagnosis({ domain: "surface_finish" });
      // "Rough" -> sf-rough
      const q2 = engine.answerQuestion({
        session_id: start.session_id,
        answer: "Rough",
      });
      expect(q2.next_question).toBeDefined();
      // "Uniformly rough" -> terminal diagnosis
      const q3 = engine.answerQuestion({
        session_id: start.session_id,
        answer: "Uniformly rough",
      });
      expect(q3.diagnosis).toBeDefined();
      expect(q3.diagnosis!.root_cause).toBeTruthy();
      expect(q3.diagnosis!.fixes.length).toBeGreaterThan(0);
      expect(q3.remaining_questions).toBe(0);
    });

    it("supports numeric answer (index-based)", () => {
      const start = engine.startDiagnosis({ domain: "tool_breakage" });
      // Answer "1" = first option
      const result = engine.answerQuestion({
        session_id: start.session_id,
        answer: "1",
      });
      // Should navigate (first answer is "Sudden catastrophic breakage")
      expect(
        result.next_question || result.diagnosis
      ).toBeTruthy();
    });

    it("supports partial text matching", () => {
      const start = engine.startDiagnosis({ domain: "chip_problems" });
      // "stringy" should match "Long stringy chips wrapping around tool"
      const result = engine.answerQuestion({
        session_id: start.session_id,
        answer: "stringy",
      });
      expect(
        result.next_question || result.diagnosis
      ).toBeTruthy();
    });

    it("throws on invalid session ID", () => {
      expect(() =>
        engine.answerQuestion({
          session_id: "non-existent-id",
          answer: "something",
        })
      ).toThrow(/session not found/i);
    });

    it("throws on invalid answer", () => {
      const start = engine.startDiagnosis({ domain: "surface_finish" });
      expect(() =>
        engine.answerQuestion({
          session_id: start.session_id,
          answer: "xyzzy_nonsense_answer_that_matches_nothing",
        })
      ).toThrow(/invalid answer/i);
    });
  });

  // ── Complete walkthrough ────────────────────────────────────────────
  describe("complete decision tree walkthrough", () => {
    it("surface_finish: wavy -> periodic -> chatter diagnosis", () => {
      const start = engine.startDiagnosis({ domain: "surface_finish" });
      const q2 = engine.answerQuestion({
        session_id: start.session_id,
        answer: "Wavy",
      });
      expect(q2.next_question).toBeDefined();
      expect(q2.confidence).toBeGreaterThan(0.5);

      const q3 = engine.answerQuestion({
        session_id: start.session_id,
        answer: "Periodic",
      });
      expect(q3.diagnosis).toBeDefined();
      expect(q3.diagnosis!.root_cause).toContain("Chatter");
      expect(q3.diagnosis!.fixes.length).toBeGreaterThanOrEqual(3);
      expect(q3.diagnosis!.related_playbook_rules).toBeDefined();
      expect(q3.diagnosis!.physics_check).toBeTruthy();
      expect(q3.confidence).toBeGreaterThan(0.6);
    });

    it("dimensional_accuracy: oversized -> thermal growth", () => {
      const start = engine.startDiagnosis({
        domain: "dimensional_accuracy",
      });
      const q2 = engine.answerQuestion({
        session_id: start.session_id,
        answer: "oversized",
      });
      const q3 = engine.answerQuestion({
        session_id: start.session_id,
        answer: "Yes",
      });
      expect(q3.diagnosis).toBeDefined();
      expect(q3.diagnosis!.root_cause).toContain("Thermal");
      expect(q3.diagnosis!.physics_check).toContain("α");
    });

    it("chatter_vibration: specific RPM -> stability lobe", () => {
      const start = engine.startDiagnosis({
        domain: "chatter_vibration",
      });
      const q2 = engine.answerQuestion({
        session_id: start.session_id,
        answer: "specific RPM",
      });
      const q3 = engine.answerQuestion({
        session_id: start.session_id,
        answer: "Yes",
      });
      expect(q3.diagnosis).toBeDefined();
      expect(q3.diagnosis!.root_cause).toContain("chatter");
    });
  });

  // ── quickDiagnose ───────────────────────────────────────────────────
  describe("quickDiagnose", () => {
    it("returns causes for single symptom", () => {
      const result = engine.quickDiagnose({
        symptoms: ["chatter"],
      });
      expect(result.top_causes.length).toBeGreaterThan(0);
      expect(result.top_causes[0].cause).toBeTruthy();
      expect(result.top_causes[0].probability).toBeGreaterThan(0);
      expect(result.top_causes[0].fixes.length).toBeGreaterThan(0);
      expect(result.recommended_checks.length).toBeGreaterThan(0);
    });

    it("returns causes for multiple symptoms", () => {
      const result = engine.quickDiagnose({
        symptoms: ["rough", "blue chips", "smoke"],
      });
      expect(result.top_causes.length).toBeGreaterThan(1);
      // Should include thermal-related causes
      const hasThermal = result.top_causes.some(
        (c) =>
          c.cause.toLowerCase().includes("temperature") ||
          c.cause.toLowerCase().includes("thermal") ||
          c.cause.toLowerCase().includes("coolant")
      );
      expect(hasThermal).toBe(true);
    });

    it("incorporates material context", () => {
      const result = engine.quickDiagnose({
        symptoms: ["dust", "fine chips"],
        material: "cast iron",
      });
      expect(result.top_causes.length).toBeGreaterThan(0);
    });

    it("incorporates operation context", () => {
      const result = engine.quickDiagnose({
        symptoms: ["broke", "broken tool"],
        operation: "slotting",
      });
      expect(result.top_causes.length).toBeGreaterThan(0);
    });

    it("throws on empty symptoms", () => {
      expect(() =>
        engine.quickDiagnose({ symptoms: [] })
      ).toThrow(/at least one symptom/i);
    });

    it("caps probability at 0.99", () => {
      const result = engine.quickDiagnose({
        symptoms: ["glow", "glowing", "red hot", "orange"],
      });
      for (const cause of result.top_causes) {
        expect(cause.probability).toBeLessThanOrEqual(0.99);
      }
    });
  });

  // ── getCommonProblems ───────────────────────────────────────────────
  describe("getCommonProblems", () => {
    it("returns problems for all domains when no filter", () => {
      const result = engine.getCommonProblems({});
      expect(result.problems.length).toBe(10);
      // Should have multiple domains represented
      const domains = new Set(result.problems.map((p) => p.domain));
      expect(domains.size).toBeGreaterThan(1);
    });

    it("filters by domain", () => {
      const result = engine.getCommonProblems({
        domain: "surface_finish",
      });
      expect(result.problems.length).toBeGreaterThan(0);
      for (const p of result.problems) {
        expect(p.domain).toBe("surface_finish");
      }
    });

    it("filters by slotting operation", () => {
      const result = engine.getCommonProblems({
        operation: "slotting",
      });
      expect(result.problems.length).toBeGreaterThan(0);
    });

    it("filters by finishing operation", () => {
      const result = engine.getCommonProblems({
        operation: "finishing",
      });
      expect(result.problems.length).toBeGreaterThan(0);
      const hasSF = result.problems.some(
        (p) => p.domain === "surface_finish"
      );
      expect(hasSF).toBe(true);
    });

    it("each problem has required fields", () => {
      const result = engine.getCommonProblems({});
      for (const p of result.problems) {
        expect(p.domain).toBeTruthy();
        expect(p.problem).toBeTruthy();
        expect(p.frequency_rank).toBeGreaterThan(0);
        expect(p.quick_fix).toBeTruthy();
        expect(p.root_cause).toBeTruthy();
      }
    });
  });

  // ── Session management ──────────────────────────────────────────────
  describe("session management", () => {
    it("session is cleaned up after diagnosis completes", () => {
      const start = engine.startDiagnosis({ domain: "surface_finish" });
      // Walk to a terminal: Rough -> Uniformly rough
      engine.answerQuestion({
        session_id: start.session_id,
        answer: "Rough",
      });
      engine.answerQuestion({
        session_id: start.session_id,
        answer: "Uniformly rough",
      });
      // Session should be removed after diagnosis
      expect(() =>
        engine.answerQuestion({
          session_id: start.session_id,
          answer: "anything",
        })
      ).toThrow(/session not found/i);
    });

    it("multiple concurrent sessions work independently", () => {
      const s1 = engine.startDiagnosis({ domain: "surface_finish" });
      const s2 = engine.startDiagnosis({ domain: "tool_breakage" });

      expect(s1.session_id).not.toBe(s2.session_id);

      const r1 = engine.answerQuestion({
        session_id: s1.session_id,
        answer: "Wavy",
      });
      const r2 = engine.answerQuestion({
        session_id: s2.session_id,
        answer: "Sudden",
      });

      // Both should have navigated independently
      expect(r1.next_question!.domain).toBe("surface_finish");
      expect(r2.next_question!.domain).toBe("tool_breakage");
    });

    it("cleanupSessions removes old sessions", () => {
      // Create a session and manually age it
      const start = engine.startDiagnosis({ domain: "surface_finish" });
      // Access private sessions map via prototype trick
      const sessions = (engine as any).sessions as Map<string, any>;
      const session = sessions.get(start.session_id);
      session.started_at = Date.now() - 31 * 60 * 1000; // 31 min ago

      const cleaned = engine.cleanupSessions();
      expect(cleaned).toBe(1);
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────────
  describe("edge cases", () => {
    it("fix costs are valid enum values", () => {
      // Walk through a diagnosis and check fix cost values
      const start = engine.startDiagnosis({ domain: "surface_finish" });
      engine.answerQuestion({
        session_id: start.session_id,
        answer: "Wavy",
      });
      const result = engine.answerQuestion({
        session_id: start.session_id,
        answer: "Periodic",
      });
      for (const fix of result.diagnosis!.fixes) {
        expect(["free", "low", "medium", "high"]).toContain(fix.cost);
        expect(fix.effectiveness).toBeGreaterThan(0);
        expect(fix.effectiveness).toBeLessThanOrEqual(1);
      }
    });

    it("confidence increases with more answers", () => {
      const start = engine.startDiagnosis({ domain: "surface_finish" });
      const r1 = engine.answerQuestion({
        session_id: start.session_id,
        answer: "Rough",
      });
      const confidence1 = r1.confidence;

      const r2 = engine.answerQuestion({
        session_id: start.session_id,
        answer: "Gets worse",
      });
      expect(r2.confidence).toBeGreaterThan(confidence1);
    });

    it("quickDiagnose returns recommended checks", () => {
      const result = engine.quickDiagnose({
        symptoms: ["taper", "thermal growth"],
      });
      expect(result.recommended_checks.length).toBeGreaterThan(0);
      expect(result.recommended_checks.length).toBeLessThanOrEqual(8);
    });

    it("quickDiagnose with tool_type context", () => {
      const result = engine.quickDiagnose({
        symptoms: ["chipping", "edge damage"],
        tool_type: "carbide end mill",
      });
      expect(result.top_causes.length).toBeGreaterThan(0);
    });
  });
});
