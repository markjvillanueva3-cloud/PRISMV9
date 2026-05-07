/**
 * WEDMJobOutcomeEngine.test.ts — MS-P4-DL-CORE / U-P4-DL-01
 *
 * Exit-criteria coverage:
 *   • 10 synthetic jobs record+replay bit-exact via the engine
 *   • WEDM_JOB_HISTORY.json Zod-parses (schema v1 stable)
 *   • ≥ 10 cases including zero/negative/extreme cycle times
 *   • No banned patterns (.toBeGreaterThan(0) / .toBeLessThan(1000) / bare .includes())
 */

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WEDMJobOutcomeEngine } from "../engines/WEDMJobOutcomeEngine.js";
import {
  WEDMJobHistoryFileSchema,
  type WEDMJobRecord,
} from "../schemas/wedmJobHistorySchema.js";

// ─────────────────────────────────────────────────────────────────────────────
// TEST FIXTURES — canonical recorded jobs
// ─────────────────────────────────────────────────────────────────────────────

function acceptedD2Job(
  overrides: Partial<Omit<WEDMJobRecord, "job_id" | "recorded_at">> = {},
): Omit<WEDMJobRecord, "job_id" | "recorded_at"> {
  return {
    shop_id: "jm-die",
    machine_id: "MS-WedM-01",
    operator_id: "op-001",
    customer: "ALCOA",
    part_number: "D2-PROG-001",
    program_file: "D2_25mm.NC",
    input: {
      material: "D2",
      hardness_hrc: 60,
      thickness_mm: 25,
      wire_diameter_mm: 0.25,
      wire_material: "brass",
      profile_length_mm: 100,
      num_passes: 4,
      target_ra_um: 0.8,
      tolerance_mm: 0.005,
      controller: "fanuc",
      peak_current_A: 8,
      on_time_us: 6,
      off_time_us: 12,
    },
    outcome: {
      measured_ra: { value: 0.75, unit: "um", source: "cmm", uncertainty: 0.05 },
      measured_cycle_min: { value: 42.3, unit: "min", source: "controller" },
      wire_break_count: 0,
      wire_break_events: [],
      wire_consumed_m: 185.4,
      accepted: true,
      rejection_codes: [],
    },
    predicted: {
      predicted_ra_um: 0.82,
      predicted_cycle_min: 44.0,
      predicted_wire_break_probability: 0.12,
      model_name: "Klocke-baseline",
      model_version: "v1",
    },
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMP-FILE FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

let tmpDir: string;
let tmpFile: string;
let engine: WEDMJobOutcomeEngine;
let fixedClock: number;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "wedm-job-outcome-"));
  tmpFile = join(tmpDir, "WEDM_JOB_HISTORY.json");
  fixedClock = Date.parse("2026-04-21T18:00:00Z");
  engine = new WEDMJobOutcomeEngine({
    filePath: tmpFile,
    nowFn: () => fixedClock,
  });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("WEDMJobOutcomeEngine — schema-v1 persistence and replay", () => {
  it("records one job and persists a file that Zod-parses as schema v1", () => {
    const stored = engine.record(acceptedD2Job());
    const raw = readFileSync(tmpFile, "utf8");
    const parsed = WEDMJobHistoryFileSchema.parse(JSON.parse(raw));
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.sequence).toBe(1);
    expect(parsed.records).toHaveLength(1);
    expect(parsed.records[0].job_id).toBe(stored.job_id);
    expect(parsed.records[0].input.material).toBe("D2");
    expect(parsed.records[0].outcome.measured_ra.value).toBeCloseTo(0.75, 10);
  });

  it("fills ULID job_id (26 chars, Crockford base32) and ISO-8601 UTC recorded_at", () => {
    const stored = engine.record(acceptedD2Job());
    expect(stored.job_id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(stored.recorded_at).toBe("2026-04-21T18:00:00Z");
  });

  it("ten synthetic jobs round-trip bit-exact (record → load)", () => {
    const recorded: WEDMJobRecord[] = [];
    for (let i = 0; i < 10; i++) {
      fixedClock = Date.parse("2026-04-21T18:00:00Z") + i * 60_000;
      recorded.push(
        engine.record(
          acceptedD2Job({
            machine_id: `MS-WedM-${String(i + 1).padStart(2, "0")}`,
            outcome: {
              measured_ra: { value: 0.7 + 0.01 * i, unit: "um", source: "cmm" },
              measured_cycle_min: { value: 40 + i, unit: "min", source: "controller" },
              wire_break_count: 0,
              wire_break_events: [],
              wire_consumed_m: 180 + i,
              accepted: true,
              rejection_codes: [],
            },
          }),
        ),
      );
    }
    const reloaded = engine.load();
    expect(reloaded.records).toHaveLength(10);
    expect(reloaded.sequence).toBe(10);
    for (let i = 0; i < 10; i++) {
      expect(reloaded.records[i]).toEqual(recorded[i]);
    }
  });

  it("monotonic sequence counter increments by exactly +1 per record", () => {
    for (let i = 1; i <= 5; i++) {
      engine.record(acceptedD2Job());
      expect(engine.load().sequence).toBe(i);
    }
  });

  it("accepts zero cycle time (edge case — job aborted before first cut)", () => {
    const stored = engine.record(
      acceptedD2Job({
        outcome: {
          measured_ra: { value: 0, unit: "um", source: "derived" },
          measured_cycle_min: { value: 0, unit: "min", source: "controller" },
          wire_break_count: 0,
          wire_break_events: [],
          wire_consumed_m: 0,
          accepted: false,
          rejection_codes: ["ABORT_PRE_CUT"],
        },
      }),
    );
    expect(stored.outcome.measured_cycle_min.value).toBe(0);
    expect(stored.outcome.accepted).toBe(false);
  });

  it("rejects negative cycle time at the schema boundary", () => {
    expect(() =>
      engine.record(
        acceptedD2Job({
          outcome: {
            measured_ra: { value: 0.75, unit: "um", source: "cmm" },
            measured_cycle_min: { value: -5, unit: "min", source: "controller" },
            wire_break_count: 0,
            wire_break_events: [],
            wire_consumed_m: 0,
            accepted: false,
            rejection_codes: ["INVALID"],
          },
        }),
      ),
    ).toThrowError(/must be ≥ 0/);
  });

  it("rejects NaN Ra via finite-number refinement", () => {
    expect(() =>
      engine.record(
        acceptedD2Job({
          outcome: {
            measured_ra: { value: Number.NaN, unit: "um", source: "cmm" },
            measured_cycle_min: { value: 42, unit: "min", source: "controller" },
            wire_break_count: 0,
            wire_break_events: [],
            wire_consumed_m: 180,
            accepted: true,
            rejection_codes: [],
          },
        }),
      ),
    ).toThrowError(/NaN|finite/);
  });

  it("accepts extreme cycle time (48-hour job — 2880 min) without overflow", () => {
    const stored = engine.record(
      acceptedD2Job({
        outcome: {
          measured_ra: { value: 0.6, unit: "um", source: "cmm" },
          measured_cycle_min: { value: 2880, unit: "min", source: "controller" },
          wire_break_count: 0,
          wire_break_events: [],
          wire_consumed_m: 15_000,
          accepted: true,
          rejection_codes: [],
        },
      }),
    );
    expect(stored.outcome.measured_cycle_min.value).toBe(2880);
  });

  it("enforces wire_break_events.length === wire_break_count", () => {
    expect(() =>
      engine.record(
        acceptedD2Job({
          outcome: {
            measured_ra: { value: 0.75, unit: "um", source: "cmm" },
            measured_cycle_min: { value: 50, unit: "min", source: "controller" },
            wire_break_count: 2,
            // Only 1 event but count says 2 → schema rejects
            wire_break_events: [{ elapsed_cut_min: 20, action: "restart" }],
            wire_consumed_m: 200,
            accepted: true,
            rejection_codes: [],
          },
        }),
      ),
    ).toThrowError(/wire_break_events\.length/);
  });

  it("rejects accepted job with non-empty rejection_codes (invariant)", () => {
    expect(() =>
      engine.record(
        acceptedD2Job({
          outcome: {
            measured_ra: { value: 0.75, unit: "um", source: "cmm" },
            measured_cycle_min: { value: 42, unit: "min", source: "controller" },
            wire_break_count: 0,
            wire_break_events: [],
            wire_consumed_m: 180,
            accepted: true,
            rejection_codes: ["SHOULD_BE_EMPTY"],
          },
        }),
      ),
    ).toThrowError(/accepted jobs must have empty rejection_codes/);
  });

  it("rejects rejected job with empty rejection_codes (invariant)", () => {
    expect(() =>
      engine.record(
        acceptedD2Job({
          outcome: {
            measured_ra: { value: 1.2, unit: "um", source: "cmm" },
            measured_cycle_min: { value: 42, unit: "min", source: "controller" },
            wire_break_count: 0,
            wire_break_events: [],
            wire_consumed_m: 180,
            accepted: false,
            rejection_codes: [],
          },
        }),
      ),
    ).toThrowError(/rejected jobs must include at least one rejection_code/);
  });

  it("findByMaterial filters correctly across mixed records", () => {
    engine.record(acceptedD2Job({ input: { ...acceptedD2Job().input, material: "D2" } }));
    engine.record(acceptedD2Job({ input: { ...acceptedD2Job().input, material: "M2" } }));
    engine.record(acceptedD2Job({ input: { ...acceptedD2Job().input, material: "D2" } }));
    engine.record(acceptedD2Job({ input: { ...acceptedD2Job().input, material: "WC" } }));
    expect(engine.findByMaterial("D2")).toHaveLength(2);
    expect(engine.findByMaterial("M2")).toHaveLength(1);
    expect(engine.findByMaterial("WC")).toHaveLength(1);
    expect(engine.findByMaterial("S7")).toHaveLength(0);
  });

  it("stats aggregates correctly (material counts, acceptance rate, means)", () => {
    engine.record(
      acceptedD2Job({
        outcome: {
          measured_ra: { value: 0.7, unit: "um", source: "cmm" },
          measured_cycle_min: { value: 40, unit: "min", source: "controller" },
          wire_break_count: 1,
          wire_break_events: [{ elapsed_cut_min: 10, action: "restart" }],
          wire_consumed_m: 180,
          accepted: true,
          rejection_codes: [],
        },
      }),
    );
    engine.record(
      acceptedD2Job({
        input: { ...acceptedD2Job().input, material: "M2" },
        outcome: {
          measured_ra: { value: 0.9, unit: "um", source: "cmm" },
          measured_cycle_min: { value: 60, unit: "min", source: "controller" },
          wire_break_count: 0,
          wire_break_events: [],
          wire_consumed_m: 220,
          accepted: false,
          rejection_codes: ["BAD_FINISH"],
        },
      }),
    );
    const s = engine.stats();
    expect(s.total_records).toBe(2);
    expect(s.sequence).toBe(2);
    expect(s.materials).toEqual({ D2: 1, M2: 1 });
    expect(s.acceptance_rate).toBeCloseTo(0.5, 10);
    expect(s.total_wire_break_events).toBe(1);
    expect(s.mean_cycle_min).toBeCloseTo(50, 10);
    expect(s.mean_ra_um).toBeCloseTo(0.8, 10);
  });

  it("load() returns empty envelope when file absent (cold start)", () => {
    rmSync(tmpFile, { force: true });
    const file = engine.load();
    expect(file.schemaVersion).toBe(1);
    expect(file.sequence).toBe(0);
    expect(file.records).toEqual([]);
  });

  it("atomic write — .tmp sibling is removed after rename", () => {
    engine.record(acceptedD2Job());
    const tmpSibling = tmpFile + ".tmp";
    // After successful rename, .tmp should not exist.
    expect(() => readFileSync(tmpSibling, "utf8")).toThrow();
    // Target file should exist and be parseable.
    const final = JSON.parse(readFileSync(tmpFile, "utf8"));
    expect(WEDMJobHistoryFileSchema.safeParse(final).success).toBe(true);
  });

  it("round-trips wire_break events with full action taxonomy", () => {
    const stored = engine.record(
      acceptedD2Job({
        outcome: {
          measured_ra: { value: 0.8, unit: "um", source: "cmm" },
          measured_cycle_min: { value: 90, unit: "min", source: "controller" },
          wire_break_count: 3,
          wire_break_events: [
            { elapsed_cut_min: 15, peak_current_A: 10, action: "restart" },
            { elapsed_cut_min: 45, action: "slow_and_resume" },
            { elapsed_cut_min: 80, action: "abort" },
          ],
          wire_consumed_m: 400,
          accepted: false,
          rejection_codes: ["WIRE_BREAKS_EXCEEDED"],
        },
      }),
    );
    expect(stored.outcome.wire_break_events).toHaveLength(3);
    expect(stored.outcome.wire_break_events[0].action).toBe("restart");
    expect(stored.outcome.wire_break_events[1].action).toBe("slow_and_resume");
    expect(stored.outcome.wire_break_events[2].action).toBe("abort");
  });
});
