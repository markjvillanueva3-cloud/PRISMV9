/**
 * MILL-MASTER-P3-U03-MT-ASSEMBLE — Multi-channel + 6-dialect sync tests
 *
 * Verifies assembleMultiChannelProgram:
 *   - Returns structured per-channel G-code (not serialized)
 *   - Single channel for main-only, two channels when sub-spindle present
 *   - Dialect auto-resolution from controller name
 *   - Explicit dialect override
 *   - Sync codes emitted in correct format per dialect (6 total)
 *   - Sync codes inserted at part-transfer + end-of-back-work
 *   - Header lines are dialect-specific
 *   - Channel separators are dialect-specific
 *   - Graceful handling of empty/minimal input
 *   - formatMultiChannelAsText flattens correctly
 */
import { describe, it, expect } from "vitest";
import { millTurnSwissPipelineEngine } from "../engines/MillTurnSwissPipelineEngine.js";

const baseMain = {
  turning_ops: [
    {
      type: "face",
      tool_number: 1,
      offset_number: 1,
      cutting_speed_m_min: 200,
      feed_mm_rev: 0.15,
      css: true,
      start_x_mm: 26,
      start_z_mm: 2,
      end_x_mm: 0,
      end_z_mm: 0,
    },
    {
      type: "turn_rough",
      tool_number: 2,
      offset_number: 2,
      cutting_speed_m_min: 180,
      feed_mm_rev: 0.25,
      css: true,
      start_x_mm: 24,
      start_z_mm: 0,
      end_x_mm: 20,
      end_z_mm: -30,
    },
  ],
  live_tool_ops: [],
  sub_spindle_ops: [],
  stock_od_mm: 25,
  part_length_mm: 40,
  material: { name: "4140", iso_group: "P" },
  program_number: 1234,
};

const withSubOps = {
  ...baseMain,
  sub_spindle_ops: [
    {
      type: "face",
      tool_number: 9,
      offset_number: 9,
      cutting_speed_m_min: 150,
      feed_mm_rev: 0.1,
      start_x_mm: 21,
      start_z_mm: -2,
      end_x_mm: 0,
      end_z_mm: 0,
    },
  ],
  transfer: true,
};

describe("MILL-MASTER-P3-U03 · assembleMultiChannelProgram core", () => {
  it("main-only input → 1 channel", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({ ...baseMain, controller: "fanuc" });
    expect(r.channel_count).toBe(1);
    expect(r.channels).toHaveLength(1);
    expect(r.channels[0].role).toBe("main");
  });

  it("main + sub → 2 channels", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({ ...withSubOps, controller: "fanuc" });
    expect(r.channel_count).toBe(2);
    expect(r.channels).toHaveLength(2);
    expect(r.channels[1].role).toBe("sub");
  });

  it("each channel has non-empty gcode_lines", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({ ...withSubOps, controller: "fanuc" });
    for (const ch of r.channels) {
      expect(ch.gcode_lines.length).toBeGreaterThan(2);
    }
  });

  it("channel 1 starts with safety block (G28 U0 W0 + G18 G40)", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({ ...baseMain, controller: "fanuc" });
    const ch1 = r.channels[0].gcode_lines;
    expect(ch1.some((l) => l.includes("G28 U0 W0"))).toBe(true);
    expect(ch1.some((l) => l.includes("G18 G40"))).toBe(true);
  });

  it("channel 1 ends with M30 (program end)", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({ ...baseMain, controller: "fanuc" });
    const ch1 = r.channels[0].gcode_lines;
    expect(ch1[ch1.length - 1]).toBe("M30");
  });

  it("op_count reflects actual operation counts", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({ ...withSubOps, controller: "fanuc" });
    expect(r.channels[0].op_count).toBe(2); // turn_ops + live_tool_ops (0)
    expect(r.channels[1].op_count).toBe(1); // sub_ops
  });
});

describe("MILL-MASTER-P3-U03 · dialect auto-resolution (6 dialects)", () => {
  const cases = [
    { controller: "citizen_cincom_l20", expected: "citizen_cincom" },
    { controller: "Citizen Swiss",      expected: "citizen_cincom" },
    { controller: "mazak_smooth_g",     expected: "mazak_smooth" },
    { controller: "Mazak SmoothX",      expected: "mazak_smooth" },
    { controller: "siemens_840d",       expected: "siemens_waitm" },
    { controller: "siemens_828d",       expected: "siemens_waitm" },
    { controller: "index_cline",        expected: "index_cline" },
    { controller: "tsugami_sw",         expected: "tsugami" },
    { controller: "fanuc_31i",          expected: "fanuc_wait_m" },
    { controller: "haas_ngc",           expected: "fanuc_wait_m" }, // default fallback
  ];

  it.each(cases)("'$controller' → $expected", ({ controller, expected }) => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({ ...baseMain, controller });
    expect(r.dialect).toBe(expected);
  });

  it("explicit dialect override beats controller auto-resolution", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({
      ...baseMain,
      controller: "fanuc_31i",
      dialect: "siemens_waitm",
    });
    expect(r.dialect).toBe("siemens_waitm");
  });

  it("unknown dialect falls back to fanuc_wait_m with warning", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({
      ...baseMain,
      controller: "fanuc",
      dialect: "made_up_dialect",
    });
    expect(r.dialect).toBe("fanuc_wait_m");
    expect(r.warnings.some((w) => /unknown dialect/i.test(w))).toBe(true);
  });
});

describe("MILL-MASTER-P3-U03 · dialect-specific sync codes", () => {
  it("citizen_cincom → '$<ch> M<code>' format", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({ ...withSubOps, controller: "citizen_cincom" });
    const syncCodes = r.sync_points.map((s) => s.sync_code);
    expect(syncCodes.length).toBeGreaterThan(0);
    for (const code of syncCodes) {
      expect(code).toMatch(/^\$\d+ M\d+/);
    }
  });

  it("fanuc_wait_m → 'M<200-range>' wait codes", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({ ...withSubOps, controller: "fanuc" });
    for (const s of r.sync_points) {
      expect(s.sync_code).toMatch(/^M2\d{2}/);
    }
  });

  it("mazak_smooth → '!L<ch> C<ch>' format", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({ ...withSubOps, controller: "mazak_smooth" });
    for (const s of r.sync_points) {
      expect(s.sync_code).toMatch(/^!L\d+ C\d+/);
    }
  });

  it("siemens_waitm → 'WAITM(id,waitCh,signalCh)' format", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({ ...withSubOps, controller: "siemens_840d" });
    for (const s of r.sync_points) {
      expect(s.sync_code).toMatch(/^WAITM\(\d+,\d+,\d+\)/);
    }
  });

  it("index_cline → 'GETIME(id) WTIME(id)' paired format", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({ ...withSubOps, controller: "index_cline" });
    for (const s of r.sync_points) {
      expect(s.sync_code).toMatch(/GETIME\(\d+\) WTIME\(\d+\)/);
    }
  });

  it("tsugami → '@SYNC <id>' marker format", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({ ...withSubOps, controller: "tsugami_sw" });
    for (const s of r.sync_points) {
      expect(s.sync_code).toMatch(/^@SYNC \d+/);
    }
  });
});

describe("MILL-MASTER-P3-U03 · sync point insertion", () => {
  it("no sync points when only main spindle (single channel)", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({ ...baseMain, controller: "fanuc" });
    expect(r.sync_points).toHaveLength(0);
  });

  it("2 sync points when sub-spindle present (transfer + end-of-back-work)", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({ ...withSubOps, controller: "fanuc" });
    expect(r.sync_points).toHaveLength(2);
    const labels = r.sync_points.map((s) => s.after_op);
    expect(labels).toContain("main_turning_complete");
    expect(labels).toContain("sub_work_complete");
  });

  it("each sync_point has unique sync_id", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({ ...withSubOps, controller: "fanuc" });
    const ids = new Set(r.sync_points.map((s) => s.sync_id));
    expect(ids.size).toBe(r.sync_points.length);
  });

  it("transfer sync appears in channel 1 (main waits/stops)", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({ ...withSubOps, controller: "fanuc" });
    const ch1Text = r.channels[0].gcode_lines.join("\n");
    expect(ch1Text).toMatch(/M2\d{2}/); // A M200+ sync code
  });

  it("sub-work sync appears in channel 2", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({ ...withSubOps, controller: "fanuc" });
    const ch2Text = r.channels[1].gcode_lines.join("\n");
    expect(ch2Text).toMatch(/M2\d{2}/);
  });
});

describe("MILL-MASTER-P3-U03 · dialect-specific header + separators", () => {
  it("citizen header names channels by role (MAIN / SUB)", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({ ...withSubOps, controller: "citizen_cincom" });
    const headerText = r.header_lines.join("\n");
    expect(headerText).toMatch(/MAIN/);
    expect(headerText).toMatch(/SUB/);
  });

  it("siemens header has CHANDATA + CHANNAME declarations", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({ ...withSubOps, controller: "siemens_840d" });
    const headerText = r.header_lines.join("\n");
    expect(headerText).toContain("CHANDATA(2)");
    expect(headerText).toContain(`CHANNAME[1]="MAIN"`);
    expect(headerText).toContain(`CHANNAME[2]="SUB"`);
  });

  it("citizen separator is '$N'", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({ ...withSubOps, controller: "citizen_cincom" });
    expect(r.channels[0].gcode_lines[0]).toBe("$1");
    expect(r.channels[1].gcode_lines[0]).toBe("$2");
  });

  it("tsugami separator is '@CHN'", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({ ...withSubOps, controller: "tsugami_sw" });
    expect(r.channels[0].gcode_lines[0]).toBe("@CH1");
    expect(r.channels[1].gcode_lines[0]).toBe("@CH2");
  });

  it("fanuc separator is a comment block", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({ ...withSubOps, controller: "fanuc" });
    expect(r.channels[0].gcode_lines[0]).toMatch(/^\(=+ CHANNEL 1 =+\)$/);
  });

  it("header includes material info when supplied", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({ ...baseMain, controller: "fanuc" });
    const headerText = r.header_lines.join("\n");
    expect(headerText).toContain("4140");
    expect(headerText).toContain("ISO P");
  });
});

describe("MILL-MASTER-P3-U03 · formatMultiChannelAsText flattening", () => {
  it("produces single string with header + channels + %", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({ ...withSubOps, controller: "fanuc" });
    const text = millTurnSwissPipelineEngine.formatMultiChannelAsText(r);
    expect(text).toContain(r.header_lines[0]);
    expect(text.trim().endsWith("%")).toBe(true);
  });

  it("flattened text contains BOTH channel separators in order", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({ ...withSubOps, controller: "citizen_cincom" });
    const text = millTurnSwissPipelineEngine.formatMultiChannelAsText(r);
    const ch1Pos = text.indexOf("$1");
    const ch2Pos = text.indexOf("$2");
    expect(ch1Pos).toBeGreaterThan(-1);
    expect(ch2Pos).toBeGreaterThan(ch1Pos);
  });
});

describe("MILL-MASTER-P3-U03 · graceful edge cases", () => {
  it("empty ops → warning but non-empty channel", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({
      turning_ops: [], live_tool_ops: [], sub_spindle_ops: [],
      stock_od_mm: 25, part_length_mm: 40, controller: "fanuc",
    });
    expect(r.warnings.some((w) => /no operations/i.test(w))).toBe(true);
    expect(r.channels[0].gcode_lines.length).toBeGreaterThan(0);
  });

  it("sub-only (no main) emits warning", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({
      turning_ops: [], live_tool_ops: [],
      sub_spindle_ops: withSubOps.sub_spindle_ops,
      transfer: true,
      stock_od_mm: 25, part_length_mm: 40, controller: "fanuc",
    });
    expect(r.warnings.some((w) => /sub-spindle.*no main/i.test(w))).toBe(true);
  });

  it("defaults program_number to 1 when omitted", () => {
    const r = millTurnSwissPipelineEngine.assembleMultiChannelProgram({
      turning_ops: baseMain.turning_ops, live_tool_ops: [], sub_spindle_ops: [],
      stock_od_mm: 25, part_length_mm: 40, controller: "fanuc",
    });
    expect(r.header_lines[0]).toContain("O0001");
  });

  it("does not throw on null-ish material", () => {
    expect(() => millTurnSwissPipelineEngine.assembleMultiChannelProgram({
      ...baseMain, material: null, controller: "fanuc",
    } as any)).not.toThrow();
  });
});
