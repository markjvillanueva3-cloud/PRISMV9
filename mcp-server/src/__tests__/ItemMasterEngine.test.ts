/**
 * ItemMasterEngine.test.ts — QuickBooks Item-List parity engine tests (galaxy:business, slot:hotel).
 *
 * Real reference values throughout (no toBeDefined/truthy stubs): every assertion fails if the
 * business math, account-class validation, or price-level rule changes. Covers zero/negative/
 * boundary/empty/overflow/error-throw paths and the spec invariants:
 *  - discount-level price ≤ base; markup-level price ≥ base; negative price THROWS.
 *  - priceFor(code, level, 1) === the level's computed unit price (reconciliation).
 *  - unknown/wrong-class account link THROWS; duplicate code THROWS; unknown level THROWS;
 *  - deactivate flips active (never deletes); reactivate restores.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ItemMasterEngine } from "../engines/ItemMasterEngine.js";
import { DEFAULT_PRICE_LEVELS, ITEM_TYPES, ITEM_ACCOUNT_RULES } from "../data/item-master-defaults.js";

// Canonical GL chart ids (from GeneralLedgerEngine CHART_OF_ACCOUNTS):
const INCOME = "4000";   // Sales Revenue — revenue / credit
const SERVICE_INCOME = "4100"; // Service Revenue — revenue / credit
const COGS = "5000";     // Cost of Goods Sold — expense / debit
const ASSET = "1320";    // Raw Materials Inventory — asset / debit
const TAX_PAYABLE = "2100"; // liability / credit (wrong class for any item link)
const CASH = "1000";     // asset / debit (wrong class for income/expense)

function defineInventory(code: string, basePrice: number) {
  return ItemMasterEngine.defineItem({
    code,
    name: `Item ${code}`,
    type: "inventory",
    basePrice,
    incomeAccountId: INCOME,
    expenseAccountId: COGS,
    assetAccountId: ASSET,
  });
}

describe("ItemMasterEngine.defineItem — account-link validation", () => {
  beforeEach(() => ItemMasterEngine.__resetForTests());

  it("defines an inventory item with all three required account links resolved to the GL chart", () => {
    const rec = defineInventory("WIDGET-1", 100);
    expect(rec.code).toBe("WIDGET-1");
    expect(rec.type).toBe("inventory");
    expect(rec.basePrice).toBe(100);
    expect(rec.active).toBe(true);
    const roles = rec.accounts.map((a) => `${a.role}:${a.accountId}`).sort();
    expect(roles).toEqual(["asset:1320", "expense:5000", "income:4000"]);
    // resolved names come from the GL chart, not inlined
    expect(rec.accounts.find((a) => a.role === "income")!.accountName).toBe("Sales Revenue");
    expect(rec.accounts.find((a) => a.role === "asset")!.accountType).toBe("asset");
  });

  it("defines a service item with income only; an optional expense link is accepted", () => {
    const rec = ItemMasterEngine.defineItem({
      code: "SVC-1",
      name: "Machining hour",
      type: "service",
      basePrice: 95,
      incomeAccountId: SERVICE_INCOME,
      expenseAccountId: COGS, // optional for service — accepted
    });
    expect(rec.type).toBe("service");
    expect(rec.accounts.map((a) => a.role).sort()).toEqual(["expense", "income"]);
    expect(rec.accounts.find((a) => a.role === "income")!.accountId).toBe(SERVICE_INCOME);
  });

  it("defines a discount item with income only (asset/expense not accepted)", () => {
    const rec = ItemMasterEngine.defineItem({
      code: "DISC-1",
      name: "Volume discount",
      type: "discount",
      basePrice: 0,
      incomeAccountId: INCOME,
    });
    expect(rec.type).toBe("discount");
    expect(rec.accounts).toHaveLength(1);
    expect(rec.accounts[0].role).toBe("income");
  });

  it("THROWS when an inventory item is missing the required asset account link", () => {
    expect(() =>
      ItemMasterEngine.defineItem({
        code: "BAD-1",
        name: "No asset",
        type: "inventory",
        basePrice: 10,
        incomeAccountId: INCOME,
        expenseAccountId: COGS,
        // assetAccountId omitted
      }),
    ).toThrow(/requires a\(n\) asset account link/);
  });

  it("THROWS when an account id does not exist in the GL chart", () => {
    expect(() =>
      ItemMasterEngine.defineItem({
        code: "BAD-2",
        name: "Bogus account",
        type: "service",
        basePrice: 10,
        incomeAccountId: "9999", // not in chart
      }),
    ).toThrow(/not in the\s+GL chart of accounts/);
  });

  it("THROWS when an income link points at a wrong-class (non-revenue) account", () => {
    // 2100 Tax Payable is a liability/credit account — wrong class for an income link.
    expect(() =>
      ItemMasterEngine.defineItem({
        code: "BAD-3",
        name: "Wrong income class",
        type: "service",
        basePrice: 10,
        incomeAccountId: TAX_PAYABLE,
      }),
    ).toThrow(/wrong class for a\(n\) income link/);
  });

  it("THROWS when an expense link points at an asset account (wrong normal-balance class)", () => {
    // 1000 Cash is asset/debit — wrong class for the expense (5xxx) role.
    expect(() =>
      ItemMasterEngine.defineItem({
        code: "BAD-4",
        name: "Wrong expense class",
        type: "inventory",
        basePrice: 10,
        incomeAccountId: INCOME,
        expenseAccountId: CASH,
        assetAccountId: ASSET,
      }),
    ).toThrow(/wrong class for a\(n\) expense link/);
  });

  it("THROWS when an account link is supplied for a role the item type does not accept", () => {
    // discount accepts income only — supplying an asset link must fail loud, not be silently dropped.
    expect(() =>
      ItemMasterEngine.defineItem({
        code: "BAD-5",
        name: "Discount with asset",
        type: "discount",
        basePrice: 0,
        incomeAccountId: INCOME,
        assetAccountId: ASSET,
      }),
    ).toThrow(/does not accept a\(n\) asset account link/);
  });

  it("THROWS on a duplicate item code", () => {
    defineInventory("DUP-1", 50);
    expect(() => defineInventory("DUP-1", 75)).toThrow(/duplicate item code 'DUP-1'/);
  });

  it("THROWS on an unknown item type", () => {
    expect(() =>
      ItemMasterEngine.defineItem({
        code: "BAD-6",
        name: "Unknown type",
        type: "widget" as any,
        basePrice: 10,
        incomeAccountId: INCOME,
      }),
    ).toThrow(/unknown item type 'widget'/);
  });

  it("THROWS on a negative base price (Zod nonnegative)", () => {
    expect(() =>
      ItemMasterEngine.defineItem({
        code: "BAD-7",
        name: "Negative base",
        type: "service",
        basePrice: -1,
        incomeAccountId: INCOME,
      }),
    ).toThrow();
  });

  it("rounds basePrice half-even to the cent on store (banker's tie → even): 0.125 → 0.12", () => {
    const rec = ItemMasterEngine.defineItem({
      code: "TIE-1",
      name: "Tie base",
      type: "service",
      basePrice: 0.125, // 12.5 cents → tie → floor 12 (even) → 0.12
      incomeAccountId: INCOME,
    });
    expect(rec.basePrice).toBe(0.12);
  });
});

describe("ItemMasterEngine.setPriceLevel — price-level math + invariants", () => {
  beforeEach(() => ItemMasterEngine.__resetForTests());

  it("seeds the three default price levels (base/wholesale/preferred) on every item", () => {
    const rec = defineInventory("LVL-1", 100);
    const names = rec.priceLevels.map((l) => l.name).sort();
    expect(names).toEqual(DEFAULT_PRICE_LEVELS.map((l) => l.name).sort());
  });

  it("base level (0% markup) === base price", () => {
    defineInventory("LVL-2", 100);
    const p = ItemMasterEngine.setPriceLevel("LVL-2", "base");
    expect(p.computedPrice).toBe(100);
    expect(p.kind).toBe("percent_markup");
  });

  it("INVARIANT — wholesale (percent_discount 20%) price ≤ base", () => {
    defineInventory("LVL-3", 100);
    const p = ItemMasterEngine.setPriceLevel("LVL-3", "wholesale");
    expect(p.computedPrice).toBe(80); // 100 * 0.80
    expect(p.computedPrice).toBeLessThanOrEqual(p.basePrice);
  });

  it("INVARIANT — preferred (percent_markup 10%) price ≥ base", () => {
    defineInventory("LVL-4", 100);
    const p = ItemMasterEngine.setPriceLevel("LVL-4", "preferred");
    expect(p.computedPrice).toBe(110); // 100 * 1.10
    expect(p.computedPrice).toBeGreaterThanOrEqual(p.basePrice);
  });

  it("computes discount/markup with half-even rounding on a non-round base (19.99)", () => {
    defineInventory("LVL-5", 19.99);
    const wholesale = ItemMasterEngine.setPriceLevel("LVL-5", "wholesale");
    // 19.99 * 0.80 = 15.992 → 1599.2 cents → round 1599 → 15.99
    expect(wholesale.computedPrice).toBeCloseTo(15.99, 2);
    const preferred = ItemMasterEngine.setPriceLevel("LVL-5", "preferred");
    // 19.99 * 1.10 = 21.989 → 2198.9 cents → round 2199 → 21.99
    expect(preferred.computedPrice).toBeCloseTo(21.99, 2);
  });

  it("supports a fixed-price-override level appended at defineItem", () => {
    ItemMasterEngine.defineItem({
      code: "LVL-6",
      name: "Fixed override",
      type: "service",
      basePrice: 100,
      incomeAccountId: INCOME,
      priceLevels: [{ name: "contract", kind: "fixed", value: 42.5 }],
    });
    const p = ItemMasterEngine.setPriceLevel("LVL-6", "contract");
    expect(p.kind).toBe("fixed");
    expect(p.computedPrice).toBe(42.5);
  });

  it("THROWS on an unknown price level", () => {
    defineInventory("LVL-7", 100);
    expect(() => ItemMasterEngine.setPriceLevel("LVL-7", "nope")).toThrow(/unknown price level 'nope'/);
  });

  it("THROWS on an unknown item code", () => {
    expect(() => ItemMasterEngine.setPriceLevel("ghost", "base")).toThrow(/unknown item code 'ghost'/);
  });

  it("INVARIANT — a price-level config that would compute negative is rejected at defineItem", () => {
    // a >100% percent_discount is rejected at definition (would drive price < 0)
    expect(() =>
      ItemMasterEngine.defineItem({
        code: "LVL-8",
        name: "Over discount",
        type: "service",
        basePrice: 100,
        incomeAccountId: INCOME,
        priceLevels: [{ name: "toomuch", kind: "percent_discount", value: 150 }],
      }),
    ).toThrow(/must be in \[0,100\]/);
  });
});

describe("ItemMasterEngine.priceFor — extended price + reconciliation", () => {
  beforeEach(() => ItemMasterEngine.__resetForTests());

  it("RECONCILES: priceFor(code, level, 1) === the level's computed unit price", () => {
    defineInventory("PF-1", 19.99);
    for (const level of ["base", "wholesale", "preferred"]) {
      const unit = ItemMasterEngine.setPriceLevel("PF-1", level).computedPrice;
      expect(ItemMasterEngine.priceFor("PF-1", level, 1)).toBe(unit);
    }
  });

  it("defaults qty to 1 when omitted", () => {
    defineInventory("PF-2", 100);
    expect(ItemMasterEngine.priceFor("PF-2", "base")).toBe(100);
  });

  it("multiplies unit price by qty with half-even rounding (wholesale 15.99 * 3 = 47.97)", () => {
    defineInventory("PF-3", 19.99);
    // unit wholesale = 15.99; * 3 = 47.97
    expect(ItemMasterEngine.priceFor("PF-3", "wholesale", 3)).toBeCloseTo(47.97, 2);
  });

  it("returns 0 for qty 0 (zero units priced as zero, not an error)", () => {
    defineInventory("PF-4", 100);
    expect(ItemMasterEngine.priceFor("PF-4", "preferred", 0)).toBe(0);
  });

  it("handles a large qty without precision loss (250000 * 110.00 = 27,500,000.00)", () => {
    defineInventory("PF-5", 100);
    // preferred unit = 110; * 250000 = 27,500,000
    expect(ItemMasterEngine.priceFor("PF-5", "preferred", 250000)).toBe(27_500_000);
  });

  it("THROWS on a negative qty", () => {
    defineInventory("PF-6", 100);
    expect(() => ItemMasterEngine.priceFor("PF-6", "base", -2)).toThrow(/qty must be a finite number ≥ 0/);
  });

  it("THROWS on a non-finite qty (NaN)", () => {
    defineInventory("PF-7", 100);
    expect(() => ItemMasterEngine.priceFor("PF-7", "base", NaN)).toThrow(/qty must be a finite number ≥ 0/);
  });
});

describe("ItemMasterEngine — list / get / deactivate / reactivate", () => {
  beforeEach(() => ItemMasterEngine.__resetForTests());

  it("getItem returns the record; returns null for an unknown code", () => {
    defineInventory("G-1", 10);
    expect(ItemMasterEngine.getItem("G-1")!.code).toBe("G-1");
    expect(ItemMasterEngine.getItem("missing")).toBeNull();
  });

  it("listItems returns active items sorted by code; excludes inactive by default", () => {
    defineInventory("B-2", 10);
    defineInventory("A-1", 10);
    defineInventory("C-3", 10);
    ItemMasterEngine.deactivateItem("B-2");
    const active = ItemMasterEngine.listItems();
    expect(active.map((i) => i.code)).toEqual(["A-1", "C-3"]);
    const all = ItemMasterEngine.listItems({ includeInactive: true });
    expect(all.map((i) => i.code)).toEqual(["A-1", "B-2", "C-3"]);
  });

  it("deactivateItem never deletes — flips active=false, record still retrievable", () => {
    defineInventory("D-1", 10);
    const rec = ItemMasterEngine.deactivateItem("D-1");
    expect(rec.active).toBe(false);
    expect(ItemMasterEngine.getItem("D-1")).not.toBeNull(); // preserved, not deleted
  });

  it("reactivateItem restores a deactivated item", () => {
    defineInventory("D-2", 10);
    ItemMasterEngine.deactivateItem("D-2");
    const rec = ItemMasterEngine.reactivateItem("D-2");
    expect(rec.active).toBe(true);
    expect(ItemMasterEngine.listItems().map((i) => i.code)).toContain("D-2");
  });

  it("deactivateItem THROWS on an unknown code", () => {
    expect(() => ItemMasterEngine.deactivateItem("nope")).toThrow(/unknown item code 'nope'/);
  });
});

describe("ItemMasterEngine — constants integrity", () => {
  it("ITEM_TYPES contains exactly the six QB item kinds", () => {
    expect([...ITEM_TYPES].sort()).toEqual(
      ["assembly", "discount", "inventory", "non_inventory", "other_charge", "service"].sort(),
    );
  });

  it("inventory + assembly require all three account roles; discount requires income only", () => {
    expect([...ITEM_ACCOUNT_RULES.inventory.required].sort()).toEqual(["asset", "expense", "income"]);
    expect([...ITEM_ACCOUNT_RULES.assembly.required].sort()).toEqual(["asset", "expense", "income"]);
    expect([...ITEM_ACCOUNT_RULES.discount.required]).toEqual(["income"]);
    expect([...ITEM_ACCOUNT_RULES.discount.optional]).toEqual([]);
  });
});
