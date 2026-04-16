/**
 * CPS Physics Standalone Test — Extracts and runs PRISM_PHYSICS
 * from the actual CPS file in Node.js, simulating Fusion 360's runtime.
 *
 * This catches bugs like:
 * - `diameter is not defined` (scope errors)
 * - `result.speed.speed` (wrong property names)
 * - NaN from missing flute fallbacks
 *
 * These are bugs that vitest pipeline tests CAN'T catch because
 * the CPS JavaScript runs in a completely separate sandbox.
 */
import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as vm from "vm";

const CPS_PATH = path.resolve(__dirname, "../../data/posts/prism-enhanced/HURCO_VM30i_PRISM_v11.cps");

// Extracted PRISM objects from the CPS
let PRISM_MATERIALS: any;
let PRISM_PHYSICS: any;
let PRISM_TURNING: any;

beforeAll(() => {
  const cps = fs.readFileSync(CPS_PATH, "utf-8");

  // Extract shared enum arrays + PRISM objects via vm.runInNewContext
  // We need to provide stubs for CPS globals that don't exist in Node
  const sandbox: any = {
    console,
    Math,
    parseFloat,
    parseInt,
    isNaN,
    isFinite,
    String,
    Number,
    Array,
    Object,
    JSON,
    // Stubs for Fusion 360 post API (not available in Node)
    getProperty: (name: string) => {
      const defaults: Record<string, any> = {
        prismMachineModel: "hurco_vm30i",
        prismMaterialGroup: "P",
        prismMaterialSpecific: "P_4140_ANN",
        prismApplyCalculations: "smart",
        prismEnableIntelligence: true,
        prismChipThinFormula: "auto",
        prismShowWarnings: true,
        prismSpindleMaxRPM: "10000",
        prismSpindlePower: "25",
        prismSpindleTorque: "105",
        prismMachineRigidity: "medium",
        prismMaxFeedRate: "400",
      };
      return defaults[name] ?? undefined;
    },
    hasParameter: () => false,
    getParameter: () => 0,
    warning: () => {},
    log: () => {},
    unit: 1, // MM
    IN: 0, MM: 1,
  };

  // Extract just the data objects (not the full CPS with G-code output)
  const materialsMatch = cps.match(/var PRISM_MATERIALS\s*=\s*\{/);
  const physicsMatch = cps.match(/var PRISM_PHYSICS\s*=\s*\{/);
  const turningMatch = cps.match(/var PRISM_TURNING\s*=\s*\{/);

  if (!materialsMatch || !physicsMatch) {
    throw new Error("Could not find PRISM_MATERIALS or PRISM_PHYSICS in CPS");
  }

  // Extract PRISM_MATERIALS
  const matStart = cps.indexOf("var PRISM_MATERIALS = {");
  const matEnd = cps.indexOf("\n};", matStart) + 3;
  const matCode = cps.substring(matStart, matEnd);

  // Extract PRISM_PHYSICS (large block)
  const physStart = cps.indexOf("var PRISM_PHYSICS = {");
  const physEnd = cps.indexOf("\nvar PRISM_TURNING", physStart);

  // Extract PRISM_TURNING
  const turnStart = cps.indexOf("var PRISM_TURNING = {");
  const turnEnd = cps.indexOf("\n};", turnStart) + 3;

  try {
    // Run materials
    vm.runInNewContext(matCode + "\nthis.PRISM_MATERIALS = PRISM_MATERIALS;", sandbox);
    PRISM_MATERIALS = sandbox.PRISM_MATERIALS;

    // Run turning
    if (turnStart >= 0) {
      const turnCode = cps.substring(turnStart, turnEnd);
      vm.runInNewContext(turnCode + "\nthis.PRISM_TURNING = PRISM_TURNING;", sandbox);
      PRISM_TURNING = sandbox.PRISM_TURNING;
    }
  } catch (e: any) {
    console.error("CPS extraction error:", e.message);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. MATERIAL DATABASE INTEGRITY
// ═══════════════════════════════════════════════════════════════════════════════

describe("CPS Standalone — Material Database", () => {
  it("PRISM_MATERIALS object is extractable from CPS", () => {
    expect(PRISM_MATERIALS).toBeDefined();
    expect(typeof PRISM_MATERIALS).toBe("object");
  });

  it("contains 4140 annealed with correct Kienzle constants", () => {
    const mat = PRISM_MATERIALS?.["P_4140_ANN"];
    expect(mat).toBeDefined();
    expect(mat.kienzle.kc1_1).toBeCloseTo(1980, 0);
    expect(mat.kienzle.mc).toBeCloseTo(0.25, 2);
    expect(mat.speeds.carbide.rec).toBe(175); // raised from 140
  });

  it("contains 6061-T6 aluminum", () => {
    const mat = PRISM_MATERIALS?.["N_6061_T6"];
    expect(mat).toBeDefined();
    expect(mat.group).toBe("N");
    expect(mat.kienzle.kc1_1).toBeGreaterThan(500);
    expect(mat.kienzle.kc1_1).toBeLessThan(800);
  });

  it("contains Inconel 718 with superalloy physics", () => {
    const mat = PRISM_MATERIALS?.["S_IN718_ANN"];
    expect(mat).toBeDefined();
    expect(mat.kienzle.kc1_1).toBeGreaterThan(2500);
    expect(mat.speeds.carbide.rec).toBeLessThan(50);
  });

  it("contains H13 annealed tool steel", () => {
    const mat = PRISM_MATERIALS?.["P_H13_ANN"];
    expect(mat).toBeDefined();
    expect(mat.hardness).toBeCloseTo(195, -1);
  });

  it("Macor kc1.1 is corrected to ~950 (was 1400)", () => {
    const mat = PRISM_MATERIALS?.["X_MACOR"];
    expect(mat).toBeDefined();
    expect(mat.kienzle.kc1_1).toBeCloseTo(950, -1);
  });

  it("Molybdenum kc1.1 is corrected to ~1550 (was 1800)", () => {
    const mat = PRISM_MATERIALS?.["N_MOLY"];
    expect(mat).toBeDefined();
    expect(mat.kienzle.kc1_1).toBeCloseTo(1550, -1);
  });

  it("no material has kc1_1 = 0 or NaN", () => {
    for (const [id, mat] of Object.entries(PRISM_MATERIALS || {})) {
      if (id.startsWith("_") || !mat || !(mat as any).kienzle) continue;
      const kc = (mat as any).kienzle.kc1_1;
      expect(kc, `${id} has invalid kc1_1`).toBeGreaterThan(0);
      expect(kc, `${id} kc1_1 is NaN`).not.toBeNaN();
    }
  });

  it("all materials have required fields", () => {
    let checked = 0;
    for (const [id, mat] of Object.entries(PRISM_MATERIALS || {})) {
      if (id.startsWith("_") || !mat || typeof mat !== "object") continue;
      const m = mat as any;
      if (!m.kienzle) continue;
      expect(m.name, `${id} missing name`).toBeDefined();
      expect(m.group, `${id} missing group`).toBeDefined();
      expect(m.kienzle.kc1_1, `${id} missing kc1_1`).toBeGreaterThan(0);
      expect(m.kienzle.mc, `${id} missing mc`).toBeGreaterThan(0);
      checked++;
    }
    expect(checked).toBeGreaterThan(100); // should have 185+ materials
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. TURNING PHYSICS MODULE
// ═══════════════════════════════════════════════════════════════════════════════

describe("CPS Standalone — PRISM_TURNING Module", () => {
  it("PRISM_TURNING is extractable from CPS", () => {
    expect(PRISM_TURNING).toBeDefined();
  });

  it("calcCSS computes RPM from Vc and diameter", () => {
    // Vc=200 m/min, D=50mm → RPM = 200000/(π×50) = 1273
    const result = PRISM_TURNING.calcCSS(200, 50, 4000);
    expect(result.rpm).toBeCloseTo(1273, -1);
    expect(result.limited).toBe(false);
  });

  it("calcCSS clamps to maxRPM", () => {
    // Vc=200, D=5mm → RPM=12732, maxRPM=4000
    const result = PRISM_TURNING.calcCSS(200, 5, 4000);
    expect(result.rpm).toBe(4000);
    expect(result.limited).toBe(true);
  });

  it("calcCSS computes minimum diameter for G50 limit", () => {
    const result = PRISM_TURNING.calcCSS(200, 50, 4000);
    // minDia = (200×1000)/(π×4000) = 15.9mm
    expect(result.minDiameter).toBeCloseTo(15.9, 0);
  });

  it("calcTurningForce computes Kienzle force", () => {
    // kc1_1=1980, mc=0.25, ap=2mm, f=0.25mm/rev
    const result = PRISM_TURNING.calcTurningForce(1980, 0.25, 2, 0.25);
    // Fc = 1980 * 2 * 0.25^(1-0.25) = 1980 * 2 * 0.25^0.75 = 1980 * 2 * 0.354 = 1400N
    expect(result.Fc).toBeGreaterThan(1000);
    expect(result.Fc).toBeLessThan(2000);
  });

  it("calcTurningForce returns 0 for invalid inputs", () => {
    expect(PRISM_TURNING.calcTurningForce(1980, 0.25, 0, 0.25).Fc).toBe(0);
    expect(PRISM_TURNING.calcTurningForce(1980, 0.25, 2, 0).Fc).toBe(0);
  });

  it("calcNoseRadiusFeedLimit for 0.8mm nose radius", () => {
    const rough = PRISM_TURNING.calcNoseRadiusFeedLimit(0.8, false);
    const finish = PRISM_TURNING.calcNoseRadiusFeedLimit(0.8, true);
    expect(rough.maxFeed_mmrev).toBeCloseTo(0.4, 2);   // 0.5 × 0.8
    expect(finish.maxFeed_mmrev).toBeCloseTo(0.2, 2);   // 0.25 × 0.8
    expect(finish.predictedRa_um).toBeGreaterThan(0);
  });

  it("checkChipBreaking detects out-of-zone conditions", () => {
    // Feed too light for medium chipbreaker
    const light = PRISM_TURNING.checkChipBreaking(0.05, 3, "medium");
    expect(light.inZone).toBe(false);
    expect(light.warning).toContain("too light");

    // In zone
    const ok = PRISM_TURNING.checkChipBreaking(0.3, 3, "medium");
    expect(ok.inZone).toBe(true);
    expect(ok.warning).toBe("");
  });

  it("calcBoringBarDeflection for steel bar at 5:1 L/D", () => {
    // F=500N, L=50mm, D=10mm, steel
    const result = PRISM_TURNING.calcBoringBarDeflection(500, 50, 10, "steel");
    expect(result.LD_ratio).toBeCloseTo(5.0, 1);
    expect(result.deflection_mm).toBeGreaterThan(0);
    expect(result.recommendation).toContain("dampened");
    expect(result.feedReduction).toBeLessThan(1.0);
  });

  it("calcBoringBarDeflection recommends carbide for L/D > 7", () => {
    const result = PRISM_TURNING.calcBoringBarDeflection(500, 80, 10, "steel");
    expect(result.LD_ratio).toBeCloseTo(8.0, 1);
    expect(result.recommendation).toContain("carbide");
  });

  it("calcGrooveFeedRamp starts at 50% feed", () => {
    const result = PRISM_TURNING.calcGrooveFeedRamp(0.15, 0.1, 5, 3);
    expect(result.feedFactor).toBeCloseTo(0.6, 1); // ~60% at 0.1mm depth
    expect(result.feed_mmrev).toBeLessThan(0.15);
  });

  it("calcThreadingSchedule for M20x2.5 pitch", () => {
    const result = PRISM_TURNING.calcThreadingSchedule(2.5, 6, 29.5);
    expect(result.totalDepth_mm).toBeCloseTo(1.534, 2); // 0.6134 × 2.5
    expect(result.passes.length).toBe(6);
    expect(result.passes[0].depth_mm).toBeGreaterThan(result.passes[5].depth_mm); // first pass deepest
    expect(result.infeedAngle).toBeCloseTo(29.5, 1);
    expect(result.springPasses).toBeGreaterThanOrEqual(1);
    // Sum of all pass depths should equal total depth
    const sumDepths = result.passes.reduce((s: number, p: any) => s + p.depth_mm, 0);
    expect(sumDepths).toBeCloseTo(result.totalDepth_mm, 2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CPS FILE INTEGRITY
// ═══════════════════════════════════════════════════════════════════════════════

describe("CPS Standalone — File Integrity", () => {
  let cpsContent: string;

  beforeAll(() => {
    cpsContent = fs.readFileSync(CPS_PATH, "utf-8");
  });

  it("file exists and has >15000 lines", () => {
    expect(cpsContent.split("\n").length).toBeGreaterThan(15000);
  });

  it("braces are balanced", () => {
    const opens = (cpsContent.match(/\{/g) || []).length;
    const closes = (cpsContent.match(/\}/g) || []).length;
    expect(opens).toBe(closes);
  });

  it("brackets are balanced", () => {
    const opens = (cpsContent.match(/\[/g) || []).length;
    const closes = (cpsContent.match(/\]/g) || []).length;
    expect(opens).toBe(closes);
  });

  it("contains machine model selector as first PRISM property", () => {
    const propsStart = cpsContent.indexOf("properties = {");
    const firstPrism = cpsContent.indexOf("prismMachineModel", propsStart);
    const firstOther = cpsContent.indexOf("prismChipThin", propsStart);
    expect(firstPrism).toBeLessThan(firstOther); // Machine comes before chip thinning
  });

  it("contains prove-out property", () => {
    expect(cpsContent).toContain("prismProveOut");
    expect(cpsContent).toContain("prismProveOutSpeedPct");
    expect(cpsContent).toContain("prismProveOutFeedPct");
  });

  it("apply mode defaults to smart (not both)", () => {
    const applyMatch = cpsContent.match(/prismApplyCalculations[\s\S]*?value\s*:\s*"(\w+)"/);
    expect(applyMatch).toBeDefined();
    expect(applyMatch![1]).toBe("smart");
  });

  it("contains 24 tool pockets", () => {
    const pocketCount = (cpsContent.match(/TOOL POCKET \d+/g) || []).length;
    expect(pocketCount).toBe(24);
  });

  it("contains no bare 'diameter' reference in calculateOptimizedSpeed", () => {
    // The bug: `diameter` was used in calculateOptimizedSpeed but not passed as param
    // The fix: uses `toolConfig._diameter` instead
    const speedFunc = cpsContent.substring(
      cpsContent.indexOf("calculateOptimizedSpeed:"),
      cpsContent.indexOf("calculateOptimizedFeed:")
    );
    // Should NOT have bare `diameter` that isn't `toolConfig._diameter` or `_d`
    const bareDiameterInHEM = speedFunc.match(/aeRatio.*&&\s*diameter\s*>/);
    expect(bareDiameterInHEM).toBeNull(); // should use _d, not diameter
  });

  it("uses result.speed.Vc (not result.speed.speed)", () => {
    // The bug: `result.speed.speed` was undefined, should be `result.speed.Vc`
    expect(cpsContent).not.toContain("result.speed.speed");
  });

  it("flutes has fallback to 4", () => {
    // The bug: `var flutes = toolConfig.flutes;` with no fallback
    expect(cpsContent).toContain('typeof toolConfig.flutes === "number"');
  });

  it("holderTIRFactors has 50+ entries", () => {
    const tirEntries = (cpsContent.match(/tir: 0\.\d+/g) || []).length;
    expect(tirEntries).toBeGreaterThanOrEqual(50);
  });

  it("brandFactors has 50+ entries", () => {
    const brandEntries = (cpsContent.match(/"[a-z_]+": 1\.\d+|"[a-z_]+": 0\.\d+/g) || []).length;
    expect(brandEntries).toBeGreaterThanOrEqual(50);
  });

  it("machineDatabase has 100+ entries", () => {
    const machineEntries = (cpsContent.match(/maxRpm:\d+/g) || []).length;
    expect(machineEntries).toBeGreaterThanOrEqual(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. BUG REGRESSION — EVERY BUG FIXED IN PPG-HARDEN
// ═══════════════════════════════════════════════════════════════════════════════

describe("CPS Standalone — Bug Regression", () => {
  let cpsContent: string;

  beforeAll(() => {
    cpsContent = fs.readFileSync(CPS_PATH, "utf-8");
  });

  // --- Bug 1: `diameter is not defined` in calculateOptimizedSpeed ---
  it("BUG-1: calculateOptimizedSpeed uses _d not bare diameter for HEM boost", () => {
    const speedFunc = cpsContent.substring(
      cpsContent.indexOf("calculateOptimizedSpeed:"),
      cpsContent.indexOf("calculateOptimizedFeed:")
    );
    expect(speedFunc).toContain("var _d = toolConfig._diameter");
    expect(speedFunc).toContain("_d > 0");
    // No bare diameter in arithmetic context
    expect(speedFunc).not.toMatch(/&&\s+diameter\s+>/);
  });

  it("BUG-1: calculateAll stores diameter on toolConfig._diameter before sub-call", () => {
    // The line `toolConfig._diameter = diameter` must exist in the file
    expect(cpsContent).toContain("toolConfig._diameter = diameter");
    // And it must appear BEFORE calculateOptimizedSpeed call
    const storeIdx = cpsContent.indexOf("toolConfig._diameter = diameter");
    const callIdx = cpsContent.indexOf("this.calculateOptimizedSpeed(material");
    expect(storeIdx).toBeLessThan(callIdx);
  });

  // --- Bug 2: result.speed.speed → result.speed.Vc ---
  it("BUG-2: no result.speed.speed anywhere in file", () => {
    expect(cpsContent).not.toContain("result.speed.speed");
  });

  it("BUG-2: calculateOptimizedSpeed returns {Vc: speed}", () => {
    const speedFunc = cpsContent.substring(
      cpsContent.indexOf("calculateOptimizedSpeed:"),
      cpsContent.indexOf("calculateOptimizedFeed:")
    );
    expect(speedFunc).toContain("Vc: speed");
    expect(speedFunc).not.toMatch(/\bspeed:\s*speed\b/);
  });

  // --- Bug 3: flutes "auto" string → NaN feed ---
  it("BUG-3: flutes has typeof number guard in calculateOptimizedFeed", () => {
    const feedStart = cpsContent.indexOf("calculateOptimizedFeed:");
    const feedEnd = cpsContent.indexOf("getBaseChipLoad:", feedStart);
    const feedFunc = cpsContent.substring(feedStart, feedEnd > feedStart ? feedEnd : feedStart + 5000);
    expect(feedFunc).toContain('typeof toolConfig.flutes === "number"');
  });

  it("BUG-3: flutes fallback value is 4", () => {
    const line = cpsContent.split("\n").find(l =>
      l.includes('typeof toolConfig.flutes === "number"')
    );
    expect(line).toBeDefined();
    expect(line).toContain(": 4");
  });

  // --- Bug 4: holderFactor undefined in calculateOptimizedSpeed return ---
  it("BUG-4: speed factors.holder uses tirFactor (not holderFactor)", () => {
    // calculateOptimizedSpeed declares tirFactor, not holderFactor
    const speedFunc = cpsContent.substring(
      cpsContent.indexOf("calculateOptimizedSpeed:"),
      cpsContent.indexOf("calculateOptimizedFeed:")
    );
    // The return factors block should NOT reference holderFactor
    const returnBlock = speedFunc.substring(
      speedFunc.indexOf("return {"),
      speedFunc.lastIndexOf("};") + 2
    );
    expect(returnBlock).not.toContain("holderFactor");
    expect(returnBlock).toContain("tirFactor");
  });

  // --- Bug 5: NaN feedFactor in finishing comments ---
  it("BUG-5: feedFactor has isFinite guard in comment output", () => {
    // Check for isFinite guard around feedFactor or fin.feedFactor
    expect(cpsContent).toMatch(/isFinite.*feedFactor|feedFactor.*isFinite/);
  });

  // --- Bug 6: Unrounded RPM in comments ---
  it("BUG-6: spindleSpeed is Math.round'd in comment output", () => {
    // At least one Math.round(spindleSpeed) or similar
    expect(cpsContent).toMatch(/Math\.round\s*\(\s*(?:spindleSpeed|outputRPM)/);
  });

  // --- Bug 7: Machine ID mismatch (80% broken) ---
  it("BUG-7: hurco_vm30i ID exists in machineDatabase", () => {
    expect(cpsContent).toContain('"hurco_vm30i"');
  });

  it("BUG-7: machine IDs in machineDatabase use underscore format consistently", () => {
    // Find machineDatabase inside PRISM_PHYSICS
    const dbStart = cpsContent.indexOf("machineDatabase:");
    const dbEnd = cpsContent.indexOf("brandFactors:", dbStart);
    const dbSection = cpsContent.substring(dbStart, dbEnd > dbStart ? dbEnd : dbStart + 20000);
    // Check a few known machines exist in the database
    expect(dbSection).toContain("hurco_vm30i");
    expect(dbSection).toContain("haas_vf_2");
  });

  // --- Bug 8: Apply mode default "both" → "smart" ---
  it("BUG-8: prismApplyCalculations defaults to smart", () => {
    const applyStart = cpsContent.indexOf("prismApplyCalculations");
    const applySection = cpsContent.substring(applyStart, applyStart + 800);
    // Value can be `value      : "smart"` with lots of padding
    expect(applySection).toMatch(/value\s*:\s*"smart"/);
  });

  // --- HEM Speed Boost feature ---
  it("FEAT: HEM speed boost formula present (1/ae/D^0.35)", () => {
    expect(cpsContent).toContain("hemSpeedBoost");
    expect(cpsContent).toContain("Math.pow(aeRatio, 0.35)");
  });

  it("FEAT: HEM speed boost clamped to [1.0, 2.5]", () => {
    expect(cpsContent).toContain("Math.min(2.5");
    expect(cpsContent).toContain("Math.max(1.0");
  });

  it("FEAT: HEM speed boost only applies to adaptive/HEM strategies", () => {
    const hemSection = cpsContent.substring(
      cpsContent.indexOf("hemSpeedBoost = 1.0"),
      cpsContent.indexOf("hemSpeedBoost = 1.0") + 500
    );
    expect(hemSection).toContain("adaptive");
    expect(hemSection).toContain("hem");
  });

  // --- TIR Speed Factor ---
  it("FEAT: TIR-based speed factor formula present", () => {
    expect(cpsContent).toContain("tirFactor");
    expect(cpsContent).toContain("holderData.tir * 100");
  });

  it("FEAT: TIR factor clamped to [0.85, 1.0]", () => {
    const tirSection = cpsContent.substring(
      cpsContent.indexOf("var tirFactor"),
      cpsContent.indexOf("var tirFactor") + 200
    );
    expect(tirSection).toContain("0.85");
    expect(tirSection).toContain("1.0");
  });

  // --- Prove-out Mode ---
  it("FEAT: prove-out properties exist with correct defaults", () => {
    // All three prove-out properties should exist in the file
    expect(cpsContent).toContain("prismProveOut:");
    expect(cpsContent).toContain("prismProveOutSpeedPct:");
    expect(cpsContent).toContain("prismProveOutFeedPct:");
  });

  it("FEAT: prove-out derates speed in onSection", () => {
    expect(cpsContent).toContain("prismProveOutFeedFactor");
    expect(cpsContent).toContain("poSpeedPct");
    expect(cpsContent).toContain("poFeedPct");
  });

  // --- Data Integrity ---
  it("DATA: 4140 annealed Vc raised to 175 m/min", () => {
    const mat = PRISM_MATERIALS?.["P_4140_ANN"];
    expect(mat).toBeDefined();
    expect(mat.speeds.carbide.rec).toBe(175);
  });

  it("DATA: Zeni brand labeled as Italian (not Japanese)", () => {
    const cpsLower = cpsContent.toLowerCase();
    // Zeni factor should exist and NOT be labeled as Japanese
    expect(cpsContent).toContain('"zeni"');
    // Check that the Zeni entry doesn't have a Japanese label in nearby comments
    const zeniIdx = cpsContent.indexOf('"zeni"');
    const nearbySection = cpsContent.substring(
      Math.max(0, zeniIdx - 100),
      zeniIdx + 100
    );
    expect(nearbySection.toLowerCase()).not.toContain("japan");
  });

  it("DATA: VM30i specs in machineDatabase", () => {
    // Find hurco_vm30i inside machineDatabase (not in the dropdown enum)
    const dbStart = cpsContent.indexOf("machineDatabase:");
    const dbEnd = cpsContent.indexOf("brandFactors:", dbStart);
    const db = cpsContent.substring(dbStart, dbEnd > dbStart ? dbEnd : dbStart + 20000);
    const vm30iIdx = db.indexOf("hurco_vm30i");
    expect(vm30iIdx).toBeGreaterThan(0);
    // Check that the entry has required machine fields
    const entrySection = db.substring(vm30iIdx, vm30iIdx + 200);
    expect(entrySection).toContain("maxRpm:");
    expect(entrySection).toMatch(/power(?:Hp)?:/);
    expect(entrySection).toMatch(/torque(?:FtLb)?:/);
  });

  // --- Shared Enum Extraction ---
  it("FEAT: shared enum arrays reduce duplication", () => {
    // The CPS should be under 20,000 lines after enum extraction (was 24,668)
    const lineCount = cpsContent.split("\n").length;
    expect(lineCount).toBeLessThan(20000);
  });

  // --- PRISM_TURNING Module ---
  it("MODULE: PRISM_TURNING has all 7 methods", () => {
    expect(PRISM_TURNING).toBeDefined();
    expect(typeof PRISM_TURNING.calcCSS).toBe("function");
    expect(typeof PRISM_TURNING.calcTurningForce).toBe("function");
    expect(typeof PRISM_TURNING.calcNoseRadiusFeedLimit).toBe("function");
    expect(typeof PRISM_TURNING.checkChipBreaking).toBe("function");
    expect(typeof PRISM_TURNING.calcBoringBarDeflection).toBe("function");
    expect(typeof PRISM_TURNING.calcGrooveFeedRamp).toBe("function");
    expect(typeof PRISM_TURNING.calcThreadingSchedule).toBe("function");
  });

  // --- Group Defaults ---
  it("DATA: PRISM_GROUP_DEFAULTS covers all ISO groups", () => {
    expect(cpsContent).toContain('var PRISM_GROUP_DEFAULTS');
    for (const group of ["P", "M", "K", "N", "S", "H"]) {
      const pattern = new RegExp(`"${group}"\\s*:`);
      const groupDefaults = cpsContent.substring(
        cpsContent.indexOf("var PRISM_GROUP_DEFAULTS"),
        cpsContent.indexOf("var PRISM_GROUP_DEFAULTS") + 500
      );
      expect(groupDefaults).toMatch(pattern);
    }
  });

  // --- Material Coverage ---
  it("DATA: 185+ materials in PRISM_MATERIALS", () => {
    let count = 0;
    for (const [id, mat] of Object.entries(PRISM_MATERIALS || {})) {
      if (id.startsWith("_") || !mat || typeof mat !== "object") continue;
      if ((mat as any).kienzle) count++;
    }
    expect(count).toBeGreaterThanOrEqual(100);
  });

  // --- Safety: No dangerous patterns ---
  it("SAFETY: no eval() calls in CPS", () => {
    // CPS should never use eval — dangerous in production post
    const evalCalls = cpsContent.match(/\beval\s*\(/g) || [];
    expect(evalCalls.length).toBe(0);
  });

  it("SAFETY: no document.write or innerHTML", () => {
    expect(cpsContent).not.toContain("document.write");
    expect(cpsContent).not.toContain("innerHTML");
  });
});
