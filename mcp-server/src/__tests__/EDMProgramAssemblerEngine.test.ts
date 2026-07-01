/**
 * EDMProgramAssemblerEngine — WEDM Program Assembly Tests
 *
 * MS-P3-TIER6A/U-P3-T6A-03
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  EDMProgramAssemblerEngine,
  edmProgramAssemblerEngine,
  ProgramAssemblyInput,
  PassBlock,
  CutPath,
  ControllerDialect,
} from "../engines/EDMProgramAssemblerEngine.js";

describe("EDMProgramAssemblerEngine", () => {
  let engine: EDMProgramAssemblerEngine;

  beforeEach(() => {
    engine = new EDMProgramAssemblerEngine();
  });

  const makeSimplePath = (): CutPath => ({
    start: { x: 0, y: 0 },
    points: [
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ],
    closed: true,
  });

  const makeSimplePasses = (): PassBlock[] => [
    {
      pass_number: 1,
      pass_type: "rough",
      offset_mm: 0.15,
      compensation: "left",
      d_register: 1,
      cut_time_min: 30,
    },
    {
      pass_number: 2,
      pass_type: "finish",
      offset_mm: 0,
      compensation: "left",
      d_register: 2,
      cut_time_min: 50,
    },
  ];

  describe("singleton export", () => {
    it("exports singleton instance", () => {
      expect(edmProgramAssemblerEngine).toBeInstanceOf(EDMProgramAssemblerEngine);
      expect(edmProgramAssemblerEngine.name).toBe("EDMProgramAssemblerEngine");
      expect(edmProgramAssemblerEngine.version).toBe("1.0.0");
    });
  });

  describe("getSupportedDialects", () => {
    it("returns all supported dialects", () => {
      const dialects = engine.getSupportedDialects();
      expect(dialects).toContain("mitsubishi");
      expect(dialects).toContain("sodick");
      expect(dialects).toContain("makino");
      expect(dialects).toContain("agie");
      expect(dialects).toContain("fanuc");
    });
  });

  describe("getDialectCodes", () => {
    it("returns Mitsubishi codes", () => {
      const codes = engine.getDialectCodes("mitsubishi");
      expect(codes.wire_thread).toBe("M50");
      expect(codes.wire_cut).toBe("M51");
      expect(codes.program_end).toBe("M30");
    });

    it("returns Sodick codes", () => {
      const codes = engine.getDialectCodes("sodick");
      expect(codes.wire_thread).toBe("M06");
      expect(codes.wire_cut).toBe("M07");
    });

    it("returns default codes for unknown dialect", () => {
      const codes = engine.getDialectCodes("unknown" as ControllerDialect);
      expect(codes).toBeDefined();
      expect(codes.program_end).toBe("M30");
    });
  });

  describe("buildHeader", () => {
    it("builds header with required fields", () => {
      const codes = engine.getDialectCodes("mitsubishi");
      const header = engine.buildHeader(
        1234,
        "Test Part",
        "D2 Tool Steel",
        25,
        "brass 0.25mm",
        undefined,
        undefined,
        codes,
        "metric"
      );

      expect(header.type).toBe("header");
      expect(header.lines[0]).toBe("O1234");
      expect(header.lines.some(l => l.includes("Test Part"))).toBe(true);
      expect(header.lines.some(l => l.includes("D2 Tool Steel"))).toBe(true);
      expect(header.lines.some(l => l.includes("25MM"))).toBe(true);
      expect(header.lines.some(l => l.includes("G21"))).toBe(true);
    });

    it("includes machine name when provided", () => {
      const codes = engine.getDialectCodes("mitsubishi");
      const header = engine.buildHeader(
        1,
        "Part",
        "Steel",
        20,
        "brass",
        "MV1200R",
        undefined,
        codes,
        "metric"
      );

      expect(header.lines.some(l => l.includes("MV1200R"))).toBe(true);
    });

    it("uses imperial unit code when specified", () => {
      const codes = engine.getDialectCodes("mitsubishi");
      const header = engine.buildHeader(
        1,
        "Part",
        "Steel",
        20,
        "brass",
        undefined,
        undefined,
        codes,
        "imperial"
      );

      expect(header.lines.some(l => l.includes("G20"))).toBe(true);
    });
  });

  describe("buildSetup", () => {
    it("builds setup block with start position", () => {
      const codes = engine.getDialectCodes("mitsubishi");
      const setup = engine.buildSetup(
        { x: 5, y: 10 },
        "G54",
        codes,
        "mitsubishi"
      );

      expect(setup.type).toBe("setup");
      expect(setup.lines.some(l => l.includes("G54"))).toBe(true);
      expect(setup.lines.some(l => l.includes("X5.000") && l.includes("Y10.000"))).toBe(true);
      expect(setup.lines.some(l => l.includes("M50"))).toBe(true);
      expect(setup.lines.some(l => l.includes("M08"))).toBe(true);
    });
  });

  describe("buildPassBlock", () => {
    it("builds pass block with compensation", () => {
      const codes = engine.getDialectCodes("mitsubishi");
      const pass: PassBlock = {
        pass_number: 1,
        pass_type: "rough",
        offset_mm: 0.15,
        compensation: "left",
        d_register: 1,
        cut_time_min: 30,
      };
      const path = makeSimplePath();

      const block = engine.buildPassBlock(pass, path, codes, false, "mitsubishi");

      expect(block.type).toBe("pass");
      expect(block.pass_number).toBe(1);
      expect(block.lines.some(l => l.includes("PASS 1"))).toBe(true);
      expect(block.lines.some(l => l.includes("D01"))).toBe(true);
      expect(block.lines.some(l => l.includes("G41"))).toBe(true);
      expect(block.lines.some(l => l.includes("G40"))).toBe(true);
    });

    it("uses right compensation when specified", () => {
      const codes = engine.getDialectCodes("mitsubishi");
      const pass: PassBlock = {
        pass_number: 1,
        pass_type: "rough",
        offset_mm: 0.15,
        compensation: "right",
        d_register: 1,
        cut_time_min: 30,
      };
      const path = makeSimplePath();

      const block = engine.buildPassBlock(pass, path, codes, false, "mitsubishi");

      expect(block.lines.some(l => l.includes("G42"))).toBe(true);
    });

    it("skips compensation when none specified", () => {
      const codes = engine.getDialectCodes("mitsubishi");
      const pass: PassBlock = {
        pass_number: 1,
        pass_type: "rough",
        offset_mm: 0.15,
        compensation: "none",
        d_register: 1,
        cut_time_min: 30,
      };
      const path = makeSimplePath();

      const block = engine.buildPassBlock(pass, path, codes, false, "mitsubishi");

      expect(block.lines.some(l => l.includes("G41"))).toBe(false);
      expect(block.lines.some(l => l.includes("G42"))).toBe(false);
    });

    it("includes E-code when specified", () => {
      const codes = engine.getDialectCodes("mitsubishi");
      const pass: PassBlock = {
        pass_number: 1,
        pass_type: "rough",
        offset_mm: 0.15,
        compensation: "left",
        d_register: 1,
        e_code: "E0240",
        cut_time_min: 30,
      };
      const path = makeSimplePath();

      const block = engine.buildPassBlock(pass, path, codes, false, "mitsubishi");

      expect(block.lines.some(l => l.includes("E0240"))).toBe(true);
    });

    it("includes optional stop when enabled", () => {
      const codes = engine.getDialectCodes("mitsubishi");
      const pass: PassBlock = {
        pass_number: 1,
        pass_type: "rough",
        offset_mm: 0.15,
        compensation: "left",
        d_register: 1,
        cut_time_min: 30,
      };
      const path = makeSimplePath();

      const block = engine.buildPassBlock(pass, path, codes, true, "mitsubishi");

      expect(block.lines.some(l => l.includes("M01"))).toBe(true);
    });
  });

  describe("buildFooter", () => {
    it("builds footer with end codes", () => {
      const codes = engine.getDialectCodes("mitsubishi");
      const footer = engine.buildFooter(codes);

      expect(footer.type).toBe("footer");
      expect(footer.lines.some(l => l.includes("M09"))).toBe(true);
      expect(footer.lines.some(l => l.includes("M51"))).toBe(true);
      expect(footer.lines.some(l => l.includes("M30"))).toBe(true);
    });
  });

  describe("assemble — happy path", () => {
    it("assembles complete program", () => {
      const input: ProgramAssemblyInput = {
        program_number: 1234,
        part_name: "Test Progressive Die",
        material: "D2 Tool Steel",
        thickness_mm: 25,
        path: makeSimplePath(),
        passes: makeSimplePasses(),
      };

      const result = engine.assemble(input);

      expect(result.success).toBe(true);
      expect(result.program_number).toBe(1234);
      expect(result.pass_count).toBe(2);
      expect(result.line_count).toBeGreaterThan(20);
      expect(result.total_time_min).toBe(80);
      expect(result.dialect).toBe("mitsubishi");
    });

    it("generates valid program text", () => {
      const input: ProgramAssemblyInput = {
        program_number: 100,
        part_name: "Square Pocket",
        material: "Steel",
        thickness_mm: 20,
        path: makeSimplePath(),
        passes: makeSimplePasses(),
      };

      const result = engine.assemble(input);

      expect(result.program_text).toContain("O0100");
      expect(result.program_text).toContain("G21");
      expect(result.program_text).toContain("G41");
      expect(result.program_text).toContain("M30");
    });

    it("includes all blocks", () => {
      const input: ProgramAssemblyInput = {
        program_number: 1,
        part_name: "Test",
        material: "Steel",
        thickness_mm: 20,
        path: makeSimplePath(),
        passes: makeSimplePasses(),
      };

      const result = engine.assemble(input);

      expect(result.blocks.some(b => b.type === "header")).toBe(true);
      expect(result.blocks.some(b => b.type === "setup")).toBe(true);
      expect(result.blocks.filter(b => b.type === "pass")).toHaveLength(2);
      expect(result.blocks.some(b => b.type === "footer")).toBe(true);
    });
  });

  describe("assemble — dialect variations", () => {
    it("uses Sodick codes when specified", () => {
      const input: ProgramAssemblyInput = {
        program_number: 1,
        part_name: "Test",
        material: "Steel",
        thickness_mm: 20,
        path: makeSimplePath(),
        passes: makeSimplePasses(),
        dialect: "sodick",
      };

      const result = engine.assemble(input);

      expect(result.dialect).toBe("sodick");
      expect(result.program_text).toContain("M06");
      expect(result.program_text).toContain("M07");
    });

    it("uses Makino codes when specified", () => {
      const input: ProgramAssemblyInput = {
        program_number: 1,
        part_name: "Test",
        material: "Steel",
        thickness_mm: 20,
        path: makeSimplePath(),
        passes: makeSimplePasses(),
        dialect: "makino",
      };

      const result = engine.assemble(input);

      expect(result.dialect).toBe("makino");
      expect(result.program_text).toContain("M60");
    });
  });

  describe("assemble — tab positions", () => {
    it("includes tab info when specified", () => {
      const input: ProgramAssemblyInput = {
        program_number: 1,
        part_name: "Test",
        material: "Steel",
        thickness_mm: 20,
        path: makeSimplePath(),
        passes: makeSimplePasses(),
        include_tabs: true,
        tab_positions: [
          { x: 5, y: 0 },
          { x: 10, y: 5 },
        ],
      };

      const result = engine.assemble(input);

      expect(result.blocks.some(b => b.type === "comment")).toBe(true);
      expect(result.program_text).toContain("TAB COUNT: 2");
      expect(result.program_text).toContain("TAB 1:");
      expect(result.program_text).toContain("TAB 2:");
    });
  });

  describe("assemble — warnings", () => {
    it("warns on open path", () => {
      const input: ProgramAssemblyInput = {
        program_number: 1,
        part_name: "Test",
        material: "Steel",
        thickness_mm: 20,
        path: {
          start: { x: 0, y: 0 },
          points: [{ x: 10, y: 10 }],
          closed: false,
        },
        passes: makeSimplePasses(),
      };

      const result = engine.assemble(input);

      expect(result.warnings.some(w => w.includes("Open path"))).toBe(true);
    });

    it("warns on empty passes", () => {
      const input: ProgramAssemblyInput = {
        program_number: 1,
        part_name: "Test",
        material: "Steel",
        thickness_mm: 20,
        path: makeSimplePath(),
        passes: [],
      };

      const result = engine.assemble(input);

      expect(result.warnings.some(w => w.includes("No passes"))).toBe(true);
    });
  });

  describe("assemble — invalid input", () => {
    it("fails on invalid program number", () => {
      const input: ProgramAssemblyInput = {
        program_number: 0,
        part_name: "Test",
        material: "Steel",
        thickness_mm: 20,
        path: makeSimplePath(),
        passes: makeSimplePasses(),
      };

      const result = engine.assemble(input);

      expect(result.success).toBe(false);
      expect(result.summary).toContain("INVALID");
    });

    it("fails on program number > 9999", () => {
      const input: ProgramAssemblyInput = {
        program_number: 10000,
        part_name: "Test",
        material: "Steel",
        thickness_mm: 20,
        path: makeSimplePath(),
        passes: makeSimplePasses(),
      };

      const result = engine.assemble(input);

      expect(result.success).toBe(false);
    });

    it("fails on missing part name", () => {
      const input = {
        program_number: 1,
        part_name: "",
        material: "Steel",
        thickness_mm: 20,
        path: makeSimplePath(),
        passes: makeSimplePasses(),
      } as ProgramAssemblyInput;

      const result = engine.assemble(input);

      expect(result.success).toBe(false);
    });

    it("fails on missing path", () => {
      const input = {
        program_number: 1,
        part_name: "Test",
        material: "Steel",
        thickness_mm: 20,
        passes: makeSimplePasses(),
      } as ProgramAssemblyInput;

      const result = engine.assemble(input);

      expect(result.success).toBe(false);
    });

    it("fails on zero thickness", () => {
      const input: ProgramAssemblyInput = {
        program_number: 1,
        part_name: "Test",
        material: "Steel",
        thickness_mm: 0,
        path: makeSimplePath(),
        passes: makeSimplePasses(),
      };

      const result = engine.assemble(input);

      expect(result.success).toBe(false);
    });

    it("fails on negative thickness", () => {
      const input: ProgramAssemblyInput = {
        program_number: 1,
        part_name: "Test",
        material: "Steel",
        thickness_mm: -5,
        path: makeSimplePath(),
        passes: makeSimplePasses(),
      };

      const result = engine.assemble(input);

      expect(result.success).toBe(false);
    });
  });

  describe("createPassBlocksFromStrategy", () => {
    it("creates pass blocks from strategy output", () => {
      const strategyPasses = [
        { pass_number: 1, pass_type: "rough", offset_mm: 0.15 },
        { pass_number: 2, pass_type: "finish", offset_mm: 0 },
      ];

      const blocks = engine.createPassBlocksFromStrategy(strategyPasses, "left", 20);

      expect(blocks).toHaveLength(2);
      expect(blocks[0].pass_number).toBe(1);
      expect(blocks[0].pass_type).toBe("rough");
      expect(blocks[0].d_register).toBe(1);
      expect(blocks[0].compensation).toBe("left");
      expect(blocks[1].d_register).toBe(2);
    });

    it("applies speed factors to cut time", () => {
      const strategyPasses = [
        { pass_number: 1, pass_type: "rough", offset_mm: 0.15 },
        { pass_number: 2, pass_type: "finish", offset_mm: 0 },
      ];

      const blocks = engine.createPassBlocksFromStrategy(strategyPasses, "left", 100);

      expect(blocks[0].cut_time_min).toBe(100);
      expect(blocks[1].cut_time_min).toBeLessThan(100);
    });
  });

  describe("assemble — taper coordinates", () => {
    it("includes UV coordinates when present", () => {
      const input: ProgramAssemblyInput = {
        program_number: 1,
        part_name: "Taper Test",
        material: "Steel",
        thickness_mm: 20,
        path: {
          start: { x: 0, y: 0 },
          points: [
            { x: 10, y: 0, u: 0.5, v: 0 },
            { x: 10, y: 10, u: 0.5, v: 0.5 },
          ],
          closed: false,
        },
        passes: [makeSimplePasses()[0]],
      };

      const result = engine.assemble(input);

      expect(result.program_text).toContain("U0.500");
      expect(result.program_text).toContain("V0.500");
    });
  });

  describe("assemble — summary", () => {
    it("includes key info in summary", () => {
      const input: ProgramAssemblyInput = {
        program_number: 5678,
        part_name: "Test",
        material: "Steel",
        thickness_mm: 20,
        path: makeSimplePath(),
        passes: makeSimplePasses(),
        dialect: "sodick",
      };

      const result = engine.assemble(input);

      expect(result.summary).toContain("O5678");
      expect(result.summary).toContain("2 passes");
      expect(result.summary).toContain("sodick");
    });
  });

  describe("assembleWireEDM — dispatcher entry point", () => {
    it("delegates to assemble() and returns the same result shape", () => {
      const input: ProgramAssemblyInput = {
        program_number: 2001,
        part_name: "WireEDM_Part",
        material: "D2 tool steel",
        thickness_mm: 25,
        path: makeSimplePath(),
        passes: makeSimplePasses(),
      };

      const r1 = engine.assembleWireEDM(input);
      const r2 = engine.assemble(input);

      // Same program text + summary + line count (deterministic, no clock dep)
      expect(r1.program_text).toBe(r2.program_text);
      expect(r1.summary).toBe(r2.summary);
      expect(r1.line_count).toBe(r2.line_count);
      expect(r1.pass_count).toBe(2);
      expect(r1.success).toBe(true);
    });

    it("propagates invalid-input failure from assemble()", () => {
      const bad = {
        program_number: 0, // out of range
        part_name: "X",
        material: "Steel",
        thickness_mm: 10,
        path: makeSimplePath(),
        passes: makeSimplePasses(),
      } as ProgramAssemblyInput;

      const r = engine.assembleWireEDM(bad);
      expect(r.success).toBe(false);
      expect(r.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("computeUncertainty — deterministic confidence envelope", () => {
    it("returns wider Ra CI when only rough passes are planned", () => {
      const roughOnly: ProgramAssemblyInput = {
        program_number: 3001,
        part_name: "RoughOnly",
        material: "Steel",
        thickness_mm: 25,
        path: makeSimplePath(),
        passes: [{ pass_number: 1, pass_type: "rough", offset_mm: 0.15, compensation: "left", d_register: 1, cut_time_min: 30 }],
      };
      const withFinish: ProgramAssemblyInput = {
        ...roughOnly,
        passes: makeSimplePasses(), // rough + finish
      };

      const ruRough = engine.computeUncertainty(roughOnly);
      const ruFinish = engine.computeUncertainty(withFinish);

      const widthRough = ruRough.ra_um_ci95[1] - ruRough.ra_um_ci95[0];
      const widthFinish = ruFinish.ra_um_ci95[1] - ruFinish.ra_um_ci95[0];

      // Ra CI must NARROW once a finishing pass is added, regardless of
      // which Ra anchor is chosen — width is the test invariant
      expect(widthFinish).toBeLessThan(widthRough);
      expect(ruRough.finest_pass).toBe("rough");
      expect(ruFinish.finest_pass).toBe("finish");
      expect(ruRough.rough_pass_share).toBeCloseTo(1.0, 6);
      expect(ruFinish.rough_pass_share).toBeCloseTo(0.5, 6);
    });

    it("drops overall_confidence on thick stock (>50mm)", () => {
      const thin: ProgramAssemblyInput = {
        program_number: 3002,
        part_name: "Thin",
        material: "Steel",
        thickness_mm: 25,
        path: makeSimplePath(),
        passes: makeSimplePasses(),
      };
      const thick: ProgramAssemblyInput = { ...thin, thickness_mm: 100 };

      const cThin = engine.computeUncertainty(thin).overall_confidence;
      const cThick = engine.computeUncertainty(thick).overall_confidence;

      expect(cThin).toBeGreaterThan(cThick);
      // Both must stay inside the documented confidence band [0.5, 0.98]
      for (const c of [cThin, cThick]) {
        expect(c).toBeGreaterThanOrEqual(0.5);
        expect(c).toBeLessThanOrEqual(0.98);
      }
    });

    it("cut-time CI95 width equals nominal × 2×SPEED_DRIFT_PCT (±10%)", () => {
      const input: ProgramAssemblyInput = {
        program_number: 3003,
        part_name: "TimeCheck",
        material: "Steel",
        thickness_mm: 25,
        path: makeSimplePath(),
        passes: makeSimplePasses(),
      };

      const r = engine.computeUncertainty(input);
      const [lo, hi] = r.cut_time_min_ci95;
      const midpoint = (lo + hi) / 2;
      // The ±10% envelope is symmetric around the nominal time
      expect((hi - lo) / midpoint).toBeCloseTo(0.2, 2);
      expect(r.n_passes).toBe(2);
    });
  });

  describe("assembleSinkerEDM (die-sink / ram EDM)", () => {
    const sinkerInput = () => ({
      program_number: 42,
      part_name: "DIE CAVITY",
      material: "P20 steel",
      electrode_material: "graphite",
      cavity_depth_mm: 12,
    });

    it("produces a real 3-burn die-sink program by default", () => {
      const r = engine.assembleSinkerEDM(sinkerInput());
      expect(r.success).toBe(true);
      expect(r.pass_count).toBe(3); // rough + semi_finish + finish
      expect(r.program_number).toBe(42);
      expect(r.line_count).toBeGreaterThan(0);
      expect(r.total_time_min).toBeGreaterThan(0);
      expect(r.program_text).toContain("DIE-SINK EDM: DIE CAVITY");
      expect(r.program_text).toContain("ELECTRODE: graphite");
    });

    it("plunges the electrode to the full cavity depth (Z negative)", () => {
      const r = engine.assembleSinkerEDM(sinkerInput());
      expect(r.program_text).toContain("Z-12.000");
      expect(r.program_text).toContain("PLUNGE TO DEPTH");
    });

    it("burn schedule DECREASES current rough->finish (real die-sink physics)", () => {
      const r = engine.assembleSinkerEDM(sinkerInput());
      // Extract the peak-current value from each burn comment, in order.
      const currents = Array.from(r.program_text.matchAll(/I=(\d+)A/g)).map(m => Number(m[1]));
      expect(currents.length).toBe(3);
      // Strictly monotonic decreasing: rough (20) > semi (8) > finish (3).
      expect(currents[0]).toBeGreaterThan(currents[1]);
      expect(currents[1]).toBeGreaterThan(currents[2]);
      expect(currents[0]).toBe(20);
      expect(currents[2]).toBe(3);
      // Finish burn carries the finest Ra.
      expect(r.program_text).toContain("Ra=0.8um");
    });

    it("emits a sinker footer (program end) with NO wire-cut code", () => {
      const r = engine.assembleSinkerEDM(sinkerInput());
      expect(r.program_text).toContain("M30"); // program_end (mitsubishi)
      // Mitsubishi wire_cut is M51 -- a die-sink program must never emit it.
      expect(r.program_text).not.toContain("M51");
    });

    it("honors a custom burn schedule (pass_count tracks the schedule length)", () => {
      const r = engine.assembleSinkerEDM({
        ...sinkerInput(),
        burn_settings: [
          { pass_type: "rough", peak_current_A: 30, on_time_us: 200, off_time_us: 50, overcut_mm: 0.4, orbit_radius_mm: 0, ra_um: 6.3, plunge_feed_mm_min: 3 },
          { pass_type: "finish", peak_current_A: 2, on_time_us: 4, off_time_us: 4, overcut_mm: 0.02, orbit_radius_mm: 0.02, ra_um: 0.4, plunge_feed_mm_min: 0.3 },
        ],
      });
      expect(r.success).toBe(true);
      expect(r.pass_count).toBe(2);
      expect(r.program_text).toContain("I=30A");
      expect(r.program_text).toContain("Ra=0.4um");
    });

    it("rejects invalid input (program_number out of range, non-positive depth)", () => {
      expect(engine.assembleSinkerEDM({ ...sinkerInput(), program_number: 0 }).success).toBe(false);
      expect(engine.assembleSinkerEDM({ ...sinkerInput(), cavity_depth_mm: 0 }).success).toBe(false);
      expect(engine.assembleSinkerEDM({ ...sinkerInput(), cavity_depth_mm: -5 }).success).toBe(false);
    });

    it("warns on a deep cavity (>50mm) -- flushing + electrode wear risk", () => {
      const r = engine.assembleSinkerEDM({ ...sinkerInput(), cavity_depth_mm: 80 });
      expect(r.success).toBe(true);
      expect(r.warnings.some(w => /Deep cavity/.test(w))).toBe(true);
    });

    it("respects the requested controller dialect (sodick flush/end codes)", () => {
      const r = engine.assembleSinkerEDM({ ...sinkerInput(), dialect: "sodick" as ControllerDialect });
      expect(r.dialect).toBe("sodick");
      expect(r.program_text).toContain("M08"); // flush_on
      expect(r.program_text).toContain("M30"); // program_end
    });

    it("is deterministic for the same input (cavity geometry)", () => {
      const a = engine.assembleSinkerEDM(sinkerInput());
      const b = engine.assembleSinkerEDM(sinkerInput());
      // program_text carries a date header line; compare the pass blocks instead.
      expect(a.pass_count).toBe(b.pass_count);
      expect(a.total_time_min).toBe(b.total_time_min);
      expect(a.blocks.filter(bl => bl.type === "pass")).toEqual(
        b.blocks.filter(bl => bl.type === "pass"),
      );
    });
  });

  // ==========================================================================
  // NON-FINITE EMIT GUARD (U-PP-NONFINITE-EMIT-SWEEP) -- a NaN/Infinity wire
  // coordinate (start / cut point / close / taper UV) must never leak a literal
  // XNaN/UInfinity the wire control rejects. EDM-assembler arm of the bug-class sweep.
  // ==========================================================================
  describe("non-finite emit guard (U-PP-NONFINITE-EMIT-SWEEP)", () => {
    const codes = () => new EDMProgramAssemblerEngine().getDialectCodes("mitsubishi");
    const joined = (b: { lines: string[] }) => b.lines.join("\n");
    const noBadToken = (g: string) => {
      expect(g).not.toMatch(/[XYUV]NaN/);
      expect(g).not.toMatch(/[XYUV]Infinity/);
    };

    it("[regression] a finite path emits real motion with NO ERROR marker", () => {
      const block = engine.buildPassBlock(makeSimplePasses()[0], makeSimplePath(), codes(), false, "mitsubishi");
      expect(/X10\.000 Y0\.000/.test(joined(block))).toBe(true);
      expect(joined(block)).not.toContain("ERROR");
    });

    it("NaN start coord emits an ERROR marker -- no literal XNaN", () => {
      const path: CutPath = { start: { x: 0, y: 0 }, points: [{ x: NaN, y: 0 }, { x: 10, y: 10 }], closed: false };
      const block = engine.buildPassBlock(makeSimplePasses()[0], path, codes(), false, "mitsubishi");
      noBadToken(joined(block));
      expect(joined(block)).toContain("NON-FINITE START COORD");
    });

    it("Infinity cut point is skipped -- no literal XInfinity, finite neighbor still emits", () => {
      const path: CutPath = { start: { x: 0, y: 0 }, points: [{ x: 5, y: 5 }, { x: Infinity, y: 1 }, { x: 20, y: 20 }], closed: false };
      const block = engine.buildPassBlock(makeSimplePasses()[0], path, codes(), false, "mitsubishi");
      noBadToken(joined(block));
      expect(joined(block)).toContain("NON-FINITE COORD");
      expect(/X20\.000/.test(joined(block))).toBe(true);
    });

    it("non-finite taper U/V is omitted -- no literal UNaN", () => {
      const path: CutPath = { start: { x: 0, y: 0 }, points: [{ x: 5, y: 5 }, { x: 10, y: 10, u: NaN, v: Infinity }], closed: false };
      const block = engine.buildPassBlock(makeSimplePasses()[0], path, codes(), false, "mitsubishi");
      noBadToken(joined(block));
      expect(joined(block)).toContain("NON-FINITE TAPER U/V");
    });

    it("buildSetup with a NaN start coord emits an ERROR marker -- no literal XNaN", () => {
      const setup = engine.buildSetup({ x: NaN, y: 5 }, "G54", codes(), "mitsubishi");
      noBadToken(setup.lines.join("\n"));
      expect(setup.lines.join("\n")).toContain("NON-FINITE SETUP START COORD");
    });
  });
});
