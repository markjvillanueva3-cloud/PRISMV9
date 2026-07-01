/**
 * GCodeIntelligencePipelineEngine -- companion contract tests (U-PP-MISSING-ENGINE-TESTS, slot:echo)
 *
 * A 7-stage orchestrator (playbook -> safety -> speed_feed -> thermal -> energy
 * -> cycle_time -> setup_sheet) that chains real PRISM engines via lazy imports,
 * each wrapped in per-stage try/catch (a sub-engine failure becomes a stage
 * status, never a pipeline throw).
 *
 * The orchestrator's OWN intent -- stage-flag resolution, precondition skips,
 * status aggregation, result shape -- is tested DETERMINISTICALLY by disabling
 * the sub-engine stages (R9: each assertion fails if the flag/skip/aggregation
 * logic changes). One real INTEGRATION smoke test then proves the full chain
 * orchestrates without throwing.
 */

import { describe, it, expect } from "vitest";
import { gcodeIntelligencePipeline } from "../engines/GCodeIntelligencePipelineEngine.js";

const ALL_OFF = {
  playbook: false, safety: false, speed_feed: false, thermal: false,
  energy: false, cycle_time: false, setup_sheet: false,
} as const;

const GCODE = "G21 G90\nM3 S1000\nG1 X10 F100\nG0 Z50\nM30";

describe("GCodeIntelligencePipelineEngine", () => {
  describe("orchestrator logic (deterministic, sub-engines disabled)", () => {
    it("happy path: all stages disabled -> 7 skipped stages, overall pass, gcode unchanged", async () => {
      const r = await gcodeIntelligencePipeline.run({ gcode: GCODE, material: "1018", stages: { ...ALL_OFF } });
      expect(r.stages).toHaveLength(7);
      expect(r.stages.every((s) => s.status === "skipped")).toBe(true);
      expect(r.overall_status).toBe("pass"); // no fail, no warn
      expect(r.optimized_gcode).toBe(GCODE); // speed_feed skipped -> gcode untouched
      expect(r.summary.safety_issues).toBe(0);
      expect(r.summary.thermal_risk).toBe("none");
      expect(r.summary.energy_kwh).toBe(0);
    });

    it("emits the 7 stages in canonical pipeline order", async () => {
      const r = await gcodeIntelligencePipeline.run({ gcode: GCODE, material: "1018", stages: { ...ALL_OFF } });
      expect(r.stages.map((s) => s.stage)).toEqual([
        "playbook", "safety", "speed_feed", "thermal", "energy", "cycle_time", "setup_sheet",
      ]);
    });

    it("returns the full 9-field summary object even when everything is skipped", async () => {
      const r = await gcodeIntelligencePipeline.run({ gcode: GCODE, material: "1018", stages: { ...ALL_OFF } });
      expect(Object.keys(r.summary).sort()).toEqual([
        "cycle_time_seconds", "energy_kwh", "estimated_time_savings_pct", "lines_speed_feed_optimized",
        "playbook_warnings", "safety_critical", "safety_issues", "thermal_risk", "tools_used",
      ]);
      expect(typeof r.total_duration_ms).toBe("number");
    });
  });

  describe("FAILURE MODES -- precondition gating", () => {
    it("speed_feed is skipped with 'No tools provided' when enabled but no tools are supplied", async () => {
      // speed_feed default-on, but precondition (tools.length > 0) fails
      const r = await gcodeIntelligencePipeline.run({
        gcode: GCODE, material: "1018",
        stages: { ...ALL_OFF, speed_feed: true },
      });
      const sf = r.stages.find((s) => s.stage === "speed_feed")!;
      expect(sf.status).toBe("skipped");
      expect(sf.summary).toBe("No tools provided");
    });

    it("speed_feed reports 'Skipped by config' when explicitly disabled despite tools present", async () => {
      const r = await gcodeIntelligencePipeline.run({
        gcode: GCODE, material: "1018",
        tools: [{ tool_number: 1, diameter_mm: 6, flutes: 2 }],
        stages: { ...ALL_OFF }, // speed_feed:false
      });
      const sf = r.stages.find((s) => s.stage === "speed_feed")!;
      expect(sf.status).toBe("skipped");
      expect(sf.summary).toBe("Skipped by config");
    });

    it("thermal is skipped when requested without workpiece_dimensions", async () => {
      const r = await gcodeIntelligencePipeline.run({
        gcode: GCODE, material: "1018",
        stages: { ...ALL_OFF, thermal: true }, // requested, but no workpiece_dimensions
      });
      const th = r.stages.find((s) => s.stage === "thermal")!;
      expect(th.status).toBe("skipped");
      expect(th.summary).toBe("Skipped (no workpiece dims)");
    });
  });

  describe("ADVERSARIAL", () => {
    it("handles an empty G-code program without throwing (all stages skipped)", async () => {
      const r = await gcodeIntelligencePipeline.run({ gcode: "", material: "1018", stages: { ...ALL_OFF } });
      expect(r.optimized_gcode).toBe("");
      expect(r.overall_status).toBe("pass");
      expect(r.stages.every((s) => s.status === "skipped")).toBe(true);
    });

    it("handles a whitespace/comment-only program without throwing", async () => {
      const r = await gcodeIntelligencePipeline.run({ gcode: "(HEADER)\n\n  \n", material: "1018", stages: { ...ALL_OFF } });
      expect(r.stages).toHaveLength(7);
      expect(r.overall_status).toBe("pass");
    });
  });

  describe("INTEGRATION -- full chain orchestrates real sub-engines without throwing", () => {
    it("runs the default 7-stage pipeline end-to-end and returns a structurally-valid result", async () => {
      const r = await gcodeIntelligencePipeline.run({
        gcode: GCODE,
        material: "1018",
        iso_group: "P",
        controller: "fanuc",
        machine_power_kw: 15,
        tools: [{ tool_number: 1, diameter_mm: 6, flutes: 2, type: "endmill" }],
      });
      expect(r.stages).toHaveLength(7);
      expect(["pass", "warn", "fail"]).toContain(r.overall_status);
      expect(typeof r.optimized_gcode).toBe("string");
      expect(typeof r.summary.cycle_time_seconds).toBe("number");
      expect(Array.isArray(r.warnings)).toBe(true);
      // every stage records a recognized status (none left undefined by the orchestrator)
      expect(r.stages.every((s) => ["pass", "warn", "fail", "skipped"].includes(s.status))).toBe(true);
    });
  });
});
