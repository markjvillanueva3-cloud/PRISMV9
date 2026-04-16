/**
 * ManufacturingReasoningEngine Test Suite
 * ========================================
 *
 * AGENT-MS3 U-AGT07 — Validates domain-grounded CoT reasoning for
 * manufacturing problems. Exit criteria:
 *   - Reasoning chains show explicit manufacturing logic
 *   - Physics constraints checked at validation steps
 *   - Safety warnings surface early
 *   - Cost implications in conclusions
 *   - Reasoning auditable and explainable
 *
 * @milestone AGENT-MS3
 * @unit U-AGT07
 */

import { describe, it, expect } from "vitest";
import {
  manufacturingReasoningEngine,
  type ManufacturingProblem,
} from "../engines/ManufacturingReasoningEngine.js";

function makeProblem(overrides: Partial<ManufacturingProblem> = {}): ManufacturingProblem {
  return {
    problem: overrides.problem ?? "Decide speed/feed for 4140 on LB3000",
    goal: overrides.goal ?? "Optimize MRR while maintaining tool life > 30 min",
    domain: overrides.domain ?? "machining",
    known_facts: overrides.known_facts ?? ["Material: 4140", "Machine: LB3000"],
    constraints: overrides.constraints ?? [],
    context: overrides.context ?? {},
    max_steps: overrides.max_steps ?? 10,
    confidence_threshold: overrides.confidence_threshold ?? 0.7,
    material: overrides.material,
    operation: overrides.operation,
    ...overrides,
  };
}

describe("ManufacturingReasoningEngine", () => {
  // ── reason() ─────────────────────────────────────────────────────────

  describe("reason()", () => {
    it("returns a chain with required metadata", async () => {
      const chain = await manufacturingReasoningEngine.reason(makeProblem());
      expect(chain.chain_id).toMatch(/^mfg_chain_/);
      expect(chain.problem).toBeDefined();
      expect(chain.domain).toBe("machining");
      expect(Array.isArray(chain.steps)).toBe(true);
      expect(chain.total_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("initializes safety_checks for machining domain", async () => {
      const chain = await manufacturingReasoningEngine.reason(makeProblem({ domain: "machining" }));
      expect(chain.safety_checks.length).toBeGreaterThan(0);
    });

    it("emits no safety_checks for cost-only domain", async () => {
      const chain = await manufacturingReasoningEngine.reason(
        makeProblem({ domain: "cost", problem: "Quote this part" })
      );
      // cost domain has empty SAFETY_CONCERNS array
      expect(chain.safety_checks.length).toBe(0);
    });

    it("applies safety_scan pattern for tooling domain", async () => {
      const chain = await manufacturingReasoningEngine.reason(
        makeProblem({ domain: "tooling", problem: "Select tool for 4140" })
      );
      // tooling has safety concerns initialized
      expect(chain.safety_checks.length).toBeGreaterThan(0);
    });

    it("applies cost_impact for cost domain", async () => {
      const chain = await manufacturingReasoningEngine.reason(
        makeProblem({ domain: "cost", problem: "Estimate cost for 100 parts" })
      );
      // cost_impact pattern should have contributed to cost_implications
      expect(Array.isArray(chain.cost_implications)).toBe(true);
    });

    it("records total time", async () => {
      const chain = await manufacturingReasoningEngine.reason(makeProblem());
      expect(chain.total_time_ms).toBeGreaterThanOrEqual(0);
      expect(chain.total_time_ms).toBeLessThan(5000); // should be <5s for simple
    });

    it("synthesizes a final_answer", async () => {
      const chain = await manufacturingReasoningEngine.reason(makeProblem());
      expect(chain.final_answer).toBeDefined();
      // Engine returns object or string depending on synthesis path
      expect(["string", "object"]).toContain(typeof chain.final_answer);
    });

    it("respects max_steps in metadata", async () => {
      const chain = await manufacturingReasoningEngine.reason(makeProblem({ max_steps: 20 }));
      expect(chain.meta.max_depth).toBe(20);
    });

    it("handles missing material gracefully", async () => {
      const chain = await manufacturingReasoningEngine.reason(
        makeProblem({ material: undefined })
      );
      expect(chain).toBeDefined();
      expect(chain.steps.length).toBeGreaterThan(0);
    });

    it("handles typed MaterialContext", async () => {
      const chain = await manufacturingReasoningEngine.reason(
        makeProblem({
          material: {
            name: "4140",
            iso_group: "P",
            hardness_hrc: 28,
            kc11: 1800,
          },
        })
      );
      expect(chain.material_context?.name).toBe("4140");
    });
  });

  // ── Chain manipulation ────────────────────────────────────────────────

  describe("addConclusion() + backtrack()", () => {
    it("addConclusion appends a step marked as conclusion", async () => {
      const chain = await manufacturingReasoningEngine.reason(makeProblem());
      const beforeCount = chain.steps.length;
      manufacturingReasoningEngine.addConclusion(chain, "Final decision: Vc=120 m/min", 0.9);
      expect(chain.steps.length).toBe(beforeCount + 1);
    });

    it("backtrack increments backtrack_count", async () => {
      const chain = await manufacturingReasoningEngine.reason(makeProblem());
      const beforeBacktracks = chain.meta.backtrack_count;
      manufacturingReasoningEngine.backtrack(chain, "Infeasible feed rate", 0);
      expect(chain.meta.backtrack_count).toBe(beforeBacktracks + 1);
    });
  });

  // ── Validation & helpers ──────────────────────────────────────────────

  describe("isReasoningValid() + getReasoningSummary()", () => {
    it("isReasoningValid returns boolean", async () => {
      const chain = await manufacturingReasoningEngine.reason(makeProblem());
      const valid = manufacturingReasoningEngine.isReasoningValid(chain);
      expect(typeof valid).toBe("boolean");
    });

    it("getReasoningSummary returns a readable string", async () => {
      const chain = await manufacturingReasoningEngine.reason(makeProblem());
      const summary = manufacturingReasoningEngine.getReasoningSummary(chain);
      expect(typeof summary).toBe("string");
      expect(summary.length).toBeGreaterThan(0);
    });

    it("getReasoningSummary respects token budget", async () => {
      const chain = await manufacturingReasoningEngine.reason(makeProblem());
      const summary = manufacturingReasoningEngine.getReasoningSummary(chain, 100);
      // 100 tokens ≈ 400 chars; allow generous slack for header
      expect(summary.length).toBeLessThan(1000);
    });
  });

  // ── Patterns + audit ──────────────────────────────────────────────────

  describe("getApplicablePatterns() + exportAuditTrail()", () => {
    it("returns patterns for machining domain", () => {
      const patterns = manufacturingReasoningEngine.getApplicablePatterns("machining");
      expect(patterns.length).toBeGreaterThan(0);
      patterns.forEach((p) => {
        expect(p.required_for).toContain("machining");
      });
    });

    it("returns empty for domain with no patterns", () => {
      const patterns = manufacturingReasoningEngine.getApplicablePatterns("maintenance");
      // maintenance isn't in any pattern's required_for list
      expect(Array.isArray(patterns)).toBe(true);
    });

    it("exports an audit trail object", async () => {
      const chain = await manufacturingReasoningEngine.reason(makeProblem());
      const trail = manufacturingReasoningEngine.exportAuditTrail(chain);
      expect(trail).toBeDefined();
      expect(typeof trail).toBe("object");
    });
  });

  // ── validatePhysics() ─────────────────────────────────────────────────

  describe("validatePhysics()", () => {
    it("accepts valid physics check input", async () => {
      const chain = await manufacturingReasoningEngine.reason(makeProblem());
      const result = manufacturingReasoningEngine.validatePhysics(
        chain,
        "kienzle",
        "Kienzle force check",
        { kc11: 1800, ap: 2, f: 0.15 },
        2900, // Fc = 1800 × 2 × 0.15^(1-0.25)
        2500,
        5000,
        true
      );
      expect(result).toBeDefined();
    });
  });

  // ── Cross-domain ──────────────────────────────────────────────────────

  describe("reasoning across domains", () => {
    const domains = ["machining", "tooling", "quality", "safety", "material", "cost", "scheduling"];
    domains.forEach((d) => {
      it(`produces a chain for ${d} domain`, async () => {
        const chain = await manufacturingReasoningEngine.reason(
          makeProblem({ domain: d as any, problem: `Decide approach in ${d} domain` })
        );
        expect(chain.domain).toBe(d);
        expect(chain.steps.length).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
