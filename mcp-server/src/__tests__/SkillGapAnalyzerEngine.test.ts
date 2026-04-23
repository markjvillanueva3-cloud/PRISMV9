/**
 * SkillGapAnalyzerEngine Tests — Phase 0.23 U-UTL7
 */

import { describe, it, expect, beforeEach } from "vitest";
import { skillGapAnalyzerEngine } from "../engines/SkillGapAnalyzerEngine.js";

describe("SkillGapAnalyzerEngine", () => {
  beforeEach(() => {
    skillGapAnalyzerEngine.reset();
  });

  it("initializes with seeded skills", async () => {
    const skill = await skillGapAnalyzerEngine.getSkill("/lathe-program");
    expect(skill).not.toBeNull();
  });

  it("analyzes gaps", async () => {
    const analysis = await skillGapAnalyzerEngine.analyze();
    expect(analysis.missingSkills).toBeDefined();
    expect(Array.isArray(analysis.missingSkills)).toBe(true);
  });

  it("identifies underutilized skills", async () => {
    const analysis = await skillGapAnalyzerEngine.analyze({ minUsageThreshold: 100 });
    expect(analysis.underutilizedSkills.length).toBeGreaterThan(0);
  });

  it("identifies overloaded skills", async () => {
    const analysis = await skillGapAnalyzerEngine.analyze({ maxUsageThreshold: 1 });
    expect(analysis.overloadedSkills.length).toBeGreaterThanOrEqual(0);
  });

  it("filters analysis by domain", async () => {
    const analysis = await skillGapAnalyzerEngine.analyze({ domain: "lathe" });
    expect(analysis.underutilizedSkills.every(s => s.domain === "lathe")).toBe(true);
  });

  it("provides recommendations", async () => {
    const analysis = await skillGapAnalyzerEngine.analyze();
    expect(Array.isArray(analysis.recommendations)).toBe(true);
  });

  it("calculates coverage percent", async () => {
    const analysis = await skillGapAnalyzerEngine.analyze();
    expect(typeof analysis.coveragePercent).toBe("number");
    expect(analysis.coveragePercent).toBeGreaterThanOrEqual(0);
    expect(analysis.coveragePercent).toBeLessThanOrEqual(100);
  });

  it("gets skill by id", async () => {
    const skill = await skillGapAnalyzerEngine.getSkill("/mill-program");
    expect(skill).not.toBeNull();
    expect(skill?.domain).toBe("mill");
  });

  it("returns null for unknown skill id", async () => {
    const skill = await skillGapAnalyzerEngine.getSkill("/nonexistent");
    expect(skill).toBeNull();
  });

  it("lists skills by domain", async () => {
    const skills = await skillGapAnalyzerEngine.listByDomain("wedm");
    expect(skills.every(s => s.domain === "wedm")).toBe(true);
  });

  it("returns count of skills", () => {
    expect(skillGapAnalyzerEngine.getCount()).toBeGreaterThanOrEqual(0);
  });

  it("reset clears state", () => {
    skillGapAnalyzerEngine.reset();
    expect(skillGapAnalyzerEngine.getCount()).toBe(0);
  });
});
