/**
 * dataDispatcher — CNC tool-offset sync round-trip suite
 * ======================================================
 *
 * Wires CNCToolOffsetPersistenceEngine into prism_data:
 *   CNCToolOffsetPersistenceEngine.sync() → prism_data:cnc_tool_offset_sync
 *
 * Tests invoke THROUGH the dispatcher (not the engine directly), mirroring the
 * U-CTF-WIRE / U-WIRE harnesses, so a broken wire (enum / case / import path)
 * fails. Reference values are derived from the engine's published classification
 * thresholds (Δ≤0.001 noise · 0.001<Δ≤0.01 wear · 0.01<Δ≤0.5 geometry · Δ>0.5 error).
 *
 * @milestone DB-COVERAGE-GAPFILL-MS0
 * @unit U-ROMEO-CNC-OFFSET-WIRE
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDataDispatcher } from "../tools/dispatchers/dataDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && "error" in parsed) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

// A controller record with a chosen total-offset delta vs a matching ERP master.
// Drives wear via wear_x_mm so cTotal - eTotal = wear_x_mm exactly.
function ctrl(tool_id: string, wear_x_mm: number) {
  return {
    tool_id,
    turret_position: 1,
    geometry_x_mm: 10.0,
    geometry_z_mm: 5.0,
    wear_x_mm,
    wear_z_mm: 0,
  };
}
function erp(tool_id: string) {
  return {
    tool_id,
    turret_position: 1,
    geometry_x_mm: 10.0,
    geometry_z_mm: 5.0,
    last_wear_x_mm: 0,
    last_wear_z_mm: 0,
  };
}

type Delta = {
  tool_id: string;
  classification: "noise" | "wear" | "geometry" | "error";
  sync_action: "accept" | "reject" | "reconcile" | "escalate";
};

let server: MockMCPServer;
beforeEach(() => {
  server = new MockMCPServer();
  registerDataDispatcher(server as unknown as { tool: (...args: unknown[]) => void });
});

describe("U-ROMEO-CNC-OFFSET-WIRE — round-trip via prism_data:cnc_tool_offset_sync", () => {
  it("wire is live — action resolves and returns deltas+summary", async () => {
    const r = await call(server, "cnc_tool_offset_sync", {
      controller_records: [ctrl("T01", 0.005)],
      erp_records: [erp("T01")],
    });
    expect(r.ok).toBe(true);
    expect(r.data).toHaveProperty("deltas");
    expect(r.data).toHaveProperty("summary");
    expect(Array.isArray(r.data.deltas)).toBe(true);
  });

  it("classifies an operator WEAR tweak (Δ=0.005mm) → wear / accept", async () => {
    const r = await call(server, "cnc_tool_offset_sync", {
      controller_records: [ctrl("T01", 0.005)],
      erp_records: [erp("T01")],
    });
    const d = (r.data.deltas as Delta[])[0]!;
    expect(d.classification).toBe("wear");
    expect(d.sync_action).toBe("accept");
  });

  it("classifies a GEOMETRY survey event (Δ=0.05mm) → geometry / reconcile", async () => {
    const r = await call(server, "cnc_tool_offset_sync", {
      controller_records: [ctrl("T02", 0.05)],
      erp_records: [erp("T02")],
    });
    const d = (r.data.deltas as Delta[])[0]!;
    expect(d.classification).toBe("geometry");
    expect(d.sync_action).toBe("reconcile");
  });

  it("classifies a wrong-tool ERROR (Δ=0.6mm > 0.5mm) → error / escalate", async () => {
    const r = await call(server, "cnc_tool_offset_sync", {
      controller_records: [ctrl("T03", 0.6)],
      erp_records: [erp("T03")],
    });
    const d = (r.data.deltas as Delta[])[0]!;
    expect(d.classification).toBe("error");
    expect(d.sync_action).toBe("escalate");
  });

  it("classifies sub-band NOISE (Δ=0.0005mm ≤ 0.001mm) → noise / reject", async () => {
    const r = await call(server, "cnc_tool_offset_sync", {
      controller_records: [ctrl("T04", 0.0005)],
      erp_records: [erp("T04")],
    });
    const d = (r.data.deltas as Delta[])[0]!;
    expect(d.classification).toBe("noise");
    expect(d.sync_action).toBe("reject");
  });

  it("accepts a NEW tool pocket with no ERP master → geometry / accept", async () => {
    const r = await call(server, "cnc_tool_offset_sync", {
      controller_records: [ctrl("T99", 0.0)],
      erp_records: [],
    });
    const d = (r.data.deltas as Delta[])[0]!;
    expect(d.classification).toBe("geometry");
    expect(d.sync_action).toBe("accept");
    expect(d.tool_id).toBe("T99");
  });

  it("summary tallies every class across a mixed batch", async () => {
    const r = await call(server, "cnc_tool_offset_sync", {
      controller_records: [
        ctrl("T04", 0.0005), // noise
        ctrl("T01", 0.005), // wear
        ctrl("T02", 0.05), // geometry
        ctrl("T03", 0.6), // error
      ],
      erp_records: [erp("T04"), erp("T01"), erp("T02"), erp("T03")],
    });
    const s = r.data.summary as Record<string, number>;
    expect(s.total_compared).toBe(4);
    expect(s.num_noise).toBe(1);
    expect(s.num_wear).toBe(1);
    expect(s.num_geometry).toBe(1);
    expect(s.num_error).toBe(1);
  });

  it("handles an empty controller batch without throwing", async () => {
    const r = await call(server, "cnc_tool_offset_sync", {
      controller_records: [],
      erp_records: [erp("T01")],
    });
    expect(r.ok).toBe(true);
    // Empty result: the engine returns deltas:[] (the dispatcher's slim transform
    // may drop the empty array from the payload) and a zero summary — assert no
    // deltas surfaced and the authoritative compared-count is 0.
    const deltas = (r.data.deltas as Delta[] | undefined) ?? [];
    expect(deltas.length).toBe(0);
    const summary = (r.data.summary as Record<string, number> | undefined) ?? { total_compared: 0 };
    expect(summary.total_compared ?? 0).toBe(0);
  });
});
