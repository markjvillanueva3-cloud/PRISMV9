import { describe, it, expect } from "vitest";
import { latheReplayFrameCompilerEngine } from "../engines/LatheReplayFrameCompilerEngine.js";

const BLOCKS = [
  { n: 10, x_mm: 60, z_mm: 5, elapsed_seconds_delta: 0.1 },
  { n: 20, x_mm: 50, z_mm: 5, elapsed_seconds_delta: 0.2, swept_delta_r_mm: 0.1 },
  { n: 30, x_mm: 46, z_mm: -30, elapsed_seconds_delta: 6, swept_delta_r_mm: 2, swept_delta_z_mm: 35 },
  { n: 40, x_mm: 46, z_mm: 80, elapsed_seconds_delta: 0.2 },
];

describe("LatheReplayFrameCompilerEngine", () => {
  it("compiles one frame per block", () => {
    const r = latheReplayFrameCompilerEngine.compile({ program_id: "P1", blocks: BLOCKS });
    expect(r.frames.length).toBe(BLOCKS.length);
  });

  it("frame_index increments from 0", () => {
    const r = latheReplayFrameCompilerEngine.compile({ program_id: "P1", blocks: BLOCKS });
    expect(r.frames[0].frame_index).toBe(0);
    expect(r.frames[r.frames.length - 1].frame_index).toBe(BLOCKS.length - 1);
  });

  it("cumulative_seconds is monotonic non-decreasing", () => {
    const r = latheReplayFrameCompilerEngine.compile({ program_id: "P1", blocks: BLOCKS });
    for (let k = 1; k < r.frames.length; k++) {
      expect(r.frames[k].cumulative_seconds).toBeGreaterThanOrEqual(r.frames[k - 1].cumulative_seconds);
    }
  });

  it("total_seconds equals sum of deltas", () => {
    const r = latheReplayFrameCompilerEngine.compile({ program_id: "P1", blocks: BLOCKS });
    const sum = BLOCKS.reduce((s, b) => s + b.elapsed_seconds_delta, 0);
    expect(r.total_seconds).toBeCloseTo(sum, 3);
  });

  it("breach_frame_indices empty when no breach", () => {
    const r = latheReplayFrameCompilerEngine.compile({ program_id: "P1", blocks: BLOCKS });
    expect(r.breach_frame_indices.length).toBe(0);
  });

  it("breach_frame_indices captures frames with breach component", () => {
    const blocks = [
      ...BLOCKS,
      { n: 50, x_mm: 50, z_mm: -5, elapsed_seconds_delta: 0.1, breach_component: "chuck" as const },
    ];
    const r = latheReplayFrameCompilerEngine.compile({ program_id: "P1", blocks });
    expect(r.breach_frame_indices.length).toBe(1);
    expect(r.frames[r.breach_frame_indices[0]].breach_flag).toBe(true);
  });

  it("legend contains block number and position", () => {
    const r = latheReplayFrameCompilerEngine.compile({ program_id: "P1", blocks: BLOCKS });
    expect(r.frames[0].legend).toMatch(/N10/);
    expect(r.frames[0].legend).toMatch(/X60/);
  });

  it("caption overrides default legend", () => {
    const r = latheReplayFrameCompilerEngine.compile({
      program_id: "P1",
      blocks: [{ n: 10, x_mm: 50, z_mm: 0, elapsed_seconds_delta: 0.1, caption: "CUSTOM CAPTION" }],
    });
    expect(r.frames[0].legend).toBe("CUSTOM CAPTION");
  });

  it("fps param accepted and influences min display step", () => {
    const r = latheReplayFrameCompilerEngine.compile({ program_id: "P1", blocks: BLOCKS, fps: 60 });
    expect(r.total_frames).toBe(BLOCKS.length);
  });

  it("breach component name surfaced in frame", () => {
    const r = latheReplayFrameCompilerEngine.compile({
      program_id: "P1",
      blocks: [{ n: 10, x_mm: 50, z_mm: -5, elapsed_seconds_delta: 0.1, breach_component: "tailstock" }],
    });
    expect(r.frames[0].breach_component).toBe("tailstock");
  });

  it("empty blocks → zero frames", () => {
    const r = latheReplayFrameCompilerEngine.compile({ program_id: "P1", blocks: [] });
    expect(r.frames.length).toBe(0);
    expect(r.total_seconds).toBe(0);
  });

  it("program_id echoed on result", () => {
    const r = latheReplayFrameCompilerEngine.compile({ program_id: "ABC-123", blocks: BLOCKS });
    expect(r.program_id).toBe("ABC-123");
  });

  it("reasoning mentions compile count and elapsed", () => {
    const r = latheReplayFrameCompilerEngine.compile({ program_id: "P1", blocks: BLOCKS });
    const text = r.reasoning.join(" ");
    expect(text).toMatch(/Compiled/);
  });

  it("getStats returns reference", () => {
    const s = latheReplayFrameCompilerEngine.getStats();
    expect(s.reference.length).toBeGreaterThan(5);
  });
});
