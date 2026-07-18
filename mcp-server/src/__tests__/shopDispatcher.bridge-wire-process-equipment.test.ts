/**
 * shopDispatcher — U-BRIDGE-WIRE-PROCESS-EQUIPMENT round-trip suite
 * ==================================================================
 *
 * Wires 7 unwired sizing/optimizer engines into prism_shop as a single batch:
 *   - FlyingShearEngine.calculate         -> flying_shear_calc
 *   - CycloneSeparatorEngine.calculate    -> cyclone_separator_calc
 *   - BucketElevatorEngine.calculate      -> bucket_elevator_calc
 *   - MixerAgitatorEngine.calculate       -> mixer_agitator_calc
 *   - TransformerEngine.calculate         -> transformer_calc
 *   - DistillationColumnEngine.calculate  -> distillation_column_calc
 *   - GrepOptimizerEngine.optimize        -> grep_optimize
 *
 * Pre-wire: ZERO dispatcher references for all 7. Shipped from slot/mike worktree.
 *
 * @milestone BRIDGE-WIRING
 * @unit U-BRIDGE-WIRE-PROCESS-EQUIPMENT
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

describe("U-BRIDGE-WIRE-PROCESS-EQUIPMENT / round-trip per engine", () => {
  it("flying_shear_calc returns a structured calc envelope", async () => {
    const r = await call(server, "flying_shear_calc", {
      strip_width_mm: 1000, strip_thickness_mm: 2.5, line_speed_m_min: 60, cut_length_mm: 500,
    });
    expect(r.ok).toBe(true);
    expect(r.data.calc).not.toBeNull();
    expect(typeof r.data.calc).toBe("object");
  });

  it("cyclone_separator_calc returns a structured calc envelope", async () => {
    const r = await call(server, "cyclone_separator_calc", { gas_flow_m3_h: 5000 });
    expect(r.ok).toBe(true);
    expect(r.data.calc).not.toBeNull();
  });

  it("bucket_elevator_calc returns a structured calc envelope", async () => {
    const r = await call(server, "bucket_elevator_calc", { capacity_tph: 100, lift_height_m: 20 });
    expect(r.ok).toBe(true);
    expect(r.data.calc).not.toBeNull();
  });

  it("mixer_agitator_calc returns a structured calc envelope", async () => {
    const r = await call(server, "mixer_agitator_calc", {});
    expect(r.ok).toBe(true);
    expect(r.data.calc).not.toBeNull();
  });

  it("transformer_calc returns a structured calc envelope", async () => {
    const r = await call(server, "transformer_calc", {});
    expect(r.ok).toBe(true);
    expect(r.data.calc).not.toBeNull();
  });

  it("distillation_column_calc returns a structured calc envelope", async () => {
    const r = await call(server, "distillation_column_calc", {});
    expect(r.ok).toBe(true);
    expect(r.data.calc).not.toBeNull();
  });

  it("grep_optimize returns an optimization envelope", async () => {
    const r = await call(server, "grep_optimize", { pattern: "TODO", include: "**/*.ts" });
    expect(r.ok).toBe(true);
    expect(r.data.optimization).not.toBeNull();
  });
});

describe("U-BRIDGE-WIRE-PROCESS-EQUIPMENT / wiring invariants", () => {
  it("all 7 actions resolve through the switch (never 'unknown_action')", async () => {
    const actions = [
      ["flying_shear_calc",       { strip_width_mm: 100, strip_thickness_mm: 1, line_speed_m_min: 10, cut_length_mm: 100 }],
      ["cyclone_separator_calc",  { gas_flow_m3_h: 1000 }],
      ["bucket_elevator_calc",    { capacity_tph: 10, lift_height_m: 5 }],
      ["mixer_agitator_calc",     {}],
      ["transformer_calc",        {}],
      ["distillation_column_calc", {}],
      ["grep_optimize",           { pattern: "x" }],
    ] as const;
    const results = await Promise.all(actions.map(([a, p]) => call(server, a, p as Record<string, unknown>)));
    for (const r of results) {
      expect(r.data.error).not.toBe("unknown_action");
    }
    expect(results.length).toBe(7);
  });
});
