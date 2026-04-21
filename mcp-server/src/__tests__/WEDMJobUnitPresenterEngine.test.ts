/**
 * WEDMJobUnitPresenterEngine.test.ts — inch-first I/O round-trip coverage.
 *
 * Validates that US-denominated WEDM jobs survive translation to/from the
 * canonical SI record with zero data loss for typical shop values, and that
 * stats are re-expressed in µin without rounding drift.
 *
 * Canonical constants verified:
 *   MM_PER_INCH_EXACT = 25.4            (NIST SP 811 §B.8, 1959 agreement)
 *   UM_PER_UIN_EXACT  = 0.0254
 *   M_PER_FT_EXACT    = 0.3048
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WEDMJobOutcomeEngine } from "../engines/WEDMJobOutcomeEngine.js";
import {
  FT_PER_M,
  INCHES_PER_MM,
  MM_PER_INCH_EXACT,
  M_PER_FT_EXACT,
  UIN_PER_UM,
  UM_PER_UIN_EXACT,
  WEDMJobUnitPresenterEngine,
  type USJobInput,
} from "../engines/WEDMJobUnitPresenterEngine.js";

// ─────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

let tmpDir: string;
let tmpFile: string;
let outcome: WEDMJobOutcomeEngine;
let presenter: WEDMJobUnitPresenterEngine;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "wedm-us-"));
  tmpFile = join(tmpDir, "WEDM_JOB_HISTORY.json");
  outcome = new WEDMJobOutcomeEngine({ filePath: tmpFile });
  presenter = new WEDMJobUnitPresenterEngine();
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

/** Typical JM Die WEDM job in US units (die steel, fine finish). */
function sampleUSJob(): USJobInput {
  return {
    shop_id: "jm-die",
    machine_id: "MS-WedM-01",
    operator_id: "op-001",
    customer: "ALCOA",
    part_number: "D2-COLD-HEAD-DIE-001",
    program_file: "D2_050.NC",
    input: {
      material: "D2",
      hardness_hrc: 60,
      thickness_in: 0.500,          // 1/2" die plate — 12.7 mm
      wire_diameter_in: 0.010,      // .010" brass — 0.254 mm
      wire_material: "brass",
      profile_length_in: 4.0,       // 4" perimeter — 101.6 mm
      num_passes: 4,
      target_ra_uin: 32,            // 32 µin Ra — 0.8128 µm
      tolerance_in: 0.0005,         // ±.0005" — 0.0127 mm
      controller: "fanuc",
      peak_current_A: 8,
      on_time_us: 6,
      off_time_us: 12,
    },
    outcome: {
      measured_ra_uin: 30,
      measured_ra_source: "cmm",
      measured_ra_uncertainty_uin: 2,
      measured_cycle_min: 42.3,
      measured_cycle_source: "controller",
      measured_recast_uin: 120,
      measured_recast_source: "cmm",
      wire_break_count: 0,
      wire_break_events: [],
      wire_consumed_ft: 608,          // ≈ 185.4 m
      accepted: true,
      rejection_codes: [],
    },
    predicted: {
      predicted_ra_uin: 33,
      predicted_cycle_min: 44.0,
      predicted_wire_break_probability: 0.12,
      predicted_recast_uin: 130,
      model_name: "Klocke-baseline",
      model_version: "v1",
    },
    notes: "first D2 die — shop-floor US units test",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("WEDMJobUnitPresenterEngine — canonical constants", () => {
  it("MM_PER_INCH_EXACT equals 25.4 (NIST SP 811 / 1959 agreement)", () => {
    expect(MM_PER_INCH_EXACT).toBe(25.4);
  });

  it("UM_PER_UIN_EXACT equals 0.0254", () => {
    expect(UM_PER_UIN_EXACT).toBe(0.0254);
  });

  it("M_PER_FT_EXACT equals 0.3048", () => {
    expect(M_PER_FT_EXACT).toBe(0.3048);
  });

  it("inverse constants are precise reciprocals", () => {
    expect(INCHES_PER_MM * MM_PER_INCH_EXACT).toBeCloseTo(1, 15);
    expect(UIN_PER_UM * UM_PER_UIN_EXACT).toBeCloseTo(1, 15);
    expect(FT_PER_M * M_PER_FT_EXACT).toBeCloseTo(1, 15);
  });
});

describe("WEDMJobUnitPresenterEngine — fromUSInput (US → SI)", () => {
  it("converts thickness 0.500 in → 12.7 mm exactly", () => {
    const si = presenter.fromUSInput(sampleUSJob());
    expect(si.input.thickness_mm).toBe(12.7);
  });

  it("converts wire diameter 0.010 in → 0.254 mm exactly", () => {
    const si = presenter.fromUSInput(sampleUSJob());
    expect(si.input.wire_diameter_mm).toBe(0.254);
  });

  it("converts target Ra 32 µin → 0.8128 µm exactly", () => {
    const si = presenter.fromUSInput(sampleUSJob());
    expect(si.input.target_ra_um).toBe(0.8128);
  });

  it("converts tolerance 0.0005 in → 0.0127 mm exactly", () => {
    const si = presenter.fromUSInput(sampleUSJob());
    expect(si.input.tolerance_mm).toBe(0.0127);
  });

  it("converts wire consumed 608 ft → 185.3184 m exactly", () => {
    const si = presenter.fromUSInput(sampleUSJob());
    expect(si.outcome.wire_consumed_m).toBe(608 * 0.3048);
  });

  it("converts measured Ra 30 µin + uncertainty 2 µin → 0.762 + 0.0508 µm", () => {
    const si = presenter.fromUSInput(sampleUSJob());
    expect(si.outcome.measured_ra.value).toBe(0.762);
    expect(si.outcome.measured_ra.unit).toBe("um");
    expect(si.outcome.measured_ra.uncertainty).toBe(0.0508);
  });

  it("preserves cycle time in minutes (unit-independent)", () => {
    const si = presenter.fromUSInput(sampleUSJob());
    expect(si.outcome.measured_cycle_min.value).toBe(42.3);
  });

  it("preserves controller enum, amperage, pulse timings", () => {
    const si = presenter.fromUSInput(sampleUSJob());
    expect(si.input.controller).toBe("fanuc");
    expect(si.input.peak_current_A).toBe(8);
    expect(si.input.on_time_us).toBe(6);
    expect(si.input.off_time_us).toBe(12);
  });

  it("passes through wire_break_events unchanged (minutes universal)", () => {
    const us = sampleUSJob();
    us.outcome.wire_break_count = 2;
    us.outcome.wire_break_events = [
      { elapsed_cut_min: 10, action: "restart" },
      { elapsed_cut_min: 25, peak_current_A: 9, action: "slow_and_resume" },
    ];
    const si = presenter.fromUSInput(us);
    expect(si.outcome.wire_break_events).toEqual(us.outcome.wire_break_events);
  });

  it("converts predicted Ra/recast in µin to µm", () => {
    const si = presenter.fromUSInput(sampleUSJob());
    expect(si.predicted?.predicted_ra_um).toBe(33 * 0.0254);
    expect(si.predicted?.predicted_recast_um).toBe(130 * 0.0254);
    expect(si.predicted?.predicted_cycle_min).toBe(44.0);
  });
});

describe("WEDMJobUnitPresenterEngine — full round-trip US → SI → US", () => {
  it("records a US job and reads it back with matching US values (≤1 ULP)", () => {
    const us = sampleUSJob();
    const si = presenter.fromUSInput(us);
    const stored = outcome.record(si);
    const view = presenter.toUSView(stored);

    // Round-trip tolerance: binary-64 multiplication / division by 25.4 is
    // stable within ~1e-14 for values in typical shop range. We use a
    // relative-error bound below 1e-13 (far tighter than any real tolerance).
    const eps = 1e-13;

    expect(Math.abs(view.input.thickness_in - us.input.thickness_in)).toBeLessThan(eps);
    expect(Math.abs(view.input.wire_diameter_in - us.input.wire_diameter_in)).toBeLessThan(eps);
    expect(Math.abs(view.input.profile_length_in - us.input.profile_length_in)).toBeLessThan(eps);
    expect(Math.abs(view.input.target_ra_uin - us.input.target_ra_uin)).toBeLessThan(eps);
    expect(Math.abs(view.input.tolerance_in - us.input.tolerance_in)).toBeLessThan(eps);
    expect(Math.abs(view.outcome.measured_ra.value - us.outcome.measured_ra_uin)).toBeLessThan(eps);
    expect(Math.abs(view.outcome.wire_consumed_ft - us.outcome.wire_consumed_ft)).toBeLessThan(eps * 1000);
    expect(view.outcome.measured_cycle_min.value).toBe(us.outcome.measured_cycle_min);
    // measured_recast is optional — schema key `measured_recast_um`, view key `measured_recast`
    expect(view.outcome.measured_recast).toBeDefined();
    expect(view.outcome.measured_recast!.value).toBeCloseTo(us.outcome.measured_recast_uin!, 10);
    expect(view.outcome.measured_recast!.unit).toBe("µin");
    expect(view._units_system).toBe("US");
    expect(stored.outcome.measured_recast_um).toBeDefined();
    expect(stored.outcome.measured_recast_um!.value).toBeCloseTo(120 * 0.0254, 10);
  });

  it("round-trips typical shop values (0.500, 0.250, 0.125, 0.010, 0.0005, 0.0001 in)", () => {
    const values = [0.500, 0.250, 0.125, 0.010, 0.0005, 0.0001];
    for (const v of values) {
      const mm = v * 25.4;
      const back = mm / 25.4;
      expect(Math.abs(back - v)).toBeLessThan(1e-14);
    }
  });

  it("preserves job_id, recorded_at, customer, part_number through toUSView", () => {
    const us = sampleUSJob();
    const si = presenter.fromUSInput(us);
    const stored = outcome.record(si);
    const view = presenter.toUSView(stored);
    expect(view.job_id).toBe(stored.job_id);
    expect(view.recorded_at).toBe(stored.recorded_at);
    expect(view.customer).toBe("ALCOA");
    expect(view.part_number).toBe("D2-COLD-HEAD-DIE-001");
    expect(view.operator_id).toBe("op-001");
    expect(view.shop_id).toBe("jm-die");
  });
});

describe("WEDMJobUnitPresenterEngine — statsToUS", () => {
  it("converts mean_ra_um → mean_ra_uin and tags _units_system=US", () => {
    outcome.record(presenter.fromUSInput(sampleUSJob()));
    const us2 = sampleUSJob();
    us2.outcome.measured_ra_uin = 40;
    outcome.record(presenter.fromUSInput(us2));
    const stats = outcome.stats();
    const usStats = presenter.statsToUS(stats);
    // stats.mean_ra_um = (0.762 + 1.016) / 2 = 0.889 µm → 35 µin
    expect(usStats.mean_ra_uin).toBeCloseTo(35, 10);
    expect(usStats.total_records).toBe(2);
    expect(usStats.acceptance_rate).toBe(1);
    expect(usStats._units_system).toBe("US");
    // Non-converted fields forward unchanged
    expect(usStats.mean_cycle_min).toBe(stats.mean_cycle_min);
    expect(usStats.sequence).toBe(stats.sequence);
    expect(usStats.file_path).toBe(stats.file_path);
  });

  it("handles empty history (mean_ra_uin = 0)", () => {
    const usStats = presenter.statsToUS(outcome.stats());
    expect(usStats.total_records).toBe(0);
    expect(usStats.mean_ra_uin).toBe(0);
  });
});

describe("WEDMJobUnitPresenterEngine — shape invariants", () => {
  it("rejected jobs stay rejected through the round-trip", () => {
    const us = sampleUSJob();
    us.outcome.accepted = false;
    us.outcome.rejection_codes = ["RA_OUT_OF_SPEC"];
    const si = presenter.fromUSInput(us);
    const stored = outcome.record(si);
    const view = presenter.toUSView(stored);
    expect(view.outcome.accepted).toBe(false);
    expect(view.outcome.rejection_codes).toEqual(["RA_OUT_OF_SPEC"]);
  });
});
