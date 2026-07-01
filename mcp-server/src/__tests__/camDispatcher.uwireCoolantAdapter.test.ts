/**
 * camDispatcher U-WIRE-COOLANT-ADAPTER round-trip tests -- CoolantStrategyAdapter.
 *
 * Validates the new coolant_select_orchestrated action wires through prism_cam:
 *   coolant_select_orchestrated -> coolantStrategyAdapter.selectCoolantOrchestrated(req)
 *
 * The Adapter (NOT the base engine -- the base sibling is already wired) orchestrates
 * coolant selection: it hard-filters a domain catalog by operation_type, scores the
 * viable candidates, and routes the choice through the pipeline decision orchestrator.
 * Returns { coolant: CoolantCandidate, decision, no_candidates }. It is a pure
 * read/decision surface (no fs, no mutation).
 *
 * Wired slot:papa 2026-06-15 -- WIRE-UNWIRED-PAPA cross-galaxy v2
 * (galaxy:kilo engine wired into prism_cam; committed to shared tree w/ slot:papa->kilo
 * attribution -- kilo not live + its slot worktree is stale-without-the-engine).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-COOLANT-ADAPTER
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";
import { CoolantStrategyAdapter } from "../engines/CoolantStrategyAdapter.js";

const DELIVERY = ["flood", "hpc", "mql", "air", "dry", "dielectric", "gas"];

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
  const tool = server.tools.find((t) => t.name === "prism_cam") ?? server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string; action: string; dispatcher: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) &&
      ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

type CoolantReq = Parameters<CoolantStrategyAdapter["selectCoolantOrchestrated"]>[0];

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerCamDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

// -- Engine-direct reference behavior ----------------------------------------
describe("U-WIRE-COOLANT-ADAPTER -- selectCoolantOrchestrated contract", () => {
  it("selects a coolant whose applicable_ops includes the requested op (filter works)", () => {
    const eng = new CoolantStrategyAdapter();
    const d = eng.selectCoolantOrchestrated({ decision_point: "test", operation_type: "rough", material_iso_group: "P" } as unknown as CoolantReq);
    expect(d.no_candidates).toBe(false);
    expect(typeof d.coolant.id).toBe("string");
    expect(d.coolant.applicable_ops).toContain("rough"); // content-sensitive: the winner must support the op
    expect(DELIVERY).toContain(d.coolant.delivery);
  });

  it("a finish op yields a finish-capable coolant (op-sensitive, not a fixed winner)", () => {
    const eng = new CoolantStrategyAdapter();
    const d = eng.selectCoolantOrchestrated({ decision_point: "test", operation_type: "finish", material_iso_group: "P" } as unknown as CoolantReq);
    expect(d.no_candidates).toBe(false);
    expect(d.coolant.applicable_ops).toContain("finish");
  });

  it("with no operation_type every catalog entry is viable (returns a coolant)", () => {
    const eng = new CoolantStrategyAdapter();
    const d = eng.selectCoolantOrchestrated({ decision_point: "test", material_iso_group: "P" } as unknown as CoolantReq);
    expect(d.no_candidates).toBe(false);
    expect(typeof d.coolant.id).toBe("string");
  });
});

// -- LIVE round-trip through prism_cam (the wire proof) -----------------------
describe("U-WIRE-COOLANT-ADAPTER -- dispatcher round-trip (prism_cam)", () => {
  it("coolant_select_orchestrated returns a selected coolant through the dispatcher", async () => {
    const r = await call(server, "coolant_select_orchestrated", { decision_point: "test", operation_type: "rough", material_iso_group: "P" });
    expect(r.ok).toBe(true);
    expect(r.data.blocked).toBeUndefined();                         // not blocked by a pre-toolpath hook
    expect(r.data.no_candidates).toBe(false);                       // false survives slimResponse
    expect(typeof (r.data.coolant as { id: string }).id).toBe("string");
    expect((r.data.coolant as { applicable_ops: string[] }).applicable_ops).toContain("rough");
  });

  it("the coolant_select_orchestrated action is accepted by the registered dispatcher", async () => {
    const r = await call(server, "coolant_select_orchestrated", { decision_point: "test", operation_type: "drill", material_iso_group: "M" });
    expect(r.ok).toBe(true);
  });
});

// -- Schema validation through the dispatcher (adversarial) -------------------
describe("U-WIRE-COOLANT-ADAPTER -- schema rejection (prism_cam)", () => {
  it("rejects a missing decision_point", async () => {
    const r = await call(server, "coolant_select_orchestrated", { operation_type: "rough" });
    expect(r.ok).toBe(false);
  });

  it("rejects an invalid operation_type", async () => {
    const r = await call(server, "coolant_select_orchestrated", { decision_point: "test", operation_type: "frobnicate" });
    expect(r.ok).toBe(false);
  });

  it("rejects an invalid material_iso_group", async () => {
    const r = await call(server, "coolant_select_orchestrated", { decision_point: "test", material_iso_group: "Z" });
    expect(r.ok).toBe(false);
  });
});
