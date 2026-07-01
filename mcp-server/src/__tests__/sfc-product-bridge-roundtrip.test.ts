/**
 * sfc-product-bridge-roundtrip.test.ts (U-OSC-SFC-PRODUCT-BRIDGE, slot:oscar, 2026-06-25)
 *
 * R15 round-trip proof that the prism_product:sfc_calculate dispatch path applies the flat->nested
 * SFC machine bridge BEFORE its pre-calculation machine-completeness gate.
 *
 * THE BUG (live-verified on the running :3100 bridge): the SFC web page
 * (web/src/components/sfc/buildSfcRequest.ts) posts the FLAT machine_max_rpm/machine_power_kw to
 * POST /api/v1/sfc/calculate -> prism_product:sfc_calculate. The pre-machine-completeness-gate
 * (hooks/MachineValidationHooks.ts) reads the NESTED machine.spindle.{max_rpm,power_kw} shape, so it
 * false-blocked EVERY web SFC calculation ("INCOMPLETE MACHINE DATA: spindle.max_rpm, spindle.power").
 *
 * Unlike the bare sys-ms1 dispatcher harness, this test REGISTERS the real completeness gate into the
 * singleton hookExecutor so the gate is actually LIVE on the dispatch path (the gate is otherwise
 * registered only at server startup via registerDomainHooks). It then drives the real
 * registerProductDispatcher handler end to end:
 *   - a no-machine payload must BLOCK (the gate is live), and
 *   - the FLAT web payload must NOT block (the productDispatcher bridge reshaped it for the gate).
 * Reverting the productDispatcher bridge hunk turns the second assertion red.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { registerProductDispatcher } from "../tools/dispatchers/productDispatcher.js";
import { hookExecutor } from "../engines/HookExecutor.js";
import { preMachineCompletenessGate } from "../hooks/MachineValidationHooks.js";

interface CapturedTool {
  name: string;
  handler: (args: Record<string, unknown>) => Promise<{ content?: Array<{ text: string }> }>;
}
interface MockServer {
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]): void;
}

function registerAndGetProduct(): CapturedTool {
  const tools: CapturedTool[] = [];
  const server: MockServer = {
    tool(name, _description, _schema, handler) {
      tools.push({ name, handler });
    },
  };
  registerProductDispatcher(server as never);
  return tools[0];
}

async function callAction(tool: CapturedTool, action: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
  const result = await tool.handler({ action, params });
  const text = result?.content?.[0]?.text;
  return text ? (JSON.parse(text) as Record<string, unknown>) : (result as Record<string, unknown>);
}

// The EXACT flat fields web/src/components/sfc/buildSfcRequest.ts posts (JM default machine preset).
const TOOL_GEOMETRY = {
  material: "1045", operation: "slot", tool_material: "carbide",
  tool_diameter: 10, number_of_teeth: 4, depth: 5, width: 10,
} as const;

describe("prism_product:sfc_calculate -- flat machine bridge round-trip (U-OSC-SFC-PRODUCT-BRIDGE)", () => {
  let product: CapturedTool;

  beforeAll(() => {
    // Make the real completeness gate LIVE on the dispatch path (server-startup registration is not
    // run in a unit harness). vitest isolates the module registry per file, so this singleton mutation
    // does not leak to other test files; afterAll restores it regardless.
    hookExecutor.register(preMachineCompletenessGate);
    product = registerAndGetProduct();
  });

  afterAll(() => {
    hookExecutor.unregister(preMachineCompletenessGate.id);
  });

  it("the live gate is actually registered (guards against a silent no-op test)", () => {
    const ids = hookExecutor.getForPhase("pre-calculation").map((h) => h.id);
    expect(ids).toContain("pre-machine-completeness-gate");
  });

  it("no-machine sfc_calculate is gate-BLOCKED (proves the gate fires on the product path)", async () => {
    const r = await callAction(product, "sfc_calculate", { ...TOOL_GEOMETRY });
    expect(r.blocked).toBe(true);
    expect(r.blocker).toBe("pre-machine-completeness-gate");
  });

  it("FLAT web payload (machine_max_rpm/machine_power_kw) is BRIDGED -> NOT gate-blocked (the P0 fix)", async () => {
    const r = await callAction(product, "sfc_calculate", {
      ...TOOL_GEOMETRY, machine_max_rpm: 8100, machine_power_kw: 22.4,
    });
    expect(r.blocked).not.toBe(true);
    expect(r.action).toBe("sfc_calculate");
  });
});
