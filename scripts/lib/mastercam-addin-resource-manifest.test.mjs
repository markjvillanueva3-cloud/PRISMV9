/**
 * mastercam-addin-resource-manifest.test.mjs — concrete-value tests for
 * the Mastercam add-in resource-manifest builder + validator + differ.
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-MASTERCAM-ADDIN-RESOURCES
 * @slot echo · @iter 33 · @date 2026-05-27
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MANIFEST_SCHEMA_VERSION,
  ADDIN_TARGET,
  RESOURCE_CATEGORIES,
  REQUIRED_MANIFEST_FIELDS,
  REQUIRED_RESOURCE_FIELDS,
  MASTERCAM_DIALECT_MAP,
  buildResourceCatalog,
  validateManifest,
  diffManifests,
  summarize,
  resolveDialect,
} from "./mastercam-addin-resource-manifest.mjs";

describe("constants", () => {
  it("MANIFEST_SCHEMA_VERSION = 1", () => {
    assert.equal(MANIFEST_SCHEMA_VERSION, 1);
  });
  it("ADDIN_TARGET = 'mastercam'", () => {
    assert.equal(ADDIN_TARGET, "mastercam");
  });
  it("RESOURCE_CATEGORIES has 7 canonical entries", () => {
    assert.deepEqual(RESOURCE_CATEGORIES, [
      "post_processor",
      "tool",
      "material",
      "holder",
      "machine_profile",
      "sample_program",
      "dialect_map",
    ]);
  });
  it("REQUIRED_MANIFEST_FIELDS includes schemaVersion", () => {
    assert.equal(REQUIRED_MANIFEST_FIELDS.includes("schemaVersion"), true);
  });
  it("REQUIRED_RESOURCE_FIELDS includes id, category, name, version", () => {
    for (const f of ["id", "category", "name", "version"]) {
      assert.equal(REQUIRED_RESOURCE_FIELDS.includes(f), true);
    }
  });
  it("MASTERCAM_DIALECT_MAP.work_offsets has 13 entries (G54..G59.7)", () => {
    assert.equal(MASTERCAM_DIALECT_MAP.work_offsets.length, 13);
  });
  it("MASTERCAM_DIALECT_MAP.tsc_on = 'M88'", () => {
    assert.equal(MASTERCAM_DIALECT_MAP.tsc_on, "M88");
  });
  it("MASTERCAM_DIALECT_MAP.peck_drill_cycle = 'G83'", () => {
    assert.equal(MASTERCAM_DIALECT_MAP.peck_drill_cycle, "G83");
  });
});

describe("buildResourceCatalog", () => {
  it("valid input → returns manifest with schemaVersion=1", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [{ id: "post-hurco-v11", category: "post_processor", name: "Hurco VM30i v11", version: "11.0.0" }],
    });
    assert.equal(m.schemaVersion, 1);
  });
  it("valid input → addinTarget = 'mastercam'", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [],
    });
    assert.equal(m.addinTarget, "mastercam");
  });
  it("valid input → prismVersion echoed", () => {
    const m = buildResourceCatalog({ prismVersion: "2.5.0", resources: [] });
    assert.equal(m.prismVersion, "2.5.0");
  });
  it("generatedAtIso custom value honored", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [],
      generatedAtIso: "2026-05-27T22:00:00Z",
    });
    assert.equal(m.generatedAtIso, "2026-05-27T22:00:00Z");
  });
  it("invalid category 'foo' → resource filtered out", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [
        { id: "r1", category: "foo", name: "junk", version: "1.0" },
        { id: "r2", category: "tool", name: "1/2 endmill", version: "1.0" },
      ],
    });
    assert.equal(m.resources.length, 1);
    assert.equal(m.resources[0].id, "r2");
  });
  it("missing id → resource filtered out", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [{ category: "tool", name: "no-id-tool", version: "1.0" }],
    });
    assert.equal(m.resources.length, 0);
  });
  it("missing prismVersion → null", () => {
    assert.equal(buildResourceCatalog({ resources: [] }), null);
  });
  it("empty prismVersion → null", () => {
    assert.equal(buildResourceCatalog({ prismVersion: "", resources: [] }), null);
  });
  it("null args → null", () => {
    assert.equal(buildResourceCatalog(null), null);
  });
  it("dialectMap embedded in manifest", () => {
    const m = buildResourceCatalog({ prismVersion: "2.5.0", resources: [] });
    assert.equal(m.dialectMap.tsc_on, "M88");
  });
  it("optional sha256 preserved", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [{ id: "r1", category: "tool", name: "t1", version: "1.0", sha256: "abc123" }],
    });
    assert.equal(m.resources[0].sha256, "abc123");
  });
  it("optional sizeBytes preserved as number", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [{ id: "r1", category: "tool", name: "t1", version: "1.0", sizeBytes: 4096 }],
    });
    assert.equal(m.resources[0].sizeBytes, 4096);
  });
  it("tags array filtered to strings only", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [{ id: "r1", category: "tool", name: "t1", version: "1.0", tags: ["aluminum", 42, "endmill"] }],
    });
    assert.deepEqual(m.resources[0].tags, ["aluminum", "endmill"]);
  });
});

describe("validateManifest", () => {
  function validManifest() {
    return buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [{ id: "r1", category: "tool", name: "1/2 EM", version: "1.0" }],
    });
  }
  it("valid manifest → ok=true, errors=[]", () => {
    const r = validateManifest(validManifest());
    assert.equal(r.ok, true);
    assert.equal(r.errors.length, 0);
  });
  it("null manifest → ok=false, error 'not an object'", () => {
    const r = validateManifest(null);
    assert.equal(r.ok, false);
    assert.equal(r.errors[0].includes("not an object"), true);
  });
  it("missing schemaVersion → ok=false", () => {
    const m = validManifest();
    delete m.schemaVersion;
    assert.equal(validateManifest(m).ok, false);
  });
  it("schemaVersion=99 → ok=false with mismatch error", () => {
    const m = validManifest();
    m.schemaVersion = 99;
    const r = validateManifest(m);
    assert.equal(r.ok, false);
    assert.equal(r.errors.some((e) => e.includes("schemaVersion mismatch")), true);
  });
  it("addinTarget='fusion' → ok=false with mismatch error", () => {
    const m = validManifest();
    m.addinTarget = "fusion";
    assert.equal(validateManifest(m).ok, false);
  });
  it("resources not array → ok=false", () => {
    const m = validManifest();
    m.resources = "not-an-array";
    assert.equal(validateManifest(m).ok, false);
  });
  it("resource missing 'id' → ok=false with index-tagged error", () => {
    const m = validManifest();
    m.resources = [{ category: "tool", name: "t1", version: "1.0" }];
    const r = validateManifest(m);
    assert.equal(r.ok, false);
    assert.equal(r.errors.some((e) => e.includes("resource[0]") && e.includes("id")), true);
  });
  it("resource with invalid category → ok=false", () => {
    const m = validManifest();
    m.resources = [{ id: "r1", category: "foo", name: "t1", version: "1.0" }];
    const r = validateManifest(m);
    assert.equal(r.ok, false);
    assert.equal(r.errors.some((e) => e.includes("invalid category")), true);
  });
});

describe("diffManifests", () => {
  function manifestWith(resources) {
    return buildResourceCatalog({ prismVersion: "2.5.0", resources });
  }
  it("identical manifests → all-empty diff", () => {
    const a = manifestWith([{ id: "r1", category: "tool", name: "t1", version: "1.0" }]);
    const d = diffManifests(a, a);
    assert.equal(d.added.length, 0);
    assert.equal(d.removed.length, 0);
    assert.equal(d.changed.length, 0);
  });
  it("next has new resource → added=['r2']", () => {
    const prev = manifestWith([{ id: "r1", category: "tool", name: "t1", version: "1.0" }]);
    const next = manifestWith([
      { id: "r1", category: "tool", name: "t1", version: "1.0" },
      { id: "r2", category: "tool", name: "t2", version: "1.0" },
    ]);
    assert.deepEqual(diffManifests(prev, next).added, ["r2"]);
  });
  it("prev had resource missing in next → removed=['r1']", () => {
    const prev = manifestWith([{ id: "r1", category: "tool", name: "t1", version: "1.0" }]);
    const next = manifestWith([]);
    assert.deepEqual(diffManifests(prev, next).removed, ["r1"]);
  });
  it("version bump → changed with fromVersion + toVersion", () => {
    const prev = manifestWith([{ id: "r1", category: "tool", name: "t1", version: "1.0" }]);
    const next = manifestWith([{ id: "r1", category: "tool", name: "t1", version: "1.1" }]);
    const d = diffManifests(prev, next);
    assert.equal(d.changed.length, 1);
    assert.equal(d.changed[0].fromVersion, "1.0");
    assert.equal(d.changed[0].toVersion, "1.1");
  });
  it("sha256 change with same version → still flagged as changed", () => {
    const prev = manifestWith([{ id: "r1", category: "tool", name: "t1", version: "1.0", sha256: "aaa" }]);
    const next = manifestWith([{ id: "r1", category: "tool", name: "t1", version: "1.0", sha256: "bbb" }]);
    assert.equal(diffManifests(prev, next).changed.length, 1);
  });
  it("null prev → all resources in next reported as added", () => {
    const next = manifestWith([{ id: "r1", category: "tool", name: "t1", version: "1.0" }]);
    assert.deepEqual(diffManifests(null, next).added, ["r1"]);
  });
});

describe("summarize", () => {
  it("totalResources counts all entries", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [
        { id: "p1", category: "post_processor", name: "p1", version: "1.0" },
        { id: "t1", category: "tool", name: "t1", version: "1.0" },
        { id: "t2", category: "tool", name: "t2", version: "1.0" },
      ],
    });
    assert.equal(summarize(m).totalResources, 3);
  });
  it("byCategory.tool = 2, byCategory.post_processor = 1", () => {
    const m = buildResourceCatalog({
      prismVersion: "2.5.0",
      resources: [
        { id: "p1", category: "post_processor", name: "p1", version: "1.0" },
        { id: "t1", category: "tool", name: "t1", version: "1.0" },
        { id: "t2", category: "tool", name: "t2", version: "1.0" },
      ],
    });
    const s = summarize(m);
    assert.equal(s.byCategory.tool, 2);
    assert.equal(s.byCategory.post_processor, 1);
  });
  it("empty manifest → totalResources=0, all categories=0", () => {
    const m = buildResourceCatalog({ prismVersion: "2.5.0", resources: [] });
    const s = summarize(m);
    assert.equal(s.totalResources, 0);
    assert.equal(s.byCategory.tool, 0);
  });
  it("null manifest → totalResources=0", () => {
    assert.equal(summarize(null).totalResources, 0);
  });
  it("addinTarget echoed", () => {
    assert.equal(summarize(null).addinTarget, "mastercam");
  });
});

describe("resolveDialect", () => {
  it("'tsc_on' → 'M88'", () => {
    assert.equal(resolveDialect("tsc_on"), "M88");
  });
  it("'flood_on' → 'M8'", () => {
    assert.equal(resolveDialect("flood_on"), "M8");
  });
  it("'peck_drill_cycle' → 'G83'", () => {
    assert.equal(resolveDialect("peck_drill_cycle"), "G83");
  });
  it("'work_offsets' → array (13 entries)", () => {
    const r = resolveDialect("work_offsets");
    assert.equal(r.length, 13);
  });
  it("unknown op → null", () => {
    assert.equal(resolveDialect("fly_to_moon"), null);
  });
  it("null → null", () => {
    assert.equal(resolveDialect(null), null);
  });
  it("empty string → null", () => {
    assert.equal(resolveDialect(""), null);
  });
});
