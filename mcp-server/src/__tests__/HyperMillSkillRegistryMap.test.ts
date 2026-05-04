/**
 * HyperMillSkillRegistryMap tests — CAM-EXHAUST-MS0 / U-CAM-HM-SKILLREG-TESTS-01
 *
 * Coverage:
 *   1. listSkills: 15 skills registered
 *   2. getSkill: name lookup + null on miss
 *   3. getEngineMap: { skillName → engineDeps[] }
 *   4. byCategory: core (8) + operational (7)
 *   5. byEngine: skills depending on a given engine class
 *   6. byEffort: LOW / MEDIUM / HIGH partitioning
 *   7. stats: aggregate counts by category and effort tier
 *   8. Each skill has correct shape (primaryAction in actions[], etc.)
 *
 * Strict legitimacy: concrete assertions, named constants.
 */

import { describe, it, expect } from "vitest";
import {
  HyperMillSkillRegistryMap,
  hyperMillSkillRegistryMap,
} from "../engines/HyperMillSkillRegistryMap.js";

const TOTAL_SKILLS = 15;
const CORE_SKILLS = 8;
const OPERATIONAL_SKILLS = 7;

describe("HyperMillSkillRegistryMap — class shape", () => {
  it("exports class + singleton", () => {
    expect(typeof HyperMillSkillRegistryMap).toBe("function");
    expect(hyperMillSkillRegistryMap instanceof HyperMillSkillRegistryMap).toBe(true);
  });
});

describe("HyperMillSkillRegistryMap — listSkills()", () => {
  it("returns 15 skills", () => {
    expect(hyperMillSkillRegistryMap.listSkills().length).toBe(TOTAL_SKILLS);
  });

  it("every skill has required fields populated", () => {
    hyperMillSkillRegistryMap.listSkills().forEach((s) => {
      expect(typeof s.name).toBe("string");
      expect(s.name.startsWith("hypermill-")).toBe(true);
      expect(typeof s.description).toBe("string");
      expect(typeof s.primaryAction).toBe("string");
      expect(Array.isArray(s.actions)).toBe(true);
      expect(s.actions.length).toBeGreaterThan(0);
      expect(Array.isArray(s.engineDependencies)).toBe(true);
      expect(s.engineDependencies.length).toBeGreaterThan(0);
      expect(["LOW", "MEDIUM", "HIGH"]).toContain(s.effort);
      expect(["core", "operational"]).toContain(s.category);
    });
  });

  it("primaryAction is included in actions[]", () => {
    hyperMillSkillRegistryMap.listSkills().forEach((s) => {
      expect(s.actions).toContain(s.primaryAction);
    });
  });

  it("skill names are unique", () => {
    const names = hyperMillSkillRegistryMap.listSkills().map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("HyperMillSkillRegistryMap — getSkill()", () => {
  it("finds hypermill-material-lookup", () => {
    const s = hyperMillSkillRegistryMap.getSkill("hypermill-material-lookup");
    expect(s!.primaryAction).toBe("cam_hypermill_material_to_physics");
    expect(s!.engineDependencies).toContain("HyperMillMaterialPhysicsBridge");
    expect(s!.category).toBe("core");
    expect(s!.effort).toBe("LOW");
  });

  it("finds hypermill-full-job (orchestrator)", () => {
    const s = hyperMillSkillRegistryMap.getSkill("hypermill-full-job");
    expect(s!.category).toBe("operational");
    expect(s!.effort).toBe("HIGH");
    expect(s!.engineDependencies.length).toBeGreaterThanOrEqual(5);
  });

  it("returns null on unknown skill", () => {
    expect(hyperMillSkillRegistryMap.getSkill("nonexistent-skill")).toBe(null);
  });

  it("returns null on empty string", () => {
    expect(hyperMillSkillRegistryMap.getSkill("")).toBe(null);
  });
});

describe("HyperMillSkillRegistryMap — getEngineMap()", () => {
  it("returns map for all 15 skills", () => {
    const map = hyperMillSkillRegistryMap.getEngineMap();
    expect(Object.keys(map).length).toBe(TOTAL_SKILLS);
  });

  it("hypermill-material-lookup map entry includes HyperMillMaterialPhysicsBridge", () => {
    const map = hyperMillSkillRegistryMap.getEngineMap();
    expect(map["hypermill-material-lookup"]).toContain("HyperMillMaterialPhysicsBridge");
  });

  it("every map value is a non-empty array", () => {
    const map = hyperMillSkillRegistryMap.getEngineMap();
    Object.values(map).forEach((deps) => {
      expect(Array.isArray(deps)).toBe(true);
      expect(deps.length).toBeGreaterThan(0);
    });
  });
});

describe("HyperMillSkillRegistryMap — byCategory()", () => {
  it("returns 8 core skills", () => {
    const r = hyperMillSkillRegistryMap.byCategory("core");
    expect(r.length).toBe(CORE_SKILLS);
    r.forEach((s) => expect(s.category).toBe("core"));
  });

  it("returns 7 operational skills", () => {
    const r = hyperMillSkillRegistryMap.byCategory("operational");
    expect(r.length).toBe(OPERATIONAL_SKILLS);
    r.forEach((s) => expect(s.category).toBe("operational"));
  });
});

describe("HyperMillSkillRegistryMap — byEngine()", () => {
  it("finds skills depending on HyperMillCycleParameterPipeline", () => {
    const r = hyperMillSkillRegistryMap.byEngine("HyperMillCycleParameterPipeline");
    expect(r.length).toBeGreaterThan(0);
    r.forEach((s) => {
      const deps = s.engineDependencies.map((d) => d.toLowerCase());
      expect(deps.some((d) => d.includes("hypermillcycleparameterpipeline"))).toBe(true);
    });
  });

  it("is case-insensitive", () => {
    const upper = hyperMillSkillRegistryMap.byEngine("HYPERMILLSAFETYHOOKS");
    const lower = hyperMillSkillRegistryMap.byEngine("hypermillsafetyhooks");
    expect(upper.length).toBe(lower.length);
  });

  it("partial-name matches (substring)", () => {
    const r = hyperMillSkillRegistryMap.byEngine("Material");
    expect(r.length).toBeGreaterThan(0);
    r.forEach((s) => {
      const deps = s.engineDependencies.join(" ").toLowerCase();
      expect(deps.includes("material")).toBe(true);
    });
  });

  it("returns empty for nonsense engine name", () => {
    expect(hyperMillSkillRegistryMap.byEngine("xyzzy_unobtainium_engine")).toEqual([]);
  });
});

describe("HyperMillSkillRegistryMap — byEffort()", () => {
  it("returns LOW-effort skills", () => {
    const low = hyperMillSkillRegistryMap.byEffort("LOW");
    expect(low.length).toBeGreaterThan(0);
    low.forEach((s) => expect(s.effort).toBe("LOW"));
  });

  it("returns MEDIUM-effort skills", () => {
    const med = hyperMillSkillRegistryMap.byEffort("MEDIUM");
    expect(med.length).toBeGreaterThan(0);
    med.forEach((s) => expect(s.effort).toBe("MEDIUM"));
  });

  it("returns HIGH-effort skills", () => {
    const high = hyperMillSkillRegistryMap.byEffort("HIGH");
    expect(high.length).toBeGreaterThan(0);
    high.forEach((s) => expect(s.effort).toBe("HIGH"));
  });

  it("byEffort partition sums to total", () => {
    const low = hyperMillSkillRegistryMap.byEffort("LOW").length;
    const med = hyperMillSkillRegistryMap.byEffort("MEDIUM").length;
    const high = hyperMillSkillRegistryMap.byEffort("HIGH").length;
    expect(low + med + high).toBe(TOTAL_SKILLS);
  });
});

describe("HyperMillSkillRegistryMap — stats()", () => {
  it("total = 15, core = 8, operational = 7", () => {
    const s = hyperMillSkillRegistryMap.stats();
    expect(s.total).toBe(TOTAL_SKILLS);
    expect(s.core).toBe(CORE_SKILLS);
    expect(s.operational).toBe(OPERATIONAL_SKILLS);
    expect(s.core + s.operational).toBe(s.total);
  });

  it("byEffort sums to total", () => {
    const s = hyperMillSkillRegistryMap.stats();
    const sum = s.byEffort.LOW + s.byEffort.MEDIUM + s.byEffort.HIGH;
    expect(sum).toBe(s.total);
  });

  it("byEffort counts non-negative integers", () => {
    const s = hyperMillSkillRegistryMap.stats();
    (["LOW", "MEDIUM", "HIGH"] as const).forEach((e) => {
      expect(s.byEffort[e]).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(s.byEffort[e])).toBe(true);
    });
  });
});
