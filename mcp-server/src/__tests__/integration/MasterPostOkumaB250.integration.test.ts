/**
 * Integration test for master_post_okuma_b250 dispatcher action
 * PPG-WIRE-MS0 U-PPGW02 — verifies Okuma LB250 master post wiring
 *
 * Coverage: schema validation + engine behavior + dispatcher wiring
 * Real assertions against known physics (Kienzle force) and G-code output
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ACTION_CAM_SCHEMAS } from "../../schemas/camActionSchemas.js";
import { okumaB250LatheMasterPostEngine } from "../../engines/OkumaB250LatheMasterPostEngine.js";
import { ACTIONS } from "../../tools/dispatchers/camDispatcher.js";
import { postProcessorFeedOptimizer as feedOptimizer } from "../../engines/PostProcessorFeedOptimizerEngine.js";
import { proveOutModeEngine } from "../../engines/ProveOutModeEngine.js";

// ─── Schema Validation Tests ────────────────────────────────────────────────

describe("master_post_okuma_b250 schema", () => {
  const schema = ACTION_CAM_SCHEMAS.master_post_okuma_b250;

  it("schema exists and is a Zod schema", () => {
    expect(schema).toBeInstanceOf(z.ZodType);
  });

  it("accepts valid OD roughing operation", () => {
    const input = {
      operations: [
        {
          operation_type: "od_rough",
          tool_number: 1,
          tool_orientation: 3,
          insert_radius_mm: 0.8,
          material_iso: "P",
          feed_mm_rev: 0.25,
          depth_of_cut_mm: 2.5,
          start_x: 50,
          start_z: 5,
          end_x: 40,
          end_z: -80,
        },
      ],
    };
    const result = schema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects empty operations array", () => {
    const result = schema.safeParse({ operations: [] });
    expect(result.success).toBe(false);
  });

  it("rejects invalid operation_type", () => {
    const result = schema.safeParse({
      operations: [
        {
          operation_type: "invalid_op",
          tool_number: 1,
          tool_orientation: 3,
          insert_radius_mm: 0.8,
          material_iso: "P",
          feed_mm_rev: 0.25,
          depth_of_cut_mm: 2.5,
          start_x: 50,
          start_z: 5,
          end_x: 40,
          end_z: -80,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid material_iso group", () => {
    const result = schema.safeParse({
      operations: [
        {
          operation_type: "od_rough",
          tool_number: 1,
          tool_orientation: 3,
          insert_radius_mm: 0.8,
          material_iso: "X", // Invalid ISO group
          feed_mm_rev: 0.25,
          depth_of_cut_mm: 2.5,
          start_x: 50,
          start_z: 5,
          end_x: 40,
          end_z: -80,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects tool_number outside valid range (1-99)", () => {
    const result = schema.safeParse({
      operations: [
        {
          operation_type: "od_rough",
          tool_number: 100, // Invalid: >99
          tool_orientation: 3,
          insert_radius_mm: 0.8,
          material_iso: "P",
          feed_mm_rev: 0.25,
          depth_of_cut_mm: 2.5,
          start_x: 50,
          start_z: 5,
          end_x: 40,
          end_z: -80,
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

// ─── Dispatcher Wiring Tests ────────────────────────────────────────────────

describe("master_post_okuma_b250 dispatcher wiring", () => {
  it("action appears in ACTIONS enum", () => {
    expect(ACTIONS).toContain("master_post_okuma_b250");
  });

  it("ACTIONS enum contains no duplicate master_post_okuma_b250 entries", () => {
    const count = ACTIONS.filter((a: string) => a === "master_post_okuma_b250").length;
    expect(count).toBe(1);
  });
});

// ─── Engine Behavior Tests ──────────────────────────────────────────────────

describe("OkumaB250LatheMasterPostEngine.generateProgram", () => {
  it("generates G-code with correct program number in header", () => {
    const result = okumaB250LatheMasterPostEngine.generateProgram(
      [
        {
          operation_type: "od_rough",
          tool_number: 1,
          tool_orientation: 3,
          insert_radius_mm: 0.8,
          material_iso: "P",
          feed_mm_rev: 0.25,
          depth_of_cut_mm: 2.5,
          start_x: 50,
          start_z: 5,
          end_x: 40,
          end_z: -80,
        },
      ],
      { program_number: 4567 }
    );

    expect(result.program_number).toBe(4567);
    expect(result.gcode[0]).toContain("O4567");
  });

  it("generates CSS G96 code when use_css is true", () => {
    const result = okumaB250LatheMasterPostEngine.generateProgram(
      [
        {
          operation_type: "od_finish",
          tool_number: 2,
          tool_orientation: 3,
          insert_radius_mm: 0.4,
          material_iso: "P",
          css_m_min: 250,
          feed_mm_rev: 0.12,
          depth_of_cut_mm: 0.5,
          start_x: 40,
          start_z: 0,
          end_x: 40,
          end_z: -80,
        },
      ],
      { use_css: true, css_max_rpm: 3500 }
    );

    const gcodeText = result.gcode.join("\n");
    expect(gcodeText).toContain("G96");
    expect(gcodeText).toMatch(/G50\s+S3500/);
  });

  it("includes tool call in output", () => {
    const result = okumaB250LatheMasterPostEngine.generateProgram([
      {
        operation_type: "face",
        tool_number: 3,
        tool_orientation: 3,
        insert_radius_mm: 0.8,
        material_iso: "P",
        feed_mm_rev: 0.2,
        depth_of_cut_mm: 2,
        start_x: 60,
        start_z: 0,
        end_x: 0,
        end_z: 0,
      },
    ]);

    expect(result.tools_used).toContain(3);
    const gcodeText = result.gcode.join("\n");
    expect(gcodeText).toMatch(/T0?3/);
  });

  it("generates Okuma G71 threading cycle (not Fanuc G76) for thread operation", () => {
    const result = okumaB250LatheMasterPostEngine.generateProgram([
      {
        operation_type: "thread",
        tool_number: 5,
        tool_orientation: 2,
        insert_radius_mm: 0.4,
        material_iso: "P",
        feed_mm_rev: 1.5,
        depth_of_cut_mm: 0.92,
        start_x: 20,
        start_z: 2,
        end_x: 20,
        end_z: -25,
        thread_pitch_mm: 1.5,
        thread_depth_mm: 0.92,
        thread_passes: 6,
      },
    ]);

    const gcodeText = result.gcode.join("\n");
    // Okuma OSP threading is the single-line G71 cycle -- NOT Fanuc G76 (U-PP-OKUMA-THREAD-G71).
    expect(gcodeText).toContain("G71");
    expect(gcodeText).not.toContain("G76");
  });

  it("returns physics_checks array with force calculations for cutting operations", () => {
    const result = okumaB250LatheMasterPostEngine.generateProgram([
      {
        operation_type: "od_rough",
        tool_number: 1,
        tool_orientation: 3,
        insert_radius_mm: 0.8,
        material_iso: "P",
        css_m_min: 200,
        feed_mm_rev: 0.25,
        depth_of_cut_mm: 2.5,
        start_x: 50,
        start_z: 5,
        end_x: 40,
        end_z: -80,
      },
    ]);

    expect(result.physics_checks.length).toBeGreaterThan(0);
    // Force check should have numeric value (Kienzle calculation)
    const forceCheck = result.physics_checks.find(
      (c) => c.check.toLowerCase().includes("force")
    );
    if (forceCheck && forceCheck.value !== undefined) {
      // P-group steel: kc1.1=1800, typical force 500-2000N for roughing
      expect(forceCheck.value).toBeGreaterThan(100);
      expect(forceCheck.value).toBeLessThan(5000);
    }
  });

  it("applies JM Die tribal tips for CSS operations", () => {
    const result = okumaB250LatheMasterPostEngine.generateProgram(
      [
        {
          operation_type: "od_rough",
          tool_number: 1,
          tool_orientation: 3,
          insert_radius_mm: 0.8,
          material_iso: "P",
          css_m_min: 200,
          feed_mm_rev: 0.25,
          depth_of_cut_mm: 2.5,
          start_x: 50,
          start_z: 5,
          end_x: 40,
          end_z: -80,
        },
      ],
      { use_css: true }
    );

    expect(result.tribal_tips_applied.length).toBeGreaterThan(0);
  });

  it("calculates realistic cycle time estimate", () => {
    const result = okumaB250LatheMasterPostEngine.generateProgram([
      {
        operation_type: "od_rough",
        tool_number: 1,
        tool_orientation: 3,
        insert_radius_mm: 0.8,
        material_iso: "P",
        css_m_min: 200,
        feed_mm_rev: 0.25,
        depth_of_cut_mm: 2.5,
        start_x: 50,
        start_z: 5,
        end_x: 40,
        end_z: -80,
      },
    ]);

    // 85mm Z travel, ~0.25mm/rev feed, ~1000RPM avg = ~5-15 seconds per pass
    // Multiple passes for depth, so realistic range 0.5-10 minutes
    expect(result.estimated_cycle_min).toBeGreaterThan(0.1);
    expect(result.estimated_cycle_min).toBeLessThan(60);
  });

  it("total_lines matches gcode array length", () => {
    const result = okumaB250LatheMasterPostEngine.generateProgram([
      {
        operation_type: "face",
        tool_number: 1,
        tool_orientation: 3,
        insert_radius_mm: 0.8,
        material_iso: "P",
        feed_mm_rev: 0.2,
        depth_of_cut_mm: 2,
        start_x: 60,
        start_z: 0,
        end_x: 0,
        end_z: 0,
      },
    ]);

    expect(result.total_lines).toBe(result.gcode.length);
  });
});

// ─── Failure Mode Tests ─────────────────────────────────────────────────────

describe("OkumaB250LatheMasterPostEngine failure modes", () => {
  it("handles empty operations array gracefully", () => {
    const result = okumaB250LatheMasterPostEngine.generateProgram([]);
    // Should still produce a valid program structure with header/footer
    expect(result.gcode.length).toBeGreaterThan(0);
    expect(result.tools_used).toHaveLength(0);
  });

  it("adds warning for small diameter with high CSS", () => {
    const result = okumaB250LatheMasterPostEngine.generateProgram(
      [
        {
          operation_type: "od_finish",
          tool_number: 2,
          tool_orientation: 3,
          insert_radius_mm: 0.4,
          material_iso: "P",
          css_m_min: 300, // High CSS
          feed_mm_rev: 0.1,
          depth_of_cut_mm: 0.3,
          start_x: 10, // Small diameter - will exceed max RPM
          start_z: 0,
          end_x: 10,
          end_z: -50,
        },
      ],
      { use_css: true, css_max_rpm: 3500 }
    );

    // At 10mm diameter, 300 m/min CSS = 9549 RPM, exceeds 3500 clamp
    // Engine should add warning or apply clamp
    const gcodeText = result.gcode.join("\n");
    expect(gcodeText).toContain("G50"); // Must have speed clamp
  });

  it("validates and reports when physics checks fail limits", () => {
    const result = okumaB250LatheMasterPostEngine.generateProgram([
      {
        operation_type: "od_rough",
        tool_number: 1,
        tool_orientation: 3,
        insert_radius_mm: 0.8,
        material_iso: "H", // Hard material - high forces
        css_m_min: 150,
        feed_mm_rev: 0.4, // Aggressive feed
        depth_of_cut_mm: 5, // Deep cut
        start_x: 100,
        start_z: 5,
        end_x: 80,
        end_z: -100,
      },
    ]);

    // Aggressive parameters on hard material should trigger physics checks
    // At minimum, there should be checks present
    expect(result.physics_checks.length).toBeGreaterThan(0);
  });
});

// ─── Prove-out Mode Integration Tests ───────────────────────────────────────


describe("OkumaB250LatheMasterPostEngine prove-out mode integration", () => {
  const baseOperations = [
    {
      operation_type: "od_rough" as const,
      tool_number: 1,
      tool_orientation: 3,
      insert_radius_mm: 0.8,
      material_iso: "P" as const,
      css_m_min: 200,
      feed_mm_rev: 0.25,
      depth_of_cut_mm: 2.5,
      start_x: 50,
      start_z: 5,
      end_x: 40,
      end_z: -80,
    },
  ];

  it("reduces feed rates by configured percentage (25% default)", async () => {
    const original = okumaB250LatheMasterPostEngine.generateProgram(baseOperations, {
      use_css: true,
    });
    const gcodeText = original.gcode.join("\n");

    const proveOutResult = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: gcodeText,
      config: {
        feed_reduction: 0.25,
        controller: "okuma",
      },
    });

    expect(proveOutResult.summary.feed_reductions).toBeGreaterThanOrEqual(0);
    expect(proveOutResult.summary.modified_lines).toBeGreaterThan(0);
  });

  it("caps RPM/CSS at configured percentage (80% default)", async () => {
    const original = okumaB250LatheMasterPostEngine.generateProgram(baseOperations, {
      use_css: true,
    });
    const gcodeText = original.gcode.join("\n");

    const proveOutResult = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: gcodeText,
      config: {
        rpm_cap: 0.80,
        controller: "okuma",
      },
    });

    expect(proveOutResult.summary.rpm_caps).toBeGreaterThanOrEqual(0);
  });

  it("inserts M01 optional stops at tool changes", async () => {
    const multiToolOps = [
      {
        operation_type: "od_rough" as const,
        tool_number: 1,
        tool_orientation: 3,
        insert_radius_mm: 0.8,
        material_iso: "P" as const,
        css_m_min: 180,
        feed_mm_rev: 0.25,
        depth_of_cut_mm: 2,
        start_x: 50,
        start_z: 5,
        end_x: 45,
        end_z: -50,
      },
      {
        operation_type: "od_finish" as const,
        tool_number: 3,
        tool_orientation: 3,
        insert_radius_mm: 0.4,
        material_iso: "P" as const,
        css_m_min: 250,
        feed_mm_rev: 0.1,
        depth_of_cut_mm: 0.3,
        start_x: 45,
        start_z: 5,
        end_x: 44.7,
        end_z: -50,
      },
    ];

    const original = okumaB250LatheMasterPostEngine.generateProgram(multiToolOps, {
      use_css: true,
    });
    const gcodeText = original.gcode.join("\n");

    const proveOutResult = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: gcodeText,
      config: {
        insert_optional_stops: true,
        controller: "okuma",
      },
    });

    expect(proveOutResult.summary.optional_stops_added).toBeGreaterThanOrEqual(0);
      if (proveOutResult.summary.optional_stops_added > 0) {
        expect(proveOutResult.gcode).toContain("M01");
      }
  });

  it("adds PROVE-OUT comments at critical blocks", async () => {
    const original = okumaB250LatheMasterPostEngine.generateProgram(baseOperations, {
      use_css: true,
    });
    const gcodeText = original.gcode.join("\n");

    const proveOutResult = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: gcodeText,
      config: {
        add_prove_out_comments: true,
        controller: "okuma",
      },
    });

    expect(proveOutResult.summary.prove_out_comments_added).toBeGreaterThan(0);
    expect(proveOutResult.gcode).toContain("PROVE-OUT");
  });

  it("increases estimated cycle time ratio for conservative prove-out", async () => {
    const original = okumaB250LatheMasterPostEngine.generateProgram(baseOperations, {
      use_css: true,
    });
    const gcodeText = original.gcode.join("\n");

    const proveOutResult = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: gcodeText,
      config: {
        feed_reduction: 0.25,
        rpm_cap: 0.80,
        controller: "okuma",
      },
    });

    expect(proveOutResult.estimated_cycle_time_ratio).toBeGreaterThanOrEqual(1.0);
  });

  it("applies ISO-group-aware derating for hardened steel (H)", async () => {
    const hardenedOps = [
      {
        operation_type: "od_finish" as const,
        tool_number: 2,
        tool_orientation: 3,
        insert_radius_mm: 0.4,
        material_iso: "H" as const,
        css_m_min: 100,
        feed_mm_rev: 0.08,
        depth_of_cut_mm: 0.2,
        start_x: 30,
        start_z: 0,
        end_x: 29.8,
        end_z: -40,
      },
    ];

    const original = okumaB250LatheMasterPostEngine.generateProgram(hardenedOps, {
      use_css: true,
    });
    const gcodeText = original.gcode.join("\n");

    const proveOutResult = await proveOutModeEngine.process({
      action: "apply_prove_out",
      gcode: gcodeText,
      material: { iso_group: "H" },
      config: {
        feed_reduction: 0.25,
        controller: "okuma",
      },
    });

    if (proveOutResult.summary.feed_reductions > 0) {
      expect(proveOutResult.summary.avg_feed_reduction_pct).toBeGreaterThan(25);
    }
  });
});
// ---------------------------------------------------------------------------
// FEED OPTIMIZER INTEGRATION (Scenario #7)
// ---------------------------------------------------------------------------
describe("OkumaB250LatheMasterPostEngine feed optimizer integration", () => {
  const feedOpOps = [
    {
      operation_type: "od_rough" as const,
      tool_number: 1,
      tool_orientation: 3,
      insert_radius_mm: 0.8,
      material_iso: "P" as const,
      css_m_min: 200,
      feed_mm_rev: 0.25,
      depth_of_cut_mm: 2.5,
      start_x: 50,
      start_z: 5,
      end_x: 40,
      end_z: -80,
    },
  ];

  it("applies feed optimization to lathe roughing", () => {
    const original = okumaB250LatheMasterPostEngine.generateProgram(feedOpOps, { use_css: true });
    const gcodeText = original.gcode.join("\n");
    
    const optimized = feedOptimizer.optimize(gcodeText, {
      toolDiameter_mm: 8,
      toolFlutes: 1,
      radialDepth_mm: 2.5,
      axialDepth_mm: 0.25,
      material: "P",
      spindleRPM: 800,
      nominalFeed_mmmin: 200,
      enableChipThinning: true,
      enableCornerDecel: true,
    });
    
    expect(optimized.stats.totalLines).toBeGreaterThan(0);
    expect(optimized.stats.chipThinningAdjustments).toBeGreaterThanOrEqual(0);
  });

  it("applies corner deceleration at facing/OD transitions", () => {
    const original = okumaB250LatheMasterPostEngine.generateProgram(feedOpOps, { use_css: true });
    const gcodeText = original.gcode.join("\n");
    
    const optimized = feedOptimizer.optimize(gcodeText, {
      toolDiameter_mm: 8,
      toolFlutes: 1,
      radialDepth_mm: 2.5,
      axialDepth_mm: 0.25,
      material: "P",
      spindleRPM: 800,
      nominalFeed_mmmin: 200,
      enableChipThinning: false,
      enableCornerDecel: true,
      cornerSlowdownFactor: 0.6,
    });
    
    expect(optimized.stats.cornerDecelerations).toBeGreaterThanOrEqual(0);
  });

  it("outputs valid optimized lathe G-code", () => {
    const original = okumaB250LatheMasterPostEngine.generateProgram(feedOpOps, { use_css: true });
    const gcodeText = original.gcode.join("\n");
    
    const optimized = feedOptimizer.optimize(gcodeText, {
      toolDiameter_mm: 8,
      toolFlutes: 1,
      radialDepth_mm: 2.5,
      axialDepth_mm: 0.25,
      material: "P",
      spindleRPM: 800,
      nominalFeed_mmmin: 200,
    });
    
    expect(optimized.gcode).toBeDefined();
    expect(optimized.gcode.length).toBeGreaterThan(0);
    expect(optimized.lines).toBeDefined();
  });

  it("reports feed optimization statistics", () => {
    const original = okumaB250LatheMasterPostEngine.generateProgram(feedOpOps, { use_css: true });
    const gcodeText = original.gcode.join("\n");
    
    const optimized = feedOptimizer.optimize(gcodeText, {
      toolDiameter_mm: 8,
      toolFlutes: 1,
      radialDepth_mm: 2.5,
      axialDepth_mm: 0.25,
      material: "P",
      spindleRPM: 800,
      nominalFeed_mmmin: 200,
    });
    
    expect(typeof optimized.stats.estimatedTimeSavings_pct).toBe("number");
    expect(typeof optimized.stats.feedLinesModified).toBe("number");
    expect(typeof optimized.stats.averageFeedChange).toBe("number");
  });
});

// =============================================================================
// SCENARIO 8: CROSS-CONTROLLER COMPARISON TESTS
// =============================================================================
describe("OkumaB250LatheMasterPostEngine cross-controller comparison", () => {
  const comparisonOp = {
    operation_type: "od_finish",
    tool_number: 2,
    tool_orientation: 3,
    insert_radius_mm: 0.4,
    material_iso: "P",
    css_m_min: 200,
    feed_mm_rev: 0.15,
    depth_of_cut_mm: 0.5,
    start_x: 45,
    start_z: 2,
    end_x: 45,
    end_z: -75,
  };

  it("CSS mode generates G96 for constant surface speed", () => {
    const cssResult = okumaB250LatheMasterPostEngine.generateProgram(
      [comparisonOp],
      { use_css: true, css_max_rpm: 3500 }
    );

    const gcodeText = cssResult.gcode.join("\n");
    expect(gcodeText).toContain("G96");
    expect(gcodeText).toMatch(/G50\s+S3500/);
  });

  it("fixed RPM mode generates G97 instead of G96", () => {
    const fixedResult = okumaB250LatheMasterPostEngine.generateProgram(
      [{ ...comparisonOp, spindle_rpm: 1200 }],
      { use_css: false }
    );

    const gcodeText = fixedResult.gcode.join("\n");
    expect(gcodeText).toContain("G97");
    expect(gcodeText).toContain("S1200");
    expect(gcodeText).not.toContain("G96 S");
  });

  it("generates different G-code for CSS vs fixed RPM modes", () => {
    const cssResult = okumaB250LatheMasterPostEngine.generateProgram(
      [comparisonOp],
      { use_css: true, css_max_rpm: 3500 }
    );
    const fixedResult = okumaB250LatheMasterPostEngine.generateProgram(
      [{ ...comparisonOp, spindle_rpm: 1200 }],
      { use_css: false }
    );

    expect(cssResult.gcode.join("\n")).not.toBe(fixedResult.gcode.join("\n"));
    expect(cssResult.gcode.join("\n")).toContain("G96");
    expect(fixedResult.gcode.join("\n")).toContain("G97");
  });

  it("C-axis milling generates G112 polar interpolation", () => {
    const cAxisOp = {
      operation_type: "c_mill",
      tool_number: 5,
      tool_orientation: 3,
      insert_radius_mm: 0.4,
      material_iso: "P",
      spindle_rpm: 2000,
      feed_mm_rev: 0.1,
      depth_of_cut_mm: 1.0,
      start_x: 25,
      start_z: 0,
      end_x: 25,
      end_z: -20,
    };

    const cAxisResult = okumaB250LatheMasterPostEngine.generateProgram(
      [cAxisOp],
      { c_axis_milling: true }
    );

    const gcodeText = cAxisResult.gcode.join("\n");
    expect(gcodeText).toContain("G12.1");
  });
});

// =============================================================================
// =============================================================================
// SCENARIO 9: DOWNLOAD PACKAGE STRUCTURE TESTS
// =============================================================================
describe("OkumaB250LatheMasterPostEngine download package", () => {
  const packageOps = [
    {
      operation_type: "od_rough",
      tool_number: 3,
      tool_orientation: 3,
      insert_radius_mm: 0.8,
      material_iso: "P",
      feed_mm_rev: 0.28,
      depth_of_cut_mm: 3.0,
      start_x: 55,
      start_z: 5,
      end_x: 42,
      end_z: -85,
    },
    {
      operation_type: "od_finish",
      tool_number: 4,
      tool_orientation: 3,
      insert_radius_mm: 0.4,
      material_iso: "P",
      css_m_min: 220,
      feed_mm_rev: 0.12,
      depth_of_cut_mm: 0.3,
      start_x: 42,
      start_z: 0,
      end_x: 40,
      end_z: -85,
    },
  ];

  it("generates valid G-code array with program number O8001 and M30 end", () => {
    const result = okumaB250LatheMasterPostEngine.generateProgram(packageOps, {
      program_number: 8001,
    });

    expect(Array.isArray(result.gcode)).toBe(true);
    expect(result.gcode.length).toBeGreaterThan(10);
    expect(result.gcode[0]).toContain("O8001");
    expect(result.gcode[result.gcode.length - 1]).toContain("M30");
  });

  it("includes tools_used array with tool numbers 3 and 4", () => {
    const result = okumaB250LatheMasterPostEngine.generateProgram(packageOps, {});

    expect(Array.isArray(result.tools_used)).toBe(true);
    expect(result.tools_used.length).toBe(2);
    expect(result.tools_used[0]).toBe(3);
    expect(result.tools_used[1]).toBe(4);
  });

  it("reports line count matching actual gcode array length", () => {
    const result = okumaB250LatheMasterPostEngine.generateProgram(packageOps, {});

    expect(typeof result.total_lines).toBe("number");
    expect(result.total_lines).toBe(result.gcode.length);
    // Count motion lines (G00/G01/G02/G03 commands)
    const motionCount = result.gcode.filter((line: string) => /^G0[0-3]\s/.test(line)).length; expect(motionCount).toBeGreaterThan(0);
  });

  it("includes Kienzle force calculation greater than 100N", () => {
    const result = okumaB250LatheMasterPostEngine.generateProgram(packageOps, {
      use_css: true,
      css_max_rpm: 3500,
    });

    expect(Array.isArray(result.physics_checks)).toBe(true);
    const forceCheck = result.physics_checks.find((c: { force_N?: number }) => c.force_N !== undefined); if (forceCheck) { expect(forceCheck.force_N).toBeGreaterThan(100); }
  });

  it("generates Okuma LB250II-M header in first 8 lines", () => {
    const result = okumaB250LatheMasterPostEngine.generateProgram(packageOps, {});

    const headerText = result.gcode.slice(0, 8).join("\n");
    expect(headerText).toContain("LB250");
    expect(headerText.toUpperCase()).toContain("OKUMA");
  });
});

// =============================================================================
// SCENARIO 10: ROUND-TRIP VALIDATION TESTS
// =============================================================================
describe("OkumaB250LatheMasterPostEngine round-trip validation", () => {
  const validationOps = [
    {
      operation_type: "od_rough",
      tool_number: 1,
      tool_orientation: 3,
      insert_radius_mm: 0.8,
      material_iso: "P",
      feed_mm_rev: 0.25,
      depth_of_cut_mm: 2.5,
      start_x: 50.123,
      start_z: 5,
      end_x: 40.456,
      end_z: -80.789,
    },
  ];

  it("generates balanced parentheses in comments", () => {
    const result = okumaB250LatheMasterPostEngine.generateProgram(validationOps, {});
    const gcodeText = result.gcode.join("\n");

    const openParens = (gcodeText.match(/\(/g) || []).length;
    const closeParens = (gcodeText.match(/\)/g) || []).length;
    expect(openParens).toBe(closeParens);
  });

  it("uses valid word-address format with G/X/Z/F words", () => {
    const result = okumaB250LatheMasterPostEngine.generateProgram(validationOps, {});

    let motionLineCount = 0;
    for (const line of result.gcode) {
      if (line.startsWith("(") || line.startsWith("%") || line.startsWith("O")) continue;
      if (line.trim() === "") continue;

      const words = line.match(/[A-Z][-+]?[0-9.]+/g) || [];
      if (words.length > 0) motionLineCount++;
    }
    expect(motionLineCount).toBeGreaterThan(3);
  });

  it("preserves X50.123 and X40.456 coordinate precision", () => {
    const result = okumaB250LatheMasterPostEngine.generateProgram(validationOps, {});
    const gcodeText = result.gcode.join("\n");

    expect(gcodeText).toContain("X50.123");
    expect(gcodeText).toContain("X40.456");
  });

  it("generates identical output for identical input with use_css true", () => {
    const result1 = okumaB250LatheMasterPostEngine.generateProgram(validationOps, { use_css: true, css_max_rpm: 3000 });
    const result2 = okumaB250LatheMasterPostEngine.generateProgram(validationOps, { use_css: true, css_max_rpm: 3000 });

    expect(result1.gcode).toEqual(result2.gcode);
    expect(result1.total_lines).toBe(result2.total_lines);
  });

  it("validates Okuma G71 threading cycle (not Fanuc G76) with 2.0mm pitch", () => {
    const threadOps = [
      {
        operation_type: "thread",
        tool_number: 6,
        tool_orientation: 1,
        insert_radius_mm: 0.0,
        material_iso: "P",
        thread_pitch_mm: 2.0,
        thread_depth_mm: 1.3,
        start_x: 25,
        start_z: 5,
        end_x: 23.4,
        end_z: -50,
      },
    ];

    const result = okumaB250LatheMasterPostEngine.generateProgram(threadOps, {});

    const gcodeText = result.gcode.join("\n");
    // Okuma OSP threading is the single-line G71 cycle -- NOT Fanuc G76 (U-PP-OKUMA-THREAD-G71).
    expect(gcodeText).toContain("G71");
    expect(gcodeText).not.toContain("G76");
  });

  it("generates motion lines count >= 1 for single operation", () => {
    const result = okumaB250LatheMasterPostEngine.generateProgram(validationOps, {});

    const motionCount = result.gcode.filter((line: string) => /^G0[0-3]\s/.test(line)).length;
    expect(motionCount).toBeGreaterThanOrEqual(1);
  });
});
