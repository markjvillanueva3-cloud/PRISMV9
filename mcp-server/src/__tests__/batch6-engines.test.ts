/**
 * Batch 6 Engines — Unit Tests
 * BackplotEngine, RLPostProcessorEngine, JohnsonCookEngine
 * @milestone AUDIT-FT-B6
 */
import { describe, it, expect } from "vitest";
import { backplotEngine } from "../engines/BackplotEngine.js";
import { rlPostProcessorEngine } from "../engines/RLPostProcessorEngine.js";
import { johnsonCookEngine } from "../engines/JohnsonCookEngine.js";

// ═══════════════════════════════════════════════════════════════
// BackplotEngine
// ═══════════════════════════════════════════════════════════════
describe("BackplotEngine", () => {
  const sampleGcode = [
    "G21 G90",
    "G0 X0 Y0 Z5",
    "G1 Z-1 F100",
    "G1 X50 Y50 F200",
    "G0 Z5",
    "G2 X60 Y50 I5 J0 F150",
    "G0 X0 Y0 Z50",
  ].join("\n");

  it("parses moves from G-code", () => {
    const r = backplotEngine.parse(sampleGcode);
    expect(r.moves.length).toBeGreaterThan(0);
    expect(r.moves[0].type).toBe("rapid");
  });

  it("handles linear moves", () => {
    const r = backplotEngine.parse("G0 X10 Y20 Z5\nG1 X30 Y40 Z-2 F100");
    expect(r.moves).toHaveLength(2);
    expect(r.moves[0].type).toBe("rapid");
    expect(r.moves[0].to).toEqual({ x: 10, y: 20, z: 5 });
    expect(r.moves[1].type).toBe("linear");
    expect(r.moves[1].to).toEqual({ x: 30, y: 40, z: -2 });
  });

  it("generates arc segments from G2", () => {
    const r = backplotEngine.parse("G1 X0 Y0 F100\nG2 X10 Y0 I5 J0");
    const arcMoves = r.moves.filter(m => m.type === "arc");
    expect(arcMoves.length).toBeGreaterThanOrEqual(12);
    expect(arcMoves[0].arcData).toBeDefined();
    expect(arcMoves[0].arcData!.clockwise).toBe(true);
  });

  it("generates arc segments from G3 (CCW)", () => {
    const r = backplotEngine.parse("G1 X0 Y0 F100\nG3 X10 Y0 I5 J0");
    const arcMoves = r.moves.filter(m => m.type === "arc");
    expect(arcMoves.length).toBeGreaterThanOrEqual(12);
    expect(arcMoves[0].arcData!.clockwise).toBe(false);
  });

  it("handles R-format arcs", () => {
    const r = backplotEngine.parse("G1 X0 Y0 F100\nG2 X10 Y0 R5");
    const arcMoves = r.moves.filter(m => m.type === "arc");
    expect(arcMoves.length).toBeGreaterThanOrEqual(12);
  });

  it("computes statistics", () => {
    const r = backplotEngine.parse(sampleGcode);
    expect(r.statistics.totalMoves).toBeGreaterThan(0);
    expect(r.statistics.rapidDistance).toBeGreaterThan(0);
    expect(r.statistics.feedDistance).toBeGreaterThan(0);
    expect(r.statistics.totalDistance).toBeCloseTo(
      r.statistics.rapidDistance + r.statistics.feedDistance, 2,
    );
    expect(r.statistics.machiningTime).toBeGreaterThan(0);
  });

  it("computes bounding box", () => {
    const r = backplotEngine.parse("G0 X-10 Y20 Z-5\nG0 X50 Y-30 Z10");
    expect(r.statistics.boundingBox.min.x).toBe(-10);
    expect(r.statistics.boundingBox.max.x).toBe(50);
    expect(r.statistics.boundingBox.min.y).toBe(-30);
    expect(r.statistics.boundingBox.max.y).toBe(20);
  });

  it("strips comments and N-numbers", () => {
    const r = backplotEngine.parse(
      "N10 G0 X10 (rapid move)\n; comment\nN20 G1 X20 F100",
    );
    expect(r.moves).toHaveLength(2);
  });

  it("handles incremental mode", () => {
    const r = backplotEngine.parse("G90 G0 X10\nG91\nG0 X5");
    expect(r.moves[1].to.x).toBe(15); // 10 + 5
  });

  it("returns empty for empty input", () => {
    const r = backplotEngine.parse("");
    expect(r.moves).toHaveLength(0);
    expect(r.statistics.totalMoves).toBe(0);
  });

  it("statistics() shortcut works", () => {
    const s = backplotEngine.statistics("G0 X10 Y20");
    expect(s.totalMoves).toBe(1);
    expect(s.rapidDistance).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// RLPostProcessorEngine
// ═══════════════════════════════════════════════════════════════
describe("RLPostProcessorEngine", () => {
  it("creates processor with defaults", () => {
    const p = rlPostProcessorEngine.createProcessor("FANUC");
    expect(p.controllerType).toBe("FANUC");
    expect(p.epsilon).toBe(0.1);
    expect(p.learningRate).toBe(0.1);
    expect(Object.keys(p.Q)).toHaveLength(0);
  });

  it("generates G-code deterministically", () => {
    const p = rlPostProcessorEngine.createProcessor("FANUC");
    const toolpath = [
      { type: "rapid" as const, x: 0, y: 0, z: 5 },
      { type: "linear" as const, x: 10, y: 20, z: -1, f: 200 },
      { type: "rapid" as const, x: 0, y: 0, z: 50 },
    ];
    const r = rlPostProcessorEngine.generateCode(
      p, toolpath, { deterministic: true },
    );
    expect(r.gcode).toContain("G0");
    expect(r.gcode).toContain("G1");
    expect(r.gcode).toContain("M30");
    expect(r.lineCount).toBeGreaterThan(3);
  });

  it("learns from positive feedback", () => {
    const p = rlPostProcessorEngine.createProcessor("HAAS");
    const r = rlPostProcessorEngine.learn(p, {
      codeLineIndex: 0,
      executionTime: 5,
      expectedTime: 10,
      error: false,
      surfaceQuality: 0.9,
    });
    expect(r.reward).toBe(18); // 10 + 5 + 3
    expect(r.totalExperiences).toBe(1);
    expect(r.updatedQValue).toBeGreaterThan(0);
  });

  it("learns from negative feedback (error)", () => {
    const p = rlPostProcessorEngine.createProcessor("HAAS");
    const r = rlPostProcessorEngine.learn(p, {
      codeLineIndex: 0,
      executionTime: 20,
      expectedTime: 10,
      error: true,
      surfaceQuality: 0.3,
    });
    expect(r.reward).toBe(-20);
  });

  it("tracks stats", () => {
    const p = rlPostProcessorEngine.createProcessor("FANUC");
    rlPostProcessorEngine.learn(p, {
      codeLineIndex: 0, executionTime: 5,
      expectedTime: 10, error: false, surfaceQuality: 0.9,
    });
    const s = rlPostProcessorEngine.stats(p);
    expect(s.totalExperiences).toBe(1);
    expect(s.avgReward).toBe(18);
    expect(s.qTableSize).toBeGreaterThan(0);
  });

  it("formats compact output without spaces", () => {
    const p = rlPostProcessorEngine.createProcessor("FANUC");
    // Train Q-table to prefer compact
    p.Q["rapid_start_compact"] = 100;
    const toolpath = [
      { type: "rapid" as const, x: 10, y: 20, z: 5 },
    ];
    const r = rlPostProcessorEngine.generateCode(
      p, toolpath, { deterministic: true },
    );
    expect(r.gcode).toContain("G0X10Y20Z5");
    expect(r.formatsUsed.compact).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// JohnsonCookEngine
// ═══════════════════════════════════════════════════════════════
describe("JohnsonCookEngine", () => {
  it("calculates flow stress for 4140 steel", () => {
    const r = johnsonCookEngine.calculateFlowStress("4140", 0.1, 100, 400);
    expect(r).not.toBeNull();
    expect(r!.stress).toBeGreaterThan(0);
    expect(r!.category).toBe("steels");
    expect(r!.strainTerm).toBeGreaterThan(598); // > A alone
    expect(r!.rateTerm).toBeGreaterThan(1);     // strain rate boost
    expect(r!.thermalTerm).toBeLessThanOrEqual(1);
  });

  it("calculates flow stress for Ti-6Al-4V", () => {
    const r = johnsonCookEngine.calculateFlowStress("Ti_Grade5", 0.2, 1000, 600);
    expect(r).not.toBeNull();
    expect(r!.stress).toBeGreaterThan(500);
    expect(r!.category).toBe("titanium");
  });

  it("thermal softening at high temp", () => {
    const cold = johnsonCookEngine.calculateFlowStress("7075_T6", 0.1, 1, 300)!;
    const hot = johnsonCookEngine.calculateFlowStress("7075_T6", 0.1, 1, 600)!;
    expect(hot.stress).toBeLessThan(cold.stress);
    expect(hot.T_star).toBeGreaterThan(cold.T_star);
  });

  it("returns null for unknown material", () => {
    expect(johnsonCookEngine.calculateFlowStress("unobtanium", 0.1, 1, 300))
      .toBeNull();
  });

  it("getParams returns JC parameters", () => {
    const p = johnsonCookEngine.getParams("304");
    expect(p).not.toBeNull();
    expect(p!.A).toBe(310);
    expect(p!.C).toBe(0.07);
    expect(p!.T_melt).toBe(1723);
  });

  it("listAll returns 60+ materials", () => {
    const all = johnsonCookEngine.listAll();
    expect(all.length).toBeGreaterThanOrEqual(60);
  });

  it("listCategory works", () => {
    expect(johnsonCookEngine.listCategory("titanium")).toContain("Ti_Grade5");
    expect(johnsonCookEngine.listCategory("copper")).toContain("C17200");
  });

  it("search finds materials", () => {
    const r = johnsonCookEngine.search("inconel");
    expect(r.length).toBe(2);
    expect(r[0].category).toBe("nickel");
  });

  it("count matches listAll length", () => {
    expect(johnsonCookEngine.count()).toBe(johnsonCookEngine.listAll().length);
  });

  it("strain rate sensitivity increases stress", () => {
    const low = johnsonCookEngine.calculateFlowStress("1045", 0.1, 1, 300)!;
    const high = johnsonCookEngine.calculateFlowStress("1045", 0.1, 10000, 300)!;
    expect(high.stress).toBeGreaterThan(low.stress);
    expect(high.rateTerm).toBeGreaterThan(low.rateTerm);
  });
});
