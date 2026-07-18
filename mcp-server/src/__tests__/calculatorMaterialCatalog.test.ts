/**
 * R9 tests for calculatorMaterialCatalog -- the SFC material datalist accessor.
 * Verifies registry-row normalization (nested classification/mechanical/kienzle
 * shape), ISO-group derivation, HB/HRC hardness, dedup, and the curated fail-soft
 * branch. Pure -- no registry / filesystem IO.
 */
import { describe, it, expect } from "vitest";
import {
  buildMaterialOptionsFromRows,
  getCalculatorMaterialCatalog,
  materialOptionId,
  type MaterialOption,
} from "../utils/calculatorMaterialCatalog.js";

/** A realistic MaterialRegistry row (nested shape, per MaterialRegistry.ts field paths). */
function row(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    material_id: "aisi-4140",
    name: "AISI 4140 Alloy Steel",
    classification: { iso_group: "P" },
    mechanical: { hardness: { brinell: 280 } },
    kienzle: { kc1_1: 1800, mc: 0.25 },
    ...overrides,
  };
}

describe("buildMaterialOptionsFromRows", () => {
  it("normalizes a full registry row into a datalist option", () => {
    const [opt] = buildMaterialOptionsFromRows([row()]);
    expect(opt).toMatchObject<Partial<MaterialOption>>({
      id: "aisi-4140",
      label: "AISI 4140 Alloy Steel",
      isoGroup: "P",
      isoLabel: "Steel",
      hardnessHb: 280,
      hardnessHrc: null,
      hasKienzle: true,
    });
    expect(opt.detail).toBe("P - Steel - 280 HB");
  });

  it("falls back to top-level iso_group when classification is absent", () => {
    const [opt] = buildMaterialOptionsFromRows([
      row({ classification: undefined, iso_group: "s" }),
    ]);
    // First-char + upcased: "s" -> "S" (Superalloys).
    expect(opt.isoGroup).toBe("S");
    expect(opt.isoLabel).toBe("Superalloys");
  });

  it("reads HRC hardness and reports null HB for a hardened-steel row", () => {
    const [opt] = buildMaterialOptionsFromRows([
      row({
        material_id: "d2-60hrc",
        name: "D2 @ 60 HRC",
        classification: { iso_group: "H" },
        mechanical: { hardness: { rockwell_c: 60 } },
      }),
    ]);
    expect(opt.hardnessHb).toBeNull();
    expect(opt.hardnessHrc).toBe(60);
    expect(opt.detail).toBe("H - Hardened Steel - 60 HRC");
  });

  it("maps an explicit null hardness to null (not a bogus 0) so the HRC cascade survives", () => {
    // Registry rows carry "brinell": null / "rockwell_c": null. Number(null)===0 would
    // surface a 0-hardness; the cascade must see null and keep the real HRC.
    const [opt] = buildMaterialOptionsFromRows([
      row({
        material_id: "ph-cond",
        name: "17-4 PH H900",
        classification: { iso_group: "H" },
        mechanical: { hardness: { brinell: null, rockwell_c: 44 } },
      }),
    ]);
    expect(opt.hardnessHb).toBeNull();
    expect(opt.hardnessHrc).toBe(44);
    expect(opt.detail).toBe("H - Hardened Steel - 44 HRC");
  });

  it("marks hasKienzle false when kc1_1 or mc is missing", () => {
    const [noMc] = buildMaterialOptionsFromRows([row({ kienzle: { kc1_1: 1800 } })]);
    const [noKienzle] = buildMaterialOptionsFromRows([row({ kienzle: undefined })]);
    expect(noMc.hasKienzle).toBe(false);
    expect(noKienzle.hasKienzle).toBe(false);
  });

  it("skips malformed rows (non-object, missing name) without throwing", () => {
    const opts = buildMaterialOptionsFromRows([
      null,
      42,
      "not-a-row",
      { material_id: "no-name-row" /* no name + no id text -> material_id is used as name */ },
      { classification: { iso_group: "P" } }, // no name, no id at all -> skipped
      row(),
    ]);
    // material_id-only row keeps a name (id used), the truly-nameless row is skipped,
    // plus the one full row = 2.
    expect(opts.map((o) => o.label).sort()).toEqual([
      "AISI 4140 Alloy Steel",
      "no-name-row",
    ]);
  });

  it("dedups rows that slugify to the same option id", () => {
    const opts = buildMaterialOptionsFromRows([
      row({ material_id: "AISI 4140", name: "AISI 4140 Alloy Steel" }),
      row({ material_id: "aisi-4140", name: "AISI 4140 (dup)" }),
    ]);
    expect(opts).toHaveLength(1);
  });

  it("returns [] for a non-array input (null / object / string)", () => {
    expect(buildMaterialOptionsFromRows(null)).toEqual([]);
    expect(buildMaterialOptionsFromRows({})).toEqual([]);
    expect(buildMaterialOptionsFromRows("rows")).toEqual([]);
  });

  it("sorts by ISO group then alloy name", () => {
    const opts = buildMaterialOptionsFromRows([
      row({ material_id: "in718", name: "Inconel 718", classification: { iso_group: "S" } }),
      row({ material_id: "al6061", name: "6061-T6 Aluminum", classification: { iso_group: "N" } }),
      row({ material_id: "a4140", name: "AISI 4140", classification: { iso_group: "P" } }),
    ]);
    expect(opts.map((o) => o.isoGroup)).toEqual(["N", "P", "S"]);
  });
});

describe("getCalculatorMaterialCatalog", () => {
  it("returns a live database response for real rows", () => {
    const res = getCalculatorMaterialCatalog({ registryRows: [row(), row({ material_id: "x", name: "X Steel" })] });
    expect(res.source).toBe("database");
    expect(res.liveCount).toBe(2);
    expect(res.fallbackCount).toBe(0);
    expect(res.total).toBe(2);
    expect(res.isoGroups).toEqual(["P"]);
  });

  it("degrades to the curated set (never silent-empty) when rows are empty", () => {
    const res = getCalculatorMaterialCatalog({ registryRows: [] });
    expect(res.source).toBe("curated");
    expect(res.liveCount).toBe(0);
    expect(res.options.length).toBeGreaterThan(0);
    // Curated set spans all six ISO groups.
    expect(res.isoGroups).toEqual(["H", "K", "M", "N", "P", "S"]);
  });

  it("degrades to curated on a non-array (malformed) registry payload", () => {
    const res = getCalculatorMaterialCatalog({ registryRows: null });
    expect(res.source).toBe("curated");
    expect(res.fallbackCount).toBe(res.options.length);
  });
});

describe("materialOptionId", () => {
  it("slugifies and falls back when empty", () => {
    expect(materialOptionId("Ti-6Al-4V Grade 5", "fb")).toBe("ti-6al-4v-grade-5");
    expect(materialOptionId("!!!", "fallback-id")).toBe("fallback-id");
  });
});
