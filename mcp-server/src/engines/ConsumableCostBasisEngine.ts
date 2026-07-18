/**
 * ConsumableCostBasisEngine -- surface the per-consumable-type advisory cost
 * prior + close the reconciliation->prediction feedback loop (QUOTING-OPTIMAL/
 * U-QP-CONSUMABLE-COST-BASIS).
 *
 * WHY (the two gaps this closes):
 *   1. The tool-cost prior was exposed to NOTHING. jm-tool-purchases.json
 *      (byType {count, spend}, ~$4.9M / 7,150 line-items) was read only by
 *      ConsumableReconciliationEngine's internal loadAdvisoryPrior() fallback.
 *      Its material-side twin (jm-material-cost-basis.json) has a first-class
 *      dispatcher action (material_cost_basis); the tool side had none.
 *   2. The feedback loop was open. ConsumableReconciliationEngine emits bounded
 *      [0.8,1.2] feedback_multipliers to the OutcomeCaptureBus, but nothing read
 *      them back -- telemetry-only, no consumer re-applied them to the prior.
 *
 * WHAT IT DOES (honest, R12):
 *   - toolCostBasis(type?) exposes the advisory per-type prior spend/count =
 *     average $ per PURCHASE LINE-ITEM (a line-item may be a box of N inserts).
 *     ALWAYS confidence:"advisory" -- NEVER customer-grade. jm-tool-purchases.json
 *     is advisoryOnly:true and carries NO per-type qty, so this is a directional
 *     $ figure, not a true per-unit cost. Emitting it as a customer quote would be
 *     the units/grain error class the quoting galaxy gotcha #5 warns against.
 *   - recordMultipliers(byType) durably persists the reconciliation feedback
 *     multipliers (clamped [0.8,1.2], merge-not-replace). toolCostBasis then folds
 *     a stored multiplier into adjusted_usd_per_line_item WITHOUT ever dropping the
 *     raw prior (R12: never silently overwrite). The multiplier is re-clamped on
 *     READ too -- a corrupt ledger can never widen the [0.8,1.2] bound (mirrors the
 *     charlie soul refuse-list: softening-quote-vs-actual-reconciliation-thresholds).
 *
 * NOT a duplicate: ConsumableReconciliationEngine RECONCILES (predicted vs actual);
 * this engine SURFACES the prior + folds back the loop. VendorCostIndexEngine +
 * material_cost_basis do the same on the MATERIAL side (this is the clone-to-tool-side).
 *
 * Actions: tool_cost_basis (prism_quoting)
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { atomicWriteJson } from "../utils/atomicWrite.js";

// -- Reader path (mirrors ConsumableReconciliationEngine / VendorCostIndexEngine) --
const TOOL_PURCHASES_REL = "state/shared/quoting/jm-tool-purchases.json";
const MULTIPLIER_LEDGER_REL = "state/shared/quoting/consumable-feedback-multipliers.json";
const WALK_UP_DEPTH = 8;

// Bounded advisory multiplier range -- MUST match ConsumableReconciliationEngine's
// MULT_MIN/MULT_MAX. A tuning HINT, never a gate; never widened by a corrupt ledger.
const MULT_MIN = 0.8;
const MULT_MAX = 1.2;

const LEDGER_SCHEMA_VERSION = "1.0.0";

/** Best-effort resolution: walk up from cwd, then from this module's dir. */
function resolveRelPath(rel: string): string | null {
  const roots: string[] = [];
  let d = process.cwd();
  for (let i = 0; i < WALK_UP_DEPTH; i++) {
    roots.push(d);
    const up = dirname(d);
    if (up === d) break;
    d = up;
  }
  try {
    let m = dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < WALK_UP_DEPTH; i++) {
      roots.push(m);
      const up = dirname(m);
      if (up === m) break;
      m = up;
    }
  } catch {
    /* import.meta unavailable in this runtime -- cwd candidates suffice */
  }
  for (const r of roots) {
    const candidate = join(r, rel);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function clampMult(m: number): number {
  return Math.min(MULT_MAX, Math.max(MULT_MIN, m));
}
function round4(n: number): number {
  return Number(n.toFixed(4));
}

// -- Types -------------------------------------------------------------------

/** A single per-type advisory cost figure. */
export interface ToolCostBasisEntry {
  type: string;
  /** Advisory $ per PURCHASE LINE-ITEM (spend/count). Directional, NOT true $/unit. */
  usd_per_line_item: number;
  /** Number of AP line-items backing this figure (higher => less noisy, still advisory). */
  line_item_count: number;
  /**
   * ALWAYS "advisory" for a real figure ("none" when the type isn't in the basis).
   * The source is advisoryOnly + has no per-type qty, so this is never customer-grade.
   */
  confidence: "advisory" | "none";
  /** Present iff a reconciliation-ledger multiplier is stored for this type. */
  adjusted_usd_per_line_item?: number;
  /** Provenance of the adjustment; only set when adjusted_usd_per_line_item is set. */
  multiplier_source?: "reconciliation-ledger";
  /** The bounded [0.8,1.2] multiplier that produced the adjustment (re-clamped on read). */
  multiplier?: number;
  /** Reason code when confidence is "none". */
  reason?: string;
}

/** Persisted per-type feedback multiplier record. */
export interface LedgerMultiplierRecord {
  multiplier: number;
  /** Original value before clamping, present iff clamping changed it. */
  clampedFrom?: number;
  /** True when written by a consumable_reconcile cycle (vs a manual seed). */
  recorded_from_reconcile?: boolean;
}

/** On-disk shape of consumable-feedback-multipliers.json. */
export interface MultiplierLedger {
  schemaVersion: string;
  /** Caller-supplied ISO timestamp (engine is Date.now()-free for determinism). */
  updated_at?: string;
  byType: Record<string, LedgerMultiplierRecord>;
}

export interface ToolCostBasisOpts {
  /** Override path to the tool-purchases corpus (hermetic tests). */
  basisPath?: string;
  /** Override path to the multiplier ledger (hermetic tests). */
  ledgerPath?: string;
}

export interface RecordMultipliersOpts {
  /** Override path to the multiplier ledger (hermetic tests). */
  ledgerPath?: string;
  /** Caller-supplied ISO timestamp stamped into updated_at (dispatcher stamps it). */
  updatedAt?: string;
  /** Mark these as reconcile-sourced (default true). */
  fromReconcile?: boolean;
}

export class ConsumableCostBasisEngine {
  /**
   * Cache of the advisory prior, keyed by resolved path. byType (spend/count) and
   * counts (line-item n) are cached TOGETHER in one path-keyed object so the count
   * can never desync from the price on a cache hit (scrutiny P2 -- structural, not
   * a by-convention sidecar).
   */
  private priorCache: { path: string; byType: Record<string, number>; counts: Record<string, number> } | null = null;
  /** Cache of the multiplier ledger, keyed by resolved path. */
  private ledgerCache: { path: string; ledger: MultiplierLedger } | null = null;

  /**
   * Load the advisory per-type unit-cost prior from jm-tool-purchases.json.
   * Returns { type: spend/count } (avg $ per PURCHASE LINE-ITEM) + per-type line-item
   * counts. Empty maps on missing/corrupt file (fail-soft, never throws). Identical
   * spend/count math to ConsumableReconciliationEngine.loadAdvisoryPrior so the two
   * priors stay consistent.
   */
  private loadPrior(basisPath?: string): { byType: Record<string, number>; counts: Record<string, number> } {
    const path = basisPath ?? resolveRelPath(TOOL_PURCHASES_REL);
    if (path && this.priorCache && this.priorCache.path === path) {
      return { byType: this.priorCache.byType, counts: this.priorCache.counts };
    }
    if (!path || !existsSync(path)) return { byType: {}, counts: {} };
    try {
      const raw = JSON.parse(readFileSync(path, "utf8")) as {
        byType?: Record<string, { count?: number; spend?: number }>;
      };
      const byType: Record<string, number> = {};
      const counts: Record<string, number> = {};
      const src = raw.byType ?? {};
      for (const [k, v] of Object.entries(src)) {
        const count = v?.count ?? 0;
        const spend = v?.spend ?? 0;
        if (count > 0 && spend > 0) {
          byType[k] = spend / count;
          counts[k] = count;
        }
      }
      if (path) this.priorCache = { path, byType, counts };
      return { byType, counts };
    } catch {
      return { byType: {}, counts: {} }; // corrupt file -- advisory prior unavailable
    }
  }

  /**
   * Load the durable feedback-multiplier ledger. Fail-soft empty ledger on
   * missing/corrupt file. Every stored multiplier is RE-CLAMPED to [0.8,1.2] on
   * read -- a corrupt ledger can never widen the bound (charlie-soul threshold guard).
   */
  loadLedger(ledgerPath?: string): MultiplierLedger {
    const path = ledgerPath ?? resolveRelPath(MULTIPLIER_LEDGER_REL);
    if (path && this.ledgerCache && this.ledgerCache.path === path) return this.ledgerCache.ledger;
    const empty: MultiplierLedger = { schemaVersion: LEDGER_SCHEMA_VERSION, byType: {} };
    if (!path || !existsSync(path)) return empty;
    try {
      const raw = JSON.parse(readFileSync(path, "utf8")) as Partial<MultiplierLedger>;
      const byType: Record<string, LedgerMultiplierRecord> = {};
      for (const [k, v] of Object.entries(raw.byType ?? {})) {
        const m = (v as LedgerMultiplierRecord)?.multiplier;
        if (typeof m === "number" && Number.isFinite(m) && m > 0) {
          const clamped = clampMult(m);
          byType[k] = {
            multiplier: clamped,
            ...(clamped !== m ? { clampedFrom: m } : {}),
            ...((v as LedgerMultiplierRecord)?.recorded_from_reconcile
              ? { recorded_from_reconcile: true }
              : {}),
          };
        }
      }
      const ledger: MultiplierLedger = {
        schemaVersion: raw.schemaVersion ?? LEDGER_SCHEMA_VERSION,
        ...(raw.updated_at ? { updated_at: raw.updated_at } : {}),
        byType,
      };
      if (path) this.ledgerCache = { path, ledger };
      return ledger;
    } catch {
      return empty; // corrupt ledger -- fall back to raw prior only
    }
  }

  /**
   * Advisory per-type cost basis. No `type` => all types. `type` given => that one
   * (confidence:"none" when absent). Every real figure is confidence:"advisory".
   * The RAW usd_per_line_item is ALWAYS present; adjusted_usd_per_line_item is added
   * (never substituted) when a bounded reconciliation multiplier is stored.
   */
  toolCostBasis(type?: string, opts?: ToolCostBasisOpts): ToolCostBasisEntry | Record<string, ToolCostBasisEntry> {
    const { byType, counts } = this.loadPrior(opts?.basisPath);
    const ledger = this.loadLedger(opts?.ledgerPath);

    const build = (t: string): ToolCostBasisEntry => {
      const raw = byType[t];
      if (!(typeof raw === "number" && Number.isFinite(raw) && raw > 0)) {
        return { type: t, usd_per_line_item: 0, line_item_count: 0, confidence: "none", reason: "type-not-in-basis" };
      }
      const entry: ToolCostBasisEntry = {
        type: t,
        usd_per_line_item: round4(raw),
        line_item_count: counts[t] ?? 0,
        confidence: "advisory",
      };
      const rec = ledger.byType[t];
      if (rec && typeof rec.multiplier === "number" && Number.isFinite(rec.multiplier)) {
        const m = clampMult(rec.multiplier); // defense-in-depth re-clamp on read
        entry.adjusted_usd_per_line_item = round4(raw * m);
        entry.multiplier = round4(m);
        entry.multiplier_source = "reconciliation-ledger";
      }
      return entry;
    };

    if (typeof type === "string" && type) return build(type);
    const out: Record<string, ToolCostBasisEntry> = {};
    for (const t of Object.keys(byType)) out[t] = build(t);
    return out;
  }

  /**
   * Durably persist per-type feedback multipliers into the ledger. Clamps every
   * value to [0.8,1.2] on WRITE; drops non-finite / non-positive. Merge-not-replace
   * (a reconcile for `insert` must not wipe `drill`'s stored multiplier). Fail-soft:
   * a thrown write is swallowed and reported via the return flag -- it NEVER throws
   * to the caller (this rides the telemetry path in the dispatcher).
   *
   * CONCURRENCY (scrutiny P2): this is a read-merge-write. `atomicWriteJson` gives an
   * atomic rename (no torn file), but the read-merge-write is NOT locked, so two
   * concurrent reconcile cycles can last-writer-wins a peer's just-added type. This
   * matches the material-side ledger convention and is acceptable for a telemetry
   * advisory that the NEXT reconcile re-derives -- the merge-not-replace guarantee is
   * for SEQUENTIAL calls. Wrap in DistributedLockManager.withLock if strict.
   *
   * @returns { written, count } -- written=false on any I/O failure (caller stays green).
   */
  async recordMultipliers(
    byType: Record<string, number> | null | undefined,
    opts?: RecordMultipliersOpts,
  ): Promise<{ written: boolean; count: number }> {
    if (!byType || typeof byType !== "object") return { written: false, count: 0 };
    const path = opts?.ledgerPath ?? resolveRelPath(MULTIPLIER_LEDGER_REL);
    // If the ledger doesn't exist yet AND no explicit path was given, resolveRelPath
    // returns null (file-not-present). Fall back to the default location under cwd.
    const targetPath =
      path ?? (opts?.ledgerPath ? opts.ledgerPath : join(process.cwd(), MULTIPLIER_LEDGER_REL));

    // Start from the existing ledger (merge), reading STRAIGHT FROM DISK -- NOT via
    // this.loadLedger(), which returns the in-memory ledgerCache on a hit and would let a
    // concurrent (or same-process) peer write be clobbered by a stale cached snapshot
    // (scrutiny arm C P2). We parse the raw file here so the merge base is always current.
    let existingByType: Record<string, LedgerMultiplierRecord> = {};
    try {
      if (existsSync(targetPath)) {
        const raw = JSON.parse(readFileSync(targetPath, "utf8")) as Partial<MultiplierLedger>;
        for (const [k, v] of Object.entries(raw.byType ?? {})) {
          const m = (v as LedgerMultiplierRecord)?.multiplier;
          if (typeof m === "number" && Number.isFinite(m) && m > 0) {
            existingByType[k] = v as LedgerMultiplierRecord; // preserved as-is; re-clamped on read
          }
        }
      }
    } catch {
      /* corrupt/absent existing -> start fresh (fail-soft) */
    }

    const merged: Record<string, LedgerMultiplierRecord> = { ...existingByType };
    let count = 0;
    for (const [k, v] of Object.entries(byType)) {
      if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) continue; // drop bad
      const clamped = clampMult(v);
      merged[k] = {
        multiplier: clamped,
        ...(clamped !== v ? { clampedFrom: v } : {}),
        ...(opts?.fromReconcile !== false ? { recorded_from_reconcile: true } : {}),
      };
      count++;
    }
    if (count === 0) return { written: false, count: 0 };

    const ledger: MultiplierLedger = {
      schemaVersion: LEDGER_SCHEMA_VERSION,
      ...(opts?.updatedAt ? { updated_at: opts.updatedAt } : {}),
      byType: merged,
    };
    try {
      await atomicWriteJson(targetPath, ledger);
      // Refresh cache so an immediate read reflects the write.
      this.ledgerCache = { path: targetPath, ledger };
      return { written: true, count };
    } catch {
      return { written: false, count }; // telemetry-grade: never throw to the caller
    }
  }
}

export const consumableCostBasisEngine = new ConsumableCostBasisEngine();
