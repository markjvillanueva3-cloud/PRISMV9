/**
 * shopDispatcher — U-BRIDGE-WIRE-PROCESS-EQUIPMENT-2 round-trip suite
 * ====================================================================
 *
 * 2nd batch of 7 process-equipment engines wired into prism_shop.
 *   Centrifuge, FlotationCell, MembraneFiltration, Thickener,
 *   RocketNozzle, Thermoelectric, FreezeDrying — all calculate(input).
 *
 * @milestone BRIDGE-WIRING
 * @unit U-BRIDGE-WIRE-PROCESS-EQUIPMENT-2
 * @slot mike
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerShopDispatcher } from "../tools/dispatchers/shopDispatcher.js";

interface CapturedTool {
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(_n: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ handler });
  }
}
interface DispatchResult { ok: boolean; data: Record<string, unknown> }
async function call(server: MockMCPServer, action: string, params: Record<string, unknown> = {}): Promise<DispatchResult> {
  const tool = server.tools[0]!;
  const raw = await tool.handler({ action, params });
  const envelope = raw as { content: { type: string; text: string }[] };
  const parsed = JSON.parse(envelope.content[0]!.text) as Record<string, unknown>;
  if (parsed.ok === false) return { ok: false, data: parsed };
  return { ok: true, data: parsed };
}

let server: MockMCPServer;
beforeEach(() => {
  server = new MockMCPServer();
  registerShopDispatcher(server as unknown as Parameters<typeof registerShopDispatcher>[0]);
});

describe("U-BRIDGE-WIRE-PROCESS-EQUIPMENT-2 / round-trip per engine", () => {
  it("centrifuge_calc returns calc envelope", async () => {
    const r = await call(server, "centrifuge_calc", {});
    expect(r.ok).toBe(true);
    expect(r.data.calc).not.toBeNull();
  });

  it("flotation_cell_calc returns calc envelope", async () => {
    const r = await call(server, "flotation_cell_calc", {});
    expect(r.ok).toBe(true);
    expect(r.data.calc).not.toBeNull();
  });

  it("membrane_filtration_calc returns calc envelope", async () => {
    const r = await call(server, "membrane_filtration_calc", {});
    expect(r.ok).toBe(true);
    expect(r.data.calc).not.toBeNull();
  });

  it("thickener_calc returns calc envelope", async () => {
    const r = await call(server, "thickener_calc", {});
    expect(r.ok).toBe(true);
    expect(r.data.calc).not.toBeNull();
  });

  it("rocket_nozzle_calc returns calc envelope", async () => {
    const r = await call(server, "rocket_nozzle_calc", {});
    expect(r.ok).toBe(true);
    expect(r.data.calc).not.toBeNull();
  });

  it("thermoelectric_calc returns calc envelope", async () => {
    const r = await call(server, "thermoelectric_calc", {});
    expect(r.ok).toBe(true);
    expect(r.data.calc).not.toBeNull();
  });

  it("freeze_drying_calc returns calc envelope", async () => {
    const r = await call(server, "freeze_drying_calc", {});
    expect(r.ok).toBe(true);
    expect(r.data.calc).not.toBeNull();
  });
});

describe("U-BRIDGE-WIRE-PROCESS-EQUIPMENT-2 / wiring invariants", () => {
  it("all 7 actions resolve through switch (never 'unknown_action')", async () => {
    const actions = [
      "centrifuge_calc", "flotation_cell_calc", "membrane_filtration_calc",
      "thickener_calc", "rocket_nozzle_calc", "thermoelectric_calc", "freeze_drying_calc",
    ];
    const results = await Promise.all(actions.map(a => call(server, a, {})));
    for (const r of results) {
      expect(r.data.error).not.toBe("unknown_action");
    }
    expect(results.length).toBe(7);
  });
});
