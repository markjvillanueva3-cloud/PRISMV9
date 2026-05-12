/**
 * HM-KC-MS9-S1 / U-HKC47: Skill Template + AC Script Validation
 *
 * Validates all generated artifacts from the 7 artifact generator engines:
 * - Skill templates: must have name, domain, description, parameter table, AC setter
 * - AC Python scripts: must reference valid hm.* API namespace
 * - Hook rules: must have valid severity, ranges, and descriptions
 * - Cross-generator consistency: no orphaned references, types match
 *
 * @milestone HM-KC-MS9/U-HKC47
 */

import { describe, it, expect } from "vitest";

import {
  hyperMillCADArtifactGeneratorEngine,
  type CADArtifactResult,
  type SkillTemplate,
  type ACPythonScript,
  type HookRule,
} from "../engines/hypermill/HyperMillCADArtifactGeneratorEngine.js";

import { hyperMillFixtureArtifactGeneratorEngine } from "../engines/hypermill/HyperMillFixtureArtifactGeneratorEngine.js";
import { hyperMillCAMCoreArtifactGeneratorEngine } from "../engines/hypermill/HyperMillCAMCoreArtifactGeneratorEngine.js";
import { hyperMillCAMAdvancedArtifactGeneratorEngine } from "../engines/hypermill/HyperMillCAMAdvancedArtifactGeneratorEngine.js";
import { hyperMillLinkingArtifactGeneratorEngine } from "../engines/hypermill/HyperMillLinkingArtifactGeneratorEngine.js";
import { hyperMillSimNCArtifactGeneratorEngine } from "../engines/hypermill/HyperMillSimNCArtifactGeneratorEngine.js";
import { hyperMillSettingsArtifactGeneratorEngine } from "../engines/hypermill/HyperMillSettingsArtifactGeneratorEngine.js";

// ── Generate all artifacts once ──────────────────────────────────────────────

interface GeneratorEntry {
  name: string;
  result: CADArtifactResult;
}

const GENERATORS: GeneratorEntry[] = [
  { name: "CAD", result: hyperMillCADArtifactGeneratorEngine.generate() },
  { name: "Fixture", result: hyperMillFixtureArtifactGeneratorEngine.generate() },
  { name: "CAM-Core", result: hyperMillCAMCoreArtifactGeneratorEngine.generate() },
  { name: "CAM-Advanced", result: hyperMillCAMAdvancedArtifactGeneratorEngine.generate() },
  { name: "Linking", result: hyperMillLinkingArtifactGeneratorEngine.generate() },
  { name: "Sim-NC", result: hyperMillSimNCArtifactGeneratorEngine.generate() },
  { name: "Settings", result: hyperMillSettingsArtifactGeneratorEngine.generate() },
];

// ── Aggregate counts ────────────────────────────────────────────────────────

const ALL_SKILLS = GENERATORS.flatMap((g) => g.result.skills);
const ALL_SCRIPTS = GENERATORS.flatMap((g) => g.result.acPythonScripts);
const ALL_HOOKS = GENERATORS.flatMap((g) => g.result.hookRules);

// ── Global count tests ───────────────────────────────────────────────────────

describe("HM-KC-MS9-S1/U-HKC47: Artifact Counts", () => {
  it("7 generators produce artifacts", () => {
    expect(GENERATORS.length).toBe(7);
  });

  it("total skill templates >= 200", () => {
    expect(ALL_SKILLS.length).toBeGreaterThanOrEqual(200);
  });

  it("total AC Python scripts >= 200", () => {
    expect(ALL_SCRIPTS.length).toBeGreaterThanOrEqual(200);
  });

  it("skill count equals script count (1:1 mapping)", () => {
    expect(ALL_SKILLS.length).toBe(ALL_SCRIPTS.length);
  });

  it("total hook rules >= 10", () => {
    expect(ALL_HOOKS.length).toBeGreaterThanOrEqual(10);
  });

  it("total parameters across all generators >= 2000", () => {
    const totalParams = GENERATORS.reduce((sum, g) => sum + g.result.summary.totalParams, 0);
    expect(totalParams).toBeGreaterThanOrEqual(2000);
  });
});

// ── Per-generator validation ─────────────────────────────────────────────────

describe("HM-KC-MS9-S1/U-HKC47: Per-Generator Validation", () => {
  for (const gen of GENERATORS) {
    describe(`[${gen.name}] Generator`, () => {
      it("produces at least 1 skill template", () => {
        expect(gen.result.skills.length).toBeGreaterThanOrEqual(1);
      });

      it("produces matching skill and script counts", () => {
        expect(gen.result.skills.length).toBe(gen.result.acPythonScripts.length);
      });

      it("summary counts are consistent", () => {
        expect(gen.result.summary.totalSkills).toBe(gen.result.skills.length);
        expect(gen.result.summary.totalScripts).toBe(gen.result.acPythonScripts.length);
        expect(gen.result.summary.totalHooks).toBe(gen.result.hookRules.length);
        // totalSchemaTypes is optional — only some generators include it
        if (gen.result.summary.totalSchemaTypes !== undefined) {
          expect(gen.result.summary.totalSchemaTypes).toBe(gen.result.skills.length);
        }
      });

      it("summary totalParams > 0", () => {
        expect(gen.result.summary.totalParams).toBeGreaterThan(0);
      });
    });
  }
});

// ── Skill template structure validation ──────────────────────────────────────

describe("HM-KC-MS9-S1/U-HKC47: Skill Template Structure", () => {
  it("every skill has a non-empty name", () => {
    for (const skill of ALL_SKILLS) {
      expect(skill.name).toBeTruthy();
      expect(skill.name.length).toBeGreaterThan(0);
    }
  });

  it("every skill has a non-empty domain", () => {
    for (const skill of ALL_SKILLS) {
      expect(skill.domain).toBeTruthy();
      expect(skill.domain.length).toBeGreaterThan(0);
    }
  });

  it("every skill has a non-empty description", () => {
    for (const skill of ALL_SKILLS) {
      expect(skill.description).toBeTruthy();
      expect(skill.description.length).toBeGreaterThan(5);
    }
  });

  it("every skill has a parameter table with at least 1 entry", () => {
    for (const skill of ALL_SKILLS) {
      expect(skill.parameterTable).toBeDefined();
      expect(skill.parameterTable.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("every parameter has name, type, range, defaultValue, unit fields", () => {
    for (const skill of ALL_SKILLS) {
      for (const param of skill.parameterTable) {
        expect(typeof param.name).toBe("string");
        expect(param.name.length).toBeGreaterThan(0);
        expect(typeof param.type).toBe("string");
        expect(param.type.length).toBeGreaterThan(0);
        expect(typeof param.range).toBe("string");
        expect(typeof param.defaultValue).toBe("string");
        expect(typeof param.unit).toBe("string");
      }
    }
  });

  it("every skill has a non-empty acPythonSetter", () => {
    for (const skill of ALL_SKILLS) {
      expect(skill.acPythonSetter).toBeTruthy();
      expect(skill.acPythonSetter.length).toBeGreaterThan(3);
    }
  });

  it("every skill's dfmWarnings is an array (when present)", () => {
    for (const skill of ALL_SKILLS) {
      if (skill.dfmWarnings !== undefined) {
        expect(Array.isArray(skill.dfmWarnings)).toBe(true);
      }
    }
  });
});

// ── AC Python script validation ──────────────────────────────────────────────

describe("HM-KC-MS9-S1/U-HKC47: AC Python Script Validation", () => {
  it("every script has a non-empty name", () => {
    for (const script of ALL_SCRIPTS) {
      expect(script.name).toBeTruthy();
    }
  });

  it("every script has a non-empty domain", () => {
    for (const script of ALL_SCRIPTS) {
      expect(script.domain).toBeTruthy();
    }
  });

  it("every script references hm.* or SetParameter API", () => {
    for (const script of ALL_SCRIPTS) {
      expect(script.script).toBeTruthy();
      const valid =
        script.script.startsWith("hm.") ||
        script.script.includes("SetParameter") ||
        script.script.includes("set_parameter") ||
        script.script.includes("hypermill");
      expect(valid).toBe(true);
    }
  });

  it("no duplicate script names within same domain", () => {
    const seen = new Map<string, Set<string>>();
    for (const script of ALL_SCRIPTS) {
      if (!seen.has(script.domain)) seen.set(script.domain, new Set());
      const domainSet = seen.get(script.domain)!;
      expect(domainSet.has(script.name)).toBe(false);
      domainSet.add(script.name);
    }
  });
});

// ── Hook rule validation ────────────────────────────────────────────────────

describe("HM-KC-MS9-S1/U-HKC47: Hook Rule Validation", () => {
  it("every hook has a valid severity", () => {
    const validSeverities = new Set(["CRITICAL", "WARNING", "BLOCKING"]);
    for (const hook of ALL_HOOKS) {
      expect(validSeverities.has(hook.severity)).toBe(true);
    }
  });

  it("every hook has a non-empty paramName or parameter field", () => {
    for (const hook of ALL_HOOKS) {
      // Generators may use paramName or parameter field
      const name = (hook as any).paramName ?? (hook as any).parameter ?? (hook as any).name;
      expect(name).toBeTruthy();
    }
  });

  it("every hook has a non-empty domain", () => {
    for (const hook of ALL_HOOKS) {
      expect(hook.domain).toBeTruthy();
    }
  });

  it("every hook has a non-empty description", () => {
    for (const hook of ALL_HOOKS) {
      expect(hook.description).toBeTruthy();
      expect(hook.description.length).toBeGreaterThan(10);
    }
  });

  it("every hook with minSafe/maxSafe has minSafe <= maxSafe", () => {
    for (const hook of ALL_HOOKS) {
      if (hook.minSafe !== undefined && hook.maxSafe !== undefined) {
        expect(hook.minSafe).toBeLessThanOrEqual(hook.maxSafe);
      }
    }
  });

  it("CRITICAL hooks cover safety-critical parameters", () => {
    const criticalHooks = ALL_HOOKS.filter((h) => h.severity === "CRITICAL");
    expect(criticalHooks.length).toBeGreaterThanOrEqual(3);
  });
});

// ── Cross-generator consistency ──────────────────────────────────────────────

describe("HM-KC-MS9-S1/U-HKC47: Cross-Generator Consistency", () => {
  it("all skill names are unique across generators (no duplicates)", () => {
    const seen = new Set<string>();
    for (const skill of ALL_SKILLS) {
      const qualifiedName = `${skill.domain}:${skill.name}`;
      expect(seen.has(qualifiedName)).toBe(false);
      seen.add(qualifiedName);
    }
  });

  it("every skill has a matching AC script with same name+domain", () => {
    const scriptKeys = new Set(
      ALL_SCRIPTS.map((s) => `${s.domain}:${s.name}`)
    );
    for (const skill of ALL_SKILLS) {
      const key = `${skill.domain}:${skill.name}`;
      expect(scriptKeys.has(key)).toBe(true);
    }
  });

  it("parameter types are valid Zod type names", () => {
    const validTypes = new Set([
      "number", "string", "boolean", "enum", "array",
      "literal", "object", "optional", "union", "default",
    ]);
    for (const skill of ALL_SKILLS) {
      for (const param of skill.parameterTable) {
        expect(validTypes.has(param.type)).toBe(true);
      }
    }
  });

  it("domains span all 7 generator groups", () => {
    const domains = new Set(ALL_SKILLS.map((s) => s.domain));
    expect(domains.size).toBeGreaterThanOrEqual(7);
  });
});

// ── Summary report ───────────────────────────────────────────────────────────

describe("HM-KC-MS9-S1/U-HKC47: Artifact Summary Report", () => {
  it("produces complete artifact summary", () => {
    const report = {
      generators: GENERATORS.length,
      totalSkills: ALL_SKILLS.length,
      totalScripts: ALL_SCRIPTS.length,
      totalHooks: ALL_HOOKS.length,
      totalParams: GENERATORS.reduce((s, g) => s + g.result.summary.totalParams, 0),
      byGenerator: GENERATORS.map((g) => ({
        name: g.name,
        skills: g.result.skills.length,
        hooks: g.result.hookRules.length,
        params: g.result.summary.totalParams,
      })),
      domains: [...new Set(ALL_SKILLS.map((s) => s.domain))].sort(),
      criticalHooks: ALL_HOOKS.filter((h) => h.severity === "CRITICAL").length,
      warningHooks: ALL_HOOKS.filter((h) => h.severity === "WARNING").length,
    };

    console.log("\n=== HM-KC-MS9 Artifact Validation Report ===");
    console.log(`Generators: ${report.generators}`);
    console.log(`Total skills: ${report.totalSkills}`);
    console.log(`Total AC scripts: ${report.totalScripts}`);
    console.log(`Total hook rules: ${report.totalHooks} (${report.criticalHooks} CRITICAL, ${report.warningHooks} WARNING)`);
    console.log(`Total parameters: ${report.totalParams}`);
    console.log("\nBy generator:");
    for (const g of report.byGenerator) {
      console.log(`  ${g.name}: ${g.skills} skills, ${g.hooks} hooks, ${g.params} params`);
    }
    console.log(`\nDomains: ${report.domains.join(", ")}`);

    // Threshold assertions
    expect(report.totalSkills).toBeGreaterThanOrEqual(200);
    expect(report.totalScripts).toBeGreaterThanOrEqual(200);
    expect(report.totalParams).toBeGreaterThanOrEqual(2000);
    expect(report.criticalHooks).toBeGreaterThanOrEqual(3);
  });
});
