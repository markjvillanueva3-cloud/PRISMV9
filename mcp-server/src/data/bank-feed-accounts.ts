/**
 * bank-feed-accounts.ts — GL account designations + parsing/policy constants for the
 * QuickBooks "Bank Feeds" import cycle in the PRISM ERP (galaxy:business, slot:hotel).
 *
 * Single source of truth for the accounts/columns/tags BankFeedImportEngine references, so the
 * engine NEVER inlines an account number, a money tolerance, or a magic column header
 * (business/GSD.md §2.1 financial-invariant gate, [[feedback_hotel_financial_invariant_gate]]).
 *
 * Account numbers align with the canonical chart of accounts in GeneralLedgerEngine.ts:
 *   1000 Cash is an existing chart member — the bank-statement balance the feed lands into.
 *
 * CHART EXTENSION (not in MAIN's chart yet — purely additive when merged):
 *   1050 Undeposited Funds — a feed transaction is RAW: it is the bank's view of a deposit/
 *   withdrawal that has NOT yet been matched to an A/R receipt or an A/P disbursement. QuickBooks
 *   parks unmatched bank-feed credits in "Undeposited Funds" (an asset clearing account between
 *   1000 Cash and 1200 AR) until the user matches them to an invoice/bill. The engine RETURNS the
 *   clearing-entry GL lines as DATA (DR 1000 Cash / CR 1050 Undeposited Funds for a credit; the
 *   mirror for a debit) — it does NOT post to the GL directly (the spec keeps the engine pure +
 *   testable). 1050 slots between 1000 Cash and 1200 AR, both existing neighbours, so adding it to
 *   MAIN's chart is non-breaking. Until then the line is advisory data only.
 */

/** GL account the bank-statement balance lands into — cash at the bank per the feed. */
export const CASH_ACCOUNT = { number: "1000", name: "Cash" } as const;

/**
 * CHART EXTENSION — clearing/suspense asset for not-yet-matched bank-feed transactions.
 * A credit (positive TRNAMT, money in) sits here until matched to an A/R receipt; a debit
 * (negative TRNAMT, money out) until matched to an A/P disbursement. NOT in MAIN's chart yet —
 * see file header. The engine returns the clearing entry as data; it never posts directly.
 */
export const UNDEPOSITED_FUNDS_ACCOUNT = { number: "1050", name: "Undeposited Funds" } as const;

/** Floating-point tolerance (one tenth of a cent) for money reconciliation invariants. */
export const MONEY_RECONCILE_TOLERANCE = 0.001;

/**
 * The OFX/QBO statement-transaction tags this MINIMAL subset extracts from each <STMTTRN> block.
 * OFX/QBO is an SGML-derived format; the full spec carries many more tags
 * (<CHECKNUM>, <REFNUM>, <SIC>, <PAYEEID>, <CURRENCY>, <BANKACCTTO>, etc.). The extensible set
 * below is the parity-minimum needed to reconcile a statement: a stable id, a date, a signed
 * amount, a type, and a human-readable payee/memo. Extend by adding tags here + reading them in
 * BankFeedImportEngine.#parseStmtTrn — additive, never breaking.
 */
export const OFX_STMTTRN_TAGS = {
  /** stable financial-institution transaction id — REQUIRED (dedup key; missing THROWS). */
  fitid: "FITID",
  /** posting date, OFX format YYYYMMDD[HHMMSS][.XXX][gmt] — REQUIRED. */
  datePosted: "DTPOSTED",
  /** signed transaction amount: negative = debit (money out), positive = credit (money in). */
  amount: "TRNAMT",
  /** transaction type (DEBIT/CREDIT/CHECK/POS/ATM/FEE/INT/...) — advisory; sign is authoritative. */
  type: "TRNTYPE",
  /** free-text memo. */
  memo: "MEMO",
  /** payee name (fallback for memo when <MEMO> absent). */
  name: "NAME",
} as const;

/**
 * Default CSV header→field column mapping (case-insensitive match on the header row).
 * Each field lists the accepted header aliases, first match wins. Override per-bank via
 * importFeed opts.csvColumns. Generic banks vary wildly — keep this list extensible.
 */
export const CSV_DEFAULT_COLUMNS = {
  fitid: ["fitid", "transaction id", "transactionid", "id", "reference", "ref"],
  date: ["date", "posted", "post date", "posting date", "transaction date"],
  amount: ["amount", "trnamt", "value"],
  type: ["type", "trntype", "transaction type"],
  memo: ["memo", "description", "name", "payee", "details"],
} as const;

/** Schema version for the bank-feed import account/parsing snapshot. */
export const BANK_FEED_SCHEMA_VERSION = "1.0.0";
