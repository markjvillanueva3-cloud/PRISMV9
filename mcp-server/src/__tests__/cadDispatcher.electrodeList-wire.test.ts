/**
 * cadDispatcher U-WIRE-ELECTRODE-LIST round-trip tests.
 *
 * Validates 4 new prism_cad read-only actions wiring the dispatcher-DARK
 * HyperCADSElectrodeEngine catalog surface (sinker-EDM electrode generation):
 *   cad_electrode_list_descriptions   -> listElectrodeDescriptions() (9 descriptions)
 *   cad_electrode_list_orbits         -> listOrbitStrategies() (11 EDM orbits)
 *   cad_electrode_list_holders        -> listHolderLibraries() (Erowa / System-3R)
 *   cad_electrode_list_holder_zheights-> listHolderZHeightsMm() (9 standard Z heights)
 *
 * These are PURE no-arg catalog reads (the live-bridge ops pickHolder/generateElectrode/
 * exportToEdm need a LiveBridgeContext and are deliberately NOT wired here). Because they
 * take no input, there is no meaningful per-call failure mode to malform; coverage is the
 * 4 happy-path round-trips with REAL reference values + the dispatcher's unknown-action
 * guard.
 *
 * Pattern (mirrors camDispatcher.holderSelect-wire.test.ts): LIVE dispatcher round-trip via
 * registerCadDispatcher(shim). prism_cad wraps success as
 * content[0].text = JSON.stringify(slimResponse(result)) (engine payload TOP-LEVEL).
 *
 * Reference values are REAL (HyperCADSElectrodeEngine.ts ELECTRODE_DESCRIPTIONS /
 * ELECTRODE_ORBITS / HOLDER_LIBRARIES / HOLDER_Z_HEIGHTS_MM).
 *
 * Wired slot:romeo 2026-06-15 -- task #25 (HyperCADSElectrodeEngine -> prism_cad).
 *
 * @milestone WIRE-UNWIRED
 * @unit U-WIRE-ELECTRODE-LIST
 */

import { describe, it, expect } from "vitest";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";

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
function newServer(): MockMCPServer {
  const s = new MockMCPServer();
  registerCadDispatcher(s as unknown as { tool: MockMCPServer["tool"] });
  return s;
}
async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools.find((t) => t.name === "prism_cad") ?? server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const text = (raw as { content: { type: string; text: string }[] }).content[0]!.text;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

describe("U-WIRE-ELECTRODE-LIST — HyperCADSElectrodeEngine via prism_cad", () => {
  it("registers the prism_cad tool", () => {
    const tool = newServer().tools.find((t) => t.name === "prism_cad");
    expect(tool?.name).toBe("prism_cad");
  });

  it("cad_electrode_list_descriptions returns the 9 real electrode descriptions", async () => {
    const s = newServer();
    const r = await call(s, "cad_electrode_list_descriptions");
    expect(r.ok).toBe(true);
    const d = r.data.descriptions as string[];
    expect(Array.isArray(d)).toBe(true);
    expect(d).toContain("Core electrode");
    expect(d).toContain("Cavity electrode");
    expect(d).toContain("User defined electrode");
    expect(d.length).toBe(9);
  });

  it("cad_electrode_list_orbits returns the EDM orbit strategies", async () => {
    const s = newServer();
    const r = await call(s, "cad_electrode_list_orbits");
    expect(r.ok).toBe(true);
    const o = r.data.orbits as string[];
    expect(o).toContain("Sink");
    expect(o).toContain("Square");
    expect(o).toContain("Sphere");
    expect(o.length).toBeGreaterThanOrEqual(8);
  });

  it("cad_electrode_list_holders returns the Erowa holder libraries", async () => {
    const s = newServer();
    const r = await call(s, "cad_electrode_list_holders");
    expect(r.ok).toBe(true);
    const h = r.data.holder_libraries as string[];
    expect(h).toContain("Erowa_r");
    expect(h).toContain("Erowa_s");
  });

  it("cad_electrode_list_holder_zheights returns the 9 standard Z heights (mm)", async () => {
    const s = newServer();
    const r = await call(s, "cad_electrode_list_holder_zheights");
    expect(r.ok).toBe(true);
    const z = r.data.holder_z_heights_mm as number[];
    expect(z).toEqual([20, 40, 60, 80, 100, 150, 200, 250, 300]);
  });

  it("unknown electrode action -> dispatcher error (guard)", async () => {
    const s = newServer();
    const r = await call(s, "cad_electrode_list_bogus");
    expect(r.ok).toBe(false);
  });
});
