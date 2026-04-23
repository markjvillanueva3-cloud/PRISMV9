/**
 * MIT Course Integration Tests
 * PP-AGI-S0/U-S0-03: Integrate 216 MIT courses
 */
import { describe, it, expect } from "vitest";
import { mitCourseIntegrationEngine } from "../engines/MITCourseIntegrationEngine.js";

describe("MITCourseIntegrationEngine", () => {
  describe("listCourses", () => {
    it("should return courses array", () => {
      const courses = mitCourseIntegrationEngine.listCourses();
      expect(Array.isArray(courses)).toBe(true);
    });

    it("should filter by domain when provided", () => {
      const mlCourses = mitCourseIntegrationEngine.listCourses("machine_learning");
      expect(Array.isArray(mlCourses)).toBe(true);
      if (mlCourses.length > 0) {
        expect(mlCourses.every(c => c.domain === "machine_learning")).toBe(true);
      }
    });
  });

  describe("getCourse", () => {
    it("should return course details for valid ID", () => {
      const courses = mitCourseIntegrationEngine.listCourses();
      if (courses.length > 0) {
        const detail = mitCourseIntegrationEngine.getCourse(courses[0].id);
        expect(detail).not.toBeNull();
        if (detail) {
          expect(detail).toHaveProperty("course");
          expect(detail).toHaveProperty("algorithms");
          expect(detail).toHaveProperty("manufacturingRelevance");
        }
      }
    });

    it("should return null for invalid ID", () => {
      const detail = mitCourseIntegrationEngine.getCourse("INVALID_COURSE_ID_12345");
      expect(detail).toBeNull();
    });
  });

  describe("searchCourses", () => {
    it("should return search results", () => {
      const results = mitCourseIntegrationEngine.searchCourses("optimization");
      expect(results).toHaveProperty("courses");
      expect(results).toHaveProperty("query", "optimization");
      expect(results).toHaveProperty("matchCount");
      expect(Array.isArray(results.courses)).toBe(true);
    });

    it("should return empty for nonsense query", () => {
      const results = mitCourseIntegrationEngine.searchCourses("xyzzy12345nonsense");
      expect(results.matchCount).toBe(0);
    });
  });

  describe("getStats", () => {
    it("should return integration statistics", () => {
      const stats = mitCourseIntegrationEngine.getStats();
      expect(stats).toHaveProperty("totalCourses");
      expect(stats).toHaveProperty("integratedCourses");
      expect(stats).toHaveProperty("totalAlgorithms");
      expect(typeof stats.totalCourses).toBe("number");
    });
  });

  describe("getCoursesByTier", () => {
    it("should return courses for TIER_1", () => {
      const tier1 = mitCourseIntegrationEngine.getCoursesByTier("TIER_1");
      expect(Array.isArray(tier1)).toBe(true);
      if (tier1.length > 0) {
        expect(tier1.every(c => c.priority === "TIER_1")).toBe(true);
      }
    });
  });

  describe("getDomains", () => {
    it("should return domain breakdown", () => {
      const domains = mitCourseIntegrationEngine.getDomains();
      expect(Array.isArray(domains)).toBe(true);
      if (domains.length > 0) {
        expect(domains[0]).toHaveProperty("domain");
        expect(domains[0]).toHaveProperty("count");
      }
    });
  });

  describe("applyToManufacturing", () => {
    it("should return application result", () => {
      const courses = mitCourseIntegrationEngine.listCourses();
      if (courses.length > 0) {
        const application = mitCourseIntegrationEngine.applyToManufacturing(
          courses[0].id,
          "optimize cutting parameters for titanium"
        );
        expect(application).toHaveProperty("courseId");
        expect(application).toHaveProperty("problem");
        expect(application).toHaveProperty("applicableAlgorithms");
      }
    });
  });

  describe("getCourseRecommendations", () => {
    it("should return recommendations for manufacturing problem", () => {
      const recs = mitCourseIntegrationEngine.getCourseRecommendations(
        "chatter prediction in milling"
      );
      expect(recs).toHaveProperty("problem");
      expect(recs).toHaveProperty("recommendedCourses");
      expect(Array.isArray(recs.recommendedCourses)).toBe(true);
    });
  });

  describe("getPrismMapping", () => {
    it("should return PRISM engines for course", () => {
      const courses = mitCourseIntegrationEngine.listCourses();
      if (courses.length > 0) {
        const mapping = mitCourseIntegrationEngine.getPrismMapping(courses[0].id);
        expect(Array.isArray(mapping)).toBe(true);
      }
    });
  });
});
