/**
 * cash-application-accounts.ts — GL account designations + policy constants for the
 * customer cash-application (QuickBooks "Receive Payment") cycle in the PRISM ERP
 * (galaxy:business, slot:hotel).
 *
 * Single source of truth for the accounts ReceivePaymentEngine posts to, so the engine
 * NEVER inlines an account number or a policy rate (business/GSD.md §2.1 financial-invariant
 * gate, [[feedback_hotel_financial_invariant_gate]]).
 *
 * Account numbers align with the canonical chart of accounts in GeneralLedgerEngine.ts:
 *   1000 Cash, 1200 Accounts Receivable are existing chart members.
 *   2150 Customer Credits (Unapplied Cash) is the cash-application liability — an over-payment
 *   (or on-account payment) is a LIABILITY the shop owes the customer (an obligation to deliver
 *   future goods/services or refund), NOT revenue and NOT a reduction of AR. It slots between
 *   2100 Tax Payable and 2200 Accrued Payroll, both unused-by-this-cycle neighbours, so adding it
 *   in MAIN's chart is purely additive. Until then the engine RETURNS this line as data — it does
 *   not post to the GL directly (the spec lets the engine stay pure + testable).
 */

/** GL account a customer payment debits — cash received into the bank. */
export const CASH_ACCOUNT = { number: "1000", name: "Cash" } as const;

/** GL account a payment application credits — relieves the customer's open receivable. */
export const ACCOUNTS_RECEIVABLE_ACCOUNT = { number: "1200", name: "Accounts Receivable" } as const;

/**
 * GL liability account for the unapplied remainder of a customer payment (over-payment /
 * on-account credit). A credit balance here is money the shop owes back to the customer.
 * NOT in MAIN's chart yet — see file header. The engine returns this line as data.
 */
export const CUSTOMER_CREDITS_ACCOUNT = { number: "2150", name: "Customer Credits (Unapplied Cash)" } as const;

/** Floating-point tolerance (one tenth of a cent) for money reconciliation invariants. */
export const MONEY_RECONCILE_TOLERANCE = 0.001;

/** Schema version for the cash-application account/policy snapshot. */
export const CASH_APPLICATION_SCHEMA_VERSION = "1.0.0";
