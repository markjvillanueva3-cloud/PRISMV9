/**
 * LathePostGeneratorDialectEngine Tests — LATHE-MASTER U-LTH16
 *
 * Verifies correct G71/G76/G83 syntax generation for:
 * - Fanuc 31i-T
 * - Okuma OSP-P300L
 * - Mitsubishi M80
 *
 * Exit Gate: All three controllers produce valid, dialect-correct G-code
 */

import { describe, it, expect } from "vitest";
import {
  LathePostGeneratorDialectEngine,
  CycleParameters,
} from "../engines/LathePostGeneratorDialectEngine.js";

describe("LathePostGeneratorDialectEngine", () => {
  describe("Version and Metadata", () => {
    it("returns version string", () => {
      expect(LathePostGeneratorDialectEngine.getVersion()).toBe("1.0.0");
    });
  });

  describe("G71 Stock Removal Turning Cycle", () => {
    const g71Params: CycleParameters = {
      depth_of_cut: 2.5,
      finish_allowance_x: 0.4,
      finish_allowance_z: 0.15,
      profile_start_block: 100,
      profile_end_block: 200,
      feed_rate: 0.3,
    };

    describe("Fanuc 31i-T", () => {
      it("generates valid G71 cycle", () => {
        const result = LathePostGeneratorDialectEngine.generate({
          controller_id: "fanuc-31i-t",
          cycle_code: "G71",
          parameters: g71Params,
          include_comments: false,
          use_line_numbers: false,
        });

        expect(result.success).toBe(true);
        expect(result.dialect).toBe("fanuc");
        expect(result.gcode.length).toBeGreaterThan(0);
      });

      it("uses microns for depth (U parameter)", () => {
        const result = LathePostGeneratorDialectEngine.generate({
          controller_id: "fanuc-31i-t",
          cycle_code: "G71",
          parameters: { depth_of_cut: 2.0 },
          include_comments: false,
          use_line_numbers: false,
        });

        expect(result.success).toBe(true);
        // Fanuc uses microns: 2.0mm = 2000 microns
        expect(result.gcode[0]).toContain("U2000");
      });

      it("includes P and Q block numbers", () => {
        const result = LathePostGeneratorDialectEngine.generate({
          controller_id: "fanuc-31i-t",
          cycle_code: "G71",
          parameters: g71Params,
          include_comments: false,
          use_line_numbers: false,
        });

        expect(result.gcode[1]).toContain("P100");
        expect(result.gcode[1]).toContain("Q200");
      });

      it("includes finish allowances U and W", () => {
        const result = LathePostGeneratorDialectEngine.generate({
          controller_id: "fanuc-31i-t",
          cycle_code: "G71",
          parameters: g71Params,
          include_comments: false,
          use_line_numbers: false,
        });

        expect(result.gcode[1]).toContain("U0.400");
        expect(result.gcode[1]).toContain("W0.150");
      });

      it("generates two-line format (Type II)", () => {
        const result = LathePostGeneratorDialectEngine.generate({
          controller_id: "fanuc-31i-t",
          cycle_code: "G71",
          parameters: g71Params,
          include_comments: false,
          use_line_numbers: false,
        });

        expect(result.gcode.length).toBe(2);
        expect(result.gcode[0]).toMatch(/^G71 U\d+ R/);
        expect(result.gcode[1]).toMatch(/^G71 P\d+ Q\d+/);
      });
    });

    describe("Okuma OSP-P300L", () => {
      it("generates valid G71 cycle", () => {
        const result = LathePostGeneratorDialectEngine.generate({
          controller_id: "okuma-osp-p300l",
          cycle_code: "G71",
          parameters: g71Params,
          include_comments: false,
          use_line_numbers: false,
        });

        expect(result.success).toBe(true);
        expect(result.dialect).toBe("okuma");
        expect(result.gcode.length).toBe(2);
      });

      it("uses mm directly for depth", () => {
        const result = LathePostGeneratorDialectEngine.generate({
          controller_id: "okuma-osp-p300l",
          cycle_code: "G71",
          parameters: { depth_of_cut: 2.5 },
          include_comments: false,
          use_line_numbers: false,
        });

        expect(result.success).toBe(true);
        // Okuma uses mm directly
        expect(result.gcode[0]).toContain("U2.500");
      });
    });

    describe("Mitsubishi M80", () => {
      it("generates valid G71 cycle", () => {
        const result = LathePostGeneratorDialectEngine.generate({
          controller_id: "mitsubishi-m80-l",
          cycle_code: "G71",
          parameters: g71Params,
          include_comments: false,
          use_line_numbers: false,
        });

        expect(result.success).toBe(true);
        expect(result.dialect).toBe("mitsubishi");
        expect(result.gcode.length).toBe(2);
      });

      it("format matches expected structure", () => {
        const result = LathePostGeneratorDialectEngine.generate({
          controller_id: "mitsubishi-m80-l",
          cycle_code: "G71",
          parameters: g71Params,
          include_comments: false,
          use_line_numbers: false,
        });

        expect(result.gcode[0]).toMatch(/^G71 U[\d.]+ R/);
        expect(result.gcode[1]).toMatch(/^G71 P\d+ Q\d+ U[\d.]+ W[\d.]+/);
      });
    });

    it("convenience method generateG71 works", () => {
      const result = LathePostGeneratorDialectEngine.generateG71(
        "fanuc-31i-t",
        2.0,  // depth
        0.5,  // finish X
        0.2,  // finish Z
        100,  // P
        200,  // Q
        0.25, // feed
      );

      expect(result.success).toBe(true);
      expect(result.cycle_code).toBe("G71");
      expect(result.gcode.length).toBeGreaterThan(0);
    });
  });

  describe("G76 Threading Cycle", () => {
    const g76Params: CycleParameters = {
      thread_pitch: 1.5,
      thread_depth: 0.812,
      thread_angle: 60,
      first_cut_depth: 0.4,
      number_of_passes: 6,
      thread_end_x: 18.376,
      thread_end_z: -25.0,
    };

    describe("Fanuc 31i-T", () => {
      it("generates valid G76 cycle", () => {
        const result = LathePostGeneratorDialectEngine.generate({
          controller_id: "fanuc-31i-t",
          cycle_code: "G76",
          parameters: g76Params,
          include_comments: false,
          use_line_numbers: false,
        });

        expect(result.success).toBe(true);
        expect(result.dialect).toBe("fanuc");
        expect(result.gcode.length).toBe(2);
      });

      it("uses compound P format (mmaarrr)", () => {
        const result = LathePostGeneratorDialectEngine.generate({
          controller_id: "fanuc-31i-t",
          cycle_code: "G76",
          parameters: { ...g76Params, number_of_passes: 4, thread_angle: 60 },
          include_comments: false,
          use_line_numbers: false,
        });

        // P046000 = 04 passes, 60 angle, 00 runout
        expect(result.gcode[0]).toContain("P046000");
      });

      it("includes thread parameters on second line", () => {
        const result = LathePostGeneratorDialectEngine.generate({
          controller_id: "fanuc-31i-t",
          cycle_code: "G76",
          parameters: g76Params,
          include_comments: false,
          use_line_numbers: false,
        });

        expect(result.gcode[1]).toContain("X18.376");
        expect(result.gcode[1]).toContain("Z-25.000");
        expect(result.gcode[1]).toContain("F1.500");
      });

      it("uses microns for P (thread height) and Q (first cut)", () => {
        const result = LathePostGeneratorDialectEngine.generate({
          controller_id: "fanuc-31i-t",
          cycle_code: "G76",
          parameters: { ...g76Params, thread_depth: 0.812, first_cut_depth: 0.4 },
          include_comments: false,
          use_line_numbers: false,
        });

        // 0.812mm = 812 microns, 0.4mm = 400 microns
        expect(result.gcode[1]).toContain("P812");
        expect(result.gcode[1]).toContain("Q400");
      });
    });

    describe("Okuma OSP-P300L", () => {
      it("generates valid G76 cycle", () => {
        const result = LathePostGeneratorDialectEngine.generate({
          controller_id: "okuma-osp-p300l",
          cycle_code: "G76",
          parameters: g76Params,
          include_comments: false,
          use_line_numbers: false,
        });

        expect(result.success).toBe(true);
        expect(result.dialect).toBe("okuma");
      });

      it("uses K for thread height and D for first cut", () => {
        const result = LathePostGeneratorDialectEngine.generate({
          controller_id: "okuma-osp-p300l",
          cycle_code: "G76",
          parameters: g76Params,
          include_comments: false,
          use_line_numbers: false,
        });

        expect(result.gcode[0]).toContain("K0.812");
        expect(result.gcode[0]).toContain("D0.400");
      });

      it("uses A for thread angle", () => {
        const result = LathePostGeneratorDialectEngine.generate({
          controller_id: "okuma-osp-p300l",
          cycle_code: "G76",
          parameters: g76Params,
          include_comments: false,
          use_line_numbers: false,
        });

        expect(result.gcode[0]).toContain("A60");
      });

      it("single-line format", () => {
        const result = LathePostGeneratorDialectEngine.generate({
          controller_id: "okuma-osp-p300l",
          cycle_code: "G76",
          parameters: g76Params,
          include_comments: false,
          use_line_numbers: false,
        });

        expect(result.gcode.length).toBe(1);
      });
    });

    describe("Mitsubishi M80", () => {
      it("generates valid G76 cycle", () => {
        const result = LathePostGeneratorDialectEngine.generate({
          controller_id: "mitsubishi-m80-l",
          cycle_code: "G76",
          parameters: g76Params,
          include_comments: false,
          use_line_numbers: false,
        });

        expect(result.success).toBe(true);
        expect(result.dialect).toBe("mitsubishi");
      });

      it("uses K and D format like Okuma", () => {
        const result = LathePostGeneratorDialectEngine.generate({
          controller_id: "mitsubishi-m80-l",
          cycle_code: "G76",
          parameters: g76Params,
          include_comments: false,
          use_line_numbers: false,
        });

        expect(result.gcode[0]).toContain("K");
        expect(result.gcode[0]).toContain("D");
      });
    });

    it("convenience method generateG76 works", () => {
      const result = LathePostGeneratorDialectEngine.generateG76(
        "fanuc-31i-t",
        1.5,    // pitch
        0.812,  // depth
        60,     // angle
        0.4,    // first cut
        18.376, // end X
        -25.0,  // end Z
      );

      expect(result.success).toBe(true);
      expect(result.cycle_code).toBe("G76");
    });
  });

  describe("G83 Peck Drilling Cycle", () => {
    const g83Params: CycleParameters = {
      hole_depth: -30.0,
      peck_depth: 3.0,
      retract_plane: 2.0,
      feed_rate: 0.12,
    };

    describe("Fanuc 31i-T", () => {
      it("generates valid G83 cycle", () => {
        const result = LathePostGeneratorDialectEngine.generate({
          controller_id: "fanuc-31i-t",
          cycle_code: "G83",
          parameters: g83Params,
          include_comments: false,
          use_line_numbers: false,
        });

        expect(result.success).toBe(true);
        expect(result.dialect).toBe("fanuc");
      });

      it("uses microns for Q (peck depth)", () => {
        const result = LathePostGeneratorDialectEngine.generate({
          controller_id: "fanuc-31i-t",
          cycle_code: "G83",
          parameters: g83Params,
          include_comments: false,
          use_line_numbers: false,
        });

        // 3.0mm = 3000 microns
        expect(result.gcode[0]).toContain("Q3000");
      });

      it("includes Z, R, F parameters", () => {
        const result = LathePostGeneratorDialectEngine.generate({
          controller_id: "fanuc-31i-t",
          cycle_code: "G83",
          parameters: g83Params,
          include_comments: false,
          use_line_numbers: false,
        });

        expect(result.gcode[0]).toContain("Z-30.000");
        expect(result.gcode[0]).toContain("R2.000");
        expect(result.gcode[0]).toContain("F0.120");
      });

      it("adds G80 cancel for modal cycle", () => {
        const result = LathePostGeneratorDialectEngine.generate({
          controller_id: "fanuc-31i-t",
          cycle_code: "G83",
          parameters: g83Params,
          include_comments: false,
          use_line_numbers: false,
        });

        // G83 is modal on Fanuc, should add G80
        expect(result.gcode[result.gcode.length - 1]).toBe("G80");
        expect(result.warnings).toContain("G83 is modal - G80 cancel added");
      });
    });

    describe("Okuma OSP-P300L", () => {
      it("generates valid G83 cycle", () => {
        const result = LathePostGeneratorDialectEngine.generate({
          controller_id: "okuma-osp-p300l",
          cycle_code: "G83",
          parameters: g83Params,
          include_comments: false,
          use_line_numbers: false,
        });

        expect(result.success).toBe(true);
        expect(result.dialect).toBe("okuma");
      });

      it("uses mm directly for Q", () => {
        const result = LathePostGeneratorDialectEngine.generate({
          controller_id: "okuma-osp-p300l",
          cycle_code: "G83",
          parameters: g83Params,
          include_comments: false,
          use_line_numbers: false,
        });

        // Okuma uses mm directly
        expect(result.gcode[0]).toContain("Q3.000");
      });
    });

    describe("Mitsubishi M80", () => {
      it("generates valid G83 cycle", () => {
        const result = LathePostGeneratorDialectEngine.generate({
          controller_id: "mitsubishi-m80-l",
          cycle_code: "G83",
          parameters: g83Params,
          include_comments: false,
          use_line_numbers: false,
        });

        expect(result.success).toBe(true);
        expect(result.dialect).toBe("mitsubishi");
      });

      it("uses mm directly for Q like Okuma", () => {
        const result = LathePostGeneratorDialectEngine.generate({
          controller_id: "mitsubishi-m80-l",
          cycle_code: "G83",
          parameters: g83Params,
          include_comments: false,
          use_line_numbers: false,
        });

        expect(result.gcode[0]).toContain("Q3.000");
      });
    });

    it("convenience method generateG83 works", () => {
      const result = LathePostGeneratorDialectEngine.generateG83(
        "fanuc-31i-t",
        -30.0, // depth
        3.0,   // peck
        2.0,   // retract
        0.12,  // feed
      );

      expect(result.success).toBe(true);
      expect(result.cycle_code).toBe("G83");
    });
  });

  describe("Line Numbers and Comments", () => {
    it("adds line numbers when requested", () => {
      const result = LathePostGeneratorDialectEngine.generate({
        controller_id: "fanuc-31i-t",
        cycle_code: "G71",
        parameters: { depth_of_cut: 2.0 },
        include_comments: false,
        use_line_numbers: true,
        line_number_start: 100,
        line_number_increment: 10,
      });

      expect(result.gcode[0]).toMatch(/^N100 /);
      expect(result.gcode[1]).toMatch(/^N110 /);
    });

    it("adds comments when requested", () => {
      const result = LathePostGeneratorDialectEngine.generate({
        controller_id: "fanuc-31i-t",
        cycle_code: "G71",
        parameters: { depth_of_cut: 2.0 },
        include_comments: true,
        use_line_numbers: false,
      });

      expect(result.gcode[0]).toContain("(G71 CYCLE");
      expect(result.gcode[0]).toContain("FANUC");
    });

    it("combines line numbers and comments", () => {
      const result = LathePostGeneratorDialectEngine.generate({
        controller_id: "okuma-osp-p300l",
        cycle_code: "G76",
        parameters: { thread_pitch: 1.5, thread_end_x: 20, thread_end_z: -30 },
        include_comments: true,
        use_line_numbers: true,
        line_number_start: 500,
        line_number_increment: 5,
      });

      expect(result.gcode[0]).toMatch(/^N500 \(G76 CYCLE/);
    });
  });

  describe("Error Handling", () => {
    it("rejects unknown controller", () => {
      const result = LathePostGeneratorDialectEngine.generate({
        controller_id: "unknown-controller",
        cycle_code: "G71",
        parameters: {},
        include_comments: false,
        use_line_numbers: false,
      });

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain("Unknown controller");
    });

    it("rejects unsupported cycle code", () => {
      const result = LathePostGeneratorDialectEngine.generate({
        controller_id: "fanuc-31i-t",
        cycle_code: "G99",
        parameters: {},
        include_comments: false,
        use_line_numbers: false,
      });

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain("Unsupported cycle code");
    });
  });

  describe("Utility Methods", () => {
    it("getSupportedCycles returns cycle codes", () => {
      const cycles = LathePostGeneratorDialectEngine.getSupportedCycles("fanuc-31i-t");

      expect(cycles).toContain("G71");
      expect(cycles).toContain("G76");
      expect(cycles).toContain("G83");
      expect(cycles.length).toBeGreaterThan(5);
    });

    it("getCycleParameters returns cycle definition", () => {
      const cycle = LathePostGeneratorDialectEngine.getCycleParameters("fanuc-31i-t", "G76");

      expect(cycle).toBeDefined();
      expect(cycle?.name).toContain("Threading");
      expect(cycle?.category).toBe("threading");
      expect(cycle?.parameters.length).toBeGreaterThan(5);
    });

    it("validateCycleParameters checks required params", () => {
      const validation = LathePostGeneratorDialectEngine.validateCycleParameters(
        "fanuc-31i-t",
        "G71",
        { depth_of_cut: 2.0 },  // Missing other required params
      );

      expect(validation.valid).toBe(false);
      expect(validation.missing.length).toBeGreaterThan(0);
    });

    it("compareDialects shows differences", () => {
      const comparison = LathePostGeneratorDialectEngine.compareDialects(
        "G83",
        { hole_depth: -25, peck_depth: 3, retract_plane: 2 },
        ["fanuc-31i-t", "okuma-osp-p300l", "mitsubishi-m80-l"],
      );

      expect(Object.keys(comparison)).toHaveLength(3);
      expect(comparison["fanuc-31i-t"].gcode[0]).toContain("Q3000"); // microns
      expect(comparison["okuma-osp-p300l"].gcode[0]).toContain("Q3.000"); // mm
    });
  });

  describe("Metadata Tracking", () => {
    it("tracks parameters used", () => {
      const result = LathePostGeneratorDialectEngine.generate({
        controller_id: "fanuc-31i-t",
        cycle_code: "G71",
        parameters: {
          depth_of_cut: 2.0,
          finish_allowance_x: 0.5,
          feed_rate: 0.25,
        },
        include_comments: false,
        use_line_numbers: false,
      });

      expect(result.metadata.parameters_used).toContain("depth_of_cut");
      expect(result.metadata.parameters_used).toContain("finish_allowance_x");
      expect(result.metadata.parameters_used).toContain("feed_rate");
    });

    it("counts total lines", () => {
      const result = LathePostGeneratorDialectEngine.generate({
        controller_id: "fanuc-31i-t",
        cycle_code: "G71",
        parameters: { depth_of_cut: 2.0 },
        include_comments: true,
        use_line_numbers: false,
      });

      expect(result.metadata.total_lines).toBe(result.gcode.length);
    });
  });

  // ==========================================================================
  // NON-FINITE EMIT GUARD (U-PP-NONFINITE-EMIT-SWEEP) -- a NaN/Infinity cycle
  // param must never leak a literal XNaN/ZInfinity/FNaN the lathe control rejects.
  // One central guard in generate() covers all dialects + cycles.
  // ==========================================================================
  describe("non-finite emit guard (U-PP-NONFINITE-EMIT-SWEEP, schema .finite())", () => {
    const gen = (cycle_code: string, parameters: Record<string, unknown>) =>
      LathePostGeneratorDialectEngine.generate({
        controller_id: "fanuc-31i-t", cycle_code, parameters,
        include_comments: false, use_line_numbers: false,
      } as never);
    const noBadToken = (g: string[]) => {
      const j = g.join("\n");
      expect(j).not.toMatch(/[XYZQRFKDP]NaN/);
      expect(j).not.toMatch(/[XYZQRFKDP]Infinity/);
    };

    it("[regression] a finite G76 still generates a real cycle", () => {
      const r = gen("G76", { thread_end_x: 20, thread_end_z: -30, thread_pitch: 1.5, thread_depth: 0.65 });
      expect(r.success).toBe(true);
      expect(r.gcode.some((l: string) => l.includes("G76"))).toBe(true);
    });

    it("NaN thread_end_x is REJECTED by the schema -- no program, no literal XNaN", () => {
      const r = gen("G76", { thread_end_x: NaN, thread_end_z: -30, thread_pitch: 1.5 });
      expect(r.success).toBe(false);
      noBadToken(r.gcode);
    });

    it("Infinity hole_depth (G83) is REJECTED by .finite() -- no program, no literal ZInfinity", () => {
      const r = gen("G83", { hole_depth: Infinity, peck_depth: 3, feed_rate: 0.15 });
      expect(r.success).toBe(false);
      noBadToken(r.gcode);
    });

    it("NaN feed_rate (G83) is REJECTED -- no literal FNaN", () => {
      const r = gen("G83", { hole_depth: -25, peck_depth: 3, feed_rate: NaN });
      expect(r.success).toBe(false);
      noBadToken(r.gcode);
    });

    it("-Infinity peck_depth is REJECTED by .finite()", () => {
      const r = gen("G83", { hole_depth: -25, peck_depth: -Infinity, feed_rate: 0.15 });
      expect(r.success).toBe(false);
      noBadToken(r.gcode);
    });
  });
});
