/**
 * Tests for SelfModificationProposalEngine (Phase 0.18 U-AGI10)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  SelfModificationProposalEngine,
  selfModificationProposalEngine,
  type PatternObservation,
} from "../engines/SelfModificationProposalEngine.js";

function obs(overrides: Partial<PatternObservation> = {}): PatternObservation {
  return {
    kind: overrides.kind ?? "extract-abstraction",
    targets: overrides.targets ?? ["src/engines/A.ts"],
    evidence: overrides.evidence ?? "Three engines share this logic",
    confidence: overrides.confidence ?? 0.8,
    estimatedEffortHours: overrides.estimatedEffortHours,
    psiImpactEstimate: overrides.psiImpactEstimate,
  };
}

describe("SelfModificationProposalEngine", () => {
  let e: SelfModificationProposalEngine;

  beforeEach(() => {
    e = new SelfModificationProposalEngine();
  });

  describe("propose() — validation", () => {
    it("rejects empty targets", () => {
      expect(() => e.propose(obs({ targets: [] }))).toThrow(/targets/);
    });

    it("rejects empty evidence", () => {
      expect(() => e.propose(obs({ evidence: "" }))).toThrow(/evidence/);
    });

    it("rejects out-of-range confidence", () => {
      expect(() => e.propose(obs({ confidence: -0.1 }))).toThrow(/confidence/);
      expect(() => e.propose(obs({ confidence: 1.5 }))).toThrow(/confidence/);
    });

    it("rejects non-positive effort", () => {
      expect(() => e.propose(obs({ estimatedEffortHours: 0 }))).toThrow(/estimatedEffortHours/);
      expect(() => e.propose(obs({ estimatedEffortHours: -1 }))).toThrow(/estimatedEffortHours/);
    });

    it("rejects non-finite psiImpact", () => {
      expect(() => e.propose(obs({ psiImpactEstimate: NaN }))).toThrow(/psiImpactEstimate/);
    });
  });

  describe("propose() — output shape", () => {
    it("assigns sequential ids", () => {
      const a = e.propose(obs());
      const b = e.propose(obs());
      expect(a.id).toBe("prop-1");
      expect(b.id).toBe("prop-2");
    });

    it("uses default effort per kind when not supplied", () => {
      const p = e.propose(obs({ kind: "remove-orphan" }));
      expect(p.estimatedEffortHours).toBe(0.5);
      const q = e.propose(obs({ kind: "extract-abstraction" }));
      expect(q.estimatedEffortHours).toBe(4);
    });

    it("respects supplied effort", () => {
      const p = e.propose(obs({ estimatedEffortHours: 10 }));
      expect(p.estimatedEffortHours).toBe(10);
    });

    it("title mentions target count", () => {
      const p = e.propose(obs({ targets: ["a.ts", "b.ts", "c.ts"] }));
      expect(p.title).toContain("+2 more");
    });

    it("summary includes confidence percent", () => {
      const p = e.propose(obs({ confidence: 0.75 }));
      expect(p.summary).toContain("75%");
    });

    it("stamps createdAt", () => {
      const p = e.propose(obs(), "2026-04-16T00:00:00.000Z");
      expect(p.createdAt).toBe("2026-04-16T00:00:00.000Z");
    });
  });

  describe("score", () => {
    it("rewards high psi × confidence per hour", () => {
      const cheap = e.propose(obs({ estimatedEffortHours: 1, psiImpactEstimate: 2, confidence: 0.9 }));
      const expensive = e.propose(obs({ estimatedEffortHours: 10, psiImpactEstimate: 2, confidence: 0.9 }));
      expect(cheap.score).toBeGreaterThan(expensive.score);
    });

    it("zero psiImpact → zero score", () => {
      const p = e.propose(obs({ psiImpactEstimate: 0 }));
      expect(p.score).toBe(0);
    });
  });

  describe("proposeBatch() + rank()", () => {
    it("returns one proposal per observation", () => {
      const proposals = e.proposeBatch([obs({ evidence: "a" }), obs({ evidence: "b" })]);
      expect(proposals).toHaveLength(2);
    });

    it("rank orders by score descending and tie-breaks by id", () => {
      const proposals = [
        e.propose(obs({ psiImpactEstimate: 0 })),
        e.propose(obs({ psiImpactEstimate: 5, estimatedEffortHours: 1 })),
        e.propose(obs({ psiImpactEstimate: 0 })),
      ];
      const ranked = e.rank(proposals);
      expect(ranked[0].score).toBeGreaterThan(0);
      expect(ranked[1].id.localeCompare(ranked[2].id)).toBeLessThan(0);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      const p = selfModificationProposalEngine.propose(obs());
      expect(p.id).toMatch(/^prop-/);
    });
  });
});
