/**
 * HyperMillLinkingArtifactGeneratorEngine — Unit Tests
 *
 * U-HKC31: Validates artifact generation from 29 schema types, 162 params,
 * across 5 linking sub-domains (LeadInOut, Retract, Transition, EntryMethod, StayDown).
 *
 * @milestone HM-KC-MS5/U-HKC31
 */

import { describe, it, expect } from "vitest";
import {
  hyperMillLinkingArtifactGeneratorEngine,
  type LinkingArtifactResult,
} from "../engines/hypermill/HyperMillLinkingArtifactGeneratorEngine.js";

describe("HyperMillLinkingArtifactGeneratorEngine", () => {
  const result: LinkingArtifactResult = hyperMillLinkingArtifactGeneratorEngine.generate();

  // ── Count validations ──────────────────────────────────────────────────────

  it("generates at least 29 skill templates (8+6+4+6+5)", () => {
    expect(result.skills.length).toBeGreaterThanOrEqual(29);
    expect(result.summary.totalSkills).toBeGreaterThanOrEqual(29);
  });

  it("generates exactly 29 skill templates", () => {
    expect(result.skills.length).toBe(29);
    expect(result.summary.totalSchemaTypes).toBe(29);
  });

  it("generates exactly 29 AC Python scripts", () => {
    expect(result.acPythonScripts.length).toBe(29);
    expect(result.summary.totalScripts).toBe(29);
  });

  it("generates at least 6 DFM hook rules", () => {
    expect(result.hookRules.length).toBeGreaterThanOrEqual(6);
    expect(result.summary.totalHooks).toBeGreaterThanOrEqual(6);
  });

  it("reports exactly 162 totalParams across all skills", () => {
    expect(result.summary.totalParams).toBe(162);
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

  it("AC Python scripts cover all 5 linking sub-domains", () => {
    const domains = new Set(result.acPythonScripts.map((s) => s.domain));
    expect(domains.size).toBe(5);
    expect(domains.has("Linking-LeadInOut")).toBe(true);
    expect(domains.has("Linking-Retract")).toBe(true);
    expect(domains.has("Linking-Transition")).toBe(true);
    expect(domains.has("Linking-EntryMethod")).toBe(true);
    expect(domains.has("Linking-StayDown")).toBe(true);
  });

  // ── Hook rule validations ──────────────────────────────────────────────────

  it("every hook rule has severity CRITICAL or WARNING", () => {
    for (const rule of result.hookRules) {
      expect(["CRITICAL", "WARNING"]).toContain(rule.severity);
    }
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

  // ── Specific hook rule spot checks ─────────────────────────────────────────

  it("arc_radius hook rule has CRITICAL severity and 0.5-500 range", () => {
    const rule = result.hookRules.find(
      (r) => r.paramName === "arc_radius" && r.domain === "Linking-LeadInOut"
    );
    expect(rule).toBeDefined();
    expect(rule!.severity).toBe("CRITICAL");
    expect(rule!.minSafe).toBe(0.5);
    expect(rule!.maxSafe).toBe(500);
  });

  it("helix_angle hook rule has CRITICAL severity and max 15 degrees", () => {
    const rule = result.hookRules.find(
      (r) => r.paramName === "helix_angle" && r.domain === "Linking-LeadInOut"
    );
    expect(rule).toBeDefined();
    expect(rule!.severity).toBe("CRITICAL");
    expect(rule!.maxSafe).toBe(15);
  });

  it("ramp_angle hook rule has CRITICAL severity and max 10 degrees", () => {
    const rule = result.hookRules.find(
      (r) => r.paramName === "ramp_angle" && r.domain === "Linking-EntryMethod"
    );
    expect(rule).toBeDefined();
    expect(rule!.severity).toBe("CRITICAL");
    expect(rule!.maxSafe).toBe(10);
  });

  it("center_cutting_required hook rule has CRITICAL severity", () => {
    const rule = result.hookRules.find(
      (r) => r.paramName === "center_cutting_required" && r.domain === "Linking-LeadInOut"
    );
    expect(rule).toBeDefined();
    expect(rule!.severity).toBe("CRITICAL");
  });

  it("gap_threshold hook rule has WARNING severity and 0.5-50 range", () => {
    const rule = result.hookRules.find(
      (r) => r.paramName === "gap_threshold" && r.domain === "Linking-StayDown"
    );
    expect(rule).toBeDefined();
    expect(rule!.severity).toBe("WARNING");
    expect(rule!.minSafe).toBe(0.5);
    expect(rule!.maxSafe).toBe(50);
  });

  it("fixture_clearance hook rule has CRITICAL severity and min 2 mm", () => {
    const rule = result.hookRules.find(
      (r) => r.paramName === "fixture_clearance" && r.domain === "Linking-StayDown"
    );
    expect(rule).toBeDefined();
    expect(rule!.severity).toBe("CRITICAL");
    expect(rule!.minSafe).toBe(2);
  });

  // ── Domain-specific count checks ───────────────────────────────────────────

  it("LeadInOut domain has 8 skills", () => {
    const skills = result.skills.filter((s) => s.domain === "Linking-LeadInOut");
    expect(skills.length).toBe(8);
  });

  it("Retract domain has 6 skills", () => {
    const skills = result.skills.filter((s) => s.domain === "Linking-Retract");
    expect(skills.length).toBe(6);
  });

  it("Transition domain has 4 skills", () => {
    const skills = result.skills.filter((s) => s.domain === "Linking-Transition");
    expect(skills.length).toBe(4);
  });

  it("EntryMethod domain has 6 skills", () => {
    const skills = result.skills.filter((s) => s.domain === "Linking-EntryMethod");
    expect(skills.length).toBe(6);
  });

  it("StayDown domain has 5 skills", () => {
    const skills = result.skills.filter((s) => s.domain === "Linking-StayDown");
    expect(skills.length).toBe(5);
  });

  // ── Specific skill spot checks ─────────────────────────────────────────────

  it("arc_lead_in skill has 8 params and DFM warning for radius", () => {
    const skill = result.skills.find(
      (s) => s.name === "arc_lead_in" && s.domain === "Linking-LeadInOut"
    );
    expect(skill).toBeDefined();
    expect(skill!.parameterTable.length).toBe(8);
    expect(skill!.acPythonSetter).toBe("hm.linking.arc_lead_in");
  });

  it("ramp entry skill has 8 params and ramp_angle DFM warning", () => {
    const skill = result.skills.find(
      (s) => s.name === "ramp" && s.domain === "Linking-EntryMethod"
    );
    expect(skill).toBeDefined();
    expect(skill!.parameterTable.length).toBe(8);
    expect(skill!.dfmWarnings.length).toBeGreaterThan(0);
    expect(skill!.dfmWarnings[0]).toContain("ramp_angle");
  });

  it("collision_avoidance stay-down skill has fixture_clearance DFM warning", () => {
    const skill = result.skills.find(
      (s) => s.name === "collision_avoidance" && s.domain === "Linking-StayDown"
    );
    expect(skill).toBeDefined();
    expect(skill!.dfmWarnings.length).toBeGreaterThan(0);
    expect(skill!.dfmWarnings[0]).toContain("fixture_clearance");
  });

  it("full_retract skill has 5 params", () => {
    const skill = result.skills.find(
      (s) => s.name === "full_retract" && s.domain === "Linking-Retract"
    );
    expect(skill).toBeDefined();
    expect(skill!.parameterTable.length).toBe(5);
    expect(skill!.acPythonSetter).toBe("hm.linking.retract.full_retract");
  });
});
