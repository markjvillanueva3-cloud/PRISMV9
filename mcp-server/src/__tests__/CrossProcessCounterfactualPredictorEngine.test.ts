/**
 * CrossProcessCounterfactualPredictorEngine — T9-03 tests.
 * Pearl's twin-network 3-step abduction → action → prediction.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  CrossProcessCausalGraphLearnerEngine as Learner,
  type Event,
  type CausalDAG,
} from "../engines/CrossProcessCausalGraphLearnerEngine.js";
import {
  CrossProcessCounterfactualPredictorEngine as CF,
  crossProcessCounterfactualPredictor,
} from "../engines/CrossProcessCounterfactualPredictorEngine.js";

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

let events200: Event[];
let dag: CausalDAG;
beforeAll(() => { events200 = genEvents(200); dag = Learner.learnDAG({ events: events200 }); });

describe("query — 3-step Pearl counterfactual", () => {
  it("counterfactual_y is finite and identifiable=true on standard query", () => {
    const r = CF.query({
      events: events200, dag, treatment: "sf", target: "outcome_class",
      factual: { x: 150, y: 1 }, counterfactual_x: 200,
    });
    expect(r.identifiable).toBe(true);
    expect(Number.isFinite(r.counterfactual_y)).toBe(true);
  });

  it("identity property: counterfactual_y === factual_y when x_cf === x_factual", () => {
    const r = CF.query({
      events: events200, dag, treatment: "sf", target: "outcome_class",
      factual: { x: 150, y: 1 }, counterfactual_x: 150,
    });
    expect(r.counterfactual_y).toBeCloseTo(1, 6);
  });

  it("delta y_cf scales linearly with delta x_cf (linear-SEM invariant)", () => {
    const r1 = CF.query({
      events: events200, dag, treatment: "sf", target: "outcome_class",
      factual: { x: 150, y: 1 }, counterfactual_x: 160,
    });
    const r2 = CF.query({
      events: events200, dag, treatment: "sf", target: "outcome_class",
      factual: { x: 150, y: 1 }, counterfactual_x: 170,
    });
    const d1 = r1.counterfactual_y - 1;
    const d2 = r2.counterfactual_y - 1;
    expect(d2 / d1).toBeCloseTo(2, 1);
  });

  it("returns finite causal_slope (structural) and marginal_slope (observational)", () => {
    const r = CF.query({
      events: events200, dag, treatment: "sf", target: "outcome_class",
      factual: { x: 150, y: 1 }, counterfactual_x: 200,
    });
    expect(Number.isFinite(r.causal_slope)).toBe(true);
    expect(Number.isFinite(r.marginal_slope)).toBe(true);
  });

  it("noise_residual is finite (extracted in abduction step)", () => {
    const r = CF.query({
      events: events200, dag, treatment: "sf", target: "outcome_class",
      factual: { x: 150, y: 1 }, counterfactual_x: 200,
    });
    expect(Number.isFinite(r.noise_residual)).toBe(true);
  });

  it("preserves factual.x and counterfactual_x in output for audit", () => {
    const r = CF.query({
      events: events200, dag, treatment: "sf", target: "outcome_class",
      factual: { x: 150, y: 1 }, counterfactual_x: 200,
    });
    expect(r.factual.x).toBe(150);
    expect(r.factual.y).toBe(1);
    expect(r.counterfactual_x).toBe(200);
  });

  it("rationale references the 3-step Pearl procedure", () => {
    const r = CF.query({
      events: events200, dag, treatment: "sf", target: "outcome_class",
      factual: { x: 150, y: 1 }, counterfactual_x: 200,
    });
    expect(r.rationale).toMatch(/3-step Pearl|abduction|action|prediction/i);
  });

  it("returns back_door_set used for adjustment", () => {
    const r = CF.query({
      events: events200, dag, treatment: "sf", target: "outcome_class",
      factual: { x: 150, y: 1 }, counterfactual_x: 200,
    });
    expect(Array.isArray(r.back_door_set)).toBe(true);
  });

  it("rejects degenerate query (treatment === target) — returns factual unchanged", () => {
    const r = CF.query({
      events: events200, dag, treatment: "sf", target: "sf",
      factual: { x: 150, y: 150 }, counterfactual_x: 200,
    });
    expect(r.identifiable).toBe(false);
    expect(r.counterfactual_y).toBe(150);
  });

  it("rejects non-finite factual y (Zod)", () => {
    expect(() => CF.query({
      events: events200, dag, treatment: "sf", target: "outcome_class",
      factual: { x: 150, y: NaN }, counterfactual_x: 200,
    })).toThrow();
  });

  it("rejects empty events (Zod min(1))", () => {
    expect(() => CF.query({
      events: [], dag, treatment: "sf", target: "outcome_class",
      factual: { x: 150, y: 1 }, counterfactual_x: 200,
    })).toThrow();
  });
});

describe("Engine identity", () => {
  it("exposes engineId/version/tier matching T9-03", () => {
    expect(CF.engineId).toBe("CrossProcessCounterfactualPredictorEngine");
    expect(CF.version).toBe("1.0.0");
    expect(CF.tier).toBe("T9-03");
  });
});

describe("Dispatcher wrapper", () => {
  it("xproc_counterfactual_query returns identifiable result with finite y_cf", () => {
    const r = crossProcessCounterfactualPredictor("xproc_counterfactual_query", {
      events: events200, dag, treatment: "sf", target: "outcome_class",
      factual: { x: 150, y: 1 }, counterfactual_x: 200,
    }) as { identifiable: boolean; counterfactual_y: number };
    expect(r.identifiable).toBe(true);
    expect(Number.isFinite(r.counterfactual_y)).toBe(true);
  });

  it("rejects unknown action", () => {
    expect(() => crossProcessCounterfactualPredictor("unknown", {})).toThrow(/unknown action/i);
  });
});
