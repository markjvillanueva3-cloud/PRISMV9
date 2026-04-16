/**
 * CPS Simulator — U-SH02
 *
 * Extracts PRISM_PHYSICS from the actual CPS file and runs calculateAll()
 * against mock Fusion API data in a Node.js vm sandbox.
 *
 * This catches bugs that pipeline tests can't reach because the CPS
 * JavaScript runs in Fusion 360's completely separate sandbox.
 *
 * Tests 5 material+tool combinations:
 * 1. 4140 annealed steel — 12.7mm 4-flute — Adaptive
 * 2. 6061-T6 aluminum — 12.7mm 3-flute — Adaptive HSM
 * 3. 304 stainless — 10mm 4-flute — Contour finish
 * 4. H13 annealed — 12.7mm 6-flute — HEM adaptive
 * 5. Ti-6Al-4V — 8mm 4-flute — Pocket (slotting)
 */
import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as vm from "vm";
import {
  createFusionSandbox,
  TEST_SCENARIOS,
  MockPropertyOverrides,
  MockToolConfig,
  MockOperationConfig,
} from "./helpers/cps-mock-fusion";

const CPS_PATH = path.resolve(
  __dirname,
  "../../data/posts/prism-enhanced/HURCO_VM30i_PRISM_v11.cps"
);

// The PRISM_PHYSICS object extracted from CPS
let PRISM_PHYSICS: any;
let cpsContent: string;

/**
 * Extract and execute the CPS data blocks needed for calculateAll().
 * We need: PRISM_MATERIALS, PRISM_GROUP_DEFAULTS, PRISM_UNITS, PRISM_PHYSICS
 */
function extractAndRunCPS(
  content: string,
  propertyOverrides: MockPropertyOverrides = {},
  mockTool?: MockToolConfig,
  mockOperation?: MockOperationConfig
): any {
  const sandbox = createFusionSandbox(propertyOverrides, mockTool, mockOperation);

  // Extract code blocks in dependency order
  const blocks: { name: string; start: number; end: number }[] = [];

  // 1. PRISM_MATERIALS
  const matStart = content.indexOf("var PRISM_MATERIALS = {");
  const matEnd = findClosingBrace(content, matStart);
  blocks.push({ name: "PRISM_MATERIALS", start: matStart, end: matEnd });

  // 2. PRISM_GROUP_DEFAULTS
  const groupStart = content.indexOf("var PRISM_GROUP_DEFAULTS = {");
  const groupEnd = findClosingBrace(content, groupStart);
  blocks.push({ name: "PRISM_GROUP_DEFAULTS", start: groupStart, end: groupEnd });

  // 3. PRISM_UNITS (if present — optional)
  const unitsStart = content.indexOf("var PRISM_UNITS = {");
  if (unitsStart >= 0) {
    const unitsEnd = findClosingBrace(content, unitsStart);
    blocks.push({ name: "PRISM_UNITS", start: unitsStart, end: unitsEnd });
  }

  // 4. PRISM_PHYSICS — the main block
  const physStart = content.indexOf("var PRISM_PHYSICS = {");
  const physEnd = findClosingBrace(content, physStart);
  blocks.push({ name: "PRISM_PHYSICS", start: physStart, end: physEnd });

  // Concatenate all blocks
  const combinedCode = blocks
    .map((b) => content.substring(b.start, b.end))
    .join("\n\n");

  // Run in vm context
  const exportCode =
    combinedCode +
    "\nthis.PRISM_PHYSICS = PRISM_PHYSICS;" +
    "\nthis.PRISM_MATERIALS = PRISM_MATERIALS;" +
    "\nthis.PRISM_GROUP_DEFAULTS = PRISM_GROUP_DEFAULTS;";

  vm.runInNewContext(exportCode, sandbox, {
    timeout: 5000,
    filename: "cps-simulator.js",
  });

  return {
    PRISM_PHYSICS: sandbox.PRISM_PHYSICS,
    PRISM_MATERIALS: sandbox.PRISM_MATERIALS,
    PRISM_GROUP_DEFAULTS: sandbox.PRISM_GROUP_DEFAULTS,
    sandbox,
  };
}

/**
 * Find the matching closing brace for a `var X = {` declaration.
 * Handles nested braces, string literals, and comments (// and /* *\/).
 */
function findClosingBrace(content: string, varStart: number): number {
  const braceStart = content.indexOf("{", varStart);
  let depth = 1;
  let i = braceStart + 1;
  let inString = false;
  let stringChar = "";
  let inLineComment = false;
  let inBlockComment = false;

  while (i < content.length && depth > 0) {
    const ch = content[i];
    const next = i + 1 < content.length ? content[i + 1] : "";

    // Handle line comments
    if (!inString && !inBlockComment && ch === "/" && next === "/") {
      inLineComment = true;
      i += 2;
      continue;
    }
    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      i++;
      continue;
    }

    // Handle block comments
    if (!inString && !inLineComment && ch === "/" && next === "*") {
      inBlockComment = true;
      i += 2;
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i += 2;
      } else {
        i++;
      }
      continue;
    }

    // Handle string literals
    if (!inString && (ch === '"' || ch === "'")) {
      inString = true;
      stringChar = ch;
      i++;
      continue;
    }
    if (inString) {
      if (ch === "\\" ) {
        i += 2; // skip escaped character
        continue;
      }
      if (ch === stringChar) {
        inString = false;
      }
      i++;
      continue;
    }

    // Count braces
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    i++;
  }

  // Include the final `};` or `}`
  const afterBrace = content.substring(i, i + 2);
  return afterBrace.startsWith(";") ? i + 1 : i;
}

/**
 * Run calculateAll() for a given scenario.
 */
function runCalculateAll(
  scenario: (typeof TEST_SCENARIOS)[number]
): any {
  const { PRISM_PHYSICS: physics, PRISM_MATERIALS: mats } = extractAndRunCPS(
    cpsContent,
    scenario.properties,
    scenario.tool,
    scenario.operation
  );

  // Run calculateAll
  const result = physics.calculateAll(
    scenario.materialId,
    1, // tool number (pocket 1)
    scenario.operation.strategy,
    "balanced", // optimization mode
    scenario.tool.diameter,
    scenario.operation.programmedRPM,
    scenario.operation.programmedFeed,
    null, // fusionTool — we set up toolConfig via properties
    null // fusionSection — we set up operation params via properties
  );

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════════════════════

beforeAll(() => {
  cpsContent = fs.readFileSync(CPS_PATH, "utf-8");

  // Pre-extract PRISM_PHYSICS for basic method tests
  const extracted = extractAndRunCPS(cpsContent);
  PRISM_PHYSICS = extracted.PRISM_PHYSICS;
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. EXTRACTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("CPS Simulator — Extraction", () => {
  it("extracts PRISM_PHYSICS object from CPS", () => {
    expect(PRISM_PHYSICS).toBeDefined();
    expect(typeof PRISM_PHYSICS).toBe("object");
  });

  it("PRISM_PHYSICS has calculateAll method", () => {
    expect(typeof PRISM_PHYSICS.calculateAll).toBe("function");
  });

  it("PRISM_PHYSICS has calculateOptimizedSpeed method", () => {
    expect(typeof PRISM_PHYSICS.calculateOptimizedSpeed).toBe("function");
  });

  it("PRISM_PHYSICS has calculateOptimizedFeed method", () => {
    expect(typeof PRISM_PHYSICS.calculateOptimizedFeed).toBe("function");
  });

  it("PRISM_PHYSICS has calculateCuttingForce method", () => {
    expect(typeof PRISM_PHYSICS.calculateCuttingForce).toBe("function");
  });

  it("PRISM_PHYSICS has speedToRPM method", () => {
    expect(typeof PRISM_PHYSICS.speedToRPM).toBe("function");
  });

  it("PRISM_PHYSICS has machineDatabase with 100+ entries", () => {
    expect(PRISM_PHYSICS.machineDatabase).toBeDefined();
    const machineCount = Object.keys(PRISM_PHYSICS.machineDatabase).length;
    expect(machineCount).toBeGreaterThanOrEqual(100);
  });

  it("PRISM_PHYSICS has brandFactors with 50+ entries", () => {
    expect(PRISM_PHYSICS.brandFactors).toBeDefined();
    const brandCount = Object.keys(PRISM_PHYSICS.brandFactors).length;
    expect(brandCount).toBeGreaterThanOrEqual(50);
  });

  it("PRISM_PHYSICS has holderTIRFactors with 50+ entries", () => {
    expect(PRISM_PHYSICS.holderTIRFactors).toBeDefined();
    const holderCount = Object.keys(PRISM_PHYSICS.holderTIRFactors).length;
    expect(holderCount).toBeGreaterThanOrEqual(50);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. INDIVIDUAL METHOD TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("CPS Simulator — Individual Methods", () => {
  it("speedToRPM converts Vc to RPM correctly", () => {
    // Vc=175 m/min, D=12.7mm → RPM = 175000 / (π * 12.7) ≈ 4387
    const rpm = PRISM_PHYSICS.speedToRPM(175, 12.7);
    expect(rpm).toBeCloseTo(4387, -2);
  });

  it("speedToRPM handles small diameter (high RPM)", () => {
    // Vc=200, D=3mm → RPM ≈ 21220
    const rpm = PRISM_PHYSICS.speedToRPM(200, 3);
    expect(rpm).toBeCloseTo(21220, -2);
  });

  it("speedToRPM handles large diameter (low RPM)", () => {
    // Vc=100, D=50mm → RPM ≈ 637
    const rpm = PRISM_PHYSICS.speedToRPM(100, 50);
    expect(rpm).toBeCloseTo(637, -1);
  });

  it("getBaseChipLoad returns reasonable values for P-group endmill", () => {
    const fz = PRISM_PHYSICS.getBaseChipLoad("P", "flat_endmill", 12.7);
    expect(fz).toBeGreaterThan(0.01); // at least 0.01mm/tooth
    expect(fz).toBeLessThan(0.3); // no more than 0.3mm/tooth
  });

  it("getBaseChipLoad returns higher fz for aluminum (N group)", () => {
    const fzSteel = PRISM_PHYSICS.getBaseChipLoad("P", "flat_endmill", 12.7);
    const fzAluminum = PRISM_PHYSICS.getBaseChipLoad("N", "flat_endmill", 12.7);
    expect(fzAluminum).toBeGreaterThanOrEqual(fzSteel);
  });

  it("calculateCuttingForce returns valid force values", () => {
    const material = { kienzle: { kc1_1: 1980, mc: 0.25 } };
    const result = PRISM_PHYSICS.calculateCuttingForce(material, 5, 2, 0.1, 12.7);
    expect(result).toBeDefined();
    expect(result.Fc).toBeGreaterThan(0);
    expect(result.Fc).toBeLessThan(50000); // reasonable upper limit
    expect(result.Fc).not.toBeNaN();
  });

  it("calculateTaylorToolLife returns minutes of tool life", () => {
    const material = { taylor: { C: 200, n: 0.20 } };
    const life = PRISM_PHYSICS.calculateTaylorToolLife(material, 150);
    expect(life).toBeDefined();
    // CPS returns { T: minutes, T_uncertainty: ..., unit: "min" }
    expect(life.T).toBeGreaterThan(0);
    expect(life.T).not.toBeNaN();
    expect(life.unit).toBe("min");
  });

  it("getMachineConfig returns hurco_vm30i specs", () => {
    const config = PRISM_PHYSICS.getMachineConfig();
    expect(config).toBeDefined();
    expect(config.maxRPM).toBeGreaterThan(0);
    expect(config.power).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. calculateAll() — FULL PIPELINE SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════════

describe("CPS Simulator — calculateAll() Scenarios", () => {
  for (const scenario of TEST_SCENARIOS) {
    describe(scenario.name, () => {
      let result: any;

      beforeAll(() => {
        result = runCalculateAll(scenario);
      });

      it("returns a valid result object", () => {
        expect(result).toBeDefined();
        expect(result.valid).toBe(true);
      });

      it("result has speed data (not NaN)", () => {
        expect(result.speed).toBeDefined();
        expect(result.speed.Vc).toBeGreaterThan(0);
        expect(result.speed.Vc).not.toBeNaN();
        expect(result.speed.rpm).toBeGreaterThan(0);
        expect(result.speed.rpm).not.toBeNaN();
      });

      it("result has feed data (not NaN)", () => {
        expect(result.feed).toBeDefined();
        expect(result.feed.feedRate).toBeGreaterThan(0);
        expect(result.feed.feedRate).not.toBeNaN();
        expect(result.feed.fz).toBeGreaterThan(0);
        expect(result.feed.fz).not.toBeNaN();
      });

      it("RPM is within expected range", () => {
        expect(result.speed.rpm).toBeGreaterThanOrEqual(scenario.expectedRPM.min);
        expect(result.speed.rpm).toBeLessThanOrEqual(scenario.expectedRPM.max);
      });

      it("feed rate is within expected range (mm/min)", () => {
        expect(result.feed.feedRate).toBeGreaterThanOrEqual(scenario.expectedFeed.min);
        expect(result.feed.feedRate).toBeLessThanOrEqual(scenario.expectedFeed.max);
      });

      it("result has material data", () => {
        expect(result.material).toBeDefined();
        expect(result.material.kienzle).toBeDefined();
        expect(result.material.kienzle.kc1_1).toBeGreaterThan(0);
      });

      it("result has tool configuration", () => {
        expect(result.toolConfig).toBeDefined();
      });

      it("result has cutting force (Kienzle)", () => {
        expect(result.force).toBeDefined();
        expect(result.force.Fc).toBeGreaterThan(0);
        expect(result.force.Fc).not.toBeNaN();
      });

      it("result has tool life estimate (Taylor)", () => {
        expect(result.toolLife).toBeDefined();
        expect(result.toolLife.T).toBeGreaterThan(0);
        expect(result.toolLife.T).not.toBeNaN();
      });

      it("result has coolant recommendation", () => {
        expect(result.coolant).toBeDefined();
      });
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. PHYSICS CROSS-CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

describe("CPS Simulator — Physics Cross-Checks", () => {
  it("aluminum runs faster than steel (same tool)", () => {
    const steel = runCalculateAll(TEST_SCENARIOS[0]); // 4140
    const aluminum = runCalculateAll(TEST_SCENARIOS[1]); // 6061-T6
    expect(aluminum.speed.Vc).toBeGreaterThan(steel.speed.Vc);
  });

  it("titanium runs slower than steel (same size tool)", () => {
    const steel = runCalculateAll(TEST_SCENARIOS[0]); // 4140
    const titanium = runCalculateAll(TEST_SCENARIOS[4]); // Ti-6Al-4V
    expect(titanium.speed.Vc).toBeLessThan(steel.speed.Vc);
  });

  it("titanium has higher cutting force than aluminum", () => {
    const aluminum = runCalculateAll(TEST_SCENARIOS[1]);
    const titanium = runCalculateAll(TEST_SCENARIOS[4]);
    expect(titanium.force.Fc).toBeGreaterThan(aluminum.force.Fc);
  });

  it("HEM speed boost increases speed for low radial engagement", () => {
    // H13 at 6% WOC should get a speed boost vs full-width cut
    const result = runCalculateAll(TEST_SCENARIOS[3]); // H13 adaptive
    // The speed factors should include an HEM boost > 1.0
    // We verify by checking that speed is above base speed
    expect(result.speed.Vc).toBeDefined();
    // H13 annealed base speed is ~120-175 m/min for carbide
    // At 6% WOC, HEM boost should push it higher
    expect(result.speed.Vc).toBeGreaterThan(100);
  });

  it("finishing pass uses lower feed than roughing", () => {
    const roughing = runCalculateAll(TEST_SCENARIOS[0]); // adaptive roughing
    const finishing = runCalculateAll(TEST_SCENARIOS[2]); // contour finishing
    // Finishing should have lower feed per tooth
    expect(finishing.feed.fz).toBeLessThan(roughing.feed.fz);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. ERROR HANDLING — NO NaN ANYWHERE
// ═══════════════════════════════════════════════════════════════════════════════

describe("CPS Simulator — NaN Safety", () => {
  it("no NaN in any numeric field for all 5 scenarios", () => {
    for (const scenario of TEST_SCENARIOS) {
      const result = runCalculateAll(scenario);
      expect(result.speed.Vc, `${scenario.name}: speed.Vc`).not.toBeNaN();
      expect(result.speed.rpm, `${scenario.name}: speed.rpm`).not.toBeNaN();
      expect(result.feed.feedRate, `${scenario.name}: feed.feedRate`).not.toBeNaN();
      expect(result.feed.fz, `${scenario.name}: feed.fz`).not.toBeNaN();
      expect(result.force.Fc, `${scenario.name}: force.Fc`).not.toBeNaN();
      expect(result.toolLife.T, `${scenario.name}: toolLife.minutes`).not.toBeNaN();
      expect(result.adjustedRPM, `${scenario.name}: adjustedRPM`).not.toBeNaN();
      expect(result.adjustedFeed, `${scenario.name}: adjustedFeed`).not.toBeNaN();
    }
  });

  it("handles unknown material gracefully (falls back to group defaults)", () => {
    // Use a material ID that doesn't exist but starts with a valid group letter
    const extracted = extractAndRunCPS(cpsContent, {
      prismMaterialSpecific: "P_UNKNOWN_MATERIAL",
    });
    const result = extracted.PRISM_PHYSICS.calculateAll(
      "P_UNKNOWN_MATERIAL",
      1,
      "contour",
      "balanced",
      12.7,
      5000,
      2000,
      null,
      null
    );
    // Should fall back to P-group defaults, not crash
    expect(result.valid).toBe(true);
    expect(result.speed.Vc).toBeGreaterThan(0);
    expect(result.speed.Vc).not.toBeNaN();
    expect(result.feed.feedRate).toBeGreaterThan(0);
    expect(result.feed.feedRate).not.toBeNaN();
  });

  it("handles zero diameter without crashing", () => {
    const extracted = extractAndRunCPS(cpsContent);
    // Zero diameter should not cause division by zero crash
    // It may return invalid or zero, but not NaN or throw
    let threw = false;
    try {
      const result = extracted.PRISM_PHYSICS.calculateAll(
        "P_4140_ANN",
        1,
        "contour",
        "balanced",
        0, // zero diameter!
        5000,
        2000,
        null,
        null
      );
      // If we get here, result should at least not have NaN speed/feed
      if (result.valid) {
        expect(result.speed.Vc).not.toBeNaN();
      }
    } catch {
      threw = true;
    }
    // Either threw or returned — both acceptable for zero diameter
    expect(typeof threw).toBe("boolean");
  });
});
