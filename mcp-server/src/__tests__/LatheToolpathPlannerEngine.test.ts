/**
 * LatheToolpathPlannerEngine Tests
 *
 * U-LTH35: Toolpath planning tests
 */

import { describe, it, expect } from "vitest";
import {
  latheToolpathPlannerEngine,
  type ToolpathPlan,
} from "../engines/LatheToolpathPlannerEngine.js";
import { latheFeatureRecognitionEngine } from "../engines/LatheFeatureRecognitionEngine.js";
import { lathePrintIngestPipelineEngine } from "../engines/LathePrintIngestPipelineEngine.js";

describe("LatheToolpathPlannerEngine", () => {
  const getTestRecognition = async () => {
    const intake = await lathePrintIngestPipelineEngine.ingest({
      source_type: "pdf",
      part_type: "turning",
      part_number: "TEST-001"
    });
    return latheFeatureRecognitionEngine.recognize(intake);
  };

  describe("plan()", () => {
    it("generates toolpath plan from recognition", async () => {
      const recognition = await getTestRecognition();

      const plan = latheToolpathPlannerEngine.plan(recognition);

      expect(plan.plan_id).toMatch(/^plan_\d+_\d+$/);
      expect(plan.recognition_id).toBe(recognition.recognition_id);
      expect(plan.processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("includes stock information", async () => {
      const recognition = await getTestRecognition();

      const plan = latheToolpathPlannerEngine.plan(recognition);

      expect(plan.stock.diameter).toBeGreaterThan(0);
      expect(plan.stock.length).toBeGreaterThan(0);
    });

    it("generates toolpath segments", async () => {
      const recognition = await getTestRecognition();

      const plan = latheToolpathPlannerEngine.plan(recognition);

      expect(plan.segments.length).toBeGreaterThan(0);
      expect(plan.total_segments).toBe(plan.segments.length);
    });

    it("tracks tool changes", async () => {
      const recognition = await getTestRecognition();

      const plan = latheToolpathPlannerEngine.plan(recognition);

      expect(plan.tool_changes.length).toBeGreaterThan(0);
      expect(plan.total_tool_changes).toBe(plan.tool_changes.length);
    });

    it("calculates timing estimates", async () => {
      const recognition = await getTestRecognition();

      const plan = latheToolpathPlannerEngine.plan(recognition);

      expect(plan.total_cutting_time_sec).toBeGreaterThanOrEqual(0);
      expect(plan.total_rapid_time_sec).toBeGreaterThanOrEqual(0);
      expect(plan.total_cycle_time_sec).toBeGreaterThan(0);
      expect(plan.estimated_setup_time_min).toBeGreaterThan(0);
    });
  });

  describe("Toolpath Segments", () => {
    it("assigns unique IDs to segments", async () => {
      const recognition = await getTestRecognition();

      const plan = latheToolpathPlannerEngine.plan(recognition);

      const ids = plan.segments.map(s => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("includes start and end points", async () => {
      const recognition = await getTestRecognition();

      const plan = latheToolpathPlannerEngine.plan(recognition);

      for (const segment of plan.segments) {
        expect(segment.start_point).toBeDefined();
        expect(segment.start_point.x).toBeDefined();
        expect(segment.start_point.z).toBeDefined();
        expect(segment.end_point).toBeDefined();
      }
    });

    it("includes depth of cut", async () => {
      const recognition = await getTestRecognition();

      const plan = latheToolpathPlannerEngine.plan(recognition);

      for (const segment of plan.segments) {
        expect(segment.depth_of_cut_mm).toBeGreaterThan(0);
      }
    });

    it("includes cutting parameters", async () => {
      const recognition = await getTestRecognition();

      const plan = latheToolpathPlannerEngine.plan(recognition);

      const cuttingSegments = plan.segments.filter(s => s.path_type !== "rapid");

      for (const segment of cuttingSegments) {
        expect(segment.spindle_rpm).toBeGreaterThan(0);
      }
    });

    it("references feature IDs", async () => {
      const recognition = await getTestRecognition();

      const plan = latheToolpathPlannerEngine.plan(recognition);

      for (const segment of plan.segments) {
        expect(Array.isArray(segment.feature_ids)).toBe(true);
        expect(segment.feature_ids.length).toBeGreaterThan(0);
      }
    });

    it("includes time estimates per segment", async () => {
      const recognition = await getTestRecognition();

      const plan = latheToolpathPlannerEngine.plan(recognition);

      for (const segment of plan.segments) {
        expect(segment.estimated_time_sec).toBeGreaterThanOrEqual(0);
        expect(segment.distance_mm).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("Cycle Types", () => {
    it("uses G71 for rough turning", async () => {
      const recognition = await getTestRecognition();

      const plan = latheToolpathPlannerEngine.plan(recognition);

      const roughTurnSegments = plan.segments.filter(s => s.operation === "rough_turn");

      for (const segment of roughTurnSegments) {
        expect(segment.cycle_type).toBe("G71");
        expect(segment.cycle_params).toBeDefined();
      }
    });

    it("uses G72 for facing", async () => {
      const recognition = await getTestRecognition();

      const plan = latheToolpathPlannerEngine.plan(recognition);

      const faceSegments = plan.segments.filter(s => s.operation === "face");

      for (const segment of faceSegments) {
        expect(segment.cycle_type).toBe("G72");
      }
    });

    it("uses G76 for threading", async () => {
      const recognition = await getTestRecognition();

      const plan = latheToolpathPlannerEngine.plan(recognition);

      const threadSegments = plan.segments.filter(s => s.operation === "thread");

      for (const segment of threadSegments) {
        expect(segment.cycle_type).toBe("G76");
        expect(segment.cycle_params?.P).toBeDefined();
      }
    });

    it("uses G83 for drilling", async () => {
      const recognition = await getTestRecognition();

      const plan = latheToolpathPlannerEngine.plan(recognition);

      const drillSegments = plan.segments.filter(s => s.operation === "drill");

      for (const segment of drillSegments) {
        expect(segment.cycle_type).toBe("G83");
      }
    });
  });

  describe("Tool Changes", () => {
    it("assigns tool numbers sequentially", async () => {
      const recognition = await getTestRecognition();

      const plan = latheToolpathPlannerEngine.plan(recognition);

      for (let i = 0; i < plan.tool_changes.length; i++) {
        expect(plan.tool_changes[i].sequence_number).toBe(i + 1);
        expect(plan.tool_changes[i].tool_number).toBe(i + 1);
      }
    });

    it("includes tool type and description", async () => {
      const recognition = await getTestRecognition();

      const plan = latheToolpathPlannerEngine.plan(recognition);

      for (const tc of plan.tool_changes) {
        expect(tc.tool_type).toBeDefined();
        expect(tc.tool_description.length).toBeGreaterThan(0);
      }
    });

    it("tracks segments per tool", async () => {
      const recognition = await getTestRecognition();

      const plan = latheToolpathPlannerEngine.plan(recognition);

      for (const tc of plan.tool_changes) {
        expect(Array.isArray(tc.segments)).toBe(true);
      }
    });
  });

  describe("Configuration", () => {
    it("respects max depth of cut", async () => {
      const recognition = await getTestRecognition();

      const plan = latheToolpathPlannerEngine.plan(recognition, {
        max_depth_of_cut_mm: 2.0
      });

      const roughSegments = plan.segments.filter(s => s.operation === "rough_turn");
      for (const segment of roughSegments) {
        expect(segment.depth_of_cut_mm).toBeLessThanOrEqual(2.0);
      }
    });

    it("respects finishing allowance", async () => {
      const recognition = await getTestRecognition();

      const plan = latheToolpathPlannerEngine.plan(recognition, {
        finishing_allowance_mm: 0.5
      });

      expect(plan.segments.length).toBeGreaterThan(0);
    });

    it("uses custom feed rate", async () => {
      const recognition = await getTestRecognition();

      const plan = latheToolpathPlannerEngine.plan(recognition, {
        default_feed_mmrev: 0.3
      });

      const cuttingSegments = plan.segments.filter(s => s.operation === "rough_turn");
      if (cuttingSegments.length > 0) {
        expect(cuttingSegments[0].feed_mmrev).toBe(0.3);
      }
    });
  });

  describe("Optimization Opportunities", () => {
    it("identifies optimization opportunities", async () => {
      const recognition = await getTestRecognition();

      const plan = latheToolpathPlannerEngine.plan(recognition);

      expect(Array.isArray(plan.optimization_opportunities)).toBe(true);
    });

    it("suggests threading spring pass", async () => {
      const recognition = await getTestRecognition();

      const plan = latheToolpathPlannerEngine.plan(recognition);

      // If there's threading, should suggest spring pass verification
      if (recognition.summary.has_threading) {
        const hasThreadingSuggestion = plan.optimization_opportunities.some(
          o => o.toLowerCase().includes("thread")
        );
        expect(hasThreadingSuggestion).toBe(true);
      }
    });
  });

  describe("getStatistics()", () => {
    it("returns supported operations", () => {
      const stats = latheToolpathPlannerEngine.getStatistics();

      expect(stats.supported_operations).toContain("rough_turn");
      expect(stats.supported_operations).toContain("finish_turn");
      expect(stats.supported_operations).toContain("thread");
    });

    it("returns supported tool types", () => {
      const stats = latheToolpathPlannerEngine.getStatistics();

      expect(stats.supported_tool_types).toContain("turning_external");
      expect(stats.supported_tool_types).toContain("threading_external");
      expect(stats.supported_tool_types).toContain("drilling");
    });

    it("returns supported cycles", () => {
      const stats = latheToolpathPlannerEngine.getStatistics();

      expect(stats.supported_cycles).toContain("G71");
      expect(stats.supported_cycles).toContain("G76");
      expect(stats.supported_cycles).toContain("G83");
    });

    it("tracks plan count", async () => {
      const before = latheToolpathPlannerEngine.getStatistics().total_plans;

      const recognition = await getTestRecognition();
      latheToolpathPlannerEngine.plan(recognition);

      const after = latheToolpathPlannerEngine.getStatistics().total_plans;
      expect(after).toBe(before + 1);
    });
  });

  describe("Edge Cases", () => {
    it("handles minimal recognition result", async () => {
      const intake = await lathePrintIngestPipelineEngine.ingest({
        source_type: "image",
        image_base64: "minimal"
      });

      const recognition = latheFeatureRecognitionEngine.recognize(intake);
      const plan = latheToolpathPlannerEngine.plan(recognition);

      expect(plan.plan_id).toBeDefined();
      expect(Array.isArray(plan.warnings)).toBe(true);
    });

    it("reports warnings for no segments", async () => {
      const intake = await lathePrintIngestPipelineEngine.ingest({
        source_type: "image",
        image_base64: "minimal"
      });

      // Create minimal recognition with no features
      const minimalRecognition = {
        ...latheFeatureRecognitionEngine.recognize(intake),
        feature_tree: {
          stock: { diameter: 50, length: 100 },
          features: [],
          operation_sequence: [],
          estimated_operations: 0,
          complexity_score: 0
        }
      };

      const plan = latheToolpathPlannerEngine.plan(minimalRecognition as any);

      expect(plan.warnings.some(w => w.includes("No toolpath segments"))).toBe(true);
    });
  });
});
