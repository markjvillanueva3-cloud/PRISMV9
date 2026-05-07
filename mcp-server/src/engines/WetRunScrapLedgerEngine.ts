/**
 * WetRunScrapLedgerEngine
 * ------------------------------------------------------------
 * Append-only ledger of scrap events during wet-run pilots.
 * Every scrapped piece costs the shop real money — raw material
 * plus labor plus burdened overhead — and auditors + pricing
 * want an unambiguous tally with links to the NCRs that caused
 * the scrap. Each entry is immutable after record(); only
 * metadata tagging (link_ncr, mark_salvaged) is additive.
 *
 * Cost model
 *   total_cost_cents =
 *     material_cost_cents
 *     + (labor_minutes / 60) * overhead_rate_per_hour_cents
 *   rounded half-up to the nearest cent. Material and overhead
 *   costs are integer cents to avoid IEEE-754 drift on long
 *   rollups.
 *
 * Aggregations
 *   totalScrapForPilot      — sum of all entries
 *   topScrapByCategory      — grouped breakdown ordered by cost
 *   scrapRate               — cost_per_good_part proxy
 *   salvagedShare           — cost rescued via rework vs total
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-SCRAP
 */

// ============================================================================
// Constants
// ============================================================================

const MIN_NOTE_CHARS = 20;

// ============================================================================
// Types
// ============================================================================

export type ScrapCategory =
  | "raw_material"
  | "in_process"
  | "finished"
  | "setup_waste"
  | "heat_treat_loss"
  | "fixture_damage";

export interface ScrapEntry {
  id: string;
  pilot_id: string;
  seq: number;
  ts: number;
  part_number: string;
  quantity: number;
  material_cost_cents: number;
  labor_minutes: number;
  overhead_rate_per_hour_cents: number;
  category: ScrapCategory;
  salvageable: boolean;
  salvaged: boolean;
  salvage_ncr_id?: string;
  ncr_id?: string;
  notes: string;
  total_cost_cents: number;
}

export interface RecordInput {
  pilot_id: string;
  ts: number;
  part_number: string;
  quantity: number;
  material_cost_cents: number;
  labor_minutes: number;
  overhead_rate_per_hour_cents: number;
  category: ScrapCategory;
  salvageable: boolean;
  ncr_id?: string;
  notes: string;
}

export interface CategorySummary {
  category: ScrapCategory;
  entry_count: number;
  total_quantity: number;
  total_cost_cents: number;
}

export interface PilotSummary {
  pilot_id: string;
  entry_count: number;
  total_quantity: number;
  total_cost_cents: number;
  salvaged_cost_cents: number;
  net_loss_cost_cents: number;
  by_category: CategorySummary[];
}

export interface Snapshot {
  schemaVersion: 1;
  entries: ScrapEntry[];
  last_seq_by_pilot: Record<string, number>;
  last_ts_by_pilot: Record<string, number>;
}

// ============================================================================
// Engine
// ============================================================================

export class WetRunScrapLedgerEngine {
  private entries: ScrapEntry[] = [];
  private lastSeqByPilot = new Map<string, number>();
  private lastTsByPilot = new Map<string, number>();

  // --------------------------------------------------------------------
  // record
  // --------------------------------------------------------------------
  record(input: RecordInput): ScrapEntry {
    this.validateString(input.pilot_id, "pilot_id");
    this.validateString(input.part_number, "part_number");
    this.validateCategory(input.category);
    this.validateTs(input.ts, "ts");
    this.validatePositiveInt(input.quantity, "quantity");
    this.validateNonNegInt(
      input.material_cost_cents,
      "material_cost_cents",
    );
    this.validateNonNegNum(input.labor_minutes, "labor_minutes");
    this.validateNonNegInt(
      input.overhead_rate_per_hour_cents,
      "overhead_rate_per_hour_cents",
    );
    if (typeof input.salvageable !== "boolean") {
      throw new Error(`salvageable must be a boolean`);
    }
    if (
      typeof input.notes !== "string" ||
      input.notes.trim().length < MIN_NOTE_CHARS
    ) {
      throw new Error(
        `notes must be at least ${MIN_NOTE_CHARS} characters`,
      );
    }
    if (input.ncr_id !== undefined) {
      this.validateString(input.ncr_id, "ncr_id");
    }

    const prevTs = this.lastTsByPilot.get(input.pilot_id) ?? -Infinity;
    if (input.ts <= prevTs) {
      throw new Error(
        `ts must be strictly monotonic per pilot: last=${prevTs} new=${input.ts}`,
      );
    }
    const prevSeq = this.lastSeqByPilot.get(input.pilot_id) ?? 0;
    const seq = prevSeq + 1;

    const total = this.computeTotalCents(
      input.material_cost_cents,
      input.labor_minutes,
      input.overhead_rate_per_hour_cents,
    );

    const entry: ScrapEntry = {
      id: `scrap:${input.pilot_id}:${seq.toString().padStart(6, "0")}`,
      pilot_id: input.pilot_id,
      seq,
      ts: input.ts,
      part_number: input.part_number,
      quantity: input.quantity,
      material_cost_cents: input.material_cost_cents,
      labor_minutes: input.labor_minutes,
      overhead_rate_per_hour_cents: input.overhead_rate_per_hour_cents,
      category: input.category,
      salvageable: input.salvageable,
      salvaged: false,
      ncr_id: input.ncr_id,
      notes: input.notes.trim(),
      total_cost_cents: total,
    };
    this.entries.push(entry);
    this.lastSeqByPilot.set(input.pilot_id, seq);
    this.lastTsByPilot.set(input.pilot_id, input.ts);
    return { ...entry };
  }

  // --------------------------------------------------------------------
  // linkNCR — associate an entry with an NCR after the fact
  // --------------------------------------------------------------------
  linkNCR(input: { entry_id: string; ncr_id: string }): ScrapEntry {
    const e = this.mustGet(input.entry_id);
    this.validateString(input.ncr_id, "ncr_id");
    if (e.ncr_id && e.ncr_id !== input.ncr_id) {
      throw new Error(
        `entry ${e.id} is already linked to NCR ${e.ncr_id}`,
      );
    }
    e.ncr_id = input.ncr_id;
    return { ...e };
  }

  // --------------------------------------------------------------------
  // markSalvaged — rework path succeeded; deduct from loss
  // --------------------------------------------------------------------
  markSalvaged(input: {
    entry_id: string;
    salvage_ncr_id: string;
  }): ScrapEntry {
    const e = this.mustGet(input.entry_id);
    if (!e.salvageable) {
      throw new Error(
        `entry ${e.id} was not marked salvageable at record time`,
      );
    }
    if (e.salvaged) {
      throw new Error(`entry ${e.id} already marked salvaged`);
    }
    this.validateString(input.salvage_ncr_id, "salvage_ncr_id");
    e.salvaged = true;
    e.salvage_ncr_id = input.salvage_ncr_id;
    return { ...e };
  }

  // --------------------------------------------------------------------
  // summariseForPilot
  // --------------------------------------------------------------------
  summariseForPilot(pilotId: string): PilotSummary {
    this.validateString(pilotId, "pilot_id");
    const mine = this.entries.filter((e) => e.pilot_id === pilotId);
    const cats = new Map<ScrapCategory, CategorySummary>();
    let totalQty = 0;
    let totalCost = 0;
    let salvagedCost = 0;
    for (const e of mine) {
      totalQty += e.quantity;
      totalCost += e.total_cost_cents;
      if (e.salvaged) salvagedCost += e.total_cost_cents;
      let c = cats.get(e.category);
      if (!c) {
        c = {
          category: e.category,
          entry_count: 0,
          total_quantity: 0,
          total_cost_cents: 0,
        };
        cats.set(e.category, c);
      }
      c.entry_count += 1;
      c.total_quantity += e.quantity;
      c.total_cost_cents += e.total_cost_cents;
    }
    const byCat = [...cats.values()].sort(
      (a, b) => b.total_cost_cents - a.total_cost_cents,
    );
    return {
      pilot_id: pilotId,
      entry_count: mine.length,
      total_quantity: totalQty,
      total_cost_cents: totalCost,
      salvaged_cost_cents: salvagedCost,
      net_loss_cost_cents: totalCost - salvagedCost,
      by_category: byCat,
    };
  }

  // --------------------------------------------------------------------
  // scrapRateCentsPerGoodPart — net loss / good parts produced
  // --------------------------------------------------------------------
  scrapRateCentsPerGoodPart(pilotId: string, goodPartsProduced: number): number {
    this.validateString(pilotId, "pilot_id");
    this.validatePositiveInt(goodPartsProduced, "goodPartsProduced");
    const summary = this.summariseForPilot(pilotId);
    return Math.round(summary.net_loss_cost_cents / goodPartsProduced);
  }

  // --------------------------------------------------------------------
  // salvagedShare — 0..1 fraction of total cost rescued
  // --------------------------------------------------------------------
  salvagedShare(pilotId: string): number {
    const s = this.summariseForPilot(pilotId);
    if (s.total_cost_cents === 0) return 0;
    return s.salvaged_cost_cents / s.total_cost_cents;
  }

  // --------------------------------------------------------------------
  // Readers
  // --------------------------------------------------------------------
  getEntry(id: string): ScrapEntry | undefined {
    const e = this.entries.find((x) => x.id === id);
    return e ? { ...e } : undefined;
  }

  listEntries(pilotId?: string): ScrapEntry[] {
    const mine = pilotId
      ? this.entries.filter((e) => e.pilot_id === pilotId)
      : this.entries;
    return mine.map((e) => ({ ...e }));
  }

  snapshot(): Snapshot {
    const seq: Record<string, number> = {};
    const ts: Record<string, number> = {};
    for (const [k, v] of this.lastSeqByPilot) seq[k] = v;
    for (const [k, v] of this.lastTsByPilot) ts[k] = v;
    return {
      schemaVersion: 1,
      entries: this.entries.map((e) => ({ ...e })),
      last_seq_by_pilot: seq,
      last_ts_by_pilot: ts,
    };
  }

  // --------------------------------------------------------------------
  // Internals
  // --------------------------------------------------------------------
  /** Rounds half-up to the nearest cent (avoids banker's rounding surprises). */
  private computeTotalCents(
    materialCents: number,
    laborMinutes: number,
    overheadCentsPerHour: number,
  ): number {
    const laborCentsExact = (laborMinutes / 60) * overheadCentsPerHour;
    const laborCents = Math.floor(laborCentsExact + 0.5);
    return materialCents + laborCents;
  }

  private mustGet(id: string): ScrapEntry {
    const e = this.entries.find((x) => x.id === id);
    if (!e) throw new Error(`scrap entry not found: ${id}`);
    return e;
  }

  private validateString(v: string, label: string): void {
    if (typeof v !== "string" || v.trim().length === 0) {
      throw new Error(`${label} must be a non-empty string`);
    }
  }

  private validateCategory(c: ScrapCategory): void {
    const allowed: ScrapCategory[] = [
      "raw_material",
      "in_process",
      "finished",
      "setup_waste",
      "heat_treat_loss",
      "fixture_damage",
    ];
    if (!allowed.includes(c)) throw new Error(`invalid scrap category: ${c}`);
  }

  private validateTs(ts: number, label: string): void {
    if (!Number.isFinite(ts)) throw new Error(`${label} must be finite`);
  }

  private validatePositiveInt(v: number, label: string): void {
    if (!Number.isInteger(v) || v < 1) {
      throw new Error(`${label} must be a positive integer`);
    }
  }

  private validateNonNegInt(v: number, label: string): void {
    if (!Number.isInteger(v) || v < 0) {
      throw new Error(`${label} must be a non-negative integer`);
    }
  }

  private validateNonNegNum(v: number, label: string): void {
    if (!Number.isFinite(v) || v < 0) {
      throw new Error(`${label} must be a non-negative finite number`);
    }
  }
}

// ============================================================================
// Singleton
// ============================================================================

export const wetRunScrapLedgerEngine = new WetRunScrapLedgerEngine();
