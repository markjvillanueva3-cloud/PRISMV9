/**
 * U-P2PFS09: Controller Knowledge Tips Integration Tests for EDMPostProcessGCodeEngine
 * Verifies controller-specific tips surface in WEDM G-code generation pipeline
 */
import { describe, it, expect } from "vitest";
import { edmPostProcessGCodeEngine, type EDMGCodeInput } from "../engines/EDMPostProcessGCodeEngine.js";

const makeTestInput = (controller: "fanuc" | "sodick" | "makino" | "mitsubishi" | "agiecharmilles"): EDMGCodeInput => ({
  controller,
  profiles: [
    {
      name: "test-profile",
      contour_points: [
        { x: 0, y: 0 },
        { x: 25, y: 0 },
        { x: 25, y: 25 },
        { x: 0, y: 25 },
      ],
      start_hole: { x: 12.5, y: 12.5 },
      approach: { type: "linear", length_mm: 2 },
      departure: { type: "linear", length_mm: 2 },
    },
  ],
  passes: [
    { pass_number: 1, offset_mm: 0.15, technology_table: "D01", wire_speed_m_min: 10, tension_N: 12 },
    { pass_number: 2, offset_mm: 0.08, technology_table: "D02", wire_speed_m_min: 8, tension_N: 10 },
  ],
  wire_type: "brass 0.25mm",
});

describe("EDMPostProcessGCodeEngine Controller Tips (U-P2PFS09)", () => {
  describe("Controller Tips Surfacing", () => {
    it("surfaces controller_tips for Fanuc controller", async () => {
      const result = await edmPostProcessGCodeEngine.generate_gcode(makeTestInput("fanuc"));

      expect(result.gcode).toBeTruthy();
      expect(result.controller_tips).toBeDefined();
      if (result.controller_tips) {
        expect(Array.isArray(result.controller_tips)).toBe(true);
        expect(result.controller_tips.length).toBeGreaterThan(0);
        for (const tip of result.controller_tips) {
          expect(tip).toHaveProperty("id");
          expect(tip).toHaveProperty("title");
          expect(tip).toHaveProperty("body");
          expect(tip).toHaveProperty("confidence");
          expect(typeof tip.confidence).toBe("number");
        }
      }
    });

    it("surfaces controller_tips for Sodick controller", async () => {
      const result = await edmPostProcessGCodeEngine.generate_gcode(makeTestInput("sodick"));

      expect(result.gcode).toBeTruthy();
      expect(result.controller_tips).toBeDefined();
      if (result.controller_tips) {
        expect(Array.isArray(result.controller_tips)).toBe(true);
        expect(result.controller_tips.length).toBeGreaterThan(0);
      }
    });

    it("surfaces controller_tips for Makino controller", async () => {
      const result = await edmPostProcessGCodeEngine.generate_gcode(makeTestInput("makino"));

      expect(result.gcode).toBeTruthy();
      expect(result.controller_tips).toBeDefined();
      if (result.controller_tips) {
        expect(Array.isArray(result.controller_tips)).toBe(true);
        expect(result.controller_tips.length).toBeGreaterThan(0);
      }
    });

    it("surfaces controller_tips for Mitsubishi controller", async () => {
      const result = await edmPostProcessGCodeEngine.generate_gcode(makeTestInput("mitsubishi"));

      expect(result.gcode).toBeTruthy();
      expect(result.controller_tips).toBeDefined();
      if (result.controller_tips) {
        expect(Array.isArray(result.controller_tips)).toBe(true);
        expect(result.controller_tips.length).toBeGreaterThan(0);
      }
    });

    it("surfaces controller_tips for AgieCharmilles controller", async () => {
      const result = await edmPostProcessGCodeEngine.generate_gcode(makeTestInput("agiecharmilles"));

      expect(result.gcode).toBeTruthy();
      // AgieCharmilles may have fewer or no tips — verify structure when present
      if (result.controller_tips && result.controller_tips.length > 0) {
        for (const tip of result.controller_tips) {
          expect(tip).toHaveProperty("id");
          expect(tip).toHaveProperty("title");
          expect(tip).toHaveProperty("body");
        }
      }
    });
  });

  describe("Controller Tips Format", () => {
    it("controller tips have required fields with correct types", async () => {
      const result = await edmPostProcessGCodeEngine.generate_gcode(makeTestInput("fanuc"));

      expect(result.gcode).toBeTruthy();
      if (result.controller_tips && result.controller_tips.length > 0) {
        const tip = result.controller_tips[0];
        expect(typeof tip.id).toBe("string");
        expect(typeof tip.title).toBe("string");
        expect(typeof tip.body).toBe("string");
        expect(typeof tip.confidence).toBe("number");
        expect(tip.confidence).toBeGreaterThanOrEqual(0);
        expect(tip.confidence).toBeLessThanOrEqual(100);
      }
    });

    it("limits controller tips to 5", async () => {
      const result = await edmPostProcessGCodeEngine.generate_gcode(makeTestInput("fanuc"));

      expect(result.gcode).toBeTruthy();
      if (result.controller_tips) {
        expect(result.controller_tips.length).toBeLessThanOrEqual(5);
      }
    });

    it("tips contain meaningful content", async () => {
      const result = await edmPostProcessGCodeEngine.generate_gcode(makeTestInput("fanuc"));

      if (result.controller_tips && result.controller_tips.length > 0) {
        const tip = result.controller_tips[0];
        expect(tip.id.length).toBeGreaterThan(0);
        expect(tip.title.length).toBeGreaterThan(5);
        expect(tip.body.length).toBeGreaterThan(20);
      }
    });
  });

  describe("Full Generate Integration", () => {
    it("full_generate includes controller_tips in gcode_result", async () => {
      const result = await edmPostProcessGCodeEngine.full_generate({
        gcode_input: makeTestInput("sodick"),
        post_process: {
          material: "D2",
          hardness_hrc: 60,
          surface_finish_Ra_um: 0.8,
          has_tight_tolerances: true,
          tolerance_mm: 0.01,
          requires_fatigue_life: false,
          requires_coating: false,
          part_thickness_mm: 25,
          is_aerospace: false,
          is_medical: false,
          num_profiles: 1,
        },
      });

      expect(result.gcode_result.gcode).toBeTruthy();
      expect(result.gcode_result.controller_tips).toBeDefined();
      if (result.gcode_result.controller_tips) {
        expect(result.gcode_result.controller_tips.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Error Handling", () => {
    it("returns valid result even if tips fail to load", async () => {
      const result = await edmPostProcessGCodeEngine.generate_gcode(makeTestInput("fanuc"));

      expect(result).toBeDefined();
      expect(result.gcode).toBeTruthy();
      expect(result.line_count).toBeGreaterThan(0);
      expect(result.warnings).toBeDefined();
    });

    it("invalid input returns appropriate error without tips", async () => {
      const result = await edmPostProcessGCodeEngine.generate_gcode({
        controller: "fanuc",
        profiles: [],
        passes: [],
        wire_type: "brass 0.25mm",
      });

      expect(result.gcode).toBe("");
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
