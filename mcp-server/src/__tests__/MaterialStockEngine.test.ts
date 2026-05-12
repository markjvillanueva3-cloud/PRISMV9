/**
 * MaterialStockEngine tests — INGEST-MS4B
 *
 * Tests material stock CRUD, ISO group inference, bulk import,
 * JM Die seeding, reorder alerts, and inventory summary.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { materialStockEngine } from "../engines/MaterialStockEngine.js";

function resetEngine(): void {
  (materialStockEngine as any).stock = new Map();
  (materialStockEngine as any).nextId = 1;
}

describe("MaterialStockEngine", () => {
  beforeEach(() => {
    resetEngine();
  });

  // ── CREATE ──────────────────────────────────────────────────────────

  describe("create", () => {
    it("creates a material stock item with full input", () => {
      const item = materialStockEngine.create({
        material_spec: "AISI D2",
        common_name: "D2 Tool Steel",
        iso_group: "H",
        form: "round_bar",
        size_1_mm: 50,
        size_label: '2" round bar',
        quantity_on_hand: 15,
        unit: "pcs",
        min_quantity: 5,
        location: "Rack A-3",
        supplier: "Ryerson Steel",
        unit_cost: 85.50,
        hardness_hrc: 62,
      });

      expect(item.id).toMatch(/^MAT-/);
      expect(item.material_spec).toBe("AISI D2");
      expect(item.iso_group).toBe("H");
      expect(item.form).toBe("round_bar");
      expect(item.quantity_on_hand).toBe(15);
      expect(item.status).toBe("in_stock");
    });

    it("auto-sets status to low when at min quantity", () => {
      const item = materialStockEngine.create({
        material_spec: "D2",
        quantity_on_hand: 2,
        min_quantity: 3,
      });
      expect(item.status).toBe("low");
    });

    it("auto-sets status to out_of_stock when zero", () => {
      const item = materialStockEngine.create({
        material_spec: "D2",
        quantity_on_hand: 0,
      });
      expect(item.status).toBe("out_of_stock");
    });

    it("assigns unique IDs", () => {
      const a = materialStockEngine.create({ material_spec: "A" });
      const b = materialStockEngine.create({ material_spec: "B" });
      expect(a.id).not.toBe(b.id);
    });
  });

  // ── ISO GROUP INFERENCE ─────────────────────────────────────────────

  describe("ISO group inference", () => {
    it("infers H for D2 tool steel", () => {
      expect(materialStockEngine.inferISOGroup("AISI D2")).toBe("H");
    });

    it("infers H for S7 shock steel", () => {
      expect(materialStockEngine.inferISOGroup("S7")).toBe("H");
    });

    it("infers S for M2 HSS", () => {
      expect(materialStockEngine.inferISOGroup("M2 HSS")).toBe("S");
    });

    it("infers K for carbide", () => {
      expect(materialStockEngine.inferISOGroup("Tungsten Carbide")).toBe("K");
    });

    it("infers N for graphite", () => {
      expect(materialStockEngine.inferISOGroup("EDM Graphite")).toBe("N");
    });

    it("infers M for stainless steel", () => {
      expect(materialStockEngine.inferISOGroup("304 Stainless")).toBe("M");
    });

    it("infers P for plain alloy steels", () => {
      expect(materialStockEngine.inferISOGroup("4140 Alloy Steel")).toBe("P");
    });

    it("defaults to P for unknown specs", () => {
      expect(materialStockEngine.inferISOGroup("Unknown Material XYZ")).toBe("P");
    });

    it("auto-infers when iso_group not provided", () => {
      const item = materialStockEngine.create({ material_spec: "AISI H13" });
      expect(item.iso_group).toBe("H");
    });
  });

  // ── GET / UPDATE ────────────────────────────────────────────────────

  describe("get / update", () => {
    it("gets by ID", () => {
      const created = materialStockEngine.create({ material_spec: "D2", quantity_on_hand: 10 });
      const found = materialStockEngine.get(created.id);
      expect(found).not.toBeNull();
      expect(found!.material_spec).toBe("D2");
    });

    it("returns null for unknown ID", () => {
      expect(materialStockEngine.get("MAT-9999")).toBeNull();
    });

    it("updates fields and auto-adjusts status", () => {
      const item = materialStockEngine.create({ material_spec: "D2", quantity_on_hand: 10, min_quantity: 3 });
      const updated = materialStockEngine.update(item.id, { quantity_on_hand: 2 });
      expect(updated.quantity_on_hand).toBe(2);
      expect(updated.status).toBe("low");
    });

    it("throws for unknown item", () => {
      expect(() => materialStockEngine.update("MAT-9999", {})).toThrow(/not found/);
    });
  });

  // ── STOCK ADJUSTMENT ────────────────────────────────────────────────

  describe("adjustStock", () => {
    it("increases stock on receipt", () => {
      const item = materialStockEngine.create({ material_spec: "D2", quantity_on_hand: 5 });
      materialStockEngine.adjustStock(item.id, 10, "Received from Ryerson");
      const updated = materialStockEngine.get(item.id)!;
      expect(updated.quantity_on_hand).toBe(15);
      expect(updated.last_received).not.toBe("");
      expect(updated.status).toBe("in_stock");
    });

    it("decreases stock on consumption", () => {
      const item = materialStockEngine.create({ material_spec: "D2", quantity_on_hand: 10, min_quantity: 3 });
      materialStockEngine.adjustStock(item.id, -8);
      expect(materialStockEngine.get(item.id)!.quantity_on_hand).toBe(2);
      expect(materialStockEngine.get(item.id)!.status).toBe("low");
    });

    it("does not go below zero", () => {
      const item = materialStockEngine.create({ material_spec: "D2", quantity_on_hand: 3 });
      materialStockEngine.adjustStock(item.id, -10);
      expect(materialStockEngine.get(item.id)!.quantity_on_hand).toBe(0);
      expect(materialStockEngine.get(item.id)!.status).toBe("out_of_stock");
    });

    it("throws for unknown item", () => {
      expect(() => materialStockEngine.adjustStock("MAT-9999", 1)).toThrow(/not found/);
    });
  });

  // ── SEARCH ──────────────────────────────────────────────────────────

  describe("search", () => {
    beforeEach(() => {
      materialStockEngine.create({ material_spec: "AISI D2", iso_group: "H", form: "round_bar", quantity_on_hand: 10, supplier: "Ryerson" });
      materialStockEngine.create({ material_spec: "AISI M2", iso_group: "S", form: "round_bar", quantity_on_hand: 5, supplier: "Ryerson" });
      materialStockEngine.create({ material_spec: "EDM Graphite", iso_group: "N", form: "block", quantity_on_hand: 0, supplier: "Poco Graphite" });
    });

    it("searches by query", () => {
      const results = materialStockEngine.search({ query: "graphite" });
      expect(results).toHaveLength(1);
    });

    it("filters by ISO group", () => {
      const results = materialStockEngine.search({ iso_group: "H" });
      expect(results).toHaveLength(1);
    });

    it("filters by form", () => {
      const results = materialStockEngine.search({ form: "block" });
      expect(results).toHaveLength(1);
    });

    it("filters by supplier", () => {
      const results = materialStockEngine.search({ supplier: "ryerson" });
      expect(results).toHaveLength(2);
    });

    it("filters in-stock only", () => {
      const results = materialStockEngine.search({ in_stock_only: true });
      expect(results).toHaveLength(2);
    });

    it("filters low stock", () => {
      const results = materialStockEngine.search({ low_stock_only: true });
      expect(results).toHaveLength(1); // graphite is out_of_stock
    });
  });

  // ── BULK IMPORT ─────────────────────────────────────────────────────

  describe("importFromRows", () => {
    it("imports multiple rows", () => {
      const result = materialStockEngine.importFromRows([
        { material_spec: "D2", common_name: "D2 Tool Steel", iso_group: "H", form: "round_bar", size_label: '2" round', quantity: "10", unit: "pcs", location: "Rack A", supplier: "Ryerson", unit_cost: "85", hardness: "62" },
        { material_spec: "S7", common_name: "S7 Shock", iso_group: "H", form: "round_bar", size_label: '1.5" round', quantity: "8", unit: "pcs", location: "Rack A", supplier: "Ryerson", unit_cost: "72", hardness: "56" },
      ]);

      expect(result.created).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(materialStockEngine.list()).toHaveLength(2);
    });

    it("handles invalid rows gracefully", () => {
      const result = materialStockEngine.importFromRows([
        { material_spec: "D2", common_name: "", iso_group: "", form: "", size_label: "", quantity: "bad", unit: "", location: "", supplier: "", unit_cost: "", hardness: "" },
      ]);
      expect(result.created).toBe(1); // Should still create with defaults
    });
  });

  // ── JM DIE SEEDING ──────────────────────────────────────────────────

  describe("JM Die seeding", () => {
    it("returns JM Die standard materials", () => {
      const materials = materialStockEngine.getJMDieMaterials();
      expect(materials.length).toBeGreaterThan(5);
      expect(materials.some(m => m.material_spec === "AISI D2")).toBe(true);
      expect(materials.some(m => m.material_spec === "EDM Graphite")).toBe(true);
    });

    it("seeds JM Die materials", () => {
      const count = materialStockEngine.seedJMDieMaterials();
      expect(count).toBe(10);
      expect(materialStockEngine.list()).toHaveLength(10);
    });

    it("skips duplicates on re-seed", () => {
      materialStockEngine.seedJMDieMaterials();
      const count = materialStockEngine.seedJMDieMaterials();
      expect(count).toBe(0); // All already exist
      expect(materialStockEngine.list()).toHaveLength(10);
    });
  });

  // ── SUMMARY ─────────────────────────────────────────────────────────

  describe("summary", () => {
    it("returns inventory summary", () => {
      materialStockEngine.create({ material_spec: "D2", iso_group: "H", quantity_on_hand: 10, unit_cost: 85, supplier: "Ryerson" });
      materialStockEngine.create({ material_spec: "M2", iso_group: "S", quantity_on_hand: 2, min_quantity: 5, unit_cost: 65, supplier: "Ryerson" });
      materialStockEngine.create({ material_spec: "Graphite", iso_group: "N", quantity_on_hand: 0, unit_cost: 45, supplier: "Poco" });

      const summary = materialStockEngine.getSummary();
      expect(summary.total_items).toBe(3);
      expect(summary.in_stock).toBe(1);
      expect(summary.low_stock).toBe(1);
      expect(summary.out_of_stock).toBe(1);
      expect(summary.by_iso_group["H"]).toBe(1);
      expect(summary.reorder_needed).toHaveLength(2);
      expect(summary.total_value).toBe(10 * 85 + 2 * 65 + 0);
    });
  });
});
