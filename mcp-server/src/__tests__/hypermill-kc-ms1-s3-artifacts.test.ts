/**
 * HyperMillCADArtifactGeneratorEngine — Unit Tests
 *
 * U-HKC11: Validates artifact generation from 58 schema types, 241 params,
 * across 7 domains (Sketch, Solid, Surface, Analysis, Electrode, ImportExport, Measure).
 *
 * @milestone HM-KC-MS1/U-HKC11
 */

import { describe, it, expect } from "vitest";
import {
  hyperMillCADArtifactGeneratorEngine,
  type CADArtifactResult,
} from "../engines/hypermill/HyperMillCADArtifactGeneratorEngine.js";

describe("HyperMillCADArtifactGeneratorEngine", () => {
  const result: CADArtifactResult = hyperMillCADArtifactGeneratorEngine.generate();

  // ── Count validations ──────────────────────────────────────────────────────

  it("generates exactly 58 skill templates", () => {
    expect(result.skills.length).toBe(58);
    expect(result.summary.totalSkills).toBe(58);
  });

  it("generates exactly 58 AC Python scripts", () => {
    expect(result.acPythonScripts.length).toBe(58);
    expect(result.summary.totalScripts).toBe(58);
  });

  it("generates at least 18 DFM hook rules", () => {
    expect(result.hookRules.length).toBeGreaterThanOrEqual(18);
    expect(result.summary.totalHooks).toBeGreaterThanOrEqual(18);
  });

  it("reports exactly 58 totalSchemaTypes", () => {
    expect(result.summary.totalSchemaTypes).toBe(58);
  });

  it("reports exactly 241 totalParams across all skills", () => {
    expect(result.summary.totalParams).toBe(241);
  });

  // ── Skill template validations ─────────────────────────────────────────────

  it("every skill template has a non-empty parameterTable", () => {
    for (const skill of result.skills) {
      expect(skill.parameterTable.length).toBeGreaterThan(0);
    }
  });

  it("every skill template has name, domain, and description", () => {
    for (const skill of result.skills) {
      expect(skill.name.length).toBeGreaterThan(0);
      expect(skill.domain.length).toBeGreaterThan(0);
      expect(skill.description.length).toBeGreaterThan(0);
    }
  });

  it("param descriptors have type, range, and defaultValue fields", () => {
    for (const skill of result.skills) {
      for (const param of skill.parameterTable) {
        expect(param.name.length).toBeGreaterThan(0);
        expect(["number", "string", "boolean", "enum", "array"]).toContain(param.type);
        expect(param.range.length).toBeGreaterThan(0);
        expect(param.defaultValue.length).toBeGreaterThan(0);
      }
    }
  });

  // ── AC Python script validations ───────────────────────────────────────────

  it('every AC Python script contains "hm." prefix', () => {
    for (const script of result.acPythonScripts) {
      expect(script.script).toContain("hm.");
    }
  });

  it("AC Python scripts cover all 7 domains", () => {
    const domains = new Set(result.acPythonScripts.map((s) => s.domain));
    expect(domains.size).toBe(7);
    expect(domains.has("CAD-Sketch")).toBe(true);
    expect(domains.has("CAD-Solid")).toBe(true);
    expect(domains.has("CAD-Surface")).toBe(true);
    expect(domains.has("CAD-Analysis")).toBe(true);
    expect(domains.has("CAD-Electrode")).toBe(true);
    expect(domains.has("CAD-ImportExport")).toBe(true);
    expect(domains.has("CAD-Measure")).toBe(true);
  });

  // ── Hook rule validations ──────────────────────────────────────────────────

  it("every hook rule has severity CRITICAL or WARNING", () => {
    for (const rule of result.hookRules) {
      expect(["CRITICAL", "WARNING"]).toContain(rule.severity);
    }
  });

  it("hook rules cover all DFM-critical params from each domain", () => {
    const ruleKeys = result.hookRules.map((r) => `${r.domain}::${r.paramName}`);

    // Sketch domain
    expect(ruleKeys).toContain("CAD-Sketch::tolerance_upper");
    expect(ruleKeys).toContain("CAD-Sketch::tolerance_lower");
    expect(ruleKeys).toContain("CAD-Sketch::min_radius");
    expect(ruleKeys).toContain("CAD-Sketch::max_radius");

    // Solid domain
    expect(ruleKeys).toContain("CAD-Solid::taper_angle");
    expect(ruleKeys).toContain("CAD-Solid::wall_thickness");
    expect(ruleKeys).toContain("CAD-Solid::draft_angle");
    expect(ruleKeys).toContain("CAD-Solid::radius");

    // Analysis domain
    expect(ruleKeys).toContain("CAD-Analysis::min_draft_angle");
    expect(ruleKeys).toContain("CAD-Analysis::threshold_angle");
    expect(ruleKeys).toContain("CAD-Analysis::min_thickness");
    expect(ruleKeys).toContain("CAD-Analysis::max_thickness");

    // Electrode domain
    expect(ruleKeys).toContain("CAD-Electrode::spark_gap");
    expect(ruleKeys).toContain("CAD-Electrode::overcut_rough");
    expect(ruleKeys).toContain("CAD-Electrode::overcut_finish");
  });

  it("hook rules have valid numeric bounds (minSafe <= maxSafe)", () => {
    for (const rule of result.hookRules) {
      expect(rule.minSafe).toBeLessThanOrEqual(rule.maxSafe);
    }
  });

  it("hook rules have non-empty descriptions", () => {
    for (const rule of result.hookRules) {
      expect(rule.description.length).toBeGreaterThan(10);
    }
  });

  // ── Domain-specific count checks ───────────────────────────────────────────

  it("Sketch domain has 20 skills with 63 total params", () => {
    const sketchSkills = result.skills.filter((s) => s.domain === "CAD-Sketch");
    expect(sketchSkills.length).toBe(20);
    const sketchParams = sketchSkills.reduce(
      (sum, s) => sum + s.parameterTable.length,
      0
    );
    expect(sketchParams).toBe(63);
  });

  it("Solid domain has 11 skills with 58 total params", () => {
    const solidSkills = result.skills.filter((s) => s.domain === "CAD-Solid");
    expect(solidSkills.length).toBe(11);
    const solidParams = solidSkills.reduce(
      (sum, s) => sum + s.parameterTable.length,
      0
    );
    expect(solidParams).toBe(58);
  });

  it("Surface domain has 8 skills with 37 total params", () => {
    const surfaceSkills = result.skills.filter((s) => s.domain === "CAD-Surface");
    expect(surfaceSkills.length).toBe(8);
    const surfaceParams = surfaceSkills.reduce(
      (sum, s) => sum + s.parameterTable.length,
      0
    );
    expect(surfaceParams).toBe(37);
  });

  it("Analysis domain has 7 skills with 32 total params", () => {
    const analysisSkills = result.skills.filter((s) => s.domain === "CAD-Analysis");
    expect(analysisSkills.length).toBe(7);
    const analysisParams = analysisSkills.reduce(
      (sum, s) => sum + s.parameterTable.length,
      0
    );
    expect(analysisParams).toBe(32);
  });

  it("Electrode domain has 5 skills with 22 total params", () => {
    const electrodeSkills = result.skills.filter((s) => s.domain === "CAD-Electrode");
    expect(electrodeSkills.length).toBe(5);
    const electrodeParams = electrodeSkills.reduce(
      (sum, s) => sum + s.parameterTable.length,
      0
    );
    expect(electrodeParams).toBe(22);
  });

  it("ImportExport domain has 4 skills with 18 total params", () => {
    const ieSkills = result.skills.filter((s) => s.domain === "CAD-ImportExport");
    expect(ieSkills.length).toBe(4);
    const ieParams = ieSkills.reduce(
      (sum, s) => sum + s.parameterTable.length,
      0
    );
    expect(ieParams).toBe(18);
  });

  it("Measure domain has 3 skills with 11 total params", () => {
    const measureSkills = result.skills.filter((s) => s.domain === "CAD-Measure");
    expect(measureSkills.length).toBe(3);
    const measureParams = measureSkills.reduce(
      (sum, s) => sum + s.parameterTable.length,
      0
    );
    expect(measureParams).toBe(11);
  });

  // ── Specific value spot checks ─────────────────────────────────────────────

  it("extrude skill has 7 params and mentions taper in DFM warnings", () => {
    const extrude = result.skills.find(
      (s) => s.name === "extrude" && s.domain === "CAD-Solid"
    );
    expect(extrude).toBeDefined();
    expect(extrude!.parameterTable.length).toBe(7);
    expect(extrude!.dfmWarnings.length).toBeGreaterThan(0);
    expect(extrude!.dfmWarnings[0]).toContain("taper_angle");
  });

  it("electrode_design skill has 6 params and 3 DFM warnings", () => {
    const electrode = result.skills.find(
      (s) => s.name === "electrode_design" && s.domain === "CAD-Electrode"
    );
    expect(electrode).toBeDefined();
    expect(electrode!.parameterTable.length).toBe(6);
    expect(electrode!.dfmWarnings.length).toBe(3);
  });

  it("spark_gap hook rule has CRITICAL severity and 0.01-1.0 range", () => {
    const sparkRule = result.hookRules.find(
      (r) => r.paramName === "spark_gap" && r.domain === "CAD-Electrode"
    );
    expect(sparkRule).toBeDefined();
    expect(sparkRule!.severity).toBe("CRITICAL");
    expect(sparkRule!.minSafe).toBe(0.01);
    expect(sparkRule!.maxSafe).toBe(1.0);
  });

  it("wall_thickness hook rule has CRITICAL severity", () => {
    const wallRule = result.hookRules.find(
      (r) => r.paramName === "wall_thickness" && r.domain === "CAD-Solid"
    );
    expect(wallRule).toBeDefined();
    expect(wallRule!.severity).toBe("CRITICAL");
    expect(wallRule!.minSafe).toBe(0.8);
  });
});
