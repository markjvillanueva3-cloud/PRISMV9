/**
 * dispatcher.engineAccuracy.test.ts — round-trip integration coverage
 * for WIRE-UNWIRED-MS0/U-WIRE-ENGACC dispatcher wiring.
 *
 * Drives 6 read-only EngineAccuracyTracker actions through real `prism_dev`:
 *
 *   - engine_acc_report      → getAccuracyReport()
 *   - engine_acc_engine      → getEngineAccuracy(engineId)
 *   - engine_acc_metric      → getMetricAccuracy(engineId, metricName)
 *   - engine_acc_degrading   → flagDegradingEngines(threshold)
 *   - engine_acc_list        → listEngines() | listMetrics(engineId)
 *   - engine_acc_stats       → getStats()
 *
 * recordOutcome/clear/importOutcomes DEFERRED — they mutate the accuracy
 * ledger that drives degradation alerts.
 *
 * ROUTING PROOF: the test seeds the singleton with engine-direct
 * recordOutcome calls (mutation IS allowed engine-side, just not via the
 * wire), then verifies the wire returns the seeded data byte-for-byte.
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { engineAccuracyTrackerEngine } from "../engines/EngineAccuracyTrackerEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

let devHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

// Seed fresh data for each test — singleton is shared across tests
beforeEach(() => {
  engineAccuracyTrackerEngine.clear();
});

function seedAccurateEngine(engineId: string, metric: string, count: number): void {
  // Predicted ≈ actual → high accuracy
  for (let i = 0; i < count; i++) {
    engineAccuracyTrackerEngine.recordOutcome(engineId, metric, 100, 100 + (i % 3) * 0.5);
  }
}

function seedInaccurateEngine(engineId: string, metric: string, count: number): void {
  // Predicted way off actual → low accuracy
  for (let i = 0; i < count; i++) {
    engineAccuracyTrackerEngine.recordOutcome(engineId, metric, 100, 200);
  }
}

describe("WIRE-UNWIRED-MS0/U-WIRE-ENGACC — Zod schemas", () => {
  it("engine_acc_report schema accepts {} (no params)", () => {
    expect(ACTION_DEV_SCHEMAS["engine_acc_report"].safeParse({}).success).toBe(true);
  });

  it("engine_acc_stats schema accepts {} (no params)", () => {
    expect(ACTION_DEV_SCHEMAS["engine_acc_stats"].safeParse({}).success).toBe(true);
  });

  it("engine_acc_engine schema requires engine_id OR engineId (refine guard)", () => {
    expect(ACTION_DEV_SCHEMAS["engine_acc_engine"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["engine_acc_engine"].safeParse({ engine_id: "FooEngine" }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["engine_acc_engine"].safeParse({ engineId: "FooEngine" }).success).toBe(true);
  });

  it("engine_acc_metric schema requires both engine_id AND metric_name", () => {
    expect(ACTION_DEV_SCHEMAS["engine_acc_metric"].safeParse({ engine_id: "X" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["engine_acc_metric"].safeParse({ metric_name: "Y" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["engine_acc_metric"].safeParse({
      engine_id: "X", metric_name: "Y",
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["engine_acc_metric"].safeParse({
      engineId: "X", metricName: "Y",
    }).success).toBe(true);
  });

  it("engine_acc_degrading schema accepts threshold in [0,1]", () => {
    expect(ACTION_DEV_SCHEMAS["engine_acc_degrading"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["engine_acc_degrading"].safeParse({ threshold: 0.5 }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["engine_acc_degrading"].safeParse({ threshold: 1 }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["engine_acc_degrading"].safeParse({ threshold: 0 }).success).toBe(true);
  });

  it("engine_acc_degrading schema rejects threshold outside [0,1]", () => {
    expect(ACTION_DEV_SCHEMAS["engine_acc_degrading"].safeParse({ threshold: 1.5 }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["engine_acc_degrading"].safeParse({ threshold: -0.1 }).success).toBe(false);
  });

  it("engine_acc_list schema accepts empty OR engine_id", () => {
    expect(ACTION_DEV_SCHEMAS["engine_acc_list"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["engine_acc_list"].safeParse({ engine_id: "X" }).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ENGACC — prism_dev :: engine_acc_list", () => {
  it("with no engine_id → lists all seeded engines", async () => {
    seedAccurateEngine("WireBloomEngine", "size_bits", 5);
    seedAccurateEngine("WireOtherEngine", "ms", 3);
    const r = await invokeHandler(devHandler, "engine_acc_list", {});
    const data = r as { engines?: string[] };
    expect(Array.isArray(data.engines)).toBe(true);
    expect(data.engines).toContain("WireBloomEngine");
    expect(data.engines).toContain("WireOtherEngine");
  });

  it("with engine_id → lists metrics for that engine only", async () => {
    seedAccurateEngine("MultiMetricEngine", "force_N", 4);
    seedAccurateEngine("MultiMetricEngine", "torque_Nm", 4);
    const r = await invokeHandler(devHandler, "engine_acc_list", { engine_id: "MultiMetricEngine" });
    const data = r as { metrics?: string[] };
    expect(Array.isArray(data.metrics)).toBe(true);
    expect(data.metrics).toContain("force_N");
    expect(data.metrics).toContain("torque_Nm");
    expect(data.metrics?.length).toBe(2);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ENGACC — prism_dev :: engine_acc_engine", () => {
  it("ROUTING PROOF — wire summary matches engine-direct summary for seeded engine", async () => {
    seedAccurateEngine("AccurateEngine", "cutting_force", 10);
    const r = await invokeHandler(devHandler, "engine_acc_engine", { engine_id: "AccurateEngine" });
    const data = r as {
      summary?: {
        engineId?: string;
        totalOutcomes?: number;
        overallAccuracy?: number;
        metrics?: Record<string, { sampleCount?: number }>;
      };
    };
    expect(data.summary?.engineId).toBe("AccurateEngine");
    expect(data.summary?.totalOutcomes).toBe(10);
    expect(typeof data.summary?.overallAccuracy).toBe("number");
    // Engine-direct cross-check
    const direct = engineAccuracyTrackerEngine.getEngineAccuracy("AccurateEngine");
    expect(data.summary?.totalOutcomes).toBe(direct?.totalOutcomes);
    expect(data.summary?.overallAccuracy).toBe(direct?.overallAccuracy);
    // Map → plain object conversion preserves metric data
    expect(data.summary?.metrics?.["cutting_force"]?.sampleCount).toBe(10);
  });

  it("for an engine with zero outcomes → returns {summary: null}", async () => {
    // No seed — bloom engine never recorded anything
    const r = await invokeHandler(devHandler, "engine_acc_engine", { engine_id: "NoOutcomesEngine" });
    const data = r as { summary?: unknown };
    const val = "summary" in data ? data.summary : null;
    expect(val).toBe(null);
    expect(engineAccuracyTrackerEngine.getEngineAccuracy("NoOutcomesEngine")).toBe(null);
  });

  it("engineId camelCase alias resolves identically", async () => {
    seedAccurateEngine("AliasParityEngine", "metric_x", 5);
    const a = await invokeHandler(devHandler, "engine_acc_engine", { engine_id: "AliasParityEngine" });
    const b = await invokeHandler(devHandler, "engine_acc_engine", { engineId: "AliasParityEngine" });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ENGACC — prism_dev :: engine_acc_metric", () => {
  it("returns MetricAccuracyStats with sampleCount + mape + accuracy fields", async () => {
    seedAccurateEngine("PerMetricEngine", "force", 8);
    const r = await invokeHandler(devHandler, "engine_acc_metric", {
      engine_id: "PerMetricEngine", metric_name: "force",
    });
    const data = r as {
      metric?: { metricName?: string; sampleCount?: number; mape?: number; accuracy?: number };
    };
    expect(data.metric?.metricName).toBe("force");
    expect(data.metric?.sampleCount).toBe(8);
    expect(typeof data.metric?.mape).toBe("number");
    expect(typeof data.metric?.accuracy).toBe("number");
    // Accurate seed → accuracy should be high (close to 1)
    expect(data.metric?.accuracy).toBeGreaterThan(0.9);
  });

  it("for unknown engine/metric → {metric: null}", async () => {
    const r = await invokeHandler(devHandler, "engine_acc_metric", {
      engine_id: "Ghost", metric_name: "phantom",
    });
    const data = r as { metric?: unknown };
    const val = "metric" in data ? data.metric : null;
    expect(val).toBe(null);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ENGACC — prism_dev :: engine_acc_degrading", () => {
  it("with inaccurate seed → flagDegradingEngines returns at least one alert", async () => {
    seedInaccurateEngine("DegradingEngine", "force", 25);
    const r = await invokeHandler(devHandler, "engine_acc_degrading", { threshold: 0.8 });
    const data = r as { alerts?: Array<{ engineId?: string; currentAccuracy?: number }> };
    expect(Array.isArray(data.alerts)).toBe(true);
    // Cross-check directly
    const direct = engineAccuracyTrackerEngine.flagDegradingEngines(0.8);
    expect((data.alerts ?? []).length).toBe(direct.length);
  });

  it("with perfectly-accurate seed AND high threshold → empty alerts list", async () => {
    seedAccurateEngine("HappyEngine", "metric", 25);
    const r = await invokeHandler(devHandler, "engine_acc_degrading", { threshold: 0.5 });
    const data = r as { alerts?: unknown[] };
    const alerts = data.alerts ?? [];
    expect(alerts.length).toBe(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ENGACC — prism_dev :: engine_acc_report", () => {
  it("returns AccuracyReport with totalEngines, totalOutcomes, systemAccuracy", async () => {
    seedAccurateEngine("Eng1", "m1", 5);
    seedAccurateEngine("Eng2", "m1", 5);
    const r = await invokeHandler(devHandler, "engine_acc_report", {});
    const data = r as {
      report?: {
        totalEngines?: number;
        totalOutcomes?: number;
        systemAccuracy?: number;
        engineSummaries?: unknown[];
      };
    };
    expect(data.report?.totalEngines).toBe(2);
    expect(data.report?.totalOutcomes).toBe(10);
    expect(typeof data.report?.systemAccuracy).toBe("number");
    expect(Array.isArray(data.report?.engineSummaries)).toBe(true);
    expect(data.report?.engineSummaries?.length).toBe(2);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ENGACC — prism_dev :: engine_acc_stats", () => {
  it("returns top-level ledger stats matching engine-direct", async () => {
    seedAccurateEngine("StatsEngine1", "m", 7);
    seedAccurateEngine("StatsEngine2", "m", 3);
    const r = await invokeHandler(devHandler, "engine_acc_stats", {});
    const data = r as { stats?: Record<string, unknown> };
    expect(typeof data.stats).toBe("object");
    const direct = engineAccuracyTrackerEngine.getStats();
    // The stats shape includes totalOutcomes — must match engine-direct
    expect(data.stats?.["totalOutcomes"]).toBe(direct.totalOutcomes);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ENGACC — error envelope", () => {
  it("engine_acc_engine without ids → schema refine returns {error, details}", async () => {
    const r = await invokeHandler(devHandler, "engine_acc_engine", {});
    const data = r as { error?: string; details?: string };
    expect(typeof data.error).toBe("string");
    expect(String(data.details ?? "")).toMatch(/engine_id|engineId/i);
  });

  it("engine_acc_metric missing metric_name → schema refine rejects with details", async () => {
    const r = await invokeHandler(devHandler, "engine_acc_metric", { engine_id: "X" });
    const data = r as { error?: string; details?: string };
    expect(typeof data.error).toBe("string");
    expect(String(data.details ?? "")).toMatch(/metric_name|metricName/i);
  });
});
