/**
 * HyperMillSimNCArtifactGeneratorEngine — Unit Tests
 *
 * U-HKC35: Validates artifact generation from 40 schema types across
 * Simulation-Core (13), Simulation-Extended (12), and NC-Output (15) domains.
 *
 * @milestone HM-KC-MS6/U-HKC35
 */

import { describe, it, expect } from "vitest";
import {
  hyperMillSimNCArtifactGeneratorEngine,
  type SimNCArtifactResult,
} from "../engines/hypermill/HyperMillSimNCArtifactGeneratorEngine.js";

describe("HyperMillSimNCArtifactGeneratorEngine", () => {
  const result: SimNCArtifactResult = hyperMillSimNCArtifactGeneratorEngine.generate();

  // ── Count validations ──────────────────────────────────────────────────────

  it("generates at least 40 total schema types (13+12+15)", () => {
    expect(result.summary.totalSchemaTypes).toBeGreaterThanOrEqual(40);
    expect(result.summary.totalSchemaTypes).toBe(40);
  });

  it("generates exactly 40 skill templates", () => {
    expect(result.skills.length).toBe(40);
    expect(result.summary.totalSkills).toBe(40);
  });

  it("generates exactly 40 AC Python scripts", () => {
    expect(result.acPythonScripts.length).toBe(40);
    expect(result.summary.totalScripts).toBe(40);
  });

  it("generates at least 9 hook rules", () => {
    expect(result.hookRules.length).toBeGreaterThanOrEqual(9);
    expect(result.summary.totalHooks).toBeGreaterThanOrEqual(9);
  });

  it("reports correct totalParams across all 40 types", () => {
    // 13 sim-core types: 12+12+11+12+10+11+12+12+12+11+10+10+10 = 145
    // 12 sim-extended types: 8+9+8+10+8+9+8+8+8+6+8+7 = 97
    // 15 nc-output types: 7+7+8+8+10+12+12+11+10+10+10+10+10+10+10 = 145
    expect(result.summary.totalParams).toBe(145 + 97 + 145);
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

  it("every AC Python script contains \"hm.\" prefix", () => {
    for (const script of result.acPythonScripts) {
      expect(script.script).toContain("hm.");
    }
  });

  it("AC Python scripts cover all 3 domains", () => {
    const domains = new Set(result.acPythonScripts.map((s) => s.domain));
    expect(domains.size).toBe(3);
    expect(domains.has("Simulation-Core")).toBe(true);
    expect(domains.has("Simulation-Extended")).toBe(true);
    expect(domains.has("NC-Output")).toBe(true);
  });

  // ── Hook rule validations ──────────────────────────────────────────────────

  it("every hook rule has valid severity", () => {
    for (const rule of result.hookRules) {
      expect(["CRITICAL", "BLOCKING", "WARNING"]).toContain(rule.severity);
    }
  });

  it("has BLOCKING severity hooks", () => {
    const blockingRules = result.hookRules.filter((r) => r.severity === "BLOCKING");
    expect(blockingRules.length).toBeGreaterThanOrEqual(3);
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

  it("hook rules cover the 9 required parameters", () => {
    const ruleKeys = result.hookRules.map((r) => `${r.domain}::${r.paramName}`);

    expect(ruleKeys).toContain("Simulation-Core::collision_tolerance");
    expect(ruleKeys).toContain("Simulation-Core::halt_on_collision");
    expect(ruleKeys).toContain("Simulation-Core::gouge_tolerance");
    expect(ruleKeys).toContain("Simulation-Core::block_on_exceed");
    expect(ruleKeys).toContain("Simulation-Core::singularity_threshold");
    expect(ruleKeys).toContain("Simulation-Extended::flag_zero_feed");
    expect(ruleKeys).toContain("NC-Output::safe_start_block");
    expect(ruleKeys).toContain("Simulation-Core::max_spindle_speed");
    expect(ruleKeys).toContain("Simulation-Extended::max_load_pct");
  });

  // ── Domain-specific count checks ───────────────────────────────────────────

  it("Simulation-Core domain has 13 skills", () => {
    const coreSkills = result.skills.filter((s) => s.domain === "Simulation-Core");
    expect(coreSkills.length).toBe(13);
  });

  it("Simulation-Extended domain has 12 skills", () => {
    const extSkills = result.skills.filter((s) => s.domain === "Simulation-Extended");
    expect(extSkills.length).toBe(12);
  });

  it("NC-Output domain has 15 skills", () => {
    const ncSkills = result.skills.filter((s) => s.domain === "NC-Output");
    expect(ncSkills.length).toBe(15);
  });

  // ── Specific value spot checks ─────────────────────────────────────────────

  it("full_simulation skill has 12 params and DFM warnings for collision", () => {
    const fullSim = result.skills.find(
      (s) => s.name === "full_simulation" && s.domain === "Simulation-Core"
    );
    expect(fullSim).toBeDefined();
    expect(fullSim!.parameterTable.length).toBe(12);
    expect(fullSim!.dfmWarnings.length).toBeGreaterThan(0);
    expect(fullSim!.dfmWarnings.some((w) => w.includes("collision_tolerance"))).toBe(true);
  });

  it("gouge_detection skill has 11 params and BLOCKING DFM warning", () => {
    const gouge = result.skills.find(
      (s) => s.name === "gouge_detection" && s.domain === "Simulation-Core"
    );
    expect(gouge).toBeDefined();
    expect(gouge!.parameterTable.length).toBe(11);
    expect(gouge!.dfmWarnings.some((w) => w.includes("BLOCKING"))).toBe(true);
  });

  it("collision_tolerance hook rule has CRITICAL severity and 0.01-5.0 range", () => {
    const collisionRule = result.hookRules.find(
      (r) => r.paramName === "collision_tolerance" && r.domain === "Simulation-Core"
    );
    expect(collisionRule).toBeDefined();
    expect(collisionRule!.severity).toBe("CRITICAL");
    expect(collisionRule!.minSafe).toBe(0.01);
    expect(collisionRule!.maxSafe).toBe(5.0);
  });

  it("halt_on_collision hook rule has BLOCKING severity", () => {
    const haltRule = result.hookRules.find(
      (r) => r.paramName === "halt_on_collision" && r.domain === "Simulation-Core"
    );
    expect(haltRule).toBeDefined();
    expect(haltRule!.severity).toBe("BLOCKING");
  });

  it("gouge_tolerance hook rule has BLOCKING severity and 0.001-0.1 range", () => {
    const gougeRule = result.hookRules.find(
      (r) => r.paramName === "gouge_tolerance" && r.domain === "Simulation-Core"
    );
    expect(gougeRule).toBeDefined();
    expect(gougeRule!.severity).toBe("BLOCKING");
    expect(gougeRule!.minSafe).toBe(0.001);
    expect(gougeRule!.maxSafe).toBe(0.1);
  });

  it("configure_post skill references hm.nc.configure_post setter", () => {
    const configPost = result.skills.find(
      (s) => s.name === "configure_post" && s.domain === "NC-Output"
    );
    expect(configPost).toBeDefined();
    expect(configPost!.acPythonSetter).toBe("hm.nc.configure_post");
  });

  it("safe_start_block hook rule has CRITICAL severity", () => {
    const safeRule = result.hookRules.find(
      (r) => r.paramName === "safe_start_block" && r.domain === "NC-Output"
    );
    expect(safeRule).toBeDefined();
    expect(safeRule!.severity).toBe("CRITICAL");
  });

  it("max_load_pct hook rule has WARNING severity and 10-90 range", () => {
    const loadRule = result.hookRules.find(
      (r) => r.paramName === "max_load_pct" && r.domain === "Simulation-Extended"
    );
    expect(loadRule).toBeDefined();
    expect(loadRule!.severity).toBe("WARNING");
    expect(loadRule!.minSafe).toBe(10);
    expect(loadRule!.maxSafe).toBe(90);
  });
});
