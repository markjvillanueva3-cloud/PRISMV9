/**
 * SwissBackWorkingOp2Engine — per-engine tests (MS6b / U-LPS22)
 */
import { describe, it, expect } from "vitest";
import { swissBackWorkingOp2Engine } from "../engines/SwissBackWorkingOp2Engine.js";
import type { SubSpindleDialect } from "../engines/SwissBackWorkingOp2Engine.js";

const DIALECTS: SubSpindleDialect[] = ["citizen", "star", "tsugami", "mazak", "dmg_mori"];

function base(dialect: SubSpindleDialect = "citizen") {
  return {
    dialect,
    final_length_mm: 25,
    program_number: 7,
    ops: [
      {
        type: "face_to_length" as const,
        tool_number: 5,
        tool_label: "FACE",
        depth_mm: 0.5,
        x_mm: 12,
        feed_mm_rev: 0.08,
        spindle_rpm: 2500,
      },
    ],
    has_c_axis: true,
  };
}

describe("SwissBackWorkingOp2Engine", () => {
  it.each(DIALECTS)("dialect %s emits header + op block + footer", (dialect) => {
    const r = swissBackWorkingOp2Engine.generate(base(dialect));
    expect(r.lines.length).toBeGreaterThan(5);
    expect(r.lines).toContain("M30");
    expect(r.dialect).toBe(dialect);
  });

  it("Citizen header uses $2 designator", () => {
    const r = swissBackWorkingOp2Engine.generate(base("citizen"));
    expect(r.lines.some((l) => l.includes("($2)"))).toBe(true);
  });

  it("Mazak uses !C2 path switch", () => {
    const r = swissBackWorkingOp2Engine.generate(base("mazak"));
    expect(r.lines.some((l) => l === "!C2")).toBe(true);
  });

  it("DMG MORI uses CHANDATA(2) switch", () => {
    const r = swissBackWorkingOp2Engine.generate(base("dmg_mori"));
    expect(r.lines.some((l) => l === "CHANDATA(2)")).toBe(true);
  });

  it("Citizen Z-flip is +1 (Z positive into part after datum shift)", () => {
    const r = swissBackWorkingOp2Engine.generate({
      ...base("citizen"),
      ops: [
        {
          type: "bore_back",
          tool_number: 10,
          depth_mm: 8,
          x_mm: 6,
          feed_mm_rev: 0.05,
          spindle_rpm: 3000,
        },
      ],
    });
    // Bore depth 8mm → Z should appear as Z8 for Citizen.
    expect(r.lines.some((l) => l.match(/G01 Z8(\b|\s|$)/))).toBe(true);
  });

  it("Star Z-flip is -1 (Z negative into part)", () => {
    const r = swissBackWorkingOp2Engine.generate({
      ...base("star"),
      ops: [
        {
          type: "bore_back",
          tool_number: 10,
          depth_mm: 8,
          x_mm: 6,
          feed_mm_rev: 0.05,
          spindle_rpm: 3000,
        },
      ],
    });
    // Bore depth 8mm → Z should appear as Z-8 for Star.
    expect(r.lines.some((l) => l.includes("G01 Z-8"))).toBe(true);
  });

  it("cross_hole op emits C-axis position + G83 peck drill cycle", () => {
    const r = swissBackWorkingOp2Engine.generate({
      ...base("citizen"),
      ops: [
        {
          type: "cross_hole",
          tool_number: 12,
          depth_mm: 5,
          x_mm: 14,
          feed_mm_rev: 0.05,
          spindle_rpm: 3500,
          c_position_deg: 90,
        },
      ],
    });
    expect(r.lines.some((l) => l.startsWith("G00 C90"))).toBe(true);
    expect(r.lines.some((l) => l.startsWith("G83"))).toBe(true);
  });

  it("cross_hole without C-axis available emits warning", () => {
    const r = swissBackWorkingOp2Engine.generate({
      ...base("citizen"),
      has_c_axis: false,
      ops: [
        {
          type: "cross_hole",
          tool_number: 12,
          depth_mm: 5,
          x_mm: 14,
          feed_mm_rev: 0.05,
          spindle_rpm: 3500,
        },
      ],
    });
    expect(r.warnings.some((w) => /C-axis/.test(w))).toBe(true);
  });

  it("internal_thread without pitch emits warning", () => {
    const r = swissBackWorkingOp2Engine.generate({
      ...base("citizen"),
      ops: [
        {
          type: "internal_thread",
          tool_number: 15,
          depth_mm: 10,
          x_mm: 6,
          feed_mm_rev: 1.25,
          spindle_rpm: 800,
        },
      ],
    });
    expect(r.warnings.some((w) => /thread_pitch_mm/.test(w))).toBe(true);
  });

  it("internal_thread with pitch emits G76 threading cycle", () => {
    const r = swissBackWorkingOp2Engine.generate({
      ...base("citizen"),
      ops: [
        {
          type: "internal_thread",
          tool_number: 15,
          depth_mm: 10,
          x_mm: 6,
          feed_mm_rev: 1.25,
          spindle_rpm: 800,
          thread_pitch_mm: 1.25,
          thread_start_x_mm: 5.5,
        },
      ],
    });
    expect(r.lines.some((l) => l.startsWith("G76"))).toBe(true);
  });

  it("flags bottleneck when Op2 duration exceeds Op1 duration", () => {
    const r = swissBackWorkingOp2Engine.generate({
      ...base("citizen"),
      ops: [
        {
          type: "face_to_length",
          tool_number: 5,
          depth_mm: 0.5,
          x_mm: 12,
          feed_mm_rev: 0.01, // slow feed → long op
          spindle_rpm: 500,
        },
        {
          type: "bore_back",
          tool_number: 10,
          depth_mm: 25,
          x_mm: 6,
          feed_mm_rev: 0.05,
          spindle_rpm: 3000,
        },
      ],
      op1_duration_s: 5,
    });
    expect(r.is_bottleneck).toBe(true);
    expect(r.warnings.some((w) => /bottleneck/.test(w))).toBe(true);
  });

  it("does not flag bottleneck when Op2 is short", () => {
    const r = swissBackWorkingOp2Engine.generate({ ...base("citizen"), op1_duration_s: 60 });
    expect(r.is_bottleneck).toBe(false);
  });

  it("per_op_time_s carries positive durations for each op", () => {
    const r = swissBackWorkingOp2Engine.generate(base("citizen"));
    expect(r.per_op_time_s.length).toBe(1);
    expect(r.per_op_time_s[0]!.duration_s).toBeGreaterThan(0);
  });

  it("handles empty ops list (minimal program)", () => {
    const r = swissBackWorkingOp2Engine.generate({ ...base("citizen"), ops: [] });
    expect(r.lines.some((l) => l === "M30")).toBe(true);
    expect(r.op2_duration_s).toBe(0);
  });
});
