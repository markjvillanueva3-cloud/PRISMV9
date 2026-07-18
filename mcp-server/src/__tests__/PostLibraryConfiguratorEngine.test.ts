/**
 * PostLibraryConfiguratorEngine.test.ts
 *
 * Real reference-value / algebraic-invariant coverage for the per-customer
 * post config product surface (ECHO-ULTIMATE-ROADMAP Track A, POST-ULT-MS16
 * U01-U04: Browse | Configure | Export | VersionManager).
 *
 * Design notes:
 *   - VERSION_STORE is module-level shared state. Every test that exercises
 *     version management generates a unique post_id via configure() + Date.now()
 *     to avoid cross-test pollution.
 *   - No physics constants are inlined here -- this engine is pure computation
 *     and the tier/delta constants are tested via algebraic invariants derived
 *     from the TIER_DEFINITIONS table in the engine source.
 *   - generateFromMasterPost() requires a CPS template file on disk that is
 *     absent in the test environment. The engine try/catches that path and falls
 *     back to the legacy CPS generator -- so "cps" format tests exercise the
 *     legacy generator, which is the real production fallback.
 */
import { describe, it, expect } from "vitest";
import {
  postLibraryConfiguratorEngine,
  type BrowseInput,
  type ConfigureInput,
  type PostConfiguration,
  type SampleOperation,
} from "../engines/PostLibraryConfiguratorEngine.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a configure input for a known catalog entry (Fanuc 0i-MF Plus mill).
 * Using a catalog-matched machine avoids the "no catalog match" warning so
 * tests can check for the ABSENCE of warnings cleanly.
 */
function fanucMillInput(overrides: Partial<ConfigureInput> = {}): ConfigureInput {
  return {
    machine_brand: "Fanuc",
    machine_model: "0i-MF Plus",
    controller_family: "Fanuc",
    controller_variant: "0i-MF Plus",
    tier: 2,
    aggressiveness: 50,
    output_format: "nc",
    ...overrides,
  };
}

/** A minimal sample operation for NC/CPS export tests. */
function sampleOp(overrides: Partial<SampleOperation> = {}): SampleOperation {
  return {
    type: "facing",
    tool_number: 1,
    rpm: 3000,
    feed_rate: 500,
    depth: 2,
    diameter: 50,
    material: "steel",
    ...overrides,
  };
}

/**
 * Generate a PostConfiguration with a GUARANTEED-UNIQUE id so tests that
 * exercise the module-level VERSION_STORE never share buckets even when
 * Date.now() returns the same ms tick across rapid calls.
 *
 * Usage: const cfg = uniqueConfig({ aggressiveness: 40 });
 */
let _idSeq = 0;
function uniqueConfig(overrides: Partial<PostConfiguration> = {}): PostConfiguration {
  const { configuration } = postLibraryConfiguratorEngine.configure(fanucMillInput());
  return {
    ...configuration,
    id: `test-unique-${Date.now()}-${++_idSeq}`,
    ...overrides,
  };
}

// ===========================================================================
// U01 -- BROWSE
// ===========================================================================

describe("PostLibraryConfiguratorEngine -- browse (U01)", () => {
  it("returns all 17 catalog entries when no filter is supplied", () => {
    const out = postLibraryConfiguratorEngine.browse({});
    expect(out.total).toBe(17);
    expect(out.entries.length).toBe(17);
  });

  it("filters by machine_brand case-insensitively and returns correct count", () => {
    // Catalog has: fanuc-0i-mf-plus, fanuc-31i-b5, fanuc-32i-b = 3 entries
    const out = postLibraryConfiguratorEngine.browse({ machine_brand: "fanuc" });
    expect(out.total).toBe(3);
    expect(out.entries.every((e) => e.machine_brand.toLowerCase().includes("fanuc"))).toBe(true);
  });

  it("filters by controller and returns only matching entries", () => {
    // Siemens controller entries: siemens-840d-sl-mill, siemens-840d-sl-5axis,
    // siemens-828d-mill, dmg-celos-3axis (controller=Siemens) = 4 entries
    const out = postLibraryConfiguratorEngine.browse({ controller: "Siemens" });
    expect(out.total).toBe(4);
    expect(out.entries.every((e) => e.controller === "Siemens" || e.controller_variant.includes("840D"))).toBe(true);
  });

  it("filters by machine_type=mill and returns exactly 8 pure-3axis-mill entries", () => {
    // mill (not mill_5axis): fanuc-0i-mf-plus, siemens-840d-sl-mill, siemens-828d-mill,
    // heidenhain-tnc320-3axis, haas-next-gen-3axis, mazak-smooth-g-mill,
    // okuma-osp-p300-mill, dmg-celos-3axis = 8 entries
    const out = postLibraryConfiguratorEngine.browse({ machine_type: "mill" });
    expect(out.total).toBe(8);
    expect(out.entries.every((e) => e.machine_type === "mill")).toBe(true);
  });

  it("filters by required_capabilities=[5axis,RTCP] returns exactly fanuc-31i-b5", () => {
    const out = postLibraryConfiguratorEngine.browse({
      required_capabilities: ["5axis", "RTCP"],
    });
    expect(out.total).toBe(1);
    expect(out.entries[0].id).toBe("fanuc-31i-b5");
  });

  it("filters by required_physics_stages=[monte_carlo,thermal] -- every result has both stages", () => {
    const out = postLibraryConfiguratorEngine.browse({
      required_physics_stages: ["monte_carlo", "thermal"],
    });
    expect(out.total).toBeGreaterThan(0);
    expect(
      out.entries.every(
        (e) => e.physics_stages.includes("monte_carlo") && e.physics_stages.includes("thermal")
      )
    ).toBe(true);
  });

  it("returns empty result when filter matches nothing", () => {
    const out = postLibraryConfiguratorEngine.browse({ machine_brand: "NonExistentBrand" });
    expect(out.total).toBe(0);
    expect(out.entries).toEqual([]);
  });

  it("filter_applied reflects the exact input object", () => {
    const input: BrowseInput = { machine_brand: "Haas", machine_type: "mill" };
    const out = postLibraryConfiguratorEngine.browse(input);
    expect(out.filter_applied).toMatchObject({ machine_brand: "Haas", machine_type: "mill" });
  });
});

// ===========================================================================
// U02 -- CONFIGURE
// ===========================================================================

describe("PostLibraryConfiguratorEngine -- configure (U02)", () => {
  it("Tier 2 default aggressiveness is 45 (algebraic invariant from TIER_DEFINITIONS)", () => {
    const { configuration, optimization_delta } = postLibraryConfiguratorEngine.configure(
      fanucMillInput({ aggressiveness: undefined })
    );
    expect(configuration.aggressiveness).toBe(45);
    expect(optimization_delta.baseline_aggressiveness).toBe(45);
    expect(optimization_delta.applied_aggressiveness).toBe(45);
  });

  it("Tier 1 label is Foundation, Tier 4 label is Elite", () => {
    const t1 = postLibraryConfiguratorEngine.configure(fanucMillInput({ tier: 1 }));
    const t4 = postLibraryConfiguratorEngine.configure(fanucMillInput({ tier: 4 }));
    expect(t1.optimization_delta.tier_label).toBe("Foundation");
    expect(t4.optimization_delta.tier_label).toBe("Elite");
  });

  it("aggressiveness 1-8 scale auto-converts: 1->0, 8->100, 4->43", () => {
    // normalizeAggressiveness(1) = round((0/7)*100) = 0
    // normalizeAggressiveness(8) = round((7/7)*100) = 100
    // normalizeAggressiveness(4) = round((3/7)*100) = round(42.857) = 43
    const a1 = postLibraryConfiguratorEngine.configure(fanucMillInput({ aggressiveness: 1 }));
    const a8 = postLibraryConfiguratorEngine.configure(fanucMillInput({ aggressiveness: 8 }));
    const a4 = postLibraryConfiguratorEngine.configure(fanucMillInput({ aggressiveness: 4 }));
    expect(a1.configuration.aggressiveness).toBe(0);
    expect(a8.configuration.aggressiveness).toBe(100);
    expect(a4.configuration.aggressiveness).toBe(43);
  });

  it("aggressiveness values >8 are treated as 0-100 scale and clamped", () => {
    const a50 = postLibraryConfiguratorEngine.configure(fanucMillInput({ aggressiveness: 50 }));
    const a101 = postLibraryConfiguratorEngine.configure(fanucMillInput({ aggressiveness: 101 }));
    const aNeg = postLibraryConfiguratorEngine.configure(fanucMillInput({ aggressiveness: -5 }));
    expect(a50.configuration.aggressiveness).toBe(50);
    expect(a101.configuration.aggressiveness).toBe(100);
    expect(aNeg.configuration.aggressiveness).toBe(0);
  });

  it("estimated_cycle_time_reduction_pct: Tier 2 agg=50 => 9*(0.6+0.4*0.5) = 7.2", () => {
    // Algebraic: tier2.cycle_time=9, factor=(0.6+0.4*0.5)=0.8 => 9*0.8=7.2
    const { optimization_delta } = postLibraryConfiguratorEngine.configure(
      fanucMillInput({ tier: 2, aggressiveness: 50 })
    );
    expect(optimization_delta.estimated_cycle_time_reduction_pct).toBeCloseTo(7.2, 1);
  });

  it("estimated_tool_life_improvement_pct: Tier 4 agg=80 => 38*(0.5+0.5*0.8) = 34.2", () => {
    // Algebraic: tier4.tool_life=38, factor=(0.5+0.5*0.8)=0.9 => 38*0.9=34.2
    const { optimization_delta } = postLibraryConfiguratorEngine.configure(
      fanucMillInput({ tier: 4, aggressiveness: 80 })
    );
    expect(optimization_delta.estimated_tool_life_improvement_pct).toBeCloseTo(34.2, 1);
  });

  it("estimated_surface_finish_improvement_pct: Tier 3 agg=65 => 22*(0.55+0.45*0.65) = 18.535", () => {
    // Algebraic: tier3.surface=22, factor=(0.55+0.45*0.65)=0.8425 => 22*0.8425=18.535
    const { optimization_delta } = postLibraryConfiguratorEngine.configure(
      fanucMillInput({ tier: 3, aggressiveness: 65 })
    );
    expect(optimization_delta.estimated_surface_finish_improvement_pct).toBeCloseTo(18.5, 0);
  });

  it("Tier 1 physics_stages: only chip_thinning + safety_check enabled", () => {
    const { configuration } = postLibraryConfiguratorEngine.configure(
      fanucMillInput({ tier: 1 })
    );
    const ps = configuration.physics_stages;
    expect(ps.chip_thinning).toBe(true);
    expect(ps.safety_check).toBe(true);
    expect(ps.stability_lobes).toBe(false);
    expect(ps.deflection).toBe(false);
    expect(ps.thermal).toBe(false);
    expect(ps.wear_tracking).toBe(false);
    expect(ps.corner_decel).toBe(false);
    expect(ps.monte_carlo).toBe(false);
    expect(ps.playbook).toBe(false);
  });

  it("Tier 4 physics_stages: all 9 stages enabled", () => {
    const { configuration } = postLibraryConfiguratorEngine.configure(
      fanucMillInput({ tier: 4 })
    );
    const ps = configuration.physics_stages;
    expect(ps.stability_lobes).toBe(true);
    expect(ps.deflection).toBe(true);
    expect(ps.thermal).toBe(true);
    expect(ps.wear_tracking).toBe(true);
    expect(ps.chip_thinning).toBe(true);
    expect(ps.corner_decel).toBe(true);
    expect(ps.monte_carlo).toBe(true);
    expect(ps.safety_check).toBe(true);
    expect(ps.playbook).toBe(true);
  });

  it("physics_stages override wins over tier default", () => {
    // Tier 1 does not include monte_carlo -- an explicit override must win
    const { configuration } = postLibraryConfiguratorEngine.configure(
      fanucMillInput({
        tier: 1,
        physics_stages: { monte_carlo: true },
      })
    );
    expect(configuration.physics_stages.monte_carlo).toBe(true);
    // Tier 1 base stages must still be on
    expect(configuration.physics_stages.chip_thinning).toBe(true);
    expect(configuration.physics_stages.safety_check).toBe(true);
  });

  it("known catalog machine produces no catalog-match warning", () => {
    const { warnings } = postLibraryConfiguratorEngine.configure(fanucMillInput());
    expect(warnings.find((w) => w.includes("No exact catalog match"))).toBeUndefined();
  });

  it("known catalog machine populates options from catalog available_options", () => {
    // Fanuc 0i-MF Plus available_options includes AI_contour_control, nano_smoothing
    const { configuration } = postLibraryConfiguratorEngine.configure(fanucMillInput());
    expect(Object.keys(configuration.options)).toContain("AI_contour_control");
    expect(Object.keys(configuration.options)).toContain("nano_smoothing");
  });

  it("[failure] unknown machine brand+model emits catalog-match warning", () => {
    const { warnings } = postLibraryConfiguratorEngine.configure({
      machine_brand: "ACME",
      machine_model: "XR-9000",
      controller_family: "Fanuc",
      tier: 1,
    });
    expect(warnings.some((w) => w.includes("No exact catalog match"))).toBe(true);
  });

  it("[failure] supplying an option not in catalog triggers a verification warning", () => {
    const { warnings } = postLibraryConfiguratorEngine.configure(
      fanucMillInput({ options: { INVALID_OPTION_XYZ: true } })
    );
    expect(warnings.some((w) => w.includes("INVALID_OPTION_XYZ") && w.includes("not listed"))).toBe(
      true
    );
  });

  it("[failure] aggressiveness>75 without monte_carlo issues a recommendation", () => {
    const { recommendations } = postLibraryConfiguratorEngine.configure(
      fanucMillInput({
        tier: 2, // Tier 2 does not include monte_carlo by default
        aggressiveness: 80,
        physics_stages: { monte_carlo: false },
      })
    );
    expect(recommendations.some((r) => r.includes("monte_carlo"))).toBe(true);
  });

  it("[failure] safety_check disabled emits a WARNING note in optimization_delta", () => {
    const { optimization_delta } = postLibraryConfiguratorEngine.configure(
      fanucMillInput({
        tier: 2,
        physics_stages: { safety_check: false },
      })
    );
    expect(optimization_delta.notes.some((n) => n.includes("Safety check disabled"))).toBe(true);
  });

  it("configuration id is slugged from brand/model/controller with timestamp suffix", () => {
    const { configuration } = postLibraryConfiguratorEngine.configure(fanucMillInput());
    // id = "fanuc-0i-mf-plus-fanuc-<timestamp>"
    expect(configuration.id).toMatch(/^fanuc-0i-mf-plus-fanuc-\d+$/);
  });

  it("output_format defaults to nc when not specified", () => {
    const { configuration } = postLibraryConfiguratorEngine.configure(
      fanucMillInput({ output_format: undefined })
    );
    expect(configuration.output_format).toBe("nc");
  });
});

// ===========================================================================
// U03 -- EXPORT POST
// ===========================================================================

describe("PostLibraryConfiguratorEngine -- exportPost (U03)", () => {
  it("NC export contains physics pipeline header and M30 program end", () => {
    const { configuration } = postLibraryConfiguratorEngine.configure(
      fanucMillInput({ tier: 2, aggressiveness: 50, output_format: "nc" })
    );
    const result = postLibraryConfiguratorEngine.exportPost({ configuration });
    expect(result.format).toBe("nc");
    expect(result.filename).toMatch(/\.nc$/);
    expect(result.content).toContain("PRISM PHYSICS PIPELINE");
    // Enabled Tier 2 stages must appear in stage markers
    expect(result.content).toContain("stability_lobes");
    expect(result.content).toContain("chip_thinning");
    expect(result.content).toContain("M30");
  });

  it("CPS export contains a PRISM header (master post or legacy fallback) with machine and tier", () => {
    // generateFromMasterPost succeeds if PRISM-Master.cps is on disk (master post path),
    // otherwise falls back to the legacy generator. Both paths produce a CPS with PRISM
    // headers. We test the contract that is true regardless of which path fires.
    const { configuration } = postLibraryConfiguratorEngine.configure(
      fanucMillInput({ tier: 3, aggressiveness: 65, output_format: "cps" })
    );
    const result = postLibraryConfiguratorEngine.exportPost({ configuration });
    expect(result.format).toBe("cps");
    expect(result.filename).toMatch(/\.cps$/);
    // Both the master post and the legacy generator embed PRISM in the header block
    expect(result.content).toMatch(/PRISM/);
    // Both paths embed the machine brand (case varies by path)
    expect(result.content.toLowerCase()).toContain("fanuc");
    // Both paths embed the tier number or the tier label
    expect(result.content).toMatch(/[Tt]ier[\s:]+3|Tier3/);
    // Both paths embed the aggressiveness (65) somewhere in the header/properties
    expect(result.content).toContain("65");
  });

  it("JSON export is valid JSON with schema_version POST-ULT-MS16 and prism_post_configuration key", () => {
    const { configuration } = postLibraryConfiguratorEngine.configure(
      fanucMillInput({ output_format: "json" })
    );
    const result = postLibraryConfiguratorEngine.exportPost({ configuration });
    expect(result.format).toBe("json");
    expect(result.filename).toMatch(/\.json$/);

    const parsed = JSON.parse(result.content) as Record<string, unknown>;
    expect(parsed.schema_version).toBe("POST-ULT-MS16");
    // prism_post_configuration must contain the tier and machine info
    const cfg = parsed.prism_post_configuration as Record<string, unknown>;
    expect(cfg.tier).toBe(2);
    expect((cfg.machine as Record<string, unknown>).brand).toBe("Fanuc");
    // optimization_delta must be a non-null object with at least one key
    const delta = parsed.optimization_delta as Record<string, unknown>;
    expect(typeof delta.tier_label).toBe("string");
    expect(delta.tier_label).toBe("Standard");
  });

  it("size_bytes equals TextEncoder byte-length of content (algebraic invariant)", () => {
    const { configuration } = postLibraryConfiguratorEngine.configure(fanucMillInput());
    const result = postLibraryConfiguratorEngine.exportPost({ configuration });
    const expected = new TextEncoder().encode(result.content).length;
    expect(result.size_bytes).toBe(expected);
  });

  it("configuration_summary is markdown with machine table and performance delta headings", () => {
    const { configuration } = postLibraryConfiguratorEngine.configure(fanucMillInput({ tier: 3 }));
    const result = postLibraryConfiguratorEngine.exportPost({ configuration });
    expect(result.configuration_summary).toContain("# PRISM Post Configuration Summary");
    expect(result.configuration_summary).toContain("## Machine");
    expect(result.configuration_summary).toContain("## Physics Pipeline Stages");
    expect(result.configuration_summary).toContain("## Estimated Performance Delta");
  });

  it("NC export with sample op applies chip-thinning feed factor: 500*1.15=575", () => {
    const { configuration } = postLibraryConfiguratorEngine.configure(
      fanucMillInput({ tier: 2, output_format: "nc" })
    );
    // Tier 2 has chip_thinning=true; factor=1.15; feed=500 => adjustedFeed=round(575)=575
    const result = postLibraryConfiguratorEngine.exportPost({
      configuration,
      sample_operations: [sampleOp({ feed_rate: 500 })],
    });
    expect(result.content).toContain("F575");
  });

  it("MPF export uses Siemens %_N_PRISM_MAIN_MPF header", () => {
    const { configuration } = postLibraryConfiguratorEngine.configure({
      machine_brand: "Siemens",
      machine_model: "840D sl",
      controller_family: "Siemens",
      controller_variant: "840D sl",
      tier: 2,
      output_format: "mpf",
    });
    const result = postLibraryConfiguratorEngine.exportPost({ configuration });
    expect(result.format).toBe("mpf");
    expect(result.filename).toMatch(/\.mpf$/);
    expect(result.content).toContain("%_N_PRISM_MAIN_MPF");
  });

  it("Heidenhain NC starts with BEGIN PGM header", () => {
    const { configuration } = postLibraryConfiguratorEngine.configure({
      machine_brand: "Heidenhain",
      machine_model: "TNC 640",
      controller_family: "Heidenhain",
      controller_variant: "TNC 640",
      tier: 3,
      output_format: "nc",
    });
    const result = postLibraryConfiguratorEngine.exportPost({ configuration });
    expect(result.content).toContain("BEGIN PGM");
  });

  it("CPS legacy generator: non-Heidenhain unknown controller emits toRad(180) sweep limit", () => {
    // generateFromMasterPost returns null for any controller.family NOT in MASTER_POST_FAMILIES,
    // which forces generateCpsContent (legacy). "UnknownBrand" is not in the map.
    // The legacy generator sets toRad(180) for all non-Heidenhain families.
    const cfg = postLibraryConfiguratorEngine.configure({
      machine_brand: "Generic",
      machine_model: "Tester",
      controller_family: "UnknownBrand",
      tier: 2,
      output_format: "cps",
    }).configuration;
    const result = postLibraryConfiguratorEngine.exportPost({ configuration: cfg });
    // Legacy path confirmed: contains the PRISM Physics-Optimized Post Processor header
    expect(result.content).toContain("PRISM Physics-Optimized Post Processor");
    // And the non-Heidenhain sweep constant
    expect(result.content).toContain("toRad(180)");
  });

  it("CPS legacy generator: maxSpindleSpeed=24000 for agg>=70, 18000 for agg<70 (unknown controller)", () => {
    // Force the legacy CPS generator by using an unsupported controller family
    const aggHigh = postLibraryConfiguratorEngine.configure({
      machine_brand: "Generic",
      machine_model: "Mill",
      controller_family: "UnknownBrand",
      aggressiveness: 75,
      output_format: "cps",
    }).configuration;
    const aggLow = postLibraryConfiguratorEngine.configure({
      machine_brand: "Generic",
      machine_model: "Mill",
      controller_family: "UnknownBrand",
      aggressiveness: 40,
      output_format: "cps",
    }).configuration;
    const highResult = postLibraryConfiguratorEngine.exportPost({ configuration: aggHigh });
    const lowResult = postLibraryConfiguratorEngine.exportPost({ configuration: aggLow });
    expect(highResult.content).toContain("var maxSpindleSpeed = 24000");
    expect(lowResult.content).toContain("var maxSpindleSpeed = 18000");
  });
});

// ===========================================================================
// U04 -- VERSION MANAGER
// ===========================================================================

describe("PostLibraryConfiguratorEngine -- saveVersion (U04)", () => {
  it("first save produces version 0.0.1 (bumpVersion('0.0.0')) and history_length 1", () => {
    // bumpVersion bumps the patch of the PREVIOUS stored version (starts at "0.0.0").
    // The configuration's own version field ("1.0.0") is NOT the seed -- the seed is
    // the last entry in the store, defaulting to "0.0.0" when the bucket is empty.
    const cfg = uniqueConfig();
    const result = postLibraryConfiguratorEngine.saveVersion({ configuration: cfg });
    expect(result.version_saved).toBe("0.0.1");
    expect(result.history_length).toBe(1);
    expect(result.post_id).toBe(cfg.id);
  });

  it("second save bumps to 0.0.2 and history_length 2", () => {
    const cfg = uniqueConfig();
    postLibraryConfiguratorEngine.saveVersion({ configuration: cfg });
    const r2 = postLibraryConfiguratorEngine.saveVersion({ configuration: cfg });
    expect(r2.version_saved).toBe("0.0.2");
    expect(r2.history_length).toBe(2);
  });

  it("changes_from_previous is ['Initial version'] for the first save", () => {
    const cfg = uniqueConfig();
    postLibraryConfiguratorEngine.saveVersion({ configuration: cfg });
    const listed = postLibraryConfiguratorEngine.listVersions({ post_id: cfg.id });
    expect(listed.versions[0].changes_from_previous).toEqual(["Initial version"]);
  });

  it("explicit change_notes are stored as-is on subsequent save", () => {
    const cfg = uniqueConfig();
    postLibraryConfiguratorEngine.saveVersion({ configuration: cfg });
    const notes = ["Increased aggressiveness to 75", "Enabled thermal stage"];
    postLibraryConfiguratorEngine.saveVersion({ configuration: cfg, change_notes: notes });
    const listed = postLibraryConfiguratorEngine.listVersions({ post_id: cfg.id });
    expect(listed.versions[1].changes_from_previous).toEqual(notes);
  });

  it("machine_serial is stored per-version and filterable via listVersions", () => {
    const cfg = uniqueConfig();
    postLibraryConfiguratorEngine.saveVersion({ configuration: cfg, machine_serial: "SN-001" });
    postLibraryConfiguratorEngine.saveVersion({ configuration: cfg, machine_serial: "SN-002" });
    const forSn1 = postLibraryConfiguratorEngine.listVersions({
      post_id: cfg.id,
      machine_serial: "SN-001",
    });
    const forSn2 = postLibraryConfiguratorEngine.listVersions({
      post_id: cfg.id,
      machine_serial: "SN-002",
    });
    expect(forSn1.versions.length).toBe(1);
    expect(forSn1.versions[0].machine_serial).toBe("SN-001");
    expect(forSn2.versions.length).toBe(1);
    expect(forSn2.versions[0].machine_serial).toBe("SN-002");
  });

  it("bumpVersion patch-increments monotonically: 3 saves => 0.0.1, 0.0.2, 0.0.3", () => {
    const cfg = uniqueConfig();
    const r1 = postLibraryConfiguratorEngine.saveVersion({ configuration: cfg });
    const r2 = postLibraryConfiguratorEngine.saveVersion({ configuration: cfg });
    const r3 = postLibraryConfiguratorEngine.saveVersion({ configuration: cfg });
    expect(r1.version_saved).toBe("0.0.1");
    expect(r2.version_saved).toBe("0.0.2");
    expect(r3.version_saved).toBe("0.0.3");
  });
});

describe("PostLibraryConfiguratorEngine -- listVersions (U04)", () => {
  it("returns empty versions array for an unknown post_id", () => {
    const listed = postLibraryConfiguratorEngine.listVersions({
      post_id: "post-id-that-does-not-exist-xyz-never-created",
    });
    expect(listed.versions).toEqual([]);
  });

  it("version summaries expose tier and aggressiveness from stored configuration", () => {
    const cfg = uniqueConfig({ tier: 3, aggressiveness: 65 });
    postLibraryConfiguratorEngine.saveVersion({ configuration: cfg });
    const listed = postLibraryConfiguratorEngine.listVersions({ post_id: cfg.id });
    expect(listed.versions[0].tier).toBe(3);
    expect(listed.versions[0].aggressiveness).toBe(65);
  });

  it("version summary change_count equals length of changes_from_previous", () => {
    const cfg = uniqueConfig();
    const notes = ["note A", "note B", "note C"];
    postLibraryConfiguratorEngine.saveVersion({ configuration: cfg });           // 1 change (Initial)
    postLibraryConfiguratorEngine.saveVersion({ configuration: cfg, change_notes: notes }); // 3 changes
    const listed = postLibraryConfiguratorEngine.listVersions({ post_id: cfg.id });
    expect(listed.versions[0].change_count).toBe(1);
    expect(listed.versions[1].change_count).toBe(3);
  });
});

describe("PostLibraryConfiguratorEngine -- diffVersions (U04)", () => {
  it("diff detects aggressiveness modification between two saved versions", () => {
    const cfg1 = uniqueConfig({ aggressiveness: 40 });
    postLibraryConfiguratorEngine.saveVersion({ configuration: cfg1 });

    // Same bucket (same id), different aggressiveness value
    const cfg2: PostConfiguration = { ...cfg1, aggressiveness: 80 };
    postLibraryConfiguratorEngine.saveVersion({ configuration: cfg2 });

    const listed = postLibraryConfiguratorEngine.listVersions({ post_id: cfg1.id });
    const vA = listed.versions[0].version; // "0.0.1"
    const vB = listed.versions[1].version; // "0.0.2"
    const diff = postLibraryConfiguratorEngine.diffVersions({
      post_id: cfg1.id,
      version_a: vA,
      version_b: vB,
    });

    const aggDiff = diff.differences.find((d) => d.field === "aggressiveness");
    expect(aggDiff?.value_a).toBe(40);
    expect(aggDiff?.value_b).toBe(80);
    expect(aggDiff?.change_type).toBe("modified");
  });

  it("diff summary mentions difference count when differences exist", () => {
    const cfg = uniqueConfig({ aggressiveness: 30 });
    postLibraryConfiguratorEngine.saveVersion({ configuration: cfg });
    const cfg2: PostConfiguration = { ...cfg, aggressiveness: 90, tier: 4 };
    postLibraryConfiguratorEngine.saveVersion({ configuration: cfg2 });
    const listed = postLibraryConfiguratorEngine.listVersions({ post_id: cfg.id });
    const diff = postLibraryConfiguratorEngine.diffVersions({
      post_id: cfg.id,
      version_a: listed.versions[0].version,
      version_b: listed.versions[1].version,
    });
    expect(diff.summary).toMatch(/\d+ difference/);
    expect(diff.post_id).toBe(cfg.id);
  });

  it("[failure] diffVersions with unknown version_a returns empty differences + 'not found' summary", () => {
    const cfg = uniqueConfig();
    postLibraryConfiguratorEngine.saveVersion({ configuration: cfg });
    const diff = postLibraryConfiguratorEngine.diffVersions({
      post_id: cfg.id,
      version_a: "99.99.99",
      version_b: "0.0.1",
    });
    expect(diff.differences).toEqual([]);
    expect(diff.summary).toContain("99.99.99");
    expect(diff.summary).toContain("not found");
  });

  it("[failure] diffVersions with unknown version_b returns empty differences + 'not found' summary", () => {
    const cfg = uniqueConfig();
    postLibraryConfiguratorEngine.saveVersion({ configuration: cfg });
    const diff = postLibraryConfiguratorEngine.diffVersions({
      post_id: cfg.id,
      version_a: "0.0.1",
      version_b: "99.99.99",
    });
    expect(diff.differences).toEqual([]);
    expect(diff.summary).toContain("99.99.99");
    expect(diff.summary).toContain("not found");
  });
});

describe("PostLibraryConfiguratorEngine -- rollback (U04)", () => {
  it("rollback restores aggressiveness from target version and bumps to 0.0.3", () => {
    const cfg1 = uniqueConfig({ aggressiveness: 30 });
    postLibraryConfiguratorEngine.saveVersion({ configuration: cfg1 }); // v0.0.1

    const cfg2: PostConfiguration = { ...cfg1, aggressiveness: 75 };
    postLibraryConfiguratorEngine.saveVersion({ configuration: cfg2 }); // v0.0.2

    const rb = postLibraryConfiguratorEngine.rollback({
      post_id: cfg1.id,
      target_version: "0.0.1",
    });
    expect(rb.configuration.aggressiveness).toBe(30);
    expect(rb.new_version).toBe("0.0.3");
    expect(rb.rolled_back_to).toBe("0.0.1");
    expect(rb.message).toContain("0.0.1");
    expect(rb.message).toContain("0.0.3");
  });

  it("rollback appends to history -- listVersions shows 3 entries after rollback", () => {
    const cfg = uniqueConfig();
    postLibraryConfiguratorEngine.saveVersion({ configuration: cfg }); // v0.0.1
    postLibraryConfiguratorEngine.saveVersion({ configuration: cfg }); // v0.0.2
    postLibraryConfiguratorEngine.rollback({
      post_id: cfg.id,
      target_version: "0.0.1",
    });
    const listed = postLibraryConfiguratorEngine.listVersions({ post_id: cfg.id });
    expect(listed.versions.length).toBe(3);
    expect(listed.versions[2].changes_from_previous).toContain("Rollback to v0.0.1");
  });

  it("[failure] rollback to nonexistent version throws with version in error message", () => {
    const cfg = uniqueConfig();
    postLibraryConfiguratorEngine.saveVersion({ configuration: cfg });
    expect(() => {
      postLibraryConfiguratorEngine.rollback({
        post_id: cfg.id,
        target_version: "9.9.9",
      });
    }).toThrow("9.9.9");
  });
});

// ===========================================================================
// ENGINE DISPATCH (run) -- round-trip assertions through the dispatcher
// ===========================================================================

describe("PostLibraryConfiguratorEngine -- run() dispatcher round-trip", () => {
  it("browse action via run() returns same total as direct browse()", () => {
    const direct = postLibraryConfiguratorEngine.browse({ machine_brand: "Haas" });
    const dispatched = postLibraryConfiguratorEngine.run({
      action: "browse",
      machine_brand: "Haas",
    });
    expect(dispatched.success).toBe(true);
    expect(dispatched.action).toBe("browse");
    const result = dispatched.result as typeof direct;
    expect(result.total).toBe(direct.total);
    expect(result.entries.length).toBe(direct.entries.length);
  });

  it("configure action via run() returns tier and aggressiveness matching input", () => {
    const dispatched = postLibraryConfiguratorEngine.run({
      action: "configure",
      machine_brand: "Fanuc",
      machine_model: "0i-MF Plus",
      controller_family: "Fanuc",
      tier: 2,
      aggressiveness: 50,
    });
    expect(dispatched.success).toBe(true);
    expect(dispatched.action).toBe("configure");
    const { configuration } = dispatched.result as ReturnType<
      typeof postLibraryConfiguratorEngine.configure
    >;
    expect(configuration.tier).toBe(2);
    expect(configuration.aggressiveness).toBe(50);
  });

  it("export_post action via run() returns success and non-empty content", () => {
    const { configuration } = postLibraryConfiguratorEngine.configure(fanucMillInput());
    const dispatched = postLibraryConfiguratorEngine.run({
      action: "export_post",
      configuration,
    });
    expect(dispatched.success).toBe(true);
    const result = dispatched.result as ReturnType<typeof postLibraryConfiguratorEngine.exportPost>;
    expect(result.content.length).toBeGreaterThan(100);
    expect(result.format).toBe("nc");
  });

  it("[adversarial] unknown action via run() returns success:false with error containing action name", () => {
    const dispatched = postLibraryConfiguratorEngine.run({
      action: "nonexistent_action" as never,
    });
    expect(dispatched.success).toBe(false);
    expect(dispatched.error).toContain("nonexistent_action");
  });

  it("[adversarial] rollback of nonexistent version via run() returns success:false (exception caught)", () => {
    const { configuration } = postLibraryConfiguratorEngine.configure(fanucMillInput());
    postLibraryConfiguratorEngine.saveVersion({ configuration });
    const dispatched = postLibraryConfiguratorEngine.run({
      action: "rollback",
      post_id: configuration.id,
      target_version: "99.0.0",
    });
    expect(dispatched.success).toBe(false);
    expect(typeof dispatched.error).toBe("string");
    expect(dispatched.error!.length).toBeGreaterThan(0);
  });

  it("engine metadata: name, milestone, 4 units, all 7 actions present", () => {
    expect(postLibraryConfiguratorEngine.name).toBe("PostLibraryConfiguratorEngine");
    expect(postLibraryConfiguratorEngine.milestone).toBe("POST-ULT-MS16");
    expect(postLibraryConfiguratorEngine.units.length).toBe(4);
    expect(postLibraryConfiguratorEngine.units[0]).toBe("U01-PostLibraryBrowser");
    const actions = postLibraryConfiguratorEngine.actions;
    expect(actions).toContain("browse");
    expect(actions).toContain("configure");
    expect(actions).toContain("export_post");
    expect(actions).toContain("save_version");
    expect(actions).toContain("list_versions");
    expect(actions).toContain("diff_versions");
    expect(actions).toContain("rollback");
  });
});
