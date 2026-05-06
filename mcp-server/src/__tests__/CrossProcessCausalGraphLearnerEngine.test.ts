/**
 * CrossProcessCausalGraphLearnerEngine — T9-01 tests.
 * PC-stable algorithm + Fisher Z conditional-independence test.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  CrossProcessCausalGraphLearnerEngine as Learner,
  PRISM_VARS,
  crossProcessCausalGraphLearner,
  type Event,
  type CausalDAG,
} from "../engines/CrossProcessCausalGraphLearnerEngine.js";

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
const PROCS = ["mill", "lathe", "wedm"] as const;
const MATS = ["P", "M", "K", "N", "S", "H"] as const;

function genEvents(n: number): Event[] {
  rngState = 42;
  const out: Event[] = [];
  for (let i = 0; i < n; i++) {
    const sf = 150 + 30 * randn();
    const fz = 0.08 + 0.02 * randn();
    const yLatent = 0.3 * (sf - 150) / 30 + 0.5 * (fz - 0.08) / 0.02 + 0.5 * randn();
    const oc = yLatent < -0.5 ? "fail" : yLatent < 0.5 ? "marginal" : "pass";
    out.push({
      sf: Math.max(10, sf), fz: Math.max(0.001, fz),
      process: PROCS[Math.floor(rand() * 3)],
      material_iso: MATS[Math.floor(rand() * 6)],
      tool_class: "endmill_carbide",
      outcome_class: oc,
    });
  }
  return out;
}

let events100: Event[];
let events200: Event[];
beforeAll(() => { events100 = genEvents(100); events200 = genEvents(200); });

describe("learnDAG — skeleton + orientation", () => {
  it("returns non-empty edge set when n ≥ 30", () => {
    const dag = Learner.learnDAG({ events: events100 });
    expect(dag.edges.length).toBeGreaterThan(0);
  });

  it("populates all 6 PRISM-XPROC nodes", () => {
    const dag = Learner.learnDAG({ events: events100 });
    expect(dag.nodes).toEqual([...PRISM_VARS]);
  });

  it("tracks n_samples accurately", () => {
    const dag = Learner.learnDAG({ events: events200 });
    expect(dag.n_samples).toBe(200);
  });

  it("returns empty DAG with warning when n < 30 (Fisher Z asymptotic invalid)", () => {
    const dag = Learner.learnDAG({ events: events100.slice(0, 10) });
    expect(dag.edges).toHaveLength(0);
    expect(dag.warnings[0]).toMatch(/below minimum/);
  });

  it("recovers true sf↔outcome_class link from synthetic data", () => {
    const dag = Learner.learnDAG({ events: events200 });
    const present = dag.edges.some((e) =>
      (e.from === "sf" && e.to === "outcome_class") ||
      (e.from === "outcome_class" && e.to === "sf"));
    expect(present).toBe(true);
  });

  it("CI test reports independence for constant variable (tool_class)", () => {
    const ci = Learner.testIndependence(events200, "tool_class", "sf", []);
    expect(ci.independent).toBe(true);
  });

  it("all CI decisions have valid p-values in [0, 1]", () => {
    const dag = Learner.learnDAG({ events: events100 });
    const allValid = dag.ci_decisions.every((d) => d.p_value >= 0 && d.p_value <= 1);
    expect(allValid).toBe(true);
  });

  it("exportGraph partitions edges into directed + undirected sums", () => {
    const dag = Learner.learnDAG({ events: events200 });
    const ex = Learner.exportGraph(dag);
    expect(ex.directed_edges.length + ex.undirected_edges.length).toBe(dag.edges.length);
  });

  it("max_cond_size=0 forces all CI tests to use empty conditioning set", () => {
    const dag = Learner.learnDAG({ events: events100, max_cond_size: 0 });
    const allEmpty = dag.ci_decisions.every((d) => d.cond.length === 0);
    expect(allEmpty).toBe(true);
  });

  it("rejects empty events array (Zod min(1))", () => {
    expect(() => Learner.learnDAG({ events: [] })).toThrow();
  });

  it("rejects malformed event missing required field", () => {
    expect(() => Learner.learnDAG({ events: [{ sf: 100 } as Event] })).toThrow();
  });

  it("rejects out-of-range alpha", () => {
    expect(() => Learner.learnDAG({ events: events100, alpha: 1.5 })).toThrow();
  });
});

describe("Engine identity", () => {
  it("exposes engineId/version/tier matching T9-01", () => {
    expect(Learner.engineId).toBe("CrossProcessCausalGraphLearnerEngine");
    expect(Learner.version).toBe("1.0.0");
    expect(Learner.tier).toBe("T9-01");
  });
});

describe("Dispatcher wrapper", () => {
  it("xproc_causal_learn_dag returns full DAG with correct node set", () => {
    const r = crossProcessCausalGraphLearner("xproc_causal_learn_dag", { events: events200 }) as CausalDAG;
    expect(r.nodes).toEqual([...PRISM_VARS]);
    expect(r.n_samples).toBe(200);
  });

  it("xproc_causal_test_independence returns CIDecision shape", () => {
    const r = crossProcessCausalGraphLearner("xproc_causal_test_independence", {
      events: events200, x: "sf", y: "tool_class", cond: [], alpha: 0.05,
    }) as { independent: boolean; p_value: number };
    expect(typeof r.independent).toBe("boolean");
    expect(r.p_value).toBeGreaterThanOrEqual(0);
  });

  it("rejects unknown action", () => {
    expect(() => crossProcessCausalGraphLearner("unknown", {})).toThrow(/unknown action/i);
  });
});
