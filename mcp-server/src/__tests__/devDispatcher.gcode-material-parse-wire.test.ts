/**
 * devDispatcher × GCodeMaterialParserEngine wire
 * ([WIRING]/U-WIRE-GCODE-MATERIAL-PARSE, slot:romeo).
 *
 * GCodeMaterialParserEngine (a pure static parser) was BUILT + tested but UNWIRED —
 * zero dispatcher refs (re-verified by grep). It extracts the workpiece material +
 * ISO group (P/M/K/N/S/H) from a G-code program header — the material lookup that
 * feeds SFC cutting-data when the NC corpus is parsed. This wires
 * `gcode_material_parse` into prism_dev.
 *
 * Round-trip THROUGH the registered dispatcher (not a direct engine import).
 * ANTI-STUB: real recognized callouts must return the correct canonical material +
 * ISO group — a no-op case returning {material:null} passes shape checks but FAILS
 * the exact-material assertions. Recognized formats per the engine's MATERIAL_RULES:
 *   (MATERIAL: 4140) → steel_4140 / P    (MATL = 6061-T6) → aluminum_6061 / N
 *
 * @milestone BLACKWELL-DB-GEN-MS0
 * @unit U-WIRE-GCODE-MATERIAL-PARSE
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";

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
  const raw = (await tool.handler({ action, params })) as { content?: { type: string; text: string }[] };
  if (!raw.content) return { ok: false, data: raw as unknown as Record<string, unknown> };
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(raw.content[0]!.text); } catch { return { ok: false, data: { rawText: raw.content[0]!.text } }; }
  // A successful MaterialMatch always carries a numeric `confidence`; an error envelope does not.
  if (typeof parsed.confidence !== "number") return { ok: false, data: parsed };
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerDevDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

const PROG_4140 = ["%", "(MATERIAL: 4140)", "O1234 (BRACKET)", "G0 G90 G54", "M30", "%"].join("\n");
const PROG_6061 = ["%", "(MATL = 6061-T6)", "O2000", "G0 G90 G54", "M30", "%"].join("\n");
const PROG_NONE = ["%", "O3000 (NO MATERIAL CALLOUT)", "G0 G90 G54", "G1 X1. F10.", "M30", "%"].join("\n");

describe("devDispatcher × GCodeMaterialParser wire (U-WIRE-GCODE-MATERIAL-PARSE)", () => {
  it("gcode_material_parse — recognizes 4140 steel → steel_4140 / ISO P (anti-stub)", async () => {
    const r = await call(server, "gcode_material_parse", { program: PROG_4140 });
    expect(r.ok).toBe(true);
    expect(r.data.material).toBe("steel_4140");
    expect(r.data.iso_group).toBe("P");
    expect(typeof r.data.confidence).toBe("number");
    expect(r.data.confidence as number).toBeGreaterThan(0.5);
    expect(r.data.dialect).not.toBeNull(); // a labeled callout was recognized
  });

  it("gcode_material_parse — recognizes 6061-T6 via MATL= → aluminum_6061 / ISO N (variability)", async () => {
    const r = await call(server, "gcode_material_parse", { program: PROG_6061 });
    expect(r.ok).toBe(true);
    expect(r.data.material).toBe("aluminum_6061");
    expect(r.data.iso_group).toBe("N");
  });

  it("gcode_material_parse — a program with no callout returns material:null + reason (fail-soft)", async () => {
    const r = await call(server, "gcode_material_parse", { program: PROG_NONE });
    expect(r.ok).toBe(true); // still a valid MaterialMatch (has confidence), just no material
    // responseSlimmer strips null scalars on the wire, so "no material" = null OR absent (== null catches both).
    expect(r.data.material == null).toBe(true);
    expect(r.data.iso_group == null).toBe(true);
    expect(typeof r.data.reason).toBe("string"); // reason is a non-null string → survives slimming, the fail-loud signal
  });

  it("gcode_material_parse — missing program is rejected by the schema", async () => {
    const r = await call(server, "gcode_material_parse", {});
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.data).toLowerCase()).toMatch(/program|invalid params|required/);
  });

  it("gcode_material_parse action is accepted by the registered dispatcher (in z.enum + has a case)", async () => {
    const r = await call(server, "gcode_material_parse", { program: PROG_4140 });
    expect(JSON.stringify(r.data).toLowerCase()).not.toMatch(/unknown action|no such action/);
  });
});
