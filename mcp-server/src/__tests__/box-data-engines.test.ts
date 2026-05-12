/**
 * BOX Data Engines Tests — FusionCPSParser, OkumaParametricProgram, PostProcessorCapabilityMatrix
 *
 * Tests the 3 engines built from C:\PRISM\BOX analysis data.
 */

import { describe, it, expect } from "vitest";

// ── FusionCPSParserEngine Tests ─────────────────────────────────────────

describe("FusionCPSParserEngine", () => {
  it("should import and instantiate", async () => {
    const { fusionCPSParserEngine } = await import(
      "../engines/FusionCPSParserEngine.js"
    );
    expect(fusionCPSParserEngine).toBeDefined();
  });

  it("should parse a single CPS file content", async () => {
    const { fusionCPSParserEngine } = await import(
      "../engines/FusionCPSParserEngine.js"
    );
    const cpsContent = `
description = "FANUC";
vendor = "Fanuc";
vendorUrl = "http://www.fanuc.com";
extension = "nc";
programNameIsInteger = true;
capabilities = CAPABILITY_MILLING | CAPABILITY_MACHINE_SIMULATION;
tolerance = spatial(0.002, MM);
minimumChordLength = spatial(0.25, MM);
minimumCircularRadius = spatial(0.01, MM);
maximumCircularRadius = spatial(1000, MM);
minimumCircularSweep = toRad(0.01);
maximumCircularSweep = toRad(180);
allowHelicalMoves = true;
highFeedrate = (unit == MM) ? 5000 : 200;
probeMultipleFeatures = true;
properties = {
  preloadTool: {
    title: "Preload tool",
    description: "Preloads the next tool at a tool change.",
    group: "preferences",
    type: "boolean",
    value: true,
    scope: "post"
  }
};
`;
    const result = fusionCPSParserEngine.parseCPSFile(cpsContent);
    expect(result.description).toBe("FANUC");
    expect(result.vendor).toBe("Fanuc");
    expect(result.extension).toBe("nc");
    expect(result.capabilities.join(",")).toMatch(/MILLING|CAPABILITY_MILLING/);
    expect(result.allowHelicalMoves).toBe(true);
    expect(result.tolerance_mm).toBeCloseTo(0.002, 3);
  });

  it("should extract capabilities correctly", async () => {
    const { fusionCPSParserEngine } = await import(
      "../engines/FusionCPSParserEngine.js"
    );
    const content = `capabilities = CAPABILITY_MILLING | CAPABILITY_TURNING | CAPABILITY_MACHINE_SIMULATION;`;
    const caps = fusionCPSParserEngine.extractCapabilities(content);
    expect(caps.join(",")).toMatch(/MILLING|CAPABILITY_MILLING/);
    expect(caps.join(",")).toMatch(/TURNING|CAPABILITY_TURNING/);
    expect(caps.join(",")).toMatch(/MACHINE_SIMULATION|CAPABILITY_MACHINE_SIMULATION/);
  });

  it("should extract motion limits", async () => {
    const { fusionCPSParserEngine } = await import(
      "../engines/FusionCPSParserEngine.js"
    );
    const content = `
minimumChordLength = spatial(0.25, MM);
minimumCircularRadius = spatial(0.01, MM);
maximumCircularRadius = spatial(1000, MM);
minimumCircularSweep = toRad(0.01);
maximumCircularSweep = toRad(180);
`;
    const limits = fusionCPSParserEngine.extractMotionLimits(content);
    expect(limits.minimumChordLength_mm).toBeCloseTo(0.25);
    expect(limits.maximumCircularRadius_mm).toBeCloseTo(1000);
  });

  it("should search by vendor", async () => {
    const { fusionCPSParserEngine } = await import(
      "../engines/FusionCPSParserEngine.js"
    );
    // Parse a couple entries first
    fusionCPSParserEngine.parseCPSFile(
      `description = "FANUC"; vendor = "Fanuc"; extension = "nc"; capabilities = CAPABILITY_MILLING;`,
      "fanuc.cps"
    );
    fusionCPSParserEngine.parseCPSFile(
      `description = "HAAS"; vendor = "Haas Automation"; extension = "nc"; capabilities = CAPABILITY_MILLING;`,
      "haas.cps"
    );
    const fanucResults = fusionCPSParserEngine.searchByVendor("fanuc");
    expect(fanucResults.length).toBeGreaterThanOrEqual(1);
    expect(fanucResults[0].vendor.toLowerCase()).toContain("fanuc");
    fusionCPSParserEngine.clearCache();
  });
});

// ── OkumaParametricProgramEngine Tests ──────────────────────────────────

describe("OkumaParametricProgramEngine", () => {
  it("should import and instantiate", async () => {
    const { okumaParametricProgramEngine } = await import(
      "../engines/OkumaParametricProgramEngine.js"
    );
    expect(okumaParametricProgramEngine).toBeDefined();
  });

  it("should calculate RPM from SFM and diameter", async () => {
    const { okumaParametricProgramEngine } = await import(
      "../engines/OkumaParametricProgramEngine.js"
    );
    // RPM = SFM * 3.82 / diameter
    const rpm = okumaParametricProgramEngine.calculateRPM(755, 1.905);
    expect(rpm).toBeCloseTo((755 * 3.82) / 1.905, 0);
  });

  it("should calculate drill point depth", async () => {
    const { okumaParametricProgramEngine } = await import(
      "../engines/OkumaParametricProgramEngine.js"
    );
    // depth = (dia/2) / tan(angle/2)
    const depthResult = okumaParametricProgramEngine.calculateDrillDepth(
      0.59375, 130, 2.015, 0.118
    );
    expect(depthResult.totalDepth).toBeGreaterThan(2);
  });

  it("should get smart defaults", async () => {
    const { okumaParametricProgramEngine } = await import(
      "../engines/OkumaParametricProgramEngine.js"
    );
    const defaults = okumaParametricProgramEngine.getDefaults("4140");
    expect(defaults).toBeDefined();
    expect(defaults.speeds).toBeDefined();
  });

  it("should generate a casing program", async () => {
    const { okumaParametricProgramEngine } = await import(
      "../engines/OkumaParametricProgramEngine.js"
    );
    const defaults = okumaParametricProgramEngine.getDefaults("4140");
    const result = okumaParametricProgramEngine.generateCasingProgram({
      programNumber: 1001,
      geometry: {
        stockDiameter: 1.905,
        finishOD: 1.755,
        finishID: 0.618,
        partLength: 2.015,
        drillDiameter: 0.59375,
      },
      odChamfer: { type: "chamfer", depth: 0.04, angle: 45 },
      tools: { roughNoseRadius: 0.031, finishNoseRadius: 0.0156 },
      speeds: defaults.speeds ?? {
        odRoughSFM: 755, odFinishSFM: 825, idSFM: 400, cutoffSFM: 500,
        faceRoughFeed: 0.008, faceFinishFeed: 0.0045,
        odRoughFeed: 0.012, odFinishFeed: 0.0045,
        idRoughFeed: 0.007, idFinishFeed: 0.0045, cutoffFeed: 0.004,
      },
      cutting: {
        odDepthOfCut: 0.1, idDepthOfCut: 0.06, faceDepthOfCut: 0.08,
        maxRoughRPM: 2500, maxFinishRPM: 2500,
      },
      spotDrill: { diameter: 0.5, sfm: 131, feed: 0.002, pointAngle: 118, usePeck: false },
      drill1: { diameter: 0.59375, sfm: 95, feed: 0.005, peckDepth: 0.13, pointAngle: 130, usePeck: false },
      clearance: { zClearance: 0.03, xClearance: 0.03, zDrillClearance: 0.5, leadInDistance: 0.06 },
      stockAllowances: { odRadial: 0.015, odAxial: 0.002, idRadial: 0.006, idAxial: 0, faceZ: 0.015 },
      options: { includeG140G270: false, odToIdStop: false, skipIdRoughing: false, faceMultiPass: false },
    });
    expect(result.gcode).toContain("O1001");
    expect(result.gcode).toContain("G96");  // CSS mode
    expect(result.gcode).toContain("G50");  // max RPM
    expect(result.gcode).toContain("M30");  // program end
    expect(result.lineCount).toBeGreaterThan(50);
    expect(result.operations.length).toBeGreaterThan(3);
  });

  it("should validate a basic Okuma program", async () => {
    const { okumaParametricProgramEngine } = await import(
      "../engines/OkumaParametricProgramEngine.js"
    );
    const simpleProgram = `O1001
V1 = 2.0
V2 = 1.5
G50 S2500
G96 S755 M3
G0 X2.0 Z0.1
G1 X1.5 F0.012
M30`;
    const result = okumaParametricProgramEngine.validateProgram(simpleProgram);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });
});

// ── PostProcessorCapabilityMatrixEngine Tests ───────────────────────────

describe("PostProcessorCapabilityMatrixEngine", () => {
  it("should import and instantiate", async () => {
    const { postProcessorCapabilityMatrixEngine } = await import(
      "../engines/PostProcessorCapabilityMatrixEngine.js"
    );
    expect(postProcessorCapabilityMatrixEngine).toBeDefined();
  });

  it("should return full capability matrix", async () => {
    const { postProcessorCapabilityMatrixEngine } = await import(
      "../engines/PostProcessorCapabilityMatrixEngine.js"
    );
    const matrix = postProcessorCapabilityMatrixEngine.getMatrix();
    expect(matrix.length).toBeGreaterThanOrEqual(10);
    // Should have Fanuc, Haas, Siemens, Heidenhain, Mazak at minimum
    const families = matrix.map((c: any) => c.family.toLowerCase());
    expect(families).toContain("fanuc");
    expect(families).toContain("haas");
    expect(families).toContain("siemens");
    expect(families).toContain("heidenhain");
    expect(families).toContain("mazak");
  });

  it("should get a specific controller", async () => {
    const { postProcessorCapabilityMatrixEngine } = await import(
      "../engines/PostProcessorCapabilityMatrixEngine.js"
    );
    const fanuc = postProcessorCapabilityMatrixEngine.getController("fanuc");
    expect(fanuc).toBeDefined();
    expect(fanuc!.smoothing.type).toBe("G05.1");
    expect(fanuc!.capabilities).toContain("MILLING");
  });

  it("should query by capability", async () => {
    const { postProcessorCapabilityMatrixEngine } = await import(
      "../engines/PostProcessorCapabilityMatrixEngine.js"
    );
    const turning = postProcessorCapabilityMatrixEngine.query({ capability: "TURNING" });
    expect(turning.length).toBeGreaterThanOrEqual(5);
    for (const c of turning) {
      expect(c.capabilities).toContain("TURNING");
    }
  });

  it("should compare two controllers", async () => {
    const { postProcessorCapabilityMatrixEngine } = await import(
      "../engines/PostProcessorCapabilityMatrixEngine.js"
    );
    const comparison = postProcessorCapabilityMatrixEngine.compare(["fanuc", "haas"]);
    expect(comparison.controllers.map((c: string) => c.toLowerCase())).toEqual(["fanuc", "haas"]);
    expect(comparison.dimensions.length).toBeGreaterThan(5);
  });

  it("should list all families", async () => {
    const { postProcessorCapabilityMatrixEngine } = await import(
      "../engines/PostProcessorCapabilityMatrixEngine.js"
    );
    const families = postProcessorCapabilityMatrixEngine.listFamilies();
    expect(families.length).toBeGreaterThanOrEqual(10);
  });

  it("should return summary stats", async () => {
    const { postProcessorCapabilityMatrixEngine } = await import(
      "../engines/PostProcessorCapabilityMatrixEngine.js"
    );
    const summary = postProcessorCapabilityMatrixEngine.getSummary();
    // Engine uses camelCase: totalFamilies, totalPosts
    expect(summary).toHaveProperty("totalFamilies");
    expect(summary).toHaveProperty("totalPosts");
  });

  it("should recommend a post processor", async () => {
    const { postProcessorCapabilityMatrixEngine } = await import(
      "../engines/PostProcessorCapabilityMatrixEngine.js"
    );
    const result = postProcessorCapabilityMatrixEngine.selectPost({
      capability: "MILLING",
      probing: true,
    });
    expect(result.recommended.length).toBeGreaterThan(0);
  });
});
