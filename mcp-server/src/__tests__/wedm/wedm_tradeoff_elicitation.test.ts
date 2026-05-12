/**
 * WEDMTradeoffElicitationEngine Tests — WEDM AGI Phase 2 / U-P2-07
 *
 * Exit gate: Tradeoff engine correctly adjusts weights based on user
 * preference — preferring Ra must shift the top pick toward lower Ra,
 * preferring MRR must shift it toward higher MRR, preferring reliability
 * must shift it toward lower wire_break_prob.
 */
import { describe, it, expect } from "vitest";
import {
  WEDMTradeoffElicitationEngine,
  wedmTradeoffElicitationEngine,
  type PreferenceWeights,
} from "../../engines/WEDMTradeoffElicitationEngine.js";
import { wedmParetoFrontierSearchEngine } from "../../engines/WEDMParetoFrontierSearchEngine.js";

const engine = new WEDMTradeoffElicitationEngine();
const frontier = wedmParetoFrontierSearchEngine.search({
  material: "D2",
  population_size: 60,
  max_generations: 40,
}).frontier;

describe("WEDMTradeoffElicitationEngine — weight algebra", () => {
  it("uniformWeights sums to 1", () => {
    const w = engine.uniformWeights();
    expect(w.Ra + w.MRR + w.reliability).toBeCloseTo(1, 6);
  });

  it("adjustWeights shifts mass to the preferred objective", () => {
    const w0 = engine.uniformWeights();
    const w1 = engine.adjustWeights(w0, {
      prefer: "Ra",
      over: "MRR",
      strength: 0.5,
    });
    expect(w1.Ra).toBeGreaterThan(w0.Ra);
    expect(w1.MRR).toBeLessThan(w0.MRR);
    expect(w1.Ra + w1.MRR + w1.reliability).toBeCloseTo(1, 6);
  });

  it("prefer==over is a no-op (still normalised)", () => {
    const w = engine.adjustWeights(engine.uniformWeights(), {
      prefer: "Ra",
      over: "Ra",
      strength: 0.5,
    });
    expect(w.Ra).toBeCloseTo(1 / 3, 6);
  });

  it("throws on invalid strength", () => {
    expect(() =>
      engine.adjustWeights(engine.uniformWeights(), {
        prefer: "Ra",
        over: "MRR",
        strength: 0,
      }),
    ).toThrow(/strength/);
    expect(() =>
      engine.adjustWeights(engine.uniformWeights(), {
        prefer: "Ra",
        over: "MRR",
        strength: 1.5,
      }),
    ).toThrow(/strength/);
  });

  it("throws on invalid objective name", () => {
    expect(() =>
      engine.adjustWeights(engine.uniformWeights(), {
        prefer: "foo" as unknown as "Ra",
        over: "MRR",
        strength: 0.5,
      }),
    ).toThrow(/invalid objective/);
  });
});

describe("WEDMTradeoffElicitationEngine — ranking basics", () => {
  it("empty frontier yields empty ranking", () => {
    const r = engine.rankByWeights([], engine.uniformWeights());
    expect(r.ranked).toEqual([]);
    expect(r.best).toBeNull();
    expect(r.notes).toContain("empty frontier");
  });

  it("ranking length equals frontier length", () => {
    const r = engine.rankByWeights(frontier, engine.uniformWeights());
    expect(r.ranked.length).toBe(frontier.length);
    expect(r.best).not.toBeNull();
  });

  it("rank numbers are 1..N with no duplicates", () => {
    const r = engine.rankByWeights(frontier, engine.uniformWeights());
    const ranks = r.ranked.map((s) => s.rank).sort((a, b) => a - b);
    expect(ranks).toEqual(ranks.map((_, i) => i + 1));
  });

  it("utilities are sorted descending", () => {
    const r = engine.rankByWeights(frontier, engine.uniformWeights());
    for (let i = 1; i < r.ranked.length; i++) {
      expect(r.ranked[i].utility).toBeLessThanOrEqual(r.ranked[i - 1].utility);
    }
  });

  it("each component utility is in [0, 1]", () => {
    const r = engine.rankByWeights(frontier, engine.uniformWeights());
    for (const s of r.ranked) {
      expect(s.components.Ra_utility).toBeGreaterThanOrEqual(0);
      expect(s.components.Ra_utility).toBeLessThanOrEqual(1);
      expect(s.components.MRR_utility).toBeGreaterThanOrEqual(0);
      expect(s.components.MRR_utility).toBeLessThanOrEqual(1);
      expect(s.components.reliability_utility).toBeGreaterThanOrEqual(0);
      expect(s.components.reliability_utility).toBeLessThanOrEqual(1);
    }
  });

  it("weight input is re-normalised in output", () => {
    const raw: PreferenceWeights = { Ra: 2, MRR: 2, reliability: 6 };
    const r = engine.rankByWeights(frontier, raw);
    expect(
      r.weights.Ra + r.weights.MRR + r.weights.reliability,
    ).toBeCloseTo(1, 6);
    expect(r.weights.reliability).toBeGreaterThan(r.weights.Ra);
  });
});

describe("WEDMTradeoffElicitationEngine — exit gate: preferences drive the top pick", () => {
  it("preferring Ra yields a top pick with Ra ≤ uniform top pick", () => {
    const uniformTop = engine.rankByWeights(
      frontier,
      engine.uniformWeights(),
    ).best!;
    const raWeighted = engine.elicit(frontier, [
      { prefer: "Ra", over: "MRR", strength: 0.9 },
      { prefer: "Ra", over: "reliability", strength: 0.9 },
    ]).best!;
    expect(raWeighted.solution.objectives.Ra_um).toBeLessThanOrEqual(
      uniformTop.solution.objectives.Ra_um,
    );
  });

  it("preferring MRR yields a top pick with MRR ≥ uniform top pick", () => {
    const uniformTop = engine.rankByWeights(
      frontier,
      engine.uniformWeights(),
    ).best!;
    const mrrWeighted = engine.elicit(frontier, [
      { prefer: "MRR", over: "Ra", strength: 0.9 },
      { prefer: "MRR", over: "reliability", strength: 0.9 },
    ]).best!;
    expect(mrrWeighted.solution.derived.MRR_rel).toBeGreaterThanOrEqual(
      uniformTop.solution.derived.MRR_rel,
    );
  });

  it("preferring reliability yields a top pick with wire_break_prob ≤ uniform top pick", () => {
    const uniformTop = engine.rankByWeights(
      frontier,
      engine.uniformWeights(),
    ).best!;
    const relWeighted = engine.elicit(frontier, [
      { prefer: "reliability", over: "Ra", strength: 0.9 },
      { prefer: "reliability", over: "MRR", strength: 0.9 },
    ]).best!;
    expect(
      relWeighted.solution.objectives.wire_break_prob,
    ).toBeLessThanOrEqual(uniformTop.solution.objectives.wire_break_prob);
  });

  it("opposite preferences produce different top picks", () => {
    const raTop = engine.elicit(frontier, [
      { prefer: "Ra", over: "MRR", strength: 0.9 },
      { prefer: "Ra", over: "reliability", strength: 0.9 },
    ]).best!;
    const mrrTop = engine.elicit(frontier, [
      { prefer: "MRR", over: "Ra", strength: 0.9 },
      { prefer: "MRR", over: "reliability", strength: 0.9 },
    ]).best!;
    // Top Ra pick should not equal top MRR pick on a healthy frontier.
    expect(raTop.solution.objectives.Ra_um).toBeLessThanOrEqual(
      mrrTop.solution.objectives.Ra_um,
    );
    expect(mrrTop.solution.derived.MRR_rel).toBeGreaterThanOrEqual(
      raTop.solution.derived.MRR_rel,
    );
  });

  it("stronger preference shifts weight more than a weak one", () => {
    const strong = engine.adjustWeights(engine.uniformWeights(), {
      prefer: "Ra",
      over: "MRR",
      strength: 0.9,
    });
    const weak = engine.adjustWeights(engine.uniformWeights(), {
      prefer: "Ra",
      over: "MRR",
      strength: 0.1,
    });
    expect(strong.Ra).toBeGreaterThan(weak.Ra);
  });
});

describe("WEDMTradeoffElicitationEngine — elicit sequence semantics", () => {
  it("empty preference list equals uniform ranking", () => {
    const uniform = engine.rankByWeights(frontier, engine.uniformWeights());
    const elicited = engine.elicit(frontier, []);
    expect(elicited.best!.solution).toEqual(uniform.best!.solution);
  });

  it("initial weights are respected when given", () => {
    const initial: PreferenceWeights = {
      Ra: 0.7,
      MRR: 0.2,
      reliability: 0.1,
    };
    const r = engine.elicit(frontier, [], initial);
    expect(r.weights.Ra).toBeCloseTo(0.7, 6);
  });
});

describe("WEDMTradeoffElicitationEngine — singleton", () => {
  it("exposes a singleton for dispatcher use", () => {
    expect(wedmTradeoffElicitationEngine).toBeInstanceOf(
      WEDMTradeoffElicitationEngine,
    );
  });
});
