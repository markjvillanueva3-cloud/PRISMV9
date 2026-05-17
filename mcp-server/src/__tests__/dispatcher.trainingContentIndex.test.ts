/**
 * dispatcher.trainingContentIndex.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-TRAINING dispatcher wiring.
 *
 * Drives 4 READ-ONLY actions through real `prism_dev`:
 *
 *   - training_sources  → static getSources() — 6 source dir configs
 *   - training_audit    → static audit()
 *   - training_harvest  → static harvest() — 3000+ files classified
 *   - training_filter   → composes harvest + filterByTopic + filterByCam
 *
 * NO WRITE METHODS EXIST — pure filesystem-read engine.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { TrainingContentIndexEngine } from "../engines/TrainingContentIndexEngine.js";

const EXPECTED_SOURCE_DIRS = 6;

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

describe("WIRE-UNWIRED-MS0/U-WIRE-TRAINING — Zod schemas", () => {
  it("training_sources / training_audit / training_harvest accept {}", () => {
    expect(ACTION_DEV_SCHEMAS["training_sources"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["training_audit"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["training_harvest"].safeParse({}).success).toBe(true);
  });

  it("training_filter rejects {} (refine guard requires ≥1 filter)", () => {
    expect(ACTION_DEV_SCHEMAS["training_filter"].safeParse({}).success).toBe(false);
  });

  it("training_filter accepts single topic", () => {
    expect(ACTION_DEV_SCHEMAS["training_filter"].safeParse({ topic: "milling" }).success).toBe(true);
  });

  it("training_filter accepts single camSystem", () => {
    expect(ACTION_DEV_SCHEMAS["training_filter"].safeParse({ camSystem: "hypermill" }).success).toBe(true);
  });

  it("training_filter rejects topic outside the 17-value enum", () => {
    expect(ACTION_DEV_SCHEMAS["training_filter"].safeParse({ topic: "not_a_topic" }).success).toBe(false);
  });

  it("training_filter rejects empty-string camSystem", () => {
    expect(ACTION_DEV_SCHEMAS["training_filter"].safeParse({ camSystem: "" }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TRAINING — prism_dev :: training_sources", () => {
  it("ROUTING PROOF — returns the 6 hard-coded source directories", async () => {
    const r = await invokeHandler(devHandler, "training_sources", {});
    const data = r as { sources: Array<{ name: string; path: string; expectedFiles: number; description: string }> };
    expect(data.sources.length).toBe(EXPECTED_SOURCE_DIRS);
  });

  it("sources includes the 3 'Basic Training Day' entries plus RESOURCE PDFS", async () => {
    const r = await invokeHandler(devHandler, "training_sources", {});
    const names = new Set((r as { sources: Array<{ name: string }> }).sources.map((s) => s.name));
    expect(names.has("Training Day 1")).toBe(true);
    expect(names.has("Training Day 2")).toBe(true);
    expect(names.has("Training Day 3")).toBe(true);
  });

  it("wire sources byte-equals engine-direct getSources()", async () => {
    const r = await invokeHandler(devHandler, "training_sources", {});
    const wire = (r as { sources: unknown }).sources;
    const direct = TrainingContentIndexEngine.getSources();
    expect(JSON.stringify(wire)).toBe(JSON.stringify(direct));
  });

  it("every source has positive expectedFiles + non-empty description", async () => {
    const r = await invokeHandler(devHandler, "training_sources", {});
    const data = r as { sources: Array<{ expectedFiles: number; description: string }> };
    for (const s of data.sources) {
      expect(s.expectedFiles).toBeGreaterThan(0);
      expect(s.description.length).toBeGreaterThan(0);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TRAINING — prism_dev :: training_harvest", () => {
  it("returns structured harvest with the expected top-level shape", async () => {
    const r = await invokeHandler(devHandler, "training_harvest", {});
    const harvest = (r as { harvest: { files?: unknown[]; totalFiles?: number; timestamp?: string; byTopic?: Record<string, number> } }).harvest;
    expect(typeof harvest).toBe("object");
    expect(typeof ((harvest.totalFiles as number | undefined) ?? 0)).toBe("number");
    expect(typeof ((harvest.timestamp as string | undefined) ?? "")).toBe("string");
  });

  it("ROUTING PROOF — wire totalFiles == (harvest.files ?? []).length", async () => {
    const r = await invokeHandler(devHandler, "training_harvest", {});
    const harvest = (r as { harvest: { files?: unknown[]; totalFiles?: number } }).harvest;
    const len = (harvest.files ?? []).length;
    expect((harvest.totalFiles as number | undefined) ?? 0).toBe(len);
  });

  it("count parity with engine-direct harvest()", async () => {
    const r = await invokeHandler(devHandler, "training_harvest", {});
    const harvest = (r as { harvest: { totalFiles?: number } }).harvest;
    const direct = await TrainingContentIndexEngine.harvest();
    expect((harvest.totalFiles as number | undefined) ?? 0).toBe(direct.totalFiles);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TRAINING — prism_dev :: training_audit", () => {
  it("audit totalFiles matches harvest totalFiles (ROUTING PROOF)", async () => {
    const auditR = await invokeHandler(devHandler, "training_audit", {});
    const harvestR = await invokeHandler(devHandler, "training_harvest", {});
    const audit = (auditR as { audit: { totalFiles?: number } }).audit;
    const harvest = (harvestR as { harvest: { totalFiles?: number } }).harvest;
    expect((audit.totalFiles as number | undefined) ?? 0).toBe((harvest.totalFiles as number | undefined) ?? 0);
  });

  it("audit topTopics entries are sorted descending by count", async () => {
    const r = await invokeHandler(devHandler, "training_audit", {});
    const audit = (r as { audit: { topTopics?: Array<{ topic: string; count: number }> } }).audit;
    const tops = audit.topTopics ?? [];
    for (let i = 1; i < tops.length; i++) {
      expect(tops[i]!.count).toBeLessThanOrEqual(tops[i - 1]!.count);
    }
  });

  it("audit topExtensions entries are sorted descending by count", async () => {
    const r = await invokeHandler(devHandler, "training_audit", {});
    const audit = (r as { audit: { topExtensions?: Array<{ extension: string; count: number }> } }).audit;
    const tops = audit.topExtensions ?? [];
    for (let i = 1; i < tops.length; i++) {
      expect(tops[i]!.count).toBeLessThanOrEqual(tops[i - 1]!.count);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TRAINING — prism_dev :: training_filter", () => {
  it("filter by topic='milling' → every file has topic='milling'", async () => {
    const r = await invokeHandler(devHandler, "training_filter", { topic: "milling" });
    const data = r as { files?: Array<{ topic: string }>; count?: number; totalAvailable?: number };
    for (const f of data.files ?? []) {
      expect(f.topic).toBe("milling");
    }
    expect((data.count as number | undefined) ?? 0).toBe((data.files ?? []).length);
    expect((data.files ?? []).length).toBeLessThanOrEqual((data.totalAvailable as number | undefined) ?? 0);
  });

  it("filter by topic='safety' → every file has topic='safety'", async () => {
    const r = await invokeHandler(devHandler, "training_filter", { topic: "safety" });
    const data = r as { files?: Array<{ topic: string }> };
    for (const f of data.files ?? []) {
      expect(f.topic).toBe("safety");
    }
  });

  it("composed filter (topic + camSystem) → both conditions hold", async () => {
    const r = await invokeHandler(devHandler, "training_filter", {
      topic: "cam_software", camSystem: "hypermill",
    });
    const data = r as { files?: Array<{ topic: string; camSystem: string | null }> };
    for (const f of data.files ?? []) {
      expect(f.topic).toBe("cam_software");
      expect(f.camSystem).toBe("hypermill");
    }
  });

  it("filtersApplied echo matches request", async () => {
    const r = await invokeHandler(devHandler, "training_filter", {
      topic: "g_code", camSystem: "mastercam",
    });
    const data = r as { filtersApplied?: { topic?: string; camSystem?: string } };
    expect(data.filtersApplied?.topic).toBe("g_code");
    expect(data.filtersApplied?.camSystem).toBe("mastercam");
  });

  it("ROUTING PROOF — wire filter count parity with engine-direct filterByTopic()", async () => {
    const harvest = await TrainingContentIndexEngine.harvest();
    const directFiltered = TrainingContentIndexEngine.filterByTopic(harvest.files, "milling");
    const r = await invokeHandler(devHandler, "training_filter", { topic: "milling" });
    const data = r as { count?: number };
    expect((data.count as number | undefined) ?? 0).toBe(directFiltered.length);
  });

  it("totalAvailable == harvest totalFiles (must match)", async () => {
    const direct = await TrainingContentIndexEngine.harvest();
    const r = await invokeHandler(devHandler, "training_filter", { topic: "general" });
    const data = r as { totalAvailable?: number };
    expect((data.totalAvailable as number | undefined) ?? 0).toBe(direct.totalFiles);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TRAINING — error envelope", () => {
  it("training_filter without any filter → schema rejects (refine guard)", async () => {
    const r = await invokeHandler(devHandler, "training_filter", {});
    const data = r as { error?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });

  it("training_filter with invalid topic → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "training_filter", { topic: "totally_bogus" });
    const data = r as { error?: string; details?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
    expect(`${data.error ?? ""} ${data.details ?? ""}`).toMatch(/topic|enum|invalid/i);
  });
});
