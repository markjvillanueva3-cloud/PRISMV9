/**
 * dispatcher.crossRegistryJoin.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-XREG dispatcher wiring.
 *
 * Drives 5 READ-ONLY actions through real `prism_dev`:
 *
 *   - cross_reg_list      → listRegistries()
 *   - cross_reg_schema    → getSchema(name)
 *   - cross_reg_joinable  → getJoinableRegistries(name)
 *   - cross_reg_paths     → findJoinPaths(from, to)
 *   - cross_reg_join      → join(query)
 *
 * reset() DEFERRED (U-WIRE-XREG-WRITE) — wipes the in-memory schema map
 * which other concurrent dev queries depend on.
 *
 * ROUTING PROOF:
 *  - listRegistries returns the 4 seeded registries (materials, tools,
 *    machines, strategies)
 *  - schema parity with engine-direct getSchema()
 *  - tools.foreignKeys references "materials" → cross_reg_joinable("tools")
 *    must include "materials"
 *  - cross_reg_paths returns the SAME path that engine-direct findJoinPaths
 *    returns for the same args
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { crossRegistryJoinEngine } from "../engines/CrossRegistryJoinEngine.js";

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
  // Pre-initialize engine so wire + direct see the same schema map.
  await crossRegistryJoinEngine.listRegistries();

  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-XREG — Zod schemas", () => {
  it("cross_reg_list accepts {} (no params)", () => {
    expect(ACTION_DEV_SCHEMAS["cross_reg_list"].safeParse({}).success).toBe(true);
  });

  it("cross_reg_schema requires non-empty registry", () => {
    expect(ACTION_DEV_SCHEMAS["cross_reg_schema"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cross_reg_schema"].safeParse({ registry: "" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cross_reg_schema"].safeParse({ registry: "materials" }).success).toBe(true);
  });

  it("cross_reg_joinable requires non-empty registry", () => {
    expect(ACTION_DEV_SCHEMAS["cross_reg_joinable"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cross_reg_joinable"].safeParse({ registry: "tools" }).success).toBe(true);
  });

  it("cross_reg_paths requires both from and to", () => {
    expect(ACTION_DEV_SCHEMAS["cross_reg_paths"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cross_reg_paths"].safeParse({ from: "tools" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cross_reg_paths"].safeParse({ from: "tools", to: "materials" }).success).toBe(true);
  });

  it("cross_reg_join requires primaryRegistry + non-empty joinRegistries", () => {
    expect(ACTION_DEV_SCHEMAS["cross_reg_join"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cross_reg_join"].safeParse({ primaryRegistry: "tools" }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cross_reg_join"].safeParse({
      primaryRegistry: "tools", joinRegistries: [],
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cross_reg_join"].safeParse({
      primaryRegistry: "tools", joinRegistries: ["materials"],
    }).success).toBe(true);
  });

  it("cross_reg_join rejects limit > 1000 (DoS guard)", () => {
    expect(ACTION_DEV_SCHEMAS["cross_reg_join"].safeParse({
      primaryRegistry: "tools", joinRegistries: ["materials"], limit: 1001,
    }).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["cross_reg_join"].safeParse({
      primaryRegistry: "tools", joinRegistries: ["materials"], limit: 1000,
    }).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-XREG — prism_dev :: cross_reg_list", () => {
  it("ROUTING PROOF — returns the 4 seeded registries", async () => {
    const r = await invokeHandler(devHandler, "cross_reg_list", {});
    const data = r as { registries?: string[]; count?: number };
    const regs = new Set(data.registries ?? []);
    expect(regs.has("materials")).toBe(true);
    expect(regs.has("tools")).toBe(true);
    expect(regs.has("machines")).toBe(true);
    expect(regs.has("strategies")).toBe(true);
    expect(data.count ?? 0).toBe((data.registries ?? []).length);
  });

  it("byte-equals engine-direct listRegistries() (as a sorted set)", async () => {
    const r = await invokeHandler(devHandler, "cross_reg_list", {});
    const wire = ((r as { registries: string[] }).registries ?? []).slice().sort();
    const direct = (await crossRegistryJoinEngine.listRegistries()).slice().sort();
    expect(JSON.stringify(wire)).toBe(JSON.stringify(direct));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-XREG — prism_dev :: cross_reg_schema", () => {
  it("known registry → returns the full schema (per-field equality)", async () => {
    const r = await invokeHandler(devHandler, "cross_reg_schema", { registry: "tools" });
    const schema = (r as { schema: { name?: string; primaryKey?: string; fields?: unknown[]; foreignKeys?: Array<{ field: string; references: string }> } }).schema;
    expect(schema.name).toBe("tools");
    expect(schema.primaryKey).toBe("id");
    expect((schema.fields ?? []).length).toBeGreaterThanOrEqual(5);
    // Tools has a FK on material_id → materials
    const fks = schema.foreignKeys ?? [];
    const matFK = fks.find((f) => f.field === "material_id");
    expect(matFK?.references).toBe("materials");
  });

  it("unknown registry → returns null", async () => {
    const r = await invokeHandler(devHandler, "cross_reg_schema", {
      registry: "definitely-not-a-real-registry-" + Date.now(),
    });
    const data = r as { schema?: unknown };
    // slimResponse strips null — treat absence as null
    expect((data.schema ?? null) === null).toBe(true);
  });

  it("ROUTING PROOF — wire schema field-set matches engine-direct getSchema()", async () => {
    const r = await invokeHandler(devHandler, "cross_reg_schema", { registry: "materials" });
    const wire = (r as { schema: { fields?: Array<{ name: string }> } }).schema;
    const direct = await crossRegistryJoinEngine.getSchema("materials");
    expect(direct).not.toBe(null);
    const wireFields = (wire.fields ?? []).map((f) => f.name).sort();
    const directFields = direct!.fields.map((f) => f.name).sort();
    expect(JSON.stringify(wireFields)).toBe(JSON.stringify(directFields));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-XREG — prism_dev :: cross_reg_joinable", () => {
  it("tools → joinable includes materials (FK relation)", async () => {
    const r = await invokeHandler(devHandler, "cross_reg_joinable", { registry: "tools" });
    const data = r as { joinable?: string[] };
    expect((data.joinable ?? []).includes("materials")).toBe(true);
  });

  it("materials → joinable includes tools (inbound FK from tools.material_id)", async () => {
    const r = await invokeHandler(devHandler, "cross_reg_joinable", { registry: "materials" });
    const data = r as { joinable?: string[] };
    expect((data.joinable ?? []).includes("tools")).toBe(true);
  });

  it("unknown registry → returns 0", async () => {
    const r = await invokeHandler(devHandler, "cross_reg_joinable", {
      registry: "no-such-registry-" + Date.now(),
    });
    const data = r as { joinable?: string[]; count?: number };
    expect((data.joinable ?? []).length).toBe(0);
    expect(data.count ?? 0).toBe(0);
  });

  it("ROUTING PROOF — wire joinable set equals engine-direct getJoinableRegistries()", async () => {
    const r = await invokeHandler(devHandler, "cross_reg_joinable", { registry: "tools" });
    const wire = ((r as { joinable: string[] }).joinable ?? []).slice().sort();
    const direct = (await crossRegistryJoinEngine.getJoinableRegistries("tools")).slice().sort();
    expect(JSON.stringify(wire)).toBe(JSON.stringify(direct));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-XREG — prism_dev :: cross_reg_paths", () => {
  it("tools → materials → returns at least one path", async () => {
    const r = await invokeHandler(devHandler, "cross_reg_paths", { from: "tools", to: "materials" });
    const data = r as { paths?: string[][]; count?: number };
    expect((data.paths ?? []).length).toBeGreaterThan(0);
    expect(data.count ?? 0).toBe((data.paths ?? []).length);
  });

  it("unknown from → empty paths", async () => {
    const r = await invokeHandler(devHandler, "cross_reg_paths", {
      from: "no-such-registry", to: "materials",
    });
    const data = r as { paths?: string[][] };
    expect((data.paths ?? []).length).toBe(0);
  });

  it("unknown to → empty paths", async () => {
    const r = await invokeHandler(devHandler, "cross_reg_paths", {
      from: "tools", to: "no-such-registry",
    });
    const data = r as { paths?: string[][] };
    expect((data.paths ?? []).length).toBe(0);
  });

  it("ROUTING PROOF — wire paths match engine-direct findJoinPaths()", async () => {
    const r = await invokeHandler(devHandler, "cross_reg_paths", {
      from: "tools", to: "materials",
    });
    const wire = (r as { paths: string[][] }).paths ?? [];
    const direct = await crossRegistryJoinEngine.findJoinPaths("tools", "materials");
    expect(JSON.stringify(wire)).toBe(JSON.stringify(direct));
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-XREG — prism_dev :: cross_reg_join", () => {
  it("basic join — primary=tools join=[materials] returns records + registriesJoined", async () => {
    const r = await invokeHandler(devHandler, "cross_reg_join", {
      primaryRegistry: "tools", joinRegistries: ["materials"],
    });
    const data = r as { records?: Record<string, unknown>[]; registriesJoined?: string[]; recordCount?: number; queryTime?: number };
    expect((data.records ?? []).length).toBeGreaterThan(0);
    expect((data.registriesJoined ?? [])).toEqual(["tools", "materials"]);
    expect(data.recordCount ?? 0).toBe((data.records ?? []).length);
    expect(typeof (data.queryTime ?? 0)).toBe("number");
  });

  it("unknown primaryRegistry → 0 records", async () => {
    const r = await invokeHandler(devHandler, "cross_reg_join", {
      primaryRegistry: "no-such-registry-" + Date.now(),
      joinRegistries: ["materials"],
    });
    const data = r as { records?: Record<string, unknown>[]; recordCount?: number; registriesJoined?: string[] };
    expect((data.records ?? []).length).toBe(0);
    expect(data.recordCount ?? 0).toBe(0);
    expect((data.registriesJoined ?? []).length).toBe(0);
  });

  it("limit=3 caps records to <= 3", async () => {
    const r = await invokeHandler(devHandler, "cross_reg_join", {
      primaryRegistry: "tools", joinRegistries: ["materials"], limit: 3,
    });
    const data = r as { records?: Record<string, unknown>[] };
    expect((data.records ?? []).length).toBeLessThanOrEqual(3);
  });

  it("multi-registry join — primary=strategies join=[machines, materials] returns 3 joined registries", async () => {
    const r = await invokeHandler(devHandler, "cross_reg_join", {
      primaryRegistry: "strategies",
      joinRegistries: ["machines", "materials"],
    });
    const data = r as { registriesJoined?: string[] };
    expect((data.registriesJoined ?? [])).toEqual(["strategies", "machines", "materials"]);
  });

  it("ROUTING PROOF — wire record-count matches engine-direct join()", async () => {
    const r = await invokeHandler(devHandler, "cross_reg_join", {
      primaryRegistry: "tools", joinRegistries: ["materials"], limit: 5,
    });
    const wireCount = (r as { recordCount?: number }).recordCount ?? 0;
    const direct = await crossRegistryJoinEngine.join({
      primaryRegistry: "tools", joinRegistries: ["materials"], joinKeys: [], limit: 5,
    });
    expect(wireCount).toBe(direct.recordCount);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-XREG — error envelope", () => {
  it("cross_reg_schema without registry → schema rejects with mention of 'registry'", async () => {
    const r = await invokeHandler(devHandler, "cross_reg_schema", {});
    const data = r as { error?: string; details?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
    expect(`${data.error ?? ""} ${data.details ?? ""}`).toMatch(/registry/i);
  });

  it("cross_reg_paths without 'to' → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "cross_reg_paths", { from: "tools" });
    const data = r as { error?: string; details?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });

  it("cross_reg_join without joinRegistries → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "cross_reg_join", { primaryRegistry: "tools" });
    const data = r as { error?: string; details?: string };
    expect((data.error ?? "").length).toBeGreaterThan(0);
  });
});
