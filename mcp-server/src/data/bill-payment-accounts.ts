/**
 * bill-payment-accounts.ts — GL account designations + policy constants for the
 * vendor bill-payment / check-run (QuickBooks "Pay Bills") cycle in the PRISM ERP
 * (galaxy:business, slot:hotel).
 *
 * Single source of truth for the accounts BillPaymentCheckRunEngine posts to, so the engine
 * NEVER inlines an account number or a policy rate (business/GSD.md §2.1 financial-invariant
 * gate, [[feedback_hotel_financial_invariant_gate]]).
 *
 * This is the A/P mirror of cash-application-accounts.ts (the A/R receive-payment cycle).
 *
 * Account numbers align with the canonical chart of accounts in GeneralLedgerEngine.ts:
 *   1000 Cash, 2000 Accounts Payable are existing chart members.
 *   recordPurchase posts DR<expense/asset>/CR 2000 AP at bill creation; paying the bill is the
 *   second leg — relieve the payable (DR 2000) and disburse cash (CR 1000). There is NO
 *   vendor-payment recorder in GeneralLedgerEngine, so this engine RETURNS the balanced lines as
 *   data (it does not post directly) — keeping the engine pure + testable per the spec.
 */

/** GL account a vendor payment relieves — the payable owed to the vendor (debited on payout). */
export const ACCOUNTS_PAYABLE_ACCOUNT = { number: "2000", name: "Accounts Payable" } as const;

/** GL account a vendor disbursement credits — cash leaving the bank (check/ACH/wire). */
export const CASH_ACCOUNT = { number: "1000", name: "Cash" } as const;

/** Floating-point tolerance (one tenth of a cent) for money reconciliation invariants. */
export const MONEY_RECONCILE_TOLERANCE = 0.001;

/** Schema version for the bill-payment account/policy snapshot. */
export const BILL_PAYMENT_SCHEMA_VERSION = "1.0.0";
