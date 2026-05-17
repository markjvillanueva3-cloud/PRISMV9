/**
 * dispatcher.machineModelIndex.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-MACH-MODELS dispatcher wiring.
 *
 * Drives 4 READ-ONLY actions through real `prism_dev`:
 *
 *   - machine_models_sources  → static getSources() — config-only (zero IO)
 *   - machine_models_audit    → static audit()      — summary aggregation
 *   - machine_models_harvest  → static harvest()    — full filesystem scan
 *   - machine_models_filter   → composes harvest + findByOem + findByType
 *
 * NO WRITE METHODS EXIST — pure filesystem-read engine.
 *
 * Filesystem coupling: engine reads `H:/prism/resources/MACHINE MODELS …`
 * + `H:/prism/resources/GENERIC MACHINE MODELS`. Assertions are written
 * to remain valid when those dirs are absent (count=0 on fresh checkout).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { MachineModelIndexEngine } from "../engines/MachineModelIndexEngine.js";

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

describe("WIRE-UNWIRED-MS0/U-WIRE-MACH-MODELS — Zod schemas", () => {
  it("machine_models_sources accepts {} (no params)", () => {
    expect(ACTION_DEV_SCHEMAS["machine_models_sources"].safeParse({}).success).toBe(true);
  });

  it("machine_models_audit accepts {} (no params)", () => {
    expect(ACTION_DEV_SCHEMAS["machine_models_audit"].safeParse({}).success).toBe(true);
  });

  it("machine_models_harvest accepts {} (no params)", () => {
    expect(ACTION_DEV_SCHEMAS["machine_models_harvest"].safeParse({}).success).toBe(true);
  });

  it("machine_models_filter rejects {} (refine guard requires ≥1 filter)", () => {
    expect(ACTION_DEV_SCHEMAS["machine_models_filter"].safeParse({}).success).toBe(false);
  });

  it("machine_models_filter accepts single oem", () => {
    expect(ACTION_DEV_SCHEMAS["machine_models_filter"].safeParse({ oem: "HAAS" }).success).toBe(true);
  });

  it("machine_models_filter accepts single machineType", () => {
    expect(ACTION_DEV_SCHEMAS["machine_models_filter"].safeParse({ machineType: "vmc" }).success).toBe(true);
  });

  it("machine_models_filter rejects machineType outside the 12-value enum", () => {
    expect(ACTION_DEV_SCHEMAS["machine_models_filter"].safeParse({ machineType: "not_real" }).success).toBe(false);
  });

  it("machine_models_filter rejects empty oem", () => {
    expect(ACTION_DEV_SCHEMAS["machine_models_filter"].safeParse({ oem: "" }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MACH-MODELS — prism_dev :: machine_models_sources", () => {
  it("ROUTING PROOF — returns hard-coded source paths + expected counts", async () => {
    const r = await invokeHandler(devHandler, "machine_models_sources", {});
    const sources = (r as { sources: { oemRoot: string; genericRoot: string; expectedOemSubdirs: number; expectedGenericModels: number } }).sources;
    expect(sources.expectedOemSubdirs).toBe(12);
    expect(sources.expectedGenericModels).toBe(34);
    expect(typeof sources.oemRoot).toBe("string");
    expect(typeof sources.genericRoot).toBe("string");
    expect(sources.oemRoot.length).toBeGreaterThan(0);
    expect(sources.genericRoot.length).toBeGreaterThan(0);
  });

  it("wire sources byte-equals engine-direct getSources()", async () => {
    const r = await invokeHandler(devHandler, "machine_models_sources", {});
    const wire = (r as { sources: unknown }).sources;
    const direct = MachineModelIndexEngine.getSources();
    expect(JSON.stringify(wire)).toBe(JSON.stringify(direct));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MACH-MODELS — prism_dev :: machine_models_harvest", () => {
  it("returns a structured harvest with the expected top-level shape", async () => {
    const r = await invokeHandler(devHandler, "machine_models_harvest", {});
    const harvest = (r as { harvest: { models?: unknown[]; totalModels?: number; oemCount?: number; timestamp?: string } }).harvest;
    expect(typeof harvest).toBe("object");
    expect(typeof (harvest.totalModels as number | undefined) ?? 0).toBe("number");
    expect(typeof (harvest.oemCount as number | undefined) ?? 0).toBe("number");
    expect(typeof (harvest.timestamp as string | undefined) ?? "").toBe("string");
  });

  it("ROUTING PROOF — wire totalModels == (harvest.models ?? []).length", async () => {
    const r = await invokeHandler(devHandler, "machine_models_harvest", {});
    const harvest = (r as { harvest: { models?: unknown[]; totalModels?: number } }).harvest;
    const modelsLen = (harvest.models ?? []).length;
    expect((harvest.totalModels as number | undefined) ?? 0).toBe(modelsLen);
  });

  it("count parity with engine-direct harvest()", async () => {
    const r = await invokeHandler(devHandler, "machine_models_harvest", {});
    const harvest = (r as { harvest: { totalModels?: number } }).harvest;
    const direct = await MachineModelIndexEngine.harvest();
    expect((harvest.totalModels as number | undefined) ?? 0).toBe(direct.totalModels);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MACH-MODELS — prism_dev :: machine_models_audit", () => {
  it("audit totalModels matches harvest totalModels (ROUTING PROOF)", async () => {
    const auditR = await invokeHandler(devHandler, "machine_models_audit", {});
    const harvestR = await invokeHandler(devHandler, "machine_models_harvest", {});
    const audit = (auditR as { audit: { totalModels?: number } }).audit;
    const harvest = (harvestR as { harvest: { totalModels?: number } }).harvest;
    expect((audit.totalModels as number | undefined) ?? 0).toBe((harvest.totalModels as number | undefined) ?? 0);
  });

  it("audit genericCount + oemModelCount == totalModels (invariant)", async () => {
    const r = await invokeHandler(devHandler, "machine_models_audit", {});
    const audit = (r as { audit: { totalModels?: number; genericCount?: number; oemModelCount?: number } }).audit;
    const total = (audit.totalModels as number | undefined) ?? 0;
    const generic = (audit.genericCount as number | undefined) ?? 0;
    const oem = (audit.oemModelCount as number | undefined) ?? 0;
    expect(generic + oem).toBe(total);
  });

  it("audit oemCount equals Object.keys(byOem).length (invariant)", async () => {
    const r = await invokeHandler(devHandler, "machine_models_audit", {});
    const audit = (r as { audit: { oemCount?: number; byOem?: Record<string, number> } }).audit;
    const oemKeys = Object.keys(audit.byOem ?? {}).length;
    expect((audit.oemCount as number | undefined) ?? 0).toBe(oemKeys);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MACH-MODELS — prism_dev :: machine_models_filter", () => {
  it("filter by oem='HAAS' → every model has oem='HAAS' (case-insensitive)", async () => {
    const r = await invokeHandler(devHandler, "machine_models_filter", { oem: "HAAS" });
    const data = r as { models?: Array<{ oem: string }>; count?: number; totalAvailable?: number };
    for (const m of data.models ?? []) {
      expect(m.oem.toUpperCase()).toBe("HAAS");
    }
    expect((data.count as number | undefined) ?? 0).toBe((data.models ?? []).length);
    expect((data.models ?? []).length).toBeLessThanOrEqual((data.totalAvailable as number | undefined) ?? 0);
  });

  it("filter by machineType='vmc' → every model has machineType='vmc'", async () => {
    const r = await invokeHandler(devHandler, "machine_models_filter", { machineType: "vmc" });
    const data = r as { models?: Array<{ machineType: string }> };
    for (const m of data.models ?? []) {
      expect(m.machineType).toBe("vmc");
    }
  });

  it("composed filter (oem='MAZAK' AND machineType='mill_turn') → both conditions hold", async () => {
    const r = await invokeHandler(devHandler, "machine_models_filter", {
      oem: "MAZAK", machineType: "mill_turn",
    });
    const data = r as { models?: Array<{ oem: string; machineType: string }> };
    for (const m of data.models ?? []) {
      expect(m.oem.toUpperCase()).toBe("MAZAK");
      expect(m.machineType).toBe("mill_turn");
    }
  });

  it("filtersApplied echo matches request", async () => {
    const r = await invokeHandler(devHandler, "machine_models_filter", {
      oem: "OKUMA", machineType: "lathe",
    });
    const data = r as { filtersApplied?: { oem?: string; machineType?: string } };
    expect(data.filtersApplied?.oem).toBe("OKUMA");
    expect(data.filtersApplied?.machineType).toBe("lathe");
  });

  it("ROUTING PROOF — wire filter count parity with engine-direct findByOem()", async () => {
    const harvest = await MachineModelIndexEngine.harvest();
    const directFiltered = MachineModelIndexEngine.findByOem(harvest.models, "HAAS");
    const r = await invokeHandler(devHandler, "machine_models_filter", { oem: "HAAS" });
    const data = r as { count?: number };
    expect((data.count as number | undefined) ?? 0).toBe(directFiltered.length);
  });

  it("totalAvailable == harvest totalModels (must match)", async () => {
    const direct = await MachineModelIndexEngine.harvest();
    const r = await invokeHandler(devHandler, "machine_models_filter", { oem: "HAAS" });
    const data = r as { totalAvailable?: number };
    expect((data.totalAvailable as number | undefined) ?? 0).toBe(direct.totalModels);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MACH-MODELS — error envelope", () => {
  it("machine_models_filter without any filter → schema rejects (refine guard)", async () => {
    const r = await invokeHandler(devHandler, "machine_models_filter", {});
    const data = r as { error?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });

  it("machine_models_filter with invalid machineType → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "machine_models_filter", { machineType: "totally_bogus" });
    const data = r as { error?: string; details?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
    expect(`${data.error ?? ""} ${data.details ?? ""}`).toMatch(/machineType|enum|invalid/i);
  });
});
