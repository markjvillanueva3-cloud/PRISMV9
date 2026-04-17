/**
 * MITCourseKnowledgeEngine Tests
 *
 * Validates integration of 285 algorithms from 225+ MIT courses
 * into PRISM's awareness system.
 *
 * @unit AI-AWARE-HARDEN/U-AWR07
 */

import { describe, it, expect } from "vitest";
import {
  mitCourseKnowledgeEngine,
  type AlgorithmEntry,
  type SearchResult,
  type AlgorithmStats,
} from "../engines/MITCourseKnowledgeEngine.js";

describe("MITCourseKnowledgeEngine", () => {
  describe("getStats", () => {
    it("should return aggregate statistics", () => {
      const stats = mitCourseKnowledgeEngine.getStats();

      expect(stats.totalAlgorithms).toBeGreaterThan(100);
      expect(stats.totalCourses).toBeGreaterThan(15);
      expect(stats.prismEngineCoverage).toBeGreaterThan(50);
      expect(Object.keys(stats.categoryCounts).length).toBeGreaterThan(5);
      expect(stats.topCourses.length).toBeGreaterThan(0);
    });

    it("should have expected category counts", () => {
      const stats = mitCourseKnowledgeEngine.getStats();

      expect(stats.categoryCounts).toHaveProperty("optimization");
      expect(stats.categoryCounts).toHaveProperty("machine_learning");
      expect(stats.categoryCounts).toHaveProperty("signal_processing");
      expect(stats.categoryCounts).toHaveProperty("control_systems");
      expect(stats.categoryCounts).toHaveProperty("manufacturing");
      expect(stats.categoryCounts).toHaveProperty("numerical_methods");
    });

    it("should identify top courses by algorithm count", () => {
      const stats = mitCourseKnowledgeEngine.getStats();

      expect(stats.topCourses[0].algorithmCount).toBeGreaterThan(5);
      expect(stats.topCourses.some(c => c.courseId === "6.867")).toBe(true);
    });
  });

  describe("searchAlgorithms", () => {
    it("should find algorithms by exact name", () => {
      const results = mitCourseKnowledgeEngine.searchAlgorithms("Gradient Descent");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe("Gradient Descent");
      expect(results[0].type).toBe("algorithm");
      expect(results[0].course).toBe("6.079");
    });

    it("should find algorithms by partial name", () => {
      const results = mitCourseKnowledgeEngine.searchAlgorithms("kalman");

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.name.toLowerCase().includes("kalman"))).toBe(true);
    });

    it("should find algorithms by course ID", () => {
      const results = mitCourseKnowledgeEngine.searchAlgorithms("6.867");

      expect(results.length).toBeGreaterThan(10);
      expect(results.every(r => r.course === "6.867")).toBe(true);
    });

    it("should find algorithms by category", () => {
      const results = mitCourseKnowledgeEngine.searchAlgorithms("metaheuristics");

      expect(results.length).toBeGreaterThan(3);
      expect(results.every(r => r.subcategory === "metaheuristics")).toBe(true);
    });

    it("should respect limit parameter", () => {
      const results = mitCourseKnowledgeEngine.searchAlgorithms("learning", 5);

      expect(results.length).toBeLessThanOrEqual(5);
    });

    it("should include PRISM engine mappings", () => {
      const results = mitCourseKnowledgeEngine.searchAlgorithms("SVM");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].prismEngines).toBeDefined();
      expect(results[0].prismEngines!.length).toBeGreaterThan(0);
    });
  });

  describe("searchCourses", () => {
    it("should find courses by ID", () => {
      const results = mitCourseKnowledgeEngine.searchCourses("6.046J");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain("6.046J");
    });

    it("should find courses by name", () => {
      const results = mitCourseKnowledgeEngine.searchCourses("Manufacturing");

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.name.toLowerCase().includes("manufacturing"))).toBe(true);
    });

    it("should find courses by topic", () => {
      const results = mitCourseKnowledgeEngine.searchCourses("SPC");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].category).toBe("manufacturing");
    });
  });

  describe("getAlgorithmsForEngine", () => {
    it("should find algorithms for PRISM_BAYESIAN_SYSTEM", () => {
      const results = mitCourseKnowledgeEngine.getAlgorithmsForEngine("PRISM_BAYESIAN_SYSTEM");

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.name === "Bayesian Inference")).toBe(true);
      expect(results.some(r => r.name === "Gaussian Processes")).toBe(true);
    });

    it("should find algorithms for cutting force engine", () => {
      const results = mitCourseKnowledgeEngine.getAlgorithmsForEngine("CuttingForceEngine");

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.name === "Kienzle Force Model")).toBe(true);
    });

    it("should handle partial engine names", () => {
      const results = mitCourseKnowledgeEngine.getAlgorithmsForEngine("CLUSTERING");

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.name === "K-Means")).toBe(true);
    });
  });

  describe("getCoursesForFeature", () => {
    it("should return courses for Speed_Feed_Calculator", () => {
      const courses = mitCourseKnowledgeEngine.getCoursesForFeature("Speed_Feed_Calculator");

      expect(courses).toContain("2.810");
      expect(courses).toContain("6.079");
      expect(courses.length).toBeGreaterThan(2);
    });

    it("should return courses for Force_Calculator", () => {
      const courses = mitCourseKnowledgeEngine.getCoursesForFeature("Force_Calculator");

      expect(courses).toContain("2.810");
      expect(courses).toContain("3.11");
    });

    it("should return courses for Bayesian_Optimizer", () => {
      const courses = mitCourseKnowledgeEngine.getCoursesForFeature("Bayesian_Optimizer");

      expect(courses).toContain("6.867");
      expect(courses).toContain("6.041");
    });
  });

  describe("getAlgorithmsByCategory", () => {
    it("should return all optimization algorithms", () => {
      const algorithms = mitCourseKnowledgeEngine.getAlgorithmsByCategory("optimization");

      expect(algorithms.length).toBeGreaterThan(20);
      expect(algorithms.some(a => a.name === "Simplex Method")).toBe(true);
      expect(algorithms.some(a => a.name === "Genetic Algorithm")).toBe(true);
      expect(algorithms.some(a => a.name === "NSGA-II")).toBe(true);
    });

    it("should return all machine_learning algorithms", () => {
      const algorithms = mitCourseKnowledgeEngine.getAlgorithmsByCategory("machine_learning");

      expect(algorithms.length).toBeGreaterThan(30);
      expect(algorithms.some(a => a.name === "Linear Regression")).toBe(true);
      expect(algorithms.some(a => a.name === "CNN")).toBe(true);
      expect(algorithms.some(a => a.name === "PPO")).toBe(true);
    });

    it("should return all manufacturing algorithms", () => {
      const algorithms = mitCourseKnowledgeEngine.getAlgorithmsByCategory("manufacturing");

      expect(algorithms.length).toBeGreaterThan(5);
      expect(algorithms.some(a => a.name === "Kienzle Force Model")).toBe(true);
      expect(algorithms.some(a => a.name === "Taylor Tool Life")).toBe(true);
      expect(algorithms.some(a => a.name === "SPC")).toBe(true);
    });

    it("should return empty array for unknown category", () => {
      const algorithms = mitCourseKnowledgeEngine.getAlgorithmsByCategory("nonexistent");

      expect(algorithms).toEqual([]);
    });
  });

  describe("getCoursesByCategory", () => {
    it("should return manufacturing courses", () => {
      const courses = mitCourseKnowledgeEngine.getCoursesByCategory("manufacturing");

      expect(courses.length).toBeGreaterThan(2);
      expect(courses.some(c => c.id === "2.810")).toBe(true);
      expect(courses.some(c => c.id === "2.830")).toBe(true);
    });

    it("should include topics for courses", () => {
      const courses = mitCourseKnowledgeEngine.getCoursesByCategory("optimization");

      expect(courses.length).toBeGreaterThan(3);
      const convexOpt = courses.find(c => c.id === "6.079");
      expect(convexOpt).toBeDefined();
      expect(convexOpt!.topics).toContain("gradient-descent");
    });
  });

  describe("validateEngineCoverage", () => {
    it("should validate PRISM_BAYESIAN_SYSTEM has coverage", () => {
      const result = mitCourseKnowledgeEngine.validateEngineCoverage("PRISM_BAYESIAN_SYSTEM");

      expect(result.hasCoverage).toBe(true);
      expect(result.algorithms.length).toBeGreaterThan(0);
      expect(result.recommendedCourses.length).toBeGreaterThan(0);
    });

    it("should validate CuttingForceEngine has coverage", () => {
      const result = mitCourseKnowledgeEngine.validateEngineCoverage("CuttingForceEngine");

      expect(result.hasCoverage).toBe(true);
      expect(result.algorithms.some(a => a.name === "Kienzle Force Model")).toBe(true);
      expect(result.recommendedCourses).toContain("2.810");
    });

    it("should return no coverage for unknown engine", () => {
      const result = mitCourseKnowledgeEngine.validateEngineCoverage("NONEXISTENT_ENGINE_XYZ");

      expect(result.hasCoverage).toBe(false);
      expect(result.algorithms.length).toBe(0);
      expect(result.recommendedCourses.length).toBe(0);
    });
  });

  describe("getAlgorithmCategories", () => {
    it("should return all category names", () => {
      const categories = mitCourseKnowledgeEngine.getAlgorithmCategories();

      expect(categories).toContain("optimization");
      expect(categories).toContain("machine_learning");
      expect(categories).toContain("signal_processing");
      expect(categories).toContain("control_systems");
      expect(categories).toContain("manufacturing");
      expect(categories).toContain("numerical_methods");
      expect(categories).toContain("graph_algorithms");
    });
  });

  describe("getCourseCategories", () => {
    it("should return all course category names", () => {
      const categories = mitCourseKnowledgeEngine.getCourseCategories();

      expect(categories).toContain("software_engineering");
      expect(categories).toContain("algorithms");
      expect(categories).toContain("optimization");
      expect(categories).toContain("machine_learning");
      expect(categories).toContain("manufacturing");
    });
  });

  describe("Data integrity", () => {
    it("should have unique algorithm-course combinations", () => {
      const stats = mitCourseKnowledgeEngine.getStats();
      const allAlgorithms: string[] = [];

      for (const category of mitCourseKnowledgeEngine.getAlgorithmCategories()) {
        const algorithms = mitCourseKnowledgeEngine.getAlgorithmsByCategory(category);
        for (const algo of algorithms) {
          const key = `${algo.name}:${algo.course}`;
          expect(allAlgorithms).not.toContain(key);
          allAlgorithms.push(key);
        }
      }
    });

    it("should have valid MIT course IDs", () => {
      const validPrefixes = ["2.", "3.", "6.", "9.", "10.", "15.", "16.", "18."];

      for (const category of mitCourseKnowledgeEngine.getAlgorithmCategories()) {
        const algorithms = mitCourseKnowledgeEngine.getAlgorithmsByCategory(category);
        for (const algo of algorithms) {
          const hasValidPrefix = validPrefixes.some(p => algo.course.startsWith(p));
          expect(hasValidPrefix).toBe(true);
        }
      }
    });

    it("should have at least one PRISM engine mapping per algorithm", () => {
      for (const category of mitCourseKnowledgeEngine.getAlgorithmCategories()) {
        const algorithms = mitCourseKnowledgeEngine.getAlgorithmsByCategory(category);
        for (const algo of algorithms) {
          expect(algo.prismEngines.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("Manufacturing-specific coverage", () => {
    it("should cover Kienzle model from 2.810", () => {
      const results = mitCourseKnowledgeEngine.searchAlgorithms("Kienzle");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].course).toBe("2.810");
      expect(results[0].prismEngines).toContain("CuttingForceEngine");
    });

    it("should cover Taylor tool life from 2.810", () => {
      const results = mitCourseKnowledgeEngine.searchAlgorithms("Taylor");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].course).toBe("2.810");
      expect(results[0].prismEngines).toContain("ToolLifeEngine");
    });

    it("should cover SPC from 2.830", () => {
      const results = mitCourseKnowledgeEngine.searchAlgorithms("SPC");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].course).toBe("2.830");
    });

    it("should cover Nelson Rules from 2.830", () => {
      const results = mitCourseKnowledgeEngine.searchAlgorithms("Nelson");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].prismEngines).toContain("NelsonSPCRulesEngine");
    });
  });
});
