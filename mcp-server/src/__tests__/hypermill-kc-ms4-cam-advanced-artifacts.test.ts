/**
 * Tests for HyperMillCAMAdvancedArtifactGeneratorEngine (U-HKC27)
 *
 * Validates that the CAM advanced artifact batch generator produces correct
 * skill templates, AC Python scripts, and DFM hook rules from all 7
 * CAM advanced schema sources (5-axis tool axis, collision, blade,
 * surface quality, turning, probing, grinding).
 */

import { describe, it, expect } from "vitest";
import {
  hyperMillCAMAdvancedArtifactGeneratorEngine,
  type CAMAdvancedArtifactResult,
} from "../engines/hypermill/HyperMillCAMAdvancedArtifactGeneratorEngine.js";

describe("HyperMillCAMAdvancedArtifactGeneratorEngine", () => {
  const result: CAMAdvancedArtifactResult = hyperMillCAMAdvancedArtifactGeneratorEngine.generate();

  // ── Summary count assertions ──

  it("should produce at least 82 total schema types (13+13+15+7+18+8+8)", () => {
    expect(result.summary.totalSchemaTypes).toBeGreaterThanOrEqual(82);
  });

  it("should produce at least 800 total params across all domains", () => {
    expect(result.summary.totalParams).toBeGreaterThanOrEqual(800);
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

  it("should contain specific 5-axis tool axis skill types", () => {
    const skillNames = result.skills.map((s) => s.name);
    expect(skillNames).toContain("swarf_cutting");
    expect(skillNames).toContain("point_milling");
    expect(skillNames).toContain("blade_roughing");
    expect(skillNames).toContain("impeller_finishing");
  });

  it("should contain specific 5-axis blade skill types", () => {
    const skillNames = result.skills.map((s) => s.name);
    expect(skillNames).toContain("blade_rough");
    expect(skillNames).toContain("blade_finish");
    expect(skillNames).toContain("impeller_rough");
    expect(skillNames).toContain("blisk_finish");
  });

  it("should contain specific turning skill types", () => {
    const skillNames = result.skills.map((s) => s.name);
    expect(skillNames).toContain("od_rough");
    expect(skillNames).toContain("od_finish");
    expect(skillNames).toContain("od_thread");
    expect(skillNames).toContain("parting");
  });

  it("should contain specific probing skill types", () => {
    const skillNames = result.skills.map((s) => s.name);
    expect(skillNames).toContain("setup_probe");
    expect(skillNames).toContain("bore_probe");
    expect(skillNames).toContain("tool_breakage");
    expect(skillNames).toContain("in_process_verify");
  });

  it("should contain specific grinding skill types", () => {
    const skillNames = result.skills.map((s) => s.name);
    expect(skillNames).toContain("surface_grinding");
    expect(skillNames).toContain("creep_feed");
    expect(skillNames).toContain("cylindrical_od");
  });

  // ── AC Python script validation ──

  it("every script should contain 'hm.' prefix", () => {
    for (const script of result.acPythonScripts) {
      expect(script.script).toContain("hm.");
    }
  });

  it("5-axis tool axis scripts should use 'hm.5x.' namespace", () => {
    const axisScripts = result.acPythonScripts.filter(
      (s) => s.domain === "CAM-5Axis-ToolAxis"
    );
    expect(axisScripts.length).toBe(13);
    for (const s of axisScripts) {
      expect(s.script).toMatch(/^hm\.5x\./);
    }
  });

  it("5-axis collision scripts should use 'hm.5x.collision.' namespace", () => {
    const collisionScripts = result.acPythonScripts.filter(
      (s) => s.domain === "CAM-5Axis-Collision"
    );
    expect(collisionScripts.length).toBe(13);
    for (const s of collisionScripts) {
      expect(s.script).toMatch(/^hm\.5x\.collision\./);
    }
  });

  it("5-axis blade scripts should use 'hm.5x.blade.' namespace", () => {
    const bladeScripts = result.acPythonScripts.filter(
      (s) => s.domain === "CAM-5Axis-Blade"
    );
    expect(bladeScripts.length).toBe(15);
    for (const s of bladeScripts) {
      expect(s.script).toMatch(/^hm\.5x\.blade\./);
    }
  });

  it("turning scripts should use 'hm.turning.' namespace", () => {
    const turningScripts = result.acPythonScripts.filter(
      (s) => s.domain === "CAM-Turning"
    );
    expect(turningScripts.length).toBe(18);
    for (const s of turningScripts) {
      expect(s.script).toMatch(/^hm\.turning\./);
    }
  });

  it("probing scripts should use 'hm.probe.' namespace", () => {
    const probeScripts = result.acPythonScripts.filter(
      (s) => s.domain === "CAM-Probing"
    );
    expect(probeScripts.length).toBe(8);
    for (const s of probeScripts) {
      expect(s.script).toMatch(/^hm\.probe\./);
    }
  });

  it("grinding scripts should use 'hm.grind.' or 'hm.misc.' namespace", () => {
    const grindScripts = result.acPythonScripts.filter(
      (s) => s.domain === "CAM-Grinding"
    );
    expect(grindScripts.length).toBe(8);
    for (const s of grindScripts) {
      expect(s.script).toMatch(/^hm\.(grind|misc)\./);
    }
  });

  // ── Hook rule domain coverage ──

  it("should have hooks in the 5-axis tool axis domain", () => {
    const axisHooks = result.hookRules.filter((r) => r.domain === "CAM-5Axis-ToolAxis");
    expect(axisHooks.length).toBeGreaterThanOrEqual(2);
    const paramNames = axisHooks.map((r) => r.paramName);
    expect(paramNames).toContain("tilt_angle");
    expect(paramNames).toContain("lead_angle");
  });

  it("should have hooks in the 5-axis collision domain", () => {
    const collisionHooks = result.hookRules.filter((r) => r.domain === "CAM-5Axis-Collision");
    expect(collisionHooks.length).toBeGreaterThanOrEqual(3);
    const paramNames = collisionHooks.map((r) => r.paramName);
    expect(paramNames).toContain("tilt_limit_min");
    expect(paramNames).toContain("tilt_limit_max");
    expect(paramNames).toContain("collision_distance");
  });

  it("should have hooks in the 5-axis blade domain", () => {
    const bladeHooks = result.hookRules.filter((r) => r.domain === "CAM-5Axis-Blade");
    expect(bladeHooks.length).toBeGreaterThanOrEqual(2);
    const paramNames = bladeHooks.map((r) => r.paramName);
    expect(paramNames).toContain("blade_cusp_height");
    expect(paramNames).toContain("channel_type");
  });

  it("should have hooks in the 5-axis surface quality domain", () => {
    const sqHooks = result.hookRules.filter((r) => r.domain === "CAM-5Axis-SurfaceQuality");
    expect(sqHooks.length).toBeGreaterThanOrEqual(1);
    expect(sqHooks[0].paramName).toBe("target_height");
  });

  it("should have hooks in the turning domain", () => {
    const turningHooks = result.hookRules.filter((r) => r.domain === "CAM-Turning");
    expect(turningHooks.length).toBeGreaterThanOrEqual(3);
    const paramNames = turningHooks.map((r) => r.paramName);
    expect(paramNames).toContain("s_max_clamp");
    expect(paramNames).toContain("nose_radius");
    expect(paramNames).toContain("pitch");
  });

  it("should have hooks in the probing domain", () => {
    const probeHooks = result.hookRules.filter((r) => r.domain === "CAM-Probing");
    expect(probeHooks.length).toBeGreaterThanOrEqual(1);
    expect(probeHooks[0].paramName).toBe("approach_feed");
    expect(probeHooks[0].severity).toBe("CRITICAL");
  });

  it("should have hooks in the grinding domain", () => {
    const grindHooks = result.hookRules.filter((r) => r.domain === "CAM-Grinding");
    expect(grindHooks.length).toBeGreaterThanOrEqual(3);
    const paramNames = grindHooks.map((r) => r.paramName);
    expect(paramNames).toContain("depth_of_cut");
    expect(paramNames).toContain("burn_risk_threshold");
    expect(paramNames).toContain("depth_per_pass");
  });

  // ── Hook rule value validation ──

  it("collision distance hook should have correct bounds", () => {
    const cdHook = result.hookRules.find(
      (r) => r.paramName === "collision_distance" && r.domain === "CAM-5Axis-Collision"
    );
    expect(cdHook).toBeDefined();
    expect(cdHook!.minSafe).toBe(0.5);
    expect(cdHook!.maxSafe).toBe(50);
    expect(cdHook!.severity).toBe("CRITICAL");
  });

  it("blade cusp height hook should have correct bounds", () => {
    const cuspHook = result.hookRules.find(
      (r) => r.paramName === "blade_cusp_height" && r.domain === "CAM-5Axis-Blade"
    );
    expect(cuspHook).toBeDefined();
    expect(cuspHook!.minSafe).toBe(0.002);
    expect(cuspHook!.maxSafe).toBe(0.1);
    expect(cuspHook!.severity).toBe("CRITICAL");
  });

  it("CSS max RPM clamp hook should have correct bounds", () => {
    const sMaxHook = result.hookRules.find(
      (r) => r.paramName === "s_max_clamp" && r.domain === "CAM-Turning"
    );
    expect(sMaxHook).toBeDefined();
    expect(sMaxHook!.minSafe).toBe(100);
    expect(sMaxHook!.maxSafe).toBe(12000);
    expect(sMaxHook!.severity).toBe("CRITICAL");
  });

  it("turning nose radius hook should have correct bounds", () => {
    const nrHook = result.hookRules.find(
      (r) => r.paramName === "nose_radius" && r.domain === "CAM-Turning"
    );
    expect(nrHook).toBeDefined();
    expect(nrHook!.minSafe).toBe(0.1);
    expect(nrHook!.maxSafe).toBe(3.2);
    expect(nrHook!.severity).toBe("CRITICAL");
  });

  it("probe approach feed hook should have correct bounds", () => {
    const probeHook = result.hookRules.find(
      (r) => r.paramName === "approach_feed" && r.domain === "CAM-Probing"
    );
    expect(probeHook).toBeDefined();
    expect(probeHook!.minSafe).toBe(50);
    expect(probeHook!.maxSafe).toBe(2000);
    expect(probeHook!.severity).toBe("CRITICAL");
  });

  it("grinding burn risk threshold hook should have correct bounds", () => {
    const burnHook = result.hookRules.find(
      (r) => r.paramName === "burn_risk_threshold" && r.domain === "CAM-Grinding"
    );
    expect(burnHook).toBeDefined();
    expect(burnHook!.minSafe).toBe(0.3);
    expect(burnHook!.maxSafe).toBe(0.95);
    expect(burnHook!.severity).toBe("CRITICAL");
  });

  it("threading feed sync hook should have correct bounds", () => {
    const pitchHook = result.hookRules.find(
      (r) => r.paramName === "pitch" && r.domain === "CAM-Turning"
    );
    expect(pitchHook).toBeDefined();
    expect(pitchHook!.minSafe).toBe(0.2);
    expect(pitchHook!.maxSafe).toBe(6.0);
    expect(pitchHook!.severity).toBe("CRITICAL");
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

  it("od_rough skill should have s_max_clamp in parameterTable", () => {
    const odSkill = result.skills.find((s) => s.name === "od_rough" && s.domain === "CAM-Turning");
    expect(odSkill).toBeDefined();
    const sMaxParam = odSkill!.parameterTable.find((p) => p.name === "s_max_clamp");
    expect(sMaxParam).toBeDefined();
    expect(sMaxParam!.type).toBe("number");
    expect(sMaxParam!.unit).toBe("RPM");
  });

  it("setup_probe skill should have approach_feed in parameterTable", () => {
    const probeSkill = result.skills.find((s) => s.name === "setup_probe" && s.domain === "CAM-Probing");
    expect(probeSkill).toBeDefined();
    const feedParam = probeSkill!.parameterTable.find((p) => p.name === "approach_feed");
    expect(feedParam).toBeDefined();
    expect(feedParam!.type).toBe("number");
    expect(feedParam!.unit).toBe("mm/min");
  });

  it("surface_grinding skill should have depth_per_pass in parameterTable", () => {
    const grindSkill = result.skills.find((s) => s.name === "surface_grinding" && s.domain === "CAM-Grinding");
    expect(grindSkill).toBeDefined();
    const depthParam = grindSkill!.parameterTable.find((p) => p.name === "depth_per_pass");
    expect(depthParam).toBeDefined();
    expect(depthParam!.type).toBe("number");
    expect(depthParam!.unit).toBe("mm");
  });

  it("blade_rough skill should have channel_type in parameterTable", () => {
    const bladeSkill = result.skills.find((s) => s.name === "blade_rough" && s.domain === "CAM-5Axis-Blade");
    expect(bladeSkill).toBeDefined();
    const channelParam = bladeSkill!.parameterTable.find((p) => p.name === "channel_type");
    expect(channelParam).toBeDefined();
    expect(channelParam!.type).toBe("enum");
  });

  it("swarf_cutting (collision) skill should have collision_distance in parameterTable", () => {
    const collSkill = result.skills.find(
      (s) => s.name === "swarf_cutting" && s.domain === "CAM-5Axis-Collision"
    );
    expect(collSkill).toBeDefined();
    const cdParam = collSkill!.parameterTable.find((p) => p.name === "collision_distance");
    expect(cdParam).toBeDefined();
    expect(cdParam!.type).toBe("number");
    expect(cdParam!.unit).toBe("mm");
  });
});
