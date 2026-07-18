/**
 * ChartOfAccountsEngine — QuickBooks "Chart of Accounts" + "Classes" MANAGEMENT layer
 * (galaxy:business, slot:hotel). QB-PARITY Phase-4 engine #1.
 *
 * The GeneralLedgerEngine ships a fixed, manufacturing-oriented 22-account chart and the
 * double-entry / statement machinery that USES it, but it has no MANAGEMENT surface: you
 * cannot add a custom account, deactivate a stale one, or tag P&L by class / department /
 * location. This engine is the layer ON TOP — it never reimplements double-entry, the chart
 * data, balance-validation, or the three statements. It IMPORTS the base chart via
 * `generalLedgerEngine.getChartOfAccounts()` and adds:
 *   - addAccount()       custom account add, validated against the policy + uniqueness
 *   - deactivateAccount() soft-delete with an activity guard
 *   - defineClass() / listClasses()  hierarchical classes/departments/locations (QB "Classes")
 *   - fullChart()        base ∪ added-active
 *   - validateAccount()  the policy as a pure predicate (testable in isolation)
 *
 * Validation rules (the QB chart-integrity contract), all sourced from
 * chart-of-accounts-policy.ts — NEVER inlined:
 *   1. account number is unique vs the base set ∪ already-added set (dup THROWS).
 *   2. the number range matches the declared type (1xxx=asset … 5xxx=expense; a 1xxx
 *      account declared "revenue" THROWS).
 *   3. the normal_balance matches the type (asset/expense=debit, liability/equity/revenue=credit),
 *      UNLESS the account is flagged `contra` (e.g. a contra-asset normally carries a credit).
 *
 * Financial-invariant compliance ([[feedback_hotel_financial_invariant_gate]]):
 *   - policy ranges/balances IMPORTED, never inlined.
 *   - non-finite / malformed ids, duplicate numbers, type/range/balance mismatches all THROW
 *     loudly (a silently mis-typed account would post on the wrong ledger side forever).
 *   - deactivating an account that still has GL activity is REFUSED (would orphan posted entries).
 *   - this engine never posts to the GL; it governs the chart that the GL's createJournalEntry
 *     and statements read — adding an account here never unbalances any entry.
 *
 * PRISM synergy (QUICKBOOKS-PARITY-PLAN.md thesis): the shop-ops / accounting cycle PRODUCES the
 * need for custom accounts and class tagging — e.g. a new machine line becomes an "Equipment"
 * sub-account; a department becomes a Class so the QB books / reporting cycle and the
 * networking-platform financial reporting can render P&L-by-class. This engine is the gatekeeper
 * that keeps every such addition consistent with the base ledger contract before it ever reaches
 * GeneralLedgerEngine.createJournalEntry.
 *
 * @version 1.0.0
 */
// WIRE-EXEMPT: dispatcher wiring deferred to MAIN (worktree businessDispatcher stale 441 vs main 879);
// wire chart_add_account / chart_deactivate_account / chart_define_class / chart_list_classes /
// chart_full / chart_validate_account in main post golf-merge.

import { z } from "zod";
import {
  generalLedgerEngine,
  type Account,
  type AccountType,
  type NormalBalance,
} from "./GeneralLedgerEngine.js";
import {
  ACCOUNT_TYPES,
  CHART_OF_ACCOUNTS_POLICY_SCHEMA_VERSION,
  expectedNormalBalance,
  typeForAccountNumber,
} from "../data/chart-of-accounts-policy.js";

// ============================================================================
// TYPES
// ============================================================================

/** A custom (runtime-added) chart account. Extends the base Account with management flags. */
export interface ManagedAccount extends Account {
  /** true when the account normally carries the OPPOSITE balance of its type (e.g. contra-asset). */
  contra: boolean;
  /** false once soft-deleted via deactivateAccount; deactivated accounts drop out of fullChart(). */
  active: boolean;
  /** ISO timestamp the account was added. */
  created_at: string;
}

/** A QuickBooks "Class" (department / location / business-line tag) for P&L-by-class reporting. */
export interface AccountClass {
  id: string;
  name: string;
  /** parent class id for a hierarchy (e.g. "Plant" → "Mill Dept"); null/undefined = top level. */
  parentId: string | null;
}

/** A class rendered as a hierarchy node (used by listClasses). */
export interface ClassTreeNode extends AccountClass {
  depth: number;
  children: ClassTreeNode[];
}

/** Result of validateAccount run as a pure predicate (no throw). */
export interface AccountValidation {
  ok: boolean;
  /** Human-readable failure reasons; empty iff ok. */
  errors: string[];
  /** The type the number range implies (for diagnostics); null if the range is unrecognized. */
  rangeType: AccountType | null;
  /** The normal balance the (type, contra) pair implies. */
  expectedBalance: NormalBalance | null;
}

// ============================================================================
// SCHEMAS
// ============================================================================

const ACCOUNT_TYPE_VALUES = ACCOUNT_TYPES as readonly [AccountType, ...AccountType[]];

export const AddAccountInputSchema = z.object({
  /** Account number, e.g. "1510". Must be numeric-leading and unique vs base ∪ added. */
  id: z.string().trim().min(1).regex(/^\d/, "account id must start with a digit (number-range rule)"),
  name: z.string().trim().min(1),
  type: z.enum(ACCOUNT_TYPE_VALUES),
  normal_balance: z.enum(["debit", "credit"] as const),
  category: z.string().trim().min(1),
  /** Contra accounts (e.g. Accumulated Depreciation) invert the type's normal balance. */
  contra: z.boolean().optional().default(false),
});
export type AddAccountInput = z.input<typeof AddAccountInputSchema>;

export const DefineClassInputSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  parentId: z.string().trim().min(1).optional(),
});
export type DefineClassInput = z.input<typeof DefineClassInputSchema>;

// ============================================================================
// ENGINE
// ============================================================================

export class ChartOfAccountsEngine {
  /** Runtime-added custom accounts, keyed by account id. */
  static #added = new Map<string, ManagedAccount>();
  /** Defined classes, keyed by class id. */
  static #classes = new Map<string, AccountClass>();
  /**
   * Optional activity probe: account id → does it have posted GL activity?
   * Defaults to "no activity for any account" (a freshly-added custom account has none).
   * Injectable for testing the deactivate-with-activity guard without a live ledger.
   */
  static #hasActivity: (accountId: string) => boolean = () => false;

  static readonly POLICY_SCHEMA_VERSION = CHART_OF_ACCOUNTS_POLICY_SCHEMA_VERSION;

  // --------------------------------------------------------------------------
  // Validation (pure predicate — no throw, no mutation)
  // --------------------------------------------------------------------------

  /**
   * Validate a candidate account against the chart-integrity policy as a PURE predicate.
   * Does NOT check uniqueness (that requires the live chart; addAccount does it) — this is
   * the structural rule check: number-range↔type and type↔normal_balance (contra-aware).
   *
   * @param account candidate id/name/type/normal_balance/category (+ optional contra).
   * @returns {@link AccountValidation} — `ok:false` with `errors` on any rule break, never throws.
   */
  static validateAccount(account: {
    id: string;
    type: AccountType;
    normal_balance: NormalBalance;
    contra?: boolean;
  }): AccountValidation {
    const errors: string[] = [];
    const contra = account.contra === true;
    const rangeType = typeForAccountNumber(account.id);

    if (rangeType === null) {
      errors.push(
        `account number '${account.id}' has an unrecognized range (leading digit must be 1-5: 1=asset 2=liability 3=equity 4=revenue 5=expense)`,
      );
    } else if (rangeType !== account.type) {
      errors.push(
        `number-range mismatch: '${account.id}' (range implies ${rangeType}) was declared type '${account.type}'`,
      );
    }

    const baseBalance = expectedNormalBalance(account.type);
    const expectedBalance: NormalBalance =
      contra ? (baseBalance === "debit" ? "credit" : "debit") : baseBalance;
    if (account.normal_balance !== expectedBalance) {
      errors.push(
        `normal-balance mismatch: ${contra ? "contra-" : ""}${account.type} should be '${expectedBalance}', got '${account.normal_balance}'`,
      );
    }

    return { ok: errors.length === 0, errors, rangeType, expectedBalance };
  }

  // --------------------------------------------------------------------------
  // Account management
  // --------------------------------------------------------------------------

  /**
   * Add a custom account to the chart. Validates (a) uniqueness vs the base GL chart ∪ already-added
   * accounts (dup THROWS), (b) the number-range↔type rule, and (c) the type↔normal_balance rule
   * (contra-aware). The base 22 accounts are never mutated; only the runtime-added set grows.
   *
   * @param input account number/name/type/normal_balance/category (+ optional contra flag).
   * @returns the stored {@link ManagedAccount} (active, with created_at).
   * @throws if the number duplicates any existing account, the range contradicts the type, or the
   *   normal_balance contradicts the (type, contra) pair — all loud, none silent.
   */
  static addAccount(input: AddAccountInput): ManagedAccount {
    const parsed = AddAccountInputSchema.parse(input);

    // (a) uniqueness — base ∪ added (active OR inactive: a number is never silently reused).
    if (this.#findInBase(parsed.id) || this.#added.has(parsed.id)) {
      throw new Error(
        `ChartOfAccountsEngine.addAccount: account number '${parsed.id}' already exists (base chart or added set) — numbers must be unique`,
      );
    }

    // (b) + (c) structural policy.
    const v = this.validateAccount({
      id: parsed.id,
      type: parsed.type,
      normal_balance: parsed.normal_balance,
      contra: parsed.contra,
    });
    if (!v.ok) {
      throw new Error(`ChartOfAccountsEngine.addAccount: invalid account '${parsed.id}': ${v.errors.join("; ")}`);
    }

    const account: ManagedAccount = {
      id: parsed.id,
      name: parsed.name,
      type: parsed.type,
      normal_balance: parsed.normal_balance,
      category: parsed.category,
      contra: parsed.contra,
      active: true,
      created_at: new Date().toISOString(),
    };
    this.#added.set(account.id, account);
    return account;
  }

  /**
   * Soft-deactivate an added account. Base accounts cannot be deactivated (they are the immutable
   * GL contract). An account with GL activity cannot be deactivated (would orphan posted entries) —
   * the activity probe is consulted; default probe reports no activity.
   *
   * @param id account number to deactivate.
   * @returns the updated {@link ManagedAccount} (active:false).
   * @throws if the id is unknown to the added set (base accounts included), already inactive, or has activity.
   */
  static deactivateAccount(id: string): ManagedAccount {
    const key = String(id).trim();
    if (this.#findInBase(key)) {
      throw new Error(
        `ChartOfAccountsEngine.deactivateAccount: '${key}' is a base GL account and cannot be deactivated (immutable ledger contract)`,
      );
    }
    const acct = this.#added.get(key);
    if (!acct) {
      throw new Error(`ChartOfAccountsEngine.deactivateAccount: unknown account '${key}'`);
    }
    if (!acct.active) {
      throw new Error(`ChartOfAccountsEngine.deactivateAccount: account '${key}' is already inactive`);
    }
    if (this.#hasActivity(key)) {
      throw new Error(
        `ChartOfAccountsEngine.deactivateAccount: account '${key}' has GL activity and cannot be deactivated (would orphan posted entries) — reclassify or zero-out first`,
      );
    }
    acct.active = false;
    return acct;
  }

  // --------------------------------------------------------------------------
  // Classes (QuickBooks "Classes" — departments / locations / business lines)
  // --------------------------------------------------------------------------

  /**
   * Define a class (department / location / business-line tag) for P&L-by-class reporting.
   *
   * @param input id/name (+ optional parentId for a hierarchy).
   * @returns the stored {@link AccountClass}.
   * @throws on duplicate id, unknown parentId, or a self-parent (a class cannot be its own parent).
   */
  static defineClass(input: DefineClassInput): AccountClass {
    const parsed = DefineClassInputSchema.parse(input);
    if (this.#classes.has(parsed.id)) {
      throw new Error(`ChartOfAccountsEngine.defineClass: class id '${parsed.id}' already exists`);
    }
    if (parsed.parentId !== undefined) {
      if (parsed.parentId === parsed.id) {
        throw new Error(`ChartOfAccountsEngine.defineClass: class '${parsed.id}' cannot be its own parent`);
      }
      if (!this.#classes.has(parsed.parentId)) {
        throw new Error(`ChartOfAccountsEngine.defineClass: unknown parentId '${parsed.parentId}' for class '${parsed.id}'`);
      }
    }
    const cls: AccountClass = { id: parsed.id, name: parsed.name, parentId: parsed.parentId ?? null };
    this.#classes.set(cls.id, cls);
    return cls;
  }

  /**
   * List classes as a hierarchy (roots → children, each child nested under its parent).
   * Stable, deterministic ordering: insertion order within each sibling group.
   *
   * @returns an array of root {@link ClassTreeNode}s, each carrying its `children` and `depth`.
   */
  static listClasses(): ClassTreeNode[] {
    const childrenOf = new Map<string | null, AccountClass[]>();
    for (const cls of this.#classes.values()) {
      const arr = childrenOf.get(cls.parentId) ?? [];
      arr.push(cls);
      childrenOf.set(cls.parentId, arr);
    }
    const build = (parentId: string | null, depth: number): ClassTreeNode[] =>
      (childrenOf.get(parentId) ?? []).map((c) => ({
        ...c,
        depth,
        children: build(c.id, depth + 1),
      }));
    return build(null, 0);
  }

  // --------------------------------------------------------------------------
  // Full chart (base ∪ added-active)
  // --------------------------------------------------------------------------

  /**
   * The full chart = base GL accounts (always) ∪ added accounts that are still active.
   * Deactivated accounts are excluded. Sorted by account number for a stable QB-style register.
   *
   * @returns the merged, active chart as {@link ManagedAccount}s (base accounts surfaced with
   *   contra inferred from their normal_balance vs type, active:true, created_at "" for the
   *   built-in set so callers can tell base from runtime-added by an empty created_at).
   */
  static fullChart(): ManagedAccount[] {
    const merged: ManagedAccount[] = [];
    for (const base of generalLedgerEngine.getChartOfAccounts()) {
      merged.push({
        ...base,
        contra: base.normal_balance !== expectedNormalBalance(base.type),
        active: true,
        created_at: "",
      });
    }
    for (const added of this.#added.values()) {
      if (added.active) merged.push(added);
    }
    merged.sort((a, b) => a.id.localeCompare(b.id));
    return merged;
  }

  // --------------------------------------------------------------------------
  // Internals / test hooks
  // --------------------------------------------------------------------------

  /** Find a base GL account by id (read-only lookup against the immutable base chart). */
  static #findInBase(id: string): Account | undefined {
    return generalLedgerEngine.getChartOfAccounts().find((a) => a.id === id);
  }

  /** TEST-ONLY: clear all runtime-added accounts + classes + reset the activity probe. */
  static __resetForTests(): void {
    this.#added.clear();
    this.#classes.clear();
    this.#hasActivity = () => false;
  }

  /** TEST-ONLY: inject an activity probe to exercise the deactivate-with-activity guard. */
  static __setActivityProbe(fn: (accountId: string) => boolean): void {
    this.#hasActivity = fn;
  }
}

export const chartOfAccountsEngine = ChartOfAccountsEngine;
