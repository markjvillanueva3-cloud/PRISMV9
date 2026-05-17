/**
 * dispatcher.machineCapabilityIndex.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-MACH-CAP dispatcher wiring.
 *
 * Drives 4 READ-ONLY actions through real `prism_dev`:
 *
 *   - machine_cap_query   → query({type, minAxes, capability, limit})
 *   - machine_cap_get     → getMachine(id)
 *   - machine_cap_find    → findCapable([requiredCaps])
 *   - machine_cap_stats   → getStats()
 *
 * reset() DEFERRED (U-WIRE-MACH-CAP-WRITE) — wipes in-memory index
 * which could disrupt concurrent capability queries from other callers.
 *
 * ROUTING PROOF: wire results byte-equal engine-direct calls on the
 * same (already-initialized) singleton instance.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { machineCapabilityIndexEngine } from "../engines/MachineCapabilityIndexEngine.js";

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

beforeAll(async () => {
  // Pre-initialize the engine so wire + direct calls see the same seed set.
  await machineCapabilityIndexEngine.getStats();

  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MACH-CAP — Zod schemas", () => {
  it("machine_cap_query accepts {} (all filters optional)", () => {
    expect(ACTION_DEV_SCHEMAS["machine_cap_query"].safeParse({}).success).toBe(true);
  });

  it("machine_cap_query rejects negative minAxes", () => {
    expect(ACTION_DEV_SCHEMAS["machine_cap_query"].safeParse({ minAxes: -1 }).success).toBe(false);
  });

  it("machine_cap_query rejects empty type string", () => {
    expect(ACTION_DEV_SCHEMAS["machine_cap_query"].safeParse({ type: "" }).success).toBe(false);
  });

  it("machine_cap_query rejects limit > 1000 (DoS guard)", () => {
    expect(ACTION_DEV_SCHEMAS["machine_cap_query"].safeParse({ limit: 1001 }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["machine_cap_query"].safeParse({ limit: 1000 }).success).toBe(true);
  });

  it("machine_cap_get requires non-empty id", () => {
    expect(ACTION_DEV_SCHEMAS["machine_cap_get"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["machine_cap_get"].safeParse({ id: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["machine_cap_get"].safeParse({ id: "mach_1" }).success).toBe(true);
  });

  it("machine_cap_find requires non-empty capabilities array", () => {
    expect(ACTION_DEV_SCHEMAS["machine_cap_find"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["machine_cap_find"].safeParse({ capabilities: [] }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["machine_cap_find"].safeParse({ capabilities: ["probing"] }).success).toBe(true);
  });

  it("machine_cap_find rejects empty-string capability", () => {
    expect(ACTION_DEV_SCHEMAS["machine_cap_find"].safeParse({ capabilities: [""] }).success).toBe(false);
  });

  it("machine_cap_stats accepts {} (no params)", () => {
    expect(ACTION_DEV_SCHEMAS["machine_cap_stats"].safeParse({}).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MACH-CAP — prism_dev :: machine_cap_stats", () => {
  it("ROUTING PROOF — wire stats byte-equal engine-direct getStats()", async () => {
    const r = await invokeHandler(devHandler, "machine_cap_stats", {});
    const wireStats = (r as { stats: unknown }).stats;
    const direct = await machineCapabilityIndexEngine.getStats();
    expect(JSON.stringify(wireStats)).toBe(JSON.stringify(direct));
  });

  it("totalMachines matches the seeded set (25 = 5 types × 5 controllers)", async () => {
    const r = await invokeHandler(devHandler, "machine_cap_stats", {});
    const stats = (r as { stats: { totalMachines: number; averageCapabilities: number } }).stats;
    expect(stats.totalMachines).toBe(25);
    expect(stats.averageCapabilities).toBeGreaterThanOrEqual(0);
    expect(stats.averageCapabilities).toBeLessThanOrEqual(6);
  });

  it("byType includes the 5 seeded types and the counts sum to totalMachines", async () => {
    const r = await invokeHandler(devHandler, "machine_cap_stats", {});
    const stats = (r as { stats: { totalMachines: number; byType: Record<string, number> } }).stats;
    for (const type of ["mill", "lathe", "wedm", "grinder", "sinker-edm"]) {
      expect(stats.byType[type]).toBe(5);
    }
    const sum = Object.values(stats.byType).reduce((a, b) => a + b, 0);
    expect(sum).toBe(stats.totalMachines);
  });

  it("byController includes the 5 seeded controllers", async () => {
    const r = await invokeHandler(devHandler, "machine_cap_stats", {});
    const stats = (r as { stats: { byController: Record<string, number> } }).stats;
    for (const ctrl of ["Fanuc", "Siemens", "Okuma", "Haas", "Mitsubishi"]) {
      expect(stats.byController[ctrl]).toBe(5);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MACH-CAP — prism_dev :: machine_cap_query", () => {
  it("type='mill' → every returned machine has type 'mill' AND count parity with engine-direct", async () => {
    const r = await invokeHandler(devHandler, "machine_cap_query", { type: "mill" });
    const data = r as { machines: Array<{ type: string }>; count: number };
    const direct = await machineCapabilityIndexEngine.query({ type: "mill" });
    expect(data.machines.length).toBe(direct.length);
    expect(data.count).toBe(direct.length);
    for (const m of data.machines) expect(m.type).toBe("mill");
  });

  it("minAxes=5 → every returned machine has axes >= 5", async () => {
    const r = await invokeHandler(devHandler, "machine_cap_query", { minAxes: 5 });
    const data = r as { machines: Array<{ axes: number }> };
    for (const m of data.machines) expect(m.axes).toBeGreaterThanOrEqual(5);
  });

  it("capability='probing' → every returned machine includes 'probing'", async () => {
    const r = await invokeHandler(devHandler, "machine_cap_query", { capability: "probing" });
    const data = r as { machines: Array<{ capabilities: string[] }> };
    for (const m of data.machines) expect(m.capabilities.includes("probing")).toBe(true);
  });

  it("limit=3 → result length <= 3", async () => {
    const r = await invokeHandler(devHandler, "machine_cap_query", { limit: 3 });
    const data = r as { machines: unknown[]; count: number };
    expect(data.machines.length).toBeLessThanOrEqual(3);
    expect(data.count).toBe(data.machines.length);
  });

  it("type='nonexistent_xyz' → 0 results (slimResponse may strip both empty array AND count=0)", async () => {
    const r = await invokeHandler(devHandler, "machine_cap_query", { type: "nonexistent_xyz" });
    const data = r as { machines?: unknown[]; count?: number };
    expect((data.machines ?? []).length).toBe(0);
    expect(data.count ?? 0).toBe(0);
    // Cross-check: engine-direct must also return 0
    const direct = await machineCapabilityIndexEngine.query({ type: "nonexistent_xyz" });
    expect(direct.length).toBe(0);
  });

  it("{} (no filters) → returns up to default limit (50) machines", async () => {
    const r = await invokeHandler(devHandler, "machine_cap_query", {});
    const data = r as { machines: unknown[] };
    expect(data.machines.length).toBeGreaterThan(0);
    expect(data.machines.length).toBeLessThanOrEqual(50);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MACH-CAP — prism_dev :: machine_cap_get", () => {
  it("real id → wire entry matches engine-direct field-by-field (slimResponse may strip empty limitations[])", async () => {
    const all = await machineCapabilityIndexEngine.query({ limit: 1 });
    expect(all.length).toBeGreaterThan(0);
    const knownId = all[0]!.id;
    const r = await invokeHandler(devHandler, "machine_cap_get", { id: knownId });
    const data = r as { machine: { id?: string; name?: string; type?: string; controller?: string; axes?: number; capabilities?: string[]; limitations?: string[] } | null };
    expect(data.machine).not.toBe(null);
    const direct = await machineCapabilityIndexEngine.getMachine(knownId);
    expect(direct).not.toBe(null);
    // Per-field equality — slimResponse strips empty arrays so direct.limitations=[] may be absent on the wire
    expect(data.machine?.id).toBe(direct?.id);
    expect(data.machine?.name).toBe(direct?.name);
    expect(data.machine?.type).toBe(direct?.type);
    expect(data.machine?.controller).toBe(direct?.controller);
    expect(data.machine?.axes).toBe(direct?.axes);
    expect(JSON.stringify(data.machine?.capabilities ?? [])).toBe(JSON.stringify(direct?.capabilities ?? []));
    expect(JSON.stringify(data.machine?.limitations ?? [])).toBe(JSON.stringify(direct?.limitations ?? []));
  });

  it("unknown id → wire returns null AND engine-direct also returns null", async () => {
    const sentinel = "definitely-not-a-real-machine-zzz-" + Date.now();
    const r = await invokeHandler(devHandler, "machine_cap_get", { id: sentinel });
    const data = r as { machine: unknown };
    // slimResponse may strip null → check both possibilities
    const wireValue = "machine" in data ? data.machine : null;
    expect(wireValue === null || wireValue === undefined).toBe(true);
    const direct = await machineCapabilityIndexEngine.getMachine(sentinel);
    expect(direct).toBe(null);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MACH-CAP — prism_dev :: machine_cap_find", () => {
  it("single cap → every returned machine includes it AND count parity", async () => {
    const r = await invokeHandler(devHandler, "machine_cap_find", { capabilities: ["probing"] });
    const data = r as { machines: Array<{ capabilities: string[] }>; count: number };
    const direct = await machineCapabilityIndexEngine.findCapable(["probing"]);
    expect(data.machines.length).toBe(direct.length);
    expect(data.count).toBe(direct.length);
    for (const m of data.machines) expect(m.capabilities.includes("probing")).toBe(true);
  });

  it("AND-match — every returned machine has BOTH requested caps", async () => {
    // findCapable AND-matches; if no overlap exists in this seeded fleet, count may be 0 — both valid
    const r = await invokeHandler(devHandler, "machine_cap_find", {
      capabilities: ["probing", "5-axis"],
    });
    const data = r as { machines: Array<{ capabilities: string[] }> };
    for (const m of data.machines) {
      expect(m.capabilities.includes("probing")).toBe(true);
      expect(m.capabilities.includes("5-axis")).toBe(true);
    }
  });

  it("impossible cap → 0 results (slimResponse may strip both empty array AND count=0)", async () => {
    const sentinelCap = "nonexistent_capability_zzz_" + Date.now();
    const r = await invokeHandler(devHandler, "machine_cap_find", {
      capabilities: [sentinelCap],
    });
    const data = r as { machines?: unknown[]; count?: number };
    expect((data.machines ?? []).length).toBe(0);
    expect(data.count ?? 0).toBe(0);
    // Cross-check: engine-direct must also return 0
    const direct = await machineCapabilityIndexEngine.findCapable([sentinelCap]);
    expect(direct.length).toBe(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-MACH-CAP — error envelope", () => {
  it("machine_cap_get without id → schema rejects with mention of 'id'", async () => {
    const r = await invokeHandler(devHandler, "machine_cap_get", {});
    const data = r as { error?: string; details?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
    expect(`${data.error ?? ""} ${data.details ?? ""}`).toMatch(/id/i);
  });

  it("machine_cap_find without capabilities → schema rejects with mention of 'capabilit'", async () => {
    const r = await invokeHandler(devHandler, "machine_cap_find", {});
    const data = r as { error?: string; details?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
    expect(`${data.error ?? ""} ${data.details ?? ""}`).toMatch(/capabilit/i);
  });

  it("machine_cap_query with limit=1001 → schema rejects (DoS guard)", async () => {
    const r = await invokeHandler(devHandler, "machine_cap_query", { limit: 1001 });
    const data = r as { error?: string; details?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });
});
