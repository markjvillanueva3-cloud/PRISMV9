/**
 * CrossProcessMediationAnalyzerEngine — T9-04 tests.
 * Pearl/Robins-Greenland NDE/NIE decomposition via Baron-Kenny linear formulation.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  PRISM_VARS,
  type Event,
  type CausalDAG,
} from "../engines/CrossProcessCausalGraphLearnerEngine.js";
import {
  CrossProcessMediationAnalyzerEngine as Med,
  crossProcessMediationAnalyzer,
} from "../engines/CrossProcessMediationAnalyzerEngine.js";

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
let mediationDAG: CausalDAG;
beforeAll(() => {
  events200 = genEvents(200);
  // Standard X→M→Y mediation DAG with direct path X→Y for total-effect tests
  mediationDAG = explicitDAG([
    ["sf", "fz"],
    ["fz", "outcome_class"],
    ["sf", "outcome_class"],
  ]);
});

describe("decompose — NDE/NIE algebraic identities", () => {
  it("returns identifiable=true when X→M and M→Y edges both exist", () => {
    const r = Med.decompose({
      events: events200, dag: mediationDAG,
      treatment: "sf", mediator: "fz", outcome: "outcome_class",
      x_treat: 200, x_ref: 150,
    });
    expect(r.identifiable).toBe(true);
  });

  it("total_effect = direct_effect + indirect_effect (algebraic identity)", () => {
    const r = Med.decompose({
      events: events200, dag: mediationDAG,
      treatment: "sf", mediator: "fz", outcome: "outcome_class",
      x_treat: 200, x_ref: 150,
    });
    expect(r.total_effect).toBeCloseTo(r.direct_effect + r.indirect_effect, 6);
  });

  it("indirect_effect = α_X · β_M · Δx (Baron-Kenny formula)", () => {
    const r = Med.decompose({
      events: events200, dag: mediationDAG,
      treatment: "sf", mediator: "fz", outcome: "outcome_class",
      x_treat: 200, x_ref: 150,
    });
    expect(r.indirect_effect).toBeCloseTo(r.beta_X_on_M * r.beta_M_on_Y * 50, 6);
  });

  it("direct_effect = β_X_on_Y_direct · Δx (regression invariant)", () => {
    const r = Med.decompose({
      events: events200, dag: mediationDAG,
      treatment: "sf", mediator: "fz", outcome: "outcome_class",
      x_treat: 200, x_ref: 150,
    });
    expect(r.direct_effect).toBeCloseTo(r.beta_X_on_Y_direct * 50, 6);
  });

  it("mediator_path_strength = |α_X · β_M|", () => {
    const r = Med.decompose({
      events: events200, dag: mediationDAG,
      treatment: "sf", mediator: "fz", outcome: "outcome_class",
      x_treat: 200, x_ref: 150,
    });
    expect(r.mediator_path_strength).toBeCloseTo(Math.abs(r.beta_X_on_M * r.beta_M_on_Y), 6);
  });

  it("Δx=0 (x_treat === x_ref) gives total_effect = 0", () => {
    const r = Med.decompose({
      events: events200, dag: mediationDAG,
      treatment: "sf", mediator: "fz", outcome: "outcome_class",
      x_treat: 150, x_ref: 150,
    });
    expect(r.total_effect).toBeCloseTo(0, 6);
    expect(r.direct_effect).toBeCloseTo(0, 6);
    expect(r.indirect_effect).toBeCloseTo(0, 6);
  });

  it("proportion_mediated within [0, 1] for sign-consistent decomposition", () => {
    const r = Med.decompose({
      events: events200, dag: mediationDAG,
      treatment: "sf", mediator: "fz", outcome: "outcome_class",
      x_treat: 200, x_ref: 150,
    });
    if (Math.sign(r.direct_effect) === Math.sign(r.indirect_effect) && r.direct_effect !== 0) {
      expect(r.proportion_mediated).toBeGreaterThanOrEqual(0);
      expect(r.proportion_mediated).toBeLessThanOrEqual(1);
    }
  });
});

describe("decompose — invalid mediator rejection", () => {
  it("rejects degenerate mediator (treatment === mediator)", () => {
    const r = Med.decompose({
      events: events200, dag: mediationDAG,
      treatment: "sf", mediator: "sf", outcome: "outcome_class",
      x_treat: 200, x_ref: 150,
    });
    expect(r.identifiable).toBe(false);
    expect(r.warnings[0]).toMatch(/distinct/);
  });

  it("rejects mediator with no X→M edge in DAG", () => {
    const dag = explicitDAG([["sf", "outcome_class"]]);
    const r = Med.decompose({
      events: events200, dag,
      treatment: "sf", mediator: "tool_class", outcome: "outcome_class",
      x_treat: 200, x_ref: 150,
    });
    expect(r.identifiable).toBe(false);
    expect(r.warnings[0]).toMatch(/X→M/);
  });

  it("rejects mediator with no M→Y edge in DAG", () => {
    const dag = explicitDAG([["sf", "fz"]]);
    const r = Med.decompose({
      events: events200, dag,
      treatment: "sf", mediator: "fz", outcome: "outcome_class",
      x_treat: 200, x_ref: 150,
    });
    expect(r.identifiable).toBe(false);
    expect(r.warnings[0]).toMatch(/M→Y/);
  });

  it("rejects empty events array (Zod min(1))", () => {
    expect(() => Med.decompose({
      events: [], dag: mediationDAG,
      treatment: "sf", mediator: "fz", outcome: "outcome_class",
      x_treat: 200, x_ref: 150,
    })).toThrow();
  });
});

describe("rankMediators — strength ordering", () => {
  it("returns 4 candidates for 6-var space minus treatment minus outcome", () => {
    const ranked = Med.rankMediators({
      events: events200, dag: mediationDAG, treatment: "sf", outcome: "outcome_class",
    });
    expect(ranked.length).toBe(4);
  });

  it("ranks descending by strength", () => {
    const ranked = Med.rankMediators({
      events: events200, dag: mediationDAG, treatment: "sf", outcome: "outcome_class",
    });
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i].strength).toBeLessThanOrEqual(ranked[i - 1].strength);
    }
  });

  it("invalid mediators (no X→M or M→Y in DAG) get strength=0 and valid=false", () => {
    const ranked = Med.rankMediators({
      events: events200, dag: mediationDAG, treatment: "sf", outcome: "outcome_class",
    });
    const invalid = ranked.filter((r) => !r.valid);
    for (const r of invalid) expect(r.strength).toBe(0);
  });
});

describe("Engine identity", () => {
  it("exposes engineId/version/tier matching T9-04", () => {
    expect(Med.engineId).toBe("CrossProcessMediationAnalyzerEngine");
    expect(Med.version).toBe("1.0.0");
    expect(Med.tier).toBe("T9-04");
  });
});

describe("Dispatcher wrapper", () => {
  it("xproc_mediation_decompose returns identifiable result", () => {
    const r = crossProcessMediationAnalyzer("xproc_mediation_decompose", {
      events: events200, dag: mediationDAG,
      treatment: "sf", mediator: "fz", outcome: "outcome_class",
      x_treat: 200, x_ref: 150,
    }) as { identifiable: boolean };
    expect(r.identifiable).toBe(true);
  });

  it("xproc_mediation_path_strength returns ordered array", () => {
    const r = crossProcessMediationAnalyzer("xproc_mediation_path_strength", {
      events: events200, dag: mediationDAG, treatment: "sf", outcome: "outcome_class",
    }) as Array<{ strength: number }>;
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBeGreaterThan(0);
  });

  it("rejects unknown action", () => {
    expect(() => crossProcessMediationAnalyzer("unknown", {})).toThrow(/unknown action/i);
  });
});
