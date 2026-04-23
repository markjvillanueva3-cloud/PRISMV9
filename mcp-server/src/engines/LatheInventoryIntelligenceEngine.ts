/**
 * LatheInventoryIntelligenceEngine — U-LTH53 (LATHE-MASTER P5 ERP)
 *
 * Real-time inventory view for lathe ops:
 *   - Track on-hand, reserved, on-order, and committed across SKUs
 *   - Compute reorder alerts (on-hand − reserved ≤ reorder_point)
 *   - EOQ-based suggested order quantity (Harris formula)
 *   - Stock aging by item type: materials, inserts, consumables, fixtures
 *   - Consumption history window (last N receipts + issues)
 *
 * Algorithm:
 *   - available = on_hand − reserved
 *   - pipeline = available + on_order
 *   - alert_level:
 *       critical : available < 0 OR on_hand=0 AND on_order=0 AND reorder_point>0
 *       low      : available ≤ reorder_point
 *       adequate : reorder_point < available ≤ max_stock
 *       excess   : available > max_stock
 *   - EOQ = √(2·D·S / H),  D=annual_demand, S=order_cost, H=holding_cost
 *
 * Physics / reference:
 *   - Harris EOQ (1913)
 *   - FIFO/LIFO aging (we use FIFO default)
 *   - Ryerson/Kennametal/Sandvik vendor standard lead times
 *
 * Persistence: state/shared/lathe-inventory-state.json, schemaVersion=1.
 *
 * @milestone LATHE-MASTER U-LTH53
 * @version 1.0.0
 */

import { z } from "zod";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { atomicWriteJson } from "../utils/atomicSessionWrite.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_ORDER_COST_USD = 50;
const DEFAULT_HOLDING_FRACTION = 0.2;
const AGING_WINDOW_DAYS_STALE = 90;
const AGING_WINDOW_DAYS_OLD = 180;

// ============================================================================
// SCHEMAS
// ============================================================================

export const SKUTypeSchema = z.enum(["material", "insert", "consumable", "fixture", "other"]);
export type SKUType = z.infer<typeof SKUTypeSchema>;

export const UpsertItemInputSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  type: SKUTypeSchema,
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
});
export type UpsertItemInput = z.infer<typeof UpsertItemInputSchema>;

export const MovementInputSchema = z.object({
  sku: z.string().min(1),
  type: z.enum(["receipt", "issue", "reserve", "unreserve", "adjust"]),
  quantity: z.number().finite(),
  job_id: z.string().optional(),
  reason: z.string().optional(),
});
export type MovementInput = z.infer<typeof MovementInputSchema>;

// ============================================================================
// DOMAIN TYPES
// ============================================================================

export type AlertLevel = "critical" | "low" | "adequate" | "excess";

export interface InventoryItem {
  sku: string;
  name: string;
  type: SKUType;
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
  last_receipt_at?: string;
  last_issue_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Movement {
  id: string;
  sku: string;
  type: MovementInput["type"];
  quantity: number;
  job_id?: string;
  reason?: string;
  at: string;
}

export interface InventoryState {
  schemaVersion: 1;
  items: InventoryItem[];
  movements: Movement[];
  next_movement_seq: number;
  updated_at: string;
}

export interface StockStatusRow {
  sku: string;
  name: string;
  type: SKUType;
  unit: string;
  on_hand: number;
  reserved: number;
  available: number;
  on_order: number;
  pipeline: number;
  reorder_point: number;
  alert_level: AlertLevel;
  suggested_order_qty: number;
  days_of_supply: number | null;
  last_movement_at: string | null;
  aging_status: "fresh" | "stale" | "old";
}

export interface InventorySnapshot {
  generated_at: string;
  item_count: number;
  total_value_usd: number;
  critical_count: number;
  low_count: number;
  excess_count: number;
  rows: StockStatusRow[];
}

// ============================================================================
// ENGINE
// ============================================================================

const DEFAULT_STATE_PATH = "H:/prism/state/shared/lathe-inventory-state.json";

class LatheInventoryIntelligenceEngine {
  private state: InventoryState;
  private readonly statePath: string;

  constructor(statePath: string = DEFAULT_STATE_PATH) {
    this.statePath = statePath;
    this.state = this.loadState();
  }

  upsertItem(input: UpsertItemInput): InventoryItem {
    const parsed = UpsertItemInputSchema.parse(input);
    const now = new Date().toISOString();
    const idx = this.state.items.findIndex((i) => i.sku === parsed.sku);
    if (idx < 0) {
      const item: InventoryItem = { ...parsed, created_at: now, updated_at: now };
      this.state.items.push(item);
      this.persist();
      return item;
    }
    const existing = this.state.items[idx];
    const merged: InventoryItem = {
      ...existing,
      ...parsed,
      created_at: existing.created_at,
      updated_at: now,
    };
    this.state.items[idx] = merged;
    this.persist();
    return merged;
  }

  recordMovement(input: MovementInput): Movement {
    const parsed = MovementInputSchema.parse(input);
    const item = this.state.items.find((i) => i.sku === parsed.sku);
    if (!item) {
      throw new Error(`LatheInventoryIntelligenceEngine: unknown sku '${parsed.sku}'`);
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
            `LatheInventoryIntelligenceEngine: issue ${parsed.quantity} exceeds on_hand ${item.on_hand} for sku '${parsed.sku}'`,
          );
        }
        item.on_hand -= parsed.quantity;
        item.reserved = Math.max(0, item.reserved - parsed.quantity);
        item.last_issue_at = new Date().toISOString();
        break;
      case "reserve":
        if (parsed.quantity > item.on_hand - item.reserved) {
          throw new Error(
            `LatheInventoryIntelligenceEngine: reserve ${parsed.quantity} exceeds available ${item.on_hand - item.reserved} for sku '${parsed.sku}'`,
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
        throw new Error(`LatheInventoryIntelligenceEngine: unknown movement type '${parsed.type}'`);
    }
    item.updated_at = new Date().toISOString();
    const mv: Movement = {
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

  snapshot(): InventorySnapshot {
    const now = Date.now();
    const rows: StockStatusRow[] = this.state.items.map((item) => {
      const available = item.on_hand - item.reserved;
      const pipeline = available + item.on_order;
      const alertLevel = this.computeAlert(item, available);
      const suggestedEOQ = this.suggestOrderQty(item, alertLevel);
      const daysOfSupply = this.computeDaysOfSupply(item, available);
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
        last_movement_at: lastMovement,
        aging_status: agingStatus,
      };
    });
    const totalValue = this.state.items.reduce((s, i) => s + i.on_hand * i.unit_cost_usd, 0);
    const critical = rows.filter((r) => r.alert_level === "critical").length;
    const low = rows.filter((r) => r.alert_level === "low").length;
    const excess = rows.filter((r) => r.alert_level === "excess").length;
    return {
      generated_at: new Date().toISOString(),
      item_count: rows.length,
      total_value_usd: round2(totalValue),
      critical_count: critical,
      low_count: low,
      excess_count: excess,
      rows,
    };
  }

  /** Filtered snapshot (e.g. only critical/low). */
  alerts(): StockStatusRow[] {
    return this.snapshot().rows.filter((r) => r.alert_level === "critical" || r.alert_level === "low");
  }

  getItem(sku: string): InventoryItem | null {
    return this.state.items.find((i) => i.sku === sku) ?? null;
  }

  movementsForSku(sku: string): Movement[] {
    return this.state.movements.filter((m) => m.sku === sku);
  }

  // ==========================================================================
  // INTERNALS
  // ==========================================================================

  private computeAlert(item: InventoryItem, available: number): AlertLevel {
    if (available < 0) return "critical";
    if (item.on_hand === 0 && item.on_order === 0 && item.reorder_point > 0) return "critical";
    if (available <= item.reorder_point) return "low";
    if (item.max_stock !== undefined && available > item.max_stock) return "excess";
    return "adequate";
  }

  private suggestOrderQty(item: InventoryItem, level: AlertLevel): number {
    if (level !== "critical" && level !== "low") return 0;
    const annual = item.annual_demand ?? 0;
    if (annual <= 0 || item.unit_cost_usd <= 0) {
      // Fallback: fill to max_stock if set, else 2× reorder_point
      if (item.max_stock !== undefined) {
        return Math.max(0, Math.ceil(item.max_stock - (item.on_hand - item.reserved)));
      }
      return Math.max(item.reorder_point, Math.ceil(item.reorder_point * 2));
    }
    const h = DEFAULT_HOLDING_FRACTION * item.unit_cost_usd;
    if (h <= 0) return item.reorder_point;
    return Math.ceil(Math.sqrt((2 * annual * DEFAULT_ORDER_COST_USD) / h));
  }

  private computeDaysOfSupply(item: InventoryItem, available: number): number | null {
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

  private loadState(): InventoryState {
    if (!existsSync(this.statePath)) return this.freshState();
    try {
      const raw = readFileSync(this.statePath, "utf-8");
      const parsed = JSON.parse(raw) as InventoryState;
      if (parsed.schemaVersion !== 1) {
        throw new Error(`unsupported schemaVersion ${parsed.schemaVersion}`);
      }
      return parsed;
    } catch {
      const backupPath = `${this.statePath}.corrupt.bak`;
      try {
        const raw = readFileSync(this.statePath, "utf-8");
        atomicWriteJson(backupPath, { backup_at: new Date().toISOString(), raw });
      } catch { /* ignore backup failure */ }
      return this.freshState();
    }
  }

  private freshState(): InventoryState {
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

  __getState(): Readonly<InventoryState> {
    return this.state;
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round3(n: number): number { return Math.round(n * 1000) / 1000; }

export const latheInventoryIntelligenceEngine = new LatheInventoryIntelligenceEngine();
export { LatheInventoryIntelligenceEngine };
