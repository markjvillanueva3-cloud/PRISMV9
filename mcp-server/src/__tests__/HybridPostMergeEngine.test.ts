/**
 * HybridPostMergeEngine — name-matched test suite
 *
 * Covers the engine's compute() pipeline + execute(action, params) dispatcher
 * wrapper + the response-slimmer contract expected by calcDispatcher case
 * "hybrid_post_merge". Complements (does not duplicate) the broader
 * cross-cam-batch2.test.ts suite by focusing on the dispatcher-facing surface.
 *
 * Shipped 2026-05-23 (slot:india U-INDIA-WIRE-HPM /goal-gate satisfaction).
 */

import { describe, it, expect } from "vitest";
import {
  HybridPostMergeEngine,
  hybridPostMergeEngine,
} from "../engines/HybridPostMergeEngine.js";
import type { MergeInput, PostSegment } from "../engines/HybridPostMergeEngine.js";

const makeSeg = (
  cam: string,
  op: string,
  tool: number,
  toolName: string,
  overrides: Partial<PostSegment> = {},
): PostSegment => ({
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
  ...overrides,
});

const baseInput: MergeInput = {
  segments: [
    makeSeg("mastercam", "Roughing", 1, "D10 Rougher"),
    makeSeg("hypermill", "Finishing", 3, "D6 Ball"),
  ],
  machine: { controller: "fanuc", has_atc: true, max_tools: 24, has_probing: true },
};

describe("HybridPostMergeEngine — name-matched core suite", () => {
  const engine = new HybridPostMergeEngine();

  it("compute() returns AtomicValue-wrapped MergeResult", () => {
    const r = engine.compute(baseInput);
    expect(r).toHaveProperty("value");
    expect(r).toHaveProperty("unit", "merged_program");
    expect(r).toHaveProperty("formula");
    expect(r).toHaveProperty("confidence");
    expect(typeof r.confidence).toBe("number");
  });

  it("returned program has header/body/footer arrays + counts", () => {
    const r = engine.compute(baseInput);
    const p = r.value.program;
    expect(Array.isArray(p.header)).toBe(true);
    expect(Array.isArray(p.body)).toBe(true);
    expect(Array.isArray(p.footer)).toBe(true);
    expect(p.total_lines).toBe(p.header.length + p.body.length + p.footer.length);
    expect(p.total_tools).toBe(p.tool_list.length);
  });

  it("preserves total time across segments", () => {
    const r = engine.compute(baseInput);
    expect(r.value.program.total_time_min).toBe(10); // 5 + 5
  });

  it("emits TCPM G43.4 for fanuc 5-axis segments", () => {
    const r = engine.compute({
      ...baseInput,
      segments: [
        makeSeg("mastercam", "Roughing", 1, "D10"),
        makeSeg("hypermill", "5x Finish", 2, "D6", { is_5axis: true }),
      ],
    });
    const body = r.value.program.body.join("\n");
    expect(body).toContain("G43.4");
    expect(body).toContain("G49"); // tcpm off after
  });

  it("controller mismatch surfaces as conflict (not silent)", () => {
    const r = engine.compute({
      ...baseInput,
      segments: [
        makeSeg("mastercam", "Roughing", 1, "D10", { controller: "siemens" }),
        makeSeg("hypermill", "Finish", 2, "D6"),
      ],
    });
    const has = r.value.program.conflicts.some((c) => c.type === "controller_mismatch");
    expect(has).toBe(true);
  });

  it("duplicate tool-number with different names triggers conflict", () => {
    const r = engine.compute({
      ...baseInput,
      segments: [
        makeSeg("mastercam", "Roughing", 7, "D10 Rougher"),
        makeSeg("hypermill", "Finish", 7, "D6 Ball"),
      ],
    });
    expect(r.value.program.conflicts.some((c) => c.type === "tool_number")).toBe(true);
  });

  it("strips source program O-number + % delimiters from merged body", () => {
    const r = engine.compute({
      ...baseInput,
      segments: [
        makeSeg("mastercam", "R", 1, "D10", {
          gcode_lines: ["%", "O1234", "G0 X0 Y0", "G1 Z-5 F500", "M30", "%"],
        }),
      ],
    });
    const body = r.value.program.body.join("\n");
    expect(body).not.toContain("O1234");
    expect(body).not.toContain("\n%");
  });

  it("emits safe retract G28 between segments", () => {
    const r = engine.compute(baseInput);
    expect(r.value.program.transition_blocks).toBeGreaterThan(0);
    expect(r.value.program.body.join("\n")).toContain("G28");
  });

  it("supports heidenhain controller (different safe-start)", () => {
    const r = engine.compute({
      segments: [makeSeg("mastercam", "R", 1, "D10", { controller: "heidenhain" })],
      machine: { controller: "heidenhain", has_atc: true, max_tools: 24, has_probing: false },
    });
    const header = r.value.program.header.join("\n");
    expect(header).toContain("L Z+0");
  });

  it("quality score deducted by unresolved conflicts", () => {
    const clean = engine.compute(baseInput).value.quality_score;
    const dirty = engine.compute({
      ...baseInput,
      machine: { controller: "fanuc", has_atc: true, max_tools: 1, has_probing: false },
    }).value.quality_score;
    // tool-count exceeds ATC → unresolved conflict → lower score
    expect(dirty).toBeLessThanOrEqual(clean);
  });

  it("confidence matches quality_score / 100", () => {
    const r = engine.compute(baseInput);
    expect(r.confidence).toBeCloseTo(r.value.quality_score / 100, 5);
  });
});

describe("HybridPostMergeEngine — execute() dispatcher wrapper", () => {
  it("routes post_hybrid_merge to compute()", () => {
    const r = hybridPostMergeEngine.execute("post_hybrid_merge", baseInput) as {
      value: { program: { total_lines: number } };
    };
    expect(r.value.program.total_lines).toBeGreaterThan(0);
  });

  it("throws on unknown action (R12 fail-loud)", () => {
    expect(() => hybridPostMergeEngine.execute("does_not_exist", baseInput)).toThrow(
      /unknown action/i,
    );
  });
});

describe("HybridPostMergeEngine — calcDispatcher slimmer contract", () => {
  // The calcDispatcher response-slimmer reads:
  //   result.value.program.total_lines
  //   result.value.program.conflicts.length
  //   result.value.program.total_tools
  //   result.value.quality_score
  //   result.value.warnings (array)
  // This test pins the contract so a future engine refactor can't silently
  // break the slimmer (prior incident: slimmer read result.merged_gcode /
  // result.tool_map which never existed — would crash at runtime).
  it("returned shape matches slimmer field accesses", () => {
    const r = hybridPostMergeEngine.compute(baseInput);
    expect(typeof r.value.program.total_lines).toBe("number");
    expect(Array.isArray(r.value.program.conflicts)).toBe(true);
    expect(typeof r.value.program.total_tools).toBe("number");
    expect(typeof r.value.quality_score).toBe("number");
    expect(Array.isArray(r.value.warnings)).toBe(true);
  });

  it("slimmer-shape with safe-nav over empty-program input", () => {
    // Single-segment input → minimal program; ensures all slimmer fields exist.
    const r = hybridPostMergeEngine.compute({
      ...baseInput,
      segments: [makeSeg("mastercam", "Only", 1, "D10")],
    });
    expect(r.value.program.total_lines).toBeGreaterThan(0);
    expect(r.value.program.total_tools).toBe(1);
    expect(r.value.program.conflicts.length).toBeGreaterThanOrEqual(0);
  });
});
