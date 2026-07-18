/**
 * WorkholdingDB — single-source generator drift guard.
 * (JULIETT-DB-COVERAGE-MS0 / U-WORKHOLDING-MIRROR-GEN)
 *
 * SAFETY CRITICAL. Verifies the discovery mirror in WorkholdingDB.json is GENERATED
 * from — and stays in sync with — the canonical WorkholdingEngine.ts constants. The
 * file-backed DB JSON (loaded by DatabaseRegistry for prism_data:database_search) must
 * never drift from the engine the live clamping-force safety path uses. The original
 * hand-maintained mirror HAD drifted: 5 of 7 SAFETY_FACTORS, 0 of 2 vacuum/magnetic
 * tables. These tests lock the fix in.
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import {
  buildEngineSections,
  generate,
  workholdingRowCount,
  WORKHOLDING_DB_PATH,
} from "../../scripts/generate-workholding-db.js";
import {
  FRICTION_COEFFICIENTS,
  DYNAMIC_FACTORS,
  SAFETY_FACTORS,
  VACUUM_SEAL_EFFICIENCY,
  MAGNETIC_PERMEABILITY,
} from "../engines/WorkholdingEngine.js";

/** Strip the human-readable caption so the bare data can be compared to the engine const. */
function dataOnly(section: Record<string, unknown>): Record<string, unknown> {
  const { _description, ...data } = section;
  return data;
}

describe("WorkholdingDB mirror — single source of truth = WorkholdingEngine", () => {
  it("each engine-shadowed section is built directly from the engine const (no hand-copy)", () => {
    const s = buildEngineSections() as Record<string, Record<string, unknown>>;
    expect(dataOnly(s.friction_coefficients)).toEqual(FRICTION_COEFFICIENTS);
    expect(dataOnly(s.dynamic_force_factors)).toEqual(DYNAMIC_FACTORS);
    expect(dataOnly(s.safety_factors)).toEqual(SAFETY_FACTORS);
    expect(dataOnly(s.vacuum_seal_efficiency)).toEqual(VACUUM_SEAL_EFFICIENCY);
    expect(dataOnly(s.magnetic_permeability)).toEqual(MAGNETIC_PERMEABILITY);
  });

  it("ANTI-DRIFT: the safety_factors mirror carries ALL 7 engine factors incl DRILLING + TAPPING", () => {
    // The pre-consolidation mirror was missing these two — the exact orphan-shadow drift this fixes.
    const db = JSON.parse(fs.readFileSync(WORKHOLDING_DB_PATH, "utf-8"));
    expect(db.safety_factors.DRILLING).toBe(2.5);
    expect(db.safety_factors.TAPPING).toBe(3.0);
    expect(db.safety_factors.HEAVY_INTERRUPTED).toBe(4.0);
    expect(Object.keys(db.safety_factors).filter((k: string) => k !== "_description").length).toBe(7);
  });

  it("closes the coverage gap: vacuum_seal_efficiency + magnetic_permeability now mirrored", () => {
    const db = JSON.parse(fs.readFileSync(WORKHOLDING_DB_PATH, "utf-8"));
    // 4 seal types each across 4 Ra bands.
    expect(dataOnly(db.vacuum_seal_efficiency)).toEqual(VACUUM_SEAL_EFFICIENCY);
    expect(db.vacuum_seal_efficiency.O_RING["Ra<1.6"]).toBe(0.95);
    // Non-magnetic materials read 1.0; carbon steel reads 100.
    expect(dataOnly(db.magnetic_permeability)).toEqual(MAGNETIC_PERMEABILITY);
    expect(db.magnetic_permeability.CARBON_STEEL).toBe(100);
    expect(db.magnetic_permeability.STAINLESS_300).toBe(1.0);
  });

  it("structural lists are DERIVED from the friction table (cannot drift from it)", () => {
    const db = JSON.parse(fs.readFileSync(WORKHOLDING_DB_PATH, "utf-8"));
    expect(db.device_types).toEqual(Object.keys(FRICTION_COEFFICIENTS));
    expect(db.device_types.length).toBe(14);
    expect(db.surface_conditions).toEqual(Object.keys(FRICTION_COEFFICIENTS.VICE_SMOOTH));
    expect(db.surface_conditions).toContain("COOLANT_WET");
  });

  it("DRIFT GUARD: on-disk WorkholdingDB.json engine sections match the engine — re-run the generator if this fails", () => {
    const db = JSON.parse(fs.readFileSync(WORKHOLDING_DB_PATH, "utf-8"));
    const expected = JSON.parse(JSON.stringify(buildEngineSections())) as Record<string, unknown>;
    for (const key of Object.keys(expected)) {
      expect(db[key]).toEqual(expected[key]);
    }
  });

  it("preserves the JSON-only reference blocks (not engine-shadowed) untouched", () => {
    const db = JSON.parse(fs.readFileSync(WORKHOLDING_DB_PATH, "utf-8"));
    // These two blocks live only in the JSON — the generator must never clobber them.
    expect(db.magnetic_chuck_data.holding_force_per_area_n_per_cm2.electropermanent).toBe(150);
    expect(db.vacuum_fixture_data.atmospheric_pressure_n_per_cm2).toBe(10.13);
    expect(db.source_file).toBe("mcp-server/src/engines/WorkholdingEngine.ts");
    expect(db.version).toBe("1.1.0");
  });

  it("carries 114 engine-sourced rows (anti-regression on coverage)", () => {
    // 14 devices x 6 surfaces (84) + 9 dynamic + 7 safety + 4 seal + 10 permeability = 114
    expect(workholdingRowCount()).toBe(114);
  });

  it("FAIL LOUD: generate() refuses to write when a JSON-only reference block is missing (truncated input)", () => {
    const tmp = `${WORKHOLDING_DB_PATH}.failloud-${process.pid}.json`;
    try {
      const base = JSON.parse(fs.readFileSync(WORKHOLDING_DB_PATH, "utf-8"));
      delete base.magnetic_chuck_data; // simulate a truncated/corrupt input
      fs.writeFileSync(tmp, JSON.stringify(base, null, 2));
      const sizeBefore = fs.statSync(tmp).size;
      expect(() => generate(tmp)).toThrow(/missing required JSON-only block 'magnetic_chuck_data'/);
      // It must NOT have written a half-formed mirror.
      expect(fs.statSync(tmp).size).toBe(sizeBefore);
    } finally {
      fs.rmSync(tmp, { force: true });
      fs.rmSync(`${tmp}.${process.pid}.tmp`, { force: true });
    }
  });

  it("generate() is idempotent + repairs a drifted copy (temp file)", () => {
    const tmp = `${WORKHOLDING_DB_PATH}.itest-${process.pid}.json`;
    try {
      const base = JSON.parse(fs.readFileSync(WORKHOLDING_DB_PATH, "utf-8"));
      // Simulate the pre-consolidation drift: roll version back, drop the 2 new tables,
      // and truncate safety_factors to the old 5-key shape.
      base.version = "1.0.0";
      delete base.vacuum_seal_efficiency;
      delete base.magnetic_permeability;
      delete base._generator;
      base.safety_factors = {
        _description: base.safety_factors._description,
        ROUGHING: 3.0,
        SEMI_FINISH: 2.5,
        FINISHING: 2.0,
        HIGH_SPEED: 3.5,
        HEAVY_INTERRUPTED: 4.0,
      };
      fs.writeFileSync(tmp, JSON.stringify(base, null, 2));

      const first = generate(tmp); // drifted → repaired
      const second = generate(tmp); // already in sync → no change
      expect(first.changed).toBe(true);
      expect(first.rows).toBe(114);
      expect(second.changed).toBe(false);

      const written = JSON.parse(fs.readFileSync(tmp, "utf-8"));
      expect(written.version).toBe("1.1.0");
      expect(written.safety_factors.TAPPING).toBe(3.0);
      expect(written.vacuum_seal_efficiency.O_RING["Ra<1.6"]).toBe(0.95);
      // JSON-only block survived the repair round-trip.
      expect(written.magnetic_chuck_data.holding_force_per_area_n_per_cm2.electropermanent).toBe(150);
    } finally {
      fs.rmSync(tmp, { force: true });
      fs.rmSync(`${tmp}.${process.pid}.tmp`, { force: true });
    }
  });
});
