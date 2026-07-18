import { describe, it, expect } from "vitest";
import {
  millReplayFrameCompilerEngine as eng,
  DEFAULT_FPS,
  MILL_CANONICAL_BREACH_COMPONENTS,
  type MillReplaySourceBlock,
} from "../engines/MillReplayFrameCompilerEngine.js";

function blk(n: number, x: number, y: number, z: number, sec = 1, o: Partial<MillReplaySourceBlock> = {}): MillReplaySourceBlock {
  return { n, x_mm: x, y_mm: y, z_mm: z, elapsed_seconds_delta: sec, ...o };
}

describe("MillReplayFrameCompilerEngine", () => {
  it("getStats: 15 frame fields, 6 mill-canonical, 9 breach components, 8 mill-canonical", () => {
    const s = eng.getStats();
    expect(s.frame_fields.length).toBe(15);
    expect(s.mill_canonical_fields).toEqual([
      "y_mm", "a_deg", "b_deg", "c_deg",
      "swept_delta_x_mm", "swept_delta_y_mm",
    ]);
    expect(s.breach_components.length).toBe(9);
    expect(s.mill_canonical_breach_components).toEqual(MILL_CANONICAL_BREACH_COMPONENTS);
    expect(s.default_fps).toBe(DEFAULT_FPS);
    expect(s.reference).toMatch(/ISO 19440|Vericut|Heidenhain/);
  });

  it("MILL_CANONICAL_BREACH_COMPONENTS contains rotary/pallet/vise (no lathe-only components)", () => {
    expect(MILL_CANONICAL_BREACH_COMPONENTS).toContain("vise");
    expect(MILL_CANONICAL_BREACH_COMPONENTS).toContain("rotary_a_limit");
    expect(MILL_CANONICAL_BREACH_COMPONENTS).toContain("pallet_clamp");
    expect(MILL_CANONICAL_BREACH_COMPONENTS).not.toContain("chuck" as never);
  });

  it("throws on invalid inputs", () => {
    expect(() => eng.compile(null as never)).toThrow(/input required/);
    expect(() => eng.compile({ program_id: "", blocks: [] })).toThrow(/program_id required/);
    expect(() => eng.compile({ program_id: "P", blocks: undefined as never })).toThrow(/blocks\[\] required/);
  });

  it("empty blocks → zero frames, zero seconds, no breaches", () => {
    const r = eng.compile({ program_id: "P-001", blocks: [] });
    expect(r.total_frames).toBe(0);
    expect(r.total_seconds).toBe(0);
    expect(r.breach_frame_indices).toEqual([]);
  });

  it("3-block program compiles 3 sequential frames with cumulative elapsed", () => {
    const r = eng.compile({
      program_id: "P-001",
      blocks: [blk(10, 100, 50, 5, 0.5), blk(20, 100, 50, 0, 1.2), blk(30, 0, 0, 0, 0.3)],
    });
    expect(r.total_frames).toBe(3);
    expect(r.frames[0].cumulative_seconds).toBeCloseTo(0.5, 3);
    expect(r.frames[1].cumulative_seconds).toBeCloseTo(1.7, 3);
    expect(r.frames[2].cumulative_seconds).toBeCloseTo(2.0, 3);
    expect(r.total_seconds).toBeCloseTo(2.0, 3);
  });

  it("frame_index is sequential starting at 0", () => {
    const r = eng.compile({
      program_id: "P-001",
      blocks: [blk(10, 0, 0, 0), blk(20, 1, 0, 0), blk(30, 2, 0, 0)],
    });
    expect(r.frames.map(f => f.frame_index)).toEqual([0, 1, 2]);
  });

  it("MILL-CANONICAL: y_mm carried through (no lathe-style flattening)", () => {
    const r = eng.compile({
      program_id: "P",
      blocks: [blk(10, 100, 75, 50)],
    });
    expect(r.frames[0].y_mm).toBe(75);
  });

  it("MILL-CANONICAL: rotary A/B/C angles preserved as numeric when provided", () => {
    const r = eng.compile({
      program_id: "P",
      blocks: [blk(10, 0, 0, 0, 1, { a_deg: 45, b_deg: 30, c_deg: 90 })],
    });
    expect(r.frames[0].a_deg).toBe(45);
    expect(r.frames[0].b_deg).toBe(30);
    expect(r.frames[0].c_deg).toBe(90);
  });

  it("MILL-CANONICAL: rotary angles null when not provided (JSON-safe vs undefined)", () => {
    const r = eng.compile({ program_id: "P", blocks: [blk(10, 0, 0, 0)] });
    expect(r.frames[0].a_deg).toBeNull();
    expect(r.frames[0].b_deg).toBeNull();
    expect(r.frames[0].c_deg).toBeNull();
  });

  it("MILL-CANONICAL: 3D swept volume (Δx, Δy, Δz) carried through (lathe only has Δr+Δz)", () => {
    const r = eng.compile({
      program_id: "P",
      blocks: [blk(10, 0, 0, 0, 1, {
        swept_delta_x_mm: 5, swept_delta_y_mm: 3, swept_delta_z_mm: 2,
      })],
    });
    expect(r.frames[0].swept_delta_x_mm).toBe(5);
    expect(r.frames[0].swept_delta_y_mm).toBe(3);
    expect(r.frames[0].swept_delta_z_mm).toBe(2);
  });

  it("breach_flag is true when breach_component set, false otherwise", () => {
    const r = eng.compile({
      program_id: "P",
      blocks: [
        blk(10, 0, 0, 0),
        blk(20, 100, 100, 0, 1, { breach_component: "vise" }),
        blk(30, 0, 0, 0),
      ],
    });
    expect(r.frames[0].breach_flag).toBe(false);
    expect(r.frames[1].breach_flag).toBe(true);
    expect(r.frames[1].breach_component).toBe("vise");
    expect(r.frames[2].breach_flag).toBe(false);
  });

  it("breach_frame_indices contains indices of all breach frames", () => {
    const r = eng.compile({
      program_id: "P",
      blocks: [
        blk(10, 0, 0, 0),
        blk(20, 0, 0, 0, 1, { breach_component: "vise" }),
        blk(30, 0, 0, 0),
        blk(40, 0, 0, 0, 1, { breach_component: "rotary_a_limit" }),
      ],
    });
    expect(r.breach_frame_indices).toEqual([1, 3]);
  });

  it("variability ≥3 mill-canonical breach components: vise, rotary_a_limit, pallet_clamp", () => {
    const r = eng.compile({
      program_id: "P",
      blocks: [
        blk(10, 0, 0, 0, 1, { breach_component: "vise" }),
        blk(20, 0, 0, 0, 1, { breach_component: "rotary_a_limit" }),
        blk(30, 0, 0, 0, 1, { breach_component: "pallet_clamp" }),
      ],
    });
    const comps = r.frames.map(f => f.breach_component);
    expect(comps).toEqual(["vise", "rotary_a_limit", "pallet_clamp"]);
  });

  it("default fps=30 → minStep = 1/30 (~0.033s)", () => {
    // Sub-fps elapsed_seconds_delta floors to minStep
    const r = eng.compile({
      program_id: "P",
      blocks: [blk(10, 0, 0, 0, 0.01)], // 10ms below 33ms fps step
    });
    // legend should reflect effectiveSec ≈ 0.033
    expect(r.frames[0].legend).toMatch(/0\.033s/);
  });

  it("custom fps respected", () => {
    const r = eng.compile({
      program_id: "P",
      blocks: [blk(10, 0, 0, 0, 0.005)],
      fps: 60,
    });
    // 1/60 ≈ 0.017s minStep
    expect(r.frames[0].legend).toMatch(/0\.017s/);
  });

  it("legend includes N-number, X/Y/Z, and seconds", () => {
    const r = eng.compile({
      program_id: "P",
      blocks: [blk(10, 100, 50, 25, 2)],
    });
    expect(r.frames[0].legend).toMatch(/N10/);
    expect(r.frames[0].legend).toMatch(/X100/);
    expect(r.frames[0].legend).toMatch(/Y50/);
    expect(r.frames[0].legend).toMatch(/Z25/);
    expect(r.frames[0].legend).toMatch(/2s/);
  });

  it("legend includes rotary angles when present", () => {
    const r = eng.compile({
      program_id: "P",
      blocks: [blk(10, 0, 0, 0, 1, { a_deg: 45, b_deg: 30 })],
    });
    expect(r.frames[0].legend).toMatch(/A45/);
    expect(r.frames[0].legend).toMatch(/B30/);
  });

  it("legend includes BREACH: prefix when breach occurs", () => {
    const r = eng.compile({
      program_id: "P",
      blocks: [blk(10, 0, 0, 0, 1, { breach_component: "spindle_envelope" })],
    });
    expect(r.frames[0].legend).toMatch(/BREACH:spindle_envelope/);
  });

  it("custom caption overrides default legend", () => {
    const r = eng.compile({
      program_id: "P",
      blocks: [blk(10, 0, 0, 0, 1, { caption: "Tool change to T05" })],
    });
    expect(r.frames[0].legend).toBe("Tool change to T05");
  });

  it("negative elapsed_seconds_delta is treated as 0 (defensive)", () => {
    const r = eng.compile({
      program_id: "P",
      blocks: [blk(10, 0, 0, 0, -1), blk(20, 1, 0, 0, 1)],
    });
    expect(r.frames[0].cumulative_seconds).toBe(0);
    expect(r.frames[1].cumulative_seconds).toBeCloseTo(1, 3);
  });

  it("reasoning narrates frame count, elapsed, breach count", () => {
    const r = eng.compile({
      program_id: "P",
      blocks: [
        blk(10, 0, 0, 0),
        blk(20, 0, 0, 0, 1, { breach_component: "fixture" }),
      ],
    });
    expect(r.reasoning.some(s => /Compiled 2 frame.*30fps/.test(s))).toBe(true);
    expect(r.reasoning.some(s => /Total elapsed/.test(s))).toBe(true);
    expect(r.reasoning.some(s => /1 breach frame.*index 1/.test(s))).toBe(true);
  });

  it("reasoning includes 4/5-axis hint when rotary frames present", () => {
    const r = eng.compile({
      program_id: "P",
      blocks: [
        blk(10, 0, 0, 0),
        blk(20, 0, 0, 0, 1, { a_deg: 90 }),
        blk(30, 0, 0, 0, 1, { b_deg: 30 }),
      ],
    });
    expect(r.reasoning.some(s => /4\/5-axis frame transform/.test(s))).toBe(true);
  });

  it("reasoning OMITS 4/5-axis hint when all frames are 3-axis", () => {
    const r = eng.compile({
      program_id: "P",
      blocks: [blk(10, 0, 0, 0)],
    });
    expect(r.reasoning.some(s => /4\/5-axis/.test(s))).toBe(false);
  });

  it("determinism: same input twice → identical compiled frames", () => {
    const i = {
      program_id: "P",
      blocks: [blk(10, 100, 50, 25, 1, { a_deg: 45, breach_component: "vise" as MillBreachComponent })],
    };
    expect(eng.compile(i)).toEqual(eng.compile(i));
  });

  it("100-block program completes (perf smoke)", () => {
    const blocks = Array.from({ length: 100 }, (_, i) => blk(i * 10, i, i * 2, i * 0.5, 0.1));
    const r = eng.compile({ program_id: "PERF", blocks });
    expect(r.total_frames).toBe(100);
    expect(r.total_seconds).toBeCloseTo(10, 1);
  });

  it("MILL-CANONICAL breach components are all 8 enumerated kinds", () => {
    const all: MillBreachComponent[] = [
      "vise", "fixture", "table_xy_limit", "z_limit",
      "rotary_a_limit", "rotary_b_limit", "rotary_c_limit",
      "pallet_clamp", "spindle_envelope",
    ];
    for (const comp of all) {
      const r = eng.compile({
        program_id: "P",
        blocks: [blk(10, 0, 0, 0, 1, { breach_component: comp })],
      });
      expect(r.frames[0].breach_component).toBe(comp);
    }
  });
});

type MillBreachComponent =
  | "vise"
  | "fixture"
  | "table_xy_limit"
  | "z_limit"
  | "rotary_a_limit"
  | "rotary_b_limit"
  | "rotary_c_limit"
  | "pallet_clamp"
  | "spindle_envelope";
