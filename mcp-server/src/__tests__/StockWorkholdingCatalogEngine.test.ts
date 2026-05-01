/**
 * StockWorkholdingCatalogEngine.test.ts — U-CAMTEST06
 * ====================================================
 *
 * Comprehensive-build coverage:
 *   - happy path: 100 setups (20 parts × 5 templates), audit OK
 *   - cross-product invariant: every part has all 5 slots, every slot has 20 parts
 *   - envelope derivation: stock = part envelope + 2 × margin per axis
 *   - ≥3 failure modes (unknown stock_id, bad material slot, bad form, bad descriptor)
 *   - ≥2 adversarial inputs (empty id, non-snake_case id, NaN dim, zero dim)
 *   - frozen catalog mutation guard
 *   - dispatcher round-trip
 */

import { describe, it, expect } from "vitest";
import {
  StockWorkholdingCatalogEngine,
  StockSetupDescriptorSchema,
  StockMaterialSlotSchema,
  StockFormSchema,
  WorkholdingKindSchema,
  type StockMaterialSlot,
  type StockForm,
} from "../engines/StockWorkholdingCatalogEngine.js";
import { FixturePartCatalogEngine } from "../engines/FixturePartCatalogEngine.js";

const ALL_MATERIAL_SLOTS: StockMaterialSlot[] = [
  "alu_6061_t6", "steel_1018_crs", "tool_steel_d2", "inconel_718", "polymer_uhmw",
];

// ── 1. Catalog shape ─────────────────────────────────────────────────────────

describe("StockWorkholdingCatalogEngine — catalog shape", () => {
  it("exposes exactly 100 setups (20 parts × 5 slots)", () => {
    expect(StockWorkholdingCatalogEngine.count()).toBe(100);
    expect(StockWorkholdingCatalogEngine.EXPECTED_TOTAL).toBe(100);
    expect(StockWorkholdingCatalogEngine.list().length).toBe(100);
  });

  it("audit invariant: catalog passes self-audit", () => {
    const audit = StockWorkholdingCatalogEngine.auditCatalog();
    expect(audit.ok).toBe(true);
    expect(audit.errors).toEqual([]);
  });

  it("uses exactly 5 stock templates", () => {
    expect(StockWorkholdingCatalogEngine.STOCK_TEMPLATES.length).toBe(5);
    const slots = StockWorkholdingCatalogEngine.STOCK_TEMPLATES.map(t => t.slot).sort();
    expect(slots).toEqual(["A", "B", "C", "D", "E"]);
  });
});

// ── 2. Cross-product invariants ─────────────────────────────────────────────

describe("StockWorkholdingCatalogEngine — cross-product invariants", () => {
  it("every part has exactly 5 setups (one per slot)", () => {
    const parts = FixturePartCatalogEngine.list();
    expect(parts.length).toBe(20);
    for (const p of parts) {
      const setups = StockWorkholdingCatalogEngine.listByPart(p.part_id);
      expect(setups.length).toBe(5);
      const slots = setups.map(s => s.slot).sort();
      expect(slots).toEqual(["A", "B", "C", "D", "E"]);
    }
  });

  it("every material slot is used by exactly 20 setups (one per part)", () => {
    for (const m of ALL_MATERIAL_SLOTS) {
      const setups = StockWorkholdingCatalogEngine.listByMaterial(m);
      expect(setups.length).toBe(20);
      for (const s of setups) expect(s.material_slot).toBe(m);
    }
    const dist = StockWorkholdingCatalogEngine.countByMaterial();
    for (const m of ALL_MATERIAL_SLOTS) expect(dist[m]).toBe(20);
  });

  it("form distribution matches templates: 60 plate + 40 billet", () => {
    const dist = StockWorkholdingCatalogEngine.countByForm();
    // Templates A, B, E are plate (3 × 20 = 60), C, D are billet (2 × 20 = 40)
    expect(dist.plate).toBe(60);
    expect(dist.billet).toBe(40);
    expect(dist.bar).toBe(0);
    expect(dist.casting).toBe(0);
    expect(dist.extrusion).toBe(0);
  });

  it("every stock_id is unique (no duplicates)", () => {
    const ids = StockWorkholdingCatalogEngine.list().map(s => s.stock_id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(100);
  });
});

// ── 3. Envelope derivation ──────────────────────────────────────────────────

describe("StockWorkholdingCatalogEngine — envelope derivation", () => {
  it("stock envelope = part envelope + 2 × margin per axis (slot A: 6061-T6, margin 5)", () => {
    const part = FixturePartCatalogEngine.mustGet("pocket_2d_rectangular");
    const stock = StockWorkholdingCatalogEngine.mustGet("stock_pocket_2d_rectangular_6061");
    expect(stock.envelope.margin_per_side_mm).toBe(5);
    expect(stock.envelope.length_mm).toBe(part.envelope_mm.length_mm + 10);
    expect(stock.envelope.width_mm).toBe(part.envelope_mm.width_mm + 10);
    expect(stock.envelope.height_mm).toBe(part.envelope_mm.height_mm + 10);
  });

  it("D2 billet uses 8 mm margin (allowance for hardening distortion)", () => {
    const part = FixturePartCatalogEngine.mustGet("multi_axis_impeller");
    const stock = StockWorkholdingCatalogEngine.mustGet("stock_multi_axis_impeller_d2");
    expect(stock.envelope.margin_per_side_mm).toBe(8);
    expect(stock.envelope.length_mm).toBe(part.envelope_mm.length_mm + 16);
  });

  it("UHMW plate uses smallest margin (4 mm — soft material)", () => {
    const stock = StockWorkholdingCatalogEngine.mustGet("stock_pocket_2d_rectangular_uhmw");
    expect(stock.envelope.margin_per_side_mm).toBe(4);
  });
});

// ── 4. Workholding correctness ──────────────────────────────────────────────

describe("StockWorkholdingCatalogEngine — workholding mappings", () => {
  it("UHMW slot uses soft-jaw vise (avoid surface marring)", () => {
    const stock = StockWorkholdingCatalogEngine.mustGet("stock_pocket_2d_rectangular_uhmw");
    expect(stock.workholding.kind).toBe("soft_jaw_vise");
    expect(stock.workholding.jaw_type).toBe("machinable_soft");
  });

  it("Inconel slot uses hardened jaws (resist work-hardening slip)", () => {
    const stock = StockWorkholdingCatalogEngine.mustGet("stock_multi_axis_impeller_inconel718");
    expect(stock.workholding.jaw_type).toBe("hardened_grippy");
    expect(stock.workholding.kind).toBe("machinist_vise");
  });

  it("6061-T6 slot uses smooth steel jaws (avoid scoring soft alu)", () => {
    const stock = StockWorkholdingCatalogEngine.mustGet("stock_pocket_2d_rectangular_6061");
    expect(stock.workholding.jaw_type).toBe("steel_smooth");
  });

  it("1018 CRS slot uses serrated jaws (extra grip on harder steel)", () => {
    const stock = StockWorkholdingCatalogEngine.mustGet("stock_pocket_2d_rectangular_1018");
    expect(stock.workholding.jaw_type).toBe("steel_serrated");
  });
});

// ── 5. Lookup methods ───────────────────────────────────────────────────────

describe("StockWorkholdingCatalogEngine — lookup", () => {
  it("get returns descriptor for known id", () => {
    const s = StockWorkholdingCatalogEngine.get("stock_turning_threaded_shaft_d2");
    expect(s?.stock_id).toBe("stock_turning_threaded_shaft_d2");
    expect(s?.material_slot).toBe("tool_steel_d2");
    expect(s?.form).toBe("billet");
    expect(s?.part_id).toBe("turning_threaded_shaft");
  });

  it("get returns null for unknown id (does not throw)", () => {
    expect(StockWorkholdingCatalogEngine.get("stock_nope_unknown")).toBeNull();
  });

  it("mustGet throws for unknown id (failure mode)", () => {
    expect(() => StockWorkholdingCatalogEngine.mustGet("stock_nope_unknown")).toThrow(/unknown stock_id/);
  });

  it("listByPart returns empty array for unknown part_id (no throw)", () => {
    expect(StockWorkholdingCatalogEngine.listByPart("nope_unknown_part")).toEqual([]);
  });

  it("listByForm filters correctly: plate count = 60", () => {
    const plates = StockWorkholdingCatalogEngine.listByForm("plate");
    expect(plates.length).toBe(60);
    for (const p of plates) expect(p.form).toBe("plate");
  });
});

// ── 6. Schema validation (failure modes + adversarial) ──────────────────────

const baseStock = {
  stock_id: "stock_ok_id",
  part_id: "ok_part",
  slot: "A" as const,
  material_slot: "alu_6061_t6" as const,
  form: "plate" as const,
  envelope: { length_mm: 1, width_mm: 1, height_mm: 1, margin_per_side_mm: 0 },
  workholding: { kind: "machinist_vise" as const, jaw_type: "steel_smooth" as const, clamp_mm: 25 },
};

describe("StockWorkholdingCatalogEngine — schema validation", () => {
  it("rejects empty stock_id (failure mode)", () => {
    expect(() => StockSetupDescriptorSchema.parse({ ...baseStock, stock_id: "" })).toThrow();
  });

  it("rejects non-snake_case stock_id (adversarial)", () => {
    expect(() => StockSetupDescriptorSchema.parse({ ...baseStock, stock_id: "StockOK" })).toThrow(/snake_case/);
  });

  it("rejects NaN envelope dimension (adversarial)", () => {
    expect(() => StockSetupDescriptorSchema.parse({
      ...baseStock,
      envelope: { length_mm: Number.NaN, width_mm: 1, height_mm: 1, margin_per_side_mm: 0 },
    })).toThrow();
  });

  it("rejects zero envelope dimension (adversarial)", () => {
    expect(() => StockSetupDescriptorSchema.parse({
      ...baseStock,
      envelope: { length_mm: 0, width_mm: 1, height_mm: 1, margin_per_side_mm: 0 },
    })).toThrow();
  });

  it("rejects negative margin (failure mode)", () => {
    expect(() => StockSetupDescriptorSchema.parse({
      ...baseStock,
      envelope: { length_mm: 1, width_mm: 1, height_mm: 1, margin_per_side_mm: -1 },
    })).toThrow();
  });

  it("rejects negative clamp_mm (failure mode)", () => {
    expect(() => StockSetupDescriptorSchema.parse({
      ...baseStock,
      workholding: { kind: "machinist_vise", jaw_type: "steel_smooth", clamp_mm: -5 },
    })).toThrow();
  });

  it("StockMaterialSlotSchema rejects unknown material 'titanium'", () => {
    const bad: unknown = "titanium";
    expect(() => StockMaterialSlotSchema.parse(bad)).toThrow();
  });

  it("StockFormSchema rejects unknown form 'sheet'", () => {
    const bad: unknown = "sheet";
    expect(() => StockFormSchema.parse(bad)).toThrow();
  });

  it("WorkholdingKindSchema rejects unknown kind 'magnetic_chuck'", () => {
    const bad: unknown = "magnetic_chuck";
    expect(() => WorkholdingKindSchema.parse(bad)).toThrow();
  });
});

// ── 7. Frozen catalog mutation guard ────────────────────────────────────────

describe("StockWorkholdingCatalogEngine — immutability", () => {
  it("returned setups are frozen (envelope, workholding)", () => {
    const s = StockWorkholdingCatalogEngine.mustGet("stock_pocket_2d_rectangular_6061");
    expect(Object.isFrozen(s)).toBe(true);
    expect(Object.isFrozen(s.envelope)).toBe(true);
    expect(Object.isFrozen(s.workholding)).toBe(true);
  });

  it("list() returns a defensive copy (popping does not affect catalog)", () => {
    const a = StockWorkholdingCatalogEngine.list();
    expect(a.length).toBe(100);
    a.pop();
    expect(a.length).toBe(99);
    expect(StockWorkholdingCatalogEngine.list().length).toBe(100);
  });

  it("listByMaterial returns a defensive copy", () => {
    const before = StockWorkholdingCatalogEngine.listByMaterial("alu_6061_t6");
    expect(before.length).toBe(20);
    before.length = 0;
    const after = StockWorkholdingCatalogEngine.listByMaterial("alu_6061_t6");
    expect(after.length).toBe(20);
  });
});

// ── 8. Dispatcher round-trip (mandated by ENGINE WIRING rule) ──────────────

describe("U-CAMTEST06 — dispatcher round-trip (prism_cam)", () => {
  it("ACTIONS array exposes all 8 stock catalog actions", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_stock_setup_list");
    expect(mod.ACTIONS).toContain("cam_stock_setup_list_by_part");
    expect(mod.ACTIONS).toContain("cam_stock_setup_list_by_material");
    expect(mod.ACTIONS).toContain("cam_stock_setup_list_by_form");
    expect(mod.ACTIONS).toContain("cam_stock_setup_get");
    expect(mod.ACTIONS).toContain("cam_stock_setup_count");
    expect(mod.ACTIONS).toContain("cam_stock_setup_count_by_material");
    expect(mod.ACTIONS).toContain("cam_stock_setup_audit");
  });

  it("engine reachable via the same dynamic-import path the dispatcher uses", async () => {
    const mod = await import("../engines/StockWorkholdingCatalogEngine.js");
    expect(mod.StockWorkholdingCatalogEngine.count()).toBe(100);
    const audit = mod.StockWorkholdingCatalogEngine.auditCatalog();
    expect(audit.ok).toBe(true);
    expect(audit.errors).toEqual([]);
  });

  it("derived dependency invariant: stock count = 5 × FixturePartCatalog.count()", async () => {
    const stockMod = await import("../engines/StockWorkholdingCatalogEngine.js");
    const partMod = await import("../engines/FixturePartCatalogEngine.js");
    expect(stockMod.StockWorkholdingCatalogEngine.count())
      .toBe(5 * partMod.FixturePartCatalogEngine.count());
  });
});
