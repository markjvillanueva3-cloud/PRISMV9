/**
 * sfc-deflection-bridge.test.ts (U-OSC-SFC-DEFLECTION-WIRE, slot:oscar, 2026-06-25)
 *
 * Proves the POST /api/v1/sfc/deflection field-name bridge: the SFC web frontend
 * (web/src/api/sfc.ts DeflectionRequest -> useSfcDeflection) posts `stickout`, but
 * the backend prism_calc:deflection schema requires `overhang_length` -- the SAME
 * quantity (cantilever length L in delta = F*L^3/(3EI)). Without the bridge every
 * frontend deflection call fails Zod validation ("overhang_length: expected number,
 * received undefined") -- verified live on :3100. These tests fail if the bridge is
 * removed (the mapping no-ops) -- a real wiring regression lock.
 */
import { describe, it, expect } from "vitest";
import { bridgeDeflectionParams, bridgeCycleTimeParams } from "../routes/sfc.js";

describe("bridgeDeflectionParams -- frontend stickout -> backend overhang_length wire (U-OSC-SFC-DEFLECTION-WIRE)", () => {
  it("FIX: maps the frontend `stickout` to the schema-required `overhang_length`", () => {
    const out = bridgeDeflectionParams({ tool_diameter: 10, stickout: 40, cutting_force: 200, tool_material: "carbide" });
    expect(out.overhang_length).toBe(40);
    // original fields preserved (the engine still needs them)
    expect(out.tool_diameter).toBe(10);
    expect(out.cutting_force).toBe(200);
    expect(out.tool_material).toBe("carbide");
    expect(out.stickout).toBe(40); // non-destructive: stickout left intact
  });

  it("NEVER overwrites an explicit overhang_length the caller already supplied", () => {
    const out = bridgeDeflectionParams({ tool_diameter: 10, overhang_length: 55, stickout: 40 });
    expect(out.overhang_length).toBe(55);
  });

  it("NO WEAKENING: no stickout + no overhang_length -> overhang_length stays absent (gate still blocks incomplete)", () => {
    const out = bridgeDeflectionParams({ tool_diameter: 10, cutting_force: 200 });
    expect(out.overhang_length).toBeUndefined();
  });

  it("treats overhang_length:null/0 correctly (null -> bridged from stickout; explicit 0 untouched)", () => {
    expect(bridgeDeflectionParams({ stickout: 40, overhang_length: null }).overhang_length).toBe(40);
    // an explicit 0 is a real (invalid-but-present) value -> not overwritten; the schema's posNum rejects it downstream
    expect(bridgeDeflectionParams({ stickout: 40, overhang_length: 0 }).overhang_length).toBe(0);
  });

  it("handles a non-object body without throwing (returns an empty object)", () => {
    expect(bridgeDeflectionParams(undefined)).toEqual({});
    expect(bridgeDeflectionParams(null)).toEqual({});
    expect(bridgeDeflectionParams("garbage")).toEqual({});
  });

  it("returns a SHALLOW COPY -- does not mutate the caller's body", () => {
    const body = { tool_diameter: 10, stickout: 40 };
    const out = bridgeDeflectionParams(body);
    expect(out).not.toBe(body);
    expect((body as Record<string, unknown>).overhang_length).toBeUndefined();
  });
});

describe("bridgeCycleTimeParams -- frontend cycle-time shape -> backend cycle_time schema (U-OSC-SFC-CYCLETIME-WIRE)", () => {
  it("FIX: maps feed_rate->cutting_feedrate and cut_length*num_passes->cutting_distance", () => {
    const out = bridgeCycleTimeParams({ feed_rate: 1600, cut_length: 100, num_passes: 2 });
    expect(out.cutting_feedrate).toBe(1600);
    expect(out.cutting_distance).toBe(200); // 100 mm x 2 passes
    expect(out.feed_rate).toBe(1600); // non-destructive
  });

  it("num_passes defaults to 1 when absent (single-pass cut)", () => {
    const out = bridgeCycleTimeParams({ feed_rate: 800, cut_length: 50 });
    expect(out.cutting_distance).toBe(50);
    expect(out.cutting_feedrate).toBe(800);
  });

  it("folds approach_distance + overtravel into rapid_distance (non-cutting traverse)", () => {
    const out = bridgeCycleTimeParams({ feed_rate: 1000, cut_length: 80, approach_distance: 5, overtravel: 3, rapid_rate: 10000 });
    expect(out.rapid_distance).toBe(8); // 5 + 3
    expect(out.rapid_rate).toBe(10000); // same field name -> passes through
  });

  it("NEVER overwrites explicit backend fields the caller already supplied", () => {
    const out = bridgeCycleTimeParams({ feed_rate: 1600, cut_length: 100, cutting_feedrate: 2000, cutting_distance: 999 });
    expect(out.cutting_feedrate).toBe(2000);
    expect(out.cutting_distance).toBe(999);
  });

  it("NO WEAKENING: missing cut_length leaves cutting_distance absent (Zod still rejects incomplete)", () => {
    const out = bridgeCycleTimeParams({ feed_rate: 1600 });
    expect(out.cutting_distance).toBeUndefined();
    expect(out.cutting_feedrate).toBe(1600);
  });

  it("ignores a non-numeric cut_length (no NaN cutting_distance) + handles non-object body", () => {
    expect(bridgeCycleTimeParams({ feed_rate: 1600, cut_length: "long" }).cutting_distance).toBeUndefined();
    expect(bridgeCycleTimeParams(undefined)).toEqual({});
    expect(bridgeCycleTimeParams(null)).toEqual({});
  });

  it("returns a SHALLOW COPY -- does not mutate the caller's body", () => {
    const body = { feed_rate: 1600, cut_length: 100 };
    const out = bridgeCycleTimeParams(body);
    expect(out).not.toBe(body);
    expect((body as Record<string, unknown>).cutting_distance).toBeUndefined();
  });
});
