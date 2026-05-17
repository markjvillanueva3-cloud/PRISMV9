/**
 * dispatcher.wiringPotential.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-WP (WiringPotentialEngine).
 *
 * 2 pure-read meta-wiring actions through real `prism_dev`:
 *   wp_analyze        → analyze(engineName, opts)
 *   wp_analyze_batch  → analyzeBatch(engineNames[], opts)
 *
 * Schema restriction: capacityFile / capacityReport / masterIndex
 * NOT exposed (path-traversal + non-serializable).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { wiringPotentialEngine } from "../engines/WiringPotentialEngine.js";

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

describe("WIRE-UNWIRED-MS0/U-WIRE-WP — Zod schemas", () => {
  it("wp_analyze requires non-empty engine_name + caps at 256", () => {
    expect(ACTION_DEV_SCHEMAS["wp_analyze"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wp_analyze"].safeParse({ engine_name: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wp_analyze"].safeParse({ engine_name: "GCodeTemplateEngine" }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["wp_analyze"].safeParse({ engine_name: "x".repeat(257) }).success).toBe(false);
  });

  it("wp_analyze caps top_k at 10 + min_confidence in [0,1]", () => {
    expect(ACTION_DEV_SCHEMAS["wp_analyze"].safeParse({
      engine_name: "X", top_k: 11,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wp_analyze"].safeParse({
      engine_name: "X", min_confidence: 1.5,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wp_analyze"].safeParse({
      engine_name: "X", min_confidence: -0.1,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wp_analyze"].safeParse({
      engine_name: "X", top_k: 5, min_confidence: 0.5,
    }).success).toBe(true);
  });

  it("wp_analyze_batch requires 1-100 engine_names", () => {
    expect(ACTION_DEV_SCHEMAS["wp_analyze_batch"].safeParse({ engine_names: [] }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wp_analyze_batch"].safeParse({
      engine_names: ["A"],
    }).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["wp_analyze_batch"].safeParse({
      engine_names: new Array(101).fill("X"),
    }).success).toBe(false);
  });

  it("PATH-TRAVERSAL GUARD — capacityFile not in schema; Zod parse strips it (does NOT reach engine)", () => {
    // Hostile caller tries to pass capacityFile pointing at sensitive
    // file. Schema must NOT include capacityFile in the parsed output.
    const parsed = ACTION_DEV_SCHEMAS["wp_analyze"].safeParse({
      engine_name: "X", capacityFile: "/etc/passwd",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      // Strict check: parsed data has only the 3 allowed fields.
      const keys = Object.keys(parsed.data).sort();
      expect(keys).toEqual(["engine_name"]);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WP — prism_dev :: wp_analyze", () => {
  it("returns engine_name echo + report with candidates[] + warnings[] + count discriminators", async () => {
    const r = await invokeHandler(devHandler, "wp_analyze", {
      engine_name: "ExtractionWiringEngine",
    });
    expect(r.engine_name).toBe("ExtractionWiringEngine");
    const report = (r as { report: { engineName: string; generatedAt: string; candidates?: unknown[]; warnings?: unknown[] } }).report;
    expect(report.engineName).toBe("ExtractionWiringEngine");
    const candidates = report.candidates ?? [];
    const warnings = report.warnings ?? [];
    expect((r.candidate_count as number | undefined) ?? 0).toBe(candidates.length);
    expect((r.warning_count as number | undefined) ?? 0).toBe(warnings.length);
  });

  it("VARIABILITY — 3 distinct engine names all echo their engineName in the report", async () => {
    const names = ["KienzleForceModel", "SpeedFeedOrchestrator", "TaylorToolLife"];
    for (const name of names) {
      const r = await invokeHandler(devHandler, "wp_analyze", { engine_name: name });
      expect(r.engine_name).toBe(name);
      const report = (r as { report: { engineName: string } }).report;
      // Cross-field echo: input must round-trip into report.engineName.
      expect(report.engineName).toBe(name);
    }
  });

  it("ROUTING PROOF — wire candidate_count equals engine-direct analyze().candidates.length", async () => {
    const args = { engine_name: "ExtractionWiringEngine" };
    const r = await invokeHandler(devHandler, "wp_analyze", args);
    const direct = await wiringPotentialEngine.analyze(args.engine_name);
    expect((r.candidate_count as number | undefined) ?? 0).toBe(direct.candidates.length);
  });

  it("top_k cap enforced: returned candidate count <= top_k when supplied", async () => {
    const r = await invokeHandler(devHandler, "wp_analyze", {
      engine_name: "ExtractionWiringEngine", top_k: 1,
    });
    const candidates = ((r as { report: { candidates?: unknown[] } }).report.candidates) ?? [];
    expect(candidates.length).toBeLessThanOrEqual(1);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WP — prism_dev :: wp_analyze_batch", () => {
  it("returns input_count + reports[] + report_count parity (1 input → 1 report)", async () => {
    const r = await invokeHandler(devHandler, "wp_analyze_batch", {
      engine_names: ["ExtractionWiringEngine"],
    });
    expect(r.input_count).toBe(1);
    const reports = (r.reports as unknown[] | undefined) ?? [];
    expect(reports.length).toBe(1);
    expect((r.report_count as number | undefined) ?? 0).toBe(reports.length);
  });

  it("VARIABILITY — 3-input batch returns 3 reports with matching engineName in order", async () => {
    const names = ["A_PRObE", "B_PRObE", "C_PRObE"];
    const r = await invokeHandler(devHandler, "wp_analyze_batch", { engine_names: names });
    const reports = (r.reports as Array<{ engineName: string }>);
    expect(reports.length).toBe(3);
    expect(reports[0]?.engineName).toBe("A_PRObE");
    expect(reports[1]?.engineName).toBe("B_PRObE");
    expect(reports[2]?.engineName).toBe("C_PRObE");
  });

  it("ROUTING PROOF — wire batch length equals engine-direct analyzeBatch length", async () => {
    const names = ["X", "Y", "Z"];
    const r = await invokeHandler(devHandler, "wp_analyze_batch", { engine_names: names });
    const direct = await wiringPotentialEngine.analyzeBatch(names);
    const wireReports = (r.reports as unknown[] | undefined) ?? [];
    expect(wireReports.length).toBe(direct.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WP — error envelope", () => {
  it("wp_analyze without engine_name → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wp_analyze", {});
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("wp_analyze with top_k > 10 → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wp_analyze", {
      engine_name: "X", top_k: 999,
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("wp_analyze_batch with > 100 engine_names → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wp_analyze_batch", {
      engine_names: new Array(500).fill("X"),
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
