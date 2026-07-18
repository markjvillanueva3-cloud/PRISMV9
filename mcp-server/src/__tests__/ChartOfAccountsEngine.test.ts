/**
 * ChartOfAccountsEngine.test.ts — QB Chart-of-Accounts + Classes management layer.
 *
 * Verifies the engine governs the chart correctly ON TOP of GeneralLedgerEngine without
 * reimplementing any GL machinery: it reuses generalLedgerEngine.getChartOfAccounts() as the
 * immutable base set, and fullChart() merges base ∪ added-active. Reference values are
 * hand-computed (account-number ranges, normal-balance sides, hierarchy depths) — never stubs.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  ChartOfAccountsEngine,
  chartOfAccountsEngine,
  AddAccountInputSchema,
} from "../engines/ChartOfAccountsEngine.js";
import { generalLedgerEngine } from "../engines/GeneralLedgerEngine.js";
import {
  typeForAccountNumber,
  expectedNormalBalance,
} from "../data/chart-of-accounts-policy.js";

beforeEach(() => {
  ChartOfAccountsEngine.__resetForTests();
});

describe("ChartOfAccountsEngine — GL reuse (no duplication)", () => {
  it("uses the GL base chart of exactly 22 accounts as the base set", () => {
    // Proves the base set is sourced from GeneralLedgerEngine, not re-declared here.
    const base = generalLedgerEngine.getChartOfAccounts();
    expect(base.length).toBe(22);
    // fullChart with no additions === the base set, surfaced as ManagedAccounts.
    const full = ChartOfAccountsEngine.fullChart();
    expect(full.length).toBe(22);
    expect(full.map((a) => a.id).sort()).toEqual([...base].map((a) => a.id).sort());
  });

  it("fullChart marks base accounts with empty created_at (base vs runtime-added)", () => {
    const cash = ChartOfAccountsEngine.fullChart().find((a) => a.id === "1000")!;
    expect(cash.created_at).toBe("");
    expect(cash.active).toBe(true);
    expect(cash.name).toBe("Cash");
    expect(cash.type).toBe("asset");
    expect(cash.normal_balance).toBe("debit");
    // 1000 Cash: asset, normal debit, NOT contra.
    expect(cash.contra).toBe(false);
  });

  it("fullChart infers contra=true for the base contra-asset 1600 Accumulated Depreciation", () => {
    // 1600 is an asset (range debit) but normal_balance credit → contra.
    const accDep = ChartOfAccountsEngine.fullChart().find((a) => a.id === "1600")!;
    expect(accDep.name).toBe("Accumulated Depreciation");
    expect(accDep.type).toBe("asset");
    expect(accDep.normal_balance).toBe("credit");
    expect(accDep.contra).toBe(true);
  });
});

describe("ChartOfAccountsEngine.validateAccount — pure policy predicate", () => {
  it("passes a well-formed asset (1510, debit)", () => {
    const v = ChartOfAccountsEngine.validateAccount({ id: "1510", type: "asset", normal_balance: "debit" });
    expect(v.ok).toBe(true);
    expect(v.errors).toEqual([]);
    expect(v.rangeType).toBe("asset");
    expect(v.expectedBalance).toBe("debit");
  });

  it("passes a well-formed revenue (4200, credit)", () => {
    const v = ChartOfAccountsEngine.validateAccount({ id: "4200", type: "revenue", normal_balance: "credit" });
    expect(v.ok).toBe(true);
    expect(v.errors).toEqual([]);
    expect(v.rangeType).toBe("revenue");
    expect(v.expectedBalance).toBe("credit");
  });

  it("fails when the number range contradicts the type (1500 declared revenue)", () => {
    const v = ChartOfAccountsEngine.validateAccount({ id: "1500", type: "revenue", normal_balance: "credit" });
    expect(v.ok).toBe(false);
    expect(v.rangeType).toBe("asset");
    expect(v.errors.length).toBe(1);
    expect(v.errors[0]).toMatch(/number-range mismatch/);
  });

  it("fails when the normal balance contradicts the type (expense declared credit)", () => {
    const v = ChartOfAccountsEngine.validateAccount({ id: "5700", type: "expense", normal_balance: "credit" });
    expect(v.ok).toBe(false);
    expect(v.expectedBalance).toBe("debit");
    expect(v.errors.length).toBe(1);
    expect(v.errors[0]).toMatch(/normal-balance mismatch/);
  });

  it("reports BOTH range and balance errors when both rules break at once", () => {
    // "1500" range implies asset; declared revenue (range break) with debit balance
    // (revenue should be credit → balance break). Two independent violations.
    const v = ChartOfAccountsEngine.validateAccount({ id: "1500", type: "revenue", normal_balance: "debit" });
    expect(v.ok).toBe(false);
    expect(v.errors.length).toBe(2);
    expect(v.errors.join(" ")).toMatch(/number-range mismatch/);
    expect(v.errors.join(" ")).toMatch(/normal-balance mismatch/);
  });

  it("accepts a contra-asset (asset range, credit balance, contra=true)", () => {
    const v = ChartOfAccountsEngine.validateAccount({ id: "1650", type: "asset", normal_balance: "credit", contra: true });
    expect(v.ok).toBe(true);
    expect(v.errors).toEqual([]);
    expect(v.expectedBalance).toBe("credit"); // contra inverts asset's debit→credit
  });

  it("flags an unrecognized range (leading digit outside 1-5)", () => {
    const v = ChartOfAccountsEngine.validateAccount({ id: "9000", type: "asset", normal_balance: "debit" });
    expect(v.ok).toBe(false);
    expect(v.rangeType).toBeNull();
    expect(v.errors.join(" ")).toMatch(/unrecognized range/);
  });
});

describe("ChartOfAccountsEngine.addAccount", () => {
  it("adds a valid custom account and surfaces it in fullChart", () => {
    const acct = ChartOfAccountsEngine.addAccount({
      id: "1510",
      name: "Tooling Inventory",
      type: "asset",
      normal_balance: "debit",
      category: "current_asset",
    });
    expect(acct.id).toBe("1510");
    expect(acct.active).toBe(true);
    expect(acct.contra).toBe(false);
    expect(typeof acct.created_at).toBe("string");
    expect(acct.created_at.length).toBeGreaterThan(0); // runtime-added → real timestamp
    const full = ChartOfAccountsEngine.fullChart();
    expect(full.length).toBe(23); // 22 base + 1 added
    const found = full.find((a) => a.id === "1510")!;
    expect(found.name).toBe("Tooling Inventory");
    expect(found.created_at.length).toBeGreaterThan(0);
  });

  it("THROWS on a duplicate number vs the base chart (2000 Accounts Payable already exists)", () => {
    expect(() =>
      ChartOfAccountsEngine.addAccount({
        id: "2000",
        name: "Duplicate AP",
        type: "liability",
        normal_balance: "credit",
        category: "current_liability",
      }),
    ).toThrow(/already exists/);
    // The added set stays empty; base chart untouched.
    expect(ChartOfAccountsEngine.fullChart().length).toBe(22);
  });

  it("THROWS on a duplicate number vs a previously-added account", () => {
    ChartOfAccountsEngine.addAccount({ id: "4200", name: "Tooling Revenue", type: "revenue", normal_balance: "credit", category: "operating_revenue" });
    expect(() =>
      ChartOfAccountsEngine.addAccount({ id: "4200", name: "Dup Revenue", type: "revenue", normal_balance: "credit", category: "operating_revenue" }),
    ).toThrow(/already exists/);
    // Still only one 4200 present, with the FIRST name (the dup never overwrote it).
    const matches = ChartOfAccountsEngine.fullChart().filter((a) => a.id === "4200");
    expect(matches.length).toBe(1);
    expect(matches[0].name).toBe("Tooling Revenue");
  });

  it("THROWS when the number range is wrong for the type (1500-style number marked revenue)", () => {
    expect(() =>
      ChartOfAccountsEngine.addAccount({
        id: "1505",
        name: "Mislabeled Revenue",
        type: "revenue",
        normal_balance: "credit",
        category: "operating_revenue",
      }),
    ).toThrow(/number-range mismatch/);
    expect(ChartOfAccountsEngine.fullChart().filter((a) => a.id === "1505").length).toBe(0);
  });

  it("THROWS when the normal balance is wrong for the type (asset marked credit, not contra)", () => {
    expect(() =>
      ChartOfAccountsEngine.addAccount({
        id: "1520",
        name: "Bad-balance Asset",
        type: "asset",
        normal_balance: "credit",
        category: "current_asset",
      }),
    ).toThrow(/normal-balance mismatch/);
    expect(ChartOfAccountsEngine.fullChart().filter((a) => a.id === "1520").length).toBe(0);
  });

  it("accepts a contra-asset addition (1650, asset, credit, contra)", () => {
    const acct = ChartOfAccountsEngine.addAccount({
      id: "1650",
      name: "Allowance for Doubtful Accounts",
      type: "asset",
      normal_balance: "credit",
      category: "contra_asset",
      contra: true,
    });
    expect(acct.contra).toBe(true);
    expect(acct.normal_balance).toBe("credit");
    const found = ChartOfAccountsEngine.fullChart().find((a) => a.id === "1650")!;
    expect(found.contra).toBe(true);
  });
});

describe("ChartOfAccountsEngine.deactivateAccount", () => {
  it("deactivates an added account with no activity and drops it from fullChart", () => {
    ChartOfAccountsEngine.addAccount({ id: "1510", name: "Tooling Inventory", type: "asset", normal_balance: "debit", category: "current_asset" });
    expect(ChartOfAccountsEngine.fullChart().length).toBe(23);
    const deactivated = ChartOfAccountsEngine.deactivateAccount("1510");
    expect(deactivated.active).toBe(false);
    expect(ChartOfAccountsEngine.fullChart().length).toBe(22); // dropped
    expect(ChartOfAccountsEngine.fullChart().filter((a) => a.id === "1510").length).toBe(0);
  });

  it("REFUSES to deactivate an account that has GL activity (flag)", () => {
    ChartOfAccountsEngine.addAccount({ id: "1510", name: "Tooling Inventory", type: "asset", normal_balance: "debit", category: "current_asset" });
    ChartOfAccountsEngine.__setActivityProbe((id) => id === "1510"); // pretend it has posted entries
    expect(() => ChartOfAccountsEngine.deactivateAccount("1510")).toThrow(/has GL activity/);
    // Still present and ACTIVE — the refusal left state untouched.
    const found = ChartOfAccountsEngine.fullChart().find((a) => a.id === "1510")!;
    expect(found.active).toBe(true);
  });

  it("REFUSES to deactivate a base GL account (immutable contract)", () => {
    expect(() => ChartOfAccountsEngine.deactivateAccount("1000")).toThrow(/base GL account/);
    // 1000 Cash still present in the full chart.
    expect(ChartOfAccountsEngine.fullChart().find((a) => a.id === "1000")!.name).toBe("Cash");
  });

  it("THROWS deactivating an unknown account, and deactivating an already-inactive one", () => {
    expect(() => ChartOfAccountsEngine.deactivateAccount("7777")).toThrow(/unknown account/);
    ChartOfAccountsEngine.addAccount({ id: "1510", name: "Tooling", type: "asset", normal_balance: "debit", category: "current_asset" });
    ChartOfAccountsEngine.deactivateAccount("1510");
    expect(() => ChartOfAccountsEngine.deactivateAccount("1510")).toThrow(/already inactive/);
  });
});

describe("ChartOfAccountsEngine — Classes (departments / locations)", () => {
  it("defines a class hierarchy and lists it with correct depths and children", () => {
    ChartOfAccountsEngine.defineClass({ id: "plant", name: "Plant" });
    ChartOfAccountsEngine.defineClass({ id: "mill", name: "Mill Dept", parentId: "plant" });
    ChartOfAccountsEngine.defineClass({ id: "lathe", name: "Lathe Dept", parentId: "plant" });
    ChartOfAccountsEngine.defineClass({ id: "vmc01", name: "VMC-01", parentId: "mill" });

    const tree = ChartOfAccountsEngine.listClasses();
    expect(tree.length).toBe(1); // one root: plant
    const plant = tree[0];
    expect(plant.id).toBe("plant");
    expect(plant.parentId).toBeNull();
    expect(plant.depth).toBe(0);
    expect(plant.children.map((c) => c.id)).toEqual(["mill", "lathe"]); // insertion order
    const mill = plant.children.find((c) => c.id === "mill")!;
    expect(mill.depth).toBe(1);
    expect(mill.parentId).toBe("plant");
    expect(mill.children.map((c) => c.id)).toEqual(["vmc01"]);
    expect(mill.children[0].depth).toBe(2);
    expect(mill.children[0].name).toBe("VMC-01");
  });

  it("THROWS on duplicate class id, unknown parentId, and self-parent", () => {
    ChartOfAccountsEngine.defineClass({ id: "plant", name: "Plant" });
    expect(() => ChartOfAccountsEngine.defineClass({ id: "plant", name: "Dup" })).toThrow(/already exists/);
    expect(() => ChartOfAccountsEngine.defineClass({ id: "ghost", name: "Ghost", parentId: "nope" })).toThrow(/unknown parentId/);
    expect(() => ChartOfAccountsEngine.defineClass({ id: "loop", name: "Loop", parentId: "loop" })).toThrow(/its own parent/);
    // Only the original "plant" survived all the rejected defines.
    const tree = ChartOfAccountsEngine.listClasses();
    expect(tree.length).toBe(1);
    expect(tree[0].id).toBe("plant");
  });
});

describe("ChartOfAccountsEngine — spanning configs across all 5 account ranges", () => {
  it("adds one valid account in each of the 5 ranges and validates the range→type→balance triple", () => {
    const cases: Array<{ id: string; type: "asset" | "liability" | "equity" | "revenue" | "expense"; bal: "debit" | "credit" }> = [
      { id: "1530", type: "asset", bal: "debit" },
      { id: "2300", type: "liability", bal: "credit" },
      { id: "3200", type: "equity", bal: "credit" },
      { id: "4300", type: "revenue", bal: "credit" },
      { id: "5700", type: "expense", bal: "debit" },
    ];
    for (const c of cases) {
      // policy helpers agree with the engine's verdict
      expect(typeForAccountNumber(c.id)).toBe(c.type);
      expect(expectedNormalBalance(c.type)).toBe(c.bal);
      const acct = ChartOfAccountsEngine.addAccount({ id: c.id, name: `Acct ${c.id}`, type: c.type, normal_balance: c.bal, category: "custom" });
      expect(acct.id).toBe(c.id);
      expect(acct.type).toBe(c.type);
      expect(acct.normal_balance).toBe(c.bal);
    }
    expect(ChartOfAccountsEngine.fullChart().length).toBe(22 + 5);
  });
});

describe("ChartOfAccountsEngine — adversarial inputs", () => {
  it("THROWS on an empty account id (Zod min length)", () => {
    expect(() =>
      ChartOfAccountsEngine.addAccount({ id: "", name: "Nameless", type: "asset", normal_balance: "debit", category: "current_asset" }),
    ).toThrow();
  });

  it("THROWS on a non-digit-leading account id (number-range regex)", () => {
    expect(() =>
      ChartOfAccountsEngine.addAccount({ id: "CASH", name: "Cash text id", type: "asset", normal_balance: "debit", category: "current_asset" }),
    ).toThrow();
  });

  it("THROWS on an unknown account type via the schema enum", () => {
    expect(() =>
      // @ts-expect-error — deliberately invalid type to prove the enum rejects it
      ChartOfAccountsEngine.addAccount({ id: "1540", name: "Bad type", type: "wormhole", normal_balance: "debit", category: "x" }),
    ).toThrow();
    // Direct schema check too.
    expect(AddAccountInputSchema.safeParse({ id: "1540", name: "x", type: "wormhole", normal_balance: "debit", category: "x" }).success).toBe(false);
  });

  it("empty chart of classes returns an empty hierarchy (no throw)", () => {
    expect(ChartOfAccountsEngine.listClasses()).toEqual([]);
  });

  it("exposes the engine via the camelCase alias (PRISM engine-shape contract)", () => {
    expect(chartOfAccountsEngine).toBe(ChartOfAccountsEngine);
  });
});
