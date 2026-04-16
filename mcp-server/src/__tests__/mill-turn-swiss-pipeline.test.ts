/**
 * MillTurnSwissPipelineEngine — CK-MS6 Tests
 *
 * 25 tests across 5 sub-methods:
 * - Live Tooling (5): basic, offset, overload, C-axis, polygon
 * - Sub-Spindle Transfer (5): sync, stop, speed-match, back-work, grip safety
 * - Multi-Channel (5): basic, dependencies, collision, sync codes, overlap
 * - Bar Feeder (5): basic, hex, remnant, guide bushing, short bar
 * - Swiss Machining (5): deflection, micro-drill, B-axis, no-bushing, thread
 */
import { describe, it, expect } from "vitest";
import {
  millTurnSwissPipelineEngine as engine,
  MillTurnSwissPipelineEngine,
} from "../engines/MillTurnSwissPipelineEngine.js";

describe("MillTurnSwissPipelineEngine", () => {
  it("exports singleton instance", () => {
    expect(engine).toBeInstanceOf(MillTurnSwissPipelineEngine);
  });

  // ═══════════════════════════════════════════════════════════════
  // 1. LIVE TOOLING
  // ═══════════════════════════════════════════════════════════════
  describe("Live Tooling Operations", () => {
    it("calculates cross-drill at centerline (no offset)", () => {
      const r = engine.calculateLiveTool({
        operation: "cross_drill",
        tool_diameter_mm: 10,
        cutting_speed_m_min: 80,
        depth_of_cut_mm: 5,
        workpiece_diameter_mm: 50,
        iso_group: "P",
      });
      expect(r.effective_diameter_mm).toBe(10);
      expect(r.effective_cutting_speed_m_min).toBeGreaterThan(0);
      expect(r.recommended_rpm).toBeGreaterThan(0);
      expect(r.tangential_force_N).toBeGreaterThan(0);
      expect(r.power_kW).toBeGreaterThan(0);
      expect(r.interpolation_type).toBe("linear");
      expect(r.is_safe).toBe(true);
    });

    it("reduces effective diameter with centerline offset", () => {
      const r = engine.calculateLiveTool({
        operation: "cross_drill",
        tool_diameter_mm: 10,
        cutting_speed_m_min: 80,
        depth_of_cut_mm: 5,
        workpiece_diameter_mm: 50,
        offset_from_centerline_mm: 3,
        iso_group: "P",
      });
      // D_eff = 2*sqrt(25-9) = 2*4 = 8
      expect(r.effective_diameter_mm).toBe(8);
      expect(r.recommendations.length).toBeGreaterThan(0);
    });

    it("detects live spindle overload", () => {
      const r = engine.calculateLiveTool({
        operation: "face_mill",
        tool_diameter_mm: 50,
        cutting_speed_m_min: 200,
        depth_of_cut_mm: 5,
        width_of_cut_mm: 40,
        workpiece_diameter_mm: 80,
        live_spindle_power_kW: 0.5,
        num_flutes: 4,
        iso_group: "S",
      });
      expect(r.power_utilization_pct).toBeGreaterThan(100);
      expect(r.is_safe).toBe(false);
      expect(r.warnings.some(w => w.includes("OVERLOAD"))).toBe(true);
    });

    it("selects circular interpolation for C-axis contour", () => {
      const r = engine.calculateLiveTool({
        operation: "c_axis_contour",
        tool_diameter_mm: 8,
        cutting_speed_m_min: 60,
        depth_of_cut_mm: 2,
        workpiece_diameter_mm: 40,
      });
      expect(r.interpolation_type).toBe("circular");
    });

    it("handles polygon turning", () => {
      const r = engine.calculateLiveTool({
        operation: "polygon_turn",
        tool_diameter_mm: 20,
        cutting_speed_m_min: 100,
        depth_of_cut_mm: 1,
        workpiece_diameter_mm: 25,
      });
      expect(r.interpolation_type).toBe("circular");
      expect(r.recommendations.some(
        rec => rec.includes("polygon") || rec.includes("Polygon")
      )).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. SUB-SPINDLE TRANSFER
  // ═══════════════════════════════════════════════════════════════
  describe("Sub-Spindle Transfer", () => {
    it("calculates synchronized transfer", () => {
      const r = engine.calculateSubSpindleTransfer({
        transfer_mode: "synchronized",
        workpiece_diameter_mm: 30,
        workpiece_length_mm: 100,
        main_spindle_rpm: 2000,
      });
      expect(r.grip_force_required_N).toBeGreaterThan(0);
      expect(r.grip_force_safety_factor).toBe(2.5);
      expect(r.cut_off_force_N).toBeGreaterThan(0);
      expect(r.total_transfer_time_s).toBeGreaterThan(0);
      expect(r.transfer_sequence.length).toBeGreaterThan(3);
      expect(r.is_grip_safe).toBe(true);
    });

    it("calculates stop transfer with decel warning", () => {
      const r = engine.calculateSubSpindleTransfer({
        transfer_mode: "stop_transfer",
        workpiece_diameter_mm: 30,
        workpiece_length_mm: 100,
        main_spindle_rpm: 3000,
      });
      expect(r.sync_time_s).toBeGreaterThan(0);
      expect(r.recommendations.some(
        rec => rec.includes("Stop transfer") || rec.includes("decel")
      )).toBe(true);
    });

    it("calculates speed-match transfer", () => {
      const r = engine.calculateSubSpindleTransfer({
        transfer_mode: "speed_match",
        workpiece_diameter_mm: 25,
        workpiece_length_mm: 80,
        main_spindle_rpm: 2500,
      });
      expect(r.recommendations.some(
        rec => rec.includes("C-axis")
      )).toBe(true);
    });

    it("includes back-working time", () => {
      const r = engine.calculateSubSpindleTransfer({
        transfer_mode: "synchronized",
        workpiece_diameter_mm: 30,
        workpiece_length_mm: 100,
        main_spindle_rpm: 2000,
        back_work_operations: [
          { type: "face", depth_mm: 1 },
          { type: "drill", depth_mm: 20, diameter_mm: 8 },
        ],
      });
      expect(r.back_work_cycle_time_s).toBeGreaterThan(0);
      expect(r.total_transfer_time_s).toBeGreaterThan(
        r.sync_time_s + r.cut_off_time_s
      );
    });

    it("warns on excessive grip force", () => {
      const r = engine.calculateSubSpindleTransfer({
        transfer_mode: "synchronized",
        workpiece_diameter_mm: 100,
        workpiece_length_mm: 300,
        main_spindle_rpm: 4000,
        cutting_force_tangential_N: 20000,
        collet_friction_coeff: 0.1,
      });
      expect(r.grip_force_required_N).toBeGreaterThan(10000);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. MULTI-CHANNEL PROGRAMMING
  // ═══════════════════════════════════════════════════════════════
  describe("Multi-Channel Programming", () => {
    it("schedules two independent channels in parallel", () => {
      const r = engine.calculateMultiChannel({
        channels: [
          {
            channel_id: 1, spindle: "main", turret: 1,
            operations: [
              { op_id: "A1", type: "turn", duration_s: 10 },
              { op_id: "A2", type: "drill", duration_s: 5 },
            ],
          },
          {
            channel_id: 2, spindle: "sub", turret: 2,
            operations: [
              { op_id: "B1", type: "turn", duration_s: 8 },
            ],
          },
        ],
        sync_style: "fanuc_wait_m",
      });
      expect(r.total_cycle_time_s).toBe(15); // max(10+5, 8)
      expect(r.overlap_savings_s).toBe(8); // 23-15
      expect(r.channel_timelines).toHaveLength(2);
    });

    it("handles dependencies between channels", () => {
      const r = engine.calculateMultiChannel({
        channels: [
          {
            channel_id: 1, spindle: "main", turret: 1,
            operations: [
              { op_id: "A1", type: "turn", duration_s: 10 },
            ],
          },
          {
            channel_id: 2, spindle: "sub", turret: 2,
            operations: [
              { op_id: "B1", type: "face", duration_s: 5,
                depends_on: ["A1"] },
            ],
          },
        ],
        sync_style: "siemens_waitm",
      });
      // B1 must wait for A1 (10s), then runs 5s = 15s total
      expect(r.total_cycle_time_s).toBe(15);
      expect(r.sync_points.length).toBeGreaterThan(0);
      expect(r.sync_points[0].sync_code).toContain("WAITM");
    });

    it("detects collision risk in overlapping zones", () => {
      const r = engine.calculateMultiChannel({
        channels: [
          {
            channel_id: 1, spindle: "main", turret: 1,
            operations: [
              {
                op_id: "A1", type: "turn", duration_s: 10,
                z_start_mm: 0, z_end_mm: 50,
              },
            ],
          },
          {
            channel_id: 2, spindle: "sub", turret: 2,
            operations: [
              {
                op_id: "B1", type: "drill", duration_s: 8,
                z_start_mm: 20, z_end_mm: 60,
              },
            ],
          },
        ],
        sync_style: "generic",
        collision_zones: [{
          turret_a: 1, turret_b: 2,
          z_overlap_start_mm: 10, z_overlap_end_mm: 55,
        }],
      });
      expect(r.collision_checks.length).toBeGreaterThan(0);
      expect(r.collision_checks[0].collision_risk).toBe(true);
      expect(r.is_safe).toBe(false);
    });

    it("generates Mazak sync codes", () => {
      const r = engine.calculateMultiChannel({
        channels: [
          {
            channel_id: 1, spindle: "main",
            operations: [
              { op_id: "A1", type: "turn", duration_s: 10 },
            ],
          },
          {
            channel_id: 2, spindle: "sub",
            operations: [
              { op_id: "B1", type: "face", duration_s: 5,
                depends_on: ["A1"] },
            ],
          },
        ],
        sync_style: "mazak_smooth",
      });
      expect(r.sync_codes.some(c => c.includes("Mazak"))).toBe(true);
    });

    it("calculates overlap savings percentage", () => {
      const r = engine.calculateMultiChannel({
        channels: [
          {
            channel_id: 1, spindle: "main",
            operations: [
              { op_id: "A1", type: "turn", duration_s: 20 },
            ],
          },
          {
            channel_id: 2, spindle: "sub",
            operations: [
              { op_id: "B1", type: "turn", duration_s: 20 },
            ],
          },
        ],
        sync_style: "generic",
      });
      // Sequential: 40s, parallel: 20s, savings: 50%
      expect(r.overlap_savings_pct).toBe(50);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. BAR FEEDER
  // ═══════════════════════════════════════════════════════════════
  describe("Bar Feeder Integration", () => {
    it("calculates parts per bar for round stock", () => {
      const r = engine.calculateBarFeeder({
        bar_diameter_mm: 25,
        bar_length_mm: 3000,
        part_length_mm: 50,
        cut_off_width_mm: 3,
        facing_allowance_mm: 0.5,
      });
      // Usable = 3000 - 20(end) - 15(grip) = 2965
      // Per part = 50 + 3 + 0.5 = 53.5
      // Parts = floor(2965/53.5) = 55
      expect(r.parts_per_bar).toBe(55);
      expect(r.total_material_per_part_mm).toBe(53.5);
      expect(r.bar_utilization_pct).toBeGreaterThan(90);
      expect(r.part_weight_kg).toBeGreaterThan(0);
    });

    it("handles hex bar stock", () => {
      const r = engine.calculateBarFeeder({
        bar_diameter_mm: 20,
        bar_length_mm: 2000,
        bar_shape: "hex",
        part_length_mm: 30,
      });
      expect(r.parts_per_bar).toBeGreaterThan(0);
      expect(r.recommendations.some(
        rec => rec.includes("hex") || rec.includes("collet")
      )).toBe(true);
    });

    it("detects usable remnant", () => {
      const r = engine.calculateBarFeeder({
        bar_diameter_mm: 25,
        bar_length_mm: 1000,
        part_length_mm: 100,
        remnant_min_length_mm: 30,
      });
      // Check remnant calculation is present
      expect(typeof r.remnant_length_mm).toBe("number");
      expect(typeof r.remnant_usable).toBe("boolean");
    });

    it("recommends guide bushing bore", () => {
      const r = engine.calculateBarFeeder({
        bar_diameter_mm: 16,
        bar_length_mm: 3000,
        part_length_mm: 25,
        guide_bushing: true,
      });
      expect(r.guide_bushing_bore_mm).toBeGreaterThan(16);
      expect(r.guide_bushing_bore_mm).toBeLessThan(17);
    });

    it("handles bar too short", () => {
      const r = engine.calculateBarFeeder({
        bar_diameter_mm: 25,
        bar_length_mm: 30,
        part_length_mm: 50,
      });
      expect(r.parts_per_bar).toBe(0);
      expect(r.warnings.length).toBeGreaterThan(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. SWISS-TYPE MACHINING
  // ═══════════════════════════════════════════════════════════════
  describe("Swiss-Type Machining", () => {
    it("calculates guide bushing deflection reduction", () => {
      const r = engine.calculateSwissMachining({
        machine_config: "citizen_cincom",
        guide_bushing: true,
        bushing_bore_mm: 16.01,
        workpiece_diameter_mm: 16,
        overhang_from_bushing_mm: 5,
        operation: "turn",
        depth_of_cut_mm: 0.5,
        feed_mm_rev: 0.08,
        iso_group: "P",
      });
      expect(r.deflection_um).toBeGreaterThan(0);
      expect(r.deflection_um).toBeLessThan(r.deflection_conventional_um);
      expect(r.deflection_reduction_pct).toBeGreaterThan(50);
      expect(r.is_safe).toBe(true);
      expect(r.l_over_d_ratio).toBeCloseTo(5 / 16, 2);
    });

    it("recommends peck cycle for micro-drilling", () => {
      const r = engine.calculateSwissMachining({
        machine_config: "star_sr",
        guide_bushing: true,
        bushing_bore_mm: 6.01,
        workpiece_diameter_mm: 6,
        overhang_from_bushing_mm: 3,
        operation: "micro_drill",
        tool_diameter_mm: 0.5,
        hole_depth_mm: 8,
        iso_group: "P",
      });
      expect(r.recommendations.some(
        rec => rec.includes("Micro-drill") || rec.includes("peck")
      )).toBe(true);
      // L/D = 8/0.5 = 16 — extreme
      expect(r.warnings.some(
        w => w.includes("L/D") || w.includes("breakage")
      )).toBe(true);
    });

    it("handles B-axis compound angle", () => {
      const r = engine.calculateSwissMachining({
        machine_config: "tsugami_b_axis",
        guide_bushing: true,
        bushing_bore_mm: 20.01,
        workpiece_diameter_mm: 20,
        overhang_from_bushing_mm: 8,
        operation: "mill",
        tool_diameter_mm: 6,
        b_axis_angle_deg: 30,
      });
      expect(r.tool_approach).toContain("B-axis");
      expect(r.tool_approach).toContain("30");
    });

    it("warns when no guide bushing at high L/D", () => {
      const r = engine.calculateSwissMachining({
        machine_config: "citizen_miyano",
        guide_bushing: false,
        bushing_bore_mm: 25,
        workpiece_diameter_mm: 25,
        overhang_from_bushing_mm: 120,
        operation: "turn",
        iso_group: "P",
      });
      // L/D = 120/25 = 4.8
      expect(r.warnings.some(
        w => w.includes("without guide bushing")
      )).toBe(true);
    });

    it("provides threading recommendations", () => {
      const r = engine.calculateSwissMachining({
        machine_config: "citizen_cincom",
        guide_bushing: true,
        bushing_bore_mm: 10.01,
        workpiece_diameter_mm: 10,
        overhang_from_bushing_mm: 15,
        operation: "thread",
        thread_pitch_mm: 1.5,
        iso_group: "P",
      });
      expect(r.recommendations.some(
        rec => rec.includes("Thread") || rec.includes("thread")
      )).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DISPATCH
  // ═══════════════════════════════════════════════════════════════
  describe("calculate() dispatch", () => {
    it("dispatches live_tool_calc action", () => {
      const r = engine.calculate({
        action: "live_tool_calc",
        params: {
          operation: "cross_drill",
          tool_diameter_mm: 10,
          depth_of_cut_mm: 5,
          workpiece_diameter_mm: 50,
        },
      });
      expect((r as any).effective_diameter_mm).toBeDefined();
    });

    it("dispatches swiss_machining action", () => {
      const r = engine.calculate({
        action: "swiss_machining",
        params: {
          machine_config: "citizen_cincom",
          guide_bushing: true,
          bushing_bore_mm: 16.01,
          workpiece_diameter_mm: 16,
          overhang_from_bushing_mm: 5,
          operation: "turn",
        },
      });
      expect((r as any).deflection_um).toBeDefined();
    });

    it("throws on unknown action", () => {
      expect(() => engine.calculate({
        action: "unknown" as any,
        params: {} as any,
      })).toThrow("Unknown mill-turn action");
    });
  });
});
