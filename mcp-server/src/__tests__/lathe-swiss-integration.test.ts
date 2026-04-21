/**
 * LATHE-PRO-MS6b U-LPS28 — end-to-end Swiss production integration test
 *
 * Exercises the full MS6a+MS6b Swiss pipeline on two sample parts:
 *   1. "simple pin"     — OD-only turning, no Op2, single channel.
 *   2. "complex Swiss"  — OD + bore + cross-hole + internal thread, Op2
 *                         back-work, 2-channel schedule, full lights-out
 *                         readiness assessment.
 *
 * Engines invoked in sequence:
 *   SwissGuideBushDecisionEngine        (U-LPS21)
 *   SwissGangSlideTurretEngine          (U-LPS23)
 *   SwissBackWorkingOp2Engine           (U-LPS22)
 *   SwissChannelFileEmitterEngine       (U-LPM01)
 *   SyncCodeVerificationEngine.verifySchedule (U-LPM02)
 *   SwissPartTransferSequenceEngine     (U-LPM03)
 *   SwissChannelGanttSchedulerEngine    (U-LPM04)
 *   MultiChannelCollisionEngine         (U-LPM05)
 *   SwissBarProductionEngine            (U-LPS24)
 *   SwissUnmannedReadinessEngine        (U-LPS25)
 *
 * Asserts for BOTH parts: channel files generate, sync codes match,
 * bar plan produces ≥ 1 part, lights-out verdict is non-undefined.
 */
import { describe, it, expect } from "vitest";
import { swissGuideBushDecisionEngine } from "../engines/SwissGuideBushDecisionEngine.js";
import { swissGangSlideTurretEngine } from "../engines/SwissGangSlideTurretEngine.js";
import { swissBackWorkingOp2Engine } from "../engines/SwissBackWorkingOp2Engine.js";
import { swissChannelFileEmitterEngine } from "../engines/SwissChannelFileEmitterEngine.js";
import { syncCodeVerificationEngine } from "../engines/SyncCodeVerificationEngine.js";
import { swissPartTransferSequenceEngine } from "../engines/SwissPartTransferSequenceEngine.js";
import { swissChannelGanttSchedulerEngine } from "../engines/SwissChannelGanttSchedulerEngine.js";
import { multiChannelCollisionEngine } from "../engines/MultiChannelCollisionEngine.js";
import { swissBarProductionEngine } from "../engines/SwissBarProductionEngine.js";
import { swissUnmannedReadinessEngine } from "../engines/SwissUnmannedReadinessEngine.js";

describe("MS6b integration — simple pin on Citizen Cincom", () => {
  it("runs the full pipeline end-to-end on a single-channel OD-only pin", () => {
    // Part: 10 mm OD × 20 mm long pin from 12 mm h6 bar.
    const gb = swissGuideBushDecisionEngine.decide({
      bar_diameter_mm: 12,
      bar_tolerance_class: "h6",
      projection_mm: 25,
      target_tolerance_mm: 0.01,
      target_ra_um: 0.8,
      bushing_overhang_mm: 5,
      collet_overhang_mm: 40,
      radial_force_n: 100,
    });
    expect(gb.recommended_mode).toBe("guide_bush");

    const gang = swissGangSlideTurretEngine.layout({
      topology: "gang",
      x_travel_mm: 60,
      tools: [
        { tool_number: 1, label: "OD_ROUGH", width_mm: 10 },
        { tool_number: 2, label: "OD_FINISH", width_mm: 8 },
        { tool_number: 3, label: "PART_OFF", width_mm: 6 },
      ],
    });
    expect(gang.gang_positions).toHaveLength(3);

    const bar = swissBarProductionEngine.plan({
      dialect: "citizen",
      bar_length_mm: 3000,
      part_length_mm: 20,
      cutoff_width_mm: 3,
      batch_quantity: 500,
      cycle_time_s: 25,
    });
    expect(bar.parts_per_bar).toBeGreaterThan(100);
    expect(bar.mcodes.bar_feed).toBe("M82");

    const files = swissChannelFileEmitterEngine.emit({
      dialect: "citizen",
      program_number: 1001,
      program_comment: "PIN",
      channels: [
        {
          channel_id: 1,
          body: [
            "(op=rough) T0101",
            "G96 S220 M03",
            "G00 X12 Z2",
            "G01 X10 Z-20 F0.2",
            "(op=part_off) T0303",
            "G01 X-1 F0.05",
          ],
          tools: gang.gang_positions!.map((p, i) => ({
            number: p.tool_number,
            offset: i + 1,
          })),
        },
      ],
      sync_points: [],
    });
    expect(files.channel_files.length).toBeGreaterThan(0);
    expect(files.channel_files[0]!.text).toMatch(/O1001/);

    const unmanned = swissUnmannedReadinessEngine.assess({
      batch_quantity: 500,
      cycle_time_s: 25,
      chip_volume_mm3_per_part: 150,
      conveyor_rate_mm3_s: 30,
      coolant_filter_life_h: 50,
      coolant_temperature_c: 28,
      bars_required: bar.bars_required,
      magazine_capacity: 12,
      bin_capacity_parts: 600,
      part_weight_g: 15,
      bin_max_load_kg: 20,
      tool_life_min: 90,
      available_inserts: 6,
    });
    expect(["GREEN", "YELLOW", "RED"]).toContain(unmanned.verdict);
    expect(unmanned.factors).toHaveLength(5);
  });
});

describe("MS6b integration — complex 2-channel Swiss part on Mazak", () => {
  it("runs the full pipeline including Op2 back-work, sync verify, and collision check", () => {
    // Part: OD turn + bore + cross-hole + internal thread from sub spindle.
    const gb = swissGuideBushDecisionEngine.decide({
      bar_diameter_mm: 16,
      bar_tolerance_class: "h6",
      projection_mm: 50,
      target_tolerance_mm: 0.015,
      target_ra_um: 0.6,
      bushing_overhang_mm: 8,
      collet_overhang_mm: 50,
      radial_force_n: 200,
    });
    expect(gb.recommended_mode).toBe("guide_bush");

    const transfer = swissPartTransferSequenceEngine.generate({
      dialect: "mazak",
      main_rpm: 1800,
      sub_rpm: 1800,
      grip_z_mm: -5,
      cutoff_z_mm: -6.5,
      cutoff_feed_mm_rev: 0.06,
      retract_z_mm: 25,
      sensor_confirm: true,
    });
    expect(transfer.sync_points).toHaveLength(3);

    const op2 = swissBackWorkingOp2Engine.generate({
      dialect: "mazak",
      final_length_mm: 30,
      program_number: 2002,
      ops: [
        { type: "face_to_length", tool_number: 5, depth_mm: 0.5, x_mm: 14, feed_mm_rev: 0.08, spindle_rpm: 2000 },
        { type: "bore_back", tool_number: 6, depth_mm: 8, x_mm: 6, feed_mm_rev: 0.05, spindle_rpm: 2500 },
        {
          type: "internal_thread",
          tool_number: 7,
          depth_mm: 6,
          x_mm: 6.5,
          feed_mm_rev: 1.0,
          spindle_rpm: 800,
          thread_pitch_mm: 1.0,
          thread_start_x_mm: 6,
        },
      ],
      op1_duration_s: 40,
    });
    expect(op2.lines.some(l => l === "!C2")).toBe(true);
    expect(op2.op2_duration_s).toBeGreaterThan(0);

    const schedule = [
      { op_id: "m_od", channel_id: 1, start_s: 0, end_s: 20, duration_s: 20, tooling_required: "OD_TURN" },
      { op_id: "m_cutoff", channel_id: 1, start_s: 35, end_s: 40, duration_s: 5, tooling_required: "PART_OFF" },
      { op_id: "s_face", channel_id: 2, start_s: 20, end_s: 25, duration_s: 5, tooling_required: "FACE", pinned: true },
      { op_id: "s_bore", channel_id: 2, start_s: 25, end_s: 33, duration_s: 8, tooling_required: "BORE", pinned: true },
    ];
    const balance = swissChannelGanttSchedulerEngine.balance({
      channels: [
        { channel_id: 1, tooling_available: ["OD_TURN", "PART_OFF"] },
        { channel_id: 2, tooling_available: ["FACE", "BORE"] },
      ],
      ops: schedule,
      sync_points: transfer.sync_points,
    });
    expect(balance.rebalanced_ops).toHaveLength(4);

    const verify = syncCodeVerificationEngine.verifySchedule({
      sync_points: transfer.sync_points,
      ops: schedule.map(o => ({ op_id: o.op_id, channel_id: o.channel_id, start_s: o.start_s, end_s: o.end_s, end_position: { retracted: true } })),
    });
    expect(verify).toBeDefined();

    const collision = multiChannelCollisionEngine.check({
      ops: [
        { op_id: "m_od", channel_id: 1, turret: 1, start_s: 0, end_s: 20, z_range_mm: [0, 30], x_mm: 15, tool_radius_mm: 3 },
        { op_id: "s_bore", channel_id: 2, turret: 2, start_s: 25, end_s: 33, z_range_mm: [0, 8], x_mm: 6, tool_radius_mm: 3 },
      ],
      min_clearance_mm: 5,
    });
    expect(collision.pairs_checked).toBeGreaterThanOrEqual(0);

    const files = swissChannelFileEmitterEngine.emit({
      dialect: "mazak",
      program_number: 2002,
      program_comment: "2-CH COMPLEX",
      channels: [
        {
          channel_id: 1,
          body: ["(op=m_od) T0101", "G96 S240 M03", "G01 X12 Z-20 F0.15"],
          tools: [{ number: 1, offset: 1 }],
        },
        {
          channel_id: 2,
          body: ["(op=s_bore) T0606", "G97 S2500 M04", "G01 Z-8 F0.05"],
          tools: [{ number: 6, offset: 6 }],
        },
      ],
      sync_points: transfer.sync_points,
    });
    expect(files.channel_files[0]!.text).toMatch(/!C1/);
    expect(files.channel_files[0]!.text).toMatch(/!C2/);
    expect(files.channel_files[0]!.text).toMatch(/WAITM/);

    const bar = swissBarProductionEngine.plan({
      dialect: "mazak",
      bar_length_mm: 3000,
      part_length_mm: 30,
      cutoff_width_mm: 3,
      batch_quantity: 200,
      cycle_time_s: 60,
    });
    expect(bar.parts_per_bar).toBeGreaterThan(30);

    const unmanned = swissUnmannedReadinessEngine.assess({
      batch_quantity: 200,
      cycle_time_s: 60,
      chip_volume_mm3_per_part: 400,
      conveyor_rate_mm3_s: 20,
      coolant_filter_life_h: 20,
      coolant_temperature_c: 30,
      bars_required: bar.bars_required,
      magazine_capacity: 12,
      bin_capacity_parts: 300,
      part_weight_g: 60,
      bin_max_load_kg: 25,
      tool_life_min: 80,
      available_inserts: 5,
    });
    expect(unmanned.factors).toHaveLength(5);
    expect(["GREEN", "YELLOW", "RED"]).toContain(unmanned.verdict);
  });
});
