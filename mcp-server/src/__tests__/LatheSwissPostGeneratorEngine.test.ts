/**
 * LatheSwissPostGeneratorEngine Tests — LATHE-MASTER U-LTH17
 *
 * Verifies Swiss-type lathe post generation for:
 * - Citizen Cincom
 * - Tsugami
 *
 * Exit Gate: Correct Swiss canned cycles (G112, B-axis, part transfer)
 */

import { describe, it, expect } from "vitest";
import {
  LatheSwissPostGeneratorEngine,
  SwissCycleParameters,
} from "../engines/LatheSwissPostGeneratorEngine.js";

describe("LatheSwissPostGeneratorEngine", () => {
  describe("Version and Metadata", () => {
    it("returns version string", () => {
      expect(LatheSwissPostGeneratorEngine.getVersion()).toBe("1.0.0");
    });

    it("lists available machine types", () => {
      const types = LatheSwissPostGeneratorEngine.listMachineTypes();
      expect(types).toContain("citizen_cincom");
      expect(types).toContain("tsugami");
    });

    it("lists supported operations", () => {
      const ops = LatheSwissPostGeneratorEngine.getSupportedOperations();
      expect(ops).toContain("guide_bushing_on");
      expect(ops).toContain("part_transfer");
      expect(ops).toContain("b_axis_drill");
      expect(ops.length).toBe(10);
    });
  });

  describe("Guide Bushing Operations", () => {
    describe("Citizen Cincom", () => {
      it("generates G112 guide bushing ON", () => {
        const result = LatheSwissPostGeneratorEngine.generate({
          machine_type: "citizen_cincom",
          operation: "guide_bushing_on",
          parameters: {},
          include_comments: false,
        });

        expect(result.success).toBe(true);
        expect(result.gcode).toContain("G112");
        expect(result.metadata.guide_bushing_mode).toBe("with_bushing");
      });

      it("generates G113 guide bushing OFF", () => {
        const result = LatheSwissPostGeneratorEngine.generate({
          machine_type: "citizen_cincom",
          operation: "guide_bushing_off",
          parameters: {},
          include_comments: false,
        });

        expect(result.success).toBe(true);
        expect(result.gcode).toContain("G113");
        expect(result.metadata.guide_bushing_mode).toBe("without_bushing");
      });

      it("includes clearance move when specified", () => {
        const result = LatheSwissPostGeneratorEngine.generate({
          machine_type: "citizen_cincom",
          operation: "guide_bushing_on",
          parameters: { bushing_clearance: 5.0 },
          include_comments: false,
        });

        expect(result.success).toBe(true);
        expect(result.gcode.some(line => line.includes("Z5.000"))).toBe(true);
      });
    });

    describe("Tsugami", () => {
      it("generates G112 guide bushing ON", () => {
        const result = LatheSwissPostGeneratorEngine.generate({
          machine_type: "tsugami",
          operation: "guide_bushing_on",
          parameters: {},
          include_comments: false,
        });

        expect(result.success).toBe(true);
        expect(result.gcode).toContain("G112");
      });

      it("generates G113 guide bushing OFF", () => {
        const result = LatheSwissPostGeneratorEngine.generate({
          machine_type: "tsugami",
          operation: "guide_bushing_off",
          parameters: {},
          include_comments: false,
        });

        expect(result.success).toBe(true);
        expect(result.gcode).toContain("G113");
      });
    });
  });

  describe("Part Transfer Operations", () => {
    it("generates part transfer sequence", () => {
      const result = LatheSwissPostGeneratorEngine.generate({
        machine_type: "citizen_cincom",
        operation: "part_transfer",
        parameters: {
          transfer_position: -45,
          push_length: 3,
        },
        include_comments: false,
      });

      expect(result.success).toBe(true);
      expect(result.metadata.uses_sub_spindle).toBe(true);
      expect(result.gcode.some(line => line.includes("M32"))).toBe(true); // Sub engage
      expect(result.gcode.some(line => line.includes("M66"))).toBe(true); // Grip
      expect(result.gcode.some(line => line.includes("M11"))).toBe(true); // Main open
    });

    it("supports high pressure grip", () => {
      const result = LatheSwissPostGeneratorEngine.generate({
        machine_type: "citizen_cincom",
        operation: "part_transfer",
        parameters: {
          grip_pressure: "high",
        },
        include_comments: false,
      });

      expect(result.success).toBe(true);
      expect(result.gcode.some(line => line.includes("M68"))).toBe(true); // High pressure
    });

    it("includes W axis move for sub-spindle", () => {
      const result = LatheSwissPostGeneratorEngine.generate({
        machine_type: "tsugami",
        operation: "part_transfer",
        parameters: {
          transfer_position: -50,
        },
        include_comments: false,
      });

      expect(result.success).toBe(true);
      expect(result.gcode.some(line => line.includes("W-50.000"))).toBe(true);
    });
  });

  describe("Spindle Synchronization", () => {
    it("generates speed sync mode", () => {
      const result = LatheSwissPostGeneratorEngine.generate({
        machine_type: "citizen_cincom",
        operation: "spindle_sync",
        parameters: {
          sync_mode: "speed",
          spindle_speed: 2500,
        },
        include_comments: false,
      });

      expect(result.success).toBe(true);
      expect(result.metadata.uses_sub_spindle).toBe(true);
      expect(result.gcode.some(line => line.includes("M35"))).toBe(true); // Speed sync
      expect(result.gcode.some(line => line.includes("S2500"))).toBe(true);
    });

    it("generates phase sync mode", () => {
      const result = LatheSwissPostGeneratorEngine.generate({
        machine_type: "citizen_cincom",
        operation: "spindle_sync",
        parameters: {
          sync_mode: "phase",
          phase_offset: 180,
        },
        include_comments: false,
      });

      expect(result.success).toBe(true);
      expect(result.gcode.some(line => line.includes("M36"))).toBe(true); // Phase sync
      expect(result.gcode.some(line => line.includes("#501=180"))).toBe(true);
    });

    it("generates thread sync mode", () => {
      const result = LatheSwissPostGeneratorEngine.generate({
        machine_type: "tsugami",
        operation: "spindle_sync",
        parameters: {
          sync_mode: "thread",
        },
        include_comments: false,
      });

      expect(result.success).toBe(true);
      expect(result.gcode.some(line => line.includes("M37"))).toBe(true); // Thread sync
    });

    it("supports speed ratio", () => {
      const result = LatheSwissPostGeneratorEngine.generate({
        machine_type: "citizen_cincom",
        operation: "spindle_sync",
        parameters: {
          sync_mode: "speed",
          speed_ratio: 0.5,
        },
        include_comments: false,
      });

      expect(result.success).toBe(true);
      expect(result.gcode.some(line => line.includes("#502=0.5"))).toBe(true);
    });
  });

  describe("B-Axis Operations", () => {
    describe("B-Axis Drilling", () => {
      it("generates B-axis angular drill", () => {
        const result = LatheSwissPostGeneratorEngine.generate({
          machine_type: "citizen_cincom",
          operation: "b_axis_drill",
          parameters: {
            b_angle: 45,
            hole_depth: -12,
            peck_depth: 2,
            spindle_speed: 4000,
          },
          include_comments: false,
        });

        expect(result.success).toBe(true);
        expect(result.metadata.uses_b_axis).toBe(true);
        expect(result.gcode.some(line => line.includes("B45.0"))).toBe(true);
        expect(result.gcode.some(line => line.includes("G83"))).toBe(true);
        expect(result.gcode.some(line => line.includes("G80"))).toBe(true); // Cancel
      });

      it("returns B-axis to zero after drilling", () => {
        const result = LatheSwissPostGeneratorEngine.generate({
          machine_type: "tsugami",
          operation: "b_axis_drill",
          parameters: {
            b_angle: 30,
          },
          include_comments: false,
        });

        expect(result.success).toBe(true);
        const lastBMove = result.gcode.filter(line => line.includes("B")).pop();
        expect(lastBMove).toContain("B0");
      });
    });

    describe("B-Axis Milling", () => {
      it("generates B-axis angular mill", () => {
        const result = LatheSwissPostGeneratorEngine.generate({
          machine_type: "citizen_cincom",
          operation: "b_axis_mill",
          parameters: {
            b_angle: 60,
            hole_depth: -4,
            feed_rate: 120,
            spindle_speed: 5000,
          },
          include_comments: false,
        });

        expect(result.success).toBe(true);
        expect(result.metadata.uses_b_axis).toBe(true);
        expect(result.gcode.some(line => line.includes("B60.0"))).toBe(true);
        expect(result.gcode.some(line => line.includes("S5000"))).toBe(true);
      });
    });

    describe("B-Axis Validation", () => {
      it("validates B-axis within Citizen range", () => {
        const valid = LatheSwissPostGeneratorEngine.validateBAxisAngle("citizen_cincom", 90);
        expect(valid.valid).toBe(true);
      });

      it("rejects B-axis outside Citizen range", () => {
        const invalid = LatheSwissPostGeneratorEngine.validateBAxisAngle("citizen_cincom", 150);
        expect(invalid.valid).toBe(false);
        expect(invalid.message).toContain("out of range");
      });

      it("validates B-axis within Tsugami range", () => {
        const valid = LatheSwissPostGeneratorEngine.validateBAxisAngle("tsugami", 45);
        expect(valid.valid).toBe(true);
      });

      it("rejects B-axis below Tsugami minimum", () => {
        const invalid = LatheSwissPostGeneratorEngine.validateBAxisAngle("tsugami", -30);
        expect(invalid.valid).toBe(false);
      });
    });
  });

  describe("Cross Drilling", () => {
    it("generates cross drill cycle", () => {
      const result = LatheSwissPostGeneratorEngine.generate({
        machine_type: "citizen_cincom",
        operation: "cross_drill",
        parameters: {
          hole_depth: -6,
          peck_depth: 1,
          spindle_speed: 3500,
        },
        include_comments: false,
      });

      expect(result.success).toBe(true);
      expect(result.gcode.some(line => line.includes("M19"))).toBe(true); // Spindle orient
      expect(result.gcode.some(line => line.includes("G87"))).toBe(true); // Cross drill cycle
      expect(result.gcode.some(line => line.includes("G80"))).toBe(true); // Cancel
    });
  });

  describe("Polar Coordinate Milling", () => {
    it("generates polar interpolation on/off", () => {
      const result = LatheSwissPostGeneratorEngine.generate({
        machine_type: "citizen_cincom",
        operation: "polar_mill",
        parameters: {
          hole_depth: -2,
          spindle_speed: 6000,
        },
        include_comments: false,
      });

      expect(result.success).toBe(true);
      expect(result.gcode.some(line => line.includes("G12.1"))).toBe(true); // Polar ON
      expect(result.gcode.some(line => line.includes("G13.1"))).toBe(true); // Polar OFF
    });

    it("includes C-axis moves for polar pattern", () => {
      const result = LatheSwissPostGeneratorEngine.generate({
        machine_type: "tsugami",
        operation: "polar_mill",
        parameters: {},
        include_comments: false,
      });

      expect(result.success).toBe(true);
      expect(result.gcode.filter(line => line.includes("C")).length).toBeGreaterThan(3);
    });
  });

  describe("Back Work Operations", () => {
    it("generates back work on sub-spindle", () => {
      const result = LatheSwissPostGeneratorEngine.generate({
        machine_type: "citizen_cincom",
        operation: "back_work",
        parameters: {
          spindle_speed: 2800,
          feed_rate: 0.08,
        },
        include_comments: false,
      });

      expect(result.success).toBe(true);
      expect(result.metadata.uses_sub_spindle).toBe(true);
      expect(result.gcode.some(line => line.includes("M43"))).toBe(true); // Sub spindle CW
      expect(result.gcode.some(line => line.includes("W"))).toBe(true); // W axis move
    });

    it("calls back work subprogram", () => {
      const result = LatheSwissPostGeneratorEngine.generate({
        machine_type: "tsugami",
        operation: "back_work",
        parameters: {},
        include_comments: false,
      });

      expect(result.success).toBe(true);
      expect(result.gcode.some(line => line.includes("M98"))).toBe(true);
    });
  });

  describe("Cutoff and Transfer", () => {
    it("generates cutoff with part transfer", () => {
      const result = LatheSwissPostGeneratorEngine.generate({
        machine_type: "citizen_cincom",
        operation: "cutoff_transfer",
        parameters: {
          hole_depth: -0.5, // Cutoff to center
          feed_rate: 0.015,
        },
        include_comments: false,
      });

      expect(result.success).toBe(true);
      expect(result.metadata.uses_sub_spindle).toBe(true);
      expect(result.gcode.some(line => line.includes("M32"))).toBe(true); // Sub engage
      expect(result.gcode.some(line => line.includes("M66"))).toBe(true); // Grip
      expect(result.gcode.some(line => line.includes("M67"))).toBe(true); // Open for eject
    });

    it("includes eject sequence", () => {
      const result = LatheSwissPostGeneratorEngine.generate({
        machine_type: "tsugami",
        operation: "cutoff_transfer",
        parameters: {},
        include_comments: false,
      });

      expect(result.success).toBe(true);
      // Should move W to eject position
      expect(result.gcode.some(line => line.includes("W-80"))).toBe(true);
    });
  });

  describe("Line Numbers and Comments", () => {
    it("adds line numbers when requested", () => {
      const result = LatheSwissPostGeneratorEngine.generate({
        machine_type: "citizen_cincom",
        operation: "guide_bushing_on",
        parameters: {},
        use_line_numbers: true,
        include_comments: false,
      });

      expect(result.success).toBe(true);
      expect(result.gcode[0]).toMatch(/^N10 /);
      expect(result.gcode[1]).toMatch(/^N20 /);
    });

    it("adds comments when requested", () => {
      const result = LatheSwissPostGeneratorEngine.generate({
        machine_type: "citizen_cincom",
        operation: "guide_bushing_on",
        parameters: {},
        use_line_numbers: false,
        include_comments: true,
      });

      expect(result.success).toBe(true);
      expect(result.gcode[0]).toContain("(GUIDE BUSHING");
    });
  });

  describe("Error Handling", () => {
    it("rejects unknown machine type", () => {
      const result = LatheSwissPostGeneratorEngine.generate({
        machine_type: "unknown_swiss" as any,
        operation: "guide_bushing_on",
        parameters: {},
      });

      expect(result.success).toBe(false);
      expect(result.errors[0]).toMatch(/Invalid|Unknown/i);
    });

    it("rejects unknown operation", () => {
      const result = LatheSwissPostGeneratorEngine.generate({
        machine_type: "citizen_cincom",
        operation: "unknown_op" as any,
        parameters: {},
      });

      expect(result.success).toBe(false);
      expect(result.errors[0]).toMatch(/Invalid|Unknown/i);
    });
  });

  describe("Machine Spec Access", () => {
    it("returns Citizen spec", () => {
      const spec = LatheSwissPostGeneratorEngine.getMachineSpec("citizen_cincom");
      expect(spec).toBeDefined();
      expect(spec?.controller.manufacturer).toBe("Citizen");
      expect(spec?.guide_bushing).toBe(true);
      expect(spec?.max_bar_diameter).toBe(32);
    });

    it("returns Tsugami spec", () => {
      const spec = LatheSwissPostGeneratorEngine.getMachineSpec("tsugami");
      expect(spec).toBeDefined();
      expect(spec?.controller.manufacturer).toBe("Tsugami");
      expect(spec?.max_bar_diameter).toBe(26);
    });

    it("returns undefined for unknown machine", () => {
      const spec = LatheSwissPostGeneratorEngine.getMachineSpec("unknown");
      expect(spec).toBeUndefined();
    });
  });

  describe("Metadata Tracking", () => {
    it("tracks B-axis usage", () => {
      const result = LatheSwissPostGeneratorEngine.generate({
        machine_type: "citizen_cincom",
        operation: "b_axis_drill",
        parameters: { b_angle: 30 },
      });

      expect(result.metadata.uses_b_axis).toBe(true);
    });

    it("tracks sub-spindle usage", () => {
      const result = LatheSwissPostGeneratorEngine.generate({
        machine_type: "citizen_cincom",
        operation: "part_transfer",
        parameters: {},
      });

      expect(result.metadata.uses_sub_spindle).toBe(true);
    });

    it("counts total lines", () => {
      const result = LatheSwissPostGeneratorEngine.generate({
        machine_type: "citizen_cincom",
        operation: "guide_bushing_on",
        parameters: {},
        include_comments: true,
      });

      expect(result.metadata.total_lines).toBe(result.gcode.length);
    });
  });

  // ==========================================================================
  // NON-FINITE EMIT GUARD (U-PP-NONFINITE-EMIT-SWEEP, schema .finite())
  // A NaN/Infinity cycle param must never reach emit (would leak XNaN/ZInfinity).
  // SwissGenerationInputSchema.safeParse(parameters: SwissCycleParametersSchema)
  // with .finite() rejects both NaN and Infinity -> success:false, no program.
  // ==========================================================================
  describe("non-finite emit guard (U-PP-NONFINITE-EMIT-SWEEP, schema .finite())", () => {
    const gen = (operation: string, parameters: Record<string, unknown>) =>
      LatheSwissPostGeneratorEngine.generate({
        machine_type: "citizen_cincom", operation, parameters,
        include_comments: false, use_line_numbers: false,
      } as never);
    const noBadToken = (g: string[]) => {
      const j = g.join("\n");
      expect(j).not.toMatch(/[XYZQRFBS](NaN|Infinity)/);
    };

    it("[regression] a finite cross_drill still generates", () => {
      const r = gen("cross_drill", { hole_depth: -5, peck_depth: 1, feed_rate: 100 });
      expect(r.success).toBe(true);
    });

    it("NaN hole_depth is REJECTED by the schema -- no program, no literal ZNaN", () => {
      const r = gen("cross_drill", { hole_depth: NaN, peck_depth: 1, feed_rate: 100 });
      expect(r.success).toBe(false);
      noBadToken(r.gcode);
    });

    it("Infinity feed_rate is REJECTED by .finite() -- no literal FInfinity", () => {
      const r = gen("cross_drill", { hole_depth: -5, peck_depth: 1, feed_rate: Infinity });
      expect(r.success).toBe(false);
      noBadToken(r.gcode);
    });

    it("Infinity bushing_clearance is REJECTED by .finite()", () => {
      const r = gen("guide_bushing_on", { bushing_clearance: Infinity });
      expect(r.success).toBe(false);
      noBadToken(r.gcode);
    });

    it("NaN b_angle is REJECTED by the schema", () => {
      const r = gen("b_axis_drill", { b_angle: NaN, hole_depth: -5, feed_rate: 100 });
      expect(r.success).toBe(false);
      noBadToken(r.gcode);
    });
  });
});
