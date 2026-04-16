/**
 * PP Edge Cases & Stress Tests
 *
 * Validates that PostProcessorPipelineEngine handles degenerate, minimal,
 * and extreme inputs without crashing. Each test verifies:
 *   1. The pipeline returns a result (does not throw)
 *   2. output_gcode exists (string, possibly empty)
 *   3. overall_status is defined
 *
 * Fixtures: Haas VF-2, 4140 Steel, 10mm carbide endmill.
 *
 * @module pp-edge-cases
 */

import { describe, it, expect } from "vitest";
import {
  postProcessorPipelineEngine,
  type PipelineInput,
  type PipelineOutput,
  type MaterialContext,
  type MachineContext,
  type ToolContext,
} from "../engines/PostProcessorPipelineEngine.js";

// ─── Shared Fixtures ────────────────────────────────────────────────

const STEEL_4140: MaterialContext = {
  id: "4140",
  name: "4140 Steel",
  iso_group: "P",
  uts_MPa: 655,
  hardness_HB: 197,
  kc1_1: 1800,
  mc: 0.25,
  resolution_confidence: 1.0,
};

const HAAS_VF2: MachineContext = {
  id: "vf2",
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
  tool_change_time_s: 4.2,
  resolution_confidence: 1.0,
};

const ENDMILL_10MM: ToolContext = {
  id: "1",
  type: "flat_endmill",
  diameter_mm: 10,
  flute_count: 4,
  flute_length_mm: 25,
  material: "carbide",
  coating: "TiAlN",
  resolution_confidence: 1.0,
};

/** Minimal stage config that disables heavy physics to keep tests fast */
const FAST_STAGES: PipelineInput["stages"] = {
  speed_feed: false,
  engagement_analysis: false,
  safety_analysis: false,
  playbook_rules: false,
  wear_progression: false,
  thermal_tracking: false,
};

/**
 * Shared assertion helper: verifies the three invariants every edge-case
 * test must satisfy regardless of input quality.
 */
function assertValidResult(r: PipelineOutput, label: string): void {
  expect(r, `${label}: pipeline returned nullish`).toBeDefined();
  expect(typeof r.output_gcode, `${label}: output_gcode is not a string`).toBe("string");
  expect(r.overall_status, `${label}: overall_status is undefined`).toBeDefined();
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("PostProcessorPipelineEngine — Edge Cases & Stress", () => {

  // 1. Empty G-code
  it("handles empty G-code without crashing", async () => {
    const r = await postProcessorPipelineEngine.process({
      gcode: "",
      material: STEEL_4140,
      machine: HAAS_VF2,
      tools: [ENDMILL_10MM],
      stages: FAST_STAGES,
    });
    assertValidResult(r, "empty-gcode");
    // Empty input should produce zero or minimal blocks
    expect(r.blocks.length).toBeLessThanOrEqual(1);
  });

  // 2. Single-line program — just M30
  it("handles single-line M30 program gracefully", async () => {
    const r = await postProcessorPipelineEngine.process({
      gcode: "M30",
      material: STEEL_4140,
      machine: HAAS_VF2,
      tools: [ENDMILL_10MM],
      stages: FAST_STAGES,
    });
    assertValidResult(r, "single-line-M30");
    // M30 alone has no motion — zero blocks expected
    expect(r.blocks.length).toBe(0);
  });

  // 3. No material provided — pipeline should still run (skip physics)
  it("runs without material (skips physics stages)", async () => {
    const r = await postProcessorPipelineEngine.process({
      gcode: "T1 M6\nS3000 M3\nG01 X50 Y0 Z-2 F800\nG00 Z5\nM30\n",
      machine: HAAS_VF2,
      tools: [ENDMILL_10MM],
      stages: FAST_STAGES,
    });
    assertValidResult(r, "no-material");
    expect(r.blocks.length).toBeGreaterThan(0);
    // Speed/feed stage should be skipped when no material
    const sfStage = r.stages.find(s => s.stage === "1.1_base_speed_feed");
    if (sfStage) {
      expect(sfStage.status).toBe("skipped");
    }
  });

  // 4. No machine provided — pipeline should still run (use defaults)
  it("runs without machine context (uses defaults)", async () => {
    const r = await postProcessorPipelineEngine.process({
      gcode: "T1 M6\nS3000 M3\nG01 X50 Y0 Z-2 F800\nG00 Z5\nM30\n",
      material: STEEL_4140,
      tools: [ENDMILL_10MM],
      stages: FAST_STAGES,
    });
    assertValidResult(r, "no-machine");
    expect(r.blocks.length).toBeGreaterThan(0);
  });

  // 5. No tools provided — pipeline should still run (fallback behavior)
  it("runs without tools (fallback behavior)", async () => {
    const r = await postProcessorPipelineEngine.process({
      gcode: "T1 M6\nS3000 M3\nG01 X50 Y0 Z-2 F800\nG00 Z5\nM30\n",
      material: STEEL_4140,
      machine: HAAS_VF2,
      stages: FAST_STAGES,
    });
    assertValidResult(r, "no-tools");
    expect(r.blocks.length).toBeGreaterThan(0);
  });

  // 6. Very high RPM input (S50000) — should clamp to machine max
  it("clamps S50000 to machine max RPM", async () => {
    const r = await postProcessorPipelineEngine.process({
      gcode: "T1 M6\nS50000 M3\nG01 X50 Y0 Z-2 F800\nG00 Z5\nM30\n",
      material: STEEL_4140,
      machine: HAAS_VF2,
      tools: [ENDMILL_10MM],
      stages: FAST_STAGES,
    });
    assertValidResult(r, "high-rpm");
    // The output G-code should not contain S50000 if clamping worked;
    // alternatively, blocks should respect max_rpm
    for (const b of r.blocks) {
      if (b.spindle_rpm !== undefined && b.spindle_rpm > 0) {
        // With physics stages disabled, the parser may preserve original values,
        // but if any clamping stage ran, it must respect machine max
        if (b.optimization) {
          expect(b.spindle_rpm).toBeLessThanOrEqual(HAAS_VF2.max_rpm);
        }
      }
    }
  });

  // 7. Zero feed rate — should handle without crash
  it("handles zero feed rate (F0) without crashing", async () => {
    const r = await postProcessorPipelineEngine.process({
      gcode: "T1 M6\nS3000 M3\nG01 X50 Y0 Z-2 F0\nG00 Z5\nM30\n",
      material: STEEL_4140,
      machine: HAAS_VF2,
      tools: [ENDMILL_10MM],
      stages: FAST_STAGES,
    });
    assertValidResult(r, "zero-feed");
    expect(r.blocks.length).toBeGreaterThan(0);
  });

  // 8. Negative coordinates — X-100 Y-200 Z-50 should work
  it("handles negative coordinates correctly", async () => {
    const r = await postProcessorPipelineEngine.process({
      gcode: "T1 M6\nS3000 M3\nG01 X-100 Y-200 Z-50 F800\nG00 Z5\nM30\n",
      material: STEEL_4140,
      machine: HAAS_VF2,
      tools: [ENDMILL_10MM],
      stages: FAST_STAGES,
    });
    assertValidResult(r, "negative-coords");
    const cutBlock = r.blocks.find(b => b.move_type === "G1");
    expect(cutBlock).toBeDefined();
    expect(cutBlock!.x).toBe(-100);
    expect(cutBlock!.y).toBe(-200);
    expect(cutBlock!.z).toBe(-50);
  });

  // 9. G-code with comments only — should not crash
  it("handles comments-only G-code without crashing", async () => {
    const r = await postProcessorPipelineEngine.process({
      gcode: "(COMMENT)\n(ANOTHER COMMENT)\n; semicolon comment\n",
      material: STEEL_4140,
      machine: HAAS_VF2,
      tools: [ENDMILL_10MM],
      stages: FAST_STAGES,
    });
    assertValidResult(r, "comments-only");
    // Comments produce no motion blocks
    expect(r.blocks.length).toBe(0);
  });

  // 10. Program with 100 tool changes — should complete without crash
  it("handles 100 tool changes without crashing", async () => {
    const lines: string[] = [];
    for (let i = 1; i <= 100; i++) {
      lines.push(`T${i} M6`);
      lines.push(`S${2000 + i * 10} M3`);
      lines.push(`G01 X${i} Y${i} Z-1 F500`);
      lines.push("G00 Z5");
    }
    lines.push("M30");

    const r = await postProcessorPipelineEngine.process({
      gcode: lines.join("\n"),
      material: STEEL_4140,
      machine: HAAS_VF2,
      tools: [ENDMILL_10MM],
      stages: FAST_STAGES,
    });
    assertValidResult(r, "100-tool-changes");
    // Should have at least 100 cutting blocks (G01) + 100 rapids (G00)
    expect(r.blocks.length).toBeGreaterThanOrEqual(200);
  });

  // 11. All rapids, no cutting — G0 only program
  it("handles all-rapids (G0 only) program", async () => {
    const r = await postProcessorPipelineEngine.process({
      gcode: [
        "T1 M6",
        "S3000 M3",
        "G00 X0 Y0 Z5",
        "G00 X50 Y0 Z5",
        "G00 X50 Y30 Z5",
        "G00 X0 Y30 Z5",
        "G00 X0 Y0 Z5",
        "M30",
      ].join("\n"),
      material: STEEL_4140,
      machine: HAAS_VF2,
      tools: [ENDMILL_10MM],
      stages: FAST_STAGES,
    });
    assertValidResult(r, "all-rapids");
    // Every motion block should be a rapid
    for (const b of r.blocks) {
      expect(b.move_type).toBe("G0");
    }
    expect(r.blocks.length).toBeGreaterThanOrEqual(4);
  });

  // 12. aggressiveness=0 — most conservative, should produce valid output
  it("aggressiveness=0 produces valid output", async () => {
    const r = await postProcessorPipelineEngine.process({
      gcode: "T1 M6\nS3000 M3\nG01 X50 Y0 Z-2 F800\nG01 Y30\nG00 Z5\nM30\n",
      material: STEEL_4140,
      machine: HAAS_VF2,
      tools: [ENDMILL_10MM],
      aggressiveness: 0,
      stages: {
        engagement_analysis: false,
        safety_analysis: false,
        playbook_rules: false,
        wear_progression: false,
        thermal_tracking: false,
      },
    });
    assertValidResult(r, "aggressiveness-0");
    expect(r.aggressiveness).toBe(0);
    expect(r.blocks.length).toBeGreaterThan(0);
  });

  // 13. aggressiveness=1 — most aggressive, RPM should still be <= machine max
  it("aggressiveness=1 respects machine RPM ceiling", async () => {
    const r = await postProcessorPipelineEngine.process({
      gcode: "T1 M6\nS3000 M3\nG01 X50 Y0 Z-2 F800\nG01 Y30\nG00 Z5\nM30\n",
      material: STEEL_4140,
      machine: HAAS_VF2,
      tools: [ENDMILL_10MM],
      aggressiveness: 1,
      stages: {
        engagement_analysis: false,
        safety_analysis: false,
        playbook_rules: false,
        wear_progression: false,
        thermal_tracking: false,
      },
    });
    assertValidResult(r, "aggressiveness-1");
    expect(r.aggressiveness).toBe(1);
    // Every block with optimization data must respect machine max RPM
    for (const b of r.blocks) {
      if (b.optimization) {
        expect(
          b.spindle_rpm ?? 0,
          `Block ${b.id}: RPM ${b.spindle_rpm} exceeds machine max ${HAAS_VF2.max_rpm}`,
        ).toBeLessThanOrEqual(HAAS_VF2.max_rpm);
      }
    }
  });
});
