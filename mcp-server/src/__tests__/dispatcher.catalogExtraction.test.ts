/**
 * dispatcher.catalogExtraction.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-CEX dispatcher wiring.
 *
 * Drives 2 READ-ONLY actions through real `prism_dev`. Mutating methods
 * (init, extractFromPDF, mergeWithExisting) DEFERRED — they take
 * arbitrary file paths AND mutate the engine's extractedTools store.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { catalogExtractionEngine } from "../engines/CatalogExtractionEngine.js";

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

describe("WIRE-UNWIRED-MS0/U-WIRE-CEX — Zod schemas", () => {
  it("cex_stats accepts {}", () => {
    expect(ACTION_DEV_SCHEMAS["cex_stats"].safeParse({}).success).toBe(true);
  });

  it("cex_export_typescript requires non-empty manufacturer", () => {
    expect(ACTION_DEV_SCHEMAS["cex_export_typescript"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cex_export_typescript"].safeParse({ manufacturer: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cex_export_typescript"].safeParse({ manufacturer: "sandvik" }).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CEX — prism_dev :: cex_stats", () => {
  it("returns a stats object", async () => {
    const r = await invokeHandler(devHandler, "cex_stats", {});
    const stats = (r as { stats?: unknown }).stats;
    expect(typeof stats).toBe("object");
    expect(stats === null).toBe(false);
  });

  it("ROUTING PROOF — wire stats byte-equals engine-direct getStats()", async () => {
    const r = await invokeHandler(devHandler, "cex_stats", {});
    const wire = (r as { stats: unknown }).stats;
    const direct = catalogExtractionEngine.getStats();
    expect(JSON.stringify(wire)).toBe(JSON.stringify(direct));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CEX — prism_dev :: cex_export_typescript", () => {
  it("unknown manufacturer → empty source string + length=0", async () => {
    const r = await invokeHandler(devHandler, "cex_export_typescript", {
      manufacturer: "no_such_mfr_" + Date.now(),
    });
    const data = r as { source?: string; manufacturer?: string; length?: number };
    expect((data.source ?? "")).toBe("");
    expect((data.length as number | undefined) ?? 0).toBe(0);
  });

  it("manufacturer echo round-trips in response", async () => {
    const r = await invokeHandler(devHandler, "cex_export_typescript", { manufacturer: "sandvik" });
    expect((r as { manufacturer?: string }).manufacturer).toBe("sandvik");
  });

  it("ROUTING PROOF — wire source byte-equals engine-direct exportToTypeScript('sandvik')", async () => {
    const r = await invokeHandler(devHandler, "cex_export_typescript", { manufacturer: "sandvik" });
    const wire = ((r as { source?: string }).source) ?? "";
    const direct = await catalogExtractionEngine.exportToTypeScript("sandvik");
    expect(wire).toBe(direct);
  });

  it("VARIABILITY — 3 distinct manufacturer queries each get distinct echoes", async () => {
    const a = await invokeHandler(devHandler, "cex_export_typescript", { manufacturer: "sandvik" });
    const b = await invokeHandler(devHandler, "cex_export_typescript", { manufacturer: "kennametal" });
    const c = await invokeHandler(devHandler, "cex_export_typescript", { manufacturer: "iscar" });
    expect((a as { manufacturer?: string }).manufacturer).toBe("sandvik");
    expect((b as { manufacturer?: string }).manufacturer).toBe("kennametal");
    expect((c as { manufacturer?: string }).manufacturer).toBe("iscar");
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-CEX — error envelope", () => {
  it("cex_export_typescript without manufacturer → schema rejects with mention", async () => {
    const r = await invokeHandler(devHandler, "cex_export_typescript", {});
    const data = r as { error?: string; details?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
    expect(`${data.error ?? ""} ${data.details ?? ""}`).toMatch(/manufacturer/i);
  });
});
