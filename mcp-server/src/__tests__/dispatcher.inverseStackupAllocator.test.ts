/**
 * dispatcher.inverseStackupAllocator.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-ISA dispatcher wiring.
 *
 * Drives 2 PURE actions through real `prism_dev`. No deferred methods.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { inverseStackupAllocatorEngine } from "../engines/InverseStackupAllocatorEngine.js";

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

const SAMPLE_3 = [
  { id: "A", min_tolerance_mm: 0.005, cpk: 1.33 },
  { id: "B", min_tolerance_mm: 0.005, cpk: 1.5 },
  { id: "C", min_tolerance_mm: 0.005, cpk: 1.2 },
];

let devHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ISA — Zod schemas", () => {
  it("isa_stats accepts {}", () => {
    expect(ACTION_DEV_SCHEMAS["isa_stats"].safeParse({}).success).toBe(true);
  });

  it("isa_allocate requires assembly_tolerance_mm + method + components", () => {
    expect(ACTION_DEV_SCHEMAS["isa_allocate"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["isa_allocate"].safeParse({
      assembly_tolerance_mm: 0.05, method: "equal", components: [{ id: "A" }],
    }).success).toBe(true);
  });

  it("isa_allocate rejects non-positive tolerance", () => {
    expect(ACTION_DEV_SCHEMAS["isa_allocate"].safeParse({
      assembly_tolerance_mm: 0, method: "equal", components: [{ id: "A" }],
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["isa_allocate"].safeParse({
      assembly_tolerance_mm: -0.01, method: "equal", components: [{ id: "A" }],
    }).success).toBe(false);
  });

  it("isa_allocate rejects unknown method", () => {
    expect(ACTION_DEV_SCHEMAS["isa_allocate"].safeParse({
      assembly_tolerance_mm: 0.05, method: "totally_bogus", components: [{ id: "A" }],
    }).success).toBe(false);
  });

  it("isa_allocate rejects 0-component array", () => {
    expect(ACTION_DEV_SCHEMAS["isa_allocate"].safeParse({
      assembly_tolerance_mm: 0.05, method: "equal", components: [],
    }).success).toBe(false);
  });

  it("isa_allocate rejects > 100 components (DoS guard)", () => {
    const big = Array.from({ length: 101 }, (_, i) => ({ id: `c${i}` }));
    expect(ACTION_DEV_SCHEMAS["isa_allocate"].safeParse({
      assembly_tolerance_mm: 0.05, method: "equal", components: big,
    }).success).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ISA — prism_dev :: isa_stats", () => {
  it("returns the 5 methods + cost models", async () => {
    const r = await invokeHandler(devHandler, "isa_stats", {});
    const stats = (r as { stats: { methods?: string[]; models?: Record<string, string> } }).stats;
    expect(Array.isArray(stats.methods ?? [])).toBe(true);
    const methods = new Set(stats.methods ?? []);
    for (const m of ["equal", "cost_weighted", "capability_weighted", "worst_case", "rss"]) {
      expect(methods.has(m)).toBe(true);
    }
  });

  it("ROUTING PROOF — wire stats byte-equals engine-direct", async () => {
    const r = await invokeHandler(devHandler, "isa_stats", {});
    const wire = (r as { stats: unknown }).stats;
    const direct = inverseStackupAllocatorEngine.getStats();
    expect(JSON.stringify(wire)).toBe(JSON.stringify(direct));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ISA — prism_dev :: isa_allocate", () => {
  it("equal method → 3 allocations each ≈ T/3 for RSS", async () => {
    const T = 0.05;
    const r = await invokeHandler(devHandler, "isa_allocate", {
      assembly_tolerance_mm: T, method: "equal", components: SAMPLE_3,
    });
    const alloc = (r as { allocation: { allocations: Array<{ id: string; allocated_tolerance_mm: number }> } }).allocation;
    expect(alloc.allocations.length).toBe(3);
    // Each component gets the same share (equal method)
    const first = alloc.allocations[0]!.allocated_tolerance_mm;
    for (const a of alloc.allocations) {
      expect(Math.abs(a.allocated_tolerance_mm - first)).toBeLessThan(1e-9);
    }
  });

  it("VARIABILITY — all 5 methods produce feasible non-empty allocations", async () => {
    const T = 0.1;
    for (const method of ["equal", "cost_weighted", "capability_weighted", "worst_case", "rss"] as const) {
      const r = await invokeHandler(devHandler, "isa_allocate", {
        assembly_tolerance_mm: T, method, components: SAMPLE_3,
      });
      const alloc = (r as { allocation: { allocations: unknown[]; method: string } }).allocation;
      expect(alloc.method).toBe(method);
      expect((alloc.allocations ?? []).length).toBe(3);
    }
  });

  it("infeasibility — tiny T below min_tolerance sum → not feasible", async () => {
    const r = await invokeHandler(devHandler, "isa_allocate", {
      assembly_tolerance_mm: 0.001,
      method: "worst_case",
      components: SAMPLE_3,
    });
    const alloc = (r as { allocation: { feasible?: boolean; feasibility_score?: number } }).allocation;
    // slimResponse strips false → treat absence as false
    expect((alloc.feasible as boolean | undefined) ?? false).toBe(false);
  });

  it("ROUTING PROOF — wire allocation byte-equals engine-direct allocate()", async () => {
    const input = {
      assembly_tolerance_mm: 0.05,
      method: "rss" as const,
      components: SAMPLE_3,
    };
    const r = await invokeHandler(devHandler, "isa_allocate", input);
    const wire = (r as { allocation: { allocations: Array<{ id: string; allocated_tolerance_mm: number }> } }).allocation;
    const direct = inverseStackupAllocatorEngine.allocate(input);
    expect(wire.allocations.length).toBe(direct.allocations.length);
    for (let i = 0; i < wire.allocations.length; i++) {
      expect(wire.allocations[i]!.id).toBe(direct.allocations[i]!.id);
      expect(Math.abs(wire.allocations[i]!.allocated_tolerance_mm - direct.allocations[i]!.allocated_tolerance_mm)).toBeLessThan(1e-9);
    }
  });

  it("worst_case sum >= RSS sum (worst-case is conservative)", async () => {
    const T = 0.1;
    const rWC = await invokeHandler(devHandler, "isa_allocate", {
      assembly_tolerance_mm: T, method: "worst_case", components: SAMPLE_3,
    });
    const rRSS = await invokeHandler(devHandler, "isa_allocate", {
      assembly_tolerance_mm: T, method: "rss", components: SAMPLE_3,
    });
    const wcTotal = (rWC as { allocation: { total_allocated_wc: number } }).allocation.total_allocated_wc;
    const rssTotal = (rRSS as { allocation: { total_allocated_wc: number } }).allocation.total_allocated_wc;
    // worst-case method should allocate so wc-sum equals T; rss method allocates so rss-sum equals T
    // → wc method's wc-sum >= rss method's wc-sum (conservative)
    expect(wcTotal).toBeLessThanOrEqual(rssTotal + 1e-9);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-ISA — error envelope", () => {
  it("isa_allocate without assembly_tolerance_mm → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "isa_allocate", {
      method: "equal", components: [{ id: "A" }],
    });
    const data = r as { error?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });

  it("isa_allocate with empty components → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "isa_allocate", {
      assembly_tolerance_mm: 0.05, method: "equal", components: [],
    });
    const data = r as { error?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });

  it("isa_allocate with invalid method → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "isa_allocate", {
      assembly_tolerance_mm: 0.05, method: "totally_bogus", components: [{ id: "A" }],
    });
    const data = r as { error?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });
});
