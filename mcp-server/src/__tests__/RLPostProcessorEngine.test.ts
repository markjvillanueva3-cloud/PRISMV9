/**
 * RLPostProcessorEngine — behavioral test suite.
 *
 * Closes FEATURE-GAP-AUDIT-MS0::U-GAP-POST-RL-POSTPROCESSOR. The engine
 * (PRISM_RL_POST_PROCESSOR port) was already ported + wired into
 * prism_calc (calcDispatcher rl_post_create / rl_post_generate /
 * rl_post_learn, :1644-1672) and productDispatcher, but shipped with
 * zero behavioral coverage.
 *
 * Assertions check the actual Q-learning update rule, the reward
 * function's exact additive structure, deterministic exploitation
 * (argmax over Q), and the G-code formatter — no toBeDefined() stubs.
 */

import { describe, it, expect } from "vitest";
import {
  rlPostProcessorEngine,
  type ToolpathMove,
  type RLFeedback,
} from "../engines/RLPostProcessorEngine.js";

const PATH2: ToolpathMove[] = [
  { type: "rapid", x: 1, y: 2, z: 3 },
  { type: "linear", x: 4, y: 5, z: 6, f: 250 },
];

describe("RLPostProcessorEngine — processor construction", () => {
  it("createProcessor applies documented defaults", () => {
    const p = rlPostProcessorEngine.createProcessor("fanuc");
    expect(p.controllerType).toBe("fanuc");
    expect(p.epsilon).toBe(0.1);
    expect(p.learningRate).toBe(0.1);
    expect(p.gamma).toBe(0.95);
    expect(p.Q).toEqual({});
    expect(p.history).toEqual([]);
  });

  it("createProcessor honors overrides", () => {
    const p = rlPostProcessorEngine.createProcessor("haas", {
      epsilon: 0, learningRate: 0.5, gamma: 0.8,
    });
    expect(p.epsilon).toBe(0);
    expect(p.learningRate).toBe(0.5);
    expect(p.gamma).toBe(0.8);
  });
});

describe("RLPostProcessorEngine — Q-learning update rule", () => {
  it("reward is the exact additive sum of the four documented terms", () => {
    const p = rlPostProcessorEngine.createProcessor("fanuc");
    // no error(+10) + faster than expected(+5) + quality>0.8(+3) = 18
    const fb: RLFeedback = {
      codeLineIndex: 0, executionTime: 5, expectedTime: 10,
      error: false, surfaceQuality: 0.9,
    };
    const r = rlPostProcessorEngine.learn(p, fb);
    expect(r.reward).toBe(18);
    // Q update: Q += lr·(reward − Q); Q starts 0, lr 0.1 → 0.1·18 = 1.8
    expect(r.updatedQValue).toBeCloseTo(1.8, 9);
    expect(r.totalExperiences).toBe(1);
    expect(p.history).toHaveLength(1);
  });

  it("error path applies the −20 penalty (and gates the +10)", () => {
    const p = rlPostProcessorEngine.createProcessor("fanuc");
    // error(−20), not faster (== not <), quality ≤ 0.8 → reward −20
    const r = rlPostProcessorEngine.learn(p, {
      codeLineIndex: 0, executionTime: 10, expectedTime: 10,
      error: true, surfaceQuality: 0.5,
    });
    expect(r.reward).toBe(-20);
  });

  it("error + fast + high-quality nets +5 +3 −20 = −12 (error gates only the +10)", () => {
    const p = rlPostProcessorEngine.createProcessor("fanuc");
    const r = rlPostProcessorEngine.learn(p, {
      codeLineIndex: 0, executionTime: 1, expectedTime: 10,
      error: true, surfaceQuality: 0.95,
    });
    expect(r.reward).toBe(-12);
  });

  it("Q converges toward reward under repeated identical feedback (TD(0) contraction)", () => {
    const p = rlPostProcessorEngine.createProcessor("fanuc", { learningRate: 0.5 });
    const fb: RLFeedback = {
      codeLineIndex: 0, executionTime: 1, expectedTime: 10,
      error: false, surfaceQuality: 0.99, stateKey: "S", actionKey: "A",
    };
    let last = 0;
    for (let i = 0; i < 25; i++) last = rlPostProcessorEngine.learn(p, fb).updatedQValue;
    // reward 18, lr 0.5 → geometric convergence to 18
    expect(last).toBeGreaterThan(17.99);
    expect(last).toBeLessThanOrEqual(18);
    expect(p.Q["S_A"]).toBeCloseTo(last, 9);
    expect(p.history).toHaveLength(25);
  });

  it("distinct (stateKey, actionKey) pairs occupy distinct Q cells", () => {
    const p = rlPostProcessorEngine.createProcessor("fanuc");
    rlPostProcessorEngine.learn(p, {
      codeLineIndex: 0, executionTime: 1, expectedTime: 10,
      error: false, surfaceQuality: 0.9, stateKey: "s1", actionKey: "compact",
    });
    rlPostProcessorEngine.learn(p, {
      codeLineIndex: 1, executionTime: 1, expectedTime: 10,
      error: false, surfaceQuality: 0.9, stateKey: "s2", actionKey: "verbose",
    });
    expect(Object.keys(p.Q).sort()).toEqual(["s1_compact", "s2_verbose"]);
  });
});

describe("RLPostProcessorEngine — deterministic code generation", () => {
  it("structure: header + one line per move + M30 + % ; lineCount = moves + 3", () => {
    const p = rlPostProcessorEngine.createProcessor("fanuc");
    const g = rlPostProcessorEngine.generateCode(p, PATH2, {
      programNumber: 1234, deterministic: true,
    });
    expect(g.lineCount).toBe(PATH2.length + 3); // [header, m0, m1, M30, %]
    expect(g.gcode).toContain("O1234");
    expect(g.gcode).toContain("(PRISM RL Post Processor - fanuc)");
    expect(g.gcode).toContain("G90 G40 G80");
    expect(g.gcode.trimEnd().endsWith("%")).toBe(true);
    expect(g.gcode).toContain("\nM30\n");
  });

  it("empty Q → deterministic argmax falls back to 'standard' for every move", () => {
    const p = rlPostProcessorEngine.createProcessor("fanuc");
    const g = rlPostProcessorEngine.generateCode(p, PATH2, { deterministic: true });
    expect(g.formatsUsed.standard).toBe(PATH2.length);
    expect(g.formatsUsed.optimized).toBe(0);
    expect(g.formatsUsed.compact).toBe(0);
    expect(g.formatsUsed.verbose).toBe(0);
  });

  it("epsilon=0 makes generateCode deterministic even WITHOUT the deterministic flag", () => {
    const p = rlPostProcessorEngine.createProcessor("fanuc", { epsilon: 0 });
    const a = rlPostProcessorEngine.generateCode(p, PATH2);
    const b = rlPostProcessorEngine.generateCode(p, PATH2);
    expect(a.gcode).toBe(b.gcode);
    expect(a.formatsUsed).toEqual(b.formatsUsed);
    // ε=0 routes chooseFormat→exploitFormat, identical to the explicit
    // deterministic flag (locks the 2nd determinism lever rl_post_create
    // exposes, not just run-to-run stability).
    const det = rlPostProcessorEngine.generateCode(p, PATH2, { deterministic: true });
    expect(a.formatsUsed).toEqual(det.formatsUsed);
  });

  it("a high Q value steers the deterministic format choice (exploitation)", () => {
    const p = rlPostProcessorEngine.createProcessor("fanuc");
    // first move is rapid with no predecessor → stateKey "rapid_start"
    p.Q["rapid_start_compact"] = 99;
    const g = rlPostProcessorEngine.generateCode(p, [PATH2[0]], { deterministic: true });
    expect(g.formatsUsed.compact).toBe(1);
    expect(g.formatsUsed.standard).toBe(0);
    // compact rapid format = G0X<x>Y<y>Z<z> (no spaces, no decimals)
    expect(g.gcode).toContain("G0X1Y2Z3");
  });
});

describe("RLPostProcessorEngine — formatMove per-format syntax", () => {
  const move: ToolpathMove = { type: "linear", x: 1, y: 2, z: 3, f: 150 };
  function fmtFor(fmt: string): string {
    const p = rlPostProcessorEngine.createProcessor("fanuc");
    p.Q[`linear_start_${fmt}`] = 50;
    return rlPostProcessorEngine
      .generateCode(p, [move], { deterministic: true })
      .gcode;
  }
  it("verbose uses G01 + 4-dp coords + 1-dp feed", () => {
    expect(fmtFor("verbose")).toContain("G01 X1.0000 Y2.0000 Z3.0000 F150.0");
  });
  it("optimized uses G1 + 3-dp coords", () => {
    expect(fmtFor("optimized")).toContain("G1 X1.000 Y2.000 Z3.000 F150");
  });
  it("compact strips spaces and decimals", () => {
    expect(fmtFor("compact")).toContain("G1X1Y2Z3F150");
  });
  it("standard (default) uses G1 + 3-dp coords", () => {
    expect(fmtFor("standard")).toContain("G1 X1.000 Y2.000 Z3.000 F150");
  });
});

describe("RLPostProcessorEngine — stats", () => {
  it("aggregates experience count, avg reward (2dp), Q-table size, optimized actions", () => {
    const p = rlPostProcessorEngine.createProcessor("fanuc");
    // reward 18 then reward 18 → avg 18 ; Q cell climbs > 5 → 1 optimized action
    const fb: RLFeedback = {
      codeLineIndex: 0, executionTime: 1, expectedTime: 10,
      error: false, surfaceQuality: 0.99, stateKey: "S", actionKey: "A",
    };
    for (let i = 0; i < 8; i++) rlPostProcessorEngine.learn(p, fb);
    const s = rlPostProcessorEngine.stats(p);
    expect(s.totalExperiences).toBe(8);
    expect(s.avgReward).toBe(18);
    expect(s.qTableSize).toBe(1);
    expect(s.optimizedActions).toBe(1); // Q["S_A"] climbed above the >5 threshold
  });

  it("fresh processor → zeroed stats, no NaN avg", () => {
    const s = rlPostProcessorEngine.stats(
      rlPostProcessorEngine.createProcessor("haas"),
    );
    expect(s).toEqual({
      totalExperiences: 0, optimizedActions: 0, avgReward: 0, qTableSize: 0,
    });
    expect(Number.isNaN(s.avgReward)).toBe(false);
  });
});

describe("RLPostProcessorEngine — dispatcher contract (prism_calc rl_post_*)", () => {
  it("exposes the create/generate/learn surface calcDispatcher imports", () => {
    expect(typeof rlPostProcessorEngine.createProcessor).toBe("function");
    expect(typeof rlPostProcessorEngine.generateCode).toBe("function");
    expect(typeof rlPostProcessorEngine.learn).toBe("function");

    const proc = rlPostProcessorEngine.createProcessor("okuma");
    const gen = rlPostProcessorEngine.generateCode(proc, PATH2, { deterministic: true });
    expect(gen.lineCount).toBeGreaterThan(0);
    expect(gen).toHaveProperty("formatsUsed");
    const lr = rlPostProcessorEngine.learn(proc, {
      codeLineIndex: 0, executionTime: 1, expectedTime: 2,
      error: false, surfaceQuality: 0.9,
    });
    expect(lr.totalExperiences).toBe(1);
    expect(lr.reward).toBe(18);
  });
});
