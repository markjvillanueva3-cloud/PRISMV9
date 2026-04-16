/**
 * Tests for AGISafetyContainmentEngine (Phase 0.25.1 U-SAFE1)
 */

import { describe, it, expect } from "vitest";
import {
  AGISafetyContainmentEngine,
  DEFAULT_CONTAINMENT_CONFIG,
  agiSafetyContainmentEngine,
  type SafetyCandidate,
} from "../engines/AGISafetyContainmentEngine.js";

function candidate(overrides: Partial<SafetyCandidate> = {}): SafetyCandidate {
  return {
    id: overrides.id ?? "c1",
    title: overrides.title ?? "test candidate",
    tags: overrides.tags,
    targets: overrides.targets,
    estimatedAssetsTouched: overrides.estimatedAssetsTouched,
    estimatedPsiImpact: overrides.estimatedPsiImpact,
    humanApproved: overrides.humanApproved,
    riskLevel: overrides.riskLevel,
  };
}

describe("AGISafetyContainmentEngine", () => {
  const engine = new AGISafetyContainmentEngine();

  describe("construction / validation", () => {
    it("uses default config", () => {
      expect(DEFAULT_CONTAINMENT_CONFIG.forbiddenTargets.length).toBeGreaterThan(0);
    });

    it("rejects malformed config", () => {
      expect(() =>
        new AGISafetyContainmentEngine({
          ...DEFAULT_CONTAINMENT_CONFIG,
          forbiddenTags: "nope" as unknown as string[],
        })
      ).toThrow(/forbiddenTags/);
      expect(() =>
        new AGISafetyContainmentEngine({
          ...DEFAULT_CONTAINMENT_CONFIG,
          maxAssetsTouched: -1,
        })
      ).toThrow(/maxAssetsTouched/);
      expect(() =>
        new AGISafetyContainmentEngine({
          ...DEFAULT_CONTAINMENT_CONFIG,
          requireApprovalAbove: "extreme" as "critical",
        })
      ).toThrow(/requireApprovalAbove/);
    });

    it("setConfig replaces the live config", () => {
      const e = new AGISafetyContainmentEngine();
      e.setConfig({ ...DEFAULT_CONTAINMENT_CONFIG, maxAssetsTouched: 1 });
      expect(e.evaluate(candidate({ estimatedAssetsTouched: 2 })).allowed).toBe(false);
    });
  });

  describe("candidate validation", () => {
    it("rejects missing id/title", () => {
      expect(() => engine.evaluate(candidate({ id: "" }))).toThrow(/id/);
      expect(() => engine.evaluate(candidate({ title: "" }))).toThrow(/title/);
    });

    it("rejects bad numeric fields", () => {
      expect(() => engine.evaluate(candidate({ estimatedAssetsTouched: -1 }))).toThrow();
      expect(() =>
        engine.evaluate(candidate({ estimatedPsiImpact: Infinity }))
      ).toThrow(/finite/);
    });
  });

  describe("rule evaluation", () => {
    it("blocks on forbidden tag", () => {
      const d = engine.evaluate(candidate({ tags: ["disable-safety"] }));
      expect(d.allowed).toBe(false);
      expect(d.blockedBy).toContain("forbidden-tags");
    });

    it("blocks on forbidden target", () => {
      const d = engine.evaluate(candidate({ targets: ["src/physics/constants.ts"] }));
      expect(d.allowed).toBe(false);
      expect(d.blockedBy).toContain("forbidden-targets");
    });

    it("allows when target only matches by substring but not path-suffix", () => {
      // target = 'docs/notes/constants.ts' should NOT match 'src/physics/constants.ts'
      const d = engine.evaluate(candidate({ targets: ["docs/notes/constants.ts"] }));
      expect(d.allowed).toBe(true);
    });

    it("blocks when assets-touched exceeds cap", () => {
      const d = engine.evaluate(
        candidate({ estimatedAssetsTouched: DEFAULT_CONTAINMENT_CONFIG.maxAssetsTouched + 10 })
      );
      expect(d.blockedBy).toContain("scope-limit");
    });

    it("blocks when |Δψ| exceeds per-step cap", () => {
      const d = engine.evaluate(
        candidate({ estimatedPsiImpact: DEFAULT_CONTAINMENT_CONFIG.maxPsiImpactPerStep + 5 })
      );
      expect(d.blockedBy).toContain("psi-impact");
    });

    it("negative ψ impact counted by magnitude", () => {
      const d = engine.evaluate(
        candidate({ estimatedPsiImpact: -(DEFAULT_CONTAINMENT_CONFIG.maxPsiImpactPerStep + 5) })
      );
      expect(d.blockedBy).toContain("psi-impact");
    });

    it("requires human approval above configured risk threshold", () => {
      const unapproved = engine.evaluate(candidate({ riskLevel: "high" }));
      expect(unapproved.blockedBy).toContain("human-approval");
      const approved = engine.evaluate(candidate({ riskLevel: "high", humanApproved: true }));
      expect(approved.allowed).toBe(true);
    });

    it("allows low-risk unapproved candidates", () => {
      const d = engine.evaluate(candidate({ riskLevel: "low" }));
      expect(d.allowed).toBe(true);
    });

    it("every rule is reported even on a full-pass candidate", () => {
      const d = engine.evaluate(candidate({}));
      expect(d.rules).toHaveLength(5);
      expect(d.rules.every((r) => r.ok)).toBe(true);
    });
  });

  describe("evaluateBatch()", () => {
    it("returns one decision per candidate", () => {
      const results = engine.evaluateBatch([candidate({ id: "a" }), candidate({ id: "b" })]);
      expect(results.map((d) => d.candidateId)).toEqual(["a", "b"]);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      expect(agiSafetyContainmentEngine.evaluate(candidate()).allowed).toBe(true);
    });
  });
});
