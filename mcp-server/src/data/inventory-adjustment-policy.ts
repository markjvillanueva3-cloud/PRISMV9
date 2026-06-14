/**
 * inventory-adjustment-policy.ts — constants & policy for the QuickBooks-parity
 * Inventory Adjustment engine (galaxy:business, slot:hotel). Single source of truth
 * for the GL accounts an inventory quantity/value adjustment touches and the
 * account-class guard — so InventoryAdjustmentEngine never inlines an account number
 * (financial-invariant gate, business/GSD.md §2).
 *
 * QuickBooks parity — the "Adjust Quantity/Value on Hand" function (Vendors/Inventory →
 * Adjust Quantity/Value on Hand). QB books a positive on-hand quantity/value change as a
 * DEBIT to the inventory asset and a CREDIT to the chosen "adjustment account" (the
 * Inventory Adjustment / inventory-shrinkage expense account), and the reverse for a
 * negative (shrinkage / write-down) change. See Intuit "Adjust your inventory quantity or
 * value in QuickBooks Desktop" (support doc, 2023) for the debit/credit polarity.
 *
 * GAAP basis for the polarity (lower-of-cost-or-net-realizable-value, ASC 330-10-35):
 *   - Found stock / count-up (positive valueDelta): the asset was understated →
 *       DR <inventory asset 13xx>  /  CR 5100 Materials Expense  (contra — reduces the
 *       period's materials cost, mirroring QB crediting the adjustment account).
 *   - Shrinkage / write-down (negative valueDelta): the asset was overstated →
 *       DR 5100 Materials Expense  /  CR <inventory asset 13xx>  (the loss flows to
 *       materials/inventory-shrinkage expense in the period it is recognized).
 *
 * The "adjustment account" here is the canonical PRISM 5100 Materials Expense account —
 * JM Die books raw-material/inventory variances against materials expense rather than a
 * separate shrinkage GL line (the PRISM chart has no dedicated 5xxx shrinkage account;
 * 5100 is the materials-cost bucket inventory variances belong to). The inventory asset
 * side is supplied by the caller and validated against the live GL chart so a typo'd or
 * non-inventory account THROWS rather than silently mis-booking the variance.
 */

export const INVENTORY_ADJUSTMENT_POLICY_SCHEMA_VERSION = "1.0.0";

/**
 * The materials-expense / inventory-adjustment account a quantity/value adjustment posts
 * its offset against. QB credits this account on a found-stock (positive) adjustment and
 * debits it on a shrinkage (negative) adjustment. Canonical PRISM chart id 5100.
 *
 * Citation: PRISM canonical chart of accounts (GeneralLedgerEngine.CHART_OF_ACCOUNTS) —
 * 5100 "Materials Expense". This is the bucket raw-material/inventory variances flow to.
 */
export const INVENTORY_ADJUSTMENT_ACCOUNTS = Object.freeze({
  /** Offsetting expense/contra account for the value delta (the QB "adjustment account"). */
  MATERIALS_EXPENSE: Object.freeze({ number: "5100", name: "Materials Expense", type: "expense" as const }),
});

/**
 * The valid inventory-asset account CLASS for the caller-supplied asset side. QB requires
 * the inventory side of the adjustment to be an inventory asset account; the PRISM chart
 * models inventory assets as the 13xx block (1300 WIP, 1310 Finished Goods, 1320 Raw
 * Materials). An asset id outside this prefix is rejected (fail loud) — booking a
 * quantity/value variance to, say, 1000 Cash or 1500 Equipment would corrupt the books.
 *
 * Citation: PRISM canonical chart — inventory assets occupy 1300–1399 (current_asset,
 * inventory sub-class). 13xx prefix is the structural invariant.
 */
export const INVENTORY_ASSET_ACCOUNT_PREFIX = "13";

/** Is `accountId` structurally an inventory-asset account (13xx block)? */
export function isInventoryAssetAccountId(accountId: string): boolean {
  return typeof accountId === "string" && /^13\d{2}$/.test(accountId);
}

/**
 * Allowed reasons for an inventory adjustment (QB "memo/reason" field). A reason is
 * MANDATORY (audit trail): an unexplained quantity/value change is the classic vector for
 * inventory fraud / unrecorded shrinkage. Mirrors the credit-memo reason discipline.
 */
export const INVENTORY_ADJUSTMENT_REASONS = Object.freeze([
  "physical_count",   // periodic/cycle count reconciliation
  "shrinkage",        // theft / loss / unrecorded consumption
  "damage",           // damaged / scrapped stock written off
  "obsolescence",     // obsolete stock written down
  "revaluation",      // unit-cost / value revaluation at fixed qty
  "found_stock",      // previously unrecorded stock discovered
  "correction",       // data-entry / receiving correction
] as const);

export type InventoryAdjustmentReason = (typeof INVENTORY_ADJUSTMENT_REASONS)[number];

/** Is `reason` a recognized inventory-adjustment reason? */
export function isValidInventoryAdjustmentReason(reason: string): reason is InventoryAdjustmentReason {
  return (INVENTORY_ADJUSTMENT_REASONS as readonly string[]).includes(reason);
}
