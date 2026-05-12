/**
 * Tests for JM Die WEDM Program Patterns data module
 */

import { describe, it, expect } from "vitest";
import {
  JM_DIE_WEDM_PROGRAM_ANALYSIS,
  JM_DIE_COMMON_E_CODES,
  JM_DIE_OFFSET_PATTERNS,
  JM_DIE_MCODE_USAGE,
  JM_DIE_ECODE_FAMILY_DISTRIBUTION,
  getJMDiePatternForMaterial,
  getJMDieMCodeSequence,
  detectECodeFamily,
} from "../../data/jm-die-wedm-program-patterns.js";

describe("JM Die WEDM Program Patterns", () => {
  describe("JM_DIE_WEDM_PROGRAM_ANALYSIS", () => {
    it("should have correct file counts", () => {
      expect(JM_DIE_WEDM_PROGRAM_ANALYSIS.total_files).toBe(4058);
      expect(JM_DIE_WEDM_PROGRAM_ANALYSIS.nc_program_count).toBe(22);
      expect(JM_DIE_WEDM_PROGRAM_ANALYSIS.customer_count).toBe(100);
    });

    it("should have analyzed programs", () => {
      expect(JM_DIE_WEDM_PROGRAM_ANALYSIS.analyzed_programs.length).toBeGreaterThan(0);
      const itwProgram = JM_DIE_WEDM_PROGRAM_ANALYSIS.analyzed_programs.find(
        (p) => p.customer === "ITW SHAKEPROOF"
      );
      expect(itwProgram).toBeDefined();
      expect(itwProgram!.e_codes).toEqual(["E1221", "E1222", "E1223", "E1224"]);
      expect(itwProgram!.pass_count).toBe(4);
    });

    it("should have valid summary statistics", () => {
      const summary = JM_DIE_WEDM_PROGRAM_ANALYSIS.summary;
      expect(summary.avg_pass_count).toBeGreaterThan(0);
      expect(summary.max_pass_count).toBeGreaterThanOrEqual(summary.min_pass_count);
      expect(summary.most_common_e_family).toBe("E12xx_standard_4pass");
    });
  });

  describe("JM_DIE_COMMON_E_CODES", () => {
    it("should include standard E12xx family", () => {
      const e1221 = JM_DIE_COMMON_E_CODES.find((e) => e.e_code === "E1221");
      expect(e1221).toBeDefined();
      expect(e1221!.family).toBe("E12xx_standard_4pass");
      expect(e1221!.typical_pass).toBe(1);
    });

    it("should include taper E28xx family", () => {
      const e2821 = JM_DIE_COMMON_E_CODES.find((e) => e.e_code === "E2821");
      expect(e2821).toBeDefined();
      expect(e2821!.family).toBe("E28xx_taper_5pass");
    });
  });

  describe("JM_DIE_OFFSET_PATTERNS", () => {
    it("should have H-register patterns with valid ranges", () => {
      const h1Patterns = JM_DIE_OFFSET_PATTERNS.filter((p) => p.h_register === "H1");
      expect(h1Patterns.length).toBeGreaterThan(0);

      for (const pattern of JM_DIE_OFFSET_PATTERNS) {
        expect(pattern.min_inches).toBeLessThanOrEqual(pattern.max_inches);
        expect(pattern.avg_inches).toBeGreaterThanOrEqual(pattern.min_inches);
        expect(pattern.avg_inches).toBeLessThanOrEqual(pattern.max_inches);
      }
    });
  });

  describe("JM_DIE_MCODE_USAGE", () => {
    it("should include critical M-codes", () => {
      const m78 = JM_DIE_MCODE_USAGE.find((m) => m.m_code === "M78");
      expect(m78).toBeDefined();
      expect(m78!.description).toContain("tank");
      expect(m78!.usage_pct).toBe(100);
    });
  });

  describe("JM_DIE_ECODE_FAMILY_DISTRIBUTION", () => {
    it("should sum to approximately 1.0", () => {
      const total = Object.values(JM_DIE_ECODE_FAMILY_DISTRIBUTION).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1.0, 1);
    });

    it("should have E12xx_standard as most common", () => {
      expect(JM_DIE_ECODE_FAMILY_DISTRIBUTION.E12xx_standard_4pass).toBeGreaterThan(0.5);
    });
  });

  describe("getJMDiePatternForMaterial", () => {
    it("should return standard 4-pass for D2 thin stock", () => {
      const result = getJMDiePatternForMaterial("D2", 15, false);
      expect(result.e_code_family).toBe("E12xx_standard_4pass");
      expect(result.num_passes).toBe(4);
      expect(result.h_offsets.H1).toBeCloseTo(0.0085, 4);
    });

    it("should return heavy 5-pass for thick stock", () => {
      const result = getJMDiePatternForMaterial("D2", 30, false);
      expect(result.e_code_family).toBe("E12xx_heavy_5pass");
      expect(result.num_passes).toBe(5);
      expect(result.h_offsets.H1).toBeCloseTo(0.00995, 5);
    });

    it("should return taper 5-pass for UV work", () => {
      const result = getJMDiePatternForMaterial("stainless", 20, true);
      expect(result.e_code_family).toBe("E28xx_taper_5pass");
      expect(result.num_passes).toBe(5);
      expect(result.h_offsets.H1).toBe(0);
    });

    it("should normalize material names", () => {
      const result1 = getJMDiePatternForMaterial("d2", 10, false);
      const result2 = getJMDiePatternForMaterial("D2", 10, false);
      expect(result1.e_code_family).toBe(result2.e_code_family);
    });
  });

  describe("getJMDieMCodeSequence", () => {
    it("should return program start sequence", () => {
      const seq = getJMDieMCodeSequence("program_start");
      expect(seq.length).toBeGreaterThan(0);
      expect(seq[0].m_code).toBe("M91");
      expect(seq.some((m) => m.m_code === "M20")).toBe(true);
    });

    it("should return program end sequence", () => {
      const seq = getJMDieMCodeSequence("program_end");
      expect(seq.some((m) => m.m_code === "M02")).toBe(true);
      expect(seq.some((m) => m.m_code === "M58")).toBe(true);
    });

    it("should return glue stop", () => {
      const seq = getJMDieMCodeSequence("glue_stop");
      expect(seq.length).toBe(1);
      expect(seq[0].m_code).toBe("M01");
    });
  });

  describe("detectECodeFamily", () => {
    it("should detect E12xx standard family", () => {
      expect(detectECodeFamily(["E1221", "E1222", "E1223", "E1224"])).toBe("E12xx_standard_4pass");
    });

    it("should detect E12xx heavy family", () => {
      expect(detectECodeFamily(["E1281", "E1282", "E1283", "E1284", "E1285"])).toBe("E12xx_heavy_5pass");
    });

    it("should detect E28xx taper family", () => {
      expect(detectECodeFamily(["E2821", "E2822", "E2823"])).toBe("E28xx_taper_5pass");
    });

    it("should return unknown for empty array", () => {
      expect(detectECodeFamily([])).toBe("unknown");
    });
  });
});
