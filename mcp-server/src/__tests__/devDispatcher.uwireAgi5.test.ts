/**
 * devDispatcher U-WIRE-AGI5 round-trip tests — 4 AGI/SPC engines wired into
 * prism_dev (slot:papa /goal /loop iter5, 2026-05-27).
 *
 *   ComplexityAwareRouterEngine   → complexity_route
 *   CompositionalSynthesisEngine  → composition_synthesize
 *   RegretMinimizationEngine      → regret_select
 *   CUSUMEngine                   → cusum_analyze
 *
 * Asserts engine API contract + dispatcher source presence (action enum +
 * case-block + lazy import).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-AGI5
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

import { ComplexityAwareRouterEngine } from "../engines/ComplexityAwareRouterEngine.js";
import { CompositionalSynthesisEngine } from "../engines/CompositionalSynthesisEngine.js";
import { RegretMinimizationEngine, seededRng } from "../engines/RegretMinimizationEngine.js";
import { CUSUMEngine } from "../engines/CUSUMEngine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DISPATCHER_SRC = fs.readFileSync(
  path.resolve(__dirname, "../tools/dispatchers/devDispatcher.ts"),
  "utf8"
);

describe("U-WIRE-COMPLEXITY-ROUTER engine — singleton classify", () => {
  it("polynomial-known shortest-path classifies as P with deterministic solver", () => {
    const e = new ComplexityAwareRouterEngine();
    const d = e.classify({ name: "shortest-path", sizeN: 10000, polynomialKnown: true });
    expect(d.class).toBe("P");
    expect(typeof d.solver).toBe("string");
    expect(d.solver.length).toBeGreaterThan(0);
    expect(d.approximate).toBe(false);
    expect(Array.isArray(d.rationale)).toBe(true);
    expect(d.rationale.length).toBeGreaterThan(0);
  });

  it("NP-complete known TSP classifies as NPC and recommends approximation", () => {
    const e = new ComplexityAwareRouterEngine();
    const d = e.classify({ name: "TSP", sizeN: 50, npCompleteKnown: true, approximableFactor: 1.5 });
    expect(d.class).toBe("NPC");
    expect(d.approximate).toBe(true);
  });

  it("turingComplete features classify as undecidable + warn", () => {
    const e = new ComplexityAwareRouterEngine();
    const d = e.classify({ name: "halting", turingComplete: true });
    expect(d.class).toBe("undecidable");
    expect(d.warn).toBe(true);
  });
});

describe("U-WIRE-COMPOSITIONAL engine — pipeline synthesis", () => {
  const A = { id: "p1", name: "parser", input: "text", output: "ast", confidence: 0.9 };
  const B = { id: "p2", name: "compiler", input: "ast", output: "bytecode", confidence: 0.85 };
  const C = { id: "p3", name: "executor", input: "bytecode", output: "result", confidence: 0.95 };

  it("synthesizes a 3-step pipeline text→ast→bytecode→result", () => {
    const e = new CompositionalSynthesisEngine();
    e.registerAll([A, B, C]);
    const candidates = e.synthesize({ input: "text", output: "result" }, 5);
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    expect(candidates[0].primitives.length).toBe(3);
    expect(candidates[0].primitives[0].id).toBe("p1");
    expect(candidates[0].primitives[2].id).toBe("p3");
    expect(candidates[0].length).toBe(3);
    expect(candidates[0].score).toBeGreaterThan(0);
  });

  it("returns empty array when no chain reaches output type", () => {
    const e = new CompositionalSynthesisEngine();
    e.registerAll([A, B]);
    const candidates = e.synthesize({ input: "text", output: "no-such-type" }, 5);
    expect(candidates.length).toBe(0);
  });

  it("size() reflects registered primitive count exactly", () => {
    const e = new CompositionalSynthesisEngine();
    e.registerAll([A, B, C]);
    expect(e.size()).toBe(3);
    e.clear();
    expect(e.size()).toBe(0);
  });
});

describe("U-WIRE-REGRET-MIN engine — multi-armed bandit", () => {
  it("UCB selects the arm with no pulls first (exploration bonus is +∞)", () => {
    const e = new RegretMinimizationEngine();
    e.addArms(["a", "b", "c"]);
    e.record("a", 1.0);
    e.record("b", 0.5);
    const trace = e.selectUcb();
    expect(trace.arm).toBe("c");
    expect(trace.reason).toContain("c");
  });

  it("Thompson sampling with seeded RNG is deterministic across runs", () => {
    const e1 = new RegretMinimizationEngine();
    const e2 = new RegretMinimizationEngine();
    e1.addArms(["x", "y"]);
    e2.addArms(["x", "y"]);
    e1.record("x", 1.0); e1.record("y", 0.0);
    e2.record("x", 1.0); e2.record("y", 0.0);
    const t1 = e1.selectThompson(seededRng(42));
    const t2 = e2.selectThompson(seededRng(42));
    expect(t1.arm).toBe(t2.arm);
  });

  it("record updates mean reward exactly: arm 'a' after [1.0, 0.0] has pulls=2 totalReward=1.0 mean=0.5", () => {
    const e = new RegretMinimizationEngine();
    e.addArm("a");
    e.record("a", 1.0);
    e.record("a", 0.0);
    const stats = e.stats();
    const a = stats.find(s => s.id === "a");
    expect(a?.pulls).toBe(2);
    expect(a?.totalReward).toBe(1.0);
    expect(a?.mean).toBe(0.5);
  });
});

describe("U-WIRE-CUSUM engine — Page change-detector", () => {
  it("steady-state under N(0,1) produces no alarm with k=0.5, h=4", () => {
    const e = new CUSUMEngine({ mean: 0, stddev: 1, k: 0.5, h: 4 });
    const r = e.analyze([0.1, -0.2, 0.05, -0.1, 0.0, 0.2, -0.15]);
    expect(r.alarms.length).toBe(0);
    expect(r.firstAlarm).toBeNull();
  });

  it("upward 3σ shift triggers an upper alarm", () => {
    const e = new CUSUMEngine({ mean: 0, stddev: 1, k: 0.5, h: 4 });
    const shifted = [0, 0, 0, 0, 3, 3, 3, 3, 3];
    const r = e.analyze(shifted);
    expect(r.alarms.length).toBeGreaterThan(0);
    expect(r.firstAlarm?.alarm).toBe("upper");
  });

  it("runLengthUntilAlarm returns null when no alarm, then an integer when shifted", () => {
    const e = new CUSUMEngine({ mean: 10, stddev: 1, k: 0.5, h: 4 });
    expect(e.runLengthUntilAlarm([10, 10, 10, 10])).toBeNull();
    e.reset();
    const rl = e.runLengthUntilAlarm([10, 10, 15, 15, 15, 15]);
    expect(typeof rl).toBe("number");
    expect(rl).toBeGreaterThanOrEqual(0);
  });
});

describe("U-WIRE-AGI5 dispatcher wiring source assertions", () => {
  it("action enum lists all 4 new actions", () => {
    expect(DISPATCHER_SRC.includes('"complexity_route"')).toBe(true);
    expect(DISPATCHER_SRC.includes('"composition_synthesize"')).toBe(true);
    expect(DISPATCHER_SRC.includes('"regret_select"')).toBe(true);
    expect(DISPATCHER_SRC.includes('"cusum_analyze"')).toBe(true);
  });

  it("case-blocks exist for all 4 new actions", () => {
    expect(DISPATCHER_SRC.includes("case \"complexity_route\"")).toBe(true);
    expect(DISPATCHER_SRC.includes("case \"composition_synthesize\"")).toBe(true);
    expect(DISPATCHER_SRC.includes("case \"regret_select\"")).toBe(true);
    expect(DISPATCHER_SRC.includes("case \"cusum_analyze\"")).toBe(true);
  });

  it("lazy imports present for all 4 engine modules", () => {
    expect(DISPATCHER_SRC.includes('"../../engines/ComplexityAwareRouterEngine.js"')).toBe(true);
    expect(DISPATCHER_SRC.includes('"../../engines/CompositionalSynthesisEngine.js"')).toBe(true);
    expect(DISPATCHER_SRC.includes('"../../engines/RegretMinimizationEngine.js"')).toBe(true);
    expect(DISPATCHER_SRC.includes('"../../engines/CUSUMEngine.js"')).toBe(true);
  });
});
