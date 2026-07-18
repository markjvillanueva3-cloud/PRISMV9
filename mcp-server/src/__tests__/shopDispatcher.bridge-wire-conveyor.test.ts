/**
 * shopDispatcher — U-BRIDGE-WIRE-CONVEYOR round-trip suite
 * =========================================================
 *
 * Wires ConveyorDesignEngine into prism_shop via a single physics-grade action:
 *   ConveyorDesignEngine.calculate(input) -> conveyor_design_calc
 *
 * Pre-wire state: ZERO dispatcher references (orphan). Reference physics:
 * CEMA 7th Ed, DIN 22101, ISO 5048. Mike-domain misc/material-handling.
 *
 * @milestone BRIDGE-WIRING
 * @unit U-BRIDGE-WIRE-CONVEYOR
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

describe("U-BRIDGE-WIRE-CONVEYOR / conveyor_design_calc", () => {
  it("returns ok envelope with all required result fields on a representative input", async () => {
    const r = await call(server, "conveyor_design_calc", {
      throughput_tph: 500,
      belt_speed_m_s: 2.5,
      conveyor_length_m: 100,
      lift_height_m: 10,
      material_density_kg_m3: 1500,
    });
    expect(r.ok).toBe(true);
    const calc = r.data.calc as Record<string, { value: number; unit: string; uncertainty: number }>;
    expect(calc).not.toBeNull();
    // Engine contract: all 11 AtomicValue keys present (per ConveyorDesignResult interface).
    expect(calc.required_belt_width.value).toBeGreaterThan(0);
    expect(calc.drive_power.value).toBeGreaterThan(0);
    expect(calc.drive_power.unit).toBe("kW");
    expect(calc.effective_tension.value).toBeGreaterThan(0);
    expect(calc.min_pulley_diameter.value).toBeGreaterThan(0);
  });

  it("higher throughput requires more drive power (monotonicity invariant)", async () => {
    const baseParams = { belt_speed_m_s: 2, conveyor_length_m: 50, lift_height_m: 5, material_density_kg_m3: 1500 };
    const low = await call(server, "conveyor_design_calc", { ...baseParams, throughput_tph: 100 });
    const high = await call(server, "conveyor_design_calc", { ...baseParams, throughput_tph: 1000 });
    const lowPower = (low.data.calc as Record<string, { value: number }>).drive_power.value;
    const highPower = (high.data.calc as Record<string, { value: number }>).drive_power.value;
    expect(highPower).toBeGreaterThan(lowPower);
  });

  it("higher lift height requires more drive power (energy-conservation invariant)", async () => {
    const baseParams = { throughput_tph: 500, belt_speed_m_s: 2, conveyor_length_m: 50, material_density_kg_m3: 1500 };
    const flat = await call(server, "conveyor_design_calc", { ...baseParams, lift_height_m: 0 });
    const lifted = await call(server, "conveyor_design_calc", { ...baseParams, lift_height_m: 20 });
    const flatPower = (flat.data.calc as Record<string, { value: number }>).drive_power.value;
    const liftedPower = (lifted.data.calc as Record<string, { value: number }>).drive_power.value;
    expect(liftedPower).toBeGreaterThan(flatPower);
  });

  it("action is recognized by the switch (never 'unknown_action')", async () => {
    const r = await call(server, "conveyor_design_calc", { throughput_tph: 100, belt_speed_m_s: 1.5 });
    expect(r.data.error).not.toBe("unknown_action");
  });
});
