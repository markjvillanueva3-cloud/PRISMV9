/**
 * LatheAIReasoningEngine — public-surface behavioral tests
 *
 * Wires the engine into the test ledger and exercises every public method
 * (reason, selectG76Dialect, optimizeSequence, optimizeParameters) with
 * real-value assertions on shape, content, and physics-aware outputs.
 */

import { describe, it, expect } from "vitest";
import {
  LatheAIReasoningEngine,
  latheAIReasoningEngine,
  type LatheOperationContext,
} from "../engines/LatheAIReasoningEngine.js";

describe("LatheAIReasoningEngine", () => {
  describe("singleton + identity", () => {
    it("exports a singleton instance", () => {
      expect(latheAIReasoningEngine).toBeInstanceOf(LatheAIReasoningEngine);
    });

    it("exposes name and version metadata", () => {
      expect(latheAIReasoningEngine.name).toBe("LatheAIReasoningEngine");
      expect(latheAIReasoningEngine.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe("reason()", () => {
    const ctx: LatheOperationContext = {
      operation_type: "od_rough",
      material_iso: "P",
      material_name: "1045",
      diameter_mm: 50,
      length_mm: 100,
      depth_mm: 2,
      controller: "fanuc",
      optimization_target: "balanced",
    };

    it("returns a fully-populated reasoning result", async () => {
      const result = await latheAIReasoningEngine.reason(ctx);
      expect(result.query.length).toBeGreaterThan(0);
      expect(result.reasoning_steps.length).toBeGreaterThanOrEqual(6);
      expect(result.conclusion.length).toBeGreaterThan(0);
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(Array.isArray(result.tribal_tips)).toBe(true);
      expect(Array.isArray(result.playbook_rules)).toBe(true);
    });

    it("emits a normalized confidence in [0,1]", async () => {
      const result = await latheAIReasoningEngine.reason(ctx);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("reports non-negative processing time", async () => {
      const result = await latheAIReasoningEngine.reason(ctx);
      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("produces a valid risk assessment with the four documented bands", async () => {
      const result = await latheAIReasoningEngine.reason(ctx);
      expect(["low", "medium", "high", "critical"]).toContain(
        result.risk_assessment.overall_risk,
      );
      expect(Array.isArray(result.risk_assessment.risk_factors)).toBe(true);
      expect(Array.isArray(result.risk_assessment.safety_risks)).toBe(true);
    });
  });

  describe("selectG76Dialect()", () => {
    it("maps a Fanuc controller to the fanuc_double dialect", () => {
      const result = latheAIReasoningEngine.selectG76Dialect({
        controller: "fanuc",
        thread_pitch_mm: 1.5,
        major_diameter_mm: 20,
        thread_length_mm: 25,
        material_iso: "P",
      });
      expect(result.recommended_dialect).toBe("fanuc_double");
      expect(result.dialect_confidence).toBeGreaterThan(0.5);
      expect(result.g76_code.length).toBeGreaterThan(0);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it("warns about coarse pitches that need modified flank infeed", () => {
      const result = latheAIReasoningEngine.selectG76Dialect({
        controller: "fanuc",
        thread_pitch_mm: 4,
        major_diameter_mm: 40,
        thread_length_mm: 30,
        material_iso: "P",
      });
      const warningText = result.warnings.join(" ").toLowerCase();
      expect(warningText).toMatch(/coarse|modified flank|chip control/);
    });

    it("returns alternative dialects distinct from the recommendation", () => {
      const result = latheAIReasoningEngine.selectG76Dialect({
        controller: "haas",
        thread_pitch_mm: 1.25,
        major_diameter_mm: 16,
        thread_length_mm: 20,
        material_iso: "M",
      });
      for (const alt of result.alternative_dialects) {
        expect(alt.dialect).not.toBe(result.recommended_dialect);
        expect(alt.confidence).toBeGreaterThanOrEqual(0);
        expect(alt.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("optimizeSequence()", () => {
    it("orders face before part_off and threading before part_off", () => {
      const result = latheAIReasoningEngine.optimizeSequence([
        { id: "po", type: "part_off", tool_type: "cutoff" },
        { id: "th", type: "thread", tool_type: "thread_insert" },
        { id: "fa", type: "face", tool_type: "od_turn" },
        { id: "rg", type: "od_rough", tool_type: "od_turn" },
      ]);
      const seq = result.recommended_sequence;
      expect(seq.indexOf("fa")).toBeLessThan(seq.indexOf("rg"));
      expect(seq.indexOf("rg")).toBeLessThan(seq.indexOf("th"));
      expect(seq.indexOf("th")).toBeLessThan(seq.indexOf("po"));
    });

    it("reports tool-change minimization with non-negative savings", () => {
      const result = latheAIReasoningEngine.optimizeSequence([
        { id: "a", type: "od_rough", tool_type: "od_turn" },
        { id: "b", type: "od_finish", tool_type: "od_turn" },
        { id: "c", type: "thread", tool_type: "thread_insert" },
      ]);
      const tcm = result.tool_change_minimization;
      expect(tcm.original_changes).toBeGreaterThanOrEqual(tcm.optimized_changes);
      expect(tcm.savings_percent).toBeGreaterThanOrEqual(0);
      expect(tcm.savings_percent).toBeLessThanOrEqual(100);
    });
  });

  describe("optimizeParameters()", () => {
    it("applies aluminium (N) multipliers to bump cutting speed above baseline", () => {
      const ctx: LatheOperationContext = {
        operation_type: "od_rough",
        material_iso: "N",
        diameter_mm: 40,
      };
      const result = latheAIReasoningEngine.optimizeParameters(ctx, {
        cutting_speed_m_min: 200,
        feed_mm_rev: 0.3,
        depth_of_cut_mm: 2,
      });
      expect(result.optimized_params.cutting_speed_m_min).toBeGreaterThan(200);
      expect(result.optimized_params.spindle_rpm).toBeGreaterThan(0);
    });

    it("derives a positive spindle RPM consistent with Vc/π·D", () => {
      const diameter = 50;
      const ctx: LatheOperationContext = {
        operation_type: "od_finish",
        material_iso: "P",
        diameter_mm: diameter,
      };
      const result = latheAIReasoningEngine.optimizeParameters(ctx, {
        cutting_speed_m_min: 250,
        feed_mm_rev: 0.15,
        depth_of_cut_mm: 0.5,
      });
      const expected = Math.round(
        (1000 * result.optimized_params.cutting_speed_m_min) /
          (Math.PI * diameter),
      );
      expect(result.optimized_params.spindle_rpm).toBe(expected);
    });

    it("emits surface-quality reasoning when target=surface_quality", () => {
      const ctx: LatheOperationContext = {
        operation_type: "od_finish",
        material_iso: "P",
        diameter_mm: 30,
        optimization_target: "surface_quality",
      };
      const result = latheAIReasoningEngine.optimizeParameters(ctx, {
        cutting_speed_m_min: 250,
        feed_mm_rev: 0.3,
        depth_of_cut_mm: 1,
      });
      // surface_quality cuts feed roughly in half
      expect(result.optimized_params.feed_mm_rev).toBeLessThan(0.3);
      const joined = result.reasoning.join(" ").toLowerCase();
      expect(joined).toMatch(/surface|finish|feed/);
    });
  });
});
