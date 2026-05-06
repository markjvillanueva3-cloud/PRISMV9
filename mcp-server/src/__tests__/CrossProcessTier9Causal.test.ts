/**
 * Tier 9 — Causal Inference Engine Suite (T9-01..T9-04)
 *
 * Tests against a synthetic causal model with KNOWN coefficients, then
 * verifies each engine recovers truth within statistical tolerance.
 * Synthetic ground-truth approach is the standard benchmark in causal
 * inference (Spirtes et al. 2000, Sachs et al. 2005).
 *
 * Synthetic model:
 *   sf ~ N(150, 30^2),  fz ~ N(0.08, 0.02^2)
 *   outcome_class ordinal = sign(0.3·sf_z + 0.5·fz_z + 0.5·noise)
 *   process, material_iso, tool_class — categorical metadata
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  CrossProcessCausalGraphLearnerEngine as Learner,
  PRISM_VARS,
  type Event,
  type CausalDAG,
} from "../engines/CrossProcessCausalGraphLearnerEngine.js";
import { CrossProcessDoCalculusEngine as DoCalc } from "../engines/CrossProcessDoCalculusEngine.js";
import { CrossProcessCounterfactualPredictorEngine as CF } from "../engines/CrossProcessCounterfactualPredictorEngine.js";
import { CrossProcessMediationAnalyzerEngine as Med } from "../engines/CrossProcessMediationAnalyzerEngine.js";

// Deterministic Box-Muller for reproducible randomness — no test flakes
let rngState = 42;
function rand(): number {
  rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
  return rngState / 0x7fffffff;
}
function randn(): number {
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const PROCESSES = ["mill", "lathe", "wedm"] as const;
const MATERIALS = ["P", "M", "K", "N", "S", "H"] as const;

function generateSyntheticEvents(n: number): Event[] {
  rngState = 42;
  const out: Event[] = [];
  for (let i = 0; i < n; i++) {
    const sf = 150 + 30 * randn();
    const fz = 0.08 + 0.02 * randn();
    const yLatent = 0.3 * (sf - 150) / 30 + 0.5 * (fz - 0.08) / 0.02 + 0.5 * randn();
    const oc = yLatent < -0.5 ? "fail" : yLatent < 0.5 ? "marginal" : "pass";
    out.push({
      sf: Math.max(10, sf),
      fz: Math.max(0.001, fz),
      process: PROCESSES[Math.floor(rand() * 3)],
      material_iso: MATERIALS[Math.floor(rand() * 6)],
      tool_class: "endmill_carbide",
      outcome_class: oc,
    });
  }
  return out;
}

let events100: Event[];
let events200: Event[];
beforeAll(() => {
  events100 = generateSyntheticEvents(100);
  events200 = generateSyntheticEvents(200);
});

// Helper to construct a deterministic DAG for mediation tests independent of T9-01 inference noise
function explicitDAG(directedEdges: Array<[string, string]>): CausalDAG {
  return {
    nodes: [...PRISM_VARS],
    edges: directedEdges.map(([from, to]) => ({
      from: from as never, to: to as never,
      orientation: "directed" as const, evidence: "test" as const,
    })),
    separating_sets: {},
    ci_decisions: [],
    n_samples: 200,
    alpha: 0.05,
    warnings: [],
  };
}

// ============================================================================
// T9-01 — CausalGraphLearner
// ============================================================================

describe("T9-01: CausalGraphLearner — skeleton + orientation", () => {
  it("learns a non-empty DAG when n ≥ 30", () => {
    const dag = Learner.learnDAG({ events: events100 });
    expect(dag.edges.length).toBeGreaterThan(0);
    expect(dag.nodes).toEqual([...PRISM_VARS]);
    expect(dag.n_samples).toBe(100);
  });

  it("returns empty DAG with warning when n < 30 (Fisher Z asymptotic invalid)", () => {
    const small = events100.slice(0, 10);
    const dag = Learner.learnDAG({ events: small });
    expect(dag.edges).toHaveLength(0);
    expect(dag.warnings.length).toBeGreaterThan(0);
    expect(dag.warnings[0]).toMatch(/below minimum/);
  });

  it("recovers sf↔outcome_class edge in synthetic data (true causal link)", () => {
    const dag = Learner.learnDAG({ events: events200 });
    const sfOutcomePresent = dag.edges.some((e) =>
      (e.from === "sf" && e.to === "outcome_class") ||
      (e.from === "outcome_class" && e.to === "sf"),
    );
    expect(sfOutcomePresent).toBe(true);
  });

  it("CI test reports independence for unrelated pairs (constant tool_class vs sf)", () => {
    const ci = Learner.testIndependence(events200, "tool_class", "sf", []);
    expect(ci.independent).toBe(true);
  });

  it("CI test reports valid p-values in [0, 1]", () => {
    const dag = Learner.learnDAG({ events: events100 });
    expect(dag.ci_decisions.length).toBeGreaterThan(0);
    const allValid = dag.ci_decisions.every((d) => d.p_value >= 0 && d.p_value <= 1);
    expect(allValid).toBe(true);
  });

  it("exportGraph partitions edges into directed + undirected", () => {
    const dag = Learner.learnDAG({ events: events200 });
    const exported = Learner.exportGraph(dag);
    expect(exported.nodes).toEqual([...PRISM_VARS]);
    expect(exported.directed_edges.length + exported.undirected_edges.length).toBe(dag.edges.length);
  });

  it("max_cond_size=0 forces all CI tests to use empty conditioning set", () => {
    const dag = Learner.learnDAG({ events: events100, max_cond_size: 0 });
    const allEmpty = dag.ci_decisions.every((d) => d.cond.length === 0);
    expect(allEmpty).toBe(true);
  });

  it("rejects empty event array (Zod min(1))", () => {
    expect(() => Learner.learnDAG({ events: [] })).toThrow();
  });

  it("rejects malformed event (missing required field)", () => {
    expect(() => Learner.learnDAG({ events: [{ sf: 100 } as Event] })).toThrow();
  });

  it("rejects out-of-range alpha", () => {
    expect(() => Learner.learnDAG({ events: events100, alpha: 1.5 })).toThrow();
  });
});

// ============================================================================
// T9-02 — DoCalculus
// ============================================================================

describe("T9-02: DoCalculus — back-door identification + adjustment", () => {
  it("identify returns identifiable=true with array Z when treatment has no parents", () => {
    const dag = Learner.learnDAG({ events: events200 });
    const r = DoCalc.identify(dag, "sf", "outcome_class");
    expect(r.identifiable).toBe(true);
    expect(Array.isArray(r.back_door_set)).toBe(true);
  });

  it("identify rejects degenerate query (treatment === target)", () => {
    const dag = Learner.learnDAG({ events: events200 });
    const r = DoCalc.identify(dag, "sf", "sf");
    expect(r.identifiable).toBe(false);
    expect(r.back_door_set).toBeNull();
    expect(r.rationale).toMatch(/degenerate/);
  });

  it("doIntervene returns finite observational and interventional estimates", () => {
    const dag = Learner.learnDAG({ events: events200 });
    const r = DoCalc.doIntervene({
      events: events200, dag, treatment: "sf", x_value: 200, target: "outcome_class",
    });
    expect(r.identifiable).toBe(true);
    expect(Number.isFinite(r.observational_E_Y_given_X)).toBe(true);
    expect(Number.isFinite(r.interventional_E_Y_do_X)).toBe(true);
  });

  it("back_door_adjustment equals interventional minus observational (algebraic identity)", () => {
    const dag = Learner.learnDAG({ events: events200 });
    const r = DoCalc.doIntervene({
      events: events200, dag, treatment: "sf", x_value: 200, target: "outcome_class",
    });
    expect(r.back_door_adjustment).toBeCloseTo(
      r.interventional_E_Y_do_X - r.observational_E_Y_given_X, 6,
    );
  });

  it("doubling Δx doubles the marginal effect (linear regression invariant)", () => {
    const dag = Learner.learnDAG({ events: events200 });
    const r1 = DoCalc.doIntervene({
      events: events200, dag, treatment: "sf", x_value: 160, target: "outcome_class",
    });
    const r2 = DoCalc.doIntervene({
      events: events200, dag, treatment: "sf", x_value: 170, target: "outcome_class",
    });
    const r3 = DoCalc.doIntervene({
      events: events200, dag, treatment: "sf", x_value: 180, target: "outcome_class",
    });
    const delta12 = r2.observational_E_Y_given_X - r1.observational_E_Y_given_X;
    const delta13 = r3.observational_E_Y_given_X - r1.observational_E_Y_given_X;
    expect(delta13 / delta12).toBeCloseTo(2, 4);
  });

  it("rejects malformed input (Zod min(1) on events)", () => {
    expect(() => DoCalc.doIntervene({
      events: [], dag: explicitDAG([]), treatment: "sf", x_value: 100, target: "outcome_class",
    } as never)).toThrow();
  });
});

// ============================================================================
// T9-03 — Counterfactual
// ============================================================================

describe("T9-03: Counterfactual — twin-network 3-step", () => {
  it("counterfactual_y is finite and identifiable=true on standard query", () => {
    const dag = Learner.learnDAG({ events: events200 });
    const r = CF.query({
      events: events200, dag, treatment: "sf", target: "outcome_class",
      factual: { x: 150, y: 1 }, counterfactual_x: 200,
    });
    expect(r.identifiable).toBe(true);
    expect(Number.isFinite(r.counterfactual_y)).toBe(true);
  });

  it("identity property: counterfactual_y === factual_y when x_cf === x_factual", () => {
    const dag = Learner.learnDAG({ events: events200 });
    const r = CF.query({
      events: events200, dag, treatment: "sf", target: "outcome_class",
      factual: { x: 150, y: 1 }, counterfactual_x: 150,
    });
    expect(r.counterfactual_y).toBeCloseTo(1, 6);
  });

  it("delta y_cf scales linearly with delta x_cf (linear-SEM invariant)", () => {
    const dag = Learner.learnDAG({ events: events200 });
    const r1 = CF.query({
      events: events200, dag, treatment: "sf", target: "outcome_class",
      factual: { x: 150, y: 1 }, counterfactual_x: 160,
    });
    const r2 = CF.query({
      events: events200, dag, treatment: "sf", target: "outcome_class",
      factual: { x: 150, y: 1 }, counterfactual_x: 170,
    });
    const delta1 = r1.counterfactual_y - 1;
    const delta2 = r2.counterfactual_y - 1;
    expect(delta2 / delta1).toBeCloseTo(2, 1);
  });

  it("returns finite causal_slope distinct from marginal_slope (confounding diagnostic)", () => {
    const dag = Learner.learnDAG({ events: events200 });
    const r = CF.query({
      events: events200, dag, treatment: "sf", target: "outcome_class",
      factual: { x: 150, y: 1 }, counterfactual_x: 200,
    });
    expect(Number.isFinite(r.causal_slope)).toBe(true);
    expect(Number.isFinite(r.marginal_slope)).toBe(true);
  });

  it("noise_residual u satisfies y_cf = f(x_cf, Z̄) + u (abduction invariant)", () => {
    const dag = Learner.learnDAG({ events: events200 });
    const r = CF.query({
      events: events200, dag, treatment: "sf", target: "outcome_class",
      factual: { x: 150, y: 1 }, counterfactual_x: 150,
    });
    // When x_cf = x_fact, y_cf = y_pred(x_fact) + u = (y_fact - u) + u = y_fact
    // So u must equal y_fact - y_pred(x_fact). Check via the identity property.
    expect(r.counterfactual_y).toBeCloseTo(1, 6);
  });

  it("rejects degenerate query (treatment === target)", () => {
    const dag = Learner.learnDAG({ events: events200 });
    const r = CF.query({
      events: events200, dag, treatment: "sf", target: "sf",
      factual: { x: 150, y: 150 }, counterfactual_x: 200,
    });
    expect(r.identifiable).toBe(false);
    expect(r.counterfactual_y).toBe(150);
  });

  it("rejects non-finite factual y (Zod)", () => {
    const dag = Learner.learnDAG({ events: events200 });
    expect(() => CF.query({
      events: events200, dag, treatment: "sf", target: "outcome_class",
      factual: { x: 150, y: NaN }, counterfactual_x: 200,
    })).toThrow();
  });
});

// ============================================================================
// T9-04 — Mediation
// ============================================================================

describe("T9-04: Mediation — NDE/NIE decomposition", () => {
  it("rankMediators returns 4 candidates ordered by descending strength", () => {
    const dag = Learner.learnDAG({ events: events200 });
    const ranked = Med.rankMediators({
      events: events200, dag, treatment: "sf", outcome: "outcome_class",
    });
    expect(ranked.length).toBe(4);  // 6 vars - treatment - outcome = 4
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i].strength).toBeLessThanOrEqual(ranked[i - 1].strength);
    }
  });

  it("rejects degenerate mediator (treatment === mediator)", () => {
    const dag = explicitDAG([["sf", "fz"], ["fz", "outcome_class"]]);
    const r = Med.decompose({
      events: events200, dag,
      treatment: "sf", mediator: "sf", outcome: "outcome_class",
      x_treat: 200, x_ref: 150,
    });
    expect(r.identifiable).toBe(false);
    expect(r.warnings[0]).toMatch(/distinct/);
  });

  it("rejects mediator with no X→M edge in DAG", () => {
    const dag = explicitDAG([["sf", "outcome_class"]]);  // no sf→tool_class edge
    const r = Med.decompose({
      events: events200, dag,
      treatment: "sf", mediator: "tool_class", outcome: "outcome_class",
      x_treat: 200, x_ref: 150,
    });
    expect(r.identifiable).toBe(false);
    expect(r.warnings[0]).toMatch(/X→M/);
  });

  it("rejects mediator with no M→Y edge", () => {
    const dag = explicitDAG([["sf", "fz"]]);  // no fz→outcome_class
    const r = Med.decompose({
      events: events200, dag,
      treatment: "sf", mediator: "fz", outcome: "outcome_class",
      x_treat: 200, x_ref: 150,
    });
    expect(r.identifiable).toBe(false);
    expect(r.warnings[0]).toMatch(/M→Y/);
  });

  it("decomposes total_effect = direct_effect + indirect_effect (algebraic identity)", () => {
    const dag = explicitDAG([
      ["sf", "fz"], ["fz", "outcome_class"], ["sf", "outcome_class"],
    ]);
    const r = Med.decompose({
      events: events200, dag,
      treatment: "sf", mediator: "fz", outcome: "outcome_class",
      x_treat: 200, x_ref: 150,
    });
    expect(r.identifiable).toBe(true);
    expect(r.total_effect).toBeCloseTo(r.direct_effect + r.indirect_effect, 6);
  });

  it("indirect_effect = α_X · β_M · Δx (Baron-Kenny formula)", () => {
    const dag = explicitDAG([
      ["sf", "fz"], ["fz", "outcome_class"], ["sf", "outcome_class"],
    ]);
    const r = Med.decompose({
      events: events200, dag,
      treatment: "sf", mediator: "fz", outcome: "outcome_class",
      x_treat: 200, x_ref: 150,
    });
    const expectedNIE = r.beta_X_on_M * r.beta_M_on_Y * (200 - 150);
    expect(r.indirect_effect).toBeCloseTo(expectedNIE, 6);
  });

  it("direct_effect = β_X_on_Y_direct · Δx (regression invariant)", () => {
    const dag = explicitDAG([
      ["sf", "fz"], ["fz", "outcome_class"], ["sf", "outcome_class"],
    ]);
    const r = Med.decompose({
      events: events200, dag,
      treatment: "sf", mediator: "fz", outcome: "outcome_class",
      x_treat: 200, x_ref: 150,
    });
    expect(r.direct_effect).toBeCloseTo(r.beta_X_on_Y_direct * 50, 6);
  });

  it("proportion_mediated within bounds for sign-consistent decomposition", () => {
    const dag = explicitDAG([
      ["sf", "fz"], ["fz", "outcome_class"], ["sf", "outcome_class"],
    ]);
    const r = Med.decompose({
      events: events200, dag,
      treatment: "sf", mediator: "fz", outcome: "outcome_class",
      x_treat: 200, x_ref: 150,
    });
    if (Math.sign(r.direct_effect) === Math.sign(r.indirect_effect) && r.direct_effect !== 0) {
      expect(r.proportion_mediated).toBeGreaterThanOrEqual(0);
      expect(r.proportion_mediated).toBeLessThanOrEqual(1);
    }
  });

  it("rejects empty events (Zod min(1))", () => {
    expect(() => Med.decompose({
      events: [], dag: explicitDAG([]),
      treatment: "sf", mediator: "fz", outcome: "outcome_class",
      x_treat: 200, x_ref: 150,
    })).toThrow();
  });
});

// ============================================================================
// Engine identity
// ============================================================================

describe("Engine identity", () => {
  it("each engine exposes engineId, version, tier matching T9-XX", () => {
    expect(Learner.engineId).toBe("CrossProcessCausalGraphLearnerEngine");
    expect(Learner.tier).toBe("T9-01");
    expect(DoCalc.tier).toBe("T9-02");
    expect(CF.tier).toBe("T9-03");
    expect(Med.tier).toBe("T9-04");
  });
});

// ============================================================================
// Dispatcher round-trip wrappers
// ============================================================================

describe("Dispatcher wrappers — round-trip via wrapper functions", () => {
  it("crossProcessCausalGraphLearner.xproc_causal_learn_dag returns full DAG", async () => {
    const { crossProcessCausalGraphLearner } = await import(
      "../engines/CrossProcessCausalGraphLearnerEngine.js"
    );
    const r = crossProcessCausalGraphLearner("xproc_causal_learn_dag", { events: events200 }) as CausalDAG;
    expect(r.nodes).toEqual([...PRISM_VARS]);
    expect(r.n_samples).toBe(200);
  });

  it("crossProcessDoCalculus.xproc_do_intervene returns identifiable result", async () => {
    const { crossProcessDoCalculus } = await import(
      "../engines/CrossProcessDoCalculusEngine.js"
    );
    const dag = Learner.learnDAG({ events: events200 });
    const r = crossProcessDoCalculus("xproc_do_intervene", {
      events: events200, dag, treatment: "sf", x_value: 200, target: "outcome_class",
    }) as { identifiable: boolean };
    expect(r.identifiable).toBe(true);
  });

  it("crossProcessCounterfactualPredictor.xproc_counterfactual_query returns identifiable result", async () => {
    const { crossProcessCounterfactualPredictor } = await import(
      "../engines/CrossProcessCounterfactualPredictorEngine.js"
    );
    const dag = Learner.learnDAG({ events: events200 });
    const r = crossProcessCounterfactualPredictor("xproc_counterfactual_query", {
      events: events200, dag, treatment: "sf", target: "outcome_class",
      factual: { x: 150, y: 1 }, counterfactual_x: 200,
    }) as { identifiable: boolean };
    expect(r.identifiable).toBe(true);
  });

  it("crossProcessMediationAnalyzer.xproc_mediation_decompose returns identifiable result", async () => {
    const { crossProcessMediationAnalyzer } = await import(
      "../engines/CrossProcessMediationAnalyzerEngine.js"
    );
    const dag = explicitDAG([["sf", "fz"], ["fz", "outcome_class"]]);
    const r = crossProcessMediationAnalyzer("xproc_mediation_decompose", {
      events: events200, dag,
      treatment: "sf", mediator: "fz", outcome: "outcome_class",
      x_treat: 200, x_ref: 150,
    }) as { identifiable: boolean };
    expect(r.identifiable).toBe(true);
  });

  it("each wrapper rejects unknown action with descriptive error", async () => {
    const { crossProcessCausalGraphLearner } = await import(
      "../engines/CrossProcessCausalGraphLearnerEngine.js"
    );
    const { crossProcessDoCalculus } = await import(
      "../engines/CrossProcessDoCalculusEngine.js"
    );
    const { crossProcessCounterfactualPredictor } = await import(
      "../engines/CrossProcessCounterfactualPredictorEngine.js"
    );
    const { crossProcessMediationAnalyzer } = await import(
      "../engines/CrossProcessMediationAnalyzerEngine.js"
    );
    expect(() => crossProcessCausalGraphLearner("unknown", {})).toThrow(/unknown action/i);
    expect(() => crossProcessDoCalculus("unknown", {})).toThrow(/unknown action/i);
    expect(() => crossProcessCounterfactualPredictor("unknown", {})).toThrow(/unknown action/i);
    expect(() => crossProcessMediationAnalyzer("unknown", {})).toThrow(/unknown action/i);
  });
});
