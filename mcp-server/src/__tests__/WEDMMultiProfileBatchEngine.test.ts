/**
 * WEDMMultiProfileBatchEngine Tests
 * U-PROD-14: Batch processing for WEDM profiles
 */

import { describe, it, expect } from "vitest";
import {
  wedmMultiProfileBatchEngine,
  WEDMMultiProfileBatchEngine,
  type BatchProfile,
} from "../engines/WEDMMultiProfileBatchEngine.js";

describe("WEDMMultiProfileBatchEngine", () => {
  describe("groupProfiles", () => {
    it("groups by material and thickness", () => {
      const profiles: BatchProfile[] = [
        { id: "1", material: "D2", thickness_mm: 25, perimeter_mm: 100, cut_type: "rough" },
        { id: "2", material: "D2", thickness_mm: 25, perimeter_mm: 150, cut_type: "rough" },
        { id: "3", material: "A2", thickness_mm: 25, perimeter_mm: 120, cut_type: "rough" },
      ];

      const groups = wedmMultiProfileBatchEngine.groupProfiles(profiles, "material_thickness");

      expect(groups.length).toBe(2); // D2_25 and A2_25
      expect(groups.find(g => g.shared_material === "D2")?.profiles.length).toBe(2);
    });

    it("groups by cut type", () => {
      const profiles: BatchProfile[] = [
        { id: "1", material: "D2", thickness_mm: 25, perimeter_mm: 100, cut_type: "rough" },
        { id: "2", material: "D2", thickness_mm: 30, perimeter_mm: 150, cut_type: "skim" },
        { id: "3", material: "A2", thickness_mm: 25, perimeter_mm: 120, cut_type: "rough" },
      ];

      const groups = wedmMultiProfileBatchEngine.groupProfiles(profiles, "cut_type");

      expect(groups.length).toBe(2); // rough and skim
    });

    it("groups by priority", () => {
      const profiles: BatchProfile[] = [
        { id: "1", material: "D2", thickness_mm: 25, perimeter_mm: 100, cut_type: "rough", priority: "high" },
        { id: "2", material: "D2", thickness_mm: 25, perimeter_mm: 150, cut_type: "rough", priority: "normal" },
        { id: "3", material: "D2", thickness_mm: 25, perimeter_mm: 120, cut_type: "rough", priority: "high" },
      ];

      const groups = wedmMultiProfileBatchEngine.groupProfiles(profiles, "priority");

      expect(groups.length).toBe(2);
      expect(groups.find(g => g.profiles[0].priority === "high")?.profiles.length).toBe(2);
    });

    it("creates individual groups when strategy is none", () => {
      const profiles: BatchProfile[] = [
        { id: "1", material: "D2", thickness_mm: 25, perimeter_mm: 100, cut_type: "rough" },
        { id: "2", material: "D2", thickness_mm: 25, perimeter_mm: 150, cut_type: "rough" },
      ];

      const groups = wedmMultiProfileBatchEngine.groupProfiles(profiles, "none");

      expect(groups.length).toBe(2);
    });
  });

  describe("sortGroups", () => {
    it("sorts high priority groups first", () => {
      const profiles: BatchProfile[] = [
        { id: "1", material: "D2", thickness_mm: 25, perimeter_mm: 100, cut_type: "rough", priority: "low" },
        { id: "2", material: "D2", thickness_mm: 25, perimeter_mm: 150, cut_type: "rough", priority: "high" },
      ];

      const groups = wedmMultiProfileBatchEngine.groupProfiles(profiles, "none");
      const sorted = wedmMultiProfileBatchEngine.sortGroups(groups);

      expect(sorted[0].profiles[0].priority).toBe("high");
    });

    it("sorts rough before skim before finish", () => {
      const profiles: BatchProfile[] = [
        { id: "1", material: "D2", thickness_mm: 25, perimeter_mm: 100, cut_type: "finish" },
        { id: "2", material: "D2", thickness_mm: 25, perimeter_mm: 150, cut_type: "rough" },
        { id: "3", material: "D2", thickness_mm: 25, perimeter_mm: 120, cut_type: "skim" },
      ];

      const groups = wedmMultiProfileBatchEngine.groupProfiles(profiles, "cut_type");
      const sorted = wedmMultiProfileBatchEngine.sortGroups(groups);

      expect(sorted[0].shared_cut_type).toBe("rough");
      expect(sorted[1].shared_cut_type).toBe("skim");
      expect(sorted[2].shared_cut_type).toBe("finish");
    });
  });

  describe("processBatch", () => {
    it("processes batch and returns cutting sequence", () => {
      const result = wedmMultiProfileBatchEngine.processBatch({
        profiles: [
          { id: "1", material: "D2", thickness_mm: 25, perimeter_mm: 100, cut_type: "rough" },
          { id: "2", material: "D2", thickness_mm: 25, perimeter_mm: 150, cut_type: "rough" },
        ],
      });

      expect(result.cutting_sequence).toHaveLength(2);
      expect(result.total_profiles).toBe(2);
    });

    it("calculates total cut time", () => {
      const result = wedmMultiProfileBatchEngine.processBatch({
        profiles: [
          { id: "1", material: "D2", thickness_mm: 25, perimeter_mm: 100, cut_type: "rough" },
        ],
        cutting_speed_mm_min: 2.5,
      });

      // 100mm / 2.5 mm/min = 40 minutes
      expect(result.total_cut_time_min).toBeCloseTo(40, 0);
    });

    it("calculates wire requirements", () => {
      const result = wedmMultiProfileBatchEngine.processBatch({
        profiles: [
          { id: "1", material: "D2", thickness_mm: 25, perimeter_mm: 1000, cut_type: "rough" },
        ],
        wire_consumption_rate_m_per_mm: 0.001,
      });

      // 1000mm * 0.001 = 1m wire
      expect(result.wire_required_m).toBe(1);
    });

    it("calculates wire changes needed", () => {
      const result = wedmMultiProfileBatchEngine.processBatch({
        profiles: [
          { id: "1", material: "D2", thickness_mm: 25, perimeter_mm: 6000000, cut_type: "rough" },
        ],
        wire_spool_length_m: 5000,
        wire_consumption_rate_m_per_mm: 0.001,
      });

      // 6000000mm * 0.001 = 6000m wire, needs multiple spools
      expect(result.wire_changes_needed).toBeGreaterThan(0);
    });

    it("includes setup time between groups", () => {
      const result = wedmMultiProfileBatchEngine.processBatch({
        profiles: [
          { id: "1", material: "D2", thickness_mm: 25, perimeter_mm: 100, cut_type: "rough" },
          { id: "2", material: "A2", thickness_mm: 25, perimeter_mm: 100, cut_type: "rough" },
        ],
        grouping_strategy: "material_thickness",
      });

      // Two groups = setup time between them
      expect(result.total_groups).toBe(2);
      expect(result.total_cut_time_min).toBeGreaterThan(80); // 80min cut + setup
    });

    it("calculates batch efficiency", () => {
      const result = wedmMultiProfileBatchEngine.processBatch({
        profiles: [
          { id: "1", material: "D2", thickness_mm: 25, perimeter_mm: 100, cut_type: "rough" },
          { id: "2", material: "D2", thickness_mm: 25, perimeter_mm: 100, cut_type: "rough" },
          { id: "3", material: "D2", thickness_mm: 25, perimeter_mm: 100, cut_type: "rough" },
        ],
        grouping_strategy: "material_thickness",
      });

      // All same material/thickness = 1 group = high efficiency
      expect(result.batch_efficiency_percent).toBeGreaterThan(50);
    });

    it("handles skim passes with faster speed", () => {
      const roughResult = wedmMultiProfileBatchEngine.processBatch({
        profiles: [
          { id: "1", material: "D2", thickness_mm: 25, perimeter_mm: 100, cut_type: "rough" },
        ],
        cutting_speed_mm_min: 2.5,
      });

      const skimResult = wedmMultiProfileBatchEngine.processBatch({
        profiles: [
          { id: "1", material: "D2", thickness_mm: 25, perimeter_mm: 100, cut_type: "skim" },
        ],
        cutting_speed_mm_min: 2.5,
      });

      // Skim should be faster than rough
      expect(skimResult.total_cut_time_min).toBeLessThan(roughResult.total_cut_time_min);
    });

    it("handles multiple pass counts", () => {
      const result = wedmMultiProfileBatchEngine.processBatch({
        profiles: [
          { id: "1", material: "D2", thickness_mm: 25, perimeter_mm: 100, cut_type: "rough", pass_count: 3 },
        ],
        cutting_speed_mm_min: 2.5,
      });

      // 3 passes = 300mm total perimeter
      expect(result.total_perimeter_mm).toBe(300);
    });
  });

  describe("estimateCompletion", () => {
    it("returns formatted time string", () => {
      const est = wedmMultiProfileBatchEngine.estimateCompletion({
        profiles: [
          { id: "1", material: "D2", thickness_mm: 25, perimeter_mm: 150, cut_type: "rough" },
        ],
        cutting_speed_mm_min: 2.5,
      });

      // 150/2.5 = 60 minutes = 1h 0m
      expect(est.total_minutes).toBeCloseTo(60, 0);
      expect(est.formatted).toContain("h");
    });

    it("formats short durations without hours", () => {
      const est = wedmMultiProfileBatchEngine.estimateCompletion({
        profiles: [
          { id: "1", material: "D2", thickness_mm: 25, perimeter_mm: 50, cut_type: "rough" },
        ],
        cutting_speed_mm_min: 2.5,
      });

      // 50/2.5 = 20 minutes
      expect(est.formatted).toContain("m");
    });
  });

  describe("configuration", () => {
    it("can update configuration", () => {
      const engine = new WEDMMultiProfileBatchEngine();
      engine.configure({ default_cutting_speed_mm_min: 3.0 });

      expect(engine.getConfig().default_cutting_speed_mm_min).toBe(3.0);
    });
  });
});
