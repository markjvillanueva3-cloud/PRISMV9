import { describe, it, expect } from "vitest";
import {
  probeMacroGeneratorEngine as gen,
  ProbeMacroGeneratorEngine,
  type ProbeMacroInput,
} from "../engines/ProbeMacroGeneratorEngine.js";

describe("ProbeMacroGeneratorEngine", () => {
  it("exports a singleton with generate() method", () => {
    expect(gen).toBeInstanceOf(ProbeMacroGeneratorEngine);
    expect(typeof gen.generate).toBe("function");
  });

  it("throws on missing controller / probe_brand / cycle", () => {
    expect(() => gen.generate({} as ProbeMacroInput)).toThrow(/controller \+ probe_brand \+ cycle/);
  });

  it("throws on unknown controller", () => {
    expect(() => gen.generate({
      controller: "weird" as never,
      probe_brand: "renishaw_omp400",
      cycle: "datum_xyz",
    })).toThrow(/unknown controller/);
  });

  it("Fanuc datum_xyz generates 3 G65 P9810 calls + correct tolerance", () => {
    const r = gen.generate({
      controller: "fanuc",
      probe_brand: "renishaw_omp400",
      cycle: "datum_xyz",
      expected_x_mm: 100, expected_y_mm: 50, expected_z_mm: 10,
      tolerance_um: 25,
    });
    expect(r.macro_text).toMatch(/G65 P9810 X100/);
    expect(r.macro_text).toMatch(/G65 P9810 Y50/);
    expect(r.macro_text).toMatch(/G65 P9810 Z10/);
    expect(r.macro_text).toMatch(/T0\.025/);
    expect(r.estimated_cycle_time_s.value).toBe(6);
  });

  it("Fanuc bore_best_fit uses P9814 with diameter", () => {
    const r = gen.generate({
      controller: "fanuc",
      probe_brand: "renishaw_omp400",
      cycle: "bore_best_fit",
      nominal_size_mm: 12.7,
    });
    expect(r.macro_text).toMatch(/G65 P9814/);
    expect(r.macro_text).toMatch(/D12\.7/);
  });

  it("Fanuc tool_length emits T+M6 + P9853 with H offset", () => {
    const r = gen.generate({
      controller: "fanuc",
      probe_brand: "renishaw_omp400",
      cycle: "tool_length",
      tool_id: "T05",
      tool_pocket: 5,
    });
    expect(r.macro_text).toMatch(/T5 M6/);
    expect(r.macro_text).toMatch(/G65 P9853 H5/);
  });

  it("Fanuc tool_diameter emits P9854 with D offset", () => {
    const r = gen.generate({
      controller: "fanuc",
      probe_brand: "renishaw_omp400",
      cycle: "tool_diameter",
      tool_pocket: 7,
    });
    expect(r.macro_text).toMatch(/G65 P9854 D7/);
  });

  it("Okuma datum_xyz emits CALL OO9810 with PX/PY/PZ", () => {
    const r = gen.generate({
      controller: "okuma_osp",
      probe_brand: "renishaw_omp400",
      cycle: "datum_xyz",
      expected_x_mm: 25, expected_y_mm: 15, expected_z_mm: 5,
    });
    expect(r.macro_text).toMatch(/CALL OO9810 PX=25/);
  });

  it("Haas dialect matches Fanuc-like G65 syntax", () => {
    const r = gen.generate({
      controller: "haas",
      probe_brand: "renishaw_omp400",
      cycle: "datum_xyz",
      expected_x_mm: 100,
    });
    expect(r.macro_text).toMatch(/G65 P9810 X100/);
    expect(r.macro_text).toMatch(/Haas mill/);
  });

  it("Heidenhain emits TCH PROBE 400 + Q263 datum coords", () => {
    const r = gen.generate({
      controller: "heidenhain_tnc",
      probe_brand: "renishaw_omp400",
      cycle: "datum_xyz",
      expected_x_mm: 50,
    });
    expect(r.macro_text).toMatch(/TCH PROBE 400/);
    expect(r.macro_text).toMatch(/Q263 = 50/);
  });

  it("Heidenhain bore_best_fit emits TCH PROBE 421 with Q273 nominal", () => {
    const r = gen.generate({
      controller: "heidenhain_tnc",
      probe_brand: "renishaw_omp400",
      cycle: "bore_best_fit",
      nominal_size_mm: 15,
    });
    expect(r.macro_text).toMatch(/TCH PROBE 421/);
    expect(r.macro_text).toMatch(/Q273 = 15/);
  });

  it("warning emitted when nominal_size_mm absent for bore/boss", () => {
    const r = gen.generate({
      controller: "fanuc",
      probe_brand: "renishaw_omp400",
      cycle: "bore_best_fit",
    });
    expect(r.warnings.some(w => /nominal_size_mm required/.test(w))).toBe(true);
  });

  it("tolerance_um defaults to 25μm when not specified", () => {
    const r = gen.generate({
      controller: "fanuc",
      probe_brand: "renishaw_omp400",
      cycle: "datum_xyz",
    });
    expect(r.tolerance_um).toBe(25);
    expect(r.macro_text).toMatch(/T0\.025/);
  });

  it("cycle-time table: bore probing ~18s, datum ~6s, tool length ~8s", () => {
    const a = gen.generate({ controller: "fanuc", probe_brand: "renishaw_omp400", cycle: "bore_best_fit", nominal_size_mm: 10 });
    const b = gen.generate({ controller: "fanuc", probe_brand: "renishaw_omp400", cycle: "datum_xyz" });
    const c = gen.generate({ controller: "fanuc", probe_brand: "renishaw_omp400", cycle: "tool_length", tool_pocket: 1 });
    expect(a.estimated_cycle_time_s.value).toBe(18);
    expect(b.estimated_cycle_time_s.value).toBe(6);
    expect(c.estimated_cycle_time_s.value).toBe(8);
  });

  it("source cites Renishaw Inspection Plus + OMP400", () => {
    const r = gen.generate({ controller: "fanuc", probe_brand: "renishaw_omp400", cycle: "datum_xyz" });
    expect(r.source).toMatch(/Renishaw Inspection Plus|OMP400/);
  });
});
