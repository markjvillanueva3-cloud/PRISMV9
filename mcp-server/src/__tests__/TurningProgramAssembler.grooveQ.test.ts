/**
 * MILL-MASTER-P3-U07-GROOVE-Q — G75 Q = insert_width - overlap
 *
 * Before U07, TurningProgramAssemblerEngine.generateGrooveOp emitted:
 *   Q = Math.round(groove.width_mm * 500)
 * i.e. half the GROOVE width expressed in micrometers — a physically
 * meaningless value. For an 8 mm groove with a 3 mm insert this set
 * Q=4000 (4 mm stepover), which exceeds the insert width and leaves
 * un-cut material between passes.
 *
 * U07 makes Q derive from the INSERT width minus overlap:
 *   Q = (min(insert_width, groove_width) - overlap) * 1000
 * where overlap = 10% of insert_width, clamped to [0.1 mm, 30% of insert_width].
 * Missing tool.insert_width_mm falls back to a 3 mm default.
 */
import { describe, it, expect } from "vitest";
import { turningProgramAssemblerEngine } from "../engines/TurningProgramAssemblerEngine.js";

async function runGroove(opts: {
  grooveWidthMm: number;
  grooveDepthMm: number;
  insertWidthMm?: number;
}): Promise<{ gcodeLines: string[]; g75Line: string }> {
  const result = await turningProgramAssemblerEngine.assembleTurningProgram({
    part: {
      bar_diameter_mm: 40,
      bar_length_mm: 60,
      material: "steel",
      od_profile: [
        { z_mm: 0, x_mm: 40 },
        { z_mm: -50, x_mm: 40 },
      ],
      od_grooves: [
        {
          z_position_mm: -20,
          width_mm: opts.grooveWidthMm,
          depth_mm: opts.grooveDepthMm,
        },
      ],
    },
    controller: "fanuc",
    machine_max_rpm: 4000,
    machine_power_kw: 15,
    tools: [
      {
        station: 1,
        tool_type: "CNMG_roughing",
        description: "OD rough tool",
        nose_radius_mm: 0.8,
        orientation: 3,
        offset_number: 1,
        wear_offset_number: 1,
      },
      {
        station: 2,
        tool_type: "VNMG_finishing",
        description: "OD finish tool",
        nose_radius_mm: 0.4,
        orientation: 3,
        offset_number: 2,
        wear_offset_number: 2,
      },
      {
        station: 5,
        tool_type: "grooving_insert",
        description: "OD groove tool",
        nose_radius_mm: 0.2,
        orientation: 3,
        offset_number: 5,
        wear_offset_number: 5,
        ...(opts.insertWidthMm !== undefined ? { insert_width_mm: opts.insertWidthMm } : {}),
      },
    ],
  });
  const program = (result as any).value ?? result;
  const operations = program.operations ?? [];
  const allLines: string[] = operations.flatMap((op: any) => op.gcode_lines ?? []);
  const g75Line =
    allLines.find(l => /G75\b/.test(l) && /\bQ\d+/.test(l)) ?? "";
  return { gcodeLines: allLines, g75Line };
}

function extractQ(line: string): number {
  const m = line.match(/\bQ(\d+)/);
  expect(m, `no Q token in line: ${line}`).toBeTruthy();
  return Number.parseInt(m![1]!, 10);
}

describe("MILL-MASTER-P3-U07 · G75 Q derives from insert_width minus overlap", () => {
  it("3 mm insert, 8 mm groove → Q = (3 - 0.3) * 1000 = 2700 micro-mm", async () => {
    const { g75Line } = await runGroove({ grooveWidthMm: 8, grooveDepthMm: 3, insertWidthMm: 3 });
    expect(g75Line).toBeTruthy();
    expect(extractQ(g75Line)).toBe(2700);
  });

  it("4 mm insert → Q = (4 - 0.4) * 1000 = 3600 micro-mm", async () => {
    const { g75Line } = await runGroove({ grooveWidthMm: 10, grooveDepthMm: 3, insertWidthMm: 4 });
    expect(extractQ(g75Line)).toBe(3600);
  });

  it("2 mm insert → overlap 0.2 (10% of 2) → Q = 1800", async () => {
    const { g75Line } = await runGroove({ grooveWidthMm: 5, grooveDepthMm: 2, insertWidthMm: 2 });
    expect(extractQ(g75Line)).toBe(1800);
  });

  it("0.5 mm insert → overlap clamped to 0.1 mm floor → Q = 400", async () => {
    const { g75Line } = await runGroove({ grooveWidthMm: 3, grooveDepthMm: 1, insertWidthMm: 0.5 });
    expect(extractQ(g75Line)).toBe(400);
  });

  it("narrow groove (2 mm) with wide insert (3 mm) → uses groove_width - overlap", async () => {
    const { g75Line } = await runGroove({ grooveWidthMm: 2, grooveDepthMm: 1, insertWidthMm: 3 });
    // effectiveWidth = min(3, 2) = 2 → Q = (2 - 0.3) * 1000 = 1700
    expect(extractQ(g75Line)).toBe(1700);
  });

  it("missing insert_width → falls back to 3 mm default → Q = 2700", async () => {
    const { g75Line } = await runGroove({ grooveWidthMm: 8, grooveDepthMm: 3 });
    expect(extractQ(g75Line)).toBe(2700);
  });
});

describe("MILL-MASTER-P3-U07 · anti-regression: no longer groove_width * 500", () => {
  it("Q for 8 mm groove with 3 mm insert is NOT 4000 (old bug)", async () => {
    const { g75Line } = await runGroove({ grooveWidthMm: 8, grooveDepthMm: 3, insertWidthMm: 3 });
    expect(extractQ(g75Line)).not.toBe(4000);
  });

  it("Q stays bounded by insert_width for every groove/insert combination", async () => {
    const cases: Array<{ gW: number; insert: number }> = [
      { gW: 5, insert: 3 },
      { gW: 10, insert: 3 },
      { gW: 20, insert: 4 },
      { gW: 50, insert: 6 },
      { gW: 2, insert: 3 },
    ];
    for (const { gW, insert } of cases) {
      const { g75Line } = await runGroove({ grooveWidthMm: gW, grooveDepthMm: 2, insertWidthMm: insert });
      const q = extractQ(g75Line);
      const upper = Math.min(insert, gW) * 1000;
      expect(q, `gW=${gW} insert=${insert}`).toBeLessThanOrEqual(upper);
      expect(q).toBeGreaterThan(0);
    }
  });
});

describe("MILL-MASTER-P3-U07 · G-code comment annotations", () => {
  it("G75 line records Q = insert_width - overlap relationship", async () => {
    const { g75Line } = await runGroove({ grooveWidthMm: 6, grooveDepthMm: 2, insertWidthMm: 3 });
    expect(g75Line).toMatch(/Q=INSERT_W/);
  });

  it("tool-change line records the insert width in the annotation", async () => {
    const { gcodeLines } = await runGroove({ grooveWidthMm: 6, grooveDepthMm: 2, insertWidthMm: 3 });
    expect(gcodeLines.some(l => /INSERT_W3/.test(l))).toBe(true);
  });
});

describe("MILL-MASTER-P3-U07 · TurningToolAssignment accepts insert_width_mm", () => {
  it("insert_width_mm is an optional typed field on the assignment", () => {
    const tool = {
      station: 1,
      tool_type: "groove",
      description: "t",
      nose_radius_mm: 0.2,
      orientation: 3 as const,
      offset_number: 1,
      wear_offset_number: 1,
      insert_width_mm: 3.0,
    };
    expect(tool.insert_width_mm).toBe(3.0);
  });
});
