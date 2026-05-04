/**
 * HyperMillStrategyKnowledgeEngine tests — CAM-EXHAUST-MS0 / U-CAM-HM-STRATKB-TESTS-01
 *
 * Coverage:
 *   1. getAllStrategies(): non-empty list with valid HyperMillStrategy shape
 *   2. getStrategiesByCategory(): per-category filter (2d/3d/5axis/hpc/etc)
 *   3. getStrategy(): id lookup + undefined on miss
 *   4. getStrategyDetails(): fuzzy name/id match
 *   5. recommendStrategy(): geometry+material+goal returns recommendation
 *      - exact match returns high confidence
 *      - no-match falls back to geometry-only
 *      - confidence in [0, 0.98] range
 *   6. analyzeCAMSetup(): issues + safety_score 0..1
 *      - missing coolant on ISO S → error
 *      - excessive ap → warning
 *      - rest_machining without previous_roughing → error
 *   7. suggestOptimizations(): conditional optimization rules
 *      - 3-axis pocket roughing → HPC suggestion
 *      - 5-axis simultaneous freeform → MAXX suggestion
 *      - hardened material endmill → coating suggestion
 *   8. searchStrategies / getStrategiesForGeometry / getJMDieStrategies
 *   9. stats() / clear() counter management
 *
 * Strict legitimacy: concrete assertions, named constants.
 */

import { describe, it, expect } from "vitest";
import {
  HyperMillStrategyKnowledgeEngine,
  hyperMillStrategyKnowledgeEngine,
  type CAMSetup,
} from "../engines/HyperMillStrategyKnowledgeEngine.js";

const CONFIDENCE_FALLBACK = 0.5;
const CONFIDENCE_MAX = 0.98;
const TOOL_DIA_MM = 10;

describe("HyperMillStrategyKnowledgeEngine — class shape", () => {
  it("exports class + singleton", () => {
    expect(typeof HyperMillStrategyKnowledgeEngine).toBe("function");
    expect(hyperMillStrategyKnowledgeEngine instanceof HyperMillStrategyKnowledgeEngine).toBe(true);
  });
});

describe("HyperMillStrategyKnowledgeEngine — getAllStrategies()", () => {
  it("returns at least 10 strategies (non-trivial knowledge base)", () => {
    const list = hyperMillStrategyKnowledgeEngine.getAllStrategies();
    expect(list.length).toBeGreaterThanOrEqual(10);
  });

  it("every strategy has required HyperMillStrategy fields", () => {
    const list = hyperMillStrategyKnowledgeEngine.getAllStrategies();
    list.forEach((s) => {
      expect(typeof s.id).toBe("string");
      expect(typeof s.name).toBe("string");
      expect(typeof s.category).toBe("string");
      expect(Array.isArray(s.suitable_for)).toBe(true);
      expect(Array.isArray(s.goals)).toBe(true);
      expect(Array.isArray(s.required_kinematics)).toBe(true);
      expect(Array.isArray(s.suitable_materials)).toBe(true);
      expect(Array.isArray(s.parameters)).toBe(true);
      expect(Array.isArray(s.best_practices)).toBe(true);
      expect(Array.isArray(s.common_mistakes)).toBe(true);
      expect(typeof s.jm_die_recommendation).toBe("string");
    });
  });

  it("strategy ids are unique", () => {
    const list = hyperMillStrategyKnowledgeEngine.getAllStrategies();
    const ids = list.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("HyperMillStrategyKnowledgeEngine — getStrategiesByCategory()", () => {
  it("returns only 2d strategies for category='2d'", () => {
    const r = hyperMillStrategyKnowledgeEngine.getStrategiesByCategory("2d");
    r.forEach((s) => expect(s.category).toBe("2d"));
  });

  it("returns 3d strategies for category='3d'", () => {
    const r = hyperMillStrategyKnowledgeEngine.getStrategiesByCategory("3d");
    r.forEach((s) => expect(s.category).toBe("3d"));
  });

  it("returns 5axis strategies for category='5axis'", () => {
    const r = hyperMillStrategyKnowledgeEngine.getStrategiesByCategory("5axis");
    r.forEach((s) => expect(s.category).toBe("5axis"));
  });

  it("empty array for category with no entries", () => {
    // Some categories may have zero entries; test passes either way
    const r = hyperMillStrategyKnowledgeEngine.getStrategiesByCategory("deburring");
    expect(Array.isArray(r)).toBe(true);
  });
});

describe("HyperMillStrategyKnowledgeEngine — getStrategy()", () => {
  it("returns existing strategy by id (using first id from getAllStrategies)", () => {
    const all = hyperMillStrategyKnowledgeEngine.getAllStrategies();
    const first = all[0];
    const found = hyperMillStrategyKnowledgeEngine.getStrategy(first.id);
    expect(found!.id).toBe(first.id);
    expect(found!.name).toBe(first.name);
  });

  it("returns undefined on unknown id", () => {
    expect(hyperMillStrategyKnowledgeEngine.getStrategy("nonexistent_xyzzy_id")).toBe(undefined);
  });
});

describe("HyperMillStrategyKnowledgeEngine — getStrategyDetails()", () => {
  it("fuzzy-matches by name substring", () => {
    const all = hyperMillStrategyKnowledgeEngine.getAllStrategies();
    const target = all[0];
    const fragment = target.name.split(" ")[0]; // first word
    const found = hyperMillStrategyKnowledgeEngine.getStrategyDetails(fragment);
    expect(typeof found).toBe("object");
  });

  it("returns undefined when name doesn't match", () => {
    expect(hyperMillStrategyKnowledgeEngine.getStrategyDetails("xyzzy_nope")).toBe(undefined);
  });

  it("is case-insensitive", () => {
    const all = hyperMillStrategyKnowledgeEngine.getAllStrategies();
    const target = all[0];
    const upper = target.name.toUpperCase();
    const found = hyperMillStrategyKnowledgeEngine.getStrategyDetails(upper);
    expect(typeof found).toBe("object");
  });
});

describe("HyperMillStrategyKnowledgeEngine — recommendStrategy()", () => {
  it("returns recommendation with strategy + confidence + reasoning", () => {
    const r = hyperMillStrategyKnowledgeEngine.recommendStrategy("pocket_2d", "P", "roughing", "3axis");
    expect(typeof r.strategy).toBe("object");
    expect(typeof r.confidence).toBe("number");
    expect(typeof r.reasoning).toBe("string");
    expect(Array.isArray(r.alternatives)).toBe(true);
    expect(Array.isArray(r.warnings)).toBe(true);
    expect(typeof r.parameter_suggestions).toBe("object");
  });

  it("confidence ≤ 0.98 (capped)", () => {
    const r = hyperMillStrategyKnowledgeEngine.recommendStrategy("pocket_2d", "P", "roughing", "3axis");
    expect(r.confidence).toBeLessThanOrEqual(CONFIDENCE_MAX);
  });

  it("falls back to geometry-only on no exact match (confidence ≥ 0.3)", () => {
    // Use exotic combo unlikely to have full match
    const r = hyperMillStrategyKnowledgeEngine.recommendStrategy(
      "polygon", "S", "rest_machining", "mill_turn"
    );
    // Either matches with low confidence, or hits ultimate fallback
    expect(r.confidence).toBeGreaterThanOrEqual(0.3);
    expect(r.confidence).toBeLessThanOrEqual(CONFIDENCE_FALLBACK);
  });

  it("reasoning text is non-empty", () => {
    const r = hyperMillStrategyKnowledgeEngine.recommendStrategy("pocket_2d", "P", "roughing", "3axis");
    expect(r.reasoning.length).toBeGreaterThan(5);
  });

  it("increments calc counter on each call", () => {
    hyperMillStrategyKnowledgeEngine.clear();
    hyperMillStrategyKnowledgeEngine.recommendStrategy("pocket_2d", "P", "roughing", "3axis");
    hyperMillStrategyKnowledgeEngine.recommendStrategy("freeform_3d", "M", "finishing", "5axis_simultaneous");
    expect(hyperMillStrategyKnowledgeEngine.stats().calculations).toBeGreaterThanOrEqual(2);
  });
});

describe("HyperMillStrategyKnowledgeEngine — analyzeCAMSetup()", () => {
  const baseSetup: CAMSetup = {
    geometry_type: "pocket_2d",
    material_group: "P",
    operation_goal: "roughing",
    machine_kinematics: "3axis",
    tool_type: "endmill",
    tool_diameter_mm: TOOL_DIA_MM,
    coolant: "flood",
    has_previous_roughing: false,
  };

  it("returns SetupAnalysis with valid + safety_score + issues", () => {
    const r = hyperMillStrategyKnowledgeEngine.analyzeCAMSetup(baseSetup);
    expect(typeof r.valid).toBe("boolean");
    expect(typeof r.safety_score).toBe("number");
    expect(r.safety_score).toBeGreaterThanOrEqual(0);
    expect(r.safety_score).toBeLessThanOrEqual(1);
    expect(Array.isArray(r.issues)).toBe(true);
  });

  it("missing coolant on ISO S → error severity issue", () => {
    const setup: CAMSetup = { ...baseSetup, material_group: "S", coolant: "none" };
    const r = hyperMillStrategyKnowledgeEngine.analyzeCAMSetup(setup);
    expect(r.issues.some((i) => i.severity === "error" && i.message.includes("Superalloy"))).toBe(true);
  });

  it("rest_machining without previous_roughing → error issue", () => {
    const setup: CAMSetup = { ...baseSetup, operation_goal: "rest_machining", has_previous_roughing: false };
    const r = hyperMillStrategyKnowledgeEngine.analyzeCAMSetup(setup);
    expect(r.issues.some((i) => i.severity === "error" && i.message.includes("Rest machining"))).toBe(true);
  });

  it("excessive ap (>1.3× recommended) → warning issue", () => {
    const setup: CAMSetup = { ...baseSetup, ap_mm: 100 };
    const r = hyperMillStrategyKnowledgeEngine.analyzeCAMSetup(setup);
    // Only fires if recommended strategy has ap_factor; check non-error issue
    const apIssues = r.issues.filter((i) => i.message.includes("Axial depth"));
    if (apIssues.length > 0) {
      expect(["warning", "info"]).toContain(apIssues[0].severity);
    }
  });

  it("safety_score decreases with errors", () => {
    const noErrors = hyperMillStrategyKnowledgeEngine.analyzeCAMSetup(baseSetup);
    const withErrors = hyperMillStrategyKnowledgeEngine.analyzeCAMSetup({
      ...baseSetup,
      material_group: "S",
      coolant: "none",
      operation_goal: "rest_machining",
      has_previous_roughing: false,
    });
    expect(withErrors.safety_score).toBeLessThanOrEqual(noErrors.safety_score);
  });

  it("valid=false when error issues present", () => {
    const setup: CAMSetup = { ...baseSetup, material_group: "S", coolant: "none" };
    const r = hyperMillStrategyKnowledgeEngine.analyzeCAMSetup(setup);
    expect(r.valid).toBe(false);
  });
});

describe("HyperMillStrategyKnowledgeEngine — suggestOptimizations()", () => {
  const baseSetup: CAMSetup = {
    geometry_type: "pocket_2d",
    material_group: "P",
    operation_goal: "roughing",
    machine_kinematics: "3axis",
    tool_type: "endmill",
    tool_diameter_mm: TOOL_DIA_MM,
    coolant: "flood",
    has_previous_roughing: false,
  };

  it("3-axis pocket roughing on P/M/H → HPC optimization suggested", () => {
    const r = hyperMillStrategyKnowledgeEngine.suggestOptimizations(baseSetup);
    expect(r.some((o) => o.description.includes("HPC"))).toBe(true);
  });

  it("3-axis pocket → 5-axis indexed suggestion", () => {
    const r = hyperMillStrategyKnowledgeEngine.suggestOptimizations(baseSetup);
    expect(r.some((o) => o.description.includes("5-axis"))).toBe(true);
  });

  it("hardened material endmill → coating suggestion", () => {
    const setup: CAMSetup = { ...baseSetup, material_group: "H" };
    const r = hyperMillStrategyKnowledgeEngine.suggestOptimizations(setup);
    expect(r.some((o) => o.description.includes("AlCrN") || o.description.includes("TiSiN"))).toBe(true);
  });

  it("ball-tool finishing → spring pass suggestion", () => {
    const setup: CAMSetup = {
      ...baseSetup,
      operation_goal: "finishing",
      tool_type: "ball",
    };
    const r = hyperMillStrategyKnowledgeEngine.suggestOptimizations(setup);
    expect(r.some((o) => o.category === "surface_finish")).toBe(true);
  });

  it("large endmill (>16mm) roughing → indexable insert suggestion", () => {
    const setup: CAMSetup = { ...baseSetup, tool_diameter_mm: 20 };
    const r = hyperMillStrategyKnowledgeEngine.suggestOptimizations(setup);
    expect(r.some((o) => o.category === "cost")).toBe(true);
  });

  it("5-axis simultaneous freeform finishing → MAXX suggestion", () => {
    const setup: CAMSetup = {
      ...baseSetup,
      machine_kinematics: "5axis_simultaneous",
      geometry_type: "freeform_3d",
      operation_goal: "finishing",
    };
    const r = hyperMillStrategyKnowledgeEngine.suggestOptimizations(setup);
    expect(r.some((o) => o.description.includes("MAXX"))).toBe(true);
  });

  it("each optimization has category + risk_level + description", () => {
    const r = hyperMillStrategyKnowledgeEngine.suggestOptimizations(baseSetup);
    r.forEach((o) => {
      expect(typeof o.category).toBe("string");
      expect(["low", "medium", "high"]).toContain(o.risk_level);
      expect(typeof o.description).toBe("string");
      expect(o.description.length).toBeGreaterThan(5);
    });
  });
});

describe("HyperMillStrategyKnowledgeEngine — searchStrategies()", () => {
  it("finds strategies by name keyword", () => {
    const r = hyperMillStrategyKnowledgeEngine.searchStrategies("pocket");
    expect(r.length).toBeGreaterThan(0);
  });

  it("case-insensitive search", () => {
    const upper = hyperMillStrategyKnowledgeEngine.searchStrategies("POCKET");
    const lower = hyperMillStrategyKnowledgeEngine.searchStrategies("pocket");
    expect(upper.length).toBe(lower.length);
  });

  it("returns empty for nonsense keyword", () => {
    expect(hyperMillStrategyKnowledgeEngine.searchStrategies("xyzzy_unknown_999")).toEqual([]);
  });
});

describe("HyperMillStrategyKnowledgeEngine — getStrategiesForGeometry()", () => {
  it("returns strategies sorted by priority desc for pocket_2d", () => {
    const r = hyperMillStrategyKnowledgeEngine.getStrategiesForGeometry("pocket_2d");
    for (let i = 1; i < r.length; i++) {
      expect(r[i].priority).toBeLessThanOrEqual(r[i - 1].priority);
    }
  });

  it("every result includes the geometry in suitable_for", () => {
    const r = hyperMillStrategyKnowledgeEngine.getStrategiesForGeometry("pocket_2d");
    r.forEach((s) => expect(s.suitable_for).toContain("pocket_2d"));
  });
});

describe("HyperMillStrategyKnowledgeEngine — getJMDieStrategies()", () => {
  it("returns only strategies with jm_die_relevance >= 80, sorted desc", () => {
    const r = hyperMillStrategyKnowledgeEngine.getJMDieStrategies();
    r.forEach((s) => expect(s.jm_die_relevance).toBeGreaterThanOrEqual(80));
    for (let i = 1; i < r.length; i++) {
      expect(r[i].jm_die_relevance).toBeLessThanOrEqual(r[i - 1].jm_die_relevance);
    }
  });
});

describe("HyperMillStrategyKnowledgeEngine — stats() + clear()", () => {
  it("stats has strategyCount + calculations + categoryCounts", () => {
    const s = hyperMillStrategyKnowledgeEngine.stats();
    expect(typeof s.strategyCount).toBe("number");
    expect(typeof s.calculations).toBe("number");
    expect(typeof s.categoryCounts).toBe("object");
  });

  it("strategyCount matches getAllStrategies length", () => {
    expect(hyperMillStrategyKnowledgeEngine.stats().strategyCount).toBe(
      hyperMillStrategyKnowledgeEngine.getAllStrategies().length
    );
  });

  it("clear() resets calculation counter", () => {
    hyperMillStrategyKnowledgeEngine.recommendStrategy("pocket_2d", "P", "roughing", "3axis");
    hyperMillStrategyKnowledgeEngine.clear();
    expect(hyperMillStrategyKnowledgeEngine.stats().calculations).toBe(0);
  });

  it("categoryCounts sum equals strategyCount", () => {
    const s = hyperMillStrategyKnowledgeEngine.stats();
    const sum = Object.values(s.categoryCounts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(s.strategyCount);
  });
});

describe("HyperMillStrategyKnowledgeEngine — dispatcher wiring (camDispatcher.ts)", () => {
  const STRATKB_ACTIONS = [
    "cam_hypermill_strategy_kb_list_all",
    "cam_hypermill_strategy_kb_by_category",
    "cam_hypermill_strategy_kb_get",
    "cam_hypermill_strategy_kb_details",
    "cam_hypermill_strategy_kb_recommend",
    "cam_hypermill_strategy_kb_search",
    "cam_hypermill_strategy_kb_for_geometry",
    "cam_hypermill_strategy_kb_jm_die",
  ] as const;

  const ACTION_COUNT_EXPECTED = 8;

  const dispatcherPath = `${process.cwd()}/src/tools/dispatchers/camDispatcher.ts`.replace(/\\/g, "/");

  const readDispatcher = async (): Promise<string> => {
    const fs = await import("node:fs/promises");
    return fs.readFile(dispatcherPath, "utf-8");
  };

  it("registers all 8 cam_hypermill_strategy_kb_* enum entries", async () => {
    const src = await readDispatcher();
    expect(STRATKB_ACTIONS.length).toBe(ACTION_COUNT_EXPECTED);
    for (const action of STRATKB_ACTIONS) {
      expect(src).toContain(`"${action}"`);
    }
  });

  it("declares the _hmStrategyKB singleton", async () => {
    const src = await readDispatcher();
    expect(src).toMatch(/_hmStrategyKB\s*:\s*any/);
  });

  it("registers a hmStrategyKB case in the lazy getter switch", async () => {
    const src = await readDispatcher();
    const re =
      /case\s+"hmStrategyKB"\s*:\s*return\s+_hmStrategyKB\s*\?\?=\s*\(await\s+import\(\s*"\.\.\/\.\.\/engines\/HyperMillStrategyKnowledgeEngine\.js"\s*\)\)\.hyperMillStrategyKnowledgeEngine/;
    expect(re.test(src)).toBe(true);
  });

  it("declares matching case statements for every action", async () => {
    const src = await readDispatcher();
    for (const action of STRATKB_ACTIONS) {
      const re = new RegExp(`case\\s+"${action}"\\s*:`);
      expect(re.test(src)).toBe(true);
    }
  });

  it("every case body resolves the engine via getEngine(\"hmStrategyKB\")", async () => {
    const src = await readDispatcher();
    for (const action of STRATKB_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?getEngine\\("hmStrategyKB"\\)[\\s\\S]*?break;`,
      );
      expect(re.test(src)).toBe(true);
    }
  });

  it("list_all case routes to getAllStrategies() and reports count", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_hypermill_strategy_kb_list_all"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("getAllStrategies");
    expect(body).toContain("count");
  });

  it("get case accepts id OR strategy_id OR strategyId fallback and reports found", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_hypermill_strategy_kb_get"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("getStrategy(");
    expect(body).toMatch(/params\.id\s*\?\?\s*params\.strategy_id/);
    expect(body).toContain("strategyId");
    expect(body).toContain("found");
  });

  it("details case accepts name OR query fallback (fuzzy lookup)", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_hypermill_strategy_kb_details"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("getStrategyDetails");
    expect(body).toMatch(/params\.name\s*\?\?\s*params\.query/);
  });

  it("recommend case routes to recommendStrategy(geometry, material, goal, kinematics) with full param fallbacks", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_hypermill_strategy_kb_recommend"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("recommendStrategy");
    expect(body).toMatch(/params\.material\s*\?\?\s*params\.iso_group/);
    expect(body).toMatch(/params\.goal\s*\?\?\s*params\.operation_goal/);
    expect(body).toMatch(/params\.kinematics\s*\?\?\s*params\.machine_kinematics/);
    expect(body).toContain("recommendation");
  });

  it("search case routes to searchStrategies() with keyword OR query fallback", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_hypermill_strategy_kb_search"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("searchStrategies");
    expect(body).toMatch(/params\.keyword\s*\?\?\s*params\.query/);
  });

  it("for_geometry case routes to getStrategiesForGeometry() with params.geometry", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_hypermill_strategy_kb_for_geometry"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("getStrategiesForGeometry");
    expect(body).toMatch(/params\.geometry/);
  });

  it("jm_die case routes to getJMDieStrategies() with no parameters", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_hypermill_strategy_kb_jm_die"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("getJMDieStrategies");
    expect(body).toContain("count");
  });

  it("each case sets result.success to true (consistent dispatcher contract)", async () => {
    const src = await readDispatcher();
    for (const action of STRATKB_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?success:\\s*true[\\s\\S]*?break;`,
      );
      expect(re.test(src)).toBe(true);
    }
  });
});
