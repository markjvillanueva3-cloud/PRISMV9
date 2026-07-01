/**
 * CoolantDB — single-source generator drift guard.
 * (JULIETT-DB-COVERAGE-MS0 / U-COOLANT-MIRROR-GEN)
 *
 * Verifies the discovery mirror in CoolantDB.json is GENERATED from — and stays in
 * sync with — the canonical CoolantValidationEngine.ts constants. The file-backed DB
 * JSON (loaded by DatabaseRegistry for prism_data:database_search) must never drift
 * from the engine the live coolant-validation path uses. Sister to the WorkholdingDB
 * and ToleranceDB mirror guards.
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import {
  buildEngineSections,
  generate,
  coolantRowCount,
  COOLANT_DB_PATH,
} from "../../scripts/generate-coolant-db.js";
import {
  FLOW_REQUIREMENTS,
  PRESSURE_BY_LD,
  MATERIAL_FACTORS,
  MQL_CONSUMPTION,
  RECOMMENDED_COOLANT,
} from "../engines/CoolantValidationEngine.js";

/** Strip the human-readable caption so the bare data can be compared to the engine const. */
function dataOnly(section: Record<string, unknown>): Record<string, unknown> {
  const { _description, ...data } = section;
  return data;
}

describe("CoolantDB mirror — single source of truth = CoolantValidationEngine", () => {
  it("each engine-shadowed section is built directly from the engine const (no hand-copy)", () => {
    const s = buildEngineSections() as Record<string, Record<string, unknown>>;
    expect(dataOnly(s.flow_requirements_l_per_min_per_mm)).toEqual(FLOW_REQUIREMENTS);
    expect(dataOnly(s.pressure_by_ld_ratio_bar)).toEqual(PRESSURE_BY_LD);
    expect(dataOnly(s.material_factors)).toEqual(MATERIAL_FACTORS);
    expect(dataOnly(s.mql_consumption_ml_per_hr)).toEqual(MQL_CONSUMPTION);
    expect(dataOnly(s.recommended_coolant_by_material)).toEqual(RECOMMENDED_COOLANT);
  });

  it("DRIFT GUARD: on-disk CoolantDB.json engine sections match the engine — re-run the generator if this fails", () => {
    const db = JSON.parse(fs.readFileSync(COOLANT_DB_PATH, "utf-8"));
    const expected = JSON.parse(JSON.stringify(buildEngineSections())) as Record<string, unknown>;
    for (const key of Object.keys(expected)) {
      expect(db[key]).toEqual(expected[key]);
    }
  });

  it("operations list is DERIVED from FLOW_REQUIREMENTS (cannot drift from it)", () => {
    const db = JSON.parse(fs.readFileSync(COOLANT_DB_PATH, "utf-8"));
    expect(db.operations).toEqual(Object.keys(FLOW_REQUIREMENTS));
    expect(db.operations.length).toBe(10);
    expect(db.operations).toContain("DRILLING_GUNDRILLING");
  });

  it("normalizes the mql GRINDING entry to engine data {min:0,max:0} (drops the hand-added note)", () => {
    // The engine carries GRINDING as {min:0,max:0}; the old mirror had an extra `note`
    // key that is a code-comment in the engine, not data. Single-sourcing removes it.
    const db = JSON.parse(fs.readFileSync(COOLANT_DB_PATH, "utf-8"));
    expect(db.mql_consumption_ml_per_hr.GRINDING).toEqual({ min: 0, max: 0 });
    expect(db.mql_consumption_ml_per_hr.DRILLING_GUNDRILLING).toEqual({ min: 100, max: 300 });
  });

  it("sanity-checks representative engine values survive the round-trip", () => {
    const db = JSON.parse(fs.readFileSync(COOLANT_DB_PATH, "utf-8"));
    expect(db.flow_requirements_l_per_min_per_mm.DRILLING_GUNDRILLING).toBe(3.0);
    expect(db.pressure_by_ld_ratio_bar["LD>20"]).toBe(150);
    expect(db.material_factors.SUPERALLOY).toBe(1.8);
    expect(db.recommended_coolant_by_material.TITANIUM).toBe("FULL_SYNTHETIC");
  });

  it("preserves the JSON-only reference blocks (coolant_types, through_spindle_coolant) untouched", () => {
    const db = JSON.parse(fs.readFileSync(COOLANT_DB_PATH, "utf-8"));
    expect(db.coolant_types.length).toBe(11);
    expect(db.coolant_types).toContain("CRYOGENIC");
    expect(db.through_spindle_coolant.pressure_ranges_bar.ultra_high_pressure).toEqual({ min: 70, max: 150 });
    expect(db.through_spindle_coolant.recommended_by_operation.DRILLING_GUNDRILLING).toBe("ultra_high_pressure");
    expect(db.source_file).toBe("mcp-server/src/engines/CoolantValidationEngine.ts");
    expect(db.version).toBe("1.1.0");
  });

  it("carries 38 engine-sourced rows (anti-regression on coverage)", () => {
    // 10 flow + 6 pressure + 6 material + 10 mql + 6 recommended = 38
    expect(coolantRowCount()).toBe(38);
  });

  it("FAIL LOUD: generate() refuses to write when a JSON-only reference block is missing (truncated input)", () => {
    const tmp = `${COOLANT_DB_PATH}.failloud-${process.pid}.json`;
    try {
      const base = JSON.parse(fs.readFileSync(COOLANT_DB_PATH, "utf-8"));
      delete base.through_spindle_coolant; // simulate a truncated/corrupt input
      fs.writeFileSync(tmp, JSON.stringify(base, null, 2));
      const sizeBefore = fs.statSync(tmp).size;
      expect(() => generate(tmp)).toThrow(/missing required JSON-only block 'through_spindle_coolant'/);
      expect(fs.statSync(tmp).size).toBe(sizeBefore);
    } finally {
      fs.rmSync(tmp, { force: true });
      fs.rmSync(`${tmp}.${process.pid}.tmp`, { force: true });
    }
  });

  it("generate() is idempotent + repairs a drifted copy (temp file)", () => {
    const tmp = `${COOLANT_DB_PATH}.itest-${process.pid}.json`;
    try {
      const base = JSON.parse(fs.readFileSync(COOLANT_DB_PATH, "utf-8"));
      // Simulate drift: roll version back, re-add the stale note, perturb a value.
      base.version = "1.0.0";
      delete base._generator;
      base.mql_consumption_ml_per_hr.GRINDING = { min: 0, max: 0, note: "MQL not recommended for grinding" };
      base.material_factors.SUPERALLOY = 99; // a corrupted value the generator must repair
      fs.writeFileSync(tmp, JSON.stringify(base, null, 2));

      const first = generate(tmp); // drifted → repaired
      const second = generate(tmp); // already in sync → no change
      expect(first.changed).toBe(true);
      expect(first.rows).toBe(38);
      expect(second.changed).toBe(false);

      const written = JSON.parse(fs.readFileSync(tmp, "utf-8"));
      expect(written.version).toBe("1.1.0");
      expect(written.material_factors.SUPERALLOY).toBe(1.8); // repaired from 99
      expect(written.mql_consumption_ml_per_hr.GRINDING).toEqual({ min: 0, max: 0 }); // note stripped
      expect(written.through_spindle_coolant.recommended_by_operation.TAPPING).toBe("standard"); // JSON-only block survived
    } finally {
      fs.rmSync(tmp, { force: true });
      fs.rmSync(`${tmp}.${process.pid}.tmp`, { force: true });
    }
  });
});
