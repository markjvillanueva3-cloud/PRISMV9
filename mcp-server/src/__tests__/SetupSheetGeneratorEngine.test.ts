import { describe, it, expect } from "vitest";
import {
  setupSheetGeneratorEngine as gen,
  SetupSheetGeneratorEngine,
  type SetupSheetInput,
} from "../engines/SetupSheetGeneratorEngine.js";

function nominal(o: Partial<SetupSheetInput> = {}): SetupSheetInput {
  return {
    header: { program_id: "PRG-001", part_id: "ITW-BRKT-01", customer: "ITW", material: "Aluminum 6061-T6", date_iso: "2026-05-24", operator: "JM Die" },
    stock: { designation: "Al 6061-T6", dim_x_mm: 100, dim_y_mm: 100, dim_z_mm: 25, lot_id: "LOT-001" },
    machine: { machine_id: "VMC-001", controller: "fanuc", spindle_max_rpm: 12000 },
    fixture: { fixture_id: "FIX-001", n_clamps: 4, bolt_diameter_mm: 12, per_clamp_torque_nm: 50, workholding_method: "vise-with-soft-jaws" },
    wcs: { g54_x_mm: 100, g54_y_mm: 100, g54_z_mm: 50, datum_strategy: "top-left-corner" },
    tools: [
      { tool_id: "T01", pocket: 1, description: "1/2 endmill", length_offset_mm: 75.5, diameter_offset_mm: 12.7, remaining_life_min: 120, spare_pocket: 21 },
      { tool_id: "T02", pocket: 2, description: "1/4 drill", length_offset_mm: 60.0, diameter_offset_mm: 6.35, remaining_life_min: 45 },
    ],
    coolant: { type: "flood_soluble", concentration_target: "6-10% Brix", pressure_min_bar: 5 },
    warmup: { required: true, stages_count: 4, total_duration_min: 26 },
    inspection: { first_piece_required: true, cmm_features: ["bore Ø12.7±0.02", "datum-A flatness 0.005"], cpk_target: 1.33 },
    cycle_time_s: 90,
    run_qty: 50,
    ...o,
  };
}

describe("SetupSheetGeneratorEngine", () => {
  it("exports a singleton with generate()", () => {
    expect(gen).toBeInstanceOf(SetupSheetGeneratorEngine);
    expect(typeof gen.generate).toBe("function");
  });

  it("throws on missing required structure", () => {
    expect(() => gen.generate({} as SetupSheetInput)).toThrow(/complete setup-sheet input required/);
  });

  it("emits valid markdown with header section", () => {
    const r = gen.generate(nominal());
    expect(r.markdown).toMatch(/^# Setup Sheet — PRG-001/);
    expect(r.markdown).toMatch(/\*\*Part:\*\* ITW-BRKT-01/);
    expect(r.markdown).toMatch(/\*\*Customer:\*\* ITW/);
    expect(r.markdown).toMatch(/\*\*Date:\*\* 2026-05-24/);
    expect(r.markdown).toMatch(/\*\*Material:\*\* Aluminum 6061-T6/);
  });

  it("includes all 9 numbered sections (stock through sign-off)", () => {
    const r = gen.generate(nominal());
    for (let i = 1; i <= 9; i++) {
      expect(r.markdown).toMatch(new RegExp(`^## ${i}\\.`, "m"));
    }
  });

  it("renders tools table with one row per tool", () => {
    const r = gen.generate(nominal());
    expect(r.markdown).toMatch(/\| 1 \| T01 \| 1\/2 endmill \| 75\.5 \| 12\.7 \| 120 \| P21 \|/);
    expect(r.markdown).toMatch(/\| 2 \| T02 \| 1\/4 drill \| 60 \| 6\.35 \| 45 \| — \|/);
  });

  it("renders WCS table with G54 coords", () => {
    const r = gen.generate(nominal());
    expect(r.markdown).toMatch(/\| X \| 100 \|/);
    expect(r.markdown).toMatch(/\| Y \| 100 \|/);
    expect(r.markdown).toMatch(/\| Z \| 50 \|/);
  });

  it("renders fixture torque in both N·m + ft·lb", () => {
    const r = gen.generate(nominal());
    expect(r.markdown).toMatch(/50\.0 N·m/);
    expect(r.markdown).toMatch(/36\.9 ft·lb/);  // 50 × 0.737562
  });

  it("computes total run time correctly (90s × 50 = 4500s = 75 min)", () => {
    const r = gen.generate(nominal());
    expect(r.markdown).toMatch(/\*\*Estimated run time:\*\* 75\.0 min/);
    expect(r.markdown).toMatch(/1\.25 h/);
  });

  it("includes 12-axis operator sign-off checklist", () => {
    const r = gen.generate(nominal());
    expect(r.markdown).toMatch(/1\. stock verified/);
    expect(r.markdown).toMatch(/12\. operator skill OK/);
    expect(r.markdown).toMatch(/\*\*Operator initials:\*\*/);
  });

  it("warmup section says SKIPPED when warmup.required=false", () => {
    const r = gen.generate(nominal({ warmup: { required: false } }));
    expect(r.markdown).toMatch(/Skipped.*60 min run history/);
  });

  it("inspection section includes CMM features + Cpk target", () => {
    const r = gen.generate(nominal());
    expect(r.markdown).toMatch(/\*\*Cpk target:\*\* ≥ 1\.33/);
    expect(r.markdown).toMatch(/bore Ø12\.7±0\.02/);
    expect(r.markdown).toMatch(/datum-A flatness 0\.005/);
  });

  it("inspection section says FAI waived when first_piece_required=false", () => {
    const r = gen.generate(nominal({ inspection: { first_piece_required: false } }));
    expect(r.markdown).toMatch(/FAI waived/);
  });

  it("plaintext form strips markdown bold + headers", () => {
    const r = gen.generate(nominal());
    expect(r.plaintext).not.toMatch(/\*\*/);
    expect(r.plaintext).not.toMatch(/^#/m);
  });

  it("emits warnings when zero tools / zero qty / zero torque", () => {
    const r1 = gen.generate(nominal({ tools: [] }));
    expect(r1.warnings.some(w => /Zero tools/.test(w))).toBe(true);
    const r2 = gen.generate(nominal({ run_qty: 0 }));
    expect(r2.warnings.some(w => /Run qty 0/.test(w))).toBe(true);
    const r3 = gen.generate(nominal({ fixture: { ...nominal().fixture, per_clamp_torque_nm: 0 } }));
    expect(r3.warnings.some(w => /torque not specified/.test(w))).toBe(true);
  });

  it("line_count is positive integer + close to markdown lines", () => {
    const r = gen.generate(nominal());
    expect(r.line_count.value).toBeGreaterThan(20);
    expect(r.line_count.unit).toBe("lines");
    const actualLines = r.markdown.split("\n").length;
    // Allow ±1 for trailing newline boundary
    expect(Math.abs(actualLines - r.line_count.value)).toBeLessThanOrEqual(1);
  });

  it("source cites DMG MORI + AS9100 + JM Die SOP", () => {
    const r = gen.generate(nominal());
    expect(r.source).toMatch(/DMG MORI|AS9100|JM Die/);
  });
});
