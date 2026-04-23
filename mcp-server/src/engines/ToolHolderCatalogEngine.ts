/**
 * ToolHolderCatalogEngine — Tool holder inventory with machine compatibility
 *
 * Manages JM Die's tool holder inventory: collet chucks, hydraulic holders,
 * shrink-fit, boring bar holders, ER collets, shell mill arbors, etc.
 * Tracks taper type, bore diameter, machine compatibility, brands,
 * and quantity on hand with reorder alerts.
 *
 * INGEST-MS4 / U-THL01
 * @module ToolHolderCatalogEngine
 */

import { log } from "../utils/Logger.js";
import { persistenceBridge } from "../db/PersistenceBridge.js";

// ============================================================================
// TYPES
// ============================================================================

export type HolderType =
  | "collet_chuck"
  | "hydraulic"
  | "shrink_fit"
  | "boring_bar_holder"
  | "end_mill_holder"
  | "er_collet"
  | "shell_mill_arbor"
  | "drill_chuck"
  | "tap_holder"
  | "face_mill_arbor"
  | "modular_adapter"
  | "vdi_holder"
  | "other";

export type TaperType =
  | "BT30"
  | "BT40"
  | "BT50"
  | "CAT40"
  | "CAT50"
  | "HSK-A63"
  | "HSK-A100"
  | "MT2"
  | "MT3"
  | "MT4"
  | "MT5"
  | "VDI30"
  | "VDI40"
  | "VDI50"
  | "Capto_C4"
  | "Capto_C6"
  | "ER16"
  | "ER20"
  | "ER25"
  | "ER32"
  | "ER40"
  | "straight_shank"
  | "other";

export interface ToolHolder {
  id: string;
  type: HolderType;
  brand: string;
  model: string;
  taper: TaperType;
  bore_diameter_mm: number;
  gauge_length_mm: number;
  projection_length_mm: number;
  max_rpm: number;
  runout_um: number;
  coolant_through: boolean;
  machine_ids: string[];
  quantity_on_hand: number;
  min_quantity: number;
  location: string;
  supplier: string;
  unit_cost: number;
  notes: string;
  status: "active" | "worn" | "retired" | "on_order";
  created_at: string;
  updated_at: string;
}

export interface HolderCreateInput {
  type: HolderType;
  brand: string;
  model?: string;
  taper: TaperType;
  bore_diameter_mm: number;
  gauge_length_mm?: number;
  projection_length_mm?: number;
  max_rpm?: number;
  runout_um?: number;
  coolant_through?: boolean;
  machine_ids?: string[];
  quantity_on_hand?: number;
  min_quantity?: number;
  location?: string;
  supplier?: string;
  unit_cost?: number;
  notes?: string;
}

export interface HolderSearchInput {
  query?: string;
  type?: HolderType;
  taper?: TaperType;
  brand?: string;
  machine_id?: string;
  bore_min_mm?: number;
  bore_max_mm?: number;
  coolant_through?: boolean;
  in_stock_only?: boolean;
  status?: ToolHolder["status"];
  limit?: number;
}

export interface HolderInventorySummary {
  total_holders: number;
  active: number;
  by_type: Record<string, number>;
  by_taper: Record<string, number>;
  by_brand: Record<string, number>;
  low_stock: ToolHolder[];
  total_value: number;
  machines_covered: number;
  machines_without_holders: string[];
}

export interface HolderMachineCompatibility {
  machine_id: string;
  compatible_holders: ToolHolder[];
  holder_count: number;
  tapers_available: TaperType[];
  types_available: HolderType[];
}

// ============================================================================
// ENGINE
// ============================================================================

/** Common holder brands in US die/mold shops */
const KNOWN_BRANDS = [
  "Techniks", "Lyndex-Nikken", "Parlec", "Big Daishowa",
  "Rego-Fix", "Maritool", "Kennametal", "Sandvik Coromant",
  "Haimer", "Schunk", "Seco", "Iscar", "Dorian", "Bison",
];

class ToolHolderCatalogEngine {
  private holders: Map<string, ToolHolder> = new Map();
  private nextId = 1;

  // ── Create ─────────────────────────────────────────────────────────

  /**
   * Create a new tool holder entry.
   */
  create(input: HolderCreateInput): ToolHolder {
    const id = `TH-${String(this.nextId++).padStart(4, "0")}`;
    const now = new Date().toISOString();

    const holder: ToolHolder = {
      id,
      type: input.type,
      brand: input.brand,
      model: input.model ?? "",
      taper: input.taper,
      bore_diameter_mm: input.bore_diameter_mm,
      gauge_length_mm: input.gauge_length_mm ?? 0,
      projection_length_mm: input.projection_length_mm ?? 0,
      max_rpm: input.max_rpm ?? 0,
      runout_um: input.runout_um ?? 0,
      coolant_through: input.coolant_through ?? false,
      machine_ids: input.machine_ids ?? [],
      quantity_on_hand: input.quantity_on_hand ?? 1,
      min_quantity: input.min_quantity ?? 1,
      location: input.location ?? "",
      supplier: input.supplier ?? "",
      unit_cost: input.unit_cost ?? 0,
      notes: input.notes ?? "",
      status: "active",
      created_at: now,
      updated_at: now,
    };

    this.holders.set(id, holder);
    persistenceBridge.persist("tool_holders", id, holder as any);
    log.info(`[ToolHolderCatalog] Created ${id}: ${holder.brand} ${holder.type} ${holder.taper}`);
    return holder;
  }

  // ── Get / Update ───────────────────────────────────────────────────

  /**
   * Get a holder by ID.
   */
  get(holderId: string): ToolHolder | null {
    return this.holders.get(holderId) ?? null;
  }

  /**
   * Update holder fields.
   */
  update(holderId: string, updates: Partial<Omit<ToolHolder, "id" | "created_at">>): ToolHolder {
    const holder = this.holders.get(holderId);
    if (!holder) throw new Error(`Tool holder not found: ${holderId}`);

    const updated: ToolHolder = {
      ...holder,
      ...updates,
      id: holder.id,
      created_at: holder.created_at,
      updated_at: new Date().toISOString(),
    };

    this.holders.set(holderId, updated);
    persistenceBridge.persist("tool_holders", holderId, updated as any);
    return updated;
  }

  // ── Search ─────────────────────────────────────────────────────────

  /**
   * Search holders by type, taper, brand, machine compatibility, or query.
   */
  search(input: HolderSearchInput): ToolHolder[] {
    let results = Array.from(this.holders.values());

    if (input.status) {
      results = results.filter(h => h.status === input.status);
    } else {
      results = results.filter(h => h.status === "active");
    }

    if (input.type) results = results.filter(h => h.type === input.type);
    if (input.taper) results = results.filter(h => h.taper === input.taper);

    if (input.brand) {
      const b = input.brand.toLowerCase();
      results = results.filter(h => h.brand.toLowerCase().includes(b));
    }

    if (input.machine_id) {
      results = results.filter(h => h.machine_ids.includes(input.machine_id!));
    }

    if (input.bore_min_mm !== undefined) {
      results = results.filter(h => h.bore_diameter_mm >= input.bore_min_mm!);
    }
    if (input.bore_max_mm !== undefined) {
      results = results.filter(h => h.bore_diameter_mm <= input.bore_max_mm!);
    }

    if (input.coolant_through !== undefined) {
      results = results.filter(h => h.coolant_through === input.coolant_through);
    }

    if (input.in_stock_only) {
      results = results.filter(h => h.quantity_on_hand > 0);
    }

    if (input.query) {
      const q = input.query.toLowerCase();
      results = results.filter(h =>
        h.brand.toLowerCase().includes(q) ||
        h.model.toLowerCase().includes(q) ||
        h.type.toLowerCase().includes(q) ||
        h.taper.toLowerCase().includes(q) ||
        h.notes.toLowerCase().includes(q)
      );
    }

    const limit = input.limit ?? 50;
    return results.slice(0, limit);
  }

  // ── Machine Compatibility ──────────────────────────────────────────

  /**
   * Get all compatible holders for a specific machine.
   */
  getByMachine(machineId: string): HolderMachineCompatibility {
    const compatible = Array.from(this.holders.values())
      .filter(h => h.machine_ids.includes(machineId) && h.status === "active");

    const tapers = [...new Set(compatible.map(h => h.taper))];
    const types = [...new Set(compatible.map(h => h.type))];

    return {
      machine_id: machineId,
      compatible_holders: compatible,
      holder_count: compatible.length,
      tapers_available: tapers,
      types_available: types,
    };
  }

  /**
   * Get all holders of a given taper type.
   */
  getByTaper(taper: TaperType): ToolHolder[] {
    return Array.from(this.holders.values())
      .filter(h => h.taper === taper && h.status === "active");
  }

  // ── Inventory ──────────────────────────────────────────────────────

  /**
   * Get inventory summary with low stock alerts.
   */
  getInventorySummary(allMachineIds?: string[]): HolderInventorySummary {
    const all = Array.from(this.holders.values());
    const active = all.filter(h => h.status === "active");

    const byType: Record<string, number> = {};
    const byTaper: Record<string, number> = {};
    const byBrand: Record<string, number> = {};
    const machinesCovered = new Set<string>();

    for (const h of active) {
      byType[h.type] = (byType[h.type] ?? 0) + 1;
      byTaper[h.taper] = (byTaper[h.taper] ?? 0) + 1;
      byBrand[h.brand] = (byBrand[h.brand] ?? 0) + 1;
      for (const m of h.machine_ids) machinesCovered.add(m);
    }

    const lowStock = active.filter(h => h.quantity_on_hand <= h.min_quantity);
    const totalValue = active.reduce((sum, h) => sum + h.unit_cost * h.quantity_on_hand, 0);

    const machinesWithout = allMachineIds
      ? allMachineIds.filter(m => !machinesCovered.has(m))
      : [];

    return {
      total_holders: all.length,
      active: active.length,
      by_type: byType,
      by_taper: byTaper,
      by_brand: byBrand,
      low_stock: lowStock,
      total_value: Math.round(totalValue * 100) / 100,
      machines_covered: machinesCovered.size,
      machines_without_holders: machinesWithout,
    };
  }

  /**
   * Check which holders need reordering (quantity at or below minimum).
   */
  getReorderList(): ToolHolder[] {
    return Array.from(this.holders.values())
      .filter(h => h.status === "active" && h.quantity_on_hand <= h.min_quantity)
      .sort((a, b) => a.quantity_on_hand - b.quantity_on_hand);
  }

  /**
   * Adjust stock quantity (checkout/return).
   */
  adjustStock(holderId: string, delta: number): ToolHolder {
    const holder = this.holders.get(holderId);
    if (!holder) throw new Error(`Tool holder not found: ${holderId}`);
    holder.quantity_on_hand = Math.max(0, holder.quantity_on_hand + delta);
    holder.updated_at = new Date().toISOString();
    return holder;
  }

  /**
   * List all holders, optionally filtered by status.
   */
  list(status?: ToolHolder["status"]): ToolHolder[] {
    const all = Array.from(this.holders.values());
    return status ? all.filter(h => h.status === status) : all;
  }

  /**
   * Get known holder brand names.
   */
  getKnownBrands(): string[] {
    return [...KNOWN_BRANDS];
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const toolHolderCatalogEngine = new ToolHolderCatalogEngine();

persistenceBridge.registerMap({
  entity: "tool_holders",
  getMap: () => (toolHolderCatalogEngine as any).holders as unknown as Map<string, any>,
  keyField: "id",
});
