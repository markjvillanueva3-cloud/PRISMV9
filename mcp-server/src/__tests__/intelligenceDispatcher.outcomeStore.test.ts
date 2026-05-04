/**
 * intelligenceDispatcher.outcomeStore.test.ts — U-XPROC-NEURAL-T1-01 dispatcher tests
 *
 * Round-trip tests for the outcome store dispatcher actions:
 *   - xproc_outcome_record / record_outcome / query / retrieve_similar / stats / clear
 *
 * @see src/engines/CrossProcessOutcomeStore.ts
 * @see src/tools/dispatchers/intelligenceDispatcher.ts
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { registerIntelligenceDispatcher } from "../tools/dispatchers/intelligenceDispatcher.js";
import { crossProcessOutcomeStore } from "../engines/CrossProcessOutcomeStore.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}

function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
      captured.push({ name, description, schema, handler });
    },
  };
}

let handler: CapturedTool["handler"];

async function invoke(action: string, params: Record<string, unknown> = {}) {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (!res.content) return res;
  const content = res.content as Array<{ text?: string }>;
  const text = content[0]?.text ?? "";
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { __raw: text } as Record<string, unknown>;
  }
}

beforeAll(() => {
  const server = makeStubServer();
  registerIntelligenceDispatcher(
    server as unknown as Parameters<typeof registerIntelligenceDispatcher>[0],
  );
  const tool = server.tools.find((t) => t.name === "prism_intelligence");
  if (!tool) throw new Error("prism_intelligence tool not registered");
  handler = tool.handler;
});

beforeEach(async () => {
  await invoke("xproc_outcome_clear");
});

describe("intelligenceDispatcher xproc outcome store (U-XPROC-NEURAL-T1-01)", () => {
  it("records an event and reports it in stats", async () => {
    const r = await invoke("xproc_outcome_record", {
      bridge: "sf",
      process: "mill",
      request_summary: { material: "4140", tool_diameter_mm: 12 },
    });
    expect(r.success).toBe(true);
    expect(r.id).toMatch(/^evt-\d+$/);

    const stats = await invoke("xproc_outcome_stats");
    expect(stats.success).toBe(true);
    expect(stats.total).toBe(1);
    const byBridge = stats.by_bridge as Record<string, number>;
    expect(byBridge.sf).toBe(1);
  });

  it("attaches an outcome to a previously recorded event", async () => {
    const rec = await invoke("xproc_outcome_record", { bridge: "post", process: "lathe" });
    const id = rec.id as string;
    const upd = await invoke("xproc_outcome_record_outcome", {
      id,
      outcome: { kind: "success", actual_metrics: { cycle_time_min: 7.5 } },
    });
    expect(upd.success).toBe(true);
    expect(upd.updated).toBe(true);

    const q = await invoke("xproc_outcome_query", { outcome_kind: "success" });
    const records = q.records as Array<{ outcome: { kind: string; actual_metrics: Record<string, number> } }>;
    expect(records).toHaveLength(1);
    expect(records[0].outcome.kind).toBe("success");
    expect(records[0].outcome.actual_metrics.cycle_time_min).toBe(7.5);
  });

  it("query returns events filtered by process", async () => {
    await invoke("xproc_outcome_record", { bridge: "sf", process: "mill" });
    await invoke("xproc_outcome_record", { bridge: "sf", process: "lathe" });
    await invoke("xproc_outcome_record", { bridge: "sf", process: "wedm" });
    const q = await invoke("xproc_outcome_query", { process: "lathe" });
    expect(q.count).toBe(1);
    const records = q.records as Array<{ process: string }>;
    expect(records[0].process).toBe("lathe");
  });

  it("retrieve_similar returns ranked neighbors", async () => {
    await invoke("xproc_outcome_record", {
      bridge: "sf",
      process: "mill",
      request_summary: { material: "4140", tool_material: "Carbide", tool_diameter_mm: 12 },
    });
    await invoke("xproc_outcome_record", {
      bridge: "sf",
      process: "mill",
      request_summary: { material: "4140", tool_material: "Carbide", tool_diameter_mm: 16 },
    });
    await invoke("xproc_outcome_record", {
      bridge: "sf",
      process: "wedm",
      request_summary: { material: "D2", workpiece_thickness_mm: 12 },
    });
    const r = await invoke("xproc_outcome_retrieve_similar", {
      context: { process: "mill", material: "4140", tool_material: "Carbide", tool_diameter_mm: 13 },
      k: 2,
    });
    expect(r.count).toBe(2);
    const results = r.results as Array<{ record: { process: string; request_summary: { tool_diameter_mm: number } } }>;
    expect(results[0].record.process).toBe("mill");
    expect(results[0].record.request_summary.tool_diameter_mm).toBe(12);
  });

  it("clear() empties the store", async () => {
    await invoke("xproc_outcome_record", { bridge: "sf", process: "mill" });
    await invoke("xproc_outcome_record", { bridge: "sf", process: "lathe" });
    let stats = await invoke("xproc_outcome_stats");
    expect(stats.total).toBe(2);
    const c = await invoke("xproc_outcome_clear");
    expect(c.success).toBe(true);
    stats = await invoke("xproc_outcome_stats");
    expect(stats.total).toBe(0);
  });

  it("propagates engine error on bad bridge", async () => {
    const r = await invoke("xproc_outcome_record", { bridge: "edm", process: "mill" });
    expect(r.success).toBe(false);
    expect(String(r.error)).toMatch(/bridge "edm"/);
  });

  it("propagates engine error on bad process", async () => {
    const r = await invoke("xproc_outcome_record", { bridge: "sf", process: "grinder" });
    expect(r.success).toBe(false);
    expect(String(r.error)).toMatch(/process "grinder"/);
  });

  it("rejects record_outcome without id", async () => {
    const r = await invoke("xproc_outcome_record_outcome", { outcome: { kind: "success" } });
    expect(r.success).toBe(false);
    expect(String(r.error)).toMatch(/requires `id`/);
  });

  it("returns updated=false when id is unknown", async () => {
    const r = await invoke("xproc_outcome_record_outcome", {
      id: "evt-9999",
      outcome: { kind: "success" },
    });
    expect(r.success).toBe(true);
    expect(r.updated).toBe(false);
  });

  it("singleton state survives across multiple dispatcher invocations", async () => {
    // Verify the singleton is the source of truth — direct engine inspection
    // matches dispatcher-reported counts.
    crossProcessOutcomeStore.clear();
    await invoke("xproc_outcome_record", { bridge: "sf", process: "mill" });
    await invoke("xproc_outcome_record", { bridge: "ai", process: "wedm" });
    expect(crossProcessOutcomeStore.size()).toBe(2);
    const stats = await invoke("xproc_outcome_stats");
    expect(stats.total).toBe(2);
  });
});
