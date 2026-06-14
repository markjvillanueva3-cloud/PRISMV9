/**
 * hypermill-addin-resource-manifest.test.mjs — concrete-value tests for
 * the hyperMILL add-in resource-manifest builder + validator + differ.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-HYPERMILL-ADDIN-RESOURCES
 * @slot echo · @iter 34 · @date 2026-05-27
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MANIFEST_SCHEMA_VERSION,
  ADDIN_TARGET,
  RESOURCE_CATEGORIES,
  REQUIRED_MANIFEST_FIELDS,
  REQUIRED_RESOURCE_FIELDS,
  HYPERMILL_DIALECT_MAP,
  HYPERMILL_STRATEGY_TEMPLATE_EXTS,
  HYPERMILL_VENDOR_POST_CONTROLLERS,
  buildResourceCatalog,
  validateManifest,
  diffManifests,
  summarize,
  resolveDialect,
  isStrategyTemplateFile,
} from "./hypermill-addin-resource-manifest.mjs";

describe("constants", () => {
  it("MANIFEST_SCHEMA_VERSION = 1", () => {
    assert.equal(MANIFEST_SCHEMA_VERSION, 1);
  });
  it("ADDIN_TARGET = 'hypermill' (distinct from 'mastercam')", () => {
    assert.equal(ADDIN_TARGET, "hypermill");
  });
  it("RESOURCE_CATEGORIES has 9 entries (Mastercam's 7 + strategy_template + vendor_post_config)", () => {
    assert.equal(RESOURCE_CATEGORIES.length, 9);
  });
  it("RESOURCE_CATEGORIES includes hyperMILL-unique 'strategy_template'", () => {
    assert.equal(RESOURCE_CATEGORIES.includes("strategy_template"), true);
  });
  it("RESOURCE_CATEGORIES includes hyperMILL-unique 'vendor_post_config'", () => {
    assert.equal(RESOURCE_CATEGORIES.includes("vendor_post_config"), true);
  });
  it("HYPERMILL_DIALECT_MAP.heidenhain_drill_cycle = 'CYCL DEF 200'", () => {
    assert.equal(HYPERMILL_DIALECT_MAP.heidenhain_drill_cycle, "CYCL DEF 200");
  });
  it("HYPERMILL_DIALECT_MAP.heidenhain_peck_cycle = 'CYCL DEF 203'", () => {
    assert.equal(HYPERMILL_DIALECT_MAP.heidenhain_peck_cycle, "CYCL DEF 203");
  });
  it("HYPERMILL_DIALECT_MAP.siemens_drill_cycle = 'CYCLE81'", () => {
    assert.equal(HYPERMILL_DIALECT_MAP.siemens_drill_cycle, "CYCLE81");
  });
  it("HYPERMILL_DIALECT_MAP.flood_on = 'M8' (canonical fallback)", () => {
    assert.equal(HYPERMILL_DIALECT_MAP.flood_on, "M8");
  });
  it("HYPERMILL_STRATEGY_TEMPLATE_EXTS has 5 entries", () => {
    assert.equal(HYPERMILL_STRATEGY_TEMPLATE_EXTS.length, 5);
  });
  it("HYPERMILL_STRATEGY_TEMPLATE_EXTS includes '.hmsteel'", () => {
    assert.equal(HYPERMILL_STRATEGY_TEMPLATE_EXTS.includes(".hmsteel"), true);
  });
  it("HYPERMILL_VENDOR_POST_CONTROLLERS has 7 entries", () => {
    assert.equal(HYPERMILL_VENDOR_POST_CONTROLLERS.length, 7);
  });
  it("HYPERMILL_VENDOR_POST_CONTROLLERS includes 'heidenhain_tnc640'", () => {
    assert.equal(HYPERMILL_VENDOR_POST_CONTROLLERS.includes("heidenhain_tnc640"), true);
  });
  it("HYPERMILL_VENDOR_POST_CONTROLLERS includes 'siemens_840dsl'", () => {
    assert.equal(HYPERMILL_VENDOR_POST_CONTROLLERS.includes("siemens_840dsl"), true);
  });
  it("REQUIRED_MANIFEST_FIELDS includes schemaVersion", () => {
    assert.equal(REQUIRED_MANIFEST_FIELDS.includes("schemaVersion"), true);
  });
  it("REQUIRED_RESOURCE_FIELDS includes id, category, name, version", () => {
    for (const f of ["id", "category", "name", "version"]) {
      assert.equal(REQUIRED_RESOURCE_FIELDS.includes(f), true);
    }
  });
});

describe("buildResourceCatalog", () => {
  it("valid input → addinTarget='hypermill'", () => {
    const m = buildResourceCatalog({ prismVersion: "2.5.0", resources: [] });
    assert.equal(m.addinTarget, "hypermill");
  });
  it("strategyTemplateExtensions embedded in manifest", () => {
    const m = buildResourceCatalog({ prismVersion: "2.5.0", resources: [] });
    assert.deepEqual(m.strategyTemplateExtensions, [".hmsteel", ".hmgear", ".hmaero", ".hmturn", ".hmprobe"]);
  });
  it("supportedControllers embedded in manifest", () => {
    const m = buildResourceCatalog({ prismVersion: "2.5.0", resources: [] });
    assert.equal(m.supportedControllers.includes("heidenhain_tnc640"), true);
  });
  it("strategy_template category resource accepted", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [{ id: "s1", category: "strategy_template", name: "steel.hmsteel", version: "1.0" }],
    });
    assert.equal(m.resources.length, 1);
    assert.equal(m.resources[0].category, "strategy_template");
  });
  it("vendor_post_config + controllerProfile='heidenhain_tnc640' preserved", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [{
        id: "p1",
        category: "vendor_post_config",
        name: "TNC640 post",
        version: "1.0",
        controllerProfile: "heidenhain_tnc640",
      }],
    });
    assert.equal(m.resources[0].controllerProfile, "heidenhain_tnc640");
  });
  it("invalid controllerProfile='fake_controller' → coerced to null", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [{
        id: "p1",
        category: "vendor_post_config",
        name: "junk",
        version: "1.0",
        controllerProfile: "fake_controller",
      }],
    });
    assert.equal(m.resources[0].controllerProfile, null);
  });
  it("missing prismVersion → null", () => {
    assert.equal(buildResourceCatalog({ resources: [] }), null);
  });
  it("null args → null", () => {
    assert.equal(buildResourceCatalog(null), null);
  });
  it("invalid category 'foo' → resource filtered out", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [{ id: "r1", category: "foo", name: "junk", version: "1.0" }],
    });
    assert.equal(m.resources.length, 0);
  });
  it("generatedAtIso default fills when not provided (truthy string)", () => {
    const m = buildResourceCatalog({ prismVersion: "2.5.0", resources: [] });
    assert.equal(typeof m.generatedAtIso === "string" && m.generatedAtIso.length > 0, true);
  });
});

describe("validateManifest", () => {
  function validManifest() {
    return buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [{ id: "r1", category: "tool", name: "1/2 EM", version: "1.0" }],
    });
  }
  it("valid manifest → ok=true", () => {
    assert.equal(validateManifest(validManifest()).ok, true);
  });
  it("addinTarget='mastercam' (wrong target) → ok=false", () => {
    const m = validManifest();
    m.addinTarget = "mastercam";
    assert.equal(validateManifest(m).ok, false);
  });
  it("vendor_post_config WITHOUT controllerProfile → ok=false with hyperMILL-specific error", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [{ id: "p1", category: "vendor_post_config", name: "junk", version: "1.0" }],
    });
    // controllerProfile=null because no profile supplied
    const r = validateManifest(m);
    assert.equal(r.ok, false);
    assert.equal(r.errors.some((e) => e.includes("vendor_post_config requires controllerProfile")), true);
  });
  it("vendor_post_config WITH controllerProfile → ok=true", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [{
        id: "p1",
        category: "vendor_post_config",
        name: "TNC640 post",
        version: "1.0",
        controllerProfile: "heidenhain_tnc640",
      }],
    });
    assert.equal(validateManifest(m).ok, true);
  });
  it("null manifest → ok=false", () => {
    assert.equal(validateManifest(null).ok, false);
  });
  it("strategy_template category accepted without extra constraints", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [{ id: "s1", category: "strategy_template", name: "steel.hmsteel", version: "1.0" }],
    });
    assert.equal(validateManifest(m).ok, true);
  });
});

describe("diffManifests", () => {
  function manifestWith(resources) {
    return buildResourceCatalog({ prismVersion: "2.5.0", resources });
  }
  it("strategy_template added detected", () => {
    const prev = manifestWith([]);
    const next = manifestWith([{ id: "s1", category: "strategy_template", name: "x.hmsteel", version: "1.0" }]);
    assert.deepEqual(diffManifests(prev, next).added, ["s1"]);
  });
  it("vendor_post_config version bump detected", () => {
    const prev = manifestWith([{
      id: "p1", category: "vendor_post_config", name: "TNC640", version: "1.0",
      controllerProfile: "heidenhain_tnc640",
    }]);
    const next = manifestWith([{
      id: "p1", category: "vendor_post_config", name: "TNC640", version: "1.1",
      controllerProfile: "heidenhain_tnc640",
    }]);
    const d = diffManifests(prev, next);
    assert.equal(d.changed.length, 1);
    assert.equal(d.changed[0].fromVersion, "1.0");
    assert.equal(d.changed[0].toVersion, "1.1");
  });
  it("identity → all-empty diff", () => {
    const a = manifestWith([{ id: "r1", category: "tool", name: "t1", version: "1.0" }]);
    const d = diffManifests(a, a);
    assert.equal(d.added.length, 0);
    assert.equal(d.removed.length, 0);
    assert.equal(d.changed.length, 0);
  });
});

describe("summarize", () => {
  it("byController counts vendor_post_config entries by controllerProfile", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [
        { id: "p1", category: "vendor_post_config", name: "TNC640", version: "1.0", controllerProfile: "heidenhain_tnc640" },
        { id: "p2", category: "vendor_post_config", name: "TNC530", version: "1.0", controllerProfile: "heidenhain_itnc530" },
        { id: "p3", category: "vendor_post_config", name: "TNC640-2", version: "1.0", controllerProfile: "heidenhain_tnc640" },
      ],
    });
    const s = summarize(m);
    assert.equal(s.byController.heidenhain_tnc640, 2);
    assert.equal(s.byController.heidenhain_itnc530, 1);
  });
  it("byCategory.strategy_template counted separately from tool", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [
        { id: "s1", category: "strategy_template", name: "x.hmsteel", version: "1.0" },
        { id: "t1", category: "tool", name: "t1", version: "1.0" },
      ],
    });
    const s = summarize(m);
    assert.equal(s.byCategory.strategy_template, 1);
    assert.equal(s.byCategory.tool, 1);
  });
  it("totalResources counts all entries", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [
        { id: "r1", category: "tool", name: "t1", version: "1.0" },
        { id: "r2", category: "material", name: "4140", version: "1.0" },
      ],
    });
    assert.equal(summarize(m).totalResources, 2);
  });
  it("addinTarget='hypermill' echoed in summary", () => {
    assert.equal(summarize(null).addinTarget, "hypermill");
  });
});

describe("resolveDialect", () => {
  it("'heidenhain_drill_cycle' → 'CYCL DEF 200'", () => {
    assert.equal(resolveDialect("heidenhain_drill_cycle"), "CYCL DEF 200");
  });
  it("'siemens_drill_cycle' → 'CYCLE81'", () => {
    assert.equal(resolveDialect("siemens_drill_cycle"), "CYCLE81");
  });
  it("'flood_on' → 'M8' (canonical fallback)", () => {
    assert.equal(resolveDialect("flood_on"), "M8");
  });
  it("unknown op → null", () => {
    assert.equal(resolveDialect("fly_to_moon"), null);
  });
  it("null → null", () => {
    assert.equal(resolveDialect(null), null);
  });
});

describe("isStrategyTemplateFile", () => {
  it("'steel.hmsteel' → true", () => {
    assert.equal(isStrategyTemplateFile("steel.hmsteel"), true);
  });
  it("'gear.hmgear' → true", () => {
    assert.equal(isStrategyTemplateFile("gear.hmgear"), true);
  });
  it("'aero.HMAERO' (upper-case) → true (case-insensitive)", () => {
    assert.equal(isStrategyTemplateFile("aero.HMAERO"), true);
  });
  it("'foo.txt' → false", () => {
    assert.equal(isStrategyTemplateFile("foo.txt"), false);
  });
  it("'.hmsteel-suffix' (ext NOT at end) → false", () => {
    assert.equal(isStrategyTemplateFile("foo.hmsteel-bak"), false);
  });
  it("null → false", () => {
    assert.equal(isStrategyTemplateFile(null), false);
  });
  it("empty string → false", () => {
    assert.equal(isStrategyTemplateFile(""), false);
  });
});
