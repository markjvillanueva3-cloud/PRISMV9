/**
 * MaterialToolMatrixEngine.test.ts — U-CAMTEST07
 * ===============================================
 *
 * Comprehensive-build coverage:
 *   - happy path: 9 slots, 7 tool-class triples, materialization works
 *   - cross-product: every part materializes to 9 combos; 20 × 9 = 180 total
 *   - tool-class table: every category has 3 distinct tool classes
 *   - failure modes (unknown part_id → []; unknown slot_id → null; mustGet → throws)
 *   - adversarial inputs (malformed slot_id schemas, unknown tool class)
 *   - audit invariant
 *   - dispatcher round-trip
 */

import { describe, it, expect } from "vitest";
import {
  MaterialToolMatrixEngine,
  MatrixSlotSchema,
  MatrixSlotIndexSchema,
  ToolClassSchema,
  type ToolClass,
  type MatrixSlot,
} from "../engines/MaterialToolMatrixEngine.js";
import {
  FixturePartCatalogEngine,
  type FixtureCategory,
} from "../engines/FixturePartCatalogEngine.js";

const ALL_CATEGORIES: FixtureCategory[] = [
  "pocket_2d", "contour_2d", "drilling", "threading",
  "surface_3d", "multi_axis", "turning",
];

// ── 1. Matrix shape ──────────────────────────────────────────────────────────

describe("MaterialToolMatrixEngine — matrix shape", () => {
  it("exposes exactly 9 slots (3 material × 3 tool grid)", () => {
    expect(MaterialToolMatrixEngine.EXPECTED_SLOTS).toBe(9);
    expect(MaterialToolMatrixEngine.slots().length).toBe(9);
  });

  it("slot ids are M1T1..M3T3 in row-major order", () => {
    const ids = MaterialToolMatrixEngine.slots().map(s => s.slot_id);
    expect(ids).toEqual([
      "M1T1", "M1T2", "M1T3",
      "M2T1", "M2T2", "M2T3",
      "M3T1", "M3T2", "M3T3",
    ]);
  });

  it("each slot's index pair matches its id", () => {
    for (const s of MaterialToolMatrixEngine.slots()) {
      expect(s.slot_id).toBe(`M${s.material_index}T${s.tool_index}`);
      expect([1, 2, 3]).toContain(s.material_index);
      expect([1, 2, 3]).toContain(s.tool_index);
    }
  });

  it("audit invariant: matrix passes self-audit", () => {
    const audit = MaterialToolMatrixEngine.auditMatrix();
    expect(audit.ok).toBe(true);
    expect(audit.errors).toEqual([]);
  });
});

// ── 2. Tool class table ─────────────────────────────────────────────────────

describe("MaterialToolMatrixEngine — tool class table", () => {
  it("every category has exactly 3 distinct tool classes", () => {
    for (const cat of ALL_CATEGORIES) {
      const tcs = MaterialToolMatrixEngine.toolClassesFor(cat);
      expect(tcs.length).toBe(3);
      expect(new Set(tcs).size).toBe(3);
    }
  });

  it("drilling category uses spot_drill + drill + chamfer_mill", () => {
    expect(MaterialToolMatrixEngine.toolClassesFor("drilling")).toEqual([
      "spot_drill", "drill", "chamfer_mill",
    ]);
  });

  it("turning category uses lathe-specific tool classes only", () => {
    const tcs = MaterialToolMatrixEngine.toolClassesFor("turning");
    expect(tcs).toEqual(["od_rougher", "od_finisher", "thread_tool"]);
    for (const tc of tcs) {
      expect(["od_rougher", "od_finisher", "thread_tool"]).toContain(tc);
    }
  });

  it("threading uses tap-cycle progression: tap_drill → tap → thread_mill", () => {
    expect(MaterialToolMatrixEngine.toolClassesFor("threading")).toEqual([
      "tap_drill", "tap", "thread_mill",
    ]);
  });
});

// ── 3. Materialization ─────────────────────────────────────────────────────

describe("MaterialToolMatrixEngine — materialization", () => {
  it("comboesForPart returns exactly 9 combos for a known part", () => {
    const combos = MaterialToolMatrixEngine.comboesForPart("pocket_2d_rectangular");
    expect(combos.length).toBe(9);
  });

  it("every combo carries the correct part_id and slot reference", () => {
    const combos = MaterialToolMatrixEngine.comboesForPart("multi_axis_impeller");
    for (const c of combos) {
      expect(c.part_id).toBe("multi_axis_impeller");
      expect(c.slot.slot_id).toMatch(/^M[123]T[123]$/);
    }
  });

  it("combo material_id is drawn from the part's recommended_materials", () => {
    const part = FixturePartCatalogEngine.mustGet("pocket_2d_rectangular");
    const combos = MaterialToolMatrixEngine.comboesForPart("pocket_2d_rectangular");
    for (const c of combos) {
      expect(part.recommended_materials).toContain(c.material_id);
    }
  });

  it("combo tool_class matches the category's tool table at the right index", () => {
    const combos = MaterialToolMatrixEngine.comboesForPart("drilling".repeat(0) + "drill_peck_plate");
    expect(combos.length).toBe(9);
    const drillingTools = MaterialToolMatrixEngine.toolClassesFor("drilling");
    for (const c of combos) {
      expect(c.tool_class).toBe(drillingTools[c.slot.tool_index - 1]);
    }
  });

  it("combo_id is unique per (part, slot)", () => {
    const combos = MaterialToolMatrixEngine.comboesForPart("multi_axis_impeller");
    const ids = combos.map(c => c.combo_id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("combo_multi_axis_impeller_M1T1");
    expect(ids).toContain("combo_multi_axis_impeller_M3T3");
  });

  it("comboesForPart materialization is deterministic (same input → same output)", () => {
    const a = MaterialToolMatrixEngine.comboesForPart("surface_3d_bowl");
    const b = MaterialToolMatrixEngine.comboesForPart("surface_3d_bowl");
    expect(a).toEqual(b);
  });
});

// ── 4. allCombos cross-product invariant ───────────────────────────────────

describe("MaterialToolMatrixEngine — allCombos cross-product", () => {
  it("allCombos length = parts × slots = 20 × 9 = 180", () => {
    expect(MaterialToolMatrixEngine.expectedComboCount()).toBe(180);
    expect(MaterialToolMatrixEngine.allCombos().length).toBe(180);
  });

  it("every part in the catalog contributes exactly 9 combos", () => {
    const all = MaterialToolMatrixEngine.allCombos();
    const perPart = new Map<string, number>();
    for (const c of all) perPart.set(c.part_id, (perPart.get(c.part_id) ?? 0) + 1);
    for (const p of FixturePartCatalogEngine.list()) {
      expect(perPart.get(p.part_id)).toBe(9);
    }
  });

  it("every (part_id, slot_id) pair is unique across allCombos", () => {
    const seen = new Set<string>();
    for (const c of MaterialToolMatrixEngine.allCombos()) {
      const key = `${c.part_id}:${c.slot.slot_id}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
    expect(seen.size).toBe(180);
  });
});

// ── 5. Lookup methods ──────────────────────────────────────────────────────

describe("MaterialToolMatrixEngine — lookup", () => {
  it("getCombo returns concrete combo for known (part_id, slot_id)", () => {
    const c = MaterialToolMatrixEngine.getCombo("pocket_2d_rectangular", "M1T1");
    expect(c?.part_id).toBe("pocket_2d_rectangular");
    expect(c?.slot.slot_id).toBe("M1T1");
    expect(c?.tool_class).toBe("roughing_endmill");
  });

  it("getCombo returns null for unknown part_id", () => {
    expect(MaterialToolMatrixEngine.getCombo("nope", "M1T1")).toBeNull();
  });

  it("getCombo returns null for unknown slot_id (failure mode)", () => {
    expect(MaterialToolMatrixEngine.getCombo("pocket_2d_rectangular", "M9T9")).toBeNull();
  });

  it("mustGetCombo throws for unknown part_id", () => {
    expect(() => MaterialToolMatrixEngine.mustGetCombo("nope", "M1T1")).toThrow(/no combo for/);
  });

  it("mustGetCombo throws for unknown slot_id", () => {
    expect(() => MaterialToolMatrixEngine.mustGetCombo("pocket_2d_rectangular", "MXT9")).toThrow(/no combo for/);
  });

  it("comboesForPart returns empty array for unknown part (no throw)", () => {
    expect(MaterialToolMatrixEngine.comboesForPart("nope")).toEqual([]);
  });
});

// ── 6. Schema validation (failure modes + adversarial) ─────────────────────

describe("MaterialToolMatrixEngine — schema validation", () => {
  it("MatrixSlotIndexSchema rejects 0 (failure mode)", () => {
    const bad: unknown = 0;
    expect(() => MatrixSlotIndexSchema.parse(bad)).toThrow();
  });

  it("MatrixSlotIndexSchema rejects 4 (failure mode)", () => {
    const bad: unknown = 4;
    expect(() => MatrixSlotIndexSchema.parse(bad)).toThrow();
  });

  it("MatrixSlotIndexSchema rejects NaN (adversarial)", () => {
    const bad: unknown = Number.NaN;
    expect(() => MatrixSlotIndexSchema.parse(bad)).toThrow();
  });

  it("MatrixSlotSchema rejects malformed slot_id 'M0T0'", () => {
    expect(() => MatrixSlotSchema.parse({ slot_id: "M0T0", material_index: 1, tool_index: 1 })).toThrow();
  });

  it("MatrixSlotSchema rejects malformed slot_id 'X1Y1'", () => {
    expect(() => MatrixSlotSchema.parse({ slot_id: "X1Y1", material_index: 1, tool_index: 1 })).toThrow();
  });

  it("ToolClassSchema rejects unknown tool class 'plasma_torch'", () => {
    const bad: unknown = "plasma_torch";
    expect(() => ToolClassSchema.parse(bad)).toThrow();
  });
});

// ── 7. Frozen matrix mutation guard ────────────────────────────────────────

describe("MaterialToolMatrixEngine — immutability", () => {
  it("matrix slots are frozen", () => {
    for (const s of MaterialToolMatrixEngine.slots()) {
      expect(Object.isFrozen(s)).toBe(true);
    }
  });

  it("slots() returns a defensive copy (popping does not affect matrix)", () => {
    const a = MaterialToolMatrixEngine.slots();
    expect(a.length).toBe(9);
    a.pop();
    expect(a.length).toBe(8);
    expect(MaterialToolMatrixEngine.slots().length).toBe(9);
  });

  it("toolClassesFor returns a defensive 3-tuple", () => {
    const a = MaterialToolMatrixEngine.toolClassesFor("pocket_2d");
    a[0] = "thread_tool" as ToolClass;
    const b = MaterialToolMatrixEngine.toolClassesFor("pocket_2d");
    expect(b[0]).toBe("roughing_endmill");
  });
});

// ── 8. Cross-host scenario projection ──────────────────────────────────────

describe("MaterialToolMatrixEngine — cross-host scenario projection", () => {
  it("turning category combos only ever cite lathe-shaped tool classes", () => {
    const turning = FixturePartCatalogEngine.listByCategory("turning");
    const allowed: ToolClass[] = ["od_rougher", "od_finisher", "thread_tool"];
    for (const p of turning) {
      const combos = MaterialToolMatrixEngine.comboesForPart(p.part_id);
      for (const c of combos) {
        expect(allowed).toContain(c.tool_class);
      }
    }
  });

  it("multi_axis category combos cite at least one ball/swarf finisher", () => {
    const ma = FixturePartCatalogEngine.listByCategory("multi_axis");
    for (const p of ma) {
      const combos = MaterialToolMatrixEngine.comboesForPart(p.part_id);
      const finisherSeen = combos.some(c =>
        c.tool_class === "ball_finisher" || c.tool_class === "swarf_cutter");
      expect(finisherSeen).toBe(true);
    }
  });
});

// ── 9. Dispatcher round-trip (mandated by ENGINE WIRING rule) ──────────────

describe("U-CAMTEST07 — dispatcher round-trip (prism_cam)", () => {
  it("ACTIONS array exposes all 7 material-tool matrix actions", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_mt_matrix_slots");
    expect(mod.ACTIONS).toContain("cam_mt_matrix_tool_classes_for");
    expect(mod.ACTIONS).toContain("cam_mt_matrix_combos_for_part");
    expect(mod.ACTIONS).toContain("cam_mt_matrix_get_combo");
    expect(mod.ACTIONS).toContain("cam_mt_matrix_all_combos");
    expect(mod.ACTIONS).toContain("cam_mt_matrix_expected_count");
    expect(mod.ACTIONS).toContain("cam_mt_matrix_audit");
  });

  it("engine reachable via the same dynamic-import path the dispatcher uses", async () => {
    const mod = await import("../engines/MaterialToolMatrixEngine.js");
    expect(mod.MaterialToolMatrixEngine.expectedComboCount()).toBe(180);
    const audit = mod.MaterialToolMatrixEngine.auditMatrix();
    expect(audit.ok).toBe(true);
  });

  it("derived dependency invariant: all-combo count = 9 × FixturePartCatalog.count()", async () => {
    const mtMod = await import("../engines/MaterialToolMatrixEngine.js");
    const partMod = await import("../engines/FixturePartCatalogEngine.js");
    expect(mtMod.MaterialToolMatrixEngine.allCombos().length)
      .toBe(9 * partMod.FixturePartCatalogEngine.count());
  });
});
