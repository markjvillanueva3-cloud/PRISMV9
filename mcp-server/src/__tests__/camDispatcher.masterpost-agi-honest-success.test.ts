/**
 * camDispatcher :: master_post_unified_agi_generate -- HONEST SUCCESS regression
 * (U-PP-AGI-HONEST-SUCCESS, slot:echo 2026-06-27)
 *
 * The closed-loop post-training harness (scripts/post-training-harness.mjs) surfaced a silent
 * failure: the dispatcher hardcoded `result = { success: true, data: engine.generatePost?.(...) ?? {note} }`,
 * so when MasterPostProcessorUnifiedAGIEngine.generatePost returned its EMPTY error-result
 * ({ gcode:"", line_count:0, warnings:["No segments or G-code provided"] } -- the engine consumes
 * `segments`/`gcode`, NOT raw `operations`), the action still reported success:true with a 0-line
 * program. That is the exact R12 "success:true is a lie if it emitted nothing" class.
 *
 * These tests round-trip through the REAL registerCamDispatcher handler (fakeServer pattern, same as
 * ppDispatcher.controller-translate.test.ts) and assert the dispatcher now reports success HONESTLY:
 *   - operations-only / no-segments input  -> success:false + the engine's reason  (FAILS on old code)
 *   - a real gcode input the engine optimizes -> success:true + a non-empty program (no false-negative)
 */
import { describe, it, expect, beforeAll } from "vitest";
import { registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";

describe("prism_cam :: master_post_unified_agi_generate -- honest success (R12)", () => {
  type Handler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{
    content: Array<{ type: "text"; text: string }>;
  }>;
  let invoke: (action: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;

  beforeAll(() => {
    let captured: Handler | undefined;
    const fakeServer = {
      tool: (_n: string, _d: string, _s: unknown, handler: Handler) => { captured = handler; },
    };
    registerCamDispatcher(fakeServer as never);
    if (!captured) throw new Error("registerCamDispatcher did not register the prism_cam tool");
    const h = captured;
    invoke = async (action, params = {}) => JSON.parse((await h({ action, params })).content[0].text) as Record<string, unknown>;
  });

  it("reports success:false when fed operations-only input (engine wants segments/gcode -> empty error-result)", async () => {
    // The exact shape the post-training harness sends for a mill job: operations, no segments, no gcode.
    const r = await invoke("master_post_unified_agi_generate", {
      controller: "haas",
      machine: "haas_vf2",
      operations: [
        { operation_type: "face", tool_number: 1, tool_diameter_mm: 50.8, tool_flutes: 5, material_iso: "P",
          spindle_rpm: 877, feed_mm_min: 200, axial_depth_mm: 0.5,
          coordinates: [{ x: 0, y: 0, z: 5, type: "rapid" }, { x: 150, y: 0, z: -0.5, type: "linear" }] },
      ],
      config: { units: "metric", program_number: 1001 },
    });
    // The R12 fix: an empty/error program is NOT success. (Old code returned success:true here.)
    expect(r.success).toBe(false);
    expect(typeof r.error).toBe("string");
    // The surfaced reason is the engine's own warning ("No segments or G-code provided") or the empty-program note.
    expect(String(r.error)).toMatch(/segments|g-code|gcode|empty/i);
  });

  it("reports success:false for wholly-empty input (no segments, gcode, or operations)", async () => {
    const r = await invoke("master_post_unified_agi_generate", { controller: "fanuc", machine: "generic" });
    expect(r.success).toBe(false);
    expect(String(r.error || "")).toMatch(/segments|g-code|gcode|empty/i);
  });

  it("reports success:true with a non-empty program when the engine optimizes a real gcode input (no false-negative)", async () => {
    const gcode = ["%", "O0001", "G90 G54 G17", "G0 X0. Y0.", "G1 Z-1. F200", "G1 X10. Y10. F500", "G0 Z5.", "M30", "%"].join("\n");
    const r = await invoke("master_post_unified_agi_generate", {
      controller: "fanuc",
      machine: "generic",
      gcode,
      validate_kinematics: false,
    });
    expect(r.success).toBe(true);
    const data = r.data as Record<string, unknown>;
    expect(typeof data.gcode).toBe("string");
    expect(String(data.gcode).length).toBeGreaterThan(0);
    expect(Number(data.line_count)).toBeGreaterThan(0);
  });
});
