/**
 * Tests for AutonomousGoalSynthesisEngine (Phase 0.18 U-AGI1)
 */

import { describe, it, expect } from "vitest";
import {
  AutonomousGoalSynthesisEngine,
  autonomousGoalSynthesisEngine,
  type GapDescriptor,
} from "../engines/AutonomousGoalSynthesisEngine.js";

function gap(overrides: Partial<GapDescriptor> = {}): GapDescriptor {
  return {
    id: overrides.id ?? "g1",
    kind: overrides.kind ?? "orphan-surface",
    title: overrides.title ?? "fix orphan",
    psiImpact: overrides.psiImpact ?? 3,
    urgency: overrides.urgency ?? 0.5,
    feasibility: overrides.feasibility ?? 0.5,
    tags: overrides.tags,
    origin: overrides.origin,
  };
}

describe("AutonomousGoalSynthesisEngine", () => {
  const engine = new AutonomousGoalSynthesisEngine();

  describe("validation", () => {
    it("rejects missing id/title", () => {
      expect(() => engine.propose([gap({ id: "" })])).toThrow(/id/);
      expect(() => engine.propose([gap({ title: "" })])).toThrow(/title/);
    });

    it("rejects out-of-range psiImpact", () => {
      expect(() => engine.propose([gap({ psiImpact: -1 })])).toThrow(/psiImpact/);
      expect(() => engine.propose([gap({ psiImpact: 11 })])).toThrow(/psiImpact/);
    });

    it("rejects out-of-range urgency", () => {
      expect(() => engine.propose([gap({ urgency: -0.1 })])).toThrow(/urgency/);
      expect(() => engine.propose([gap({ urgency: 1.1 })])).toThrow(/urgency/);
    });

    it("rejects out-of-range feasibility", () => {
      expect(() => engine.propose([gap({ feasibility: 1.5 })])).toThrow(/feasibility/);
    });

    it("rejects duplicate ids", () => {
      expect(() => engine.propose([gap({ id: "a" }), gap({ id: "a" })])).toThrow(/duplicate/);
    });
  });

  describe("ranking", () => {
    it("orders by psi × urgency × feasibility descending", () => {
      const top = engine.propose([
        gap({ id: "low", psiImpact: 1, urgency: 0.1, feasibility: 0.1 }),
        gap({ id: "high", psiImpact: 10, urgency: 1, feasibility: 1 }),
      ]);
      expect(top[0].id).toBe("high");
    });

    it("breaks ties by id ascending", () => {
      const top = engine.propose([
        gap({ id: "zulu" }),
        gap({ id: "alpha" }),
      ]);
      expect(top[0].id).toBe("alpha");
    });

    it("respects limit", () => {
      const top = engine.propose([gap({ id: "a" }), gap({ id: "b" }), gap({ id: "c" })], 2);
      expect(top).toHaveLength(2);
    });

    it("limit=0 returns all", () => {
      const top = engine.propose([gap({ id: "a" }), gap({ id: "b" })], 0);
      expect(top).toHaveLength(2);
    });

    it("rationale contains the formula pieces", () => {
      const [g] = engine.propose([gap({ psiImpact: 5, urgency: 0.4, feasibility: 0.6 })]);
      expect(g.rationale).toContain("Ψ=5");
      expect(g.rationale).toContain("urgency=0.4");
      expect(g.rationale).toContain("feasibility=0.6");
    });

    it("copies source through to the goal", () => {
      const g = gap({ id: "s1", origin: "orphan-scan" });
      const [goal] = engine.propose([g]);
      expect(goal.source.origin).toBe("orphan-scan");
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      const [g] = autonomousGoalSynthesisEngine.propose([gap({ id: "s" })]);
      expect(g.id).toBe("s");
    });
  });
});
