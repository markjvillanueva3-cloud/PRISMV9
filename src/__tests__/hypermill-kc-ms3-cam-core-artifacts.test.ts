/**
 * Tests for HyperMillCAMCoreArtifactGeneratorEngine (U-HKC22)
 *
 * Validates that the CAM core artifact batch generator produces correct
 * skill templates, AC Python scripts, and DFM hook rules from all 8
 * CAM schema sources.
 */

import { describe, it, expect } from "vitest";
import {
  hyperMillCAMCoreArtifactGeneratorEngine,
  type CAMCoreArtifactResult,
} from "../engines/hypermill/HyperMillCAMCoreArtifactGeneratorEngine.js";

describe("HyperMillCAMCoreArtifactGeneratorEngine", () => {
  const result: CAMCoreArtifactResult = hyperMillCAMCoreArtifactGeneratorEngine.generate();

  // ── Summary count assertions ──

  it("should produce at least 49 total schema types (15+3+6+4+8+6+4+3)", () => {
    expect(result.summary.totalSchemaTypes).toBeGreaterThanOrEqual(49);
  });

  it("should produce at least 1000 total params across all domains", () => {
    expect(result.summary.totalParams).toBeGreaterThanOrEqual(1000);
  });

  it("should have totalSkills equal to totalSchemaTypes", () => {
    expect(result.summary.totalSkills).toBe(result.summary.totalSchemaTypes);
  });

  it("should have totalScripts equal to totalSchemaTypes", () => {
    expect(result.summary.totalScripts).toBe(result.summary.totalSchemaTypes);
  });

  it("should produce at least 15 hook rules", () => {
    expect(result.summary.totalHooks).toBeGreaterThanOrEqual(15);
    expect(result.hookRules.length).toBeGreaterThanOrEqual(15);
  });

  // ── Skill template validation ──

  it("every skill should have a non-empty parameterTable", () => {
    for (const skill of result.skills) {
      expect(skill.parameterTable.length).toBeGreaterThan(0);
    }
  });

  it("every skill should have name, domain, and description populated", () => {
    for (const skill of result.skills) {
      expect(skill.name.length).toBeGreaterThan(0);
      expect(skill.domain.length).toBeGreaterThan(0);
      expect(skill.description.length).toBeGreaterThan(0);
    }
  });

  it("should contain specific drilling skill types", () => {
    const skillNames = result.skills.map((s) => s.name);
    expect(skillNames).toContain("peck_drill");
    expect(skillNames).toContain("deep_hole_drill");
    expect(skillNames).toContain("tapping");
    expect(skillNames).toContain("thread_milling");
  });

  it("should contain specific 2D skill types", () => {
    const skillNames = result.skills.map((s) => s.name);
    expect(skillNames).toContain("pocket");
    expect(skillNames).toContain("contour");
    expect(skillNames).toContain("face_mill");
    expect(skillNames).toContain("slot_mill");
    expect(skillNames).toContain("chamfer");
  });

  it("should contain specific 3D skill types", () => {
    const skillNames = result.skills.map((s) => s.name);
    expect(skillNames).toContain("z_level");
    expect(skillNames).toContain("parallel");
    expect(skillNames).toContain("scallop");
    expect(skillNames).toContain("maxx_offset");
    expect(skillNames).toContain("maxx_hpc");
  });

  it("should contain cutting data, tool comp, and coolant skill types", () => {
    const skillNames = result.skills.map((s) => s.name);
    expect(skillNames).toContain("roughing");
    expect(skillNames).toContain("finishing");
    expect(skillNames).toContain("milling");
    expect(skillNames).toContain("turning");
    expect(skillNames).toContain("high_pressure");
    expect(skillNames).toContain("cryogenic");
  });

  // ── AC Python script validation ──

  it("every script should contain 'hm.' prefix", () => {
    for (const script of result.acPythonScripts) {
      expect(script.script).toContain("hm.");
    }
  });

  it("drilling scripts should use 'hm.drill.' namespace", () => {
    const drillingScripts = result.acPythonScripts.filter(
      (s) => s.domain === "CAM-Drilling"
    );
    expect(drillingScripts.length).toBe(15);
    for (const s of drillingScripts) {
      expect(s.script).toMatch(/^hm\.drill\./);
    }
  });

  it("2D core scripts should use 'hm.2d.' namespace", () => {
    const twoDScripts = result.acPythonScripts.filter(
      (s) => s.domain === "CAM-2D-Core"
    );
    expect(twoDScripts.length).toBe(3);
    for (const s of twoDScripts) {
      expect(s.script).toMatch(/^hm\.2d\./);
    }
  });

  it("cutting data scripts should use 'hm.cutting.' namespace", () => {
    const cuttingScripts = result.acPythonScripts.filter(
      (s) => s.domain === "CAM-CuttingData"
    );
    expect(cuttingScripts.length).toBe(6);
    for (const s of cuttingScripts) {
      expect(s.script).toMatch(/^hm\.cutting\./);
    }
  });

  // ── Hook rule domain coverage ──

  it("should have hooks in the CAM-Drilling domain", () => {
    const drillingHooks = result.hookRules.filter((r) => r.domain === "CAM-Drilling");
    expect(drillingHooks.length).toBeGreaterThanOrEqual(2);
    const paramNames = drillingHooks.map((r) => r.paramName);
    expect(paramNames).toContain("ld_ratio_limit");
    expect(paramNames).toContain("thread_pitch");
  });

  it("should have hooks in the 2D domains", () => {
    const twoDHooks = result.hookRules.filter(
      (r) => r.domain === "CAM-2D-Core" || r.domain === "CAM-2D-Extended"
    );
    expect(twoDHooks.length).toBeGreaterThanOrEqual(3);
    const paramNames = twoDHooks.map((r) => r.paramName);
    expect(paramNames).toContain("stepdown");
    expect(paramNames).toContain("chamfer_angle");
  });

  it("should have hooks in the 3D domains", () => {
    const threeDHooks = result.hookRules.filter(
      (r) => r.domain === "CAM-3D-Core" || r.domain === "CAM-3D-Advanced"
    );
    expect(threeDHooks.length).toBeGreaterThanOrEqual(4);
    const paramNames = threeDHooks.map((r) => r.paramName);
    expect(paramNames).toContain("stepdown");
    expect(paramNames).toContain("stepover");
    expect(paramNames).toContain("cusp_height_target");
    expect(paramNames).toContain("engagement_angle");
  });

  it("should have hooks in the cutting data domain", () => {
    const cuttingHooks = result.hookRules.filter((r) => r.domain === "CAM-CuttingData");
    expect(cuttingHooks.length).toBeGreaterThanOrEqual(3);
    const paramNames = cuttingHooks.map((r) => r.paramName);
    expect(paramNames).toContain("depth_of_cut");
    expect(paramNames).toContain("pitch");
    expect(paramNames).toContain("radial_engagement_pct");
  });

  it("should have hooks in the tool comp domain", () => {
    const compHooks = result.hookRules.filter((r) => r.domain === "CAM-ToolComp");
    expect(compHooks.length).toBeGreaterThanOrEqual(1);
    expect(compHooks[0].paramName).toBe("nose_radius");
    expect(compHooks[0].severity).toBe("CRITICAL");
  });

  it("should have hooks in the coolant domain", () => {
    const coolantHooks = result.hookRules.filter((r) => r.domain === "CAM-Coolant");
    expect(coolantHooks.length).toBeGreaterThanOrEqual(1);
    expect(coolantHooks[0].paramName).toBe("pressure");
    expect(coolantHooks[0].minSafe).toBe(40);
    expect(coolantHooks[0].maxSafe).toBe(300);
  });

  // ── Hook rule value validation ──

  it("L/D ratio hook should have correct bounds", () => {
    const ldHook = result.hookRules.find(
      (r) => r.paramName === "ld_ratio_limit" && r.domain === "CAM-Drilling"
    );
    expect(ldHook).toBeDefined();
    expect(ldHook!.minSafe).toBe(3);
    expect(ldHook!.maxSafe).toBe(12);
    expect(ldHook!.severity).toBe("CRITICAL");
  });

  it("MAXX HPC radial engagement hook should have correct bounds", () => {
    const maxxHook = result.hookRules.find(
      (r) => r.paramName === "radial_engagement_pct" && r.domain === "CAM-3D-Advanced"
    );
    expect(maxxHook).toBeDefined();
    expect(maxxHook!.minSafe).toBe(5);
    expect(maxxHook!.maxSafe).toBe(40);
    expect(maxxHook!.severity).toBe("CRITICAL");
  });

  it("all hook rules should have non-empty descriptions", () => {
    for (const rule of result.hookRules) {
      expect(rule.description.length).toBeGreaterThan(10);
    }
  });

  it("all hook rules should have valid severity", () => {
    for (const rule of result.hookRules) {
      expect(["CRITICAL", "WARNING"]).toContain(rule.severity);
    }
  });

  // ── Parameter table introspection ──

  it("peck_drill skill should have first_peck_depth in parameterTable", () => {
    const peckSkill = result.skills.find((s) => s.name === "peck_drill");
    expect(peckSkill).toBeDefined();
    const firstPeckParam = peckSkill!.parameterTable.find((p) => p.name === "first_peck_depth");
    expect(firstPeckParam).toBeDefined();
    expect(firstPeckParam!.type).toBe("number");
    expect(firstPeckParam!.unit).toBe("mm");
  });

  it("pocket skill should have stepdown and stepover in parameterTable", () => {
    const pocketSkill = result.skills.find((s) => s.name === "pocket");
    expect(pocketSkill).toBeDefined();
    const stepdownParam = pocketSkill!.parameterTable.find((p) => p.name === "stepdown");
    expect(stepdownParam).toBeDefined();
    const stepoverParam = pocketSkill!.parameterTable.find((p) => p.name === "stepover");
    expect(stepoverParam).toBeDefined();
  });
});
