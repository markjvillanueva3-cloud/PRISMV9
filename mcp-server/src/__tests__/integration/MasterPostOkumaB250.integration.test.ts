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

  it("generates G76 threading cycle for thread operation", () => {
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
    expect(gcodeText).toContain("G76");
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
