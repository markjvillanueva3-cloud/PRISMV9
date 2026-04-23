/**
 * MaterialStockEngine — Material inventory tracking for JM Die
 *
 * Tracks physical material stock levels, bar sizes, locations, suppliers,
 * and costs. Maps to MaterialRegistry entries via ISO group codes.
 * Supports import from spreadsheets and reorder alerts.
 *
 * JM Die primary materials:
 *   Tool steels: M2 (HSS), D2, S7, A2, H13
 *   Carbide: Tungsten carbide, cobalt-bonded
 *   Graphite: EDM electrode stock
 *   Other: 4140, 1018, bronze, aluminum
 *
 * INGEST-MS4B / U-MAT01
 * @module MaterialStockEngine
 */

import { log } from "../utils/Logger.js";
import { persistenceBridge } from "../db/PersistenceBridge.js";

// ============================================================================
// TYPES
// ============================================================================

export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";
export type StockForm = "round_bar" | "flat_bar" | "plate" | "block" | "tube" | "sheet" | "rod" | "blank" | "other";

export interface MaterialStockItem {
  id: string;
  material_spec: string;
  common_name: string;
  iso_group: ISOGroup;
  form: StockForm;
  /** Dimensions in mm */
  size_1_mm: number;
  size_2_mm: number;
  size_3_mm: number;
  size_label: string;
  quantity_on_hand: number;
  unit: string;
  min_quantity: number;
  location: string;
  supplier: string;
  unit_cost: number;
  hardness_hrc: number;
  notes: string;
  last_received: string;
  status: "in_stock" | "low" | "out_of_stock" | "on_order";
  created_at: string;
  updated_at: string;
}

export interface StockCreateInput {
  material_spec: string;
  common_name?: string;
  iso_group?: ISOGroup;
  form?: StockForm;
  size_1_mm?: number;
  size_2_mm?: number;
  size_3_mm?: number;
  size_label?: string;
  quantity_on_hand?: number;
  unit?: string;
  min_quantity?: number;
  location?: string;
  supplier?: string;
  unit_cost?: number;
  hardness_hrc?: number;
  notes?: string;
}

export interface StockSearchInput {
  query?: string;
  material_spec?: string;
  iso_group?: ISOGroup;
  form?: StockForm;
  supplier?: string;
  in_stock_only?: boolean;
  low_stock_only?: boolean;
  limit?: number;
}

export interface StockSummary {
  total_items: number;
  in_stock: number;
  low_stock: number;
  out_of_stock: number;
  by_iso_group: Record<string, number>;
  by_form: Record<string, number>;
  by_supplier: Record<string, number>;
  total_value: number;
  reorder_needed: MaterialStockItem[];
}

export interface MaterialImportRow {
  material_spec: string;
  common_name: string;
  iso_group: string;
  form: string;
  size_label: string;
  quantity: string;
  unit: string;
  location: string;
  supplier: string;
  unit_cost: string;
  hardness: string;
}

// ============================================================================
// ENGINE
// ============================================================================

/** JM Die's typical material specs → ISO group mapping */
const SPEC_TO_ISO: Record<string, ISOGroup> = {
  "m2": "S",    // M2 HSS — group S (super alloy behavior at high hardness)
  "d2": "H",    // D2 tool steel — hardened
  "s7": "H",    // S7 shock-resistant tool steel
  "a2": "H",    // A2 air-hardening tool steel
  "h13": "H",   // H13 hot work tool steel
  "4140": "P",   // 4140 alloy steel
  "1018": "P",   // 1018 mild steel
  "1045": "P",   // 1045 medium carbon
  "4340": "P",   // 4340 alloy steel
  "tungsten carbide": "K",
  "carbide": "K",
  "graphite": "N",  // EDM electrode graphite — non-ferrous
  "bronze": "N",
  "aluminum": "N",
  "copper": "N",
  "brass": "N",
  "titanium": "S",
  "inconel": "S",
  "stainless": "M",
  "304": "M",
  "316": "M",
  "17-4": "M",
};

class MaterialStockEngine {
  private stock: Map<string, MaterialStockItem> = new Map();
  private nextId = 1;

  // ── Create ─────────────────────────────────────────────────────────

  /**
   * Add a material stock item.
   */
  create(input: StockCreateInput): MaterialStockItem {
    const id = `MAT-${String(this.nextId++).padStart(4, "0")}`;
    const now = new Date().toISOString();
    const iso = input.iso_group ?? this.inferISOGroup(input.material_spec);

    const item: MaterialStockItem = {
      id,
      material_spec: input.material_spec,
      common_name: input.common_name ?? input.material_spec,
      iso_group: iso,
      form: input.form ?? "round_bar",
      size_1_mm: input.size_1_mm ?? 0,
      size_2_mm: input.size_2_mm ?? 0,
      size_3_mm: input.size_3_mm ?? 0,
      size_label: input.size_label ?? "",
      quantity_on_hand: input.quantity_on_hand ?? 0,
      unit: input.unit ?? "pcs",
      min_quantity: input.min_quantity ?? 1,
      location: input.location ?? "",
      supplier: input.supplier ?? "",
      unit_cost: input.unit_cost ?? 0,
      hardness_hrc: input.hardness_hrc ?? 0,
      notes: input.notes ?? "",
      last_received: "",
      status: "in_stock",
      created_at: now,
      updated_at: now,
    };

    // Auto-set status based on quantity
    if (item.quantity_on_hand <= 0) item.status = "out_of_stock";
    else if (item.quantity_on_hand <= item.min_quantity) item.status = "low";

    this.stock.set(id, item);
    persistenceBridge.persist("material_stock", id, item as any);
    log.info(`[MaterialStock] Created ${id}: ${item.material_spec} (${item.iso_group}) qty=${item.quantity_on_hand}`);
    return item;
  }

  // ── Get / Update ───────────────────────────────────────────────────

  get(itemId: string): MaterialStockItem | null {
    return this.stock.get(itemId) ?? null;
  }

  update(itemId: string, updates: Partial<Omit<MaterialStockItem, "id" | "created_at">>): MaterialStockItem {
    const item = this.stock.get(itemId);
    if (!item) throw new Error(`Material stock not found: ${itemId}`);

    Object.assign(item, updates);
    item.updated_at = new Date().toISOString();

    // Auto-update status
    if (item.quantity_on_hand <= 0) item.status = "out_of_stock";
    else if (item.quantity_on_hand <= item.min_quantity) item.status = "low";
    else item.status = "in_stock";

    persistenceBridge.persist("material_stock", itemId, item as any);
    return item;
  }

  /**
   * Adjust stock quantity (receive or consume material).
   */
  adjustStock(itemId: string, delta: number, reason?: string): MaterialStockItem {
    const item = this.stock.get(itemId);
    if (!item) throw new Error(`Material stock not found: ${itemId}`);

    item.quantity_on_hand = Math.max(0, item.quantity_on_hand + delta);
    item.updated_at = new Date().toISOString();

    if (delta > 0) item.last_received = item.updated_at;
    if (reason) item.notes = `${item.notes} | ${reason}`.trim().replace(/^\| /, "");

    // Auto-update status
    if (item.quantity_on_hand <= 0) item.status = "out_of_stock";
    else if (item.quantity_on_hand <= item.min_quantity) item.status = "low";
    else item.status = "in_stock";

    return item;
  }

  // ── Search ─────────────────────────────────────────────────────────

  search(input: StockSearchInput): MaterialStockItem[] {
    let results = Array.from(this.stock.values());

    if (input.material_spec) {
      const s = input.material_spec.toLowerCase();
      results = results.filter(m => m.material_spec.toLowerCase().includes(s));
    }
    if (input.iso_group) results = results.filter(m => m.iso_group === input.iso_group);
    if (input.form) results = results.filter(m => m.form === input.form);
    if (input.supplier) {
      const s = input.supplier.toLowerCase();
      results = results.filter(m => m.supplier.toLowerCase().includes(s));
    }
    if (input.in_stock_only) results = results.filter(m => m.quantity_on_hand > 0);
    if (input.low_stock_only) results = results.filter(m => m.status === "low" || m.status === "out_of_stock");

    if (input.query) {
      const q = input.query.toLowerCase();
      results = results.filter(m =>
        m.material_spec.toLowerCase().includes(q) ||
        m.common_name.toLowerCase().includes(q) ||
        m.size_label.toLowerCase().includes(q) ||
        m.supplier.toLowerCase().includes(q) ||
        m.notes.toLowerCase().includes(q)
      );
    }

    return results.slice(0, input.limit ?? 50);
  }

  // ── Bulk Import ────────────────────────────────────────────────────

  /**
   * Import material stock from parsed spreadsheet rows.
   */
  importFromRows(rows: MaterialImportRow[]): { created: number; errors: string[] } {
    let created = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        const qty = parseFloat(row.quantity) || 0;
        const cost = parseFloat(row.unit_cost) || 0;
        const hrc = parseFloat(row.hardness) || 0;

        this.create({
          material_spec: row.material_spec,
          common_name: row.common_name || row.material_spec,
          iso_group: (row.iso_group as ISOGroup) || this.inferISOGroup(row.material_spec),
          form: (row.form as StockForm) || "round_bar",
          size_label: row.size_label || "",
          quantity_on_hand: qty,
          unit: row.unit || "pcs",
          location: row.location || "",
          supplier: row.supplier || "",
          unit_cost: cost,
          hardness_hrc: hrc,
        });
        created++;
      } catch (e: any) {
        errors.push(`Row ${row.material_spec}: ${e.message}`);
      }
    }

    log.info(`[MaterialStock] Imported ${created}/${rows.length} items (${errors.length} errors)`);
    return { created, errors };
  }

  // ── Summary ────────────────────────────────────────────────────────

  getSummary(): StockSummary {
    const all = Array.from(this.stock.values());
    const byISO: Record<string, number> = {};
    const byForm: Record<string, number> = {};
    const bySupplier: Record<string, number> = {};

    for (const m of all) {
      byISO[m.iso_group] = (byISO[m.iso_group] ?? 0) + 1;
      byForm[m.form] = (byForm[m.form] ?? 0) + 1;
      if (m.supplier) bySupplier[m.supplier] = (bySupplier[m.supplier] ?? 0) + 1;
    }

    const totalValue = all.reduce((sum, m) => sum + m.unit_cost * m.quantity_on_hand, 0);

    return {
      total_items: all.length,
      in_stock: all.filter(m => m.status === "in_stock").length,
      low_stock: all.filter(m => m.status === "low").length,
      out_of_stock: all.filter(m => m.status === "out_of_stock").length,
      by_iso_group: byISO,
      by_form: byForm,
      by_supplier: bySupplier,
      total_value: Math.round(totalValue * 100) / 100,
      reorder_needed: all.filter(m => m.status === "low" || m.status === "out_of_stock"),
    };
  }

  /**
   * Get JM Die's standard material list for seeding.
   */
  getJMDieMaterials(): StockCreateInput[] {
    return [
      { material_spec: "AISI M2", common_name: "M2 HSS", iso_group: "S", form: "round_bar", notes: "High speed steel for punches" },
      { material_spec: "AISI D2", common_name: "D2 Tool Steel", iso_group: "H", form: "round_bar", notes: "Cold work die steel — primary die material" },
      { material_spec: "AISI S7", common_name: "S7 Shock Steel", iso_group: "H", form: "round_bar", notes: "Shock-resistant — heading dies" },
      { material_spec: "AISI A2", common_name: "A2 Tool Steel", iso_group: "H", form: "round_bar", notes: "Air-hardening tool steel" },
      { material_spec: "AISI H13", common_name: "H13 Hot Work", iso_group: "H", form: "block", notes: "Hot heading dies" },
      { material_spec: "Tungsten Carbide", common_name: "Carbide (WC-Co)", iso_group: "K", form: "blank", notes: "Carbide die inserts — cobalt bonded" },
      { material_spec: "EDM Graphite", common_name: "Graphite Electrode", iso_group: "N", form: "block", notes: "Poco/Tokai grades for sinker EDM" },
      { material_spec: "AISI 4140", common_name: "4140 Alloy Steel", iso_group: "P", form: "round_bar", notes: "Die holders, components" },
      { material_spec: "AISI 1018", common_name: "1018 Mild Steel", iso_group: "P", form: "round_bar", notes: "Fixtures, jigs, spacers" },
      { material_spec: "C360 Brass", common_name: "Free-cutting Brass", iso_group: "N", form: "round_bar", notes: "Bushings, wear parts" },
    ];
  }

  /**
   * Seed JM Die's standard materials into stock.
   */
  seedJMDieMaterials(): number {
    const materials = this.getJMDieMaterials();
    let created = 0;
    for (const mat of materials) {
      // Skip if already exists
      const existing = this.search({ material_spec: mat.material_spec });
      if (existing.length > 0) continue;
      this.create(mat);
      created++;
    }
    return created;
  }

  // ── ISO Group Inference ────────────────────────────────────────────

  /**
   * Infer ISO material group from spec name.
   */
  inferISOGroup(spec: string): ISOGroup {
    const lower = spec.toLowerCase();
    for (const [key, group] of Object.entries(SPEC_TO_ISO)) {
      if (lower.includes(key)) return group;
    }
    return "P"; // Default to P (steel)
  }

  list(): MaterialStockItem[] {
    return Array.from(this.stock.values());
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const materialStockEngine = new MaterialStockEngine();

persistenceBridge.registerMap({
  entity: "material_stock",
  getMap: () => (materialStockEngine as any).stock as unknown as Map<string, any>,
  keyField: "id",
});
