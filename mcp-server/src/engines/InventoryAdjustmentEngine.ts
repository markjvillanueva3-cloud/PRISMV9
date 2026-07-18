/**
 * InventoryAdjustmentEngine — QuickBooks "Adjust Quantity/Value on Hand" parity for the PRISM
 * ERP (galaxy:business, slot:hotel). QB-PARITY-MS0 Phase-5 (items/inventory cycle) engine.
 *
 * QuickBooks parity: the Inventory → "Adjust Quantity/Value on Hand" function. Two modes:
 *   - {@link adjustQuantity} — a quantity change at a known unit cost (the QB "Quantity"
 *     adjustment): valueDelta = (qtyAfter − qtyBefore) × unitCost.
 *   - {@link adjustValue} — a direct value revaluation at a FIXED quantity (the QB "Total Value"
 *     adjustment): valueDelta = valueAfter − valueBefore.
 *
 * GL polarity (per Intuit + GAAP ASC 330-10-35 lower-of-cost-or-NRV — see inventory-adjustment-policy.ts):
 *   - Positive valueDelta (found stock / count-up): DR <inventory asset 13xx> / CR 5100 Materials
 *     Expense (contra — QB credits the adjustment account, reducing the period's materials cost).
 *   - Negative valueDelta (shrinkage / write-down): DR 5100 Materials Expense / CR <inventory asset 13xx>.
 *
 * DEDUP — this engine is NOT a stock ledger. {@link MaterialStockEngine} OWNS the physical on-hand
 * ledger (quantity_on_hand, status, reorder). This engine PURELY computes the adjustment delta and
 * its balanced GL posting and RETURNS the lines as DATA; it never mutates MaterialStock and never
 * calls GeneralLedgerEngine.postEntry. The caller (or a dispatcher) applies the qty change to
 * MaterialStock and posts the returned lines to the GL. unitCost is supplied by the caller, which
 * decouples this engine from ItemMaster and keeps it pure/testable.
 *
 * Financial-invariant compliance (business/GSD.md §2.1, [[feedback_hotel_financial_invariant_gate]]):
 *  - half-even (banker's) rounding to the cent — REUSES roundCentsHalfEven (shared money util) from the shared money util src/data/money.ts (DRY).
 *  - the offsetting account (5100) is IMPORTED from inventory-adjustment-policy.ts, never inlined; the
 *    inventory-asset side is caller-supplied and validated against the live GL CHART_OF_ACCOUNTS AND the
 *    13xx inventory-asset class (unknown id or non-13xx class → THROW).
 *  - money reconciles BOTH ways: qtyBefore + qtyDelta == qtyAfter, and the value reconstructed from the
 *    returned GL lines (asset-side debit minus credit) == the reported valueDelta.
 *  - the RETURNED GL effect balances Σdebits == Σcredits (asserted before return; throws on imbalance).
 *  - zero delta THROWS (a no-op adjustment is a surfaced error, not a silent empty posting).
 *  - negative unitCost / non-finite inputs / qtyAfter < 0 THROW (no silent coercion, never return 0/NaN).
 */
// WIRE-EXEMPT: dispatcher wiring deferred to MAIN (worktree businessDispatcher stale 441 vs main 879);
// wiring the stale worktree copy would clobber ~438 main actions on golf-merge. Wire in MAIN post-merge.
import { z } from "zod";
import { roundCentsHalfEven } from "../data/money.js";
import { CHART_OF_ACCOUNTS, type Account } from "./GeneralLedgerEngine.js";
import {
  INVENTORY_ADJUSTMENT_ACCOUNTS,
  INVENTORY_ADJUSTMENT_POLICY_SCHEMA_VERSION,
  isInventoryAssetAccountId,
  isValidInventoryAdjustmentReason,
  type InventoryAdjustmentReason,
} from "../data/inventory-adjustment-policy.js";

/** Canonical chart index: accountId → Account. Reuses GL's exported chart (no re-derivation). */
const ACCOUNT_INDEX: ReadonlyMap<string, Account> = new Map(CHART_OF_ACCOUNTS.map((a) => [a.id, a]));

const EPS = 1e-9;

// ============================================================================
// SCHEMAS — z.input (NOT z.infer) so .default() fields stay optional for callers
// ============================================================================

const QuantityAdjustmentSchema = z.object({
  itemCode: z.string().min(1),
  /** Inventory asset account the adjustment posts against — must be a 13xx account in the GL chart. */
  assetAccountId: z.string().min(1),
  /** Per-unit carrying cost of the item (caller-supplied; decouples from ItemMaster). Must be > 0. */
  unitCost: z.number().finite().positive(),
  qtyBefore: z.number().finite(),
  qtyAfter: z.number().finite(),
  reason: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
});
export type QuantityAdjustmentInput = z.input<typeof QuantityAdjustmentSchema>;

const ValueAdjustmentSchema = z.object({
  itemCode: z.string().min(1),
  assetAccountId: z.string().min(1),
  /** Quantity is held fixed in a value revaluation; carried through for the audit trail. Must be > 0. */
  qty: z.number().finite().positive(),
  valueBefore: z.number().finite().nonnegative(),
  valueAfter: z.number().finite().nonnegative(),
  reason: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
});
export type ValueAdjustmentInput = z.input<typeof ValueAdjustmentSchema>;

// ============================================================================
// RESULT TYPES
// ============================================================================

/** One side of a balanced GL posting (exactly one of debit / credit is positive). */
export interface GLLine {
  account: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface InventoryAdjustmentResult {
  itemCode: string;
  assetAccountId: string;
  /** Balanced GL lines (Σdebit == Σcredit), ready for GeneralLedgerEngine.createJournalEntry. */
  lines: GLLine[];
  /** Signed value change, half-even rounded to the cent (+ found stock, − shrinkage/write-down). */
  valueDelta: number;
  /** Signed quantity change (qtyAfter − qtyBefore). Zero for a fixed-qty value revaluation. */
  qtyDelta: number;
  /** Resulting on-hand quantity after the adjustment (== qtyAfter for adjustQuantity). */
  newQty: number;
  reason: InventoryAdjustmentReason;
  date: string;
  /** "quantity" (qty change at fixed unit cost) | "value" (value change at fixed qty). */
  mode: "quantity" | "value";
  policySchemaVersion: string;
}

// ============================================================================
// ENGINE
// ============================================================================

export class InventoryAdjustmentEngine {
  /**
   * Adjust the on-hand QUANTITY of an item at a known unit cost (QB "Adjust Quantity").
   * Computes the value delta and returns the balanced GL posting as data — does NOT mutate stock.
   *
   * @param input itemCode + assetAccountId (13xx) + unitCost(>0) + qtyBefore + qtyAfter + reason + date.
   * @returns balanced GL lines + signed valueDelta + qtyDelta + newQty(=qtyAfter) + reason + mode.
   * @throws on negative/non-finite unitCost, qtyAfter < 0, a zero delta, an unknown/non-13xx asset
   *         account, an unrecognized reason, or if the produced lines fail to balance.
   */
  static adjustQuantity(input: QuantityAdjustmentInput): InventoryAdjustmentResult {
    const c = QuantityAdjustmentSchema.parse(input); // throws on non-finite / unitCost<=0 / bad date

    this.#assertReason(c.reason);
    const asset = this.#resolveInventoryAsset(c.assetAccountId);

    if (c.qtyAfter < 0) {
      throw new Error(
        `[inventory-adjustment] qtyAfter must be >= 0 (got ${c.qtyAfter}) — on-hand quantity cannot go negative`
      );
    }

    const qtyDelta = c.qtyAfter - c.qtyBefore;
    const valueDelta = roundCentsHalfEven(qtyDelta * c.unitCost);

    if (Math.abs(valueDelta) <= EPS) {
      throw new Error(
        `[inventory-adjustment] zero value delta (qtyBefore=${c.qtyBefore}, qtyAfter=${c.qtyAfter}, ` +
          `unitCost=${c.unitCost}) — a no-op adjustment must be surfaced, not silently posted`
      );
    }

    const lines = this.#buildLines(valueDelta, asset);

    return {
      itemCode: c.itemCode,
      assetAccountId: asset.id,
      lines,
      valueDelta,
      qtyDelta,
      newQty: c.qtyAfter,
      reason: c.reason as InventoryAdjustmentReason,
      date: c.date,
      mode: "quantity",
      policySchemaVersion: INVENTORY_ADJUSTMENT_POLICY_SCHEMA_VERSION,
    };
  }

  /**
   * Revalue the on-hand VALUE of an item at a FIXED quantity (QB "Adjust Total Value").
   * Posts (valueAfter − valueBefore) with the same DR/CR polarity as a quantity adjustment.
   *
   * @param input itemCode + assetAccountId (13xx) + qty(>0, fixed) + valueBefore + valueAfter + reason + date.
   * @returns balanced GL lines + signed valueDelta + qtyDelta(=0) + newQty(=qty) + reason + mode.
   * @throws on non-finite/negative values, a zero delta, an unknown/non-13xx asset account,
   *         an unrecognized reason, or if the produced lines fail to balance.
   */
  static adjustValue(input: ValueAdjustmentInput): InventoryAdjustmentResult {
    const c = ValueAdjustmentSchema.parse(input); // throws on non-finite / negative value / qty<=0 / bad date

    this.#assertReason(c.reason);
    const asset = this.#resolveInventoryAsset(c.assetAccountId);

    const before = roundCentsHalfEven(c.valueBefore);
    const after = roundCentsHalfEven(c.valueAfter);
    const valueDelta = roundCentsHalfEven(after - before);

    if (Math.abs(valueDelta) <= EPS) {
      throw new Error(
        `[inventory-adjustment] zero value delta (valueBefore=${before}, valueAfter=${after}) — ` +
          `a no-op revaluation must be surfaced, not silently posted`
      );
    }

    const lines = this.#buildLines(valueDelta, asset);

    return {
      itemCode: c.itemCode,
      assetAccountId: asset.id,
      lines,
      valueDelta,
      qtyDelta: 0, // value revaluation holds quantity fixed
      newQty: c.qty,
      reason: c.reason as InventoryAdjustmentReason,
      date: c.date,
      mode: "value",
      policySchemaVersion: INVENTORY_ADJUSTMENT_POLICY_SCHEMA_VERSION,
    };
  }

  // ── internal helpers ─────────────────────────────────────────────────

  /** Validate the reason against the policy whitelist (audit trail). Fail loud. */
  static #assertReason(reason: string): void {
    if (!isValidInventoryAdjustmentReason(reason)) {
      throw new Error(
        `[inventory-adjustment] unknown reason "${reason}" — must be one of the recognized ` +
          `INVENTORY_ADJUSTMENT_REASONS (physical_count/shrinkage/damage/obsolescence/revaluation/found_stock/correction)`
      );
    }
  }

  /**
   * Resolve + validate the caller-supplied inventory-asset account: it must (1) exist in the GL chart
   * AND (2) be a 13xx inventory-asset account. Anything else is a mis-booking risk → THROW.
   */
  static #resolveInventoryAsset(assetAccountId: string): Account {
    if (!isInventoryAssetAccountId(assetAccountId)) {
      throw new Error(
        `[inventory-adjustment] assetAccountId "${assetAccountId}" is not an inventory-asset account ` +
          `(must be a 13xx account: 1300 WIP / 1310 Finished Goods / 1320 Raw Materials)`
      );
    }
    const account = ACCOUNT_INDEX.get(assetAccountId);
    if (!account) {
      throw new Error(
        `[inventory-adjustment] assetAccountId "${assetAccountId}" does not exist in the GL chart of accounts`
      );
    }
    if (account.type !== "asset") {
      // Defensive: every 13xx in the canonical chart is an asset, but never trust the prefix alone.
      throw new Error(
        `[inventory-adjustment] assetAccountId "${assetAccountId}" (${account.name}) is type ` +
          `"${account.type}", not an inventory asset`
      );
    }
    return account;
  }

  /**
   * Build the balanced 2-line GL posting for a signed value delta.
   *   delta > 0 (found stock):     DR asset / CR 5100 Materials Expense (contra)
   *   delta < 0 (shrinkage):       DR 5100 Materials Expense / CR asset
   * Asserts Σdebit == Σcredit before returning (throws on imbalance — should be unreachable).
   */
  static #buildLines(valueDelta: number, asset: Account): GLLine[] {
    const me = INVENTORY_ADJUSTMENT_ACCOUNTS.MATERIALS_EXPENSE;
    const amount = roundCentsHalfEven(Math.abs(valueDelta)); // magnitude posts on each side
    if (amount <= EPS) {
      throw new Error(`[inventory-adjustment] internal: refusing to post a zero-magnitude line (delta=${valueDelta})`);
    }

    let lines: GLLine[];
    if (valueDelta > 0) {
      // Found stock: asset increases (debit), materials expense reduced (credit / contra).
      lines = [
        { account: asset.id, accountName: asset.name, debit: amount, credit: 0 },
        { account: me.number, accountName: me.name, debit: 0, credit: amount },
      ];
    } else {
      // Shrinkage / write-down: materials expense increases (debit), asset reduced (credit).
      lines = [
        { account: me.number, accountName: me.name, debit: amount, credit: 0 },
        { account: asset.id, accountName: asset.name, debit: 0, credit: amount },
      ];
    }

    const totalDebit = roundCentsHalfEven(lines.reduce((s, l) => s + l.debit, 0));
    const totalCredit = roundCentsHalfEven(lines.reduce((s, l) => s + l.credit, 0));
    if (Math.abs(totalDebit - totalCredit) > EPS) {
      throw new Error(
        `[inventory-adjustment] GL posting does not balance: Σdebits ${totalDebit} != Σcredits ${totalCredit}`
      );
    }
    return lines;
  }
}

export const inventoryAdjustmentEngine = InventoryAdjustmentEngine;
