/**
 * U-WIRE-LATHE-REPLAY-FRAME — wiring-gate test
 * ==============================================
 *
 * Verifies `lathe_replay_frame_compile` + `lathe_replay_frame_stats` route
 * to `LatheReplayFrameCompilerEngine.compile/getStats`.
 *
 * @module __tests__/U-WIRE-LATHE-REPLAY-FRAME
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  latheReplayFrameCompilerEngine,
  type LatheReplayFrameInput,
  type LatheReplayFrameCompileResult,
} from "../engines/LatheReplayFrameCompilerEngine.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DISPATCHER_SRC = readFileSync(
  join(__dirname, "..", "tools", "dispatchers", "turningDispatcher.ts"),
  "utf-8"
);
const SCHEMA_MAP = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;

const CANONICAL: LatheReplayFrameInput = {
  program_id: "TEST-PART-001",
  blocks: [
    { n: 10, x_mm: 25.0, z_mm: 5.0, elapsed_seconds_delta: 0.5 },
    { n: 20, x_mm: 25.0, z_mm: -10.0, elapsed_seconds_delta: 2.0, swept_delta_z_mm: 15.0 },
    { n: 30, x_mm: 24.0, z_mm: -10.0, elapsed_seconds_delta: 0.3, swept_delta_r_mm: 1.0 },
    // Breach at block 40 — operator drove the tool into the steady-rest envelope
    { n: 40, x_mm: 5.0, z_mm: -10.0, elapsed_seconds_delta: 1.2, breach_component: "steady_rest" },
    { n: 50, x_mm: 25.0, z_mm: 5.0, elapsed_seconds_delta: 0.4 },
  ],
  fps: 30,
};

describe("U-WIRE-LATHE-REPLAY-FRAME — turning-dispatcher wiring", () => {
  it("registers lathe_replay_frame_compile with working safeParse on canonical input", () => {
    const schema = SCHEMA_MAP["lathe_replay_frame_compile"];
    if (!schema) throw new Error("lathe_replay_frame_compile missing from TURNING_ACTION_SCHEMAS");
    expect(schema.safeParse(CANONICAL).success).toBe(true);
  });

  it("registers lathe_replay_frame_stats with working safeParse on empty input", () => {
    const schema = SCHEMA_MAP["lathe_replay_frame_stats"];
    if (!schema) throw new Error("lathe_replay_frame_stats missing");
    expect(schema.safeParse({}).success).toBe(true);
  });

  it("rejects compile input with empty blocks array", () => {
    expect(SCHEMA_MAP["lathe_replay_frame_compile"]!.safeParse({ ...CANONICAL, blocks: [] }).success).toBe(false);
  });

  it("rejects compile input with empty program_id", () => {
    expect(SCHEMA_MAP["lathe_replay_frame_compile"]!.safeParse({ ...CANONICAL, program_id: "" }).success).toBe(false);
  });

  it("rejects compile input with unknown breach_component", () => {
    const bad = { ...CANONICAL, blocks: [{ n: 1, x_mm: 0, z_mm: 0, elapsed_seconds_delta: 0.1, breach_component: "spindle" }] };
    expect(SCHEMA_MAP["lathe_replay_frame_compile"]!.safeParse(bad).success).toBe(false);
  });

  it("rejects compile input with negative elapsed_seconds_delta", () => {
    const bad = { ...CANONICAL, blocks: [{ n: 1, x_mm: 0, z_mm: 0, elapsed_seconds_delta: -0.1 }] };
    expect(SCHEMA_MAP["lathe_replay_frame_compile"]!.safeParse(bad).success).toBe(false);
  });

  it("rejects compile input with fps > 240", () => {
    expect(SCHEMA_MAP["lathe_replay_frame_compile"]!.safeParse({ ...CANONICAL, fps: 500 }).success).toBe(false);
  });

  // Dispatcher source surface
  it("dispatcher contains action + case for both lathe_replay_frame_* actions", () => {
    for (const a of ["lathe_replay_frame_compile", "lathe_replay_frame_stats"]) {
      expect(DISPATCHER_SRC.includes(`"${a}"`)).toBe(true);
      expect(DISPATCHER_SRC.includes(`case "${a}":`)).toBe(true);
    }
  });

  function caseBlock(action: string): string {
    const startIdx = DISPATCHER_SRC.indexOf(`case "${action}":`);
    if (startIdx < 0) throw new Error(`${action} case missing`);
    const endIdx = DISPATCHER_SRC.indexOf('case "', startIdx + `case "${action}":`.length);
    return DISPATCHER_SRC.slice(startIdx, endIdx > 0 ? endIdx : startIdx + 4000);
  }

  it("compile case routes to .compile (not the sibling getStats)", () => {
    const block = caseBlock("lathe_replay_frame_compile");
    expect(block.includes("latheReplayFrameCompilerEngine.compile(")).toBe(true);
    if (block.includes("latheReplayFrameCompilerEngine.getStats(")) {
      throw new Error("compile case wired to getStats — must call compile");
    }
  });

  it("stats case routes to .getStats (not the sibling compile)", () => {
    const block = caseBlock("lathe_replay_frame_stats");
    expect(block.includes("latheReplayFrameCompilerEngine.getStats(")).toBe(true);
    if (block.includes("latheReplayFrameCompilerEngine.compile(")) {
      throw new Error("stats case wired to compile — must call getStats");
    }
  });
});

describe("U-WIRE-LATHE-REPLAY-FRAME — engine semantic round-trip", () => {
  it("compile produces one frame per input block (definitional invariant)", () => {
    const r: LatheReplayFrameCompileResult = latheReplayFrameCompilerEngine.compile(CANONICAL);
    expect(r.frames.length).toBe(CANONICAL.blocks.length);
    expect(r.total_frames).toBe(CANONICAL.blocks.length);
  });

  it("cumulative_seconds is monotonically non-decreasing across frames", () => {
    const r = latheReplayFrameCompilerEngine.compile(CANONICAL);
    for (let i = 1; i < r.frames.length; i++) {
      const prev = r.frames[i - 1]!.cumulative_seconds;
      const cur = r.frames[i]!.cumulative_seconds;
      if (cur < prev) throw new Error(`cumulative_seconds regressed at frame ${i}: ${prev} → ${cur}`);
    }
  });

  it("breach_frame_indices identifies frames where breach_component was set on input", () => {
    const r = latheReplayFrameCompilerEngine.compile(CANONICAL);
    expect(r.breach_frame_indices.length).toBe(1);
    expect(r.breach_frame_indices[0]).toBe(3); // block #40 = index 3
    expect(r.frames[3]!.breach_flag).toBe(true);
    expect(r.frames[3]!.breach_component).toBe("steady_rest");
  });

  it("frames without breach_component have breach_flag=false", () => {
    const r = latheReplayFrameCompilerEngine.compile(CANONICAL);
    for (let i = 0; i < r.frames.length; i++) {
      if (i === 3) continue;
      expect(r.frames[i]!.breach_flag).toBe(false);
    }
  });

  it("total_seconds equals sum of input elapsed_seconds_delta values", () => {
    const r = latheReplayFrameCompilerEngine.compile(CANONICAL);
    const sum = CANONICAL.blocks.reduce((s, b) => s + b.elapsed_seconds_delta, 0);
    expect(r.total_seconds).toBeCloseTo(sum, 2);
  });

  it("legend defaults from block fields when no caption override is provided", () => {
    const r = latheReplayFrameCompilerEngine.compile(CANONICAL);
    expect(r.frames[0]!.legend).toMatch(/N10/);
    expect(r.frames[3]!.legend).toMatch(/BREACH:steady_rest/);
  });

  it("getStats returns a non-empty reference string", () => {
    const s = latheReplayFrameCompilerEngine.getStats();
    expect(s.reference.length).toBeGreaterThan(0);
  });
});
