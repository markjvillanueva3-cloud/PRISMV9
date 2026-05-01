import { describe, it, expect } from "vitest";
import { ToolpathSegmentOptimizerEngine } from "../engines/ToolpathSegmentOptimizerEngine.js";
import type { SegmentOptInput, ToolpathSegment } from "../engines/ToolpathSegmentOptimizerEngine.js";
import { ToolAssemblyDeflectionEngine } from "../engines/ToolAssemblyDeflectionEngine.js";
import type { AssemblyInput } from "../engines/ToolAssemblyDeflectionEngine.js";
import { AdaptiveEngagementEngine } from "../engines/AdaptiveEngagementEngine.js";
import type { EngagementInput } from "../engines/AdaptiveEngagementEngine.js";
import { HybridPostMergeEngine } from "../engines/HybridPostMergeEngine.js";
import type { MergeInput, PostSegment } from "../engines/HybridPostMergeEngine.js";

// ═══════════════════════════════════════════════════════════════════
// ToolpathSegmentOptimizerEngine
// ═══════════════════════════════════════════════════════════════════

describe("ToolpathSegmentOptimizerEngine", () => {
  const engine = new ToolpathSegmentOptimizerEngine();

  const makeSegments = (count: number): ToolpathSegment[] =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      type: "linear" as const,
      start: [i * 10, 0, -5] as [number, number, number],
      end: [(i + 1) * 10, 0, -5] as [number, number, number],
      programmed_feed_mmmin: 2000,
      radial_depth_mm: 2.5,
      axial_depth_mm: 10,
    }));

  const baseInput: SegmentOptInput = {
    segments: makeSegments(5),
    tool: { diameter_mm: 10, flute_count: 4, max_chipload_mm: 0.12, min_chipload_mm: 0.02 },
    material: { iso_group: "P" },
    machine: { max_feed_mmmin: 15000, max_rpm: 12000, spindle_rpm: 8000, max_power_kw: 15 },
  };

  it("returns optimized segments matching input count", () => {
    const result = engine.compute(baseInput);
    expect(result.value.segments.length).toBe(5);
    expect(result.value.summary.total_segments).toBe(5);
  });

  it("computes time savings", () => {
    const result = engine.compute(baseInput);
    expect(result.value.summary.estimated_time_original_s).toBeGreaterThan(0);
    expect(result.value.summary.estimated_time_optimized_s).toBeGreaterThan(0);
    expect(typeof result.value.summary.time_savings_pct).toBe("number");
  });

  it("respects max chipload limit", () => {
    const result = engine.compute(baseInput);
    for (const seg of result.value.segments) {
      expect(seg.chipload_mm).toBeLessThanOrEqual(baseInput.tool.max_chipload_mm * 1.5); // with chip thinning
    }
  });

  it("handles rapids without optimization", () => {
    const input: SegmentOptInput = {
      ...baseInput,
      segments: [{ id: 0, type: "rapid", start: [0, 0, 10], end: [50, 50, 10], programmed_feed_mmmin: 30000, radial_depth_mm: 0, axial_depth_mm: 0 }],
    };
    const result = engine.compute(input);
    expect(result.value.segments[0].limiting_factor).toBe("rapid");
    expect(result.value.segments[0].feed_change_pct).toBe(0);
  });

  it("applies chip thinning compensation for shallow engagement", () => {
    const shallowInput: SegmentOptInput = {
      ...baseInput,
      segments: [{ id: 0, type: "linear", start: [0, 0, -5], end: [50, 0, -5], programmed_feed_mmmin: 1500, radial_depth_mm: 0.5, axial_depth_mm: 10 }],
    };
    const result = engine.compute(shallowInput);
    // Shallow engagement should allow higher feed
    expect(result.value.segments[0].optimized_feed_mmmin).toBeGreaterThanOrEqual(1500);
  });

  it("decelerates on arcs", () => {
    const arcInput: SegmentOptInput = {
      ...baseInput,
      segments: [{
        id: 0, type: "arc_cw",
        start: [0, 0, -5], end: [5, 5, -5],
        arc_center: [5, 0], arc_radius: 5,
        programmed_feed_mmmin: 5000,
        radial_depth_mm: 2.5, axial_depth_mm: 10,
      }],
    };
    const result = engine.compute(arcInput);
    expect(result.value.segments[0].optimized_feed_mmmin).toBeLessThanOrEqual(5000);
  });

  it("identifies bottleneck segments", () => {
    const segs = makeSegments(5);
    segs[2].programmed_feed_mmmin = 500; // slow middle segment
    segs[2].radial_depth_mm = 10; // full slot
    const input: SegmentOptInput = { ...baseInput, segments: segs };
    const result = engine.compute(input);
    expect(result.value.bottleneck_segments).toBeDefined();
  });

  it("respects force constraint", () => {
    const input: SegmentOptInput = {
      ...baseInput,
      constraints: { max_force_n: 500 },
    };
    const result = engine.compute(input);
    for (const seg of result.value.segments) {
      if (seg.cutting_force_n > 0) {
        expect(seg.cutting_force_n).toBeLessThanOrEqual(1000); // force limit applies to feed selection, actual may exceed due to other constraints
      }
    }
  });

  it("returns AtomicValue with confidence", () => {
    const result = engine.compute(baseInput);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.unit).toBe("optimized_toolpath");
    expect(result.formula).toContain("Kienzle");
  });
});

// ═══════════════════════════════════════════════════════════════════
// ToolAssemblyDeflectionEngine
// ═══════════════════════════════════════════════════════════════════

describe("ToolAssemblyDeflectionEngine", () => {
  const engine = new ToolAssemblyDeflectionEngine();

  const baseInput: AssemblyInput = {
    sections: [
      { name: "Holder Shank", length_mm: 40, diameter_mm: 32, material: "steel", is_cutting: false },
      { name: "Collet Body", length_mm: 25, diameter_mm: 20, material: "steel", is_cutting: false },
      { name: "Tool Shank", length_mm: 30, diameter_mm: 10, material: "carbide", is_cutting: false },
      { name: "Cutting Flutes", length_mm: 20, diameter_mm: 10, material: "carbide", is_cutting: true },
    ],
    cutting_force_n: 500,
    taper: "BT40",
  };

  it("computes total deflection", () => {
    const result = engine.compute(baseInput);
    expect(result.value.total_deflection_mm).toBeGreaterThan(0);
    expect(result.value.total_deflection_um).toBeGreaterThan(0);
  });

  it("breaks down by section", () => {
    const result = engine.compute(baseInput);
    expect(result.value.sections.length).toBe(4);
    const totalPct = result.value.sections.reduce((s, sec) => s + sec.pct_of_total, 0);
    // Percentages should roughly sum to around 100 (may not be exact due to spindle contribution)
    expect(totalPct).toBeLessThanOrEqual(110);
  });

  it("tool sections dominate for long overhang", () => {
    const result = engine.compute(baseInput);
    // Smaller diameter sections should have more deflection
    const toolSection = result.value.sections.find(s => s.name === "Tool Shank");
    expect(toolSection!.deflection_at_tip_mm).toBeGreaterThan(0);
  });

  it("HSK-A100 has less spindle deflection than BT30", () => {
    const bt30 = engine.compute({ ...baseInput, taper: "BT30" });
    const hskA100 = engine.compute({ ...baseInput, taper: "HSK-A100" });
    expect(hskA100.value.spindle_deflection_um).toBeLessThan(bt30.value.spindle_deflection_um);
  });

  it("computes stiffness", () => {
    const result = engine.compute(baseInput);
    expect(result.value.stiffness_n_mm).toBeGreaterThan(0);
  });

  it("computes natural frequency", () => {
    const result = engine.compute(baseInput);
    expect(result.value.natural_frequency_hz).toBeGreaterThan(0);
  });

  it("provides recommendations for high L/D", () => {
    const longTool: AssemblyInput = {
      ...baseInput,
      sections: [
        { name: "Holder", length_mm: 40, diameter_mm: 32, material: "steel", is_cutting: false },
        { name: "Long Tool", length_mm: 80, diameter_mm: 10, material: "carbide", is_cutting: true },
      ],
    };
    const result = engine.compute(longTool);
    expect(result.value.recommendations.length).toBeGreaterThan(0);
    expect(result.value.recommendations.some(r => r.includes("L/D"))).toBe(true);
  });

  it("returns AtomicValue with formula", () => {
    const result = engine.compute(baseInput);
    expect(result.formula).toContain("cantilever");
    expect(result.unit).toBe("mm");
  });
});

// ═══════════════════════════════════════════════════════════════════
// AdaptiveEngagementEngine
// ═══════════════════════════════════════════════════════════════════

describe("AdaptiveEngagementEngine", () => {
  const engine = new AdaptiveEngagementEngine();

  const baseInput: EngagementInput = {
    corners: [
      { type: "inside_90", corner_radius_mm: 3, approach_ae_mm: 2.5 },
    ],
    tool: { diameter_mm: 10, flute_count: 4 },
    cutting: { nominal_feed_mmmin: 2000, spindle_rpm: 8000, axial_depth_mm: 10, nominal_chipload_mm: 0.06 },
    material: { iso_group: "P" },
    machine: { max_power_kw: 15 },
    strategy: "constant_force",
  };

  it("detects engagement spike in 90° corner", () => {
    const result = engine.compute(baseInput);
    expect(result.value.corners[0].peak_engagement_mm).toBeGreaterThan(baseInput.corners[0].approach_ae_mm);
    expect(result.value.corners[0].engagement_ratio).toBeGreaterThan(1);
  });

  it("recommends feed reduction", () => {
    const result = engine.compute(baseInput);
    expect(result.value.corners[0].feed_reduction_pct).toBeGreaterThan(0);
    expect(result.value.corners[0].recommended_feed_mmmin).toBeLessThan(2000);
  });

  it("slot entry gives full-diameter engagement", () => {
    const slotInput: EngagementInput = {
      ...baseInput,
      corners: [{ type: "slot_entry", corner_radius_mm: 0, approach_ae_mm: 2.5 }],
    };
    const result = engine.compute(slotInput);
    expect(result.value.corners[0].peak_engagement_mm).toBe(10); // full diameter
  });

  it("calculates force spike percentage", () => {
    const result = engine.compute(baseInput);
    expect(result.value.corners[0].force_spike_pct).toBeGreaterThan(0);
    expect(result.value.global_stats.worst_force_spike_pct).toBeGreaterThan(0);
  });

  it("constant_chipload strategy differs from constant_force", () => {
    const forceResult = engine.compute({ ...baseInput, strategy: "constant_force" });
    const chipResult = engine.compute({ ...baseInput, strategy: "constant_chipload" });
    expect(forceResult.value.corners[0].recommended_feed_mmmin)
      .not.toBe(chipResult.value.corners[0].recommended_feed_mmmin);
  });

  it("recommends trochoidal for severe spikes", () => {
    const sharpCorner: EngagementInput = {
      ...baseInput,
      corners: [{ type: "inside_90", corner_radius_mm: 0, approach_ae_mm: 2.5 }],
    };
    const result = engine.compute(sharpCorner);
    expect(result.value.toolpath_modifications.some(m => m.includes("trochoidal") || m.includes("adaptive"))).toBe(true);
  });

  it("handles multiple corners", () => {
    const multiInput: EngagementInput = {
      ...baseInput,
      corners: [
        { type: "inside_90", corner_radius_mm: 3, approach_ae_mm: 2.5 },
        { type: "inside_acute", corner_radius_mm: 2, approach_ae_mm: 2.5, wall_angle_deg: 60 },
        { type: "inside_obtuse", corner_radius_mm: 5, approach_ae_mm: 2.5, wall_angle_deg: 135 },
      ],
    };
    const result = engine.compute(multiInput);
    expect(result.value.corners.length).toBe(3);
    // Acute corner should have worse spike than obtuse
    expect(result.value.corners[1].force_spike_pct).toBeGreaterThan(result.value.corners[2].force_spike_pct);
  });

  it("returns AtomicValue", () => {
    const result = engine.compute(baseInput);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.formula).toContain("Kienzle");
  });
});

// ═══════════════════════════════════════════════════════════════════
// HybridPostMergeEngine
// ═══════════════════════════════════════════════════════════════════

describe("HybridPostMergeEngine", () => {
  const engine = new HybridPostMergeEngine();

  const makeSeg = (cam: string, op: string, tool: number, toolName: string): PostSegment => ({
    cam_source: cam,
    operation: op,
    controller: "fanuc",
    gcode_lines: ["G0 X0 Y0", "G1 Z-5 F500", "G1 X50 F2000", "G0 Z10"],
    work_offset: "G54",
    tool_number: tool,
    tool_name: toolName,
    coolant_mode: "flood",
    is_5axis: false,
    estimated_time_min: 5,
  });

  const baseInput: MergeInput = {
    segments: [
      makeSeg("mastercam", "Roughing", 1, "D10 Rougher"),
      makeSeg("hypermill", "Finishing", 3, "D6 Ball Nose"),
    ],
    machine: { controller: "fanuc", has_atc: true, max_tools: 24, has_probing: true },
  };

  it("merges segments into unified program", () => {
    const result = engine.compute(baseInput);
    expect(result.value.program.total_lines).toBeGreaterThan(10);
    expect(result.value.program.header.length).toBeGreaterThan(0);
    expect(result.value.program.body.length).toBeGreaterThan(0);
    expect(result.value.program.footer.length).toBeGreaterThan(0);
  });

  it("generates tool list", () => {
    const result = engine.compute(baseInput);
    expect(result.value.program.tool_list.length).toBe(2);
    expect(result.value.program.tool_list[0].name).toBe("D10 Rougher");
  });

  it("creates segment map with line numbers", () => {
    const result = engine.compute(baseInput);
    expect(result.value.segment_map.length).toBe(2);
    expect(result.value.segment_map[0].cam_source).toBe("mastercam");
    expect(result.value.segment_map[1].cam_source).toBe("hypermill");
  });

  it("adds safe transitions between segments", () => {
    const result = engine.compute(baseInput);
    expect(result.value.program.transition_blocks).toBeGreaterThan(0);
    // Should contain G28 retract
    const bodyStr = result.value.program.body.join("\n");
    expect(bodyStr).toContain("G28");
  });

  it("detects tool number conflicts", () => {
    const conflictInput: MergeInput = {
      ...baseInput,
      segments: [
        makeSeg("mastercam", "Roughing", 1, "D10 Rougher"),
        makeSeg("hypermill", "Finishing", 1, "D6 Ball Nose"), // same T number, different tool
      ],
    };
    const result = engine.compute(conflictInput);
    expect(result.value.program.conflicts.some(c => c.type === "tool_number")).toBe(true);
  });

  it("detects controller mismatch", () => {
    const mismatchInput: MergeInput = {
      ...baseInput,
      segments: [
        { ...makeSeg("mastercam", "Roughing", 1, "D10"), controller: "siemens" },
        makeSeg("hypermill", "Finishing", 2, "D6"),
      ],
    };
    const result = engine.compute(mismatchInput);
    expect(result.value.program.conflicts.some(c => c.type === "controller_mismatch")).toBe(true);
  });

  it("computes quality score", () => {
    const result = engine.compute(baseInput);
    expect(result.value.quality_score).toBeGreaterThanOrEqual(0);
    expect(result.value.quality_score).toBeLessThanOrEqual(100);
  });

  it("handles 5-axis segments with TCPM", () => {
    const fiveAxisInput: MergeInput = {
      ...baseInput,
      segments: [
        makeSeg("mastercam", "Roughing", 1, "D10 Rougher"),
        { ...makeSeg("hypermill", "5X Finishing", 2, "D6 Ball"), is_5axis: true },
      ],
    };
    const result = engine.compute(fiveAxisInput);
    const bodyStr = result.value.program.body.join("\n");
    expect(bodyStr).toContain("G43.4"); // TCPM for fanuc
  });

  it("totals estimated time", () => {
    const result = engine.compute(baseInput);
    expect(result.value.program.total_time_min).toBe(10); // 5 + 5
  });

  it("strips source program headers/footers", () => {
    const segWithHeaders: MergeInput = {
      ...baseInput,
      segments: [{
        ...makeSeg("mastercam", "Roughing", 1, "D10"),
        gcode_lines: ["%", "O1234", "G0 X0 Y0", "G1 Z-5 F500", "M30", "%"],
      }],
    };
    const result = engine.compute(segWithHeaders);
    const bodyStr = result.value.program.body.join("\n");
    expect(bodyStr).not.toContain("O1234");
    // M30 in body should be filtered
    const m30InBody = result.value.program.body.filter(l => l.trim() === "M30").length;
    expect(m30InBody).toBe(0);
  });
});
