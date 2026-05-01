/**
 * HyperMillFixtureArtifactGeneratorEngine — Unit Tests
 *
 * U-HKC15: Validates artifact generation from 25 schema types, 155 params,
 * across 6 domains (Workholding, Stock, WCS, Clearance, Setup, Allowance).
 *
 * @milestone HM-KC-MS2/U-HKC15
 */

import { describe, it, expect } from "vitest";
import {
  hyperMillFixtureArtifactGeneratorEngine,
  type FixtureArtifactResult,
} from "../engines/hypermill/HyperMillFixtureArtifactGeneratorEngine.js";

describe("HyperMillFixtureArtifactGeneratorEngine", () => {
  const result: FixtureArtifactResult = hyperMillFixtureArtifactGeneratorEngine.generate();

  // ── Count validations ──────────────────────────────────────────────────────

  it("generates exactly 25 skill templates", () => {
    expect(result.skills.length).toBe(25);
    expect(result.summary.totalSkills).toBe(25);
  });

  it("generates exactly 25 AC Python scripts", () => {
    expect(result.acPythonScripts.length).toBe(25);
    expect(result.summary.totalScripts).toBe(25);
  });

  it("generates at least 11 DFM hook rules", () => {
    expect(result.hookRules.length).toBeGreaterThanOrEqual(11);
    expect(result.summary.totalHooks).toBeGreaterThanOrEqual(11);
  });

  it("reports exactly 25 totalSchemaTypes", () => {
    expect(result.summary.totalSchemaTypes).toBe(25);
  });

  it("reports exactly 155 totalParams across all skills", () => {
    expect(result.summary.totalParams).toBe(155);
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
        expect(["number", "string", "boolean", "enum", "array", "object"]).toContain(param.type);
        expect(param.range.length).toBeGreaterThan(0);
        expect(param.defaultValue.length).toBeGreaterThan(0);
      }
    }
  });

  it("total params across all skill parameterTables equals 155", () => {
    const total = result.skills.reduce(
      (sum, s) => sum + s.parameterTable.length,
      0
    );
    expect(total).toBe(155);
  });

  // ── AC Python script validations ───────────────────────────────────────────

  it('every AC Python script contains "hm." prefix', () => {
    for (const script of result.acPythonScripts) {
      expect(script.script).toContain("hm.");
    }
  });

  it("AC Python scripts cover all 6 fixture domains", () => {
    const domains = new Set(result.acPythonScripts.map((s) => s.domain));
    expect(domains.size).toBe(6);
    expect(domains.has("Fixture-Workholding")).toBe(true);
    expect(domains.has("Fixture-Stock")).toBe(true);
    expect(domains.has("Fixture-WCS")).toBe(true);
    expect(domains.has("Fixture-Clearance")).toBe(true);
    expect(domains.has("Fixture-Setup")).toBe(true);
    expect(domains.has("Fixture-Allowance")).toBe(true);
  });

  // ── Hook rule validations ──────────────────────────────────────────────────

  it("every hook rule has severity CRITICAL, WARNING, or BLOCKING", () => {
    for (const rule of result.hookRules) {
      expect(["CRITICAL", "WARNING", "BLOCKING"]).toContain(rule.severity);
    }
  });

  it("hook rules cover all fixture DFM-critical params", () => {
    const ruleKeys = result.hookRules.map((r) => `${r.domain}::${r.paramName}`);

    // Workholding domain
    expect(ruleKeys).toContain("Fixture-Workholding::grip_force");
    expect(ruleKeys).toContain("Fixture-Workholding::bore_diameter");
    expect(ruleKeys).toContain("Fixture-Workholding::jaw_width");
    expect(ruleKeys).toContain("Fixture-Workholding::hold_force_per_zone");
    expect(ruleKeys).toContain("Fixture-Workholding::clamping_force");

    // Stock domain
    expect(ruleKeys).toContain("Fixture-Stock::verify_containment");

    // WCS domain
    expect(ruleKeys).toContain("Fixture-WCS::auto_update_wcs");
    expect(ruleKeys).toContain("Fixture-WCS::position_uncertainty");

    // Clearance domain
    expect(ruleKeys).toContain("Fixture-Clearance::safety_margin");
    expect(ruleKeys).toContain("Fixture-Clearance::plunge_feed_rate");

    // Allowance domain
    expect(ruleKeys).toContain("Fixture-Allowance::allow_negative");
    expect(ruleKeys).toContain("Fixture-Allowance::max_negative_depth");
  });

  it("has at least one BLOCKING severity hook (negative allowance)", () => {
    const blockingRules = result.hookRules.filter((r) => r.severity === "BLOCKING");
    expect(blockingRules.length).toBeGreaterThanOrEqual(1);
    const negativeRule = blockingRules.find((r) => r.paramName === "allow_negative");
    expect(negativeRule).toBeDefined();
    expect(negativeRule!.domain).toBe("Fixture-Allowance");
  });

  it("has at least one CRITICAL severity hook (safety_margin)", () => {
    const safetyRule = result.hookRules.find(
      (r) => r.paramName === "safety_margin" && r.severity === "CRITICAL"
    );
    expect(safetyRule).toBeDefined();
    expect(safetyRule!.domain).toBe("Fixture-Clearance");
    expect(safetyRule!.minSafe).toBe(0.1);
    expect(safetyRule!.maxSafe).toBe(200);
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

  it("Workholding domain has 6 skills with 54 total params", () => {
    const whSkills = result.skills.filter((s) => s.domain === "Fixture-Workholding");
    expect(whSkills.length).toBe(6);
    const whParams = whSkills.reduce(
      (sum, s) => sum + s.parameterTable.length,
      0
    );
    expect(whParams).toBe(54);
  });

  it("Stock domain has 4 skills with 18 total params", () => {
    const stockSkills = result.skills.filter((s) => s.domain === "Fixture-Stock");
    expect(stockSkills.length).toBe(4);
    const stockParams = stockSkills.reduce(
      (sum, s) => sum + s.parameterTable.length,
      0
    );
    expect(stockParams).toBe(18);
  });

  it("WCS domain has 4 skills with 25 total params", () => {
    const wcsSkills = result.skills.filter((s) => s.domain === "Fixture-WCS");
    expect(wcsSkills.length).toBe(4);
    const wcsParams = wcsSkills.reduce(
      (sum, s) => sum + s.parameterTable.length,
      0
    );
    expect(wcsParams).toBe(25);
  });

  it("Clearance domain has 4 skills with 24 total params", () => {
    const clrSkills = result.skills.filter((s) => s.domain === "Fixture-Clearance");
    expect(clrSkills.length).toBe(4);
    const clrParams = clrSkills.reduce(
      (sum, s) => sum + s.parameterTable.length,
      0
    );
    expect(clrParams).toBe(24);
  });

  it("Setup domain has 4 skills with 20 total params", () => {
    const setupSkills = result.skills.filter((s) => s.domain === "Fixture-Setup");
    expect(setupSkills.length).toBe(4);
    const setupParams = setupSkills.reduce(
      (sum, s) => sum + s.parameterTable.length,
      0
    );
    expect(setupParams).toBe(20);
  });

  it("Allowance domain has 3 skills with 14 total params", () => {
    const allowSkills = result.skills.filter((s) => s.domain === "Fixture-Allowance");
    expect(allowSkills.length).toBe(3);
    const allowParams = allowSkills.reduce(
      (sum, s) => sum + s.parameterTable.length,
      0
    );
    expect(allowParams).toBe(14);
  });

  // ── Specific value spot checks ─────────────────────────────────────────────

  it("vise skill has 10 params and mentions clamping_force in DFM warnings", () => {
    const vise = result.skills.find(
      (s) => s.name === "vise" && s.domain === "Fixture-Workholding"
    );
    expect(vise).toBeDefined();
    expect(vise!.parameterTable.length).toBe(10);
    expect(vise!.dfmWarnings.length).toBeGreaterThan(0);
    expect(vise!.dfmWarnings[0]).toContain("clamping_force");
  });

  it("negative_allowance skill has 4 params and BLOCKING DFM warning", () => {
    const negAllow = result.skills.find(
      (s) => s.name === "negative_allowance" && s.domain === "Fixture-Allowance"
    );
    expect(negAllow).toBeDefined();
    expect(negAllow!.parameterTable.length).toBe(4);
    expect(negAllow!.dfmWarnings.length).toBe(2);
    expect(negAllow!.dfmWarnings[0]).toContain("BLOCKING");
  });

  it("grip_force hook rule has CRITICAL severity and 500-500000 range", () => {
    const gripRule = result.hookRules.find(
      (r) => r.paramName === "grip_force" && r.domain === "Fixture-Workholding"
    );
    expect(gripRule).toBeDefined();
    expect(gripRule!.severity).toBe("CRITICAL");
    expect(gripRule!.minSafe).toBe(500);
    expect(gripRule!.maxSafe).toBe(500000);
  });

  it("clamping_force hook rule has CRITICAL severity", () => {
    const clampRule = result.hookRules.find(
      (r) => r.paramName === "clamping_force" && r.domain === "Fixture-Workholding"
    );
    expect(clampRule).toBeDefined();
    expect(clampRule!.severity).toBe("CRITICAL");
    expect(clampRule!.minSafe).toBe(500);
  });

  it("position_uncertainty hook rule has CRITICAL severity and max 0.5", () => {
    const posRule = result.hookRules.find(
      (r) => r.paramName === "position_uncertainty" && r.domain === "Fixture-WCS"
    );
    expect(posRule).toBeDefined();
    expect(posRule!.severity).toBe("CRITICAL");
    expect(posRule!.maxSafe).toBe(0.5);
  });

  it("chuck_collet skill has 10 params with grip_force DFM warning", () => {
    const chuck = result.skills.find(
      (s) => s.name === "chuck_collet" && s.domain === "Fixture-Workholding"
    );
    expect(chuck).toBeDefined();
    expect(chuck!.parameterTable.length).toBe(10);
    expect(chuck!.dfmWarnings.length).toBeGreaterThanOrEqual(1);
    expect(chuck!.dfmWarnings[0]).toContain("grip_force");
  });

  it("clearance_plane skill has safety_margin DFM warning with CRITICAL tag", () => {
    const clrPlane = result.skills.find(
      (s) => s.name === "clearance_plane" && s.domain === "Fixture-Clearance"
    );
    expect(clrPlane).toBeDefined();
    expect(clrPlane!.dfmWarnings.length).toBe(1);
    expect(clrPlane!.dfmWarnings[0]).toContain("CRITICAL");
    expect(clrPlane!.dfmWarnings[0]).toContain("safety_margin");
  });
});
