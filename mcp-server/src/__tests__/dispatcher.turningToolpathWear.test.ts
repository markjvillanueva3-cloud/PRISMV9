/**
 * dispatcher.turningToolpathWear.test.ts — round-trip integration coverage
 * for WIRE-UNWIRED-MS0/U-WIRE-TTW dispatcher wiring (1 action).
 *
 * Drives the new surface through the real `prism_turning` dispatcher:
 *   - turning_toolpath_wear → TurningToolpathWearEngine.accumulateWear
 *
 * The engine-direct suite (`turning-toolpath-wear.test.ts`) already proves
 * the CSS / engagement / interrupted-cut numerics. This file pins four
 * additional contracts that ONLY a dispatcher round-trip can verify:
 *   1. The action registers on the prism_turning Zod enum.
 *   2. The dispatcher wraps the engine result as { success, data }.
 *   3. The CSS-clamp logic (Vc varies with average diameter, clamped at
 *      max_rpm) survives the wire — segments at different diameters MUST
 *      report different avg_vc_m_min when css_mode=true.
 *   4. The exceeds_vb_max boolean propagates as a wire-survivable flag for
 *      safety-callers that need to short-circuit on insert-life breach.
 */

import { describe, it, expect, beforeAll } from "vitest";

import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

interface SegmentResult {
  segment_id: string;
  wear_um: number;
  cumulative_wear_um: number;
  avg_vc_m_min: number;
  cutting_time_min: number;
  wear_rate_um_min: number;
  life_fraction: number;
}

interface ToolpathWearResult {
  segments: SegmentResult[];
  total_wear_um: number;
  total_cutting_time_min: number;
  total_life_fraction: number;
  remaining_life_min: number;
  parts_per_edge: number;
  hotspot_segment: string;
  exceeds_vb_max: boolean;
  source: string;
}

const ROUGH_SEG_BASELINE = {
  id: "seg_rough_1",
  op_type: "od_rough" as const,
  d_start_mm: 60,
  d_end_mm: 60,
  cut_length_mm: 100,
  ap_mm: 2.5,
  f_mm_rev: 0.3,
  passes: 1,
};

const FINISH_SEG_BASELINE = {
  id: "seg_finish_1",
  op_type: "od_finish" as const,
  d_start_mm: 55,
  d_end_mm: 55,
  cut_length_mm: 100,
  ap_mm: 0.4,
  f_mm_rev: 0.12,
  passes: 1,
};

let turningHandler: CapturedTool["handler"];

beforeAll(() => {
  const srv = makeStubServer();
  registerTurningDispatcher(srv as unknown as Parameters<typeof registerTurningDispatcher>[0]);
  const t = srv.tools.find((x) => x.name === "prism_turning");
  if (!t) throw new Error("prism_turning not registered");
  turningHandler = t.handler;
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TTW — schema registration", () => {
  it("turning_toolpath_wear is a usable Zod object", () => {
    expect(typeof TURNING_ACTION_SCHEMAS.turning_toolpath_wear.safeParse).toBe("function");
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TTW — schema rejection paths", () => {
  it("rejects unknown iso_group", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_toolpath_wear.safeParse({
      iso_group: "Z", Vc_m_min: 200, nose_radius_mm: 0.4, segments: [ROUGH_SEG_BASELINE],
    }).success).toBe(false);
  });

  it("rejects empty segments array", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_toolpath_wear.safeParse({
      iso_group: "P", Vc_m_min: 200, nose_radius_mm: 0.4, segments: [],
    }).success).toBe(false);
  });

  it("rejects zero Vc_m_min (must be strictly positive)", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_toolpath_wear.safeParse({
      iso_group: "P", Vc_m_min: 0, nose_radius_mm: 0.4, segments: [ROUGH_SEG_BASELINE],
    }).success).toBe(false);
  });

  it("rejects zero nose_radius_mm (must be strictly positive — division)", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_toolpath_wear.safeParse({
      iso_group: "P", Vc_m_min: 200, nose_radius_mm: 0, segments: [ROUGH_SEG_BASELINE],
    }).success).toBe(false);
  });

  it("rejects segment with unknown op_type", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_toolpath_wear.safeParse({
      iso_group: "P", Vc_m_min: 200, nose_radius_mm: 0.4,
      segments: [{ ...ROUGH_SEG_BASELINE, op_type: "plasma_cut" }],
    }).success).toBe(false);
  });

  it("rejects segment with negative ap_mm", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_toolpath_wear.safeParse({
      iso_group: "P", Vc_m_min: 200, nose_radius_mm: 0.4,
      segments: [{ ...ROUGH_SEG_BASELINE, ap_mm: -1 }],
    }).success).toBe(false);
  });

  it("accepts a minimal valid payload", () => {
    expect(TURNING_ACTION_SCHEMAS.turning_toolpath_wear.safeParse({
      iso_group: "P", Vc_m_min: 200, nose_radius_mm: 0.4, segments: [ROUGH_SEG_BASELINE],
    }).success).toBe(true);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TTW — prism_turning :: turning_toolpath_wear round-trip", () => {
  it("baseline payload → success:true with per-segment + cumulative wear", async () => {
    const r = await invokeHandler(turningHandler, "turning_toolpath_wear", {
      iso_group: "P",
      Vc_m_min: 220,
      nose_radius_mm: 0.4,
      segments: [ROUGH_SEG_BASELINE, FINISH_SEG_BASELINE],
    });
    expect(r.success).toBe(true);
    const data = r.data as ToolpathWearResult;
    expect(data.segments.length).toBe(2);
    expect(data.segments[0]!.segment_id).toBe("seg_rough_1");
    expect(data.segments[1]!.segment_id).toBe("seg_finish_1");
    expect(data.source).toContain("TurningToolpathWearEngine");
  });

  it("cumulative_wear_um equals running total across segments", async () => {
    const r = await invokeHandler(turningHandler, "turning_toolpath_wear", {
      iso_group: "P",
      Vc_m_min: 220,
      nose_radius_mm: 0.4,
      segments: [ROUGH_SEG_BASELINE, FINISH_SEG_BASELINE],
    });
    expect(r.success).toBe(true);
    const data = r.data as ToolpathWearResult;
    const s0 = data.segments[0]!;
    const s1 = data.segments[1]!;
    // cumulative_wear_um is rounded to 2dp by the engine; allow 0.05 tolerance.
    expect(s0.cumulative_wear_um).toBeCloseTo(s0.wear_um, 1);
    expect(s1.cumulative_wear_um).toBeCloseTo(s0.wear_um + s1.wear_um, 1);
  });

  it("CSS-mode segments at different diameters report different avg_vc_m_min", async () => {
    // CSS-mode: Vc=200 m/min target. d=100mm → 637 RPM, d=20mm → 3183 RPM
    // (clamped at max_rpm=2000). Smaller diameter has lower achieved Vc.
    const r = await invokeHandler(turningHandler, "turning_toolpath_wear", {
      iso_group: "P",
      Vc_m_min: 200,
      css_mode: true,
      max_rpm: 2000,
      nose_radius_mm: 0.4,
      segments: [
        { ...ROUGH_SEG_BASELINE, id: "big",   d_start_mm: 100, d_end_mm: 100 },
        { ...ROUGH_SEG_BASELINE, id: "small", d_start_mm: 20,  d_end_mm: 20  },
      ],
    });
    expect(r.success).toBe(true);
    const data = r.data as ToolpathWearResult;
    const big   = data.segments.find((s) => s.segment_id === "big")!;
    const small = data.segments.find((s) => s.segment_id === "small")!;
    // d=100 → 637 RPM ≤ 2000 max → avg_vc ≈ 200
    // d=20  → 3183 needed > 2000 max → avg_vc = π·20·2000/1000 ≈ 125.66
    expect(big.avg_vc_m_min).toBeCloseTo(200, 0);
    expect(small.avg_vc_m_min).toBeLessThan(150);
    expect(small.avg_vc_m_min).toBeCloseTo(Math.PI * 20 * 2000 / 1000, 0);
  });

  it("interrupted-cut shock multiplier shortens life vs continuous", async () => {
    // Single-segment comparison: same cut params, only `interrupted` flag flipped.
    const cont = await invokeHandler(turningHandler, "turning_toolpath_wear", {
      iso_group: "P",
      Vc_m_min: 220,
      nose_radius_mm: 0.4,
      segments: [{ ...ROUGH_SEG_BASELINE }],
    });
    const intr = await invokeHandler(turningHandler, "turning_toolpath_wear", {
      iso_group: "P",
      Vc_m_min: 220,
      nose_radius_mm: 0.4,
      segments: [{ ...ROUGH_SEG_BASELINE, interrupted: true, interruptions_per_rev: 8 }],
    });
    expect(cont.success).toBe(true);
    expect(intr.success).toBe(true);
    const contLF = (cont.data as ToolpathWearResult).segments[0]!.life_fraction;
    const intrLF = (intr.data as ToolpathWearResult).segments[0]!.life_fraction;
    // Interrupted shockFactor up to 1.5× → life shorter → life_fraction larger.
    expect(intrLF).toBeGreaterThan(contLF);
  });

  it("exceeds_vb_max flips true when cumulative wear breaches 300µm", async () => {
    // 200 punishing passes of heavy superalloy roughing → enough to exceed VB_max.
    const r = await invokeHandler(turningHandler, "turning_toolpath_wear", {
      iso_group: "S",  // superalloys — fastest Taylor wear
      Vc_m_min: 80,
      nose_radius_mm: 0.4,
      segments: [{ ...ROUGH_SEG_BASELINE, passes: 200, ap_mm: 3.0, f_mm_rev: 0.3 }],
    });
    expect(r.success).toBe(true);
    const data = r.data as ToolpathWearResult;
    expect(data.exceeds_vb_max).toBe(true);
    expect(data.total_wear_um).toBeGreaterThan(300);
  });

  it("hotspot_segment names the segment with the highest wear rate", async () => {
    const r = await invokeHandler(turningHandler, "turning_toolpath_wear", {
      iso_group: "S",  // pick a high-wear material so signal-to-noise is high
      Vc_m_min: 80,
      nose_radius_mm: 0.4,
      segments: [
        { ...FINISH_SEG_BASELINE, id: "light", ap_mm: 0.3, f_mm_rev: 0.10 },
        { ...ROUGH_SEG_BASELINE,  id: "heavy", ap_mm: 4.0, f_mm_rev: 0.35 },
      ],
    });
    expect(r.success).toBe(true);
    const data = r.data as ToolpathWearResult;
    expect(data.hotspot_segment).toBe("heavy");
  });

  it("parts_per_edge is finite + positive for a sub-life toolpath", async () => {
    const r = await invokeHandler(turningHandler, "turning_toolpath_wear", {
      iso_group: "P",
      Vc_m_min: 220,
      nose_radius_mm: 0.4,
      segments: [{ ...FINISH_SEG_BASELINE }],  // single light finishing segment
    });
    expect(r.success).toBe(true);
    const data = r.data as ToolpathWearResult;
    expect(Number.isFinite(data.parts_per_edge)).toBe(true);
    expect(data.parts_per_edge).toBeGreaterThan(0);
    expect(data.remaining_life_min).toBeGreaterThanOrEqual(0);
  });
});

describe("WIRE-UNWIRED-MS0/U-WIRE-TTW — dispatcher-boundary rejection", () => {
  it("rejects an invalid payload at the dispatcher boundary (success !== true)", async () => {
    const r = await invokeHandler(turningHandler, "turning_toolpath_wear", {
      iso_group: "P",
      Vc_m_min: -1,
      nose_radius_mm: 0.4,
      segments: [ROUGH_SEG_BASELINE],
    });
    expect(r.success).not.toBe(true);
  });
});
