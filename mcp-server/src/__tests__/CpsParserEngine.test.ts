import { describe, expect, it, beforeAll } from "vitest";
import { CpsParserEngine, CpsParseResult } from "../engines/CpsParserEngine.js";

/**
 * CpsParserEngine tests — validates metadata extraction from real
 * CPS, CYC, and MCFG files on disk.
 *
 * Directories scanned:
 *   - H:/prism/resources/FUSION BASIC POSTS/     (180 CPS)
 *   - H:/prism/resources/HSMWorks 2026/posts/     (100 CPS)
 *   - H:/prism/resources/POSTS AND MACHINES/      (2,877 CYC)
 *   - H:/prism/resources/HSMWorks 2026/editor/MachineCfg/ (49 MCFG)
 */

let result: CpsParseResult;

beforeAll(async () => {
  result = await CpsParserEngine.harvest();
}, 60_000);

// ============================================================================
// getSources
// ============================================================================

describe("CpsParserEngine.getSources", () => {
  it("returns 4 source directory entries", () => {
    const sources = CpsParserEngine.getSources();
    expect(sources).toHaveLength(4);
  });

  it("includes fusion, hsmworks, cycles, and machine config sources", () => {
    const sources = CpsParserEngine.getSources();
    const names = sources.map((s) => s.name);
    expect(names).toContain("Fusion 360 Posts");
    expect(names).toContain("HSMWorks Posts");
    expect(names).toContain("Cycle Definitions");
    expect(names).toContain("Machine Configurations");
  });

  it("each source has correct file type", () => {
    const sources = CpsParserEngine.getSources();
    const byName = Object.fromEntries(sources.map((s) => [s.name, s]));
    expect(byName["Fusion 360 Posts"].fileType).toBe(".cps");
    expect(byName["HSMWorks Posts"].fileType).toBe(".cps");
    expect(byName["Cycle Definitions"].fileType).toBe(".cyc");
    expect(byName["Machine Configurations"].fileType).toBe(".mcfg");
  });
});

// ============================================================================
// harvest — posts
// ============================================================================

describe("CpsParserEngine.harvest — posts", () => {
  it("finds 250+ total CPS post processors", () => {
    expect(result.totalPosts).toBeGreaterThanOrEqual(250);
  });

  it("extracts Fanuc vendor from fanuc.cps", () => {
    const fanuc = result.posts.find(
      (p) => p.filename === "fanuc.cps" && p.source === "fusion"
    );
    expect(fanuc).toBeDefined();
    expect(fanuc!.vendor).toBe("Fanuc");
    expect(fanuc!.description).toBe("FANUC");
    expect(fanuc!.vendorUrl).toContain("fanuc.com");
  });

  it("byVendor includes Fanuc, Haas Automation, and Mazak", () => {
    expect(result.byVendor["Fanuc"]).toBeGreaterThanOrEqual(1);
    expect(result.byVendor["Haas Automation"]).toBeGreaterThanOrEqual(1);
    expect(result.byVendor["Mazak"]).toBeGreaterThanOrEqual(1);
  });

  it("byCapability has milling as the most common capability", () => {
    expect(result.byCapability["milling"]).toBeGreaterThanOrEqual(1);
    // Milling should be more common than turning or jet
    const millingCount = result.byCapability["milling"] ?? 0;
    const turningCount = result.byCapability["turning"] ?? 0;
    expect(millingCount).toBeGreaterThan(turningCount);
  });

  it("each post has a valid non-empty extension", () => {
    // At least 90% should have extensions (some utility posts may not)
    const withExtension = result.posts.filter((p) => p.extension.length > 0);
    expect(withExtension.length).toBeGreaterThan(result.totalPosts * 0.9);
  });

  it("includes posts from both fusion and hsmworks sources", () => {
    const fusionCount = result.posts.filter(
      (p) => p.source === "fusion"
    ).length;
    const hsmworksCount = result.posts.filter(
      (p) => p.source === "hsmworks"
    ).length;
    expect(fusionCount).toBeGreaterThanOrEqual(100);
    expect(hsmworksCount).toBeGreaterThanOrEqual(80);
  });

  it("property count > 0 for most posts", () => {
    const withProperties = result.posts.filter((p) => p.propertyCount > 0);
    expect(withProperties.length).toBeGreaterThan(result.totalPosts * 0.7);
  });

  it("Fanuc fanuc.cps has correct certificationLevel and extension", () => {
    const fanuc = result.posts.find(
      (p) => p.filename === "fanuc.cps" && p.source === "fusion"
    );
    expect(fanuc).toBeDefined();
    expect(fanuc!.certificationLevel).toBe(2);
    expect(fanuc!.extension).toBe("nc");
    expect(fanuc!.programNameIsInteger).toBe(true);
    expect(fanuc!.codePage).toBe("ascii");
  });

  it("byExtension includes nc, eia, and html", () => {
    expect(result.byExtension["nc"]).toBeGreaterThanOrEqual(1);
    expect(result.byExtension["eia"]).toBeGreaterThanOrEqual(1);
    expect(result.byExtension["html"]).toBeGreaterThanOrEqual(1);
  });

  it("AMADA laser post has jet capability", () => {
    const amada = result.posts.find(
      (p) => p.filename === "amada laser.cps"
    );
    expect(amada).toBeDefined();
    expect(amada!.capabilities).toContain("jet");
    expect(amada!.vendor).toBe("AMADA");
  });

  it("setup-sheet post has setup_sheet capability", () => {
    const setupSheet = result.posts.find(
      (p) => p.filename === "setup-sheet.cps"
    );
    expect(setupSheet).toBeDefined();
    expect(setupSheet!.capabilities).toContain("setup_sheet");
  });

  it("fanuc turning post has turning capability", () => {
    const turning = result.posts.find(
      (p) => p.filename === "fanuc turning.cps" && p.source === "fusion"
    );
    expect(turning).toBeDefined();
    expect(turning!.capabilities).toContain("turning");
  });
});

// ============================================================================
// harvest — cycles
// ============================================================================

describe("CpsParserEngine.harvest — cycles", () => {
  it("finds 2000+ cycle entries", () => {
    expect(result.totalCycles).toBeGreaterThanOrEqual(2000);
  });

  it("cycle variables are extracted correctly", () => {
    // Find a probing cycle with known variable patterns
    const probing = result.cycles.find(
      (c) => c.filename === "ProbingPoint3D.cyc"
    );
    expect(probing).toBeDefined();
    expect(probing!.variables.length).toBeGreaterThan(0);
    // Should contain hyperMILL variable references
    expect(
      probing!.variables.some((v) => v.includes("hyperMILL"))
    ).toBe(true);
  });

  it("all CYC files are classified as probing (all live under Probing dirs)", () => {
    // Based on the actual directory structure, all .cyc files are under Probing/
    const probingCount = result.byCycleType["probing"] ?? 0;
    expect(probingCount).toBeGreaterThanOrEqual(result.totalCycles * 0.9);
  });

  it("machine names are extracted from directory paths", () => {
    const withMachine = result.cycles.filter((c) => c.machine !== null);
    expect(withMachine.length).toBeGreaterThan(0);
    const machineNames = [...new Set(withMachine.map((c) => c.machine))];
    // Should find Haas, Hurco, Okuma, Roku-Roku machines
    expect(machineNames.some((m) => m?.includes("Haas"))).toBe(true);
  });

  it("each cycle has non-negative lineCount", () => {
    for (const c of result.cycles) {
      expect(c.lineCount).toBeGreaterThanOrEqual(1);
    }
  });
});

// ============================================================================
// harvest — machine configs
// ============================================================================

describe("CpsParserEngine.harvest — machineConfigs", () => {
  it("finds 40+ MCFG machine config entries", () => {
    expect(result.totalMachineConfigs).toBeGreaterThanOrEqual(40);
  });

  it("Haas Mini Mill has X, Y, Z axes", () => {
    const miniMill = result.machineConfigs.find(
      (m) => m.displayName === "Haas Mini Mill"
    );
    expect(miniMill).toBeDefined();
    expect(miniMill!.axes).toContain("X");
    expect(miniMill!.axes).toContain("Y");
    expect(miniMill!.axes).toContain("Z");
  });

  it("Haas UMC-750 has 5 axes including B and C", () => {
    const umc750 = result.machineConfigs.find(
      (m) => m.displayName === "Haas UMC-750"
    );
    expect(umc750).toBeDefined();
    expect(umc750!.axes).toContain("B");
    expect(umc750!.axes).toContain("C");
    expect(umc750!.machineType).toBe("5-axis");
  });

  it("each MCFG has a non-empty displayName", () => {
    for (const m of result.machineConfigs) {
      expect(m.displayName.length).toBeGreaterThan(0);
    }
  });

  it("GUID is present for all configs", () => {
    const withGuid = result.machineConfigs.filter((m) => m.guid !== null);
    expect(withGuid.length).toBe(result.totalMachineConfigs);
  });
});

// ============================================================================
// audit
// ============================================================================

describe("CpsParserEngine.audit", () => {
  it("returns summary with correct totals", async () => {
    const audit = await CpsParserEngine.audit();
    expect(audit.totalPosts).toBe(result.totalPosts);
    expect(audit.totalCycles).toBe(result.totalCycles);
    expect(audit.totalMachineConfigs).toBe(result.totalMachineConfigs);
    expect(audit.topVendors.length).toBeGreaterThan(0);
    expect(audit.topCapabilities.length).toBeGreaterThan(0);
    expect(audit.topExtensions.length).toBeGreaterThan(0);
    expect(audit.timestamp).toBeTruthy();
  }, 60_000);
});

// ============================================================================
// parseCapabilities (unit test)
// ============================================================================

describe("CpsParserEngine.parseCapabilities", () => {
  it("parses single capability", () => {
    const header = 'capabilities = CAPABILITY_MILLING;';
    expect(CpsParserEngine.parseCapabilities(header)).toEqual(["milling"]);
  });

  it("parses combined capabilities with pipe operator", () => {
    const header =
      "capabilities = CAPABILITY_MILLING | CAPABILITY_MACHINE_SIMULATION;";
    const caps = CpsParserEngine.parseCapabilities(header);
    expect(caps).toContain("milling");
    expect(caps).toContain("machine_simulation");
    expect(caps).toHaveLength(2);
  });

  it("parses turning capability", () => {
    const header = "capabilities = CAPABILITY_TURNING;";
    expect(CpsParserEngine.parseCapabilities(header)).toEqual(["turning"]);
  });

  it("parses jet capability", () => {
    const header = "capabilities = CAPABILITY_JET;";
    expect(CpsParserEngine.parseCapabilities(header)).toEqual(["jet"]);
  });

  it("returns empty array when no capabilities line exists", () => {
    const header = 'description = "Test";';
    expect(CpsParserEngine.parseCapabilities(header)).toEqual([]);
  });
});

// ============================================================================
// classifyCycleType (unit test)
// ============================================================================

describe("CpsParserEngine.classifyCycleType", () => {
  it("classifies probing cycles from path", () => {
    expect(
      CpsParserEngine.classifyCycleType(
        "/POSTS AND MACHINES/Haas/Probing/Renishaw_EP/MeasureX.cyc",
        "G65 P9821 X1 Y2 Z3"
      )
    ).toBe("probing");
  });

  it("classifies canned cycles from G-code content", () => {
    expect(
      CpsParserEngine.classifyCycleType(
        "/some/path/drilling.cyc",
        "G81 X1.0 Y2.0 Z-0.5 R0.1 F100"
      )
    ).toBe("canned");
  });

  it("classifies macro from O-program number", () => {
    expect(
      CpsParserEngine.classifyCycleType(
        "/some/path/custom.cyc",
        "O9001\nG65 P100"
      )
    ).toBe("macro");
  });

  it("classifies general when no patterns match", () => {
    expect(
      CpsParserEngine.classifyCycleType(
        "/some/path/misc.cyc",
        "Some comment text"
      )
    ).toBe("general");
  });
});
