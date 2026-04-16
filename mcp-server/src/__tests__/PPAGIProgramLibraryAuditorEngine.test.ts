/**
 * PPAGIProgramLibraryAuditorEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPAGIProgramLibraryAuditorEngine,
  ppAGIProgramLibraryAuditorEngine,
  type LibraryProgram,
} from "../engines/PPAGIProgramLibraryAuditorEngine.js";

const FANUC_A = `%
O1001
G90 G21 G17
T1 M6
S5000 M3 M8
G0 X0 Y0 Z5
G1 Z-2 F200
G1 X50 F500
G2 X30 Y20 I-10 J0
M30
%`;

const FANUC_B = `%
O1002
G90 G21 G17
T1 M6
S6000 M3 M8
G0 X0 Y0 Z5
G1 Z-3 F300
G1 X40 F400
M30
%`;

const SIEMENS_A = `; SIEMENS
DEF REAL _X
CYCLE81(100, 0, 1, -25)
T1 D1 M6
S5000 M3
M30`;

const SIEMENS_5AXIS = `; SIEMENS 5-AXIS
TRAORI
T1 D1 M6
G0 X0 Y0 Z50
PLANE SPATIAL(10, 0, 30)
G1 Z0 F200
TRAFOOF
M30`;

const LARGE_PROGRAM = (() => {
  const lines: string[] = ["%", "O9999", "G90 G21"];
  for (let i = 0; i < 500; i++) {
    lines.push(`G1 X${i} Y${i} F500`);
  }
  lines.push("M30", "%");
  return lines.join("\n");
})();

function buildLibrary(): LibraryProgram[] {
  return [
    { source_file: "fanuc_a.nc", gcode: FANUC_A },
    { source_file: "fanuc_b.nc", gcode: FANUC_B },
    { source_file: "siemens_a.mpf", gcode: SIEMENS_A },
    { source_file: "siemens_5ax.mpf", gcode: SIEMENS_5AXIS },
    { source_file: "large.nc", gcode: LARGE_PROGRAM },
  ];
}

describe("PPAGIProgramLibraryAuditorEngine", () => {
  it("exports singleton", () => {
    expect(ppAGIProgramLibraryAuditorEngine).toBeInstanceOf(PPAGIProgramLibraryAuditorEngine);
  });

  describe("audit", () => {
    it("returns aggregate result", () => {
      const lib = buildLibrary();
      const r = ppAGIProgramLibraryAuditorEngine.audit(lib);
      expect(r.total_programs).toBe(5);
      expect(r.successful_analyses).toBe(5);
      expect(r.failed_analyses).toBe(0);
    });

    it("tracks controller distribution", () => {
      const r = ppAGIProgramLibraryAuditorEngine.audit(buildLibrary());
      expect(r.controller_distribution.total).toBeGreaterThan(0);
      expect(r.controller_distribution.values).toHaveProperty("fanuc");
      expect(r.controller_distribution.values).toHaveProperty("siemens");
    });

    it("identifies mode controller", () => {
      const r = ppAGIProgramLibraryAuditorEngine.audit(buildLibrary());
      expect(r.controller_distribution.mode).toBeDefined();
    });

    it("computes complexity distribution", () => {
      const r = ppAGIProgramLibraryAuditorEngine.audit(buildLibrary());
      expect(r.complexity_distribution.total).toBe(5);
    });

    it("captures operation type breakdown", () => {
      const r = ppAGIProgramLibraryAuditorEngine.audit(buildLibrary());
      expect(Object.keys(r.operation_type_distribution.values).length).toBeGreaterThan(0);
    });

    it("reports quality stats", () => {
      const r = ppAGIProgramLibraryAuditorEngine.audit(buildLibrary());
      expect(r.quality_stats.min).toBeGreaterThanOrEqual(0);
      expect(r.quality_stats.max).toBeLessThanOrEqual(1);
      expect(r.quality_stats.mean).toBeGreaterThanOrEqual(r.quality_stats.min);
      expect(r.quality_stats.mean).toBeLessThanOrEqual(r.quality_stats.max);
    });

    it("reports line count stats", () => {
      const r = ppAGIProgramLibraryAuditorEngine.audit(buildLibrary());
      expect(r.line_count_stats.min).toBeGreaterThan(0);
      expect(r.line_count_stats.max).toBeGreaterThanOrEqual(r.line_count_stats.min);
    });

    it("counts capabilities", () => {
      const r = ppAGIProgramLibraryAuditorEngine.audit(buildLibrary());
      expect(r.capability_counts.has_5axis).toBe(1); // only siemens_5ax
    });

    it("detects outliers with sufficient variance", () => {
      // Build a library with clear outlier (10 small programs + 1 huge)
      const smallProgs: LibraryProgram[] = [];
      for (let i = 0; i < 10; i++) {
        smallProgs.push({ source_file: `small_${i}.nc`, gcode: FANUC_A });
      }
      smallProgs.push({ source_file: "huge.nc", gcode: LARGE_PROGRAM });

      const r = ppAGIProgramLibraryAuditorEngine.audit(smallProgs);
      expect(r.outliers.length).toBeGreaterThan(0);
      expect(r.outliers.some(o => o.source_file === "huge.nc")).toBe(true);
    });

    it("clusters similar programs", () => {
      const r = ppAGIProgramLibraryAuditorEngine.audit(buildLibrary());
      expect(r.clusters.length).toBeGreaterThan(0);
      // fanuc_a and fanuc_b should cluster together (same controller, similar)
      const fanucCluster = r.clusters.find(c =>
        c.members.includes("fanuc_a.nc") && c.members.includes("fanuc_b.nc"));
      expect(fanucCluster).toBeDefined();
    });

    it("tracks top issues", () => {
      const r = ppAGIProgramLibraryAuditorEngine.audit(buildLibrary());
      expect(Array.isArray(r.top_issues)).toBe(true);
      if (r.top_issues.length > 0) {
        expect(r.top_issues[0].count).toBeGreaterThan(0);
        expect(r.top_issues[0].text.length).toBeGreaterThan(0);
      }
    });

    it("tracks top strengths", () => {
      const r = ppAGIProgramLibraryAuditorEngine.audit(buildLibrary());
      expect(Array.isArray(r.top_strengths)).toBe(true);
    });

    it("counts total risks", () => {
      const r = ppAGIProgramLibraryAuditorEngine.audit(buildLibrary());
      expect(r.total_risks).toBeGreaterThanOrEqual(0);
    });
  });

  describe("quickScan", () => {
    it("returns partial result", () => {
      const r = ppAGIProgramLibraryAuditorEngine.quickScan(buildLibrary());
      expect(r.total_programs).toBe(5);
      expect(r.successful_analyses).toBe(5);
      expect(r.controller_distribution).toBeDefined();
      expect(r.complexity_distribution).toBeDefined();
      expect(r.quality_stats).toBeDefined();
    });

    it("omits expensive computations", () => {
      const r = ppAGIProgramLibraryAuditorEngine.quickScan(buildLibrary());
      // Outliers, clusters etc. are not in quick scan
      expect((r as any).outliers).toBeUndefined();
      expect((r as any).clusters).toBeUndefined();
    });
  });

  describe("findSimilar", () => {
    it("finds programs similar to reference", () => {
      const lib = buildLibrary();
      const results = ppAGIProgramLibraryAuditorEngine.findSimilar(FANUC_A, lib, 3);
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it("sorts by descending similarity", () => {
      const lib = buildLibrary();
      const results = ppAGIProgramLibraryAuditorEngine.findSimilar(FANUC_A, lib, 5);
      for (let i = 1; i < results.length; i++) {
        expect(results[i].similarity_score).toBeLessThanOrEqual(results[i - 1].similarity_score);
      }
    });

    it("Fanuc reference finds fanuc programs first", () => {
      const lib = buildLibrary();
      const results = ppAGIProgramLibraryAuditorEngine.findSimilar(FANUC_A, lib, 1);
      expect(results[0].file).toMatch(/fanuc/);
    });

    it("includes match reasons", () => {
      const lib = buildLibrary();
      const results = ppAGIProgramLibraryAuditorEngine.findSimilar(FANUC_A, lib, 2);
      expect(Array.isArray(results[0].reasons)).toBe(true);
    });
  });

  describe("empty/edge cases", () => {
    it("handles empty library", () => {
      const r = ppAGIProgramLibraryAuditorEngine.audit([]);
      expect(r.total_programs).toBe(0);
      expect(r.successful_analyses).toBe(0);
    });

    it("handles library of one", () => {
      const r = ppAGIProgramLibraryAuditorEngine.audit([
        { source_file: "solo.nc", gcode: FANUC_A },
      ]);
      expect(r.successful_analyses).toBe(1);
      // Should not produce outliers with single program
      expect(r.outliers.length).toBe(0);
    });
  });
});
