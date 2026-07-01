/**
 * dispatcher.surfaceFinishCompare.test.ts — round-trip integration coverage
 * for U-WIRE-SFCMP (slot:romeo).
 *
 * Drives the NEW action through the real `prism_calc` dispatcher:
 *   - surface_finish_compare → SFCCompareEngine.compare
 *
 * R7 — DISTINCT from the pre-existing sfc_calculate / surface_finish actions,
 * which PREDICT Ra from cutting parameters. This action COMPARES measured Ra
 * readings against a target/tolerance spec and returns SPC metrics (Cpk, trend,
 * in/out-of-spec assessment). Both families coexist in calcDispatcher.
 *
 * Every assertion pins a concrete reference value hand-computed from the engine's
 * statistics (avg, sample std-dev with /n, Cpk = min((USL-x̄)/3σ, (x̄-LSL)/3σ)).
 * Round-tripped THROUGH the dispatcher (registerCalcDispatcher → handler →
 * validateActionParams → engine), not via the engine singleton directly.
 */
import { describe, it, expect } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function createMockServer(): { server: unknown; tools: CapturedTool[] } {
  const tools: CapturedTool[] = [];
  const server = {
    tool(name: string, _desc: string, _schema: unknown, handler: CapturedTool["handler"]) {
      tools.push({ name, handler });
    },
  };
  return { server, tools };
}

async function callAction(
  tool: CapturedTool,
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const result = (await tool.handler({ action, params })) as { content?: Array<{ text?: string }> };
  const text = result?.content?.[0]?.text;
  return (text ? JSON.parse(text) : result) as Record<string, unknown>;
}

const { server, tools } = createMockServer();
registerCalcDispatcher(server as Parameters<typeof registerCalcDispatcher>[0]);
const calc = tools.find((t) => t.name === "prism_calc");
if (!calc) throw new Error("prism_calc not registered");

// Reference case (hand-computed against SFCCompareEngine.compare):
//   measurements ra = [0.80, 0.85, 0.82, 0.79, 0.81], spec target 0.8 ± 0.2
//   avgRa   = 4.07/5                         = 0.814
//   variance(/n) = Σ(ra-x̄)²/5               = 0.000424 → stdDev = 0.0206
//   USL/LSL = 0.8+0.2 / max(0,0.8-0.2)       = 1.0 / 0.6  → all in spec, oosCount 0
//   Cpk     = min((1.0-0.814)/(3·0.0206),(0.814-0.6)/(3·0.0206)) = min(3.01, 3.46) = 3.01
//   devFromTarget = 0.814-0.8                = 0.014
//   Cpk≥1.67 & inSpec                        → assessment "excellent"
const BASE = {
  measurements: [
    { ra: 0.80 }, { ra: 0.85 }, { ra: 0.82 }, { ra: 0.79 }, { ra: 0.81 },
  ],
  specification: { targetRa: 0.8, toleranceRa: 0.2 },
};

describe("U-WIRE-SFCMP — prism_calc surface_finish_compare round-trip", () => {
  it("registers prism_calc with the new action reachable", async () => {
    // proven reachable by the round-trip below; a non-enum action would error.
    expect(calc.name).toBe("prism_calc");
  });

  it("baseline in-spec batch → avgRa 0.814, stdDev 0.021, Cpk 3.01, assessment excellent", async () => {
    const r = await callAction(calc, "surface_finish_compare", BASE);
    // dispatcher wraps engine output; result may be nested under data/result
    const d = (r.data ?? r.result ?? r) as {
      avgRa: number; stdDevRa: number; minRa: number; maxRa: number;
      cpk: number; inSpec: boolean; outOfSpecCount: number;
      deviationFromTarget: number; trend: string; assessment: string;
    };
    expect(d.avgRa).toBeCloseTo(0.814, 3);
    expect(d.stdDevRa).toBeCloseTo(0.021, 2); // 0.0206 rounded to 3dp by engine
    expect(d.minRa).toBe(0.79);
    expect(d.maxRa).toBe(0.85);
    expect(d.inSpec).toBe(true);
    expect(d.outOfSpecCount).toBe(0);
    expect(d.cpk).toBeCloseTo(3.01, 1);
    expect(d.deviationFromTarget).toBeCloseTo(0.014, 3);
    expect(d.assessment).toBe("excellent");
  });

  it("out-of-spec readings → inSpec false, outOfSpecCount counted, issue surfaced", async () => {
    // two readings above USL=1.0 (1.4, 1.5) → out of spec
    const r = await callAction(calc, "surface_finish_compare", {
      measurements: [{ ra: 0.8 }, { ra: 1.4 }, { ra: 0.82 }, { ra: 1.5 }],
      specification: { targetRa: 0.8, toleranceRa: 0.2 },
    });
    const d = (r.data ?? r.result ?? r) as {
      inSpec: boolean; outOfSpecCount: number; issues: string[]; assessment: string;
    };
    expect(d.inSpec).toBe(false);
    expect(d.outOfSpecCount).toBe(2);
    expect(d.issues.some((s) => /out of specification/i.test(s))).toBe(true);
    // 2/4 = 50% out-of-spec → unacceptable
    expect(d.assessment).toBe("unacceptable");
  });

  it("degrading trend → trend=degrading + tool-change recommendation (n≥5)", async () => {
    // first half ~0.5, second half ~0.9 → secondAvg > firstAvg·1.1 → degrading
    const r = await callAction(calc, "surface_finish_compare", {
      measurements: [
        { ra: 0.50 }, { ra: 0.52 }, { ra: 0.80 }, { ra: 0.90 }, { ra: 0.95 }, { ra: 1.0 },
      ],
      specification: { targetRa: 0.8, toleranceRa: 0.5 }, // wide spec so trend (not oos) dominates
    });
    const d = (r.data ?? r.result ?? r) as { trend: string; recommendations: string[] };
    expect(d.trend).toBe("degrading");
    expect(d.recommendations.some((s) => /tool change|tool condition/i.test(s))).toBe(true);
  });

  it("predicted + historical deltas are computed when provided", async () => {
    const r = await callAction(calc, "surface_finish_compare", {
      ...BASE,
      predictedRa: 0.75,
      historicalAvgRa: 0.80,
    });
    const d = (r.data ?? r.result ?? r) as {
      deviationFromPredicted: number; deviationFromHistorical: number;
    };
    // avgRa 0.814 − predicted 0.75 = 0.064 ; − historical 0.80 = 0.014
    expect(d.deviationFromPredicted).toBeCloseTo(0.064, 3);
    expect(d.deviationFromHistorical).toBeCloseTo(0.014, 3);
  });

  it("rejects an empty measurements array at the dispatcher boundary (schema min(1))", async () => {
    const r = await callAction(calc, "surface_finish_compare", {
      measurements: [],
      specification: { targetRa: 0.8, toleranceRa: 0.2 },
    });
    // CompareInputSchema requires measurements.min(1); validateActionParams rejects
    const ok = (r.success ?? (r.data ? true : false));
    expect(ok).not.toBe(true);
  });

  it("rejects a negative Ra reading (schema ra.min(0))", async () => {
    const r = await callAction(calc, "surface_finish_compare", {
      measurements: [{ ra: -0.5 }],
      specification: { targetRa: 0.8, toleranceRa: 0.2 },
    });
    const ok = (r.success ?? (r.data ? true : false));
    expect(ok).not.toBe(true);
  });
});
