/**
 * CAMAnalyzeEngine — strict-legitimacy tests
 * Coverage: class shape, schemas, metric computation, engagement,
 * issue detection (efficiency/engagement/SFM/air-cutting), score, compare, getAnalysis.
 */
import { describe, it, expect } from "vitest";
import {
  CAMAnalyzeEngine,
  camAnalyzeEngine,
  OperationAnalysisSchema,
  ToolpathInputSchema,
  type ToolpathInput,
} from "../engines/CAMAnalyzeEngine.js";

const TOOL_DIAMETER_MM = 12.7;
const FEED_MMPM = 1500;
const STEPOVER_MM = 6.35; // 50% radial
const STEPDOWN_MM = 6.35; // 50% axial
const SPINDLE_RPM_LOW = 6000;
const SPINDLE_RPM_HIGH_FOR_STEEL = 25000;
const HIGH_RADIAL_STEPOVER_MM = 9.0; // 71% radial → triggers warning
const HIGH_AXIAL_STEPDOWN_MM = 22.0; // 1.73xD → triggers safety
const RAPID_RATE_MMPM = 10000;
const MAX_OVERALL_SCORE = 100;

const baseTp = (overrides: Partial<ToolpathInput> = {}): ToolpathInput => ({
  name: "OP_TEST",
  type: "milling",
  toolDiameter: TOOL_DIAMETER_MM,
  spindleSpeed: SPINDLE_RPM_LOW,
  feedRate: FEED_MMPM,
  stepover: STEPOVER_MM,
  stepdown: STEPDOWN_MM,
  points: [
    { x: 0, y: 0, z: 5, type: "rapid" },
    { x: 0, y: 0, z: -1, type: "linear" },
    { x: 50, y: 0, z: -1, type: "linear" },
    { x: 50, y: 50, z: -1, type: "linear" },
  ],
  ...overrides,
});

describe("CAMAnalyzeEngine — class shape + schemas", () => {
  it("static methods are callable and return shaped results", () => {
    const a = CAMAnalyzeEngine.analyze(baseTp());
    expect(a.id.startsWith("ANA-")).toBe(true);
    expect(CAMAnalyzeEngine.getAnalysis(a.id)?.id).toBe(a.id);
    const cmp = CAMAnalyzeEngine.compare([a]);
    expect(cmp.best).toBe(a.id);
    expect(CAMAnalyzeEngine.getSelfAwareness().name).toBe("CAMAnalyzeEngine");
  });

  it("singleton is instance of CAMAnalyzeEngine", () => {
    expect(camAnalyzeEngine instanceof CAMAnalyzeEngine).toBe(true);
  });

  it("ToolpathInput schema validates a well-formed sample", () => {
    const parsed = ToolpathInputSchema.parse(baseTp());
    expect(parsed.name).toBe("OP_TEST");
    expect(parsed.points.length).toBe(4);
  });

  it("OperationAnalysis schema validates output of analyze", () => {
    const result = CAMAnalyzeEngine.analyze(baseTp());
    const parsed = OperationAnalysisSchema.parse(result);
    expect(parsed.id.startsWith("ANA-")).toBe(true);
  });
});

describe("CAMAnalyzeEngine — metrics", () => {
  it("computes total distance + classifies by destination point type", () => {
    const r = CAMAnalyzeEngine.analyze(baseTp());
    // Engine classifies each move by destination point's `.type`:
    // p0→p1: dest linear, dz=6  → cutting (+6)
    // p1→p2: dest linear, dx=50 → cutting (+50)
    // p2→p3: dest linear, dy=50 → cutting (+50)
    expect(r.metrics.totalDistance).toBe(106);
    expect(r.metrics.rapidDistance).toBe(0);
    expect(r.metrics.cuttingDistance).toBe(106);
  });

  it("rapid destination point increments rapidDistance", () => {
    const tp = baseTp({
      points: [
        { x: 0, y: 0, z: 0, type: "linear" },
        { x: 100, y: 0, z: 0, type: "rapid" }, // dest=rapid → rapid bucket
      ],
    });
    const r = CAMAnalyzeEngine.analyze(tp);
    expect(r.metrics.rapidDistance).toBe(100);
    expect(r.metrics.cuttingDistance).toBe(0);
  });

  it("computes cuttingTime = cuttingDistance / feedRate", () => {
    const r = CAMAnalyzeEngine.analyze(baseTp());
    const expected = Math.round((106 / FEED_MMPM) * 100) / 100;
    expect(r.metrics.cuttingTime).toBe(expected);
  });

  it("rapidTime uses 10000 mm/min default rapid rate", () => {
    const tp = baseTp({
      points: [
        { x: 0, y: 0, z: 0, type: "linear" },
        { x: RAPID_RATE_MMPM, y: 0, z: 0, type: "rapid" }, // 10000 mm rapid → 1.0 min
      ],
    });
    const r = CAMAnalyzeEngine.analyze(tp);
    expect(r.metrics.totalTime).toBe(1);
  });

  it("efficiency is high when cutting >> rapid", () => {
    const r = CAMAnalyzeEngine.analyze(baseTp());
    expect(r.metrics.efficiency).toBeGreaterThan(50);
  });

  it("MRR avg = stepover * stepdown * feed", () => {
    const r = CAMAnalyzeEngine.analyze(baseTp());
    expect(r.metrics.mrrAvg).toBe(Math.round(STEPOVER_MM * STEPDOWN_MM * FEED_MMPM));
  });
});

describe("CAMAnalyzeEngine — issue detection", () => {
  it("flags HIGH_RADIAL_ENGAGEMENT when stepover > 60% of diameter", () => {
    const r = CAMAnalyzeEngine.analyze(baseTp({ stepover: HIGH_RADIAL_STEPOVER_MM }));
    expect(r.issues.some((i) => i.code === "HIGH_RADIAL_ENGAGEMENT")).toBe(true);
  });

  it("flags HIGH_AXIAL_ENGAGEMENT as safety when axial > 1.5xD", () => {
    const r = CAMAnalyzeEngine.analyze(baseTp({ stepdown: HIGH_AXIAL_STEPDOWN_MM }));
    const safety = r.issues.find((i) => i.code === "HIGH_AXIAL_ENGAGEMENT");
    expect(safety).not.toBe(undefined);
    expect(safety!.type).toBe("safety");
  });

  it("flags HIGH_SFM warning for steel-typed operation at very high RPM", () => {
    const r = CAMAnalyzeEngine.analyze(
      baseTp({ type: "milling-steel", spindleSpeed: SPINDLE_RPM_HIGH_FOR_STEEL }),
    );
    expect(r.issues.some((i) => i.code === "HIGH_SFM")).toBe(true);
  });

  it("flags LOW_EFFICIENCY when rapidTime dominates cuttingTime", () => {
    // rapidTime = 10000mm / 10000 mm/min = 1.0 min
    // cuttingTime = 1mm / 1500 mm/min ≈ 0.00067 min
    // efficiency ≈ 0.07% → far below 50% threshold
    const rapidDominated: ToolpathInput = {
      ...baseTp(),
      points: [
        { x: 0, y: 0, z: 0, type: "linear" },
        { x: RAPID_RATE_MMPM, y: 0, z: 0, type: "rapid" }, // long rapid
        { x: RAPID_RATE_MMPM + 1, y: 0, z: 0, type: "linear" }, // 1mm cut
      ],
    };
    const r = CAMAnalyzeEngine.analyze(rapidDominated);
    expect(r.issues.some((i) => i.code === "LOW_EFFICIENCY")).toBe(true);
  });
});

describe("CAMAnalyzeEngine — score", () => {
  it("safety score reduced by safety + warning issues", () => {
    const safe = CAMAnalyzeEngine.analyze(baseTp()).score.safety;
    const unsafe = CAMAnalyzeEngine.analyze(baseTp({ stepdown: HIGH_AXIAL_STEPDOWN_MM })).score.safety;
    expect(unsafe).toBeLessThan(safe);
  });

  it("overall score is bounded [0..100] and integer", () => {
    const r = CAMAnalyzeEngine.analyze(baseTp());
    expect(r.score.overall).toBeGreaterThanOrEqual(0);
    expect(r.score.overall).toBeLessThanOrEqual(MAX_OVERALL_SCORE);
    expect(Number.isInteger(r.score.overall)).toBe(true);
  });

  it("efficiency score is capped at 100", () => {
    const r = CAMAnalyzeEngine.analyze(baseTp());
    expect(r.score.efficiency).toBeLessThanOrEqual(MAX_OVERALL_SCORE);
  });
});

describe("CAMAnalyzeEngine — compare + getAnalysis", () => {
  it("compare ranks higher score first and recommends best", () => {
    const a1 = CAMAnalyzeEngine.analyze(baseTp({ name: "A" }));
    const a2 = CAMAnalyzeEngine.analyze(
      baseTp({ name: "B", stepdown: HIGH_AXIAL_STEPDOWN_MM }),
    );
    const cmp = CAMAnalyzeEngine.compare([a1, a2]);
    expect(cmp.best).toBe(a1.id);
    expect(cmp.recommendation.includes("A")).toBe(true);
  });

  it("compare with single analysis still returns it as best", () => {
    const a1 = CAMAnalyzeEngine.analyze(baseTp());
    const cmp = CAMAnalyzeEngine.compare([a1]);
    expect(cmp.best).toBe(a1.id);
    expect(cmp.comparison.length).toBe(1);
  });

  it("getAnalysis returns previously stored analysis", () => {
    const a = CAMAnalyzeEngine.analyze(baseTp());
    const fetched = CAMAnalyzeEngine.getAnalysis(a.id);
    expect(fetched).not.toBe(undefined);
    expect(fetched!.id).toBe(a.id);
  });

  it("getAnalysis returns undefined for unknown id", () => {
    expect(CAMAnalyzeEngine.getAnalysis("ANA-NOT-REAL-XYZ")).toBe(undefined);
  });
});

describe("CAMAnalyzeEngine — adversarial inputs", () => {
  it("handles single-point toolpath without crash", () => {
    const r = CAMAnalyzeEngine.analyze(baseTp({ points: [{ x: 0, y: 0, z: 0, type: "linear" }] }));
    expect(r.metrics.totalDistance).toBe(0);
    expect(r.metrics.cuttingDistance).toBe(0);
  });

  it("handles zero stepover/stepdown without divide-by-zero", () => {
    const r = CAMAnalyzeEngine.analyze(baseTp({ stepover: 0, stepdown: 0 }));
    expect(r.toolEngagement.avgRadialEngagement).toBe(0);
    expect(r.toolEngagement.avgAxialEngagement).toBe(0);
    expect(r.metrics.mrrAvg).toBe(0);
  });

  it("variability: 3 distinct operation types analyzed", () => {
    const types = ["roughing", "finishing-steel", "drilling"];
    const results = types.map((t) =>
      CAMAnalyzeEngine.analyze(baseTp({ type: t, name: `OP_${t}` })),
    );
    expect(results.length).toBe(3);
    expect(results.every((r) => r.operationType.length > 0)).toBe(true);
  });

  it("very high feedRate yields very small cuttingTime", () => {
    const r = CAMAnalyzeEngine.analyze(baseTp({ feedRate: 1_000_000 }));
    expect(r.metrics.cuttingTime).toBeLessThan(1);
  });
});
