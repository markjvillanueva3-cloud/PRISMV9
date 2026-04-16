/**
 * MitCourseIndexEngine -- Test Suite
 *
 * Validates the MIT course index engine against real filesystem data.
 * Scans ~200 unique courses across 6 source zones in H:/prism/resources/MIT COURSES/.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  MitCourseIndexEngine,
  MitCourseIndexResult,
  MitCourseAuditResult,
  MitCourse,
  CourseRelevance,
} from "../engines/MitCourseIndexEngine.js";

describe("MitCourseIndexEngine", () => {
  let result: MitCourseIndexResult;

  beforeAll(async () => {
    result = await MitCourseIndexEngine.harvest();
  }, 120_000);

  // ----------------------------------------------------------------
  // getSources
  // ----------------------------------------------------------------

  describe("getSources", () => {
    it("returns exactly 6 source zones", () => {
      const sources = MitCourseIndexEngine.getSources();
      expect(sources).toHaveLength(6);
    });

    it("includes root, uploaded, mc2, mc3, mc4, mc5 zones", () => {
      const sources = MitCourseIndexEngine.getSources();
      const names = sources.map((s) => s.name);
      expect(names).toContain("root");
      expect(names).toContain("uploaded");
      expect(names).toContain("mc2");
      expect(names).toContain("mc3");
      expect(names).toContain("mc4");
      expect(names).toContain("mc5");
    });

    it("each source has a non-empty path, description, and positive expectedCourses", () => {
      const sources = MitCourseIndexEngine.getSources();
      for (const s of sources) {
        expect(s.path.length).toBeGreaterThan(0);
        expect(s.description.length).toBeGreaterThan(0);
        expect(s.expectedCourses).toBeGreaterThan(0);
      }
    });

    it("returns a defensive copy (mutating result does not affect engine)", () => {
      const a = MitCourseIndexEngine.getSources();
      const b = MitCourseIndexEngine.getSources();
      a[0].name = "MUTATED";
      expect(b[0].name).toBe("root");
    });
  });

  // ----------------------------------------------------------------
  // harvest -- total counts
  // ----------------------------------------------------------------

  describe("harvest -- total counts", () => {
    it("finds at least 100 unique courses", () => {
      expect(result.totalCourses).toBeGreaterThanOrEqual(100);
    });

    it("totalCourses matches courses array length", () => {
      expect(result.totalCourses).toBe(result.courses.length);
    });

    it("has a valid ISO timestamp", () => {
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("courses are sorted alphabetically by slug", () => {
      for (let i = 1; i < result.courses.length; i++) {
        expect(
          result.courses[i - 1].slug.localeCompare(result.courses[i].slug)
        ).toBeLessThanOrEqual(0);
      }
    });

    it("totalFiles is the sum of all individual course totalFiles", () => {
      const sum = result.courses.reduce((acc, c) => acc + c.totalFiles, 0);
      expect(result.totalFiles).toBe(sum);
    });
  });

  // ----------------------------------------------------------------
  // harvest -- department breakdown
  // ----------------------------------------------------------------

  describe("harvest -- department breakdown", () => {
    it("contains departments 2, 6, 18, 15 (the four largest)", () => {
      expect(result.byDepartment["2"]).toBeGreaterThanOrEqual(5);
      expect(result.byDepartment["6"]).toBeGreaterThanOrEqual(5);
      expect(result.byDepartment["18"]).toBeGreaterThanOrEqual(5);
      expect(result.byDepartment["15"]).toBeGreaterThanOrEqual(3);
    });

    it("department counts sum to totalCourses", () => {
      const sum = Object.values(result.byDepartment).reduce(
        (a, b) => a + b,
        0
      );
      expect(sum).toBe(result.totalCourses);
    });

    it("includes non-numeric departments (esd, mas, res)", () => {
      const depts = Object.keys(result.byDepartment);
      // At least one of these special prefixes should appear
      const hasSpecial = depts.some((d) =>
        ["esd", "mas", "res", "ids", "ec", "sts"].includes(d)
      );
      expect(hasSpecial).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // harvest -- semester breakdown
  // ----------------------------------------------------------------

  describe("harvest -- semester breakdown", () => {
    it("has spring and fall as the two largest semesters", () => {
      expect(result.bySemester["spring"]).toBeGreaterThanOrEqual(10);
      expect(result.bySemester["fall"]).toBeGreaterThanOrEqual(10);
    });

    it("semester counts sum to totalCourses", () => {
      const sum = Object.values(result.bySemester).reduce((a, b) => a + b, 0);
      expect(sum).toBe(result.totalCourses);
    });

    it("includes january-iap semester", () => {
      expect(result.bySemester["january-iap"]).toBeGreaterThanOrEqual(1);
    });
  });

  // ----------------------------------------------------------------
  // harvest -- relevance classification
  // ----------------------------------------------------------------

  describe("harvest -- relevance classification", () => {
    it("classifies at least 5 courses as algorithms", () => {
      expect(result.byRelevance["algorithms"]).toBeGreaterThanOrEqual(5);
    });

    it("classifies at least 3 courses as materials", () => {
      expect(result.byRelevance["materials"]).toBeGreaterThanOrEqual(3);
    });

    it("classifies at least 2 courses as manufacturing", () => {
      expect(result.byRelevance["manufacturing"]).toBeGreaterThanOrEqual(2);
    });

    it("relevance counts sum to totalCourses", () => {
      const sum = Object.values(result.byRelevance).reduce(
        (a, b) => a + b,
        0
      );
      expect(sum).toBe(result.totalCourses);
    });

    it("every course has a valid relevance value", () => {
      const validCategories: CourseRelevance[] = [
        "manufacturing",
        "materials",
        "algorithms",
        "controls",
        "design",
        "fluid_thermal",
        "general_engineering",
        "other",
      ];
      for (const c of result.courses) {
        expect(validCategories).toContain(c.relevance);
      }
    });
  });

  // ----------------------------------------------------------------
  // harvest -- extracted vs zip-only
  // ----------------------------------------------------------------

  describe("harvest -- extracted vs zip", () => {
    it("at least 5 courses are extracted (have folders)", () => {
      const extracted = result.courses.filter((c) => c.isExtracted);
      expect(extracted.length).toBeGreaterThanOrEqual(5);
    });

    it("at least some extracted courses have totalFiles > 0 (some folders are empty shells)", () => {
      const extracted = result.courses.filter((c) => c.isExtracted);
      const withFiles = extracted.filter((c) => c.totalFiles > 0);
      // Root has 10.34 (338 files), 6.046j (253 files), 6.837 (6 files), MC5 has 6.005 (246 files)
      expect(withFiles.length).toBeGreaterThanOrEqual(3);
    });

    it("zip-only courses have totalFiles === 0", () => {
      const zipOnly = result.courses.filter(
        (c) => !c.isExtracted && c.hasZip
      );
      for (const c of zipOnly) {
        expect(c.totalFiles).toBe(0);
      }
    });

    it("10.34-fall-2015 is extracted with 100+ files", () => {
      const course = result.courses.find((c) => c.slug === "10.34-fall-2015");
      expect(course).toBeDefined();
      expect(course!.isExtracted).toBe(true);
      expect(course!.totalFiles).toBeGreaterThanOrEqual(100);
    });
  });

  // ----------------------------------------------------------------
  // harvest -- specific known courses
  // ----------------------------------------------------------------

  describe("harvest -- known courses", () => {
    it("contains 6.046j-spring-2015 (algorithms, dept 6)", () => {
      const c = result.courses.find((c) => c.slug === "6.046j-spring-2015");
      expect(c).toBeDefined();
      expect(c!.department).toBe("6");
      expect(c!.relevance).toBe("algorithms");
    });

    it("contains esd.342-spring-2006 (design, dept esd)", () => {
      const c = result.courses.find((c) => c.slug === "esd.342-spring-2006");
      expect(c).toBeDefined();
      expect(c!.department).toBe("esd");
      expect(c!.relevance).toBe("design");
    });

    it("contains 3.21-spring-2006 (materials, dept 3)", () => {
      const c = result.courses.find((c) => c.slug === "3.21-spring-2006");
      expect(c).toBeDefined();
      expect(c!.department).toBe("3");
      expect(c!.relevance).toBe("materials");
    });
  });

  // ----------------------------------------------------------------
  // harvest -- existing JSON indexes
  // ----------------------------------------------------------------

  describe("harvest -- existing indexes", () => {
    it("finds at least 2 pre-existing JSON index files", () => {
      expect(result.existingIndexes.length).toBeGreaterThanOrEqual(2);
    });

    it("MIT_COURSE_INDEX.json is parseable with known keys", () => {
      const idx = result.existingIndexes.find(
        (i) => i.filename === "MIT_COURSE_INDEX.json"
      );
      expect(idx).toBeDefined();
      expect(idx!.parseable).toBe(true);
      expect(idx!.topLevelKeys).toContain("totalCourses");
    });

    it("ALGORITHM_REGISTRY.json is parseable", () => {
      const idx = result.existingIndexes.find(
        (i) => i.filename === "ALGORITHM_REGISTRY.json"
      );
      expect(idx).toBeDefined();
      expect(idx!.parseable).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // findByDepartment
  // ----------------------------------------------------------------

  describe("findByDepartment", () => {
    it("returns only courses from department 6", () => {
      const dept6 = MitCourseIndexEngine.findByDepartment(
        result.courses,
        "6"
      );
      expect(dept6.length).toBeGreaterThanOrEqual(5);
      for (const c of dept6) {
        expect(c.department).toBe("6");
      }
    });

    it("is case-insensitive for department prefix", () => {
      const lower = MitCourseIndexEngine.findByDepartment(
        result.courses,
        "esd"
      );
      const upper = MitCourseIndexEngine.findByDepartment(
        result.courses,
        "ESD"
      );
      expect(lower.length).toBe(upper.length);
    });

    it("returns empty array for nonexistent department", () => {
      const none = MitCourseIndexEngine.findByDepartment(
        result.courses,
        "999"
      );
      expect(none).toHaveLength(0);
    });
  });

  // ----------------------------------------------------------------
  // filterByRelevance
  // ----------------------------------------------------------------

  describe("filterByRelevance", () => {
    it("filters algorithms courses correctly", () => {
      const algos = MitCourseIndexEngine.filterByRelevance(
        result.courses,
        "algorithms"
      );
      expect(algos.length).toBe(result.byRelevance["algorithms"]);
      for (const c of algos) {
        expect(c.relevance).toBe("algorithms");
      }
    });

    it("filters materials courses correctly", () => {
      const mats = MitCourseIndexEngine.filterByRelevance(
        result.courses,
        "materials"
      );
      expect(mats.length).toBe(result.byRelevance["materials"]);
    });

    it("all relevance categories sum back to total", () => {
      const categories: CourseRelevance[] = [
        "manufacturing",
        "materials",
        "algorithms",
        "controls",
        "design",
        "fluid_thermal",
        "general_engineering",
        "other",
      ];
      let total = 0;
      for (const cat of categories) {
        total += MitCourseIndexEngine.filterByRelevance(result.courses, cat)
          .length;
      }
      expect(total).toBe(result.totalCourses);
    });
  });

  // ----------------------------------------------------------------
  // filterBySemester
  // ----------------------------------------------------------------

  describe("filterBySemester", () => {
    it("returns only spring courses when filtering by spring", () => {
      const spring = MitCourseIndexEngine.filterBySemester(
        result.courses,
        "spring"
      );
      for (const c of spring) {
        expect(c.semester).toBe("spring");
      }
      expect(spring.length).toBe(result.bySemester["spring"]);
    });
  });

  // ----------------------------------------------------------------
  // filterByYearRange
  // ----------------------------------------------------------------

  describe("filterByYearRange", () => {
    it("returns courses within 2020-2026 range", () => {
      const recent = MitCourseIndexEngine.filterByYearRange(
        result.courses,
        2020,
        2026
      );
      expect(recent.length).toBeGreaterThanOrEqual(1);
      for (const c of recent) {
        expect(c.year).toBeGreaterThanOrEqual(2020);
        expect(c.year).toBeLessThanOrEqual(2026);
      }
    });

    it("returns empty for impossible range", () => {
      const none = MitCourseIndexEngine.filterByYearRange(
        result.courses,
        2050,
        2060
      );
      expect(none).toHaveLength(0);
    });
  });

  // ----------------------------------------------------------------
  // audit
  // ----------------------------------------------------------------

  describe("audit", () => {
    let auditResult: MitCourseAuditResult;

    beforeAll(async () => {
      auditResult = await MitCourseIndexEngine.audit();
    }, 120_000);

    it("returns correct totalCourses", () => {
      expect(auditResult.totalCourses).toBe(result.totalCourses);
    });

    it("extractedCount + zipOnlyCount equals totalCourses", () => {
      expect(auditResult.extractedCount + auditResult.zipOnlyCount).toBe(
        auditResult.totalCourses
      );
    });

    it("topDepartments is sorted descending by count", () => {
      for (let i = 1; i < auditResult.topDepartments.length; i++) {
        expect(auditResult.topDepartments[i - 1].count).toBeGreaterThanOrEqual(
          auditResult.topDepartments[i].count
        );
      }
    });

    it("yearRange spans from 1999 or earlier to 2020 or later", () => {
      expect(auditResult.yearRange.min).toBeLessThanOrEqual(2000);
      expect(auditResult.yearRange.max).toBeGreaterThanOrEqual(2020);
    });

    it("existingIndexes includes at least MIT_COURSE_INDEX.json", () => {
      expect(auditResult.existingIndexes).toContain("MIT_COURSE_INDEX.json");
    });
  });
});
