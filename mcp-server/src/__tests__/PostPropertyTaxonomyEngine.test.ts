/**
 * PostPropertyTaxonomyEngine.test.ts
 *
 * Reference-value coverage for PostPropertyTaxonomyEngine (POST-ULT-MS2 U01-U04).
 * Every assertion encodes intent (R9): the value chosen is derived from verified
 * runtime output of the engine against its built-in canonical databases.
 *
 * Verified symbols (read from source, lines 1884-2273):
 *   - class PostPropertyTaxonomyEngineImpl  (line 1884)
 *   - export const postPropertyTaxonomyEngine  (line 2273)
 *   - buildTaxonomy()           -> PropertyTaxonomy
 *   - classifyProperty()        -> PropertyClassification
 *   - mapDialect()              -> DialectMappingResult | null
 *   - listPurchaseOptions()     -> PurchaseOption[]
 *   - getCanonicalProperty()    -> CanonicalProperty | null
 *   - getControllerDialect()    -> ControllerDialect | null
 *   - getPropertiesByCategory() -> CanonicalProperty[]
 *   - getPropertiesByGroup()    -> CanonicalProperty[]
 *   - getVariantForFamily()     -> ControllerVariant | null
 *   - translateProperty()       -> {from, to, differences} | null
 *   - getPurchaseDependentProperties() -> Record<string, CanonicalProperty[]>
 *   - buildRawCatalog()         -> RawPropertyEntry[]
 *   - getSummary()              -> summary object
 *
 * All expected values verified by running the engine live via tsx probe.
 * No physics constants are inlined (engine itself has no physics constants).
 */

import { describe, it, expect } from "vitest";
import { postPropertyTaxonomyEngine } from "../engines/PostPropertyTaxonomyEngine.js";
import type {
  PropertyTaxonomy,
  PropertyClassification,
  DialectMappingResult,
  PurchaseOption,
  CanonicalProperty,
  ControllerDialect,
  ControllerVariant,
  RawPropertyEntry,
} from "../engines/PostPropertyTaxonomyEngine.js";

// ============================================================================
// buildTaxonomy
// ============================================================================

describe("PostPropertyTaxonomyEngine -- buildTaxonomy", () => {
  let taxonomy: PropertyTaxonomy;

  it("returns the exact canonical property, dialect, and purchase-option counts", () => {
    taxonomy = postPropertyTaxonomyEngine.buildTaxonomy();
    // Reference values verified live: 24 canonical props, 11 dialects, 15 purchase options
    expect(taxonomy.canonical_properties.length).toBe(24);
    expect(taxonomy.controller_dialects.length).toBe(11);
    expect(taxonomy.purchase_options.length).toBe(15);
  });

  it("total_canonical_groups equals the canonical_properties array length (algebraic invariant)", () => {
    const t = postPropertyTaxonomyEngine.buildTaxonomy();
    expect(t.total_canonical_groups).toBe(t.canonical_properties.length);
  });

  it("total_unique_properties is 220 -- larger than canonical groups because it includes raw normalization-map keys", () => {
    const t = postPropertyTaxonomyEngine.buildTaxonomy();
    // 220 = variant family:name keys + normalization-map raw keys (verified live)
    expect(t.total_unique_properties).toBe(220);
    // Must be strictly larger than canonical group count
    expect(t.total_unique_properties).toBeGreaterThan(t.total_canonical_groups);
  });

  it("every canonical property has at least one controller_variant (data completeness)", () => {
    const t = postPropertyTaxonomyEngine.buildTaxonomy();
    for (const prop of t.canonical_properties) {
      expect(prop.controller_variants.length).toBeGreaterThan(0);
    }
  });

  it("every controller_dialect has a non-empty family string and at least one variant", () => {
    const t = postPropertyTaxonomyEngine.buildTaxonomy();
    for (const d of t.controller_dialects) {
      expect(d.family.length).toBeGreaterThan(0);
      expect(d.variants.length).toBeGreaterThan(0);
    }
  });

  it("each purchase option lists at least one G-code and one manufacturer (data completeness)", () => {
    const t = postPropertyTaxonomyEngine.buildTaxonomy();
    for (const opt of t.purchase_options) {
      expect(opt.gcodes_enabled.length).toBeGreaterThan(0);
      expect(opt.manufacturers.length).toBeGreaterThan(0);
    }
  });

  it("is idempotent -- two successive calls return equal counts", () => {
    const a = postPropertyTaxonomyEngine.buildTaxonomy();
    const b = postPropertyTaxonomyEngine.buildTaxonomy();
    expect(a.canonical_properties.length).toBe(b.canonical_properties.length);
    expect(a.total_unique_properties).toBe(b.total_unique_properties);
  });
});

// ============================================================================
// classifyProperty
// ============================================================================

describe("PostPropertyTaxonomyEngine -- classifyProperty", () => {
  it("exact match: useSmoothing on a haas CPS file resolves to hsm_smoothing purchase_dependent", () => {
    const result: PropertyClassification =
      postPropertyTaxonomyEngine.classifyProperty("useSmoothing", "haas-ngc.cps");
    expect(result.property_name).toBe("useSmoothing");
    expect(result.canonical_name).toBe("hsm_smoothing");
    expect(result.category).toBe("purchase_dependent");
    expect(result.purchase_option).toBe("HSM Package");
    expect(result.controller_family).toBe("haas");
    expect(result.confidence).toBe(1.0);
  });

  it("exact match: useTCP on a fanuc CPS file resolves to tcp_rtcp purchase_dependent", () => {
    const result = postPropertyTaxonomyEngine.classifyProperty("useTCP", "fanuc-30i.cps");
    expect(result.canonical_name).toBe("tcp_rtcp");
    expect(result.category).toBe("purchase_dependent");
    expect(result.purchase_option).toBe("5-Axis Simultaneous Package");
    expect(result.controller_family).toBe("fanuc");
    expect(result.confidence).toBe(1.0);
  });

  it("case-insensitive fallback: USESMOOTHING resolves to hsm_smoothing with 0.9 confidence", () => {
    // Engine performs a case-insensitive loop match (engine line ~1937) returning confidence 0.9
    const result = postPropertyTaxonomyEngine.classifyProperty("USESMOOTHING");
    expect(result.canonical_name).toBe("hsm_smoothing");
    expect(result.confidence).toBe(0.9);
    expect(result.reasoning).toContain("Case-insensitive match");
  });

  it("unknown property returns canonical_name=unknown, confidence=0, category=always_available", () => {
    const result = postPropertyTaxonomyEngine.classifyProperty("unknownPropXYZ");
    expect(result.canonical_name).toBe("unknown");
    expect(result.confidence).toBe(0);
    expect(result.category).toBe("always_available");
    expect(result.reasoning).toContain("not found in normalization map");
  });

  it("omitting cpsFileName yields controller_family=unknown even when prop is known", () => {
    const result = postPropertyTaxonomyEngine.classifyProperty("useSmoothing");
    // No file given -- family cannot be detected
    expect(result.controller_family).toBe("unknown");
    // But classification is still exact and confident
    expect(result.canonical_name).toBe("hsm_smoothing");
    expect(result.confidence).toBe(1.0);
  });

  it("siemens CPS file detects siemens family", () => {
    const result = postPropertyTaxonomyEngine.classifyProperty(
      "useSmoothing",
      "siemens-840D-sl.cps"
    );
    expect(result.controller_family).toBe("siemens");
    expect(result.canonical_name).toBe("hsm_smoothing");
  });

  // Failure mode: empty string property name
  it("empty string property name returns canonical_name=unknown with confidence 0", () => {
    const result = postPropertyTaxonomyEngine.classifyProperty("");
    expect(result.canonical_name).toBe("unknown");
    expect(result.confidence).toBe(0);
  });

  // Failure mode: property name with whitespace is not matched (exact map lookup)
  it("property name with leading/trailing spaces is NOT matched -- confidence stays 0", () => {
    const result = postPropertyTaxonomyEngine.classifyProperty(" useSmoothing ");
    // The map uses exact keys; padded name should not match
    expect(result.confidence).toBe(0);
    expect(result.canonical_name).toBe("unknown");
  });

  // Adversarial: normalization alias chain -- useTSC maps to through_spindle_coolant
  it("useTSC maps to through_spindle_coolant purchase_dependent", () => {
    const result = postPropertyTaxonomyEngine.classifyProperty("useTSC", "haas-vf2.cps");
    expect(result.canonical_name).toBe("through_spindle_coolant");
    expect(result.category).toBe("purchase_dependent");
    expect(result.purchase_option).toBe("Through-Spindle Coolant (TSC)");
    expect(result.confidence).toBe(1.0);
  });
});

// ============================================================================
// mapDialect
// ============================================================================

describe("PostPropertyTaxonomyEngine -- mapDialect", () => {
  it("haas resolves to fanuc family (haas is a Fanuc-derived controller)", () => {
    const result: DialectMappingResult | null =
      postPropertyTaxonomyEngine.mapDialect("haas");
    expect(result).not.toBeNull();
    // Haas matches the haas pattern in CPS_FAMILY_PATTERNS, which maps to fanuc family
    expect(result!.family).toBe("fanuc");
    expect(result!.query_controller).toBe("haas");
  });

  it("haas dialect includes property_translation for all 24 canonical properties (all have fanuc variants)", () => {
    const result = postPropertyTaxonomyEngine.mapDialect("haas");
    expect(result!.property_translation.length).toBe(24);
  });

  it("okuma resolves to okuma family with .min extension", () => {
    const result = postPropertyTaxonomyEngine.mapDialect("okuma");
    expect(result!.family).toBe("okuma");
    expect(result!.dialect.extension).toBe(".min");
  });

  it("Doosan (a Fanuc-derived controller) resolves to fanuc family", () => {
    const result = postPropertyTaxonomyEngine.mapDialect("Doosan");
    expect(result!.family).toBe("fanuc");
  });

  it("siemens resolves with .mpf extension and key differences map includes 840D vs 840D sl", () => {
    const result = postPropertyTaxonomyEngine.mapDialect("siemens");
    expect(result!.family).toBe("siemens");
    expect(result!.dialect.extension).toBe(".mpf");
    expect(Object.keys(result!.dialect.key_differences)).toContain("840D vs 840D sl");
  });

  it("unknown controller name returns null", () => {
    const result = postPropertyTaxonomyEngine.mapDialect("nonexistentXYZController");
    expect(result).toBeNull();
  });

  // Adversarial: empty string
  it("empty string controller name returns null", () => {
    const result = postPropertyTaxonomyEngine.mapDialect("");
    expect(result).toBeNull();
  });

  // Adversarial: random numeric string
  it("random numeric string controller name returns null", () => {
    const result = postPropertyTaxonomyEngine.mapDialect("12345");
    expect(result).toBeNull();
  });

  it("each translation entry has non-empty canonical name and controller property name strings", () => {
    const result = postPropertyTaxonomyEngine.mapDialect("fanuc");
    expect(result).not.toBeNull();
    for (const t of result!.property_translation) {
      expect(t.canonical.length).toBeGreaterThan(0);
      expect(t.this_controller.length).toBeGreaterThan(0);
      // gcodes array is always present (possibly empty but not undefined)
      expect(Array.isArray(t.gcodes)).toBe(true);
    }
  });
});

// ============================================================================
// listPurchaseOptions
// ============================================================================

describe("PostPropertyTaxonomyEngine -- listPurchaseOptions", () => {
  it("no filter returns all 15 purchase options", () => {
    const opts: PurchaseOption[] = postPropertyTaxonomyEngine.listPurchaseOptions();
    expect(opts.length).toBe(15);
  });

  it("filtering by Haas returns 14 options (Haas appears in 14 of 15 manufacturer lists)", () => {
    const opts = postPropertyTaxonomyEngine.listPurchaseOptions("Haas");
    expect(opts.length).toBe(14);
  });

  it("filtering by Fanuc returns 7 options", () => {
    const opts = postPropertyTaxonomyEngine.listPurchaseOptions("Fanuc");
    expect(opts.length).toBe(7);
  });

  it("manufacturer filter is case-insensitive substring match -- mori matches DMG Mori (8 options)", () => {
    const opts = postPropertyTaxonomyEngine.listPurchaseOptions("mori");
    // 'mori' matches 'DMG Mori' via case-insensitive .includes() -- verified live as 8
    expect(opts.length).toBe(8);
  });

  it("filtering by non-existent manufacturer returns empty array", () => {
    const opts = postPropertyTaxonomyEngine.listPurchaseOptions("XYZNonexistentBrand99");
    expect(opts).toEqual([]);
  });

  it("each option has at least one enabled property and a physics_impact description", () => {
    const opts = postPropertyTaxonomyEngine.listPurchaseOptions();
    for (const opt of opts) {
      expect(opt.properties_enabled.length).toBeGreaterThan(0);
      expect(opt.physics_impact.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// getCanonicalProperty
// ============================================================================

describe("PostPropertyTaxonomyEngine -- getCanonicalProperty", () => {
  it("hsm_smoothing returns correct display_name, category, group, and type", () => {
    const prop: CanonicalProperty | null =
      postPropertyTaxonomyEngine.getCanonicalProperty("hsm_smoothing");
    expect(prop).not.toBeNull();
    expect(prop!.display_name).toBe("High-Speed Machining Smoothing");
    expect(prop!.category).toBe("purchase_dependent");
    expect(prop!.purchase_option).toBe("HSM Package");
    expect(prop!.group).toBe("preferences");
    expect(prop!.type).toBe("boolean");
  });

  it("returns null for a non-existent canonical name", () => {
    const prop = postPropertyTaxonomyEngine.getCanonicalProperty("does_not_exist");
    expect(prop).toBeNull();
  });

  it("returns null for empty string canonical name", () => {
    const prop = postPropertyTaxonomyEngine.getCanonicalProperty("");
    expect(prop).toBeNull();
  });

  it("tcp_rtcp has group=multiAxis and category=purchase_dependent", () => {
    const prop = postPropertyTaxonomyEngine.getCanonicalProperty("tcp_rtcp");
    expect(prop!.group).toBe("multiAxis");
    expect(prop!.category).toBe("purchase_dependent");
    expect(prop!.purchase_option).toBe("5-Axis Simultaneous Package");
  });
});

// ============================================================================
// getControllerDialect
// ============================================================================

describe("PostPropertyTaxonomyEngine -- getControllerDialect", () => {
  it("fanuc dialect has 10 variants and .nc extension with O%05d program format", () => {
    const d: ControllerDialect | null =
      postPropertyTaxonomyEngine.getControllerDialect("fanuc");
    expect(d).not.toBeNull();
    expect(d!.family).toBe("fanuc");
    expect(d!.variants.length).toBe(10);
    expect(d!.extension).toBe(".nc");
    expect(d!.program_format).toBe("O%05d");
  });

  it("heidenhain dialect has .h extension", () => {
    const d = postPropertyTaxonomyEngine.getControllerDialect("heidenhain");
    expect(d!.extension).toBe(".h");
  });

  it("lookup is case-insensitive (FANUC resolves to fanuc)", () => {
    const d = postPropertyTaxonomyEngine.getControllerDialect("FANUC");
    expect(d!.family).toBe("fanuc");
  });

  it("non-existent family returns null", () => {
    const d = postPropertyTaxonomyEngine.getControllerDialect("unknownfamily");
    expect(d).toBeNull();
  });
});

// ============================================================================
// getPropertiesByCategory
// ============================================================================

describe("PostPropertyTaxonomyEngine -- getPropertiesByCategory", () => {
  it("purchase_dependent count is 8 and every returned property has that category", () => {
    const props = postPropertyTaxonomyEngine.getPropertiesByCategory("purchase_dependent");
    expect(props.length).toBe(8);
    for (const p of props) {
      expect(p.category).toBe("purchase_dependent");
    }
  });

  it("machine_config count is 7 and every returned property has that category", () => {
    const props = postPropertyTaxonomyEngine.getPropertiesByCategory("machine_config");
    expect(props.length).toBe(7);
    for (const p of props) {
      expect(p.category).toBe("machine_config");
    }
  });

  it("always_available count is 9 and every returned property has that category", () => {
    const props = postPropertyTaxonomyEngine.getPropertiesByCategory("always_available");
    expect(props.length).toBe(9);
    for (const p of props) {
      expect(p.category).toBe("always_available");
    }
  });

  it("three-category counts are exhaustive: 8+7+9 == 24 total canonical properties (algebraic invariant)", () => {
    const pd = postPropertyTaxonomyEngine.getPropertiesByCategory("purchase_dependent").length;
    const mc = postPropertyTaxonomyEngine.getPropertiesByCategory("machine_config").length;
    const aa = postPropertyTaxonomyEngine.getPropertiesByCategory("always_available").length;
    expect(pd + mc + aa).toBe(24);
  });
});

// ============================================================================
// getPropertiesByGroup
// ============================================================================

describe("PostPropertyTaxonomyEngine -- getPropertiesByGroup", () => {
  it("preferences group has 13 properties and each has group=preferences", () => {
    const props = postPropertyTaxonomyEngine.getPropertiesByGroup("preferences");
    expect(props.length).toBe(13);
    for (const p of props) {
      expect(p.group).toBe("preferences");
    }
  });

  it("multiAxis group has exactly 3 properties: tcp_rtcp, use_multi_axis_features, multi_axis_feeding", () => {
    const props = postPropertyTaxonomyEngine.getPropertiesByGroup("multiAxis");
    expect(props.length).toBe(3);
    const names = props.map((p) => p.canonical_name).sort();
    expect(names).toEqual([
      "multi_axis_feeding",
      "tcp_rtcp",
      "use_multi_axis_features",
    ]);
  });

  it("group counts across all known groups sum to 24 (algebraic invariant)", () => {
    const groups = [
      "preferences",
      "multiAxis",
      "configuration",
      "formats",
      "probing",
      "homePositions",
    ];
    const total = groups.reduce(
      (sum, g) => sum + postPropertyTaxonomyEngine.getPropertiesByGroup(g).length,
      0
    );
    expect(total).toBe(24);
  });

  it("non-existent group returns empty array", () => {
    const props = postPropertyTaxonomyEngine.getPropertiesByGroup("nonExistentGroup");
    expect(props).toEqual([]);
  });
});

// ============================================================================
// getVariantForFamily
// ============================================================================

describe("PostPropertyTaxonomyEngine -- getVariantForFamily", () => {
  it("hsm_smoothing / fanuc variant has property_name=useSmoothing, G05.1 Q1, default false", () => {
    const v: ControllerVariant | null =
      postPropertyTaxonomyEngine.getVariantForFamily("hsm_smoothing", "fanuc");
    expect(v).not.toBeNull();
    expect(v!.property_name).toBe("useSmoothing");
    // First G-code is 'G05.1 Q1 (on)' (verified live)
    expect(v!.gcodes![0]).toBe("G05.1 Q1 (on)");
    expect(v!.default_value).toBe(false);
  });

  it("hsm_smoothing / haas has 4 enum values (Off, Rough/P1, Medium/P2, Finish/P3)", () => {
    const v = postPropertyTaxonomyEngine.getVariantForFamily("hsm_smoothing", "haas");
    expect(v).not.toBeNull();
    expect(v!.values).not.toBeNull();
    expect(v!.values!.length).toBe(4);
    expect(v!.values!.map((val) => val.id)).toEqual(["0", "1", "2", "3"]);
  });

  it("rigid_tapping / haas has default_value=true (rigid tapping ON by default)", () => {
    const v = postPropertyTaxonomyEngine.getVariantForFamily("rigid_tapping", "haas");
    expect(v!.property_name).toBe("useRigidTapping");
    expect(v!.default_value).toBe(true);
  });

  it("returns null for a valid canonical name but a non-existent family", () => {
    const v = postPropertyTaxonomyEngine.getVariantForFamily(
      "hsm_smoothing",
      "nonexistent_family"
    );
    expect(v).toBeNull();
  });

  it("returns null when the canonical name does not exist", () => {
    const v = postPropertyTaxonomyEngine.getVariantForFamily("this_does_not_exist", "fanuc");
    expect(v).toBeNull();
  });
});

// ============================================================================
// translateProperty
// ============================================================================

describe("PostPropertyTaxonomyEngine -- translateProperty", () => {
  it("hsm_smoothing fanuc->haas reports exactly 3 differences (G-codes, property name, available values)", () => {
    const result = postPropertyTaxonomyEngine.translateProperty(
      "hsm_smoothing",
      "fanuc",
      "haas"
    );
    expect(result).not.toBeNull();
    // Verified live: 3 differences
    expect(result!.differences.length).toBe(3);
    // First difference is the G-code divergence: G05.1 -> G187
    expect(result!.differences[0]).toContain("G05.1 Q1");
    expect(result!.differences[0]).toContain("G187");
  });

  it("tcp_rtcp fanuc->siemens: differences include TRAORI and useTCP->useTiltedWorkplane name change", () => {
    const result = postPropertyTaxonomyEngine.translateProperty(
      "tcp_rtcp",
      "fanuc",
      "siemens"
    );
    expect(result).not.toBeNull();
    const gcodeDiff = result!.differences.find((d) => d.includes("TRAORI"));
    expect(gcodeDiff).not.toBeUndefined();
    expect(gcodeDiff!.length).toBeGreaterThan(0);
    const nameDiff = result!.differences.find((d) => d.includes("useTCP"));
    expect(nameDiff).not.toBeUndefined();
    expect(nameDiff).toContain("useTiltedWorkplane");
  });

  it("from/to variants carry the correct controller_family labels", () => {
    const result = postPropertyTaxonomyEngine.translateProperty(
      "hsm_smoothing",
      "fanuc",
      "haas"
    );
    expect(result!.from.controller_family).toBe("fanuc");
    expect(result!.to.controller_family).toBe("haas");
  });

  it("returns null when canonical name does not exist", () => {
    const result = postPropertyTaxonomyEngine.translateProperty(
      "nonexistent_canonical",
      "fanuc",
      "haas"
    );
    expect(result).toBeNull();
  });

  it("returns null when toFamily has no variant for the property", () => {
    const result = postPropertyTaxonomyEngine.translateProperty(
      "hsm_smoothing",
      "fanuc",
      "nonexistent_family"
    );
    expect(result).toBeNull();
  });

  // Adversarial: translate from a family to itself -- differences must be empty
  it("translating hsm_smoothing fanuc->fanuc returns result with zero differences", () => {
    const result = postPropertyTaxonomyEngine.translateProperty(
      "hsm_smoothing",
      "fanuc",
      "fanuc"
    );
    expect(result).not.toBeNull();
    expect(result!.differences.length).toBe(0);
    expect(result!.from.property_name).toBe(result!.to.property_name);
  });
});

// ============================================================================
// getPurchaseDependentProperties
// ============================================================================

describe("PostPropertyTaxonomyEngine -- getPurchaseDependentProperties", () => {
  it("returns exactly 6 purchase option keys", () => {
    const result = postPropertyTaxonomyEngine.getPurchaseDependentProperties();
    expect(Object.keys(result).length).toBe(6);
  });

  it("HSM Package contains exactly 2 properties: hsm_smoothing and corner_rounding", () => {
    const result = postPropertyTaxonomyEngine.getPurchaseDependentProperties();
    const hsmProps = result["HSM Package"];
    expect(hsmProps).not.toBeUndefined();
    expect(hsmProps.length).toBe(2);
    const names = hsmProps.map((p) => p.canonical_name).sort();
    expect(names).toEqual(["corner_rounding", "hsm_smoothing"]);
  });

  it("total properties across all keys equals 8 (purchase_dependent category count, algebraic invariant)", () => {
    const result = postPropertyTaxonomyEngine.getPurchaseDependentProperties();
    const total = Object.values(result).reduce((sum, arr) => sum + arr.length, 0);
    expect(total).toBe(8);
  });

  it("every property in every group has category=purchase_dependent (invariant)", () => {
    const result = postPropertyTaxonomyEngine.getPurchaseDependentProperties();
    for (const props of Object.values(result)) {
      for (const p of props) {
        expect(p.category).toBe("purchase_dependent");
      }
    }
  });
});

// ============================================================================
// buildRawCatalog
// ============================================================================

describe("PostPropertyTaxonomyEngine -- buildRawCatalog", () => {
  it("returns exactly 142 entries, matching getSummary().totalControllerVariants", () => {
    const catalog: RawPropertyEntry[] = postPropertyTaxonomyEngine.buildRawCatalog();
    expect(catalog.length).toBe(142);
  });

  it("first entry is useSmoothing/fanuc/boolean/preferences with default false (verified live)", () => {
    const catalog = postPropertyTaxonomyEngine.buildRawCatalog();
    const first = catalog[0];
    expect(first.property_name).toBe("useSmoothing");
    expect(first.type).toBe("boolean");
    expect(first.group).toBe("preferences");
    expect(first.default_value).toBe(false);
    expect(first.posts_using).toEqual(["fanuc"]);
    expect(first.count).toBe(1);
  });

  it("no two entries share the same family:property_name key (dedup invariant)", () => {
    const catalog = postPropertyTaxonomyEngine.buildRawCatalog();
    const seen = new Set<string>();
    for (const entry of catalog) {
      const key = `${entry.posts_using[0]}:${entry.property_name}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("every entry has a non-empty posts_using array and count >= 1", () => {
    const catalog = postPropertyTaxonomyEngine.buildRawCatalog();
    for (const entry of catalog) {
      expect(entry.posts_using.length).toBeGreaterThan(0);
      expect(entry.count).toBeGreaterThanOrEqual(1);
    }
  });

  it("catalog length equals getSummary().totalControllerVariants (algebraic invariant)", () => {
    const catalog = postPropertyTaxonomyEngine.buildRawCatalog();
    const summary = postPropertyTaxonomyEngine.getSummary();
    expect(catalog.length).toBe(summary.totalControllerVariants);
  });
});

// ============================================================================
// getSummary
// ============================================================================

describe("PostPropertyTaxonomyEngine -- getSummary", () => {
  it("returns correct canonical, dialect, purchase-option, and variant totals", () => {
    const s = postPropertyTaxonomyEngine.getSummary();
    expect(s.totalCanonicalProperties).toBe(24);
    expect(s.totalControllerDialects).toBe(11);
    expect(s.totalPurchaseOptions).toBe(15);
    expect(s.totalControllerVariants).toBe(142);
  });

  it("categoryCounts entries sum to totalCanonicalProperties (algebraic invariant)", () => {
    const s = postPropertyTaxonomyEngine.getSummary();
    const catTotal = Object.values(s.categoryCounts).reduce((a, b) => a + b, 0);
    expect(catTotal).toBe(s.totalCanonicalProperties);
  });

  it("groupCounts entries sum to totalCanonicalProperties (algebraic invariant)", () => {
    const s = postPropertyTaxonomyEngine.getSummary();
    const groupTotal = Object.values(s.groupCounts).reduce((a, b) => a + b, 0);
    expect(groupTotal).toBe(s.totalCanonicalProperties);
  });

  it("familiesWithVariants is exactly 6 sorted families: fanuc/haas/heidenhain/mazak/okuma/siemens", () => {
    const s = postPropertyTaxonomyEngine.getSummary();
    // Verified live: exactly these 6 families have controller_variants defined
    expect(s.familiesWithVariants).toEqual([
      "fanuc",
      "haas",
      "heidenhain",
      "mazak",
      "okuma",
      "siemens",
    ]);
  });

  it("familiesWithVariants is sorted alphabetically (invariant of Set->Array.sort)", () => {
    const s = postPropertyTaxonomyEngine.getSummary();
    const sorted = [...s.familiesWithVariants].sort();
    expect(s.familiesWithVariants).toEqual(sorted);
  });
});
