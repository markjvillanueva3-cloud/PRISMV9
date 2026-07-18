/**
 * devDispatcher U-WIRE-SVI-IMPACT round-trip tests — SVIImpactProjectorEngine.
 *
 * Validates the new svi_impact_project action wires correctly through prism_dev
 * and that the engine's heuristic Ψ-delta projection behaves coherently across
 * all 7 asset types + edge cases.
 *
 * Wired slot:papa 2026-05-26 /goal /loop iter1 (wire-unwired campaign).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-SVI-IMPACT
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  SVIImpactProjectorEngine,
  sviImpactProjectorEngine,
  DEFAULT_WEIGHTS,
  type ProposedAsset,
  type ProposedAssetType,
} from "../engines/SVIImpactProjectorEngine.js";

const ALL_TYPES: ProposedAssetType[] = ["engine", "action", "route", "schema", "dispatcher", "skill", "hook"];

describe("U-WIRE-SVI-IMPACT — singleton .project() across all 7 asset types", () => {
  for (const type of ALL_TYPES) {
    it(`projects a Ψ-delta for type=${type}`, () => {
      const r = sviImpactProjectorEngine.project({ type, name: `Test${type}` });
      expect(typeof r.psiDelta).toBe("number");
      expect(Number.isFinite(r.psiDelta)).toBe(true);
      expect(Array.isArray(r.rationale)).toBe(true);
      expect(r.rationale.length).toBeGreaterThan(0);
      expect(["low", "medium", "high"]).toContain(r.risk);
      expect(r.badge).toMatch(/^Ψ /);
    });
  }
});

describe("U-WIRE-SVI-IMPACT — wiring bonus + orphan penalty", () => {
  it("orphan (0 consumers) gets penalty vs wired", () => {
    const orphan = sviImpactProjectorEngine.project({ type: "engine", name: "Orphan" });
    const wired = sviImpactProjectorEngine.project({
      type: "engine", name: "Wired", wiredConsumers: ["prism_dev", "prism_calc"],
    });
    expect(wired.psiDelta).toBeGreaterThan(orphan.psiDelta);
  });

  it("wiring bonus is capped at wiringBonusCap=2.0", () => {
    const tenConsumers = Array.from({ length: 10 }, (_, i) => `consumer_${i}`);
    const r = sviImpactProjectorEngine.project({
      type: "engine", name: "Many", wiredConsumers: tenConsumers,
    });
    // base(engine)=0.4 + cap(2.0) = 2.4 max from these two terms alone
    expect(r.psiDelta).toBeLessThanOrEqual(0.4 + DEFAULT_WEIGHTS.wiringBonusCap + 0.001);
  });
});

describe("U-WIRE-SVI-IMPACT — test coverage bonus", () => {
  it("100% coverage adds testCoverageBonus to delta", () => {
    const noCov = sviImpactProjectorEngine.project({ type: "engine", name: "A", wiredConsumers: ["x"] });
    const fullCov = sviImpactProjectorEngine.project({ type: "engine", name: "A", wiredConsumers: ["x"], testCoverage: 1.0 });
    expect(fullCov.psiDelta).toBeCloseTo(noCov.psiDelta + DEFAULT_WEIGHTS.testCoverageBonus, 2);
  });

  it("rejects out-of-range coverage", () => {
    expect(() => sviImpactProjectorEngine.project({ type: "engine", name: "X", testCoverage: 1.5 }))
      .toThrow(/testCoverage/);
    expect(() => sviImpactProjectorEngine.project({ type: "engine", name: "X", testCoverage: -0.1 }))
      .toThrow(/testCoverage/);
  });
});

describe("U-WIRE-SVI-IMPACT — watched-surface bonus + maintenance neutral", () => {
  it("watched surface adds watchedSurfaceBonus", () => {
    const plain = sviImpactProjectorEngine.project({ type: "engine", name: "P", wiredConsumers: ["x"] });
    const watched = sviImpactProjectorEngine.project({
      type: "engine", name: "P", wiredConsumers: ["x"], touchesWatchedSurface: true,
    });
    expect(watched.psiDelta).toBeCloseTo(plain.psiDelta + DEFAULT_WEIGHTS.watchedSurfaceBonus, 2);
  });

  it("maintenance proposals short-circuit (neutral Ψ by default)", () => {
    const m = sviImpactProjectorEngine.project({ type: "engine", name: "Fix", isMaintenance: true });
    expect(m.psiDelta).toBeCloseTo(0, 2);
    expect(m.rationale.some(r => /maintenance/.test(r))).toBe(true);
  });
});

describe("U-WIRE-SVI-IMPACT — input validation (Karpathy R12 fail-loud)", () => {
  it("rejects missing name", () => {
    expect(() => sviImpactProjectorEngine.project({ type: "engine", name: "" } as ProposedAsset)).toThrow(/name/);
  });

  it("rejects unknown asset type", () => {
    expect(() => sviImpactProjectorEngine.project({ type: "frobnicator" as ProposedAssetType, name: "X" }))
      .toThrow(/Unknown asset type|type/);
  });
});

describe("U-WIRE-SVI-IMPACT — risk classification thresholds", () => {
  it("Δ ≤ -0.5 → high risk", () => {
    const e = new SVIImpactProjectorEngine();
    expect(e.classify(-0.5)).toBe("high");
    expect(e.classify(-1.0)).toBe("high");
  });

  it("Δ in (-0.5, 0.5] → medium risk", () => {
    const e = new SVIImpactProjectorEngine();
    expect(e.classify(0)).toBe("medium");
    expect(e.classify(0.5)).toBe("medium");
  });

  it("Δ > 0.5 → low risk", () => {
    const e = new SVIImpactProjectorEngine();
    expect(e.classify(0.51)).toBe("low");
    expect(e.classify(5)).toBe("low");
  });
});

describe("U-WIRE-SVI-IMPACT — dispatcher wiring assertion (round-trip surface)", () => {
  it("svi_impact_project is registered in the prism_dev action enum", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../tools/dispatchers/devDispatcher.ts"),
      "utf8",
    );
    expect(src).toMatch(/"svi_impact_project"/);
    expect(src).toMatch(/case "svi_impact_project":/);
    expect(src).toMatch(/SVIImpactProjectorEngine/);
  });
});
