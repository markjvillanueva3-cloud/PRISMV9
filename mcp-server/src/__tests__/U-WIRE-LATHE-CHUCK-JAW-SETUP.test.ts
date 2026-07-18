/**
 * U-WIRE-LATHE-CHUCK-JAW-SETUP — wiring-gate test
 * =================================================
 *
 * Verifies `lathe_chuck_jaw_compute` + `lathe_chuck_jaw_stats` route to
 * `LatheChuckJawSetupEngine.compute/getStats`.
 *
 * @module __tests__/U-WIRE-LATHE-CHUCK-JAW-SETUP
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  latheChuckJawSetupEngine,
  type LatheChuckJawInput,
} from "../engines/LatheChuckJawSetupEngine.js";
import { TURNING_ACTION_SCHEMAS } from "../schemas/turningActionSchemas.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DISPATCHER_SRC = readFileSync(
  join(__dirname, "..", "tools", "dispatchers", "turningDispatcher.ts"),
  "utf-8"
);
const SCHEMA_MAP = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;

const CANONICAL: LatheChuckJawInput = {
  part_od_mm: 50,
  part_od_tol_mm: 0.05,
  clamp_force_kn: 15,
  jaw_mass_kg: 2,
  jaw_centroid_radius_mm: 80,
  chuck_rated_max_rpm: 4000,
  operating_rpm: 2000,
  use_master_pressure: true,
};

describe("U-WIRE-LATHE-CHUCK-JAW-SETUP — turning-dispatcher wiring", () => {
  it("registers both actions in TURNING_ACTION_SCHEMAS", () => {
    if (!SCHEMA_MAP["lathe_chuck_jaw_compute"]) throw new Error("lathe_chuck_jaw_compute missing");
    if (!SCHEMA_MAP["lathe_chuck_jaw_stats"]) throw new Error("lathe_chuck_jaw_stats missing");
  });

  it("compute schema accepts canonical input", () => {
    expect(SCHEMA_MAP["lathe_chuck_jaw_compute"]!.safeParse(CANONICAL).success).toBe(true);
  });

  it("compute schema rejects non-positive part_od / clamp_force / jaw_mass / radius / max_rpm", () => {
    expect(SCHEMA_MAP["lathe_chuck_jaw_compute"]!.safeParse({ ...CANONICAL, part_od_mm: 0 }).success).toBe(false);
    expect(SCHEMA_MAP["lathe_chuck_jaw_compute"]!.safeParse({ ...CANONICAL, clamp_force_kn: -1 }).success).toBe(false);
    expect(SCHEMA_MAP["lathe_chuck_jaw_compute"]!.safeParse({ ...CANONICAL, jaw_mass_kg: 0 }).success).toBe(false);
    expect(SCHEMA_MAP["lathe_chuck_jaw_compute"]!.safeParse({ ...CANONICAL, jaw_centroid_radius_mm: 0 }).success).toBe(false);
    expect(SCHEMA_MAP["lathe_chuck_jaw_compute"]!.safeParse({ ...CANONICAL, chuck_rated_max_rpm: 0 }).success).toBe(false);
  });

  it("compute schema accepts operating_rpm = 0 (spindle stopped is legitimate)", () => {
    expect(SCHEMA_MAP["lathe_chuck_jaw_compute"]!.safeParse({ ...CANONICAL, operating_rpm: 0 }).success).toBe(true);
  });

  it("compute schema rejects missing required jaw_mass_kg", () => {
    const bad: Partial<LatheChuckJawInput> = { ...CANONICAL };
    delete (bad as { jaw_mass_kg?: unknown }).jaw_mass_kg;
    expect(SCHEMA_MAP["lathe_chuck_jaw_compute"]!.safeParse(bad).success).toBe(false);
  });

  it("stats schema accepts empty input", () => {
    expect(SCHEMA_MAP["lathe_chuck_jaw_stats"]!.safeParse({}).success).toBe(true);
  });

  it("dispatcher source contains action + case for both actions", () => {
    for (const a of ["lathe_chuck_jaw_compute", "lathe_chuck_jaw_stats"]) {
      expect(DISPATCHER_SRC.includes(`"${a}"`)).toBe(true);
      expect(DISPATCHER_SRC.includes(`case "${a}":`)).toBe(true);
    }
  });

  it("compute case routes to .compute (not the sibling getStats)", () => {
    const startIdx = DISPATCHER_SRC.indexOf('case "lathe_chuck_jaw_compute":');
    const endIdx = DISPATCHER_SRC.indexOf('case "', startIdx + 'case "lathe_chuck_jaw_compute":'.length);
    const block = DISPATCHER_SRC.slice(startIdx, endIdx > 0 ? endIdx : startIdx + 4000);
    expect(block.includes("latheChuckJawSetupEngine.compute(")).toBe(true);
    if (block.includes("latheChuckJawSetupEngine.getStats(")) throw new Error("compute case wired to getStats");
  });

  it("stats case routes to .getStats (not the sibling compute)", () => {
    const startIdx = DISPATCHER_SRC.indexOf('case "lathe_chuck_jaw_stats":');
    const endIdx = DISPATCHER_SRC.indexOf('case "', startIdx + 'case "lathe_chuck_jaw_stats":'.length);
    const block = DISPATCHER_SRC.slice(startIdx, endIdx > 0 ? endIdx : startIdx + 4000);
    expect(block.includes("latheChuckJawSetupEngine.getStats(")).toBe(true);
    if (block.includes("latheChuckJawSetupEngine.compute(")) throw new Error("stats case wired to compute");
  });
});

describe("U-WIRE-LATHE-CHUCK-JAW-SETUP — engine semantic round-trip", () => {
  it("bore = part_od - 2*springback (springback compensation formula)", () => {
    const r = latheChuckJawSetupEngine.compute(CANONICAL);
    expect(r.bore_diameter_mm).toBeGreaterThan(0);
    // Engine guarantees bore ≤ part_od (never over-bore). For tiny springbacks the
    // rounded result can land EXACTLY at part_od — strict-less would false-fail.
    expect(r.bore_diameter_mm).toBeLessThanOrEqual(CANONICAL.part_od_mm);
    expect(r.springback_mm).toBeGreaterThan(0);
    expect(r.bore_diameter_mm).toBeCloseTo(CANONICAL.part_od_mm - 2 * r.springback_mm, 2);
    // Higher clamp force MUST produce a strictly tighter (smaller) bore — this
    // catches a bug in the formula that the rounding-tolerant test misses.
    const heavy = latheChuckJawSetupEngine.compute({ ...CANONICAL, clamp_force_kn: 100 });
    if (heavy.bore_diameter_mm >= r.bore_diameter_mm) {
      throw new Error(`heavier clamp must shrink bore — light=${r.bore_diameter_mm} heavy=${heavy.bore_diameter_mm}`);
    }
    expect(heavy.springback_mm).toBeGreaterThan(r.springback_mm);
  });

  it("min_grip_length = max(3mm, 0.2 × part_od) per ISO 16156 — 10mm for 50mm part", () => {
    const r = latheChuckJawSetupEngine.compute(CANONICAL);
    expect(r.min_grip_length_mm).toBeCloseTo(10, 1);
    // Small-OD edge case: 12mm part → max(3, 0.2*12)=3mm floor.
    const small = latheChuckJawSetupEngine.compute({ ...CANONICAL, part_od_mm: 12 });
    expect(small.min_grip_length_mm).toBeCloseTo(3, 1);
  });

  it("recommended_grip_length is exactly 1.5× the minimum (50% safety margin)", () => {
    const r = latheChuckJawSetupEngine.compute(CANONICAL);
    expect(r.recommended_grip_length_mm).toBeCloseTo(r.min_grip_length_mm * 1.5, 2);
  });

  it("operating_rpm well under safe limit returns operating_rpm_safe=true", () => {
    const r = latheChuckJawSetupEngine.compute({ ...CANONICAL, operating_rpm: 500 });
    expect(r.operating_rpm_safe).toBe(true);
  });

  it("operating_rpm above rated chuck max returns operating_rpm_safe=false + RPM warning", () => {
    const r = latheChuckJawSetupEngine.compute({ ...CANONICAL, operating_rpm: 5000 });
    expect(r.operating_rpm_safe).toBe(false);
    if (!r.warnings.some((w) => /RPM|rpm/.test(w))) {
      throw new Error("expected an RPM-related warning when operating > rated");
    }
  });

  it("use_master_pressure=false adds a master-pressure recommendation warning", () => {
    const r = latheChuckJawSetupEngine.compute({ ...CANONICAL, use_master_pressure: false });
    if (!r.warnings.some((w) => /master pressure/i.test(w))) {
      throw new Error("expected a 'master pressure' recommendation warning");
    }
  });

  it("step_required=true populates a positive step_face_depth_mm; otherwise the field is omitted", () => {
    const without = latheChuckJawSetupEngine.compute(CANONICAL);
    // Step field is omitted when step_required is not set — guard with explicit throw,
    // not a toBeUndefined() weak-presence assertion.
    if (without.step_face_depth_mm !== undefined) {
      throw new Error(`step_face_depth_mm should be omitted when step_required is unset — got ${without.step_face_depth_mm}`);
    }
    const withStep = latheChuckJawSetupEngine.compute({ ...CANONICAL, step_required: true, step_z_mm: 5 });
    if (typeof withStep.step_face_depth_mm !== "number") {
      throw new Error("expected step_face_depth_mm to be a number when step_required=true");
    }
    expect(withStep.step_face_depth_mm).toBeGreaterThanOrEqual(2);
    // The formula is max(2, step_z + 1) — with step_z=5 we expect 6mm.
    expect(withStep.step_face_depth_mm).toBeCloseTo(6, 1);
  });

  it("getStats returns ISO-16156-citing reference string", () => {
    const s = latheChuckJawSetupEngine.getStats();
    expect(typeof s.reference).toBe("string");
    expect(s.reference.length).toBeGreaterThan(0);
    expect(s.reference).toContain("ISO 16156");
  });
});
