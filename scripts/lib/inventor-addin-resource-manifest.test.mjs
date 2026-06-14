/**
 * inventor-addin-resource-manifest.test.mjs — concrete-value tests for
 * the Inventor HSM add-in resource-manifest builder + validator + differ.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-INVENTOR-ADDIN-RESOURCES
 * @slot echo · @iter 35 · @date 2026-05-27
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MANIFEST_SCHEMA_VERSION,
  ADDIN_TARGET,
  RESOURCE_CATEGORIES,
  REQUIRED_MANIFEST_FIELDS,
  REQUIRED_RESOURCE_FIELDS,
  INVENTOR_DIALECT_MAP,
  INVENTOR_PROBING_MACROS,
  INVENTOR_HSM_LICENSE_TIERS,
  buildResourceCatalog,
  validateManifest,
  diffManifests,
  summarize,
  resolveDialect,
  isProbingMacro,
} from "./inventor-addin-resource-manifest.mjs";

describe("constants", () => {
  it("MANIFEST_SCHEMA_VERSION = 1", () => {
    assert.equal(MANIFEST_SCHEMA_VERSION, 1);
  });
  it("ADDIN_TARGET = 'inventor_hsm'", () => {
    assert.equal(ADDIN_TARGET, "inventor_hsm");
  });
  it("RESOURCE_CATEGORIES has 11 entries (7 baseline + 4 Inventor-specific)", () => {
    assert.equal(RESOURCE_CATEGORIES.length, 11);
  });
  it("RESOURCE_CATEGORIES includes 'iam_assembly_template'", () => {
    assert.equal(RESOURCE_CATEGORIES.includes("iam_assembly_template"), true);
  });
  it("RESOURCE_CATEGORIES includes 'idw_drawing_template'", () => {
    assert.equal(RESOURCE_CATEGORIES.includes("idw_drawing_template"), true);
  });
  it("RESOURCE_CATEGORIES includes 'adaptive_clearing_preset'", () => {
    assert.equal(RESOURCE_CATEGORIES.includes("adaptive_clearing_preset"), true);
  });
  it("RESOURCE_CATEGORIES includes 'probing_routine'", () => {
    assert.equal(RESOURCE_CATEGORIES.includes("probing_routine"), true);
  });
  it("REQUIRED_MANIFEST_FIELDS has 5 entries", () => {
    assert.equal(REQUIRED_MANIFEST_FIELDS.length, 5);
  });
  it("REQUIRED_RESOURCE_FIELDS includes 'id', 'category', 'name', 'version'", () => {
    for (const f of ["id", "category", "name", "version"]) {
      assert.equal(REQUIRED_RESOURCE_FIELDS.includes(f), true);
    }
  });
  it("INVENTOR_DIALECT_MAP.drill_cycle = 'G81' (Fanuc canonical)", () => {
    assert.equal(INVENTOR_DIALECT_MAP.drill_cycle, "G81");
  });
  it("INVENTOR_DIALECT_MAP.rigid_tap_cycle = 'G84.2' (Inventor-specific)", () => {
    assert.equal(INVENTOR_DIALECT_MAP.rigid_tap_cycle, "G84.2");
  });
  it("INVENTOR_DIALECT_MAP.probe_pre_position = 'G65 P9810' (Renishaw)", () => {
    assert.equal(INVENTOR_DIALECT_MAP.probe_pre_position, "G65 P9810");
  });
  it("INVENTOR_DIALECT_MAP.probe_bore_id = 'G65 P9812' (Renishaw bore)", () => {
    assert.equal(INVENTOR_DIALECT_MAP.probe_bore_id, "G65 P9812");
  });
  it("INVENTOR_DIALECT_MAP.work_offsets has 6 entries (G54..G59)", () => {
    assert.equal(INVENTOR_DIALECT_MAP.work_offsets.length, 6);
  });
  it("INVENTOR_PROBING_MACROS has 7 Renishaw macros (P9810..P9817 subset)", () => {
    assert.equal(INVENTOR_PROBING_MACROS.length, 7);
  });
  it("INVENTOR_PROBING_MACROS includes 'P9810' (pre-position)", () => {
    assert.equal(INVENTOR_PROBING_MACROS.includes("P9810"), true);
  });
  it("INVENTOR_HSM_LICENSE_TIERS = ['hsm_express', 'hsm_premium', 'hsm_ultimate']", () => {
    assert.deepEqual(INVENTOR_HSM_LICENSE_TIERS, ["hsm_express", "hsm_premium", "hsm_ultimate"]);
  });
});

describe("buildResourceCatalog", () => {
  it("valid input → addinTarget='inventor_hsm'", () => {
    const m = buildResourceCatalog({ prismVersion: "2.5.0", resources: [] });
    assert.equal(m.addinTarget, "inventor_hsm");
  });
  it("probingMacros embedded in manifest", () => {
    const m = buildResourceCatalog({ prismVersion: "2.5.0", resources: [] });
    assert.equal(m.probingMacros.length, 7);
  });
  it("licenseTiers embedded in manifest", () => {
    const m = buildResourceCatalog({ prismVersion: "2.5.0", resources: [] });
    assert.deepEqual(m.licenseTiers, ["hsm_express", "hsm_premium", "hsm_ultimate"]);
  });
  it("adaptive_clearing_preset category accepted with valid licenseTier", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [{
        id: "a1",
        category: "adaptive_clearing_preset",
        name: "steel-adaptive-default",
        version: "1.0",
        licenseTier: "hsm_premium",
      }],
    });
    assert.equal(m.resources[0].licenseTier, "hsm_premium");
  });
  it("invalid licenseTier 'fake' coerced to null", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [{
        id: "a1",
        category: "adaptive_clearing_preset",
        name: "junk",
        version: "1.0",
        licenseTier: "fake",
      }],
    });
    assert.equal(m.resources[0].licenseTier, null);
  });
  it("iam_assembly_template category accepted", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [{ id: "iam1", category: "iam_assembly_template", name: "default.iam", version: "1.0" }],
    });
    assert.equal(m.resources.length, 1);
  });
  it("probing_routine category accepted", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [{ id: "p1", category: "probing_routine", name: "wcs-setup.cnc", version: "1.0" }],
    });
    assert.equal(m.resources.length, 1);
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
  it("addinTarget='hypermill' (sibling cross-bridge attempt) → ok=false", () => {
    const m = validManifest();
    m.addinTarget = "hypermill";
    assert.equal(validateManifest(m).ok, false);
  });
  it("adaptive_clearing_preset WITHOUT licenseTier → ok=false", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [{ id: "a1", category: "adaptive_clearing_preset", name: "junk", version: "1.0" }],
    });
    const r = validateManifest(m);
    assert.equal(r.ok, false);
    assert.equal(r.errors.some((e) => e.includes("adaptive_clearing_preset requires licenseTier")), true);
  });
  it("adaptive_clearing_preset WITH valid licenseTier → ok=true", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [{
        id: "a1",
        category: "adaptive_clearing_preset",
        name: "steel-adaptive",
        version: "1.0",
        licenseTier: "hsm_ultimate",
      }],
    });
    assert.equal(validateManifest(m).ok, true);
  });
  it("null manifest → ok=false", () => {
    assert.equal(validateManifest(null).ok, false);
  });
});

describe("diffManifests", () => {
  function manifestWith(resources) {
    return buildResourceCatalog({ prismVersion: "2.5.0", resources });
  }
  it("adaptive_clearing_preset added detected", () => {
    const prev = manifestWith([]);
    const next = manifestWith([{
      id: "a1", category: "adaptive_clearing_preset", name: "steel", version: "1.0", licenseTier: "hsm_premium",
    }]);
    assert.deepEqual(diffManifests(prev, next).added, ["a1"]);
  });
  it("probing_routine version bump detected", () => {
    const prev = manifestWith([{ id: "p1", category: "probing_routine", name: "wcs.cnc", version: "1.0" }]);
    const next = manifestWith([{ id: "p1", category: "probing_routine", name: "wcs.cnc", version: "1.1" }]);
    const d = diffManifests(prev, next);
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
  it("byLicenseTier counts adaptive_clearing_preset entries by tier", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [
        { id: "a1", category: "adaptive_clearing_preset", name: "x1", version: "1.0", licenseTier: "hsm_premium" },
        { id: "a2", category: "adaptive_clearing_preset", name: "x2", version: "1.0", licenseTier: "hsm_premium" },
        { id: "a3", category: "adaptive_clearing_preset", name: "x3", version: "1.0", licenseTier: "hsm_ultimate" },
      ],
    });
    const s = summarize(m);
    assert.equal(s.byLicenseTier.hsm_premium, 2);
    assert.equal(s.byLicenseTier.hsm_ultimate, 1);
    assert.equal(s.byLicenseTier.hsm_express, 0);
  });
  it("byCategory.probing_routine counted", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [{ id: "p1", category: "probing_routine", name: "wcs.cnc", version: "1.0" }],
    });
    assert.equal(summarize(m).byCategory.probing_routine, 1);
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
  it("addinTarget='inventor_hsm' echoed in summary", () => {
    assert.equal(summarize(null).addinTarget, "inventor_hsm");
  });
});

describe("resolveDialect", () => {
  it("'rigid_tap_cycle' → 'G84.2'", () => {
    assert.equal(resolveDialect("rigid_tap_cycle"), "G84.2");
  });
  it("'probe_pre_position' → 'G65 P9810'", () => {
    assert.equal(resolveDialect("probe_pre_position"), "G65 P9810");
  });
  it("'probe_bore_id' → 'G65 P9812'", () => {
    assert.equal(resolveDialect("probe_bore_id"), "G65 P9812");
  });
  it("'flood_on' → 'M8'", () => {
    assert.equal(resolveDialect("flood_on"), "M8");
  });
  it("unknown op → null", () => {
    assert.equal(resolveDialect("fly_to_moon"), null);
  });
  it("null → null", () => {
    assert.equal(resolveDialect(null), null);
  });
});

describe("isProbingMacro", () => {
  it("'P9810' → true", () => {
    assert.equal(isProbingMacro("P9810"), true);
  });
  it("'P9812' → true (bore-id)", () => {
    assert.equal(isProbingMacro("P9812"), true);
  });
  it("'p9810' (lowercase) → true (case-insensitive)", () => {
    assert.equal(isProbingMacro("p9810"), true);
  });
  it("'P9999' (not a Renishaw macro) → false", () => {
    assert.equal(isProbingMacro("P9999"), false);
  });
  it("null → false", () => {
    assert.equal(isProbingMacro(null), false);
  });
  it("empty string → false", () => {
    assert.equal(isProbingMacro(""), false);
  });
});
