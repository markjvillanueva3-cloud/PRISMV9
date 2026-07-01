/**
 * Tests for ElectrodePairingEngine — sinker-EDM electrode rougher/finisher
 * pairing (ARC-MS6 / muS-C22).
 *
 * The engine parses filenames + groups by cavity_id + (optionally) validates
 * stage sizing. Every assertion below is hand-derived from the documented
 * behaviour — each fails if the pattern matcher, the grouping, or the
 * sizing-rule validator regresses.
 */

import { describe, it, expect } from "vitest";
import {
  ElectrodePairingEngine,
  electrodePairingEngine,
} from "../engines/ElectrodePairingEngine.js";

describe("ElectrodePairingEngine — basic pattern matching", () => {
  it("groups a canonical rough/semi/finish set into one complete cavity", () => {
    const r = electrodePairingEngine.pair({
      files: ["WAFER880_R.NC", "WAFER880_S.NC", "WAFER880_F.NC"],
    });
    expect(r.total_sets).toBe(1);
    expect(r.complete_sets).toBe(1);
    expect(r.usable_sets).toBe(1);
    expect(r.unpaired).toEqual([]);
    const set = r.electrode_sets[0];
    expect(set.cavity_id).toBe("WAFER880.NC");
    expect(set.is_complete).toBe(true);
    expect(set.is_usable).toBe(true);
    expect(set.stages.map((s) => s.stage)).toEqual(["rough", "semi", "finish"]);
  });

  it("emits stages in cutting order (rough → semi → finish), not input order", () => {
    const r = electrodePairingEngine.pair({
      // input order is finish/rough/semi — engine must reorder.
      files: ["X_F.NC", "X_R.NC", "X_S.NC"],
    });
    expect(r.electrode_sets[0].stages.map((s) => s.stage)).toEqual([
      "rough",
      "semi",
      "finish",
    ]);
  });

  it("matches the word patterns (_ROUGH / _SEMI / _FINISH)", () => {
    const r = electrodePairingEngine.pair({
      files: ["DIE_ROUGH.NC", "DIE_SEMI.NC", "DIE_FINISH.NC"],
    });
    expect(r.total_sets).toBe(1);
    expect(r.electrode_sets[0].is_complete).toBe(true);
    expect(r.electrode_sets[0].cavity_id).toBe("DIE.NC");
  });

  it("matches the prefix patterns (R_ / F_)", () => {
    const r = electrodePairingEngine.pair({
      files: ["R_PART.NC", "F_PART.NC"],
    });
    expect(r.total_sets).toBe(1);
    const set = r.electrode_sets[0];
    expect(set.has_rough).toBe(true);
    expect(set.has_finish).toBe(true);
    expect(set.has_semi).toBe(false);
    expect(set.is_usable).toBe(true);
    expect(set.is_complete).toBe(false);
  });

  it("is case-insensitive on the stage tag", () => {
    const r = electrodePairingEngine.pair({
      files: ["wafer_r.nc", "wafer_f.nc"],
    });
    expect(r.total_sets).toBe(1);
    expect(r.electrode_sets[0].is_usable).toBe(true);
  });
});

describe("ElectrodePairingEngine — multi-cavity & unpaired", () => {
  it("separates multiple cavities into independent sets", () => {
    const r = electrodePairingEngine.pair({
      files: ["A_R.NC", "A_F.NC", "B_R.NC", "B_F.NC"],
    });
    expect(r.total_sets).toBe(2);
    expect(r.usable_sets).toBe(2);
    expect(r.complete_sets).toBe(0); // neither has a semi
    expect(r.electrode_sets.map((s) => s.cavity_id)).toEqual([
      "A.NC",
      "B.NC",
    ]);
  });

  it("reports files that match no stage pattern as unpaired", () => {
    const r = electrodePairingEngine.pair({
      files: ["WAFER_R.NC", "README.txt", "tooling-spec.pdf"],
    });
    expect(r.total_sets).toBe(1);
    expect(r.unpaired.sort()).toEqual(["README.txt", "tooling-spec.pdf"]);
    expect(r.notes.some((n) => n.includes("matched no stage pattern"))).toBe(
      true,
    );
  });

  it("does not false-match mid-word substrings", () => {
    // _RIM contains R but is not a rough tag — must be unpaired.
    // PART_FOO is not _F followed by a boundary char — unpaired.
    const r = electrodePairingEngine.pair({
      files: ["WHEEL_RIM.NC", "PART_FOO.NC"],
    });
    expect(r.total_sets).toBe(0);
    expect(r.unpaired.sort()).toEqual(["PART_FOO.NC", "WHEEL_RIM.NC"]);
  });
});

describe("ElectrodePairingEngine — stage index & duplicates", () => {
  it("captures trailing digits on the stage tag as stage_index", () => {
    const r = electrodePairingEngine.pair({
      files: ["Y_R1.NC", "Y_FINISH3.NC"],
    });
    const stages = r.electrode_sets[0].stages;
    const rough = stages.find((s) => s.stage === "rough")!;
    const finish = stages.find((s) => s.stage === "finish")!;
    expect(rough.stage_index).toBe(1);
    expect(finish.stage_index).toBe(3);
  });

  it("keeps the lowest-indexed file when two files share a stage", () => {
    const r = electrodePairingEngine.pair({
      files: ["X_R1.NC", "X_R2.NC"],
    });
    const set = r.electrode_sets[0];
    expect(set.stages).toHaveLength(1);
    expect(set.stages[0].file).toBe("X_R1.NC");
    expect(set.stages[0].stage_index).toBe(1);
    expect(set.warnings.some((w) => w.includes("X_R2.NC"))).toBe(true);
  });
});

describe("ElectrodePairingEngine — sizing-rule validation", () => {
  it("passes when stages decrease in size (rough ≥ semi ≥ finish)", () => {
    // Use a COMPLETE 3-stage set so only the sizing assertion is load-bearing
    // (an incomplete set would also push an incomplete-set warning).
    const r = electrodePairingEngine.pair({
      files: ["A_R.NC", "A_S.NC", "A_F.NC"],
      electrode_dimensions_mm: {
        "A_R.NC": { length: 10, width: 10 },
        "A_S.NC": { length: 9, width: 9 },
        "A_F.NC": { length: 8, width: 8 },
      },
    });
    expect(r.electrode_sets[0].sizing_consistent).toBe(true);
    expect(r.warnings).toHaveLength(0);
  });

  it("flags a violation when finish is larger than rough", () => {
    const r = electrodePairingEngine.pair({
      files: ["B_R.NC", "B_S.NC", "B_F.NC"],
      electrode_dimensions_mm: {
        "B_R.NC": { length: 8, width: 8 },
        "B_S.NC": { length: 9, width: 9 },
        "B_F.NC": { length: 10, width: 10 }, // wrong — finish bigger than rough
      },
    });
    expect(r.electrode_sets[0].sizing_consistent).toBe(false);
    expect(
      r.warnings.some((w) => w.includes("sizing violates cutting order")),
    ).toBe(true);
  });

  it("leaves sizing_consistent as null when no dimensions are supplied", () => {
    const r = electrodePairingEngine.pair({
      files: ["A_R.NC", "A_F.NC"],
    });
    expect(r.electrode_sets[0].sizing_consistent).toBeNull();
    expect(r.notes.some((n) => n.includes("sizing-rule validation skipped"))).toBe(
      true,
    );
  });
});

describe("ElectrodePairingEngine — completeness warnings", () => {
  it("warns on an incomplete set by default", () => {
    const r = electrodePairingEngine.pair({
      files: ["LONE_R.NC"], // rough only — missing semi + finish
    });
    expect(r.electrode_sets[0].is_complete).toBe(false);
    expect(r.electrode_sets[0].is_usable).toBe(false); // needs rough + finish
    expect(
      r.warnings.some(
        (w) => w.includes("LONE.NC") && w.includes("incomplete set"),
      ),
    ).toBe(true);
  });

  it("suppresses the incomplete-set warning when opted out", () => {
    const r = electrodePairingEngine.pair({
      files: ["LONE_R.NC"],
      warn_on_incomplete: false,
    });
    expect(
      r.warnings.some((w) => w.includes("incomplete set")),
    ).toBe(false);
  });
});

describe("ElectrodePairingEngine — edge cases", () => {
  it("handles an empty file list with an explanatory note", () => {
    const r = electrodePairingEngine.pair({ files: [] });
    expect(r.total_files).toBe(0);
    expect(r.total_sets).toBe(0);
    expect(r.electrode_sets).toEqual([]);
    expect(r.unpaired).toEqual([]);
    expect(r.notes.some((n) => n.includes("No input files"))).toBe(true);
  });

  it("is deterministic and orders sets by cavity_id alphabetically", () => {
    const r1 = electrodePairingEngine.pair({
      files: ["Z_R.NC", "Z_F.NC", "A_R.NC", "A_F.NC", "M_R.NC", "M_F.NC"],
    });
    const r2 = electrodePairingEngine.pair({
      files: ["Z_R.NC", "Z_F.NC", "A_R.NC", "A_F.NC", "M_R.NC", "M_F.NC"],
    });
    expect(r1).toEqual(r2);
    expect(r1.electrode_sets.map((s) => s.cavity_id)).toEqual([
      "A.NC",
      "M.NC",
      "Z.NC",
    ]);
  });

  it("works through a freshly constructed engine instance, not only the singleton", () => {
    const fresh = new ElectrodePairingEngine();
    const r = fresh.pair({
      files: ["WAFER_R.NC", "WAFER_F.NC"],
    });
    expect(r.total_sets).toBe(1);
    expect(r.electrode_sets[0].is_usable).toBe(true);
  });
});

describe("ElectrodePairingEngine — input validation", () => {
  it("throws an engine-named error on bad input", () => {
    expect(() => electrodePairingEngine.pair({})).toThrow(
      /ElectrodePairingEngine: invalid input/,
    );
    expect(() => electrodePairingEngine.pair({ files: "not-an-array" })).toThrow();
    expect(() => electrodePairingEngine.pair({ files: [""] })).toThrow();
    expect(() =>
      electrodePairingEngine.pair({ files: ["A_R.NC"], bogus: 1 }),
    ).toThrow();
  });

  it("rejects an invalid dimensions entry", () => {
    expect(() =>
      electrodePairingEngine.pair({
        files: ["A_R.NC"],
        electrode_dimensions_mm: { "A_R.NC": { length: -1, width: 5 } },
      }),
    ).toThrow();
  });
});
