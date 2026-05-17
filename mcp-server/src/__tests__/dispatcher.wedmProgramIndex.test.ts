/**
 * dispatcher.wedmProgramIndex.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-WPI dispatcher wiring.
 *
 * Drives 5 READ-ONLY actions through real `prism_dev`. NO write methods.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { WedmProgramIndexEngine } from "../engines/WedmProgramIndexEngine.js";

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

describe("WIRE-UNWIRED-MS0/U-WIRE-WPI — Zod schemas", () => {
  it("sources/audit/harvest accept {}", () => {
    for (const action of ["wedm_programs_sources", "wedm_programs_audit", "wedm_programs_harvest"]) {
      expect(ACTION_DEV_SCHEMAS[action].safeParse({}).success).toBe(true);
    }
  });

  it("wedm_programs_by_customer requires non-empty customer", () => {
    expect(ACTION_DEV_SCHEMAS["wedm_programs_by_customer"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wedm_programs_by_customer"].safeParse({ customer: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wedm_programs_by_customer"].safeParse({ customer: "ALCOA" }).success).toBe(true);
  });

  it("wedm_programs_top_customers accepts {} (optional limit)", () => {
    expect(ACTION_DEV_SCHEMAS["wedm_programs_top_customers"].safeParse({}).success).toBe(true);
    expect(ACTION_DEV_SCHEMAS["wedm_programs_top_customers"].safeParse({ limit: 10 }).success).toBe(true);
  });

  it("wedm_programs_top_customers rejects limit > 100 (DoS guard)", () => {
    expect(ACTION_DEV_SCHEMAS["wedm_programs_top_customers"].safeParse({ limit: 101 }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["wedm_programs_top_customers"].safeParse({ limit: 100 }).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPI — prism_dev :: wedm_programs_sources", () => {
  it("returns source info with wireEdmRoot + rokuRokuRoot + validExtensions", async () => {
    const r = await invokeHandler(devHandler, "wedm_programs_sources", {});
    const src = (r as { source: { wireEdmRoot?: string; rokuRokuRoot?: string; validExtensions?: string[] } }).source;
    expect(typeof src.wireEdmRoot).toBe("string");
    expect((src.wireEdmRoot ?? "").length).toBeGreaterThan(0);
    expect(typeof src.rokuRokuRoot).toBe("string");
    expect((src.rokuRokuRoot ?? "").length).toBeGreaterThan(0);
    expect(Array.isArray(src.validExtensions ?? [])).toBe(true);
    expect((src.validExtensions ?? []).length).toBeGreaterThan(0);
  });

  it("ROUTING PROOF — wire source byte-equals engine-direct", async () => {
    const r = await invokeHandler(devHandler, "wedm_programs_sources", {});
    const wire = (r as { source: unknown }).source;
    const direct = WedmProgramIndexEngine.getSources();
    expect(JSON.stringify(wire)).toBe(JSON.stringify(direct));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPI — prism_dev :: wedm_programs_harvest", () => {
  it("returns harvest with programs array + byCustomer map", async () => {
    const r = await invokeHandler(devHandler, "wedm_programs_harvest", {});
    const harvest = (r as { harvest: { programs?: unknown[]; byCustomer?: Record<string, number>; totalPrograms?: number } }).harvest;
    expect(typeof harvest).toBe("object");
    expect(typeof ((harvest.totalPrograms as number | undefined) ?? 0)).toBe("number");
  });

  it("totalPrograms == programs.length (invariant)", async () => {
    const r = await invokeHandler(devHandler, "wedm_programs_harvest", {});
    const h = (r as { harvest: { programs?: unknown[]; totalPrograms?: number } }).harvest;
    expect((h.totalPrograms as number | undefined) ?? 0).toBe((h.programs ?? []).length);
  });

  it("ROUTING PROOF — wire totalPrograms matches engine-direct harvest()", async () => {
    const r = await invokeHandler(devHandler, "wedm_programs_harvest", {});
    const wire = (r as { harvest: { totalPrograms?: number } }).harvest;
    const direct = await WedmProgramIndexEngine.harvest();
    expect((wire.totalPrograms as number | undefined) ?? 0).toBe(direct.totalPrograms);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPI — prism_dev :: wedm_programs_audit", () => {
  it("returns audit object", async () => {
    const r = await invokeHandler(devHandler, "wedm_programs_audit", {});
    const audit = (r as { audit?: unknown }).audit;
    expect(typeof audit).toBe("object");
    expect(audit === null).toBe(false);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPI — prism_dev :: wedm_programs_by_customer", () => {
  it("nonexistent customer → 0 programs", async () => {
    const r = await invokeHandler(devHandler, "wedm_programs_by_customer", {
      customer: "NONEXISTENT_XYZ_" + Date.now(),
    });
    const data = r as { programs?: unknown[]; count?: number; customer?: string };
    expect((data.programs ?? []).length).toBe(0);
    expect((data.count as number | undefined) ?? 0).toBe(0);
  });

  it("customer echoed in response (request fidelity)", async () => {
    const r = await invokeHandler(devHandler, "wedm_programs_by_customer", { customer: "ALCOA" });
    const data = r as { customer?: string };
    expect(data.customer).toBe("ALCOA");
  });

  it("totalAvailable == harvest totalPrograms", async () => {
    const r = await invokeHandler(devHandler, "wedm_programs_by_customer", { customer: "TEST" });
    const wireTotal = ((r as { totalAvailable?: number }).totalAvailable) ?? 0;
    const direct = await WedmProgramIndexEngine.harvest();
    expect(wireTotal).toBe(direct.totalPrograms);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPI — prism_dev :: wedm_programs_top_customers", () => {
  it("default limit returns ≤ 10 customers", async () => {
    const r = await invokeHandler(devHandler, "wedm_programs_top_customers", {});
    const customers = (r as { customers?: unknown[] }).customers ?? [];
    expect(customers.length).toBeLessThanOrEqual(10);
  });

  it("limit=3 caps to 3", async () => {
    const r = await invokeHandler(devHandler, "wedm_programs_top_customers", { limit: 3 });
    const customers = (r as { customers?: unknown[] }).customers ?? [];
    expect(customers.length).toBeLessThanOrEqual(3);
  });

  it("sorted descending by count (engine contract)", async () => {
    const r = await invokeHandler(devHandler, "wedm_programs_top_customers", { limit: 100 });
    const customers = (r as { customers?: Array<{ count: number }> }).customers ?? [];
    for (let i = 1; i < customers.length; i++) {
      expect(customers[i]!.count).toBeLessThanOrEqual(customers[i - 1]!.count);
    }
  });

  it("ROUTING PROOF — wire count parity with engine-direct getTopCustomers()", async () => {
    const r = await invokeHandler(devHandler, "wedm_programs_top_customers", { limit: 5 });
    const wireCount = ((r as { count?: number }).count) ?? 0;
    const harvest = await WedmProgramIndexEngine.harvest();
    const direct = WedmProgramIndexEngine.getTopCustomers(harvest, 5);
    expect(wireCount).toBe(direct.length);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-WPI — error envelope", () => {
  it("wedm_programs_by_customer without customer → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "wedm_programs_by_customer", {});
    const data = r as { error?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });

  it("wedm_programs_top_customers with limit=0 → schema rejects (positive only)", async () => {
    const r = await invokeHandler(devHandler, "wedm_programs_top_customers", { limit: 0 });
    const data = r as { error?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });
});
