/**
 * dispatcher.routingSheetGenerator.test.ts — round-trip coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-RSG dispatcher wiring.
 *
 * Drives 4 actions through real `prism_dev`:
 *   rsg_generate / rsg_get / rsg_render_markdown / rsg_render_csv.
 * generateAll() DEFERRED (duplicates generate over the wire); reset()
 * DEFERRED (mutates shared in-memory store across sessions).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";
import { routingSheetGeneratorEngine } from "../engines/RoutingSheetGeneratorEngine.js";

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

const SAMPLE_OPS = [
  { op_num: 10, op_name: "Rough Turn OD", machine_id: "OKUMA-LB3000", machine_type: "lathe" as const, setup_min: 30, cycle_min: 4.5, pieces: 10 },
  { op_num: 20, op_name: "Finish Turn OD", machine_id: "OKUMA-LB3000", machine_type: "lathe" as const, setup_min: 10, cycle_min: 2.8, pieces: 10 },
  { op_num: 30, op_name: "Drill + Tap", machine_id: "HAAS-VF4", machine_type: "mill" as const, setup_min: 45, cycle_min: 1.2, pieces: 10 },
];

let devHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerDevDispatcher(srv as unknown as Parameters<typeof registerDevDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_dev");
  if (!t) throw new Error("prism_dev not registered");
  devHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-RSG — Zod schemas", () => {
  it("rsg_generate requires job_id + part_number + revision + operations", () => {
    expect(ACTION_DEV_SCHEMAS["rsg_generate"].safeParse({}).success).toBe(false);
    expect(ACTION_DEV_SCHEMAS["rsg_generate"].safeParse({
      job_id: "J1", part_number: "P1", revision: "A",
      operations: [{ op_num: 10, op_name: "x", machine_id: "M1", setup_min: 1, cycle_min: 1 }],
    }).success).toBe(true);
  });

  it("rsg_generate rejects empty operations array", () => {
    expect(ACTION_DEV_SCHEMAS["rsg_generate"].safeParse({
      job_id: "J1", part_number: "P1", revision: "A", operations: [],
    }).success).toBe(false);
  });

  it("rsg_generate rejects > 200 operations (DoS guard)", () => {
    const big = Array.from({ length: 201 }, (_, i) => ({
      op_num: (i + 1) * 10, op_name: `op${i}`, machine_id: "M", setup_min: 1, cycle_min: 1,
    }));
    expect(ACTION_DEV_SCHEMAS["rsg_generate"].safeParse({
      job_id: "J1", part_number: "P1", revision: "A", operations: big,
    }).success).toBe(false);
  });

  it("rsg_generate rejects unknown machine_type enum value", () => {
    expect(ACTION_DEV_SCHEMAS["rsg_generate"].safeParse({
      job_id: "J1", part_number: "P1", revision: "A",
      operations: [{ op_num: 10, op_name: "x", machine_id: "M", machine_type: "totally_bogus", setup_min: 1, cycle_min: 1 }],
    }).success).toBe(false);
  });

  it("rsg_get/render_markdown/render_csv require RT- routing_id format", () => {
    for (const a of ["rsg_get", "rsg_render_markdown", "rsg_render_csv"]) {
      expect(ACTION_DEV_SCHEMAS[a]!.safeParse({}).success).toBe(false);
      expect(ACTION_DEV_SCHEMAS[a]!.safeParse({ routing_id: "" }).success).toBe(false);
      expect(ACTION_DEV_SCHEMAS[a]!.safeParse({ routing_id: "not-rt-format" }).success).toBe(false);
      expect(ACTION_DEV_SCHEMAS[a]!.safeParse({ routing_id: "RT-00001" }).success).toBe(true);
    }
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-RSG — prism_dev :: rsg_generate", () => {
  it("returns RoutingSheet with RT-prefixed id + rows + totals", async () => {
    const r = await invokeHandler(devHandler, "rsg_generate", {
      job_id: "JOB-A", part_number: "PN-A", revision: "1", operations: SAMPLE_OPS,
    });
    const sheet = (r as { sheet: { routing_id: string; rows: unknown[]; totals: { op_count: number } } }).sheet;
    expect(sheet.routing_id).toMatch(/^RT-\d+$/);
    expect(sheet.rows.length).toBe(3);
    expect(sheet.totals.op_count).toBe(3);
    expect((r as { generated?: boolean }).generated).toBe(true);
  });

  it("totals math: total_min = total_setup + total_run + queue×(opCount−1)", async () => {
    const r = await invokeHandler(devHandler, "rsg_generate", {
      job_id: "JOB-MATH", part_number: "PN-MATH", revision: "1",
      queue_min_between_ops: 15, operations: SAMPLE_OPS,
    });
    const t = (r as { sheet: { totals: { total_setup_min: number; total_run_min: number; total_queue_min: number; total_min: number; total_hr: number; lead_time_business_days: number } } }).sheet.totals;
    // setup = 30+10+45 = 85; run = 4.5*10 + 2.8*10 + 1.2*10 = 45+28+12 = 85; queue = 15*2 = 30
    expect(t.total_setup_min).toBeCloseTo(85, 2);
    expect(t.total_run_min).toBeCloseTo(85, 2);
    expect(t.total_queue_min).toBeCloseTo(30, 2);
    expect(t.total_min).toBeCloseTo(200, 2);
    expect(t.total_hr).toBeCloseTo(200 / 60, 2);
    expect(t.lead_time_business_days).toBe(Math.ceil((200 / 60) / 8));
  });

  it("monotonicity warning fires when op_num decreases", async () => {
    const r = await invokeHandler(devHandler, "rsg_generate", {
      job_id: "JOB-W", part_number: "PN-W", revision: "1",
      operations: [
        { op_num: 30, op_name: "first", machine_id: "M", setup_min: 5, cycle_min: 1 },
        { op_num: 20, op_name: "second", machine_id: "M", setup_min: 5, cycle_min: 1 },
      ],
    });
    const warnings = ((r as { sheet: { warnings: string[] } }).sheet.warnings) ?? [];
    expect(warnings.some(w => w.includes("not monotonic"))).toBe(true);
    expect((r as { warnings_count?: number }).warnings_count).toBeGreaterThan(0);
  });

  it("VARIABILITY — 2 distinct generates produce distinct RT- ids", async () => {
    const a = await invokeHandler(devHandler, "rsg_generate", {
      job_id: "JOB-V1", part_number: "P", revision: "1",
      operations: [{ op_num: 10, op_name: "x", machine_id: "M", setup_min: 1, cycle_min: 1 }],
    });
    const b = await invokeHandler(devHandler, "rsg_generate", {
      job_id: "JOB-V2", part_number: "P", revision: "1",
      operations: [{ op_num: 10, op_name: "x", machine_id: "M", setup_min: 1, cycle_min: 1 }],
    });
    expect((a as { sheet: { routing_id: string } }).sheet.routing_id).not.toBe((b as { sheet: { routing_id: string } }).sheet.routing_id);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-RSG — prism_dev :: rsg_get", () => {
  it("unknown routing_id → found:false", async () => {
    const r = await invokeHandler(devHandler, "rsg_get", { routing_id: "RT-99999999" });
    expect((r as { found?: boolean }).found).toBe(false);
  });

  it("ROUTING PROOF — wire get round-trips a fresh generate by id", async () => {
    const gen = await invokeHandler(devHandler, "rsg_generate", {
      job_id: "JOB-RP", part_number: "PN-RP", revision: "1", operations: SAMPLE_OPS,
    });
    const id = (gen as { sheet: { routing_id: string } }).sheet.routing_id;
    const got = await invokeHandler(devHandler, "rsg_get", { routing_id: id });
    expect((got as { found?: boolean }).found).toBe(true);
    const wireSheet = (got as { sheet: { routing_id: string; totals: { total_min: number } } }).sheet;
    const direct = routingSheetGeneratorEngine.get(id);
    if (direct === null) throw new Error("engine-direct lookup returned null — wire+direct desync");
    expect(wireSheet.routing_id).toBe(direct.routing_id);
    expect(wireSheet.totals.total_min).toBeCloseTo(direct.totals.total_min, 6);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-RSG — prism_dev :: rsg_render_markdown", () => {
  it("unknown routing_id → rendered:false + error", async () => {
    const r = await invokeHandler(devHandler, "rsg_render_markdown", { routing_id: "RT-77777777" });
    expect((r as { rendered?: boolean }).rendered).toBe(false);
    expect((r as { error?: string }).error ?? "").toMatch(/not found/i);
  });

  it("renders Markdown with header table + ops + totals", async () => {
    const gen = await invokeHandler(devHandler, "rsg_generate", {
      job_id: "JOB-MD", part_number: "PN-MD", revision: "2", operations: SAMPLE_OPS,
    });
    const id = (gen as { sheet: { routing_id: string } }).sheet.routing_id;
    const r = await invokeHandler(devHandler, "rsg_render_markdown", { routing_id: id });
    const md = (r as { markdown?: string }).markdown ?? "";
    expect(md).toContain(`# Routing Sheet ${id}`);
    expect(md).toContain("## Operations");
    expect(md).toContain("## Totals");
    expect((r as { bytes?: number }).bytes).toBe(md.length);
  });

  it("ROUTING PROOF — wire markdown byte-equals engine-direct renderMarkdown()", async () => {
    const gen = await invokeHandler(devHandler, "rsg_generate", {
      job_id: "JOB-MD2", part_number: "PN-MD2", revision: "A", operations: SAMPLE_OPS,
    });
    const id = (gen as { sheet: { routing_id: string } }).sheet.routing_id;
    const r = await invokeHandler(devHandler, "rsg_render_markdown", { routing_id: id });
    const wire = (r as { markdown?: string }).markdown ?? "";
    const direct = routingSheetGeneratorEngine.get(id);
    if (direct === null) throw new Error("engine-direct lookup returned null");
    const directMd = routingSheetGeneratorEngine.renderMarkdown(direct);
    expect(wire).toBe(directMd);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-RSG — prism_dev :: rsg_render_csv", () => {
  it("unknown routing_id → rendered:false + error", async () => {
    const r = await invokeHandler(devHandler, "rsg_render_csv", { routing_id: "RT-66666666" });
    expect((r as { rendered?: boolean }).rendered).toBe(false);
    expect((r as { error?: string }).error ?? "").toMatch(/not found/i);
  });

  it("renders CSV with header row + 1 row per op", async () => {
    const gen = await invokeHandler(devHandler, "rsg_generate", {
      job_id: "JOB-CSV", part_number: "PN-CSV", revision: "1", operations: SAMPLE_OPS,
    });
    const id = (gen as { sheet: { routing_id: string } }).sheet.routing_id;
    const r = await invokeHandler(devHandler, "rsg_render_csv", { routing_id: id });
    const csv = (r as { csv?: string }).csv ?? "";
    const lines = csv.split("\n");
    // 1 header + 3 op rows
    expect(lines.length).toBe(4);
    expect(lines[0]).toContain("routing_id");
    expect(lines[0]).toContain("op_num");
  });

  it("ROUTING PROOF — wire csv byte-equals engine-direct renderCSV()", async () => {
    const gen = await invokeHandler(devHandler, "rsg_generate", {
      job_id: "JOB-CSV2", part_number: "PN-CSV2", revision: "B", operations: SAMPLE_OPS,
    });
    const id = (gen as { sheet: { routing_id: string } }).sheet.routing_id;
    const r = await invokeHandler(devHandler, "rsg_render_csv", { routing_id: id });
    const wire = (r as { csv?: string }).csv ?? "";
    const direct = routingSheetGeneratorEngine.get(id);
    if (direct === null) throw new Error("engine-direct lookup returned null");
    const directCsv = routingSheetGeneratorEngine.renderCSV(direct);
    expect(wire).toBe(directCsv);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-RSG — error envelope", () => {
  it("rsg_generate without job_id → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "rsg_generate", {
      part_number: "P", revision: "A",
      operations: [{ op_num: 10, op_name: "x", machine_id: "M", setup_min: 1, cycle_min: 1 }],
    });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });

  it("rsg_get with malformed routing_id → schema rejects", async () => {
    const r = await invokeHandler(devHandler, "rsg_get", { routing_id: "not-rt-format" });
    expect(((r as { error?: string }).error ?? "").length).toBeGreaterThan(0);
  });
});
