/**
 * item-master-defaults.ts — constants & policy for the QuickBooks-parity Item Master engine
 * (galaxy:business, slot:hotel). Single source of truth for the QB item-type taxonomy, the
 * default price-level rule set, and the per-item-type account-link requirements — so
 * ItemMasterEngine never inlines an item type, a price-level rate, or an account-class rule
 * (financial-invariant gate, business/GSD.md §2).
 *
 * Citation: QuickBooks Desktop Item Types & Price Levels (Intuit item list spec).
 *   - Item types: Inventory Part, Non-inventory Part, Service, Inventory Assembly,
 *     Other Charge, Discount (the six item kinds that carry GL account links in QB Desktop;
 *     the remaining QB list kinds — Subtotal/Group/Sales-Tax-Item/Payment — carry no
 *     income/expense/asset link and are out of this registry's scope).
 *   - Account links: each QB item type binds a subset of {income account, expense/COGS account,
 *     inventory-asset account}. An Inventory Part binds all three; a Service binds income (and
 *     optionally an expense for a two-sided service item); a Discount binds only an income
 *     account (it posts as negative income).
 *   - Price Levels: QB "Price Levels" are either a fixed-percentage adjustment (markup raises,
 *     discount lowers a base price) or a per-item fixed price override.
 *
 * GL chart cross-reference (the canonical PRISM chart owned by GeneralLedgerEngine):
 *   income  → a revenue account, id 4xxx, normal_balance "credit"
 *   expense → an expense account, id 5xxx, normal_balance "debit"
 *   asset   → an inventory asset account, id 13xx, normal_balance "debit"
 * ItemMasterEngine validates a proposed item's account links against this rule map AND against
 * the live CHART_OF_ACCOUNTS (existence + normal-balance), never against an inlined literal.
 */

export const ITEM_MASTER_SCHEMA_VERSION = "1.0.0";

// ============================================================================
// ITEM TYPES (QuickBooks Desktop item kinds that carry GL account links)
// ============================================================================

/** The six QB Desktop item types that bind income/expense/asset GL accounts. */
export const ITEM_TYPES = Object.freeze([
  "inventory",      // Inventory Part — tracked stock; income + COGS expense + inventory asset
  "non_inventory",  // Non-inventory Part — purchased/sold but not stock-tracked; income (+ optional expense)
  "service",        // Service — labor/time sold; income (+ optional expense for outsourced service)
  "assembly",       // Inventory Assembly — built-from-components stock item; income + COGS + inventory asset
  "other_charge",   // Other Charge — freight, handling, misc fee; income (+ optional expense)
  "discount",       // Discount — negative-income line item; income account only
] as const);

export type ItemType = (typeof ITEM_TYPES)[number];

/** Is `t` a recognized QB item type? */
export function isValidItemType(t: string): t is ItemType {
  return (ITEM_TYPES as readonly string[]).includes(t);
}

// ============================================================================
// ACCOUNT-ROLE RULE MAP (which account links each item type requires)
// ============================================================================

/** The three GL-account roles an item can bind. */
export type AccountRole = "income" | "expense" | "asset";

/**
 * The GL contract a given account role must satisfy: the account's `type` (matched against the
 * GeneralLedgerEngine AccountType) and its required `normal_balance`. Used by ItemMasterEngine to
 * reject a link to a wrong-class account (e.g. an "income" link pointed at a 5xxx expense account).
 */
export interface AccountRoleContract {
  /** GL AccountType the linked account must have. */
  glType: "revenue" | "expense" | "asset";
  /** Normal balance the linked account must carry. */
  normalBalance: "debit" | "credit";
  /** Human-readable account-id family for error messages (e.g. "4xxx"). */
  idFamily: string;
}

/** The role → GL-class contract. income↔4xxx/credit, expense↔5xxx/debit, asset↔13xx/debit. */
export const ACCOUNT_ROLE_CONTRACTS: Readonly<Record<AccountRole, AccountRoleContract>> = Object.freeze({
  income: Object.freeze({ glType: "revenue", normalBalance: "credit", idFamily: "4xxx" }),
  expense: Object.freeze({ glType: "expense", normalBalance: "debit", idFamily: "5xxx" }),
  asset: Object.freeze({ glType: "asset", normalBalance: "debit", idFamily: "13xx" }),
});

/** Per-item-type account-link requirement: which roles are required vs optional. */
export interface ItemAccountRule {
  required: readonly AccountRole[];
  optional: readonly AccountRole[];
}

/**
 * The QB account-link rule per item type:
 *  - inventory / assembly : income + COGS expense + inventory asset are ALL required.
 *  - service / non_inventory / other_charge : income required, expense optional (two-sided item).
 *  - discount : income only (it posts as negative income).
 */
export const ITEM_ACCOUNT_RULES: Readonly<Record<ItemType, ItemAccountRule>> = Object.freeze({
  inventory: Object.freeze({ required: Object.freeze(["income", "expense", "asset"] as const), optional: Object.freeze([] as const) }),
  assembly: Object.freeze({ required: Object.freeze(["income", "expense", "asset"] as const), optional: Object.freeze([] as const) }),
  service: Object.freeze({ required: Object.freeze(["income"] as const), optional: Object.freeze(["expense"] as const) }),
  non_inventory: Object.freeze({ required: Object.freeze(["income"] as const), optional: Object.freeze(["expense"] as const) }),
  other_charge: Object.freeze({ required: Object.freeze(["income"] as const), optional: Object.freeze(["expense"] as const) }),
  discount: Object.freeze({ required: Object.freeze(["income"] as const), optional: Object.freeze([] as const) }),
});

// ============================================================================
// PRICE LEVELS (QB "Price Levels" — percentage adjustment or fixed override)
// ============================================================================

/**
 * The kind of a price-level rule:
 *  - percent_markup   : computed = base * (1 + value/100)  (value ≥ 0 raises the price)
 *  - percent_discount : computed = base * (1 - value/100)  (value in [0,100] lowers the price)
 *  - fixed            : computed = value                    (per-item fixed price override)
 */
export type PriceLevelKind = "percent_markup" | "percent_discount" | "fixed";

export interface PriceLevel {
  name: string;
  kind: PriceLevelKind;
  /**
   * For percent_markup / percent_discount this is the percentage (0..N for markup, 0..100 for
   * discount). For fixed it is the absolute override price (in dollars). Never inlined in engine code.
   */
  value: number;
}

/**
 * QB default price levels (Intuit item list spec — typical 3-tier shop pricing):
 *  - base       : the item's own base price (identity; a 0% markup).
 *  - wholesale  : 20% off base (percent_discount) — the dealer/wholesale tier.
 *  - preferred  : 10% above base (percent_markup) — premium/rush tier.
 * Operators may register additional levels per item; these are the seed defaults.
 */
export const DEFAULT_PRICE_LEVELS: ReadonlyArray<PriceLevel> = Object.freeze([
  Object.freeze({ name: "base", kind: "percent_markup", value: 0 }),
  Object.freeze({ name: "wholesale", kind: "percent_discount", value: 20 }),
  Object.freeze({ name: "preferred", kind: "percent_markup", value: 10 }),
]);
