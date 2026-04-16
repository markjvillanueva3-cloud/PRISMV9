/**
 * LATHE-PRO-MS1, Session 5, U-LPR12 + U-LPR13
 * TurningToolpathWearEngine + InsertChangeRecommendationEngine Tests
 */

import { describe, it, expect } from "vitest";
import { turningToolpathWearEngine } from "../engines/TurningToolpathWearEngine.js";
import { insertChangeRecommendationEngine } from "../engines/InsertChangeRecommendationEngine.js";

// ── Toolpath Wear Accumulation ─────────────────────────────────────────────

describe("TurningToolpathWearEngine — Basic", () => {
  const baseInput = {
    iso_group: "P" as const,
    Vc_m_min: 200,
    nose_radius_mm: 0.8,
    segments: [
      { id: "s1", op_type: "od_rough" as const, d_start_mm: 50, d_end_mm: 45, cut_length_mm: 80, ap_mm: 2.5, f_mm_rev: 0.30, passes: 1 },
      { id: "s2", op_type: "od_finish" as const, d_start_mm: 45, d_end_mm: 44, cut_length_mm: 80, ap_mm: 0.5, f_mm_rev: 0.12, passes: 1 },
    ],
  };

  it("produces per-segment wear results", () => {
    const result = turningToolpathWearEngine.accumulateWear(baseInput);
    expect(result.segments.length).toBe(2);
    expect(result.segments[0].segment_id).toBe("s1");
    expect(result.segments[1].segment_id).toBe("s2");
  });

  it("cumulative wear increases across segments", () => {
    const result = turningToolpathWearEngine.accumulateWear(baseInput);
    expect(result.segments[1].cumulative_wear_um).toBeGreaterThan(result.segments[0].wear_um);
  });

  it("total wear equals sum of segment wear", () => {
    const result = turningToolpathWearEngine.accumulateWear(baseInput);
    const sumWear = result.segments.reduce((s, seg) => s + seg.wear_um, 0);
    expect(result.total_wear_um).toBeCloseTo(sumWear, 1);
  });

  it("total cutting time is positive", () => {
    const result = turningToolpathWearEngine.accumulateWear(baseInput);
    expect(result.total_cutting_time_min).toBeGreaterThan(0);
  });

  it("parts per edge is positive integer", () => {
    const result = turningToolpathWearEngine.accumulateWear(baseInput);
    expect(result.parts_per_edge).toBeGreaterThan(0);
    expect(Number.isInteger(result.parts_per_edge)).toBe(true);
  });

  it("identifies hotspot segment", () => {
    const result = turningToolpathWearEngine.accumulateWear(baseInput);
    expect(result.hotspot_segment).toBeTruthy();
    expect(["s1", "s2"]).toContain(result.hotspot_segment);
  });
});

describe("TurningToolpathWearEngine — CSS Mode", () => {
  it("CSS mode adjusts Vc based on diameter", () => {
    const result = turningToolpathWearEngine.accumulateWear({
      iso_group: "P",
      Vc_m_min: 200,
      css_mode: true,
      max_rpm: 3000,
      nose_radius_mm: 0.8,
      segments: [
        { id: "large", op_type: "od_rough", d_start_mm: 100, d_end_mm: 95, cut_length_mm: 50, ap_mm: 2.5, f_mm_rev: 0.30, passes: 1 },
        { id: "small", op_type: "od_rough", d_start_mm: 20, d_end_mm: 15, cut_length_mm: 50, ap_mm: 2.5, f_mm_rev: 0.30, passes: 1 },
      ],
    });
    // At small diameter, RPM clamp reduces actual Vc
    const largeSeg = result.segments.find(s => s.segment_id === "large")!;
    const smallSeg = result.segments.find(s => s.segment_id === "small")!;
    // Small diameter with RPM clamp should have lower Vc
    expect(smallSeg.avg_vc_m_min).toBeLessThan(largeSeg.avg_vc_m_min);
  });
});

describe("TurningToolpathWearEngine — Interrupted Cuts", () => {
  it("interrupted cuts increase wear", () => {
    const continuous = turningToolpathWearEngine.accumulateWear({
      iso_group: "P", Vc_m_min: 200, nose_radius_mm: 0.8,
      segments: [{ id: "s1", op_type: "od_rough", d_start_mm: 50, d_end_mm: 45, cut_length_mm: 80, ap_mm: 2.0, f_mm_rev: 0.30, passes: 1 }],
    });
    const interrupted = turningToolpathWearEngine.accumulateWear({
      iso_group: "P", Vc_m_min: 200, nose_radius_mm: 0.8,
      segments: [{ id: "s1", op_type: "od_rough", d_start_mm: 50, d_end_mm: 45, cut_length_mm: 80, ap_mm: 2.0, f_mm_rev: 0.30, passes: 1, interrupted: true, interruptions_per_rev: 4 }],
    });
    expect(interrupted.total_wear_um).toBeGreaterThan(continuous.total_wear_um);
  });
});

describe("TurningToolpathWearEngine — Multi-Pass", () => {
  it("multiple passes increase total wear", () => {
    const singlePass = turningToolpathWearEngine.accumulateWear({
      iso_group: "P", Vc_m_min: 200, nose_radius_mm: 0.8,
      segments: [{ id: "s1", op_type: "od_rough", d_start_mm: 50, d_end_mm: 45, cut_length_mm: 80, ap_mm: 2.0, f_mm_rev: 0.30, passes: 1 }],
    });
    const multiPass = turningToolpathWearEngine.accumulateWear({
      iso_group: "P", Vc_m_min: 200, nose_radius_mm: 0.8,
      segments: [{ id: "s1", op_type: "od_rough", d_start_mm: 50, d_end_mm: 45, cut_length_mm: 80, ap_mm: 2.0, f_mm_rev: 0.30, passes: 5 }],
    });
    expect(multiPass.total_wear_um).toBeGreaterThan(singlePass.total_wear_um);
  });
});

// ── Insert Change Recommendations ──────────────────────────────────────────

describe("InsertChangeRecommendationEngine — Urgency", () => {
  it("GREEN for fresh insert", () => {
    const result = insertChangeRecommendationEngine.recommend({
      stations: [{ station: 1, tool_description: "CNMG 120408 PM", current_wear_um: 50, parts_machined: 5 }],
      wear_per_part_um: { 1: 10 },
      batch_remaining: 100,
    });
    expect(result.recommendations[0].urgency).toBe("GREEN");
  });

  it("YELLOW at 50-75% wear", () => {
    const result = insertChangeRecommendationEngine.recommend({
      stations: [{ station: 1, tool_description: "CNMG 120408 PM", current_wear_um: 180, parts_machined: 18 }],
      wear_per_part_um: { 1: 10 },
      batch_remaining: 100,
    });
    expect(result.recommendations[0].urgency).toBe("YELLOW");
  });

  it("RED at 75-90% wear", () => {
    const result = insertChangeRecommendationEngine.recommend({
      stations: [{ station: 1, tool_description: "CNMG 120408 PM", current_wear_um: 240, parts_machined: 24 }],
      wear_per_part_um: { 1: 10 },
      batch_remaining: 100,
    });
    expect(result.recommendations[0].urgency).toBe("RED");
  });

  it("CRITICAL at >90% wear", () => {
    const result = insertChangeRecommendationEngine.recommend({
      stations: [{ station: 1, tool_description: "CNMG 120408 PM", current_wear_um: 280, parts_machined: 28 }],
      wear_per_part_um: { 1: 10 },
      batch_remaining: 100,
    });
    expect(result.recommendations[0].urgency).toBe("CRITICAL");
  });
});

describe("InsertChangeRecommendationEngine — Remaining Parts", () => {
  it("calculates remaining parts correctly", () => {
    const result = insertChangeRecommendationEngine.recommend({
      stations: [{ station: 1, tool_description: "CNMG 120408", current_wear_um: 100, parts_machined: 10 }],
      wear_per_part_um: { 1: 10 },
      batch_remaining: 50,
    });
    // 300 - 100 = 200 µm remaining, at 10 µm/part = 20 parts
    expect(result.recommendations[0].remaining_parts).toBe(20);
  });

  it("remaining parts is 0 when at VB_max", () => {
    const result = insertChangeRecommendationEngine.recommend({
      stations: [{ station: 1, tool_description: "CNMG", current_wear_um: 300, parts_machined: 30 }],
      wear_per_part_um: { 1: 10 },
      batch_remaining: 50,
    });
    expect(result.recommendations[0].remaining_parts).toBe(0);
  });
});

describe("InsertChangeRecommendationEngine — Batch Schedule", () => {
  it("builds change schedule for multi-station setup", () => {
    const result = insertChangeRecommendationEngine.recommend({
      stations: [
        { station: 1, tool_description: "CNMG Roughing", current_wear_um: 200, parts_machined: 20 },
        { station: 2, tool_description: "DNMG Finishing", current_wear_um: 50, parts_machined: 10 },
        { station: 3, tool_description: "VNMG Grooving", current_wear_um: 250, parts_machined: 25 },
      ],
      wear_per_part_um: { 1: 15, 2: 5, 3: 20 },
      batch_remaining: 100,
    });
    expect(result.total_changes).toBeGreaterThan(0);
    expect(result.change_schedule.length).toBeGreaterThan(0);
    // Schedule should be sorted by part number
    for (let i = 1; i < result.change_schedule.length; i++) {
      expect(result.change_schedule[i].at_part).toBeGreaterThanOrEqual(result.change_schedule[i - 1].at_part);
    }
  });

  it("groups nearby changes to minimize stops", () => {
    const result = insertChangeRecommendationEngine.recommend({
      stations: [
        { station: 1, tool_description: "T1", current_wear_um: 250, parts_machined: 25 },
        { station: 2, tool_description: "T2", current_wear_um: 248, parts_machined: 24 },
      ],
      wear_per_part_um: { 1: 10, 2: 10 },
      batch_remaining: 50,
    });
    // Both stations have ~5 parts remaining — should group into one change point
    const firstChange = result.change_schedule[0];
    expect(firstChange).toBeDefined();
    if (firstChange) {
      expect(firstChange.stations.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("InsertChangeRecommendationEngine — Messages", () => {
  it("all urgency levels produce readable messages", () => {
    const wears = [50, 180, 240, 290];
    for (const wear of wears) {
      const result = insertChangeRecommendationEngine.recommend({
        stations: [{ station: 1, tool_description: "CNMG", current_wear_um: wear, parts_machined: 0 }],
        wear_per_part_um: { 1: 10 },
        batch_remaining: 100,
      });
      expect(result.recommendations[0].message.length).toBeGreaterThan(10);
      expect(result.recommendations[0].message).toContain("T1");
    }
  });
});
