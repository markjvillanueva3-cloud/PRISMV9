/**
 * chart-of-accounts-policy.ts — Chart-of-Accounts validation policy constants
 * (galaxy:business, slot:hotel).
 *
 * Single source of truth for the rules that govern a QuickBooks-style chart of
 * accounts: which leading digit of an account number maps to which account
 * type, and which normal balance each type carries. The {@link ChartOfAccountsEngine}
 * imports these — they are NEVER inlined in the engine (financial-invariant
 * discipline: a number-range rule duplicated in two places drifts and silently
 * lets a mis-typed account post on the wrong side of the ledger).
 *
 * Authority for the ranges: the base CHART_OF_ACCOUNTS in GeneralLedgerEngine
 * (1xxx assets, 2xxx liabilities, 3xxx equity, 4xxx revenue, 5xxx expense) — the
 * map below is the generalization of that observed convention so custom accounts
 * added at runtime stay consistent with the base set.
 *
 * @version 1.0.0
 */

import type { AccountType, NormalBalance } from "../engines/GeneralLedgerEngine.js";

export const CHART_OF_ACCOUNTS_POLICY_SCHEMA_VERSION = "1.0.0";

/**
 * Leading-digit (number-range) → account type. A "1500" account is therefore an
 * asset because it begins with "1"; declaring it as revenue is a policy violation.
 * Mirrors the 1xxx/2xxx/3xxx/4xxx/5xxx convention of the GL base chart.
 */
export const NUMBER_RANGE_TO_TYPE: Readonly<Record<string, AccountType>> = Object.freeze({
  "1": "asset",
  "2": "liability",
  "3": "equity",
  "4": "revenue",
  "5": "expense",
});

/**
 * Account type → its NORMAL (non-contra) balance side. Assets and expenses
 * normally carry a debit balance; liabilities, equity, and revenue normally
 * carry a credit balance. Contra accounts (e.g. Accumulated Depreciation, an
 * asset that normally carries a credit) are the documented exception — handled
 * via the `contra` flag on the account, not by relaxing this map.
 */
export const TYPE_TO_NORMAL_BALANCE: Readonly<Record<AccountType, NormalBalance>> = Object.freeze({
  asset: "debit",
  expense: "debit",
  liability: "credit",
  equity: "credit",
  revenue: "credit",
});

/** The five recognized account types (for range/iteration use). */
export const ACCOUNT_TYPES: ReadonlyArray<AccountType> = Object.freeze([
  "asset",
  "liability",
  "equity",
  "revenue",
  "expense",
]);

/**
 * Resolve the expected account type from an account number's leading digit.
 * Returns `null` when the leading character is not a recognized range digit
 * (e.g. a "9000" suspense account or a non-numeric id) — callers decide whether
 * an unknown range is a hard error.
 */
export function typeForAccountNumber(id: string): AccountType | null {
  const lead = String(id).trim().charAt(0);
  return NUMBER_RANGE_TO_TYPE[lead] ?? null;
}

/**
 * The normal balance a given type carries when NOT a contra account.
 * Contra accounts invert this (handled by the engine's `contra` flag).
 */
export function expectedNormalBalance(type: AccountType): NormalBalance {
  return TYPE_TO_NORMAL_BALANCE[type];
}
