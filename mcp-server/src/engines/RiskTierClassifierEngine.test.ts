/**
 * Tests — RiskTierClassifierEngine (CAD-COMPLETE-MS0 / U-AI-12)
 */
import { describe, it, expect } from "vitest";
import {
  RiskTierClassifierEngine,
  riskTierClassifierEngine,
} from "./RiskTierClassifierEngine.js";

describe("RiskTierClassifierEngine — base tier from operation kind", () => {
  const e = new RiskTierClassifierEngine();

  it("classifies a cosmetic op as low", () => {
    const r = e.classify({ kind: "set_color" });
    expect(r.tier).toBe("low");
    expect(r.requiresConfirmation).toBe(false);
  });

  it("classifies an additive create op as low", () => {
    expect(e.classify({ kind: "sketch" }).tier).toBe("low");
  });

  it("classifies a geometry-mutation op as medium", () => {
    const r = e.classify({ kind: "extrude" });
    expect(r.tier).toBe("medium");
    expect(r.requiresConfirmation).toBe(false);
  });

  it("classifies a destructive op as high", () => {
    const r = e.classify({ kind: "delete_body" });
    expect(r.tier).toBe("high");
    expect(r.requiresConfirmation).toBe(true);
  });

  it("classifies a boolean-subtract op as high", () => {
    expect(e.classify({ kind: "boolean_subtract" }).tier).toBe("high");
  });

  it("defaults an unrecognised op kind to medium, never low", () => {
    const r = e.classify({ kind: "frobnicate_widget" });
    expect(r.tier).toBe("medium");
    expect(r.factors).toContain("unrecognised operation kind");
  });

  it("treats an empty op kind as high risk", () => {
    const r = e.classify({ kind: "" });
    expect(r.tier).toBe("high");
    expect(r.requiresConfirmation).toBe(true);
  });
});

describe("RiskTierClassifierEngine — escalation factors", () => {
  const e = new RiskTierClassifierEngine();

  it("escalates a geometry op to critical when it touches a datum", () => {
    const r = e.classify({ kind: "extrude", touchesDatum: true });
    expect(r.tier).toBe("critical");
    expect(r.requiresConfirmation).toBe(true);
    expect(r.factors).toContain("touches datum / toleranced / machined feature");
  });

  it("escalates a geometry op to high when irreversible", () => {
    const r = e.classify({ kind: "extrude", irreversible: true });
    expect(r.tier).toBe("high");
  });

  it("clamps a stacked-escalation score to 1.0", () => {
    const r = e.classify({ kind: "delete_body", touchesDatum: true, irreversible: true, batch: true });
    expect(r.score).toBe(1);
    expect(r.tier).toBe("critical");
  });

  it("detects a through-cut from op args", () => {
    const r = e.classify({ kind: "extrude", args: { through: true } });
    expect(r.factors).toContain("through-cut / subtract intent");
  });

  it("treats combine+cut as higher risk than combine+union", () => {
    const cut = e.classify({ kind: "combine", args: { operation: "cut" } });
    const union = e.classify({ kind: "combine", args: { operation: "union" } });
    expect(cut.score).toBeGreaterThan(union.score);
    expect(cut.tier).toBe("high");
    expect(union.tier).toBe("medium");
  });
});

describe("RiskTierClassifierEngine — tierOf thresholds", () => {
  const e = new RiskTierClassifierEngine();

  it("maps scores to tiers at the documented boundaries", () => {
    expect(e.tierOf(0)).toBe("low");
    expect(e.tierOf(0.29)).toBe("low");
    expect(e.tierOf(0.3)).toBe("medium");
    expect(e.tierOf(0.59)).toBe("medium");
    expect(e.tierOf(0.6)).toBe("high");
    expect(e.tierOf(0.84)).toBe("high");
    expect(e.tierOf(0.85)).toBe("critical");
    expect(e.tierOf(1)).toBe("critical");
  });
});

describe("RiskTierClassifierEngine — batch + plan", () => {
  const e = new RiskTierClassifierEngine();

  it("classifies a batch op-by-op", () => {
    const rs = e.classifyBatch([{ kind: "sketch" }, { kind: "delete_body" }]);
    expect(rs).toHaveLength(2);
    expect(rs[0].tier).toBe("low");
    expect(rs[1].tier).toBe("high");
  });

  it("an empty plan is low risk", () => {
    const r = e.classifyPlan([]);
    expect(r.tier).toBe("low");
    expect(r.opCount).toBe(0);
  });

  it("a plan inherits the highest single-op tier", () => {
    const r = e.classifyPlan([{ kind: "sketch" }, { kind: "delete_body" }, { kind: "extrude" }]);
    expect(r.tier).toBe("high");
    expect(r.opCount).toBe(3);
  });

  it("escalates a long plan of non-trivial ops one level", () => {
    const ops = Array.from({ length: 5 }, () => ({ kind: "extrude" }));
    const single = e.classify({ kind: "extrude" });
    const plan = e.classifyPlan(ops);
    expect(plan.score).toBeGreaterThan(single.score);
    expect(plan.factors.some((f) => f.includes("long plan"))).toBe(true);
  });

  it("does not escalate a long plan of trivial cosmetic ops", () => {
    const ops = Array.from({ length: 8 }, () => ({ kind: "set_color" }));
    expect(e.classifyPlan(ops).tier).toBe("low");
  });

  it("exports a shared singleton", () => {
    expect(riskTierClassifierEngine).toBeInstanceOf(RiskTierClassifierEngine);
  });
});
