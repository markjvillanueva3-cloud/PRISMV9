/**
 * camDispatcher U-WIRE-ENTRYEXIT-ADAPTER round-trip tests -- EntryExitStrategyAdapter.
 *
 * Validates the new entryexit_select_orchestrated action wires through prism_cam:
 *   entryexit_select_orchestrated -> entryExitStrategyAdapter.selectEntryExitOrchestrated(req)
 *
 * The Adapter (NOT the base engine -- the base sibling is already wired) orchestrates
 * entry/exit-strategy selection: it picks a domain catalog by decision_point/domain,
 * HARD-FILTERS it (drops center-cut-only motions when the tool is not center-cutting;
 * drops motions whose applicable_ops exclude the requested op), scores the viable
 * candidates, and routes the choice through the pipeline decision orchestrator.
 * Returns { strategy: EntryExitCandidate, decision, no_candidates }. Pure read/decision
 * surface (no fs, no mutation).
 *
 * Content-sensitive proofs (a stub that ignored the request would fail these):
 *   - center_cutting:false MUST drop MILL-plunge (the only requires_center_cut entry in
 *     MILL_ENTRY) -> winner.requires_center_cut === false.
 *   - operation_type:"finish" MUST drop the rough-only entries (every MILL_ENTRY entry
 *     has a non-empty applicable_ops, so the op-filter applies) -> winner supports finish.
 *
 * Wired slot:papa 2026-06-15 -- WIRE-UNWIRED-PAPA cross-galaxy v2
 * (galaxy:kilo engine wired into prism_cam; committed to shared tree w/ slot:papa->kilo
 * attribution -- kilo not live + its slot worktree is stale-without-the-engine).
 *
 * @milestone WIRE-UNWIRED-PAPA
 * @unit U-WIRE-ENTRYEXIT-ADAPTER
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";
import { EntryExitStrategyAdapter } from "../engines/EntryExitStrategyAdapter.js";

// MILL_ENTRY catalog ids (the default catalog for an unscoped decision_point).
const MILL_ENTRY_IDS = ["MILL-helix", "MILL-ramp", "MILL-plunge", "MILL-pre_drill", "MILL-arc_on", "MILL-rolling_in"];
const MOTION_TYPES = [
  "helix", "ramp", "plunge", "pre_drill", "arc_on", "arc_off", "rolling_in", "lead_off",
  "retract_linear", "normal_entry", "tilted_helix", "lead_in_arc", "pulsed", "cw", "blast",
  "stationary_pierce", "dynamic_pierce", "low_pressure_pierce",
];

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

type EntryExitReq = Parameters<EntryExitStrategyAdapter["selectEntryExitOrchestrated"]>[0];

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerCamDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

// -- Engine-direct reference behavior ----------------------------------------
describe("U-WIRE-ENTRYEXIT-ADAPTER -- selectEntryExitOrchestrated contract", () => {
  it("center_cutting:false drops the center-cut-only motion (MILL-plunge) -- filter proof", () => {
    const eng = new EntryExitStrategyAdapter();
    const d = eng.selectEntryExitOrchestrated({ decision_point: "test", operation_type: "rough", center_cutting: false } as unknown as EntryExitReq);
    expect(d.no_candidates).toBe(false);
    expect(d.strategy.requires_center_cut).toBe(false);   // a non-center-cut tool can never win a center-cut motion
    expect(d.strategy.id).not.toBe("MILL-plunge");        // plunge is the only center-cut entry -> must be filtered out
  });

  it("operation_type:'finish' yields a finish-capable motion (op-filter proof, not a fixed winner)", () => {
    const eng = new EntryExitStrategyAdapter();
    const d = eng.selectEntryExitOrchestrated({ decision_point: "test", operation_type: "finish" } as unknown as EntryExitReq);
    expect(d.no_candidates).toBe(false);
    expect(d.strategy.applicable_ops).toContain("finish"); // rough-only entries (ramp/plunge/lead_off) are filtered out
  });

  it("an unscoped request resolves to a MILL_ENTRY motion with a valid motion_type", () => {
    const eng = new EntryExitStrategyAdapter();
    const d = eng.selectEntryExitOrchestrated({ decision_point: "test", operation_type: "rough" } as unknown as EntryExitReq);
    expect(d.no_candidates).toBe(false);
    expect(MILL_ENTRY_IDS).toContain(d.strategy.id);       // default catalog membership
    expect(MOTION_TYPES).toContain(d.strategy.motion_type); // motion_type is a catalog value, not a fabrication
  });
});

// -- LIVE round-trip through prism_cam (the wire proof) -----------------------
describe("U-WIRE-ENTRYEXIT-ADAPTER -- dispatcher round-trip (prism_cam)", () => {
  it("entryexit_select_orchestrated returns a finish-capable strategy through the dispatcher", async () => {
    const r = await call(server, "entryexit_select_orchestrated", { decision_point: "test", operation_type: "finish" });
    expect(r.ok).toBe(true);
    expect(r.data.blocked).toBeUndefined();                                       // not blocked by a pre-toolpath hook
    expect(r.data.no_candidates).toBe(false);                                     // false survives slimResponse
    expect(typeof (r.data.strategy as { id: string }).id).toBe("string");
    expect((r.data.strategy as { applicable_ops: string[] }).applicable_ops).toContain("finish");
  });

  it("the center_cutting:false filter survives the dispatcher round-trip", async () => {
    const r = await call(server, "entryexit_select_orchestrated", { decision_point: "test", operation_type: "rough", center_cutting: false });
    expect(r.ok).toBe(true);
    expect(r.data.no_candidates).toBe(false);
    expect((r.data.strategy as { requires_center_cut: boolean }).requires_center_cut).toBe(false); // false survives slim
  });
});

// -- Schema validation through the dispatcher (adversarial) -------------------
describe("U-WIRE-ENTRYEXIT-ADAPTER -- schema rejection (prism_cam)", () => {
  it("rejects a missing decision_point", async () => {
    const r = await call(server, "entryexit_select_orchestrated", { operation_type: "rough" });
    expect(r.ok).toBe(false);
  });

  it("rejects an invalid operation_type", async () => {
    const r = await call(server, "entryexit_select_orchestrated", { decision_point: "test", operation_type: "frobnicate" });
    expect(r.ok).toBe(false);
  });

  it("rejects an invalid objective", async () => {
    const r = await call(server, "entryexit_select_orchestrated", { decision_point: "test", objective: "fastest" });
    expect(r.ok).toBe(false);
  });
});
