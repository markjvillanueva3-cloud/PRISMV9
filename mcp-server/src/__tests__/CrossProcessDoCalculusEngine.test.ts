/**
 * CrossProcessDoCalculusEngine — T9-02 tests.
 * Pearl's back-door criterion + adjustment formula.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  CrossProcessCausalGraphLearnerEngine as Learner,
  PRISM_VARS,
  type Event,
  type CausalDAG,
} from "../engines/CrossProcessCausalGraphLearnerEngine.js";
import {
  CrossProcessDoCalculusEngine as DoCalc,
  crossProcessDoCalculus,
} from "../engines/CrossProcessDoCalculusEngine.js";

let rngState = 42;
function rand(): number { rngState = (rngState * 1103515245 + 12345) & 0x7fffffff; return rngState / 0x7fffffff; }
function randn(): number { const u = Math.max(rand(), 1e-9); const v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
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
      tool_class: "endmill_carbide", outcome_class: oc,
    });
  }
  return out;
}

function explicitDAG(directed: Array<[string, string]>): CausalDAG {
  return {
    nodes: [...PRISM_VARS],
    edges: directed.map(([f, t]) => ({ from: f as never, to: t as never, orientation: "directed" as const, evidence: "test" as const })),
    separating_sets: {}, ci_decisions: [], n_samples: 200, alpha: 0.05, warnings: [],
  };
}

let events200: Event[];
let learnedDag: CausalDAG;
beforeAll(() => {
  events200 = genEvents(200);
  learnedDag = Learner.learnDAG({ events: events200 });
});

describe("identify — back-door criterion", () => {
  it("returns identifiable=true with array Z when treatment has no parents", () => {
    const r = DoCalc.identify(learnedDag, "sf", "outcome_class");
    expect(r.identifiable).toBe(true);
    expect(Array.isArray(r.back_door_set)).toBe(true);
  });

  it("rejects degenerate query (treatment === target)", () => {
    const r = DoCalc.identify(learnedDag, "sf", "sf");
    expect(r.identifiable).toBe(false);
    expect(r.back_door_set).toBeNull();
    expect(r.rationale).toMatch(/degenerate/);
  });

  it("returns Z = [parent] when treatment has explicit parent in DAG", () => {
    const dag = explicitDAG([["material_iso", "sf"], ["sf", "outcome_class"]]);
    const r = DoCalc.identify(dag, "sf", "outcome_class");
    expect(r.identifiable).toBe(true);
    expect(r.back_door_set).toContain("material_iso");
  });

  it("rationale describes empty Z when treatment has no parents", () => {
    const dag = explicitDAG([["sf", "outcome_class"]]);
    const r = DoCalc.identify(dag, "sf", "outcome_class");
    expect(r.back_door_set).toEqual([]);
    expect(r.rationale).toMatch(/no parents|empty/);
  });
});

describe("doIntervene — back-door adjustment", () => {
  it("returns finite observational and interventional estimates", () => {
    const r = DoCalc.doIntervene({
      events: events200, dag: learnedDag, treatment: "sf", x_value: 200, target: "outcome_class",
    });
    expect(r.identifiable).toBe(true);
    expect(Number.isFinite(r.observational_E_Y_given_X)).toBe(true);
    expect(Number.isFinite(r.interventional_E_Y_do_X)).toBe(true);
  });

  it("back_door_adjustment = interventional - observational (algebraic identity)", () => {
    const r = DoCalc.doIntervene({
      events: events200, dag: learnedDag, treatment: "sf", x_value: 200, target: "outcome_class",
    });
    expect(r.back_door_adjustment).toBeCloseTo(r.interventional_E_Y_do_X - r.observational_E_Y_given_X, 6);
  });

  it("doubling Δx doubles the linear-regression observational delta", () => {
    const r1 = DoCalc.doIntervene({ events: events200, dag: learnedDag, treatment: "sf", x_value: 160, target: "outcome_class" });
    const r2 = DoCalc.doIntervene({ events: events200, dag: learnedDag, treatment: "sf", x_value: 170, target: "outcome_class" });
    const r3 = DoCalc.doIntervene({ events: events200, dag: learnedDag, treatment: "sf", x_value: 180, target: "outcome_class" });
    const d1 = r2.observational_E_Y_given_X - r1.observational_E_Y_given_X;
    const d2 = r3.observational_E_Y_given_X - r1.observational_E_Y_given_X;
    expect(d2 / d1).toBeCloseTo(2, 4);
  });

  it("n_strata equals event count", () => {
    const r = DoCalc.doIntervene({ events: events200, dag: learnedDag, treatment: "sf", x_value: 200, target: "outcome_class" });
    expect(r.n_strata).toBe(200);
  });

  it("rejects empty events (Zod min(1))", () => {
    expect(() => DoCalc.doIntervene({
      events: [], dag: explicitDAG([]), treatment: "sf", x_value: 100, target: "outcome_class",
    } as never)).toThrow();
  });

  it("rejects non-finite x_value (Zod)", () => {
    expect(() => DoCalc.doIntervene({
      events: events200, dag: learnedDag, treatment: "sf", x_value: Number.NaN, target: "outcome_class",
    })).toThrow();
  });
});

describe("Engine identity", () => {
  it("exposes engineId/version/tier matching T9-02", () => {
    expect(DoCalc.engineId).toBe("CrossProcessDoCalculusEngine");
    expect(DoCalc.version).toBe("1.0.0");
    expect(DoCalc.tier).toBe("T9-02");
  });
});

describe("Dispatcher wrapper", () => {
  it("xproc_do_intervene routes correctly and returns identifiable result", () => {
    const r = crossProcessDoCalculus("xproc_do_intervene", {
      events: events200, dag: learnedDag, treatment: "sf", x_value: 200, target: "outcome_class",
    }) as { identifiable: boolean };
    expect(r.identifiable).toBe(true);
  });

  it("xproc_do_identify returns identifiable + back_door_set", () => {
    const r = crossProcessDoCalculus("xproc_do_identify", {
      dag: learnedDag, treatment: "sf", target: "outcome_class",
    }) as { identifiable: boolean; back_door_set: string[] | null };
    expect(r.identifiable).toBe(true);
    expect(Array.isArray(r.back_door_set)).toBe(true);
  });

  it("rejects unknown action", () => {
    expect(() => crossProcessDoCalculus("unknown", {})).toThrow(/unknown action/i);
  });
});
