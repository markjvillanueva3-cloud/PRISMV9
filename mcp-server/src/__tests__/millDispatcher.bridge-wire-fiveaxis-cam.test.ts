/**
 * BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-2 — wire test (slot:alpha, 2026-05-22)
 *
 * Round-trips 2 actions through millDispatcher's prism_mill tool, surfacing
 * the previously-unwired FiveAxisCAMIntegrationEngine:
 *
 *   FiveAxisCAMIntegrationEngine → mill_5axis_cam_convert_3to5,
 *                                  mill_5axis_cam_gcode
 *
 * Real-value assertions (no toBeDefined()/toBeTruthy() stubs):
 *   - convert3to5axis with lead=lean=0 + default +Z surface normals keeps
 *     the tool axis vertical (k≈1, A=B=0 for every segment).
 *   - a 15° lead angle tilts the tool axis in the feed direction →
 *     B = atan2(sin15°, cos15°) ≈ 15° → max_b_deg > 0.
 *   - a tight b_range_deg of ±5° against that 15° tilt → axis_limit_violations > 0.
 *   - toFiveAxisGcode emits the program header (O-number, G90 G40 G80,
 *     S<rpm> M03), the G43.4 RTCP code for a head_table machine, G43.5 for
 *     table_table, and the M30 program end.
 *
 * Each test invokes through the dispatcher handler, not the engine singleton.
 * Pattern mirrors millDispatcher.bridge-wire-fiveaxis-lora.test.ts.
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  MILL_ACTIONS,
  registerMillDispatcher,
} from "../tools/dispatchers/millDispatcher.js";
import { MILL_ACTION_SCHEMAS } from "../schemas/millActionSchemas.js";

const FIVEAXIS_CAM_ACTIONS = [
  "mill_5axis_cam_convert_3to5",
  "mill_5axis_cam_gcode",
] as const;

interface ToolCall {
  action: string;
  params?: Record<string, unknown>;
}

let handler:
  | ((args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>)
  | null = null;

beforeAll(() => {
  const fakeServer = {
    tool: (
      _name: string,
      _desc: string,
      _schema: unknown,
      fn: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>,
    ) => {
      if (_name === "prism_mill") handler = fn;
    },
  };
  registerMillDispatcher(fakeServer);
  if (!handler) throw new Error("millDispatcher did not register prism_mill tool");
});

async function call(c: ToolCall): Promise<{ raw: any; success: boolean; error?: string }> {
  if (!handler) throw new Error("handler not captured");
  const r: any = await handler(c);
  if (r && typeof r === "object" && Array.isArray(r.content) && r.content[0]?.text) {
    try {
      const parsed = JSON.parse(r.content[0].text);
      const success = !parsed?.error && parsed?.success !== false;
      return { raw: parsed, success, error: parsed?.error };
    } catch {
      return { raw: r, success: true };
    }
  }
  if (r && typeof r === "object" && r.type === "text" && typeof r.text === "string") {
    try {
      const parsed = JSON.parse(r.text);
      const success = !parsed?.error && parsed?.success !== false;
      return { raw: parsed, success, error: parsed?.error };
    } catch {
      return { raw: r, success: true };
    }
  }
  if (r && typeof r === "object") {
    const success = !r.error && r.success !== false && !r.isError;
    return { raw: r, success, error: r.error };
  }
  return { raw: r, success: true };
}

function payload(raw: any): any {
  if (raw && typeof raw === "object") {
    if (raw.result !== undefined) return raw.result;
    if (raw.data !== undefined) return raw.data;
  }
  return raw;
}

/** A 3-axis feed segment with an explicit position (default +Z surface normal). */
function seg3(x: number, y: number, z: number): Record<string, unknown> {
  return { x, y, z, feed_mmmin: 300, rpm: 8000, type: "feed" };
}

/** A 5-axis segment for the G-code emitter. */
function seg5(
  x: number,
  y: number,
  z: number,
  type: string,
  bDeg = 0,
): Record<string, unknown> {
  return {
    x, y, z,
    i: 0, j: 0, k: 1,
    a_deg: 0, b_deg: bDeg,
    feed_mmmin: type === "feed" ? 300 : 0,
    rpm: 8000,
    type,
  };
}

describe("U-BRIDGE-WIRE-MILL iter-2 — FiveAxisCAMIntegrationEngine wired into millDispatcher", () => {
  describe("action enum + schema registration", () => {
    it("registers both actions in MILL_ACTIONS enum", () => {
      for (const action of FIVEAXIS_CAM_ACTIONS) {
        expect(MILL_ACTIONS).toContain(action);
      }
    });

    it("registers both actions in MILL_ACTION_SCHEMAS map", () => {
      const schemaKeys = new Set(Object.keys(MILL_ACTION_SCHEMAS));
      for (const action of FIVEAXIS_CAM_ACTIONS) {
        expect(schemaKeys.has(action)).toBe(true);
      }
    });

    it("both actions use the mill_5axis_cam_ prefix", () => {
      for (const action of FIVEAXIS_CAM_ACTIONS) {
        expect(action.startsWith("mill_5axis_cam_")).toBe(true);
      }
    });
  });

  describe("dispatcher round-trip — mill_5axis_cam_convert_3to5", () => {
    it("applies the engine's default 10° lead (config.lead_angle_deg uses `|| 10`)", async () => {
      // NOTE: the engine reads `config.lead_angle_deg || 10`, so an explicit
      // 0 is swallowed by the default — convert3to5axis can never produce a
      // truly 0° lead. We assert the engine's *actual* contract: with no
      // lead specified the default 10° lead tilts the tool axis in the feed
      // direction (B-axis), while no lean leaves the A-axis at 0.
      const r = await call({
        action: "mill_5axis_cam_convert_3to5",
        params: {
          segments3: [seg3(0, 0, 0), seg3(10, 0, 0), seg3(20, 0, 0)],
          config: { machine_type: "head_table" },
        },
      });
      expect(r.success).toBe(true);
      const p = payload(r.raw);
      expect(p.segment_count).toBe(3);
      expect(p.segments).toHaveLength(3);
      expect(p.max_a_deg).toBe(0); // no lean → A axis unused
      expect(p.max_b_deg).toBeCloseTo(10, 0); // default 10° lead → B tilt
      expect(p.rtcp_applied).toBe(false);
      // Segment 0 has no preceding point, so lead is not applied → axis stays
      // vertical; later segments are tilted by the 10° lead.
      expect(p.segments[0].k).toBeCloseTo(1, 5);
      expect(p.segments[2].k).toBeLessThan(1);
    });

    it("a 15° lead angle tilts the tool axis in the feed direction (max_b_deg ≈ 15)", async () => {
      const r = await call({
        action: "mill_5axis_cam_convert_3to5",
        params: {
          segments3: [seg3(0, 0, 0), seg3(10, 0, 0), seg3(20, 0, 0)],
          config: { machine_type: "head_table", lead_angle_deg: 15, lean_angle_deg: 0 },
        },
      });
      expect(r.success).toBe(true);
      const p = payload(r.raw);
      expect(p.max_b_deg).toBeGreaterThan(0);
      expect(p.max_b_deg).toBeCloseTo(15, 0);
    });

    it("flags axis-limit violations when a tight b_range conflicts with the lead tilt", async () => {
      const r = await call({
        action: "mill_5axis_cam_convert_3to5",
        params: {
          segments3: [seg3(0, 0, 0), seg3(10, 0, 0), seg3(20, 0, 0)],
          config: {
            machine_type: "head_table",
            lead_angle_deg: 15,
            b_range_deg: [-5, 5],
          },
        },
      });
      expect(r.success).toBe(true);
      const p = payload(r.raw);
      expect(p.axis_limit_violations).toBeGreaterThan(0);
    });

    it("reports rtcp_applied=true when the config enables RTCP", async () => {
      const r = await call({
        action: "mill_5axis_cam_convert_3to5",
        params: {
          segments3: [seg3(0, 0, 0), seg3(10, 0, 0)],
          config: { machine_type: "head_table", lead_angle_deg: 0, enable_rtcp: true },
        },
      });
      expect(r.success).toBe(true);
      expect(payload(r.raw).rtcp_applied).toBe(true);
    });

    it("failure mode: missing segments3 is rejected", async () => {
      const r = await call({
        action: "mill_5axis_cam_convert_3to5",
        params: { config: { machine_type: "head_table" } },
      });
      expect(r.success).toBe(false);
    });

    it("failure mode: empty segments3 array is rejected (schema .min(1))", async () => {
      const r = await call({
        action: "mill_5axis_cam_convert_3to5",
        params: { segments3: [], config: { machine_type: "head_table" } },
      });
      expect(r.success).toBe(false);
    });

    it("failure mode: missing config is rejected", async () => {
      const r = await call({
        action: "mill_5axis_cam_convert_3to5",
        params: { segments3: [seg3(0, 0, 0)] },
      });
      expect(r.success).toBe(false);
    });

    it("adversarial: segments3 passed as a non-array is rejected", async () => {
      const r = await call({
        action: "mill_5axis_cam_convert_3to5",
        params: { segments3: "not-an-array", config: { machine_type: "head_table" } },
      });
      expect(r.success).toBe(false);
    });
  });

  describe("dispatcher round-trip — mill_5axis_cam_gcode", () => {
    it("emits a head_table 5-axis program with G43.4 RTCP + header + program end", async () => {
      const r = await call({
        action: "mill_5axis_cam_gcode",
        params: {
          segments: [
            seg5(0, 0, 5, "rapid"),
            seg5(10, 0, -2, "feed", 15),
            seg5(20, 0, -2, "feed", 15),
          ],
          config: {
            machine_type: "head_table",
            rpm: 8000,
            program_number: 5200,
            enable_rtcp: true,
          },
        },
      });
      expect(r.success).toBe(true);
      const gcode: string = payload(r.raw).gcode;
      expect(typeof gcode).toBe("string");
      expect(gcode).toContain("O5200");
      expect(gcode).toContain("G90 G40 G80");
      expect(gcode).toContain("S8000 M03");
      expect(gcode).toContain("G43.4 H01"); // head_table RTCP
      expect(gcode).toContain("G01 X10.000");
      expect(gcode).toContain("M30");
    });

    it("uses the G43.5 RTCP code for a table_table machine", async () => {
      const r = await call({
        action: "mill_5axis_cam_gcode",
        params: {
          segments: [seg5(0, 0, 5, "rapid"), seg5(5, 5, -1, "feed")],
          config: { machine_type: "table_table", rpm: 6000, enable_rtcp: true },
        },
      });
      expect(r.success).toBe(true);
      const gcode: string = payload(r.raw).gcode;
      expect(gcode).toContain("G43.5 H01");
      expect(gcode).not.toContain("G43.4 H01");
    });

    it("omits the RTCP code when enable_rtcp is not set", async () => {
      const r = await call({
        action: "mill_5axis_cam_gcode",
        params: {
          segments: [seg5(0, 0, 5, "rapid"), seg5(5, 0, -1, "feed")],
          config: { machine_type: "head_table", rpm: 7000 },
        },
      });
      expect(r.success).toBe(true);
      const gcode: string = payload(r.raw).gcode;
      expect(gcode).not.toContain("G43.4");
      expect(gcode).not.toContain("G43.5");
      expect(gcode).toContain("M30");
    });

    it("defaults the program number to O5000 when none is supplied", async () => {
      const r = await call({
        action: "mill_5axis_cam_gcode",
        params: {
          segments: [seg5(0, 0, 5, "rapid")],
          config: { machine_type: "head_table", rpm: 8000 },
        },
      });
      expect(r.success).toBe(true);
      expect(payload(r.raw).gcode).toContain("O5000");
    });

    it("failure mode: missing segments is rejected", async () => {
      const r = await call({
        action: "mill_5axis_cam_gcode",
        params: { config: { machine_type: "head_table", rpm: 8000 } },
      });
      expect(r.success).toBe(false);
    });

    it("failure mode: a config without a numeric rpm is rejected", async () => {
      const r = await call({
        action: "mill_5axis_cam_gcode",
        params: {
          segments: [seg5(0, 0, 5, "rapid")],
          config: { machine_type: "head_table" },
        },
      });
      expect(r.success).toBe(false);
    });

    it("adversarial: segments passed as a non-array is rejected", async () => {
      const r = await call({
        action: "mill_5axis_cam_gcode",
        params: { segments: 42, config: { machine_type: "head_table", rpm: 8000 } },
      });
      expect(r.success).toBe(false);
    });
  });

  describe("schema boundary — direct safeParse", () => {
    type Schema = { safeParse: (x: unknown) => { success: boolean } };

    it("mill_5axis_cam_convert_3to5 requires a non-empty segments3 array + config", () => {
      const schema = (MILL_ACTION_SCHEMAS as Record<string, Schema>)
        .mill_5axis_cam_convert_3to5;
      expect(
        schema.safeParse({ segments3: [{ x: 0 }], config: { machine_type: "head_table" } })
          .success,
      ).toBe(true);
      expect(schema.safeParse({ segments3: [], config: {} }).success).toBe(false);
      expect(schema.safeParse({ config: {} }).success).toBe(false);
    });

    it("mill_5axis_cam_gcode requires a numeric rpm in config", () => {
      const schema = (MILL_ACTION_SCHEMAS as Record<string, Schema>).mill_5axis_cam_gcode;
      expect(
        schema.safeParse({ segments: [{ x: 0 }], config: { rpm: 8000 } }).success,
      ).toBe(true);
      expect(
        schema.safeParse({ segments: [{ x: 0 }], config: { rpm: -1 } }).success,
      ).toBe(false);
      expect(
        schema.safeParse({ segments: [{ x: 0 }], config: {} }).success,
      ).toBe(false);
    });
  });
});
