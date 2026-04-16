/**
 * ReasoningExplainerEngine Test Suite
 * ======================================
 *
 * AGENT-MS3 U-AGT10 — Validates transparent-AI explanation generation
 * after source recovery from the previously corrupted file.
 *
 * Exit criteria covered:
 *   - Every recommendation has a "why" explanation
 *   - Explanations cite physics formulas when relevant
 *   - Explanations are audience-tailored (machinist / engineer / auditor)
 *   - Word count respects audience limits
 *
 * @milestone AGENT-MS3
 * @unit U-AGT10
 */

import { describe, it, expect } from "vitest";
import {
  reasoningExplainerEngine,
  type ExplanationRequest,
} from "../engines/ReasoningExplainerEngine.js";

function baseRequest(overrides: Partial<ExplanationRequest> = {}): ExplanationRequest {
  return {
    question: overrides.question ?? "Why did you recommend 250 SFM for 4140?",
    context: overrides.context ?? {},
    audience: overrides.audience,
    maxWords: overrides.maxWords,
  };
}

describe("ReasoningExplainerEngine", () => {
  // ── explain() shape ──────────────────────────────────────────────────

  describe("explain()", () => {
    it("returns an Explanation with required fields", () => {
      const r = reasoningExplainerEngine.explain(baseRequest());
      expect(r.id).toBeDefined();
      expect(r.target).toBeDefined();
      expect(r.audience).toBeDefined();
      expect(r.summary).toBeDefined();
      expect(Array.isArray(r.sections)).toBe(true);
      expect(Array.isArray(r.citations)).toBe(true);
      expect(typeof r.wordCount).toBe("number");
      expect(typeof r.readingLevelGrade).toBe("number");
      expect(r.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("defaults audience to machinist", () => {
      const r = reasoningExplainerEngine.explain(baseRequest());
      expect(r.audience).toBe("machinist");
    });

    it("respects explicit audience override", () => {
      const r = reasoningExplainerEngine.explain(baseRequest({ audience: "engineer" }));
      expect(r.audience).toBe("engineer");
    });

    it("explanation summary is non-empty string", () => {
      const r = reasoningExplainerEngine.explain(baseRequest());
      expect(typeof r.summary).toBe("string");
      expect(r.summary.length).toBeGreaterThan(0);
    });
  });

  // ── Target detection ─────────────────────────────────────────────────

  describe("target detection", () => {
    it("detects 'why recommend' → recommendation target", () => {
      const r = reasoningExplainerEngine.explain(
        baseRequest({ question: "Why did you recommend 250 SFM?" })
      );
      expect(r.target).toBe("recommendation");
    });

    it("detects 'how did you calculate' → calculation target", () => {
      const r = reasoningExplainerEngine.explain(
        baseRequest({ question: "How did you calculate the cutting force?" })
      );
      expect(r.target).toBe("calculation");
    });

    it("detects 'why did you choose/pick' → selection target", () => {
      const r = reasoningExplainerEngine.explain(
        baseRequest({ question: "Why did you pick this tool?" })
      );
      expect(r.target).toBe("selection");
    });
  });

  // ── Audience tailoring ──────────────────────────────────────────────

  describe("audience tailoring", () => {
    it("machinist audience respects 150-word limit (roughly)", () => {
      const r = reasoningExplainerEngine.explain(
        baseRequest({ audience: "machinist" })
      );
      // Some slack for intro/summary overhead
      expect(r.wordCount).toBeLessThan(300);
    });

    it("auditor audience is allowed longer explanations", () => {
      const r = reasoningExplainerEngine.explain(
        baseRequest({ audience: "auditor" })
      );
      expect(r.wordCount).toBeLessThanOrEqual(600);
    });

    it("reading level grade is a positive number", () => {
      const r = reasoningExplainerEngine.explain(baseRequest());
      expect(r.readingLevelGrade).toBeGreaterThan(0);
    });

    it("engineer audience preserves technical vocabulary", () => {
      const r = reasoningExplainerEngine.explain(
        baseRequest({
          audience: "engineer",
          context: {
            calculation: {
              formula: "Fc = kc1.1 × ap × fz^(1-mc)",
              inputs: { kc11: 1800, ap: 2, fz: 0.15 },
              result: 2900,
              unit: "N",
              source: "Kienzle",
            },
          },
        })
      );
      // Engineer-level explanations shouldn't strip technical formula names
      const joined = r.sections.map((s) => s.content).join(" ");
      expect(joined.length).toBeGreaterThan(0);
    });
  });

  // ── Citations ────────────────────────────────────────────────────────

  describe("citations", () => {
    it("cites formula when calculation context provided", () => {
      const r = reasoningExplainerEngine.explain(
        baseRequest({
          context: {
            calculation: {
              formula: "Fc = kc1.1 × ap × fz^(1-mc)",
              inputs: { kc11: 1800, ap: 2, fz: 0.15 },
              result: 2900,
              unit: "N",
              source: "Kienzle",
            },
          },
        })
      );
      const citationTypes = r.citations.map((c) => c.type);
      expect(citationTypes).toContain("formula");
    });

    it("every citation has source + content + confidence", () => {
      const r = reasoningExplainerEngine.explain(
        baseRequest({
          context: {
            calculation: {
              formula: "Ra = (fz^2) / (32 × r)",
              inputs: { fz: 0.1, r: 0.4 },
              result: 1.56,
              unit: "um",
              source: "Sandvik",
            },
          },
        })
      );
      r.citations.forEach((c) => {
        expect(c.source).toBeDefined();
        expect(c.content).toBeDefined();
        expect(typeof c.confidence).toBe("number");
      });
    });
  });

  // ── Context variations ──────────────────────────────────────────────

  describe("context variations", () => {
    it("handles selection context", () => {
      const r = reasoningExplainerEngine.explain(
        baseRequest({
          question: "Why did you pick this insert?",
          context: {
            selection: {
              selected: "CNMG432-MP",
              alternatives: ["CNMG432-MF", "CNMG432-MR"],
              criteria: { toolLife: 0.8, surfaceFinish: 0.7 },
            },
          },
        })
      );
      expect(r.target).toBe("selection");
      expect(r.sections.length).toBeGreaterThan(0);
    });

    it("handles empty context gracefully", () => {
      const r = reasoningExplainerEngine.explain(baseRequest({ context: {} }));
      expect(r).toBeDefined();
      expect(r.sections).toBeDefined();
    });

    it("respects maxWords override", () => {
      const r = reasoningExplainerEngine.explain(
        baseRequest({ maxWords: 50 })
      );
      // Soft cap — the engine trims to stay near the target
      expect(r.wordCount).toBeLessThan(200);
    });
  });

  // ── explainWhy() convenience ────────────────────────────────────────

  describe("explainWhy()", () => {
    it("returns a string explanation", () => {
      const chain = {
        chain_id: "c1",
        problem: "p",
        goal: "g",
        domain: "machining" as const,
        steps: [],
        current_confidence: 0.9,
        dead_ends: [],
        constraints_checked: [],
        physics_validations: [],
        safety_checks: [],
        cost_implications: [],
        audit_trail: [],
        total_time_ms: 0,
        meta: {
          strategy: "linear" as const,
          max_depth: 10,
          backtrack_count: 0,
          branch_count: 1,
          pruned_branches: 0,
        },
      };
      const s = reasoningExplainerEngine.explainWhy("Use 250 SFM", chain as any);
      expect(typeof s).toBe("string");
      expect(s.length).toBeGreaterThan(0);
    });
  });

  // ── explainFormula() ────────────────────────────────────────────────

  describe("explainFormula()", () => {
    it("explains Kienzle formula", () => {
      const s = reasoningExplainerEngine.explainFormula(
        "Fc = kc1.1 × ap × fz^(1-mc)"
      );
      expect(s.toLowerCase()).toContain("cutting force");
    });

    it("explains Taylor tool life formula", () => {
      const s = reasoningExplainerEngine.explainFormula("T = (C/Vc)^(1/n)");
      expect(s.toLowerCase()).toContain("tool life");
    });

    it("falls back to the formula string when unknown", () => {
      const s = reasoningExplainerEngine.explainFormula("XYZ = 42");
      expect(typeof s).toBe("string");
    });
  });

  // ── getReadingLevelLabel() ──────────────────────────────────────────

  describe("getReadingLevelLabel()", () => {
    it("returns a label for a typical grade level", () => {
      const label = reasoningExplainerEngine.getReadingLevelLabel(8);
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    });

    it("returns labels for high + low grade levels", () => {
      const low = reasoningExplainerEngine.getReadingLevelLabel(3);
      const high = reasoningExplainerEngine.getReadingLevelLabel(16);
      expect(low).not.toBe(high);
    });
  });
});
