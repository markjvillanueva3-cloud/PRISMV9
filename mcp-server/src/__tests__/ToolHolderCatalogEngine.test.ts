/**
 * ToolHolderCatalogEngine tests — INGEST-MS4
 *
 * Tests CRUD, search, machine compatibility, inventory management,
 * reorder alerts, and brand tracking.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { toolHolderCatalogEngine } from "../engines/ToolHolderCatalogEngine.js";

function resetEngine(): void {
  (toolHolderCatalogEngine as any).holders = new Map();
  (toolHolderCatalogEngine as any).nextId = 1;
}

describe("ToolHolderCatalogEngine", () => {
  beforeEach(() => {
    resetEngine();
  });

  // ── CREATE ──────────────────────────────────────────────────────────

  describe("create", () => {
    it("creates a holder with full input", () => {
      const h = toolHolderCatalogEngine.create({
        type: "collet_chuck",
        brand: "Techniks",
        model: "SYIC-04536",
        taper: "BT40",
        bore_diameter_mm: 20,
        gauge_length_mm: 75,
        max_rpm: 25000,
        runout_um: 3,
        coolant_through: true,
        machine_ids: ["VMC-01", "VMC-02"],
        quantity_on_hand: 4,
        min_quantity: 2,
        location: "Tool Crib A",
        supplier: "MSC Industrial",
        unit_cost: 285,
      });

      expect(h.id).toMatch(/^TH-/);
      expect(h.type).toBe("collet_chuck");
      expect(h.brand).toBe("Techniks");
      expect(h.taper).toBe("BT40");
      expect(h.bore_diameter_mm).toBe(20);
      expect(h.max_rpm).toBe(25000);
      expect(h.coolant_through).toBe(true);
      expect(h.machine_ids).toContain("VMC-01");
      expect(h.status).toBe("active");
    });

    it("creates a holder with minimal input", () => {
      const h = toolHolderCatalogEngine.create({
        type: "end_mill_holder",
        brand: "Maritool",
        taper: "CAT40",
        bore_diameter_mm: 12,
      });

      expect(h.id).toMatch(/^TH-/);
      expect(h.quantity_on_hand).toBe(1);
      expect(h.min_quantity).toBe(1);
      expect(h.coolant_through).toBe(false);
    });

    it("assigns unique IDs", () => {
      const h1 = toolHolderCatalogEngine.create({ type: "collet_chuck", brand: "A", taper: "BT40", bore_diameter_mm: 10 });
      const h2 = toolHolderCatalogEngine.create({ type: "collet_chuck", brand: "B", taper: "BT40", bore_diameter_mm: 10 });
      expect(h1.id).not.toBe(h2.id);
    });
  });

  // ── GET / UPDATE ────────────────────────────────────────────────────

  describe("get / update", () => {
    it("gets a holder by ID", () => {
      const created = toolHolderCatalogEngine.create({ type: "hydraulic", brand: "Schunk", taper: "HSK-A63", bore_diameter_mm: 16 });
      const found = toolHolderCatalogEngine.get(created.id);
      expect(found).not.toBeNull();
      expect(found!.brand).toBe("Schunk");
    });

    it("returns null for unknown ID", () => {
      expect(toolHolderCatalogEngine.get("TH-9999")).toBeNull();
    });

    it("updates holder fields", () => {
      const h = toolHolderCatalogEngine.create({ type: "shrink_fit", brand: "Haimer", taper: "BT40", bore_diameter_mm: 10 });
      const updated = toolHolderCatalogEngine.update(h.id, { quantity_on_hand: 5, status: "worn" });
      expect(updated.quantity_on_hand).toBe(5);
      expect(updated.status).toBe("worn");
      expect(updated.brand).toBe("Haimer"); // unchanged
    });

    it("throws for unknown holder update", () => {
      expect(() => toolHolderCatalogEngine.update("TH-9999", {})).toThrow(/not found/);
    });
  });

  // ── SEARCH ──────────────────────────────────────────────────────────

  describe("search", () => {
    beforeEach(() => {
      toolHolderCatalogEngine.create({
        type: "collet_chuck", brand: "Techniks", taper: "BT40",
        bore_diameter_mm: 20, machine_ids: ["VMC-01"], coolant_through: true,
        quantity_on_hand: 3,
      });
      toolHolderCatalogEngine.create({
        type: "hydraulic", brand: "Schunk", taper: "HSK-A63",
        bore_diameter_mm: 16, machine_ids: ["VMC-02"], coolant_through: true,
        quantity_on_hand: 2,
      });
      toolHolderCatalogEngine.create({
        type: "boring_bar_holder", brand: "Big Daishowa", taper: "BT40",
        bore_diameter_mm: 25, machine_ids: ["VMC-01", "VMC-03"],
        quantity_on_hand: 0,
      });
    });

    it("searches by type", () => {
      const results = toolHolderCatalogEngine.search({ type: "hydraulic" });
      expect(results).toHaveLength(1);
      expect(results[0].brand).toBe("Schunk");
    });

    it("searches by taper", () => {
      const results = toolHolderCatalogEngine.search({ taper: "BT40" });
      expect(results).toHaveLength(2);
    });

    it("searches by brand", () => {
      const results = toolHolderCatalogEngine.search({ brand: "techniks" });
      expect(results).toHaveLength(1);
    });

    it("searches by machine compatibility", () => {
      const results = toolHolderCatalogEngine.search({ machine_id: "VMC-01" });
      expect(results).toHaveLength(2);
    });

    it("filters by bore range", () => {
      const results = toolHolderCatalogEngine.search({ bore_min_mm: 18, bore_max_mm: 26 });
      expect(results).toHaveLength(2); // 20mm and 25mm
    });

    it("filters coolant through", () => {
      const results = toolHolderCatalogEngine.search({ coolant_through: true });
      expect(results).toHaveLength(2);
    });

    it("filters in-stock only", () => {
      const results = toolHolderCatalogEngine.search({ in_stock_only: true });
      expect(results).toHaveLength(2); // boring bar has 0
    });

    it("searches by query across fields", () => {
      const results = toolHolderCatalogEngine.search({ query: "daishowa" });
      expect(results).toHaveLength(1);
    });

    it("respects limit", () => {
      const results = toolHolderCatalogEngine.search({ limit: 1 });
      expect(results).toHaveLength(1);
    });
  });

  // ── MACHINE COMPATIBILITY ──────────────────────────────────────────

  describe("machine compatibility", () => {
    beforeEach(() => {
      toolHolderCatalogEngine.create({
        type: "collet_chuck", brand: "Techniks", taper: "BT40",
        bore_diameter_mm: 20, machine_ids: ["VMC-01", "VMC-02"],
      });
      toolHolderCatalogEngine.create({
        type: "hydraulic", brand: "Schunk", taper: "BT40",
        bore_diameter_mm: 16, machine_ids: ["VMC-01"],
      });
      toolHolderCatalogEngine.create({
        type: "end_mill_holder", brand: "Maritool", taper: "CAT40",
        bore_diameter_mm: 12, machine_ids: ["VMC-03"],
      });
    });

    it("gets holders for a specific machine", () => {
      const compat = toolHolderCatalogEngine.getByMachine("VMC-01");
      expect(compat.holder_count).toBe(2);
      expect(compat.tapers_available).toContain("BT40");
      expect(compat.types_available).toContain("collet_chuck");
      expect(compat.types_available).toContain("hydraulic");
    });

    it("returns empty for machine with no holders", () => {
      const compat = toolHolderCatalogEngine.getByMachine("VMC-99");
      expect(compat.holder_count).toBe(0);
    });

    it("gets holders by taper type", () => {
      const bt40 = toolHolderCatalogEngine.getByTaper("BT40");
      expect(bt40).toHaveLength(2);

      const cat40 = toolHolderCatalogEngine.getByTaper("CAT40");
      expect(cat40).toHaveLength(1);
    });
  });

  // ── INVENTORY ───────────────────────────────────────────────────────

  describe("inventory", () => {
    beforeEach(() => {
      toolHolderCatalogEngine.create({
        type: "collet_chuck", brand: "Techniks", taper: "BT40",
        bore_diameter_mm: 20, quantity_on_hand: 4, min_quantity: 2,
        machine_ids: ["VMC-01"], unit_cost: 285,
      });
      toolHolderCatalogEngine.create({
        type: "hydraulic", brand: "Schunk", taper: "HSK-A63",
        bore_diameter_mm: 16, quantity_on_hand: 1, min_quantity: 2,
        machine_ids: ["VMC-02"], unit_cost: 450,
      });
      toolHolderCatalogEngine.create({
        type: "shrink_fit", brand: "Haimer", taper: "BT40",
        bore_diameter_mm: 10, quantity_on_hand: 0, min_quantity: 1,
        machine_ids: ["VMC-01", "VMC-02"], unit_cost: 350,
      });
    });

    it("generates inventory summary", () => {
      const summary = toolHolderCatalogEngine.getInventorySummary(["VMC-01", "VMC-02", "VMC-03"]);

      expect(summary.total_holders).toBe(3);
      expect(summary.active).toBe(3);
      expect(summary.by_type["collet_chuck"]).toBe(1);
      expect(summary.by_taper["BT40"]).toBe(2);
      expect(summary.by_brand["Techniks"]).toBe(1);
      expect(summary.machines_covered).toBe(2);
      expect(summary.machines_without_holders).toContain("VMC-03");
      expect(summary.total_value).toBe(4 * 285 + 1 * 450 + 0 * 350);
    });

    it("identifies low stock holders", () => {
      const summary = toolHolderCatalogEngine.getInventorySummary();
      expect(summary.low_stock).toHaveLength(2); // Schunk (1 <= 2) and Haimer (0 <= 1)
    });

    it("generates reorder list sorted by quantity", () => {
      const reorder = toolHolderCatalogEngine.getReorderList();
      expect(reorder).toHaveLength(2);
      expect(reorder[0].quantity_on_hand).toBe(0); // Haimer first (lowest)
      expect(reorder[1].quantity_on_hand).toBe(1); // Schunk second
    });

    it("adjusts stock quantity", () => {
      const h = toolHolderCatalogEngine.create({
        type: "end_mill_holder", brand: "Maritool", taper: "CAT40",
        bore_diameter_mm: 12, quantity_on_hand: 5,
      });

      toolHolderCatalogEngine.adjustStock(h.id, -2);
      expect(toolHolderCatalogEngine.get(h.id)!.quantity_on_hand).toBe(3);

      toolHolderCatalogEngine.adjustStock(h.id, 1);
      expect(toolHolderCatalogEngine.get(h.id)!.quantity_on_hand).toBe(4);
    });

    it("does not allow negative stock", () => {
      const h = toolHolderCatalogEngine.create({
        type: "drill_chuck", brand: "Bison", taper: "MT3",
        bore_diameter_mm: 13, quantity_on_hand: 1,
      });

      toolHolderCatalogEngine.adjustStock(h.id, -5);
      expect(toolHolderCatalogEngine.get(h.id)!.quantity_on_hand).toBe(0);
    });

    it("throws on adjusting unknown holder", () => {
      expect(() => toolHolderCatalogEngine.adjustStock("TH-9999", 1)).toThrow(/not found/);
    });
  });

  // ── BRANDS ──────────────────────────────────────────────────────────

  describe("brands", () => {
    it("returns known holder brands", () => {
      const brands = toolHolderCatalogEngine.getKnownBrands();
      expect(brands).toContain("Techniks");
      expect(brands).toContain("Maritool");
      expect(brands).toContain("Big Daishowa");
      expect(brands.length).toBeGreaterThan(10);
    });
  });

  // ── LIST ────────────────────────────────────────────────────────────

  describe("list", () => {
    it("lists all holders", () => {
      toolHolderCatalogEngine.create({ type: "collet_chuck", brand: "A", taper: "BT40", bore_diameter_mm: 10 });
      toolHolderCatalogEngine.create({ type: "hydraulic", brand: "B", taper: "BT40", bore_diameter_mm: 12 });
      expect(toolHolderCatalogEngine.list()).toHaveLength(2);
    });

    it("filters by status", () => {
      const h = toolHolderCatalogEngine.create({ type: "collet_chuck", brand: "A", taper: "BT40", bore_diameter_mm: 10 });
      toolHolderCatalogEngine.create({ type: "hydraulic", brand: "B", taper: "BT40", bore_diameter_mm: 12 });
      toolHolderCatalogEngine.update(h.id, { status: "retired" });

      expect(toolHolderCatalogEngine.list("active")).toHaveLength(1);
      expect(toolHolderCatalogEngine.list("retired")).toHaveLength(1);
    });
  });
});
