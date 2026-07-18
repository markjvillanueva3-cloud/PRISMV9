/**
 * E2E test for LATHE-DB-WIRE-MS0/U-GAP-WIRE — wires 4 dormant lathe DBs +
 * the on-axis drilling canned-cycle validator onto the prism_turning surface
 * (matrix rows 5b/6/8d). 4 new actions:
 *   lathe_insert_grade_lookup · lathe_toolholder_lookup · lathe_boring_bar_select
 *   lathe_canned_cycle_validate
 * (row 7b lathe_workholding_catalog_lookup deferred — MonolithWorkholdingDatabaseEngine absent from this slot.)
 *
 * Real-behavior assertions on the underlying DBs (proving the data the new
 * actions now expose is non-empty + correct) + dispatcher/schema wiring checks.
 */
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import {
  getGradesByMaterial,
  getFinishingGrades,
  getRoughingGrades,
  SANDVIK_OD_TURNING_HOLDERS,
  SANDVIK_CAPTO_BORING_BARS,
  SANDVIK_SHANK_BORING_BARS,
  getCaptoHoldersBySize,
} from "../data/lathe-tooling-catalog.js";
import { ppCannedCycleValidatorEngine } from "../engines/PPCannedCycleValidatorEngine.js";
import { okumaOSPParserEngine } from "../engines/OkumaOSPParserEngine.js";

// NOTE: lathe_workholding_catalog_lookup (matrix row 7b) deferred — MonolithWorkholdingDatabaseEngine
// is not yet in slot/whiskey (1543 commits behind integration). Wire + test after the slot syncs.
const NEW_ACTIONS = [
  "lathe_insert_grade_lookup",
  "lathe_toolholder_lookup",
  "lathe_boring_bar_select",
  "lathe_canned_cycle_validate",
  "okuma_osp_parse",
] as const;

const CAPTO_SIZES = ["C3", "C4", "C5", "C6", "C8"] as const;

describe("LATHE-DB-WIRE-MS0 — underlying DBs return real data (the dead data is real)", () => {
  it("insert-grade catalog: P-group grades non-empty, carry manufacturer + speedRange", () => {
    const grades = getGradesByMaterial("P");
    expect(grades.length).toBeGreaterThan(0);
    expect(grades.every((g) => typeof g.manufacturer === "string" && g.manufacturer.length > 0)).toBe(true);
    expect(grades.some((g) => g.speedRange && Object.keys(g.speedRange).length > 0)).toBe(true);
  });

  it("finishing + roughing grade filters return non-empty steel (P) sets", () => {
    expect(getFinishingGrades("P").length).toBeGreaterThan(0);
    expect(getRoughingGrades("P").length).toBeGreaterThan(0);
  });

  it("toolholder catalog: Sandvik OD holders non-empty with ISO-5608 designation", () => {
    expect(SANDVIK_OD_TURNING_HOLDERS.length).toBeGreaterThan(0);
    expect(
      SANDVIK_OD_TURNING_HOLDERS.every((h) => typeof h.designation === "string" && h.designation.length > 0),
    ).toBe(true);
  });

  it("getCaptoHoldersBySize: filter is correct (returns only the asked size) + ≥1 Capto holder exists", () => {
    const all = CAPTO_SIZES.flatMap((s) => getCaptoHoldersBySize(s));
    expect(all.length).toBeGreaterThan(0); // at least one Capto holder across all sizes
    for (const s of CAPTO_SIZES) {
      expect(getCaptoHoldersBySize(s).every((h) => h.mountingSize === s)).toBe(true);
    }
  });

  it("boring-bar catalog: Capto + shank boring bars non-empty with mountingSize", () => {
    const bars = [...SANDVIK_CAPTO_BORING_BARS, ...SANDVIK_SHANK_BORING_BARS];
    expect(bars.length).toBeGreaterThan(0);
    expect(bars.every((b) => typeof b.mountingSize === "string")).toBe(true);
  });

  it("canned-cycle validator FAILS a G84 tap without rigid-tap arm (real drilling-cycle defect)", () => {
    const bad = ppCannedCycleValidatorEngine.validate("N10 G84 X0 Z-10 R2 F1.0");
    expect(bad.total_issues).toBeGreaterThan(0);
    expect(bad.issues.some((i) => i.kind === "tap_without_rigid_mode")).toBe(true);
  });

  it("canned-cycle validator PASSES a well-formed G83 peck (R-plane + Q present)", () => {
    const good = ppCannedCycleValidatorEngine.validate("N10 G98 G83 X0 Z-20 R2 Q3 F0.2\nN20 G80");
    expect(good.summary.cycles_seen).toContain("G83"); // positive proof the cycle was recognized (not an empty no-op)
    expect(good.issues.some((i) => i.kind === "missing_peck_q" || i.kind === "missing_r_plane")).toBe(false);
  });

  it("okuma_osp_parse: parses OSP text into a structured OkumaProgram tied to the given filename", () => {
    const prog = okumaOSPParserEngine.parse("G0 X100 Z50\nG96 S200 M03\nG01 X50 F0.2", "demo.min");
    expect(prog.filename).toBe("demo.min"); // non-vacuous: output reflects the actual input
    expect(Array.isArray(prog.toolSections)).toBe(true);
    expect(Array.isArray(prog.variables)).toBe(true);
    expect(typeof prog.hasThreading).toBe("boolean");
  });
});

describe("LATHE-DB-WIRE-MS0 — dispatcher + schema wiring", () => {
  it("turningDispatcher source has a case-block + ACTIONS entry for each new action", async () => {
    const src = await fsp.readFile(
      path.resolve(__dirname, "..", "tools", "dispatchers", "turningDispatcher.ts"),
      "utf8",
    );
    for (const a of NEW_ACTIONS) {
      expect(src.includes(`case "${a}":`)).toBe(true);
      expect(src.includes(`"${a}",`)).toBe(true);
    }
  });

  it("each new action has a schema in TURNING_ACTION_SCHEMAS with a safeParse fn", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const m = TURNING_ACTION_SCHEMAS as Record<string, { safeParse?: unknown }>;
    for (const a of NEW_ACTIONS) expect(typeof m[a]?.safeParse).toBe("function");
  });

  it("insert-grade schema requires isoGroup; rejects empty/string/null", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const m = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    expect(m.lathe_insert_grade_lookup!.safeParse({ isoGroup: "P" }).success).toBe(true);
    expect(m.lathe_insert_grade_lookup!.safeParse({ isoGroup: "Z" }).success).toBe(false);
    expect(m.lathe_insert_grade_lookup!.safeParse({}).success).toBe(false);
    expect(m.lathe_insert_grade_lookup!.safeParse("x").success).toBe(false);
    expect(m.lathe_insert_grade_lookup!.safeParse(null).success).toBe(false);
  });

  it("canned-cycle-validate schema requires program_text", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const m = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    expect(m.lathe_canned_cycle_validate!.safeParse({ program_text: "G84 X0" }).success).toBe(true);
    expect(m.lathe_canned_cycle_validate!.safeParse({ program_text: "" }).success).toBe(false);
    expect(m.lathe_canned_cycle_validate!.safeParse({}).success).toBe(false);
  });

  it("optional-only schemas accept {} but reject array/null", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const m = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    expect(m.lathe_toolholder_lookup!.safeParse({}).success).toBe(true);
    expect(m.lathe_boring_bar_select!.safeParse({}).success).toBe(true);
    expect(m.lathe_toolholder_lookup!.safeParse(null).success).toBe(false);
    expect(m.lathe_boring_bar_select!.safeParse([]).success).toBe(false);
  });
});
