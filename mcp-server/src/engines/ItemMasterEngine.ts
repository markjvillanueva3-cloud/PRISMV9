/**
 * ItemMasterEngine — QuickBooks "Item List" parity for the PRISM ERP (galaxy:business, slot:hotel).
 *
 * QuickBooks parity: the "Item List" / "Item Master" — the registry of every sellable/purchasable
 * item (inventory parts, services, assemblies, charges, discounts) with their GL account links and
 * their price levels. This is the DEFINITION registry: item codes, types, account bindings, base
 * pricing, and price-level math. It is the catalog the invoice/estimate/sales-order engines pull a
 * line item from.
 *
 * DEDUP / boundary (R8): on-hand QUANTITY and stock movement are owned by {@link MaterialStockEngine}
 * (quantity_on_hand, adjustStock, reorder status). ItemMasterEngine does NOT re-implement stock
 * tracking — it owns the item DEFINITION (codes, types, account links, pricing). Where a caller needs
 * the live on-hand count it references MaterialStockEngine; the pure methods here never import runtime
 * stock state, so they stay a deterministic, side-effect-free definition registry.
 *
 * REUSES (never re-derives):
 *  - {@link CHART_OF_ACCOUNTS} from GeneralLedgerEngine — the single canonical chart; every item
 *    account link is validated against it for EXISTENCE + correct normal-balance/class (unknown or
 *    wrong-class → THROW). No inlined account number, no inlined account-class rule.
 *  - {@link roundCentsHalfEven} from the shared money util (src/data/money.ts) — banker's (half-even) rounding to the cent,
 *    the fleet-canonical money helper. Computed prices and price-for-qty totals round through it.
 *  - {@link ITEM_TYPES} / {@link ITEM_ACCOUNT_RULES} / {@link ACCOUNT_ROLE_CONTRACTS} /
 *    {@link DEFAULT_PRICE_LEVELS} from data/item-master-defaults.ts — the QB taxonomy, the
 *    per-type account requirement map, the role→GL-class contract, and the seed price levels.
 *
 * Financial-invariant compliance (business/GSD.md §2, [[feedback_hotel_financial_invariant_gate]]):
 *  - account ids/types/rates are IMPORTED, never inlined (constants module + live GL chart).
 *  - half-even rounding to the cent on every price (computed level price + price-for-qty).
 *  - price reconciles: priceFor(code, level, 1) === the level's computed unit price.
 *  - a percent-discount level price ≤ base; a percent-markup price ≥ base; a computed price < 0 THROWS.
 *  - unknown item type / unknown or wrong-class account link / duplicate item code / unknown price
 *    level THROW (no silent coercion, never a 0/NaN papered over a problem).
 *  - never hard-delete: deactivateItem flips active=false ([[feedback_never_delete_only_disable]]);
 *    reactivateItem restores it.
 */
// WIRE-EXEMPT: dispatcher wiring deferred to MAIN (worktree businessDispatcher stale 441 vs main 879);
// wiring the stale worktree copy would clobber ~438 main actions on golf-merge. Wire in MAIN post-merge.

import { z } from "zod";
import { CHART_OF_ACCOUNTS, type Account, type AccountType } from "./GeneralLedgerEngine.js";
import { roundCentsHalfEven } from "../data/money.js";
import {
  ITEM_TYPES,
  ITEM_ACCOUNT_RULES,
  ACCOUNT_ROLE_CONTRACTS,
  DEFAULT_PRICE_LEVELS,
  ITEM_MASTER_SCHEMA_VERSION,
  isValidItemType,
  type ItemType,
  type AccountRole,
  type PriceLevel,
  type PriceLevelKind,
} from "../data/item-master-defaults.js";

// ============================================================================
// CANONICAL CHART INDEX (reuses GL's exported chart — no re-derivation)
// ============================================================================

const ACCOUNT_INDEX: ReadonlyMap<string, Account> = new Map(CHART_OF_ACCOUNTS.map((a) => [a.id, a]));

// ============================================================================
// SCHEMAS
// ============================================================================

/** A single price-level rule attached to an item (validated; value semantics per kind). */
const PriceLevelSchema = z.object({
  name: z.string().min(1, "price level name is required"),
  kind: z.enum(["percent_markup", "percent_discount", "fixed"]),
  value: z.number().finite("price level value must be finite (no NaN/Infinity)"),
});

const DefineItemInputSchema = z.object({
  code: z.string().min(1, "item code is required"),
  name: z.string().min(1, "item name is required"),
  type: z.string().min(1, "item type is required"), // validated against ITEM_TYPES below
  basePrice: z.number().finite("basePrice must be finite").nonnegative("basePrice must be ≥ 0"),
  /** GL account id for income/revenue (4xxx). Required for every item type. */
  incomeAccountId: z.string().optional(),
  /** GL account id for the expense/COGS leg (5xxx). Required for inventory/assembly. */
  expenseAccountId: z.string().optional(),
  /** GL account id for the inventory asset (13xx). Required for inventory/assembly. */
  assetAccountId: z.string().optional(),
  description: z.string().optional(),
  /** Optional extra price levels appended to the seed defaults (by name, later wins). */
  priceLevels: z.array(PriceLevelSchema).optional(),
});
export type DefineItemInput = z.input<typeof DefineItemInputSchema>;

// ============================================================================
// DOMAIN TYPES
// ============================================================================

/** A resolved account link on a stored item (id + name + class, from the GL chart). */
export interface ItemAccountLink {
  role: AccountRole;
  accountId: string;
  accountName: string;
  accountType: AccountType;
}

/** A stored item-master record (the QB Item List row). */
export interface ItemRecord {
  code: string;
  name: string;
  type: ItemType;
  basePrice: number;
  description: string | null;
  /** resolved account links (income always present; expense/asset present per item type). */
  accounts: ItemAccountLink[];
  /** the price levels available for this item (seed defaults + any extras). */
  priceLevels: PriceLevel[];
  active: boolean;
  schemaVersion: string;
  createdAt: string;
  updatedAt: string;
}

/** The result of applying a price level to an item's base price. */
export interface PricedLevel {
  itemCode: string;
  levelName: string;
  kind: PriceLevelKind;
  basePrice: number;
  /** the computed unit price after the level rule, half-even rounded to the cent. */
  computedPrice: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class ItemMasterEngine {
  /** code → stored item. Definition registry only (no on-hand stock state). */
  private static items = new Map<string, ItemRecord>();

  /**
   * Define (register) a new item with validated type, account links, and price levels.
   *
   * Validation (fail loud):
   *  - item code is UNIQUE (a duplicate would silently overwrite a catalog entry) → THROW.
   *  - type ∈ {@link ITEM_TYPES} → THROW otherwise.
   *  - every account-link REQUIRED by the type (per {@link ITEM_ACCOUNT_RULES}) is supplied, EXISTS
   *    in the GL {@link CHART_OF_ACCOUNTS}, and has the correct class + normal-balance for its role
   *    (income↔revenue/4xxx/credit, expense↔expense/5xxx/debit, asset↔asset/13xx/debit). A wrong-class
   *    link (e.g. income pointed at a 5xxx expense account) → THROW.
   *  - an optional account link, if supplied, is validated the same way; a link supplied for a role the
   *    type does not accept → THROW (no silently-ignored account binding).
   *
   * @param input code + name + type + basePrice + the account ids the type requires (+ optional extras).
   * @returns the stored {@link ItemRecord} (active, with resolved account links + price levels).
   * @throws on duplicate code, unknown type, missing/unknown/wrong-class account link, bad shape.
   */
  static defineItem(input: DefineItemInput): ItemRecord {
    const p = DefineItemInputSchema.parse(input); // throws on missing code/name/type, negative/NaN basePrice

    if (ItemMasterEngine.items.has(p.code)) {
      throw new Error(
        `ItemMasterEngine.defineItem: duplicate item code '${p.code}' — codes must be unique ` +
          `(a duplicate would silently overwrite an existing catalog entry).`,
      );
    }
    if (!isValidItemType(p.type)) {
      throw new Error(
        `ItemMasterEngine.defineItem: unknown item type '${p.type}' — must be one of ${ITEM_TYPES.join("/")}.`,
      );
    }
    const type = p.type as ItemType;
    const rule = ITEM_ACCOUNT_RULES[type];

    // Map the three optional input ids to their role for validation.
    const suppliedByRole: Record<AccountRole, string | undefined> = {
      income: p.incomeAccountId,
      expense: p.expenseAccountId,
      asset: p.assetAccountId,
    };
    const accepted = new Set<AccountRole>([...rule.required, ...rule.optional]);

    // Reject any account link supplied for a role this item type does not accept (fail loud — never
    // silently drop a binding the operator believes they set).
    for (const role of ["income", "expense", "asset"] as const) {
      if (suppliedByRole[role] !== undefined && !accepted.has(role)) {
        throw new Error(
          `ItemMasterEngine.defineItem: item type '${type}' does not accept a(n) ${role} account link ` +
            `(supplied '${suppliedByRole[role]}'). Accepted roles: ${[...accepted].join("/") || "none"}.`,
        );
      }
    }

    const accounts: ItemAccountLink[] = [];
    // Required links first (must be present), then optional (validated if present).
    for (const role of rule.required) {
      const id = suppliedByRole[role];
      if (id === undefined) {
        throw new Error(
          `ItemMasterEngine.defineItem: item type '${type}' requires a(n) ${role} account link ` +
            `(${ACCOUNT_ROLE_CONTRACTS[role].idFamily}) — none supplied for item '${p.code}'.`,
        );
      }
      accounts.push(ItemMasterEngine.#resolveAccountLink(role, id, p.code));
    }
    for (const role of rule.optional) {
      const id = suppliedByRole[role];
      if (id !== undefined) accounts.push(ItemMasterEngine.#resolveAccountLink(role, id, p.code));
    }

    // Price levels: start from the seed defaults, then append/override by name with any extras.
    const levelByName = new Map<string, PriceLevel>();
    for (const lvl of DEFAULT_PRICE_LEVELS) levelByName.set(lvl.name, { ...lvl });
    if (p.priceLevels) {
      for (const lvl of p.priceLevels) {
        ItemMasterEngine.#validatePriceLevelValue(lvl, p.code);
        levelByName.set(lvl.name, { name: lvl.name, kind: lvl.kind, value: lvl.value });
      }
    }

    const now = new Date().toISOString();
    const record: ItemRecord = {
      code: p.code,
      name: p.name,
      type,
      basePrice: roundCentsHalfEven(p.basePrice),
      description: p.description ?? null,
      accounts,
      priceLevels: [...levelByName.values()],
      active: true,
      schemaVersion: ITEM_MASTER_SCHEMA_VERSION,
      createdAt: now,
      updatedAt: now,
    };
    ItemMasterEngine.items.set(record.code, record);
    return record;
  }

  /**
   * Apply a price-level rule to an item's base price → a computed unit price (half-even rounded).
   *  - percent_markup   raises the price (computed ≥ base for value ≥ 0).
   *  - percent_discount lowers the price (computed ≤ base for value in [0,100]).
   *  - fixed            overrides with the level's absolute value.
   *
   * @param itemCode the item to price.
   * @param levelName the price-level name (must exist on the item).
   * @returns a {@link PricedLevel} with the computed unit price.
   * @throws if the item or level is unknown, or the computed price is negative.
   */
  static setPriceLevel(itemCode: string, levelName: string): PricedLevel {
    const item = ItemMasterEngine.#mustGet(itemCode, "setPriceLevel");
    const level = item.priceLevels.find((l) => l.name === levelName);
    if (!level) {
      throw new Error(
        `ItemMasterEngine.setPriceLevel: unknown price level '${levelName}' for item '${itemCode}' ` +
          `(available: ${item.priceLevels.map((l) => l.name).join("/")}).`,
      );
    }

    let raw: number;
    switch (level.kind) {
      case "percent_markup":
        raw = item.basePrice * (1 + level.value / 100);
        break;
      case "percent_discount":
        raw = item.basePrice * (1 - level.value / 100);
        break;
      case "fixed":
        raw = level.value;
        break;
      default: {
        // exhaustiveness guard — unreachable given the kind union, but fail loud if a new kind is added.
        const _never: never = level.kind;
        throw new Error(`ItemMasterEngine.setPriceLevel: unhandled price-level kind '${String(_never)}'.`);
      }
    }

    const computedPrice = roundCentsHalfEven(raw);
    if (computedPrice < 0) {
      throw new Error(
        `ItemMasterEngine.setPriceLevel: computed price ${computedPrice} < 0 for item '${itemCode}' ` +
          `level '${levelName}' (kind=${level.kind} value=${level.value}, base=${item.basePrice}). ` +
          `A negative price is never valid.`,
      );
    }
    return {
      itemCode,
      levelName,
      kind: level.kind,
      basePrice: item.basePrice,
      computedPrice,
    };
  }

  /**
   * Extended price for `qty` units at a named price level: roundCentsHalfEven(unitPrice * qty).
   *
   * Reconciliation invariant: `priceFor(code, level, 1)` === the level's computed unit price from
   * {@link setPriceLevel} — the per-unit price is the building block of the extended price.
   *
   * @param itemCode the item to price.
   * @param levelName the price-level name (must exist on the item).
   * @param qty quantity (≥ 0; default 1). A non-finite/negative qty THROWS.
   * @returns the extended price for `qty` units, half-even rounded to the cent.
   * @throws if the item/level is unknown, the computed unit price is negative, or qty is bad.
   */
  static priceFor(itemCode: string, levelName: string, qty = 1): number {
    if (!Number.isFinite(qty) || qty < 0) {
      throw new Error(
        `ItemMasterEngine.priceFor: qty must be a finite number ≥ 0 (got ${qty}) for item '${itemCode}'.`,
      );
    }
    const { computedPrice } = ItemMasterEngine.setPriceLevel(itemCode, levelName); // unit price (validated ≥ 0)
    return roundCentsHalfEven(computedPrice * qty);
  }

  /**
   * Fetch a stored item by code.
   * @param itemCode the item code.
   * @returns the {@link ItemRecord}, or null if no item has that code.
   */
  static getItem(itemCode: string): ItemRecord | null {
    return ItemMasterEngine.items.get(itemCode) ?? null;
  }

  /**
   * List stored items.
   * @param opts.includeInactive include deactivated items (default false → active only).
   * @returns the matching {@link ItemRecord}s, sorted by code.
   */
  static listItems(opts: { includeInactive?: boolean } = {}): ItemRecord[] {
    const all = [...ItemMasterEngine.items.values()];
    const filtered = opts.includeInactive ? all : all.filter((i) => i.active);
    return filtered.sort((a, b) => a.code.localeCompare(b.code));
  }

  /**
   * Deactivate an item (QB "Make Inactive"). NEVER hard-deletes — flips active=false so the catalog
   * row, account links, and pricing history are preserved ([[feedback_never_delete_only_disable]]).
   *
   * @param itemCode the item to deactivate.
   * @returns the updated {@link ItemRecord} (active=false).
   * @throws if the item is unknown.
   */
  static deactivateItem(itemCode: string): ItemRecord {
    const item = ItemMasterEngine.#mustGet(itemCode, "deactivateItem");
    item.active = false;
    item.updatedAt = new Date().toISOString();
    return item;
  }

  /**
   * Reactivate a previously-deactivated item (QB "Make Active").
   * @param itemCode the item to reactivate.
   * @returns the updated {@link ItemRecord} (active=true).
   * @throws if the item is unknown.
   */
  static reactivateItem(itemCode: string): ItemRecord {
    const item = ItemMasterEngine.#mustGet(itemCode, "reactivateItem");
    item.active = true;
    item.updatedAt = new Date().toISOString();
    return item;
  }

  // --------------------------------------------------------------------------
  // INTERNALS
  // --------------------------------------------------------------------------

  /** Fetch an item or THROW (fail loud — never operate on a missing item). */
  static #mustGet(itemCode: string, method: string): ItemRecord {
    const item = ItemMasterEngine.items.get(itemCode);
    if (!item) throw new Error(`ItemMasterEngine.${method}: unknown item code '${itemCode}'.`);
    return item;
  }

  /**
   * Resolve + validate an account link for a role against the live GL chart: existence + correct
   * class + correct normal-balance. THROWS on unknown id or wrong class.
   */
  static #resolveAccountLink(role: AccountRole, accountId: string, itemCode: string): ItemAccountLink {
    const acct = ACCOUNT_INDEX.get(accountId);
    if (!acct) {
      throw new Error(
        `ItemMasterEngine.defineItem: ${role} account '${accountId}' for item '${itemCode}' is not in the ` +
          `GL chart of accounts (reuse GeneralLedgerEngine.getChartOfAccounts()).`,
      );
    }
    const contract = ACCOUNT_ROLE_CONTRACTS[role];
    if (acct.type !== contract.glType || acct.normal_balance !== contract.normalBalance) {
      throw new Error(
        `ItemMasterEngine.defineItem: ${role} account '${accountId}' (${acct.name}, type=${acct.type}/` +
          `${acct.normal_balance}) is the wrong class for a(n) ${role} link — must be a ${contract.glType} ` +
          `account (${contract.idFamily}, normal_balance=${contract.normalBalance}) for item '${itemCode}'.`,
      );
    }
    return { role, accountId, accountName: acct.name, accountType: acct.type };
  }

  /** Validate a price-level's value semantics per its kind (fail loud on an impossible config). */
  static #validatePriceLevelValue(lvl: PriceLevel, itemCode: string): void {
    if (!Number.isFinite(lvl.value)) {
      throw new Error(`ItemMasterEngine: price level '${lvl.name}' value must be finite for item '${itemCode}'.`);
    }
    if (lvl.kind === "percent_discount" && (lvl.value < 0 || lvl.value > 100)) {
      throw new Error(
        `ItemMasterEngine: percent_discount level '${lvl.name}' value ${lvl.value} must be in [0,100] for item ` +
          `'${itemCode}' (a >100% discount would drive the price negative).`,
      );
    }
    if (lvl.kind === "percent_markup" && lvl.value < 0) {
      throw new Error(
        `ItemMasterEngine: percent_markup level '${lvl.name}' value ${lvl.value} must be ≥ 0 for item '${itemCode}'.`,
      );
    }
    if (lvl.kind === "fixed" && lvl.value < 0) {
      throw new Error(
        `ItemMasterEngine: fixed level '${lvl.name}' value ${lvl.value} must be ≥ 0 for item '${itemCode}'.`,
      );
    }
  }

  /** TEST-ONLY: clear the registry. */
  static __resetForTests(): void {
    ItemMasterEngine.items.clear();
  }
}

export const itemMasterEngine = ItemMasterEngine;
