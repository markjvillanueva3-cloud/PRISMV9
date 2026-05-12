/**
 * MillProgramLearningEngine Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  millProgramLearningEngine,
  MillProgramLearningEngine,
} from "../engines/MillProgramLearningEngine.js";

const SAMPLE_HAAS_PROGRAM = `
O1234 (M2 DIE CAVITY ROUGH)
G90 G54 G17
T1 M6
S3500 M3
M8
G0 X0 Y0 Z0.1
G1 Z-0.5 F12.0
G1 X1.0 F25.0
G1 Y1.0 F25.0
G0 Z2.0
T2 M6
S5000 M3
G81 X0.5 Y0.5 Z-0.25 R0.1 F10.0
G84 X1.0 Y1.0 Z-0.5 R0.1 F15.0
M9
M30
`;

describe("MillProgramLearningEngine", () => {
  describe("Singleton + class", () => {
    it("exports singleton instance", () => {
      expect(millProgramLearningEngine).toBeDefined();
      expect(millProgramLearningEngine).toBeInstanceOf(MillProgramLearningEngine);
    });
  });

  describe("parseProgram", () => {
    it("extracts tool changes from Haas program", () => {
      const p = millProgramLearningEngine.parseProgram(SAMPLE_HAAS_PROGRAM, "haas");
      expect(p.tool_changes).toBe(2);
    });

    it("detects max spindle RPM", () => {
      const p = millProgramLearningEngine.parseProgram(SAMPLE_HAAS_PROGRAM, "haas");
      expect(p.max_spindle_rpm).toBe(5000);
    });

    it("detects feed range correctly", () => {
      const p = millProgramLearningEngine.parseProgram(SAMPLE_HAAS_PROGRAM, "haas");
      expect(p.max_feed_mm_min).toBeGreaterThanOrEqual(25);
      expect(p.min_feed_mm_min).toBeLessThanOrEqual(12);
    });

    it("detects coolant M8", () => {
      const p = millProgramLearningEngine.parseProgram(SAMPLE_HAAS_PROGRAM, "haas");
      expect(p.coolant_on).toBe(true);
    });

    it("classifies drill + rigid_tap operations", () => {
      const p = millProgramLearningEngine.parseProgram(SAMPLE_HAAS_PROGRAM, "haas");
      expect(p.operations).toContain("drill");
      expect(p.operations).toContain("rigid_tap");
    });

    it("extracts comments", () => {
      const p = millProgramLearningEngine.parseProgram(SAMPLE_HAAS_PROGRAM, "haas");
      expect(p.comments).toContain("M2 DIE CAVITY ROUGH");
    });

    it("handles empty program", () => {
      const p = millProgramLearningEngine.parseProgram("", "haas");
      expect(p.tool_changes).toBe(0);
      expect(p.max_spindle_rpm).toBe(0);
    });
  });

  describe("getStatisticalNorms", () => {
    it("returns norms for known material M2 on Haas", () => {
      const n = millProgramLearningEngine.getStatisticalNorms("M2", "haas");
      expect(n).not.toBeNull();
      expect(n?.sfm_range.p50).toBeCloseTo(60, 0);
      expect(n?.sample_size).toBeGreaterThan(100);
    });

    it("returns norms for graphite on Roku-Roku (high SFM)", () => {
      const n = millProgramLearningEngine.getStatisticalNorms("graphite", "roku_roku");
      expect(n).not.toBeNull();
      expect(n?.sfm_range.p50).toBeGreaterThan(500);
      expect(n?.confidence).toBeGreaterThan(0.85);
    });

    it("returns null for unknown material", () => {
      const n = millProgramLearningEngine.getStatisticalNorms("made_up_alloy");
      expect(n).toBeNull();
    });

    it("confidence is bounded 0-1", () => {
      for (const n of millProgramLearningEngine.getAllNorms()) {
        expect(n.confidence).toBeGreaterThan(0);
        expect(n.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("validateParametersAgainstNorms", () => {
    it("flags SFM far below norm", () => {
      const r = millProgramLearningEngine.validateParametersAgainstNorms({
        material: "H13",
        sfm: 10,
        chip_load_mm: 0.06,
        source: "haas_hurco",
      });
      expect(r.within_norms).toBe(false);
      expect(r.deviations.some((d) => d.includes("sfm_far_below"))).toBe(true);
    });

    it("passes parameters within norms", () => {
      const r = millProgramLearningEngine.validateParametersAgainstNorms({
        material: "4140",
        sfm: 180,
        chip_load_mm: 0.08,
        source: "haas_hurco",
      });
      expect(r.within_norms).toBe(true);
      expect(r.reference).not.toBeNull();
    });

    it("flags chip load far above norm", () => {
      const r = millProgramLearningEngine.validateParametersAgainstNorms({
        material: "tungsten_carbide",
        sfm: 15,
        chip_load_mm: 0.05,
        source: "roku_roku",
      });
      expect(r.deviations).toContain("chip_load_too_high");
    });

    it("gracefully handles no reference", () => {
      const r = millProgramLearningEngine.validateParametersAgainstNorms({
        material: "unknown_exotic",
        sfm: 100,
        chip_load_mm: 0.05,
      });
      expect(r.within_norms).toBe(true);
      expect(r.reference).toBeNull();
    });
  });

  describe("generateTribalTipsFromLearning", () => {
    let engine: MillProgramLearningEngine;
    beforeEach(() => {
      engine = new MillProgramLearningEngine();
    });

    it("generates tips from Roku-Roku archive", () => {
      const n = engine.generateTribalTipsFromLearning("roku_roku", 2);
      expect(n).toBeGreaterThan(0);
      expect(engine.getSummary().tips_generated).toBeGreaterThan(0);
    });

    it("respects limit parameter", () => {
      const n = engine.generateTribalTipsFromLearning("haas_hurco", 1);
      expect(n).toBeLessThanOrEqual(1);
    });
  });

  describe("getSummary + getStats", () => {
    it("summary includes all 3 sources", () => {
      const s = millProgramLearningEngine.getSummary();
      expect(s.by_source.haas).toBe(533);
      expect(s.by_source.haas_hurco).toBe(1873);
      expect(s.by_source.roku_roku).toBe(1108);
    });

    it("stats report ≥8 materials", () => {
      const s = millProgramLearningEngine.getStats();
      expect(s.materials).toBeGreaterThanOrEqual(8);
      expect(s.programs_available).toBe(533 + 1873 + 1108);
    });
  });

  describe("getSelfAwareness", () => {
    it("exposes archive paths for 3 sources", () => {
      const a = millProgramLearningEngine.getSelfAwareness();
      expect(a.source_archives.haas.path).toContain("CNC MILL HAAS");
      expect(a.source_archives.haas_hurco.path).toContain("HAAS-HURCO");
      expect(a.source_archives.roku_roku.path).toContain("ROKU-ROKU");
    });

    it("lists integration partners", () => {
      const a = millProgramLearningEngine.getSelfAwareness();
      expect(a.integrates_with.join(" ")).toContain("MillTribalKnowledgeEngine");
      expect(a.integrates_with.join(" ")).toContain("MillingAGIMasterEngine");
    });
  });

  describe("recordObservation", () => {
    it("increments observation counter", () => {
      const e = new MillProgramLearningEngine();
      e.recordObservation("haas", 10);
      expect(e.getSummary().total_programs_observed).toBe(10);
    });
  });
});
