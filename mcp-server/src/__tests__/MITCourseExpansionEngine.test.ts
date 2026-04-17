/**
 * Tests for MITCourseExpansionEngine — U-AWR33
 */

import { describe, it, expect } from "vitest";
import {
  MITCourseExpansionEngine,
  ExpandedCourse,
} from "../engines/MITCourseExpansionEngine.js";

describe("MITCourseExpansionEngine", () => {
  describe("getExpandedCourses", () => {
    it("returns array of expanded courses", () => {
      const courses = MITCourseExpansionEngine.getExpandedCourses();
      expect(Array.isArray(courses)).toBe(true);
      expect(courses.length).toBeGreaterThan(0);
    });

    it("returns at least 21 new courses", () => {
      const courses = MITCourseExpansionEngine.getExpandedCourses();
      expect(courses.length).toBeGreaterThanOrEqual(21);
    });

    it("courses have required fields", () => {
      const courses = MITCourseExpansionEngine.getExpandedCourses();
      for (const course of courses) {
        expect(course.courseId).toBeDefined();
        expect(course.title).toBeDefined();
        expect(course.department).toBeDefined();
        expect(Array.isArray(course.topics)).toBe(true);
        expect(Array.isArray(course.algorithms)).toBe(true);
        expect(Array.isArray(course.formulas)).toBe(true);
        expect(Array.isArray(course.tribalTips)).toBe(true);
        expect(["high", "medium", "low"]).toContain(course.prismRelevance);
      }
    });
  });

  describe("getExpansionStats", () => {
    it("returns correct expansion statistics", () => {
      const stats = MITCourseExpansionEngine.getExpansionStats();
      expect(stats.originalCount).toBe(29);
      expect(stats.expandedCount).toBeGreaterThanOrEqual(50);
      expect(stats.newCourses.length).toBeGreaterThanOrEqual(21);
    });

    it("reports total formulas", () => {
      const stats = MITCourseExpansionEngine.getExpansionStats();
      expect(stats.totalFormulas).toBeGreaterThan(0);
    });

    it("reports total tribal tips", () => {
      const stats = MITCourseExpansionEngine.getExpansionStats();
      expect(stats.totalTribalTips).toBeGreaterThan(0);
    });
  });

  describe("getFormulasForRegistration", () => {
    it("returns array of formulas", () => {
      const formulas = MITCourseExpansionEngine.getFormulasForRegistration();
      expect(Array.isArray(formulas)).toBe(true);
      expect(formulas.length).toBeGreaterThan(0);
    });

    it("formulas have required fields", () => {
      const formulas = MITCourseExpansionEngine.getFormulasForRegistration();
      for (const formula of formulas) {
        expect(formula.name).toBeDefined();
        expect(formula.equation).toBeDefined();
        expect(formula.domain).toBeDefined();
        expect(formula.source).toBeDefined();
        expect(formula.courseId).toBeDefined();
      }
    });

    it("formula sources include MIT prefix", () => {
      const formulas = MITCourseExpansionEngine.getFormulasForRegistration();
      for (const formula of formulas) {
        expect(formula.source).toMatch(/^MIT/);
      }
    });

    it("includes key manufacturing formulas", () => {
      const formulas = MITCourseExpansionEngine.getFormulasForRegistration();
      const names = formulas.map(f => f.name);
      expect(names).toContain("Abbe Error");
      expect(names).toContain("Archard Wear");
    });
  });

  describe("getTribalTips", () => {
    it("returns array of tips", () => {
      const tips = MITCourseExpansionEngine.getTribalTips();
      expect(Array.isArray(tips)).toBe(true);
      expect(tips.length).toBeGreaterThan(0);
    });

    it("tips have required fields", () => {
      const tips = MITCourseExpansionEngine.getTribalTips();
      for (const tip of tips) {
        expect(tip.tip).toBeDefined();
        expect(tip.category).toBeDefined();
        expect(tip.source).toBeDefined();
        expect(tip.courseId).toBeDefined();
      }
    });

    it("returns at least 40 tips", () => {
      const tips = MITCourseExpansionEngine.getTribalTips();
      expect(tips.length).toBeGreaterThanOrEqual(40);
    });
  });

  describe("getCoursesByRelevance", () => {
    it("returns high relevance courses", () => {
      const highRel = MITCourseExpansionEngine.getCoursesByRelevance("high");
      expect(highRel.length).toBeGreaterThan(0);
      for (const course of highRel) {
        expect(course.prismRelevance).toBe("high");
      }
    });

    it("returns medium relevance courses", () => {
      const medRel = MITCourseExpansionEngine.getCoursesByRelevance("medium");
      expect(medRel.length).toBeGreaterThan(0);
      for (const course of medRel) {
        expect(course.prismRelevance).toBe("medium");
      }
    });
  });

  describe("getHighRelevanceCount", () => {
    it("returns count of high relevance courses", () => {
      const count = MITCourseExpansionEngine.getHighRelevanceCount();
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThanOrEqual(21);
    });
  });

  describe("searchByTopic", () => {
    it("finds courses by topic", () => {
      const bearings = MITCourseExpansionEngine.searchByTopic("bearings");
      expect(bearings.length).toBeGreaterThan(0);
    });

    it("finds courses by partial topic", () => {
      const thermal = MITCourseExpansionEngine.searchByTopic("therm");
      expect(thermal.length).toBeGreaterThan(0);
    });

    it("returns empty for non-existent topic", () => {
      const none = MITCourseExpansionEngine.searchByTopic("xyznonexistent");
      expect(none.length).toBe(0);
    });
  });

  describe("searchByAlgorithm", () => {
    it("finds courses by algorithm", () => {
      const fft = MITCourseExpansionEngine.searchByAlgorithm("FFT");
      expect(fft.length).toBeGreaterThan(0);
    });

    it("finds courses by partial algorithm name", () => {
      const kalman = MITCourseExpansionEngine.searchByAlgorithm("Kalman");
      expect(kalman.length).toBeGreaterThan(0);
    });
  });

  describe("manufacturing course coverage", () => {
    it("includes precision machine design (2.75)", () => {
      const courses = MITCourseExpansionEngine.getExpandedCourses();
      const precision = courses.find(c => c.courseId === "2.75");
      expect(precision).toBeDefined();
      expect(precision?.title).toContain("Precision");
    });

    it("includes tribology (2.800)", () => {
      const courses = MITCourseExpansionEngine.getExpandedCourses();
      const tribology = courses.find(c => c.courseId === "2.800");
      expect(tribology).toBeDefined();
      expect(tribology?.title).toContain("Tribology");
    });

    it("includes FEA (2.094)", () => {
      const courses = MITCourseExpansionEngine.getExpandedCourses();
      const fea = courses.find(c => c.courseId === "2.094");
      expect(fea).toBeDefined();
    });

    it("includes deep learning (6.S191)", () => {
      const courses = MITCourseExpansionEngine.getExpandedCourses();
      const dl = courses.find(c => c.courseId === "6.S191");
      expect(dl).toBeDefined();
    });
  });

  describe("formula domains", () => {
    it("includes machining domain formulas", () => {
      const formulas = MITCourseExpansionEngine.getFormulasForRegistration();
      const machining = formulas.filter(f => f.domain === "machining");
      expect(machining.length).toBeGreaterThan(0);
    });

    it("includes materials domain formulas", () => {
      const formulas = MITCourseExpansionEngine.getFormulasForRegistration();
      const materials = formulas.filter(f => f.domain === "materials");
      expect(materials.length).toBeGreaterThan(0);
    });

    it("includes controls domain formulas", () => {
      const formulas = MITCourseExpansionEngine.getFormulasForRegistration();
      const controls = formulas.filter(f => f.domain === "controls");
      expect(controls.length).toBeGreaterThan(0);
    });
  });
});
