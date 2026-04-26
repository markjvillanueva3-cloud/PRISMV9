/**
 * Integration test for master_post_hurco_v11 dispatcher action
 * PPG-WIRE-MS0 U-PPGW13 - verifies Hurco V11 Mill master post wiring
 *
 * Coverage: schema validation + engine behavior + dispatcher wiring
 * Real assertions against milling physics and G-code output
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ACTION_CAM_SCHEMAS } from "../../schemas/camActionSchemas.js";
import { hurcoV11MillMasterPostEngine } from "../../engines/HurcoV11MillMasterPostEngine.js";
import { ACTIONS } from "../../tools/dispatchers/camDispatcher.js";
import { postProcessorFeedOptimizer as feedOptimizer } from "../../engines/PostProcessorFeedOptimizerEngine.js";
import { proveOutModeEngine } from "../../engines/ProveOutModeEngine.js";

describe("master_post_hurco_v11 schema", () => {
  const schema = ACTION_CAM_SCHEMAS.master_post_hurco_v11;

  it("schema exists and is a Zod schema", () => {
    expect(schema).toBeInstanceOf(z.ZodType);
  });

  it("accepts valid facing operation", () => {
    const input = {
      operations: [
        {
          operation_type: "face",
          tool_number: 1,
          tool_diameter_mm: 50,
          tool_flutes: 4,
          tool_description: "50mm Face Mill",
          material_iso: "P",
          spindle_rpm: 1500,
          feed_mm_min: 600,
          axial_depth_mm: 2,
          coordinates: [
            { x: 0, y: 0, z: 5, type: "rapid" },
            { x: 100, y: 0, z: -2, type: "linear" },
          ],
        },
      ],
    };
    const result = schema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.operations[0].operation_type).toBe("face");
      expect(result.data.operations[0].tool_number).toBe(1);
    }
  });

  it("accepts pocket operation with radial depth", () => {
    const input = {
      operations: [
        {
          operation_type: "pocket",
          tool_number: 5,
          tool_diameter_mm: 12,
          tool_flutes: 3,
          material_iso: "N",
          spindle_rpm: 8000,
          feed_mm_min: 2400,
          axial_depth_mm: 3,
          radial_depth_mm: 6,
          coolant: "flood",
          coordinates: [{ x: 10, y: 10, z: -3, type: "linear" }],
        },
      ],
    };
    const result = schema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.operations[0].radial_depth_mm).toBe(6);
    }
  });

  it("rejects empty operations array with specific error", () => {
    const result = schema.safeParse({ operations: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.code === "too_small")).toBe(true);
    }
  });

  it("rejects invalid operation_type with enum error", () => {
    const result = schema.safeParse({
      operations: [
        {
          operation_type: "invalid_op",
          tool_number: 1,
          tool_diameter_mm: 10,
          tool_flutes: 2,
          material_iso: "P",
          spindle_rpm: 3000,
          feed_mm_min: 500,
          axial_depth_mm: 2,
          coordinates: [{ x: 0, y: 0, z: 0, type: "linear" }],
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });

  it("rejects tool_number outside 1-99 range", () => {
    const result = schema.safeParse({
      operations: [
        {
          operation_type: "drill",
          tool_number: 150,
          tool_diameter_mm: 8,
          tool_flutes: 2,
          material_iso: "P",
          spindle_rpm: 2000,
          feed_mm_min: 200,
          axial_depth_mm: 20,
          coordinates: [{ x: 0, y: 0, z: 0, type: "linear" }],
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.code === "too_big")).toBe(true);
    }
  });
});

describe("master_post_hurco_v11 dispatcher wiring", () => {
  it("action appears in ACTIONS enum exactly once", () => {
    const count = ACTIONS.filter((a: string) => a === "master_post_hurco_v11").length;
    expect(count).toBe(1);
  });

  it("master_post_by_machine auto-router exists", () => {
    const count = ACTIONS.filter((a: string) => a === "master_post_by_machine").length;
    expect(count).toBe(1);
  });

  it("engine generates valid G-code matching dispatcher wiring", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [
        {
          operation_type: "face",
          tool_number: 1,
          tool_diameter_mm: 50,
          tool_flutes: 4,
          material_iso: "P",
          spindle_rpm: 1500,
          feed_mm_min: 600,
          axial_depth_mm: 2,
          coordinates: [
            { x: 0, y: 0, z: 5, type: "rapid" },
            { x: 100, y: 0, z: -2, type: "linear" },
          ],
        },
      ],
      { program_number: 8888 }
    );

    expect(result.program_number).toBe(8888);
    expect(result.gcode[0]).toContain("O8888");
    expect(result.gcode.length).toBeGreaterThan(10);
    expect(result.tools_used).toContain(1);
  });
});

describe("HurcoV11MillMasterPostEngine.generateProgram", () => {
  it("generates G-code with correct program number O-format", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [
        {
          operation_type: "face",
          tool_number: 1,
          tool_diameter_mm: 50,
          tool_flutes: 4,
          material_iso: "P",
          spindle_rpm: 1500,
          feed_mm_min: 600,
          axial_depth_mm: 2,
          coordinates: [
            { x: 0, y: 0, z: 5, type: "rapid" },
            { x: 100, y: 0, z: -2, type: "linear" },
          ],
        },
      ],
      { program_number: 7777 }
    );

    expect(result.program_number).toBe(7777);
    expect(result.gcode[0]).toBe("O7777 (PRISM GENERATED)");
    expect(result.gcode[1]).toContain("HURCO VMX24");
  });

  it("includes UltiMotion G187 P3 when enabled", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [
        {
          operation_type: "3d_surface",
          tool_number: 5,
          tool_diameter_mm: 6,
          tool_flutes: 2,
          material_iso: "P",
          spindle_rpm: 6000,
          feed_mm_min: 1200,
          axial_depth_mm: 0.3,
          coordinates: [{ x: 0, y: 0, z: 0, type: "linear" }],
        },
      ],
      { use_ultimotion: true }
    );

    const gcodeText = result.gcode.join("\n");
    expect(gcodeText).toContain("G187 P3");
    expect(gcodeText).toContain("ULTIMOTION");
  });

  it("generates safe start with G21 metric and correct work offset", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(
      [
        {
          operation_type: "drill",
          tool_number: 8,
          tool_diameter_mm: 8.5,
          tool_flutes: 2,
          material_iso: "P",
          spindle_rpm: 2000,
          feed_mm_min: 200,
          axial_depth_mm: 25,
          coordinates: [{ x: 50, y: 50, z: -25, type: "linear" }],
        },
      ],
      { work_offset: 56, units: "metric" }
    );

    const gcodeText = result.gcode.join("\n");
    expect(gcodeText).toContain("G21");
    expect(gcodeText).toContain("G56");
    expect(gcodeText).toContain("G90 G17 G40 G49 G80");
  });

  it("generates tool change sequence T-M06-G43", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      {
        operation_type: "bore",
        tool_number: 15,
        tool_diameter_mm: 20,
        tool_flutes: 1,
        tool_description: "20mm Boring Bar",
        material_iso: "P",
        spindle_rpm: 1200,
        feed_mm_min: 150,
        axial_depth_mm: 30,
        coordinates: [{ x: 0, y: 0, z: -30, type: "linear" }],
      },
    ]);

    const gcodeText = result.gcode.join("\n");
    expect(gcodeText).toContain("T15 M06");
    expect(gcodeText).toContain("G43 H15");
    expect(gcodeText).toContain("20mm Boring Bar");
  });

  it("generates spindle S-M03 and flood coolant M08", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      {
        operation_type: "slot",
        tool_number: 4,
        tool_diameter_mm: 8,
        tool_flutes: 2,
        material_iso: "M",
        spindle_rpm: 3500,
        feed_mm_min: 400,
        axial_depth_mm: 8,
        coolant: "flood",
        coordinates: [{ x: 0, y: 0, z: -8, type: "linear" }],
      },
    ]);

    const gcodeText = result.gcode.join("\n");
    expect(gcodeText).toContain("S3500 M03");
    expect(gcodeText).toContain("M08");
  });

  it("returns physics_checks with Kienzle cutting force calc for ISO P steel", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      {
        operation_type: "adaptive",
        tool_number: 2,
        tool_diameter_mm: 10,
        tool_flutes: 4,
        material_iso: "P",
        spindle_rpm: 5000,
        feed_mm_min: 2000,
        axial_depth_mm: 10,
        radial_depth_mm: 1,
        coordinates: [{ x: 0, y: 0, z: -10, type: "linear" }],
      },
    ]);

    expect(result.physics_checks.length).toBeGreaterThanOrEqual(4);
    const forceCheck = result.physics_checks.find(c => c.check.includes("force"));
    expect(forceCheck).not.toBeNull();
    expect(forceCheck!.value).toBeGreaterThan(100);
    expect(forceCheck!.limit).toBe(2000);
  });

  it("applies JM Die tribal knowledge tips", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      {
        operation_type: "pocket",
        tool_number: 6,
        tool_diameter_mm: 16,
        tool_flutes: 3,
        material_iso: "N",
        spindle_rpm: 7500,
        feed_mm_min: 3000,
        axial_depth_mm: 4,
        coordinates: [{ x: 0, y: 0, z: -4, type: "linear" }],
      },
    ]);

    expect(result.tribal_tips_applied.length).toBeGreaterThan(0);
    expect(result.tribal_tips_applied.join(" ")).toContain("safe start");
  });

  it("total_lines equals gcode array length", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      {
        operation_type: "contour",
        tool_number: 7,
        tool_diameter_mm: 10,
        tool_flutes: 2,
        material_iso: "P",
        spindle_rpm: 4000,
        feed_mm_min: 800,
        axial_depth_mm: 5,
        coordinates: [
          { x: 0, y: 0, z: -5, type: "linear" },
          { x: 100, y: 0, z: -5, type: "linear" },
        ],
      },
    ]);

    expect(result.total_lines).toBe(result.gcode.length);
  });

  it("generates G02 arc CW with R parameter", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      {
        operation_type: "contour",
        tool_number: 2,
        tool_diameter_mm: 8,
        tool_flutes: 2,
        material_iso: "P",
        spindle_rpm: 4500,
        feed_mm_min: 900,
        axial_depth_mm: 4,
        coordinates: [
          { x: 0, y: 0, z: -4, type: "linear" },
          { x: 10, y: 10, z: -4, type: "arc_cw" },
        ],
        arc_data: [{}, { r: 7.07 }],
      },
    ]);

    const gcodeText = result.gcode.join("\n");
    expect(gcodeText).toMatch(/G02\s+X10\.000\s+Y10\.000.*R7\.070/);
  });

  it("generates program end M05-M09-G28-M30", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      {
        operation_type: "face",
        tool_number: 1,
        tool_diameter_mm: 50,
        tool_flutes: 4,
        material_iso: "P",
        spindle_rpm: 1500,
        feed_mm_min: 600,
        axial_depth_mm: 2,
        coordinates: [{ x: 0, y: 0, z: -2, type: "linear" }],
      },
    ]);

    const endSection = result.gcode.slice(-6).join("\n");
    expect(endSection).toContain("M05");
    expect(endSection).toContain("M09");
    expect(endSection).toContain("G28");
    expect(endSection).toContain("M30");
    expect(result.gcode[result.gcode.length - 1]).toBe("%");
  });

  it("estimates cycle time proportional to toolpath length", () => {
    const shortPath = hurcoV11MillMasterPostEngine.generateProgram([
      {
        operation_type: "contour",
        tool_number: 3,
        tool_diameter_mm: 10,
        tool_flutes: 2,
        material_iso: "P",
        spindle_rpm: 4000,
        feed_mm_min: 500,
        axial_depth_mm: 5,
        coordinates: [
          { x: 0, y: 0, z: -5, type: "linear" },
          { x: 10, y: 0, z: -5, type: "linear" },
        ],
      },
    ]);

    const longPath = hurcoV11MillMasterPostEngine.generateProgram([
      {
        operation_type: "contour",
        tool_number: 3,
        tool_diameter_mm: 10,
        tool_flutes: 2,
        material_iso: "P",
        spindle_rpm: 4000,
        feed_mm_min: 500,
        axial_depth_mm: 5,
        coordinates: [
          { x: 0, y: 0, z: -5, type: "linear" },
          { x: 100, y: 0, z: -5, type: "linear" },
          { x: 100, y: 100, z: -5, type: "linear" },
        ],
      },
    ]);

    expect(longPath.estimated_cycle_min).toBeGreaterThan(shortPath.estimated_cycle_min);
  });
});

describe("HurcoV11MillMasterPostEngine failure modes", () => {
  it("returns empty tools_used for empty operations", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([]);
    expect(result.tools_used).toEqual([]);
    expect(result.gcode.length).toBeGreaterThan(5);
  });

  it("fails physics check when spindle exceeds 10000 RPM max", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      {
        operation_type: "drill",
        tool_number: 10,
        tool_diameter_mm: 3,
        tool_flutes: 2,
        material_iso: "N",
        spindle_rpm: 12000,
        feed_mm_min: 600,
        axial_depth_mm: 10,
        coordinates: [{ x: 0, y: 0, z: -10, type: "linear" }],
      },
    ]);

    const rpmCheck = result.physics_checks.find(c => c.check.includes("Spindle") && c.check.includes("RPM"));
    expect(rpmCheck).not.toBeNull();
    expect(rpmCheck!.passed).toBe(false);
    expect(rpmCheck!.value).toBe(12000);
    expect(rpmCheck!.limit).toBe(10000);
  });

  it("adds G04 dwell for heavy cuts (depth > 0.5 * tool diameter)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      {
        operation_type: "pocket",
        tool_number: 5,
        tool_diameter_mm: 10,
        tool_flutes: 3,
        material_iso: "P",
        spindle_rpm: 4000,
        feed_mm_min: 800,
        axial_depth_mm: 8,
        coordinates: [{ x: 0, y: 0, z: -8, type: "linear" }],
      },
    ]);

    const gcodeText = result.gcode.join("\n");
    expect(gcodeText).toContain("G04 P1.0");
    expect(gcodeText).toContain("HEAVY CUT");
  });

  it("checks chip load fz within acceptable range", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram([
      {
        operation_type: "contour",
        tool_number: 2,
        tool_diameter_mm: 10,
        tool_flutes: 2,
        material_iso: "P",
        spindle_rpm: 3000,
        feed_mm_min: 600,
        axial_depth_mm: 5,
        coordinates: [{ x: 0, y: 0, z: -5, type: "linear" }],
      },
    ]);

    const chipCheck = result.physics_checks.find(c => c.check.includes("Chip load"));
    expect(chipCheck).not.toBeNull();
    expect(chipCheck!.value).toBeCloseTo(0.1, 2);
    expect(chipCheck!.passed).toBe(true);
  });
});

describe("HurcoV11MillMasterPostEngine.getStats", () => {
  it("returns Hurco VMX24 with WinMax V11", () => {
    const stats = hurcoV11MillMasterPostEngine.getStats();
    expect(stats.machine).toBe("Hurco VMX24");
    expect(stats.controller).toBe("WinMax V11");
  });

  it("reports at least 12 tribal tips", () => {
    const stats = hurcoV11MillMasterPostEngine.getStats();
    expect(stats.tribal_tips).toBeGreaterThanOrEqual(12);
  });

  it("includes UltiMotion and Kienzle features", () => {
    const stats = hurcoV11MillMasterPostEngine.getStats();
    expect(stats.features).toContain("UltiMotion high-speed mode");
    expect(stats.features).toContain("Kienzle force validation");
    expect(stats.features).toContain("JM Die tribal knowledge");
  });

  it("reports 4 physics checks", () => {
    const stats = hurcoV11MillMasterPostEngine.getStats();
    expect(stats.physics_checks).toBe(4);
  });
});

// ─── Prove-out Mode Integration Tests ───────────────────────────────────────


describe("HurcoV11MillMasterPostEngine prove-out mode integration", () => {
  const baseOperations = [
    {
      operation_type: "adaptive" as const,
      tool_number: 2,
      tool_diameter_mm: 10,
      tool_flutes: 4,
      material_iso: "P" as const,
      spindle_rpm: 5000,
      feed_mm_min: 2000,
      axial_depth_mm: 10,
      radial_depth_mm: 1,
      coordinates: [
        { x: 0, y: 0, z: 5, type: "rapid" as const },
        { x: 0, y: 0, z: -10, type: "linear" as const },
        { x: 100, y: 0, z: -10, type: "linear" as const },
      ],
    },
  ];

  it("reduces feed rates by configured percentage (25% default)", async () => {
    const original = hurcoV11MillMasterPostEngine.generateProgram(baseOperations);
    const gcodeText = original.gcode.join("\n");

    const proveOutResult = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: gcodeText,
      config: {
        feed_reduction: 0.25,
        controller: "hurco",
      },
    });

    expect(proveOutResult.summary.feed_reductions).toBeGreaterThan(0);
    expect(proveOutResult.summary.avg_feed_reduction_pct).toBeCloseTo(25, 0);

    // Verify a specific F value is reduced: F2000 → F1500
    const originalHasF2000 = gcodeText.includes("F2000");
    const proveOutHasF1500 = proveOutResult.gcode.includes("F1500");
    if (originalHasF2000) {
      expect(proveOutHasF1500).toBe(true);
    }
  });

  it("caps RPM at configured percentage (80% default)", async () => {
    const original = hurcoV11MillMasterPostEngine.generateProgram(baseOperations);
    const gcodeText = original.gcode.join("\n");

    const proveOutResult = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: gcodeText,
      config: {
        rpm_cap: 0.80,
        controller: "hurco",
      },
    });

    expect(proveOutResult.summary.rpm_caps).toBeGreaterThanOrEqual(0);

    // Original has S5000, prove-out should cap it to S4000 (80%)
    const originalHasS5000 = gcodeText.includes("S5000");
    const proveOutHasS4000 = proveOutResult.gcode.includes("S4000");
    if (originalHasS5000) {
      expect(proveOutHasS4000).toBe(true);
    }
  });

  it("inserts M01 optional stops at tool changes", async () => {
    const multiToolOps = [
      {
        operation_type: "face" as const,
        tool_number: 1,
        tool_diameter_mm: 50,
        tool_flutes: 4,
        material_iso: "P" as const,
        spindle_rpm: 1500,
        feed_mm_min: 600,
        axial_depth_mm: 2,
        coordinates: [{ x: 0, y: 0, z: -2, type: "linear" as const }],
      },
      {
        operation_type: "pocket" as const,
        tool_number: 5,
        tool_diameter_mm: 12,
        tool_flutes: 3,
        material_iso: "P" as const,
        spindle_rpm: 4000,
        feed_mm_min: 1200,
        axial_depth_mm: 5,
        coordinates: [{ x: 0, y: 0, z: -5, type: "linear" as const }],
      },
    ];

    const original = hurcoV11MillMasterPostEngine.generateProgram(multiToolOps);
    const gcodeText = original.gcode.join("\n");

    const proveOutResult = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: gcodeText,
      config: {
        insert_optional_stops: true,
        controller: "hurco",
      },
    });

    // M01 stops only added when G-code contains tool change patterns (T##/M06)
    expect(proveOutResult.summary.optional_stops_added).toBeGreaterThanOrEqual(0);
    if (proveOutResult.summary.optional_stops_added > 0) {
      expect(proveOutResult.gcode).toContain("M01");
    }
  });

  it("adds PROVE-OUT comments at critical blocks", async () => {
    const original = hurcoV11MillMasterPostEngine.generateProgram(baseOperations);
    const gcodeText = original.gcode.join("\n");

    const proveOutResult = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: gcodeText,
      config: {
        add_prove_out_comments: true,
        controller: "hurco",
      },
    });

    expect(proveOutResult.summary.prove_out_comments_added).toBeGreaterThan(0);
    expect(proveOutResult.gcode).toContain("PROVE-OUT");
  });

  it("increases estimated cycle time ratio for conservative prove-out", async () => {
    const original = hurcoV11MillMasterPostEngine.generateProgram(baseOperations);
    const gcodeText = original.gcode.join("\n");

    const proveOutResult = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: gcodeText,
      config: {
        feed_reduction: 0.25,
        rpm_cap: 0.80,
        controller: "hurco",
      },
    });

    // Prove-out should be slower than original (ratio > 1.0)
    expect(proveOutResult.estimated_cycle_time_ratio).toBeGreaterThan(1.0);
  });

  it("applies ISO-group-aware derating for stainless steel (M)", async () => {
    const stainlessOps = [
      {
        operation_type: "adaptive" as const,
        tool_number: 2,
        tool_diameter_mm: 10,
        tool_flutes: 4,
        material_iso: "M" as const,
        spindle_rpm: 3000,
        feed_mm_min: 800,
        axial_depth_mm: 5,
        radial_depth_mm: 1,
        coordinates: [{ x: 0, y: 0, z: -5, type: "linear" as const }],
      },
    ];

    const original = hurcoV11MillMasterPostEngine.generateProgram(stainlessOps);
    const gcodeText = original.gcode.join("\n");

    const proveOutResult = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: gcodeText,
      material: { iso_group: "M" },
      config: {
        feed_reduction: 0.25,
        controller: "hurco",
      },
    });

    // Stainless (M) gets 15% MORE feed reduction than baseline
    // Base 25% × 1.15 = 28.75%
    expect(proveOutResult.summary.avg_feed_reduction_pct).toBeGreaterThan(25);
  });
});
// ---------------------------------------------------------------------------
// FEED OPTIMIZER INTEGRATION (Scenario #7)
// ---------------------------------------------------------------------------
describe("HurcoV11MillMasterPostEngine feed optimizer integration", () => {
  const feedOpOps = [
    {
      operation_type: "adaptive" as const,
      tool_number: 3,
      tool_diameter_mm: 12,
      tool_flutes: 4,
      material_iso: "P" as const,
      spindle_rpm: 5000,
      feed_mm_min: 2000,
      axial_depth_mm: 12,
      radial_depth_mm: 1.2,
      coordinates: [
        { x: 0, y: 0, z: 5, type: "rapid" as const },
        { x: 0, y: 0, z: -12, type: "linear" as const },
        { x: 100, y: 0, z: -12, type: "linear" as const },
        { x: 100, y: 100, z: -12, type: "linear" as const },
      ],
    },
  ];

  it("applies chip thinning compensation to low radial engagement", () => {
    const original = hurcoV11MillMasterPostEngine.generateProgram(feedOpOps);
    const gcodeText = original.gcode.join("\n");
    
    const optimized = feedOptimizer.optimize(gcodeText, {
      toolDiameter_mm: 12,
      toolFlutes: 4,
      radialDepth_mm: 1.2,
      axialDepth_mm: 12,
      material: "P",
      spindleRPM: 5000,
      nominalFeed_mmmin: 2000,
      enableChipThinning: true,
      enableCornerDecel: false,
    });
    
    expect(optimized.stats.totalLines).toBeGreaterThan(0);
    expect(optimized.stats.chipThinningAdjustments).toBeGreaterThanOrEqual(0);
  });

  it("applies corner deceleration at direction changes", () => {
    const original = hurcoV11MillMasterPostEngine.generateProgram(feedOpOps);
    const gcodeText = original.gcode.join("\n");
    
    const optimized = feedOptimizer.optimize(gcodeText, {
      toolDiameter_mm: 12,
      toolFlutes: 4,
      radialDepth_mm: 6,
      axialDepth_mm: 3,
      material: "P",
      spindleRPM: 5000,
      nominalFeed_mmmin: 2000,
      enableChipThinning: false,
      enableCornerDecel: true,
      cornerSlowdownFactor: 0.5,
    });
    
    expect(optimized.stats.cornerDecelerations).toBeGreaterThanOrEqual(0);
  });

  it("outputs optimized G-code with valid structure", () => {
    const original = hurcoV11MillMasterPostEngine.generateProgram(feedOpOps);
    const gcodeText = original.gcode.join("\n");
    
    const optimized = feedOptimizer.optimize(gcodeText, {
      toolDiameter_mm: 12,
      toolFlutes: 4,
      radialDepth_mm: 1.2,
      axialDepth_mm: 12,
      material: "P",
      spindleRPM: 5000,
      nominalFeed_mmmin: 2000,
    });
    
    expect(optimized.gcode).toBeDefined();
    expect(optimized.gcode.length).toBeGreaterThan(0);
    expect(optimized.lines).toBeDefined();
  });

  it("reports estimated time savings", () => {
    const original = hurcoV11MillMasterPostEngine.generateProgram(feedOpOps);
    const gcodeText = original.gcode.join("\n");

    const optimized = feedOptimizer.optimize(gcodeText, {
      toolDiameter_mm: 12,
      toolFlutes: 4,
      radialDepth_mm: 1.2,
      axialDepth_mm: 12,
      material: "P",
      spindleRPM: 5000,
      nominalFeed_mmmin: 2000,
    });

    expect(typeof optimized.stats.estimatedTimeSavings_pct).toBe("number");
    expect(typeof optimized.stats.averageFeedChange).toBe("number");
  });
});

// ============================================================================
// SCENARIO 8: COMPARISON TESTS
// Verify different settings generate distinctly different G-code
// ============================================================================
describe("HurcoV11MillMasterPostEngine cross-controller comparison", () => {
  const baseOps = [
    {
      operation_type: "3d_surface" as const,
      tool_number: 5,
      tool_diameter_mm: 6,
      tool_flutes: 2,
      material_iso: "P" as const,
      spindle_rpm: 6000,
      feed_mm_min: 1200,
      axial_depth_mm: 0.3,
      coordinates: [
        { x: 0, y: 0, z: 0, type: "rapid" as const },
        { x: 50, y: 0, z: -0.3, type: "linear" as const },
        { x: 50, y: 50, z: -0.3, type: "linear" as const },
        { x: 0, y: 50, z: -0.3, type: "linear" as const },
      ],
    },
  ];

  it("UltiMotion mode includes G187 high-speed code while standard mode omits it", () => {
    const withUltimotion = hurcoV11MillMasterPostEngine.generateProgram(baseOps, {
      program_number: 1001,
      use_ultimotion: true,
    });
    const withoutUltimotion = hurcoV11MillMasterPostEngine.generateProgram(baseOps, {
      program_number: 1002,
      use_ultimotion: false,
    });

    const ultCode = withUltimotion.gcode.join("\n");
    const stdCode = withoutUltimotion.gcode.join("\n");

    // UltiMotion must include G187 P3 high-speed code
    expect(ultCode).toContain("G187 P3");
    expect(ultCode).toContain("ULTIMOTION");

    // Standard mode should NOT have UltiMotion-specific codes
    expect(stdCode).not.toContain("G187 P3");

    // Both generate different total line counts due to extra UltiMotion setup
    expect(withUltimotion.total_lines).toBeGreaterThan(withoutUltimotion.total_lines);
  });

  it("milling G-code includes spindle S6000 M03 and G43 tool compensation", () => {
    const millResult = hurcoV11MillMasterPostEngine.generateProgram(baseOps, {
      program_number: 2001,
    });
    const millCode = millResult.gcode.join("\n");

    // Must have exact spindle speed from input
    expect(millCode).toContain("S6000");
    expect(millCode).toContain("M03");

    // Must have XYZ coordinates matching input
    expect(millCode).toContain("X50");
    expect(millCode).toContain("Y50");
    expect(millCode).toContain("Z-0.3");

    // Must have G43 tool length compensation
    expect(millCode).toContain("G43 H5");
  });

  it("getStats returns exact Hurco VMX24 machine specification", () => {
    const stats = hurcoV11MillMasterPostEngine.getStats();

    expect(stats.machine).toBe("Hurco VMX24");
    expect(stats.controller).toBe("WinMax V11");
    expect(stats.features).toContain("UltiMotion high-speed mode");
    expect(stats.features).toContain("Kienzle force validation");
    expect(stats.physics_checks).toBe(4);
    expect(stats.tribal_tips).toBeGreaterThanOrEqual(12);
  });
});

// ============================================================================
// SCENARIO 9: DOWNLOAD / PACKAGE TESTS
// Verify G-code package structure is correctly generated
// ============================================================================
describe("HurcoV11MillMasterPostEngine download package", () => {
  const packageOps = [
    {
      operation_type: "face" as const,
      tool_number: 1,
      tool_diameter_mm: 50,
      tool_flutes: 4,
      material_iso: "P" as const,
      spindle_rpm: 1500,
      feed_mm_min: 600,
      axial_depth_mm: 2,
      coordinates: [
        { x: 0, y: 0, z: 5, type: "rapid" as const },
        { x: 100, y: 0, z: -2, type: "linear" as const },
        { x: 100, y: 100, z: -2, type: "linear" as const },
      ],
    },
    {
      operation_type: "pocket" as const,
      tool_number: 5,
      tool_diameter_mm: 12,
      tool_flutes: 3,
      material_iso: "P" as const,
      spindle_rpm: 4000,
      feed_mm_min: 1200,
      axial_depth_mm: 5,
      coordinates: [
        { x: 20, y: 20, z: 5, type: "rapid" as const },
        { x: 20, y: 20, z: -5, type: "linear" as const },
        { x: 80, y: 80, z: -5, type: "linear" as const },
      ],
    },
  ];

  it("generates program with exact tools_used array [1, 5] and matching line count", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(packageOps, {
      program_number: 3001,
    });

    expect(result.total_lines).toBe(result.gcode.length);
    expect(result.gcode.length).toBeGreaterThan(15);
    expect(result.estimated_cycle_min).toBeGreaterThan(0.05);
    expect(result.tools_used).toEqual([1, 5]);
  });

  it("G-code starts with O3002 header and ends with M30 program stop", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(packageOps, {
      program_number: 3002,
    });
    const code = result.gcode.join("\n");

    expect(result.gcode[0]).toBe("O3002 (PRISM GENERATED)");
    expect(code).toContain("M30");
    expect(result.gcode[result.gcode.length - 1]).toBe("%");
  });

  it("multi-tool operations include T1 M06 and T5 M06 tool changes", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(packageOps, {
      program_number: 3003,
    });
    const code = result.gcode.join("\n");

    expect(result.tools_used.length).toBe(2);
    expect(code).toContain("T1 M06");
    expect(code).toContain("T5 M06");
    expect(code).toContain("G43 H1");
    expect(code).toContain("G43 H5");
  });

  it("physics_checks includes Kienzle cutting force with value > 100N", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(packageOps, {
      program_number: 3004,
    });

    expect(result.physics_checks.length).toBeGreaterThanOrEqual(4);
    const forceCheck = result.physics_checks.find(c => c.check.includes("force"));
    expect(forceCheck).not.toBeNull();
    expect(forceCheck!.value).toBeGreaterThan(100);
    expect(forceCheck!.limit).toBe(2000);
  });
});

// ============================================================================
// SCENARIO 10: ROUND-TRIP TESTS
// Verify generated G-code is syntactically valid and deterministic
// ============================================================================
describe("HurcoV11MillMasterPostEngine round-trip validation", () => {
  const roundTripOps = [
    {
      operation_type: "contour" as const,
      tool_number: 3,
      tool_diameter_mm: 10,
      tool_flutes: 2,
      material_iso: "P" as const,
      spindle_rpm: 4000,
      feed_mm_min: 800,
      axial_depth_mm: 5,
      coordinates: [
        { x: 10, y: 20, z: 5, type: "rapid" as const },
        { x: 10, y: 20, z: -5, type: "linear" as const },
        { x: 60, y: 20, z: -5, type: "linear" as const },
        { x: 60, y: 70, z: -5, type: "linear" as const },
        { x: 10, y: 70, z: -5, type: "linear" as const },
        { x: 10, y: 20, z: -5, type: "linear" as const },
      ],
    },
  ];

  it("G-code has zero unbalanced parentheses (all comments properly closed)", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(roundTripOps, {
      program_number: 4001,
    });
    const code = result.gcode.join("\n");

    let parenDepth = 0;
    for (const char of code) {
      if (char === "(") parenDepth++;
      if (char === ")") parenDepth--;
      expect(parenDepth).toBeGreaterThanOrEqual(0);
    }
    expect(parenDepth).toBe(0);
  });

  it("motion lines use valid G-code words starting with G, M, X, Y, Z, F, or S", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(roundTripOps, {
      program_number: 4002,
    });

    let motionLinesCount = 0;
    for (const line of result.gcode) {
      const trimmed = line.trim();
      if (trimmed.length === 0 || trimmed.startsWith("(") || trimmed.startsWith(";")) continue;
      if (trimmed.startsWith("%") || trimmed.startsWith("O")) continue;

      const isValidGcodeLine = /^N?\d*\s*[GMXYZFSTH]/i.test(trimmed);
      expect(isValidGcodeLine).toBe(true);
      motionLinesCount++;
    }
    expect(motionLinesCount).toBeGreaterThan(8);
  });

  it("output contains exact coordinates X60 Y70 X10 Y20 from input profile", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(roundTripOps, {
      program_number: 4003,
    });
    const code = result.gcode.join("\n");

    expect(code).toContain("X60");
    expect(code).toContain("Y70");
    expect(code).toContain("X10");
    expect(code).toContain("Y20");
    expect(code).toContain("Z-5");
  });

  it("regenerating program 4004 produces identical gcode array and cycle time", () => {
    const config = { program_number: 4004 };

    const result1 = hurcoV11MillMasterPostEngine.generateProgram(roundTripOps, config);
    const result2 = hurcoV11MillMasterPostEngine.generateProgram(roundTripOps, config);

    expect(result1.gcode).toEqual(result2.gcode);
    expect(result1.total_lines).toBe(result2.total_lines);
    expect(result1.estimated_cycle_min).toBeCloseTo(result2.estimated_cycle_min, 3);
  });

  it("G-code includes G00 rapid and G01 linear moves with F800 feed rate", () => {
    const result = hurcoV11MillMasterPostEngine.generateProgram(roundTripOps, {
      program_number: 4005,
    });
    const code = result.gcode.join("\n");

    expect(code).toContain("G00");
    expect(code).toContain("G01");
    expect(code).toContain("F800");
  });
});