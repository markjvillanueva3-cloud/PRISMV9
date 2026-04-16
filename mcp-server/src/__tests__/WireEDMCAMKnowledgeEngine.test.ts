/**
 * WireEDMCAMKnowledgeEngine Tests
 *
 * Tests Mastercam Wire EDM CAM knowledge:
 * - Toolpath type recommendations
 * - Pass progressions
 * - Lead configurations
 * - Tab and stop settings
 * - 4-axis sync modes
 * - No-core cutting methods
 * - Knowledge search
 *
 * @module __tests__/WireEDMCAMKnowledgeEngine.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  wireEDMCAMKnowledgeEngine,
  WireEDMCAMKnowledgeEngine,
  type WireEDMToolpathType,
  type PassDefinition,
} from "../engines/WireEDMCAMKnowledgeEngine.js";

describe("WireEDMCAMKnowledgeEngine", () => {
  let engine: WireEDMCAMKnowledgeEngine;

  beforeEach(() => {
    engine = new WireEDMCAMKnowledgeEngine();
  });

  // ============================================================================
  // TOOLPATH RECOMMENDATION TESTS
  // ============================================================================

  describe("recommendToolpathType", () => {
    it("recommends 4-axis for different top/bottom geometry", () => {
      const result = engine.recommendToolpathType({
        has_different_top_bottom: true,
        num_contours: 1,
        requires_material_removal: false,
        has_taper_angle: false,
        is_closed_contour: true,
      });

      expect(result.toolpath_type).toBe("four_axis");
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.reason).toContain("different");
    });

    it("recommends 4-axis for tapered parts", () => {
      const result = engine.recommendToolpathType({
        has_different_top_bottom: false,
        num_contours: 1,
        requires_material_removal: false,
        has_taper_angle: true,
        is_closed_contour: true,
      });

      expect(result.toolpath_type).toBe("four_axis");
      expect(result.reason).toContain("taper");
    });

    it("recommends no_core for material removal in closed contours", () => {
      const result = engine.recommendToolpathType({
        has_different_top_bottom: false,
        num_contours: 1,
        requires_material_removal: true,
        has_taper_angle: false,
        is_closed_contour: true,
      });

      expect(result.toolpath_type).toBe("no_core");
      expect(result.reason).toContain("Material removal");
    });

    it("recommends multiple_contour for multiple parts", () => {
      const result = engine.recommendToolpathType({
        has_different_top_bottom: false,
        num_contours: 5,
        requires_material_removal: false,
        has_taper_angle: false,
        is_closed_contour: true,
      });

      expect(result.toolpath_type).toBe("multiple_contour");
      expect(result.reason).toContain("Multiple");
    });

    it("recommends single_contour for standard 2-axis parts", () => {
      const result = engine.recommendToolpathType({
        has_different_top_bottom: false,
        num_contours: 1,
        requires_material_removal: false,
        has_taper_angle: false,
        is_closed_contour: true,
      });

      expect(result.toolpath_type).toBe("single_contour");
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it("includes suggested config with chaining options", () => {
      const result = engine.recommendToolpathType({
        has_different_top_bottom: false,
        num_contours: 1,
        requires_material_removal: false,
        has_taper_angle: false,
        is_closed_contour: true,
      });

      expect(result.suggested_config).toBeDefined();
      expect(result.suggested_config.chaining).toBeDefined();
    });

    it("provides alternatives for each recommendation", () => {
      const result = engine.recommendToolpathType({
        has_different_top_bottom: false,
        num_contours: 1,
        requires_material_removal: false,
        has_taper_angle: false,
        is_closed_contour: true,
      });

      expect(result.alternatives.length).toBeGreaterThan(0);
      expect(result.alternatives[0].type).toBeDefined();
      expect(result.alternatives[0].when_to_use).toBeTruthy();
    });
  });

  // ============================================================================
  // PASS PROGRESSION TESTS
  // ============================================================================

  describe("getPassProgression", () => {
    it("returns 5-pass progression for Ra <= 0.4", () => {
      const passes = engine.getPassProgression({
        target_ra_um: 0.3,
        material: "D2",
        time_priority: "quality",
        include_tab_cut: false,
      });

      expect(passes.length).toBe(5);
      expect(passes[0].pass_type).toBe("rough");
      expect(passes[4].pass_type).toBe("skim");
    });

    it("returns 4-pass progression for Ra <= 0.8", () => {
      const passes = engine.getPassProgression({
        target_ra_um: 0.6,
        material: "D2",
        time_priority: "balanced",
        include_tab_cut: false,
      });

      expect(passes.length).toBe(4);
    });

    it("returns 2-pass progression for Ra > 0.8 with speed priority", () => {
      const passes = engine.getPassProgression({
        target_ra_um: 1.6,
        material: "D2",
        time_priority: "speed",
        include_tab_cut: false,
      });

      expect(passes.length).toBe(2);
    });

    it("returns rough-only for very fast cutting", () => {
      const passes = engine.getPassProgression({
        target_ra_um: 5.0,
        material: "D2",
        time_priority: "speed",
        include_tab_cut: false,
      });

      expect(passes.length).toBe(1);
      expect(passes[0].pass_type).toBe("rough");
    });

    it("adds tab cut pass when requested", () => {
      const passes = engine.getPassProgression({
        target_ra_um: 0.6,
        material: "D2",
        time_priority: "balanced",
        include_tab_cut: true,
      });

      const tabPass = passes.find(p => p.pass_type === "tab");
      expect(tabPass).toBeDefined();
      expect(tabPass!.wire_overburn_mm).toBe(0.0);
    });

    it("decreases overburn with each pass", () => {
      const passes = engine.getPassProgression({
        target_ra_um: 0.6,
        material: "D2",
        time_priority: "quality",
        include_tab_cut: false,
      });

      const skimPasses = passes.filter(p => p.pass_type === "skim");
      for (let i = 1; i < skimPasses.length; i++) {
        expect(skimPasses[i].wire_overburn_mm).toBeLessThanOrEqual(
          skimPasses[i - 1].wire_overburn_mm
        );
      }
    });

    it("final skim has zero overburn", () => {
      const passes = engine.getPassProgression({
        target_ra_um: 0.6,
        material: "D2",
        time_priority: "quality",
        include_tab_cut: false,
      });

      const skimPasses = passes.filter(p => p.pass_type === "skim");
      const finalSkim = skimPasses[skimPasses.length - 1];
      expect(finalSkim.wire_overburn_mm).toBe(0.0);
    });
  });

  // ============================================================================
  // STOCK REMOVAL CALCULATION TESTS
  // ============================================================================

  describe("calculateStockRemoval", () => {
    it("calculates total stock per side", () => {
      const passes: PassDefinition[] = [
        { pass_number: 1, pass_type: "rough", wire_diameter_mm: 0.2, wire_overburn_mm: 0.035, description: "Rough" },
        { pass_number: 2, pass_type: "skim", wire_diameter_mm: 0.2, wire_overburn_mm: 0.0, description: "Finish" },
      ];

      const result = engine.calculateStockRemoval(passes);

      expect(result.total_stock_per_side_mm).toBeCloseTo(0.135, 3);  // 0.1 radius + 0.035 overburn
    });

    it("provides breakdown per pass", () => {
      const passes: PassDefinition[] = [
        { pass_number: 1, pass_type: "rough", wire_diameter_mm: 0.2, wire_overburn_mm: 0.035, description: "Rough" },
        { pass_number: 2, pass_type: "skim", wire_diameter_mm: 0.2, wire_overburn_mm: 0.02, description: "Skim 1" },
        { pass_number: 3, pass_type: "skim", wire_diameter_mm: 0.2, wire_overburn_mm: 0.0, description: "Final" },
      ];

      const result = engine.calculateStockRemoval(passes);

      expect(result.passes_breakdown.length).toBe(3);
      expect(result.passes_breakdown[0].stock_left_mm).toBeCloseTo(0.135, 3);
      expect(result.passes_breakdown[1].stock_left_mm).toBeCloseTo(0.12, 3);
      expect(result.passes_breakdown[2].stock_left_mm).toBeCloseTo(0.1, 3);
    });

    it("excludes tab passes from calculation", () => {
      const passes: PassDefinition[] = [
        { pass_number: 1, pass_type: "rough", wire_diameter_mm: 0.2, wire_overburn_mm: 0.035, description: "Rough" },
        { pass_number: 2, pass_type: "tab", wire_diameter_mm: 0.2, wire_overburn_mm: 0.0, description: "Tab" },
      ];

      const result = engine.calculateStockRemoval(passes);

      expect(result.passes_breakdown.length).toBe(1);  // Only rough, not tab
    });
  });

  // ============================================================================
  // LEAD CONFIGURATION TESTS
  // ============================================================================

  describe("getLeadConfig", () => {
    it("returns standard leads for standard precision", () => {
      const leads = engine.getLeadConfig({
        precision_level: "standard",
        eliminate_witness_marks: false,
        optimize_cycle_time: false,
      });

      expect(leads.entry.lead_type).toBe("line_and_arc");
      expect(leads.exit.lead_type).toBe("arc_and_line");
      expect(leads.entry.arc_radius_mm).toBeCloseTo(0.125, 3);
    });

    it("returns precision leads for high precision", () => {
      const leads = engine.getLeadConfig({
        precision_level: "precision",
        eliminate_witness_marks: true,
        optimize_cycle_time: false,
      });

      expect(leads.entry.arc_radius_mm).toBeCloseTo(0.5, 3);
      expect(leads.entry.arc_sweep_deg).toBe(90);
      expect(leads.exit.overlap_mm).toBe(0.02);
    });

    it("sets overlap for witness mark elimination", () => {
      const leads = engine.getLeadConfig({
        precision_level: "standard",
        eliminate_witness_marks: true,
        optimize_cycle_time: false,
      });

      expect(leads.exit.overlap_mm).toBe(0.02);
    });

    it("sets max lead out for cycle time optimization", () => {
      const leads = engine.getLeadConfig({
        precision_level: "standard",
        eliminate_witness_marks: false,
        optimize_cycle_time: true,
      });

      expect(leads.exit.max_lead_out_mm).toBe(0.3);
      expect(leads.exit.trim_final_lead_out).toBe(true);
    });
  });

  // ============================================================================
  // TAB CONFIGURATION TESTS
  // ============================================================================

  describe("getTabConfig", () => {
    it("returns narrow tab for light parts", () => {
      const config = engine.getTabConfig({
        part_weight_kg: 0.5,
        contour_count: 1,
        material: "D2",
        precision_required: false,
      });

      expect(config.width_mm).toBe(1.0);
      expect(config.enabled).toBe(true);
    });

    it("returns wider tab for heavy parts", () => {
      const config = engine.getTabConfig({
        part_weight_kg: 3.0,
        contour_count: 1,
        material: "D2",
        precision_required: false,
      });

      expect(config.width_mm).toBe(2.0);
    });

    it("returns widest tab for very heavy parts", () => {
      const config = engine.getTabConfig({
        part_weight_kg: 10.0,
        contour_count: 1,
        material: "D2",
        precision_required: false,
      });

      expect(config.width_mm).toBe(3.0);
    });

    it("enables skim after tab for precision", () => {
      const config = engine.getTabConfig({
        part_weight_kg: 1.0,
        contour_count: 1,
        material: "D2",
        precision_required: true,
      });

      expect(config.skim_cuts_after_tab).toBe(true);
      expect(config.make_tab_cutoff_with_skim).toBe(false);
    });

    it("enables tab cutoff with skim for non-precision", () => {
      const config = engine.getTabConfig({
        part_weight_kg: 1.0,
        contour_count: 1,
        material: "D2",
        precision_required: false,
      });

      expect(config.make_tab_cutoff_with_skim).toBe(true);
    });
  });

  // ============================================================================
  // GLUE STOP CONFIGURATION TESTS
  // ============================================================================

  describe("getGlueStopConfig", () => {
    it("disables glue stop when not needed", () => {
      const config = engine.getGlueStopConfig({
        prevent_dropout: false,
        contour_count: 1,
        heavy_parts: false,
      });

      expect(config.enabled).toBe(false);
    });

    it("enables glue stop for dropout prevention", () => {
      const config = engine.getGlueStopConfig({
        prevent_dropout: true,
        contour_count: 1,
        heavy_parts: false,
      });

      expect(config.enabled).toBe(true);
      expect(config.output_as_glue_stop).toBe(true);
      expect(config.before_tab).toBe(true);
    });

    it("enables for each tab with multiple contours", () => {
      const config = engine.getGlueStopConfig({
        prevent_dropout: true,
        contour_count: 3,
        heavy_parts: false,
      });

      expect(config.for_each_tab).toBe(true);
      expect(config.for_first_tab_only).toBe(false);
    });

    it("enables for each tab with heavy parts", () => {
      const config = engine.getGlueStopConfig({
        prevent_dropout: true,
        contour_count: 1,
        heavy_parts: true,
      });

      expect(config.for_each_tab).toBe(true);
    });

    it("enables first tab only for single light contour", () => {
      const config = engine.getGlueStopConfig({
        prevent_dropout: true,
        contour_count: 1,
        heavy_parts: false,
      });

      expect(config.for_first_tab_only).toBe(true);
      expect(config.for_each_tab).toBe(false);
    });
  });

  // ============================================================================
  // 4-AXIS SYNC MODE TESTS
  // ============================================================================

  describe("recommendSyncMode", () => {
    it("recommends by_entity when entity counts match", () => {
      const result = engine.recommendSyncMode({
        xy_entity_count: 12,
        uv_entity_count: 12,
        has_branch_points: false,
        has_connecting_3d_geometry: false,
        has_sync_points: false,
        are_splines: false,
      });

      expect(result.recommended_mode).toBe("by_entity");
      expect(result.reason).toContain("12 entities");
    });

    it("recommends by_branch with branch points and 3D geometry", () => {
      const result = engine.recommendSyncMode({
        xy_entity_count: 10,
        uv_entity_count: 8,
        has_branch_points: true,
        has_connecting_3d_geometry: true,
        has_sync_points: false,
        are_splines: false,
      });

      expect(result.recommended_mode).toBe("by_branch");
    });

    it("recommends by_point when sync points exist", () => {
      const result = engine.recommendSyncMode({
        xy_entity_count: 10,
        uv_entity_count: 8,
        has_branch_points: false,
        has_connecting_3d_geometry: false,
        has_sync_points: true,
        are_splines: false,
      });

      expect(result.recommended_mode).toBe("by_point");
    });

    it("recommends by_node for splines with different entity counts", () => {
      const result = engine.recommendSyncMode({
        xy_entity_count: 3,
        uv_entity_count: 4,
        has_branch_points: false,
        has_connecting_3d_geometry: false,
        has_sync_points: false,
        are_splines: true,
      });

      expect(result.recommended_mode).toBe("by_node");
    });

    it("recommends manual for complex geometry", () => {
      const result = engine.recommendSyncMode({
        xy_entity_count: 10,
        uv_entity_count: 8,
        has_branch_points: false,
        has_connecting_3d_geometry: false,
        has_sync_points: false,
        are_splines: false,
      });

      expect(result.recommended_mode).toBe("manual");
    });

    it("provides alternatives for each recommendation", () => {
      const result = engine.recommendSyncMode({
        xy_entity_count: 12,
        uv_entity_count: 12,
        has_branch_points: false,
        has_connecting_3d_geometry: false,
        has_sync_points: false,
        are_splines: false,
      });

      expect(result.alternatives.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // NO CORE METHOD TESTS
  // ============================================================================

  describe("recommendNoCoreMethod", () => {
    it("recommends parallel_spiral for slots", () => {
      const result = engine.recommendNoCoreMethod({
        pocket_shape: "slot",
        aspect_ratio: 5.0,
        has_small_radii: false,
      });

      expect(result.method).toBe("parallel_spiral");
      expect(result.enable_finish).toBe(true);
    });

    it("recommends parallel_spiral for high aspect ratio", () => {
      const result = engine.recommendNoCoreMethod({
        pocket_shape: "square",
        aspect_ratio: 4.0,
        has_small_radii: false,
      });

      expect(result.method).toBe("parallel_spiral");
    });

    it("recommends spiral_out for round pockets", () => {
      const result = engine.recommendNoCoreMethod({
        pocket_shape: "round",
        aspect_ratio: 1.0,
        has_small_radii: false,
      });

      expect(result.method).toBe("spiral_out");
    });

    it("recommends zigzag for square pockets", () => {
      const result = engine.recommendNoCoreMethod({
        pocket_shape: "square",
        aspect_ratio: 1.2,
        has_small_radii: false,
      });

      expect(result.method).toBe("zigzag");
    });

    it("recommends adaptive for irregular pockets", () => {
      const result = engine.recommendNoCoreMethod({
        pocket_shape: "irregular",
        aspect_ratio: 1.5,
        has_small_radii: false,
      });

      expect(result.method).toBe("adaptive");
    });

    it("adds extra finish passes for small radii", () => {
      const result = engine.recommendNoCoreMethod({
        pocket_shape: "slot",
        aspect_ratio: 3.0,
        has_small_radii: true,
      });

      expect(result.finish_passes).toBe(2);
    });
  });

  // ============================================================================
  // KNOWLEDGE SEARCH TESTS
  // ============================================================================

  describe("searchKnowledge", () => {
    it("finds knowledge by keyword", () => {
      const results = engine.searchKnowledge("tab");

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.topic.toLowerCase().includes("tab"))).toBe(true);
    });

    it("filters by category", () => {
      const results = engine.searchKnowledge("cut", "toolpath");

      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.category).toBe("toolpath");
      });
    });

    it("ranks by relevance", () => {
      const results = engine.searchKnowledge("4-axis sync");

      // First result should be most relevant
      expect(results[0].topic.toLowerCase()).toMatch(/sync|4.axis/);
    });

    it("handles multiple search terms", () => {
      const results = engine.searchKnowledge("lead arc entry");

      expect(results.length).toBeGreaterThan(0);
    });

    it("returns empty for non-matching query", () => {
      const results = engine.searchKnowledge("xyznonexistent123");

      expect(results.length).toBe(0);
    });
  });

  describe("getKnowledgeByCategory", () => {
    it("returns all toolpath knowledge", () => {
      const results = engine.getKnowledgeByCategory("toolpath");

      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.category).toBe("toolpath");
      });
    });

    it("returns all parameter knowledge", () => {
      const results = engine.getKnowledgeByCategory("parameter");

      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.category).toBe("parameter");
      });
    });

    it("returns all optimization knowledge", () => {
      const results = engine.getKnowledgeByCategory("optimization");

      expect(results.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // COMPLETE WIREPATH CONFIG TESTS
  // ============================================================================

  describe("generateWirepathConfig", () => {
    it("generates complete config for single contour", () => {
      const config = engine.generateWirepathConfig({
        toolpath_type: "single_contour",
        target_ra_um: 0.8,
        material: "D2",
        thickness_mm: 25,
        part_weight_kg: 1.0,
        contour_count: 1,
        optimize_time: false,
        precision_required: false,
      });

      expect(config.toolpath_type).toBe("single_contour");
      expect(config.passes.length).toBeGreaterThan(0);
      expect(config.leads.entry).toBeDefined();
      expect(config.leads.exit).toBeDefined();
      expect(config.tabs.enabled).toBe(true);
      expect(config.heights.rapid_height_mm).toBe(30);  // thickness + 5
    });

    it("generates config with correct heights", () => {
      const config = engine.generateWirepathConfig({
        toolpath_type: "single_contour",
        target_ra_um: 0.8,
        material: "D2",
        thickness_mm: 50,
        part_weight_kg: 1.0,
        contour_count: 1,
        optimize_time: false,
        precision_required: false,
      });

      expect(config.heights.rapid_height_mm).toBe(55);
      expect(config.heights.uv_trim_plane_mm).toBe(55);
      expect(config.heights.xy_height_mm).toBe(0);
    });

    it("disables break entity for no_core", () => {
      const config = engine.generateWirepathConfig({
        toolpath_type: "no_core",
        target_ra_um: 0.8,
        material: "D2",
        thickness_mm: 25,
        part_weight_kg: 1.0,
        contour_count: 1,
        optimize_time: false,
        precision_required: false,
      });

      expect(config.chaining.break_closest_entity_to_thread_point).toBe(false);
      expect(config.chaining.closed_chains_only).toBe(true);
    });

    it("enables glue stops for heavy parts", () => {
      const config = engine.generateWirepathConfig({
        toolpath_type: "single_contour",
        target_ra_um: 0.8,
        material: "D2",
        thickness_mm: 25,
        part_weight_kg: 3.0,
        contour_count: 1,
        optimize_time: false,
        precision_required: false,
      });

      expect(config.glue_stops.enabled).toBe(true);
    });

    it("uses reverse cutting method", () => {
      const config = engine.generateWirepathConfig({
        toolpath_type: "single_contour",
        target_ra_um: 0.8,
        material: "D2",
        thickness_mm: 25,
        part_weight_kg: 1.0,
        contour_count: 1,
        optimize_time: false,
        precision_required: false,
      });

      expect(config.cutting_method).toBe("reverse");
    });

    it("sets computer compensation", () => {
      const config = engine.generateWirepathConfig({
        toolpath_type: "single_contour",
        target_ra_um: 0.8,
        material: "D2",
        thickness_mm: 25,
        part_weight_kg: 1.0,
        contour_count: 1,
        optimize_time: false,
        precision_required: false,
      });

      expect(config.compensation.type).toBe("computer");
      expect(config.compensation.direction).toBe("left");
    });
  });

  // ============================================================================
  // STATUS TESTS
  // ============================================================================

  describe("getStatus", () => {
    it("returns knowledge record count", () => {
      const status = engine.getStatus();

      expect(status.knowledge_records).toBeGreaterThan(10);
    });

    it("returns category breakdown", () => {
      const status = engine.getStatus();

      expect(status.categories.toolpath).toBeGreaterThan(0);
      expect(status.categories.parameter).toBeGreaterThan(0);
    });

    it("returns pass progression count", () => {
      const status = engine.getStatus();

      expect(status.pass_progressions).toBeGreaterThan(0);
    });

    it("returns lead config count", () => {
      const status = engine.getStatus();

      expect(status.lead_configs).toBeGreaterThan(0);
    });

    it("returns sources", () => {
      const status = engine.getStatus();

      expect(status.sources.length).toBeGreaterThan(0);
      expect(status.sources.some(s => s.includes("Mastercam"))).toBe(true);
    });
  });

  // ============================================================================
  // SINGLETON TESTS
  // ============================================================================

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(wireEDMCAMKnowledgeEngine).toBeDefined();
      expect(wireEDMCAMKnowledgeEngine).toBeInstanceOf(WireEDMCAMKnowledgeEngine);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("handles zero thickness", () => {
      const config = engine.generateWirepathConfig({
        toolpath_type: "single_contour",
        target_ra_um: 0.8,
        material: "D2",
        thickness_mm: 0,
        part_weight_kg: 0.1,
        contour_count: 1,
        optimize_time: false,
        precision_required: false,
      });

      expect(config.heights.rapid_height_mm).toBe(5);
    });

    it("handles very fine Ra target", () => {
      const passes = engine.getPassProgression({
        target_ra_um: 0.1,
        material: "D2",
        time_priority: "quality",
        include_tab_cut: false,
      });

      expect(passes.length).toBe(5);  // Maximum passes
    });

    it("handles empty search query", () => {
      const results = engine.searchKnowledge("");

      expect(Array.isArray(results)).toBe(true);
    });

    it("handles zero contours", () => {
      const result = engine.recommendToolpathType({
        has_different_top_bottom: false,
        num_contours: 0,
        requires_material_removal: false,
        has_taper_angle: false,
        is_closed_contour: true,
      });

      expect(result.toolpath_type).toBe("single_contour");
    });

    it("handles equal entity counts of 1", () => {
      const result = engine.recommendSyncMode({
        xy_entity_count: 1,
        uv_entity_count: 1,
        has_branch_points: false,
        has_connecting_3d_geometry: false,
        has_sync_points: false,
        are_splines: false,
      });

      expect(result.recommended_mode).toBe("by_entity");
    });
  });
});
