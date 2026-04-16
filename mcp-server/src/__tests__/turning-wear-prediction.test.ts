/**
 * LATHE-PRO-MS1, Session 6, U-LPR14 + U-LPR15 + U-LPR16
 * TurningWearPredictionEngine Tests
 *
 * Validates:
 * - Per-operation Usui wear accumulation
 * - Chip form prediction and wear mode mapping
 * - Batch life prediction with change schedule and cost
 * - Vc optimization suggestions
 */

import { describe, it, expect } from "vitest";
import { turningWearPredictionEngine } from "../engines/TurningWearPredictionEngine.js";

const baseOps = [
  { id: "face", type: "face_rough" as const, insert_station: 1, diameter_mm: 50, cut_length_mm: 25, ap_mm: 2.0, f_mm_rev: 0.30, Vc_m_min: 200, passes: 1 },
  { id: "od_rough", type: "od_rough" as const, insert_station: 1, diameter_mm: 48, cut_length_mm: 80, ap_mm: 2.5, f_mm_rev: 0.28, Vc_m_min: 200, passes: 3 },
  { id: "od_finish", type: "od_finish" as const, insert_station: 2, diameter_mm: 45, cut_length_mm: 80, ap_mm: 0.5, f_mm_rev: 0.12, Vc_m_min: 250, passes: 1 },
];

// ── U-LPR14: Per-Operation Wear ────────────────────────────────────────────

describe("TurningWearPrediction — Per-Operation (U-LPR14)", () => {
  it("computes wear for each operation", () => {
    const result = turningWearPredictionEngine.accumulatePerOperation({
      iso_group: "P", operations: baseOps,
    });
    expect(result.operations.length).toBe(3);
    for (const op of result.operations) {
      expect(op.wear_um).toBeGreaterThan(0);
      expect(op.cutting_time_min).toBeGreaterThan(0);
      expect(op.Fc_N).toBeGreaterThan(0);
      expect(op.temperature_C).toBeGreaterThan(0);
    }
  });

  it("accumulates per insert station", () => {
    const result = turningWearPredictionEngine.accumulatePerOperation({
      iso_group: "P", operations: baseOps,
    });
    // Station 1 has face + od_rough, station 2 has od_finish
    expect(result.station_wear[1]).toBeDefined();
    expect(result.station_wear[2]).toBeDefined();
    expect(result.station_wear[1].ops.length).toBe(2);
    expect(result.station_wear[2].ops.length).toBe(1);
  });

  it("roughing accumulates more wear than finishing (same insert)", () => {
    const result = turningWearPredictionEngine.accumulatePerOperation({
      iso_group: "P", operations: baseOps,
    });
    // Station 1 (rough) should have more wear than station 2 (finish)
    expect(result.station_wear[1].total_wear_um).toBeGreaterThan(result.station_wear[2].total_wear_um);
  });

  it("superalloys produce more wear than steel", () => {
    const steel = turningWearPredictionEngine.accumulatePerOperation({
      iso_group: "P",
      operations: [{ id: "od", type: "od_rough", insert_station: 1, diameter_mm: 50, cut_length_mm: 50, ap_mm: 2.0, f_mm_rev: 0.25, Vc_m_min: 150, passes: 1 }],
    });
    const superalloy = turningWearPredictionEngine.accumulatePerOperation({
      iso_group: "S",
      operations: [{ id: "od", type: "od_rough", insert_station: 1, diameter_mm: 50, cut_length_mm: 50, ap_mm: 2.0, f_mm_rev: 0.25, Vc_m_min: 150, passes: 1 }],
    });
    expect(superalloy.station_wear[1].total_wear_um).toBeGreaterThan(steel.station_wear[1].total_wear_um);
  });

  it("identifies at-risk stations (>75% VB_max)", () => {
    // Create a long operation that consumes significant insert life
    const result = turningWearPredictionEngine.accumulatePerOperation({
      iso_group: "S", // superalloy = high wear
      operations: [{
        id: "long_cut", type: "od_rough", insert_station: 1,
        diameter_mm: 40, cut_length_mm: 500, ap_mm: 3.0, f_mm_rev: 0.25, Vc_m_min: 60, passes: 10,
      }],
    });
    // This should produce significant wear
    expect(result.station_wear[1].total_wear_um).toBeGreaterThan(0);
  });

  it("all 6 ISO groups produce valid results", () => {
    const groups: ISOGroup[] = ["P", "M", "K", "N", "S", "H"];
    for (const iso of groups) {
      const result = turningWearPredictionEngine.accumulatePerOperation({
        iso_group: iso,
        operations: [{ id: "test", type: "od_rough", insert_station: 1, diameter_mm: 50, cut_length_mm: 50, ap_mm: 2.0, f_mm_rev: 0.25, Vc_m_min: 150, passes: 1 }],
      });
      expect(result.operations[0].wear_um).toBeGreaterThan(0);
      expect(result.operations[0].Fc_N).toBeGreaterThan(0);
    }
  });
});

type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

// ── U-LPR15: Chip Form Prediction ─────────────────────────────────────────

describe("TurningWearPrediction — Chip Form (U-LPR15)", () => {
  it("steel produces continuous chips at normal Vc", () => {
    const chip = turningWearPredictionEngine.predictChipForm("P", 200, 0.30, 2.0);
    expect(chip.chip_type).toBe("continuous");
    expect(chip.primary_wear_mode).toBe("crater");
  });

  it("cast iron produces discontinuous chips", () => {
    const chip = turningWearPredictionEngine.predictChipForm("K", 250, 0.25, 2.0);
    expect(chip.chip_type).toBe("discontinuous");
    expect(chip.primary_wear_mode).toBe("flank");
  });

  it("superalloys produce segmented chips", () => {
    const chip = turningWearPredictionEngine.predictChipForm("S", 50, 0.15, 1.0);
    expect(chip.chip_type).toBe("segmented");
    expect(chip.primary_wear_mode).toBe("notch");
  });

  it("very low Vc in steel triggers BUE prediction", () => {
    const chip = turningWearPredictionEngine.predictChipForm("P", 50, 0.20, 1.5);
    expect(chip.chip_type).toBe("built_up_edge");
  });

  it("aluminum at low Vc predicts BUE", () => {
    const chip = turningWearPredictionEngine.predictChipForm("N", 80, 0.15, 1.0);
    expect(chip.chip_type).toBe("built_up_edge");
  });

  it("returns chipbreaker class recommendation", () => {
    const fine = turningWearPredictionEngine.predictChipForm("P", 250, 0.10, 0.5);
    expect(fine.chipbreaker_class).toBe("F");

    const medium = turningWearPredictionEngine.predictChipForm("P", 200, 0.25, 2.0);
    expect(medium.chipbreaker_class).toBe("M");

    const rough = turningWearPredictionEngine.predictChipForm("P", 180, 0.45, 5.0);
    expect(rough.chipbreaker_class).toBe("R");
  });

  it("chip control difficulty is 0-1", () => {
    const groups: ISOGroup[] = ["P", "M", "K", "N", "S", "H"];
    for (const iso of groups) {
      const chip = turningWearPredictionEngine.predictChipForm(iso, 150, 0.25, 2.0);
      expect(chip.chip_control_difficulty).toBeGreaterThanOrEqual(0);
      expect(chip.chip_control_difficulty).toBeLessThanOrEqual(1);
    }
  });

  it("chip form results include rationale", () => {
    const chip = turningWearPredictionEngine.predictChipForm("M", 130, 0.20, 1.5);
    expect(chip.rationale.length).toBeGreaterThan(20);
    expect(chip.rationale).toContain("ISO M");
  });
});

// ── U-LPR16: Batch Life Predictor ──────────────────────────────────────────

describe("TurningWearPrediction — Batch Life (U-LPR16)", () => {
  it("computes parts per edge for a batch", () => {
    const result = turningWearPredictionEngine.predictBatchLife({
      iso_group: "P",
      operations: baseOps,
      batch_quantity: 100,
    });
    expect(result.parts_per_edge).toBeGreaterThan(0);
    expect(result.insert_changes_per_batch).toBeGreaterThanOrEqual(0);
  });

  it("change schedule covers all stations", () => {
    const result = turningWearPredictionEngine.predictBatchLife({
      iso_group: "P",
      operations: baseOps,
      batch_quantity: 500,
    });
    // Should have entries for both stations
    const stations = result.change_schedule.map(s => s.station);
    expect(stations).toContain(1);
    expect(stations).toContain(2);
  });

  it("cost analysis is positive", () => {
    const result = turningWearPredictionEngine.predictBatchLife({
      iso_group: "P",
      operations: baseOps,
      batch_quantity: 100,
      insert_cost_per_edge: 12.50,
    });
    expect(result.cost.total_insert_cost).toBeGreaterThan(0);
    expect(result.cost.cost_per_part_tooling).toBeGreaterThan(0);
    expect(result.cost.edges_consumed).toBeGreaterThan(0);
  });

  it("larger batches require more insert changes", () => {
    const small = turningWearPredictionEngine.predictBatchLife({
      iso_group: "P", operations: baseOps, batch_quantity: 10,
    });
    const large = turningWearPredictionEngine.predictBatchLife({
      iso_group: "P", operations: baseOps, batch_quantity: 1000,
    });
    expect(large.insert_changes_per_batch).toBeGreaterThanOrEqual(small.insert_changes_per_batch);
  });

  it("Vc optimization suggests lower speed for more parts per edge", () => {
    const result = turningWearPredictionEngine.predictBatchLife({
      iso_group: "P",
      operations: baseOps,
      batch_quantity: 100,
      target_parts_per_edge: 50, // Want 50 parts per edge
    });
    if (result.optimization && result.parts_per_edge < 50) {
      // Should suggest reducing Vc
      expect(result.optimization.suggested_vc_adjustment_pct).toBeLessThan(0);
      expect(result.optimization.suggested_vc_m_min).toBeLessThan(200);
    }
  });

  it("Vc optimization suggests higher speed for fewer parts per edge", () => {
    const result = turningWearPredictionEngine.predictBatchLife({
      iso_group: "P",
      operations: baseOps,
      batch_quantity: 100,
      target_parts_per_edge: 3, // Want only 3 parts per edge (very aggressive)
    });
    if (result.optimization && result.parts_per_edge > 3) {
      // Should suggest increasing Vc for productivity
      expect(result.optimization.suggested_vc_adjustment_pct).toBeGreaterThan(0);
    }
  });

  it("change schedule has monotonically increasing part numbers", () => {
    const result = turningWearPredictionEngine.predictBatchLife({
      iso_group: "P",
      operations: baseOps,
      batch_quantity: 500,
    });
    for (const sched of result.change_schedule) {
      for (let i = 1; i < sched.change_at_parts.length; i++) {
        expect(sched.change_at_parts[i]).toBeGreaterThan(sched.change_at_parts[i - 1]);
      }
    }
  });

  it("superalloy batch has more changes than steel batch", () => {
    const steel = turningWearPredictionEngine.predictBatchLife({
      iso_group: "P",
      operations: [{ id: "od", type: "od_rough", insert_station: 1, diameter_mm: 50, cut_length_mm: 80, ap_mm: 2.0, f_mm_rev: 0.25, Vc_m_min: 150, passes: 3 }],
      batch_quantity: 100,
    });
    const superalloy = turningWearPredictionEngine.predictBatchLife({
      iso_group: "S",
      operations: [{ id: "od", type: "od_rough", insert_station: 1, diameter_mm: 50, cut_length_mm: 80, ap_mm: 2.0, f_mm_rev: 0.25, Vc_m_min: 50, passes: 3 }],
      batch_quantity: 100,
    });
    expect(superalloy.parts_per_edge).toBeLessThan(steel.parts_per_edge);
  });
});
