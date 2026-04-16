/**
 * MITCourseIntegrationEngine Tests
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  MITCourseIntegrationEngine,
  mitCourseIntegrationEngine,
} from "../../engines/MITCourseIntegrationEngine.js";

describe("MITCourseIntegrationEngine", () => {
  let engine: MITCourseIntegrationEngine;

  beforeAll(async () => {
    engine = mitCourseIntegrationEngine;
    await engine.init();
  });

  describe("initialization", () => {
    it("should initialize without errors", () => {
      expect(engine).toBeDefined();
      expect(engine).toBeInstanceOf(MITCourseIntegrationEngine);
    });

    it("should load courses from index files", () => {
      const stats = engine.getStats();
      expect(stats.totalCourses).toBeGreaterThan(0);
    });

    it("should have algorithms indexed", () => {
      const stats = engine.getStats();
      expect(stats.totalAlgorithms).toBeGreaterThan(0);
    });
  });

  describe("listCourses", () => {
    it("should return all courses when no domain specified", () => {
      const courses = engine.listCourses();
      expect(courses).toBeInstanceOf(Array);
      expect(courses.length).toBeGreaterThan(0);
    });

    it("should filter courses by domain", () => {
      const manufacturingCourses = engine.listCourses("manufacturing");
      expect(manufacturingCourses).toBeInstanceOf(Array);
      for (const course of manufacturingCourses) {
        expect(course.domain).toBe("manufacturing");
      }
    });

    it("should return courses with required properties", () => {
      const courses = engine.listCourses();
      if (courses.length > 0) {
        const course = courses[0];
        expect(course.id).toBeDefined();
        expect(course.name).toBeDefined();
        expect(course.domain).toBeDefined();
        expect(course.priority).toBeDefined();
      }
    });
  });

  describe("getCourse", () => {
    it("should return course details for valid course ID", () => {
      const courses = engine.listCourses();
      if (courses.length > 0) {
        const details = engine.getCourse(courses[0].id);
        expect(details).not.toBeNull();
        expect(details?.course.id).toBe(courses[0].id);
      }
    });

    it("should return null for non-existent course", () => {
      const details = engine.getCourse("NONEXISTENT.999");
      expect(details).toBeNull();
    });

    it("should include manufacturing relevance score", () => {
      const courses = engine.listCourses("manufacturing");
      if (courses.length > 0) {
        const details = engine.getCourse(courses[0].id);
        if (details) {
          expect(details.manufacturingRelevance).toBeGreaterThanOrEqual(0);
          expect(details.manufacturingRelevance).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe("searchCourses", () => {
    it("should find courses matching query", () => {
      const result = engine.searchCourses("algorithm");
      expect(result.matchCount).toBeGreaterThan(0);
    });

    it("should return empty results for empty query", () => {
      const result = engine.searchCourses("");
      expect(result.matchCount).toBe(0);
    });

    it("should return domain breakdown", () => {
      const result = engine.searchCourses("optimization");
      expect(result.domainBreakdown).toBeDefined();
    });
  });

  describe("getAlgorithmsFromCourse", () => {
    it("should extract algorithms from course", () => {
      const extraction = engine.getAlgorithmsFromCourse("6.046J");
      expect(extraction.courseId).toBe("6.046J");
      expect(extraction.algorithms).toBeInstanceOf(Array);
    });

    it("should count PRISM engines mapped", () => {
      const extraction = engine.getAlgorithmsFromCourse("6.046J");
      expect(extraction.prismEnginesMapped).toBeGreaterThanOrEqual(0);
    });
  });

  describe("applyToManufacturing", () => {
    it("should apply course knowledge to problem", () => {
      const courses = engine.listCourses("manufacturing");
      if (courses.length > 0) {
        const result = engine.applyToManufacturing(courses[0].id, "cutting force");
        expect(result.courseId).toBeDefined();
        expect(result.theoryToPractice.length).toBeGreaterThan(0);
      }
    });

    it("should calculate confidence score", () => {
      const courses = engine.listCourses();
      if (courses.length > 0) {
        const result = engine.applyToManufacturing(courses[0].id, "optimization");
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("should handle non-existent course gracefully", () => {
      const result = engine.applyToManufacturing("NONEXISTENT.999", "problem");
      expect(result.confidence).toBe(0);
    });
  });

  describe("getCourseRecommendations", () => {
    it("should recommend courses for problem", () => {
      const result = engine.getCourseRecommendations("cutting speed optimization");
      expect(result.recommendedCourses).toBeInstanceOf(Array);
      expect(result.domainFocus).toBeInstanceOf(Array);
    });

    it("should return empty for empty problem", () => {
      const result = engine.getCourseRecommendations("");
      expect(result.recommendedCourses.length).toBe(0);
    });

    it("should include relevance scores", () => {
      const result = engine.getCourseRecommendations("neural network");
      for (const rec of result.recommendedCourses) {
        expect(rec.relevanceScore).toBeGreaterThan(0);
      }
    });
  });

  describe("getStats", () => {
    it("should return integration statistics", () => {
      const stats = engine.getStats();
      expect(stats.totalCourses).toBeGreaterThan(0);
      expect(stats.totalAlgorithms).toBeGreaterThan(0);
    });

    it("should count integration status", () => {
      const stats = engine.getStats();
      const total = stats.integratedCourses + stats.mappedCourses +
        stats.availableCourses + stats.archivedCourses;
      expect(total).toBe(stats.totalCourses);
    });

    it("should calculate coverage percentage", () => {
      const stats = engine.getStats();
      expect(stats.coveragePercent).toBeGreaterThanOrEqual(0);
      expect(stats.coveragePercent).toBeLessThanOrEqual(100);
    });

    it("should provide tier breakdown", () => {
      const stats = engine.getStats();
      expect(stats.byTier).toBeDefined();
      expect(stats.byTier.TIER_1).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getCoursesByTier", () => {
    it("should return TIER_1 courses", () => {
      const courses = engine.getCoursesByTier("TIER_1");
      expect(courses).toBeInstanceOf(Array);
      for (const course of courses) {
        expect(course.priority).toBe("TIER_1");
      }
    });
  });

  describe("getAlgorithmsForEngine", () => {
    it("should return algorithms for PRISM engine", () => {
      const algorithms = engine.getAlgorithmsForEngine("PRISM_TOOLPATH_OPTIMIZER");
      expect(algorithms).toBeInstanceOf(Array);
    });

    it("should return empty for unknown engine", () => {
      const algorithms = engine.getAlgorithmsForEngine("UNKNOWN");
      expect(algorithms.length).toBe(0);
    });
  });

  describe("getDomains", () => {
    it("should return domains with counts", () => {
      const domains = engine.getDomains();
      expect(domains).toBeInstanceOf(Array);
      expect(domains.length).toBeGreaterThan(0);
      for (const d of domains) {
        expect(d.domain).toBeDefined();
        expect(d.count).toBeGreaterThan(0);
      }
    });
  });

  describe("getPrismMapping", () => {
    it("should return PRISM engines for course", () => {
      const engines = engine.getPrismMapping("6.046J");
      expect(engines).toBeInstanceOf(Array);
    });
  });
});
