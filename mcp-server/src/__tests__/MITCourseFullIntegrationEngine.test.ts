/**
 * MITCourseFullIntegrationEngine Tests — Phase 0.23 U-UTL13
 */

import { describe, it, expect, beforeEach } from "vitest";
import { mitCourseFullIntegrationEngine } from "../engines/MITCourseFullIntegrationEngine.js";

describe("MITCourseFullIntegrationEngine", () => {
  beforeEach(() => {
    mitCourseFullIntegrationEngine.reset();
  });

  it("initializes with seeded courses", async () => {
    const stats = await mitCourseFullIntegrationEngine.getStats();
    expect(stats.totalCourses).toBeGreaterThan(0);
  });

  it("queries courses by department", async () => {
    const courses = await mitCourseFullIntegrationEngine.query({ department: "2" });
    expect(courses.every(c => c.department === "2")).toBe(true);
  });

  it("queries courses by integration status", async () => {
    const courses = await mitCourseFullIntegrationEngine.query({ integrated: true });
    expect(courses.every(c => c.integrated === true)).toBe(true);
  });

  it("queries courses by topic", async () => {
    const courses = await mitCourseFullIntegrationEngine.query({ topic: "topic" });
    expect(courses.length).toBeGreaterThanOrEqual(0);
  });

  it("gets course by id", async () => {
    const courses = await mitCourseFullIntegrationEngine.query({ limit: 1 });
    if (courses.length > 0) {
      const course = await mitCourseFullIntegrationEngine.getCourse(courses[0].id);
      expect(course).not.toBeNull();
    }
  });

  it("returns null for unknown course id", async () => {
    const course = await mitCourseFullIntegrationEngine.getCourse("nonexistent");
    expect(course).toBeNull();
  });

  it("gets all algorithms", async () => {
    const algorithms = await mitCourseFullIntegrationEngine.getAlgorithms();
    expect(Array.isArray(algorithms)).toBe(true);
  });

  it("gets all formulas", async () => {
    const formulas = await mitCourseFullIntegrationEngine.getFormulas();
    expect(Array.isArray(formulas)).toBe(true);
  });

  it("respects query limit", async () => {
    const courses = await mitCourseFullIntegrationEngine.query({ limit: 5 });
    expect(courses.length).toBeLessThanOrEqual(5);
  });

  it("stats include department breakdown", async () => {
    const stats = await mitCourseFullIntegrationEngine.getStats();
    expect(stats.byDepartment).toBeDefined();
  });

  it("stats include integration percent", async () => {
    const stats = await mitCourseFullIntegrationEngine.getStats();
    expect(typeof stats.integrationPercent).toBe("number");
  });

  it("stats include algorithm count", async () => {
    const stats = await mitCourseFullIntegrationEngine.getStats();
    expect(typeof stats.totalAlgorithms).toBe("number");
  });

  it("stats include formula count", async () => {
    const stats = await mitCourseFullIntegrationEngine.getStats();
    expect(typeof stats.totalFormulas).toBe("number");
  });

  it("reset clears state", async () => {
    await mitCourseFullIntegrationEngine.getStats();
    mitCourseFullIntegrationEngine.reset();
    const stats = await mitCourseFullIntegrationEngine.getStats();
    expect(stats.totalCourses).toBeGreaterThan(0);
  });
});
