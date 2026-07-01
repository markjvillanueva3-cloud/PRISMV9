/**
 * bank-accounts.ts — GL account designations + policy constants for the bank
 * deposit / funds-transfer (QuickBooks "Make Deposits" + "Transfer Funds") cycle
 * in the PRISM ERP (galaxy:business, slot:hotel).
 *
 * Single source of truth for the accounts BankDepositTransferEngine posts to, so the
 * engine NEVER inlines an account number (business/GSD.md §2.1 financial-invariant
 * gate, [[feedback_hotel_financial_invariant_gate]]).
 *
 * Account numbers align with the canonical chart of accounts in GeneralLedgerEngine.ts:
 *   1000 Cash is an existing chart member.
 *   1499 Undeposited Funds is a CHART EXTENSION (NOT yet in MAIN's chart) — see below.
 */

/** GL asset account a deposit debits — cash landing in the bank. Existing chart member. */
export const CASH_ACCOUNT = { number: "1000", name: "Cash" } as const;

/**
 * GL asset account holding receipts that have been recorded against customers/invoices but
 * not yet physically deposited at the bank (QuickBooks "Undeposited Funds"). A receipt first
 * lands here (DR 1499) on cash-application; "Make Deposits" then sweeps a batch of receipts
 * into the bank (DR 1000 Cash / CR 1499 Undeposited Funds).
 *
 * CHART EXTENSION — NOT in MAIN's chart of accounts yet. Number 1499 slots at the end of the
 * 1300-1320 inventory / 1400-block current-asset range, just below 1500 Equipment, so adding
 * it in MAIN is purely additive (no renumbering of existing accounts). It is a current asset
 * with a debit normal balance, exactly like 1000 Cash. Until it is added to MAIN's chart, the
 * engine RETURNS its GL line as data — it does not post to the GL directly (the spec keeps the
 * engine pure + testable).
 */
export const UNDEPOSITED_FUNDS_ACCOUNT = { number: "1499", name: "Undeposited Funds" } as const;

/**
 * The set of GL account numbers this cycle is allowed to reference. A deposit `toAccount` and
 * both legs of a transfer (`fromAccount`/`toAccount`) must be a known chart or chart-extension
 * number — an unknown number THROWS rather than posting into a phantom account.
 *
 * Mirrors the canonical chart in GeneralLedgerEngine.ts plus the 1499 extension above. Kept as
 * a frozen record (number → display name) so the engine can both validate membership and resolve
 * a human-readable account name for its GL lines without a second source.
 */
export const KNOWN_ACCOUNTS: Readonly<Record<string, string>> = Object.freeze({
  "1000": "Cash",
  "1200": "Accounts Receivable",
  "1300": "WIP",
  "1310": "Finished Goods",
  "1320": "Raw Materials",
  "1499": "Undeposited Funds", // chart extension (see UNDEPOSITED_FUNDS_ACCOUNT)
  "1500": "Equipment",
  "1600": "Accumulated Depreciation",
  "2000": "Accounts Payable",
  "2100": "Tax Payable",
  "2200": "Accrued Payroll",
  "3000": "Owner Equity",
  "4000": "Sales Revenue",
  "5000": "COGS",
  "5100": "Materials Expense",
  "5500": "Operating Expense",
  "5600": "Tools/Consumables",
});

/** True iff `account` is a known chart or chart-extension account number. */
export function isKnownAccount(account: string): boolean {
  return Object.prototype.hasOwnProperty.call(KNOWN_ACCOUNTS, account);
}

/** Resolve the display name for a known account number; THROWS if the number is unknown. */
export function accountName(account: string): string {
  const name = KNOWN_ACCOUNTS[account];
  if (name === undefined) {
    throw new Error(`[bank-deposit-transfer] unknown GL account number '${account}' — not in chart or extension`);
  }
  return name;
}

/** Floating-point tolerance (one tenth of a cent) for money reconciliation invariants. */
export const MONEY_RECONCILE_TOLERANCE = 0.001;

/** Schema version for the bank-accounts snapshot. */
export const BANK_ACCOUNTS_SCHEMA_VERSION = "1.0.0";
