/**
 * PP-MS1 U-PP10: CPS Dialect Mapper Test Suite
 *
 * Tests CpsDialectMapperEngine against representative CPS profile structures
 * covering: controller resolution, arc format, safe retract, HSM, 5-axis,
 * coolant, subprograms, probing, turning, input validation, and edge cases.
 */
import { describe, it, expect } from "vitest";
import {
  cpsDialectMapperEngine,
  type CpsDialectMapping,
} from "../engines/CpsDialectMapperEngine.js";
import type { CpsFullProfile, CpsProperty } from "../engines/CpsPostParserEngine.js";

// ─── Test Fixtures: Representative CPS Profiles ─────────────────────

function makeProp(name: string, value: any, type: CpsProperty["type"] = "boolean"): CpsProperty {
  return { name, title: name, description: "", group: "general", type, defaultValue: value, scope: "machine" };
}

const EMPTY_CYCLES = { hasDrilling: false, hasTapping: false, hasBoring: false, hasProbing: false, hasThreadMilling: false, detectedCycles: [] };
const EMPTY_CAPS = { milling: true, turning: false, machineSimulation: false, inspection: false, fingerprint: "mill" };

function makeProfile(overrides: {
  vendor?: string; description?: string; filename?: string; extension?: string;
  properties?: CpsProperty[]; capabilities?: Partial<typeof EMPTY_CAPS>;
  probeMultipleFeatures?: boolean; hasProbing?: boolean;
}): CpsFullProfile {
  return {
    metadata: {
      filename: overrides.filename ?? "test-post.cps",
      description: overrides.description ?? "Test Post",
      vendor: overrides.vendor ?? "Autodesk",
      vendorUrl: "", legal: "", certificationLevel: 2,
      extension: overrides.extension ?? "nc",
      capabilities: { ...EMPTY_CAPS, ...overrides.capabilities },
      tolerances: {}, circularLimits: {},
      helicalMoves: false, spiralMoves: false,
      highFeedrate: 10000, probeMultipleFeatures: overrides.probeMultipleFeatures ?? false,
    },
    properties: overrides.properties ?? [],
    formats: [],
    cycleSupport: {
      ...EMPTY_CYCLES,
      hasProbing: overrides.hasProbing ?? false,
    },
    gCodes: {}, mCodes: {},
    rawPropertyCount: overrides.properties?.length ?? 0,
    rawFormatCount: 0,
  };
}

// ─── Haas NGC Profile ───────────────────────────────────────────────

const HAAS_PROFILE = makeProfile({
  vendor: "Haas Automation",
  description: "Haas - Next Generation Control",
  filename: "haas next generation.cps",
  extension: "nc",
  properties: [
    makeProp("useRadius", true),
    makeProp("safePositionMethod", "G53", "enum"),
    makeProp("useSmoothing", true),
    makeProp("smoothingTolerance", 0.01, "spatial"),
    makeProp("gotChipConveyor", true),
    makeProp("useSubroutines", false),
  ],
  hasProbing: true,
  probeMultipleFeatures: true,
});

// ─── Siemens 840D 5-Axis Profile ────────────────────────────────────

const SIEMENS_PROFILE = makeProfile({
  vendor: "Siemens",
  description: "Siemens SINUMERIK 840D sl - 5 Axis",
  filename: "siemens-840d-5axis.cps",
  extension: "mpf",
  properties: [
    makeProp("useRadius", false),
    makeProp("safePositionMethod", "G28", "enum"),
    makeProp("useSmoothing", true),
    makeProp("smoothingTolerance", 0.005, "spatial"),
    makeProp("useTCP", true),
    makeProp("useTiltedWorkplane", true),
    makeProp("hasAAxis", true),
    makeProp("hasBAxis", true),
    makeProp("hasCAxis", false),
    makeProp("useSubroutines", true),
    makeProp("gotChipConveyor", false),
  ],
});

// ─── Fanuc Turning Profile ──────────────────────────────────────────

const FANUC_TURNING_PROFILE = makeProfile({
  vendor: "FANUC",
  description: "Fanuc 31i-B5 Turning",
  filename: "fanuc-31i-turning.cps",
  extension: "nc",
  capabilities: { milling: false, turning: true },
  properties: [
    makeProp("useRadius", true),
    makeProp("safePositionMethod", "G28", "enum"),
    makeProp("useConstantSurfaceSpeed", true),
    makeProp("gotSecondarySpindle", true),
    makeProp("gotTailStock", true),
  ],
});

// ─── Mazak Smooth Profile ───────────────────────────────────────────

const MAZAK_PROFILE = makeProfile({
  vendor: "Mazak",
  description: "Mazak SmoothAi - Mill-Turn",
  filename: "mazak-smoothai.cps",
  extension: "eia",
  capabilities: { milling: true, turning: true },
  properties: [
    makeProp("useRadius", false),
    makeProp("safePositionMethod", "clearanceHeight", "enum"),
    makeProp("useSmoothing", true),
    makeProp("useTCP", true),
    makeProp("hasBAxis", true),
    makeProp("hasCAxis", true),
    makeProp("useConstantSurfaceSpeed", true),
    makeProp("useSubroutines", true),
    makeProp("coolantPressure", 70, "integer"),
  ],
});

// ─── Unknown/Minimal Profile ────────────────────────────────────────

const UNKNOWN_PROFILE = makeProfile({
  vendor: "UnknownVendor",
  description: "Custom Machine Post",
  filename: "custom.cps",
  properties: [],
});

// ─── Tests ──────────────────────────────────────────────────────────

describe("CpsDialectMapperEngine", () => {

  // ── Controller Resolution ───────────────────────────────────────

  describe("controller resolution", () => {
    it("resolves Haas vendor to haas_ngc", () => {
      const result = cpsDialectMapperEngine.mapToDialect(HAAS_PROFILE);
      expect(result.controller_family).toBe("haas_ngc");
      expect(result.resolution_method).toBe("exact_vendor");
      expect(result.resolution_confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("resolves Siemens vendor to siemens_840d", () => {
      const result = cpsDialectMapperEngine.mapToDialect(SIEMENS_PROFILE);
      expect(result.controller_family).toBe("siemens_840d");
      expect(result.resolution_confidence).toBeGreaterThanOrEqual(0.75);
    });

    it("resolves FANUC vendor to fanuc_31i", () => {
      const result = cpsDialectMapperEngine.mapToDialect(FANUC_TURNING_PROFILE);
      expect(result.controller_family).toBe("fanuc_31i");
    });

    it("resolves Mazak vendor to mazak_smooth_ai", () => {
      const result = cpsDialectMapperEngine.mapToDialect(MAZAK_PROFILE);
      expect(result.controller_family).toBe("mazak_smooth_ai");
    });

    it("falls back to generic_fanuc for unknown vendor", () => {
      const result = cpsDialectMapperEngine.mapToDialect(UNKNOWN_PROFILE);
      expect(result.controller_family).toBe("generic_fanuc");
      expect(result.resolution_method).toBe("fallback");
      expect(result.resolution_confidence).toBeLessThan(0.5);
    });

    it("resolves by description when vendor is generic", () => {
      const profile = makeProfile({
        vendor: "Autodesk",
        description: "Haas - Next Generation Control",
        properties: [],
      });
      const result = cpsDialectMapperEngine.mapToDialect(profile);
      expect(result.controller_family).toBe("haas_ngc");
      expect(result.resolution_method).toBe("description_match");
    });
  });

  // ── Arc Format ──────────────────────────────────────────────────

  describe("arc format", () => {
    it("maps useRadius=true to r_word", () => {
      const result = cpsDialectMapperEngine.mapToDialect(HAAS_PROFILE);
      expect(result.arc_format).toBe("r_word");
    });

    it("maps useRadius=false to ijk_incremental", () => {
      const result = cpsDialectMapperEngine.mapToDialect(SIEMENS_PROFILE);
      expect(result.arc_format).toBe("ijk_incremental");
    });
  });

  // ── Safe Retract ────────────────────────────────────────────────

  describe("safe retract", () => {
    it("maps safePositionMethod=G53 to g53", () => {
      const result = cpsDialectMapperEngine.mapToDialect(HAAS_PROFILE);
      expect(result.safe_retract).toBe("g53");
    });

    it("maps safePositionMethod=G28 to g28", () => {
      const result = cpsDialectMapperEngine.mapToDialect(SIEMENS_PROFILE);
      expect(result.safe_retract).toBe("g28");
    });

    it("maps clearanceHeight to clearance_plane", () => {
      const result = cpsDialectMapperEngine.mapToDialect(MAZAK_PROFILE);
      expect(result.safe_retract).toBe("clearance_plane");
    });

    it("defaults to g28 when property missing", () => {
      const result = cpsDialectMapperEngine.mapToDialect(UNKNOWN_PROFILE);
      expect(result.safe_retract).toBe("g28");
    });
  });

  // ── HSM / Smoothing ────────────────────────────────────────────

  describe("HSM / smoothing", () => {
    it("detects enabled HSM on Haas with G187", () => {
      const result = cpsDialectMapperEngine.mapToDialect(HAAS_PROFILE);
      expect(result.hsm.enabled).toBe(true);
      expect(result.hsm.code).toBe("G187");
      expect(result.hsm.tolerance_mm).toBeCloseTo(0.01);
    });

    it("detects enabled HSM on Siemens with CYCLE832", () => {
      const result = cpsDialectMapperEngine.mapToDialect(SIEMENS_PROFILE);
      expect(result.hsm.enabled).toBe(true);
      expect(result.hsm.code).toBe("CYCLE832");
    });

    it("detects disabled HSM when property absent", () => {
      const result = cpsDialectMapperEngine.mapToDialect(UNKNOWN_PROFILE);
      expect(result.hsm.enabled).toBe(false);
    });
  });

  // ── 5-Axis ─────────────────────────────────────────────────────

  describe("5-axis configuration", () => {
    it("detects 5-axis AB on Siemens with TCP and DWO", () => {
      const result = cpsDialectMapperEngine.mapToDialect(SIEMENS_PROFILE);
      expect(result.five_axis.tcp_enabled).toBe(true);
      expect(result.five_axis.dwo_enabled).toBe(true);
      expect(result.five_axis.axis_config).toBe("5axis_ab");
      expect(result.five_axis.tcp_code).toBe("TRAORI");
    });

    it("detects 5-axis BC on Mazak with TCP", () => {
      const result = cpsDialectMapperEngine.mapToDialect(MAZAK_PROFILE);
      expect(result.five_axis.tcp_enabled).toBe(true);
      expect(result.five_axis.axis_config).toBe("5axis_bc");
      expect(result.five_axis.tcp_code).toBe("G43.4");
    });

    it("detects 3-axis when no axis properties present", () => {
      const result = cpsDialectMapperEngine.mapToDialect(HAAS_PROFILE);
      expect(result.five_axis.axis_config).toBe("3axis");
      expect(result.five_axis.tcp_enabled).toBe(false);
    });
  });

  // ── Coolant ────────────────────────────────────────────────────

  describe("coolant", () => {
    it("detects chip conveyor on Haas", () => {
      const result = cpsDialectMapperEngine.mapToDialect(HAAS_PROFILE);
      expect(result.coolant.chip_conveyor).toBe(true);
      expect(result.coolant.flood).toBe(true);
    });

    it("detects TSC from pressure on Mazak", () => {
      const result = cpsDialectMapperEngine.mapToDialect(MAZAK_PROFILE);
      expect(result.coolant.tsc).toBe(true);
      expect(result.coolant.pressure_bar).toBe(70);
    });

    it("defaults flood on when no coolant property", () => {
      const result = cpsDialectMapperEngine.mapToDialect(UNKNOWN_PROFILE);
      expect(result.coolant.flood).toBe(true);
      expect(result.coolant.chip_conveyor).toBe(false);
    });
  });

  // ── Subprograms ────────────────────────────────────────────────

  describe("subprograms", () => {
    it("detects enabled subprograms on Siemens with CALL style", () => {
      const result = cpsDialectMapperEngine.mapToDialect(SIEMENS_PROFILE);
      expect(result.subprogram.enabled).toBe(true);
      expect(result.subprogram.style).toBe("call");
    });

    it("detects disabled subprograms on Haas", () => {
      const result = cpsDialectMapperEngine.mapToDialect(HAAS_PROFILE);
      expect(result.subprogram.enabled).toBe(false);
    });

    it("uses m98 for Mazak subprograms", () => {
      const result = cpsDialectMapperEngine.mapToDialect(MAZAK_PROFILE);
      expect(result.subprogram.enabled).toBe(true);
      expect(result.subprogram.style).toBe("m98");
    });
  });

  // ── Probing ────────────────────────────────────────────────────

  describe("probing", () => {
    it("detects probing on Haas with multi-feature", () => {
      const result = cpsDialectMapperEngine.mapToDialect(HAAS_PROFILE);
      expect(result.probing.available).toBe(true);
      expect(result.probing.multi_feature).toBe(true);
    });

    it("detects no probing on unknown profile", () => {
      const result = cpsDialectMapperEngine.mapToDialect(UNKNOWN_PROFILE);
      expect(result.probing.available).toBe(false);
    });
  });

  // ── Turning ────────────────────────────────────────────────────

  describe("turning", () => {
    it("detects turning with CSS on Fanuc", () => {
      const result = cpsDialectMapperEngine.mapToDialect(FANUC_TURNING_PROFILE);
      expect(result.turning.enabled).toBe(true);
      expect(result.turning.css_support).toBe(true);
    });

    it("detects mill-turn on Mazak with CSS", () => {
      const result = cpsDialectMapperEngine.mapToDialect(MAZAK_PROFILE);
      expect(result.turning.enabled).toBe(true);
      expect(result.turning.css_support).toBe(true);
    });

    it("detects no turning on milling-only profile", () => {
      const result = cpsDialectMapperEngine.mapToDialect(HAAS_PROFILE);
      expect(result.turning.enabled).toBe(false);
    });
  });

  // ── Output Extension ───────────────────────────────────────────

  describe("output extension", () => {
    it("preserves .nc for Haas", () => {
      const result = cpsDialectMapperEngine.mapToDialect(HAAS_PROFILE);
      expect(result.output_extension).toBe("nc");
    });

    it("preserves .mpf for Siemens", () => {
      const result = cpsDialectMapperEngine.mapToDialect(SIEMENS_PROFILE);
      expect(result.output_extension).toBe("mpf");
    });

    it("preserves .eia for Mazak", () => {
      const result = cpsDialectMapperEngine.mapToDialect(MAZAK_PROFILE);
      expect(result.output_extension).toBe("eia");
    });
  });

  // ── Warnings ───────────────────────────────────────────────────

  describe("warnings", () => {
    it("warns on low-confidence resolution", () => {
      const result = cpsDialectMapperEngine.mapToDialect(UNKNOWN_PROFILE);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes("confidence"))).toBe(true);
    });

    it("warns on empty properties", () => {
      const result = cpsDialectMapperEngine.mapToDialect(UNKNOWN_PROFILE);
      expect(result.warnings.some(w => w.includes("zero properties"))).toBe(true);
    });

    it("warns on turning + 5-axis (mill-turn)", () => {
      const result = cpsDialectMapperEngine.mapToDialect(MAZAK_PROFILE);
      expect(result.warnings.some(w => w.includes("mill-turn"))).toBe(true);
    });

    it("no warnings on clean Haas profile", () => {
      const result = cpsDialectMapperEngine.mapToDialect(HAAS_PROFILE);
      expect(result.warnings.length).toBe(0);
    });
  });

  // ── Property Map ───────────────────────────────────────────────

  describe("property map", () => {
    it("includes mapped CPS property names and values", () => {
      const result = cpsDialectMapperEngine.mapToDialect(HAAS_PROFILE);
      expect(result.property_map["arc_format"]).toBeDefined();
      expect(result.property_map["arc_format"].cps_name).toBe("useRadius");
      expect(result.property_map["arc_format"].cps_value).toBe(true);
      expect(result.property_map["arc_format"].prism_value).toBe("r_word");
    });

    it("includes HSM mapping", () => {
      const result = cpsDialectMapperEngine.mapToDialect(HAAS_PROFILE);
      expect(result.property_map["hsm.enabled"]).toBeDefined();
      expect(result.property_map["hsm.enabled"].prism_value).toBe(true);
    });
  });

  // ── Input Validation ───────────────────────────────────────────

  describe("input validation", () => {
    it("throws on null profile", () => {
      expect(() => cpsDialectMapperEngine.mapToDialect(null as any)).toThrow("profile is required");
    });

    it("throws on missing metadata", () => {
      expect(() => cpsDialectMapperEngine.mapToDialect({ properties: [] } as any)).toThrow("metadata is required");
    });

    it("throws on non-array properties", () => {
      expect(() => cpsDialectMapperEngine.mapToDialect({ metadata: {}, properties: "bad" } as any)).toThrow("must be an array");
    });
  });

  // ── Batch Mapping ──────────────────────────────────────────────

  describe("batch mapping", () => {
    it("maps multiple profiles at once", () => {
      const results = cpsDialectMapperEngine.mapBatch([HAAS_PROFILE, SIEMENS_PROFILE, FANUC_TURNING_PROFILE]);
      expect(results).toHaveLength(3);
      expect(results[0].controller_family).toBe("haas_ngc");
      expect(results[1].controller_family).toBe("siemens_840d");
      expect(results[2].controller_family).toBe("fanuc_31i");
    });

    it("handles empty batch", () => {
      const results = cpsDialectMapperEngine.mapBatch([]);
      expect(results).toHaveLength(0);
    });
  });

  // ── Execute Action Router ──────────────────────────────────────

  describe("execute action router", () => {
    it("routes cps_map_dialect correctly", () => {
      const result = cpsDialectMapperEngine.execute("cps_map_dialect", { profile: HAAS_PROFILE });
      expect(result.controller_family).toBe("haas_ngc");
    });

    it("routes cps_map_batch correctly", () => {
      const result = cpsDialectMapperEngine.execute("cps_map_batch", { profiles: [HAAS_PROFILE] });
      expect(result).toHaveLength(1);
    });

    it("throws on unknown action", () => {
      expect(() => cpsDialectMapperEngine.execute("bad_action", {})).toThrow("Unknown action");
    });

    it("throws on cps_map_dialect without profile", () => {
      expect(() => cpsDialectMapperEngine.execute("cps_map_dialect", {})).toThrow("requires 'profile'");
    });
  });
});
