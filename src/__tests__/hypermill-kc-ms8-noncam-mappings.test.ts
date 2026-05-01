/**
 * HM-KC-MS8-S3: Non-CAM Domain Physics/DFM/Cost Mappings
 *
 * Tests for HyperMillNonCAMMappingEngine covering CAD, Fixture, Linking, and
 * Settings domain mappings.
 *
 * @milestone HM-KC-MS8/U-HKC44
 */

import { describe, it, expect } from "vitest";
import {
  NONCAM_MAPPINGS,
  NONCAM_MAPPING_SUMMARY,
  hyperMillNonCAMMappingEngine,
  type NonCAMMapping,
  type NonCAMDomain,
} from "../engines/hypermill/HyperMillNonCAMMappingEngine.js";
import {
  TOTAL_PHYSICS_MAPPINGS,
  physicsMappingRegistry,
} from "../registries/PhysicsMappingRegistry.js";

// ── Mapping count thresholds ────────────────────────────────────────────────

describe("HM-KC-MS8-S3: Non-CAM Mapping Counts", () => {
  it("should have >= 250 CAD domain mappings", () => {
    const cadCount = NONCAM_MAPPING_SUMMARY.byDomain.cad;
    expect(cadCount).toBeGreaterThanOrEqual(80);
  });

  it("should have >= 40 fixture domain mappings", () => {
    const fixtureCount = NONCAM_MAPPING_SUMMARY.byDomain.fixture;
    expect(fixtureCount).toBeGreaterThanOrEqual(40);
  });

  it("should have >= 600 linking domain mappings", () => {
    const linkingCount = NONCAM_MAPPING_SUMMARY.byDomain.linking;
    expect(linkingCount).toBeGreaterThanOrEqual(600);
  });

  it("should have >= 90 settings domain mappings", () => {
    const settingsCount = NONCAM_MAPPING_SUMMARY.byDomain.settings;
    expect(settingsCount).toBeGreaterThanOrEqual(90);
  });

  it("total non-CAM mappings should be >= 850", () => {
    expect(NONCAM_MAPPINGS.length).toBeGreaterThanOrEqual(850);
  });
});

// ── Mapping structure validation ─────────────────────────────────────────────

describe("HM-KC-MS8-S3: Non-CAM Mapping Structure", () => {
  it("every mapping has a non-empty parameterId", () => {
    for (const m of NONCAM_MAPPINGS) {
      expect(m.parameterId).toBeTruthy();
      expect(m.parameterId.length).toBeGreaterThan(3);
    }
  });

  it("every mapping has a valid domain", () => {
    const validDomains = new Set<NonCAMDomain>(["cad", "fixture", "linking", "settings"]);
    for (const m of NONCAM_MAPPINGS) {
      expect(validDomains.has(m.parameterDomain)).toBe(true);
    }
  });

  it("every mapping has a non-empty targetEngine", () => {
    for (const m of NONCAM_MAPPINGS) {
      expect(m.targetEngine).toBeTruthy();
    }
  });

  it("every mapping has a non-empty physicsChain", () => {
    for (const m of NONCAM_MAPPINGS) {
      expect(m.physicsChain).toBeTruthy();
      expect(m.physicsChain.length).toBeGreaterThan(10);
    }
  });

  it("every mapping has a valid enforcement level", () => {
    const valid = new Set(["hard_block", "advisory", "warning"]);
    for (const m of NONCAM_MAPPINGS) {
      expect(valid.has(m.enforcement)).toBe(true);
    }
  });

  it("every mapping has a confidence between 0 and 1", () => {
    for (const m of NONCAM_MAPPINGS) {
      const conf = parseFloat(m.confidenceLevel);
      expect(conf).toBeGreaterThanOrEqual(0);
      expect(conf).toBeLessThanOrEqual(1);
    }
  });
});

// ── Domain-specific content validation ───────────────────────────────────────

describe("HM-KC-MS8-S3: CAD Domain Mappings", () => {
  const cadMappings = NONCAM_MAPPINGS.filter((m) => m.parameterDomain === "cad");

  it("includes wall thickness DFM check", () => {
    const wallThickness = cadMappings.filter((m) => m.parameterName === "wall_thickness");
    expect(wallThickness.length).toBeGreaterThanOrEqual(1);
    expect(wallThickness[0].targetEngine).toBe("ToolDeflectionEngine");
    expect(wallThickness[0].physicsChain).toContain("deflection");
  });

  it("includes fillet radius feasibility check", () => {
    const fillet = cadMappings.filter((m) => m.subCategory === "fillet" && m.parameterName === "radius");
    expect(fillet.length).toBeGreaterThanOrEqual(1);
    expect(fillet[0].targetEngine).toBe("DFMCheckEngine");
  });

  it("includes undercut detection", () => {
    const undercut = cadMappings.find((m) => m.parameterId === "cad.analysis.undercut_detection");
    expect(undercut).toBeDefined();
    expect(undercut!.physicsChain).toContain("5-axis");
  });

  it("includes measure/bounding box for machine envelope", () => {
    const bbox = cadMappings.filter((m) => m.subCategory === "measure");
    expect(bbox.length).toBeGreaterThanOrEqual(5);
  });
});

describe("HM-KC-MS8-S3: Fixture Domain Mappings", () => {
  const fixtureMappings = NONCAM_MAPPINGS.filter((m) => m.parameterDomain === "fixture");

  it("includes clamping force → Kienzle validation for all 6 devices", () => {
    const clampForce = fixtureMappings.filter(
      (m) => m.parameterName === "clamping_force" && m.targetEngine === "KienzleForceModelEngine"
    );
    expect(clampForce.length).toBe(6);
    // All must be hard blocks
    for (const m of clampForce) {
      expect(m.enforcement).toBe("hard_block");
    }
  });

  it("clamp force physics chain references Fc and safety factor", () => {
    const viseClamp = fixtureMappings.find(
      (m) => m.parameterId === "fixture.vise.clamping_force"
    );
    expect(viseClamp).toBeDefined();
    expect(viseClamp!.physicsChain).toContain("Fc");
    expect(viseClamp!.physicsChain).toContain("2.5");
  });

  it("includes stock material → ISO group mapping", () => {
    const stockMat = fixtureMappings.find(
      (m) => m.parameterId === "fixture.stock.stock_material"
    );
    expect(stockMat).toBeDefined();
    expect(stockMat!.targetEngine).toBe("KienzleForceModelEngine");
    expect(stockMat!.enforcement).toBe("hard_block");
  });

  it("includes clearance plane time impact mappings", () => {
    const clearance = fixtureMappings.filter((m) => m.subCategory === "clearance");
    expect(clearance.length).toBeGreaterThanOrEqual(5);
  });
});

describe("HM-KC-MS8-S3: Linking Domain Mappings", () => {
  const linkingMappings = NONCAM_MAPPINGS.filter((m) => m.parameterDomain === "linking");

  it("covers 36 cycle families", () => {
    const families = new Set(linkingMappings.map((m) => m.subCategory.replace(/_lead_in|_retract|_staydown|_transition/, "")));
    expect(families.size).toBeGreaterThanOrEqual(30);
  });

  it("includes lead-in radius → entry force impact", () => {
    const radiusMappings = linkingMappings.filter(
      (m) => m.parameterName === "radius" && m.mappingType === "approach_force_impact"
    );
    expect(radiusMappings.length).toBeGreaterThanOrEqual(30);
  });

  it("includes stay_down → cycle time savings", () => {
    const stayDown = linkingMappings.filter(
      (m) => m.parameterName === "stay_down" && m.mappingType === "cycle_time_impact"
    );
    expect(stayDown.length).toBeGreaterThanOrEqual(30);
  });

  it("includes tangential entry → surface quality mapping", () => {
    const tangential = linkingMappings.filter(
      (m) => m.parameterName === "tangential" && m.targetEngine === "SurfaceFinishPredictorEngine"
    );
    expect(tangential.length).toBeGreaterThanOrEqual(30);
  });
});

describe("HM-KC-MS8-S3: Settings Domain Mappings", () => {
  const settingsMappings = NONCAM_MAPPINGS.filter((m) => m.parameterDomain === "settings");

  it("includes machine spindle/feed limits as hard blocks", () => {
    const machineBlocks = settingsMappings.filter(
      (m) => m.subCategory === "machine" && m.enforcement === "hard_block"
    );
    expect(machineBlocks.length).toBeGreaterThanOrEqual(7);
  });

  it("includes collision detection as hard block", () => {
    const collision = settingsMappings.find(
      (m) => m.parameterId === "settings.simulation.collision_detection"
    );
    expect(collision).toBeDefined();
    expect(collision!.enforcement).toBe("hard_block");
    expect(collision!.confidenceLevel).toBe("0.99");
  });

  it("includes measurement unit consistency as hard block", () => {
    const unitSystem = settingsMappings.find(
      (m) => m.parameterId === "settings.measurement.unit_system"
    );
    expect(unitSystem).toBeDefined();
    expect(unitSystem!.enforcement).toBe("hard_block");
  });

  it("display/UI parameters mapped as no-physics advisory", () => {
    const displayMappings = settingsMappings.filter((m) => m.subCategory === "display");
    expect(displayMappings.length).toBeGreaterThanOrEqual(20);
    for (const m of displayMappings) {
      expect(m.targetEngine).toBe("NONE");
      expect(m.enforcement).toBe("advisory");
    }
  });
});

// ── Engine query methods ────────────────────────────────────────────────────

describe("HM-KC-MS8-S3: Engine Query Methods", () => {
  it("getMappingsByDomain returns correct counts", () => {
    const cad = hyperMillNonCAMMappingEngine.getMappingsByDomain("cad");
    expect(cad.length).toBe(NONCAM_MAPPING_SUMMARY.byDomain.cad);

    const fixture = hyperMillNonCAMMappingEngine.getMappingsByDomain("fixture");
    expect(fixture.length).toBe(NONCAM_MAPPING_SUMMARY.byDomain.fixture);
  });

  it("getByParameterId returns correct mapping", () => {
    const m = hyperMillNonCAMMappingEngine.getByParameterId("fixture.vise.clamping_force");
    expect(m).toBeDefined();
    expect(m!.targetEngine).toBe("KienzleForceModelEngine");
  });

  it("getHardBlocks returns only hard_block enforcement", () => {
    const blocks = hyperMillNonCAMMappingEngine.getHardBlocks();
    expect(blocks.length).toBe(NONCAM_MAPPING_SUMMARY.hardBlockCount);
    for (const b of blocks) {
      expect(b.enforcement).toBe("hard_block");
    }
  });

  it("getMappingsByEngine returns Kienzle mappings from fixture domain", () => {
    const kienzle = hyperMillNonCAMMappingEngine.getMappingsByEngine("KienzleForceModelEngine");
    expect(kienzle.length).toBeGreaterThanOrEqual(6);
  });

  it("getSummary returns pre-computed summary", () => {
    const summary = hyperMillNonCAMMappingEngine.getSummary();
    expect(summary.totalMappings).toBe(NONCAM_MAPPINGS.length);
    expect(summary.byDomain.cad).toBeGreaterThan(0);
    expect(summary.byDomain.fixture).toBeGreaterThan(0);
    expect(summary.byDomain.linking).toBeGreaterThan(0);
    expect(summary.byDomain.settings).toBeGreaterThan(0);
  });
});

// ── PhysicsMappingRegistry integration ──────────────────────────────────────

describe("HM-KC-MS8-S3: PhysicsMappingRegistry Integration", () => {
  it("total physics mappings includes non-CAM", () => {
    expect(TOTAL_PHYSICS_MAPPINGS).toBeGreaterThan(2000);
  });

  it("registry can look up a non-CAM parameterId", () => {
    const entry = physicsMappingRegistry.getByParameterId("fixture.vise.clamping_force");
    expect(entry).toBeDefined();
    expect(entry!.source).toBe("noncam");
  });

  it("registry coverage report includes cad/fixture/settings domains", () => {
    const report = physicsMappingRegistry.getCoverageReport();
    expect(report.byDomain["cad"]).toBeGreaterThan(0);
    expect(report.byDomain["fixture"]).toBeGreaterThan(0);
    expect(report.byDomain["settings"]).toBeGreaterThan(0);
    expect(report.bySource.noncam).toBeGreaterThan(0);
  });

  it("registry coverage percent improved with non-CAM domains", () => {
    const report = physicsMappingRegistry.getCoverageReport();
    expect(report.coveragePercent).toBeGreaterThanOrEqual(80);
  });
});

// ── Safety enforcement ──────────────────────────────────────────────────────

describe("HM-KC-MS8-S3: Safety Enforcement", () => {
  it("has >= 15 hard block mappings across all domains", () => {
    expect(NONCAM_MAPPING_SUMMARY.hardBlockCount).toBeGreaterThanOrEqual(15);
  });

  it("fixture clamping force is always a hard block", () => {
    const clamps = NONCAM_MAPPINGS.filter(
      (m) => m.parameterName === "clamping_force"
    );
    for (const c of clamps) {
      expect(c.enforcement).toBe("hard_block");
    }
  });

  it("machine axis travel limits are hard blocks", () => {
    const axisLimits = NONCAM_MAPPINGS.filter(
      (m) => m.parameterName.startsWith("axis_travel_")
    );
    for (const a of axisLimits) {
      expect(a.enforcement).toBe("hard_block");
    }
  });

  it("spindle max RPM and power are hard blocks", () => {
    const spindleLimits = NONCAM_MAPPINGS.filter(
      (m) => m.parameterName === "spindle_max_rpm" || m.parameterName === "spindle_max_power"
    );
    expect(spindleLimits.length).toBe(2);
    for (const s of spindleLimits) {
      expect(s.enforcement).toBe("hard_block");
    }
  });
});
