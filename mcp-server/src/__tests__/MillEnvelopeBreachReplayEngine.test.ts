import { describe, it, expect } from "vitest";
import {
  millEnvelopeBreachReplayEngine as eng,
  type MillBreachEnvelope,
  type MillBreachBlock,
  type AABB,
} from "../engines/MillEnvelopeBreachReplayEngine.js";

function blk(n: number, x: number, y: number, z: number, o: Partial<MillBreachBlock> = {}): MillBreachBlock {
  return { n, x_mm: x, y_mm: y, z_mm: z, ...o };
}

function box(x_min: number, x_max: number, y_min: number, y_max: number, z_min: number, z_max: number, label?: string): AABB {
  return { x_min_mm: x_min, x_max_mm: x_max, y_min_mm: y_min, y_max_mm: y_max, z_min_mm: z_min, z_max_mm: z_max, label };
}

function envWithLimits(o: Partial<MillBreachEnvelope> = {}): MillBreachEnvelope {
  return {
    x_min_mm: -500, x_max_mm: 500,
    y_min_mm: -250, y_max_mm: 250,
    z_min_mm: -300, z_max_mm: 100,
    ...o,
  };
}

describe("MillEnvelopeBreachReplayEngine", () => {
  it("getStats reports 12 components + canonical reference", () => {
    const s = eng.getStats();
    expect(s.components).toEqual([
      "workholding_box", "fixture_interference", "spindle_nose_floor",
      "x_min", "x_max", "y_min", "y_max", "z_min", "z_max",
      "a_tilt", "b_tilt", "c_tilt",
    ]);
    expect(s.reference).toMatch(/DMG MORI|Heidenhain|ISO 23125/);
  });

  it("throws on missing blocks array", () => {
    expect(() => eng.replay({} as never)).toThrow(/blocks\[\] required/);
  });

  it("throws on missing envelope", () => {
    expect(() => eng.replay({ blocks: [] } as never)).toThrow(/envelope required/);
  });

  it("clean trajectory in middle of envelope → 0 hits, first_breach_block=undefined", () => {
    const r = eng.replay({
      blocks: [blk(1, 0, 0, 0), blk(2, 50, 50, -50), blk(3, 100, 100, -100)],
      envelope: envWithLimits(),
    });
    expect(r.hits).toEqual([]);
    expect(r.first_breach_block === undefined).toBe(true);
    expect(r.total_blocks).toBe(3);
  });

  it("trajectory crashing into workholding box → breach hit + first_breach_block set", () => {
    const wh = box(-50, 50, -50, 50, -10, 30, "vise");
    const r = eng.replay({
      blocks: [blk(1, 100, 100, 50), blk(2, 0, 0, 0)], // 2nd block enters vise box
      envelope: { ...envWithLimits(), workholding_box: wh },
    });
    expect(r.hits.length).toBe(1);
    expect(r.hits[0].component).toBe("workholding_box");
    expect(r.hits[0].n).toBe(2);
    expect(r.hits[0].depth_mm).toBeGreaterThan(0);
    expect(r.first_breach_block).toBe(2);
  });

  it("fixture interference hit cites the fixture label", () => {
    const fixture = box(-10, 10, -10, 10, -50, 50, "Step-block at A1");
    const r = eng.replay({
      blocks: [blk(1, 0, 0, 0)],
      envelope: { ...envWithLimits(), fixture_interferences: [fixture] },
    });
    expect(r.hits.length).toBe(1);
    expect(r.hits[0].component).toBe("fixture_interference");
    expect(r.hits[0].note).toMatch(/Step-block at A1/);
  });

  it("multiple fixtures each tested independently", () => {
    const f1 = box(-10, 10, -10, 10, -50, 50, "F1");
    const f2 = box(100, 120, -10, 10, -50, 50, "F2");
    const r = eng.replay({
      blocks: [blk(1, 0, 0, 0), blk(2, 110, 0, 0)],
      envelope: { ...envWithLimits(), fixture_interferences: [f1, f2] },
    });
    expect(r.hits.length).toBe(2);
    expect(r.hits[0].note).toMatch(/F1/);
    expect(r.hits[1].note).toMatch(/F2/);
  });

  it("spindle_nose_floor → breach when Z < floor", () => {
    const r = eng.replay({
      blocks: [blk(1, 0, 0, -50), blk(2, 0, 0, -150)],
      envelope: { ...envWithLimits(), spindle_nose_floor_z_mm: -100 },
    });
    expect(r.hits.length).toBe(1);
    expect(r.hits[0].component).toBe("spindle_nose_floor");
    expect(r.hits[0].n).toBe(2);
    expect(r.hits[0].depth_mm).toBe(50); // 150-100
  });

  it("X soft-limit breaches (min and max)", () => {
    const r = eng.replay({
      blocks: [blk(1, -600, 0, 0), blk(2, 600, 0, 0)],
      envelope: envWithLimits(),
    });
    expect(r.hits.some(h => h.component === "x_min" && h.n === 1)).toBe(true);
    expect(r.hits.some(h => h.component === "x_max" && h.n === 2)).toBe(true);
  });

  it("Y/Z soft-limit breaches", () => {
    const r = eng.replay({
      blocks: [blk(1, 0, -300, 0), blk(2, 0, 0, 200)],
      envelope: envWithLimits(),
    });
    expect(r.hits.some(h => h.component === "y_min" && h.n === 1)).toBe(true);
    expect(r.hits.some(h => h.component === "z_max" && h.n === 2)).toBe(true);
  });

  it("A/B/C tilt limit breaches surfaced when block carries axis values", () => {
    const r = eng.replay({
      blocks: [
        blk(1, 0, 0, 0, { a_axis_deg: -95 }),  // below A min
        blk(2, 0, 0, 0, { b_axis_deg: 100 }),  // above B max
        blk(3, 0, 0, 0, { c_axis_deg: -10 }),  // below C min
      ],
      envelope: {
        ...envWithLimits(),
        a_min_deg: -90, a_max_deg: 90,
        b_min_deg: -90, b_max_deg: 90,
        c_min_deg: 0, c_max_deg: 360,
      },
    });
    expect(r.hits.some(h => h.component === "a_tilt" && h.n === 1)).toBe(true);
    expect(r.hits.some(h => h.component === "b_tilt" && h.n === 2)).toBe(true);
    expect(r.hits.some(h => h.component === "c_tilt" && h.n === 3)).toBe(true);
  });

  it("first_breach_block is the smallest-N breach (collision order)", () => {
    const wh = box(-50, 50, -50, 50, -10, 30, "vise");
    const r = eng.replay({
      blocks: [
        blk(1, 100, 100, 100),  // clear
        blk(2, 0, 0, 0),        // FIRST breach (workholding)
        blk(3, 600, 0, 0),      // also breach (x_max)
      ],
      envelope: { ...envWithLimits(), workholding_box: wh },
    });
    expect(r.first_breach_block).toBe(2);
  });

  it("holder_radius expands the workholding box footprint (catches near-miss)", () => {
    const wh = box(-10, 10, -10, 10, -10, 10, "vise");
    // Tip at (15, 0, 0) — outside box if no holder, but holder radius 10 puts the shank inside
    const r = eng.replay({
      blocks: [blk(1, 15, 0, 0, { holder_radius_mm: 10 })],
      envelope: { ...envWithLimits(), workholding_box: wh },
    });
    expect(r.hits.length).toBe(1);
    expect(r.hits[0].component).toBe("workholding_box");
  });

  it("depth_mm is the minimum face-distance for inside-box hits (penetration depth)", () => {
    const wh = box(-10, 10, -10, 10, -10, 10);
    const r = eng.replay({
      blocks: [blk(1, 0, 0, 0)], // dead center → 10mm from any face
      envelope: { ...envWithLimits(), workholding_box: wh },
    });
    expect(r.hits[0].depth_mm).toBe(10);
  });

  it("reasoning array narrates total blocks + hits", () => {
    const r = eng.replay({
      blocks: [blk(1, 0, 0, 0), blk(2, 600, 0, 0)],
      envelope: envWithLimits(),
    });
    expect(r.reasoning).toEqual([
      "Replayed 2 blocks",
      "1 breach hit(s); first at block 2",
    ]);
  });

  it("envelope with no limits at all → never reports breach (vacuous safe)", () => {
    const r = eng.replay({
      blocks: [blk(1, 99999, 99999, -99999)],
      envelope: {},
    });
    expect(r.hits).toEqual([]);
    expect(r.first_breach_block === undefined).toBe(true);
  });

  it("block tilt values undefined → no A/B/C breach surfaced even if limits set", () => {
    const r = eng.replay({
      blocks: [blk(1, 0, 0, 0)], // no a_axis_deg
      envelope: { ...envWithLimits(), a_min_deg: 0, a_max_deg: 90 },
    });
    expect(r.hits.some(h => h.component === "a_tilt")).toBe(false);
  });

  it("total_blocks always equals blocks.length even when all clean", () => {
    const r = eng.replay({
      blocks: [blk(1, 0, 0, 0), blk(2, 100, 100, -100), blk(3, 200, 200, 50)],
      envelope: envWithLimits(),
    });
    expect(r.total_blocks).toBe(3);
  });

  it("workholding + fixture + spindle_floor combined → all 3 hit categories fire", () => {
    const wh = box(-10, 10, -10, 10, -5, 5, "vise");
    const fixture = box(50, 70, 50, 70, -5, 5, "clamp");
    const r = eng.replay({
      blocks: [blk(1, 0, 0, 0), blk(2, 60, 60, 0), blk(3, 0, 0, -500)],
      envelope: { ...envWithLimits(), workholding_box: wh, fixture_interferences: [fixture], spindle_nose_floor_z_mm: -200 },
    });
    expect(r.hits.some(h => h.component === "workholding_box")).toBe(true);
    expect(r.hits.some(h => h.component === "fixture_interference")).toBe(true);
    expect(r.hits.some(h => h.component === "spindle_nose_floor")).toBe(true);
  });
});
