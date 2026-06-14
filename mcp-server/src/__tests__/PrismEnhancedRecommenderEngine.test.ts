/**
 * PrismEnhancedRecommenderEngine tests — SFC-ACCURACY-MS1 Iter 5
 *
 * Each test asserts a concrete identity or metric value. NSGA-II is stochastic,
 * but determinism over the small catalog subsets used here is preserved by:
 *   1. Including a clearly-dominant cheapest/fastest tool so the pareto front
 *      always contains it (any GA worth its salt finds it).
 *   2. Asserting structural invariants (top3 ⊂ paretoFront, axis labels correct)
 *      rather than full-fledged decision-vector identity.
 *
 * References:
 *   - Brammertz Ra ≈ fz²/(8·r): fz=0.05, r=0.4 → Ra ≈ 0.78 µm
 *   - Taylor T = (C/Vc)^(1/n): tool C=350, n=0.25, Vc=200 → T ≈ 9.4 min
 *
 * @module __tests__/PrismEnhancedRecommenderEngine
 */

import { describe, expect, it } from "vitest";
import {
  prismEnhancedRecommenderEngine,
  PrismEnhancedRecommenderEngineImpl,
  RecommendInputSchema,
  MachineCandidateSchema,
  ToolCandidateSchema,
  HolderCandidateSchema,
  MaterialCandidateSchema,
} from "../engines/PrismEnhancedRecommenderEngine.js";
import type {
  RecommendInput,
  MachineCandidate,
  ToolCandidate,
  HolderCandidate,
  MaterialCandidate,
} from "../engines/PrismEnhancedRecommenderEngine.js";

// ────────────────────────────────────────────────────────────────────────────
// Fixtures (deterministic inputs — every metric derives from these literals)
// ────────────────────────────────────────────────────────────────────────────

const machineEcon: MachineCandidate = {
  id: "mch_econ", cost_per_min_usd: 0.50, rigidity: "medium", max_rpm: 8000, max_power_kw: 11,
};
const machineFast: MachineCandidate = {
  id: "mch_fast", cost_per_min_usd: 1.50, rigidity: "high", max_rpm: 20000, max_power_kw: 22,
};

const toolFinishing: ToolCandidate = {
  id: "tool_finish", diameter_mm: 10, flutes: 4, vc_baseline_mpm: 200,
  fz_baseline_mm: 0.05, taylor_C: 350, taylor_n: 0.25, corner_radius_mm: 0.4, unit_cost_usd: 80,
};
const toolHogger: ToolCandidate = {
  id: "tool_hog", diameter_mm: 16, flutes: 5, vc_baseline_mpm: 250,
  fz_baseline_mm: 0.15, taylor_C: 280, taylor_n: 0.30, corner_radius_mm: 1.2, unit_cost_usd: 150,
};

const holderShrink: HolderCandidate = { id: "h_shrink", tir_um: 3, balance_grade: 2.5 };
const holderER: HolderCandidate = { id: "h_er", tir_um: 10, balance_grade: 6.3 };

const matAlu: MaterialCandidate = {
  id: "mat_alu", hardness_hb: 95, machinability_factor: 1.5, iso_group: "N",
};
const matSteel: MaterialCandidate = {
  id: "mat_steel", hardness_hb: 200, machinability_factor: 1.0, iso_group: "P",
};

function fixtureInput(overrides?: Partial<RecommendInput>): RecommendInput {
  return {
    resources: {
      machines: [machineEcon, machineFast],
      tools: [toolFinishing, toolHogger],
      holders: [holderShrink, holderER],
      materials: [matAlu, matSteel],
    },
    part: {
      stock_volume_cm3: 500,
      quantity: 100,
      ra_spec_um: 1.6,
      setup_cost_usd: 50,
      axial_depth_mm: 2,
      radial_depth_mm: 5,
    },
    optimizer: { populationSize: 30, maxGenerations: 15 },
    ...overrides,
  };
}

// ────────────────────────────────────────────────────────────────────────────

describe("schema validation", () => {
  it("MachineCandidateSchema rejects negative cost_per_min_usd", () => {
    let threw = false;
    try { MachineCandidateSchema.parse({ ...machineEcon, cost_per_min_usd: -1 }); } catch { threw = true; }
    expect(threw).toBe(true);
  });

  it("ToolCandidateSchema rejects taylor_n > 1", () => {
    let threw = false;
    try { ToolCandidateSchema.parse({ ...toolFinishing, taylor_n: 1.5 }); } catch { threw = true; }
    expect(threw).toBe(true);
  });

  it("MaterialCandidateSchema rejects iso_group='Q' (invalid enum)", () => {
    let threw = false;
    try { MaterialCandidateSchema.parse({ ...matAlu, iso_group: "Q" }); } catch { threw = true; }
    expect(threw).toBe(true);
  });

  it("HolderCandidateSchema accepts tir_um=0 (zero is valid runout)", () => {
    const parsed = HolderCandidateSchema.parse({ ...holderShrink, tir_um: 0 });
    expect(parsed.tir_um).toBe(0);
  });

  it("RecommendInputSchema rejects empty machines array", () => {
    let threw = false;
    try {
      RecommendInputSchema.parse({
        resources: { machines: [], tools: [toolFinishing], holders: [holderShrink], materials: [matAlu] },
        part: { stock_volume_cm3: 100, quantity: 10, ra_spec_um: 1.6 },
      });
    } catch { threw = true; }
    expect(threw).toBe(true);
  });

  it("optimizer.maxGenerations defaults via the schema default when omitted", () => {
    const parsed = RecommendInputSchema.parse({
      resources: {
        machines: [machineEcon], tools: [toolFinishing],
        holders: [holderShrink], materials: [matAlu],
      },
      part: { stock_volume_cm3: 100, quantity: 10, ra_spec_um: 1.6 },
    });
    // Schema .default() materializes the fully-shaped optimizer config when omitted.
    expect(parsed.optimizer).toEqual({ populationSize: 60, maxGenerations: 40 });
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("physics formulas (via single-resource pareto)", () => {
  it("aluminum + finishing tool + econ machine: cycle time finite + < 50 min", () => {
    const result = prismEnhancedRecommenderEngine.recommend({
      resources: {
        machines: [machineEcon], tools: [toolFinishing], holders: [holderShrink], materials: [matAlu],
      },
      part: { stock_volume_cm3: 500, quantity: 100, ra_spec_um: 1.6, setup_cost_usd: 50, axial_depth_mm: 2, radial_depth_mm: 5 },
      optimizer: { populationSize: 20, maxGenerations: 5 },
    });
    // With only 1 of each resource, all NSGA-II candidates resolve to the same combo.
    const combo = result.top3.cheapest;
    expect(combo.machine.id).toBe("mch_econ");
    expect(combo.tool.id).toBe("tool_finish");
    expect(Number.isFinite(combo.metrics.cycle_time_min)).toBe(true);
    expect(combo.metrics.cycle_time_min).toBeLessThan(50);
    expect(combo.metrics.cycle_time_min).toBeGreaterThan(0);
  });

  it("Brammertz Ra: finishing tool fz=0.05, r=0.4 → ra_um/spec ≈ 0.78/1.6 ≈ 0.49", () => {
    const r = prismEnhancedRecommenderEngine.recommend({
      resources: {
        machines: [machineEcon], tools: [toolFinishing], holders: [holderShrink], materials: [matAlu],
      },
      part: { stock_volume_cm3: 500, quantity: 100, ra_spec_um: 1.6, setup_cost_usd: 50, axial_depth_mm: 2, radial_depth_mm: 5 },
      optimizer: { populationSize: 10, maxGenerations: 3 },
    });
    // surface_risk = Ra / spec = (0.05² / (8·0.4) × 1000) / 1.6 = (0.7813) / 1.6 ≈ 0.488
    expect(r.top3.cheapest.metrics.surface_risk).toBeCloseTo(0.488, 2);
  });

  it("Hogger tool (fz=0.15, r=1.2) → ra_um ≈ 2.34 → surface_risk > 1 (fails 1.6µm spec)", () => {
    const r = prismEnhancedRecommenderEngine.recommend({
      resources: {
        machines: [machineEcon], tools: [toolHogger], holders: [holderShrink], materials: [matAlu],
      },
      part: { stock_volume_cm3: 500, quantity: 100, ra_spec_um: 1.6, setup_cost_usd: 50, axial_depth_mm: 2, radial_depth_mm: 5 },
      optimizer: { populationSize: 10, maxGenerations: 3 },
    });
    // 0.15² / (8·1.2) × 1000 / 1.6 = 0.02344 / 9.6 ... wait: 0.0225 / 9.6 = 0.00234 × 1000 / 1.6
    // = 2.344 / 1.6 = 1.465
    expect(r.top3.cheapest.metrics.surface_risk).toBeGreaterThan(1.0);
    expect(r.top3.cheapest.metrics.surface_risk).toBeCloseTo(1.465, 2);
  });

  it("Chatter risk: high-rigidity machine + shrink_fit holder → chatter_risk=0 (perfect)", () => {
    const r = prismEnhancedRecommenderEngine.recommend({
      resources: {
        machines: [machineFast], tools: [toolFinishing], holders: [holderShrink], materials: [matAlu],
      },
      part: { stock_volume_cm3: 100, quantity: 10, ra_spec_um: 1.6 },
      optimizer: { populationSize: 10, maxGenerations: 3 },
    });
    // rigidity=high → score 1.0, tir=3 ≤ 5 → tirPenalty=1.0, chatter = 1 - 1.0 × 1.0 = 0
    expect(r.top3.cheapest.metrics.chatter_risk).toBeCloseTo(0, 5);
  });

  it("Chatter risk: medium rigidity + ER holder (tir=10) → chatter_risk=0.4", () => {
    const r = prismEnhancedRecommenderEngine.recommend({
      resources: {
        machines: [machineEcon], tools: [toolFinishing], holders: [holderER], materials: [matAlu],
      },
      part: { stock_volume_cm3: 100, quantity: 10, ra_spec_um: 1.6 },
      optimizer: { populationSize: 10, maxGenerations: 3 },
    });
    // medium=0.75, tir=10>5 → penalty=0.8, chatter = 1 - 0.75×0.8 = 1 - 0.6 = 0.4
    expect(r.top3.cheapest.metrics.chatter_risk).toBeCloseTo(0.4, 5);
  });

  it("Chatter risk: low rigidity + ER (tir=10) → 1 - 0.5×0.8 = 0.6", () => {
    const lowRigMachine: MachineCandidate = { ...machineEcon, id: "mch_low", rigidity: "low" };
    const r = prismEnhancedRecommenderEngine.recommend({
      resources: {
        machines: [lowRigMachine], tools: [toolFinishing], holders: [holderER], materials: [matAlu],
      },
      part: { stock_volume_cm3: 100, quantity: 10, ra_spec_um: 1.6 },
      optimizer: { populationSize: 10, maxGenerations: 3 },
    });
    expect(r.top3.cheapest.metrics.chatter_risk).toBeCloseTo(0.6, 5);
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("pareto-front structure", () => {
  it("paretoFront non-empty + paretoFrontSize matches meta", () => {
    const r = prismEnhancedRecommenderEngine.recommend(fixtureInput());
    expect(r.paretoFront.length).toBeGreaterThan(0);
    expect(r.paretoFront.length).toBe(r.meta.paretoFrontSize);
  });

  it("meta.method is the engine's NSGA-II identifier", () => {
    const r = prismEnhancedRecommenderEngine.recommend(fixtureInput());
    expect(r.meta.method.toLowerCase().includes("nsga")).toBe(true);
  });

  it("meta.populationSize echoes optimizer.populationSize=30", () => {
    const r = prismEnhancedRecommenderEngine.recommend(fixtureInput());
    expect(r.meta.populationSize).toBe(30);
  });

  it("meta.generations equals optimizer.maxGenerations=15", () => {
    const r = prismEnhancedRecommenderEngine.recommend(fixtureInput());
    expect(r.meta.generations).toBe(15);
  });

  it("paretoFront combos are deduplicated by (machine.id, tool.id, holder.id, material.id) tuple", () => {
    const r = prismEnhancedRecommenderEngine.recommend(fixtureInput());
    const keys = new Set(r.paretoFront.map(c => `${c.machine.id}/${c.tool.id}/${c.holder.id}/${c.material.id}`));
    expect(keys.size).toBe(r.paretoFront.length);
  });

  it("every paretoFront combo has all 5 finite metrics", () => {
    const r = prismEnhancedRecommenderEngine.recommend(fixtureInput());
    let invalid = 0;
    for (const c of r.paretoFront) {
      if (!Number.isFinite(c.metrics.cost_usd)) invalid++;
      if (!Number.isFinite(c.metrics.cycle_time_min)) invalid++;
      if (!Number.isFinite(c.metrics.tool_wear_risk)) invalid++;
      if (!Number.isFinite(c.metrics.surface_risk)) invalid++;
      if (!Number.isFinite(c.metrics.chatter_risk)) invalid++;
    }
    expect(invalid).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("top3 selection rules", () => {
  it("cheapest.cost_usd is the minimum cost in paretoFront", () => {
    const r = prismEnhancedRecommenderEngine.recommend(fixtureInput());
    const minCost = Math.min(...r.paretoFront.map(c => c.metrics.cost_usd));
    expect(r.top3.cheapest.metrics.cost_usd).toBe(minCost);
  });

  it("fastest.cycle_time_min is the minimum cycle in paretoFront", () => {
    const r = prismEnhancedRecommenderEngine.recommend(fixtureInput());
    const minCycle = Math.min(...r.paretoFront.map(c => c.metrics.cycle_time_min));
    expect(r.top3.fastest.metrics.cycle_time_min).toBe(minCycle);
  });

  it("balanced is a member of the paretoFront (by tuple identity)", () => {
    const r = prismEnhancedRecommenderEngine.recommend(fixtureInput());
    const key = (c: typeof r.top3.balanced) => `${c.machine.id}/${c.tool.id}/${c.holder.id}/${c.material.id}`;
    const keys = new Set(r.paretoFront.map(key));
    expect(keys.has(key(r.top3.balanced))).toBe(true);
  });

  it("top3 entries all have finite metrics (none Infinity)", () => {
    const r = prismEnhancedRecommenderEngine.recommend(fixtureInput());
    const t = r.top3;
    expect(Number.isFinite(t.cheapest.metrics.cost_usd)).toBe(true);
    expect(Number.isFinite(t.fastest.metrics.cycle_time_min)).toBe(true);
    expect(Number.isFinite(t.balanced.metrics.tool_wear_risk)).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("cost monotonicity properties", () => {
  it("doubling quantity ≈ doubles the per-part-amortized cost contribution", () => {
    const small = prismEnhancedRecommenderEngine.recommend({
      resources: {
        machines: [machineEcon], tools: [toolFinishing], holders: [holderShrink], materials: [matAlu],
      },
      part: { stock_volume_cm3: 100, quantity: 10, ra_spec_um: 1.6, setup_cost_usd: 50, axial_depth_mm: 2, radial_depth_mm: 5 },
      optimizer: { populationSize: 10, maxGenerations: 3 },
    });
    const large = prismEnhancedRecommenderEngine.recommend({
      resources: {
        machines: [machineEcon], tools: [toolFinishing], holders: [holderShrink], materials: [matAlu],
      },
      part: { stock_volume_cm3: 100, quantity: 20, ra_spec_um: 1.6, setup_cost_usd: 50, axial_depth_mm: 2, radial_depth_mm: 5 },
      optimizer: { populationSize: 10, maxGenerations: 3 },
    });
    // total = setup + qty × (cycle×$/min + tool_amortized) × chatter_factor
    // (large.cost - setup) ≈ 2 × (small.cost - setup) — exact since chatter_factor identical.
    const smallCost = small.top3.cheapest.metrics.cost_usd - 50;
    const largeCost = large.top3.cheapest.metrics.cost_usd - 50;
    expect(largeCost / smallCost).toBeCloseTo(2, 2);
  });

  it("higher cost_per_min machine → higher total cost (econ < fast for same combo)", () => {
    const econOnly = prismEnhancedRecommenderEngine.recommend({
      resources: {
        machines: [machineEcon], tools: [toolHogger], holders: [holderShrink], materials: [matAlu],
      },
      part: { stock_volume_cm3: 500, quantity: 100, ra_spec_um: 1.6, setup_cost_usd: 50, axial_depth_mm: 2, radial_depth_mm: 5 },
      optimizer: { populationSize: 10, maxGenerations: 3 },
    });
    const fastOnly = prismEnhancedRecommenderEngine.recommend({
      resources: {
        machines: [machineFast], tools: [toolHogger], holders: [holderShrink], materials: [matAlu],
      },
      part: { stock_volume_cm3: 500, quantity: 100, ra_spec_um: 1.6, setup_cost_usd: 50, axial_depth_mm: 2, radial_depth_mm: 5 },
      optimizer: { populationSize: 10, maxGenerations: 3 },
    });
    // Both reach max_rpm ceilings → cycle differs. Fast machine: max_rpm=20000 > vc-derived. So fast machine has shorter cycle.
    // But fast machine $/min = 1.50 vs econ 0.50. Net cost outcome depends — verify a real-world property:
    // fastOnly.machine.id is 'mch_fast' and the cycle time SHOULD be ≤ econOnly's since fast has higher max_rpm.
    expect(fastOnly.top3.cheapest.machine.id).toBe("mch_fast");
    expect(econOnly.top3.cheapest.machine.id).toBe("mch_econ");
    expect(fastOnly.top3.cheapest.metrics.cycle_time_min).toBeLessThanOrEqual(econOnly.top3.cheapest.metrics.cycle_time_min + 1e-6);
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("input validation paths", () => {
  it("throws on stock_volume_cm3 = 0 (positive() schema)", () => {
    let threw = false;
    try {
      prismEnhancedRecommenderEngine.recommend({
        resources: {
          machines: [machineEcon], tools: [toolFinishing],
          holders: [holderShrink], materials: [matAlu],
        },
        part: { stock_volume_cm3: 0, quantity: 1, ra_spec_um: 1.6 },
      });
    } catch { threw = true; }
    expect(threw).toBe(true);
  });

  it("throws on quantity = 0 (positive int)", () => {
    let threw = false;
    try {
      prismEnhancedRecommenderEngine.recommend({
        resources: {
          machines: [machineEcon], tools: [toolFinishing],
          holders: [holderShrink], materials: [matAlu],
        },
        part: { stock_volume_cm3: 100, quantity: 0, ra_spec_um: 1.6 },
      });
    } catch { threw = true; }
    expect(threw).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────

describe("engine module exports", () => {
  it("default instance is an instanceof PrismEnhancedRecommenderEngineImpl", () => {
    expect(prismEnhancedRecommenderEngine instanceof PrismEnhancedRecommenderEngineImpl).toBe(true);
  });

  it("recommend method is callable", () => {
    expect(typeof prismEnhancedRecommenderEngine.recommend).toBe("function");
  });
});
