/**
 * U-QP-GCODE-TIME-WIRE (charlie 2026-06-12) -- wire the precise S-curve
 * CycleTimeEstimatorEngine into the quote path. Two seams:
 *   1. prism_quoting:gcode_cycle_time dispatcher action (precise engine exposed).
 *   2. InstantQuoteEngine: when input.gcode_program is present, cycle_time comes
 *      from the real G-code (deterministic) instead of the MRR/parametric estimate.
 *
 * Verifies the action is in the production enum (not just the handler map -- the
 * MockMCPServer harness bypasses the z.enum gate), round-trips through the
 * dispatcher, and proves the InstantQuoteEngine E2E selects "gcode_precise".
 */
import { describe, it, expect } from "vitest";
import { registerQuotingDispatcher } from "../tools/dispatchers/quotingDispatcher.js";
import { quotingActionEnum } from "../schemas/quotingActionSchemas.js";
import { instantQuoteEngine, type InstantQuoteInput } from "../engines/InstantQuoteEngine.js";
import { cycleTimeEstimatorEngine } from "../engines/CycleTimeEstimatorEngine.js";

type Handler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }>;
function makeServer(): Handler {
  let captured: Handler | null = null;
  registerQuotingDispatcher({ tool: (_n: string, _d: string, _s: unknown, h: Handler) => { captured = h; } });
  return captured!;
}
function parse(out: { content: Array<{ type: "text"; text: string }> }) {
  return JSON.parse(out.content[0].text);
}

// Representative mill program: rapids, linear cuts, 2 tool changes, a G81 drill
// cycle (3 holes) -- exercises rapid + cut + tool-change + canned-cycle time end
// to end through the dispatcher and the quote engine.
const PROG = `%
O0001
G21 G90 G54 G98
T1 M06
G0 X0 Y0 Z25
S3000 M03
G0 Z5
G1 Z-3 F150
G1 X80 Y0 F600
G1 X80 Y40
G1 X0 Y40
G0 Z25
T2 M06
G0 X10 Y10 Z25
S2500 M03
G81 X10 Y10 Z-12 R2 F120
X40 Y10
X70 Y10
G80
G0 Z25
M30
%`;

const BASE_INPUT: InstantQuoteInput = {
  part_name: "wire-test-bracket",
  material: "4140",
  quantity: 10,
  stock_dimensions_mm: { length: 100, width: 50, height: 25 },
  part_volume_cm3: 80,
  iso_group: "P",
  machine_type: "vertical_mill",
};

describe("U-QP-GCODE-TIME-WIRE -- dispatcher action gcode_cycle_time", () => {
  it("the action is registered in the production enum (not only the handler map)", () => {
    // Guards the MockMCPServer-bypasses-z.enum trap: production rejects any action
    // not in quotingActionEnum, so the action MUST be in the enum to be callable.
    expect(quotingActionEnum.options).toContain("gcode_cycle_time");
  });

  it("round-trips a drill program through the dispatcher -> precise S-curve time", async () => {
    const handler = makeServer();
    const out = parse(await handler({ action: "gcode_cycle_time", params: { gcode: PROG, controller: "haas", machine_profile: "haas_vf2" } }));
    // A successful result carries numeric time components (an error response would not).
    expect(out.total_seconds).toBeGreaterThan(0);
    expect(out.cutting_time).toBeGreaterThan(0);     // the G1 cuts + the G81 drills
    expect(out.tool_change_time).toBeGreaterThan(0); // 2 x M06
    expect(out.machine_profile).toBe("haas_vf2");
  });

  it("machine_profile selects kinematics: faster-rapid okuma_m460v < haas_vf2 rapid_time", async () => {
    const handler = makeServer();
    const okuma = parse(await handler({ action: "gcode_cycle_time", params: { gcode: PROG, controller: "okuma", machine_profile: "okuma_m460v" } }));
    const haas = parse(await handler({ action: "gcode_cycle_time", params: { gcode: PROG, controller: "haas", machine_profile: "haas_vf2" } }));
    expect(okuma.rapid_time).toBeLessThan(haas.rapid_time);
  });

  it("rejects an invalid controller via schema (z.enum gate)", async () => {
    const handler = makeServer();
    const out = await handler({ action: "gcode_cycle_time", params: { gcode: PROG, controller: "not_a_controller" } });
    expect(out.isError).toBe(true);
    expect(parse(out).error).toBe("schema-validation-failed");
  });

  it("missing required gcode -> schema validation fails (no silent zero)", async () => {
    const handler = makeServer();
    const out = await handler({ action: "gcode_cycle_time", params: { controller: "fanuc" } });
    expect(out.isError).toBe(true);
    expect(parse(out).error).toBe("schema-validation-failed");
  });
});

describe("U-QP-GCODE-TIME-WIRE -- InstantQuoteEngine uses gcode_precise when a program is present", () => {
  it("quote WITH gcode_program -> cycle_time_source='gcode_precise' + matches the engine estimate", () => {
    const r = instantQuoteEngine.quote({ ...BASE_INPUT, gcode_program: PROG, gcode_controller: "haas", gcode_machine_profile: "haas_vf2" });
    const direct = cycleTimeEstimatorEngine.estimateFromGCode(PROG, { controller: "haas", machine_profile: "haas_vf2" });
    expect(r.cycle_time_source).toBe("gcode_precise");
    expect(r.physics_engines_used).toContain("CycleTimeEstimatorEngine");
    // cycle_time_min must equal the engine's total_seconds/60 (the wired-in value).
    expect(r.cycle_time_min).toBeCloseTo(direct.total_seconds / 60, 4);
  });

  it("quote WITHOUT gcode_program -> falls back to a non-gcode source", () => {
    const r = instantQuoteEngine.quote(BASE_INPUT);
    expect(r.cycle_time_source).not.toBe("gcode_precise");
    expect(r.physics_engines_used).not.toContain("CycleTimeEstimatorEngine");
  });

  it("the G-code path changes the quoted cycle time vs the MRR/parametric estimate", () => {
    const withGcode = instantQuoteEngine.quote({ ...BASE_INPUT, gcode_program: PROG, gcode_controller: "haas", gcode_machine_profile: "haas_vf2" });
    const without = instantQuoteEngine.quote(BASE_INPUT);
    // Different sources -> different cycle time (proves the wiring actually drives output).
    expect(withGcode.cycle_time_min).not.toBeCloseTo(without.cycle_time_min, 2);
  });

  it("empty gcode_program -> falls back gracefully (no throw, not gcode_precise)", () => {
    const r = instantQuoteEngine.quote({ ...BASE_INPUT, gcode_program: "   " });
    expect(r.cycle_time_source).not.toBe("gcode_precise");
    expect(r.cycle_time_min).toBeGreaterThan(0);
  });
});
