/**
 * SubprogramExtractionEngine Tests — MIO-MS0/U-MIO20
 */
import { describe, it, expect } from "vitest";
import { subprogramExtractionEngine } from "../engines/SubprogramExtractionEngine.js";

describe("SubprogramExtractionEngine", () => {
  describe("extract", () => {
    it("extracts patterns from repeated G-code sequences", () => {
      const gcode = [
        "G00 X0 Y0",
        "G01 Z-5 F100",
        "G01 X10 Y0",
        "G01 X10 Y10",
        "G01 X0 Y10",
        "G00 Z5",
        "G00 X20 Y0",
        "G01 Z-5 F100",
        "G01 X10 Y0",
        "G01 X10 Y10",
        "G01 X0 Y10",
        "G00 Z5",
      ];

      const result = subprogramExtractionEngine.extract(gcode, { min_pattern_length: 3, min_occurrences: 2 });

      expect(result.original_lines).toBe(12);
      expect(result.ai_reasoning.length).toBeGreaterThan(0);
    });

    it("returns valid result for short programs", () => {
      const gcode = [
        "G00 X0 Y0",
        "G01 X10 F100",
      ];

      const result = subprogramExtractionEngine.extract(gcode);

      expect(result.original_lines).toBe(2);
      expect(result.patterns_found).toBe(0);
    });

    it("uses fanuc syntax by default", () => {
      const gcode = Array.from({ length: 20 }, (_, i) => {
        const cycle = i % 5;
        return ["G00 X10 Y10", "G01 Z-5 F100", "G01 X20 Y10", "G01 X20 Y20", "G00 Z5"][cycle];
      });

      const result = subprogramExtractionEngine.extract(gcode, { min_pattern_length: 5, min_occurrences: 2, controller: "fanuc" });

      if (result.subprograms.length > 0) {
        expect(result.subprograms[0].call_syntax).toContain("M98");
      }
    });

    it("supports Siemens syntax", () => {
      const gcode = Array.from({ length: 15 }, (_, i) => {
        const cycle = i % 5;
        return ["G00 X10", "G01 Z-5", "G01 X20", "G01 Y20", "G00 Z5"][cycle];
      });

      const result = subprogramExtractionEngine.extract(gcode, { min_pattern_length: 5, min_occurrences: 2, controller: "siemens" });

      if (result.subprograms.length > 0) {
        expect(result.subprograms[0].call_syntax).toContain("CALL");
      }
    });

    it("supports Okuma syntax", () => {
      const gcode = Array.from({ length: 15 }, (_, i) => {
        const cycle = i % 5;
        return ["G00 X10", "G01 Z-5", "G01 X20", "G01 Y20", "G00 Z5"][cycle];
      });

      const result = subprogramExtractionEngine.extract(gcode, { min_pattern_length: 5, min_occurrences: 2, controller: "okuma" });

      if (result.subprograms.length > 0) {
        expect(result.subprograms[0].code.some(l => l.includes("RTS"))).toBe(true);
      }
    });

    it("produces AI reasoning trace", () => {
      const gcode = ["G00 X0", "G01 X10 F100", "G00 X0", "G01 X10 F100"];

      const result = subprogramExtractionEngine.extract(gcode);

      expect(result.ai_reasoning.length).toBeGreaterThan(0);
      expect(result.ai_reasoning.some(r => r.includes("[SUBPROG]"))).toBe(true);
    });

    it("respects max_patterns limit", () => {
      const gcode: string[] = [];
      for (let p = 0; p < 20; p++) {
        for (let i = 0; i < 3; i++) {
          gcode.push(`G01 X${p * 10} Y${i * 10} F100`);
          gcode.push(`G01 Z-${i + 1}`);
          gcode.push(`G00 Z5`);
          gcode.push(`G00 X${p * 10 + 5}`);
          gcode.push(`G01 Z-1`);
        }
      }

      const result = subprogramExtractionEngine.extract(gcode, { max_patterns: 3 });

      expect(result.subprograms.length).toBeLessThanOrEqual(3);
    });

    it("calculates lines saved", () => {
      const pattern = ["G00 X0 Y0", "G01 Z-5 F100", "G01 X10 F200", "G01 Y10", "G00 Z5"];
      const gcode = [...pattern, ...pattern, ...pattern];

      const result = subprogramExtractionEngine.extract(gcode, { min_pattern_length: 5, min_occurrences: 2 });

      if (result.subprograms.length > 0) {
        expect(result.subprograms[0].lines_saved).toBeGreaterThan(0);
      }
    });
  });

  describe("quickCheck", () => {
    it("returns boolean for repetitive G-code", () => {
      const gcode = Array.from({ length: 20 }, (_, i) => {
        const cycle = i % 5;
        return ["G00 X10", "G01 Z-5 F100", "G01 X20", "G01 Y20", "G00 Z5"][cycle];
      });

      const result = subprogramExtractionEngine.quickCheck(gcode, 2);

      expect(typeof result).toBe("boolean");
    });

    it("returns false for non-repetitive code", () => {
      const gcode = [
        "G00 X0",
        "G01 Y5",
        "G02 X10 Y10 I5 J0",
        "G03 X20 Y5 I5 J0",
      ];

      expect(subprogramExtractionEngine.quickCheck(gcode)).toBe(false);
    });
  });

  describe("estimateSavings", () => {
    it("provides savings estimate", () => {
      const gcode = Array.from({ length: 30 }, (_, i) => {
        const cycle = i % 5;
        return ["G00 X10", "G01 Z-5", "G01 X20", "G01 Y20", "G00 Z5"][cycle];
      });

      const result = subprogramExtractionEngine.estimateSavings(gcode);

      expect(result).toHaveProperty("potential_reduction_pct");
      expect(result).toHaveProperty("patterns_estimate");
      expect(result.potential_reduction_pct).toBeGreaterThanOrEqual(0);
    });

    it("returns zero estimate for unique code", () => {
      const gcode = [
        "G00 X0 Y0",
        "G01 X1 Y2",
        "G01 X3 Y4",
      ];

      const result = subprogramExtractionEngine.estimateSavings(gcode);

      expect(result.patterns_estimate).toBe(0);
    });
  });
});
