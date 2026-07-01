/**
 * LatheLiveToolingPlannerEngine Tests — FEATURE-GAP-AUDIT-MS0/U-GAP-LATHE-LIVE-TOOLING
 *
 * Re-modularized from PRISM_ENHANCED_LATHE_LIVE_TOOLING_ENGINE.js (v8.89).
 * Tests assert geometry/G-code INVARIANTS (R9 — verify intent, not behavior):
 * peck counts, hex face topology, polar-mode bracketing, cycle-time monotonicity,
 * fail-loud on the seven feature handlers the monolith left undefined, and the
 * centerline-breach safety guard added in this port.
 */
import { describe, it, expect } from "vitest";
import {
  LatheLiveToolingPlannerEngine,
  latheLiveToolingPlannerEngine,
  type LiveToolingPlanInput,
} from "../engines/LatheLiveToolingPlannerEngine.js";

const tool = { diameter: 10, rpm: 3000, feedRate: 200, plungeFeed: 80 };
const stock = { diameter: 50 }; // radius 25

describe("LatheLiveToolingPlannerEngine — cross drilling", () => {
  it("straight drill: feeds to (stockRadius-depth)*2 in diameter programming", () => {
    const r = latheLiveToolingPlannerEngine.plan({
      operation: "cross_drilling",
      tool,
      stock,
      hole: { diameter: 6, depth: 15, cPosition: 90, zPosition: -25 },
    });
    expect(r.type).toBe("CROSS_DRILLING");
    const posC = r.operations.find((o) => o.type === "POSITION_C_AXIS");
    expect(posC?.c).toBe(90);
    const drill = r.operations.find((o) => o.type === "DRILL_FEED");
    // stockRadius 25 − depth 15 = 10, ×2 (diameter) = 20
    expect(drill?.x).toBe(20);
    const retract = r.operations.find((o) => o.type === "RAPID_RETRACT");
    // xApproach = 25 + clearance(2 default), ×2, +10 = 64
    expect(retract?.x).toBe(64);
    expect(r.gcode).toContain("M19 (ORIENT MAIN SPINDLE)");
    expect(r.gcode).toContain("M33 (START LIVE TOOL CW)");
    expect(r.gcode).toContain("M5 (SPINDLE STOP)");
    // feed word = feedRate × rpm = 200 × 3000 = 600000
    expect(r.gcode.some((l) => l === "G1 X20.000 F600000")).toBe(true);
    expect(r.cycleTime).toBeGreaterThan(0);
  });

  it("peck drill: peck count = ceil(depth/peckDepth), retracts = pecks-1", () => {
    const r = latheLiveToolingPlannerEngine.plan({
      operation: "cross_drilling",
      tool,
      stock,
      hole: { depth: 20, peckDepth: 4, dwellTime: 0 }, // 20 > 4*2 → peck path
    });
    const feeds = r.operations.filter((o) => o.type === "DRILL_FEED");
    const retracts = r.operations.filter((o) => o.type === "PECK_RETRACT");
    expect(feeds.length).toBe(Math.ceil(20 / 4)); // 5
    expect(retracts.length).toBe(feeds.length - 1); // 4
    // peckNumber monotonic 1..N
    expect(feeds.map((f) => f.peckNumber)).toEqual([1, 2, 3, 4, 5]);
    // last peck reaches full depth: x = (25-20)*2 = 10
    expect(feeds[feeds.length - 1]?.x).toBe(10);
    // no dwell when dwellTime=0
    expect(r.operations.some((o) => o.type === "DWELL")).toBe(false);
  });

  it("shallow hole with peckDepth still uses straight drill when depth<=2*peck", () => {
    const r = latheLiveToolingPlannerEngine.plan({
      operation: "cross_drilling",
      tool,
      stock,
      hole: { depth: 6, peckDepth: 5 }, // 6 !> 10
    });
    expect(r.operations.filter((o) => o.type === "DRILL_FEED").length).toBe(1);
    expect(r.operations.some((o) => o.type === "PECK_RETRACT")).toBe(false);
  });

  it("SAFETY: drill depth >= stock radius throws (centerline breach)", () => {
    expect(() =>
      latheLiveToolingPlannerEngine.plan({
        operation: "cross_drilling",
        tool,
        stock: { diameter: 20 }, // radius 10
        hole: { depth: 12 },
      }),
    ).toThrow(/centerline/i);
  });
});

describe("LatheLiveToolingPlannerEngine — C-axis milling", () => {
  it("polar mode is bracketed: ENABLE before CANCEL, G12.1 … G13.1", () => {
    const r = latheLiveToolingPlannerEngine.plan({
      operation: "c_axis_milling",
      tool,
      stock,
      feature: { type: "pocket", width: 20, length: 30, depth: 5 },
    });
    const enable = r.operations.findIndex((o) => o.type === "ENABLE_POLAR");
    const cancel = r.operations.findIndex((o) => o.type === "CANCEL_POLAR");
    expect(enable).toBe(0);
    expect(cancel).toBe(r.operations.length - 1);
    expect(r.gcode.some((l) => l.startsWith("G12.1"))).toBe(true);
    expect(r.gcode.some((l) => l.startsWith("G13.1"))).toBe(true);
  });

  it("pocket: depth passes drive ≥1 POLAR_MOVE; C span symmetric about cPos", () => {
    const r = latheLiveToolingPlannerEngine.plan({
      operation: "c_axis_milling",
      tool, // dia 10 → depthPerPass 5
      stock,
      feature: { type: "pocket", width: 20, length: 30, depth: 12, cPosition: 0 },
    });
    const polar = r.operations.filter((o) => o.type === "POLAR_MOVE");
    expect(polar.length).toBeGreaterThan(0);
    const cs = polar.map((p) => p.c as number);
    // length 30, stockRadius 25 → halfSpan = (15/25)*180/π ≈ 34.377°
    const expectedSpan = (15 / 25) * (180 / Math.PI);
    expect(Math.max(...cs)).toBeCloseTo(expectedSpan, 3);
    expect(Math.min(...cs)).toBeCloseTo(-expectedSpan, 3);
  });

  it("hex: exactly 6 rough + 6 finish faces, 60° spacing, finish feed = 0.5×rough", () => {
    const r = latheLiveToolingPlannerEngine.plan({
      operation: "c_axis_milling",
      tool,
      stock,
      feature: { type: "hex", flatWidth: 17, depth: 3, cPosition: 0 },
    });
    const rough = r.operations.filter((o) => o.type === "FACE_CUT");
    const finish = r.operations.filter((o) => o.type === "FINISH_FACE");
    expect(rough.length).toBe(6);
    expect(finish.length).toBe(6);
    const angles = r.operations
      .filter((o) => o.type === "POSITION_C")
      .map((o) => o.c as number);
    expect(angles).toEqual([0, 60, 120, 180, 240, 300]);
    expect(finish[0].feed).toBeCloseTo((tool.feedRate as number) * 0.5, 6);
    // face cut X = (25 - 3)*2 = 44
    expect(rough[0].x).toBe(44);
  });

  it("keyway: mills to z = zStart - length, plunges to (R-depth)*2", () => {
    const r = latheLiveToolingPlannerEngine.plan({
      operation: "c_axis_milling",
      tool,
      stock,
      feature: { type: "keyway", length: 25, depth: 3.5, zStart: -15 },
    });
    const linZ = r.operations.find((o) => o.type === "LINEAR_Z");
    expect(linZ?.z).toBe(-15 - 25); // -40
    const plunge = r.operations.find((o) => o.type === "PLUNGE");
    expect(plunge?.x).toBeCloseTo(43, 6); // (25 − 3.5)*2
    expect(plunge?.feed).toBe(tool.plungeFeed); // explicit plungeFeed honored
  });

  it("FAIL-LOUD: undefined monolith handlers throw, naming the handler", () => {
    for (const t of ["slot", "contour", "face"]) {
      expect(() =>
        latheLiveToolingPlannerEngine.plan({
          operation: "c_axis_milling",
          tool,
          stock,
          feature: { type: t },
        }),
      ).toThrow(/not implemented/i);
    }
  });
});

describe("LatheLiveToolingPlannerEngine — Y-axis milling", () => {
  it("requires Y-axis capability — throws when absent (monolith invariant)", () => {
    expect(() =>
      latheLiveToolingPlannerEngine.plan({
        operation: "y_axis_milling",
        tool,
        stock,
        feature: { type: "pocket" },
        machineConfig: { hasYAxis: false },
      }),
    ).toThrow(/Y-axis capability/i);
  });

  it("pocket: locks C, starts/stops live tool, finishes perimeter", () => {
    const r = latheLiveToolingPlannerEngine.plan({
      operation: "y_axis_milling",
      tool,
      stock,
      feature: { type: "pocket", width: 20, height: 15, depth: 5, cPosition: 45 },
      machineConfig: { hasYAxis: true },
    });
    expect(r.type).toBe("Y_AXIS_MILLING");
    expect(r.operations[0]).toMatchObject({ type: "C_AXIS_LOCK", c: 45 });
    const start = r.operations.find((o) => o.type === "LIVE_TOOL_START");
    expect(start?.rpm).toBe(tool.rpm);
    const ops = r.operations;
    expect(ops[ops.length - 1]?.type).toBe("C_AXIS_RELEASE");
    expect(ops[ops.length - 2]?.type).toBe("LIVE_TOOL_STOP");
    expect(r.operations.some((o) => o.type === "FINISH_CONTOUR")).toBe(true);
    expect(r.gcode).toContain("M19 C45.000 (LOCK C-AXIS)");
    expect(r.gcode).toContain("M20 (RELEASE C-AXIS)");
  });

  it("FAIL-LOUD: undefined Y-axis handlers throw", () => {
    for (const t of ["slot", "flat", "contour", "drilling"]) {
      expect(() =>
        latheLiveToolingPlannerEngine.plan({
          operation: "y_axis_milling",
          tool,
          stock,
          feature: { type: t },
          machineConfig: { hasYAxis: true },
        }),
      ).toThrow(/not implemented/i);
    }
  });
});

describe("LatheLiveToolingPlannerEngine — invariants & adversarial", () => {
  it("cycle time strictly increases with depth (deeper pocket = more passes)", () => {
    const shallow = latheLiveToolingPlannerEngine.plan({
      operation: "c_axis_milling",
      tool,
      stock,
      feature: { type: "pocket", width: 20, length: 30, depth: 5 },
    });
    const deep = latheLiveToolingPlannerEngine.plan({
      operation: "c_axis_milling",
      tool,
      stock,
      // depth 20 < stockRadius 25: deeper than the shallow (5) pocket so it
      // runs more axial passes, but stays clear of the centerline-breach guard
      // (a c-axis pocket depth >= stock radius drives the X target to <=0 and
      // correctly throws in assertRadialDepth). 25 == radius was a breaching fixture.
      feature: { type: "pocket", width: 20, length: 30, depth: 20 },
    });
    expect(deep.cycleTime).toBeGreaterThan(shallow.cycleTime);
  });

  it("calculate() is an exact alias of plan()", () => {
    const args: LiveToolingPlanInput = {
      operation: "cross_drilling",
      tool,
      stock,
      hole: { depth: 10 },
    };
    expect(latheLiveToolingPlannerEngine.calculate(args)).toEqual(
      latheLiveToolingPlannerEngine.plan(args),
    );
  });

  it("confidence levels are valid probabilities; cross-drilling is highest", () => {
    const c = new LatheLiveToolingPlannerEngine().getConfidenceLevel();
    for (const v of Object.values(c)) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(c.crossDrilling).toBeGreaterThanOrEqual(c.overall);
    expect(c.crossDrilling).toBeGreaterThan(c.threadWhirling);
  });

  it("rejects invalid input (zod): negative dia, NaN, missing tool, bad op", () => {
    expect(() =>
      latheLiveToolingPlannerEngine.plan({
        operation: "cross_drilling",
        tool: { diameter: -5 },
        stock,
      } as LiveToolingPlanInput),
    ).toThrow();
    expect(() =>
      latheLiveToolingPlannerEngine.plan({
        operation: "cross_drilling",
        tool: { diameter: Number.NaN },
        stock,
      } as LiveToolingPlanInput),
    ).toThrow();
    expect(() =>
      latheLiveToolingPlannerEngine.plan({
        operation: "c_axis_milling",
        stock,
      } as unknown as LiveToolingPlanInput),
    ).toThrow();
    expect(() =>
      latheLiveToolingPlannerEngine.plan({
        operation: "bogus_op",
        tool,
      } as unknown as LiveToolingPlanInput),
    ).toThrow();
  });

  it("defaults applied when hole/feature omitted (monolith parity)", () => {
    const r = latheLiveToolingPlannerEngine.plan({
      operation: "cross_drilling",
      tool,
    });
    // default stock dia 50 → radius 25; default depth 15 → x=(25-15)*2=20
    const drill = r.operations.find((o) => o.type === "DRILL_FEED");
    expect(drill?.x).toBe(20);
    // default dwellTime 0.1 → DWELL present with that time
    const dwell = r.operations.find((o) => o.type === "DWELL");
    expect(dwell?.time).toBeCloseTo(0.1, 6);
  });
});

describe("U-GAP-LATHE-LIVE-TOOLING — dispatcher wiring (E2E round-trip)", () => {
  it("invokes through prism_turning handler, not just the singleton", async () => {
    const { registerTurningDispatcher } = await import(
      "../tools/dispatchers/turningDispatcher.js"
    );
    let captured:
      | ((a: { action: string; params?: Record<string, unknown> }) => Promise<{
          content: { type: string; text: string }[];
        }>)
      | null = null;
    const fakeServer = {
      tool: (_name: string, _desc: string, _schema: unknown, handler: any) => {
        captured = handler;
      },
    };
    registerTurningDispatcher(fakeServer as any);
    expect(captured).toBeTypeOf("function");

    const resp = await captured!({
      action: "live_tool_plan",
      params: {
        operation: "cross_drilling",
        tool: { diameter: 6, rpm: 2500, feedRate: 0.1 },
        stock: { diameter: 50 },
        hole: { depth: 15, cPosition: 0 },
      },
    });
    const parsed = JSON.parse(resp.content[0].text);
    expect(parsed.blocked).not.toBe(true);
    expect(parsed.type).toBe("CROSS_DRILLING");
    expect(Array.isArray(parsed.operations)).toBe(true);
    expect(parsed.operations.length).toBeGreaterThan(0);
    expect(parsed.cycleTime).toBeGreaterThan(0);
  });

  it("dispatcher source + schema map register live_tool_plan", async () => {
    const { promises: fsp } = await import("node:fs");
    const path = await import("node:path");
    const src = await fsp.readFile(
      path.resolve(__dirname, "..", "tools", "dispatchers", "turningDispatcher.ts"),
      "utf8",
    );
    expect(src.includes('case "live_tool_plan":')).toBe(true);
    expect(src.includes('"live_tool", "live_tool_plan"')).toBe(true);
    const { TURNING_ACTION_SCHEMAS } = await import(
      "../schemas/turningActionSchemas.js"
    );
    const m = TURNING_ACTION_SCHEMAS as Record<
      string,
      { safeParse: (v: unknown) => { success: boolean } }
    >;
    expect(typeof m.live_tool_plan?.safeParse).toBe("function");
    expect(
      m.live_tool_plan.safeParse({
        operation: "cross_drilling",
        tool: { diameter: 6 },
      }).success,
    ).toBe(true);
    // rejects missing required operation (failure mode)
    expect(m.live_tool_plan.safeParse({ tool: { diameter: 6 } }).success).toBe(
      false,
    );
  });
});
