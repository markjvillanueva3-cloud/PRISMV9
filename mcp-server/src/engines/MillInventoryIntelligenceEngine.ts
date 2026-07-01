/**
 * MillInventoryIntelligenceEngine
 * =================================
 *
 * Real-time inventory view for mill operations. Mill parity for
 * LatheInventoryIntelligenceEngine (LATHE-MASTER U-LTH53) with MILL-CANONICAL
 * SKU types substituted for the mill-specific tooling stack:
 *
 *   - Lathe SKU types: material, insert, consumable, fixture, other
 *   - Mill  SKU types: material, endmill, drill_tap, soft_jaw_blank,
 *                       parallel_set, toolholder, dowel_pin, consumable,
 *                       fixture, other
 *
 * (lathe `insert` → mill `endmill` + `drill_tap` to cover both indexable
 *  endmills and drill/tap cycles separately; mill-canonical SKUs added:
 *  soft_jaw_blank, parallel_set, toolholder, dowel_pin)
 *
 * Algorithm:
 *   - available = on_hand − reserved
 *   - pipeline  = available + on_order
 *   - alert_level:
 *       critical : available < 0 OR on_hand=0 AND on_order=0 AND reorder_point>0
 *       low      : available ≤ reorder_point
 *       adequate : reorder_point < available ≤ max_stock
 *       excess   : available > max_stock
 *   - EOQ (Harris 1913) = √(2·D·S / H), D=annual_demand, S=order_cost, H=holding_cost
 *
 * Mill-canonical extensions:
 *   - tool_life_per_unit (for endmill/drill_tap): hours of cut life per piece
 *     → enables "how many MORE units of cut life remain?" inventory projection
 *   - alerts_by_type breakdown for endmill / drill_tap / soft_jaw_blank (the
 *     3 SKU classes most likely to hold up mill production)
 *
 * Citations:
 *   - Harris EOQ (1913)
 *   - FIFO/LIFO aging (default: FIFO)
 *   - Kennametal / Sandvik / Ingersoll mill-cutter catalogs (standard SKUs)
 *
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-INVENTORY-INTELLIGENCE (iter78)
 */

import { z } from "zod";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { atomicWriteJson } from "../utils/atomicSessionWrite.js";

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

export const DEFAULT_ORDER_COST_USD = 50;
export const DEFAULT_HOLDING_FRACTION = 0.2;
export const AGING_WINDOW_DAYS_STALE = 90;
export const AGING_WINDOW_DAYS_OLD = 180;

const DEFAULT_STATE_PATH = "H:/prism/state/shared/mill-inventory-state.json";

// ═══════════════════════════════════════════════════════════════════════
// SCHEMAS — mill-canonical SKU types
// ═══════════════════════════════════════════════════════════════════════

export const MillSKUTypeSchema = z.enum([
  "material",
  "endmill",            // MILL-CANONICAL (vs lathe's "insert")
  "drill_tap",          // MILL-CANONICAL
  "soft_jaw_blank",     // MILL-CANONICAL (lathe uses pre-bored chuck jaws)
  "parallel_set",       // MILL-CANONICAL
  "toolholder",         // MILL-CANONICAL (CAT40/CAT50/HSK shrink-fit etc.)
  "dowel_pin",          // MILL-CANONICAL (workstop / locator)
  "consumable",
  "fixture",
  "other",
]);
export type MillSKUType = z.infer<typeof MillSKUTypeSchema>;

/** Mill-canonical SKU types (not in lathe's 5-type taxonomy). */
export const MILL_CANONICAL_SKU_TYPES: MillSKUType[] = [
  "endmill", "drill_tap", "soft_jaw_blank", "parallel_set", "toolholder", "dowel_pin",
];

export const UpsertMillItemInputSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  type: MillSKUTypeSchema,
  unit: z.string().min(1),
  unit_cost_usd: z.number().min(0).finite(),
  on_hand: z.number().min(0).finite().default(0),
  reserved: z.number().min(0).finite().default(0),
  on_order: z.number().min(0).finite().default(0),
  reorder_point: z.number().min(0).finite().default(0),
  max_stock: z.number().min(0).finite().optional(),
  annual_demand: z.number().min(0).finite().optional(),
  lead_time_days: z.number().min(0).finite().default(7),
  vendor: z.string().optional(),
  /** MILL-CANONICAL: hours of cut life per unit (endmills + drill_tap) */
  tool_life_hours_per_unit: z.number().min(0).finite().optional(),
});
export type UpsertMillItemInput = z.infer<typeof UpsertMillItemInputSchema>;

export const MillMovementInputSchema = z.object({
  sku: z.string().min(1),
  type: z.enum(["receipt", "issue", "reserve", "unreserve", "adjust"]),
  quantity: z.number().finite(),
  job_id: z.string().optional(),
  reason: z.string().optional(),
});
export type MillMovementInput = z.infer<typeof MillMovementInputSchema>;

// ═══════════════════════════════════════════════════════════════════════
// DOMAIN TYPES
// ═══════════════════════════════════════════════════════════════════════

export type MillAlertLevel = "critical" | "low" | "adequate" | "excess";

export interface MillInventoryItem {
  sku: string;
  name: string;
  type: MillSKUType;
  unit: string;
  unit_cost_usd: number;
  on_hand: number;
  reserved: number;
  on_order: number;
  reorder_point: number;
  max_stock?: number;
  annual_demand?: number;
  lead_time_days: number;
  vendor?: string;
  tool_life_hours_per_unit?: number;
  last_receipt_at?: string;
  last_issue_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MillMovement {
  id: string;
  sku: string;
  type: MillMovementInput["type"];
  quantity: number;
  job_id?: string;
  reason?: string;
  at: string;
}

export interface MillInventoryState {
  schemaVersion: 1;
  items: MillInventoryItem[];
  movements: MillMovement[];
  next_movement_seq: number;
  updated_at: string;
}

export interface MillStockStatusRow {
  sku: string;
  name: string;
  type: MillSKUType;
  unit: string;
  on_hand: number;
  reserved: number;
  available: number;
  on_order: number;
  pipeline: number;
  reorder_point: number;
  alert_level: MillAlertLevel;
  suggested_order_qty: number;
  days_of_supply: number | null;
  /** MILL-CANONICAL: remaining tool-life hours = on_hand × tool_life_hours_per_unit */
  remaining_tool_life_hours: number | null;
  last_movement_at: string | null;
  aging_status: "fresh" | "stale" | "old";
}

export interface MillInventorySnapshot {
  generated_at: string;
  item_count: number;
  total_value_usd: number;
  critical_count: number;
  low_count: number;
  excess_count: number;
  /** MILL-CANONICAL: alerts grouped by type (endmill/drill_tap/soft_jaw_blank emphasis) */
  alerts_by_type: Record<MillSKUType, { critical: number; low: number }>;
  rows: MillStockStatusRow[];
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round3(n: number): number { return Math.round(n * 1000) / 1000; }

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class MillInventoryIntelligenceEngine {
  private state: MillInventoryState;
  private readonly statePath: string;

  constructor(statePath: string = DEFAULT_STATE_PATH) {
    this.statePath = statePath;
    this.state = this.loadState();
  }

  upsertItem(input: UpsertMillItemInput): MillInventoryItem {
    const parsed = UpsertMillItemInputSchema.parse(input);
    const now = new Date().toISOString();
    const idx = this.state.items.findIndex((i) => i.sku === parsed.sku);
    if (idx < 0) {
      const item: MillInventoryItem = { ...parsed, created_at: now, updated_at: now };
      this.state.items.push(item);
      this.persist();
      return item;
    }
    const existing = this.state.items[idx];
    const merged: MillInventoryItem = {
      ...existing,
      ...parsed,
      created_at: existing.created_at,
      updated_at: now,
    };
    this.state.items[idx] = merged;
    this.persist();
    return merged;
  }

  recordMovement(input: MillMovementInput): MillMovement {
    const parsed = MillMovementInputSchema.parse(input);
    const item = this.state.items.find((i) => i.sku === parsed.sku);
    if (!item) {
      throw new Error(`MillInventoryIntelligenceEngine: unknown sku '${parsed.sku}'`);
    }
    switch (parsed.type) {
      case "receipt":
        item.on_hand += parsed.quantity;
        item.on_order = Math.max(0, item.on_order - parsed.quantity);
        item.last_receipt_at = new Date().toISOString();
        break;
      case "issue":
        if (parsed.quantity > item.on_hand) {
          throw new Error(
            `MillInventoryIntelligenceEngine: issue ${parsed.quantity} exceeds on_hand ${item.on_hand} for sku '${parsed.sku}'`,
          );
        }
        item.on_hand -= parsed.quantity;
        item.reserved = Math.max(0, item.reserved - parsed.quantity);
        item.last_issue_at = new Date().toISOString();
        break;
      case "reserve":
        if (parsed.quantity > item.on_hand - item.reserved) {
          throw new Error(
            `MillInventoryIntelligenceEngine: reserve ${parsed.quantity} exceeds available ${item.on_hand - item.reserved} for sku '${parsed.sku}'`,
          );
        }
        item.reserved += parsed.quantity;
        break;
      case "unreserve":
        item.reserved = Math.max(0, item.reserved - parsed.quantity);
        break;
      case "adjust":
        item.on_hand = Math.max(0, item.on_hand + parsed.quantity);
        break;
      default:
        throw new Error(`MillInventoryIntelligenceEngine: unknown movement type '${parsed.type}'`);
    }
    item.updated_at = new Date().toISOString();
    const mv: MillMovement = {
      id: `mv_${this.state.next_movement_seq.toString().padStart(8, "0")}`,
      sku: parsed.sku,
      type: parsed.type,
      quantity: parsed.quantity,
      job_id: parsed.job_id,
      reason: parsed.reason,
      at: new Date().toISOString(),
    };
    this.state.next_movement_seq++;
    this.state.movements.push(mv);
    this.persist();
    return mv;
  }

  snapshot(): MillInventorySnapshot {
    const now = Date.now();
    const rows: MillStockStatusRow[] = this.state.items.map((item) => {
      const available = item.on_hand - item.reserved;
      const pipeline = available + item.on_order;
      const alertLevel = this.computeAlert(item, available);
      const suggestedEOQ = this.suggestOrderQty(item, alertLevel);
      const daysOfSupply = this.computeDaysOfSupply(item, available);
      const remainingLife = typeof item.tool_life_hours_per_unit === "number"
        ? round2(item.on_hand * item.tool_life_hours_per_unit)
        : null;
      const lastMovement = this.latestMovementTs(item.sku);
      const agingStatus = this.computeAgingStatus(lastMovement, now);
      return {
        sku: item.sku,
        name: item.name,
        type: item.type,
        unit: item.unit,
        on_hand: round3(item.on_hand),
        reserved: round3(item.reserved),
        available: round3(available),
        on_order: round3(item.on_order),
        pipeline: round3(pipeline),
        reorder_point: item.reorder_point,
        alert_level: alertLevel,
        suggested_order_qty: suggestedEOQ,
        days_of_supply: daysOfSupply,
        remaining_tool_life_hours: remainingLife,
        last_movement_at: lastMovement,
        aging_status: agingStatus,
      };
    });
    const totalValue = this.state.items.reduce((s, i) => s + i.on_hand * i.unit_cost_usd, 0);
    const critical = rows.filter((r) => r.alert_level === "critical").length;
    const low = rows.filter((r) => r.alert_level === "low").length;
    const excess = rows.filter((r) => r.alert_level === "excess").length;

    // MILL-CANONICAL: alerts_by_type breakdown
    const alertsByType: Record<MillSKUType, { critical: number; low: number }> = {
      material: { critical: 0, low: 0 },
      endmill: { critical: 0, low: 0 },
      drill_tap: { critical: 0, low: 0 },
      soft_jaw_blank: { critical: 0, low: 0 },
      parallel_set: { critical: 0, low: 0 },
      toolholder: { critical: 0, low: 0 },
      dowel_pin: { critical: 0, low: 0 },
      consumable: { critical: 0, low: 0 },
      fixture: { critical: 0, low: 0 },
      other: { critical: 0, low: 0 },
    };
    for (const r of rows) {
      if (r.alert_level === "critical") alertsByType[r.type].critical++;
      else if (r.alert_level === "low") alertsByType[r.type].low++;
    }

    return {
      generated_at: new Date().toISOString(),
      item_count: rows.length,
      total_value_usd: round2(totalValue),
      critical_count: critical,
      low_count: low,
      excess_count: excess,
      alerts_by_type: alertsByType,
      rows,
    };
  }

  alerts(): MillStockStatusRow[] {
    return this.snapshot().rows.filter((r) => r.alert_level === "critical" || r.alert_level === "low");
  }

  /** Mill-canonical: project remaining cut-life for a tool SKU based on on_hand × life-per-unit. */
  projectToolLifeHours(sku: string): number | null {
    const item = this.state.items.find((i) => i.sku === sku);
    if (!item || typeof item.tool_life_hours_per_unit !== "number") return null;
    return round2(item.on_hand * item.tool_life_hours_per_unit);
  }

  getItem(sku: string): MillInventoryItem | null {
    return this.state.items.find((i) => i.sku === sku) ?? null;
  }

  movementsForSku(sku: string): MillMovement[] {
    return this.state.movements.filter((m) => m.sku === sku);
  }

  getStats(): {
    sku_types: MillSKUType[];
    mill_canonical_sku_types: MillSKUType[];
    eoq_formula: string;
    aging_windows: { stale_days: number; old_days: number };
    reference: string;
  } {
    return {
      sku_types: ["material", "endmill", "drill_tap", "soft_jaw_blank",
                  "parallel_set", "toolholder", "dowel_pin",
                  "consumable", "fixture", "other"],
      mill_canonical_sku_types: MILL_CANONICAL_SKU_TYPES,
      eoq_formula: "EOQ = sqrt(2 * annual_demand * order_cost / holding_cost), Harris 1913",
      aging_windows: { stale_days: AGING_WINDOW_DAYS_STALE, old_days: AGING_WINDOW_DAYS_OLD },
      reference: "Harris EOQ 1913; Kennametal/Sandvik/Ingersoll mill catalogs",
    };
  }

  // ───────────────────────── internals ─────────────────────────────────

  private computeAlert(item: MillInventoryItem, available: number): MillAlertLevel {
    if (available < 0) return "critical";
    if (item.on_hand === 0 && item.on_order === 0 && item.reorder_point > 0) return "critical";
    if (available <= item.reorder_point) return "low";
    if (item.max_stock !== undefined && available > item.max_stock) return "excess";
    return "adequate";
  }

  private suggestOrderQty(item: MillInventoryItem, level: MillAlertLevel): number {
    if (level !== "critical" && level !== "low") return 0;
    const annual = item.annual_demand ?? 0;
    if (annual <= 0 || item.unit_cost_usd <= 0) {
      if (item.max_stock !== undefined) {
        return Math.max(0, Math.ceil(item.max_stock - (item.on_hand - item.reserved)));
      }
      return Math.max(item.reorder_point, Math.ceil(item.reorder_point * 2));
    }
    const h = DEFAULT_HOLDING_FRACTION * item.unit_cost_usd;
    if (h <= 0) return item.reorder_point;
    return Math.ceil(Math.sqrt((2 * annual * DEFAULT_ORDER_COST_USD) / h));
  }

  private computeDaysOfSupply(item: MillInventoryItem, available: number): number | null {
    if (!item.annual_demand || item.annual_demand <= 0) return null;
    const dailyDemand = item.annual_demand / 365;
    if (dailyDemand <= 0) return null;
    return Math.round((available / dailyDemand) * 10) / 10;
  }

  private latestMovementTs(sku: string): string | null {
    const movements = this.state.movements.filter((m) => m.sku === sku);
    if (movements.length === 0) return null;
    return movements[movements.length - 1].at;
  }

  private computeAgingStatus(lastIso: string | null, nowMs: number): "fresh" | "stale" | "old" {
    if (!lastIso) return "old";
    const ageDays = (nowMs - Date.parse(lastIso)) / (1000 * 60 * 60 * 24);
    if (ageDays > AGING_WINDOW_DAYS_OLD) return "old";
    if (ageDays > AGING_WINDOW_DAYS_STALE) return "stale";
    return "fresh";
  }

  private loadState(): MillInventoryState {
    if (!existsSync(this.statePath)) return this.freshState();
    try {
      const raw = readFileSync(this.statePath, "utf-8");
      const parsed = JSON.parse(raw) as MillInventoryState;
      if (parsed.schemaVersion !== 1) {
        throw new Error(`unsupported schemaVersion ${parsed.schemaVersion}`);
      }
      return parsed;
    } catch {
      const backupPath = `${this.statePath}.corrupt.bak`;
      try {
        const raw = readFileSync(this.statePath, "utf-8");
        atomicWriteJson(backupPath, { backup_at: new Date().toISOString(), raw });
      } catch { /* ignore */ }
      return this.freshState();
    }
  }

  private freshState(): MillInventoryState {
    return {
      schemaVersion: 1,
      items: [],
      movements: [],
      next_movement_seq: 1,
      updated_at: new Date().toISOString(),
    };
  }

  private persist(): void {
    this.state.updated_at = new Date().toISOString();
    const dir = dirname(this.statePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    atomicWriteJson(this.statePath, this.state);
  }

  __resetForTests(): void {
    this.state = this.freshState();
    this.persist();
  }

  __getState(): Readonly<MillInventoryState> {
    return this.state;
  }
}

export const millInventoryIntelligenceEngine = new MillInventoryIntelligenceEngine();
export { MillInventoryIntelligenceEngine };
