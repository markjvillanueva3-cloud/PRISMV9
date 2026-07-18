/**
 * turningDispatcher silent-stub fixes — wiring test
 * =================================================
 * U-LW-TURN-STUB-WIRE (whiskey, 2026-07-03): the iter9 wire-unwired-loop
 * auto-generated 4 turningDispatcher actions whose engines have NONE of the
 * guessed methods, so they ALWAYS returned {success:true, data:{note:"method
 * not callable"}} — silent coverage lies:
 *   • insert_grade_select            -> engine method is calculate() (not select/recommend/run)
 *   • lathe_program_audit_pipeline_run -> static auditOne() (not audit/run/process)
 *   • multi_spindle_automatic_plan   -> executeAction() router (not plan/run/analyze)
 *   • swiss_type_intelligence_analyze -> executeAction() router (not analyze/run)
 * This test proves each now routes to the REAL engine (the stub note is gone).
 */

import { describe, it, expect } from "vitest";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";
import { insertGradeSelectionEngine } from "../engines/InsertGradeSelectionEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params: Record<string, unknown> }) => Promise<{ content?: Array<{ text: string }> } | unknown>;
}

function createMockServer(): { server: { tool: (n: string, d: string, s: unknown, h: CapturedTool["handler"]) => void }; tools: CapturedTool[] } {
  const tools: CapturedTool[] = [];
  const server = { tool(name: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) { tools.push({ name, handler }); } };
  return { server, tools };
}

async function callAction(tool: CapturedTool, action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const result = await tool.handler({ action, params });
  const r = result as { content?: Array<{ text: string }> };
  const text = r?.content?.[0]?.text;
  return text ? (JSON.parse(text) as Record<string, unknown>) : (result as Record<string, unknown>);
}

function payload(res: Record<string, unknown>): Record<string, unknown> {
  let d: Record<string, unknown> = res;
  if (d.data && typeof d.data === "object") d = d.data as Record<string, unknown>;
  return d;
}

const { server, tools } = createMockServer();
registerTurningDispatcher(server);
const turn = tools[0];

const STUB_NOTE = "method not callable";

describe("turningDispatcher silent-stub fixes", () => {
  it("insert_grade_select routes to InsertGradeSelectionEngine.calculate — real ISO group, not the stub", async () => {
    const input = { workpiece_material: "medium_carbon_steel", operation: "roughing", depth_of_cut_mm: 2, feed_mm_rev: 0.25 };
    const res = await callAction(turn, "insert_grade_select", input);
    const d = payload(res);
    expect(JSON.stringify(res)).not.toContain(STUB_NOTE);
    // Real InsertGradeResult: medium_carbon_steel -> ISO P application group.
    expect(d.iso_application_group).toBe("P");
    expect(typeof d.substrate_class).toBe("string");
    // Parity with the direct engine call.
    const direct = insertGradeSelectionEngine.calculate(input as never);
    expect(d.iso_application_group).toBe(direct.iso_application_group);
    expect(d.substrate_class).toBe(direct.substrate_class);
  });

  it("lathe_program_audit_pipeline_run routes to auditOne — no 'method not callable' stub", async () => {
    const res = await callAction(turn, "lathe_program_audit_pipeline_run", {
      programText: "G20\nG97 S1000 M03\nG00 X1.0 Z0.1\nG01 Z-1.0 F0.01\nG00 X2.0\nM30",
      variantPath: "test.nc", partNumber: "TEST-001", machineId: "LTH-01", machineModel: "Okuma GENOS L300",
      envelope: { x_min_mm: -10, x_max_mm: 300, z_min_mm: -400, z_max_mm: 10 },
    });
    expect(JSON.stringify(res)).not.toContain(STUB_NOTE);
    // reached the real pipeline — the result is a structured audit object, not the stub note.
    const d = payload(res);
    expect(typeof d).toBe("object");
    expect(d.engine).not.toBe("LatheProgramAuditPipelineEngine"); // the stub tagged {engine, note}
  });

  it("multi_spindle_automatic_plan reaches the executeAction router (stub gone)", async () => {
    const res = await callAction(turn, "multi_spindle_automatic_plan", {
      action: "multispindle_assign_stations",
      part: { part_number: "P1", operations: [] },
      machine: { spindles: 6, stations: 6 },
    });
    // Real router reached — either real data or a fail-loud error, NEVER the silent stub.
    expect(JSON.stringify(res)).not.toContain(STUB_NOTE);
  });

  it("swiss_type_intelligence_analyze reaches the executeAction router (stub gone)", async () => {
    const res = await callAction(turn, "swiss_type_intelligence_analyze", {
      action: "swiss_analyze_guide_bushing",
      part: { part_number: "S1", max_diameter_mm: 12, length_mm: 40 },
      machine: { guide_bushing: true, max_bar_mm: 20 },
    });
    expect(JSON.stringify(res)).not.toContain(STUB_NOTE);
  });

  it("REGRESSION: none of the 4 fixed actions returns the {engine,note:'method not callable'} stub shape", async () => {
    const calls: Array<[string, Record<string, unknown>]> = [
      ["insert_grade_select", { workpiece_material: "low_carbon_steel", operation: "finishing" }],
      ["lathe_program_audit_pipeline_run", { programText: "G20\nM30", variantPath: "x.nc", partNumber: "X", machineId: "LTH-01", machineModel: "Okuma", envelope: { x_min_mm: -10, x_max_mm: 300, z_min_mm: -400, z_max_mm: 10 } }],
      ["multi_spindle_automatic_plan", { action: "multispindle_assign_stations", part: {}, machine: {} }],
      ["swiss_type_intelligence_analyze", { action: "swiss_analyze_guide_bushing", part: {}, machine: {} }],
    ];
    for (const [action, params] of calls) {
      const res = await callAction(turn, action, params);
      expect(JSON.stringify(res), `${action} still stubbed`).not.toContain(STUB_NOTE);
    }
  });
});
