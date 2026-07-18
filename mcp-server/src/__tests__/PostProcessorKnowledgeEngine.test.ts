/**
 * PostProcessorKnowledgeEngine.test.ts
 *
 * Real test suite for PostProcessorKnowledgeEngine -- a knowledge-base lookup
 * engine over ENTRY_FUNCTIONS, DRILLING_CYCLES, UPK_SWITCHES, MISC_VALUES,
 * CIRCULAR_SETTINGS. All assertions check concrete values / algebraic invariants.
 */

import { describe, it, expect } from "vitest";
import {
  PostProcessorKnowledgeEngine,
  postProcessorKnowledgeEngine,
  ENTRY_FUNCTIONS,
  DRILLING_CYCLES,
  UPK_SWITCHES,
  MISC_VALUES,
  CIRCULAR_SETTINGS,
} from "../engines/PostProcessorKnowledgeEngine.js";

// TypeScript alias used in one describe block below
type UPKSwitchCategory = import("../engines/PostProcessorKnowledgeEngine.js").UPKSwitch["category"];

// ---------------------------------------------------------------------------
// Singleton identity
// ---------------------------------------------------------------------------

describe("singleton", () => {
  it("returns the same instance on repeated calls", () => {
    const a = PostProcessorKnowledgeEngine.getInstance();
    const b = PostProcessorKnowledgeEngine.getInstance();
    expect(a).toBe(b);
  });

  it("exported singleton matches getInstance()", () => {
    expect(postProcessorKnowledgeEngine).toBe(
      PostProcessorKnowledgeEngine.getInstance()
    );
  });
});

// ---------------------------------------------------------------------------
// getStatistics -- algebraic invariant: totalItems == sum of all category counts
// ---------------------------------------------------------------------------

describe("getStatistics", () => {
  it("total equals the sum of all individual counts", () => {
    const stats = postProcessorKnowledgeEngine.getStatistics();
    const expected =
      stats.entryFunctions +
      stats.drillingCycles +
      stats.upkSwitches +
      stats.miscValues +
      stats.circularSettings;
    expect(stats.totalItems).toBe(expected);
  });

  it("entryFunctions count matches ENTRY_FUNCTIONS array length", () => {
    const stats = postProcessorKnowledgeEngine.getStatistics();
    expect(stats.entryFunctions).toBe(ENTRY_FUNCTIONS.length);
    expect(stats.entryFunctions).toBeGreaterThanOrEqual(15);
  });

  it("drillingCycles count matches DRILLING_CYCLES array length", () => {
    const stats = postProcessorKnowledgeEngine.getStatistics();
    expect(stats.drillingCycles).toBe(DRILLING_CYCLES.length);
    expect(stats.drillingCycles).toBeGreaterThanOrEqual(5);
  });

  it("upkSwitches count matches UPK_SWITCHES array length", () => {
    const stats = postProcessorKnowledgeEngine.getStatistics();
    expect(stats.upkSwitches).toBe(UPK_SWITCHES.length);
    expect(stats.upkSwitches).toBeGreaterThanOrEqual(10);
  });

  it("circularSettings count matches CIRCULAR_SETTINGS array length", () => {
    const stats = postProcessorKnowledgeEngine.getStatistics();
    expect(stats.circularSettings).toBe(CIRCULAR_SETTINGS.length);
    expect(stats.circularSettings).toBeGreaterThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// getEntryFunction -- case-insensitive lookup
// ---------------------------------------------------------------------------

describe("getEntryFunction", () => {
  it("returns the correct function for onOpen with lifecycle category", () => {
    const fn = postProcessorKnowledgeEngine.getEntryFunction("onOpen");
    expect(fn).not.toBeNull();
    expect(fn!.name).toBe("onOpen");
    expect(fn!.category).toBe("lifecycle");
    expect(fn!.returnType).toBe("void");
  });

  it("is case-insensitive: ONOPEN finds the same record as onOpen", () => {
    const upper = postProcessorKnowledgeEngine.getEntryFunction("ONOPEN");
    const lower = postProcessorKnowledgeEngine.getEntryFunction("onopen");
    const canonical = postProcessorKnowledgeEngine.getEntryFunction("onOpen");
    expect(upper!.name).toBe(canonical!.name);
    expect(lower!.name).toBe(canonical!.name);
  });

  it("returns undefined for an unknown function name", () => {
    const fn = postProcessorKnowledgeEngine.getEntryFunction("onNonExistent");
    expect(fn).toBeUndefined();
  });

  it("returns onCircular with clockwise boolean parameter", () => {
    const fn = postProcessorKnowledgeEngine.getEntryFunction("onCircular");
    expect(fn!.category).toBe("motion");
    const cw = fn!.parameters.find((p) => p.name === "clockwise");
    expect(cw!.type).toBe("boolean");
  });

  it("returns onCyclePoint with x, y, z as the exact parameter list", () => {
    const fn = postProcessorKnowledgeEngine.getEntryFunction("onCyclePoint");
    expect(fn!.category).toBe("cycle");
    expect(fn!.parameters.map((p) => p.name)).toEqual(["x", "y", "z"]);
  });

  // adversarial: empty string -- no function named ""
  it("returns undefined for empty string query", () => {
    const fn = postProcessorKnowledgeEngine.getEntryFunction("");
    expect(fn).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getEntryFunctionsByCategory
// ---------------------------------------------------------------------------

describe("getEntryFunctionsByCategory", () => {
  it("returns only lifecycle functions for category lifecycle", () => {
    const fns = postProcessorKnowledgeEngine.getEntryFunctionsByCategory("lifecycle");
    expect(fns.length).toBeGreaterThanOrEqual(4);
    fns.forEach((f) => expect(f.category).toBe("lifecycle"));
    const names = fns.map((f) => f.name);
    expect(names).toContain("onOpen");
    expect(names).toContain("onClose");
  });

  it("returns only motion functions for category motion", () => {
    const fns = postProcessorKnowledgeEngine.getEntryFunctionsByCategory("motion");
    expect(fns.length).toBeGreaterThanOrEqual(3);
    fns.forEach((f) => expect(f.category).toBe("motion"));
    const names = fns.map((f) => f.name);
    expect(names).toContain("onRapid");
    expect(names).toContain("onLinear");
  });

  it("returns only cycle functions for category cycle", () => {
    const fns = postProcessorKnowledgeEngine.getEntryFunctionsByCategory("cycle");
    expect(fns.length).toBeGreaterThanOrEqual(1);
    fns.forEach((f) => expect(f.category).toBe("cycle"));
  });

  it("all categories together cover the full ENTRY_FUNCTIONS set", () => {
    const categories: Array<import("../engines/PostProcessorKnowledgeEngine.js").EntryFunction["category"]> =
      ["lifecycle", "motion", "cycle", "command", "manual", "utility"];
    const total = categories.reduce(
      (sum, cat) =>
        sum + postProcessorKnowledgeEngine.getEntryFunctionsByCategory(cat).length,
      0
    );
    expect(total).toBe(ENTRY_FUNCTIONS.length);
  });
});

// ---------------------------------------------------------------------------
// getDrillingCycle
// ---------------------------------------------------------------------------

describe("getDrillingCycle", () => {
  it("returns drilling cycle with G81 gCode and 4 required params", () => {
    const cycle = postProcessorKnowledgeEngine.getDrillingCycle("drilling");
    expect(cycle!.gCode).toBe("G81");
    const required = cycle!.parameters.filter((p) => p.required);
    expect(required.length).toBe(4);
  });

  it("returns deep-drilling with G83 gCode and incrementalDepth param", () => {
    const cycle = postProcessorKnowledgeEngine.getDrillingCycle("deep-drilling");
    expect(cycle!.gCode).toBe("G83");
    const paramNames = cycle!.parameters.map((p) => p.name);
    expect(paramNames).toContain("incrementalDepth");
  });

  it("returns tapping with G84 and pitch parameter", () => {
    const cycle = postProcessorKnowledgeEngine.getDrillingCycle("tapping");
    expect(cycle!.gCode).toBe("G84");
    expect(cycle!.parameters.map((p) => p.name)).toContain("pitch");
  });

  it("returns undefined for unknown cycle type", () => {
    const cycle = postProcessorKnowledgeEngine.getDrillingCycle("laser-drilling");
    expect(cycle).toBeUndefined();
  });

  // adversarial: getDrillingCycle uses .find() with strict equality on cycleType
  it("is case-sensitive -- capital D in Drilling returns undefined", () => {
    const cycle = postProcessorKnowledgeEngine.getDrillingCycle("Drilling");
    expect(cycle).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getAllDrillingCycles -- returns a copy (mutation guard)
// ---------------------------------------------------------------------------

describe("getAllDrillingCycles", () => {
  it("returns all cycles with the correct count", () => {
    const all = postProcessorKnowledgeEngine.getAllDrillingCycles();
    expect(all.length).toBe(DRILLING_CYCLES.length);
  });

  it("mutating the returned array does not affect subsequent calls", () => {
    const originalCount = DRILLING_CYCLES.length;
    const first = postProcessorKnowledgeEngine.getAllDrillingCycles();
    first.pop();
    const second = postProcessorKnowledgeEngine.getAllDrillingCycles();
    expect(second.length).toBe(originalCount);
  });

  it("every cycle has at least one required parameter", () => {
    const all = postProcessorKnowledgeEngine.getAllDrillingCycles();
    all.forEach((cycle) => {
      const required = cycle.parameters.filter((p) => p.required);
      expect(required.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ---------------------------------------------------------------------------
// getUPKSwitch -- case-insensitive
// ---------------------------------------------------------------------------

describe("getUPKSwitch", () => {
  it("returns userotlock in rotary category with defaultValue 0", () => {
    const sw = postProcessorKnowledgeEngine.getUPKSwitch("userotlock");
    expect(sw!.category).toBe("rotary");
    expect(sw!.defaultValue).toBe(0);
  });

  it("is case-insensitive: USEROTLOCK matches userotlock", () => {
    const upper = postProcessorKnowledgeEngine.getUPKSwitch("USEROTLOCK");
    expect(upper!.name).toBe("userotlock");
  });

  it("returns tcp switch in control category with 3 value definitions", () => {
    const sw = postProcessorKnowledgeEngine.getUPKSwitch("tcp");
    expect(sw!.category).toBe("control");
    expect(sw!.values.length).toBe(3);
  });

  it("returns undefined for unknown switch name", () => {
    const sw = postProcessorKnowledgeEngine.getUPKSwitch("nonexistent_switch");
    expect(sw).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getUPKSwitchesByCategory
// ---------------------------------------------------------------------------

describe("getUPKSwitchesByCategory", () => {
  it("returns only rotary category switches, each with category rotary", () => {
    const switches = postProcessorKnowledgeEngine.getUPKSwitchesByCategory("rotary");
    expect(switches.length).toBeGreaterThanOrEqual(1);
    switches.forEach((s) => expect(s.category).toBe("rotary"));
  });

  it("5axis category includes pivotdis and cleardis", () => {
    const switches = postProcessorKnowledgeEngine.getUPKSwitchesByCategory("5axis");
    const names = switches.map((s) => s.name);
    expect(names).toContain("pivotdis");
    expect(names).toContain("cleardis");
  });

  it("all categories together cover the full UPK_SWITCHES set", () => {
    const categories: UPKSwitchCategory[] = [
      "rotary",
      "offset",
      "control",
      "home",
      "5axis",
      "millturn",
      "misc",
    ];
    const total = categories.reduce(
      (sum, cat) =>
        sum + postProcessorKnowledgeEngine.getUPKSwitchesByCategory(cat).length,
      0
    );
    expect(total).toBe(UPK_SWITCHES.length);
  });
});

// ---------------------------------------------------------------------------
// getMiscValue -- case-insensitive id lookup
// ---------------------------------------------------------------------------

describe("getMiscValue", () => {
  it("returns MiscInt2 with category general and 2 value definitions", () => {
    const mv = postProcessorKnowledgeEngine.getMiscValue("MiscInt2");
    expect(mv!.id).toBe("MiscInt2");
    expect(mv!.category).toBe("general");
    expect(mv!.values.length).toBe(2);
  });

  it("is case-insensitive: miscint2 resolves to MiscInt2", () => {
    const lower = postProcessorKnowledgeEngine.getMiscValue("miscint2");
    expect(lower!.id).toBe("MiscInt2");
  });

  it("MiscInt6 (Feed Per Revolution) applies to mill and millturn", () => {
    const mv = postProcessorKnowledgeEngine.getMiscValue("MiscInt6");
    expect(mv!.machineType).toContain("mill");
    expect(mv!.machineType).toContain("millturn");
  });

  it("returns undefined for a non-existent misc value id", () => {
    const mv = postProcessorKnowledgeEngine.getMiscValue("MiscInt999");
    expect(mv).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getCircularSettings -- returns a copy
// ---------------------------------------------------------------------------

describe("getCircularSettings", () => {
  it("returns the correct count matching CIRCULAR_SETTINGS length", () => {
    const settings = postProcessorKnowledgeEngine.getCircularSettings();
    expect(settings.length).toBe(CIRCULAR_SETTINGS.length);
  });

  it("allowHelicalMoves has defaultValue true and unit boolean", () => {
    const settings = postProcessorKnowledgeEngine.getCircularSettings();
    const helical = settings.find((s) => s.name === "allowHelicalMoves");
    expect(helical!.defaultValue).toBe(true);
    expect(helical!.unit).toBe("boolean");
  });

  it("mutating the returned array does not affect subsequent calls", () => {
    const originalLen = CIRCULAR_SETTINGS.length;
    const a = postProcessorKnowledgeEngine.getCircularSettings();
    a.pop();
    const b = postProcessorKnowledgeEngine.getCircularSettings();
    expect(b.length).toBe(originalLen);
  });
});

// ---------------------------------------------------------------------------
// search -- cross-category substring matching
// ---------------------------------------------------------------------------

describe("search", () => {
  it("finds onLinear and onLinear5D when searching 'linear'", () => {
    const results = postProcessorKnowledgeEngine.search("linear");
    const names = results.entryFunctions.map((f) => f.name);
    expect(names).toContain("onLinear");
    expect(names).toContain("onLinear5D");
  });

  it("finds G83 cycle when searching 'g83'", () => {
    const results = postProcessorKnowledgeEngine.search("g83");
    expect(results.drillingCycles.length).toBeGreaterThanOrEqual(1);
    expect(results.drillingCycles.map((c) => c.gCode)).toContain("G83");
  });

  it("finds tcp switch when searching 'tcp'", () => {
    const results = postProcessorKnowledgeEngine.search("tcp");
    expect(results.upkSwitches.map((s) => s.name)).toContain("tcp");
  });

  it("finds feed per revolution miscValue when searching that phrase", () => {
    const results = postProcessorKnowledgeEngine.search("feed per revolution");
    expect(results.miscValues.length).toBeGreaterThanOrEqual(1);
    // MiscInt6 name = "Feed Per Revolution" -- search checks name OR description
    const found = results.miscValues.some((m) =>
      m.name.toLowerCase().includes("feed per revolution") ||
      m.description.toLowerCase().includes("feed per revolution")
    );
    expect(found).toBe(true);
    // Concrete check: MiscInt6 must be among the results
    const ids = results.miscValues.map((m) => m.id);
    expect(ids).toContain("MiscInt6");
  });

  it("returns empty arrays for a query that matches nothing", () => {
    const results = postProcessorKnowledgeEngine.search("zzznomatchxxx");
    expect(results.entryFunctions.length).toBe(0);
    expect(results.drillingCycles.length).toBe(0);
    expect(results.upkSwitches.length).toBe(0);
    expect(results.miscValues.length).toBe(0);
  });

  // adversarial: empty string is a substring of every string -- all records match
  it("empty query matches all records in every category", () => {
    const results = postProcessorKnowledgeEngine.search("");
    expect(results.entryFunctions.length).toBe(ENTRY_FUNCTIONS.length);
    expect(results.drillingCycles.length).toBe(DRILLING_CYCLES.length);
    expect(results.upkSwitches.length).toBe(UPK_SWITCHES.length);
    expect(results.miscValues.length).toBe(MISC_VALUES.length);
  });

  it("search matches via commonPatterns field of entry functions", () => {
    // onLinear commonPatterns includes "Handle feed per revolution mode (G95)"
    const results = postProcessorKnowledgeEngine.search("feed per revolution");
    expect(results.entryFunctions.map((f) => f.name)).toContain("onLinear");
  });
});

// ---------------------------------------------------------------------------
// getRecommendedSettings -- branching logic
// ---------------------------------------------------------------------------

describe("getRecommendedSettings", () => {
  it("5axis branch returns only rotary/5axis switches and includes TCP tip", () => {
    const rec = postProcessorKnowledgeEngine.getRecommendedSettings("5axis");
    expect(rec.switches.length).toBeGreaterThanOrEqual(1);
    rec.switches.forEach((s) =>
      expect(["5axis", "rotary"]).toContain(s.category)
    );
    expect(rec.tips.some((t) => t.toLowerCase().includes("tcp"))).toBe(true);
  });

  it("millturn branch returns millturn/rotary/offset switches and workofs_out tip", () => {
    const rec = postProcessorKnowledgeEngine.getRecommendedSettings("millturn");
    expect(rec.switches.length).toBeGreaterThanOrEqual(1);
    rec.switches.forEach((s) =>
      expect(["millturn", "rotary", "offset"]).toContain(s.category)
    );
    expect(rec.tips.some((t) => t.toLowerCase().includes("workofs_out"))).toBe(
      true
    );
  });

  it("mill branch returns offset/home/misc switches and home_style tip", () => {
    const rec = postProcessorKnowledgeEngine.getRecommendedSettings("mill");
    expect(rec.switches.length).toBeGreaterThanOrEqual(1);
    rec.switches.forEach((s) =>
      expect(["offset", "home", "misc"]).toContain(s.category)
    );
    expect(rec.tips.some((t) => t.toLowerCase().includes("home_style"))).toBe(
      true
    );
  });

  it("3axis is treated the same as mill branch (same tips and switch count)", () => {
    const rec3 = postProcessorKnowledgeEngine.getRecommendedSettings("3axis");
    const recMill = postProcessorKnowledgeEngine.getRecommendedSettings("mill");
    expect(rec3.tips).toEqual(recMill.tips);
    expect(rec3.switches.length).toBe(recMill.switches.length);
  });

  it("unknown machine type returns empty switches, miscValues, and tips", () => {
    const rec =
      postProcessorKnowledgeEngine.getRecommendedSettings("unknown_machine_xyz");
    expect(rec.switches.length).toBe(0);
    expect(rec.miscValues.length).toBe(0);
    expect(rec.tips.length).toBe(0);
  });

  it("5-axis (with hyphen) triggers the same branch as 5axis", () => {
    const rec1 = postProcessorKnowledgeEngine.getRecommendedSettings("5axis");
    const rec2 = postProcessorKnowledgeEngine.getRecommendedSettings("5-axis");
    expect(rec1.tips).toEqual(rec2.tips);
    expect(rec1.switches.length).toBe(rec2.switches.length);
  });
});

// ---------------------------------------------------------------------------
// validateConfiguration -- real validation rules
// ---------------------------------------------------------------------------

describe("validateConfiguration", () => {
  it("empty config produces no errors", () => {
    const result = postProcessorKnowledgeEngine.validateConfiguration({});
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it("tcp=1 and postcomp=1 produce an error mentioning tcp", () => {
    const result = postProcessorKnowledgeEngine.validateConfiguration({
      tcp: 1,
      postcomp: 1,
      pivotdis: 150,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(
      result.errors.some((e) => e.toLowerCase().includes("tcp"))
    ).toBe(true);
  });

  it("postcomp=1 without pivotdis produces an error mentioning pivotdis", () => {
    const result = postProcessorKnowledgeEngine.validateConfiguration({
      postcomp: 1,
    });
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.toLowerCase().includes("pivotdis"))
    ).toBe(true);
  });

  it("postcomp=1 with pivotdis but no offsetdis produces an offsetdis warning", () => {
    const result = postProcessorKnowledgeEngine.validateConfiguration({
      postcomp: 1,
      pivotdis: 150,
    });
    expect(
      result.warnings.some((w) => w.toLowerCase().includes("offsetdis"))
    ).toBe(true);
  });

  it("postcomp=1 with pivotdis and offsetdis=0 does NOT produce offsetdis warning", () => {
    // offsetdis===0 is falsy but the engine guards `!config.offsetdis && config.offsetdis !== 0`
    const result = postProcessorKnowledgeEngine.validateConfiguration({
      postcomp: 1,
      pivotdis: 150,
      offsetdis: 0,
    });
    expect(
      result.warnings.some((w) => w.toLowerCase().includes("offsetdis"))
    ).toBe(false);
  });

  it("maxincrot=200 (>180) produces a maxincrot warning", () => {
    const result = postProcessorKnowledgeEngine.validateConfiguration({
      maxincrot: 200,
    });
    expect(
      result.warnings.some((w) => w.toLowerCase().includes("maxincrot"))
    ).toBe(true);
  });

  it("maxincrot=170 (<=180) does NOT produce a rotary warning", () => {
    const result = postProcessorKnowledgeEngine.validateConfiguration({
      maxincrot: 170,
    });
    expect(
      result.warnings.some((w) => w.toLowerCase().includes("maxincrot"))
    ).toBe(false);
  });

  it("wcstype=0 produces a legacy warning", () => {
    const result = postProcessorKnowledgeEngine.validateConfiguration({
      wcstype: 0,
    });
    expect(
      result.warnings.some((w) => w.toLowerCase().includes("legacy"))
    ).toBe(true);
  });

  it("wcstype=1 produces a legacy warning", () => {
    const result = postProcessorKnowledgeEngine.validateConfiguration({
      wcstype: 1,
    });
    expect(
      result.warnings.some((w) => w.toLowerCase().includes("legacy"))
    ).toBe(true);
  });

  it("wcstype=2 (modern G54) does NOT produce a legacy warning", () => {
    const result = postProcessorKnowledgeEngine.validateConfiguration({
      wcstype: 2,
    });
    expect(
      result.warnings.some((w) => w.toLowerCase().includes("legacy"))
    ).toBe(false);
  });

  it("valid config (tcp=1, wcstype=2, maxincrot=170) is valid with no errors", () => {
    const result = postProcessorKnowledgeEngine.validateConfiguration({
      tcp: 1,
      wcstype: 2,
      maxincrot: 170,
    });
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  // adversarial: tcp=0 and postcomp=1 must NOT trigger the tcp+postcomp conflict
  it("tcp=0 and postcomp=1 does NOT trigger the tcp+postcomp conflict error", () => {
    const result = postProcessorKnowledgeEngine.validateConfiguration({
      tcp: 0,
      postcomp: 1,
      pivotdis: 100,
      offsetdis: 0,
    });
    const hasTcpConflict = result.errors.some(
      (e) =>
        e.toLowerCase().includes("tcp") &&
        e.toLowerCase().includes("post compensation")
    );
    expect(hasTcpConflict).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// generateFunctionTemplate
// ---------------------------------------------------------------------------

describe("generateFunctionTemplate", () => {
  it("returns null for an unknown function name", () => {
    const tmpl = postProcessorKnowledgeEngine.generateFunctionTemplate("onUnknown");
    expect(tmpl).toBeNull();
  });

  it("generates a template for onOpen containing the function keyword and name", () => {
    const tmpl = postProcessorKnowledgeEngine.generateFunctionTemplate("onOpen");
    expect(typeof tmpl).toBe("string");
    expect(tmpl!.includes("function onOpen()")).toBe(true);
  });

  it("generates a template for onLinear that includes x, y, z, feed in signature", () => {
    const tmpl = postProcessorKnowledgeEngine.generateFunctionTemplate("onLinear");
    expect(tmpl!.includes("function onLinear(x, y, z, feed)")).toBe(true);
    expect(tmpl!.includes("@param")).toBe(true);
  });

  it("generated template for onCircular includes all 8 param names", () => {
    const tmpl = postProcessorKnowledgeEngine.generateFunctionTemplate("onCircular");
    const required = ["clockwise", "cx", "cy", "cz", "x", "y", "z", "feed"];
    required.forEach((param) => expect(tmpl!.includes(param)).toBe(true));
  });

  it("template includes bestPractices as comment lines", () => {
    const tmpl = postProcessorKnowledgeEngine.generateFunctionTemplate("onSection");
    expect(tmpl!.includes("Best practice:")).toBe(true);
  });

  // adversarial: generateFunctionTemplate delegates to getEntryFunction which IS
  // case-insensitive, so ONOPEN should also produce a template
  it("ONOPEN (uppercase) still generates a template because lookup is case-insensitive", () => {
    const tmpl = postProcessorKnowledgeEngine.generateFunctionTemplate("ONOPEN");
    expect(tmpl).not.toBeNull();
    expect(tmpl!.includes("onOpen")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Data integrity invariants across the static tables
// ---------------------------------------------------------------------------

describe("static data integrity", () => {
  it("every ENTRY_FUNCTION has a non-empty name and description", () => {
    ENTRY_FUNCTIONS.forEach((fn) => {
      expect(fn.name.length).toBeGreaterThan(0);
      expect(fn.description.length).toBeGreaterThan(0);
    });
  });

  it("every DRILLING_CYCLE has a non-empty gCode and at least one required param", () => {
    DRILLING_CYCLES.forEach((cycle) => {
      expect(cycle.gCode.length).toBeGreaterThan(0);
      expect(cycle.parameters.filter((p) => p.required).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("every UPK_SWITCH has at least one value definition", () => {
    UPK_SWITCHES.forEach((sw) => {
      expect(sw.values.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("ENTRY_FUNCTIONS names are unique (no duplicates)", () => {
    const names = ENTRY_FUNCTIONS.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("DRILLING_CYCLES cycleType values are unique", () => {
    const types = DRILLING_CYCLES.map((c) => c.cycleType);
    expect(new Set(types).size).toBe(types.length);
  });

  it("MISC_VALUES id values are unique", () => {
    const ids = MISC_VALUES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("onLinear5D has exactly 7 parameters (x y z a b c feed)", () => {
    const fn = ENTRY_FUNCTIONS.find((f) => f.name === "onLinear5D");
    expect(fn!.parameters.length).toBe(7);
  });
});
