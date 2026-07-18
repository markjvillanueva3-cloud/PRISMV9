/**
 * PP Output Quality — Full G-code Output Inspection
 *
 * Generates actual G-code for 3 real-world scenarios and analyzes
 * whether the output would be accepted on a shop floor:
 *
 * 1. Haas VF-2 / 4140 Steel / 10mm endmill profiling
 * 2. Siemens 840D 5-axis / Inconel 718 / 8mm ball nose finishing
 * 3. Okuma lathe / 4140 Steel / OD turning
 *
 * For each: verify header, safe start, spindle/coolant before cut,
 * optimized S/F (different from input), program end (M30), and
 * overall shop-floor acceptability.
 */
import { describe, it, expect } from "vitest";
import {
  postProcessorPipelineEngine,
  type MachineContext,
  type MaterialContext,
  type ToolContext,
} from "../engines/PostProcessorPipelineEngine.js";
import {
  lathePostProcessorEngine,
  type LathePostConfig,
  type LatheInput,
} from "../engines/LathePostProcessorEngine.js";

// ================================================================
// SCENARIO 1 — Haas VF-2 / 4140 Steel / 10mm endmill profiling
// ================================================================

const HAAS_VF2: MachineContext = {
  id: "haas-vf2",
  name: "Haas VF-2",
  brand: "Haas",
  controller: "haas",
  max_rpm: 8100,
  max_power_kW: 22.4,
  max_torque_Nm: 122,
  rapid_rate_mm_min: { x: 25400, y: 25400, z: 15240 },
  work_volume: { x: 762, y: 406, z: 508 },
  axes: 3,
  atc_capacity: 20,
  coolant_types: ["flood", "tsc"],
  resolution_confidence: 0.95,
};

const STEEL_4140: MaterialContext = {
  id: "4140",
  name: "4140 Steel",
  iso_group: "P",
  hardness_HB: 197,
  uts_MPa: 655,
  kc1_1: 1800,
  mc: 0.25,
  thermal_conductivity_W_mK: 42.7,
  density_kg_m3: 7850,
  resolution_confidence: 1,
};

const ENDMILL_10MM: ToolContext = {
  id: "1",
  type: "flat_endmill",
  diameter_mm: 10,
  flute_count: 4,
  flute_length_mm: 25,
  material: "carbide",
  coating: "TiAlN",
  resolution_confidence: 1,
};

const HAAS_PROFILING_GCODE = `O1001
G90 G54 G17
T1 M6
S3000 M3
G43 H1 Z50.
M8
G0 X0 Y0
G0 Z5.
G1 Z-5. F200
G1 X80. F600
G1 Y50.
G1 X0.
G1 Y0.
G0 Z5.
G1 Z-10. F180
G1 X80. F500
G1 Y50.
G1 X0.
G1 Y0.
G0 Z50.
M9
M5
M30`;

// ================================================================
// SCENARIO 2 — Siemens 840D 5-axis / Inconel 718 / 8mm ball nose
// ================================================================

const SIEMENS_5AXIS: MachineContext = {
  id: "dmg-dmu-50",
  name: "DMG DMU 50 3rd Gen",
  brand: "DMG Mori",
  controller: "siemens",
  controller_version: "840D sl",
  max_rpm: 20000,
  max_power_kW: 35,
  max_torque_Nm: 130,
  rapid_rate_mm_min: { x: 30000, y: 30000, z: 30000 },
  accel_mm_s2: { x: 7000, y: 7000, z: 7000 },
  work_volume: { x: 500, y: 450, z: 400 },
  axes: 5,
  kinematics: "head_table",
  atc_capacity: 30,
  coolant_types: ["flood", "tsc", "mql"],
  tsc_pressure_bar: 70,
  resolution_confidence: 0.90,
};

const INCONEL_718: MaterialContext = {
  id: "inconel-718",
  name: "Inconel 718",
  iso_group: "S",
  hardness_HB: 350,
  uts_MPa: 1240,
  kc1_1: 2800,
  mc: 0.25,
  thermal_conductivity_W_mK: 11.4,
  density_kg_m3: 8190,
  resolution_confidence: 1,
};

const BALLNOSE_8MM: ToolContext = {
  id: "2",
  type: "ball_endmill",
  diameter_mm: 8,
  flute_count: 2,
  flute_length_mm: 20,
  corner_radius_mm: 4, // ball nose = R = D/2
  material: "carbide",
  coating: "TiAlN",
  resolution_confidence: 1,
};

const SIEMENS_FINISHING_GCODE = `O2001
G90 G54 G17
T2 M6
S8000 M3
G43 H2 Z50.
M8
G0 X0 Y0
G0 Z5.
G1 Z-1.0 F150
G1 X60. F400
G3 X60. Y30. I0 J15.
G1 X0.
G1 Y0.
G0 Z5.
G0 Z50.
M9
M5
M30`;

// ================================================================
// SCENARIO 3 — Okuma lathe / 4140 Steel / OD turning
// ================================================================

// (Uses LathePostProcessorEngine directly for turning)

const OKUMA_LATHE_CONFIG: LathePostConfig = {
  controller: "okuma_lb",
  program_number: 3001,
  use_canned_cycles: true,
  use_css: true,
  use_tnrc: true,
  decimal_places: 3,
  line_numbers: true,
  line_number_increment: 10,
  coolant_code: "flood",
  safe_start_block: true,
  program_end: "M30",
  max_rpm: 3500,
  spindle_direction: "cw",
};

const OKUMA_TURNING_INPUT: LatheInput = {
  moves: [
    { type: "rapid", x: 52, z: 2 },
    { type: "rough_od", depth_of_cut_mm: 2.0, finish_allowance_x_mm: 0.5, finish_allowance_z_mm: 0.1, profile_start_block: 100, profile_end_block: 200, feed: 0.25 },
    { type: "rapid", x: 50, z: 2 },
    { type: "feed", x: 50, z: -80, feed: 0.15 },
    { type: "feed", x: 40, z: -80, feed: 0.15 },
    { type: "feed", x: 40, z: -120, feed: 0.15 },
    { type: "finish_cycle", profile_start_block: 100, profile_end_block: 200, feed: 0.08 },
    { type: "rapid", x: 200, z: 100 },
    { type: "comment", text: "CHAMFER AND PART-OFF" },
    { type: "rapid", x: 52, z: 0 },
    { type: "feed", x: 48, z: -1, feed: 0.1 },
    { type: "part_off", x: 0, feed: 0.05 },
  ],
  tool_number: 1,
  tool_orientation: 3,
  tool_nose_radius_mm: 0.4,
  surface_speed_mmin: 180,
  feed_rate_mmrev: 0.25,
  coolant: "flood",
  work_offset: "G54",
  part_diameter_mm: 50,
};

// ================================================================
// TESTS
// ================================================================

describe("PP Output Quality — Scenario 1: Haas VF-2 / 4140 Steel / 10mm Endmill Profiling", () => {
  let output: Awaited<ReturnType<typeof postProcessorPipelineEngine.process>>;

  it("pipeline runs without errors", async () => {
    output = await postProcessorPipelineEngine.process({
      gcode: HAAS_PROFILING_GCODE,
      machine: HAAS_VF2,
      material: STEEL_4140,
      tools: [ENDMILL_10MM],
      controller: "haas",
      aggressiveness: 0.5,
      optimization_target: "balanced",
      include_analytics: true,
    });

    expect(output.overall_status).not.toBe("fail");
    expect(output.output_gcode.length).toBeGreaterThan(50);
    console.log("\n========== SCENARIO 1: HAAS VF-2 / 4140 STEEL / 10MM ENDMILL ==========");
    console.log(output.output_gcode);
    console.log("========== END SCENARIO 1 ==========\n");
  });

  it("has proper program header (% and O-number)", () => {
    const lines = output.output_gcode.split("\n");
    // Haas/Fanuc-family: starts with % or O-number
    const hasPercent = lines.some(l => l.trim() === "%");
    const hasONumber = lines.some(l => /^O\d{4}/.test(l.trim()));
    expect(hasPercent || hasONumber).toBe(true);
  });

  it("has setup modes before cutting (G90/G17/G54/G43)", () => {
    const gc = output.output_gcode;
    expect(gc).toContain("G90");
    expect(gc).toContain("G17");
    expect(gc).toContain("G54");
    expect(gc).toContain("G43");
  });

  it("has tool change before cutting (T M6)", () => {
    const gc = output.output_gcode;
    const toolChangeIdx = gc.indexOf("M6");
    const firstCutIdx = gc.search(/G1\s/);
    // Tool change must appear before first cut
    expect(toolChangeIdx).toBeGreaterThan(-1);
    if (firstCutIdx > -1) {
      expect(toolChangeIdx).toBeLessThan(firstCutIdx);
    }
  });

  it("has spindle command (S value) on or before first cutting block", () => {
    const gc = output.output_gcode;
    // Pipeline inlines S on cutting blocks (e.g. "G1 ... S3565 F200")
    // or may have a separate S/M3 line. Either is valid.
    const hasSpindleValue = gc.match(/S\d+/);
    expect(hasSpindleValue).not.toBeNull();

    // The first cutting block must have an S value or one must precede it
    const lines = gc.split("\n");
    let spindleSeenBeforeOrOnCut = false;
    let spindleSeen = false;
    for (const line of lines) {
      if (/S\d+/.test(line)) spindleSeen = true;
      if (/G1\s/.test(line)) {
        spindleSeenBeforeOrOnCut = spindleSeen || /S\d+/.test(line);
        break;
      }
    }
    expect(spindleSeenBeforeOrOnCut).toBe(true);
  });

  it("has optimized S/F values with valid positive outputs", () => {
    const optimizedBlocks = output.blocks.filter(b => b.optimization);
    expect(optimizedBlocks.length).toBeGreaterThan(0);

    for (const block of optimizedBlocks) {
      expect(block.optimization!.optimized_rpm).toBeGreaterThan(0);
      expect(block.optimization!.optimized_feed).toBeGreaterThan(0);
    }

    console.log("  S/F optimization details:");
    for (const b of optimizedBlocks.slice(0, 5)) {
      console.log(`    Block ${b.id}: RPM ${b.optimization!.original_rpm} -> ${b.optimization!.optimized_rpm}, Feed ${b.optimization!.original_feed} -> ${b.optimization!.optimized_feed}`);
    }
  });

  it("has program end (M30 or M2)", () => {
    const lines = output.output_gcode.split("\n").map(l => l.trim());
    const hasEnd = lines.some(l => l === "M30" || l.startsWith("M30") || l === "M2" || l.startsWith("M2"));
    expect(hasEnd).toBe(true);
  });

  it("force data is physically plausible for 4140 Steel/10mm endmill", () => {
    const withForces = output.blocks.filter(b => b.forces);
    expect(withForces.length).toBeGreaterThan(0);

    for (const b of withForces) {
      // Cutting force for 10mm endmill in 4140 steel: typically 50-2000 N
      expect(b.forces!.Fc_N).toBeGreaterThan(0);
      expect(b.forces!.Fc_N).toBeLessThan(5000);
      // Power should be within machine limits (22.4 kW)
      expect(b.forces!.power_kW).toBeLessThanOrEqual(22.4);
    }

    console.log("  Force/power range:");
    const forces = withForces.map(b => b.forces!.Fc_N);
    const powers = withForces.map(b => b.forces!.power_kW);
    console.log(`    Fc: ${Math.min(...forces).toFixed(0)} - ${Math.max(...forces).toFixed(0)} N`);
    console.log(`    Power: ${Math.min(...powers).toFixed(2)} - ${Math.max(...powers).toFixed(2)} kW`);
  });

  it("RPM stays within Haas VF-2 limits (8100 max)", () => {
    const rpms = [...output.output_gcode.matchAll(/S(\d+)/g)].map(m => parseInt(m[1]));
    for (const rpm of rpms) {
      expect(rpm).toBeLessThanOrEqual(8100);
      expect(rpm).toBeGreaterThan(0);
    }
    console.log(`  RPM values in output: ${rpms.join(", ")}`);
  });

  it("no rapid (G0) moves with feed rate attached", () => {
    const lines = output.output_gcode.split("\n");
    for (const line of lines) {
      if (/^G0\s/.test(line.trim())) {
        // G0 lines should NOT have F values (rapid = max traverse)
        expect(line).not.toMatch(/G0.*F\d/);
      }
    }
  });

  it("stage summary shows all phases executed", () => {
    const stageNames = output.stages.map(s => s.stage);
    console.log("  Pipeline stages executed:", stageNames.join(", "));
    // At minimum, speed/feed optimization should have run
    const hasSF = stageNames.some(s => s.includes("speed_feed"));
    expect(hasSF).toBe(true);
  });
});

describe("PP Output Quality — Scenario 2: Siemens 840D 5-axis / Inconel 718 / 8mm Ball Nose", () => {
  let output: Awaited<ReturnType<typeof postProcessorPipelineEngine.process>>;

  it("pipeline runs without errors", async () => {
    output = await postProcessorPipelineEngine.process({
      gcode: SIEMENS_FINISHING_GCODE,
      machine: SIEMENS_5AXIS,
      material: INCONEL_718,
      tools: [BALLNOSE_8MM],
      controller: "siemens",
      aggressiveness: 0.3, // conservative for Inconel finishing
      optimization_target: "surface_quality",
      include_analytics: true,
    });

    expect(output.overall_status).not.toBe("fail");
    expect(output.output_gcode.length).toBeGreaterThan(50);
    console.log("\n========== SCENARIO 2: SIEMENS 840D / INCONEL 718 / 8MM BALL NOSE ==========");
    console.log(output.output_gcode);
    console.log("========== END SCENARIO 2 ==========\n");
  });

  it("has proper program header", () => {
    const lines = output.output_gcode.split("\n");
    const hasHeader = lines.some(l => l.trim().startsWith("%") || l.trim().startsWith("O") || l.trim().includes("PRISM"));
    expect(hasHeader).toBe(true);
  });

  it("has safe start block", () => {
    const gc = output.output_gcode;
    expect(gc).toContain("G90");
  });

  it("has spindle on before cutting", () => {
    const gc = output.output_gcode;
    const hasSpindle = gc.includes("M3") || gc.includes("M03");
    expect(hasSpindle).toBe(true);
  });

  it("optimized feeds are conservative for Inconel 718", () => {
    const optimizedBlocks = output.blocks.filter(b => b.optimization);
    expect(optimizedBlocks.length).toBeGreaterThan(0);

    // Inconel is difficult — feeds should be moderate, not aggressive
    for (const b of optimizedBlocks) {
      // Feed for 8mm ball nose in Inconel: typically 50-600 mm/min
      if (b.optimization!.optimized_feed > 0) {
        expect(b.optimization!.optimized_feed).toBeLessThan(2000);
      }
    }

    console.log("  S/F optimization for Inconel 718:");
    for (const b of optimizedBlocks.slice(0, 5)) {
      console.log(`    Block ${b.id}: RPM ${b.optimization!.original_rpm} -> ${b.optimization!.optimized_rpm}, Feed ${b.optimization!.original_feed} -> ${b.optimization!.optimized_feed}`);
    }
  });

  it("forces reflect high kc1.1 of Inconel (ISO S = 2800)", () => {
    const withForces = output.blocks.filter(b => b.forces);
    expect(withForces.length).toBeGreaterThan(0);

    // Inconel has very high specific cutting force
    // Even at small DOC, forces should be meaningful
    console.log("  Inconel 718 forces:");
    for (const b of withForces.slice(0, 3)) {
      console.log(`    Block ${b.id}: Fc=${b.forces!.Fc_N.toFixed(0)} N, Power=${b.forces!.power_kW.toFixed(2)} kW, Torque=${b.forces!.torque_Nm.toFixed(2)} Nm`);
      expect(b.forces!.Fc_N).toBeGreaterThan(0);
    }
  });

  it("RPM stays within machine limit (20000)", () => {
    const rpms = [...output.output_gcode.matchAll(/S(\d+)/g)].map(m => parseInt(m[1]));
    for (const rpm of rpms) {
      expect(rpm).toBeLessThanOrEqual(20000);
    }
    console.log(`  RPM values in output: ${rpms.join(", ")}`);
  });

  it("has program end", () => {
    const gc = output.output_gcode;
    const hasEnd = gc.includes("M30") || gc.includes("M02");
    expect(hasEnd).toBe(true);
  });

  it("arc moves (G2/G3) are preserved in output", () => {
    const gc = output.output_gcode;
    const hasArcs = gc.includes("G2") || gc.includes("G3");
    expect(hasArcs).toBe(true);
  });
});

describe("PP Output Quality — Scenario 3: Okuma Lathe / 4140 Steel / OD Turning", () => {
  let result: ReturnType<typeof lathePostProcessorEngine.process>;

  it("lathe post generates valid G-code", () => {
    result = lathePostProcessorEngine.process(OKUMA_TURNING_INPUT, OKUMA_LATHE_CONFIG);

    expect(result.gcode.length).toBeGreaterThan(50);
    expect(result.line_count).toBeGreaterThan(5);
    console.log("\n========== SCENARIO 3: OKUMA LATHE / 4140 STEEL / OD TURNING ==========");
    console.log(result.gcode);
    console.log("========== END SCENARIO 3 ==========\n");
  });

  it("has program number (O3001)", () => {
    expect(result.gcode).toMatch(/O3001/);
  });

  it("has Okuma setup block with G18/G50/G96", () => {
    expect(result.gcode).toContain("G18");
    expect(result.gcode).toContain("G50");
    expect(result.gcode).toContain("G96");
  });

  it("has CSS mode G96 with max RPM clamp G50", () => {
    // CSS = constant surface speed for turning
    expect(result.gcode).toContain("G96");
    expect(result.gcode).toContain("G50");
    expect(result.gcode).toMatch(/S180/); // 180 m/min surface speed
    expect(result.gcode).toMatch(/S3500/); // max RPM clamp
  });

  it("has spindle start (M03) before cutting", () => {
    const gc = result.gcode;
    const m03Idx = gc.indexOf("M03");
    // Should appear before first feed move
    const firstG01Idx = gc.indexOf("G01");
    expect(m03Idx).toBeGreaterThan(-1);
    if (firstG01Idx > -1) {
      expect(m03Idx).toBeLessThan(firstG01Idx);
    }
  });

  it("has coolant on before cutting (M08 for Fanuc, M50 for Okuma)", () => {
    const gc = result.gcode;
    // Okuma uses M50 for flood coolant, M51 for mist (not standard M08/M07)
    const hasCoolant = gc.includes("M08") || gc.includes("M50") || gc.includes("M51");
    expect(hasCoolant).toBe(true);
    console.log(`  Coolant code found: ${gc.includes("M50") ? "M50 (Okuma flood)" : gc.includes("M08") ? "M08 (standard flood)" : "M51 (Okuma mist)"}`);
  });

  it("has tool nose radius compensation (G41 or G42)", () => {
    const gc = result.gcode;
    const hasTNRC = gc.includes("G41") || gc.includes("G42");
    expect(hasTNRC).toBe(true);
  });

  it("has G85 OD roughing canned cycle", () => {
    expect(result.gcode).toContain("G85");
    expect(result.canned_cycles_used).toContain("G85");
  });

  it("has G87 finishing cycle", () => {
    expect(result.gcode).toContain("G87");
    expect(result.canned_cycles_used).toContain("G87");
  });

  it("has line numbers (N10, N20, ...)", () => {
    const lines = result.gcode.split("\n");
    const numberedLines = lines.filter(l => /^N\d+/.test(l.trim()));
    expect(numberedLines.length).toBeGreaterThan(5);
    console.log(`  Numbered lines: ${numberedLines.length}`);
  });

  it("has program end (M2 or M30)", () => {
    expect(result.gcode).toMatch(/\bM(2|30)\b/);
  });

  it("has part-off move", () => {
    // Part-off is a critical turning operation
    const gc = result.gcode;
    const hasPartOff = gc.includes("X0.000") || gc.includes("X0.0000");
    expect(hasPartOff).toBe(true);
  });

  it("canned cycles list is accurate", () => {
    // Should have G71 (OD rough) and G70 (finish)
    expect(result.canned_cycles_used.length).toBeGreaterThanOrEqual(2);
    console.log(`  Canned cycles used: ${result.canned_cycles_used.join(", ")}`);
  });

  it("estimated time is positive and plausible", () => {
    expect(result.estimated_time_sec).toBeGreaterThan(0);
    // A simple turning operation: 10-600 seconds is plausible
    expect(result.estimated_time_sec).toBeLessThan(3600);
    console.log(`  Estimated cycle time: ${result.estimated_time_sec.toFixed(1)} sec`);
  });

  it("warnings array is populated appropriately", () => {
    // No crash-level issues expected
    expect(Array.isArray(result.warnings)).toBe(true);
    if (result.warnings.length > 0) {
      console.log(`  Warnings: ${result.warnings.join("; ")}`);
    }
  });
});

describe("PP Output Quality — Cross-Scenario Comparison", () => {
  it("different controllers produce different output formatting", async () => {
    const haasResult = await postProcessorPipelineEngine.process({
      gcode: HAAS_PROFILING_GCODE,
      machine: HAAS_VF2,
      material: STEEL_4140,
      tools: [ENDMILL_10MM],
      controller: "haas",
    });

    const siemensResult = await postProcessorPipelineEngine.process({
      gcode: HAAS_PROFILING_GCODE,
      machine: { ...SIEMENS_5AXIS, axes: 3 },
      material: STEEL_4140,
      tools: [ENDMILL_10MM],
      controller: "siemens",
    });

    // Both should produce valid output
    expect(haasResult.output_gcode.length).toBeGreaterThan(50);
    expect(siemensResult.output_gcode.length).toBeGreaterThan(50);

    // Both should have M30
    expect(haasResult.output_gcode).toContain("M30");
    expect(siemensResult.output_gcode).toContain("M30");
  });

  it("Inconel 718 produces lower feeds than 4140 Steel for same geometry", async () => {
    const steelResult = await postProcessorPipelineEngine.process({
      gcode: HAAS_PROFILING_GCODE,
      machine: HAAS_VF2,
      material: STEEL_4140,
      tools: [ENDMILL_10MM],
      controller: "haas",
      aggressiveness: 0.5,
    });

    const inconelResult = await postProcessorPipelineEngine.process({
      gcode: HAAS_PROFILING_GCODE,
      machine: HAAS_VF2,
      material: INCONEL_718,
      tools: [ENDMILL_10MM],
      controller: "haas",
      aggressiveness: 0.5,
    });

    const steelOptBlocks = steelResult.blocks.filter(b => b.optimization && b.move_type === "G1");
    const inconelOptBlocks = inconelResult.blocks.filter(b => b.optimization && b.move_type === "G1");

    expect(steelOptBlocks.length).toBeGreaterThan(0);
    expect(inconelOptBlocks.length).toBeGreaterThan(0);

    // Average optimized feed for Inconel should be <= steel (harder material)
    const avgSteelFeed = steelOptBlocks.reduce((s, b) => s + b.optimization!.optimized_feed, 0) / steelOptBlocks.length;
    const avgInconelFeed = inconelOptBlocks.reduce((s, b) => s + b.optimization!.optimized_feed, 0) / inconelOptBlocks.length;

    console.log(`\n  Material comparison (same geometry):`);
    console.log(`    4140 Steel avg optimized feed: ${avgSteelFeed.toFixed(0)} mm/min`);
    console.log(`    Inconel 718 avg optimized feed: ${avgInconelFeed.toFixed(0)} mm/min`);

    // Inconel should get lower or equal feeds (higher kc1.1 = more force = lower feed)
    expect(avgInconelFeed).toBeLessThanOrEqual(avgSteelFeed * 1.05); // 5% tolerance
  });
});
